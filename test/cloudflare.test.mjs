import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { JobCollector } from '../cloudflare/worker.mjs';
import { collectSource, SOURCES } from '../server/sources.mjs';
import { REFRESH_MS } from '../src/jobs.mjs';

test('Cloudflare Cron combines source batches in KV without a public refresh or upload endpoint', async () => {
  let stored;
  let writes = 0;
  let active = 0;
  let concurrency = 0;
  const requested = [];
  const env = {
    JOB_SNAPSHOTS: {
      async put(key, value) {
        assert.equal(key, 'latest');
        stored = JSON.parse(value);
        writes++;
      },
      async get(key, type) {
        assert.equal(key, 'latest');
        assert.equal(type, 'json');
        return stored;
      },
    },
    ASSETS: { fetch: () => new Response('Loker Farmasi') },
    JOB_COLLECTOR: {
      getByName(name) {
        if (name === 'scheduler') {
          return { fetch: (url, init) => coordinator.fetch(new Request(url, init)) };
        }
        return {
          async fetch(url, init) {
            requested.push(name);
            assert.equal(new URL(url).searchParams.get('batch'), name);
            active++;
            concurrency = Math.max(concurrency, active);
            await Promise.resolve();
            active--;
            if (['glints-0', 'jobstreet-0'].includes(name)) {
              return Response.json({ error: 'Akses otomatis dibatasi (403).' });
            }
            const checkedAt = init.headers['X-Checked-At'];
            const jobs = name === 'jobstreet-1' ? [{
              id: 'jobstreet-ttk', sourceId: 'jobstreet', title: 'TTK', company: 'Apotek Pengujian',
              city: 'Cimahi', qualificationText: 'Pendidikan D3 Farmasi', active: true,
              publishedAt: checkedAt, verifiedAt: checkedAt, validThrough: new Date(Date.now() + 60000).toISOString(),
              url: 'https://example.org/job',
            }] : [];
            return Response.json({ result: { jobs, partial: false, scanned: jobs.length, note: 'Sumber terbaca.' } });
          },
        };
      },
    },
  };
  const coordinator = new JobCollector({}, env);
  const send = (path, init) => worker.fetch(new Request('https://loker.example' + path, init), env);

  assert.equal(await (await send('/')).text(), 'Loker Farmasi');
  const empty = await (await send('/api/jobs')).json();
  assert.deepEqual(empty.jobs, []);
  assert.equal(empty.refreshMode, 'snapshot');
  assert.equal(empty.lastCheckedAt, null);
  assert.equal((await send('/api/jobs/refresh', { method: 'POST' })).status, 404);
  assert.equal((await send('/api/jobs/snapshot', { method: 'PUT' })).status, 404);
  assert.equal(requested.length, 0);

  await Promise.all([worker.scheduled({}, env), worker.scheduled({}, env)]);
  assert.equal(writes, 1);
  assert.equal(requested.length, SOURCES.length + 4);
  assert.equal(new Set(requested).size, requested.length);
  assert.equal(requested.filter(name => name.startsWith('kitalulus-')).length, 4);
  assert.equal(requested.filter(name => name.startsWith('jobstreet-')).length, 2);
  assert.ok(concurrency <= 5);
  await worker.scheduled({}, env);
  assert.equal(writes, 1);

  const response = await send('/api/jobs');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const visible = await response.json();
  assert.deepEqual(visible.jobs.map(item => item.id), ['jobstreet-ttk']);
  assert.equal(visible.sources.find(source => source.id === 'glints').status, 'error');
  assert.equal(visible.sources.find(source => source.id === 'jobstreet').status, 'partial');
  assert.equal(visible.sources.find(source => source.id === 'hermina').status, 'manual');

  stored.jobs[0].verifiedAt = new Date(Date.now() - REFRESH_MS - 1000).toISOString();
  const expired = await (await send('/api/jobs')).json();
  assert.deepEqual(expired.jobs, []);
  assert.equal(expired.sources.find(source => source.id === 'jobstreet').count, 0);
});

test('the cloud request budget counts redirects and stays within the source host', async t => {
  const source = SOURCES.find(item => item.id === 'farmacare');
  const targets = [];
  let redirect = 'https://farmacare.id/loker-farmasi';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.redirect, 'manual');
    targets.push(url);
    return url === source.url
      ? new Response(null, { status: 302, headers: { Location: redirect } })
      : new Response('<table class="loker-table"></table>');
  });
  const check = requestLimit => collectSource(source, new AbortController().signal, new Date().toISOString(), { requestLimit });
  await assert.rejects(check(1), /Batas permintaan/);
  assert.deepEqual(targets.splice(0), [source.url]);
  await check(2);
  assert.deepEqual(targets.splice(0), [source.url, redirect]);
  redirect = 'https://example.org/unrelated';
  await assert.rejects(check(2), /Pengalihan halaman/);
  assert.deepEqual(targets, [source.url]);
});
