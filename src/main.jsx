import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { selectJobs, paginateJobs } from './jobs.mjs';
import './style.css';

function Icon({ name, size = 20, ...props }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    external: <><path d="M14 4h6v6m0-6L10 14" /><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    bookmark: <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4Z" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 7a7.5 7.5 0 0 1 12-2L20 8M4 16l2.5 3a7.5 7.5 0 0 0 12-2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    filter: <><path d="M4 7h16M4 17h16" /><circle cx="8" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12a18 18 0 0 0 18 0M12 11v4" /></>,
    alert: <><path d="m12 3 10 18H2Z" /><path d="M12 9v5m0 3v.1" /></>,
    pill: <><path d="m6 10 4-4a5.7 5.7 0 0 1 8 8l-4 4a5.7 5.7 0 0 1-8-8Z" /><path d="m8 8 8 8" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.briefcase}</svg>;
}

const date = value => value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : 'Belum diketahui';
const time = value => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB';
const currency = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const salaryLabel = job => job.salaryMin ? `${currency(job.salaryMin)}${job.salaryMax > job.salaryMin ? ` – ${currency(job.salaryMax)}` : ''}` : '';
const statusLabel = { ok: 'Terhubung', partial: 'Sebagian terbaca', error: 'Belum terbaca', pending: 'Memeriksa', manual: 'Cek langsung' };

function App() {
  const [data, setData] = useState({ jobs: [], sources: [], lastCheckedAt: null, refreshing: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [queryInput, setQueryInput] = useState(new URLSearchParams(location.search).get('q') || '');
  const [query, setQuery] = useState(queryInput);
  const [source, setSource] = useState('');
  const [days, setDays] = useState(0);
  const [salary, setSalary] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(() => { try { const ids = JSON.parse(localStorage.getItem('farmasi-saved') || '[]'); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []; } catch { return []; } });
  const sourceDialog = useRef(null);
  const detailDialog = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const motion = document.createElement('script');
    motion.type = 'module';
    motion.src = '/assets/motion/motion.js';
    motion.onerror = () => document.documentElement.classList.add('m-enter-done');
    document.body.appendChild(motion);
    let timeout;
    let controller;
    async function load() {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/jobs', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!res.ok) throw new Error();
        const next = await res.json();
        if (!Array.isArray(next.jobs) || !Array.isArray(next.sources)) throw new Error();
        if (!mounted.current) return;
        setData(next); setError(''); setNow(Date.now());
        timeout = setTimeout(load, next.refreshing ? 2000 : 30000);
      } catch (err) {
        if (!mounted.current || err.name === 'AbortError') return;
        setError('Koneksi terputus. Pastikan aplikasi masih berjalan.');
        setData(current => ({ ...current, jobs: [], refreshing: false }));
        timeout = setTimeout(load, 10000);
      }
    }
    load();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timeout); load(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted.current = false; controller?.abort(); clearTimeout(timeout); clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function refresh() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/jobs/refresh', { method: 'POST', signal: AbortSignal.timeout(75000) });
      if (!res.ok) throw new Error();
      const next = await res.json();
      if (mounted.current) { setData(next); setNow(Date.now()); setNotice('Lowongan diperbarui.'); }
    } catch { if (mounted.current) setError('Gagal memperbarui. Coba lagi.'); }
    finally { if (mounted.current) setBusy(false); }
  }

  function saveJob(job) {
    const next = saved.includes(job.id) ? saved.filter(id => id !== job.id) : [...saved, job.id];
    try { localStorage.setItem('farmasi-saved', JSON.stringify(next)); setSaved(next); setNotice(next.includes(job.id) ? 'Disimpan.' : 'Simpanan dihapus.'); }
    catch { setNotice('Lowongan tidak bisa disimpan di browser ini.'); }
  }

  const all = selectJobs(data.jobs, {}, now);
  const savedCount = all.filter(job => saved.includes(job.id)).length;
  const jobs = selectJobs(data.jobs, { query, source, days, salary, fresh, saved: tab === 'saved' ? saved : null }, now);
  const pagination = paginateJobs(jobs, page, pageSize);
  const checking = busy || data.refreshing;
  const connected = data.sources.filter(item => item.status === 'ok' || item.status === 'partial').length;
  const hasFilter = !!(query || source || days || salary || fresh);

  function resetFilters() { setQuery(''); setQueryInput(''); setSource(''); setDays(0); setSalary(false); setFresh(false); setPage(1); history.replaceState(null, '', location.pathname); }
  function search(event) { event.preventDefault(); setQuery(queryInput); setPage(1); const url = new URL(location.href); queryInput.trim() ? url.searchParams.set('q', queryInput.trim()) : url.searchParams.delete('q'); history.replaceState(null, '', url); document.getElementById('results').scrollIntoView({ block: 'start' }); }
  function changePage(next) { setPage(next); document.getElementById('results').scrollIntoView({ block: 'start' }); }
  function openJob(job) { setSelected(job); detailDialog.current.showModal(); }

  useEffect(() => { setPage(1); }, [query, source, days, salary, fresh, tab, pageSize]);
  useEffect(() => { setPage(current => Math.min(current, pagination.pageCount)); }, [pagination.pageCount]);

  useEffect(() => {
    if (selected && !all.some(job => job.id === selected.id)) { detailDialog.current?.close(); setSelected(null); }
  }, [data, now, selected]);

  return <>
    <a className="skip-link" href="#top">Lewati ke pencarian</a>
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" href="/" aria-label="Loker Farmasi, beranda"><span className="brand-mark"><Icon name="pill" size={25} /></span><span>Loker<span className="brand-light">Farmasi</span><span className="brand-dot">.</span></span></a>
        <nav className="main-nav" aria-label="Menu utama">
          <button className={tab === 'all' ? 'nav-link active' : 'nav-link'} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>Cari lowongan</button>
          <button className={tab === 'saved' ? 'nav-link active' : 'nav-link'} aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}><Icon name="bookmark" size={17} />Tersimpan<span className="nav-count">{savedCount}</span></button>
        </nav>
        <button className="source-button" aria-label="Lihat status sumber lowongan" onClick={() => sourceDialog.current.showModal()}><span className={`status-dot ${connected ? 'good' : ''}`} /><span>Status sumber</span><Icon name="chevron" size={15} /></button>
      </div>
    </header>

    <main id="top">
      <section className="search-hero hero" data-enter aria-labelledby="hero-title">
        <div className="wrap">
          <div className="hero-heading"><h1 id="hero-title">Loker D3 Farmasi<br /><span>Bandung &amp; Cimahi.</span></h1></div>
          <form className="search-bar" onSubmit={search} role="search">
            <label className="query-field" htmlFor="search"><Icon name="search" size={23} /><span><span className="field-label">Kata kunci</span><input id="search" type="search" placeholder="Posisi atau nama perusahaan" value={queryInput} onChange={e => setQueryInput(e.target.value)} /></span></label>
            <div className="locked-location"><Icon name="pin" size={22} /><span><span className="field-label">Lokasi penempatan</span><strong>Bandung &amp; Cimahi</strong></span><Icon name="lock" size={16} /></div>
            <button className="btn btn--primary search-submit" type="submit">Cari lowongan<Icon name="arrow" size={18} /></button>
          </form>
          <p className="refresh-interval">Diperbarui otomatis tiap 30 menit</p>
        </div>
      </section>

      <div className="wrap workspace">
        <aside className="filters" aria-label="Filter lowongan">
          <div className="filter-heading"><p><Icon name="filter" size={18} />Filter lowongan</p><button className="mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? 'Tutup filter' : 'Buka filter'}<Icon name="chevron" size={16} /></button><button className="text-button" onClick={resetFilters} disabled={!hasFilter}>Reset</button></div>
          <div id="filter-fields" className={`filter-fields ${filtersOpen ? 'filters-open' : ''}`}>
          <fieldset><legend>Sumber lowongan</legend><label className="radio-row"><input type="radio" name="source" checked={!source} onChange={() => setSource('')} /><span>Semua sumber</span><span className="filter-count">{all.length}</span></label>
            {data.sources.filter(item => item.status !== 'manual').map(item => <label className="radio-row" key={item.id}><input type="radio" name="source" checked={source === item.id} onChange={() => setSource(item.id)} /><span>{item.name}</span>{item.status === 'error' ? <span className="muted" title="Sumber belum bisa dibaca otomatis">—</span> : <span className="filter-count">{all.filter(job => job.sourceId === item.id).length}</span>}</label>)}
            {!data.sources.length && <span className="muted filter-wait">Memuat sumber…</span>}
          </fieldset>
          <div className="filter-group"><label className="filter-label" htmlFor="days">Waktu tayang</label><div className="select-wrap"><select id="days" value={days} onChange={e => setDays(Number(e.target.value))}><option value="0">3 bulan terakhir</option><option value="7">7 hari terakhir</option><option value="14">14 hari terakhir</option><option value="30">30 hari terakhir</option></select><Icon name="chevron" size={16} /></div></div>
          <fieldset><legend>Preferensi</legend><label className="check-row"><input type="checkbox" checked={fresh} onChange={e => setFresh(e.target.checked)} /><span>Menerima fresh graduate</span></label><label className="check-row"><input type="checkbox" checked={salary} onChange={e => setSalary(e.target.checked)} /><span>Mencantumkan gaji</span></label></fieldset>
          <p className="area-note">Termasuk Kabupaten Bandung dan Bandung Barat.</p>
          </div>
        </aside>

        <div className="results-column" id="results">
          <div className="results-heading"><div className="result-title-row"><h2>{tab === 'saved' ? 'Tersimpan' : 'Lowongan terbaru'}</h2><span className="total-badge" aria-label={`${jobs.length} lowongan`}>{jobs.length}</span></div><div className="sort-label"><Icon name="clock" size={16} />Paling baru</div></div>
          <div className="results-meta"><span aria-live="polite">{checking ? 'Sedang memeriksa sumber lowongan…' : data.lastCheckedAt ? `Diperiksa ${date(data.lastCheckedAt)}, ${time(data.lastCheckedAt)}` : 'Menunggu pemeriksaan sumber'}</span><button className="refresh-button" onClick={refresh} disabled={checking}><Icon name="refresh" size={16} className={checking ? 'spinning' : ''} />{checking ? 'Memeriksa' : 'Perbarui'}</button></div>
          {error && <div className="notice error-notice" role="alert"><Icon name="alert" /><p>{error}</p></div>}
          {checking && !data.lastCheckedAt ? <div className="loading-state" role="status"><span className="loading-ring" /><h3>Memuat lowongan…</h3></div> : jobs.length ? <div className="job-list">{pagination.items.map(job => <article className="job-card card" key={job.id}>
            <div className="job-card-top"><span className="company-initial" aria-hidden="true">{job.company.slice(0, 2).toUpperCase()}</span><div className="company-name">{job.company}<span className={job.needsConfirmation ? 'needs-confirmation' : ''}><span className={`status-dot ${job.needsConfirmation ? 'pending' : 'good'}`} />{job.needsConfirmation ? 'Perlu konfirmasi' : 'Aktif di sumber'}</span></div><button className={`icon-button save-button ${saved.includes(job.id) ? 'is-saved' : ''}`} aria-label={saved.includes(job.id) ? `Hapus ${job.title} dari simpanan` : `Simpan ${job.title}`} aria-pressed={saved.includes(job.id)} onClick={() => saveJob(job)}><Icon name="bookmark" /></button></div>
            <h3><button className="job-title" onClick={() => openJob(job)}>{job.title}</button></h3><div className="job-tags"><span><Icon name="pin" size={15} />{job.city}</span>{job.type && job.type !== 'Tidak disebutkan' && <span>{job.type}</span>}<span>D3 Farmasi</span></div>{job.salaryMin > 0 && <p className="salary">{salaryLabel(job)}</p>}<div className="job-card-bottom"><span>{job.publishedAt ? 'Tayang' : 'Diperbarui'} {date(job.publishedAt || job.updatedAt)}<span className="meta-separator">·</span>{job.sourceName}</span><button className="job-detail-link" onClick={() => openJob(job)}>Lihat detail<Icon name="arrow" size={17} /></button></div>
          </article>)}</div> : <div className="empty-state">
            <div className="empty-visual" aria-hidden="true"><span className="empty-visual-back" /><div className="empty-sheet"><span /><span /><span /><Icon name={tab === 'saved' ? 'bookmark' : 'search'} size={32} /></div><span className="empty-check"><Icon name="check" size={15} /></span></div>
            <h3>{tab === 'saved' ? 'Belum ada simpanan' : 'Tidak ada hasil'}</h3>
            {tab === 'saved' ? <p>Tekan ikon simpan pada lowongan.</p> : hasFilter && <p>Ubah kata kunci atau filter.</p>}
            <button className="btn btn--secondary" onClick={tab === 'saved' ? () => setTab('all') : hasFilter ? resetFilters : () => sourceDialog.current.showModal()}>{tab === 'saved' ? 'Cari lowongan' : hasFilter ? 'Reset filter' : 'Lihat status sumber'}<Icon name="arrow" size={17} /></button>
          </div>}

          {jobs.length > 0 && <div className="pagination">
            <div className="pagination-meta">
              <p aria-live="polite">{pagination.start}–{pagination.end} dari {jobs.length} lowongan</p>
              <label className="page-size">Per halaman<select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
            </div>
            {pagination.pageCount > 1 && <nav className="page-controls" aria-label="Halaman lowongan">
              <button className="page-button page-previous" aria-label="Halaman sebelumnya" disabled={pagination.page === 1} onClick={() => changePage(pagination.page - 1)}><Icon name="arrow" size={17} /></button>
              {pagination.pages.map(number => <button className="page-button" key={number} aria-label={`Halaman ${number}`} aria-current={number === pagination.page ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}
              <button className="page-button" aria-label="Halaman berikutnya" disabled={pagination.page === pagination.pageCount} onClick={() => changePage(pagination.page + 1)}><Icon name="arrow" size={17} /></button>
            </nav>}
          </div>}

        </div>
      </div>
    </main>

    <dialog className="modal sources-modal" ref={sourceDialog} onClick={event => { if (event.target === event.currentTarget) sourceDialog.current.close(); }} aria-labelledby="sources-title">
      <div className="modal-head"><h2 id="sources-title">Sumber lowongan</h2><button className="icon-button" onClick={() => sourceDialog.current.close()} aria-label="Tutup status sumber"><Icon name="close" /></button></div>
      <div className="source-list">{data.sources.map(item => <div className="source-row" key={item.id}><span className={`source-symbol symbol-${item.id}`} aria-hidden="true">{item.name.charAt(0)}</span><div className="source-info"><div><strong>{item.name}</strong><span className={`source-state state-${item.status}`}>{statusLabel[item.status]}</span></div>{item.status !== 'manual' && <span className="source-checked">{item.count} lowongan{item.checkedAt ? ` · Dicek ${time(item.checkedAt)}` : ''}</span>}<a className="source-open" href={item.url} target="_blank" rel="noopener noreferrer">Buka {item.name}<Icon name="external" size={14} /></a></div></div>)}</div>
    </dialog>

    <dialog className="modal detail-modal" ref={detailDialog} onClick={event => { if (event.target === event.currentTarget) detailDialog.current.close(); }} aria-labelledby="detail-title">
      {selected && <>
        <div className="modal-head"><span className={`detail-source ${selected.needsConfirmation ? 'needs-confirmation' : ''}`}><span className={`status-dot ${selected.needsConfirmation ? 'pending' : 'good'}`} />{selected.needsConfirmation ? 'Perlu konfirmasi' : 'Aktif'} · {selected.sourceName}</span><button className="icon-button" onClick={() => detailDialog.current.close()} aria-label="Tutup detail lowongan"><Icon name="close" /></button></div>
        <h2 id="detail-title">{selected.title}</h2>
        <p className="detail-company">{selected.company}</p>
        <div className="job-tags"><span><Icon name="pin" size={16} />{selected.city}</span>{selected.type && selected.type !== 'Tidak disebutkan' && <span>{selected.type}</span>}<span>D3 Farmasi</span></div>
        {selected.salaryMin > 0 && <p className="detail-salary">{salaryLabel(selected)}</p>}
        <dl className="detail-facts">
          <div><dt>Batas lamaran</dt><dd>{date(selected.validThrough)}</dd></div>
          <div><dt>{selected.publishedAt ? 'Tanggal tayang' : 'Diperbarui di sumber'}</dt><dd>{date(selected.publishedAt || selected.updatedAt)}</dd></div>
          {selected.experience && selected.experience !== 'Tidak disebutkan' && <div><dt>Pengalaman</dt><dd>{selected.experience}</dd></div>}
        </dl>
        <h3>{selected.details?.length ? 'Informasi lowongan' : 'Deskripsi'}</h3>
        {selected.details?.length ? <div className="source-details-wrap"><table className="source-details" aria-label="Informasi lowongan dari sumber"><tbody>{selected.details.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div> : <p className="description">{selected.description}</p>}
        <div className="detail-actions"><button className="btn btn--secondary" onClick={() => saveJob(selected)}><Icon name="bookmark" size={17} />{saved.includes(selected.id) ? 'Hapus simpanan' : 'Simpan'}</button><a className="btn btn--primary" href={selected.url} target="_blank" rel="noopener noreferrer">{selected.needsConfirmation ? 'Buka pesan Telegram' : `Lamar di ${selected.sourceName}`}<Icon name="external" size={17} /></a></div>
        {selected.needsConfirmation && <p className="detail-foot">Tanyakan ketersediaan melalui kontak di pesan asli.</p>}
      </>}
    </dialog>
    <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice && <><Icon name="check" size={18} />{notice}</>}</div>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
