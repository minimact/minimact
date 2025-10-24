/**
 * Content Script
 *
 * Injects the DevTools agent into the page and relays messages
 * between the agent and the DevTools panel.
 */

// Inject the agent script into the page context
function injectAgent() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected-agent.js');
  script.onload = function() {
    console.log('[Minimact DevTools] Agent injected');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject as early as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAgent);
} else {
  injectAgent();
}

// Setup message relay between page and background script
window.addEventListener('message', (event) => {
  // Only accept messages from the page
  if (event.source !== window) return;

  // Only accept messages from our agent
  if (event.data.source !== 'minimact-devtools-agent') return;

  // Forward to background script
  chrome.runtime.sendMessage({
    type: 'from-agent',
    data: event.data
  });
});

// Relay messages from background to page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'to-agent') {
    window.postMessage(message.data, '*');
  }
});

console.log('[Minimact DevTools] Content script loaded');
