/**
 * Render module: build DOM from state.
 * Grid layout, category cards, bookmark items with favicons, fallbacks.
 * Uses chrome.runtime.getURL for favicon API; supports lazy loading.
 */

const FAVICON_SIZE = 64;

/**
 * Build favicon URL for a bookmark (MV3 Favicon API).
 * @param {string} url - Bookmark URL.
 * @returns {string}
 */
export function getFaviconUrl(url) {
  const base = chrome.runtime.getURL('/_favicon/');
  const u = new URL(base);
  u.searchParams.set('pageUrl', url);
  u.searchParams.set('size', String(FAVICON_SIZE));
  return u.toString();
}

/**
 * Render setup view when "Home-tab" folder does not exist.
 * @param {HTMLElement} container
 */
function renderSetup(container) {
  const html = `
    <div class="setup">
      <h2 class="setup-title">Welcome to Home-tab</h2>
      <p class="setup-text">
        Create a bookmark folder named <strong>Home-tab</strong> to get started.
        Add subfolders as categories and add bookmarks inside each category.
      </p>
      <ol class="setup-steps">
        <li>Open <a href="#" id="open-bookmarks" class="setup-link">Bookmark Manager</a> (chrome://bookmarks)</li>
        <li>Create a new folder named exactly <strong>Home-tab</strong></li>
        <li>Inside it, create subfolders (e.g. Work, Personal) — these are your categories</li>
        <li>Add bookmarks inside each category folder</li>
      </ol>
      <p class="setup-text">Then open a new tab again to see your bookmarks.</p>
    </div>
  `;
  container.innerHTML = html;
  const link = container.querySelector('#open-bookmarks');
  if (link) {
    link.href = 'chrome://bookmarks';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('chrome://bookmarks', '_blank');
    });
  }
}

/**
 * Build one bookmark list item (with optional lazy favicon).
 * @param {{ id: string, title: string, url: string }} bookmark
 * @param {boolean} lazyFavicon - If true, use loading="lazy" and data-src for favicon.
 * @param {string} categoryId - Parent category id for DnD.
 * @returns {string} HTML string.
 */
function renderBookmarkItem(bookmark, lazyFavicon, categoryId) {
  const faviconUrl = getFaviconUrl(bookmark.url);
  const faviconHtml = lazyFavicon
    ? `<img class="bookmark-favicon" loading="lazy" data-src="${faviconUrl}" alt="" width="32" height="32">`
    : `<img class="bookmark-favicon" src="${faviconUrl}" loading="lazy" alt="" width="32" height="32">`;
  const title = escapeHtml(
    bookmark.title ||
      (() => {
        try {
          return new URL(bookmark.url).hostname || 'Link';
        } catch {
          return 'Link';
        }
      })()
  );
  return `
    <li class="bookmark-item" data-id="${escapeAttr(bookmark.id)}" data-type="bookmark" data-category-id="${escapeAttr(categoryId)}" draggable="true">
      <span class="drag-handle" aria-label="Reorder bookmark" data-drag-handle></span>
      <a class="bookmark-link" href="${escapeAttr(bookmark.url)}" data-id="${escapeAttr(bookmark.id)}">
        ${faviconHtml}
        <span class="bookmark-title">${title}</span>
      </a>
    </li>
  `;
}

/**
 * Build one category card (with optional lazy favicons for bookmarks).
 * @param {{ id: string, title: string, bookmarks: Array }} category
 * @param {boolean} lazyFavicon
 * @returns {string}
 */
function renderCategoryCard(category, lazyFavicon) {
  const title = escapeHtml(category.title || 'Untitled');
  const bookmarksHtml =
    category.bookmarks.length > 0
      ? category.bookmarks
          .map((b) => renderBookmarkItem(b, lazyFavicon, category.id))
          .join('')
      : '<p class="empty-placeholder">No bookmarks</p>';
  return `
    <article class="card" data-id="${escapeAttr(category.id)}" data-type="category" draggable="true">
      <div class="card-header">
        <span class="drag-handle" aria-label="Reorder category" data-drag-handle></span>
        <h3 class="card-title">${title}</h3>
        <div class="reorder-actions" role="group" aria-label="Reorder category">
          <button type="button" class="reorder-btn reorder-up" aria-label="Move up" data-category-id="${escapeAttr(category.id)}" data-dir="up">↑</button>
          <button type="button" class="reorder-btn reorder-down" aria-label="Move down" data-category-id="${escapeAttr(category.id)}" data-dir="down">↓</button>
        </div>
      </div>
      <div class="card-body">
        <ul class="bookmark-list">${bookmarksHtml}</ul>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Lazy-load favicons that use data-src: set src when element is in viewport.
 * @param {HTMLElement} root
 */
function lazyLoadFavicons(root) {
  const imgs = root.querySelectorAll('.bookmark-favicon[data-src]');
  if (!imgs.length) return;
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                const img = e.target;
                const src = img.getAttribute('data-src');
                if (src) {
                  img.src = src;
                  img.removeAttribute('data-src');
                }
                io.unobserve(img);
              }
            }
          },
          { rootMargin: '100px' }
        )
      : null;
  if (io) {
    imgs.forEach((img) => io.observe(img));
  } else {
    imgs.forEach((img) => {
      const src = img.getAttribute('data-src');
      if (src) img.src = src;
      img.removeAttribute('data-src');
    });
  }
}

/**
 * Render full content from state into container.
 * @param {HTMLElement} container - e.g. #content
 * @param {{ categories: Array, hasHomeTab: boolean }} state - From state.getState()
 * @param {Object} opts - { lazyFavicon?: boolean }
 */
export function render(container, state, opts = {}) {
  const lazyFavicon = opts.lazyFavicon !== false;
  if (!state.hasHomeTab || !state.categories.length) {
    renderSetup(container);
    return;
  }
  const gridHtml = state.categories
    .map((cat) => renderCategoryCard(cat, lazyFavicon))
    .join('');
  container.innerHTML = `<div class="grid">${gridHtml}</div>`;
  lazyLoadFavicons(container);
}
