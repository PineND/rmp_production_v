chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url.includes('berkeleytime.com/catalog')) {
    chrome.tabs.sendMessage(details.tabId, {action: "checkUrl"});
  }
});