/**
 * @minimact/plugin
 *
 * Plugin system for Minimact - Server-side widgets with zero client bundle overhead
 *
 * Features:
 * - Plugin template registration from server
 * - Zero client bundle overhead (server-defined templates)
 * - Automatic asset loading (CSS, JS, images, fonts)
 * - Template patch application with slot filling
 * - Version management and conflict resolution
 *
 * @example
 * ```typescript
 * import { pluginRenderer } from '@minimact/plugin';
 *
 * // Register plugin (sent from server on first render)
 * pluginRenderer.registerPlugin({
 *   pluginName: 'Clock',
 *   version: '1.0.0',
 *   templates: [...],
 *   assets: {
 *     cssFiles: ['/plugin-assets/Clock@1.0.0/clock.css']
 *   }
 * });
 *
 * // Apply template with state
 * const clockElement = document.getElementById('clock-widget');
 * pluginRenderer.applyTemplate('Clock', currentTimeState, clockElement);
 * ```
 */

export { PluginRenderer } from './PluginRenderer';
export type {
  PluginTemplate,
  PluginAssets,
  PluginRegistrationOptions,
  PluginStateBinding,
  LoopTemplate,
  ItemTemplate,
  TextTemplate,
  PropTemplate
} from './types';

import { PluginRenderer } from './PluginRenderer';

/**
 * Global singleton plugin renderer
 */
export const pluginRenderer = new PluginRenderer();

/**
 * Expose to window for runtime access
 */
if (typeof window !== 'undefined') {
  (window as any).__minimactPluginRenderer = pluginRenderer;
}

/**
 * Version and metadata
 */
export const VERSION = '0.1.0';
export const MES_CERTIFICATION = 'Bronze'; // Will upgrade to Silver/Gold as we add features
