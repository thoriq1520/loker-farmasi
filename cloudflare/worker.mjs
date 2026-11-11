import { timingSafeEqual } from 'node:crypto';
import { REFRESH_MS, selectJobs } from '../src/jobs.mjs';

const SNAPSHOT_KEY = 'latest';
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
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/jobs' && request.method === 'GET') return readJobs(env);
    if (pathname === '/api/jobs/snapshot' && request.method === 'PUT') return storeSnapshot(request, env);
    if (pathname.startsWith('/api/')) return json({ error: 'Alamat API tidak ditemukan.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
