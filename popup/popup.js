document.addEventListener('DOMContentLoaded', function() {
    // Load stats
    chrome.storage.local.get(['scanCount', 'threatCount'], function(result) {
      document.getElementById('scans-count').textContent = result.scanCount || 0;
      document.getElementById('threats-count').textContent = result.threatCount || 0;
    });
  
    // Scan the current email
    scanCurrentEmail();
  
    // Report button handler
    document.getElementById('report-btn').addEventListener('click', function() {
      alert('Phishing attempt reported to Wasteland Security!');
    });
  });
  
  function scanCurrentEmail() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "scanEmail"}, function(response) {
        if (chrome.runtime.lastError) {
          showError("Failed to access email content");
          return;
        }
        
        if (!response || !response.content) {
          showError("No email content found");
          return;
        }
        
        analyzeEmail(response.content);
      });
    });
  }
  
  function analyzeEmail(content) {
    // Update scan count
    chrome.storage.local.get(['scanCount'], function(result) {
      const newCount = (result.scanCount || 0) + 1;
      chrome.storage.local.set({ scanCount: newCount });
      document.getElementById('scans-count').textContent = newCount;
    });
  
    // Show scanning status
    const status = document.getElementById('status');
    status.className = 'scanning';
    status.querySelector('.status-text').textContent = 'Analyzing wasteland communication...';
  
    // Check if we should use mock mode (for testing without API key)
    chrome.storage.local.get(['useMock'], function(result) {
      if (result.useMock) {
        // Use mock analysis for testing
        setTimeout(() => {
          const mockResult = getMockAnalysis(content);
          displayResults(mockResult);
        }, 1500);
      } else {
        // Use real Gemini API
        analyzeWithGemini(content)
          .then(result => displayResults(result))
          .catch(error => showError(error.message));
      }
    });
  }
  
  function analyzeWithGemini(content) {
    // This is where you would call the Gemini API
    // For now, we'll mock it since you'll need to add your API key
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockAnalysis(content));
      }, 2000);
    });
  }
  
  function getMockAnalysis(content) {
    // Simple mock analysis - in a real app, this would call Gemini API
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
  
  function displayResults(result) {
    const status = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    
    status.className = 'hidden';
    resultsDiv.className = '';
    
    if (result.isPhishing) {
      // Update threat count
      chrome.storage.local.get(['threatCount'], function(result) {
        const newCount = (result.threatCount || 0) + 1;
        chrome.storage.local.set({ threatCount: newCount });
        document.getElementById('threats-count').textContent = newCount;
      });
      
      document.querySelector('.result-card.danger').classList.remove('hidden');
      document.querySelector('.result-card.safe').classList.add('hidden');
      document.getElementById('phishing-reason').textContent = result.reason;
      
      // Play warning sound
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "playWarningSound"
        });
      });
    } else {
      document.querySelector('.result-card.danger').classList.add('hidden');
      document.querySelector('.result-card.safe').classList.remove('hidden');
    }
  }
  
  function showError(message) {
    const status = document.getElementById('status');
    status.className = 'error';
    status.querySelector('.status-icon').textContent = '⚠️';
    status.querySelector('.status-text').textContent = message;
  }