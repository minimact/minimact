import { NavigationOptions } from './types';
/**
 * Client-side SPA router for Minimact
 * Handles navigation via SignalR without full page reloads
 */
export declare class SPARouter {
    private signalR;
    private domPatcher;
    private isNavigating;
    private navigationCallbacks;
    constructor(signalR: any, domPatcher: any);
    /**
     * Navigate to a new URL via SignalR
     */
    navigate(url: string, options?: NavigationOptions): Promise<void>;
    /**
     * Apply full patches (shell + page changed)
     */
    private applyFullPatches;
    /**
     * Apply page-only patches (same shell)
     */
    private applyPagePatches;
    /**
     * Setup browser back/forward button handler
     */
    private setupPopStateHandler;
    /**
     * Register callback for navigation events
     */
    onNavigate(callback: (url: string) => void): void;
    /**
     * Notify callbacks that navigation started
     */
    private notifyNavigationStart;
    /**
     * Notify callbacks that navigation completed
     */
    private notifyNavigationComplete;
    /**
     * Check if currently navigating
     */
    isNavigatingNow(): boolean;
}
//# sourceMappingURL=spa-router.d.ts.map