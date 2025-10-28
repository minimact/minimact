import { SignalMConnection, ConnectionState } from './signalm/index';
import { Patch } from './types';
import { ArrayOperation } from './hooks';

/**
 * Manages SignalM connection to the Minimact server hub
 *
 * Drop-in replacement for SignalRManager using lightweight SignalM
 * Bundle size: ~3 KB gzipped (vs 18 KB with SignalR)
 */
export class SignalMManager {
  private connection: SignalMConnection;
  private debugLogging: boolean;
  private eventHandlers: Map<string, Set<Function>>;

  constructor(hubUrl: string = '/minimact', options: { reconnectInterval?: number; debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
    this.eventHandlers = new Map();

    // SignalM uses built-in exponential backoff, reconnectInterval is ignored
    this.connection = new SignalMConnection(hubUrl, {
      debug: this.debugLogging
    });

    this.setupEventHandlers();
  }

  /**
   * Setup SignalM event handlers
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

    // Handle predicted patches (sent immediately for instant feedback)
    this.connection.on('ApplyPrediction', (data: { componentId: string, patches: Patch[], confidence: number }) => {
      this.log(`ApplyPrediction (${(data.confidence * 100).toFixed(0)}% confident)`, { componentId: data.componentId, patches: data.patches });
      this.emit('applyPrediction', { componentId: data.componentId, patches: data.patches, confidence: data.confidence });
    });

    // Handle correction if prediction was wrong
    this.connection.on('ApplyCorrection', (data: { componentId: string, patches: Patch[] }) => {
      this.log('ApplyCorrection (prediction was incorrect)', { componentId: data.componentId, patches: data.patches });
      this.emit('applyCorrection', { componentId: data.componentId, patches: data.patches });
    });

    // Handle hint queueing (usePredictHint)
    this.connection.on('QueueHint', (data: {
      componentId: string,
      hintId: string,
      patches: Patch[],
      confidence: number,
      predictedState: Record<string, any>
    }) => {
      this.log(`QueueHint '${data.hintId}' (${(data.confidence * 100).toFixed(0)}% confident)`, {
        componentId: data.componentId,
        patches: data.patches
      });
      this.emit('queueHint', data);
    });

    // Handle errors from server
    this.connection.on('Error', (message: string) => {
      console.error('[Minimact] Server error:', message);
      this.emit('error', { message });
    });

    // Handle reconnection
    this.connection.onReconnecting(() => {
      this.log('Reconnecting...');
      this.emit('reconnecting', {});
    });

    this.connection.onReconnected(() => {
      this.log('Reconnected');
      this.emit('reconnected', { connectionId: null }); // SignalM doesn't expose connectionId
    });

    this.connection.onDisconnected(() => {
      this.log('Connection closed');
      this.emit('closed', {});
    });

    this.connection.onConnected(() => {
      this.log('Connected to Minimact hub');
      this.emit('connected', { connectionId: null }); // SignalM doesn't expose connectionId
    });
  }

  /**
   * Start the SignalM connection
   */
  async start(): Promise<void> {
    try {
      await this.connection.start();
      // Connected event already emitted by onConnected handler
    } catch (error) {
      console.error('[Minimact] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Stop the SignalM connection
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
   * Update client state on the server (single key-value)
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
   * Update multiple client-computed state values on the server
   * Used for external library computations (lodash, moment, etc.)
   */
  async updateClientComputedState(componentId: string, computedValues: Record<string, any>): Promise<void> {
    try {
      await this.connection.invoke('UpdateClientComputedState', componentId, computedValues);
      this.log('Updated client-computed state', { componentId, computedValues });
    } catch (error) {
      console.error('[Minimact] Failed to update client-computed state:', error);
      throw error;
    }
  }

  /**
   * Update component state on the server (from useState hook)
   * This keeps server state in sync with client state changes
   */
  async updateComponentState(componentId: string, stateKey: string, value: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateComponentState', componentId, stateKey, value);
      this.log('Updated component state', { componentId, stateKey, value });
    } catch (error) {
      console.error('[Minimact] Failed to update component state:', error);
      throw error;
    }
  }

  /**
   * Update DOM element state on the server (from useDomElementState hook)
   * This keeps server aware of DOM changes for accurate rendering
   */
  async updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateDomElementState', componentId, stateKey, snapshot);
      this.log('Updated DOM element state', { componentId, stateKey, snapshot });
    } catch (error) {
      console.error('[Minimact] Failed to update DOM element state:', error);
      throw error;
    }
  }

  /**
   * Update component state with array operation metadata
   * This provides semantic intent for array mutations, enabling precise template extraction
   */
  async updateComponentStateWithOperation(
    componentId: string,
    stateKey: string,
    newValue: any,
    operation: ArrayOperation
  ): Promise<void> {
    try {
      await this.connection.invoke('UpdateComponentStateWithOperation', componentId, stateKey, newValue, operation);
      this.log('Updated component state with operation', { componentId, stateKey, operation, newValue });
    } catch (error) {
      console.error('[Minimact] Failed to update component state with operation:', error);
      throw error;
    }
  }

  /**
   * Update query results on the server (from useDomQuery hook)
   * This keeps server aware of query results for accurate rendering
   */
  async updateQueryResults(componentId: string, queryKey: string, results: any[]): Promise<void> {
    try {
      await this.connection.invoke('UpdateQueryResults', componentId, queryKey, results);
      this.log('Updated query results', { componentId, queryKey, resultCount: results.length });
    } catch (error) {
      console.error('[Minimact] Failed to update query results:', error);
      throw error;
    }
  }

  /**
   * Generic invoke method for calling server hub methods
   */
  async invoke(methodName: string, ...args: any[]): Promise<void> {
    try {
      await this.connection.invoke(methodName, ...args);
      this.log(`Invoked ${methodName}`, { args });
    } catch (error) {
      console.error(`[Minimact] Failed to invoke ${methodName}:`, error);
      throw error;
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
      console.log(`[Minimact SignalM] ${message}`, data || '');
    }
  }

  /**
   * Get connection state
   * Maps SignalM ConnectionState to SignalR HubConnectionState for compatibility
   */
  get state(): string {
    return this.connection.connectionState;
  }

  /**
   * Get connection ID
   * SignalM doesn't expose connection IDs (always returns null)
   */
  get connectionId(): string | null {
    return null;
  }
}
