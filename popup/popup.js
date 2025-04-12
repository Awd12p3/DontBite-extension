// ====================
// DONTBITE! - Popup Script
// Post-Apocalyptic Phishing Defender
// ====================

console.log('[DontBite!] Popup loaded - standing guard at the wasteland gates...');

// ===== CORE VARIABLES =====
const WASTELAND_THEME = {
  colors: {
    danger: '#ff3d3d',
    warning: '#ff6b00',
    safe: '#9EFF00',
    background: '#1a1a1a'
  },
  sounds: {
    alert: chrome.runtime.getURL('sounds/alert.mp3')
  }
};

// ===== DOM ELEMENTS =====
const statusElement = document.getElementById('status');
const resultsElement = document.getElementById('results');
const phishingReasonElement = document.getElementById('phishing-reason');
const scansCountElement = document.getElementById('scans-count');
const threatsCountElement = document.getElementById('threats-count');
const reportButton = document.getElementById('report-btn');

// ===== CORE FUNCTIONS =====

/**
 * Safely communicate with content scripts
 */
async function sendToContentScript(action, data = {}) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]?.id) {
        console.error('[DontBite!] Tab error:', chrome.runtime.lastError);
        resolve({ status: 'error', error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action, ...data },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[DontBite!] Message error:', chrome.runtime.lastError);
            resolve({ status: 'error', error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { status: 'error', error: 'Empty response' });
        }
      );
    });
  });
}

/**
 * Play wasteland alert sound
 */
function playAlertSound() {
  const audio = new Audio(WASTELAND_THEME.sounds.alert);
  audio.volume = 0.3;
  audio.play().catch(e => console.warn('[DontBite!] Sound blocked:', e));
}

/**
 * Update threat statistics
 */
async function updateStats() {
  const stats = await new Promise(resolve => {
    chrome.storage.local.get(['scanCount', 'threatCount'], resolve);
  });

  scansCountElement.textContent = stats.scanCount || 0;
  threatsCountElement.textContent = stats.threatCount || 0;
}

// ===== PHISHING ANALYSIS =====

/**
 * Analyze email content
 */
async function analyzeEmail(content) {
  if (!content) {
    showError('No email content scavenged from the wasteland');
    return null;
  }

  setStatus('Analyzing wasteland transmission...', 'warning');

  try {
    // Update scan count
    const newScanCount = await incrementStat('scanCount');
    scansCountElement.textContent = newScanCount;

    // Check if we should use mock mode
    const { useMock } = await new Promise(resolve => {
      chrome.storage.local.get(['useMock'], resolve);
    });

    let result;
    if (useMock) {
      result = mockAnalyze(content);
    } else {
      result = await analyzeWithGemini(content);
    }

    if (result.isPhishing) {
      const newThreatCount = await incrementStat('threatCount');
      threatsCountElement.textContent = newThreatCount;
      playAlertSound();
    }

    return result;
  } catch (error) {
    console.error('[DontBite!] Analysis failed:', error);
    showError(`Analysis module malfunction: ${error.message}`);
    return null;
  }
}

/**
 * Mock analysis for testing
 */
function mockAnalyze(content) {
  const phishingKeywords = [
    'urgent', 'verify', 'account', 'suspended', 'click here',
    'password', 'login', 'security', 'immediately', 'action required'
  ];

  const isPhishing = phishingKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );

  return {
    isPhishing,
    confidence: isPhishing ? 0.85 : 0.95,
    reason: isPhishing 
      ? 'Contains suspicious keywords typical of phishing attempts' 
      : 'No obvious phishing indicators detected'
  };
}

// ===== UI UPDATERS =====

function setStatus(message, type = 'info') {
  statusElement.className = `status-${type}`;
  statusElement.querySelector('.status-text').textContent = message;
  
  const iconMap = {
    info: '☢️',
    warning: '⚠️',
    error: '💀',
    success: '🛡️'
  };
  
  statusElement.querySelector('.status-icon').textContent = iconMap[type];
}

function showResults(result) {
  if (!result) {
    showError('Analysis failed - trust no one');
    return;
  }

  statusElement.classList.add('hidden');
  resultsElement.classList.remove('hidden');

  if (result.isPhishing) {
    document.querySelector('.result-card.danger').classList.remove('hidden');
    document.querySelector('.result-card.safe').classList.add('hidden');
    phishingReasonElement.textContent = result.reason;
  } else {
    document.querySelector('.result-card.danger').classList.add('hidden');
    document.querySelector('.result-card.safe').classList.remove('hidden');
  }
}

function showError(message) {
  setStatus(message, 'error');
  resultsElement.classList.add('hidden');
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', async () => {
  // Load initial stats
  await updateStats();

  // Set up report button
  reportButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'reportPhishing' });
    setStatus('Reported to Wasteland Security!', 'success');
    setTimeout(() => window.close(), 1500);
  });

  // Start scanning
  try {
    const response = await sendToContentScript('scanEmail');
    
    if (response.status === 'error') {
      showError(response.error);
      return;
    }

    const result = await analyzeEmail(response.content);
    showResults(result);
  } catch (error) {
    showError(`System failure: ${error.message}`);
  }
});

// ===== HELPER FUNCTIONS =====

async function incrementStat(statName) {
  return new Promise(resolve => {
    chrome.storage.local.get([statName], (result) => {
      const newValue = (result[statName] || 0) + 1;
      chrome.storage.local.set({ [statName]: newValue }, () => {
        resolve(newValue);
      });
    });
  });
}

// ===== INITIALIZATION =====

// Set initial status
setStatus('Scanning wasteland communications...', 'info');