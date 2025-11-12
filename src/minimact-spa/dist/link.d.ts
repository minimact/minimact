import { SPARouter } from './spa-router';
/**
 * Client-side Link component for SPA navigation
 * Intercepts clicks and uses SignalR instead of full page reload
 */
export declare class Link {
    private element;
    private router;
    private prefetchTimer;
    constructor(element: HTMLAnchorElement, router: SPARouter);
    /**
     * Attach click and hover handlers
     */
    private attachHandlers;
    /**
     * Handle click event
     */
    private handleClick;
    /**
     * Handle hover for prefetching
     */
    private handleHover;
    /**
     * Handle mouse leave (cancel prefetch)
     */
    private handleMouseLeave;
    /**
     * Prefetch page data
     */
    private prefetch;
    /**
     * Check if link is external
     */
    private isExternalLink;
    /**
     * Detach handlers (cleanup)
     */
    destroy(): void;
}
/**
 * Initialize all Link elements on the page
 */
export declare function initializeLinks(router: SPARouter): void;
//# sourceMappingURL=link.d.ts.map