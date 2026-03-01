const MIME_BOOKMARK = 'application/x-hometab-bookmark';
const MIME_CATEGORY = 'application/x-hometab-category';

/**
 * Attach DnD and keyboard reorder to the content container.
 * Call after each render when state has categories.
 * @param {HTMLElement} container - Element containing .grid (e.g. #content)
 * @param {Object} stateApi - { getState, setCategoryOrder, setBookmarkOrder }
 * @param {HTMLElement} liveRegion - Optional aria-live region for announcements
 */
export function attachDnd(container, stateApi, liveRegion) {
  const grid = container.querySelector('.grid');
  if (!grid) return;

  function announce(message) {
    if (liveRegion) {
      liveRegion.textContent = '';
      liveRegion.textContent = message;
    }
  }

  function getCategoryIds() {
    return stateApi.getState().categories.map((c) => c.id);
  }

  function getBookmarkIds(categoryId) {
    const cat = stateApi.getState().categories.find((c) => c.id === categoryId);
    return cat ? cat.bookmarks.map((b) => b.id) : [];
  }

  function findCard(el) {
    return el.closest('.card[data-type="category"]');
  }

  function findBookmarkItem(el) {
    return el.closest('.bookmark-item[data-type="bookmark"]');
  }

  // ---- Category DnD ----
  grid.addEventListener('dragstart', (e) => {
    if (e.target.closest('.bookmark-item')) return;
    const card = findCard(e.target);
    if (!card || e.target.closest('.bookmark-link')) return;
    const id = card.getAttribute('data-id');
    const type = card.getAttribute('data-type');
    if (type !== 'category') return;
    e.dataTransfer.setData(MIME_CATEGORY, JSON.stringify({ type: 'category', id }));
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  grid.addEventListener('dragend', (e) => {
    const card = findCard(e.target);
    if (card) card.classList.remove('dragging');
    const item = findBookmarkItem(e.target);
    if (item) item.classList.remove('dragging');
    grid.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    grid.querySelectorAll('.bookmark-list.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });

  grid.addEventListener('dragover', (e) => {
    const card = findCard(e.target);
    if (!card) return;
    if (e.dataTransfer.types.includes(MIME_CATEGORY)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.bookmark-item.drag-over, .bookmark-list.drag-over').forEach((el) => el.classList.remove('drag-over'));
      card.classList.add('drag-over');
      return;
    }
    if (e.dataTransfer.types.includes(MIME_BOOKMARK)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.card.drag-over').forEach((el) => el.classList.remove('drag-over'));
      const item = findBookmarkItem(e.target);
      if (item) {
        item.classList.add('drag-over');
        item.closest('.bookmark-list')?.classList.remove('drag-over');
      } else {
        const list = e.target.closest('.bookmark-list');
        if (list) {
          list.classList.add('drag-over');
          list.querySelectorAll('.bookmark-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
        }
      }
    }
  });

  grid.addEventListener('dragleave', (e) => {
    if (!grid.contains(e.relatedTarget)) {
      grid.querySelectorAll('.card.drag-over').forEach((el) => el.classList.remove('drag-over'));
    }
    const card = findCard(e.target);
    if (card) card.classList.remove('drag-over');
  });

  grid.addEventListener('drop', (e) => {
    const card = findCard(e.target);
    if (!card) return;
    card.classList.remove('drag-over');
    const raw = e.dataTransfer.getData(MIME_CATEGORY);
    const data = tryParseDragData(raw);
    if (!data || data.type !== 'category') {
      if (e.dataTransfer.types.includes(MIME_BOOKMARK)) e.preventDefault();
      return;
    }
    e.preventDefault();
    const ids = getCategoryIds();
    const fromIdx = ids.indexOf(data.id);
    const toCard = card;
    const toIdx = Array.from(grid.querySelectorAll('.card[data-type="category"]')).indexOf(toCard);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, data.id);
    stateApi.setCategoryOrder(newIds);
    announce(`Category moved to position ${toIdx + 1}`);
  });

  // ---- Bookmark DnD ----
  grid.addEventListener('dragstart', (e) => {
    const item = findBookmarkItem(e.target);
    if (!item || e.target.closest('.bookmark-link')) return;
    const id = item.getAttribute('data-id');
    const categoryId = item.getAttribute('data-category-id');
    if (!id || !categoryId) return;
    const payload = JSON.stringify({ type: 'bookmark', id, categoryId });
    e.dataTransfer.setData(MIME_BOOKMARK, payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
  });

  grid.addEventListener('dragleave', (e) => {
    const item = findBookmarkItem(e.target);
    if (item) item.classList.remove('drag-over');
    const list = e.target.closest('.bookmark-list');
    if (list && !list.contains(e.relatedTarget)) list.classList.remove('drag-over');
  });

  grid.addEventListener('drop', (e) => {
    const item = findBookmarkItem(e.target);
    const list = !item ? e.target.closest('.bookmark-list') : null;
    const raw = e.dataTransfer.getData(MIME_BOOKMARK) || e.dataTransfer.getData('text/plain');
    const data = tryParseDragData(raw);
    if (!data || data.type !== 'bookmark') return;
    const categoryId = item
      ? item.getAttribute('data-category-id')
      : list?.closest('.card')?.getAttribute('data-id');
    if (!categoryId || data.categoryId !== categoryId) return;
    e.preventDefault();
    e.stopPropagation();
    if (item) {
      item.classList.remove('drag-over');
    } else if (list) {
      list.classList.remove('drag-over');
    }
    const ids = getBookmarkIds(categoryId);
    const fromIdx = ids.indexOf(data.id);
    const targetList = item?.closest('.bookmark-list') || list;
    if (!targetList) return;
    const items = Array.from(targetList.querySelectorAll('.bookmark-item'));
    const toIdx = item != null ? items.indexOf(item) : items.length;
    if (fromIdx === -1) return;
    if (fromIdx === toIdx || fromIdx === toIdx - 1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, data.id);
    stateApi.setBookmarkOrder(categoryId, newIds);
    announce(`Bookmark moved to position ${toIdx + 1}`);
  });

  document.addEventListener('drop', (e) => {
    if (!grid.contains(e.target)) return;
    if (e.dataTransfer.types.includes(MIME_BOOKMARK)) {
      e.preventDefault();
    }
  }, true);

  // ---- Keyboard: category move up/down ----
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.reorder-btn[data-category-id][data-dir]');
    if (!btn) return;
    e.preventDefault();
    const categoryId = btn.getAttribute('data-category-id');
    const dir = btn.getAttribute('data-dir');
    const ids = getCategoryIds();
    const idx = ids.indexOf(categoryId);
    if (idx === -1) return;
    if (dir === 'up' && idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      stateApi.setCategoryOrder(ids);
      announce(`Category moved up to position ${idx}`);
    } else if (dir === 'down' && idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      stateApi.setCategoryOrder(ids);
      announce(`Category moved down to position ${idx + 2}`);
    }
  });

  // ---- Keyboard: bookmark move up/down (if elements have .bookmark-reorder-btn) ----
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.bookmark-reorder-btn');
    if (!btn) return;
    e.preventDefault();
    const categoryId = btn.getAttribute('data-category-id');
    const bookmarkId = btn.getAttribute('data-bookmark-id');
    const dir = btn.getAttribute('data-dir');
    const ids = getBookmarkIds(categoryId);
    const idx = ids.indexOf(bookmarkId);
    if (idx === -1) return;
    if (dir === 'up' && idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      stateApi.setBookmarkOrder(categoryId, ids);
      announce(`Bookmark moved up`);
    } else if (dir === 'down' && idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      stateApi.setBookmarkOrder(categoryId, ids);
      announce(`Bookmark moved down`);
    }
  });
}

function tryParseDragData(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
