import { SignalRManager } from './signalr-manager';
import { DOMPatcher } from './dom-patcher';
import { ClientStateManager } from './client-state';
import { EventDelegation } from './event-delegation';
import { HydrationManager } from './hydration';
import { HintQueue } from './hint-queue';
import { PlaygroundBridge } from './playground-bridge';
import { HotReloadManager } from './hot-reload';
import * as ClientComputed from './client-computed';
import { MinimactOptions, Patch } from './types';

/**
 * Main Minimact client runtime
 * Orchestrates SignalR, DOM patching, state management, and hydration
 */
export class Minimact {
  private signalR: SignalRManager;
  private domPatcher: DOMPatcher;
  private clientState: ClientStateManager;
  private hydration: HydrationManager;
  private hintQueue: HintQueue;
  private playgroundBridge: PlaygroundBridge;
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
      reconnectInterval: options.reconnectInterval || 5000
    };

    // Initialize subsystems
    this.signalR = new SignalRManager(this.options.hubUrl, {
      reconnectInterval: this.options.reconnectInterval,
      debugLogging: this.options.enableDebugLogging
    });

    this.domPatcher = new DOMPatcher({
      debugLogging: this.options.enableDebugLogging
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

    // Enable debug logging for client-computed module
    ClientComputed.setDebugLogging(this.options.enableDebugLogging);

    this.setupSignalRHandlers();
    this.log('Minimact initialized', { rootElement: this.rootElement, options: this.options });
  }

  /**
   * Start the Minimact runtime
   */
  async start(): Promise<void> {
    // Connect to SignalR hub
    await this.signalR.start();

    // Hydrate all components
    this.hydration.hydrateAll();

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
        this.domPatcher.applyPatches(component.element, patches as Patch[]);
        this.log('Patches applied', { componentId, patchCount: patches.length });
      }
    });

    // Handle predicted patches (instant UI updates!)
    this.signalR.on('applyPrediction', ({ componentId, patches, confidence }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.applyPatches(component.element, patches as Patch[]);
        this.log(`Prediction applied (${(confidence * 100).toFixed(0)}% confident)`, { componentId, patchCount: patches.length });
      }
    });

    // Handle corrections if prediction was wrong
    this.signalR.on('applyCorrection', ({ componentId, patches }) => {
      const component = this.hydration.getComponent(componentId);
      if (component) {
        this.domPatcher.applyPatches(component.element, patches as Patch[]);
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
export { SignalRManager } from './signalr-manager';
export { DOMPatcher } from './dom-patcher';
export { ClientStateManager } from './client-state';
export { EventDelegation } from './event-delegation';
export { HydrationManager } from './hydration';
export { HintQueue } from './hint-queue';

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
export { useState, useEffect, useRef, useServerTask, setComponentContext, clearComponentContext } from './hooks';
export type { ComponentContext } from './hooks';

// useComputed hook (for client-side computation with browser APIs/libraries)
export { useComputed } from './useComputed';
export type { UseComputedOptions } from './useComputed';

// Context hooks
export { createContext, useContext, setContextHookContext, clearContextHookContext } from './useContext';
export type { Context, ContextOptions } from './useContext';

// Server task types
export type { ServerTask, ServerTaskOptions, ServerTaskStatus } from './server-task';

// Paginated server task
export { usePaginatedServerTask } from './usePaginatedServerTask';
export type { PaginatedServerTask, PaginatedServerTaskOptions, PaginationParams } from './usePaginatedServerTask';

// Pub/Sub hooks
export { usePub, useSub } from './pub-sub';
export type { PubSubMessage } from './pub-sub';

// Task scheduling hooks
export { useMicroTask, useMacroTask, useAnimationFrame, useIdleCallback } from './task-scheduling';

// SignalR hook
export { useSignalR } from './signalr-hook';
export type { SignalRHookState } from './signalr-hook';

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
