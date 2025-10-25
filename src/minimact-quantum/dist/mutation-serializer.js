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
export function serializeMutation(mutation, elementSelector) {
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
export function serializeValueChange(element, elementSelector, oldValue) {
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
export function serializeStyleChange(element, elementSelector, property, oldValue, newValue) {
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
export function serializePositionChange(element, elementSelector, oldPosition, newPosition) {
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
export function applyMutationVector(vector) {
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
export function getElementSelector(element) {
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
