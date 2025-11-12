import { SPARouter } from './spa-router';
import { initializeLinks } from './link';

export { SPARouter } from './spa-router';
export { Link, initializeLinks } from './link';
export * from './types';

/**
 * Initialize SPA module
 * Automatically sets up router and link handlers
 */
export function initializeSPA(): SPARouter | null {
  console.log('[SPA] Initializing @minimact/spa');

  // Get Minimact instance
  const minimact = (window as any).minimact;

  if (!minimact) {
    console.error('[SPA] Minimact instance not found on window.minimact');
    return null;
  }

  // Get SignalR and DOMPatcher from Minimact
  const signalR = minimact.signalR;
  const domPatcher = minimact.domPatcher;

  if (!signalR) {
    console.error('[SPA] SignalR not found on Minimact instance');
    return null;
  }

  if (!domPatcher) {
    console.error('[SPA] DOMPatcher not found on Minimact instance');
    return null;
  }

  // Create SPA router
  const router = new SPARouter(signalR, domPatcher);

  // Initialize all existing links
  initializeLinks(router);

  // Store router on window for debugging
  (window as any).minimactSPA = router;

  // Re-initialize links on DOM mutations (for dynamically added links)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const links = node.querySelectorAll('a[data-minimact-link]');
          if (links.length > 0) {
            initializeLinks(router);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[SPA] ✓ Initialized successfully');

  return router;
}

// Auto-initialize if data-minimact-spa attribute exists
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('[data-minimact-spa]')) {
      initializeSPA();
    }
  });
} else if (typeof window !== 'undefined') {
  // Document already loaded
  if (document.querySelector('[data-minimact-spa]')) {
    initializeSPA();
  }
}
