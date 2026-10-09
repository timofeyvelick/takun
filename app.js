// ============================================================
// УТИЛИТЫ
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

// ============================================================
// ПЛЕЙСХОЛДЕР
// ============================================================
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

// ============================================================
// ПАРСИНГ ДАТЫ
// ============================================================
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = MONTHS_RU.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (monthIdx < 0 || isNaN(year)) return null;
  return { year, month: monthIdx + 1 };
}

// ============================================================
// ТЕМА
// ============================================================
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

// ============================================================
// ПРОГРЕСС-БАР
// ============================================================
const progressBar = $('#progress-bar');
let progressTimer = null;

function startProgress() {
  progressBar.classList.add('active');
  progressBar.style.width = '20%';
  clearTimeout(progressTimer);
  progressTimer = setTimeout(() => { progressBar.style.width = '70%'; }, 200);
}
function finishProgress() {
  progressBar.style.width = '100%';
  clearTimeout(progressTimer);
  setTimeout(() => {
    progressBar.classList.remove('active');
    setTimeout(() => { progressBar.style.width = '0'; }, 300);
  }, 400);
}

// ============================================================
// ДАННЫЕ
// ============================================================
const NEW_DAYS = 14;
let PHOTOS = [];
let publicPhotos = [];
let currentYear = null;
let currentMonth = null;

async function loadPhotos() {
  const res = await fetch('photos.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('photos.json не найден');
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.photos || []);
  PHOTOS = list.map(p => ({
    ...p,
    src: p.src || makePlaceholder((p.title || '') + p.id, p.title || String(p.id)),
  }));
  publicPhotos = PHOTOS;
}

// ============================================================
// СОРТИРОВКА
// ============================================================
function sortByAdded(photos) {
  return [...photos].sort((a, b) => {
    const da = a.added ? new Date(a.added).getTime() : 0;
    const db = b.added ? new Date(b.added).getTime() : 0;
    return db - da;
  });
}

// ============================================================
// ФИЛЬТРАЦИЯ
// ============================================================
function filterByDate(photos, year, month) {
  return photos.filter(p => {
    const d = parseDate(p.date);
    if (!d) return false;
    if (year && d.year !== year) return false;
    if (month && d.month !== month) return false;
    return true;
  });
}

function groupByYear(photos) {
  const map = new Map();
  photos.forEach(p => {
    const d = parseDate(p.date);
    if (!d) return;
    if (!map.has(d.year)) map.set(d.year, new Set());
    map.get(d.year).add(d.month);
  });
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: [...months].sort((a, b) => b - a)
    }));
}

// ============================================================
// ЛЕНИВАЯ ЗАГРУЗКА
// ============================================================
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

// ============================================================
// РЕНДЕР КАРТОЧКИ
// ============================================================
function isNew(photo) {
  if (!photo.added) return false;
  const diff = (Date.now() - new Date(photo.added).getTime()) / (1000 * 60 * 60 * 24);
  return diff <= NEW_DAYS;
}

function renderCard(photo) {
  const newBadge = isNew(photo) ? '<span class="badge-new">Новое</span>' : '';
  return `
    <button class="archive-item" data-id="${photo.id}">
      ${newBadge}
      <img data-src="${photo.src}" alt="${photo.title || ''}" loading="lazy" decoding="async">
      <div class="meta">
        <div class="date">${photo.date || ''}</div>
        <div class="title">${photo.title || ''}</div>
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

function updateCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n + ' записей';
}

// ============================================================
// ФИЛЬТРЫ (годы + месяцы)
// ============================================================
function renderFilters() {
  const container = document.getElementById('filters');
  if (!container) return;

  const years = groupByYear(publicPhotos);
  let html = '';

  // Кнопка «Все»
  const allActive = currentYear === null;
  html += `<button class="filter ${allActive ? 'active' : ''}" data-year="">Все</button>`;

  years.forEach(({ year, months }) => {
    const isYearActive = currentYear === year;
    html += `<button class="filter ${isYearActive ? 'active' : ''}" data-year="${year}">${year}</button>`;
  });

  // Если выбран год — показываем месяцы отдельным рядом
  if (currentYear) {
    const entry = years.find(y => y.year === currentYear);
    if (entry) {
      html += '<div class="months-row">';
      html += `<button class="filter month ${currentMonth === null ? 'active' : ''}" data-year="${currentYear}" data-month="">Весь год</button>`;
      entry.months.forEach(m => {
        const isMActive = currentMonth === m;
        html += `<button class="filter month ${isMActive ? 'active' : ''}" data-year="${currentYear}" data-month="${m}">${MONTHS_RU[m - 1]}</button>`;
      });
      html += '</div>';
    }
  }

  container.innerHTML = html;

  container.querySelectorAll('button[data-year]').forEach(btn => {
    btn.addEventListener('click', () => {
      const y = btn.dataset.year ? Number(btn.dataset.year) : null;
      const m = btn.dataset.month ? Number(btn.dataset.month) : null;

      if (y === null) {
        currentYear = null;
        currentMonth = null;
      } else if (y === currentYear && m === null && btn.classList.contains('month') === false) {
        // Клик по активному году — сброс
        if (currentMonth === null) {
          currentYear = null;
          currentMonth = null;
        } else {
          currentMonth = null;
        }
      } else {
        currentYear = y;
        currentMonth = m;
      }
      applyFilters();
    });
  });
}

function applyFilters() {
  let filtered = publicPhotos;
  if (currentYear) {
    filtered = filterByDate(filtered, currentYear, currentMonth);
  }
  const sorted = sortByAdded(filtered);
  renderGrid('grid-all', sorted);
  updateCount('count-all', sorted.length);
  renderFilters();
}

// ============================================================
// РОУТИНГ
// ============================================================
const pages = ['all', 'about'];

function showPage(name) {
  if (!pages.includes(name)) name = 'all';
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');
  $$('#nav a').forEach(a => {
    if (a.dataset.page) {
      a.classList.toggle('active', a.dataset.page === name);
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHash() {
  startProgress();
  showPage(location.hash.replace('#', '') || 'all');
  setTimeout(finishProgress, 200);
}

window.addEventListener('hashchange', handleHash);

// ============================================================
// ЛАЙТБОКС
// ============================================================
const lightbox = $('#lightbox');
const lightboxImg = $('#lightbox-img');
const lightboxDate = $('#lightbox-date');
const lightboxTitle = $('#lightbox-title');
const lightboxClose = $('#lightbox-close');
const lightboxPrev = $('#lightbox-prev');
const lightboxNext = $('#lightbox-next');
const lightboxDownload = $('#lightbox-download');

let currentLightboxIndex = -1;
let currentLightboxList = [];

function getCurrentList() {
  if (currentYear) {
    return sortByAdded(filterByDate(publicPhotos, currentYear, currentMonth));
  }
  return sortByAdded(publicPhotos);
}

function openLightbox(id) {
  currentLightboxList = getCurrentList();
  currentLightboxIndex = currentLightboxList.findIndex(p => String(p.id) === String(id));
  if (currentLightboxIndex < 0) return;
  showLightboxPhoto(currentLightboxList[currentLightboxIndex]);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  preloadNeighbors();
}

function preloadNeighbors() {
  const len = currentLightboxList.length;
  if (len < 2) return;
  [1, -1].forEach(offset => {
    const idx = (currentLightboxIndex + offset + len) % len;
    const photo = currentLightboxList[idx];
    if (photo && photo.src && !photo.src.startsWith('data:')) {
      const img = new Image();
      img.src = photo.src;
    }
  });
}

function showLightboxPhoto(photo) {
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.title || '';
  lightboxDate.textContent = photo.date || '';
  lightboxTitle.textContent = photo.title || '';
  if (photo.src.startsWith('data:')) {
    lightboxDownload.removeAttribute('href');
    lightboxDownload.style.display = 'none';
  } else {
    lightboxDownload.href = photo.src;
    lightboxDownload.setAttribute('download', (photo.title || 'photo') + '.jpg');
    lightboxDownload.style.display = 'inline-flex';
  }
}

function nextPhoto() {
  if (!currentLightboxList.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxList.length;
  showLightboxPhoto(currentLightboxList[currentLightboxIndex]);
  preloadNeighbors();
}

function prevPhoto() {
  if (!currentLightboxList.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxList.length) % currentLightboxList.length;
  showLightboxPhoto(currentLightboxList[currentLightboxIndex]);
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

// ============================================================
// СТАРТ
// ============================================================
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

(async function init() {
  startProgress();
  try {
    await loadPhotos();
    applyFilters();
    handleHash();
  } catch (err) {
    console.error(err);
    document.querySelector('main').innerHTML =
      '<p style="text-align:center;padding:60px;color:#4a637d">Ошибка загрузки архива</p>';
  } finally {
    finishProgress();
  }
})();
