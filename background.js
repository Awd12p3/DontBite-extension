// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    // Set initial storage values
    chrome.storage.local.set({
      scanCount: 0,
      threatCount: 0,
      useMock: true // Set to false when you have Gemini API key
    });
  });
  
  // Handle icon click
  chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, {action: "rescan"});
  });