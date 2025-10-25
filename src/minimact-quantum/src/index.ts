/**
 * minimact-quantum - Quantum DOM Entanglement Protocol
 *
 * 🌌 Share DOM identity across physical space
 *
 * NOT data sync. IDENTITY sync.
 * The same element existing in two places at once.
 */

export { EntanglementManager } from './entanglement-manager';
export {
  serializeMutation,
  serializeValueChange,
  serializeStyleChange,
  serializePositionChange,
  applyMutationVector,
  getElementSelector
} from './mutation-serializer';

export type {
  MutationVector,
  SerializedNode,
  EntanglementBinding,
  QuantumLink,
  EntanglementConfig,
  SignalRManager,
  RegisterEntanglementRequest,
  PropagateQuantumMutationRequest,
  QuantumMutationEvent
} from './types';

export const VERSION = '0.1.0';
export const CODENAME = 'WebWormhole';

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
export function createQuantumManager(config: EntanglementConfig): EntanglementManager {
  return new EntanglementManager(config);
}
