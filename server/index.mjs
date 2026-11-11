import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJobService, handleApi } from './jobs.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
try { await readFile(path.join(root, 'index.html')); } catch { console.error('Jalankan npm run build sebelum npm start.'); process.exit(1); }
const service = createJobService();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, service);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!filename.startsWith(root)) { res.writeHead(403); return res.end(); }
    const body = await readFile(filename);
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end('Halaman tidak dapat dibuka.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Loker Farmasi: http://127.0.0.1:4173'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { service.close(); server.close(); });
