/**
 * Storage module: chrome.storage.local wrapper for category/bookmark order and theme.
 * No global state; all functions return Promises.
 */

const KEYS = {
  CATEGORY_ORDER: 'categoryOrder',
  BOOKMARK_ORDER: 'bookmarkOrder',
  THEME: 'theme',
  BACKGROUND_IMAGE: 'backgroundImage',
  CACHED_STATE: 'cachedState',
};

const DEFAULT_THEME = 'system';

/**
 * Get stored category order and per-category bookmark order.
 * @returns {Promise<{ categoryOrder: string[], bookmarkOrder: Record<string, string[]> }>}
 */
export async function getStoredOrder() {
  const out = await chrome.storage.local.get([
    KEYS.CATEGORY_ORDER,
    KEYS.BOOKMARK_ORDER,
  ]);
  return {
    categoryOrder: Array.isArray(out[KEYS.CATEGORY_ORDER])
      ? out[KEYS.CATEGORY_ORDER]
      : [],
    bookmarkOrder:
      out[KEYS.BOOKMARK_ORDER] && typeof out[KEYS.BOOKMARK_ORDER] === 'object'
        ? out[KEYS.BOOKMARK_ORDER]
        : {},
  };
}

/**
 * Persist category display order (folder IDs).
 * @param {string[]} ids - Category folder IDs in display order.
 */
export async function setCategoryOrder(ids) {
  await chrome.storage.local.set({ [KEYS.CATEGORY_ORDER]: ids });
}

/**
 * Persist bookmark display order for one category.
 * @param {string} categoryId - Category folder ID.
 * @param {string[]} ids - Bookmark IDs in display order.
 */
export async function setBookmarkOrder(categoryId, ids) {
  const current = await chrome.storage.local.get(KEYS.BOOKMARK_ORDER);
  const bookmarkOrder = {
    ...(current[KEYS.BOOKMARK_ORDER] || {}),
    [categoryId]: ids,
  };
  await chrome.storage.local.set({ [KEYS.BOOKMARK_ORDER]: bookmarkOrder });
}

/**
 * Get stored theme preference.
 * @returns {Promise<'light' | 'dark' | 'system'>}
 */
export async function getTheme() {
  const out = await chrome.storage.local.get(KEYS.THEME);
  const v = out[KEYS.THEME];
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return DEFAULT_THEME;
}

/**
 * Persist theme preference.
 * @param {'light' | 'dark' | 'system'} theme
 */
export async function setTheme(theme) {
  await chrome.storage.local.set({ [KEYS.THEME]: theme });
}

/**
 * Get stored background image (data URL or null).
 * @returns {Promise<string | null>}
 */
export async function getBackgroundImage() {
  const out = await chrome.storage.local.get(KEYS.BACKGROUND_IMAGE);
  const v = out[KEYS.BACKGROUND_IMAGE];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Persist background image (data URL).
 * @param {string} dataUrl
 */
export async function setBackgroundImage(dataUrl) {
  await chrome.storage.local.set({ [KEYS.BACKGROUND_IMAGE]: dataUrl });
}

/**
 * Remove stored background image.
 */
export async function clearBackgroundImage() {
  await chrome.storage.local.remove(KEYS.BACKGROUND_IMAGE);
}

/**
 * Get cached state from previous render (for instant display on load).
 * @returns {Promise<{ categories: Array, hasHomeTab: boolean } | null>}
 */
export async function getCachedState() {
  const out = await chrome.storage.local.get(KEYS.CACHED_STATE);
  const v = out[KEYS.CACHED_STATE];
  return v && typeof v === 'object' && Array.isArray(v.categories) ? v : null;
}

/**
 * Cache the current state for instant display on next load.
 * @param {{ categories: Array, hasHomeTab: boolean }} state
 */
export async function setCachedState(state) {
  if (state && state.hasHomeTab) {
    await chrome.storage.local.set({ [KEYS.CACHED_STATE]: state });
  }
}
