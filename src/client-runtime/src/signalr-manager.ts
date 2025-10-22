import * as signalR from '@microsoft/signalr';
import { Patch } from './types';

/**
 * Manages SignalR connection to the Minimact server hub
 */
export class SignalRManager {
  private connection: signalR.HubConnection;
  private reconnectInterval: number;
  private debugLogging: boolean;
  private eventHandlers: Map<string, Set<Function>>;

  constructor(hubUrl: string = '/minimact', options: { reconnectInterval?: number; debugLogging?: boolean } = {}) {
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.debugLogging = options.debugLogging || false;
    this.eventHandlers = new Map();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: () => this.reconnectInterval
      })
      .configureLogging(this.debugLogging ? signalR.LogLevel.Debug : signalR.LogLevel.Warning)
      .build();

    this.setupEventHandlers();
  }

  /**
   * Setup SignalR event handlers
   */
  private setupEventHandlers(): void {
    // Handle component updates from server
    this.connection.on('UpdateComponent', (componentId: string, html: string) => {
      this.log('UpdateComponent', { componentId, html });
      this.emit('updateComponent', { componentId, html });
    });

    // Handle patch updates from server
    this.connection.on('ApplyPatches', (componentId: string, patches: Patch[]) => {
      this.log('ApplyPatches', { componentId, patches });
      this.emit('applyPatches', { componentId, patches });
    });

    // Handle errors from server
    this.connection.on('Error', (message: string) => {
      console.error('[Minimact] Server error:', message);
      this.emit('error', { message });
    });

    // Handle reconnection
    this.connection.onreconnecting((error) => {
      this.log('Reconnecting...', error);
      this.emit('reconnecting', { error });
    });

    this.connection.onreconnected((connectionId) => {
      this.log('Reconnected', { connectionId });
      this.emit('reconnected', { connectionId });
    });

    this.connection.onclose((error) => {
      this.log('Connection closed', error);
      this.emit('closed', { error });
    });
  }

  /**
   * Start the SignalR connection
   */
  async start(): Promise<void> {
    try {
      await this.connection.start();
      this.log('Connected to Minimact hub');
      this.emit('connected', { connectionId: this.connection.connectionId });
    } catch (error) {
      console.error('[Minimact] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Stop the SignalR connection
   */
  async stop(): Promise<void> {
    await this.connection.stop();
    this.log('Disconnected from Minimact hub');
  }

  /**
   * Register a component with the server
   */
  async registerComponent(componentId: string): Promise<void> {
    try {
      await this.connection.invoke('RegisterComponent', componentId);
      this.log('Registered component', { componentId });
    } catch (error) {
      console.error('[Minimact] Failed to register component:', error);
      throw error;
    }
  }

  /**
   * Invoke a component method on the server
   */
  async invokeComponentMethod(componentId: string, methodName: string, args: any = {}): Promise<void> {
    try {
      const argsJson = JSON.stringify(args);
      await this.connection.invoke('InvokeComponentMethod', componentId, methodName, argsJson);
      this.log('Invoked method', { componentId, methodName, args });
    } catch (error) {
      console.error('[Minimact] Failed to invoke method:', error);
      throw error;
    }
  }

  /**
   * Update client state on the server
   */
  async updateClientState(componentId: string, key: string, value: any): Promise<void> {
    try {
      const valueJson = JSON.stringify(value);
      await this.connection.invoke('UpdateClientState', componentId, key, valueJson);
      this.log('Updated client state', { componentId, key, value });
    } catch (error) {
      console.error('[Minimact] Failed to update client state:', error);
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to subscribers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact SignalR] ${message}`, data || '');
    }
  }

  /**
   * Get connection state
   */
  get state(): signalR.HubConnectionState {
    return this.connection.state;
  }

  /**
   * Get connection ID
   */
  get connectionId(): string | null {
    return this.connection.connectionId;
  }
}
