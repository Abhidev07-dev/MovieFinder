/* ═══════════════════════════════════════════════════════════════
   MovieFinder — js/app.js
   Main application controller
   ═══════════════════════════════════════════════════════════════ */

/* ── State ────────────────────────────────────────────────────── */
const State = {
  currentActorMovies: [],   // full list for current actor search
  currentPage:        1,
  sortBy:             'popularity',
  trendingWindow:     'day',
  searchDebounce:     null,
  noApiKey:           false,
};

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // Check API key
  if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    State.noApiKey = true;
    document.getElementById('configBanner').classList.remove('hidden');
    loadDemoMode();
    return;
  }

  initTheme();
  initNavbar();
  initSearch();
  initModal();
  initPanels();
  initSortBar();
  initTrendingToggle();

  updateWatchlistBadge();
  renderRecentlyViewed();

  // Load popular actor chips
  loadActorChips();

  // Load home sections in parallel
  loadHomeData();
});

/* ─────────────────────────────────────────────────────────────── */

/* ── Demo mode (no API key) ───────────────────────────────────── */
function loadDemoMode() {
  initTheme();
  initNavbar();
  initModal();
  initPanels();
  document.getElementById('actorsChips').innerHTML =
    '<p style="color:var(--text-muted);font-size:14px">Set your API key in <code>js/config.js</code> to see live data.</p>';
}

/* ── Theme ────────────────────────────────────────────────────── */
function initTheme() {
  const saved = ThemeStorage.get();
  applyTheme(saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  ThemeStorage.set(theme);
  const icon = document.getElementById('themeIcon');
  icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

/* ── Navbar scroll effect ─────────────────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    menu.classList.toggle('open');
  });

  // History button
  document.getElementById('historyBtn').addEventListener('click', openHistory);
}

/* ── Home Data ────────────────────────────────────────────────── */
async function loadHomeData() {
  const [trending, topRated, nowPlaying, popular] = await Promise.all([
    API.getTrending('day'),
    API.getTopRated(),
    API.getNowPlaying(),
    API.getPopular(),
  ]);

  // Hero from trending[0]
  const heroMovies = trending?.results || popular?.results || [];
  if (heroMovies.length) setHero(heroMovies[0]);

  // Trending row
  renderRow('trendingRow', trending?.results || []);

  // Top Rated
  renderRow('topRatedRow', topRated?.results || []);

  // Recent
  renderRow('recentRow', nowPlaying?.results || []);
}

/* ── Actor Chips ──────────────────────────────────────────────── */
async function loadActorChips() {
  const container = document.getElementById('actorsChips');
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  // Fetch profile images in parallel
  const actors = await Promise.all(
    CONFIG.POPULAR_ACTORS.map(async (a) => {
      const data = await API.getPersonImage(a.id);
      return { ...a, profile_path: data?.profile_path || null };
    })
  );

  container.innerHTML = '';
  actors.forEach(actor => {
    const chip = document.createElement('div');
    chip.className = 'actor-chip';
    chip.innerHTML = `
      <img class="chip-avatar"
           src="${actor.profile_path ? CONFIG.IMAGE_W200 + actor.profile_path : ''}"
           alt="${escHtml(actor.name)}"
           onerror="this.style.display='none'"
           loading="lazy"
      />
      <span class="chip-name">${escHtml(actor.name)}</span>
    `;
    chip.addEventListener('click', () => {
      document.getElementById('searchInput').value = actor.name;
      searchActorById(actor.id, actor.name);
    });
    container.appendChild(chip);
  });
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════════════════════════ */
function initSearch() {
  const input    = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClear');
  const searchBtn = document.getElementById('searchBtn');
  const dropdown = document.getElementById('autocompleteDropdown');

  // Input events
  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.classList.toggle('visible', val.length > 0);

    clearTimeout(State.searchDebounce);
    if (val.length < 2) { dropdown.classList.remove('open'); return; }
    State.searchDebounce = setTimeout(() => fetchAutocomplete(val), CONFIG.AUTOCOMPLETE_DELAY);
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    dropdown.classList.remove('open');
    input.focus();
  });

  // Search button / Enter
  searchBtn.addEventListener('click', triggerSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerSearch();
    if (e.key === 'Escape') dropdown.classList.remove('open');
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.remove('open');
    }
  });
}

async function fetchAutocomplete(query) {
  const data = await API.searchPerson(query);
  const results = (data?.results || []).slice(0, 6);
  const dropdown = document.getElementById('autocompleteDropdown');

  if (!results.length) { dropdown.classList.remove('open'); return; }

  dropdown.innerHTML = results.map(p => `
    <div class="autocomplete-item" data-id="${p.id}" data-name="${escHtml(p.name)}">
      <img class="autocomplete-avatar"
           src="${p.profile_path ? CONFIG.IMAGE_W200 + p.profile_path : ''}"
           alt="${escHtml(p.name)}"
           onerror="this.src='';this.style.background='var(--bg-glass-2)'"
           loading="lazy"
      />
      <div>
        <div class="autocomplete-name">${escHtml(p.name)}</div>
        <div class="autocomplete-dept">${escHtml(p.known_for_department || '')}</div>
      </div>
    </div>
  `).join('');

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const id   = parseInt(item.dataset.id);
      const name = item.dataset.name;
      document.getElementById('searchInput').value = name;
      document.getElementById('autocompleteDropdown').classList.remove('open');
      searchActorById(id, name);
    });
  });

  dropdown.classList.add('open');
}

async function triggerSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  document.getElementById('autocompleteDropdown').classList.remove('open');

  // Save history
  SearchHistory.add(query);

  // Find the person
  const data = await API.searchPerson(query);
  const person = data?.results?.[0];

  if (!person) {
    showToast(`No actor found for "${query}"`, 'error');
    return;
  }

  searchActorById(person.id, person.name);
}

/** Expose for history panel re-search */
function repeatSearch(query) {
  closeHistory();
  document.getElementById('searchInput').value = query;
  triggerSearch();
}

/* ═══════════════════════════════════════════════════════════════
   ACTOR SEARCH & DISPLAY
   ═══════════════════════════════════════════════════════════════ */
async function searchActorById(actorId, actorName) {
  // Scroll to top of results
  document.getElementById('popularActorsSection').classList.add('hidden');
  document.getElementById('actorProfileSection').classList.add('hidden');
  document.getElementById('actorMoviesSection').classList.add('hidden');
  document.getElementById('sortBar').classList.add('hidden');

  // Show spinner in movies grid
  const grid = document.getElementById('actorMoviesGrid');
  document.getElementById('actorMoviesSection').classList.remove('hidden');
  showGridSkeletons('actorMoviesGrid', 12);
  window.scrollTo({ top: document.getElementById('actorMoviesSection').offsetTop - 90, behavior: 'smooth' });

  // Fetch person + credits in parallel
  const [person, credits] = await Promise.all([
    API.getPerson(actorId),
    API.getPersonMovies(actorId),
  ]);

  if (!person) {
    showToast('Could not load actor data', 'error');
    return;
  }

  // Render profile
  renderActorProfile(person);
  document.getElementById('actorProfileSection').classList.remove('hidden');

  // Get movies (as crew + cast, exclude duplicates)
  const castMovies = (credits?.cast || [])
    .filter(m => m.poster_path && m.vote_count > 10);

  State.currentActorMovies = castMovies;
  State.currentPage = 1;

  // Update title
  document.getElementById('actorMoviesTitle').textContent = `${actorName}'s Movies`;
  document.getElementById('movieCount').textContent = `${castMovies.length} films`;

  // Sort bar
  document.getElementById('sortBar').classList.remove('hidden');
  resetSortButtons();

  renderActorMoviesPage();
}

/* ── Sort ─────────────────────────────────────────────────────── */
function initSortBar() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.sortBy = btn.dataset.sort;
      State.currentPage = 1;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderActorMoviesPage();
    });
  });
}

function resetSortButtons() {
  State.sortBy = 'popularity';
  document.querySelectorAll('.sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === 'popularity');
  });
}

function getSortedMovies() {
  const movies = [...State.currentActorMovies];
  switch (State.sortBy) {
    case 'rating':
      return movies.sort((a,b) => (b.vote_average||0) - (a.vote_average||0));
    case 'date':
      return movies.sort((a,b) => new Date(b.release_date||0) - new Date(a.release_date||0));
    case 'alpha':
      return movies.sort((a,b) => a.title.localeCompare(b.title));
    case 'popularity':
    default:
      return movies.sort((a,b) => (b.popularity||0) - (a.popularity||0));
  }
}

function renderActorMoviesPage() {
  const sorted = getSortedMovies();
  const total  = sorted.length;
  const perPage = CONFIG.RESULTS_PER_PAGE;
  const totalPages = Math.ceil(total / perPage);
  const start  = (State.currentPage - 1) * perPage;
  const paginated = sorted.slice(start, start + perPage);

  const grid = document.getElementById('actorMoviesGrid');
  grid.innerHTML = '';

  if (!paginated.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;padding:40px;text-align:center">No movies found.</p>';
    return;
  }

  paginated.forEach(m => {
    const card = createMovieCard(m, openMovieModal);
    grid.appendChild(card);
  });

  renderPagination(totalPages);
}

/* ── Pagination ───────────────────────────────────────────────── */
function renderPagination(totalPages) {
  const container = document.getElementById('actorPagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const current = State.currentPage;
  const pages = getPaginationRange(current, totalPages);

  container.innerHTML = pages.map(p => {
    if (p === '…') return `<button class="page-btn ellipsis" disabled>…</button>`;
    return `<button class="page-btn ${p === current ? 'active' : ''}"
                    onclick="goToPage(${p})">${p}</button>`;
  }).join('');
}

function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current-1); p <= Math.min(total-1, current+1); p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

function goToPage(page) {
  State.currentPage = page;
  renderActorMoviesPage();
  window.scrollTo({ top: document.getElementById('actorMoviesSection').offsetTop - 90, behavior: 'smooth' });
}

/* ── Trending Toggle ──────────────────────────────────────────── */
function initTrendingToggle() {
  document.querySelectorAll('.trend-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      State.trendingWindow = btn.dataset.window;
      document.querySelectorAll('.trend-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('trendingRow').innerHTML = Array(5).fill('<div class="skeleton-card"></div>').join('');
      const data = await API.getTrending(State.trendingWindow);
      renderRow('trendingRow', data?.results || []);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODAL INIT
   ═══════════════════════════════════════════════════════════════ */
function initModal() {
  // Close on overlay click
  document.getElementById('movieModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('movieModal')) closeMovieModal();
  });
  document.getElementById('modalClose').addEventListener('click', closeMovieModal);

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMovieModal();
      closeWatchlist();
      closeHistory();
    }
  });
}

/* ── Panel overlays close on click ───────────────────────────── */
function initPanels() {
  document.getElementById('watchlistOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('watchlistOverlay')) closeWatchlist();
  });
  document.getElementById('historyOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('historyOverlay')) closeHistory();
  });
}

/* ── Go Home ──────────────────────────────────────────────────── */
function goHome() {
  document.getElementById('popularActorsSection').classList.remove('hidden');
  document.getElementById('actorProfileSection').classList.add('hidden');
  document.getElementById('actorMoviesSection').classList.add('hidden');
  document.getElementById('sortBar').classList.add('hidden');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.remove('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Hero parallax on scroll ──────────────────────────────────── */
window.addEventListener('scroll', () => {
  const heroBg = document.getElementById('heroBg');
  if (!heroBg) return;
  const scrolled = window.scrollY;
  heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
}, { passive: true });
