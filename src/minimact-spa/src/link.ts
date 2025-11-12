import { SPARouter } from './spa-router';
import { LinkProps } from './types';

/**
 * Client-side Link component for SPA navigation
 * Intercepts clicks and uses SignalR instead of full page reload
 */
export class Link {
  private element: HTMLAnchorElement;
  private router: SPARouter;
  private prefetchTimer: number | null = null;

  constructor(element: HTMLAnchorElement, router: SPARouter) {
    this.element = element;
    this.router = router;

    this.attachHandlers();
  }

  /**
   * Attach click and hover handlers
   */
  private attachHandlers(): void {
    // Click handler
    this.element.addEventListener('click', this.handleClick.bind(this));

    // Prefetch on hover (if enabled)
    if (this.element.dataset.prefetch === 'true') {
      this.element.addEventListener('mouseenter', this.handleHover.bind(this));
      this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }
  }

  /**
   * Handle click event
   */
  private async handleClick(e: MouseEvent): Promise<void> {
    // Only intercept left-clicks without modifiers
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.defaultPrevented
    ) {
      return;
    }

    const href = this.element.getAttribute('href');

    // Only intercept internal links
    if (!href || this.isExternalLink(href)) {
      return;
    }

    e.preventDefault();

    // Navigate via SPA router
    const replace = this.element.dataset.replace === 'true';
    await this.router.navigate(href, { replace });

    // Call custom onClick handler (if provided)
    const onClickAttr = this.element.dataset.onclick;
    if (onClickAttr) {
      try {
        // Execute custom handler
        const handler = new Function('event', onClickAttr);
        handler(e);
      } catch (err) {
        console.error('[SPA Link] onClick handler error:', err);
      }
    }
  }

  /**
   * Handle hover for prefetching
   */
  private handleHover(): void {
    // Debounce prefetch (wait 200ms before prefetching)
    this.prefetchTimer = window.setTimeout(() => {
      this.prefetch();
    }, 200);
  }

  /**
   * Handle mouse leave (cancel prefetch)
   */
  private handleMouseLeave(): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
      this.prefetchTimer = null;
    }
  }

  /**
   * Prefetch page data
   */
  private async prefetch(): Promise<void> {
    const href = this.element.getAttribute('href');
    if (!href || this.isExternalLink(href)) {
      return;
    }

    console.log(`[SPA Link] Prefetching: ${href}`);

    // TODO: Implement prefetch via SignalR
    // await this.router.prefetch(href);
  }

  /**
   * Check if link is external
   */
  private isExternalLink(href: string): boolean {
    // External if starts with http:// or https:// or //
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return true;
    }

    // External if has different origin
    try {
      const url = new URL(href, window.location.origin);
      return url.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Detach handlers (cleanup)
   */
  destroy(): void {
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('mouseenter', this.handleHover);
    this.element.removeEventListener('mouseleave', this.handleMouseLeave);

    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
    }
  }
}

/**
 * Initialize all Link elements on the page
 */
export function initializeLinks(router: SPARouter): void {
  const links = document.querySelectorAll('a[data-minimact-link]');

  links.forEach((linkElement) => {
    new Link(linkElement as HTMLAnchorElement, router);
  });

  console.log(`[SPA] Initialized ${links.length} link(s)`);
}
