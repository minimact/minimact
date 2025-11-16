/**
 * SignalM Transport Interface
 *
 * Abstraction layer for SignalM transport mechanisms.
 * Implementations can use WebSocket, Tauri IPC, WebRTC, or any other transport.
 */

export interface ISignalMTransport {
  /**
   * Connect to the transport
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the transport
   */
  disconnect(): Promise<void>;

  /**
   * Check if currently connected
   */
  isConnected(): boolean;

  /**
   * Send a message and optionally wait for a response
   * @param method - Method name to invoke
   * @param args - Arguments to pass
   * @returns Promise that resolves with the response (if any)
   */
  send(method: string, ...args: any[]): Promise<any>;

  /**
   * Register a handler for incoming messages
   * @param method - Method name to listen for
   * @param handler - Handler function to call when message is received
   */
  on(method: string, handler: (...args: any[]) => void): void;

  /**
   * Unregister a handler
   * @param method - Method name
   * @param handler - Handler function to remove
   */
  off(method: string, handler: (...args: any[]) => void): void;

  /**
   * Optional: Called when reconnection is starting
   */
  onReconnecting?(callback: () => void): void;

  /**
   * Optional: Called when reconnection succeeds
   */
  onReconnected?(callback: () => void): void;

  /**
   * Optional: Called when connection is closed
   */
  onClose?(callback: (error?: Error) => void): void;

  /**
   * Optional: Called when connection is established
   */
  onConnected?(callback: () => void): void;
}
