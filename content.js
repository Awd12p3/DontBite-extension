// Content script with error handling and accessibility fixes
console.log('[DontBite!] Content script loaded');

// ===== CORE FUNCTIONALITY =====
const isEmailView = () => {
  // Gmail detection
  if (window.location.hostname.includes('mail.google.com')) {
    return /\/mail\/u\/\d+\/(#inbox|#search)\/.+/.test(window.location.hash) &&
           !!document.querySelector('.ii.gt');
  }
  // Outlook detection
  if (window.location.hostname.includes('outlook')) {
    return /\/mail\/id\//.test(window.location.pathname) &&
           !!document.querySelector('[role="article"]');
  }
  return false;
};

const scanEmail = () => {
  try {
    let content = null;
    if (window.location.hostname.includes('mail.google.com')) {
      content = document.querySelector('.ii.gt')?.innerText;
    } else if (window.location.hostname.includes('outlook')) {
      content = document.querySelector('[role="article"]')?.innerText;
    }
    return content || null;
  } catch (error) {
    console.error('[DontBite!] Scan error:', error);
    return null;
  }
};

const highlightSuspiciousElements = () => {
  // Fix accessibility conflicts first
  document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
    if (el.contains(document.activeElement)) {
      el.removeAttribute('aria-hidden');
    }
  });

  // Highlight suspicious links
  document.querySelectorAll('a').forEach(link => {
    if (!link.href) return;
    
    const isDangerous = (
      !link.href.startsWith('https://') ||
      link.textContent.trim() !== link.href ||
      /(verify|account|login|secure)\.(com|net|org)/i.test(link.href)
    );
    
    if (isDangerous) {
      link.style.cssText = `
        border: 2px solid #ff3d3d !important;
        position: relative !important;
        padding: 2px !important;
      `;
      const warning = document.createElement('span');
      warning.textContent = ' ☢️';
      warning.style.cssText = `
        color: #ff6b00 !important;
        margin-left: 3px !important;
      `;
      link.appendChild(warning);
    }
  });
};

// ===== MESSAGE HANDLING =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "scanEmail":
      sendResponse({ content: scanEmail() });
      break;
      
    case "phishingIntercepted":
      alert(`🚨 DontBite! blocked phishing link:\n${request.url}`);
      break;
  }
  return true;
});

// ===== INITIALIZATION =====
if (isEmailView()) {
  highlightSuspiciousElements();
  
  const observer = new MutationObserver((mutations) => {
    if (isEmailView()) {
      highlightSuspiciousElements();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Global error handler
window.addEventListener('error', (event) => {
  if (event.message.includes('aria-hidden') || 
      event.filename.includes('gmail.inject')) {
    event.preventDefault();
  }
});