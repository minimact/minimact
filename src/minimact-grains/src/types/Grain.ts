/**
 * Grain status lifecycle states
 */
export type GrainStatus = 'active' | 'frozen' | 'destroyed';

/**
 * Core grain instance metadata and state
 */
export interface GrainInstance<TState = any> {
  // Identity
  grainId: string;
  type: string; // Component/function name

  // State
  state: TState;
  reducerName?: string;
  spawnParams?: any;

  // Navigation
  navigationFn?: () => string | null;

  // Hierarchy
  parentId?: string;
  childIds: string[];

  // Causality Tracking
  spawnedBy?: string;
  navigatedFrom?: string;
  decisionContext?: DecisionContext;
  timestamp: number;

  // Learning Fields
  probabilityField?: Record<string, number>;
  vectorField?: number[];
  entropy?: number;

  // Lifecycle
  status: GrainStatus;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Decision context for causal tracking
 */
export interface DecisionContext {
  chosenPath?: string;
  targetVector?: number[];
  availableOptions?: string[];
  confidence?: number;
}

/**
 * Grain component function signature
 */
export interface GrainComponent<TState = any, TProps = any> {
  (props?: TProps): JSX.Element | null;
}

/**
 * Options for spawning a new grain
 */
export interface SpawnOptions<TState = any> {
  initialState?: TState;
  parentId?: string;
  spawnedBy?: string;
  metadata?: Record<string, any>;
  probabilityField?: Record<string, number>;
  vectorField?: number[];
  sync?: SyncOptions;
}

/**
 * Sync configuration for hybrid grains
 */
export interface SyncOptions {
  mode?: 'disabled' | 'debounced' | 'immediate' | 'realtime';
  interval?: number; // ms for debounced mode
  onSync?: (state: any) => Promise<void>;
}

/**
 * Navigation chain tracking
 */
export interface NavigationChain {
  grainId: string;
  path: string[]; // [fromId, toId, toId, ...]
  rewards: number[];
  timestamps: number[];
}
