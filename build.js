// Generates dist/ from src/. No dependencies: `node build.js`.
import { rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { pages } from './src/pages.js';

export const SITE = 'https://imgconvert.pages.dev'; // change when you have a real domain
const OUT = 'dist';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (slug) => `${SITE}/${slug ? encodeURIComponent(slug) : ''}`;

const ad = (id) => `
<!-- ===== Google AdSense placeholder: ${id} =====
     Replace this div with your <ins class="adsbygoogle" ...> unit once the account is approved,
     and add the adsbygoogle.js <script> in <head>. -->
<div id="${id}" class="ad-slot" aria-hidden="true"></div>`;

function toolForm(p) {
  const accept = p.tool === 'pdf' ? 'application/pdf,.pdf' : 'image/*,.heic,.heif';
  const target = p.tool === 'convert' ? '' : `
    <div class="row">
      <label for="target" data-i18n="target">Target size</label>
      <input id="target" type="number" min="1" step="any" value="${p.target}" required>
      <select id="unit" aria-label="Unit"><option${p.unit === 'KB' ? ' selected' : ''}>KB</option><option${p.unit === 'MB' ? ' selected' : ''}>MB</option></select>
    </div>`;
  const format = p.tool !== 'image' ? '' : `
    <div class="row">
      <label for="format" data-i18n="format">Format</label>
      <select id="format"><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option></select>
    </div>`;
  return `
  <form id="tool" class="tool">
    <label class="drop"><span data-i18n="choose">Choose or drop a file</span><input id="file" type="file" accept="${accept}"></label>${target}${format}
    <div><button type="submit" data-i18n="${p.tool === 'convert' ? 'convert' : 'compress'}">${p.tool === 'convert' ? 'Convert to JPG' : 'Compress'}</button></div>
    <p id="status" role="status" aria-live="polite"></p>
  </form>
  <section id="result" class="result" hidden>
    ${p.tool === 'pdf' ? '' : '<img id="preview" alt="">'}
    <dl>
      <dt data-i18n="before">Before</dt><dd id="before"></dd>
      <dt data-i18n="after">After</dt><dd id="after"></dd>
      <dt data-i18n="dimensions">Dimensions</dt><dd id="dims"></dd>
    </dl>
    <a id="download" class="btn" data-i18n="download">Download</a>
  </section>
  ${p.tool === 'pdf' ? '<p class="note" data-i18n="pdfnote"></p>' : ''}`;
}

function layout(p, main) {
  const alts = pages.filter((q) => q.key === p.key && p.key);
  const hreflang = alts.map((q) => `<link rel="alternate" hreflang="${q.lang}" href="${url(q.slug)}">`).join('\n') +
    (alts.length ? `\n<link rel="alternate" hreflang="x-default" href="${url(alts.find((q) => q.lang === 'en').slug)}">` : '');
  const jsonld = p.tool ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.h1, url: url(p.slug),
    description: p.desc, inLanguage: p.lang, applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  })}</script>` : '';
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url(p.slug)}">
${hreflang}
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url(p.slug)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/style.css">
<!-- AdSense: add <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script> here -->
${jsonld}
<script type="module" src="/assets/app.js"></script>
</head>
<body data-tool="${p.tool || 'home'}">
<header><div class="wrap">
  <a class="logo" href="/">imgconvert</a>
  <a href="/" data-i18n="home">All tools</a>
  <div class="langs" role="group" aria-label="Language">
    <button type="button" data-lang="en">EN</button><button type="button" data-lang="ru">RU</button><button type="button" data-lang="kk">KK</button>
  </div>
</div></header>
<main class="wrap">
  <h1>${esc(p.h1)}</h1>
  <p class="intro">${esc(p.intro)}</p>
  ${ad('ad-slot-top')}
  ${main}
  ${ad('ad-slot-bottom')}
</main>
<footer><div class="wrap"><span data-i18n="privacy">Files never leave your device — all processing happens in your browser.</span></div></footer>
</body>
</html>
`;
}

const list = (items) => `<ul class="links">${items.map((q) => `<li><a href="/${q.slug}">${esc(q.h1)}</a></li>`).join('')}</ul>`;
const pick = (lang, tool) => pages.filter((q) => q.lang === lang && q.tool === tool);
const home = {
  lang: 'en', slug: '', title: 'imgconvert — Compress Images & PDFs to an Exact Size, Free',
  desc: 'Free tools to compress images and PDFs to an exact size (20 KB, 50 KB, 100 KB, 1 MB…) and convert HEIC to JPG. Everything runs in your browser; files are never uploaded.',
  h1: 'Compress images and PDFs to an exact size',
  intro: 'Pick the size your form asks for. Every tool runs entirely in your browser, so your photos and documents never leave your device.',
};
const homeMain = `
  <h2>Images</h2>${list(pick('en', 'image'))}
  <h2>PDF</h2>${list(pick('en', 'pdf'))}
  <h2>Convert</h2>${list(pick('en', 'convert'))}
  <h2 lang="ru">На русском</h2><div lang="ru">${list(pages.filter((q) => q.lang === 'ru'))}</div>`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
cpSync('src/assets', `${OUT}/assets`, { recursive: true });
writeFileSync(`${OUT}/index.html`, layout(home, homeMain));
// Cloudflare Pages serves foo.html at /foo, matching the spec's slash-less URLs.
for (const p of pages) writeFileSync(`${OUT}/${p.slug}.html`, layout(p, toolForm(p)));

const all = [home, ...pages];
writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((p) => `  <url><loc>${url(p.slug)}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${all.length} pages into ${OUT}/`);
