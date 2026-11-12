import { Buffer } from 'node:buffer';
import { timestamp, acceptsD3, inArea, threeMonthsAgo, CITY } from '../src/jobs.mjs';

export const SEARCH_TERMS = [
  'D3 Farmasi', 'Diploma III Farmasi', 'farmasi', 'pharmacy',
  'TTK', 'Tenaga Teknis Kefarmasian', 'TVF', 'Tenaga Vokasi Farmasi',
  'asisten apoteker', 'apoteker', 'kefarmasian', 'apotek',
];

export const KITA_AREAS = ['Kota Bandung', 'Kabupaten Bandung', 'Kabupaten Bandung Barat', 'Kota Cimahi'];
export const JOBSTREET_AREAS = ['Bandung', 'Cimahi'];

export const SOURCES = [
  { id: 'kitalulus', name: 'KitaLulus', url: 'https://www.kitalulus.com/lowongan?keyword=farmasi&location=Bandung', description: 'Lowongan publik dan status dari KitaLulus.' },
  { id: 'bimma', name: 'BIMMA Bandung', url: 'https://disnaker.bandung.go.id/loker', description: 'Bursa kerja Disnaker Kota Bandung.' },
  { id: 'glints', name: 'Glints', url: 'https://glints.com/id/explore?keywords=d3-farmasi&filter=in-bandung', description: 'Dibaca jika halaman publik mengizinkan akses otomatis.' },
  { id: 'jobstreet', name: 'Jobstreet', url: 'https://id.jobstreet.com/id/d3-farmasi-jobs/in-Bandung-Jawa-Barat', description: 'Pencarian JSON dan detail publik Jobstreet; tanpa login atau cookie.' },
  { id: 'telegram', name: 'Telegram', url: 'https://t.me/s/pharmacycareer', description: 'Pesan teks kanal publik farmasi dan loker Bandung, tanpa login.' },
  { id: 'farmacare', name: 'Farmacare', url: 'https://www.farmacare.id/loker-farmasi', description: 'Portal khusus farmasi dengan pendidikan, wilayah, tanggal pembaruan, dan status.' },
  { id: 'redy', name: 'REDY', url: 'https://www.getredy.id/lowongan/1?search=farmasi', description: 'Daftar lowongan publik REDY.' },
  { id: 'lokerbandung', name: 'LokerBandung.id', url: 'https://www.lokerbandung.id/profesi/apoteker/', description: 'Lowongan lokal Bandung Raya dari situs aslinya.' },
  { id: 'medion', name: 'Medion', url: 'https://www.medion.co.id/karir/', description: 'Portal karier resmi Medion.' },
  { id: 'borromeus', name: 'RS Santo Borromeus', url: 'https://rsborromeus.com/careers/' },
  { id: 'alislam', name: 'RS Al Islam Bandung', url: 'https://www.rsalislam.com/karir/' },
  { id: 'advent', name: 'RS Advent Bandung', url: 'https://rsadventbandung.com/articles/open-recruitment' },
  { id: 'rshs', name: 'RSUP Dr. Hasan Sadikin', url: 'https://rshs.go.id/berita/pengumuman' },
  { id: 'rsud-bandung', name: 'RSUD Kota Bandung', url: 'https://rsud.bandung.go.id/blog/blog-categories/pengumuman' },
];

export const DIRECT_SOURCES = [
  { id: 'santosa', name: 'Santosa Bandung Central', url: 'https://www.santosa-hospital.com/id/hospital/SHBC/carrer' },
  { id: 'mayapada', name: 'Mayapada Hospital Bandung', url: 'https://mayapadahospital.darwinbox.com/ms/candidate/careers' },
  { id: 'hermina', name: 'Hermina Hospital Pasteur', url: 'https://id-career.myworkplaze.com/hermina' },
];

export const TELEGRAM_CHANNELS = ['pharmacycareer', 'lokerbandungid', 'lokerkimia'];

export function plain(html = '') {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|lt|gt|#39);/g, x => ({'&nbsp;':' ', '&amp;':'&', '&quot;':'"', '&lt;':'<', '&gt;':'>', '&#39;':"'"})[x])
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex, decimal) => {
      const code = parseInt(hex || decimal, hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }).replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

export function sourceDate(value = '') {
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(s)) return s;
  const match = s.match(/^(\d{1,2})[\s/-]+([a-z]+|\d{1,2})[\s/-]+(\d{4})$/i);
  if (!match) return null;
  const months = ['jan', 'feb', 'mar', 'apr', 'mei|may', 'jun', 'jul', 'agu|ags|aug', 'sep', 'okt|oct', 'nov', 'des|dec'];
  const month = /^\d+$/.test(match[2]) ? Number(match[2]) : months.findIndex(names => names.split('|').includes(match[2].slice(0, 3).toLowerCase())) + 1;
  const date = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date ? date : null;
}

export function flightVacancies(html) {
  const found = new Map();
  const chunks = [];
  const records = [];
  const textRecords = new Map();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.__typename === 'Vacancy' && value.slug) {
      const resolve = text => typeof text === 'string' && /^\$[\da-f]+$/.test(text) ? textRecords.get(text.slice(1)) || '' : text;
      if (!found.has(value.slug) || value.description) found.set(value.slug, { ...value, description: resolve(value.description), formattedDescription: resolve(value.formattedDescription) });
    }
    for (const item of Object.values(value)) visit(item);
  }
  // Public server-rendered data, parsed as JSON only; never execute remote JavaScript.
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const match = script[1].match(/self\.__next_f\.push\((.*)\)\s*;?$/s);
    if (!match) continue;
    try {
      const chunk = JSON.parse(match[1])[1];
      if (typeof chunk !== 'string') continue;
      chunks.push(chunk);
    } catch { /* One malformed chunk must not hide other valid records. */ }
  }
  // Flight text records are UTF-8 byte-counted, and can contain newlines with no separator after them.
  const stream = Buffer.from(chunks.join(''));
  let offset = 0;
  while (offset < stream.length) {
    const colon = stream.indexOf(58, offset);
    if (colon < 0) break;
    const id = stream.toString('utf8', offset, colon);
    if (stream[colon + 1] === 84) {
      const comma = stream.indexOf(44, colon + 2);
      if (comma < 0) break;
      const length = parseInt(stream.toString('utf8', colon + 2, comma), 16);
      if (!Number.isFinite(length) || length < 0 || comma + 1 + length > stream.length) break;
      textRecords.set(id, stream.toString('utf8', comma + 1, comma + 1 + length));
      offset = comma + 1 + length;
    } else {
      let end = stream.indexOf(10, colon + 1);
      if (end < 0) end = stream.length;
      try { records.push(JSON.parse(stream.toString('utf8', colon + 1, end))); } catch { /* Import and control records are not JSON models. */ }
      offset = end + 1;
    }
  }
  for (const record of records) visit(record);
  return [...found.values()];
}

export function fromKita(v, verifiedAt) {
  return {
    id: `kitalulus-${v.id}`, sourceId: 'kitalulus', sourceName: 'KitaLulus',
    title: v.positionName, company: v.company?.name?.trim(), city: v.city?.name,
    description: plain(v.description || v.formattedDescription),
    qualificationText: plain(v.description || v.formattedDescription),
    // updatedAt is explicitly supplied by the portal. Do not infer dates from IDs.
    updatedAt: v.updatedAt ? new Date(timestamp(v.updatedAt)).toISOString() : null,
    publishedAt: v.datePosted ? new Date(timestamp(v.datePosted)).toISOString() : null,
    validThrough: v.validThrough || v.closeDate ? new Date(timestamp(v.validThrough || v.closeDate)).toISOString() : null,
    active: v.isClosed === false && v.isPublished === true,
    verifiedAt, type: v.typeStr || 'Tidak disebutkan',
    salaryMin: v.salaryLowerBound || 0, salaryMax: v.salaryUpperBound || 0,
    experience: v.minExperienceStr || (v.minExperience ? `Minimal ${v.minExperience} tahun` : 'Tidak disebutkan'),
    freshGraduate: /fresh\s*graduate|lulusan baru|tanpa pengalaman/i.test(v.description || ''),
    url: `https://www.kitalulus.com/lowongan/detail/${encodeURIComponent(v.slug)}`,
  };
}

function requestOptions(signal, ajax, method) {
  return {
    method, signal,
    headers: {
      Accept: 'text/html,application/json',
      ...(ajax ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
  };
}

async function read(url, requests, ajax = false, method = 'GET') {
  const signal = AbortSignal.any([requests.signal, AbortSignal.timeout(18000)]);
  let response;
  if (requests.remaining === undefined) {
    response = await fetch(url, requestOptions(signal, ajax, method));
  } else {
    for (let redirects = 0; ; redirects++) {
      signal.throwIfAborted();
      if (requests.remaining <= 0) throw new Error('Batas permintaan sumber tercapai.');
      requests.remaining--;
      response = await fetch(url, { ...requestOptions(signal, ajax, method), redirect: 'manual' });
      const location = response.headers.get('Location');
      if (!location || ![301, 302, 303, 307, 308].includes(response.status)) break;
      const next = new URL(location, url);
      await response.body?.cancel();
      const host = value => value.hostname.replace(/^www\./, '');
      if (redirects >= 3 || next.protocol !== 'https:' || next.username || next.password ||
          next.port || host(next) !== host(new URL(url))) throw new Error('Pengalihan halaman sumber tidak dapat diikuti.');
      if (method === 'POST' && [301, 302, 303].includes(response.status)) method = 'GET';
      url = next.href;
    }
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 403 || response.status === 429 ? `Akses otomatis dibatasi (${response.status}).` : `Sumber merespons HTTP ${response.status}.`);
  }
  const html = await response.text();
  if (html.length > 6_000_000) throw new Error('Respons sumber terlalu besar untuk diperiksa.');
  return html;
}

async function searchPages(urls, requests, markers, ajax = false) {
  const readPage = async url => {
    const html = await read(url, requests, ajax);
    if (!markers.every(marker => html.includes(marker))) throw new Error('Format daftar sumber berubah; data belum bisa diverifikasi.');
    return html;
  };
  const results = [];
  const concurrency = requests.remaining === undefined ? urls.length : 4;
  for (let offset = 0; offset < urls.length; offset += concurrency) {
    results.push(...await Promise.allSettled(urls.slice(offset, offset + concurrency).map(readPage)));
  }
  const pages = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (!pages.length) throw results.find(result => result.status === 'rejected').reason;
  return { pages, failed: results.length - pages.length };
}

async function kitalulus(requests, verifiedAt, area) {
  const limit = area ? 10 : 40;
  const urls = (area ? [area] : KITA_AREAS).flatMap(location => SEARCH_TERMS.map(term => `https://www.kitalulus.com/lowongan?keyword=${encodeURIComponent(term)}&location=${encodeURIComponent(location)}`));
  const { pages, failed: failedSearches } = await searchPages(urls, requests, ['self.__next_f.push', 'Info Loker']);
  const candidates = new Map();
  for (const html of pages) for (const v of flightVacancies(html)) {
    // A title is not an education requirement: inspect any local candidate's actual qualifications.
    if (inArea(v.city?.name)) candidates.set(v.slug, v);
  }
  const jobs = [];
  let failed = 0;
  // ponytail: at most 40 detail pages per refresh; add pagination if this niche outgrows the first result pages.
  for (const v of [...candidates.values()].slice(0, limit)) {
    try {
      const html = await read(`https://www.kitalulus.com/lowongan/detail/${encodeURIComponent(v.slug)}`, requests);
      const detail = flightVacancies(html).find(x => x.slug === v.slug && typeof x.description === 'string');
      if (!detail) throw new Error('Detail tidak ditemukan');
      jobs.push(fromKita(detail, verifiedAt));
    } catch { failed++; }
  }
  const limited = candidates.size > limit;
  return { jobs, scanned: candidates.size, partial: failed > 0 || failedSearches > 0 || limited, note: failed || failedSearches || limited ? `${failedSearches} pencarian dan ${failed} detail gagal diperiksa.${limited ? ' Batas ' + limit + ' detail tercapai; hasil belum lengkap.' : ''} Hanya hasil terverifikasi yang ditampilkan.` : 'Daftar dan status lowongan berhasil diperiksa.' };
}

export function jsonLdJobs(html) {
  const found = [];
  const walk = v => {
    if (!v || typeof v !== 'object') return;
    if ([v['@type']].flat().includes('JobPosting')) found.push(v);
    for (const item of Object.values(v)) if (typeof item === 'object') walk(item);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(match[1])); } catch { /* Broken metadata is not trusted. */ }
  }
  return found;
}

const closedPage = html => /lowongan (?:ini )?(?:(?:sudah|telah) )?(?:ditutup|berakhir|tidak aktif|tidak tersedia)|no longer (?:accepting|available)|job (?:has expired|is closed)/i.test(plain(html));

function fromLd(v, source, url, verifiedAt) {
  const locations = [v.jobLocation].flat().filter(Boolean);
  const address = locations.length === 1 ? locations[0].address : null;
  const city = address?.addressLocality;
  const description = plain(v.description);
  const education = typeof v.educationRequirements === 'string' ? v.educationRequirements : JSON.stringify(v.educationRequirements || '');
  return {
    id: `${source.id}-${url}`, sourceId: source.id, sourceName: source.name,
    title: plain(v.title), company: v.hiringOrganization?.name, city: /^(?:kota bandung|bandung kota)$/i.test(city || '') ? CITY : city,
    description, qualificationText: `${description}\n${education}`,
    publishedAt: v.datePosted, validThrough: v.validThrough, active: Number.isFinite(timestamp(v.validThrough, true)) && timestamp(v.validThrough, true) >= Date.now(),
    verifiedAt, url, type: v.employmentType || 'Tidak disebutkan', salaryMin: 0, salaryMax: 0,
    experience: 'Tidak disebutkan', freshGraduate: /fresh\s*graduate|lulusan baru/i.test(description),
  };
}

export function jobstreetJob(html, expectedId) {
  const marker = /window\.SEEK_REDUX_DATA\s*=\s*/.exec(html);
  if (!marker) return null;
  const start = marker.index + marker[0].length;
  if (html[start] !== '{') return null;
  let quoted = false, escaped = false, depth = 0;
  // The public page embeds JSON in a script. Parse only its JSON value; never evaluate the script.
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try {
        const job = JSON.parse(html.slice(start, i + 1)).jobdetails?.result?.job;
        return job && String(job.id) === String(expectedId) ? job : null;
      } catch { return null; }
    }
  }
  return null;
}

export function fromJobstreet(job, verifiedAt, listingDate) {
  const description = plain(job.content || job.content2);
  const label = plain(job.location?.label);
  let city = label.split(',')[0].trim();
  if (/^(?:kota bandung|bandung kota)$/i.test(city)) city = CITY;
  return {
    id: `jobstreet-${job.id}`, sourceId: 'jobstreet', sourceName: 'Jobstreet',
    title: plain(job.title), company: plain(job.advertiser?.name), city,
    description, qualificationText: description,
    publishedAt: job.listedAt?.dateTimeUtc || listingDate,
    validThrough: job.expiresAt?.dateTimeUtc,
    active: job.status === 'Active' && job.isExpired === false,
    verifiedAt, url: `https://id.jobstreet.com/id/job/${encodeURIComponent(job.id)}`,
    type: job.workTypes?.label || 'Tidak disebutkan', salaryMin: 0, salaryMax: 0,
    experience: 'Tidak disebutkan', freshGraduate: /fresh\s*graduate|lulusan baru|tanpa pengalaman/i.test(description),
  };
}

async function jobstreet(requests, verifiedAt, area) {
  const limit = area ? 25 : 50;
  // Observed public website service, not SEEK's separately authenticated partner API.
  const results = await Promise.allSettled((area ? [area] : JOBSTREET_AREAS).flatMap(location => ['D3 Farmasi', 'farmasi', 'TTK', 'TVF'].map(async term => {
    const url = new URL('https://id.jobstreet.com/api/jobsearch/v5/search');
    url.search = new URLSearchParams({ siteKey: 'ID-Main', keywords: term, where: location, sortMode: 'ListedDate', pageSize: '30', page: '1' });
    const data = JSON.parse(await read(url.href, requests));
    if (!Array.isArray(data.data)) throw new Error('Format pencarian Jobstreet berubah; data belum bisa diverifikasi.');
    return data.data;
  })));
  const pages = results.filter(result => result.status === 'fulfilled');
  if (!pages.length) throw results.find(result => result.status === 'rejected').reason;
  const candidates = new Map();
  for (const page of pages) for (const item of page.value) {
    if (/^\d+$/.test(String(item.id))) candidates.set(String(item.id), item);
  }
  const selected = [...candidates.values()].sort((a, b) => timestamp(b.listingDate) - timestamp(a.listingDate)).slice(0, limit);
  const jobs = []; let failed = 0;
  for (const item of selected) {
    try {
      const html = await read(`https://id.jobstreet.com/id/job/${item.id}`, requests);
      const job = jobstreetJob(html, item.id);
      if (!job) throw new Error('Detail Jobstreet belum dapat dibaca.');
      jobs.push(fromJobstreet(job, verifiedAt, item.listingDate));
    } catch { failed++; }
  }
  const failedSearches = results.length - pages.length;
  const limited = candidates.size > limit;
  return {
    jobs, scanned: candidates.size, partial: failed > 0 || failedSearches > 0 || limited,
    note: `Pencarian JSON dan ${selected.length - failed} detail publik berhasil dibaca.${failedSearches || failed ? ` ${failedSearches} pencarian dan ${failed} detail gagal diperiksa.` : ''}${limited ? ' Batas ' + limit + ' detail tercapai; hasil belum lengkap.' : ''}`,
  };
}

async function portal(source, requests, verifiedAt) {
  const html = await read(source.url, requests);
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => { try { return new URL(m[1].replace(/&amp;/g, '&'), source.url); } catch { return null; } })
    .filter(url => url && url.origin === new URL(source.url).origin && (source.id === 'glints' ? /\/opportunities\/jobs\//.test(url.pathname) : /\/job\/\d+/.test(url.pathname)));
  const urls = [...new Set(links.map(url => url.origin + url.pathname))].slice(0, 25);
  if (!urls.length) throw new Error('Daftar publik belum dapat dibaca; buka sumber untuk mencari langsung.');
  const jobs = []; let failed = 0;
  for (const url of urls) {
    try {
      const detail = await read(url, requests);
      if (closedPage(detail)) continue;
      const records = jsonLdJobs(detail);
      if (!records.length) { failed++; continue; }
      for (const record of records) jobs.push(fromLd(record, source, url, verifiedAt));
    } catch { failed++; }
  }
  return { jobs, scanned: urls.length, partial: failed > 0, note: failed ? `${failed} detail belum dapat diverifikasi dan disembunyikan.` : 'Metadata dan batas lamaran berhasil diperiksa.' };
}

async function bimma(requests, verifiedAt) {
  const jobs = []; const urls = new Set();
  const { pages, failed: failedSearches } = await searchPages(SEARCH_TERMS.map(term => `https://disnaker.bandung.go.id/loker/get-data-local?search=${encodeURIComponent(term)}&page=1`), requests, ['pagination-meta'], true);
  for (const html of pages) {
    for (const m of html.matchAll(/href=["'](https:\/\/disnaker\.bandung\.go\.id\/detail-loker\/\d+)["']/g)) urls.add(m[1]);
  }
  let failed = 0;
  for (const url of [...urls].slice(0, 30)) {
    try {
      const html = await read(url, requests);
      if (closedPage(html)) continue;
      // Only trust explicit structured metadata; do not guess location from an employer's office.
      const records = jsonLdJobs(html);
      if (!records.length) { failed++; continue; }
      for (const record of records) jobs.push(fromLd(record, SOURCES[1], url, verifiedAt));
    } catch { failed++; }
  }
  const limited = urls.size > 30;
  return { jobs, scanned: urls.size, partial: failed > 0 || failedSearches > 0 || limited, note: failed || failedSearches || limited ? `${failedSearches} pencarian dan ${failed} detail belum dapat diverifikasi.${limited ? ' Batas 30 detail tercapai; hasil belum lengkap.' : ''} Hanya hasil terverifikasi yang ditampilkan.` : 'Bursa kerja Kota Bandung berhasil diperiksa.' };
}

function sourceRecord(source, url, verifiedAt, values) {
  return {
    id: `${source.id}-${url}`, sourceId: source.id, sourceName: source.name, url, verifiedAt,
    publishedAt: null, updatedAt: null, validThrough: null, active: false,
    type: 'Tidak disebutkan', salaryMin: 0, salaryMax: 0, experience: 'Tidak disebutkan',
    freshGraduate: /fresh\s*graduate|lulusan baru|tanpa pengalaman/i.test(values.qualificationText || ''), ...values,
  };
}

function cityLabel(text = '') {
  return plain(text).match(/\b(?:kota\s+(?:bandung|cimahi)|kab(?:upaten|\.)?\s+bandung(?:\s+barat)?|bandung(?:\s+(?:barat|kota))?|cimahi)\b/i)?.[0]?.replace(/^kab\.?\s+/i, 'Kabupaten ');
}

function publicLinks(html, origin, pattern) {
  return [...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].flatMap(match => {
    try {
      const url = new URL(match[1].replace(/&amp;/g, '&'), origin);
      return url.origin === origin && pattern.test(url.pathname) ? [url.origin + url.pathname] : [];
    } catch { return []; }
  }))];
}

function pageMetadata(html, url) {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const found = [data, ...[data['@graph'] || []].flat()].find(item => item && /WebPage|Article/.test(item['@type']) && (item.url || item['@id'] || '').replace(/\/$/, '') === url.replace(/\/$/, ''));
      if (found) return found;
    } catch { /* Ignore malformed structured data. */ }
  }
  return {};
}

async function checkedDetails(source, urls, requests, verifiedAt, parse, searchNote = '', failedSearches = 0) {
  const selected = [...new Set(urls)].slice(0, 30);
  const jobs = []; let failed = 0, incomplete = 0;
  // ponytail: four public detail requests at a time, at most 30 per source; paginate when this niche outgrows it.
  for (let offset = 0; offset < selected.length; offset += 4) {
    const batch = await Promise.allSettled(selected.slice(offset, offset + 4).map(async url => parse(await read(url, requests), url, verifiedAt, source)));
    for (const result of batch) {
      if (result.status === 'rejected') { failed++; continue; }
      const records = [result.value].flat().filter(Boolean);
      if (!records.length) incomplete++;
      jobs.push(...records);
    }
  }
  const limited = urls.length > selected.length;
  return {
    jobs, scanned: urls.length, partial: !!(failed || incomplete || failedSearches || limited),
    note: `${searchNote || 'Daftar publik berhasil dibaca.'} ${selected.length - failed} detail berhasil diperiksa.${failedSearches ? ` ${failedSearches} pencarian gagal.` : ''}${failed ? ` ${failed} detail gagal dibaca.` : ''}${incomplete ? ` ${incomplete} detail belum memiliki data yang cukup atau tidak memenuhi kriteria.` : ''}${limited ? ' Batas 30 detail tercapai; cakupan belum lengkap.' : ''}`,
  };
}

function farmacareMarkup(html) {
  if (!html.trimStart().startsWith('{')) return html;
  const data = JSON.parse(html);
  if (typeof data.content !== 'string') throw new Error('Isi halaman Farmacare belum dapat diperiksa.');
  return data.content;
}

export function farmacareCandidates(html, now = Date.now()) {
  html = farmacareMarkup(html);
  const found = []; let updatedAt;
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    if (/class=["']row-tanggal["']/.test(match[0])) { updatedAt = sourceDate(plain(match[1]).replace('📅', '').trim()); continue; }
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1]);
    if (cells.length !== 4 || !acceptsD3(plain(cells[2])) || !inArea(cityLabel(plain(cells[3]))) || timestamp(updatedAt) < threeMonthsAgo(now)) continue;
    found.push(...publicLinks(cells[0], 'https://www.farmacare.id', /^\/loker\/\d+-/));
  }
  return [...new Set(found)];
}

export function fromFarmacare(html, url, verifiedAt, source = SOURCES.find(item => item.id === 'farmacare')) {
  html = farmacareMarkup(html);
  const text = plain(html).split('Loker Farmasi Farmacare')[1]?.split('Disclaimer:')[0];
  if (!text) return null;
  const field = (label, next) => text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${next}:|$)`, 'i'))?.[1].trim();
  const title = field('Posisi', 'Pendidikan Terakhir');
  const education = field('Pendidikan Terakhir', 'Alamat');
  const company = text.split('Posisi:')[0].split('\n').map(line => line.trim()).filter(Boolean).at(-1);
  const status = field('Status Loker', '$');
  const details = [
    ['Jenis usaha', text.split('Posisi:')[0].split('\n').map(line => line.trim()).filter(Boolean).slice(0, -1).join(' ')],
    ['Nama perusahaan', company], ['Posisi', title], ['Pendidikan terakhir', education],
    ['Alamat', field('Alamat', 'Kota/Kab')], ['Kota/Kabupaten', field('Kota/Kab', 'Lokasi Peta')],
    ['Tanggal pembaruan', field('Tanggal Update', 'Status Loker')], ['Status lowongan', status],
  ].filter(([, value]) => value).map(([label, value]) => ({ label, value }));
  return sourceRecord(source, url, verifiedAt, {
    title, company, city: cityLabel(field('Kota/Kab', 'Lokasi Peta')),
    qualificationText: education, description: text.trim(), details,
    updatedAt: sourceDate(field('Tanggal Update', 'Status Loker') || ''),
    active: /^aktif$/i.test(status || ''), statusExplicit: /^aktif$/i.test(status || ''),
    validThrough: telegramDeadline(text),
  });
}

async function farmacare(source, requests, verifiedAt) {
  const html = await read(source.url, requests);
  if (!html.includes('loker-table')) throw new Error('Format daftar Farmacare berubah; belum dapat diperiksa.');
  return checkedDetails(source, farmacareCandidates(html), requests, verifiedAt, fromFarmacare);
}

export function fromLokerBandung(html, url, verifiedAt, source = SOURCES.find(item => item.id === 'lokerbandung')) {
  const main = html.slice(html.indexOf('<h1')).split('<div class="loker-terkait"')[0];
  if (!main.includes('ringkasan-block') || /class=["']lowongan-ditutup["']/.test(main)) return [];
  const company = plain(main.match(/class="perusahaan"[^>]*>([\s\S]*?)<\/span>/)?.[1] || '');
  const title = plain(main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<span\b[^>]*>[\s\S]*?<\/span>/g, '') || '');
  const summaryCity = plain(main.match(/class="lokasi-value"[^>]*>([\s\S]*?)<\/li>/)?.[1] || '');
  const details = main.match(/class="loker-detail"[^>]*>([\s\S]*?)<\/span>/)?.[1] || '';
  const sections = [...details.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/gi)];
  const roles = sections.length ? sections.map(match => ({ title: plain(match[1]), description: plain(match[2]) })) : [{ title, description: plain(details) }];
  return roles.filter(role => acceptsD3(role.description)).map(role => {
    const placement = role.description.match(/penempatan[^\n]*/i)?.[0];
    const city = cityLabel(placement || summaryCity);
    if (!inArea(city) || !placement && /luar bandung/i.test(summaryCity)) return null;
    return sourceRecord(source, url, verifiedAt, {
      ...role, id: `${source.id}-${url}-${role.title}`, company, city, qualificationText: role.description,
      publishedAt: pageMetadata(html, url).datePublished,
      validThrough: telegramDeadline(plain(main)),
      active: /class="lamar"|class="kirim-lamaran-block"/.test(main),
      statusExplicit: /class="lamar"|class="kirim-lamaran-block"/.test(main),
    });
  }).filter(Boolean);
}

async function lokerBandung(source, requests, verifiedAt) {
  const { pages, failed } = await searchPages([source.url, ...['farmasi', 'TTK', 'TVF'].map(term => `https://www.lokerbandung.id/?s=${term}`)], requests, ['LokerBandung']);
  const urls = [...new Set(pages.flatMap(html => publicLinks(html.split('<div id="loker-container">')[1] || '', 'https://www.lokerbandung.id', /^\/lowongan\/[^/]+\/?$/)))];
  return checkedDetails(source, urls, requests, verifiedAt, fromLokerBandung, '', failed);
}

export function fromMedion(html, url, verifiedAt, source = SOURCES.find(item => item.id === 'medion'), listed = {}) {
  const text = plain(html).split('Detail Lowongan')[1]?.split('Dapatkan Berita')[0];
  if (!text) return null;
  const description = text.split('Deskripsi Pekerjaan')[1]?.split('STRATA')[0]?.trim() || '';
  const location = text.match(/LOKASI KERJA\s*([\s\S]*?)KATEGORI/)?.[1];
  const metadata = pageMetadata(html, url);
  return sourceRecord(source, url, verifiedAt, {
    title: plain(listed.title?.rendered || text.split('Diperbarui')[0]), company: 'Medion', city: cityLabel(location),
    description, qualificationText: description,
    publishedAt: listed.date || metadata.datePublished,
    updatedAt: listed.modified || metadata.dateModified,
    active: listed.status === 'publish' && text.includes('Daftar Sekarang') && !closedPage(text),
    statusExplicit: listed.status === 'publish' && text.includes('Daftar Sekarang'),
    validThrough: telegramDeadline(text),
  });
}

async function medion(source, requests, verifiedAt) {
  const data = JSON.parse(await read('https://www.medion.co.id/wp-json/wp/v2/career_post?per_page=100', requests));
  if (!Array.isArray(data)) throw new Error('Format daftar karier Medion berubah.');
  const candidates = data.filter(job => job.status === 'publish' && job.class_list?.includes('career-department-taxonomy-farmasi') && job.class_list?.includes('educution-category-d3'));
  const allowed = candidates.filter(job => /^https:\/\/www\.medion\.co\.id\/karir\/[^/]+\/$/.test(job.link));
  const byUrl = new Map(allowed.map(job => [job.link, job]));
  const result = await checkedDetails(source, [...byUrl.keys()], requests, verifiedAt, (html, url) => fromMedion(html, url, verifiedAt, source, byUrl.get(url)));
  if (data.length === 100) { result.partial = true; result.note += ' Batas 100 posisi tercapai; daftar belum lengkap.'; }
  return result;
}

const recruitmentTitle = /\b(?:lowongan|rekrutmen|rekrutasi|recruitment|penerimaan\s+(?:calon\s+)?(?:tenaga|pegawai|karyawan))\b/i;
const selectionTitle = /\b(?:hasil seleksi|lolos seleksi|jadwal tes|jadwal seleksi|penipuan|peringatan)\b/i;
const isRecruitment = title => recruitmentTitle.test(title) && !selectionTitle.test(title);

function recentPosting(date, checkedAt) {
  const now = timestamp(checkedAt);
  const posted = timestamp(date);
  return posted >= threeMonthsAgo(now) && posted <= now;
}

function hospitalDeadlines(text) {
  const dates = [...text.matchAll(/(?:deadline|batas\s+(?:akhir\s+)?(?:lamaran|pendaftaran|pengiriman berkas)|paling\s+lambat|(?:lamaran|pendaftaran)\s+(?:ditutup|sampai(?:\s+dengan)?))\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\s/-]+(?:[a-z]+|\d{1,2})[\s/-]+\d{4})/gi)];
  return [...new Set(dates.map(match => sourceDate(match[1])).filter(Boolean))];
}

function hospitalNotice(source, url, verifiedAt, { title, content, publishedAt }) {
  const text = plain(content);
  if (!title || !recentPosting(publishedAt, verifiedAt) || closedPage(text) ||
    /\b(?:rekrutmen|pendaftaran|lamaran)\s+(?:sudah|telah)\s+ditutup\b/i.test(text)) return [];
  const [preamble, ...sections] = text.split(/^[ \t]*(?:posisi|jabatan)[ \t]*:[ \t]*([^\n]+)\n/im);
  const roles = [];
  for (let i = 0; i < sections.length; i += 2) {
    roles.push({ title: sections[i].trim(), description: sections[i + 1].trim() });
  }
  if (!roles.length) roles.push({ title, description: text });
  const sharedDeadlines = hospitalDeadlines(roles.length > 1 ? preamble : text);

  const placement = value => value.match(/^[ \t]*(?:lokasi(?: kerja| penempatan)?|penempatan)[ \t]*(?::\s*|[ \t]+di[ \t]+)([^\n]+)/im)?.[1]?.split(',')[0].trim();
  const hospitalName = value => value.toLowerCase().replace(/^rumah sakit /, 'rs ').replace(/\./g, '');

  return roles.flatMap(role => {
    const location = placement(role.description) || placement(preamble);
    const sameUnit = !location || [source.name, source.name + ' Bandung'].some(name => hospitalName(name) === hospitalName(location));
    const city = sameUnit ? CITY : location;
    const localDeadline = hospitalDeadlines(role.description);
    const validThrough = localDeadline.length === 1 ? localDeadline[0] : localDeadline.length === 0 && sharedDeadlines.length === 1 ? sharedDeadlines[0] : null;
    if (!acceptsD3(role.description) || !inArea(city) || !validThrough) return [];
    return [sourceRecord(source, url, verifiedAt, {
      id: source.id + '-' + url + '-' + role.title, title: role.title, company: source.name, city,
      qualificationText: role.description, description: role.description, publishedAt, validThrough,
      active: timestamp(validThrough, true) >= timestamp(verifiedAt),
    })];
  });
}

async function borromeus(source, requests, verifiedAt) {
  // Public list requested by the portal's home page, with no filters, account or application submission.
  const portal = 'https://117.102.68.252/recruitmentportal';
  const list = 'https://117.102.68.252/RecruitmentPortal/Home/HomeVacancyList';
  const html = await read(list, requests, true, 'POST');
  const cards = html.split(/<div class="box box-solid">/i).slice(1);
  if (!cards.length && !/tidak ada lowongan|tidak ditemukan/i.test(plain(html))) throw new Error('Daftar rekrutmen Borromeus belum dapat dibaca.');
  const jobs = [];
  let partial = false;
  for (const card of cards) {
    const field = label => plain(card.split('<b>' + label + ' :</b>')[1]?.match(/^\s*<p>([\s\S]*?)<\/p>/i)?.[1]);
    const title = field('Posisi');
    const placement = field('Lokasi Penempatan');
    const text = plain(card);
    const publishedAt = sourceDate(text.match(/(?:tanggal tayang|tanggal buka|dibuka pada)\s*:?\s*([^\n]+)/i)?.[1] || '');
    if (!title || !publishedAt || !hospitalDeadlines(text).length) partial = true;
    if (!/^RS\.?\s+Santo Borromeus(?: Bandung)?$/i.test(placement)) continue;
    jobs.push(...hospitalNotice(source, portal, verifiedAt, { title, content: card, publishedAt }));
  }
  return { jobs, scanned: cards.length, partial, note: partial ? 'Tanggal tayang atau penutupan belum tersedia untuk semua posisi publik.' : 'Daftar rekrutmen publik diperiksa.' };
}

async function alislam(source, requests, verifiedAt) {
  const api = 'https://www.rsalislam.com/wp-json/wp/v2/';
  const categories = JSON.parse(await read(api + 'categories?slug=karir', requests));
  const category = categories.find(item => item.slug === 'karir' && Number.isInteger(item.id));
  if (!category) throw new Error('Kategori Karir RS Al Islam belum dapat dibaca.');
  const posts = JSON.parse(await read(api + 'posts?categories=' + category.id + '&per_page=20&_fields=link,title,content,date,status', requests));
  if (!Array.isArray(posts)) throw new Error('Daftar Karir RS Al Islam belum dapat dibaca.');
  const notices = posts.filter(post => post.status === 'publish' && /^https:\/\/www\.rsalislam\.com\/[^/?#]+\/?$/.test(post.link) && recentPosting(post.date, verifiedAt));
  const jobs = notices.flatMap(post => hospitalNotice(source, post.link, verifiedAt, {
    title: plain(post.title?.rendered), content: post.content?.rendered, publishedAt: post.date,
  }));
  return { jobs, scanned: posts.length, partial: posts.length === 20 || notices.some(post => !hospitalDeadlines(plain(post.content?.rendered)).length), note: 'Kategori Karir RS Al Islam diperiksa.' };
}

async function rshs(source, requests, verifiedAt) {
  const { data, totalPages } = JSON.parse(await read('https://rshs.go.id/api/articles?page=1&per_page=30', requests));
  if (!Array.isArray(data)) throw new Error('Daftar pengumuman RSHS belum dapat dibaca.');
  const notices = data.filter(post => post.status === 'publish' && Number.isInteger(post.id) && isRecruitment(plain(post.title)) && recentPosting(post.published_at, verifiedAt));
  const jobs = notices.flatMap(post => hospitalNotice(source, 'https://rshs.go.id/berita/detail/' + post.id, verifiedAt, {
    title: plain(post.title), content: post.content, publishedAt: post.published_at,
  }));
  return { jobs, scanned: data.length, partial: totalPages > 1 || notices.some(post => !hospitalDeadlines(plain(post.content)).length), note: 'Berita dan pengumuman RSHS diperiksa.' };
}

async function advent(source, requests, verifiedAt) {
  const origin = 'https://rsadventbandung.com';
  const { pages, failed } = await searchPages([origin + '/articles', origin + '/news-program'], requests, ['icon-calendar3']);
  const urls = pages.flatMap(page => page.split(/<div class="entry col-/i).slice(1).flatMap(card => {
    const title = plain(card.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
    const date = sourceDate(plain(card.match(/icon-calendar3[^>]*><\/i>([^<]+)/i)?.[1]));
    return isRecruitment(title) && recentPosting(date, verifiedAt) ? publicLinks(card, origin, /^\/(?:articles|news-program)\/[^/]+\/?$/).slice(0, 1) : [];
  }));
  return checkedDetails(source, urls, requests, verifiedAt, (html, url) => {
    const entry = html.split('class="entry clearfix"')[1]?.split('<!-- .entry end -->')[0] || '';
    const title = plain(entry.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    const publishedAt = sourceDate(plain(entry.match(/icon-calendar3[^>]*><\/i>([^<]+)/i)?.[1]));
    const content = entry.match(/class="entry-content[^"]*"[^>]*>([\s\S]*)/i)?.[1];
    return isRecruitment(title) ? hospitalNotice(source, url, verifiedAt, { title, publishedAt, content }) : [];
  }, 'Artikel dan berita RS Advent diperiksa.', failed);
}

async function rsudBandung(source, requests, verifiedAt) {
  const page = await read(source.url, requests);
  if (!page.includes('Artikel tentang pengumuman')) throw new Error('Daftar pengumuman RSUD Kota Bandung belum dapat dibaca.');
  const origin = new URL(source.url).origin;
  const urls = [...page.matchAll(/<h4>\s*(<a\b[^>]*>([\s\S]*?)<\/a>)\s*<\/h4>([\s\S]*?)<\/p>/gi)].flatMap(([, link, title, meta]) => {
    const date = sourceDate(plain(meta.match(/fa-calendar[^>]*><\/i>\s*<span>([^<]+)/i)?.[1]).split(',').at(-1).trim());
    return isRecruitment(plain(title)) && recentPosting(date, verifiedAt) ? publicLinks(link, origin, /^\/blog\/[^/]+$/) : [];
  });
  return checkedDetails(source, urls, requests, verifiedAt, (html, url) => {
    const detail = html.split('class="blog-detail clearfix"')[1]?.split('<!-- Blog Detail End -->')[0] || '';
    const title = plain(detail.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    const date = plain(detail.match(/fa-calendar[^>]*><\/i>\s*<span>([^<]+)/i)?.[1]);
    const publishedAt = sourceDate(date.split(',').at(-1).trim());
    const content = detail.match(/<article class="entry-content clearfix">([\s\S]*?)<\/article>/i)?.[1];
    return isRecruitment(title) ? hospitalNotice(source, url, verifiedAt, { title, publishedAt, content }) : [];
  }, 'Pengumuman RSUD Kota Bandung diperiksa.');
}

export function fromRedy(html, url, verifiedAt, source = SOURCES.find(item => item.id === 'redy')) {
  const structured = jsonLdJobs(html);
  if (structured.length) return structured.map(record => fromLd(record, source, url, verifiedAt));
  // The observed public detail has no posting/deadline fields. Do not use og:updated_time (request time).
  return null;
}

async function redy(source, requests, verifiedAt) {
  const { pages, failed } = await searchPages(['farmasi', 'TTK', 'TVF', 'apoteker'].map(term => `https://www.getredy.id/lowongan/1?search=${term}`), requests, ['Informasi Lowongan Kerja Terbaru']);
  const urls = [...new Set(pages.flatMap(html => publicLinks(html, 'https://www.getredy.id', /^\/lowongan\/detail\/\d+-/)))];
  return checkedDetails(source, urls, requests, verifiedAt, fromRedy, 'Pencarian publik REDY terbaca; detail tanpa tanggal tayang dan status terverifikasi disembunyikan.', failed);
}

export function telegramPosts(html, channel) {
  if (!TELEGRAM_CHANNELS.includes(channel)) return [];
  return html.split(/(?=<div class="tgme_widget_message_wrap\b)/).slice(1).flatMap(chunk => {
    const post = chunk.match(/\bdata-post="([^"]+)"/)?.[1];
    if (!post || !new RegExp(`^${channel}/[0-9]+$`).test(post)) return [];
    const text = plain(chunk.match(/class="tgme_widget_message_text\b[^>]*>([\s\S]*?)<\/div>/)?.[1] || '').normalize('NFKC');
    return [{ id: post, text, publishedAt: chunk.match(/<time\b[^>]*datetime="([^"]+)"/)?.[1], url: `https://t.me/${post}` }];
  });
}

export function telegramDeadline(text) {
  const match = text.match(/(?:batas\s+(?:akhir\s+)?(?:lamaran|pendaftaran)|deadline|paling\s+lambat)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{1,2}\s+[a-z]+\s+\d{4})/i);
  if (!match) return null;
  let date = match[1];
  if (!/^\d{4}-/.test(date)) {
    const parts = date.split(/[\s/-]+/);
    const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const month = /^\d+$/.test(parts[1]) ? Number(parts[1]) : months.findIndex(name => name === parts[1].toLowerCase() || name.slice(0, 3) === parts[1].toLowerCase()) + 1;
    date = `${parts[2]}-${String(month).padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date ? date : null;
}

export function fromTelegram(post, verifiedAt) {
  const text = post.text;
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const company = text.match(/^(?:perusahaan|instansi|nama (?:apotek|klinik|perusahaan))\s*:\s*([^\n]+)/im)?.[1]
    || lines.find(line => /^(?:PT\.?|CV\.?|Apotek|Klinik|Rumah Sakit|RS(?:UD|IA|U)?\.?)\s+\S/i.test(line));
  const placement = text.match(/^(?:[-•][ \t]*)?(?:penempatan|lokasi(?: kerja)?)\b[ \t]*:?[ \t]*(?:di[ \t]+)?([^\n]+)/im)?.[1]?.trim();
  const locationText = placement || text.match(/\b(?:di|daerah|area)\s+([^\n]+)/i)?.[1] || '';
  const city = locationText.match(/\b(?:kota\s+(?:bandung|cimahi)|kab(?:upaten|\.)?\s+bandung(?:\s+barat)?|bandung(?:\s+(?:barat|kota))?|cimahi)\b/i)?.[0];
  const validThrough = telegramDeadline(text);
  if (!inArea(city) || !Number.isFinite(timestamp(post.publishedAt))) return null;
  const title = text.match(/^(?:posisi|jabatan)\s*:\s*([^\n]+)/im)?.[1] || lines[0]?.slice(0, 160) || 'Informasi lowongan D3 Farmasi';
  return {
    id: `telegram-${post.id}`, sourceId: 'telegram', sourceName: 'Telegram',
    title, company: company || 'Perusahaan belum disebutkan', city, description: text, qualificationText: text,
    publishedAt: post.publishedAt, verifiedAt, validThrough,
    active: closedPage(text) || /\bclosed\b|sudah terisi|posisi (?:sudah )?terisi/i.test(text) ? false : null,
    needsConfirmation: true,
    url: post.url, type: 'Tidak disebutkan', salaryMin: 0, salaryMax: 0,
    experience: 'Tidak disebutkan', freshGraduate: /fresh\s*graduate|lulusan baru|tanpa pengalaman/i.test(text),
  };
}

async function telegram(requests, verifiedAt) {
  // ponytail: newest public preview and one keyword page per channel; no full archive or poster OCR.
  const pages = await Promise.allSettled(TELEGRAM_CHANNELS.flatMap(channel => ['', '?q=Farmasi'].map(async query => {
    const html = await read(`https://t.me/s/${channel}${query}`, requests);
    if (!html.includes('tgme_channel_info') || !html.includes('tgme_channel_history')) throw new Error('Pratinjau kanal publik belum dapat dibaca.');
    return { channel, posts: telegramPosts(html, channel) };
  })));
  const readable = pages.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (!readable.length) throw pages.find(result => result.status === 'rejected').reason;
  const posts = [...new Map(readable.flatMap(page => page.posts).map(post => [post.id, post])).values()];
  const candidates = posts.filter(post => acceptsD3(post.text));
  const jobs = candidates.map(post => fromTelegram(post, verifiedAt)).filter(Boolean);
  const incomplete = candidates.length - jobs.length;
  const failed = pages.length - readable.length;
  const mediaOnly = posts.filter(post => !post.text).length;
  return {
    jobs, scanned: posts.length, partial: failed > 0 || incomplete > 0 || mediaOnly > 0 || jobs.length > 0,
    note: `${new Set(readable.map(page => page.channel)).size} kanal publik dan ${posts.length} pesan berhasil dibaca. Temuan Telegram ditampilkan sebagai "Perlu konfirmasi", termasuk bila tanggal tutup tidak diketahui.${failed ? ` ${failed} halaman gagal dibaca.` : ''}${incomplete ? ` ${incomplete} pesan D3 Farmasi tanpa lokasi Bandung/Cimahi atau tanggal tayang yang terbaca disembunyikan.` : ''}${mediaOnly ? ` ${mediaOnly} pesan tanpa teks belum dapat diperiksa.` : ''}`,
  };
}

export async function collectSource(source, signal, verifiedAt, { area, requestLimit } = {}) {
  const requests = { signal, remaining: requestLimit };
  const added = { farmacare, redy, lokerbandung: lokerBandung, medion, borromeus, alislam, advent, rshs, 'rsud-bandung': rsudBandung }[source.id];
  const result = added ? await added(source, requests, verifiedAt) : source.id === 'kitalulus' ? await kitalulus(requests, verifiedAt, area) : source.id === 'bimma' ? await bimma(requests, verifiedAt) : source.id === 'jobstreet' ? await jobstreet(requests, verifiedAt, area) : source.id === 'telegram' ? await telegram(requests, verifiedAt) : await portal(source, requests, verifiedAt);
  return { ...result, jobs: result.jobs.filter(job => job.company && job.title && acceptsD3(job.qualificationText)) };
}
