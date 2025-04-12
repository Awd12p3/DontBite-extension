// ====================
// DONTBITE! - Content Script
// Post-Apocalyptic Phishing Detector
// ====================

console.log('[DontBite!] Content script loaded - scanning the wasteland...');

// ===== CORE FUNCTIONS =====

function isExtensionContextAvailable() {
    try {
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  }
  
  // Wrap all chrome.runtime calls with this check
  function safeExtensionCall(action, data, callback) {
    if (!isExtensionContextAvailable()) {
      console.warn("[DontBite!] Extension context not available");
      if (callback) callback({ status: "error", error: "Extension disconnected" });
      return;
    }
    
    try {
      chrome.runtime.sendMessage({ action, ...data }, callback);
    } catch (error) {
      console.error("[DontBite!] Message failed:", error);
      if (callback) callback({ status: "error", error: error.message });
    }
  }
  
/**
 * Scans the current email content based on provider
 * @returns {string|null} Email content or null if not found
 */
function scanEmail() {
  // Gmail detection
  if (window.location.hostname.includes('mail.google.com')) {
    const emailDiv = document.querySelector('.ii.gt') || 
                    document.querySelector('.a3s.aiL');
    if (emailDiv) {
      console.log('[DontBite!] Gmail email detected');
      return extractTextFromNode(emailDiv);
    }
  }
  
  // Outlook detection
  if (window.location.hostname.includes('outlook')) {
    const emailDiv = document.querySelector('[role="article"]') || 
                    document.querySelector('.EmailBody');
    if (emailDiv) {
      console.log('[DontBite!] Outlook email detected');
      return extractTextFromNode(emailDiv);
    }
  }
  
  console.log('[DontBite!] No supported email provider detected');
  return null;
}

/**
 * Extracts text from DOM node while preserving structure
 */
function extractTextFromNode(node) {
  const clone = node.cloneNode(true);
  
  // Remove unwanted elements
  const removables = clone.querySelectorAll('script,style,iframe,head');
  removables.forEach(el => el.remove());
  
  // Convert links to readable format
  clone.querySelectorAll('a').forEach(link => {
    if (link.href) {
      link.after(` [LINK: ${link.href}] `);
    }
  });
  
  return clone.innerText.trim();
}

// ===== PHISHING DETECTION =====

/**
 * Highlights suspicious elements with wasteland theme
 */
function highlightSuspiciousElements() {
  // Highlight suspicious links
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    const isDangerous = (
      // Non-HTTPS links
      (!href.startsWith('https://') && !href.startsWith('mailto:')) ||
      // Mismatched link text
      (link.textContent.trim() !== href && !link.textContent.includes(href)) ||
      // Known phishing domains
      /(verify|account|login|secure)\.(com|net|org)/i.test(href);
    
    if (isDangerous) {
      link.style.border = '2px solid #ff3d3d';
      link.style.position = 'relative';
      link.style.padding = '2px';
      
      // Add radiation symbol marker
      const warning = document.createElement('span');
      warning.innerHTML = ' ☢️';
      warning.style.color = '#ff6b00';
      link.appendChild(warning);
      
      // Add tooltip
      link.title = 'WARNING: Suspicious wasteland link detected!';
    }
  });
  
  // Highlight urgent language
  const urgentKeywords = ['urgent', 'immediately', 'required', 'verify now'];
  urgentKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    document.body.innerHTML = document.body.innerHTML.replace(
      regex, 
      `<span style="background-color:#ff6b0030;border:1px dashed #ff6b00">${keyword}</span>`
    );
  });
}

// ===== TESTING UTILITIES =====

/**
 * Injects test emails for development
 * @param {string} type - Email type to inject
 */
function injectTestEmail(type) {
  console.log(`[DontBite!] Injecting ${type} test email`);
  
  const testEmails = {
    phishing: {
      subject: "URGENT: Your account will be SUSPENDED",
      body: `Dear User,\n\nWe detected suspicious activity. VERIFY NOW:\nhttp://phishy-site.com/login\n\nFailure to comply will result in account termination.\n\nSincerely,\nThe Security Team`
    },
    safe: {
      subject: "Your monthly newsletter",
      body: `Hello,\n\nHere's our monthly update with no urgent actions needed.\n\nVisit our site: https://legit-company.com\n\nBest,\nThe Team`
    },
    urgent: {
      subject: "ACTION REQUIRED: Unauthorized login detected",
      body: `Your account was accessed from the wasteland (IP: 666.13.13.13). CLICK IMMEDIATELY:\nhttp://verify-account.fake\n\nThis is your FINAL WARNING.`
    },
    imagePhish: {
      subject: "Important document for you",
      body: `<img src="https://via.placeholder.com/600x200?text=Click+Here+To+Verify" alt="Fake login button">`
    }
  };
  
  const email = testEmails[type] || testEmails.phishing;
  
  // Simulate email in Gmail
  if (window.location.hostname.includes('mail.google.com')) {
    const composeBox = document.querySelector('[role="textbox"]');
    if (composeBox) {
      composeBox.innerHTML = `
        <div class="dontbite-test-email">
          <h2>${email.subject}</h2>
          <pre>${email.body}</pre>
        </div>
      `;
    }
  }
  // For other pages
  else {
    const testDiv = document.createElement('div');
    testDiv.id = 'dontbite-test-email';
    testDiv.innerHTML = `
      <h3 style="color:#ff6b00">TEST EMAIL (${type.toUpperCase()})</h3>
      <h4>${email.subject}</h4>
      <pre>${email.body}</pre>
    `;
    document.body.prepend(testDiv);
  }
  
  highlightSuspiciousElements();
}

// ===== MESSAGE HANDLING =====

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.action) {
        case "scanEmail":
          const content = scanEmail();
          sendResponse({ 
            status: "success",
            content: content || null,
            error: content ? null : "No email content found"
          });
          break;
  
        case "injectTestEmail":
          injectTestEmail(request.type || 'phishing');
          sendResponse({ status: "success" });
          break;
  
        default:
          sendResponse({ 
            status: "error",
            error: "Unknown action requested"
          });
      }
    } catch (error) {
      console.error("[DontBite!] Message handler error:", error);
      sendResponse({
        status: "error",
        error: error.message
      });
    }
    
    return true; // Required for async sendResponse
  });

// ===== INITIAL SETUP =====

// Run initial scan on email client pages
if (window.location.hostname.match(/(mail\.google|outlook\.)/)) {
  // Watch for dynamic content changes
  const observer = new MutationObserver(() => {
    highlightSuspiciousElements();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
  
  console.log('[DontBite!] Started observing email content');
}

// Add wasteland-themed styles
const style = document.createElement('style');
style.textContent = `
  .dontbite-warning {
    color: #ff6b00 !important;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    background: #222;
    padding: 2px 5px;
    border: 1px solid #ff3d3d;
    margin-top: 3px;
    display: inline-block;
  }
  
  .dontbite-test-email {
    background: #1a1a1a;
    padding: 15px;
    margin: 10px;
    border: 2px dashed #ff6b00;
    color: #e0e0e0;
    font-family: monospace;
  }
`;
document.head.appendChild(style);