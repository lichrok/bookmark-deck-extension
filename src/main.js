/**
 * Main: orchestration, init, bookmark listeners.
 * Wires bookmarks, storage, state, render, theme, dnd. No globals.
 */

import * as bookmarks from './bookmarks.js';
import * as storage from './storage.js';
import { createState } from './state.js';
import { render } from './render.js';
import { createTheme } from './theme.js';
import { attachDnd } from './dnd.js';
import { setupSearch } from './search.js';

const DEBOUNCE_MS = 200;

function debounce(fn, ms) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn.apply(this, args);
    }, ms);
  };
}

async function init() {
  const content = document.getElementById('content');
  const themeToggle = document.getElementById('theme-toggle');
  const searchContainer = document.getElementById('search-container');
  const liveRegion = document.getElementById('live-region');

  if (!content) return;

  const onStateChange = () => {
    const state = stateApi.getState();
    render(content, state);
    attachDnd(content, stateApi, liveRegion);
    if (typeof updateSearchFilter === 'function') {
      updateSearchFilter(state);
    }
  };

  const stateApi = createState(
    {
      getStoredOrder: storage.getStoredOrder,
      setCategoryOrder: storage.setCategoryOrder,
      setBookmarkOrder: storage.setBookmarkOrder,
    },
    onStateChange
  );

  const theme = createTheme(
    { getTheme: storage.getTheme, setTheme: storage.setTheme },
    () => {}
  );
  await theme.init();

  themeToggle.addEventListener('click', async () => {
    await theme.cycle();
  });

  const backgroundInput = document.getElementById('background-input');
  const backgroundBtn = document.getElementById('background-btn');
  const backgroundRemove = document.getElementById('background-remove');
  const backgroundControl = document.getElementById('background-control');

  function applyBackgroundImage(dataUrl) {
    if (dataUrl) {
      document.body.style.setProperty('--bg-image', `url(${dataUrl})`);
      document.body.classList.add('has-bg-image');
      if (backgroundRemove) {
        backgroundRemove.hidden = false;
      }
    } else {
      document.body.style.removeProperty('--bg-image');
      document.body.classList.remove('has-bg-image');
      if (backgroundRemove) {
        backgroundRemove.hidden = true;
      }
    }
  }

  const savedBg = await storage.getBackgroundImage();
  applyBackgroundImage(savedBg);

  if (backgroundBtn && backgroundInput) {
    backgroundBtn.addEventListener('click', () => backgroundInput.click());
  }
  if (backgroundInput) {
    backgroundInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await storage.setBackgroundImage(dataUrl);
        applyBackgroundImage(dataUrl);
      } catch (err) {
        console.error('Failed to set background image', err);
      }
      e.target.value = '';
    });
  }
  if (backgroundRemove) {
    backgroundRemove.addEventListener('click', async () => {
      await storage.clearBackgroundImage();
      applyBackgroundImage(null);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  const load = debounce(async () => {
    try {
      const data = await bookmarks.getHomeTabData();
      await stateApi.mergeWithStoredOrder(data);
    } catch {
      await stateApi.mergeWithStoredOrder(null);
    }
  }, DEBOUNCE_MS);

  await load();

  chrome.bookmarks.onCreated.addListener(load);
  chrome.bookmarks.onRemoved.addListener(load);
  chrome.bookmarks.onMoved.addListener(load);
  chrome.bookmarks.onChanged.addListener(load);

  let updateSearchFilter = () => {};
  const searchUi = setupSearch(searchContainer, (filteredState) => {
    render(content, filteredState);
    attachDnd(content, stateApi, liveRegion);
  }, stateApi);
  updateSearchFilter = searchUi.updateFilter;
  searchUi.updateFilter(stateApi.getState());
}

init().catch(console.error);
