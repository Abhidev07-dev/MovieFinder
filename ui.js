/* ═══════════════════════════════════════════════════════════════
   MovieFinder — js/ui.js
   All DOM rendering helpers (cards, panels, modals, toasts)
   ═══════════════════════════════════════════════════════════════ */

/* ── Stars renderer ───────────────────────────────────────────── */
/**
 * Returns HTML for star icons from a 0–10 rating.
 * Maps to 5-star display (half‑star precision via font-awesome).
 */
function renderStars(rating, max = 10, count = 10) {
  const filled = Math.round((rating / max) * count);
  return Array.from({ length: count }, (_, i) =>
    `<i class="fa-solid fa-star${i < filled ? ' on' : ''}"></i>`
  ).join('');
}

/** Compact 5-star display for cards */
function renderMiniStars(rating) {
  const filled = Math.round((rating / 10) * 5);
  return Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-solid fa-star${i < filled ? ' on' : ''}"></i>`
  ).join('');
}

/* ── Genre tags ───────────────────────────────────────────────── */
function genreNames(ids = []) {
  return ids.slice(0, 3).map(id => CONFIG.GENRES[id]).filter(Boolean);
}

/* ── Year from date string ────────────────────────────────────── */
function year(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : 'N/A';
}

/* ── Runtime formatter ────────────────────────────────────────── */
function formatRuntime(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/* ── Relative time ────────────────────────────────────────────── */
function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

/* ═══════════════════════════════════════════════════════════════
   MOVIE CARD
   ═══════════════════════════════════════════════════════════════ */
/**
 * Creates a movie card element.
 * @param {Object} movie - TMDB movie object
 * @param {Function} onClick - called when card is clicked
 * @returns {HTMLElement}
 */
function createMovieCard(movie, onClick) {
  const inWatchlist = Watchlist.has(movie.id);
  const genres = genreNames(movie.genre_ids || []);
  const posterUrl = movie.poster_path
    ? `${CONFIG.IMAGE_W342}${movie.poster_path}`
    : null;

  const el = document.createElement('div');
  el.className = 'movie-card';
  el.dataset.movieId = movie.id;

  el.innerHTML = `
    <div class="card-poster-wrap">
      ${posterUrl
        ? `<img class="card-poster" src="${posterUrl}" alt="${escHtml(movie.title)}" loading="lazy" />`
        : `<div class="card-no-poster"><i class="fa-solid fa-film"></i><span>No Image</span></div>`
      }
      ${movie.vote_average
        ? `<div class="card-rating-badge"><i class="fa-solid fa-star"></i> ${movie.vote_average.toFixed(1)}</div>`
        : ''
      }
      <button class="card-fav-btn ${inWatchlist ? 'active' : ''}"
              title="${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}"
              aria-label="Toggle watchlist">
        <i class="fa-${inWatchlist ? 'solid' : 'regular'} fa-heart"></i>
      </button>
      <div class="card-overlay">
        <div class="card-play-btn"><i class="fa-solid fa-circle-info"></i></div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title">${escHtml(movie.title)}</div>
      <div class="card-meta">
        <span class="card-year">${year(movie.release_date)}</span>
        <div class="card-stars">${renderMiniStars(movie.vote_average || 0)}</div>
      </div>
      ${genres.length ? `<div class="card-genres">${genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}</div>` : ''}
    </div>
  `;

  // Click on card → open movie detail
  el.addEventListener('click', (e) => {
    if (e.target.closest('.card-fav-btn')) return;
    onClick(movie);
  });

  // Watchlist toggle
  const favBtn = el.querySelector('.card-fav-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const added = Watchlist.toggle(movie);
    favBtn.innerHTML = `<i class="fa-${added ? 'solid' : 'regular'} fa-heart"></i>`;
    favBtn.classList.toggle('active', added);
    showToast(added ? '❤️ Added to Watchlist' : '💔 Removed from Watchlist', added ? 'success' : '');
    renderWatchlistPanel();
    updateWatchlistBadge();
  });

  return el;
}

/* ═══════════════════════════════════════════════════════════════
   MOVIE MODAL
   ═══════════════════════════════════════════════════════════════ */
async function openMovieModal(movie) {
  // Add to recently viewed
  RecentlyViewed.add(movie);
  renderRecentlyViewed();

  const modal = document.getElementById('movieModal');
  const box   = document.getElementById('modalBox');

  // Show modal immediately with loading state
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  box.querySelector('#modalTitle').textContent = movie.title;
  box.querySelector('#modalOverview').textContent = 'Loading…';
  box.querySelector('#modalBanner').style.backgroundImage = '';
  box.querySelector('#castRow').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  box.querySelector('#modalSimilarRow').innerHTML = '';

  // Fetch full details
  const data = await API.getMovie(movie.id);
  if (!data) {
    showToast('Failed to load movie details', 'error');
    return;
  }

  // Banner
  const bannerEl = box.querySelector('#modalBanner');
  if (data.backdrop_path) {
    bannerEl.style.backgroundImage = `url(${CONFIG.IMAGE_W780}${data.backdrop_path})`;
  } else {
    bannerEl.style.background = 'var(--bg-card)';
  }

  // Poster
  const posterEl = box.querySelector('#modalPoster');
  posterEl.src = data.poster_path
    ? `${CONFIG.IMAGE_W342}${data.poster_path}`
    : '';
  posterEl.alt = data.title;

  // Title, year, runtime
  box.querySelector('#modalTitle').textContent = data.title;
  box.querySelector('#modalYear').textContent = year(data.release_date);
  box.querySelector('#modalRuntime').textContent = formatRuntime(data.runtime);
  box.querySelector('#modalRatingBadge').textContent = `★ ${(data.vote_average || 0).toFixed(1)}`;

  // Stars
  box.querySelector('#modalStars').innerHTML = renderStars(data.vote_average || 0);

  // Genres
  box.querySelector('#modalGenres').innerHTML = (data.genres || [])
    .map(g => `<span class="modal-genre-tag">${g.name}</span>`)
    .join('');

  // Overview
  box.querySelector('#modalOverview').textContent = data.overview || 'No description available.';

  // Watchlist button
  updateModalWatchlistBtn(data);

  // Trailer
  const trailerBtn = box.querySelector('#modalTrailerBtn');
  const trailer = (data.videos?.results || [])
    .find(v => v.site === 'YouTube' && v.type === 'Trailer');
  if (trailer) {
    trailerBtn.classList.remove('no-trailer');
    trailerBtn.onclick = () => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
  } else {
    trailerBtn.classList.add('no-trailer');
    trailerBtn.onclick = () => showToast('No trailer available', 'error');
  }

  // Cast
  const cast = (data.credits?.cast || []).slice(0, 15);
  const castRow = box.querySelector('#castRow');
  castRow.innerHTML = cast.length
    ? cast.map(c => `
        <div class="cast-card">
          <img class="cast-avatar"
               src="${c.profile_path ? CONFIG.IMAGE_W200 + c.profile_path : ''}"
               alt="${escHtml(c.name)}"
               loading="lazy"
               onerror="this.src='';this.style.background='var(--bg-glass-2)'"
          />
          <div class="cast-name">${escHtml(c.name)}</div>
          <div class="cast-character">${escHtml(c.character || '')}</div>
        </div>
      `).join('')
    : '<p style="color:var(--text-muted);font-size:13px">No cast info available.</p>';

  // Similar in modal
  const similar = (data.similar?.results || []).slice(0, 12);
  const simRow = box.querySelector('#modalSimilarRow');
  simRow.innerHTML = '';
  similar.forEach(m => {
    const card = createMovieCard(m, openMovieModal);
    simRow.appendChild(card);
  });

  // Trigger side-panel similar / recommended updates
  renderSimilarRow(data.similar?.results || []);
  renderRecommendedRow(data.recommendations?.results || []);

  // Store currently open movie for watchlist modal btn
  box.dataset.currentMovieId = data.id;
  box.dataset.currentMovie = JSON.stringify({
    id: data.id,
    title: data.title,
    poster_path: data.poster_path,
    release_date: data.release_date,
    vote_average: data.vote_average,
  });
}

function updateModalWatchlistBtn(movie) {
  const btn = document.getElementById('modalWatchlistBtn');
  const inList = Watchlist.has(movie.id);
  btn.innerHTML = inList
    ? '<i class="fa-solid fa-check"></i> In Watchlist'
    : '<i class="fa-solid fa-plus"></i> Add to Watchlist';
  btn.classList.toggle('in-list', inList);
  btn.onclick = () => {
    Watchlist.toggle(movie);
    updateModalWatchlistBtn(movie);
    renderWatchlistPanel();
    updateWatchlistBadge();
    showToast(Watchlist.has(movie.id) ? '❤️ Added to Watchlist' : '💔 Removed', Watchlist.has(movie.id) ? 'success' : '');
  };
}

function closeMovieModal() {
  document.getElementById('movieModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════
   HORIZONTAL ROWS
   ═══════════════════════════════════════════════════════════════ */
function renderRow(rowId, movies) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  movies.forEach(m => {
    const card = createMovieCard(m, openMovieModal);
    row.appendChild(card);
  });
}

function renderSimilarRow(movies) {
  const section = document.getElementById('similarSection');
  if (!movies?.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  renderRow('similarRow', movies.slice(0, 20));
}

function renderRecommendedRow(movies) {
  const section = document.getElementById('recommendedSection');
  if (!movies?.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  renderRow('recommendedRow', movies.slice(0, 20));
}

/* ── Scroll row arrows ────────────────────────────────────────── */
function scrollRow(rowId, direction) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.scrollBy({ left: direction * 480, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════════════════
   ACTOR PROFILE
   ═══════════════════════════════════════════════════════════════ */
function renderActorProfile(person) {
  const section = document.getElementById('actorProfileSection');
  section.classList.remove('hidden');

  document.getElementById('actorPhoto').src = person.profile_path
    ? `${CONFIG.IMAGE_W342}${person.profile_path}`
    : '';
  document.getElementById('actorPhoto').alt = person.name;
  document.getElementById('actorName').textContent = person.name;
  document.getElementById('actorBirthday').textContent =
    person.birthday ? formatDate(person.birthday) : 'Unknown';
  document.getElementById('actorBirthplace').textContent =
    person.place_of_birth || 'Unknown';

  const bioEl = document.getElementById('actorBio');
  bioEl.textContent = person.biography || 'No biography available.';
  bioEl.classList.remove('expanded');

  const toggleBtn = document.getElementById('bioToggle');
  if (!person.biography || person.biography.length < 300) {
    toggleBtn.style.display = 'none';
  } else {
    toggleBtn.style.display = 'inline';
    toggleBtn.textContent = 'Read more';
    toggleBtn.onclick = () => {
      const expanded = bioEl.classList.toggle('expanded');
      toggleBtn.textContent = expanded ? 'Read less' : 'Read more';
    };
  }
}

function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return str; }
}

/* ═══════════════════════════════════════════════════════════════
   WATCHLIST PANEL
   ═══════════════════════════════════════════════════════════════ */
function renderWatchlistPanel() {
  const body = document.getElementById('watchlistBody');
  const list = Watchlist.getAll();

  if (!list.length) {
    body.innerHTML = '<p class="empty-state">Your watchlist is empty.<br/>Start adding movies!</p>';
    return;
  }

  body.innerHTML = list.map(m => `
    <div class="watchlist-item" onclick="openMovieFromPanel(${m.id})">
      <img class="watchlist-thumb"
           src="${m.poster_path ? CONFIG.IMAGE_W200 + m.poster_path : ''}"
           alt="${escHtml(m.title)}"
           onerror="this.style.display='none'"
           loading="lazy"
      />
      <div class="watchlist-info">
        <div class="watchlist-title">${escHtml(m.title)}</div>
        <div class="watchlist-year">${year(m.release_date)} · ★ ${(m.vote_average||0).toFixed(1)}</div>
      </div>
      <button class="watchlist-remove" onclick="removeFromWatchlistPanel(event, ${m.id})" title="Remove">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function removeFromWatchlistPanel(e, id) {
  e.stopPropagation();
  Watchlist.remove(id);
  renderWatchlistPanel();
  updateWatchlistBadge();
  // Sync all visible card heart icons
  document.querySelectorAll(`.movie-card[data-movie-id="${id}"] .card-fav-btn`).forEach(btn => {
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    btn.classList.remove('active');
  });
  showToast('Removed from Watchlist');
}

function openMovieFromPanel(id) {
  closeWatchlist();
  // Find movie in any rendered cards
  const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
  if (card) { card.click(); return; }
  // Fallback: open with minimal data
  openMovieModal({ id, title: '', poster_path: null });
}

function updateWatchlistBadge() {
  const badge = document.getElementById('watchlist-badge');
  const count = Watchlist.count();
  badge.textContent = count;
  badge.classList.add('pulse');
  setTimeout(() => badge.classList.remove('pulse'), 400);
}

function openWatchlist() {
  renderWatchlistPanel();
  document.getElementById('watchlistOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeWatchlist() {
  document.getElementById('watchlistOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY PANEL
   ═══════════════════════════════════════════════════════════════ */
function renderHistoryPanel() {
  const body  = document.getElementById('historyBody');
  const items = SearchHistory.getAll();

  if (!items.length) {
    body.innerHTML = '<p class="empty-state">No searches yet.</p>';
    return;
  }

  body.innerHTML = items.map(h => `
    <div class="history-item" onclick="repeatSearch('${escHtml(h.query)}')">
      <i class="fa-solid fa-clock-rotate-left"></i>
      <span>${escHtml(h.query)}</span>
      <span class="history-time">${timeAgo(h.time)}</span>
    </div>
  `).join('');
}

function clearSearchHistory() {
  SearchHistory.clear();
  renderHistoryPanel();
  showToast('Search history cleared');
}

function openHistory() {
  renderHistoryPanel();
  document.getElementById('historyOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeHistory() {
  document.getElementById('historyOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════
   RECENTLY VIEWED
   ═══════════════════════════════════════════════════════════════ */
function renderRecentlyViewed() {
  const list = RecentlyViewed.getAll();
  const section = document.getElementById('recentlyViewedSection');
  if (!list.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  renderRow('recentlyViewedRow', list);
}

function clearRecentlyViewed() {
  RecentlyViewed.clear();
  document.getElementById('recentlyViewedSection').classList.add('hidden');
  showToast('Recently viewed cleared');
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.4,0,0.2,1) both';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ═══════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════ */
function setHero(movie) {
  if (!movie) return;

  const bg    = document.getElementById('heroBg');
  const title = document.getElementById('heroTitle');
  const tag   = document.getElementById('heroTagline');
  const meta  = document.getElementById('heroMeta');
  const detailsBtn  = document.getElementById('heroDetailsBtn');
  const watchlistBtn = document.getElementById('heroWatchlistBtn');

  if (movie.backdrop_path) {
    bg.style.backgroundImage = `url(${CONFIG.IMAGE_ORIG}${movie.backdrop_path})`;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center 20%';
  }

  title.textContent = movie.title;
  tag.textContent   = movie.overview
    ? movie.overview.slice(0, 160) + (movie.overview.length > 160 ? '…' : '')
    : 'The most-talked-about film right now.';

  const genres = genreNames(movie.genre_ids || []);
  meta.innerHTML = [
    `<span class="hero-meta-chip hero-meta-rating">★ ${(movie.vote_average||0).toFixed(1)}</span>`,
    `<span class="hero-meta-chip">${year(movie.release_date)}</span>`,
    ...genres.map(g => `<span class="hero-meta-chip">${g}</span>`),
  ].join('');

  detailsBtn.onclick = () => openMovieModal(movie);
  watchlistBtn.onclick = () => {
    const added = Watchlist.toggle(movie);
    watchlistBtn.innerHTML = `<i class="fa-solid fa-${added ? 'check' : 'plus'}"></i> ${added ? 'In Watchlist' : 'Add to Watchlist'}`;
    showToast(added ? '❤️ Added to Watchlist' : '💔 Removed', added ? 'success' : '');
    renderWatchlistPanel();
    updateWatchlistBadge();
  };
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON LOADING
   ═══════════════════════════════════════════════════════════════ */
function showGridSkeletons(containerId, count = 12) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(
    '<div class="skeleton-grid-card"></div>'
  ).join('');
}

/* ── Misc helpers ─────────────────────────────────────────────── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
