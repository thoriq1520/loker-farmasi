import { JobCollector, SNAPSHOT_KEY } from './collector.mjs';
import { REFRESH_MS, selectJobs } from '../src/jobs.mjs';

export { JobCollector };

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

async function readJobs(env) {
  const snapshot = await env.JOB_SNAPSHOTS.get(SNAPSHOT_KEY, 'json');
  const jobs = selectJobs(snapshot?.jobs || []);
  const sources = (snapshot?.sources || []).map(source => source.status === 'manual' ? source : {
    ...source,
    count: jobs.filter(job => job.sourceId === source.id).length,
  });
  return json({
    jobs, sources,
    lastCheckedAt: snapshot?.lastCheckedAt ?? null,
    nextCheckAt: snapshot?.nextCheckAt ?? null,
    refreshMinutes: REFRESH_MS / 60000,
    refreshing: false,
    refreshMode: 'snapshot',
  });
}

export default {
  async scheduled(_controller, env) {
    const response = await env.JOB_COLLECTOR.getByName('scheduler').fetch('https://jobs.internal/refresh', { method: 'POST' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Pemeriksaan lowongan gagal dijalankan (HTTP ' + response.status + ').');
    }
  },

  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/jobs' && request.method === 'GET') return readJobs(env);
    if (pathname.startsWith('/api/')) return json({ error: 'Alamat API tidak ditemukan.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
