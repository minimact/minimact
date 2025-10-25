/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */
import { serializeMutation, applyMutationVector, getElementSelector } from './mutation-serializer';
import { RetryQueue } from './retry-queue';
/**
 * Entanglement Manager - Client Side
 *
 * Manages quantum links between local and remote elements
 */
export class EntanglementManager {
    constructor(config) {
        this.bindings = new Map();
        this.observers = new Map();
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
    async entangle(localElement, remoteElement, mode = 'bidirectional') {
        const selector = getElementSelector(localElement);
        const entanglementId = `${this.clientId}:${selector}→${remoteElement.clientId}:${remoteElement.selector}`;
        // Create binding
        const binding = {
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
        const link = {
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
    async entangleWithAll(localElement, mode = 'mirror') {
        return this.entangle(localElement, { clientId: '*', selector: getElementSelector(localElement) }, mode);
    }
    /**
     * Disentangle (break quantum link)
     */
    async disentangle(entanglementId) {
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
    async registerWithServer(binding) {
        const request = {
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
    attachObserver(entanglementId, element, binding) {
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
                const vector = {
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
    async propagateMutation(entanglementId, vector) {
        try {
            await this.signalR.invoke('PropagateQuantumMutation', {
                entanglementId,
                sourceClient: this.clientId,
                vector
            });
            this.log(`🌀 Propagated mutation: ${vector.type} on ${vector.target}`);
        }
        catch (error) {
            console.error('[minimact-quantum] Failed to propagate mutation, enqueueing for retry:', error);
            // Enqueue for automatic retry with exponential backoff
            await this.retryQueue.enqueue(entanglementId, vector);
        }
    }
    /**
     * Subscribe to remote changes for bidirectional entanglement
     */
    subscribeToRemoteChanges(entanglementId) {
        // Already set up in setupListeners()
        this.log(`🔄 Subscribed to bidirectional mutations for ${entanglementId}`);
    }
    /**
     * Setup SignalR listeners for incoming quantum mutations
     */
    setupListeners() {
        this.signalR.on('QuantumMutation', (event) => {
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
            this.log(`✨ Applied quantum mutation from ${event.sourceClient}: ` +
                `${event.vector.type} on ${event.vector.target}`);
            // Emit awareness event
            this.emitAwarenessEvent(event);
        });
        this.log('🎧 SignalR listeners registered for quantum mutations');
    }
    /**
     * Emit awareness event (for showing who made the change)
     */
    emitAwarenessEvent(event) {
        const element = document.querySelector(event.vector.target);
        if (!element)
            return;
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
    persistEntanglements() {
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
        }
        catch (error) {
            console.error('[minimact-quantum] Failed to persist entanglements:', error);
        }
    }
    /**
     * Restore entanglements from localStorage after reconnect
     */
    async reconnect() {
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
                        await this.entangle(element, {
                            clientId: binding.targetClient,
                            selector: binding.selector
                        }, binding.mode);
                        successCount++;
                    }
                    catch (error) {
                        console.error(`[minimact-quantum] Failed to restore entanglement ${binding.entanglementId}:`, error);
                        failCount++;
                    }
                }
                else {
                    this.log(`⚠️ Element not found for selector: ${binding.selector}`);
                    failCount++;
                }
            }
            this.log(`✅ Restored ${successCount}/${bindingsArray.length} entanglement(s)`);
            if (failCount > 0) {
                this.log(`⚠️ Failed to restore ${failCount} entanglement(s)`);
            }
        }
        catch (error) {
            console.error('[minimact-quantum] Failed to parse stored entanglements:', error);
            // Clear corrupt data
            localStorage.removeItem('minimact-quantum-entanglements');
        }
    }
    /**
     * Clear persisted entanglements
     */
    clearPersistedEntanglements() {
        localStorage.removeItem('minimact-quantum-entanglements');
        this.log('🧹 Cleared persisted entanglements');
    }
    /**
     * Debug logging
     */
    log(message, ...args) {
        if (this.debugLogging) {
            console.log(`[minimact-quantum] ${message}`, ...args);
        }
    }
}
