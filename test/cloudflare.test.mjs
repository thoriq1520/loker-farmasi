import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
import { REFRESH_MS } from '../src/jobs.mjs';

test('Cloudflare serves static assets and only accepts fresh snapshots from the collector', async () => {
  const token = 'test-only-secret-for-the-collector';
  let stored;
  const env = {
    JOB_SNAPSHOT_TOKEN: token,
    JOB_SNAPSHOTS: {
      async put(key, value) {
        assert.equal(key, 'latest');
        stored = JSON.parse(value);
      },
      async get(key, type) {
        assert.equal(key, 'latest');
        assert.equal(type, 'json');
        return stored;
      },
    },
    ASSETS: { fetch: () => new Response('Loker Farmasi') },
  };
  const send = (path, init) => worker.fetch(new Request('https://loker.example' + path, init), env);
  const upload = (body, auth = token) => send('/api/jobs/snapshot', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + auth },
    body: JSON.stringify(body),
  });

  assert.equal(await (await send('/')).text(), 'Loker Farmasi');
  const empty = await (await send('/api/jobs')).json();
  assert.deepEqual(empty.jobs, []);
  assert.equal(empty.refreshMode, 'snapshot');
  assert.equal(empty.lastCheckedAt, null);
  assert.equal((await send('/api/jobs/refresh', { method: 'POST' })).status, 404);

  const now = Date.now();
  const checkedAt = new Date(now - 1000).toISOString();
  const job = {
    id: 'farmacare-ttk', sourceId: 'farmacare', title: 'TTK', company: 'Apotek Pengujian',
    city: 'Kota Bandung', qualificationText: 'Pendidikan D3 Farmasi', active: true,
    publishedAt: checkedAt, verifiedAt: checkedAt, validThrough: new Date(now + 60000).toISOString(),
    url: 'https://example.org/job',
  };
  const data = {
    jobs: [job, { ...job, id: 'closed', title: 'Sudah tutup', validThrough: new Date(now - 2000).toISOString() }],
    sources: [{ id: 'farmacare', status: 'ok', count: 2 }, { id: 'hermina', status: 'manual' }],
    lastCheckedAt: checkedAt,
  };
  assert.equal((await upload(data, token.replace('test', 'fake'))).status, 401);
  assert.equal((await upload({ ...data, lastCheckedAt: new Date(now - REFRESH_MS - 1000).toISOString() })).status, 400);
  assert.equal(stored, undefined);
  assert.equal((await upload(data)).status, 204);

  const response = await send('/api/jobs');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const visible = await response.json();
  assert.deepEqual(visible.jobs.map(item => item.id), [job.id]);
  assert.equal(visible.sources[0].count, 1);
  assert.equal(visible.sources[1].count, undefined);

  stored.jobs[0].verifiedAt = new Date(now - REFRESH_MS - 1000).toISOString();
  const expired = await (await send('/api/jobs')).json();
  assert.deepEqual(expired.jobs, []);
  assert.equal(expired.sources[0].count, 0);
});
