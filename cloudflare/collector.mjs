import { collectSource, DIRECT_SOURCES, JOBSTREET_AREAS, KITA_AREAS, SOURCES } from '../server/sources.mjs';
import { REFRESH_MS, selectJobs } from '../src/jobs.mjs';

export const SNAPSHOT_KEY = 'latest';
const CRON_INTERVAL_MS = 5 * 60_000;
const RECHECK_AGE_MS = REFRESH_MS - 2 * CRON_INTERVAL_MS;
const INTERNAL = 'https://jobs.internal';

const batches = SOURCES.flatMap(source => {
  const areas = source.id === 'kitalulus' ? KITA_AREAS : source.id === 'jobstreet' ? JOBSTREET_AREAS : [undefined];
  return areas.map((area, index) => ({ name: source.id + '-' + index, source, area }));
});

function sourceError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'Pemeriksaan melewati batas waktu.';
  const message = String(error?.message || error);
  if (/^internal error; reference =/i.test(message)) return 'Pemeriksaan sumber gagal dijalankan.';
  return /fetch failed|network connection lost|connection reset/i.test(message)
    ? 'Sumber tidak dapat dijangkau saat pemeriksaan.'
    : message;
}

async function collectBatch(env, batch, checkedAt) {
  const url = new URL('/collect', INTERNAL);
  url.searchParams.set('batch', batch.name);
  try {
    const res = await env.JOB_COLLECTOR.getByName(batch.name).fetch(url.href, {
      method: 'POST', headers: { 'X-Checked-At': checkedAt },
    });
    if (!res.ok) throw new Error('Pemeriksaan sumber gagal (HTTP ' + res.status + ').');
    return { ...batch, ...await res.json() };
  } catch (error) {
    console.warn('Collector ' + batch.name + ': ' + sourceError(error));
    return { ...batch, error: 'Pemeriksaan sumber gagal dijalankan.' };
  }
}

function sourceStatus(source, runs, checkedAt, jobs) {
  const completed = runs.filter(run => run.result);
  const incomplete = runs.length - completed.length;
  const status = !completed.length ? 'error' : incomplete || completed.some(run => run.result.partial) ? 'partial' : 'ok';
  const note = status === 'error' ? runs[0].error : runs.map(run => {
    const message = run.result?.note || run.error;
    return run.area ? run.area + ': ' + message : message;
  }).join(' ');
  return {
    ...source, status, note, checkedAt,
    scanned: completed.reduce((sum, run) => sum + run.result.scanned, 0),
    count: jobs.filter(job => job.sourceId === source.id).length,
  };
}

// The coordinator handles one run at a time. Each source batch runs as a separate
// Durable Object request, with its own outgoing request budget.
export class JobCollector {
  constructor(_state, env) {
    this.env = env;
    this.refreshing = false;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    if (url.pathname === '/refresh') {
      await this.refresh();
      return new Response(null, { status: 204 });
    }
    const batch = batches.find(item => item.name === url.searchParams.get('batch'));
    const checkedAt = request.headers.get('X-Checked-At');
    if (url.pathname !== '/collect' || !batch || !checkedAt) return new Response(null, { status: 404 });
    try {
      const result = await collectSource(batch.source, AbortSignal.timeout(60000), checkedAt, {
        area: batch.area, requestLimit: 45,
      });
      return Response.json({ result });
    } catch (error) {
      return Response.json({ error: sourceError(error) });
    }
  }

  async refresh() {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const previous = await this.env.JOB_SNAPSHOTS.get(SNAPSHOT_KEY, 'json');
      const now = Date.now();
      if (now - Date.parse(previous?.lastCheckedAt) < RECHECK_AGE_MS) return;
      const checkedAt = new Date(now).toISOString();
      const runs = [];
      // Up to five live internal requests, below the six-connection limit.
      for (let offset = 0; offset < batches.length; offset += 5) {
        runs.push(...await Promise.all(batches.slice(offset, offset + 5).map(batch => collectBatch(this.env, batch, checkedAt))));
      }
      const jobs = selectJobs(runs.flatMap(run => run.result?.jobs || []));
      const snapshot = {
        jobs,
        sources: [
          ...SOURCES.map(source => sourceStatus(source, runs.filter(run => run.source.id === source.id), checkedAt, jobs)),
          ...DIRECT_SOURCES.map(source => ({ ...source, status: 'manual' })),
        ],
        lastCheckedAt: checkedAt,
        nextCheckAt: new Date(Math.ceil((now + RECHECK_AGE_MS) / CRON_INTERVAL_MS) * CRON_INTERVAL_MS).toISOString(),
      };
      await this.env.JOB_SNAPSHOTS.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
      console.log('Pemeriksaan selesai. ' + jobs.length + ' lowongan dari ' + runs.filter(run => run.result).length + '/' + runs.length + ' bagian terbaca.');
    } finally {
      this.refreshing = false;
    }
  }
}
