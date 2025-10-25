/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */

import type {
  EntanglementConfig,
  EntanglementBinding,
  QuantumLink,
  MutationVector,
  QuantumMutationEvent,
  RegisterEntanglementRequest
} from './types';
import {
  serializeMutation,
  applyMutationVector,
  getElementSelector
} from './mutation-serializer';

/**
 * Entanglement Manager - Client Side
 *
 * Manages quantum links between local and remote elements
 */
export class EntanglementManager {
  private clientId: string;
  private signalR: any;
  private bindings: Map<string, EntanglementBinding> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private debugLogging: boolean;

  constructor(config: EntanglementConfig) {
    this.clientId = config.clientId;
    this.signalR = config.signalR;
    this.debugLogging = config.debugLogging || false;

    this.setupListeners();
  }

  /**
   * Entangle a local element with a remote element
   *
   * @example
   * ```typescript
   * const link = await manager.entangle(
   *   document.querySelector('#slider'),
   *   { clientId: 'user-b', selector: '#slider' },
   *   'bidirectional'
   * );
   * ```
   */
  async entangle(
    localElement: Element,
    remoteElement: { clientId: string; selector: string },
    mode: 'mirror' | 'inverse' | 'bidirectional' = 'bidirectional'
  ): Promise<QuantumLink> {
    const selector = getElementSelector(localElement);
    const entanglementId = `${this.clientId}:${selector}→${remoteElement.clientId}:${remoteElement.selector}`;

    // Create binding
    const binding: EntanglementBinding = {
      entanglementId,
      sourceClient: this.clientId,
      targetClient: remoteElement.clientId,
      page: window.location.pathname,
      selector,
      mode,
      scope: 'private'
    };

    this.bindings.set(entanglementId, binding);

    // Register with server
    await this.registerWithServer(binding);

    // Attach MutationObserver to local element
    this.attachObserver(entanglementId, localElement, binding);

    // If bidirectional, listen for changes from remote
    if (mode === 'bidirectional') {
      this.subscribeToRemoteChanges(entanglementId);
    }

    this.log(`✨ Entangled element '${selector}' with ${remoteElement.clientId}`);

    // Return quantum link
    const link: QuantumLink = {
      id: entanglementId,
      localElement,
      remoteElement,
      mode,
      active: true,
      disentangle: () => this.disentangle(entanglementId)
    };

    return link;
  }

  /**
   * Entangle with ALL clients on same page
   */
  async entangleWithAll(
    localElement: Element,
    mode: 'mirror' | 'inverse' = 'mirror'
  ): Promise<QuantumLink> {
    return this.entangle(
      localElement,
      { clientId: '*', selector: getElementSelector(localElement) },
      mode
    );
  }

  /**
   * Disentangle (break quantum link)
   */
  async disentangle(entanglementId: string): Promise<void> {
    // Remove observer
    const observer = this.observers.get(entanglementId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(entanglementId);
    }

    // Remove binding
    this.bindings.delete(entanglementId);

    // Unregister from server
    await this.signalR.invoke('UnregisterQuantumEntanglement', {
      entanglementId
    });

    this.log(`💔 Disentangled: ${entanglementId}`);
  }

  /**
   * Register entanglement with server
   */
  private async registerWithServer(binding: EntanglementBinding): Promise<void> {
    const request: RegisterEntanglementRequest = {
      sourceClient: binding.sourceClient,
      targetClient: binding.targetClient,
      page: binding.page,
      selector: binding.selector,
      mode: binding.mode,
      scope: binding.scope
    };

    await this.signalR.invoke('RegisterQuantumEntanglement', request);
    this.log(`📡 Registered entanglement with server: ${binding.entanglementId}`);
  }

  /**
   * Attach MutationObserver to local element
   */
  private attachObserver(
    entanglementId: string,
    element: Element,
    binding: EntanglementBinding
  ): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Serialize mutation to vector
        const vector = serializeMutation(mutation, binding.selector);

        // Propagate to server
        this.propagateMutation(entanglementId, vector);
      });
    });

    // Observe all changes
    observer.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });

    this.observers.set(entanglementId, observer);

    // Also observe input events (value changes don't trigger MutationObserver)
    if (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) {
      element.addEventListener('input', () => {
        const vector: MutationVector = {
          type: 'value',
          target: binding.selector,
          newValue: element.value,
          timestamp: Date.now()
        };
        this.propagateMutation(entanglementId, vector);
      });
    }

    this.log(`👁️ Observing element for mutations: ${binding.selector}`);
  }

  /**
   * Propagate mutation to server
   */
  private async propagateMutation(
    entanglementId: string,
    vector: MutationVector
  ): Promise<void> {
    try {
      await this.signalR.invoke('PropagateQuantumMutation', {
        entanglementId,
        sourceClient: this.clientId,
        vector
      });

      this.log(`🌀 Propagated mutation: ${vector.type} on ${vector.target}`);
    } catch (error) {
      console.error('[minimact-quantum] Failed to propagate mutation:', error);
    }
  }

  /**
   * Subscribe to remote changes for bidirectional entanglement
   */
  private subscribeToRemoteChanges(entanglementId: string): void {
    // Already set up in setupListeners()
    this.log(`🔄 Subscribed to bidirectional mutations for ${entanglementId}`);
  }

  /**
   * Setup SignalR listeners for incoming quantum mutations
   */
  private setupListeners(): void {
    this.signalR.on('QuantumMutation', (event: QuantumMutationEvent) => {
      // Don't apply our own mutations
      if (event.sourceClient === this.clientId) {
        return;
      }

      // Check if we have this entanglement
      const binding = this.bindings.get(event.entanglementId);
      if (!binding) {
        return;
      }

      // Apply mutation to local element
      applyMutationVector(event.vector);

      this.log(
        `✨ Applied quantum mutation from ${event.sourceClient}: ` +
        `${event.vector.type} on ${event.vector.target}`
      );

      // Emit awareness event
      this.emitAwarenessEvent(event);
    });

    this.log('🎧 SignalR listeners registered for quantum mutations');
  }

  /**
   * Emit awareness event (for showing who made the change)
   */
  private emitAwarenessEvent(event: QuantumMutationEvent): void {
    const element = document.querySelector(event.vector.target);
    if (!element) return;

    element.dispatchEvent(new CustomEvent('quantum-awareness', {
      bubbles: true,
      detail: {
        sourceClient: event.sourceClient,
        timestamp: event.timestamp,
        mutationType: event.vector.type
      }
    }));
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: any[]): void {
    if (this.debugLogging) {
      console.log(`[minimact-quantum] ${message}`, ...args);
    }
  }
}
