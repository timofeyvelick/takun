// ============================================================
// УТИЛИТЫ
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ============================================================
// SVG-ПЛЕЙСХОЛДЕРЫ
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
      <radialGradient id="r" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.45)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <rect width="800" height="600" fill="url(#r)"/>
    <text x="400" y="310" font-family="Manrope, sans-serif" font-size="42" font-weight="600"
          fill="rgba(255,255,255,0.85)" text-anchor="middle">${label}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ============================================================
// СОРТИРОВКА ПО ДАТЕ (от новых к старым)
// ============================================================
// Используем поле "added" (формат YYYY-MM-DD).
// Если его нет — фото уходит в конец.
function sortByDate(photos) {
  return [...photos].sort((a, b) => {
    const dateA = a.added ? new Date(a.added).getTime() : 0;
    const dateB = b.added ? new Date(b.added).getTime() : 0;
    return dateB - dateA;
  });
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
// КОНСТАНТЫ
// ============================================================
const PASSWORD = '69853';
const SESSION_KEY = 'takun_private_unlocked';
const NEW_DAYS = 14;

let PHOTOS = [];

// ============================================================
// ЗАГРУЗКА ДАННЫХ
// ============================================================
async function loadPhotos() {
  const res = await fetch('photos.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('photos.json не найден');
  const data = await res.json();
  PHOTOS = data.map(p => ({
    ...p,
    src: p.src || makePlaceholder(p.title + p.id, p.title),
  }));
}

// ============================================================
// ЛЕНИВАЯ ЗАГРУЗКА ФОТО
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
function isNew(photo) {
  if (!photo.added) return false;
  const diff = (Date.now() - new Date(photo.added).getTime()) / (1000 * 60 * 60 * 24);
  return diff <= NEW_DAYS;
}

function renderCard(photo) {
  const newBadge = isNew(photo) ? '<span class="badge-new">Новое</span>' : '';
  return `
    <button class="archive-item" data-id="${photo.id}">
      <span class="tag">${photo.tag}</span>
      ${newBadge}
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

function updateCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n + ' записей';
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ КОНТЕНТА
// ============================================================
let publicPhotos = [];
let privatePhotos = [];
let currentLightboxIndex = -1;
let currentLightboxList = [];

function renderAll() {
  // Сортируем: сначала новые
  publicPhotos  = sortByDate(PHOTOS.filter(p => !p.private));
  privatePhotos = sortByDate(PHOTOS.filter(p => p.private));

  renderGrid('grid-all', publicPhotos);
  renderGrid('grid-work', sortByDate(publicPhotos.filter(p => p.cat === 'work')));
  renderGrid('grid-life', sortByDate(publicPhotos.filter(p => p.cat === 'life')));
  renderGrid('grid-friends', sortByDate(publicPhotos.filter(p => p.cat === 'friends')));
  renderGrid('grid-private', privatePhotos);

  updateCount('count-all', publicPhotos.length);
  updateCount('count-work', publicPhotos.filter(p => p.cat === 'work').length);
  updateCount('count-life', publicPhotos.filter(p => p.cat === 'life').length);
  updateCount('count-friends', publicPhotos.filter(p => p.cat === 'friends').length);
  updateCount('count-private', privatePhotos.length);
}

// ============================================================
// РОУТИНГ
// ============================================================
const pages = ['all', 'work', 'life', 'friends', 'about', 'private'];

function showPage(name) {
  if (!pages.includes(name)) name = 'all';

  $$('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');

  $$('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });

  if (name === 'private') checkPrivateSession();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHash() {
  startProgress();
  showPage(location.hash.replace('#', '') || 'all');
  setTimeout(finishProgress, 200);
}

window.addEventListener('hashchange', handleHash);

// ============================================================
// ПРИВАТНЫЙ ДОСТУП
// ============================================================
const lockScreen = $('#lock-screen');
const privateContent = $('#private-content');
const passwordInput = $('#password-input');
const passwordHint = $('#password-hint');
const unlockBtn = $('#unlock-btn');
const lockAgainBtn = $('#lock-again-btn');

function checkPrivateSession() {
  const unlocked = sessionStorage.getItem(SESSION_KEY) === 'true';
  if (unlocked) {
    lockScreen.style.display = 'none';
    privateContent.style.display = 'block';
  } else {
    lockScreen.style.display = 'block';
    privateContent.style.display = 'none';
    passwordInput.value = '';
    passwordHint.classList.remove('show');
  }
}

function tryUnlock() {
  if (passwordInput.value.trim() === PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    lockScreen.style.display = 'none';
    privateContent.style.display = 'block';
    passwordHint.classList.remove('show');
    passwordInput.classList.remove('error');
  } else {
    passwordInput.classList.add('error');
    passwordHint.classList.add('show');
    setTimeout(() => passwordInput.classList.remove('error'), 400);
  }
}

unlockBtn.addEventListener('click', tryUnlock);
passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
passwordInput.addEventListener('input', () => passwordHint.classList.remove('show'));

lockAgainBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  checkPrivateSession();
  passwordInput.focus();
});

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

function getCurrentList() {
  const activePage = $('.page.active');
  if (!activePage) return publicPhotos;
  if (activePage.id === 'page-private') return privatePhotos;
  if (activePage.id === 'page-work')    return sortByDate(publicPhotos.filter(p => p.cat === 'work'));
  if (activePage.id === 'page-life')    return sortByDate(publicPhotos.filter(p => p.cat === 'life'));
  if (activePage.id === 'page-friends') return sortByDate(publicPhotos.filter(p => p.cat === 'friends'));
  const activeFilter = $('.filter.active');
  if (activeFilter && activeFilter.dataset.filter !== 'all') {
    return sortByDate(publicPhotos.filter(p => p.cat === activeFilter.dataset.filter));
  }
  return publicPhotos;
}

function openLightbox(id) {
  currentLightboxList = getCurrentList();
  currentLightboxIndex = currentLightboxList.findIndex(p => p.id === Number(id));
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
// ФИЛЬТРЫ
// ============================================================
$$('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.filter;
    const filtered = cat === 'all'
      ? publicPhotos
      : sortByDate(publicPhotos.filter(p => p.cat === cat));
    renderGrid('grid-all', filtered);
    updateCount('count-all', filtered.length);
  });
});

// ============================================================
// ГОД В ФУТЕРЕ
// ============================================================
document.getElementById('year').textContent = new Date().getFullYear();

// ============================================================
// СТАРТ
// ============================================================
(async function init() {
  startProgress();
  try {
    await loadPhotos();
    renderAll();
    handleHash();
  } catch (err) {
    console.error(err);
    document.querySelector('main').innerHTML =
      '<p style="text-align:center;padding:60px;color:#4a637d">Ошибка загрузки архива</p>';
  } finally {
    finishProgress();
  }
})();
