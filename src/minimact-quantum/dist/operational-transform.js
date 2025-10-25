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
export function transform(opA, opB) {
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
export function transformBatch(localOps, remoteOps) {
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
export function canCompose(opA, opB) {
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
export function compose(opA, opB) {
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
export function invert(op) {
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
