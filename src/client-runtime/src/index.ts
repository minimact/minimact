import { SignalMManager } from './signalm-manager';
import { DOMPatcher } from './dom-patcher';
import { ClientStateManager } from './client-state';
import { EventDelegation } from './event-delegation';
import { HydrationManager } from './hydration';
import { HintQueue } from './hint-queue';
import { PlaygroundBridge } from './playground-bridge';
import { HotReloadManager } from './hot-reload';
import { MinimactComponentRegistry } from './component-registry';
import * as ClientComputed from './client-computed';
import { MinimactOptions, Patch } from './types';
import { templateState } from './template-state';

/**
 * Main Minimact client runtime
 * Orchestrates SignalM (lightweight WebSocket), DOM patching, state management, and hydration
 *
 * Bundle size: ~10 KB gzipped (vs 25 KB with SignalR)
 */
export class Minimact {
  private signalR: SignalMManager;
  public domPatcher: DOMPatcher; // Public for HotReloadManager access
  private clientState: ClientStateManager;
  private hydration: HydrationManager;
  private hintQueue: HintQueue;
  private playgroundBridge: PlaygroundBridge;
  public componentRegistry: MinimactComponentRegistry; // Public for HotReloadManager access
  private hotReload: HotReloadManager | null = null;
  private eventDelegation: EventDelegation | null = null;
  private options: Required<MinimactOptions>;
  private rootElement: HTMLElement;

  constructor(rootElement: HTMLElement | string = document.body, options: MinimactOptions = {}) {
    // Resolve root element
    if (typeof rootElement === 'string') {
      const element = document.querySelector(rootElement);
      if (!element) {
        throw new Error(`[Minimact] Root element not found: ${rootElement}`);
      }
      this.rootElement = element as HTMLElement;
    } else {
      this.rootElement = rootElement;
    }

    // Default options
    this.options = {
      hubUrl: options.hubUrl || '/minimact',
      enableDebugLogging: options.enableDebugLogging || false,
      reconnectInterval: options.reconnectInterval || 5000,
      enableHotReload: options.enableHotReload !== false, // Default to true
      hotReloadWsUrl: options.hotReloadWsUrl
    };

    // Initialize subsystems (using lightweight SignalM!)
    this.signalR = new SignalMManager(this.options.hubUrl, {
      reconnectInterval: this.options.reconnectInterval,
      debugLogging: this.options.enableDebugLogging
    });

    this.domPatcher = new DOMPatcher({
      debugLogging: this.options.enableDebugLogging,
      templateState: templateState
    });

    this.clientState = new ClientStateManager({
      debugLogging: this.options.enableDebugLogging
    });

    this.hydration = new HydrationManager(this.clientState, {
      debugLogging: this.options.enableDebugLogging
    });

    this.hintQueue = new HintQueue({
      debugLogging: this.options.enableDebugLogging
    });

    this.playgroundBridge = new PlaygroundBridge({
      debugLogging: this.options.enableDebugLogging
    });

    this.componentRegistry = new MinimactComponentRegistry();

    // Initialize hot reload if enabled
    if (this.options.enableHotReload) {
      this.hotReload = new HotReloadManager(this, {
        enabled: true,
        wsUrl: this.options.hotReloadWsUrl,
        debounceMs: 50,
        showNotifications: true,
        logLevel: this.options.enableDebugLogging ? 'debug' : 'info'
      });
    }

    // Enable debug logging for client-computed module
    ClientComputed.setDebugLogging(this.options.enableDebugLogging);

    this.log('Minimact initialized', { rootElement: this.rootElement, options: this.options });
  }

  /**
   * Start the Minimact runtime
   */
  async start(): Promise<void> {
    // Setup SignalR handlers BEFORE starting connection
    this.setupSignalRHandlers();

    // Connect to SignalR hub
    await this.signalR.start();

    // Hydrate all components
    this.hydration.hydrateAll();

    // Register hydrated components in registry
    console.log('[Minimact] 🔍 Registering hydrated components...');
    this.registerHydratedComponents();
    console.log('[Minimact] 📊 Registry stats:', this.componentRegistry.getStats());

    // Setup event delegation
    this.eventDelegation = new EventDelegation(
      this.rootElement,
      (componentId, methodName, args) => this.signalR.invokeComponentMethod(componentId, methodName, args),
      { debugLogging: this.options.enableDebugLogging }
    );

    // Register all components with server
    await this.registerAllComponents();

    this.log('Minimact started');
  }

  /**
   * Stop the Minimact runtime
   */
  async stop(): Promise<void> {
    if (this.eventDelegation) {
      this.eventDelegation.destroy();
      this.eventDelegation = null;
    }

    await this.signalR.stop();

    this.log('Minimact stopped');
  }

  /**
   * Setup SignalR event handlers
   */
  private setupSignalRHandlers(): void {
    // Handle full HTML updates
    this.signalR.on('updateComponent', ({ componentId, html }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.replaceHTML(component.element, html);
        this.log('Component HTML updated', { componentId });
      }
    });

    // Handle patch updates
    this.signalR.on('applyPatches', ({ componentId, patches }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.applyPatches(component.element, patches as Patch[], component.type);
        this.log('Patches applied', { componentId, patchCount: patches.length });
      }
    });

    // Handle predicted patches (instant UI updates!)
    this.signalR.on('applyPrediction', ({ componentId, patches, confidence }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.applyPatches(component.element, patches as Patch[], component.type);
        this.log(`Prediction applied (${(confidence * 100).toFixed(0)}% confident)`, { componentId, patchCount: patches.length });
      }
    });

    // Handle corrections if prediction was wrong
    this.signalR.on('applyCorrection', ({ componentId, patches }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.applyPatches(component.element, patches as Patch[], component.type);
        this.log('Correction applied (prediction was incorrect)', { componentId, patchCount: patches.length });
      }
    });

    // Handle hint queueing (usePredictHint)
    this.signalR.on('queueHint', (data) => {
      this.hintQueue.queueHint(data);
      this.log(`Hint '${data.hintId}' queued for component ${data.componentId}`, {
        patchCount: data.patches.length,
        confidence: (data.confidence * 100).toFixed(0) + '%'
      });

      // Notify playground that prediction was received
      this.playgroundBridge.predictionReceived({
        componentId: data.componentId,
        hintId: data.hintId,
        patchCount: data.patches.length,
        confidence: data.confidence
      });
    });

    // Handle reconnection
    this.signalR.on('reconnected', async () => {
      this.log('Reconnected - re-registering components');
      await this.registerAllComponents();
    });

    // Handle server reducer state updates
    this.signalR.on('UpdateServerReducerState', ({ componentId, reducerId, state, error }) => {
      const component = this.hydration.getComponent(componentId);
      if (component && component.context.serverReducers) {
        const reducer = component.context.serverReducers.get(reducerId);
        if (reducer) {
          reducer._updateFromServer(state, error);
          this.log('Server reducer state updated', { componentId, reducerId });
        }
      }
    });

    // Handle hot reload messages
    this.signalR.on('HotReload:TemplateMap', (data) => {
      console.log('[Minimact] 📨 HotReload:TemplateMap received:', data);
      console.log('[Minimact] 🔍 HotReload manager exists?', !!this.hotReload);
      if (this.hotReload) {
        this.log('Received template map', { componentId: data.componentId });
        // Forward to hot reload manager
        (this.hotReload as any).handleMessage({
          type: 'template-map',
          ...data
        });
      } else {
        console.warn('[Minimact] ⚠️ HotReload manager not initialized, cannot process template map');
      }
    });

    this.signalR.on('HotReload:TemplatePatch', (data) => {
      if (this.hotReload) {
        this.log('Received template patch', { componentId: data.componentId });
        // Forward to hot reload manager
        (this.hotReload as any).handleMessage({
          type: 'template-patch',
          ...data
        });
      }
    });

    this.signalR.on('HotReload:FileChange', (data) => {
      if (this.hotReload) {
        this.log('Received file change', { componentId: data.componentId });
        // Forward to hot reload manager
        (this.hotReload as any).handleMessage({
          type: 'file-change',
          ...data
        });
      }
    });

    this.signalR.on('HotReload:Error', (data) => {
      if (this.hotReload) {
        console.error('[Minimact Hot Reload] Error:', data.error);
      }
    });

    // Handle errors
    this.signalR.on('error', ({ message }) => {
      console.error('[Minimact] Server error:', message);
    });
  }

  /**
   * Register all components with the server
   */
  private async registerAllComponents(): Promise<void> {
    const components = document.querySelectorAll('[data-minimact-component]');

    for (const element of Array.from(components)) {
      const componentId = element.getAttribute('data-minimact-component');
      if (componentId) {
        try {
          await this.signalR.registerComponent(componentId);
          this.log('Registered component', { componentId });
        } catch (error) {
          console.error('[Minimact] Failed to register component:', componentId, error);
        }
      }
    }
  }

  /**
   * Manually hydrate a component
   */
  hydrateComponent(componentId: string, element: HTMLElement): void {
    this.hydration.hydrateComponent(componentId, element);
  }

  /**
   * Get component by ID (for hot reload)
   */
  getComponent(componentId: string): any {
    return this.hydration.getComponent(componentId);
  }

  /**
   * Register all hydrated components in the registry
   * Extracts component type from ViewModel metadata
   */
  private registerHydratedComponents(): void {
    // Get ViewModel with component metadata
    const viewModel = (window as any).__MINIMACT_VIEWMODEL__;
    if (!viewModel || !viewModel._componentType || !viewModel._componentId) {
      console.warn('[Minimact] ViewModel metadata missing _componentType or _componentId');
      return;
    }

    const componentType = viewModel._componentType;
    const instanceId = viewModel._componentId;

    // Find the component element
    const element = document.querySelector(`[data-minimact-component-id="${instanceId}"]`) as HTMLElement;
    if (!element) {
      console.warn(`[Minimact] Component element not found for ${instanceId}`);
      return;
    }

    // Get component metadata from hydration
    const component = this.hydration.getComponent(instanceId);
    if (!component) {
      console.warn(`[Minimact] Component not hydrated for ${instanceId}`);
      return;
    }

    // Update component metadata with type
    component.type = componentType;

    // Register in registry
    this.componentRegistry.register({
      type: componentType,
      instanceId: instanceId,
      element: element,
      context: component.context
    });

    console.log(`[Minimact] Registered ${componentType} (${instanceId.substring(0, 8)}...) in registry`);
  }

  /**
   * Get client state for a component
   */
  getClientState(componentId: string, key: string): any {
    return this.clientState.getState(componentId, key);
  }

  /**
   * Set client state for a component
   */
  setClientState(componentId: string, key: string, value: any): void {
    this.clientState.setState(componentId, key, value);

    // Recompute client-computed variables that depend on this state
    this.recomputeAndSyncClientState(componentId, key);
  }

  /**
   * Subscribe to client state changes
   */
  subscribeToState(componentId: string, key: string, callback: (value: any) => void): () => void {
    return this.clientState.subscribe(componentId, key, callback);
  }

  /**
   * Recompute client-computed variables after state change and sync to server
   */
  private async recomputeAndSyncClientState(componentId: string, changedStateKey?: string): Promise<void> {
    // Check if component has any client-computed variables
    if (!ClientComputed.hasClientComputed(componentId)) {
      return;
    }

    // Compute affected variables
    const computed = changedStateKey
      ? ClientComputed.computeDependentVariables(componentId, changedStateKey)
      : ClientComputed.computeAllForComponent(componentId);

    // If there are computed values, send to server
    if (Object.keys(computed).length > 0) {
      try {
        await this.signalR.updateClientComputedState(componentId, computed);
        this.log('Client-computed state synced', { componentId, computed });
      } catch (error) {
        console.error('[Minimact] Failed to sync client-computed state:', error);
      }
    }
  }

  /**
   * Get SignalR connection state
   */
  get connectionState(): string {
    return this.signalR.state.toString();
  }

  /**
   * Get SignalR connection ID
   */
  get connectionId(): string | null {
    return this.signalR.connectionId;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.options.enableDebugLogging) {
      console.log(`[Minimact] ${message}`, data || '');
    }
  }
}

// Export all types and classes for advanced usage
export { SignalMManager } from './signalm-manager';
export { DOMPatcher } from './dom-patcher';
export { ClientStateManager } from './client-state';
export { EventDelegation } from './event-delegation';
export { HydrationManager } from './hydration';
export { HintQueue } from './hint-queue';
export { HotReloadManager } from './hot-reload';
export type { HotReloadConfig, HotReloadMessage, HotReloadMetrics } from './hot-reload';

// Client-computed state (for external libraries)
export {
  registerClientComputed,
  computeVariable,
  computeAllForComponent,
  computeDependentVariables,
  getLastValue,
  getAllLastValues,
  hasClientComputed,
  getComputedVariableNames,
  clearComponent as clearClientComputedComponent,
  getDebugInfo as getClientComputedDebugInfo
} from './client-computed';

// Template state (for hot reload)
export { TemplateStateManager, templateState } from './template-state';
export type { Template, TemplateMap } from './template-state';

// Template renderer (for runtime prediction)
export { TemplateRenderer } from './template-renderer';

// Core hooks
export { useState, useEffect, useRef, useServerTask, useServerReducer, useMarkdown, setComponentContext, clearComponentContext, ComponentContext } from './hooks';

// useComputed hook (for client-side computation with browser APIs/libraries)
export { useComputed } from './useComputed';
export type { UseComputedOptions } from './useComputed';

// Context hooks
export { createContext, useContext, setContextHookContext, clearContextHookContext } from './useContext';
export type { Context, ContextOptions } from './useContext';

// Server task types
export type { ServerTask, ServerTaskOptions, ServerTaskStatus } from './server-task';

// Server reducer types
export type { ServerReducer } from './server-reducer';

// Paginated server task
export { usePaginatedServerTask } from './usePaginatedServerTask';
export type { PaginatedServerTask, PaginatedServerTaskOptions, PaginationParams } from './usePaginatedServerTask';

// Pub/Sub hooks
export { usePub, useSub } from './pub-sub';
export type { PubSubMessage } from './pub-sub';

// Task scheduling hooks
export { useMicroTask, useMacroTask, useAnimationFrame, useIdleCallback } from './task-scheduling';

// SignalR hook (lightweight SignalM implementation)
export { useSignalR } from './signalr-hook-m';
export type { SignalRHookState } from './signalr-hook-m';

// Component Registry
export { MinimactComponentRegistry } from './component-registry';
export type { ComponentMetadata } from './component-registry';

// Types
export * from './types';

// Auto-initialize if data-minimact-auto-init is present
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.hasAttribute('data-minimact-auto-init')) {
        const minimact = new Minimact(document.body, {
          enableDebugLogging: document.body.hasAttribute('data-minimact-debug')
        });
        minimact.start().catch(console.error);
        (window as any).minimact = minimact;
      }
    });
  } else {
    if (document.body.hasAttribute('data-minimact-auto-init')) {
      const minimact = new Minimact(document.body, {
        enableDebugLogging: document.body.hasAttribute('data-minimact-debug')
      });
      minimact.start().catch(console.error);
      (window as any).minimact = minimact;
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).Minimact = Minimact;
}

export default Minimact;
