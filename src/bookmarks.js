/**
 * Bookmarks module: Chrome Bookmarks API wrapper.
 * Finds the "Home-tab" folder and returns normalized categories and bookmarks.
 * Does not modify bookmark structure.
 */

const HOME_TAB_TITLE = 'Home-tab';

/**
 * Recursively search for first folder with title "Home-tab".
 * @param {chrome.bookmarks.BookmarkTreeNode[]} nodes - Array of bookmark nodes (e.g. from getTree).
 * @returns {chrome.bookmarks.BookmarkTreeNode | null}
 */
function findHomeTabFolder(nodes) {
  if (!nodes || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.title === HOME_TAB_TITLE && !node.url) return node;
    if (node.children) {
      const found = findHomeTabFolder(node.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Normalize a category folder: only direct children with url are bookmarks.
 * Nested folders inside a category are ignored.
 * @param {chrome.bookmarks.BookmarkTreeNode} folder - Category folder node.
 * @returns {{ id: string, title: string, bookmarks: Array<{ id: string, title: string, url: string }> }}
 */
function normalizeCategory(folder) {
  const bookmarks = (folder.children || [])
    .filter((child) => child.url)
    .map((child) => ({
      id: child.id,
      title: child.title || '',
      url: child.url || '',
    }));
  return {
    id: folder.id,
    title: folder.title || '',
    bookmarks,
  };
}

/**
 * Fetch Home-tab data from Chrome bookmarks.
 * @returns {Promise<{ homeTabId: string, categories: Array<{ id: string, title: string, bookmarks: Array<{ id: string, title: string, url: string }> }> } | null>}
 */
export async function getHomeTabData() {
  try {
    const tree = await chrome.bookmarks.getTree();
    const homeTab = findHomeTabFolder(tree);
    if (!homeTab || !homeTab.children) {
      return null;
    }
    const categories = homeTab.children
      .filter((child) => !child.url)
      .map(normalizeCategory);
    return {
      homeTabId: homeTab.id,
      categories,
    };
  } catch {
    return null;
  }
}
