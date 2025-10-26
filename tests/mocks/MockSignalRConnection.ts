/**
 * MockSignalRConnection - Bidirectional mock for testing client-server communication
 *
 * Simulates SignalR's full-duplex communication:
 * - Client → Server: invoke() calls
 * - Server → Client: on() event handlers
 *
 * Usage:
 *   const mockServer = new MockMinimactServer();
 *   const mockConnection = new MockSignalRConnection(mockServer);
 *   const client = new Minimact({ signalRConnection: mockConnection });
 */

import type { MockMinimactServer } from './MockMinimactServer';

export type MessageHandler = (...args: any[]) => void;

export class MockSignalRConnection {
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private mockServer: MockMinimactServer;
  private _state: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private _connectionId: string;

  constructor(mockServer: MockMinimactServer) {
    this.mockServer = mockServer;
    this._connectionId = `mock-connection-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * CLIENT → SERVER: Invoke a server method
   * Simulates: connection.invoke('MethodName', ...args)
   */
  async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (this._state !== 'connected') {
      throw new Error('Cannot invoke method when connection is not in the Connected state');
    }

    console.log(`[MockClient → Server] ${methodName}`, args);

    try {
      const result = await this.mockServer._handleClientInvoke(this._connectionId, methodName, ...args);
      return result;
    } catch (error) {
      console.error(`[MockClient] Error invoking ${methodName}:`, error);
      throw error;
    }
  }

  /**
   * CLIENT: Register handler for server messages
   * Simulates: connection.on('EventName', handler)
   */
  on(eventName: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(eventName)) {
      this.messageHandlers.set(eventName, []);
    }
    this.messageHandlers.get(eventName)!.push(handler);
  }

  /**
   * CLIENT: Remove handler for server messages
   * Simulates: connection.off('EventName', handler)
   */
  off(eventName: string, handler?: MessageHandler): void {
    if (!handler) {
      this.messageHandlers.delete(eventName);
      return;
    }

    const handlers = this.messageHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * CLIENT: Start connection
   * Simulates: connection.start()
   */
  async start(): Promise<void> {
    if (this._state === 'connected') {
      return;
    }

    this._state = 'connecting';
    console.log('[MockClient] Connecting...');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    this._state = 'connected';
    console.log('[MockClient] Connected');

    // Register with server
    this.mockServer._registerClient(this);
  }

  /**
   * CLIENT: Stop connection
   * Simulates: connection.stop()
   */
  async stop(): Promise<void> {
    this._state = 'disconnected';
    console.log('[MockClient] Disconnected');
    this.mockServer._unregisterClient(this);
  }

  /**
   * Get connection state
   */
  get state(): 'disconnected' | 'connecting' | 'connected' {
    return this._state;
  }

  /**
   * Get connection ID
   */
  get connectionId(): string {
    return this._connectionId;
  }

  /**
   * INTERNAL: Called by MockServer to send messages to client
   * Simulates: Clients.Client(connectionId).SendAsync('EventName', data)
   */
  _receiveFromServer(eventName: string, ...args: any[]): void {
    console.log(`[Server → MockClient] ${eventName}`, args);

    const handlers = this.messageHandlers.get(eventName) || [];
    handlers.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`[MockClient] Error in handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * TESTING HELPER: Check if a handler is registered
   */
  _hasHandler(eventName: string): boolean {
    return this.messageHandlers.has(eventName) && this.messageHandlers.get(eventName)!.length > 0;
  }

  /**
   * TESTING HELPER: Get all registered event names
   */
  _getRegisteredEvents(): string[] {
    return Array.from(this.messageHandlers.keys());
  }
}
