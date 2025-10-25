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
  EntanglementOptions,
  QuantumLink,
  MutationVector,
  QuantumMutationEvent,
  RegisterEntanglementRequest,
  TransformFunction,
  BidirectionalTransform
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

  // Causal Consistency (Lamport Clock)
  private lamportClock: number = 0;
  private vectorClock: Map<string, number> = new Map(); // key: clientId, value: timestamp
  private pendingCausalMutations: MutationVector[] = []; // Mutations waiting for causal dependencies

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
   *
   * // With transformation
   * const link = await manager.entangle(
   *   sliderA,
   *   { clientId: 'user-b', selector: '#slider-b' },
   *   {
   *     mode: 'bidirectional',
   *     transform: createInverse(0, 100)
   *   }
   * );
   * ```
   */
  async entangle(
    localElement: Element,
    remoteElement: { clientId: string; selector: string },
    modeOrOptions: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions = 'bidirectional'
  ): Promise<QuantumLink> {
    const selector = getElementSelector(localElement);
    const entanglementId = `${this.clientId}:${selector}→${remoteElement.clientId}:${remoteElement.selector}`;

    // Parse mode/options
    const options: EntanglementOptions = typeof modeOrOptions === 'string'
      ? { mode: modeOrOptions }
      : modeOrOptions;

    const mode = options.mode || 'bidirectional';

    // Create binding
    const binding: EntanglementBinding = {
      entanglementId,
      sourceClient: this.clientId,
      targetClient: remoteElement.clientId,
      page: window.location.pathname,
      selector,
      mode,
      scope: 'private',
      transform: options.transform,
      options
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
   * Create an entanglement mesh - N-to-N entanglement with multiple clients
   *
   * All specified elements/clients are entangled with each other
   *
   * @example
   * ```typescript
   * // Entangle 3 sliders across 3 users
   * const mesh = await quantum.createMesh(
   *   [slider1, slider2, slider3],
   *   ['user-a', 'user-b', 'user-c'],
   *   'bidirectional'
   * );
   * ```
   */
  async createMesh(
    elements: Element[],
    clientIds: string[],
    modeOrOptions: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions = 'bidirectional'
  ): Promise<QuantumLink[]> {
    const links: QuantumLink[] = [];

    // Create entanglements between all pairs
    for (let i = 0; i < elements.length; i++) {
      for (let j = 0; j < clientIds.length; j++) {
        // Skip self-entanglement
        if (clientIds[j] === this.clientId) {
          continue;
        }

        const link = await this.entangle(
          elements[i],
          {
            clientId: clientIds[j],
            selector: getElementSelector(elements[i])
          },
          modeOrOptions
        );

        links.push(link);
      }
    }

    this.log(`🕸️ Created mesh with ${links.length} entanglement links`);

    return links;
  }

  /**
   * Create a full mesh for a single element with multiple remote clients
   *
   * @example
   * ```typescript
   * // Entangle one slider with multiple users
   * const mesh = await quantum.createElementMesh(
   *   document.querySelector('#slider'),
   *   ['user-b', 'user-c', 'user-d'],
   *   'bidirectional'
   * );
   * ```
   */
  async createElementMesh(
    element: Element,
    remoteClientIds: string[],
    modeOrOptions: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions = 'bidirectional'
  ): Promise<QuantumLink[]> {
    const links: QuantumLink[] = [];
    const selector = getElementSelector(element);

    for (const clientId of remoteClientIds) {
      const link = await this.entangle(
        element,
        { clientId, selector },
        modeOrOptions
      );
      links.push(link);
    }

    this.log(`🕸️ Created element mesh with ${links.length} remote clients`);

    return links;
  }

  /**
   * Disentangle all links in a mesh
   *
   * @example
   * ```typescript
   * const meshLinks = await quantum.createMesh(...);
   * // Later...
   * await quantum.disentangleMesh(meshLinks);
   * ```
   */
  async disentangleMesh(links: QuantumLink[]): Promise<void> {
    for (const link of links) {
      await link.disentangle();
    }

    this.log(`🕸️ Disentangled mesh with ${links.length} links`);
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
   * Determine if should observe attributes
   */
  private shouldObserveAttributes(binding: EntanglementBinding): boolean {
    const options = binding.options;
    if (!options) return true;

    // If attributes whitelist exists and is not empty, observe attributes
    if (options.attributes && options.attributes.length > 0) {
      return true;
    }

    // If ignoreAttributes exists but attributes doesn't, still observe (we'll filter)
    if (options.ignoreAttributes && options.ignoreAttributes.length > 0) {
      return true;
    }

    // Default: observe attributes unless explicitly filtered out
    return true;
  }

  /**
   * Determine if should observe character data
   */
  private shouldObserveCharacterData(binding: EntanglementBinding): boolean {
    // Character data is less common - default to true unless we add filters
    return true;
  }

  /**
   * Determine if should observe child list
   */
  private shouldObserveChildList(binding: EntanglementBinding): boolean {
    // Child list mutations are complex - default to true
    return true;
  }

  /**
   * Check if mutation should be propagated based on selective entanglement filters
   */
  private shouldPropagateMutation(vector: MutationVector, binding: EntanglementBinding): boolean {
    const options = binding.options;
    if (!options) return true;

    // Check attribute filters
    if (vector.type === 'attributes' && vector.attributeName) {
      // If whitelist exists, attribute must be in it
      if (options.attributes && options.attributes.length > 0) {
        if (!options.attributes.includes(vector.attributeName)) {
          this.log(`🚫 Filtered out attribute '${vector.attributeName}' (not in whitelist)`);
          return false;
        }
      }

      // If blacklist exists, attribute must NOT be in it
      if (options.ignoreAttributes && options.ignoreAttributes.length > 0) {
        if (options.ignoreAttributes.includes(vector.attributeName)) {
          this.log(`🚫 Filtered out attribute '${vector.attributeName}' (in blacklist)`);
          return false;
        }
      }
    }

    // Check property filters (for value changes, style changes, etc.)
    if (vector.type === 'value' || vector.type === 'style') {
      const propertyName = vector.type === 'value' ? 'value' : 'style';

      // If whitelist exists, property must be in it
      if (options.properties && options.properties.length > 0) {
        if (!options.properties.includes(propertyName)) {
          this.log(`🚫 Filtered out property '${propertyName}' (not in whitelist)`);
          return false;
        }
      }

      // If blacklist exists, property must NOT be in it
      if (options.ignoreProperties && options.ignoreProperties.length > 0) {
        if (options.ignoreProperties.includes(propertyName)) {
          this.log(`🚫 Filtered out property '${propertyName}' (in blacklist)`);
          return false;
        }
      }
    }

    return true;
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

        // Check selective entanglement filters
        if (!this.shouldPropagateMutation(vector, binding)) {
          return; // Skip this mutation
        }

        // Propagate to server
        this.propagateMutation(entanglementId, vector);
      });
    });

    // Determine what to observe based on filters
    const observeConfig: MutationObserverInit = {
      attributes: this.shouldObserveAttributes(binding),
      characterData: this.shouldObserveCharacterData(binding),
      childList: this.shouldObserveChildList(binding),
      subtree: true
    };

    // If observing attributes, specify which ones (if whitelist exists)
    if (observeConfig.attributes && binding.options?.attributes) {
      observeConfig.attributeFilter = binding.options.attributes;
    }

    observer.observe(element, observeConfig);

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

        // Check selective entanglement filters
        if (this.shouldPropagateMutation(vector, binding)) {
          this.propagateMutation(entanglementId, vector);
        }
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
    // Get binding for transformation
    const binding = this.bindings.get(entanglementId);
    if (!binding) return;

    // Increment Lamport clock for local event
    const causalTimestamp = this.incrementClock();

    // Apply forward transformation to the value
    const transformedVector = { ...vector };
    if (vector.newValue !== undefined) {
      transformedVector.newValue = this.applyTransform(vector.newValue, binding, 'forward');
    }

    // Add causal vector for ordering
    transformedVector.causalVector = this.buildCausalVector();
    transformedVector.timestamp = causalTimestamp;

    // Track local operation for OT (before sending)
    this.trackLocalOperation(entanglementId, transformedVector);

    // Update own vector clock
    this.updateVectorClock(this.clientId, causalTimestamp);

    try {
      await this.signalR.invoke('PropagateQuantumMutation', {
        entanglementId,
        sourceClient: this.clientId,
        vector: transformedVector
      });

      this.log(`🌀 Propagated mutation: ${vector.type} on ${vector.target} (clock: ${causalTimestamp})`);
    } catch (error) {
      console.error('[minimact-quantum] Failed to propagate mutation, enqueueing for retry:', error);

      // Enqueue for automatic retry with exponential backoff
      await this.retryQueue.enqueue(entanglementId, transformedVector);
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
   * Apply transformation to a mutation vector value
   */
  private applyTransform(
    value: any,
    binding: EntanglementBinding,
    direction: 'forward' | 'backward'
  ): any {
    if (!binding.transform) {
      // Handle built-in modes
      if (binding.mode === 'inverse') {
        // Assume numeric value, inverse around midpoint
        if (typeof value === 'number') {
          return 100 - value; // Default 0-100 range
        }
        if (typeof value === 'boolean') {
          return !value;
        }
      }
      return value;
    }

    const transform = binding.transform;

    // Check if bidirectional transform
    if (typeof transform === 'object' && 'forward' in transform && 'backward' in transform) {
      return direction === 'forward' ? transform.forward(value) : transform.backward(value);
    }

    // Simple function transform (unidirectional)
    if (typeof transform === 'function') {
      return direction === 'forward' ? transform(value) : value;
    }

    return value;
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
    // Update Lamport clock (received event)
    if (vector.timestamp) {
      this.updateClock(vector.timestamp);
    }

    // Check causal dependencies
    if (!this.canApplyCausally(vector, sourceClient)) {
      // Queue for later processing
      this.pendingCausalMutations.push(vector);
      this.log(`⏱️ Queued mutation for causal ordering (${this.pendingCausalMutations.length} pending)`);
      return;
    }

    // Get binding for backward transformation
    const binding = this.bindings.get(entanglementId);
    if (!binding) return;

    // Apply backward transformation to incoming value
    const transformedVector = { ...vector };
    if (vector.newValue !== undefined) {
      transformedVector.newValue = this.applyTransform(vector.newValue, binding, 'backward');
    }

    // Convert to operation
    const remoteOp = this.mutationVectorToOperation(transformedVector);

    if (!remoteOp) {
      // Can't transform this mutation type - apply directly
      applyMutationVector(transformedVector);
      this.log(`✨ Applied mutation (no OT): ${vector.type} on ${vector.target}`);

      // Update vector clock
      if (vector.timestamp) {
        this.updateVectorClock(sourceClient, vector.timestamp);
      }

      // Process any pending causal mutations
      this.processPendingCausalMutations();
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
    } else {
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

    // Update vector clock
    if (vector.timestamp) {
      this.updateVectorClock(sourceClient, vector.timestamp);
    }

    // Process any pending causal mutations
    this.processPendingCausalMutations();
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
   * Increment Lamport clock (on local event)
   */
  private incrementClock(): number {
    this.lamportClock++;
    return this.lamportClock;
  }

  /**
   * Update Lamport clock (on receive event)
   */
  private updateClock(receivedTimestamp: number): number {
    this.lamportClock = Math.max(this.lamportClock, receivedTimestamp) + 1;
    return this.lamportClock;
  }

  /**
   * Build causal vector for current state
   */
  private buildCausalVector(): number[] {
    const clients = Array.from(this.vectorClock.keys()).sort();
    return clients.map(clientId => this.vectorClock.get(clientId) || 0);
  }

  /**
   * Check if mutation can be applied based on causal dependencies
   */
  private canApplyCausally(vector: MutationVector, sourceClient: string): boolean {
    if (!vector.causalVector || vector.causalVector.length === 0) {
      // No causal vector - can apply immediately
      return true;
    }

    // Get source client's current clock value
    const sourceCurrentClock = this.vectorClock.get(sourceClient) || 0;

    // For the source client, mutation's clock should be exactly one more than current
    // This ensures we don't skip mutations
    const expectedSourceClock = sourceCurrentClock + 1;

    // Simple check: source's causal timestamp should be sequential
    // (This is a simplified version - full vector clock comparison is more complex)
    if (vector.timestamp && vector.timestamp !== expectedSourceClock) {
      this.log(`⏱️ Causal dependency not met: expected ${expectedSourceClock}, got ${vector.timestamp}`);
      return false;
    }

    return true;
  }

  /**
   * Process pending causal mutations
   * Called after applying a mutation to check if any pending mutations can now be applied
   */
  private processPendingCausalMutations(): void {
    let appliedCount = 0;
    let remainingMutations: MutationVector[] = [];

    for (const mutation of this.pendingCausalMutations) {
      // Extract source client from mutation (would need to be stored with mutation)
      // For now, we'll apply all pending mutations in timestamp order
      // TODO: Store sourceClient with pending mutations

      if (this.canApplyCausally(mutation, 'unknown')) {
        // Can apply now
        applyMutationVector(mutation);
        appliedCount++;
      } else {
        // Still waiting
        remainingMutations.push(mutation);
      }
    }

    this.pendingCausalMutations = remainingMutations;

    if (appliedCount > 0) {
      this.log(`⏱️ Applied ${appliedCount} pending causal mutation(s), ${remainingMutations.length} remaining`);
    }
  }

  /**
   * Update vector clock for a client
   */
  private updateVectorClock(clientId: string, timestamp: number): void {
    const currentClock = this.vectorClock.get(clientId) || 0;
    this.vectorClock.set(clientId, Math.max(currentClock, timestamp));
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
