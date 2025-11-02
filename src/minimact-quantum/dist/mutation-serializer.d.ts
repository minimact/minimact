/**
 * minimact-quantum - Mutation Serializer
 *
 * Serializes DOM mutations into vectors for transmission
 * through the entanglement channel (WebWormhole 🌌)
 */
import type { MutationVector } from './types';
/**
 * Serialize a MutationRecord into a MutationVector
 *
 * @param mutation - Native MutationRecord from MutationObserver
 * @param elementSelector - Selector for the target element
 * @returns MutationVector ready for transmission
 */
export declare function serializeMutation(mutation: MutationRecord, elementSelector: string): MutationVector;
/**
 * Serialize a DOM mutation for input value changes
 * (These don't trigger MutationObserver, need manual tracking)
 */
export declare function serializeValueChange(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, elementSelector: string, oldValue: any): MutationVector;
/**
 * Serialize a style change
 */
export declare function serializeStyleChange(element: HTMLElement, elementSelector: string, property: string, oldValue: string, newValue: string): MutationVector;
/**
 * Serialize a position change (for drag/drop)
 */
export declare function serializePositionChange(element: HTMLElement, elementSelector: string, oldPosition: {
    x: number;
    y: number;
}, newPosition: {
    x: number;
    y: number;
}): MutationVector;
/**
 * Apply a mutation vector to a DOM element
 * (Deserialize and apply)
 *
 * @param vector - Mutation vector from remote client
 */
export declare function applyMutationVector(vector: MutationVector): void;
/**
 * Get a unique selector for an element
 * Tries ID first, then falls back to class or tag
 */
export declare function getElementSelector(element: Element): string;
//# sourceMappingURL=mutation-serializer.d.ts.map