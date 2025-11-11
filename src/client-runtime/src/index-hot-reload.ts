/**
 * @minimact/core/hot-reload
 *
 * Hot reload and development tools for Minimact
 *
 * Usage:
 *   import { enableHotReload } from '@minimact/core/hot-reload';
 *   enableHotReload();
 *
 * Bundle impact: +5.15 KB gzipped (only loaded when imported)
 *
 * This module should only be imported in development builds.
 * Vite/Webpack will automatically tree-shake it in production.
 */

import { HotReloadManager, type HotReloadConfig } from './hot-reload';
export type { HotReloadConfig, HotReloadMessage, HotReloadMetrics } from './hot-reload';

/**
 * Enable hot reload for the auto-initialized Minimact instance
 *
 * Call this function in your app's entry point during development:
 *
 * @example
 * import { enableHotReload } from '@minimact/core/hot-reload';
 * if (import.meta.env.DEV) {
 *   enableHotReload();
 * }
 */
export function enableHotReload(config?: Partial<HotReloadConfig>): HotReloadManager | null {
  if (typeof window === 'undefined') {
    console.warn('[Minimact Hot Reload] Not in browser environment');
    return null;
  }

  // Get the auto-initialized Minimact instance
  const minimact = (window as any).minimact;

  if (!minimact) {
    console.error('[Minimact Hot Reload] No Minimact instance found. Make sure <script data-minimact-auto-init> is loaded first.');
    return null;
  }

  // Check if hot reload is already enabled
  if ((minimact as any).hotReload) {
    console.warn('[Minimact Hot Reload] Already enabled');
    return (minimact as any).hotReload;
  }

  // Create and attach hot reload manager
  const hotReload = new HotReloadManager(minimact, {
    enabled: true,
    wsUrl: config?.wsUrl,
    debounceMs: config?.debounceMs ?? 50,
    showNotifications: config?.showNotifications ?? true,
    logLevel: config?.logLevel ?? 'info'
  });

  (minimact as any).hotReload = hotReload;

  console.log('[Minimact Hot Reload] ✅ Enabled');

  return hotReload;
}

export { HotReloadManager };
