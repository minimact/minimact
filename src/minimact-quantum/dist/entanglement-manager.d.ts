/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */
import type { EntanglementConfig, EntanglementOptions, QuantumLink } from './types';
/**
 * Entanglement Manager - Client Side
 *
 * Manages quantum links between local and remote elements
 */
export declare class EntanglementManager {
    private clientId;
    private signalR;
    private sessionId?;
    private bindings;
    private observers;
    private debugLogging;
    private retryQueue;
    private pendingOperations;
    private localOperationBuffer;
    private lamportClock;
    private vectorClock;
    private pendingCausalMutations;
    constructor(config: EntanglementConfig);
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
    entangle(localElement: Element, remoteElement: {
        clientId: string;
        selector: string;
    }, modeOrOptions?: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions): Promise<QuantumLink>;
    /**
     * Entangle with ALL clients on same page
     */
    entangleWithAll(localElement: Element, mode?: 'mirror' | 'inverse'): Promise<QuantumLink>;
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
    createMesh(elements: Element[], clientIds: string[], modeOrOptions?: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions): Promise<QuantumLink[]>;
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
    createElementMesh(element: Element, remoteClientIds: string[], modeOrOptions?: 'mirror' | 'inverse' | 'bidirectional' | EntanglementOptions): Promise<QuantumLink[]>;
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
    disentangleMesh(links: QuantumLink[]): Promise<void>;
    /**
     * Disentangle (break quantum link)
     */
    disentangle(entanglementId: string): Promise<void>;
    /**
     * Register entanglement with server
     */
    private registerWithServer;
    /**
     * Determine if should observe attributes
     */
    private shouldObserveAttributes;
    /**
     * Determine if should observe character data
     */
    private shouldObserveCharacterData;
    /**
     * Determine if should observe child list
     */
    private shouldObserveChildList;
    /**
     * Check if mutation should be propagated based on selective entanglement filters
     */
    private shouldPropagateMutation;
    /**
     * Attach MutationObserver to local element
     */
    private attachObserver;
    /**
     * Propagate mutation to server (with automatic retry on failure)
     */
    private propagateMutation;
    /**
     * Subscribe to remote changes for bidirectional entanglement
     */
    private subscribeToRemoteChanges;
    /**
     * Setup SignalR listeners for incoming quantum mutations
     */
    private setupListeners;
    /**
     * Emit awareness event (for showing who made the change)
     */
    private emitAwarenessEvent;
    /**
     * Persist entanglements to localStorage for reconnection
     */
    private persistEntanglements;
    /**
     * Restore entanglements from localStorage after reconnect
     */
    reconnect(): Promise<void>;
    /**
     * Clear persisted entanglements
     */
    clearPersistedEntanglements(): void;
    /**
     * Apply transformation to a mutation vector value
     */
    private applyTransform;
    /**
     * Convert MutationVector to Operation for OT processing
     */
    private mutationVectorToOperation;
    /**
     * Apply mutation with Operational Transform
     * Transforms the mutation against pending operations before applying
     */
    private applyMutationWithOT;
    /**
     * Apply an Operation to a DOM element
     */
    private applyOperation;
    /**
     * Track local operation before sending
     * This allows us to transform incoming operations against our pending changes
     */
    private trackLocalOperation;
    /**
     * Increment Lamport clock (on local event)
     */
    private incrementClock;
    /**
     * Update Lamport clock (on receive event)
     */
    private updateClock;
    /**
     * Build causal vector for current state
     */
    private buildCausalVector;
    /**
     * Check if mutation can be applied based on causal dependencies
     */
    private canApplyCausally;
    /**
     * Process pending causal mutations
     * Called after applying a mutation to check if any pending mutations can now be applied
     */
    private processPendingCausalMutations;
    /**
     * Update vector clock for a client
     */
    private updateVectorClock;
    /**
     * Debug logging
     */
    private log;
}
