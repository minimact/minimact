/**
 * minimact-quantum - Mutation Serializer
 *
 * Serializes DOM mutations into vectors for transmission
 * through the entanglement channel (WebWormhole 🌌)
 */
/**
 * Serialize a MutationRecord into a MutationVector
 *
 * @param mutation - Native MutationRecord from MutationObserver
 * @param elementSelector - Selector for the target element
 * @returns MutationVector ready for transmission
 */
function serializeMutation(mutation, elementSelector) {
    const vector = {
        type: mutation.type,
        target: elementSelector,
        timestamp: Date.now()
    };
    switch (mutation.type) {
        case 'attributes':
            vector.attributeName = mutation.attributeName || undefined;
            vector.oldValue = mutation.oldValue;
            vector.newValue = mutation.target.getAttribute(mutation.attributeName);
            break;
        case 'characterData':
            vector.oldValue = mutation.oldValue;
            vector.newValue = mutation.target.textContent;
            break;
        case 'childList':
            vector.addedNodes = Array.from(mutation.addedNodes).map(serializeNode);
            vector.removedNodes = Array.from(mutation.removedNodes).map(serializeNode);
            break;
    }
    return vector;
}
/**
 * Serialize a DOM mutation for input value changes
 * (These don't trigger MutationObserver, need manual tracking)
 */
function serializeValueChange(element, elementSelector, oldValue) {
    return {
        type: 'value',
        target: elementSelector,
        oldValue,
        newValue: element.value,
        timestamp: Date.now()
    };
}
/**
 * Serialize a style change
 */
function serializeStyleChange(element, elementSelector, property, oldValue, newValue) {
    return {
        type: 'style',
        target: elementSelector,
        attributeName: property,
        oldValue,
        newValue,
        timestamp: Date.now()
    };
}
/**
 * Serialize a position change (for drag/drop)
 */
function serializePositionChange(element, elementSelector, oldPosition, newPosition) {
    return {
        type: 'position',
        target: elementSelector,
        oldValue: oldPosition,
        newValue: newPosition,
        timestamp: Date.now()
    };
}
/**
 * Serialize a DOM node
 */
function serializeNode(node) {
    const serialized = {
        nodeName: node.nodeName,
        nodeType: node.nodeType
    };
    if (node.nodeType === Node.TEXT_NODE) {
        serialized.textContent = node.textContent || '';
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        serialized.attributes = {};
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            serialized.attributes[attr.name] = attr.value;
        }
        // Include text content for simple elements
        if (element.children.length === 0) {
            serialized.textContent = element.textContent || '';
        }
    }
    return serialized;
}
/**
 * Apply a mutation vector to a DOM element
 * (Deserialize and apply)
 *
 * @param vector - Mutation vector from remote client
 */
function applyMutationVector(vector) {
    const element = document.querySelector(vector.target);
    if (!element) {
        console.warn(`[minimact-quantum] Element not found for mutation: ${vector.target}`);
        return;
    }
    switch (vector.type) {
        case 'attributes':
            if (vector.attributeName && vector.newValue !== undefined) {
                element.setAttribute(vector.attributeName, String(vector.newValue));
            }
            break;
        case 'characterData':
            element.textContent = String(vector.newValue || '');
            break;
        case 'childList':
            // TODO: More sophisticated childList handling
            // For now, just log it
            console.log('[minimact-quantum] ChildList mutation received:', vector);
            break;
        case 'value':
            if (element instanceof HTMLInputElement ||
                element instanceof HTMLSelectElement ||
                element instanceof HTMLTextAreaElement) {
                element.value = String(vector.newValue || '');
            }
            break;
        case 'style':
            if (element instanceof HTMLElement && vector.attributeName) {
                element.style[vector.attributeName] = String(vector.newValue || '');
            }
            break;
        case 'position':
            if (element instanceof HTMLElement && vector.newValue) {
                element.style.left = `${vector.newValue.x}px`;
                element.style.top = `${vector.newValue.y}px`;
            }
            break;
    }
    // Dispatch quantum-mutation event for awareness
    element.dispatchEvent(new CustomEvent('quantum-mutation', {
        bubbles: true,
        detail: {
            vector,
            appliedAt: Date.now()
        }
    }));
}
/**
 * Get a unique selector for an element
 * Tries ID first, then falls back to class or tag
 */
function getElementSelector(element) {
    // Prefer ID (most specific)
    if (element.id) {
        return `#${element.id}`;
    }
    // Fall back to class (if unique enough)
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        if (classes.length > 0) {
            return `.${classes[0]}`;
        }
    }
    // Fall back to tag name (least specific)
    return element.tagName.toLowerCase();
}

/**
 * Retry Queue for failed quantum mutations
 *
 * Implements exponential backoff for network failures
 */
class RetryQueue {
    constructor(signalR, clientId) {
        this.queue = [];
        this.retryInterval = 1000; // Start at 1s
        this.processing = false;
        this.signalR = signalR;
        this.clientId = clientId;
    }
    /**
     * Enqueue a failed mutation for retry
     */
    async enqueue(entanglementId, vector) {
        this.queue.push({
            vector,
            entanglementId,
            attempts: 0,
            maxAttempts: 5,
            lastAttempt: Date.now()
        });
        console.log(`[RetryQueue] ⏳ Queued mutation for retry (queue size: ${this.queue.length})`);
        // Start processing if not already running
        if (!this.processing) {
            this.processQueue();
        }
    }
    /**
     * Process retry queue with exponential backoff
     */
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue[0];
            // Check if max attempts exceeded
            if (item.attempts >= item.maxAttempts) {
                console.error(`[RetryQueue] ❌ Max retries exceeded for mutation:`, item);
                this.queue.shift(); // Remove from queue
                continue;
            }
            // Calculate backoff delay
            const backoff = Math.pow(2, item.attempts) * this.retryInterval;
            const timeSinceLastAttempt = Date.now() - item.lastAttempt;
            if (timeSinceLastAttempt < backoff) {
                // Not ready to retry yet, wait and check again
                await this.sleep(backoff - timeSinceLastAttempt);
                continue;
            }
            // Attempt retry
            try {
                await this.signalR.invoke('PropagateQuantumMutation', {
                    entanglementId: item.entanglementId,
                    sourceClient: this.clientId,
                    vector: item.vector
                });
                // Success! Remove from queue
                console.log(`[RetryQueue] ✅ Successfully retried mutation after ${item.attempts + 1} attempt(s)`);
                this.queue.shift();
            }
            catch (error) {
                // Failed - increment attempts and update timestamp
                item.attempts++;
                item.lastAttempt = Date.now();
                console.warn(`[RetryQueue] ⚠️ Retry attempt ${item.attempts} failed:`, error);
            }
        }
        this.processing = false;
    }
    /**
     * Helper to sleep for a duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current queue size
     */
    getQueueSize() {
        return this.queue.length;
    }
    /**
     * Clear the retry queue
     */
    clear() {
        this.queue = [];
        this.processing = false;
        console.log('[RetryQueue] 🧹 Queue cleared');
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            totalAttempts: this.queue.reduce((sum, item) => sum + item.attempts, 0),
            oldestItem: this.queue.length > 0 ? this.queue[0].lastAttempt : null
        };
    }
}

/**
 * Operational Transform for Conflict Resolution
 *
 * Handles concurrent mutations from multiple clients by transforming operations
 * so they can be applied in any order while maintaining consistency.
 *
 * Based on the OT algorithm for text editing and extended for DOM mutations.
 */
/**
 * Transform operation A against operation B
 * Returns transformed version of A that can be applied after B
 *
 * This implements the core OT transformation function that ensures:
 * - Convergence: All clients reach the same final state
 * - Causality preservation: Operations maintain their causal ordering
 * - Intention preservation: The intent of each operation is maintained
 */
function transform(opA, opB) {
    // Handle text operations
    if (isTextOperation(opA) && isTextOperation(opB)) {
        return transformTextOperations(opA, opB);
    }
    // Handle attribute operations
    if (isAttributeOperation(opA) && isAttributeOperation(opB)) {
        return transformAttributeOperations(opA, opB);
    }
    // Handle property operations
    if (isPropertyOperation(opA) && isPropertyOperation(opB)) {
        return transformPropertyOperations(opA, opB);
    }
    // Mixed operation types - use timestamp for conflict resolution
    if (opB.timestamp < opA.timestamp) {
        return opA; // B happened first, A is already correct
    }
    return opA;
}
/**
 * Transform text operations (insert, delete, retain)
 */
function transformTextOperations(opA, opB) {
    // Insert vs Insert
    if (opA.type === 'insert' && opB.type === 'insert') {
        if (opB.position < opA.position) {
            // B inserted before A's position, shift A right
            return {
                ...opA,
                position: opA.position + getInsertLength(opB)
            };
        }
        else if (opB.position === opA.position) {
            // Same position - use timestamp to decide order
            if (opB.timestamp < opA.timestamp) {
                return {
                    ...opA,
                    position: opA.position + getInsertLength(opB)
                };
            }
        }
        return opA;
    }
    // Insert vs Delete
    if (opA.type === 'insert' && opB.type === 'delete') {
        if (opB.position <= opA.position) {
            // B deleted before A's position, shift A left
            const deleteLength = opB.length || 0;
            const deleteEnd = opB.position + deleteLength;
            if (opA.position >= deleteEnd) {
                // A is after the deleted range
                return {
                    ...opA,
                    position: opA.position - deleteLength
                };
            }
            else {
                // A is within the deleted range - shift to delete start
                return {
                    ...opA,
                    position: opB.position
                };
            }
        }
        return opA;
    }
    // Delete vs Insert
    if (opA.type === 'delete' && opB.type === 'insert') {
        if (opB.position <= opA.position) {
            // B inserted before A's position, shift A right
            return {
                ...opA,
                position: opA.position + getInsertLength(opB)
            };
        }
        else if (opB.position < (opA.position + (opA.length || 0))) {
            // B inserted within A's delete range, extend delete length
            return {
                ...opA,
                length: (opA.length || 0) + getInsertLength(opB)
            };
        }
        return opA;
    }
    // Delete vs Delete
    if (opA.type === 'delete' && opB.type === 'delete') {
        const aStart = opA.position;
        const aEnd = aStart + (opA.length || 0);
        const bStart = opB.position;
        const bEnd = bStart + (opB.length || 0);
        // No overlap - B is before A
        if (bEnd <= aStart) {
            return {
                ...opA,
                position: opA.position - (opB.length || 0)
            };
        }
        // No overlap - B is after A
        if (bStart >= aEnd) {
            return opA;
        }
        // Overlapping deletes - complex case
        // We need to adjust A based on what B already deleted
        if (bStart <= aStart && bEnd >= aEnd) {
            // B completely covers A - A becomes a no-op
            return {
                ...opA,
                length: 0,
                position: bStart
            };
        }
        if (bStart <= aStart && bEnd < aEnd) {
            // B overlaps A's start
            return {
                ...opA,
                position: bStart,
                length: aEnd - bEnd
            };
        }
        if (bStart > aStart && bEnd >= aEnd) {
            // B overlaps A's end
            return {
                ...opA,
                length: bStart - aStart
            };
        }
        // B is contained within A
        return {
            ...opA,
            length: (opA.length || 0) - (opB.length || 0)
        };
    }
    return opA;
}
/**
 * Transform attribute operations
 */
function transformAttributeOperations(opA, opB) {
    // Same attribute being modified
    if (opA.attributeName === opB.attributeName) {
        // Last-write-wins using timestamp
        if (opB.timestamp < opA.timestamp) {
            return opA; // A is newer, keep it
        }
        else {
            // B is newer, A should update its oldValue to B's newValue
            return {
                ...opA,
                oldValue: opB.value
            };
        }
    }
    // Different attributes - no conflict
    return opA;
}
/**
 * Transform property operations
 */
function transformPropertyOperations(opA, opB) {
    // Same property being modified
    if (opA.propertyName === opB.propertyName) {
        // Last-write-wins using timestamp
        if (opB.timestamp < opA.timestamp) {
            return opA; // A is newer, keep it
        }
        else {
            // B is newer, A should update its oldValue to B's newValue
            return {
                ...opA,
                oldValue: opB.value
            };
        }
    }
    // Different properties - no conflict
    return opA;
}
/**
 * Transform a list of operations against a list of concurrent operations
 * Used when applying a batch of operations
 */
function transformBatch(localOps, remoteOps) {
    let transformedOps = [...localOps];
    for (const remoteOp of remoteOps) {
        transformedOps = transformedOps.map(localOp => transform(localOp, remoteOp));
    }
    return transformedOps;
}
/**
 * Check if two operations can be composed into a single operation
 * Used for optimization - combining consecutive operations
 */
function canCompose(opA, opB) {
    // Can compose consecutive inserts at same position
    if (opA.type === 'insert' && opB.type === 'insert') {
        const aEnd = opA.position + getInsertLength(opA);
        return aEnd === opB.position;
    }
    // Can compose consecutive deletes at same position
    if (opA.type === 'delete' && opB.type === 'delete') {
        return opA.position === opB.position;
    }
    // Can compose attribute changes on same attribute
    if (opA.type === 'setAttribute' && opB.type === 'setAttribute') {
        return opA.attributeName === opB.attributeName;
    }
    // Can compose property changes on same property
    if (opA.type === 'setProperty' && opB.type === 'setProperty') {
        return opA.propertyName === opB.propertyName;
    }
    return false;
}
/**
 * Compose two operations into a single operation
 */
function compose(opA, opB) {
    if (!canCompose(opA, opB)) {
        throw new Error('Operations cannot be composed');
    }
    if (opA.type === 'insert' && opB.type === 'insert') {
        return {
            ...opA,
            value: String(opA.value || '') + String(opB.value || ''),
            timestamp: opB.timestamp // Use newer timestamp
        };
    }
    if (opA.type === 'delete' && opB.type === 'delete') {
        return {
            ...opA,
            length: (opA.length || 0) + (opB.length || 0),
            timestamp: opB.timestamp
        };
    }
    if (opA.type === 'setAttribute' && opB.type === 'setAttribute') {
        return {
            ...opA,
            value: opB.value, // Use newer value
            timestamp: opB.timestamp
        };
    }
    if (opA.type === 'setProperty' && opB.type === 'setProperty') {
        return {
            ...opA,
            value: opB.value, // Use newer value
            timestamp: opB.timestamp
        };
    }
    return opB; // Fallback
}
/**
 * Helper: Check if operation is a text operation
 */
function isTextOperation(op) {
    return op.type === 'insert' || op.type === 'delete' || op.type === 'retain';
}
/**
 * Helper: Check if operation is an attribute operation
 */
function isAttributeOperation(op) {
    return op.type === 'setAttribute' || op.type === 'removeAttribute';
}
/**
 * Helper: Check if operation is a property operation
 */
function isPropertyOperation(op) {
    return op.type === 'setProperty';
}
/**
 * Helper: Get the length of an insert operation
 */
function getInsertLength(op) {
    if (typeof op.value === 'string') {
        return op.value.length;
    }
    return 1; // For non-string inserts (like nodes)
}
/**
 * Invert an operation (for undo/redo)
 */
function invert(op) {
    switch (op.type) {
        case 'insert':
            return {
                type: 'delete',
                position: op.position,
                length: getInsertLength(op),
                timestamp: op.timestamp,
                clientId: op.clientId
            };
        case 'delete':
            return {
                type: 'insert',
                position: op.position,
                value: op.value,
                timestamp: op.timestamp,
                clientId: op.clientId
            };
        case 'setAttribute':
            return {
                type: 'setAttribute',
                attributeName: op.attributeName,
                value: op.oldValue,
                oldValue: op.value,
                timestamp: op.timestamp,
                clientId: op.clientId
            };
        case 'removeAttribute':
            return {
                type: 'setAttribute',
                attributeName: op.attributeName,
                value: op.oldValue,
                timestamp: op.timestamp,
                clientId: op.clientId
            };
        case 'setProperty':
            return {
                type: 'setProperty',
                propertyName: op.propertyName,
                value: op.oldValue,
                oldValue: op.value,
                timestamp: op.timestamp,
                clientId: op.clientId
            };
        default:
            return op;
    }
}

/**
 * minimact-quantum - Entanglement Manager
 *
 * 🌌 Manages quantum entanglement between DOM elements across clients
 *
 * "The DOM is no longer local. The DOM is a distributed shared reality."
 */
/**
 * Entanglement Manager - Client Side
 *
 * Manages quantum links between local and remote elements
 */
class EntanglementManager {
    constructor(config) {
        this.bindings = new Map();
        this.observers = new Map();
        // Operational Transform support
        this.pendingOperations = new Map(); // key: selector
        this.localOperationBuffer = new Map(); // key: entanglementId
        // Causal Consistency (Lamport Clock)
        this.lamportClock = 0;
        this.vectorClock = new Map(); // key: clientId, value: timestamp
        this.pendingCausalMutations = []; // Mutations waiting for causal dependencies
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
    async entangle(localElement, remoteElement, modeOrOptions = 'bidirectional') {
        const selector = getElementSelector(localElement);
        const entanglementId = `${this.clientId}:${selector}→${remoteElement.clientId}:${remoteElement.selector}`;
        // Parse mode/options
        const options = typeof modeOrOptions === 'string'
            ? { mode: modeOrOptions }
            : modeOrOptions;
        const mode = options.mode || 'bidirectional';
        // Create binding
        const binding = {
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
    async createMesh(elements, clientIds, modeOrOptions = 'bidirectional') {
        const links = [];
        // Create entanglements between all pairs
        for (let i = 0; i < elements.length; i++) {
            for (let j = 0; j < clientIds.length; j++) {
                // Skip self-entanglement
                if (clientIds[j] === this.clientId) {
                    continue;
                }
                const link = await this.entangle(elements[i], {
                    clientId: clientIds[j],
                    selector: getElementSelector(elements[i])
                }, modeOrOptions);
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
    async createElementMesh(element, remoteClientIds, modeOrOptions = 'bidirectional') {
        const links = [];
        const selector = getElementSelector(element);
        for (const clientId of remoteClientIds) {
            const link = await this.entangle(element, { clientId, selector }, modeOrOptions);
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
    async disentangleMesh(links) {
        for (const link of links) {
            await link.disentangle();
        }
        this.log(`🕸️ Disentangled mesh with ${links.length} links`);
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
     * Determine if should observe attributes
     */
    shouldObserveAttributes(binding) {
        const options = binding.options;
        if (!options)
            return true;
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
    shouldObserveCharacterData(binding) {
        // Character data is less common - default to true unless we add filters
        return true;
    }
    /**
     * Determine if should observe child list
     */
    shouldObserveChildList(binding) {
        // Child list mutations are complex - default to true
        return true;
    }
    /**
     * Check if mutation should be propagated based on selective entanglement filters
     */
    shouldPropagateMutation(vector, binding) {
        const options = binding.options;
        if (!options)
            return true;
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
    attachObserver(entanglementId, element, binding) {
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
        const observeConfig = {
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
                const vector = {
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
    async propagateMutation(entanglementId, vector) {
        // Get binding for transformation
        const binding = this.bindings.get(entanglementId);
        if (!binding)
            return;
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
        }
        catch (error) {
            console.error('[minimact-quantum] Failed to propagate mutation, enqueueing for retry:', error);
            // Enqueue for automatic retry with exponential backoff
            await this.retryQueue.enqueue(entanglementId, transformedVector);
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
     * Apply transformation to a mutation vector value
     */
    applyTransform(value, binding, direction) {
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
    mutationVectorToOperation(vector) {
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
    applyMutationWithOT(entanglementId, vector, sourceClient) {
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
        if (!binding)
            return;
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
        }
        else {
            // Transform remote operation against all pending local operations
            let transformedOp = remoteOp;
            for (const localOp of pending) {
                transformedOp = transform(transformedOp, localOp);
            }
            // Apply transformed operation
            this.applyOperation(transformedOp, vector.target);
            this.log(`✨ Applied OT-transformed mutation from ${sourceClient}: ` +
                `${vector.type} on ${vector.target} (transformed against ${pending.length} local op(s))`);
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
    applyOperation(op, selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`[minimact-quantum] Element not found: ${selector}`);
            return;
        }
        switch (op.type) {
            case 'setAttribute':
                if (op.attributeName && op.value !== null && op.value !== undefined) {
                    element.setAttribute(op.attributeName, String(op.value));
                }
                else if (op.attributeName) {
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
                    element[op.propertyName] = op.value;
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
    trackLocalOperation(entanglementId, vector) {
        const op = this.mutationVectorToOperation(vector);
        if (!op)
            return;
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
    incrementClock() {
        this.lamportClock++;
        return this.lamportClock;
    }
    /**
     * Update Lamport clock (on receive event)
     */
    updateClock(receivedTimestamp) {
        this.lamportClock = Math.max(this.lamportClock, receivedTimestamp) + 1;
        return this.lamportClock;
    }
    /**
     * Build causal vector for current state
     */
    buildCausalVector() {
        const clients = Array.from(this.vectorClock.keys()).sort();
        return clients.map(clientId => this.vectorClock.get(clientId) || 0);
    }
    /**
     * Check if mutation can be applied based on causal dependencies
     */
    canApplyCausally(vector, sourceClient) {
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
    processPendingCausalMutations() {
        let appliedCount = 0;
        let remainingMutations = [];
        for (const mutation of this.pendingCausalMutations) {
            // Extract source client from mutation (would need to be stored with mutation)
            // For now, we'll apply all pending mutations in timestamp order
            // TODO: Store sourceClient with pending mutations
            if (this.canApplyCausally(mutation, 'unknown')) {
                // Can apply now
                applyMutationVector(mutation);
                appliedCount++;
            }
            else {
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
    updateVectorClock(clientId, timestamp) {
        const currentClock = this.vectorClock.get(clientId) || 0;
        this.vectorClock.set(clientId, Math.max(currentClock, timestamp));
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

/**
 * Built-in Transformation Functions
 *
 * Predefined transforms for common use cases:
 * - Inverse values (slider going opposite directions)
 * - Scale/offset (unit conversions, range mapping)
 * - Clamp (bounded values)
 */
/**
 * Inverse transform - flips values around a midpoint
 *
 * @example
 * ```typescript
 * // Slider A: 0-100, Slider B: 100-0 (opposite)
 * const inverse = createInverse(0, 100);
 * inverse(0) → 100
 * inverse(100) → 0
 * inverse(50) → 50
 * ```
 */
function createInverse(min, max) {
    const transform = (value) => max - value + min;
    return {
        forward: transform,
        backward: transform // Inverse is its own inverse
    };
}
/**
 * Scale transform - maps one range to another
 *
 * @example
 * ```typescript
 * // Convert 0-100 to 0-1
 * const scale = createScale(0, 100, 0, 1);
 * scale.forward(50) → 0.5
 * scale.backward(0.5) → 50
 * ```
 */
function createScale(fromMin, fromMax, toMin, toMax) {
    const forward = (value) => {
        const normalized = (value - fromMin) / (fromMax - fromMin);
        return normalized * (toMax - toMin) + toMin;
    };
    const backward = (value) => {
        const normalized = (value - toMin) / (toMax - toMin);
        return normalized * (fromMax - fromMin) + fromMin;
    };
    return { forward, backward };
}
/**
 * Offset transform - adds/subtracts a constant
 *
 * @example
 * ```typescript
 * const offset = createOffset(10);
 * offset.forward(5) → 15
 * offset.backward(15) → 5
 * ```
 */
function createOffset(offset) {
    return {
        forward: (value) => value + offset,
        backward: (value) => value - offset
    };
}
/**
 * Multiply transform - multiplies by a factor
 *
 * @example
 * ```typescript
 * const multiply = createMultiply(2);
 * multiply.forward(5) → 10
 * multiply.backward(10) → 5
 * ```
 */
function createMultiply(factor) {
    return {
        forward: (value) => value * factor,
        backward: (value) => value / factor
    };
}
/**
 * Clamp transform - bounds values within a range
 *
 * @example
 * ```typescript
 * const clamp = createClamp(0, 100);
 * clamp(150) → 100
 * clamp(-10) → 0
 * clamp(50) → 50
 * ```
 */
function createClamp(min, max) {
    return (value) => Math.max(min, Math.min(max, value));
}
/**
 * Round transform - rounds to nearest integer or decimal places
 *
 * @example
 * ```typescript
 * const round = createRound(2); // 2 decimal places
 * round(3.14159) → 3.14
 * round(2.5) → 2.5
 * ```
 */
function createRound(decimals = 0) {
    const factor = Math.pow(10, decimals);
    return (value) => Math.round(value * factor) / factor;
}
/**
 * Temperature conversion: Celsius ↔ Fahrenheit
 *
 * @example
 * ```typescript
 * celsiusToFahrenheit.forward(0) → 32
 * celsiusToFahrenheit.forward(100) → 212
 * celsiusToFahrenheit.backward(32) → 0
 * ```
 */
const celsiusToFahrenheit = {
    forward: (c) => (c * 9 / 5) + 32,
    backward: (f) => (f - 32) * 5 / 9
};
/**
 * Percentage transform: 0-100 ↔ 0-1
 *
 * @example
 * ```typescript
 * percentageToDecimal.forward(50) → 0.5
 * percentageToDecimal.backward(0.75) → 75
 * ```
 */
const percentageToDecimal = createScale(0, 100, 0, 1);
/**
 * Degrees ↔ Radians
 *
 * @example
 * ```typescript
 * degreesToRadians.forward(180) → π
 * degreesToRadians.backward(π) → 180
 * ```
 */
const degreesToRadians = {
    forward: (deg) => deg * (Math.PI / 180),
    backward: (rad) => rad * (180 / Math.PI)
};
/**
 * Boolean inverse (toggle)
 *
 * @example
 * ```typescript
 * booleanInverse(true) → false
 * booleanInverse(false) → true
 * ```
 */
const booleanInverse = {
    forward: (value) => !value,
    backward: (value) => !value
};
/**
 * String case transform
 */
const stringCase = {
    toUpperCase: (value) => value.toUpperCase(),
    toLowerCase: (value) => value.toLowerCase(),
    capitalize: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
};
/**
 * Compose multiple transforms into a single transform
 *
 * @example
 * ```typescript
 * const transform = composeTransforms(
 *   createScale(0, 100, 0, 1),    // 0-100 → 0-1
 *   createMultiply(10),           // 0-1 → 0-10
 *   createRound(2)                // Round to 2 decimals
 * );
 * transform.forward(50) → 5.00
 * ```
 */
function composeTransforms(...transforms) {
    const forward = (value) => {
        let result = value;
        for (const transform of transforms) {
            if (typeof transform === 'function') {
                result = transform(result);
            }
            else {
                result = transform.forward(result);
            }
        }
        return result;
    };
    const backward = (value) => {
        let result = value;
        // Apply transforms in reverse order
        for (let i = transforms.length - 1; i >= 0; i--) {
            const transform = transforms[i];
            if (typeof transform === 'function') {
                // Can't invert a simple function - throw error
                throw new Error('Cannot compose backward transform with non-bidirectional function');
            }
            else {
                result = transform.backward(result);
            }
        }
        return result;
    };
    return { forward, backward };
}
/**
 * Create a throttled transform (limit update frequency)
 *
 * @example
 * ```typescript
 * const throttled = createThrottled((v) => v, 100); // Max once per 100ms
 * ```
 */
function createThrottled(transform, delayMs) {
    let lastCall = 0;
    let lastValue;
    return (value) => {
        const now = Date.now();
        if (now - lastCall >= delayMs) {
            lastCall = now;
            lastValue = transform(value);
        }
        return lastValue;
    };
}
/**
 * Create a debounced transform (wait for quiet period)
 *
 * @example
 * ```typescript
 * const debounced = createDebounced((v) => v, 300); // Wait 300ms after last change
 * ```
 */
function createDebounced(transform, delayMs) {
    let timeout;
    let lastValue;
    return (value) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            lastValue = transform(value);
        }, delayMs);
        return lastValue;
    };
}
/**
 * Identity transform (no transformation)
 * Useful as a default or placeholder
 */
const identity = {
    forward: (value) => value,
    backward: (value) => value
};

/**
 * minimact-quantum - Quantum DOM Entanglement Protocol
 *
 * 🌌 Share DOM identity across physical space
 *
 * NOT data sync. IDENTITY sync.
 * The same element existing in two places at once.
 */
const VERSION = '0.1.0';
const CODENAME = 'WebWormhole';
/**
 * Quick start helper
 *
 * @example
 * ```typescript
 * import { createQuantumManager } from 'minimact-quantum';
 *
 * const quantum = createQuantumManager({
 *   clientId: 'user-123',
 *   signalR: signalRManager
 * });
 *
 * // Entangle slider with another client
 * const slider = document.querySelector('#volume-slider');
 * await quantum.entangle(slider, {
 *   clientId: 'user-456',
 *   selector: '#volume-slider'
 * }, 'bidirectional');
 * ```
 */
function createQuantumManager(config) {
    return new EntanglementManager(config);
}

export { CODENAME, EntanglementManager, RetryQueue, VERSION, applyMutationVector, booleanInverse, canCompose, celsiusToFahrenheit, compose, composeTransforms, createClamp, createDebounced, createInverse, createMultiply, createOffset, createQuantumManager, createRound, createScale, createThrottled, degreesToRadians, getElementSelector, identity, invert, percentageToDecimal, serializeMutation, serializePositionChange, serializeStyleChange, serializeValueChange, stringCase, transform, transformBatch };
