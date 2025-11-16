import { ISignalMTransport, WebSocketTransport, ConnectionState } from './signalm/index';
import { Patch } from './types';
import { ArrayOperation } from './hooks';
import { DEBUG_MODE } from './debug-config';

/**
 * Manages SignalM connection to the Minimact server hub
 *
 * Drop-in replacement for SignalRManager using lightweight SignalM
 * Bundle size: ~3 KB gzipped (vs 18 KB with SignalR)
 *
 * SignalM² - Now supports pluggable transports (WebSocket, Tauri IPC, etc.)
 */
export class SignalMManager {
  private transport: ISignalMTransport;
  private debugLogging: boolean;
  private eventHandlers: Map<string, Set<Function>>;

  /**
   * Create SignalMManager with a custom transport
   */
  constructor(transport: ISignalMTransport, options: { debugLogging?: boolean } = {}) {
    this.transport = transport;
    this.debugLogging = options.debugLogging || false;
    this.eventHandlers = new Map();

    this.setupEventHandlers();
  }

  /**
   * Create SignalMManager with default WebSocket transport
   * (Backward compatible with old constructor)
   */
  static createDefault(hubUrl: string = '/minimact', options: { debugLogging?: boolean } = {}): SignalMManager {
    return new SignalMManager(
      new WebSocketTransport(hubUrl, { debug: options.debugLogging }),
      options
    );
  }

  /**
   * Create SignalMManager with WebSocket transport
   */
  static createWebTransport(url: string, options: { debugLogging?: boolean } = {}): SignalMManager {
    return new SignalMManager(
      new WebSocketTransport(url, { debug: options.debugLogging }),
      options
    );
  }

  /**
   * Auto-detect environment and create appropriate transport
   * - Uses Tauri transport if running in Tauri (must be provided via options)
   * - Uses WebSocket transport otherwise
   */
  static createAuto(fallbackUrl?: string, options: { debugLogging?: boolean; tauriTransport?: any } = {}): SignalMManager {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      if (!options.tauriTransport) {
        throw new Error('[SignalM²] Tauri environment detected but no TauriTransport provided. Import TauriTransport and pass it via options.tauriTransport');
      }
      console.log('[SignalM²] Detected Tauri environment → Using Tauri transport');
      return new SignalMManager(new options.tauriTransport(), options);
    }

    console.log('[SignalM²] Web environment → Using WebSocket transport');
    return SignalMManager.createWebTransport(fallbackUrl || '/minimact', options);
  }

  /**
   * Setup SignalM event handlers
   */
  private setupEventHandlers(): void {
    // Handle component updates from server
    this.transport.on('UpdateComponent', (componentId: string, html: string) => {
      this.log('UpdateComponent', { componentId, html });
      this.emit('updateComponent', { componentId, html });
    });

    // Handle patch updates from server
    this.transport.on('ApplyPatches', (componentId: string, patches: Patch[]) => {
      this.log('ApplyPatches', { componentId, patches });
      this.emit('applyPatches', { componentId, patches });
    });

    // Handle predicted patches (sent immediately for instant feedback)
    this.transport.on('ApplyPrediction', (data: { componentId: string, patches: Patch[], confidence: number }) => {
      this.log(`ApplyPrediction (${(data.confidence * 100).toFixed(0)}% confident)`, { componentId: data.componentId, patches: data.patches });
      this.emit('applyPrediction', { componentId: data.componentId, patches: data.patches, confidence: data.confidence });
    });

    // Handle correction if prediction was wrong
    this.transport.on('ApplyCorrection', (data: { componentId: string, patches: Patch[] }) => {
      this.log('ApplyCorrection (prediction was incorrect)', { componentId: data.componentId, patches: data.patches });
      this.emit('applyCorrection', { componentId: data.componentId, patches: data.patches });
    });

    // Handle hint queueing (usePredictHint)
    this.transport.on('QueueHint', (data: {
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
    this.transport.on('Error', (message: string) => {
      console.error('[Minimact] Server error:', message);
      this.emit('error', { message });
    });

    // Handle hot reload messages
    this.transport.on('HotReload:TemplateMap', (data: any) => {
      this.log('HotReload:TemplateMap', data);
      this.emit('HotReload:TemplateMap', data);
    });

    this.transport.on('HotReload:TemplatePatch', (data: any) => {
      this.log('HotReload:TemplatePatch', data);
      this.emit('HotReload:TemplatePatch', data);
    });

    this.transport.on('HotReload:FileChange', (data: any) => {
      this.log('HotReload:FileChange', data);
      this.emit('HotReload:FileChange', data);
    });

    this.transport.on('HotReload:Error', (data: any) => {
      console.error('[Minimact Hot Reload] Error:', data.error);
      this.emit('HotReload:Error', data);
    });

    // Handle reconnection (optional methods)
    if (this.transport.onReconnecting) {
      this.transport.onReconnecting(() => {
        this.log('Reconnecting...');
        this.emit('reconnecting', {});
      });
    }

    if (this.transport.onReconnected) {
      this.transport.onReconnected(() => {
        this.log('Reconnected');
        this.emit('reconnected', { connectionId: null });
      });
    }

    if (this.transport.onClose) {
      this.transport.onClose(() => {
        this.log('Connection closed');
        this.emit('closed', {});
      });
    }

    if (this.transport.onConnected) {
      this.transport.onConnected(() => {
        this.log('Connected to Minimact hub');
        this.emit('connected', { connectionId: null });
      });
    }
  }

  /**
   * Start the SignalM connection
   */
  async start(): Promise<void> {
    try {
      await this.transport.connect();
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
    await this.transport.disconnect();
    this.log('Disconnected from Minimact hub');
  }

  /**
   * Register a component with the server
   */
  async registerComponent(componentId: string): Promise<void> {
    try {
      await this.transport.send('RegisterComponent', componentId);
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
      await this.transport.send('InvokeComponentMethod', componentId, methodName, argsJson);
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
      await this.transport.send('UpdateClientState', componentId, key, valueJson);
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
      await this.transport.send('UpdateClientComputedState', componentId, computedValues);
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
      await this.transport.send('UpdateComponentState', componentId, stateKey, value);
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
      await this.transport.send('UpdateDomElementState', componentId, stateKey, snapshot);
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
      await this.transport.send('UpdateComponentStateWithOperation', componentId, stateKey, newValue, operation);
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
      await this.transport.send('UpdateQueryResults', componentId, queryKey, results);
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
      await this.transport.send(methodName, ...args);
      this.log(`Invoked ${methodName}`, { args });
    } catch (error) {
      console.error(`[Minimact] Failed to invoke ${methodName}:`, error);
      throw error;
    }
  }

  /**
   * Send debug message to server for centralized debugging
   * Set a breakpoint in MinimactHub.DebugMessage to inspect client state
   *
   * Only sends to server if DEBUG_MODE is enabled (use setDebugMode(true))
   * Always logs locally regardless of DEBUG_MODE
   */
  async debug(category: string, message: string, data?: any): Promise<void> {
    // Always log locally
    console.log(`[DEBUG] [${category}] ${message}`, data !== undefined ? data : '');

    // Only send to server if DEBUG_MODE is enabled
    if (!DEBUG_MODE) {
      return;
    }

    try {
      await this.transport.send('DebugMessage', category, message, data);
    } catch (error) {
      console.error('[Minimact] Failed to send debug message to server:', error);
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
   * Returns true if connected, false otherwise
   */
  get state(): string {
    return this.transport.isConnected() ? 'Connected' : 'Disconnected';
  }

  /**
   * Get connection ID
   * SignalM doesn't expose connection IDs (always returns null)
   */
  get connectionId(): string | null {
    return null;
  }
}
