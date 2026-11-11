export const REFRESH_MS = 30 * 60 * 1000;
export const CITY = 'Kota Bandung';

export function inArea(city = '') {
  return /^(?:bandung|kota bandung|bandung kota|(?:kabupaten|kab\.?) bandung(?: barat)?|bandung barat|cimahi|kota cimahi|cimahi kota)$/i.test(String(city).trim().replace(/\s+/g, ' '));
}

export function timestamp(value, endOfDay = false) {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return value > 1e14 ? value / 1000 : value < 1e11 ? value * 1000 : value;
  // Posting dates start the local day; date-only deadlines include its final millisecond.
  return Date.parse(/^\d{4}-\d\d-\d\d$/.test(value) ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}+07:00` : /^\d{4}-\d\d-\d\dT[\d:.]+$/.test(value) ? `${value}+07:00` : value);
}

export function threeMonthsAgo(now = Date.now()) {
  const wib = new Date(now + 7 * 60 * 60 * 1000);
  const year = wib.getUTCFullYear(), month = wib.getUTCMonth() - 3;
  const day = Math.min(wib.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return Date.UTC(year, month, day) - 7 * 60 * 60 * 1000;
}

export function acceptsD3(text = '') {
  const s = text.toLowerCase().replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/diploma\s*(?:iii|3|tiga)\b/g, 'd3').replace(/\bd[ -]?3\b/g, 'd3')
    .replace(/\bs[ -]?1\b/g, 's1').replace(/[()]/g, ' ')
    .replace(/(\b(?:d3|d4|s1))[^\S\n]*\n\s*(?=(?:(?:jurusan|prodi|program studi)\s*:?\s*)?farmasi\b)/g, '$1 ');
  if (/(?:wajib|minimal|minimum|harus)\s+(?:lulusan\s+|pendidikan\s+)?s1\b(?!\s*(?:\/|atau|dan)\s*d3\b)|wajib\s+(?:profesi\s+)?apoteker|tidak\s+(?:menerima|untuk)\s+(?:lulusan\s+)?d3|d3\s+farmasi\s+tidak\s+(?:diterima|diperkenankan)/i.test(s)) return false;
  // ponytail: only explicit degree/major clauses qualify; a pharmacy job title or industry is not proof.
  return s.split(/[\n.;]/).some(line => {
    const degrees = [...line.matchAll(/\b(?:d[1-4]|s[1-3]|smk|sma)(?:\s*(?:\/|,|atau|dan)\s*(?:d[1-4]|s[1-3]|smk|sma))*\b/g)];
    return degrees.some((degree, index) => {
      if (!/\bd3\b/.test(degree[0])) return false;
      const before = line.slice(0, degree.index);
      const after = line.slice(degree.index + degree[0].length, degrees[index + 1]?.index)
        .split(/\b(?:pengalaman|memiliki|perusahaan|industri|penempatan|bekerja|dengan|untuk)\b/)[0];
      return /\bfarmasi\s*(?:(?:minimal|min|setara)\s*)?:?\s*$/.test(before) || /\bfarmasi\b/.test(after);
    });
  });
}

export function eligible(job, now = Date.now()) {
  const checked = timestamp(job.verifiedAt);
  const dated = timestamp(job.publishedAt || job.updatedAt);
  const deadline = timestamp(job.validThrough, true);
  const telegramLead = job.sourceId === 'telegram' && job.needsConfirmation === true && /^https:\/\/t\.me\/[a-z0-9_]+\/\d+$/i.test(job.url || '');
  const explicitStatus = ['farmacare', 'medion', 'lokerbandung'].includes(job.sourceId) && job.statusExplicit === true && job.active === true && !job.validThrough;
  return inArea(job.city) &&
    acceptsD3(job.qualificationText) && (telegramLead ? job.active !== false : job.active === true) &&
    Number.isFinite(dated) && dated >= threeMonthsAgo(now) && dated <= now &&
    Number.isFinite(checked) && checked <= now && now - checked < REFRESH_MS &&
    // Telegram leads may have no deadline, but explicit closures and past deadlines stay hidden.
    (Number.isFinite(deadline) ? deadline >= now : telegramLead || explicitStatus) &&
    /^https:\/\//.test(job.url || '');
}

export function selectJobs(jobs, { query = '', source = '', days = 0, salary = false, fresh = false, saved = null } = {}, now = Date.now()) {
  const q = query.trim().toLowerCase();
  const unique = new Set();
  return jobs.filter(job => eligible(job, now))
    .sort((a, b) => timestamp(b.publishedAt || b.updatedAt) - timestamp(a.publishedAt || a.updatedAt))
    .filter(job => {
    const key = `${job.title}|${job.company}|${job.city}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  })
    .filter(job => (!source || job.sourceId === source) &&
      (!q || `${job.title} ${job.company} ${job.description}`.toLowerCase().includes(q)) &&
      (!days || now - timestamp(job.publishedAt || job.updatedAt) <= days * 86400000) &&
      (!salary || job.salaryMin > 0) && (!fresh || job.freshGraduate === true) &&
      (!saved || saved.includes(job.id)));
}

export function paginateJobs(jobs, page = 1, pageSize = 10) {
  const size = [10, 20, 50].includes(pageSize) ? pageSize : 10;
  const pageCount = Math.max(1, Math.ceil(jobs.length / size));
  const current = Math.max(1, Math.min(Math.floor(page) || 1, pageCount));
  const start = (current - 1) * size;
  const firstButton = Math.max(1, Math.min(current - 1, pageCount - 2));
  return {
    items: jobs.slice(start, start + size), page: current, pageCount,
    start: jobs.length ? start + 1 : 0, end: Math.min(start + size, jobs.length),
    pages: Array.from({ length: Math.min(3, pageCount) }, (_, index) => firstButton + index),
  };
}
