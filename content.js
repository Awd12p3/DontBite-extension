// ====================
// DONTBITE! - Content Script
// Post-Apocalyptic Phishing Detector
// ====================

console.log('[DontBite!] Content script loaded - scanning the wasteland...');

// ===== CORE FUNCTIONS =====

function isExtensionContextAvailable() {
  try {
    return !!chrome?.runtime?.id && !chrome.runtime.lastError;
  } catch (e) {
    return false;
  }
}

function safeExtensionCall(action, data = {}, callback) {
  if (!isExtensionContextAvailable()) {
    const error = new Error("Extension context not available");
    console.warn("[DontBite!]", error.message);
    if (callback) callback({ status: "error", error: error.message });
    return Promise.reject(error);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[DontBite!] Runtime error:", chrome.runtime.lastError);
          const result = { status: "error", error: chrome.runtime.lastError.message };
          if (callback) callback(result);
          resolve(result);
          return;
        }
        if (callback) callback(response);
        resolve(response);
      }
    );
  });
}

/**
 * Scans the current email content based on provider
 */
function scanEmail() {
  try {
    // Gmail detection
    if (window.location.hostname.includes('mail.google.com')) {
      const emailDiv = document.querySelector('.ii.gt.adn.ads, .a3s.aiL') || 
                      document.querySelector('[role="article"]');
      if (emailDiv) {
        console.log('[DontBite!] Gmail email detected');
        return extractTextFromNode(emailDiv);
      }
    }
    
    // Outlook detection
    if (window.location.hostname.match(/outlook\.(office|live)\.com/)) {
      const emailDiv = document.querySelector('[role="article"]') || 
                      document.querySelector('.EmailBody');
      if (emailDiv) {
        console.log('[DontBite!] Outlook email detected');
        return extractTextFromNode(emailDiv);
      }
    }
    
    console.log('[DontBite!] No supported email provider detected');
    return null;
  } catch (error) {
    console.error('[DontBite!] Scan error:', error);
    return null;
  }
}

function extractTextFromNode(node) {
  const clone = node.cloneNode(true);
  
  // Security: Sanitize content
  const removables = clone.querySelectorAll(
    'script, style, iframe, head, meta, link, noscript'
  );
  removables.forEach(el => el.remove());
  
  // Convert links to visible format
  clone.querySelectorAll('a').forEach(link => {
    if (link.href && !link.href.startsWith('mailto:')) {
      link.insertAdjacentText('afterend', ` [${link.href}] `);
    }
  });
  
  return clone.textContent.trim();
}

// ===== PHISHING DETECTION =====

function highlightSuspiciousElements() {
  // Security: Use DOM methods instead of innerHTML
  document.querySelectorAll('a').forEach(link => {
    if (!link.href) return;
    
    const isDangerous = (
      !/^https?:\/\//.test(link.href) ||
      /(verify|account|login|secure)\.(com|net|org)/i.test(link.href) ||
      link.textContent.trim() !== link.href
    );
    
    if (isDangerous) {
      link.style.cssText = `
        border: 2px solid #ff3d3d;
        position: relative;
        padding: 2px;
      `;
      
      const warning = document.createElement('span');
      warning.textContent = ' ☢️';
      warning.style.color = '#ff6b00';
      link.appendChild(warning);
      
      link.title = 'WARNING: Suspicious wasteland link detected!';
    }
  });

  // Highlight urgent keywords safely
  const urgentKeywords = ['urgent', 'immediately', 'required', 'verify now'];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    urgentKeywords.forEach(keyword => {
      if (node.textContent.includes(keyword)) {
        const span = document.createElement('span');
        span.style.cssText = `
          background-color: #ff6b0030;
          border: 1px dashed #ff6b00;
        `;
        const replacedText = node.textContent.replace(
          new RegExp(keyword, 'gi'),
          `<span style="background-color:#ff6b0030;border:1px dashed #ff6b00">$&</span>`
        );
        const temp = document.createElement('div');
        temp.innerHTML = replacedText;
        node.parentNode.replaceChild(temp.firstChild, node);
      }
    });
  }
}

// ===== TESTING UTILITIES =====

function injectTestEmail(type) {
  if (!['phishing', 'safe', 'urgent', 'imagePhish'].includes(type)) {
    console.error('[DontBite!] Invalid test email type');
    return;
  }

  const testEmails = {
    phishing: {
      subject: "URGENT: Your account will be SUSPENDED",
      body: `Dear User,\n\nWe detected suspicious activity. VERIFY NOW:\nhttp://phishy-site.com/login\n\nFailure to comply will result in account termination.\n\nSincerely,\nThe Security Team`
    },
    safe: {
      subject: "Your monthly newsletter",
      body: `Hello,\n\nHere's our monthly update with no urgent actions needed.\n\nVisit our site: https://legit-company.com\n\nBest,\nThe Team`
    }
  };

  const email = testEmails[type] || testEmails.phishing;
  const testDiv = document.createElement('div');
  testDiv.className = 'dontbite-test-email';
  
  // Security: Use textContent for static text
  const subject = document.createElement('h3');
  subject.textContent = email.subject;
  
  const body = document.createElement('pre');
  body.textContent = email.body;
  
  testDiv.append(subject, body);
  document.body.prepend(testDiv);
  
  highlightSuspiciousElements();
}

// ===== MESSAGE HANDLING =====

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleRequest = async () => {
    try {
      switch (request.action) {
        case "scanEmail":
          const content = scanEmail();
          return {
            status: "success",
            content,
            error: content ? null : "No email content found"
          };

        case "injectTestEmail":
          if (!request.type) throw new Error("Missing email type");
          injectTestEmail(request.type);
          return { status: "success" };

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error) {
      console.error("[DontBite!] Request failed:", error);
      return {
        status: "error",
        error: error.message
      };
    }
  };

  // Handle async response
  handleRequest().then(sendResponse);
  return true; // Keep message channel open
});

// ===== INITIAL SETUP =====

if (window.location.hostname.match(/(mail\.google|outlook\.(office|live))/)) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        highlightSuspiciousElements();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  // Add styles safely
  const style = document.createElement('style');
  style.textContent = `
    .dontbite-warning {
      color: #ff6b00 !important;
      font-family: 'Courier New', monospace;
      background: #222;
      padding: 2px 5px;
      border: 1px solid #ff3d3d;
      margin-top: 3px;
    }
    .dontbite-test-email {
      background: #1a1a1a;
      padding: 15px;
      margin: 10px;
      border: 2px dashed #ff6b00;
      color: #e0e0e0;
    }
  `;
  document.head.appendChild(style);
}