/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */
import type { EntanglementConfig, QuantumLink } from './types';
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
     * ```
     */
    entangle(localElement: Element, remoteElement: {
        clientId: string;
        selector: string;
    }, mode?: 'mirror' | 'inverse' | 'bidirectional'): Promise<QuantumLink>;
    /**
     * Entangle with ALL clients on same page
     */
    entangleWithAll(localElement: Element, mode?: 'mirror' | 'inverse'): Promise<QuantumLink>;
    /**
     * Disentangle (break quantum link)
     */
    disentangle(entanglementId: string): Promise<void>;
    /**
     * Register entanglement with server
     */
    private registerWithServer;
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
     * Debug logging
     */
    private log;
}
