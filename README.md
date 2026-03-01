# Home-tab

A production-ready Chrome extension that replaces the default New Tab page with a minimal, modern UI showing your bookmarks from a **Home-tab** folder.

## Features

- **New tab override** — Uses Chrome’s `chrome_url_overrides.newtab` (Manifest V3).
- **Home-tab folder** — Reads from a root bookmark folder named exactly `Home-tab`. Subfolders = categories; bookmarks inside each category are shown.
- **Custom order** — Drag-and-drop to reorder categories and bookmarks. Order is stored in `chrome.storage.local`; your real bookmark structure is never modified.
- **Live updates** — Listens to Chrome bookmark events and refreshes the UI when bookmarks change.
- **Dark / light / system** — Theme follows system preference with a manual override (cycle via header button).
- **Search** — Instant filter across bookmark titles and URLs.
- **Fallbacks** — Setup instructions when the Home-tab folder is missing; empty-category placeholder when a category has no bookmarks.

## Permissions

- **bookmarks** — Read bookmark tree and listen for changes.
- **storage** — Persist category/bookmark order and theme preference.
- **favicon** — Show site icons via Chrome’s Favicon API (`chrome-extension://…/_favicon/`).

## Local testing

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.
4. Create a bookmark folder named **Home-tab** (e.g. under Bookmark Bar or Other bookmarks).
5. Add subfolders (e.g. Work, Personal) and add bookmarks inside them.
6. Open a new tab to see the Home-tab UI.

**Note:** The new tab override does not apply in Incognito windows.

## Project structure

```
home-tab/
├── manifest.json       # MV3 manifest, newtab override, permissions
├── newtab.html         # Single HTML entry; loads main.js as module
├── src/
│   ├── main.js         # Init, bookmark listeners, wires modules
│   ├── bookmarks.js    # getTree, find "Home-tab", normalize data
│   ├── storage.js      # chrome.storage.local for order + theme
│   ├── state.js        # Merge API data + stored order; getState/setOrder
│   ├── render.js       # Grid, category cards, bookmarks, fallbacks, favicons
│   ├── theme.js        # System/light/dark with persistence
│   ├── dnd.js          # HTML5 drag-and-drop + keyboard reorder
│   └── search.js       # Instant filter by title/URL
├── styles/
│   └── main.css        # CSS variables, layout, dark/light, micro-interactions
└── README.md
```

## Packaging

1. Zip the project (include `manifest.json`, `newtab.html`, `src/`, `styles/`). Exclude dev-only files (e.g. `.git`, `node_modules` if you add tooling later).
2. Or copy required files into a `dist/` folder and zip that.

```bash
zip -r home-tab.zip manifest.json newtab.html src styles -x "*.DS_Store"
```

## Chrome Web Store

1. Create a [Chrome Web Store developer account](https://developer.chrome.com/docs/webstore/register/) (one-time fee).
2. Upload the zip in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Fill in listing details: description, screenshots, optional icons (e.g. 128×128 for the store).
4. Submit for review. In the listing, explain that the extension needs **bookmarks**, **storage**, and **favicon** to show and reorder your Home-tab bookmarks on the new tab page.

## Optional: extension icons

To add icons (e.g. for the toolbar and store):

1. Add PNGs to an `assets/` folder: `icon16.png`, `icon48.png`, `icon128.png`.
2. In `manifest.json`, add:

```json
"icons": {
  "16": "assets/icon16.png",
  "48": "assets/icon48.png",
  "128": "assets/icon128.png"
}
```

## Architecture (summary)

- **bookmarks.js** — Reads tree, finds first folder titled `Home-tab`, returns categories and bookmarks (one level only).
- **storage.js** — `categoryOrder`, `bookmarkOrder`, `theme` in `chrome.storage.local`.
- **state.js** — Merges API data with stored order; exposes `getState()`, `setCategoryOrder()`, `setBookmarkOrder()`; triggers re-render on change.
- **render.js** — Builds DOM from state (grid, cards, favicons, setup/empty fallbacks); uses Favicon API and optional lazy loading.
- **theme.js** — Applies system/light/dark; persists preference; cycle via UI.
- **dnd.js** — Native HTML5 DnD + move up/down buttons; updates state and storage only (no `chrome.bookmarks.move()`).
- **main.js** — Loads data, subscribes to bookmark events (debounced), wires state → render → dnd; integrates search.

All logic is in ES modules; no global variables. Vanilla JS only.
