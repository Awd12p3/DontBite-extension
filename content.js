// Detect email content on page
function scanEmail() {
    // Gmail detection
    if (window.location.hostname.includes('mail.google.com')) {
      const email = document.querySelector('.ii.gt');
      return email ? email.innerText : null;
    }
    
    // Outlook detection
    if (window.location.hostname.includes('outlook')) {
      const email = document.querySelector('[role="article"]');
      return email ? email.innerText : null;
    }
    
    return null;
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanEmail") {
      const emailContent = scanEmail();
      sendResponse({ content: emailContent });
    }
  });
  
  // Highlight suspicious elements
  function highlightSuspiciousElements() {
    // Highlight suspicious links
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('https') && !href.startsWith('mailto')) {
        link.style.border = '2px solid red';
        link.style.position = 'relative';
        link.insertAdjacentHTML('afterend', 
          `<div class="dontbite-warning" style="color:red;font-weight:bold;">
            ☢️ WARNING: Suspicious link detected!
          </div>`);
      }
    });
  }
  
  // Run initial scan
  highlightSuspiciousElements();
  
  // Watch for dynamic content changes
  const observer = new MutationObserver(highlightSuspiciousElements);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });