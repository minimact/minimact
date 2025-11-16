import { GrainInstance, NavigationChain, RegistryConfig, RegistryStats, FieldStore } from '../types';

/**
 * Grain Registry Implementation
 *
 * Singleton that manages all active grains, their navigation chains,
 * and optional shared learning fields.
 */
class GrainRegistryImpl {
  grains: Map<string, GrainInstance> = new Map();
  navigationChains: Map<string, NavigationChain> = new Map();
  sharedFields?: FieldStore;
  config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      enableSharedFields: false,
      enableSerialization: true,
      maxGrainHistory: 1000,
      ...config
    };

    if (this.config.enableSharedFields) {
      this.sharedFields = {
        globalProbabilityField: {},
        globalVectorField: [],
        syncEnabled: true
      };
    }
  }

  /**
   * Get grain by ID
   */
  getGrain(grainId: string): GrainInstance | undefined {
    return this.grains.get(grainId);
  }

  /**
   * Register new grain
   */
  registerGrain(grain: GrainInstance): void {
    this.grains.set(grain.grainId, grain);

    // Initialize navigation chain
    this.navigationChains.set(grain.grainId, {
      grainId: grain.grainId,
      path: grain.navigatedFrom ? [grain.navigatedFrom] : [],
      rewards: [],
      timestamps: [grain.timestamp]
    });

    console.log(`[Grains] Registered grain: ${grain.grainId} (type: ${grain.type})`);
  }

  /**
   * Update grain state
   */
  updateGrain(grainId: string, updates: Partial<GrainInstance>): void {
    const grain = this.grains.get(grainId);
    if (!grain) {
      console.warn(`[Grains] Cannot update non-existent grain: ${grainId}`);
      return;
    }

    Object.assign(grain, updates);
    this.grains.set(grainId, grain);
  }

  /**
   * Freeze grain (preserve state, stop execution)
   */
  freezeGrain(grainId: string): void {
    this.updateGrain(grainId, { status: 'frozen' });
    console.log(`[Grains] Frozen grain: ${grainId}`);
  }

  /**
   * Activate frozen grain
   */
  activateGrain(grainId: string): void {
    this.updateGrain(grainId, { status: 'active' });
    console.log(`[Grains] Activated grain: ${grainId}`);
  }

  /**
   * Destroy grain (remove from registry)
   */
  destroyGrain(grainId: string): void {
    const grain = this.grains.get(grainId);
    if (!grain) return;

    // Destroy all children first (recursive)
    grain.childIds.forEach(childId => this.destroyGrain(childId));

    // Remove from parent's children
    if (grain.parentId) {
      const parent = this.grains.get(grain.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter(id => id !== grainId);
      }
    }

    // Mark as destroyed
    this.updateGrain(grainId, { status: 'destroyed' });

    // Remove from registry
    this.grains.delete(grainId);
    this.navigationChains.delete(grainId);

    console.log(`[Grains] Destroyed grain: ${grainId}`);
  }

  /**
   * Get all active grains
   */
  getActiveGrains(): GrainInstance[] {
    return Array.from(this.grains.values()).filter(g => g.status === 'active');
  }

  /**
   * Get all grains by type
   */
  getGrainsByType(type: string): GrainInstance[] {
    return Array.from(this.grains.values()).filter(g => g.type === type);
  }

  /**
   * Get navigation chain for a grain
   */
  getNavigationChain(grainId: string): NavigationChain | undefined {
    return this.navigationChains.get(grainId);
  }

  /**
   * Add navigation step to chain
   */
  addNavigationStep(fromId: string, toId: string): void {
    const chain = this.navigationChains.get(toId);
    if (chain) {
      chain.path.push(fromId);
      chain.timestamps.push(Date.now());
    }
  }

  /**
   * Clear all grains
   */
  clear(): void {
    this.grains.clear();
    this.navigationChains.clear();
    console.log('[Grains] Registry cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    return {
      totalGrains: this.grains.size,
      activeGrains: this.getActiveGrains().length,
      frozenGrains: Array.from(this.grains.values()).filter(g => g.status === 'frozen').length,
      navigationChains: this.navigationChains.size
    };
  }

  /**
   * Export registry state (for serialization)
   */
  exportState(): any {
    return {
      grains: Array.from(this.grains.entries()),
      navigationChains: Array.from(this.navigationChains.entries()),
      sharedFields: this.sharedFields,
      timestamp: Date.now()
    };
  }

  /**
   * Import registry state (for deserialization)
   */
  importState(state: any): void {
    this.grains = new Map(state.grains);
    this.navigationChains = new Map(state.navigationChains);
    this.sharedFields = state.sharedFields;
    console.log('[Grains] Registry state imported');
  }
}

// Singleton instance
let registryInstance: GrainRegistryImpl | null = null;

/**
 * Create grain registry with config
 */
export function createGrainRegistry(config?: RegistryConfig): GrainRegistryImpl {
  if (!registryInstance) {
    registryInstance = new GrainRegistryImpl(config);
  }
  return registryInstance;
}

/**
 * Get grain registry instance
 */
export function getGrainRegistry(): GrainRegistryImpl {
  if (!registryInstance) {
    registryInstance = new GrainRegistryImpl();
  }
  return registryInstance;
}

/**
 * Reset grain registry (for testing)
 */
export function resetGrainRegistry(): void {
  registryInstance = null;
}
