// ============================================================
// SVG-плейсхолдеры (если фото не загружено)
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
// ТЕМА
// ============================================================
const THEME_KEY = 'takun_theme';
const root = document.documentElement;

function applyTheme(theme) {
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return applyTheme(saved);
  // Если не сохранено — следуем системе
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();

// ============================================================
// ДАННЫЕ ФОТО
// ============================================================
const PASSWORD = '69853'; // ← поменяй на свой пароль
const SESSION_KEY = 'takun_private_unlocked';
const NEW_DAYS = 14; // фото младше 14 дней получают бейдж «Новое»

let PHOTOS = [];

async function loadPhotos() {
  try {
    const res = await fetch('photos.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('photos.json не найден');
    const data = await res.json();
    PHOTOS = data.map(p => ({
      ...p,
      src: p.src || makePlaceholder(p.title + p.id, p.title),
    }));
  } catch (e) {
    console.warn('Не удалось загрузить photos.json, использую встроенный список.');
    PHOTOS = getFallbackPhotos();
  }
}

// Резервный список, если photos.json не загрузился
function getFallbackPhotos() {
  const base = [
    { id: 1,  cat: 'life',    tag: 'Жизнь',       date: 'Сентябрь 2026', title: 'Прогулка по городу' },
    { id: 2,  cat: 'work',    tag: 'Работа',      date: 'Август 2026',   title: 'Эскизы к проекту' },
    { id: 3,  cat: 'life',    tag: 'Жизнь',       date: 'Июль 2026',     title: 'Плёночные кадры' },
    { id: 4,  cat: 'travel',  tag: 'Путешествия', date: 'Июнь 2026',     title: 'Море' },
    { id: 5,  cat: 'work',    tag: 'Работа',      date: 'Май 2026',      title: 'Работа над сайтом' },
    { id: 6,  cat: 'friends', tag: 'Друзья',      date: 'Апрель 2026',   title: 'Встреча с друзьями' },
    { id: 7,  cat: 'travel',  tag: 'Путешествия', date: 'Март 2026',     title: 'Горы' },
    { id: 8,  cat: 'life',    tag: 'Жизнь',       date: 'Февраль 2026',  title: 'Утро' },
    { id: 9,  cat: 'work',    tag: 'Работа',      date: 'Январь 2026',   title: 'Прототип' },
    { id: 10, cat: 'friends', tag: 'Друзья',      date: 'Декабрь 2025',  title: 'Новый год' },
    { id: 11, cat: 'travel',  tag: 'Путешествия', date: 'Ноябрь 2025',   title: 'Старый город' },
    { id: 12, cat: 'life',    tag: 'Жизнь',       date: 'Октябрь 2025',  title: 'Осень' },
    { id: 101, cat: 'private', tag: 'Личное', date: 'Сентябрь 2026', title: 'Семья',        private: true },
    { id: 102, cat: 'private', tag: 'Личное', date: 'Август 2026',   title: 'Дома',         private: true },
    { id: 103, cat: 'private', tag: 'Личное', date: 'Июль 2026',     title: 'Отпуск',       private: true },
    { id: 104, cat: 'private', tag: 'Личное', date: 'Июнь 2026',     title: 'Близкие',      private: true },
    { id: 105, cat: 'private', tag: 'Личное', date: 'Май 2026',      title: 'Тихий вечер',  private: true },
    { id: 106, cat: 'private', tag: 'Личное', date: 'Апрель 2026',   title: 'Воспоминание', private: true },
  ];
  return base.map(p => ({ ...p, src: makePlaceholder(p.title + p.id, p.title) }));
}

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
      <img src="${photo.src}" alt="${photo.title}" loading="lazy">
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
}

function updateCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n + ' записей';
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
let publicPhotos = [];
let privatePhotos = [];
let currentLightboxIndex = -1;
let currentLightboxList = [];

function renderAll() {
  publicPhotos = PHOTOS.filter(p => !p.private);
  privatePhotos = PHOTOS.filter(p => p.private);

  renderGrid('grid-all', publicPhotos);
  renderGrid('grid-work', publicPhotos.filter(p => p.cat === 'work'));
  renderGrid('grid-life', publicPhotos.filter(p => p.cat === 'life'));
  renderGrid('grid-friends', publicPhotos.filter(p => p.cat === 'friends'));
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

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');

  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });

  if (name === 'private') checkPrivateSession();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHash() {
  showPage(location.hash.replace('#', '') || 'all');
}

window.addEventListener('hashchange', handleHash);

// ============================================================
// ПРИВАТНЫЙ ДОСТУП
// ============================================================
const lockScreen = document.getElementById('lock-screen');
const privateContent = document.getElementById('private-content');
const passwordInput = document.getElementById('password-input');
const passwordHint = document.getElementById('password-hint');
const unlockBtn = document.getElementById('unlock-btn');
const lockAgainBtn = document.getElementById('lock-again-btn');

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
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxDate = document.getElementById('lightbox-date');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxDownload = document.getElementById('lightbox-download');

function getCurrentList() {
  // Определяем, из какой сетки открыт лайтбокс
  const activePage = document.querySelector('.page.active');
  if (!activePage) return publicPhotos;
  if (activePage.id === 'page-private') return privatePhotos;
  if (activePage.id === 'page-work')    return publicPhotos.filter(p => p.cat === 'work');
  if (activePage.id === 'page-life')    return publicPhotos.filter(p => p.cat === 'life');
  if (activePage.id === 'page-friends') return publicPhotos.filter(p => p.cat === 'friends');
  // На "all" — учитываем активный фильтр
  const activeFilter = document.querySelector('.filter.active');
  if (activeFilter && activeFilter.dataset.filter !== 'all') {
    return publicPhotos.filter(p => p.cat === activeFilter.dataset.filter);
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
}

function prevPhoto() {
  if (!currentLightboxList.length) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxList.length) % currentLightboxList.length;
  showLightboxPhoto(currentLightboxList[currentLightboxIndex]);
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 250);
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
document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.filter;
    const filtered = cat === 'all' ? publicPhotos : publicPhotos.filter(p => p.cat === cat);
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
  await loadPhotos();
  renderAll();
  handleHash();
})();