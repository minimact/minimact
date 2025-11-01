/**
 * SignalM Connection
 *
 * Lightweight WebSocket-based connection compatible with SignalR hubs.
 * Supports method invocation, event handling, and automatic reconnection.
 */

import { EventEmitter } from './EventEmitter';
import { JsonProtocol } from './JsonProtocol';
import { ExponentialBackoffRetryPolicy, type IRetryPolicy } from './RetryPolicy';
import {
  ConnectionState,
  type SignalMOptions,
  type PendingInvocation
} from './types';

export class SignalMConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, Function[]>();
  private pendingInvocations = new Map<string, PendingInvocation>();
  private invocationId = 0;
  private reconnectPolicy: IRetryPolicy;
  private state: ConnectionState = ConnectionState.Disconnected;
  private reconnectAttempts = 0;
  private eventEmitter: EventEmitter;
  private debugLogging: boolean;
  private connectionTimeout: number;
  private invocationTimeout: number;
  private reconnectTimeoutId: number | null = null;

  constructor(url: string, options: SignalMOptions = {}) {
    this.url = url;
    this.reconnectPolicy = options.reconnectPolicy || new ExponentialBackoffRetryPolicy();
    this.debugLogging = options.debug || false;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.invocationTimeout = options.invocationTimeout || 30000;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Start the connection
   */
  async start(): Promise<void> {
    if (this.state !== ConnectionState.Disconnected) {
      throw new Error('Connection is already started');
    }

    this.state = ConnectionState.Connecting;
    this.log('Starting connection...');
    return this.connect();
  }

  /**
   * Stop the connection
   */
  async stop(): Promise<void> {
    this.log('Stopping connection...');

    // Clear any pending reconnect
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.state = ConnectionState.Disconnected;
    this.eventEmitter.emit('disconnected');
  }

  /**
   * Invoke a server method and wait for result
   */
  async invoke<T = any>(methodName: string, ...args: any[]): Promise<T> {
    if (this.state !== ConnectionState.Connected) {
      throw new Error(`Connection is not in Connected state (current: ${this.state})`);
    }

    const invocationId = this.generateInvocationId();
    const message = JsonProtocol.writeInvocation(invocationId, methodName, args);

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInvocations.delete(invocationId);
        reject(new Error(`Invocation '${methodName}' timed out after ${this.invocationTimeout}ms`));
      }, this.invocationTimeout);

      this.pendingInvocations.set(invocationId, {
        resolve,
        reject,
        timeout: timeout as unknown as number
      });

      const serialized = JsonProtocol.serializeMessage(message);
      this.log(`Invoking '${methodName}' (id: ${invocationId})`, args);
      this.ws!.send(serialized);
    });
  }

  /**
   * Send a message without expecting a response (fire-and-forget)
   */
  send(methodName: string, ...args: any[]): void {
    if (this.state !== ConnectionState.Connected) {
      throw new Error(`Connection is not in Connected state (current: ${this.state})`);
    }

    const message = JsonProtocol.writeMessage(methodName, args);
    const serialized = JsonProtocol.serializeMessage(message);
    this.log(`Sending '${methodName}' (fire-and-forget)`, args);
    this.ws!.send(serialized);
  }

  /**
   * Register a handler for server-to-client method calls
   */
  on(methodName: string, handler: (...args: any[]) => void): void {
    if (!this.handlers.has(methodName)) {
      this.handlers.set(methodName, []);
    }
    this.handlers.get(methodName)!.push(handler);
    this.log(`Registered handler for '${methodName}'`);
  }

  /**
   * Remove a handler
   */
  off(methodName: string, handler: (...args: any[]) => void): void {
    const handlers = this.handlers.get(methodName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.log(`Removed handler for '${methodName}'`);
      }
    }
  }

  /**
   * Register event listener for connection lifecycle events
   */
  onConnected(handler: () => void): void {
    this.eventEmitter.on('connected', handler);
  }

  onDisconnected(handler: () => void): void {
    this.eventEmitter.on('disconnected', handler);
  }

  onReconnecting(handler: () => void): void {
    this.eventEmitter.on('reconnecting', handler);
  }

  onReconnected(handler: () => void): void {
    this.eventEmitter.on('reconnected', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.eventEmitter.on('error', handler);
  }

  /**
   * Get current connection state
   */
  get connectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Internal: Connect to WebSocket
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl();
      this.log(`Connecting to ${wsUrl}...`);

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        reject(error);
        return;
      }

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.state === ConnectionState.Connecting) {
          this.log('Connection timeout');
          this.ws?.close();
          reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
        }
      }, this.connectionTimeout);

      // Track handshake completion
      let handshakeComplete = false;

      this.ws.onopen = () => {
        // Send handshake immediately after connection
        const handshake = JsonProtocol.writeHandshake();
        this.log('Sending handshake', handshake);
        this.ws!.send(handshake);
      };

      this.ws.onmessage = (event) => {
        // First message should be handshake response
        if (!handshakeComplete) {
          try {
            const response = JsonProtocol.parseHandshake(event.data);
            if (response.error) {
              clearTimeout(connectionTimeout);
              this.log('Handshake failed', response.error);
              this.ws?.close();
              reject(new Error(`Handshake failed: ${response.error}`));
              return;
            }

            // Handshake successful
            handshakeComplete = true;
            clearTimeout(connectionTimeout);
            this.state = ConnectionState.Connected;
            this.reconnectAttempts = 0;
            this.log('Handshake complete ✓');
            this.log('Connected ✓');
            this.eventEmitter.emit('connected');
            resolve();
          } catch (error) {
            clearTimeout(connectionTimeout);
            this.log('Handshake parse error', error);
            this.ws?.close();
            reject(new Error(`Handshake error: ${error}`));
          }
        } else {
          // Handle normal messages
          this.handleMessage(event.data);
        }
      };

      this.ws.onerror = (error) => {
        this.log('WebSocket error', error);
        this.eventEmitter.emit('error', new Error('WebSocket error'));
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.handleClose(event);
      };
    });
  }

  /**
   * Internal: Handle incoming messages
   * SignalR can send multiple messages in one WebSocket frame, separated by \x1E
   */
  private handleMessage(data: string): void {
    // Split on record separator - server can send multiple messages at once
    const messages = data.split('\x1E').filter(msg => msg.length > 0);

    for (const messageData of messages) {
      try {
        const message = JSON.parse(messageData);
        this.log(`Received message (type: ${message.type})`, message);

        if (JsonProtocol.isInvocation(message)) {
          // Server calling client method
          this.handleInvocation(message);
        } else if (JsonProtocol.isCompletion(message)) {
          // Response to client invoke()
          this.handleCompletion(message);
        } else if (JsonProtocol.isPing(message)) {
          // Server ping (respond with pong)
          this.handlePing();
        } else if (JsonProtocol.isClose(message)) {
          // Server requested close
          this.log('Server requested close', message.error);
          this.ws?.close(1000, 'Server closed connection');
        }
      } catch (error) {
        this.log('Error parsing message', error);
        console.error('[SignalM] Error parsing message:', error);
      }
    }
  }

  /**
   * Internal: Handle server-to-client invocation
   */
  private handleInvocation(message: any): void {
    const handlers = this.handlers.get(message.target);
    if (handlers) {
      this.log(`Calling ${handlers.length} handler(s) for '${message.target}'`);
      handlers.forEach(handler => {
        try {
          handler(...(message.arguments || []));
        } catch (error) {
          console.error(`[SignalM] Error in handler for '${message.target}':`, error);
        }
      });
    } else {
      this.log(`No handler registered for '${message.target}'`);
    }
  }

  /**
   * Internal: Handle completion (response to invoke)
   */
  private handleCompletion(message: any): void {
    const pending = this.pendingInvocations.get(message.invocationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingInvocations.delete(message.invocationId);

      if (message.error) {
        this.log(`Invocation ${message.invocationId} failed: ${message.error}`);
        pending.reject(new Error(message.error));
      } else {
        this.log(`Invocation ${message.invocationId} completed`, message.result);
        pending.resolve(message.result);
      }
    } else {
      this.log(`Received completion for unknown invocation ${message.invocationId}`);
    }
  }

  /**
   * Internal: Handle ping (send pong)
   */
  private handlePing(): void {
    const pongMessage = JsonProtocol.writePing(); // Pong uses same message type
    const serialized = JsonProtocol.serializeMessage(pongMessage);
    this.log('Received ping, sending pong');
    this.ws?.send(serialized);
  }

  /**
   * Internal: Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    this.log(`Connection closed (code: ${event.code}, reason: ${event.reason})`);
    this.state = ConnectionState.Disconnected;
    this.ws = null;

    // Reject all pending invocations
    this.pendingInvocations.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    });
    this.pendingInvocations.clear();

    // Attempt reconnection if not normal closure (1000) or going away (1001)
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    } else {
      this.eventEmitter.emit('disconnected');
    }
  }

  /**
   * Internal: Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    const delay = this.reconnectPolicy.nextRetryDelay(this.reconnectAttempts);

    if (delay === null) {
      // Max retries exceeded
      this.log('Max reconnection attempts exceeded');
      this.eventEmitter.emit('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.state = ConnectionState.Reconnecting;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    this.eventEmitter.emit('reconnecting');

    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectTimeoutId = null;
      try {
        await this.connect();
        this.log('Reconnected ✓');
        this.eventEmitter.emit('reconnected');
      } catch (error) {
        this.log('Reconnection failed', error);
        this.attemptReconnect();
      }
    }, delay) as unknown as number;
  }

  /**
   * Internal: Build WebSocket URL
   */
  private buildWebSocketUrl(): string {
    // If URL is absolute, use it as-is
    if (this.url.startsWith('ws://') || this.url.startsWith('wss://')) {
      return this.url;
    }

    // Otherwise, construct from current page location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = this.url.startsWith('/')
      ? `${protocol}//${window.location.host}${this.url}`
      : `${protocol}//${window.location.host}/${this.url}`;

    return baseUrl;
  }

  /**
   * Internal: Generate unique invocation ID
   */
  private generateInvocationId(): string {
    return (++this.invocationId).toString();
  }

  /**
   * Internal: Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      if (data !== undefined) {
        console.log(`[SignalM] ${message}`, data);
      } else {
        console.log(`[SignalM] ${message}`);
      }
    }
  }
}
