/**
 * Theme module: system / light / dark with persistence.
 * Sets data-theme on documentElement and notifies on change.
 */

const THEMES = ['system', 'light', 'dark'];

/**
 * Create theme controller.
 * @param {Object} storage - { getTheme, setTheme }
 * @param {(theme: 'light' | 'dark') => void} onApply - Called with resolved theme (light/dark) when it changes.
 */
export function createTheme(storage, onApply) {
  let mediaQuery = null;

  function resolveTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
  }

  function apply(resolved) {
    document.documentElement.setAttribute('data-theme', resolved);
    onApply(resolved);
  }

  async function init() {
    const preference = await storage.getTheme();
    mediaQuery =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)')
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    if (mediaQuery) {
      mediaQuery.addEventListener('change', () => {
        if ((storage.getTheme()) === 'system') {
          apply(resolveTheme('system'));
        }
      });
    }
    apply(resolveTheme(preference));
  }

  /**
   * Cycle to next theme and persist: system -> light -> dark -> system.
   * @returns {Promise<'light' | 'dark' | 'system'>} New preference.
   */
  async function cycle() {
    const current = await storage.getTheme();
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    await storage.setTheme(next);
    apply(resolveTheme(next));
    return next;
  }

  /**
   * Get current resolved theme (light or dark) from DOM.
   */
  function getResolved() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'dark' ? 'dark' : 'light';
  }

  return { init, cycle, getResolved };
}
