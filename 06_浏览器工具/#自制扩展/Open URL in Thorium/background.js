chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return;
  if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
    let targetUrl = 'open-thorium://' + tab.url;
    chrome.tabs.update(tab.id, { url: targetUrl });
  }
});
