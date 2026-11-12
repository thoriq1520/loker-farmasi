import { timingSafeEqual } from 'node:crypto';
import { REFRESH_MS, selectJobs } from '../src/jobs.mjs';

const SNAPSHOT_KEY = 'latest';
const DISPATCH_KEY = 'last-workflow-dispatch';
const CRON_INTERVAL_MS = 5 * 60_000;
const WORKFLOW_DISPATCH_URL = 'https://api.github.com/repos/thoriq1520/loker-farmasi/actions/workflows/refresh-jobs.yml/dispatches';
const MAX_SNAPSHOT_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function canWrite(request, secret) {
  if (!secret || secret.length < 32) return false;
  const provided = encoder.encode(request.headers.get('Authorization') || '');
  const expected = encoder.encode('Bearer ' + secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function storeSnapshot(request, env) {
  if (!canWrite(request, env.JOB_SNAPSHOT_TOKEN)) return json({ error: 'Akses ditolak.' }, 401);
  if (Number(request.headers.get('Content-Length')) > MAX_SNAPSHOT_BYTES) {
    return json({ error: 'Data terlalu besar.' }, 413);
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_SNAPSHOT_BYTES) return json({ error: 'Data terlalu besar.' }, 413);
  const text = new TextDecoder().decode(body);
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    return json({ error: 'Data lowongan tidak valid.' }, 400);
  }

  const checkedAt = Date.parse(snapshot?.lastCheckedAt);
  const now = Date.now();
  if (!Array.isArray(snapshot?.jobs) || !Array.isArray(snapshot.sources) ||
    !snapshot.jobs.every(job => typeof job?.qualificationText === 'string') ||
    !snapshot.sources.every(source => typeof source?.id === 'string') ||
    !Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt >= REFRESH_MS) {
    return json({ error: 'Data lowongan tidak valid atau sudah lewat.' }, 400);
  }
  await env.JOB_SNAPSHOTS.put(SNAPSHOT_KEY, text);
  return new Response(null, { status: 204 });
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
  async scheduled(controller, env) {
    if (!env.GITHUB_DISPATCH_TOKEN) return;
    const snapshot = await env.JOB_SNAPSHOTS.get(SNAPSHOT_KEY, 'json');
    // Allow two cron ticks for the runner to start and publish before the current results expire.
    if (Date.now() - Date.parse(snapshot?.lastCheckedAt) < REFRESH_MS - 2 * CRON_INTERVAL_MS) return;

    const lastDispatch = Number(await env.JOB_SNAPSHOTS.get(DISPATCH_KEY));
    if (lastDispatch && controller.scheduledTime - lastDispatch < REFRESH_MS - CRON_INTERVAL_MS) return;

    const response = await fetch(WORKFLOW_DISPATCH_URL, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + env.GITHUB_DISPATCH_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'loker-farmasi-worker',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error('GitHub gagal memulai pemeriksaan (HTTP ' + response.status + ').');
    await env.JOB_SNAPSHOTS.put(DISPATCH_KEY, String(controller.scheduledTime), { expirationTtl: 3600 });
  },

  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/jobs' && request.method === 'GET') return readJobs(env);
    if (pathname === '/api/jobs/snapshot' && request.method === 'PUT') return storeSnapshot(request, env);
    if (pathname.startsWith('/api/')) return json({ error: 'Alamat API tidak ditemukan.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
