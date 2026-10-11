// ============================================================
// Приватный раздел — читает /private/photos.json через воркер
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

const CATS = {
  all: 'Все',
  work: 'Работа',
  life: 'Жизнь',
  friends: 'Друзья',
  travel: 'Путешествия'
};

// ============================================================
// ПЛЕЙСХОЛДЕР
// ============================================================
function makePlaceholder(seed, label) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const abs = Math.abs(h);
  const c1 = `hsl(${205 + (abs % 25)}, 75%, ${55 + (abs % 15)}%)`;
  const c2 = `hsl(${195 + ((abs >> 3) % 35)}, 70%, ${40 + ((abs >> 4) % 20)}%)`;
  const angle = abs % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
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

const themeToggle = $('#theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });
}
initTheme();

// ============================================================
// ПРОГРЕСС-БАР
// ============================================================
const progressBar = $('#progress-bar');
let progressTimer = null;

function startProgress() {
  if (!progressBar) return;
  progressBar.classList.add('active');
  progressBar.style.width = '20%';
  clearTimeout(progressTimer);
  progressTimer = setTimeout(() => { progressBar.style.width = '70%'; }, 200);
}
function finishProgress() {
  if (!progressBar) return;
  progressBar.style.width = '100%';
  clearTimeout(progressTimer);
  setTimeout(() => {
    progressBar.classList.remove('active');
    setTimeout(() => { progressBar.style.width = '0'; }, 300);
  }, 400);
}

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let currentYear = null;
let currentMonth = null;

let privatePhotos = [];
let filteredPhotos = [];

// ============================================================
// ЗАГРУЗКА
// ============================================================
async function loadPhotos() {
  const res = await fetch('/private/photos.json', { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) {
      privatePhotos = [];
      return;
    }
    throw new Error('HTTP ' + res.status);
  }
  let data;
  try { data = await res.json(); } catch { throw new Error('JSON повреждён'); }
  const list = Array.isArray(data) ? data : (data.photos || []);
  privatePhotos = list.map(p => ({
    ...p,
    src: p.src || makePlaceholder((p.title || '') + p.id, p.title || String(p.id))
  }));
}

// ============================================================
// СОРТИРОВКА И ФИЛЬТРАЦИЯ
// ============================================================
function sortByAdded(photos) {
  return [...photos].sort((a, b) => {
    const da = a.added ? new Date(a.added).getTime() : 0;
    const db = b.added ? new Date(b.added).getTime() : 0;
    return db - da;
  });
}

function filterPhotos(photos, year, month) {
  return photos.filter(p => {
    if (year) {
      const d = parseDate(p.date);
      if (!d) return false;
      if (d.year !== year) return false;
      if (month && d.month !== month) return false;
    }
    return true;
  });
}

function getYears() {
  const map = new Map();
  privatePhotos.forEach(p => {
    const d = parseDate(p.date);
    if (!d) return;
    if (!map.has(d.year)) map.set(d.year, new Set());
    map.get(d.year).add(d.month);
  });
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({ year, months: [...months].sort((a, b) => b - a) }));
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
// РЕНДЕР
// ============================================================
function renderCard(photo) {
  const tag = photo.tag ? `<span class="tag">${photo.tag}</span>` : '';
  return `
    <button class="archive-item" data-id="${photo.id}" type="button">
      ${tag}
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

function updateSectionTitle() {
  const el = document.getElementById('sectionTitle');
  if (!el) return;
  if (currentYear) {
    const monthName = currentMonth ? MONTHS_RU[currentMonth - 1] : 'весь год';
    el.textContent = `Личное · ${currentYear} · ${monthName}`;
  } else {
    el.textContent = 'Личное';
  }
}

// ============================================================
// ФИЛЬТРЫ ПО ГОДАМ
// ============================================================
function renderYearFilters() {
  const container = document.getElementById('yearFilters');
  if (!container) return;

  const years = getYears();

  let html = '';
  html += `<button class="filter ${currentYear === null ? 'active' : ''}" data-year="" type="button">Все</button>`;

  years.forEach(({ year }) => {
    const isActive = currentYear === year;
    html += `
      <button class="filter ${isActive ? 'active' : ''}" data-year="${year}" type="button">
        ${year}
        <span class="dropdown-arrow" aria-hidden="true"></span>
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('button[data-year]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = btn.dataset.year;
      if (value === '') {
        currentYear = null;
        currentMonth = null;
        applyFilters();
        return;
      }
      openYearDropdown(Number(value), btn);
    });
  });
}

// Дропдаун месяцев
let yearDropdownEl = null;

function openYearDropdown(year, anchorBtn) {
  closeYearDropdown();

  const years = getYears();
  const entry = years.find(y => y.year === year);
  if (!entry) return;

  const dd = document.createElement('div');
  dd.className = 'dropdown-menu year-dropdown';
  dd.setAttribute('role', 'menu');

  let html = `<button class="${currentYear === year && currentMonth === null ? 'active' : ''}" data-month="" data-year="${year}" type="button">Весь год</button>`;
  entry.months.forEach(m => {
    const isActive = currentYear === year && currentMonth === m;
    html += `<button class="${isActive ? 'active' : ''}" data-month="${m}" data-year="${year}" type="button">${MONTHS_RU[m - 1]}</button>`;
  });
  dd.innerHTML = html;

  const rect = anchorBtn.getBoundingClientRect();
  dd.style.position = 'fixed';
  dd.style.top = (rect.bottom + 8) + 'px';
  dd.style.left = rect.left + 'px';
  dd.style.opacity = '1';
  dd.style.visibility = 'visible';
  dd.style.transform = 'none';

  document.body.appendChild(dd);
  yearDropdownEl = dd;

  dd.querySelectorAll('button[data-month]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      currentYear = Number(b.dataset.year);
      currentMonth = b.dataset.month ? Number(b.dataset.month) : null;
      closeYearDropdown();
      applyFilters();
    });
  });

  setTimeout(() => {
    document.addEventListener('click', closeYearDropdownOnce);
  }, 0);
}

function closeYearDropdownOnce(e) {
  if (yearDropdownEl && !yearDropdownEl.contains(e.target)) {
    closeYearDropdown();
  }
}

function closeYearDropdown() {
  if (yearDropdownEl) {
    yearDropdownEl.remove();
    yearDropdownEl = null;
    document.removeEventListener('click', closeYearDropdownOnce);
  }
}

// ============================================================
// ПРИМЕНЕНИЕ ФИЛЬТРОВ
// ============================================================
function applyFilters() {
  const list = filterPhotos(privatePhotos, currentYear, currentMonth);
  filteredPhotos = sortByAdded(list);
  renderGrid('grid-private', filteredPhotos);
  const countEl = document.getElementById('count-private');
  if (countEl) countEl.textContent = filteredPhotos.length + ' записей';
  updateSectionTitle();
  renderYearFilters();
}

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

function openLightbox(id) {
  currentLightboxIndex = filteredPhotos.findIndex(p => String(p.id) === String(id));
  if (currentLightboxIndex < 0) return;
  showLightboxPhoto(filteredPhotos[currentLightboxIndex]);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  preloadNeighbors();
}

function preloadNeighbors() {
  const len = filteredPhotos.length;
  if (len < 2) return;
  [1, -1].forEach(offset => {
    const idx = (currentLightboxIndex + offset + len) % len;
    const photo = filteredPhotos[idx];
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
  if (!filteredPhotos.length) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % filteredPhotos.length;
  showLightboxPhoto(filteredPhotos[currentLightboxIndex]);
  preloadNeighbors();
}

function prevPhoto() {
  if (!filteredPhotos.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
  showLightboxPhoto(filteredPhotos[currentLightboxIndex]);
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

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxPrev) lightboxPrev.addEventListener('click', e => { e.stopPropagation(); prevPhoto(); });
if (lightboxNext) lightboxNext.addEventListener('click', e => { e.stopPropagation(); nextPhoto(); });
if (lightbox) lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
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
  } catch (err) {
    console.error(err);
    const main = document.querySelector('main');
    if (main) main.innerHTML = '<p style="text-align:center;padding:60px;color:#4a637d">Ошибка загрузки архива</p>';
  } finally {
    finishProgress();
  }
})();
