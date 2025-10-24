/**
 * Background Service Worker
 *
 * Coordinates message passing between content script, injected agent,
 * and DevTools panel.
 */

// Map of tab ID -> DevTools port
const devtoolsPorts = new Map<number, chrome.runtime.Port>();

// Map of tab ID -> content script port
const contentPorts = new Map<number, chrome.runtime.Port>();

/**
 * Handle DevTools panel connections
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'minimact-devtools-panel') {
    const tabId = parseInt(port.name.split('-')[1] || '0');

    devtoolsPorts.set(tabId, port);

    port.onDisconnect.addListener(() => {
      devtoolsPorts.delete(tabId);
    });

    // Forward messages from panel to content script
    port.onMessage.addListener((message) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'to-agent',
        data: message
      });
    });
  }
});

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'from-agent' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const port = devtoolsPorts.get(tabId);

    if (port) {
      // Forward agent messages to DevTools panel
      port.postMessage(message.data);
    }
  }
});

/**
 * Clean up on tab close
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  devtoolsPorts.delete(tabId);
  contentPorts.delete(tabId);
});

console.log('[Minimact DevTools] Background service worker initialized');
