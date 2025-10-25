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
import { RetryQueue } from './retry-queue';
import {
  transform,
  transformBatch,
  compose,
  canCompose,
  type Operation
} from './operational-transform';

/**
 * Entanglement Manager - Client Side
 *
 * Manages quantum links between local and remote elements
 */
export class EntanglementManager {
  private clientId: string;
  private signalR: any;
  private sessionId?: string;
  private bindings: Map<string, EntanglementBinding> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private debugLogging: boolean;
  private retryQueue: RetryQueue;

  // Operational Transform support
  private pendingOperations: Map<string, Operation[]> = new Map(); // key: selector
  private localOperationBuffer: Map<string, Operation[]> = new Map(); // key: entanglementId

  constructor(config: EntanglementConfig) {
    this.clientId = config.clientId;
    this.signalR = config.signalR;
    this.sessionId = config.sessionId;
    this.debugLogging = config.debugLogging || false;
    this.retryQueue = new RetryQueue(this.signalR, this.clientId);

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

    // Persist for reconnection
    this.persistEntanglements();

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

    // Update persisted state
    this.persistEntanglements();

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
      scope: binding.scope,
      sessionId: this.sessionId // Include session for reconnection
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
   * Propagate mutation to server (with automatic retry on failure)
   */
  private async propagateMutation(
    entanglementId: string,
    vector: MutationVector
  ): Promise<void> {
    // Track local operation for OT (before sending)
    this.trackLocalOperation(entanglementId, vector);

    try {
      await this.signalR.invoke('PropagateQuantumMutation', {
        entanglementId,
        sourceClient: this.clientId,
        vector
      });

      this.log(`🌀 Propagated mutation: ${vector.type} on ${vector.target}`);
    } catch (error) {
      console.error('[minimact-quantum] Failed to propagate mutation, enqueueing for retry:', error);

      // Enqueue for automatic retry with exponential backoff
      await this.retryQueue.enqueue(entanglementId, vector);
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

      // Apply mutation with Operational Transform
      this.applyMutationWithOT(event.entanglementId, event.vector, event.sourceClient);

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
   * Persist entanglements to localStorage for reconnection
   */
  private persistEntanglements(): void {
    const bindingsArray = Array.from(this.bindings.values()).map(b => ({
      entanglementId: b.entanglementId,
      sourceClient: b.sourceClient,
      targetClient: b.targetClient,
      page: b.page,
      selector: b.selector,
      mode: b.mode,
      scope: b.scope
    }));

    try {
      localStorage.setItem('minimact-quantum-entanglements', JSON.stringify(bindingsArray));
      this.log(`💾 Persisted ${bindingsArray.length} entanglement(s) to localStorage`);
    } catch (error) {
      console.error('[minimact-quantum] Failed to persist entanglements:', error);
    }
  }

  /**
   * Restore entanglements from localStorage after reconnect
   */
  async reconnect(): Promise<void> {
    const stored = localStorage.getItem('minimact-quantum-entanglements');
    if (!stored) {
      this.log('🔄 No stored entanglements to restore');
      return;
    }

    try {
      const bindingsArray = JSON.parse(stored);
      this.log(`🔄 Restoring ${bindingsArray.length} entanglement(s)...`);

      let successCount = 0;
      let failCount = 0;

      for (const binding of bindingsArray) {
        const element = document.querySelector(binding.selector);
        if (element) {
          try {
            await this.entangle(
              element,
              {
                clientId: binding.targetClient,
                selector: binding.selector
              },
              binding.mode
            );
            successCount++;
          } catch (error) {
            console.error(
              `[minimact-quantum] Failed to restore entanglement ${binding.entanglementId}:`,
              error
            );
            failCount++;
          }
        } else {
          this.log(`⚠️ Element not found for selector: ${binding.selector}`);
          failCount++;
        }
      }

      this.log(`✅ Restored ${successCount}/${bindingsArray.length} entanglement(s)`);
      if (failCount > 0) {
        this.log(`⚠️ Failed to restore ${failCount} entanglement(s)`);
      }
    } catch (error) {
      console.error('[minimact-quantum] Failed to parse stored entanglements:', error);
      // Clear corrupt data
      localStorage.removeItem('minimact-quantum-entanglements');
    }
  }

  /**
   * Clear persisted entanglements
   */
  clearPersistedEntanglements(): void {
    localStorage.removeItem('minimact-quantum-entanglements');
    this.log('🧹 Cleared persisted entanglements');
  }

  /**
   * Convert MutationVector to Operation for OT processing
   */
  private mutationVectorToOperation(vector: MutationVector): Operation | null {
    const timestamp = vector.timestamp;

    switch (vector.type) {
      case 'value':
        // Text input change
        return {
          type: 'setProperty',
          propertyName: 'value',
          value: vector.newValue,
          oldValue: vector.oldValue,
          timestamp,
          clientId: this.clientId
        };

      case 'attributes':
        if (vector.attributeName) {
          return {
            type: 'setAttribute',
            attributeName: vector.attributeName,
            value: vector.newValue,
            oldValue: vector.oldValue,
            timestamp,
            clientId: this.clientId
          };
        }
        break;

      case 'characterData':
        // Text content change - treat as text operation
        // This is simplified - full implementation would track position
        return {
          type: 'setProperty',
          propertyName: 'textContent',
          value: vector.newValue,
          oldValue: vector.oldValue,
          timestamp,
          clientId: this.clientId
        };

      case 'style':
        return {
          type: 'setAttribute',
          attributeName: 'style',
          value: vector.newValue,
          oldValue: vector.oldValue,
          timestamp,
          clientId: this.clientId
        };

      // childList mutations are complex - skip OT for now
      case 'childList':
      case 'position':
        return null;
    }

    return null;
  }

  /**
   * Apply mutation with Operational Transform
   * Transforms the mutation against pending operations before applying
   */
  private applyMutationWithOT(
    entanglementId: string,
    vector: MutationVector,
    sourceClient: string
  ): void {
    // Convert to operation
    const remoteOp = this.mutationVectorToOperation(vector);

    if (!remoteOp) {
      // Can't transform this mutation type - apply directly
      applyMutationVector(vector);
      this.log(`✨ Applied mutation (no OT): ${vector.type} on ${vector.target}`);
      return;
    }

    // Override clientId to reflect source
    remoteOp.clientId = sourceClient;

    // Get pending local operations for this target
    const pending = this.pendingOperations.get(vector.target) || [];

    if (pending.length === 0) {
      // No pending operations - apply directly
      this.applyOperation(remoteOp, vector.target);
      this.log(`✨ Applied mutation (no conflicts): ${vector.type} on ${vector.target}`);
      return;
    }

    // Transform remote operation against all pending local operations
    let transformedOp = remoteOp;
    for (const localOp of pending) {
      transformedOp = transform(transformedOp, localOp);
    }

    // Apply transformed operation
    this.applyOperation(transformedOp, vector.target);
    this.log(
      `✨ Applied OT-transformed mutation from ${sourceClient}: ` +
      `${vector.type} on ${vector.target} (transformed against ${pending.length} local op(s))`
    );

    // Clear pending operations for this target (they've been acknowledged)
    this.pendingOperations.delete(vector.target);
  }

  /**
   * Apply an Operation to a DOM element
   */
  private applyOperation(op: Operation, selector: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`[minimact-quantum] Element not found: ${selector}`);
      return;
    }

    switch (op.type) {
      case 'setAttribute':
        if (op.attributeName && op.value !== null && op.value !== undefined) {
          element.setAttribute(op.attributeName, String(op.value));
        } else if (op.attributeName) {
          element.removeAttribute(op.attributeName);
        }
        break;

      case 'removeAttribute':
        if (op.attributeName) {
          element.removeAttribute(op.attributeName);
        }
        break;

      case 'setProperty':
        if (op.propertyName) {
          (element as any)[op.propertyName] = op.value;
        }
        break;

      case 'insert':
      case 'delete':
      case 'retain':
        // Text operations - would need more complex handling
        console.warn(`[minimact-quantum] Text operation not yet implemented: ${op.type}`);
        break;
    }
  }

  /**
   * Track local operation before sending
   * This allows us to transform incoming operations against our pending changes
   */
  private trackLocalOperation(entanglementId: string, vector: MutationVector): void {
    const op = this.mutationVectorToOperation(vector);
    if (!op) return;

    // Get pending operations for this target
    const pending = this.pendingOperations.get(vector.target) || [];

    // Try to compose with last operation if possible
    if (pending.length > 0) {
      const lastOp = pending[pending.length - 1];
      if (canCompose(lastOp, op)) {
        // Compose operations (optimization)
        pending[pending.length - 1] = compose(lastOp, op);
        this.log(`🔗 Composed operation with previous: ${op.type}`);
        return;
      }
    }

    // Add to pending
    pending.push(op);
    this.pendingOperations.set(vector.target, pending);

    this.log(`📝 Tracked local operation: ${op.type} on ${vector.target} (${pending.length} pending)`);
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
