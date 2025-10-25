/**
 * minimact-quantum - Quantum DOM Entanglement Protocol
 *
 * 🌌 Share DOM identity across physical space
 *
 * NOT data sync. IDENTITY sync.
 * The same element existing in two places at once.
 */
export { EntanglementManager } from './entanglement-manager';
export { RetryQueue } from './retry-queue';
export { serializeMutation, serializeValueChange, serializeStyleChange, serializePositionChange, applyMutationVector, getElementSelector } from './mutation-serializer';
export { transform, transformBatch, compose, canCompose, invert } from './operational-transform';
export { createInverse, createScale, createOffset, createMultiply, createClamp, createRound, celsiusToFahrenheit, percentageToDecimal, degreesToRadians, booleanInverse, stringCase, composeTransforms, createThrottled, createDebounced, identity } from './transforms';
export type { MutationVector, SerializedNode, EntanglementBinding, EntanglementOptions, QuantumLink, EntanglementConfig, SignalRManager, RegisterEntanglementRequest, PropagateQuantumMutationRequest, QuantumMutationEvent, TransformFunction, BidirectionalTransform } from './types';
export type { Operation } from './operational-transform';
import type { EntanglementConfig } from './types';
import { EntanglementManager } from './entanglement-manager';
export declare const VERSION = "0.1.0";
export declare const CODENAME = "WebWormhole";
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
export declare function createQuantumManager(config: EntanglementConfig): EntanglementManager;
