/**
 * Operational Transform for Conflict Resolution
 *
 * Handles concurrent mutations from multiple clients by transforming operations
 * so they can be applied in any order while maintaining consistency.
 *
 * Based on the OT algorithm for text editing and extended for DOM mutations.
 */
export interface Operation {
    type: 'insert' | 'delete' | 'retain' | 'setAttribute' | 'removeAttribute' | 'setProperty';
    position?: number;
    value?: string | number | boolean | null;
    length?: number;
    attributeName?: string;
    propertyName?: string;
    oldValue?: string | number | boolean | null;
    timestamp: number;
    clientId: string;
}
/**
 * Transform operation A against operation B
 * Returns transformed version of A that can be applied after B
 *
 * This implements the core OT transformation function that ensures:
 * - Convergence: All clients reach the same final state
 * - Causality preservation: Operations maintain their causal ordering
 * - Intention preservation: The intent of each operation is maintained
 */
export declare function transform(opA: Operation, opB: Operation): Operation;
/**
 * Transform a list of operations against a list of concurrent operations
 * Used when applying a batch of operations
 */
export declare function transformBatch(localOps: Operation[], remoteOps: Operation[]): Operation[];
/**
 * Check if two operations can be composed into a single operation
 * Used for optimization - combining consecutive operations
 */
export declare function canCompose(opA: Operation, opB: Operation): boolean;
/**
 * Compose two operations into a single operation
 */
export declare function compose(opA: Operation, opB: Operation): Operation;
/**
 * Invert an operation (for undo/redo)
 */
export declare function invert(op: Operation): Operation;
//# sourceMappingURL=operational-transform.d.ts.map