/* ═══════════════════════════════════════════════════════════════
   MovieFinder — js/api.js
   All TMDB API calls, with caching and error handling
   ═══════════════════════════════════════════════════════════════ */

/* ── Simple in-memory cache (per session) ─────────────────────── */
const _cache = new Map();

/**
 * Fetches from TMDB API with caching.
 * @param {string} endpoint - path after /3/
 * @param {Object} params   - query params (excluding api_key)
 * @returns {Promise<Object>}
 */
async function tmdb(endpoint, params = {}) {
  if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.warn('[MovieFinder] No API key set in js/config.js');
    return null;
  }

  const qp = new URLSearchParams({ api_key: CONFIG.API_KEY, ...params });
  const url = `${CONFIG.BASE_URL}/${endpoint}?${qp}`;

  // Return cached response if available
  if (_cache.has(url)) return _cache.get(url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
    const data = await res.json();
    _cache.set(url, data);
    return data;
  } catch (err) {
    console.error('[MovieFinder] API error:', err);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Public API methods
   ═══════════════════════════════════════════════════════════════ */
const API = {

  /* ── Search ─────────────────────────────────────────────────── */

  /** Search for people by name (for autocomplete) */
  searchPerson: (query) =>
    tmdb('search/person', { query, include_adult: false }),

  /* ── Person ─────────────────────────────────────────────────── */

  /** Get full actor details */
  getPerson: (id) =>
    tmdb(`person/${id}`, { append_to_response: 'movie_credits' }),

  /** Get all movie credits for an actor */
  getPersonMovies: (id) =>
    tmdb(`person/${id}/movie_credits`),

  /* ── Movies ─────────────────────────────────────────────────── */

  /** Get full movie details */
  getMovie: (id) =>
    tmdb(`movie/${id}`, {
      append_to_response: 'credits,videos,similar,recommendations',
    }),

  /** Get movie genres list */
  getGenres: () =>
    tmdb('genre/movie/list'),

  /* ── Discover / Lists ───────────────────────────────────────── */

  /** Trending movies (day or week) */
  getTrending: (window = 'day') =>
    tmdb(`trending/movie/${window}`),

  /** Top-rated movies */
  getTopRated: (page = 1) =>
    tmdb('movie/top_rated', { page }),

  /** Now-playing / recent releases */
  getNowPlaying: (page = 1) =>
    tmdb('movie/now_playing', { page }),

  /** Popular movies (for hero fallback) */
  getPopular: (page = 1) =>
    tmdb('movie/popular', { page }),

  /** Similar movies to a given ID */
  getSimilar: (id, page = 1) =>
    tmdb(`movie/${id}/similar`, { page }),

  /** Recommendations for a given ID */
  getRecommendations: (id, page = 1) =>
    tmdb(`movie/${id}/recommendations`, { page }),

  /* ── Actor chips ─────────────────────────────────────────────── */

  /** Fetch profile image for a person */
  getPersonImage: (id) =>
    tmdb(`person/${id}`, {}),
};
