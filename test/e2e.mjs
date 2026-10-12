// End-to-end proof: serves dist/ like Cloudflare Pages, checks every sitemap URL,
// then drives the real pages in headless Chrome. Usage: node test/e2e.mjs <photo.jpg> [chrome path]
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const photo = process.argv[2];
const chrome = process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!photo) { console.error('usage: node test/e2e.mjs <photo.jpg> [chrome path]'); process.exit(1); }

const types = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', xml: 'application/xml', txt: 'text/plain', jpg: 'image/jpeg' };
let browser;
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    res.end();
    return finish(JSON.parse(body));
  }
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Clean URLs like Cloudflare Pages: /foo -> dist/foo.html
  const file = p === '/e2e' ? 'test/e2e.html' : p === '/fixture.jpg' ? photo
    : path.join('dist', p === '/' ? 'index.html' : path.extname(p) ? p : p + '.html');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file).slice(1)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});

function finish({ results, error }) {
  browser?.kill();
  server.close();
  if (error) { console.error('E2E ERROR:\n' + error); process.exit(1); }
  const kb = (b) => (b / 1024).toFixed(1) + ' KB';
  let ok = true;
  for (const r of results) {
    const pass = r.target ? r.outputBytes <= r.target : r.outputType === 'image/jpeg';
    ok &&= pass;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.page}\n      ${r.input}: ${kb(r.inputBytes)} -> ${kb(r.outputBytes)} (${r.outputType})` +
      `${r.target ? `, target ${kb(r.target)}` : ''}, ${r.dims}, ${r.seconds}s${r.status ? `, status: "${r.status}"` : ''}`);
  }
  process.exit(ok ? 0 : 1);
}

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  const urls = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const u of urls) {
    const r = await fetch(base + u);
    if (r.status !== 200) { console.error(`FAIL ${decodeURIComponent(u)} -> ${r.status}`); process.exit(1); }
  }
  console.log(`All ${urls.length} sitemap URLs return 200.\n`);
  const profile = await mkdtemp(path.join(tmpdir(), 'imgconvert-e2e-'));
  browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, base + '/e2e']);
  setTimeout(() => { console.error('Timed out'); browser.kill(); process.exit(1); }, 600_000).unref();
});
