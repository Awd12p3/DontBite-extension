// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
      scanCount: 0,
      threatCount: 0,
      useMock: true // Set to false when using real API
    });
    console.log('[DontBite!] Extension installed - welcome to the wasteland');
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reportPhishing") {
      chrome.storage.local.get(['threatCount'], (data) => {
        const newCount = (data.threatCount || 0) + 1;
        chrome.storage.local.set({ threatCount: newCount });
      });
    }
  });