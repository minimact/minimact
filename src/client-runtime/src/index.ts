import { SignalRManager } from './signalr-manager';
import { DOMPatcher } from './dom-patcher';
import { ClientStateManager } from './client-state';
import { EventDelegation } from './event-delegation';
import { HydrationManager } from './hydration';
import { HintQueue } from './hint-queue';
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
  }

  /**
   * Subscribe to client state changes
   */
  subscribeToState(componentId: string, key: string, callback: (value: any) => void): () => void {
    return this.clientState.subscribe(componentId, key, callback);
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
export { useState, useEffect, useRef } from './hooks';
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
