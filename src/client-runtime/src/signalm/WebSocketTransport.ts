/**
 * WebSocket Transport for SignalM
 *
 * Wraps SignalMConnection to implement ISignalMTransport interface.
 * This is the default transport for web applications.
 */

import { SignalMConnection } from './SignalMConnection';
import { ISignalMTransport } from './ISignalMTransport';
import type { SignalMOptions } from './types';

export class WebSocketTransport implements ISignalMTransport {
  private connection: SignalMConnection;

  constructor(url: string, options?: SignalMOptions) {
    this.connection = new SignalMConnection(url, options || {});
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    await this.connection.start();
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    await this.connection.stop();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection.connectionState === 'Connected';
  }

  /**
   * Send message via WebSocket (invoke)
   */
  async send(method: string, ...args: any[]): Promise<any> {
    return await this.connection.invoke(method, ...args);
  }

  /**
   * Register handler for incoming messages
   */
  on(method: string, handler: (...args: any[]) => void): void {
    this.connection.on(method, handler);
  }

  /**
   * Unregister handler
   */
  off(method: string, handler: (...args: any[]) => void): void {
    this.connection.off(method, handler);
  }

  /**
   * Connection lifecycle events
   */
  onReconnecting(callback: () => void): void {
    this.connection.onReconnecting(callback);
  }

  onReconnected(callback: () => void): void {
    this.connection.onReconnected(callback);
  }

  onClose(callback: (error?: Error) => void): void {
    this.connection.onDisconnected(callback);
  }

  onConnected(callback: () => void): void {
    this.connection.onConnected(callback);
  }

  /**
   * Get underlying SignalMConnection (for advanced use)
   */
  getConnection(): SignalMConnection {
    return this.connection;
  }
}
