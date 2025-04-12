// ====================
// DONTBITE! - Content Script
// Email-View Only Phishing Detector
// ====================

console.log('[DontBite!] Content script loaded - awaiting email opening...');

// Check if we're in an email view (not inbox)
function isEmailView() {
  // Gmail detection
  if (window.location.hostname.includes('mail.google.com')) {
    return (
      // Email view URLs contain /mail/u/0/#inbox/ or /mail/u/0/#search/
      /\/mail\/u\/\d+\/(#inbox|#search)\/.+/.test(window.location.hash) &&
      // Email content element exists
      !!document.querySelector('.ii.gt')
    );
  }

  // Outlook detection
  if (window.location.hostname.includes('outlook.office.com') || 
      window.location.hostname.includes('outlook.live.com')) {
    return (
      // Email view URLs contain /mail/id/
      /\/mail\/id\//.test(window.location.pathname) &&
      // Email content element exists
      !!document.querySelector('[role="article"]')
    );
  }

  return false;
}

// Initialize only when email is opened
function initializeEmailScan() {
  if (!isEmailView()) {
    console.log('[DontBite!] Not in email view - skipping activation');
    return;
  }

  console.log('[DontBite!] Email view detected - activating scanner');
  
  // Run initial scan
  scanAndHighlight();

  // Set up observer for dynamic content
  const observer = new MutationObserver((mutations) => {
    if (isEmailView()) {
      scanAndHighlight();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

// Combined scan and highlight function
function scanAndHighlight() {
  const emailContent = scanEmail();
  if (emailContent) {
    highlightSuspiciousElements();
    analyzeContent(emailContent);
  }
}

// Email content scanning
function scanEmail() {
  try {
    let emailContent = null;
    
    if (window.location.hostname.includes('mail.google.com')) {
      const emailDiv = document.querySelector('.ii.gt') || 
                      document.querySelector('.a3s.aiL');
      emailContent = emailDiv?.innerText;
    } 
    else if (window.location.hostname.includes('outlook')) {
      const emailDiv = document.querySelector('[role="article"]') || 
                      document.querySelector('.EmailBody');
      emailContent = emailDiv?.innerText;
    }

    return emailContent || null;
  } catch (error) {
    console.error('[DontBite!] Scan error:', error);
    return null;
  }
}

// Highlight suspicious elements
function highlightSuspiciousElements() {
  // Link analysis
  document.querySelectorAll('a').forEach(link => {
    if (!link.href) return;
    
    const isDangerous = (
      !link.href.startsWith('https://') ||
      link.textContent.trim() !== link.href ||
      /(verify|account|login|secure)\.(com|net|org)/i.test(link.href)
    );
    
    if (isDangerous) {
      link.style.border = '2px solid #ff3d3d';
      link.insertAdjacentHTML('beforeend', '<span style="color:#ff6b00"> ☢️</span>');
      link.title = 'WARNING: Suspicious link detected!';
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEmailScan);
} else {
  initializeEmailScan();
}