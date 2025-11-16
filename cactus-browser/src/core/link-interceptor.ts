/**
 * LinkInterceptor - Intercepts link clicks for client-side navigation
 *
 * Handles:
 * - Internal links (/about, /blog)
 * - gh:// links (gh://user/repo)
 * - External links (https://google.com) - opens in system browser
 */

import { parseGhUrl, buildGhUrl } from './gh-protocol';

export interface LinkInterceptorOptions {
  onNavigate: (url: string) => void;
  getCurrentUrl: () => string;
}

export class LinkInterceptor {
  private container: HTMLElement;
  private options: LinkInterceptorOptions;
  private abortController: AbortController;

  constructor(container: HTMLElement, options: LinkInterceptorOptions) {
    this.container = container;
    this.options = options;
    this.abortController = new AbortController();

    this.start();
  }

  start() {
    this.container.addEventListener('click', this.handleClick, {
      signal: this.abortController.signal,
      capture: true // Capture phase to intercept before other handlers
    });

    console.log('[LinkInterceptor] Started');
  }

  stop() {
    this.abortController.abort();
    console.log('[LinkInterceptor] Stopped');
  }

  private handleClick = (e: MouseEvent) => {
    // Find closest <a> tag
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Allow Ctrl+Click / Cmd+Click to open in new tab
    if (e.ctrlKey || e.metaKey) return;

    // Allow middle-click to open in new tab
    if (e.button === 1) return;

    // Allow Shift+Click
    if (e.shiftKey) return;

    // Handle different link types
    if (this.handleInternalLink(href, e)) return;
    if (this.handleGhLink(href, e)) return;
    if (this.handleExternalLink(href, e)) return;
  };

  /**
   * Handle internal links: /about, /blog/post, etc.
   */
  private handleInternalLink(href: string, e: MouseEvent): boolean {
    if (!href.startsWith('/')) return false;

    e.preventDefault();
    e.stopPropagation();

    // Get current gh:// base URL
    const currentUrl = this.options.getCurrentUrl();
    const parsed = parseGhUrl(currentUrl);

    if (!parsed) {
      console.error('[LinkInterceptor] Invalid current URL:', currentUrl);
      return false;
    }

    // Build new URL with same repo, new path
    const newUrl = buildGhUrl({
      ...parsed,
      path: href
    });

    console.log('[LinkInterceptor] Internal link:', href, '→', newUrl);
    this.options.onNavigate(newUrl);

    return true;
  }

  /**
   * Handle gh:// links: gh://user/repo, gh://user/repo/path
   */
  private handleGhLink(href: string, e: MouseEvent): boolean {
    if (!href.startsWith('gh://')) return false;

    e.preventDefault();
    e.stopPropagation();

    console.log('[LinkInterceptor] gh:// link:', href);
    this.options.onNavigate(href);

    return true;
  }

  /**
   * Handle external HTTP/HTTPS links - open in system browser
   */
  private handleExternalLink(href: string, e: MouseEvent): boolean {
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      return false;
    }

    e.preventDefault();
    e.stopPropagation();

    console.log('[LinkInterceptor] External link:', href);

    // Open in system browser via Tauri
    import('@tauri-apps/plugin-shell').then(({ open }) => {
      open(href).catch(err => {
        console.error('[LinkInterceptor] Failed to open external link:', err);
      });
    }).catch(err => {
      console.error('[LinkInterceptor] Failed to load shell plugin:', err);
      // Fallback: try window.open (won't work in Tauri, but good for dev)
      window.open(href, '_blank');
    });

    return true;
  }
}
