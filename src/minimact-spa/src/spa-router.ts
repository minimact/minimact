import { NavigationResponse, NavigationOptions } from './types';

/**
 * Client-side SPA router for Minimact
 * Handles navigation via SignalR without full page reloads
 */
export class SPARouter {
  private signalR: any;
  private domPatcher: any;
  private isNavigating: boolean = false;
  private navigationCallbacks: Array<(url: string) => void> = [];

  constructor(signalR: any, domPatcher: any) {
    this.signalR = signalR;
    this.domPatcher = domPatcher;

    // Handle browser back/forward buttons
    this.setupPopStateHandler();
  }

  /**
   * Navigate to a new URL via SignalR
   */
  async navigate(url: string, options: NavigationOptions = {}): Promise<void> {
    if (this.isNavigating) {
      console.warn('[SPA] Navigation already in progress, ignoring');
      return;
    }

    this.isNavigating = true;
    const startTime = performance.now();

    try {
      console.log(`[SPA] Navigating to: ${url}`);

      // Notify callbacks (for loading states)
      this.notifyNavigationStart(url);

      // Send navigation request via SignalR
      const response: NavigationResponse = await this.signalR.invoke('NavigateTo', url);

      if (!response.success) {
        console.error(`[SPA] Navigation failed: ${response.error}`);
        // Fallback to full page reload
        window.location.href = url;
        return;
      }

      // Apply patches based on shell change
      if (response.shellChanged) {
        console.log('[SPA] Shell changed - applying full patches');
        await this.applyFullPatches(response.patches);
      } else {
        console.log('[SPA] Same shell - applying page patches only');
        await this.applyPagePatches(response.patches);
      }

      // Update browser history
      if (options.replace) {
        window.history.replaceState(
          options.state || { url },
          '',
          response.url
        );
      } else {
        window.history.pushState(
          options.state || { url },
          '',
          response.url
        );
      }

      // Update MVC state (if provided)
      if (response.pageData && (window as any).minimact) {
        (window as any).minimact.updateMvcState(response.pageData);
      }

      // Scroll to top (unless disabled)
      if (!options.skipScroll) {
        window.scrollTo(0, 0);
      }

      const latency = performance.now() - startTime;
      console.log(`[SPA] Navigation completed in ${latency.toFixed(2)}ms`);

      // Notify callbacks
      this.notifyNavigationComplete(url);

    } catch (error) {
      console.error('[SPA] Navigation error:', error);

      // Fallback: full page reload
      console.log('[SPA] Falling back to full page reload');
      window.location.href = url;
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Apply full patches (shell + page changed)
   */
  private async applyFullPatches(patches: any[]): Promise<void> {
    const rootElement = document.querySelector('[data-minimact-root]') as HTMLElement;

    if (!rootElement) {
      throw new Error('[SPA] Root element not found');
    }

    this.domPatcher.applyPatches(rootElement, patches);
  }

  /**
   * Apply page-only patches (same shell)
   */
  private async applyPagePatches(patches: any[]): Promise<void> {
    const pageContainer = document.querySelector('[data-minimact-page]') as HTMLElement;

    if (pageContainer) {
      this.domPatcher.applyPatches(pageContainer, patches);
    } else {
      console.warn('[SPA] Page container not found, applying full patches');
      await this.applyFullPatches(patches);
    }
  }

  /**
   * Setup browser back/forward button handler
   */
  private setupPopStateHandler(): void {
    window.addEventListener('popstate', async (e) => {
      const url = e.state?.url || window.location.pathname;
      console.log('[SPA] Popstate - navigating to:', url);

      // Re-navigate via SignalR
      await this.navigate(url, { skipScroll: true });
    });
  }

  /**
   * Register callback for navigation events
   */
  onNavigate(callback: (url: string) => void): void {
    this.navigationCallbacks.push(callback);
  }

  /**
   * Notify callbacks that navigation started
   */
  private notifyNavigationStart(url: string): void {
    this.navigationCallbacks.forEach(cb => {
      try {
        cb(url);
      } catch (err) {
        console.error('[SPA] Navigation callback error:', err);
      }
    });
  }

  /**
   * Notify callbacks that navigation completed
   */
  private notifyNavigationComplete(url: string): void {
    // Could add separate callbacks for complete vs start
    // For now, reuse the same callbacks
  }

  /**
   * Check if currently navigating
   */
  isNavigatingNow(): boolean {
    return this.isNavigating;
  }
}
