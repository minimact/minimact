import { GrainInstance, NavigationChain } from './Grain';

/**
 * Grain registry interface
 */
export interface GrainRegistry {
  grains: Map<string, GrainInstance>;
  navigationChains: Map<string, NavigationChain>;
  sharedFields?: FieldStore;
}

/**
 * Shared field store for global learning
 */
export interface FieldStore {
  globalProbabilityField?: Record<string, number>;
  globalVectorField?: number[];
  syncEnabled: boolean;
}

/**
 * Registry configuration options
 */
export interface RegistryConfig {
  enableSharedFields?: boolean;
  enableSerialization?: boolean;
  maxGrainHistory?: number;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalGrains: number;
  activeGrains: number;
  frozenGrains: number;
  navigationChains: number;
}
