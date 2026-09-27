// Dev helper: the popup stores the active tab before calling runtime.reload().
// Extension updates can start a fresh service worker via onInstalled; this also
// runs once at worker evaluation as a fallback.
const PENDING_TAB_KEY = '__wechatThemeSpikePendingReloadTab';
let processingPendingReload = false;

function processPendingReload() {
  if (processingPendingReload) return;
  processingPendingReload = true;
  chrome.storage.local.get(PENDING_TAB_KEY, ({ [PENDING_TAB_KEY]: tabId }) => {
    if (!Number.isInteger(tabId)) { processingPendingReload = false; return; }
    chrome.storage.local.remove(PENDING_TAB_KEY, () => {
      chrome.tabs.reload(tabId, () => { processingPendingReload = false; });
    });
  });
}

chrome.runtime.onInstalled.addListener(processPendingReload);
processPendingReload();
