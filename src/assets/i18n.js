// UI strings only. Landing intro copy stays in the page's own language (it's the SEO content).
const STRINGS = {
  en: {
    home: 'All tools',
    choose: 'Choose or drop a file',
    target: 'Target size',
    format: 'Format',
    compress: 'Compress',
    convert: 'Convert to JPG',
    working: 'Working… your file stays on this device.',
    rendering: 'Rendering page {page} of {pages}…',
    encoding: 'Trying quality {q}%…',
    before: 'Before',
    after: 'After',
    dimensions: 'Dimensions',
    download: 'Download',
    nofit: 'Could not get under the target — this is the smallest version we could make.',
    untouched: 'Your file is already under the target size, so we kept the original.',
    nofile: 'Please choose a file first.',
    badtarget: 'Please enter a target size greater than 0.',
    failed: 'Something went wrong: {msg}',
    privacy: 'Files never leave your device — all processing happens in your browser.',
    pdfnote: 'Pages are converted to images, so text in the result can’t be selected.',
  },
  ru: {
    home: 'Все инструменты',
    choose: 'Выберите или перетащите файл',
    target: 'Нужный размер',
    format: 'Формат',
    compress: 'Сжать',
    convert: 'Конвертировать в JPG',
    working: 'Обработка… файл остаётся на вашем устройстве.',
    rendering: 'Отрисовка страницы {page} из {pages}…',
    encoding: 'Пробуем качество {q}%…',
    before: 'До',
    after: 'После',
    dimensions: 'Размеры',
    download: 'Скачать',
    nofit: 'Не удалось уложиться в нужный размер — это минимальный вариант, который получился.',
    untouched: 'Файл уже меньше нужного размера, поэтому оставили оригинал.',
    nofile: 'Сначала выберите файл.',
    badtarget: 'Укажите размер больше 0.',
    failed: 'Что-то пошло не так: {msg}',
    privacy: 'Файлы не покидают ваше устройство — вся обработка идёт в браузере.',
    pdfnote: 'Страницы превращаются в изображения, поэтому текст в результате нельзя выделить.',
  },
  kk: {
    home: 'Барлық құралдар',
    choose: 'Файлды таңдаңыз немесе осында сүйреңіз',
    target: 'Қажетті өлшем',
    format: 'Формат',
    compress: 'Сығу',
    convert: 'JPG-ге түрлендіру',
    working: 'Өңделуде… файл құрылғыңызда қалады.',
    rendering: '{pages} беттің {page}-беті сызылуда…',
    encoding: '{q}% сапа тексерілуде…',
    before: 'Дейін',
    after: 'Кейін',
    dimensions: 'Өлшемдері',
    download: 'Жүктеп алу',
    nofit: 'Қажетті өлшемге жету мүмкін болмады — бұл ең кіші нұсқа.',
    untouched: 'Файл қажетті өлшемнен кіші, сондықтан түпнұсқа сақталды.',
    nofile: 'Алдымен файлды таңдаңыз.',
    badtarget: '0-ден үлкен өлшем енгізіңіз.',
    failed: 'Қате орын алды: {msg}',
    privacy: 'Файлдар құрылғыңыздан шықпайды — барлық өңдеу браузерде жүреді.',
    pdfnote: 'Беттер суретке айналады, сондықтан нәтижедегі мәтінді белгілеу мүмкін емес.',
  },
};

const KEY = 'imgconvert-lang';
let lang = document.documentElement.lang;

function stored() { try { return localStorage.getItem(KEY); } catch { return null; } }
function store(l) { try { localStorage.setItem(KEY, l); } catch {} }

export function t(key, vars = {}) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
}

function apply() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === lang);
}

export function initI18n() {
  const s = stored();
  if (s in STRINGS) lang = s;
  apply();
  for (const b of document.querySelectorAll('[data-lang]')) {
    b.addEventListener('click', () => {
      lang = b.dataset.lang;
      store(lang);
      // EN/RU have their own landing pages; jump to the matching one if it exists.
      const alt = document.querySelector(`link[rel=alternate][hreflang=${lang}]`)?.href;
      if (alt && alt !== location.href && document.documentElement.lang !== lang) location.href = new URL(alt).pathname;
      else apply();
    });
  }
}
