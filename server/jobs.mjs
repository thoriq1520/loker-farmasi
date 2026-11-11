import { DIRECT_SOURCES, SOURCES, collectSource } from './sources.mjs';
import { REFRESH_MS, selectJobs } from '../src/jobs.mjs';

export function createJobService({ collect = collectSource, interval = REFRESH_MS } = {}) {
  let jobs = [];
  let sources = SOURCES.map(source => ({ ...source, status: 'pending', note: 'Menunggu pemeriksaan pertama.', checkedAt: null, count: 0 }));
  let lastCheckedAt = null;
  let inFlight = null;
  let controller;
  const timer = setInterval(() => refresh(), interval);
  timer.unref();

  function snapshot() {
    const visible = selectJobs(jobs);
    return {
      jobs: visible,
      sources: [
        ...sources.map(source => ({ ...source, count: visible.filter(job => job.sourceId === source.id).length })),
        ...DIRECT_SOURCES.map(source => ({ ...source, status: 'manual' })),
      ],
      lastCheckedAt, nextCheckAt: lastCheckedAt ? new Date(Date.parse(lastCheckedAt) + interval).toISOString() : null,
      refreshMinutes: interval / 60000, refreshing: !!inFlight,
    };
  }
  async function refresh() {
    if (inFlight) return inFlight;
    const checkedAt = new Date().toISOString();
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);
    inFlight = (async () => {
      const results = await Promise.all(SOURCES.map(async source => {
        try {
          const result = await collect(source, controller.signal, checkedAt);
          return { jobs: result.jobs, source: { ...source, status: result.partial ? 'partial' : 'ok', note: result.note, checkedAt, scanned: result.scanned, count: 0 } };
        } catch (error) {
          return { jobs: [], source: { ...source, status: 'error', note: error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Pemeriksaan melewati batas waktu. Coba lagi nanti.' : error.message.includes('fetch failed') ? 'Sumber tidak dapat dijangkau. Periksa koneksi internet.' : error.message, checkedAt, count: 0 } };
        }
      }));
      // Failed sources lose their previous results immediately: never serve unverified stale jobs.
      jobs = results.flatMap(result => result.jobs);
      sources = results.map(result => result.source);
      lastCheckedAt = checkedAt;
    })().finally(() => { clearTimeout(timeout); inFlight = null; });
    await inFlight;
    return snapshot();
  }
  refresh();
  return { snapshot, refresh, close() { clearInterval(timer); controller?.abort(); } };
}

export async function handleApi(req, res, service) {
  const path = req.url?.split('?')[0];
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (path === '/api/jobs' && req.method === 'GET') return send(200, service.snapshot());
  if (path === '/api/jobs/refresh' && req.method === 'POST') {
    // This local API has no cross-origin mutation access, and refreshes are coalesced/cooldown-limited.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Permintaan dari situs lain ditolak.' });
    const state = service.snapshot();
    if (!state.refreshing && state.lastCheckedAt && Date.now() - Date.parse(state.lastCheckedAt) < 60000) return send(200, state);
    return send(200, await service.refresh());
  }
  return send(404, { error: 'Alamat API tidak ditemukan.' });
}
