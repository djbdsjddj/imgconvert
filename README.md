# imgconvert

Free, client-side file-shrinking tools. Everything runs in the browser; no file is ever uploaded.
Plain HTML/CSS/JS + a dependency-free Node build script. Libraries (pdf.js, pdf-lib, heic2any) load from CDNs on demand.

## Run locally

```sh
npm run serve        # builds, then serves dist/ at http://localhost:3000
```

## Build

```sh
npm run build        # writes dist/ — deploy that folder as-is
```

**Cloudflare Pages:** build command `npm run build`, output directory `dist`. No functions needed.
Set your real domain in `SITE` at the top of `build.js` (currently https://imgconvert.shah242312.workers.dev) (used for canonical, hreflang, sitemap, robots).

## Test

```sh
npm test                               # unit test of the fit-to-size search
npm run test:e2e -- path/to/photo.jpg  # headless Chrome drives the real pages, prints before/after sizes
```

## Layout

- `src/assets/engine.js` — the shared compression engine (`fitToSize`, `compressImage`, `compressPdf`, `convertImage`). Every tool page imports it via `app.js`.
- `src/assets/app.js` — page UI wiring; `i18n.js` — EN/RU/KK UI strings (choice saved in localStorage).
- `src/pages.js` — one entry per landing page: slug, preset, title/description, intro copy.
- `build.js` — HTML template, sitemap.xml, robots.txt.
- AdSense: search the HTML for `ad-slot-top` / `ad-slot-bottom` placeholders (in `build.js`).

## Pages

| URL | Tool | Preset |
|---|---|---|
| `/` | Homepage, links to all tools | — |
| `/compress-image-to-20kb` | image | 20 KB |
| `/compress-image-to-50kb` | image | 50 KB |
| `/compress-image-to-100kb` | image | 100 KB |
| `/compress-image-to-200kb` | image | 200 KB |
| `/compress-image-to-500kb` | image | 500 KB |
| `/compress-image-to-1mb` | image | 1 MB |
| `/compress-pdf-to-1mb` | pdf | 1 MB |
| `/compress-pdf-to-500kb` | pdf | 500 KB |
| `/compress-pdf-to-200kb` | pdf | 200 KB |
| `/heic-to-jpg` | converter | — |
| `/сжать-фото-до-20кб` | image (RU) | 20 KB |
| `/сжать-фото-до-50кб` | image (RU) | 50 KB |
| `/сжать-фото-до-100кб` | image (RU) | 100 KB |
| `/сжать-фото-до-200кб` | image (RU) | 200 KB |
| `/сжать-фото-до-500кб` | image (RU) | 500 KB |
| `/сжать-фото-до-1мб` | image (RU) | 1 MB |
| `/сжать-пдф-до-1мб` | pdf (RU) | 1 MB |
| `/сжать-пдф-до-500кб` | pdf (RU) | 500 KB |
| `/сжать-пдф-до-200кб` | pdf (RU) | 200 KB |
| `/heic-в-jpg` | converter (RU) | — |

Plus `/sitemap.xml` and `/robots.txt`.

## Known limits

- PDF compression rasterizes pages to JPEG, so output text isn't selectable. All rendered pages are held in memory; very large PDFs (hundreds of pages) may be slow on phones.
- 1 KB = 1024 bytes (what upload forms check against).
