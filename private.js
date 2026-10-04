// ============================================================
// Приватный раздел — отдельная страница
// Защита через Cloudflare Access (на уровне сервера)
// Пароля в коде нет — Cloudflare пускает только одобренных
// ============================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Плейсхолдеры ----------
function makePlaceholder(seed, label) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const abs = Math.abs(h);
  const hue1 = 205 + (abs % 25);
  const hue2 = 195 + ((abs >> 3) % 35);
  const l1 = 55 + (abs % 15);
  const l2 = 40 + ((abs >> 4) % 20);
  const c1 = `hsl(${hue1}, 75%, ${l1}%)`;
  const c2 = `hsl(${hue2}, 70%, ${l2}%)`;
  const angle = abs % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <text x="400" y="310" font-family="Manrope, sans-serif" font-size="42" font-weight="600"
          fill="rgba(255,255,255,0.85)" text-anchor="middle">${label}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ---------- Тема ----------
const THEME_KEY = 'takun_theme';
const root = document.documentElement;

function applyTheme(theme) {
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a1424' : '#dceafa');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return applyTheme(saved);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

$('#theme-toggle').addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();

// ---------- Сортировка ----------
function sortByDate(photos) {
  return [...photos].sort((a, b) => {
    const dateA = a.added ? new Date(a.added).getTime() : 0;
    const dateB = b.added ? new Date(b.added).getTime() : 0;
    return dateB - dateA;
  });
}

// ---------- Ленивая загрузка ----------
const lazyObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' })
  : null;

// ---------- Данные ----------
let PHOTOS = [];
let privatePhotos = [];

async function loadPhotos() {
  const res = await fetch('photos.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('photos.json не найден');
  const data = await res.json();
  PHOTOS = data.map(p => ({
    ...p,
    src: p.src || makePlaceholder(p.title + p.id, p.title),
  }));
  privatePhotos = sortByDate(PHOTOS.filter(p => p.private));
}

// ---------- Рендер ----------
function renderCard(photo) {
  return `
    <button class="archive-item" data-id="${photo.id}">
      <span class="tag">${photo.tag}</span>
      <img data-src="${photo.src}" alt="${photo.title}" loading="lazy" decoding="async">
      <div class="meta">
        <div class="date">${photo.date}</div>
        <div class="title">${photo.title}</div>
      </div>
    </button>
  `;
}

function renderGrid(containerId, photos) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = photos.map(renderCard).join('');
  if (lazyObserver) {
    el.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));
  } else {
    el.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// ---------- Лайтбокс ----------
const lightbox = $('#lightbox');
const lightboxImg = $('#lightbox-img');
const lightboxDate = $('#lightbox-date');
const lightboxTitle = $('#lightbox-title');
const lightboxClose = $('#lightbox-close');
const lightboxPrev = $('#lightbox-prev');
const lightboxNext = $('#lightbox-next');
const lightboxDownload = $('#lightbox-download');

let currentLightboxIndex = -1;

function openLightbox(id) {
  currentLightboxIndex = privatePhotos.findIndex(p => p.id === Number(id));
  if (currentLightboxIndex < 0) return;
  showLightboxPhoto(privatePhotos[currentLightboxIndex]);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  preloadNeighbors();
}

function preloadNeighbors() {
  const len = privatePhotos.length;
  if (len < 2) return;
  [1, -1].forEach(offset => {
    const idx = (currentLightboxIndex + offset + len) % len;
    const photo = privatePhotos[idx];
    if (photo && photo.src && !photo.src.startsWith('data:')) {
      const img = new Image();
      img.src = photo.src;
    }
  });
}

function showLightboxPhoto(photo) {
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.title;
  lightboxDate.textContent = photo.date;
  lightboxTitle.textContent = photo.title;
  if (photo.src.startsWith('data:')) {
    lightboxDownload.removeAttribute('href');
    lightboxDownload.style.display = 'none';
  } else {
    lightboxDownload.href = photo.src;
    lightboxDownload.setAttribute('download', photo.title + '.jpg');
    lightboxDownload.style.display = 'inline-flex';
  }
}

function nextPhoto() {
  if (!privatePhotos.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % privatePhotos.length;
  showLightboxPhoto(privatePhotos[currentLightboxIndex]);
  preloadNeighbors();
}

function prevPhoto() {
  if (!privatePhotos.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + privatePhotos.length) % privatePhotos.length;
  showLightboxPhoto(privatePhotos[currentLightboxIndex]);
  preloadNeighbors();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 300);
}

document.addEventListener('click', e => {
  const item = e.target.closest('.archive-item');
  if (item) openLightbox(item.dataset.id);
});

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', e => { e.stopPropagation(); prevPhoto(); });
lightboxNext.addEventListener('click', e => { e.stopPropagation(); nextPhoto(); });
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'ArrowLeft') prevPhoto();
});

// ---------- Год ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Старт ----------
(async function init() {
  try {
    await loadPhotos();
    renderGrid('grid-private', privatePhotos);
    document.getElementById('count-private').textContent = privatePhotos.length + ' записей';
  } catch (err) {
    console.error(err);
    document.querySelector('main').innerHTML =
      '<p style="text-align:center;padding:60px;color:#4a637d">Ошибка загрузки архива</p>';
  }
})();
