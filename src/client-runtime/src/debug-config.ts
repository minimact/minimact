/**
 * Shared debug configuration
 * Used by both SignalRManager and SignalMManager
 */

/**
 * Global debug mode flag
 * Enable/disable debug messages sent to server
 * Set to true to send all debug() calls to server (for C# breakpoint debugging)
 * Set to false to only log locally (console.log)
 */
export let DEBUG_MODE = false;

/**
 * Enable or disable debug mode globally
 */
export function setDebugMode(enabled: boolean): void {
  DEBUG_MODE = enabled;
  console.log(`[Minimact] Debug mode ${enabled ? 'enabled' : 'disabled'}${enabled ? ' - debug() calls will be sent to server' : ''}`);
}
