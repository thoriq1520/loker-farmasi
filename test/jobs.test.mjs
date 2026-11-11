import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptsD3, eligible, selectJobs, paginateJobs, timestamp, threeMonthsAgo, REFRESH_MS } from '../src/jobs.mjs';
import { flightVacancies, fromKita, jsonLdJobs, collectSource, SOURCES, jobstreetJob, fromJobstreet, telegramPosts, telegramDeadline, fromTelegram, sourceDate, farmacareCandidates, fromFarmacare, fromLokerBandung, fromMedion, fromRedy } from '../server/sources.mjs';
import { createJobService, handleApi } from '../server/jobs.mjs';

const now = Date.parse('2026-11-11T10:00:00+07:00');
const job = {
  id: 'one', title: 'Tenaga Teknis Kefarmasian', company: 'Apotek Pengujian', city: 'Kota Bandung',
  qualificationText: 'Pendidikan D3 Farmasi. STRTTK aktif.', active: true,
  publishedAt: '2026-11-10T09:00:00+07:00', verifiedAt: new Date(now).toISOString(),
  validThrough: '2026-11-11', url: 'https://example.org/job/1', sourceId: 'one',
};

test('Bandung and Cimahi are accepted while expired, unverified, out-of-area and wrong-degree jobs are excluded', () => {
  assert.equal(eligible(job, now), true);
  for (const city of ['Bandung', 'Bandung Kota', 'Kabupaten Bandung', 'Kab. Bandung', 'Bandung Barat', 'Kabupaten Bandung Barat', 'Kab Bandung Barat', 'Cimahi', 'Kota Cimahi', ' cimahi  kota ']) assert.equal(eligible({ ...job, city }, now), true, city);
  for (const patch of [
    { city: 'Garut' }, { city: 'Sumedang' }, { city: 'Jawa Barat' }, { city: 'Bandung Timur Jakarta' }, { city: '' }, { city: null },
    { active: false }, { validThrough: '2026-11-10' }, { validThrough: null },
    { verifiedAt: new Date(now - REFRESH_MS).toISOString() }, { verifiedAt: new Date(now + 1).toISOString() },
    { publishedAt: '2026-11-12' }, { publishedAt: null }, { url: 'javascript:alert(1)' },
    { qualificationText: 'Minimal S1 Farmasi' }, { qualificationText: 'D3 Teknik Kimia atau S1 Farmasi' },
    { qualificationText: 'Tidak menerima D3 Farmasi' },
  ]) assert.equal(eligible({ ...job, ...patch }, now), false, JSON.stringify(patch));
  for (const degree of ['D3 Farmasi', 'D-3 Farmasi', 'D3/S1 Farmasi', 'Diploma III jurusan Farmasi', 'SMK/D3 Farmasi']) assert.equal(acceptsD3(degree), true, degree);
  assert.equal(timestamp('2026-11-11', true), Date.parse('2026-11-11T23:59:59.999+07:00'));
  assert.equal(timestamp('2026-11-11'), Date.parse('2026-11-11T00:00:00+07:00'));
  assert.equal(eligible({ ...job, publishedAt: '2026-11-11' }, now), true);
  assert.equal(timestamp('2026-11-11T10:00:00'), now);
  const end = timestamp('2026-11-11', true);
  assert.equal(eligible({ ...job, verifiedAt: new Date(end).toISOString() }, end), true);
  assert.equal(eligible({ ...job, verifiedAt: new Date(end + 1).toISOString() }, end + 1), false);
});

test('results are newest first, deduplicated, and search / saved / source filters work', () => {
  const older = { ...job, id: 'older', title: 'Asisten Apoteker', publishedAt: '2026-11-09T09:00:00+07:00', salaryMin: 3000000, freshGraduate: true };
  const newer = { ...job, id: 'newer', title: 'Staf Farmasi', publishedAt: '2026-11-11T08:00:00+07:00', sourceId: 'two' };
  const jobs = [older, { ...job, active: false }, newer, { ...older, id: 'duplicate' }];
  assert.deepEqual(selectJobs(jobs, {}, now).map(j => j.id), ['newer', 'older']);
  assert.deepEqual(selectJobs(jobs, { query: 'apotek', salary: true, fresh: true }, now).map(j => j.id), ['older']);
  assert.deepEqual(selectJobs(jobs, { source: 'two', saved: ['newer'] }, now).map(j => j.id), ['newer']);
  assert.equal(selectJobs(jobs, { query: 'tidak ditemukan' }, now).length, 0);
  assert.equal(selectJobs([older, { ...older, id: 'updated-duplicate', publishedAt: newer.publishedAt }], {}, now)[0].id, 'updated-duplicate');
});

test('pagination defaults to ten, preserves order, and clamps pages when results shrink', () => {
  const jobs = Array.from({ length: 21 }, (_, id) => ({ id }));
  const first = paginateJobs(jobs);
  const second = paginateJobs(jobs, 2);
  const last = paginateJobs(jobs, 3);
  assert.equal(first.items.length, 10);
  assert.deepEqual([first.start, first.end, first.pageCount, first.page], [1, 10, 3, 1]);
  assert.deepEqual([second.start, second.end], [11, 20]);
  assert.deepEqual(last.items, [{ id: 20 }]);
  assert.deepEqual([...first.items, ...second.items, ...last.items], jobs);
  assert.equal(paginateJobs(jobs, 3, 20).page, 2);
  assert.equal(paginateJobs(jobs, 1, 20).items.length, 20);
  assert.equal(paginateJobs(jobs, 1, 50).items.length, 21);
  assert.equal(paginateJobs(jobs.slice(0, 5), 3).page, 1);
  assert.equal(paginateJobs(jobs, 0).page, 1);
  assert.deepEqual(paginateJobs([], 3).items, []);
  assert.deepEqual([paginateJobs([]).start, paginateJobs([]).end], [0, 0]);
  assert.deepEqual(paginateJobs(Array.from({ length: 100 }), 5).pages, [4, 5, 6]);
  assert.deepEqual(paginateJobs(Array.from({ length: 100 }), 10).pages, [8, 9, 10]);
});

test('public JSON parsing preserves the real status and dates without executing scripts', () => {
  const vacancy = { __typename: 'Vacancy', id: 'x', slug: 'test', positionName: 'Farmasi', company: { name: 'Pengujian' }, city: { name: 'Kota Bandung' }, description: 'Pendidikan D3 Farmasi', isClosed: true, isPublished: true, updatedAt: now * 1000, validThrough: (now + 86400000) * 1000 };
  const payload = JSON.stringify([1, '33:' + JSON.stringify({ vacancy }) + '\n']);
  const html = `<script>throw new Error('must not execute')</script><script>self.__next_f.push(${payload})</script>`;
  assert.equal(flightVacancies(html)[0].slug, 'test');
  const record = '33:' + JSON.stringify({ vacancy }) + '\n';
  const fragmented = [record.slice(0, 90), record.slice(90)].map(chunk => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`).join('');
  assert.equal(flightVacancies(fragmented)[0].slug, 'test');
  const description = 'Kualifikasi:\nDiploma III Farmasi – lulusan baru';
  const textRecord = `46:T${Buffer.byteLength(description).toString(16)},${description}`;
  const withTextRef = textRecord + '47:' + JSON.stringify({ vacancy: { ...vacancy, description: '$46' } }) + '\n';
  assert.equal(flightVacancies(`<script>self.__next_f.push(${JSON.stringify([1, withTextRef])})</script>`)[0].description, description);
  const mapped = fromKita(vacancy, new Date(now).toISOString());
  assert.equal(mapped.active, false);
  assert.equal(timestamp(mapped.updatedAt), now);
  assert.equal(mapped.publishedAt, null);
  assert.equal(jsonLdJobs('<script type="application/ld+json">broken</script>').length, 0);
  assert.equal(jsonLdJobs('<script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"Farmasi"}]}</script>')[0].title, 'Farmasi');
});

test('refreshes are coalesced, source failures clear old jobs, and API blocks foreign origins', async () => {
  let failing = false; let calls = 0;
  const service = createJobService({ collect: async (source, _signal, checkedAt) => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    if (failing) throw new Error('Sumber tidak tersedia');
    return { jobs: [{ ...job, id: source.id, company: source.id, sourceId: source.id, publishedAt: new Date(Date.now() - 1000).toISOString(), verifiedAt: checkedAt, validThrough: new Date(Date.now() + 86400000).toISOString() }], scanned: 1, note: 'Sudah diperiksa' };
  } });
  try {
    const snapshots = await Promise.all([service.refresh(), service.refresh()]);
    assert.equal(calls, SOURCES.length);
    assert.equal(snapshots[0].jobs.length, SOURCES.length);
    assert.deepEqual(snapshots[0], snapshots[1]);
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = JSON.parse(body); } };
    await handleApi({ url: '/api/jobs/refresh', method: 'POST', headers: { origin: 'https://unrelated.example', host: 'localhost:5173' } }, res, service);
    assert.equal(res.statusCode, 403);
    failing = true;
    await service.refresh();
    assert.equal(service.snapshot().jobs.length, 0);
    const { sources } = service.snapshot();
    assert.equal(sources.filter(s => s.status === 'error').length, SOURCES.length);
    assert.deepEqual(sources.filter(s => s.status === 'manual').map(s => s.id), ['santosa', 'mayapada', 'hermina']);
    assert.equal(sources.some(s => s.id === 'rsij'), false);
  } finally { service.close(); }
});

test('the server refreshes periodically without a browser requesting it', async () => {
  let calls = 0;
  let secondPass;
  const repeated = new Promise(resolve => { secondPass = resolve; });
  const service = createJobService({ interval: 20, collect: async () => {
    if (++calls >= SOURCES.length * 2) secondPass();
    return { jobs: [], scanned: 0, note: 'Sudah diperiksa' };
  } });
  const timeout = setTimeout(() => secondPass('timeout'), 1000);
  try {
    assert.notEqual(await repeated, 'timeout');
    assert.ok(calls >= SOURCES.length * 2);
  } finally { clearTimeout(timeout); service.close(); }
});

test('D3 Pharmacy can be one of several accepted majors, but industry or a different degree is not enough', () => {
  for (const text of [
    'Pendidikan minimal D3/D4/S1 Farmasi / Kimia / Analis Kimia',
    'Pendidikan minimal D3/S1 Kimia, Analis Kimia, Farmasi, Teknik Kimia, Biologi',
    'SMA/SMK/D3/S1 (Farmasi, Kimia, Teknik Industri)',
    'Diploma (D3) jurusan Farmasi', 'Jurusan Farmasi (minimal D3)',
    'D3 dari jurusan Farmasi', 'Pendidikan D3\nJurusan: Farmasi',
    'Minimal S1/D3 Farmasi', 'D3 Farmasi atau S1 Farmasi',
  ]) assert.equal(acceptsD3(text), true, text);
  for (const text of [
    'D3 Teknik Kimia atau S1 Farmasi', 'D3 Analis Kimia. Pengalaman industri farmasi',
    'D3 Teknik Kimia, pengalaman di industri farmasi',
    'Perusahaan farmasi. Pendidikan D3 Akuntansi.',
    'D3 Teknik Kimia untuk industri farmasi', 'TVF memiliki STRTTK aktif',
    'D3 Farmasi. Wajib S1 Farmasi.', 'D3 Farmasi tidak diterima',
  ]) assert.equal(acceptsD3(text), false, text);
});

test('source discovery searches TTK/TVF and checks qualifications even when a title has no pharmacy words', async t => {
  const titles = ['TTK', 'TVF', 'Tenaga Vokasi Farmasi', 'Asisten Apoteker', 'Quality Control', 'Admin Gudang', 'Operator Produksi', 'Document Control'];
  const fixtures = titles.map((title, i) => ({
    __typename: 'Vacancy', id: `role-${i}`, slug: `role-${i}`, positionName: title,
    company: { name: `Perusahaan Pengujian ${i}` }, city: { name: 'Kota Bandung' },
    description: i === 4 ? 'Pendidikan minimal D3/S1 Kimia, Analis Kimia, Farmasi' : 'Pendidikan minimal D3 Farmasi',
    isClosed: false, isPublished: true, updatedAt: now * 1000, validThrough: (now + 86400000) * 1000,
  }));
  fixtures.push({ ...fixtures[0], id: 's1', slug: 's1', positionName: 'TVF', description: 'Pendidikan minimal S1 Farmasi' });
  fixtures.push({ ...fixtures[0], id: 'closed', slug: 'closed', isClosed: true });
  fixtures.push({ ...fixtures[0], id: 'expired', slug: 'expired', validThrough: (now - 1) * 1000 });
  fixtures.push({ ...fixtures[0], id: 'outside', slug: 'outside', city: { name: 'Garut' } });
  fixtures.push({ ...fixtures[0], id: 'cimahi', slug: 'cimahi', positionName: 'Staf Farmasi Cimahi', city: { name: 'Kota Cimahi' } });
  const terms = new Set(); const locations = new Set(); const fetched = [];
  const flight = value => `<p>Info Loker</p><script>self.__next_f.push(${JSON.stringify([1, '33:' + JSON.stringify(value) + '\n'])})</script>`;
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input);
    const term = url.searchParams.get('keyword');
    if (term) {
      terms.add(term);
      locations.add(url.searchParams.get('location'));
      if (term === 'pharmacy' && url.searchParams.get('location') === 'Kota Bandung') return new Response('Temporarily unavailable', { status: 503 });
      return new Response(flight({ list: fixtures.map(({ description, ...summary }) => summary) }));
    }
    const slug = decodeURIComponent(url.pathname.split('/').at(-1));
    fetched.push(slug);
    return new Response(flight({ vacancy: fixtures.find(v => v.slug === slug) }));
  });
  const result = await collectSource(SOURCES[0], new AbortController().signal, new Date(now).toISOString());
  assert.ok(terms.has('TTK') && terms.has('TVF') && terms.has('Tenaga Vokasi Farmasi') && terms.has('D3 Farmasi'));
  assert.deepEqual([...locations].sort(), ['Kabupaten Bandung', 'Kabupaten Bandung Barat', 'Kota Bandung', 'Kota Cimahi']);
  assert.equal(fetched.includes('outside'), false);
  assert.equal(result.partial, true);
  assert.match(result.note, /1 pencarian/);
  assert.deepEqual(selectJobs(result.jobs, {}, now).map(j => j.title), [...titles, 'Staf Farmasi Cimahi']);
});

test('Jobstreet embedded JSON is parsed without executing scripts, and must match the requested job', () => {
  const raw = { id: '123', title: 'TVF', content: '<p>D3 Farmasi; contoh teks } dan "kutipan".</p>' };
  const html = `<script>window.SEEK_REDUX_DATA = ${JSON.stringify({ jobdetails: { result: { job: raw } } })}; throw new Error('never execute');</script>`;
  assert.deepEqual(jobstreetJob(html, '123'), raw);
  assert.equal(jobstreetJob(html, '456'), null);
  assert.equal(jobstreetJob('<script>window.SEEK_REDUX_DATA = {broken};</script>', '123'), null);
  assert.equal(jobstreetJob('<html>Security check</html>', '123'), null);
});

test('Jobstreet uses the public JSON search and explicit detail status, degree, city, and deadline', async t => {
  const raw = {
    id: '101', title: 'TVF', advertiser: { name: 'Perusahaan Pengujian' }, location: { label: 'Kota Bandung, Jawa Barat' },
    content: '<p>Pendidikan D3 Farmasi. Fresh graduate dipersilakan.</p>', status: 'Active', isExpired: false,
    expiresAt: { dateTimeUtc: new Date(now + 86400000).toISOString() }, listedAt: { dateTimeUtc: new Date(now - 1000).toISOString() },
    workTypes: { label: 'Full time' },
  };
  const fixtures = [raw,
    { ...raw, id: '102', location: { label: 'Bandung, Jawa Barat' } },
    { ...raw, id: '103', isExpired: true, expiresAt: { dateTimeUtc: new Date(now - 1).toISOString() } },
    { ...raw, id: '104', content: '<p>Pendidikan minimal S1 Farmasi</p>' },
    { ...raw, id: '105', location: { label: 'Kabupaten Bandung, Jawa Barat' }, content: '<p>D3 Farmasi. Penempatan di Kota Bandung.</p>' },
    { ...raw, id: '106', location: { label: 'Cimahi, Jawa Barat' } },
    { ...raw, id: '107', location: { label: 'Garut, Jawa Barat' }, content: '<p>D3 Farmasi. Kantor pusat di Kota Bandung.</p>' },
  ];
  const searchTerms = new Set(); const locations = new Set();
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.headers['user-agent'], undefined);
    if (url.pathname === '/api/jobsearch/v5/search') {
      locations.add(url.searchParams.get('where'));
      const term = url.searchParams.get('keywords'); searchTerms.add(term);
      if (term === 'TVF' && url.searchParams.get('where') === 'Bandung') return new Response('Access limited', { status: 403 });
      return Response.json({ data: fixtures.map(job => ({ id: job.id, listingDate: job.listedAt.dateTimeUtc })) });
    }
    const job = fixtures.find(v => v.id === url.pathname.split('/').at(-1));
    return new Response(`<script>window.SEEK_REDUX_DATA = ${JSON.stringify({ jobdetails: { result: { job } } })};</script>`);
  });
  const result = await collectSource(SOURCES.find(s => s.id === 'jobstreet'), new AbortController().signal, new Date(now).toISOString());
  assert.ok(searchTerms.has('D3 Farmasi') && searchTerms.has('TTK') && searchTerms.has('TVF'));
  assert.deepEqual([...locations].sort(), ['Bandung', 'Cimahi']);
  assert.equal(result.partial, true);
  assert.match(result.note, /1 pencarian/);
  assert.doesNotMatch(result.note, /lokasi hanya menyebut Bandung/);
  assert.deepEqual(selectJobs(result.jobs, {}, now).map(j => j.id), ['jobstreet-101', 'jobstreet-102', 'jobstreet-105', 'jobstreet-106']);
  assert.equal(fromJobstreet({ ...raw, location: { label: 'Bandung, Jawa Barat' }, content: '<p>D3 Farmasi. Penempatan: Kota Bandung.</p>' }, new Date(now).toISOString()).city, 'Bandung');
  assert.equal(fromJobstreet({ ...raw, location: { label: 'Bandung, Jawa Barat' }, content: '<p>D3 Farmasi. Kantor pusat di Kota Bandung.</p>' }, new Date(now).toISOString()).city, 'Bandung');
});

test('Telegram leads keep real dates and links, show unknown deadlines, and still hide closed, expired and unrelated posts', async t => {
  const base = 'Lowongan kerja<br>Posisi: TTK<br>Perusahaan: Apotek Pengujian<br>Penempatan: Cimahi<br>Pendidikan minimal D3 Farmasi<br>Batas lamaran: 30 November 2026';
  const message = (id, text, date = '2026-11-10T08:00:00+00:00', channel = 'pharmacycareer') => `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div data-post="${channel}/${id}"><div class="tgme_widget_message_text js-message_text">${text}</div><div class="tgme_widget_message_footer"><time datetime="${date}">08:00</time></div></div></div>`;
  const html = '<div class="tgme_channel_info"></div><div class="tgme_channel_history">' + [
    message('1', base),
    message('2', base.replace('30 November 2026', '10 November 2026')),
    message('3', base + '<br>Lowongan sudah ditutup'),
    message('4', base.replace('Batas lamaran: 30 November 2026', '').replace('Posisi: TTK', 'Posisi: TVF')),
    message('5', base.replace('Cimahi', 'Garut')),
    message('6', base.replace('D3 Farmasi', 'S1 Farmasi')),
    message('7', base.replace('30 November 2026', '31 November 2026').replace('Posisi: TTK', 'Posisi: Admin Farmasi')),
    message('8', base, '', 'pharmacycareer'),
    message('9', ''),
    message('10', base, '2026-11-10T08:00:00+00:00', 'untrusted_channel'),
    message('11', 'Dibutuhkan TTK untuk Apotek Baru di daerah Derwati Bandung.<br>Syarat:<br>Lulusan D3 Farmasi', '2026-08-11T06:14:58+00:00'),
  ].join('') + '</div>';
  const posts = telegramPosts(html, 'pharmacycareer');
  assert.equal(posts.length, 10);
  assert.equal(posts[0].url, 'https://t.me/pharmacycareer/1');
  assert.equal(posts[0].publishedAt, '2026-11-10T08:00:00+00:00');
  assert.match(posts[0].text, /Perusahaan: Apotek Pengujian\nPenempatan: Cimahi/);
  assert.deepEqual(telegramPosts(html, 'untrusted_channel'), []);
  for (const [input, expected] of [
    ['Batas Lamaran: 2026-11-30', '2026-11-30'],
    ['Deadline: 30/11/2026', '2026-11-30'],
    ['Paling lambat 30 Nov 2026', '2026-11-30'],
    ['Deadline: 31 Februari 2027', null], ['Deadline: segera', null],
  ]) assert.equal(telegramDeadline(input), expected, input);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.origin, 'https://t.me');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
    if (url.pathname === '/s/lokerkimia' && url.search) return new Response('Unavailable', { status: 503 });
    return new Response(url.pathname === '/s/pharmacycareer' ? html : '<div class="tgme_channel_info"></div><div class="tgme_channel_history"></div>');
  });
  const result = await collectSource(SOURCES.find(source => source.id === 'telegram'), new AbortController().signal, new Date(now).toISOString());
  assert.equal(calls, 6);
  assert.equal(result.scanned, 10);
  assert.equal(result.partial, true);
  assert.match(result.note, /3 kanal publik/);
  assert.match(result.note, /1 halaman gagal/);
  assert.match(result.note, /1 pesan tanpa teks/);
  const visible = selectJobs(result.jobs, {}, now);
  assert.deepEqual(visible.map(job => job.id), ['telegram-pharmacycareer/1', 'telegram-pharmacycareer/4', 'telegram-pharmacycareer/7', 'telegram-pharmacycareer/11']);
  assert.ok(visible.every(job => job.needsConfirmation && job.active === null));
  assert.equal(visible.at(-1).company, 'Perusahaan belum disebutkan');
  assert.equal(visible.at(-1).city, 'Bandung');
  assert.equal(visible.at(-1).validThrough, null);
  assert.equal(fromTelegram({ ...posts[0], text: 'Perusahaan: Apotek Bandung\nPenempatan: Garut\nD3 Farmasi' }, new Date(now).toISOString()), null);
});

test('only explicitly marked Telegram leads can bypass unknown status and deadline', () => {
  const lead = { ...job, sourceId: 'telegram', active: null, validThrough: null, needsConfirmation: true, url: 'https://t.me/pharmacycareer/42' };
  assert.equal(eligible(lead, now), true);
  assert.equal(eligible({ ...lead, publishedAt: '2024-06-27' }, now), false);
  for (const patch of [
    { active: false }, { validThrough: '2026-11-10' }, { sourceId: 'jobstreet' },
    { needsConfirmation: false }, { url: 'https://example.org/42' }, { city: 'Garut' },
    { qualificationText: 'Minimal S1 Farmasi' }, { publishedAt: null },
    { verifiedAt: new Date(now - REFRESH_MS).toISOString() },
  ]) assert.equal(eligible({ ...lead, ...patch }, now), false, JSON.stringify(patch));
});

test('every source and saved result respects three calendar months in WIB using the original posting date', () => {
  const cutoff = Date.parse('2026-08-11T00:00:00+07:00');
  assert.equal(threeMonthsAgo(now), cutoff);
  for (const sourceId of ['jobstreet', 'telegram']) {
    const sample = { ...job, sourceId, ...(sourceId === 'telegram' ? { needsConfirmation: true, active: null, validThrough: null, url: 'https://t.me/pharmacycareer/42' } : {}) };
    assert.equal(eligible({ ...sample, publishedAt: new Date(cutoff).toISOString() }, now), true);
    assert.equal(eligible({ ...sample, publishedAt: new Date(cutoff - 1).toISOString(), updatedAt: new Date(now).toISOString() }, now), false);
    assert.equal(eligible({ ...sample, publishedAt: null, updatedAt: new Date(cutoff).toISOString() }, now), true);
    assert.deepEqual(selectJobs([{ ...sample, publishedAt: '2026-08-10' }], { saved: [sample.id] }, now), []);
  }
  assert.equal(threeMonthsAgo(Date.parse('2026-05-31T14:00:00+07:00')), Date.parse('2026-02-28T00:00:00+07:00'));
  assert.equal(threeMonthsAgo(Date.parse('2024-05-31T14:00:00+07:00')), Date.parse('2024-02-29T00:00:00+07:00'));
  assert.equal(threeMonthsAgo(Date.parse('2026-01-01T00:30:00+07:00')), Date.parse('2025-10-01T00:00:00+07:00'));
});

test('Farmacare reads HTML and JSON page content, trusts explicit active status, and preserves update dates', async t => {
  const url = 'https://www.farmacare.id/loker/123-apotek-pengujian';
  const table = `<table class="loker-table"><tr class="row-tanggal"><td>📅 20 Sep 2026</td></tr><tr><td><a href="${url}">Pengujian</a></td><td>TTK</td><td>D3 Farmasi</td><td>Kab Bandung</td></tr><tr><td><a href="https://unrelated.example/loker/456-other">Other</a></td><td>TTK</td><td>D3 Farmasi</td><td>Cimahi</td></tr><tr class="row-tanggal"><td>📅 20 Jul 2026</td></tr><tr><td><a href="https://www.farmacare.id/loker/789-old">Old</a></td><td>TTK</td><td>D3 Farmasi</td><td>Cimahi</td></tr></table>`;
  const detail = '<h1>Loker Farmasi Farmacare</h1><p>Apotek</p><p>Pengujian</p><p>Posisi:</p><p>TTK</p><p>Pendidikan Terakhir:</p><p>D3 Farmasi</p><p>Alamat:</p><p>Margaasih</p><p>Kota/Kab:</p><p>Kab Bandung</p><p>Lokasi Peta:</p><p>Lihat Lokasi</p><p>Tanggal Update:</p><p>20 Sep 2026</p><p>Status Loker:</p><p>Aktif</p><p>Disclaimer:</p>';
  assert.deepEqual(farmacareCandidates(table, now), [url]);
  assert.deepEqual(farmacareCandidates(JSON.stringify({ content: table }), now), [url]);
  const mapped = fromFarmacare(JSON.stringify({ content: detail }), url, new Date(now).toISOString());
  assert.equal(mapped.company, 'Pengujian');
  assert.equal(mapped.city, 'Kabupaten Bandung');
  assert.equal(mapped.publishedAt, null);
  assert.equal(mapped.updatedAt, '2026-09-20');
  assert.deepEqual(mapped.details.find(row => row.label === 'Pendidikan terakhir'), { label: 'Pendidikan terakhir', value: 'D3 Farmasi' });
  assert.deepEqual(mapped.details.find(row => row.label === 'Alamat'), { label: 'Alamat', value: 'Margaasih' });
  assert.ok(mapped.details.every(row => row.label && row.value && row.value !== 'Lihat Lokasi'));
  assert.equal(mapped.details.some(row => /peta/i.test(row.label)), false);
  const withoutAddress = fromFarmacare(detail.replace('<p>Margaasih</p>', ''), url, new Date(now).toISOString());
  assert.equal(withoutAddress.details.some(row => row.label === 'Alamat'), false);
  assert.equal(eligible(mapped, now), true);
  for (const patch of [{ statusExplicit: false }, { active: false }, { validThrough: '2026-11-10' }, { sourceId: 'redy' }]) assert.equal(eligible({ ...mapped, ...patch }, now), false);
  assert.equal(eligible(fromFarmacare(detail.replace('>Aktif<', '>Tidak aktif<'), url, new Date(now).toISOString()), now), false);
  t.mock.method(globalThis, 'fetch', async input => new Response(JSON.stringify({ content: input === url ? detail : table })));
  const result = await collectSource(SOURCES.find(s => s.id === 'farmacare'), new AbortController().signal, new Date(now).toISOString());
  assert.equal(result.scanned, 1);
  assert.equal(selectJobs(result.jobs, {}, now).length, 1);
  assert.equal(sourceDate('31 Feb 2026'), null);
  assert.equal(sourceDate('28 Aug 2026'), '2026-08-28');
  assert.equal(sourceDate('5 Oktober 2026'), '2026-10-05');
});

test('LokerBandung separates qualifications and placements for each role and hides closed or old ads', async t => {
  const url = 'https://www.lokerbandung.id/lowongan/pengujian/';
  const detail = `<script type="application/ld+json">${JSON.stringify({ '@type': 'WebPage', url, datePublished: '2026-11-05T09:00:00+00:00' })}</script><h1><span class="perusahaan">Apotek Pengujian</span><span>membuka lowongan</span>Berbagai Posisi</h1><ul class="ringkasan-block"><li class="lokasi-value">Kota Bandung, Luar Bandung Raya</li></ul><span class="loker-detail"><h3>Admin</h3><p>D3 Akuntansi. Penempatan Jakarta</p><h3>Asisten Apoteker</h3><p>D3/S1 Farmasi<br>Penempatan area Jabodetabek, Bandung</p><h3>TTK Garut</h3><p>D3 Farmasi<br>Penempatan Garut</p></span><ul class="kirim-lamaran-block"><li>Kontak</li></ul><div class="loker-terkait"><p>D3 Farmasi. Bandung.</p>`;
  const jobs = fromLokerBandung(detail, url, new Date(now).toISOString());
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, 'Asisten Apoteker');
  assert.equal(jobs[0].city, 'Bandung');
  assert.equal(eligible(jobs[0], now), true);
  assert.deepEqual(fromLokerBandung(detail.replace('<ul class="kirim-lamaran-block">', '<div class="lowongan-ditutup">Ditutup</div><ul class="kirim-lamaran-block">'), url, new Date(now).toISOString()), []);
  assert.equal(eligible(fromLokerBandung(detail.replace('2026-11-05', '2025-11-05'), url, new Date(now).toISOString())[0], now), false);
  t.mock.method(globalThis, 'fetch', async input => new Response(input === url ? detail : `<p>LokerBandung</p><a href="https://www.lokerbandung.id/lowongan/pinned-unrelated/">Iklan lain</a><div id="loker-container"><a href="${url}">Asisten Apoteker</a>`));
  const result = await collectSource(SOURCES.find(s => s.id === 'lokerbandung'), new AbortController().signal, new Date(now).toISOString());
  assert.equal(result.scanned, 1);
  assert.equal(selectJobs(result.jobs, {}, now).length, 1);
});

test('Medion uses its published job list and original posting date, not a recent edit or office address', async t => {
  const url = 'https://www.medion.co.id/karir/production/';
  const listed = { status: 'publish', link: url, date: '2026-10-08T10:00:00', modified: '2026-11-10T10:00:00', title: { rendered: 'Production' }, class_list: ['career-department-taxonomy-farmasi', 'educution-category-d3'] };
  const detail = '<h1>Detail Lowongan</h1><p>Production</p><h2>Deskripsi Pekerjaan</h2><p>Produksi obat</p><h2>Kualifikasi</h2><p>D3 Teknik Kimia / Farmasi</p><p>STRATA</p><p>D3</p><p>LOKASI KERJA</p><p>Bandung</p><p>KATEGORI</p><p>Lulusan Baru</p><p>Daftar Sekarang</p><p>Dapatkan Berita</p><footer>Alamat kantor Bandung</footer>';
  const mapped = fromMedion(detail, url, new Date(now).toISOString(), undefined, listed);
  assert.equal(eligible(mapped, now), true);
  assert.equal(eligible(fromMedion(detail, url, new Date(now).toISOString(), undefined, { ...listed, date: '2025-01-08T10:00:00' }), now), false);
  assert.equal(eligible(fromMedion(detail.replace('<p>Bandung</p>', '<p>Boyolali</p>'), url, new Date(now).toISOString(), undefined, listed), now), false);
  t.mock.method(globalThis, 'fetch', async input => String(input).includes('/wp-json/') ? Response.json([listed]) : new Response(detail));
  const result = await collectSource(SOURCES.find(s => s.id === 'medion'), new AbortController().signal, new Date(now).toISOString());
  assert.equal(selectJobs(result.jobs, {}, now).length, 1);
});

test('hospital collectors keep current, local D3 Pharmacy roles and reject stale, unverified and unrelated roles', async t => {
  const verifiedAt = new Date(now).toISOString();
  const dated = '2026-11-10';
  const title = 'Open Recruitment';
  const content = '<p>Posisi: Perawat</p><p>D3 Keperawatan</p><p>Posisi: Staf Gudang</p><p>Diploma III Farmasi</p><p>Deadline: 20 November 2026</p>';
  const post = { status: 'publish', id: 123, title, content, published_at: dated };
  const rsudUrl = 'https://rsud.bandung.go.id/blog/penerimaan-pegawai';
  const adventUrl = 'https://rsadventbandung.com/articles/rekrutmen-staf';
  const alislamUrl = 'https://www.rsalislam.com/lowongan-staf/';
  const borromeusCard = '<div class="box box-solid"><div><b>Posisi :</b><p>Staf Gudang</p></div><div><b>Lokasi Penempatan :</b><p>RS. Santo Borromeus</p></div><p>D3 Farmasi</p><p>Tanggal tayang: 10 Nov 2026</p><p>Deadline: 20 Nov 2026</p></div>';
  let currentContent = content;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/HomeVacancyList')) {
      assert.equal(options.method, 'POST');
      return new Response(borromeusCard + borromeusCard.replace('<p>Tanggal tayang: 10 Nov 2026</p>', '').replace('Staf Gudang', 'Staf Farmasi'));
    }
    if (url.pathname.endsWith('/categories')) return Response.json([{ id: 37, slug: 'karir' }]);
    if (url.pathname.endsWith('/posts')) {
      return Response.json([{ status: 'publish', title: { rendered: title }, content: { rendered: content }, date: dated, link: alislamUrl }]);
    }
    if (url.pathname === '/api/articles') {
      return Response.json({ totalPages: 1, data: [
        { ...post, content: currentContent },
        { ...post, id: 124, published_at: '2026-07-10', updated_at: dated },
        { ...post, id: 125, title: 'Pengumuman Hasil Seleksi Rekrutmen' },
      ] });
    }
    if (url.href === adventUrl) return new Response('<div class="entry clearfix"><h1>' + title + '</h1><i class="icon-calendar3"></i>10 Nov 2026<div class="entry-content mt-0">' + content + '</div></div><!-- .entry end -->');
    if (url.pathname === '/articles' || url.pathname === '/news-program') {
      return new Response('<div class="entry col-12"><a href="' + adventUrl + '"><i class="icon-calendar3"></i>10 Nov 2026<h3>' + title + '</h3></a></div>');
    }
    const calendar = '<i class="fa fa-calendar"></i><span>Selasa, 10 November 2026</span>';
    if (url.href === rsudUrl) return new Response('<div class="blog-detail clearfix">' + calendar + '<h1>' + title + '</h1><article class="entry-content clearfix">' + content + '</article></div><!-- Blog Detail End -->');
    if (url.pathname.endsWith('/blog-categories/pengumuman')) return new Response('<h1>Artikel tentang pengumuman</h1><h4><a href="' + rsudUrl + '">' + title + '</a></h4><p>' + calendar + '</p>');
    throw new Error('Unexpected request: ' + input);
  });
  const check = id => collectSource(SOURCES.find(source => source.id === id), new AbortController().signal, verifiedAt);
  for (const id of ['borromeus', 'alislam', 'advent', 'rshs', 'rsud-bandung']) {
    const result = await check(id);
    assert.deepEqual(selectJobs(result.jobs, {}, now).map(j => [j.title, j.city]), [['Staf Gudang', 'Kota Bandung']], id);
  }
  for (const invalid of [
    content.replace('20 November', '10 November'),
    content.replace('<p>Deadline: 20 November 2026</p>', ''),
    content + '<p>Penempatan: Garut, wawancara di Bandung</p>',
    content + '<p>Lowongan ini sudah ditutup</p>',
  ]) {
    currentContent = invalid;
    assert.equal(selectJobs((await check('rshs')).jobs, {}, now).length, 0);
  }
});

test('REDY request-time metadata cannot make an old undated job look new', () => {
  assert.equal(fromRedy('<meta property="og:updated_time" content="1794384381"><h1>TTK</h1><p>D3 Farmasi</p>', 'https://www.getredy.id/lowongan/detail/123-ttk', new Date(now).toISOString()), null);
});
