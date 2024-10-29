function updateSettings() {
  const isActive = document.getElementById('isActive').checked;
  const separator = document.getElementById('separator').value || ',';
  const keywords = document.getElementById('keywords').value.split(separator).map(k => k.trim()).filter(k => k);
  const excludedSites = document.getElementById('excludedSites').value.split('\n').map(s => s.trim()).filter(s => s);

  chrome.storage.local.set({
    isActive: isActive,
    keywords: keywords,
    excludedSites: excludedSites,
    separator: separator
  }, function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateSettings",
        isActive: isActive,
        keywords: keywords,
        excludedSites: excludedSites,
        separator: separator
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['isActive', 'keywords', 'excludedSites', 'separator'], function(data) {
    document.getElementById('isActive').checked = data.isActive || false;
    document.getElementById('separator').value = data.separator || ',';
    if (data.keywords) {
      document.getElementById('keywords').value = data.keywords.join(data.separator || ',');
    }
    if (data.excludedSites) {
      document.getElementById('excludedSites').value = data.excludedSites.join('\n');
    }
  });

  document.getElementById('isActive').addEventListener('change', updateSettings);
  document.getElementById('save').addEventListener('click', updateSettings);
});
