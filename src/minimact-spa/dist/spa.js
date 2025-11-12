var MinimactSPA = (function (exports) {
    'use strict';

    /**
     * Client-side SPA router for Minimact
     * Handles navigation via SignalR without full page reloads
     */
    class SPARouter {
        constructor(signalR, domPatcher) {
            this.isNavigating = false;
            this.navigationCallbacks = [];
            this.signalR = signalR;
            this.domPatcher = domPatcher;
            // Handle browser back/forward buttons
            this.setupPopStateHandler();
        }
        /**
         * Navigate to a new URL via SignalR
         */
        async navigate(url, options = {}) {
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
                const response = await this.signalR.invoke('NavigateTo', url);
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
                }
                else {
                    console.log('[SPA] Same shell - applying page patches only');
                    await this.applyPagePatches(response.patches);
                }
                // Update browser history
                if (options.replace) {
                    window.history.replaceState(options.state || { url }, '', response.url);
                }
                else {
                    window.history.pushState(options.state || { url }, '', response.url);
                }
                // Update MVC state (if provided)
                if (response.pageData && window.minimact) {
                    window.minimact.updateMvcState(response.pageData);
                }
                // Scroll to top (unless disabled)
                if (!options.skipScroll) {
                    window.scrollTo(0, 0);
                }
                const latency = performance.now() - startTime;
                console.log(`[SPA] Navigation completed in ${latency.toFixed(2)}ms`);
                // Notify callbacks
                this.notifyNavigationComplete(url);
            }
            catch (error) {
                console.error('[SPA] Navigation error:', error);
                // Fallback: full page reload
                console.log('[SPA] Falling back to full page reload');
                window.location.href = url;
            }
            finally {
                this.isNavigating = false;
            }
        }
        /**
         * Apply full patches (shell + page changed)
         */
        async applyFullPatches(patches) {
            const rootElement = document.querySelector('[data-minimact-root]');
            if (!rootElement) {
                throw new Error('[SPA] Root element not found');
            }
            this.domPatcher.applyPatches(rootElement, patches);
        }
        /**
         * Apply page-only patches (same shell)
         */
        async applyPagePatches(patches) {
            const pageContainer = document.querySelector('[data-minimact-page]');
            if (pageContainer) {
                this.domPatcher.applyPatches(pageContainer, patches);
            }
            else {
                console.warn('[SPA] Page container not found, applying full patches');
                await this.applyFullPatches(patches);
            }
        }
        /**
         * Setup browser back/forward button handler
         */
        setupPopStateHandler() {
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
        onNavigate(callback) {
            this.navigationCallbacks.push(callback);
        }
        /**
         * Notify callbacks that navigation started
         */
        notifyNavigationStart(url) {
            this.navigationCallbacks.forEach(cb => {
                try {
                    cb(url);
                }
                catch (err) {
                    console.error('[SPA] Navigation callback error:', err);
                }
            });
        }
        /**
         * Notify callbacks that navigation completed
         */
        notifyNavigationComplete(url) {
            // Could add separate callbacks for complete vs start
            // For now, reuse the same callbacks
        }
        /**
         * Check if currently navigating
         */
        isNavigatingNow() {
            return this.isNavigating;
        }
    }

    /**
     * Client-side Link component for SPA navigation
     * Intercepts clicks and uses SignalR instead of full page reload
     */
    class Link {
        constructor(element, router) {
            this.prefetchTimer = null;
            this.element = element;
            this.router = router;
            this.attachHandlers();
        }
        /**
         * Attach click and hover handlers
         */
        attachHandlers() {
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
        async handleClick(e) {
            // Only intercept left-clicks without modifiers
            if (e.button !== 0 ||
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.defaultPrevented) {
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
                }
                catch (err) {
                    console.error('[SPA Link] onClick handler error:', err);
                }
            }
        }
        /**
         * Handle hover for prefetching
         */
        handleHover() {
            // Debounce prefetch (wait 200ms before prefetching)
            this.prefetchTimer = window.setTimeout(() => {
                this.prefetch();
            }, 200);
        }
        /**
         * Handle mouse leave (cancel prefetch)
         */
        handleMouseLeave() {
            if (this.prefetchTimer) {
                clearTimeout(this.prefetchTimer);
                this.prefetchTimer = null;
            }
        }
        /**
         * Prefetch page data
         */
        async prefetch() {
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
        isExternalLink(href) {
            // External if starts with http:// or https:// or //
            if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
                return true;
            }
            // External if has different origin
            try {
                const url = new URL(href, window.location.origin);
                return url.origin !== window.location.origin;
            }
            catch {
                return false;
            }
        }
        /**
         * Detach handlers (cleanup)
         */
        destroy() {
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
    function initializeLinks(router) {
        const links = document.querySelectorAll('a[data-minimact-link]');
        links.forEach((linkElement) => {
            new Link(linkElement, router);
        });
        console.log(`[SPA] Initialized ${links.length} link(s)`);
    }

    /**
     * Initialize SPA module
     * Automatically sets up router and link handlers
     */
    function initializeSPA() {
        console.log('[SPA] Initializing @minimact/spa');
        // Get Minimact instance
        const minimact = window.minimact;
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
        window.minimactSPA = router;
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
    }
    else if (typeof window !== 'undefined') {
        // Document already loaded
        if (document.querySelector('[data-minimact-spa]')) {
            initializeSPA();
        }
    }

    exports.Link = Link;
    exports.SPARouter = SPARouter;
    exports.initializeLinks = initializeLinks;
    exports.initializeSPA = initializeSPA;

    return exports;

})({});
