/* ═══════════════════════════════════════════════════════════════
   MovieFinder — js/storage.js
   localStorage helpers: watchlist, search history, recently viewed
   ═══════════════════════════════════════════════════════════════ */

const KEYS = {
  WATCHLIST:       'mf_watchlist',
  SEARCH_HISTORY:  'mf_search_history',
  RECENTLY_VIEWED: 'mf_recently_viewed',
  THEME:           'mf_theme',
};

/* ── Utilities ────────────────────────────────────────────────── */
function lsGet(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ── Watchlist ────────────────────────────────────────────────── */
const Watchlist = {
  getAll: () => lsGet(KEYS.WATCHLIST, []),

  add(movie) {
    const list = this.getAll();
    if (!list.find(m => m.id === movie.id)) {
      list.unshift({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      });
      lsSet(KEYS.WATCHLIST, list);
      return true;
    }
    return false; // already in list
  },

  remove(id) {
    const list = this.getAll().filter(m => m.id !== id);
    lsSet(KEYS.WATCHLIST, list);
  },

  has: (id) => Watchlist.getAll().some(m => m.id === id),

  toggle(movie) {
    if (this.has(movie.id)) { this.remove(movie.id); return false; }
    this.add(movie); return true;
  },

  count: () => Watchlist.getAll().length,
};

/* ── Search History ───────────────────────────────────────────── */
const SearchHistory = {
  MAX: 20,

  getAll: () => lsGet(KEYS.SEARCH_HISTORY, []),

  add(query) {
    let history = this.getAll().filter(h => h.query.toLowerCase() !== query.toLowerCase());
    history.unshift({ query, time: Date.now() });
    history = history.slice(0, this.MAX);
    lsSet(KEYS.SEARCH_HISTORY, history);
  },

  clear: () => lsSet(KEYS.SEARCH_HISTORY, []),
};

/* ── Recently Viewed Movies ───────────────────────────────────── */
const RecentlyViewed = {
  MAX: 24,

  getAll: () => lsGet(KEYS.RECENTLY_VIEWED, []),

  add(movie) {
    let list = this.getAll().filter(m => m.id !== movie.id);
    list.unshift({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      genre_ids: movie.genre_ids || [],
    });
    list = list.slice(0, this.MAX);
    lsSet(KEYS.RECENTLY_VIEWED, list);
  },

  clear: () => lsSet(KEYS.RECENTLY_VIEWED, []),
};

/* ── Theme ────────────────────────────────────────────────────── */
const ThemeStorage = {
  get: () => localStorage.getItem(KEYS.THEME) || 'dark',
  set: (theme) => localStorage.setItem(KEYS.THEME, theme),
};
