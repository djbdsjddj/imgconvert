import { compressImage, compressPdf, convertImage, toBytes, formatSize } from './engine.js';
import { t, initI18n } from './i18n.js';

initI18n();

const form = document.getElementById('tool');
const tool = document.body.dataset.tool;
const $ = (id) => document.getElementById(id);
let lastUrl = null;

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('file').files[0];
  const status = $('status');
  $('result').hidden = true;
  if (!file) return (status.textContent = t('nofile'));
  const target = tool === 'convert' ? 0 : toBytes($('target').value, $('unit').value);
  if (tool !== 'convert' && !target) return (status.textContent = t('badtarget'));

  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = t('working');
  const onProgress = (p) => {
    status.textContent = p.stage === 'render' ? t('rendering', p) : t('encoding', { q: Math.round((p.quality ?? 0) * 100) });
  };
  try {
    const base = file.name.replace(/\.[^.]+$/, '');
    let res, name;
    if (tool === 'image') {
      const type = $('format').value;
      res = await compressImage(file, target, { type, onProgress });
      name = `${base}-${$('target').value}${$('unit').value.toLowerCase()}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    } else if (tool === 'pdf') {
      res = await compressPdf(file, target, { onProgress });
      name = `${base}-compressed.pdf`;
    } else {
      res = await convertImage(file);
      res.fits = true;
      name = `${base}.jpg`;
    }
    show(file, res, name);
    status.textContent = res.untouched ? t('untouched') : res.fits ? '' : t('nofit');
  } catch (err) {
    console.error(err);
    status.textContent = t('failed', { msg: err.message });
  } finally {
    button.disabled = false;
  }
});

function show(file, res, name) {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(res.blob);
  $('before').textContent = formatSize(file.size);
  $('after').textContent = formatSize(res.blob.size);
  $('dims').textContent = res.width ? `${res.width} × ${res.height}px` : '—';
  const preview = $('preview');
  if (preview) preview.src = res.blob.type.startsWith('image/') ? lastUrl : '';
  const a = $('download');
  a.href = lastUrl;
  a.download = name;
  $('result').hidden = false;
}
