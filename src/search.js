/**
 * Search: instant filter across bookmarks by title and URL.
 * Renders search input; filters state and passes filtered state to callback.
 */

/**
 * Filter state by query (case-insensitive match on bookmark title and url).
 * All categories are kept so DOM order matches full state for DnD; bookmarks are filtered per category.
 * @param {{ categories: Array, hasHomeTab: boolean }} state
 * @param {string} query - Trimmed, lowercased.
 * @returns {{ categories: Array, hasHomeTab: boolean }}
 */
export function filterState(state, query) {
  if (!query || !state.hasHomeTab) return state;
  const q = query.trim().toLowerCase();
  if (!q) return state;
  const categories = state.categories.map((cat) => ({
    ...cat,
    bookmarks: cat.bookmarks.filter(
      (b) =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.url && b.url.toLowerCase().includes(q))
    ),
  }));
  return { ...state, categories };
}

/**
 * Setup search UI in container. Callback receives filtered state for render.
 * @param {HTMLElement} container - e.g. #search-container
 * @param {(filteredState: { categories: Array, hasHomeTab: boolean }) => void} onFilteredRender - Called with filtered state to render.
 * @param {Object} stateApi - { getState }
 * @returns {{ updateFilter: (state?: { categories: Array, hasHomeTab: boolean }) => void }}
 */
export function setupSearch(container, onFilteredRender, stateApi) {
  let currentQuery = '';
  let inputEl = null;

  function applyAndRender(state) {
    const filtered = filterState(state || stateApi.getState(), currentQuery);
    onFilteredRender(filtered);
  }

  if (!container) {
    return {
      updateFilter(state) {
        applyAndRender(state);
      },
    };
  }

  container.innerHTML = '';
  container.setAttribute('aria-hidden', 'false');
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search bookmarks…';
  input.className = 'search-input';
  input.setAttribute('aria-label', 'Search bookmarks');
  input.addEventListener('input', () => {
    currentQuery = input.value;
    applyAndRender(stateApi.getState());
  });
  container.appendChild(input);
  inputEl = input;

  return {
    updateFilter(state) {
      const s = state || stateApi.getState();
      if (!s.hasHomeTab || !s.categories.length) {
        container.style.display = 'none';
      } else {
        container.style.display = '';
      }
      applyAndRender(s);
    },
  };
}
