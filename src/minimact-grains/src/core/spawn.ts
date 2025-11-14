import { GrainInstance, GrainComponent, SpawnOptions } from '../types';
import { getGrainRegistry } from './GrainRegistry';

let grainCounter = 0;

/**
 * Generate unique grain ID
 */
function generateGrainId(type: string): string {
  return `${type}:${++grainCounter}:${Date.now()}`;
}

/**
 * Spawn a new grain
 *
 * Creates a new grain instance in the registry with the given type,
 * component, and options.
 *
 * @param type - Grain type identifier (e.g., 'CounterGrain', 'ExplorerAgent')
 * @param component - Grain component function
 * @param options - Spawn configuration options
 * @returns Unique grain ID
 */
export function spawnGrain<TState = any, TProps = any>(
  type: string,
  component: GrainComponent<TState, TProps>,
  options: SpawnOptions<TState> = {}
): string {
  const registry = getGrainRegistry();

  const grainId = generateGrainId(type);

  const grain: GrainInstance<TState> = {
    grainId,
    type,
    state: options.initialState || ({} as TState),
    spawnParams: options,
    parentId: options.parentId,
    childIds: [],
    spawnedBy: options.spawnedBy,
    timestamp: Date.now(),
    status: 'active',
    probabilityField: options.probabilityField,
    vectorField: options.vectorField,
    metadata: options.metadata
  };

  // Register in parent's children
  if (options.parentId) {
    const parent = registry.getGrain(options.parentId);
    if (parent) {
      parent.childIds.push(grainId);
    }
  }

  registry.registerGrain(grain);

  console.log(`[Grains] Spawned grain: ${grainId} (type: ${type})`);

  return grainId;
}

/**
 * Destroy a grain
 *
 * Removes the grain from the registry and destroys all its children.
 *
 * @param grainId - ID of grain to destroy
 */
export function destroyGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.destroyGrain(grainId);
}

/**
 * Freeze a grain
 *
 * Preserves the grain's state but stops its execution.
 * Useful for navigation - freeze current grain before activating next.
 *
 * @param grainId - ID of grain to freeze
 */
export function freezeGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.freezeGrain(grainId);
}

/**
 * Activate a frozen grain
 *
 * Resumes execution of a frozen grain.
 *
 * @param grainId - ID of grain to activate
 */
export function activateGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.activateGrain(grainId);
}

/**
 * Get grain state
 *
 * Retrieves the current state of a grain.
 *
 * @param grainId - ID of grain
 * @returns Grain state or undefined if not found
 */
export function getGrainState<TState = any>(grainId: string): TState | undefined {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);
  return grain?.state as TState | undefined;
}

/**
 * Update grain state
 *
 * Updates a grain's state. Typically called by hooks internally.
 *
 * @param grainId - ID of grain
 * @param state - New state
 */
export function updateGrainState<TState = any>(grainId: string, state: TState): void {
  const registry = getGrainRegistry();
  registry.updateGrain(grainId, { state });
}

/**
 * Get all active grains
 *
 * Returns all grains with status 'active'.
 *
 * @returns Array of active grain instances
 */
export function getActiveGrains(): GrainInstance[] {
  const registry = getGrainRegistry();
  return registry.getActiveGrains();
}

/**
 * Get grains by type
 *
 * Returns all grains of a specific type.
 *
 * @param type - Grain type identifier
 * @returns Array of grain instances matching the type
 */
export function getGrainsByType(type: string): GrainInstance[] {
  const registry = getGrainRegistry();
  return registry.getGrainsByType(type);
}
