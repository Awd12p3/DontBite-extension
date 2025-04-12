// Background service worker with enhanced security
console.log('[DontBite!] Service worker activated');

// Web Request Listener for analytics blocking
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Block Google analytics that cause console errors
    if (details.url.includes('play.google.com/log') || 
        details.url.includes('mail.google.com/generate_204')) {
      console.debug('[DontBite!] Blocked analytics request:', details.url);
      return { cancel: true };
    }
    return { cancel: false };
  },
  { urls: ["*://*.google.com/*"] },
  ["blocking"]
);

// Phishing URL Interception
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const phishingPatterns = [
      /(verify|account|login|secure)\.(com|net|org)/i,
      /http:\/\/(?!mail\.google|outlook\.office|outlook\.live)/
    ];
    
    if (phishingPatterns.some(pattern => pattern.test(details.url))) {
      chrome.tabs.sendMessage(details.tabId, {
        action: "phishingIntercepted",
        url: details.url
      });
      return { cancel: true };
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Storage for scan statistics
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    scanCount: 0,
    threatCount: 0,
    useMock: true // Set to false when using real API
  });
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateStats") {
    chrome.storage.local.get(['threatCount'], (data) => {
      const newCount = (data.threatCount || 0) + 1;
      chrome.storage.local.set({ threatCount: newCount });
    });
  }
});