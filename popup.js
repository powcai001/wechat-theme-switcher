const button = document.querySelector('#reload');
const status = document.querySelector('#status');
const PENDING_TAB_KEY = '__wechatThemeSpikePendingReloadTab';

button.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isArticleEditor = tab?.url?.startsWith('https://mp.weixin.qq.com/cgi-bin/appmsg')
    && /(?:\?|&)action=edit(?:&|$)/.test(new URL(tab.url).search);
  if (!tab?.id || !isArticleEditor) {
    status.textContent = '请先切换到公众号编辑页。';
    return;
  }
  if (!window.confirm('请确认草稿已经保存。接下来会重载扩展并刷新当前编辑页，未保存内容可能丢失。继续吗？')) return;
  button.disabled = true;
  status.textContent = '正在重载扩展并刷新页面…';
  await chrome.storage.local.set({ [PENDING_TAB_KEY]: tab.id });
  chrome.runtime.reload();
});
