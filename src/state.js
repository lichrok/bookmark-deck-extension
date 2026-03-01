/**
 * State module: single source of truth.
 * Merges bookmark API data with stored order; exposes getState and mutators that persist and trigger re-render.
 */

/**
 * Merge category order: stored order wins; API categories not in order are appended.
 * @param {Array<{ id: string }>} apiCategories - Categories from API (with id).
 * @param {string[]} storedCategoryOrder - Stored category IDs.
 * @returns {Array<{ id: string, title: string, bookmarks: Array<{ id: string, title: string, url: string }> }>} Ordered categories.
 */
function mergeCategoryOrder(apiCategories, storedCategoryOrder) {
  const byId = new Map(apiCategories.map((c) => [c.id, c]));
  const ordered = [];
  const seen = new Set();
  for (const id of storedCategoryOrder) {
    if (byId.has(id)) {
      ordered.push(byId.get(id));
      seen.add(id);
    }
  }
  for (const cat of apiCategories) {
    if (!seen.has(cat.id)) ordered.push(cat);
  }
  return ordered;
}

/**
 * Merge bookmark order within a category: stored order wins; new bookmarks appended.
 * @param {Array<{ id: string, title: string, url: string }>} bookmarks - Bookmarks from API.
 * @param {string[]} storedIds - Stored bookmark IDs for this category.
 * @returns {Array<{ id: string, title: string, url: string }>} Ordered bookmarks.
 */
function mergeBookmarkOrder(bookmarks, storedIds) {
  const byId = new Map(bookmarks.map((b) => [b.id, b]));
  const ordered = [];
  const seen = new Set();
  for (const id of storedIds) {
    if (byId.has(id)) {
      ordered.push(byId.get(id));
      seen.add(id);
    }
  }
  for (const b of bookmarks) {
    if (!seen.has(b.id)) ordered.push(b);
  }
  return ordered;
}

/**
 * Create state manager. No globals; dependencies injected.
 * @param {Object} deps - { getStoredOrder, setCategoryOrder, setBookmarkOrder }
 * @param {() => void} onStateChange - Callback after state or order changes (e.g. re-render).
 */
export function createState(deps, onStateChange) {
  let rawData = null;
  let categoryOrder = [];
  let bookmarkOrder = {};
  let mergedCategories = [];

  /**
   * Load stored order and merge with current raw data. Call after getHomeTabData() or on bookmark events.
   * @param {{ homeTabId: string, categories: Array } | null} data - From bookmarks.getHomeTabData().
   */
  async function mergeWithStoredOrder(data) {
    rawData = data;
    if (!data || !data.categories.length) {
      mergedCategories = data ? data.categories : [];
      onStateChange();
      return;
    }
    const stored = await deps.getStoredOrder();
    categoryOrder = stored.categoryOrder;
    bookmarkOrder = stored.bookmarkOrder;
    const orderedCategories = mergeCategoryOrder(data.categories, stored.categoryOrder);
    mergedCategories = orderedCategories.map((cat) => ({
      ...cat,
      bookmarks: mergeBookmarkOrder(
        cat.bookmarks,
        bookmarkOrder[cat.id] || []
      ),
    }));
    onStateChange();
  }

  /**
   * Get current state for rendering.
   * @returns {{ categories: Array<{ id: string, title: string, bookmarks: Array<{ id: string, title: string, url: string }> }>, hasHomeTab: boolean }}
   */
  function getState() {
    return {
      categories: mergedCategories,
      hasHomeTab: rawData !== null && rawData.categories.length > 0,
    };
  }

  /**
   * Set category order and persist. Updates in-memory state and calls onStateChange.
   * @param {string[]} ids - Category folder IDs in new order.
   */
  async function setCategoryOrder(ids) {
    await deps.setCategoryOrder(ids);
    categoryOrder = ids;
    if (rawData) {
      mergedCategories = mergeCategoryOrder(rawData.categories, ids).map(
        (cat) => ({
          ...cat,
          bookmarks: mergeBookmarkOrder(
            cat.bookmarks,
            bookmarkOrder[cat.id] || []
          ),
        })
      );
    }
    onStateChange();
  }

  /**
   * Set bookmark order for one category and persist.
   * @param {string} categoryId - Category folder ID.
   * @param {string[]} ids - Bookmark IDs in new order.
   */
  async function setBookmarkOrder(categoryId, ids) {
    await deps.setBookmarkOrder(categoryId, ids);
    bookmarkOrder = { ...bookmarkOrder, [categoryId]: ids };
    const cat = mergedCategories.find((c) => c.id === categoryId);
    if (cat) {
      cat.bookmarks = mergeBookmarkOrder(cat.bookmarks, ids);
    }
    onStateChange();
  }

  return {
    mergeWithStoredOrder,
    getState,
    setCategoryOrder,
    setBookmarkOrder,
  };
}
