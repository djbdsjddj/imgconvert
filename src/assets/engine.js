// Shared client-side compression engine. Used by the image, PDF and converter pages.
// Nothing here touches the network except loading the libraries below from CDNs.

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
const PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
const HEIC2ANY = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';

const scripts = {};
function loadScript(src) {
  return (scripts[src] ??= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => fail(new Error('Failed to load ' + src));
    document.head.append(s);
  }));
}

/**
 * Core search shared by images and PDFs.
 * encode(scale, quality) -> Promise<Blob>. Finds the highest quality that fits
 * `target` bytes; if even the lowest quality is too big, shrinks scale and retries.
 * Returns { blob, scale, quality, fits }.
 */
export async function fitToSize(encode, target, { minQ = 0.05, maxQ = 0.95, steps = 7, maxRounds = 8, onProgress } = {}) {
  let scale = 1;
  let smallest = null;
  for (let round = 0; round < maxRounds; round++) {
    let lo = minQ, hi = maxQ, fit = null, fitQ = 0;
    // Try max quality first: cheap win when the file is already small enough.
    const top = await encode(scale, hi);
    if (top.size <= target) return { blob: top, scale, quality: hi, fits: true };
    for (let i = 0; i < steps; i++) {
      const q = (lo + hi) / 2;
      onProgress?.({ round, scale, quality: q });
      const b = await encode(scale, q);
      if (b.size <= target) { fit = b; fitQ = q; lo = q; }
      else { hi = q; if (!smallest || b.size < smallest.blob.size) smallest = { blob: b, scale, quality: q }; }
    }
    if (fit) return { blob: fit, scale, quality: fitQ, fits: true };
    // Too big even at low quality: bytes scale ~ with pixel area, so shrink by sqrt of the overshoot.
    const low = await encode(scale, minQ);
    if (low.size <= target) return { blob: low, scale, quality: minQ, fits: true };
    if (low.size < smallest.blob.size) smallest = { blob: low, scale, quality: minQ };
    scale *= Math.min(0.9, Math.sqrt(target / low.size) * 0.95);
  }
  return { ...smallest, fits: false };
}

const isHeic = (f) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name || '');

/** Decode any browser-supported image (plus HEIC via heic2any) to an ImageBitmap. */
export async function decodeImage(file) {
  if (isHeic(file)) {
    try { return await createImageBitmap(file); } catch {} // Safari decodes HEIC natively
    await loadScript(HEIC2ANY);
    const out = await window.heic2any({ blob: file, toType: 'image/png' });
    file = Array.isArray(out) ? out[0] : out;
  }
  return createImageBitmap(file);
}

function drawScaled(source, scale) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(source.width * scale));
  c.height = Math.max(1, Math.round(source.height * scale));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; // JPEG has no alpha: flatten transparency onto white
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (canvas, type, q) =>
  new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Encoding failed'))), type, q));

/** Compress an image to at most `target` bytes. type: 'image/jpeg' | 'image/webp'. */
export async function compressImage(file, target, { type = 'image/jpeg', onProgress } = {}) {
  const bmp = await decodeImage(file);
  let canvas = null, canvasScale = 0;
  const res = await fitToSize(async (scale, q) => {
    if (scale !== canvasScale) { canvas = drawScaled(bmp, scale); canvasScale = scale; }
    return toBlob(canvas, type, q);
  }, target, { onProgress });
  return { ...res, width: Math.round(bmp.width * res.scale), height: Math.round(bmp.height * res.scale),
    origWidth: bmp.width, origHeight: bmp.height };
}

/** Convert HEIC/WebP/PNG/etc. to JPEG at full size, no size fitting. */
export async function convertImage(file, { type = 'image/jpeg', quality = 0.92 } = {}) {
  const bmp = await decodeImage(file);
  return { blob: await toBlob(drawScaled(bmp, 1), type, quality), width: bmp.width, height: bmp.height };
}

/**
 * Compress a PDF to at most `target` bytes by rendering each page to JPEG and
 * rebuilding the PDF. Text becomes images (not selectable) - that's the price of the size.
 */
export async function compressPdf(file, target, { onProgress } = {}) {
  if (file.size <= target) return { blob: file, fits: true, untouched: true };
  const pdfjs = await import(PDFJS);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  await loadScript(PDFLIB);
  const { PDFDocument } = window.PDFLib;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const BASE = 1.5; // render scale at engine scale 1 (~108 dpi)
  // ponytail: holds every rendered page canvas in memory; render+encode per page if huge PDFs crash tabs.
  let pages = null, pagesScale = 0;

  async function render(scale) {
    pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.({ stage: 'render', page: i, pages: doc.numPages });
      const page = await doc.getPage(i);
      const size = page.getViewport({ scale: 1 }); // PDF points
      const vp = page.getViewport({ scale: BASE * scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(vp.width));
      c.height = Math.max(1, Math.floor(vp.height));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      pages.push({ canvas: c, w: size.width, h: size.height });
      page.cleanup();
    }
    pagesScale = scale;
  }

  const res = await fitToSize(async (scale, q) => {
    if (scale !== pagesScale) await render(scale);
    onProgress?.({ stage: 'encode', quality: q, scale });
    const out = await PDFDocument.create();
    for (const p of pages) {
      const jpg = await out.embedJpg(await (await toBlob(p.canvas, 'image/jpeg', q)).arrayBuffer());
      out.addPage([p.w, p.h]).drawImage(jpg, { x: 0, y: 0, width: p.w, height: p.h });
    }
    return new Blob([await out.save()], { type: 'application/pdf' });
  }, target, { steps: 6 });
  doc.destroy();
  // Never hand back something bigger than the original.
  if (res.blob.size >= file.size) return { blob: file, fits: file.size <= target, untouched: true };
  return { ...res, pages: pages.length };
}

/** Parse "200 KB" style input to bytes. Uses 1 KB = 1024 bytes, as upload forms do. */
export function toBytes(value, unit) {
  const n = Number(value);
  if (!(n > 0)) return 0;
  return Math.floor(n * (unit === 'MB' ? 1024 * 1024 : 1024));
}

export function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : (bytes / 1024).toFixed(1) + ' KB';
}
