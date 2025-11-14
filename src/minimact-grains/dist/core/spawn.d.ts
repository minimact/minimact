import { GrainInstance, GrainComponent, SpawnOptions } from '../types';
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
export declare function spawnGrain<TState = any, TProps = any>(type: string, component: GrainComponent<TState, TProps>, options?: SpawnOptions<TState>): string;
/**
 * Destroy a grain
 *
 * Removes the grain from the registry and destroys all its children.
 *
 * @param grainId - ID of grain to destroy
 */
export declare function destroyGrain(grainId: string): void;
/**
 * Freeze a grain
 *
 * Preserves the grain's state but stops its execution.
 * Useful for navigation - freeze current grain before activating next.
 *
 * @param grainId - ID of grain to freeze
 */
export declare function freezeGrain(grainId: string): void;
/**
 * Activate a frozen grain
 *
 * Resumes execution of a frozen grain.
 *
 * @param grainId - ID of grain to activate
 */
export declare function activateGrain(grainId: string): void;
/**
 * Get grain state
 *
 * Retrieves the current state of a grain.
 *
 * @param grainId - ID of grain
 * @returns Grain state or undefined if not found
 */
export declare function getGrainState<TState = any>(grainId: string): TState | undefined;
/**
 * Update grain state
 *
 * Updates a grain's state. Typically called by hooks internally.
 *
 * @param grainId - ID of grain
 * @param state - New state
 */
export declare function updateGrainState<TState = any>(grainId: string, state: TState): void;
/**
 * Get all active grains
 *
 * Returns all grains with status 'active'.
 *
 * @returns Array of active grain instances
 */
export declare function getActiveGrains(): GrainInstance[];
/**
 * Get grains by type
 *
 * Returns all grains of a specific type.
 *
 * @param type - Grain type identifier
 * @returns Array of grain instances matching the type
 */
export declare function getGrainsByType(type: string): GrainInstance[];
//# sourceMappingURL=spawn.d.ts.map