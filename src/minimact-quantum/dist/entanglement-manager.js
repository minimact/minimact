/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */
import { serializeMutation, applyMutationVector, getElementSelector } from './mutation-serializer';
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
            scope: binding.scope
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
     * Propagate mutation to server
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
            console.error('[minimact-quantum] Failed to propagate mutation:', error);
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
     * Debug logging
     */
    log(message, ...args) {
        if (this.debugLogging) {
            console.log(`[minimact-quantum] ${message}`, ...args);
        }
    }
}
