import { GrainInstance, NavigationChain, RegistryConfig, RegistryStats, FieldStore } from '../types';
/**
 * Grain Registry Implementation
 *
 * Singleton that manages all active grains, their navigation chains,
 * and optional shared learning fields.
 */
declare class GrainRegistryImpl {
    grains: Map<string, GrainInstance>;
    navigationChains: Map<string, NavigationChain>;
    sharedFields?: FieldStore;
    config: RegistryConfig;
    constructor(config?: RegistryConfig);
    /**
     * Get grain by ID
     */
    getGrain(grainId: string): GrainInstance | undefined;
    /**
     * Register new grain
     */
    registerGrain(grain: GrainInstance): void;
    /**
     * Update grain state
     */
    updateGrain(grainId: string, updates: Partial<GrainInstance>): void;
    /**
     * Freeze grain (preserve state, stop execution)
     */
    freezeGrain(grainId: string): void;
    /**
     * Activate frozen grain
     */
    activateGrain(grainId: string): void;
    /**
     * Destroy grain (remove from registry)
     */
    destroyGrain(grainId: string): void;
    /**
     * Get all active grains
     */
    getActiveGrains(): GrainInstance[];
    /**
     * Get all grains by type
     */
    getGrainsByType(type: string): GrainInstance[];
    /**
     * Get navigation chain for a grain
     */
    getNavigationChain(grainId: string): NavigationChain | undefined;
    /**
     * Add navigation step to chain
     */
    addNavigationStep(fromId: string, toId: string): void;
    /**
     * Clear all grains
     */
    clear(): void;
    /**
     * Get registry statistics
     */
    getStats(): RegistryStats;
    /**
     * Export registry state (for serialization)
     */
    exportState(): any;
    /**
     * Import registry state (for deserialization)
     */
    importState(state: any): void;
}
/**
 * Create grain registry with config
 */
export declare function createGrainRegistry(config?: RegistryConfig): GrainRegistryImpl;
/**
 * Get grain registry instance
 */
export declare function getGrainRegistry(): GrainRegistryImpl;
/**
 * Reset grain registry (for testing)
 */
export declare function resetGrainRegistry(): void;
export {};
//# sourceMappingURL=GrainRegistry.d.ts.map