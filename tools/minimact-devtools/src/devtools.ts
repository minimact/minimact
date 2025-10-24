/**
 * DevTools Entry Point
 *
 * Creates the Minimact panel in Chrome DevTools
 */

chrome.devtools.panels.create(
  'Minimact', // Panel name
  'icons/icon48.png', // Icon
  'panel.html', // Panel HTML
  (panel) => {
    console.log('[Minimact DevTools] Panel created');
  }
);
