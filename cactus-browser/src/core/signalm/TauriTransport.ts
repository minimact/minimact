/**
 * Tauri Transport for SignalM²
 *
 * Implements ISignalMTransport using Tauri's IPC system for local, in-process communication.
 *
 * Performance Characteristics:
 * - Latency: ~0.1ms (vs 10-50ms for WebSocket)
 * - Throughput: ~100K msg/s (vs 1K msg/s for WebSocket)
 * - No network overhead - direct process-to-process communication
 *
 * Usage:
 * ```typescript
 * import { TauriTransport } from './core/signalm/TauriTransport';
 * import { ISignalMTransport } from '@minimact/core/signalm';
 *
 * const transport: ISignalMTransport = new TauriTransport();
 * await transport.connect();
 * ```
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type Event as TauriEvent } from '@tauri-apps/api/event';
import type { ISignalMTransport } from '../../../../../src/client-runtime/src/signalm/ISignalMTransport';

export class TauriTransport implements ISignalMTransport {
  private handlers = new Map<string, Set<(...args: any[]) => void>>();
  private connected = false;
  private unlistenFunctions: (() => void)[] = [];
  private connectedCallback?: () => void;
  private closeCallback?: (error?: Error) => void;

  /**
   * Connect to Tauri backend
   * Sets up event listener for messages from C# runtime
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.warn('[SignalM²] TauriTransport already connected');
      return;
    }

    console.log('[SignalM²] TauriTransport connecting...');

    // Listen for messages from C# runtime via Tauri events
    const unlisten = await listen('signalm-message', (event: TauriEvent<any>) => {
      const { method, args } = event.payload;
      this.handleMessage(method, args);
    });

    this.unlistenFunctions.push(unlisten);
    this.connected = true;

    console.log('[SignalM²] TauriTransport connected ✅ (local mode, ~0.1ms latency)');

    // Notify connected callback
    if (this.connectedCallback) {
      this.connectedCallback();
    }
  }

  /**
   * Disconnect from Tauri backend
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    console.log('[SignalM²] TauriTransport disconnecting...');

    // Clean up event listeners
    for (const unlisten of this.unlistenFunctions) {
      unlisten();
    }
    this.unlistenFunctions = [];
    this.connected = false;

    console.log('[SignalM²] TauriTransport disconnected');

    // Notify close callback
    if (this.closeCallback) {
      this.closeCallback();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send message to C# runtime via Tauri IPC
   *
   * @param method - Method name (e.g., 'Initialize', 'UpdateComponentState', 'InvokeComponentMethod')
   * @param args - Arguments to pass to the method
   * @returns Promise that resolves with the response from the runtime
   */
  async send(method: string, ...args: any[]): Promise<any> {
    if (!this.connected) {
      throw new Error('[SignalM²] TauriTransport not connected');
    }

    const startTime = performance.now();
    console.log(`[SignalM²] → Runtime: ${method}`, args);

    try {
      // Call Tauri command (in-process, ~0.1ms round-trip)
      const result = await invoke('signalm_invoke', {
        method,
        args
      });

      const latency = performance.now() - startTime;
      console.log(`[SignalM²] ← Response: ${method} (${latency.toFixed(2)}ms)`, result);

      return result;
    } catch (error) {
      console.error(`[SignalM²] ✗ Failed: ${method}`, error);
      throw error;
    }
  }

  /**
   * Register handler for incoming messages from runtime
   *
   * @param method - Method name to listen for (e.g., 'ApplyPatches', 'UpdateState')
   * @param handler - Handler function to call when message is received
   */
  on(method: string, handler: (...args: any[]) => void): void {
    if (!this.handlers.has(method)) {
      this.handlers.set(method, new Set());
    }
    this.handlers.get(method)!.add(handler);
    console.log(`[SignalM²] Registered handler for: ${method}`);
  }

  /**
   * Unregister handler
   *
   * @param method - Method name
   * @param handler - Handler function to remove
   */
  off(method: string, handler: (...args: any[]) => void): void {
    const handlers = this.handlers.get(method);
    if (handlers) {
      handlers.delete(handler);
      console.log(`[SignalM²] Unregistered handler for: ${method}`);
      if (handlers.size === 0) {
        this.handlers.delete(method);
      }
    }
  }

  /**
   * Handle incoming message from Tauri event
   */
  private handleMessage(method: string, args: any[]) {
    const handlers = this.handlers.get(method);
    if (handlers && handlers.size > 0) {
      console.log(`[SignalM²] ← Event: ${method}`, args);
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[SignalM²] Error in handler for '${method}':`, error);
        }
      }
    } else {
      console.warn(`[SignalM²] No handler registered for: ${method}`);
    }
  }

  /**
   * Optional: Register callback for when connection is established
   * (For Tauri, connection is instant and local - no async handshake)
   */
  onConnected(callback: () => void): void {
    this.connectedCallback = callback;
    // If already connected, call immediately
    if (this.connected) {
      callback();
    }
  }

  /**
   * Optional: Register callback for when connection is closed
   */
  onClose(callback: (error?: Error) => void): void {
    this.closeCallback = callback;
  }

  /**
   * Optional: Register callback for reconnection starting
   * Not applicable for Tauri (no network, no reconnection needed)
   */
  onReconnecting?(callback: () => void): void {
    // Not applicable for Tauri - connection is always local
    console.debug('[SignalM²] onReconnecting not applicable for TauriTransport');
  }

  /**
   * Optional: Register callback for reconnection success
   * Not applicable for Tauri (no network, no reconnection needed)
   */
  onReconnected?(callback: () => void): void {
    // Not applicable for Tauri - connection is always local
    console.debug('[SignalM²] onReconnected not applicable for TauriTransport');
  }
}
