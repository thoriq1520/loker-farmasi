import { createJobService } from '../server/jobs.mjs';
import { REFRESH_MS } from '../src/jobs.mjs';

const { WORKER_URL, JOB_SNAPSHOT_TOKEN } = process.env;
if (!WORKER_URL || !JOB_SNAPSHOT_TOKEN || JOB_SNAPSHOT_TOKEN.length < 32) {
  throw new Error('Isi WORKER_URL dan JOB_SNAPSHOT_TOKEN sebelum menjalankan pemeriksaan.');
}

const endpoint = new URL('/api/jobs/snapshot', WORKER_URL);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
if (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) {
  throw new Error('WORKER_URL harus menggunakan HTTPS.');
}

if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  const current = await fetch(new URL('/api/jobs', endpoint), { signal: AbortSignal.timeout(5000) })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);
  if (Date.now() - Date.parse(current?.lastCheckedAt) < REFRESH_MS - 5 * 60_000) {
    console.log('Hasil pemeriksaan terakhir masih baru.');
    process.exit(0);
  }
}

const service = createJobService();
let snapshot;
try {
  snapshot = await service.refresh();
} finally {
  service.close();
}

const response = await fetch(endpoint, {
  method: 'PUT',
  redirect: 'error',
  signal: AbortSignal.timeout(20000),
  headers: {
    'Authorization': 'Bearer ' + JOB_SNAPSHOT_TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(snapshot),
});
if (response.status !== 204) throw new Error('Worker menolak data lowongan (HTTP ' + response.status + ').');
console.log('Pemeriksaan selesai. ' + snapshot.jobs.length + ' lowongan dikirim ke Cloudflare.');
