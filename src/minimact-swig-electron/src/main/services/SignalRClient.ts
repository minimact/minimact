import * as signalR from '@microsoft/signalr';

/**
 * SignalRClient - Connects to running Minimact app for telemetry
 *
 * Responsibilities:
 * - Connect to target app's MinimactHub
 * - Listen for component/state/performance events
 * - Send control commands
 */
export class SignalRClient {
  private connection: signalR.HubConnection | null = null;
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();

  /**
   * Connect to SignalR hub
   */
  async connect(url: string): Promise<void> {
    if (this.connection) {
      await this.disconnect();
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect()
      .build();

    // Register existing event handlers
    for (const [event, handlers] of this.eventHandlers.entries()) {
      for (const handler of handlers) {
        this.connection.on(event, handler);
      }
    }

    await this.connection.start();
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /**
   * Register event handler
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(callback);

    if (this.connection) {
      this.connection.on(event, callback);
    }
  }

  /**
   * Unregister event handler
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    if (this.connection) {
      this.connection.off(event, callback);
    }
  }

  /**
   * Invoke server method
   */
  async invoke(method: string, ...args: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error('Not connected to SignalR hub');
    }

    return await this.connection.invoke(method, ...args);
  }

  /**
   * Check connection state
   */
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}
