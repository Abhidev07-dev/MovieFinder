/* ═══════════════════════════════════════════════════════════════
   MovieFinder — js/config.js
   ⚠️  PUT YOUR TMDB API KEY HERE
   Get a free key at: https://www.themoviedb.org/settings/api
   ═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  // ── YOUR KEY GOES HERE ────────────────────────────────────────
  API_KEY: 'c42012293f778b661114489a279de64d',          // ← Replace this!
  // ─────────────────────────────────────────────────────────────

  BASE_URL:    'https://api.themoviedb.org/3',
  IMAGE_BASE:  'https://image.tmdb.org/t/p',
  IMAGE_W200:  'https://image.tmdb.org/t/p/w200',
  IMAGE_W342:  'https://image.tmdb.org/t/p/w342',
  IMAGE_W500:  'https://image.tmdb.org/t/p/w500',
  IMAGE_W780:  'https://image.tmdb.org/t/p/w780',
  IMAGE_ORIG:  'https://image.tmdb.org/t/p/original',

  // Genres lookup (avoids extra API calls)
  GENRES: {
    28:    'Action',    12:  'Adventure', 16:   'Animation',
    35:    'Comedy',    80:  'Crime',      99:   'Documentary',
    18:    'Drama',     10751:'Family',   14:   'Fantasy',
    36:    'History',   27:  'Horror',    10402:'Music',
    9648:  'Mystery',   10749:'Romance',  878:  'Sci-Fi',
    10770: 'TV Movie',  53:  'Thriller',  10752:'War',
    37:    'Western',
  },

  // Popular actors shown as chips on the default screen
  POPULAR_ACTORS: [
    { id: 6193, name: 'Leonardo DiCaprio' },
    { id: 1245, name: 'Scarlett Johansson' },
    { id: 500,  name: 'Tom Cruise' },
    { id: 1892, name: 'Morgan Freeman' },
    { id: 287,  name: 'Brad Pitt' },
    { id: 3223, name: 'Robert Downey Jr.' },
    { id: 8691, name: 'Meryl Streep' },
    { id: 2955, name: 'Denzel Washington' },
    { id: 1327,  name: 'Cate Blanchett' },
    { id: 73457, name: 'Chris Evans' },
    { id: 17419, name: 'Margot Robbie' },
    { id: 1136406, name: 'Timothée Chalamet' },
  ],

  RESULTS_PER_PAGE: 20,   // cards per page in actor movies grid
  AUTOCOMPLETE_DELAY: 350, // ms debounce for search input
};
