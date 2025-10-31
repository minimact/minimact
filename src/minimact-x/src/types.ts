/**
 * Minimact X - TypeScript Type Definitions
 * CSS for State Logic - Declarative state projection system
 */

/**
 * How to apply the transformed value to the target element
 */
export type ApplyMode = 'textContent' | 'innerHTML' | 'attribute' | 'class' | 'style';

/**
 * Server synchronization strategy
 */
export type SyncStrategy = 'immediate' | 'debounced' | 'manual';

/**
 * Target projection configuration
 * Defines how state values are transformed and applied to DOM elements
 */
export interface TargetProjection<T> {
  /**
   * Transform function - converts state value to displayable format
   * Should be a pure function for optimal serialization
   *
   * @example
   * transform: v => `$${v.toFixed(2)}`
   * transform: v => v.toUpperCase()
   * transform: v => v.done ? '✓' : '○'
   */
  transform?: (value: T) => string | number | boolean;

  /**
   * Transform ID from global registry (alternative to inline transform)
   * Use for reusable transforms that need server-side execution
   *
   * @example
   * transformId: 'currency-usd'
   * transformId: 'date-short'
   */
  transformId?: string;

  /**
   * Conditional application based on context
   * Return true to apply the projection, false to skip
   *
   * @example
   * applyIf: ctx => ctx.user.isLoggedIn
   * applyIf: ctx => ctx.user.role === 'admin'
   */
  applyIf?: (context: any) => boolean;

  /**
   * How to apply the transformed value to the DOM
   * @default 'textContent'
   */
  applyAs?: ApplyMode;

  /**
   * Property name (required for 'attribute', 'style', or 'class' modes)
   *
   * @example
   * applyAs: 'attribute', property: 'href'
   * applyAs: 'style', property: 'width'
   * applyAs: 'class', property: 'active'
   */
  property?: string;

  /**
   * Template patch hint ID for parameterized patch matching
   * Enables integration with Template Patch System
   *
   * @example
   * template: 'price-display-{0}'
   * template: 'todo-item-{0}-{1}'
   */
  template?: string;

  /**
   * Skip DOM traversal if applyIf returns false
   * Optimization for conditional rendering
   * @default false
   */
  skipIfFalse?: boolean;

  /**
   * Cache key generator for selective projection caching
   * @example
   * cacheKey: ctx => ctx.user.role
   */
  cacheKey?: (context: any) => string;
}

/**
 * useStateX configuration object
 */
export interface StateXConfig<T> {
  /**
   * Target selectors and their projection rules
   * Keys are CSS selectors relative to component root
   *
   * @example
   * targets: {
   *   '.price-display': {
   *     transform: v => `$${v.toFixed(2)}`,
   *     applyIf: ctx => ctx.user.canSeePrice
   *   },
   *   '.admin-price': {
   *     transform: v => `Admin: $${v}`,
   *     applyIf: ctx => ctx.user.isAdmin
   *   }
   * }
   */
  targets: Record<string, TargetProjection<T>>;

  /**
   * Custom context provider for applyIf conditions
   * If not provided, uses component's context
   *
   * @example
   * context: () => ({ user: getUserContext() })
   */
  context?: () => any;

  /**
   * Custom equality check for change detection
   * @default Object.is
   *
   * @example
   * equals: (prev, next) => prev.id === next.id
   */
  equals?: (prev: T, next: T) => boolean;

  /**
   * Server synchronization strategy
   * @default 'immediate'
   */
  sync?: SyncStrategy;

  /**
   * Debounce delay in milliseconds (if sync = 'debounced')
   * @default 300
   */
  syncDelay?: number;

  /**
   * Enable dependency tracking for DevTools
   * @default true
   */
  trackDependencies?: boolean;
}

/**
 * setState function signature
 */
export type SetStateXFunction<T> = (newValue: T | ((prev: T) => T)) => void;

/**
 * useStateX return tuple
 */
export type UseStateXReturn<T> = [T, SetStateXFunction<T>];

/**
 * Transform function type (for registry)
 */
export type TransformFunction = (value: any) => string | number | boolean;

/**
 * Global transform registry entry
 */
export interface TransformRegistryEntry {
  id: string;
  fn: TransformFunction;
  description?: string;
}

/**
 * Projection application result
 */
export interface ProjectionResult {
  selector: string;
  applied: boolean;
  transformedValue?: string | number | boolean;
  element?: HTMLElement;
  applyIfResult?: boolean;
  error?: Error;
  latency?: number;
}

/**
 * State projection metadata (stored in component context)
 */
export interface StateXProjection {
  stateKey: string;
  config: StateXConfig<any>;
  currentValue: any;
  lastUpdated: number;
  affectedTargets: string[];
  projectionResults: ProjectionResult[];
}

/**
 * Dependency graph for state → DOM relationships
 */
export interface StateXDependencyGraph {
  /**
   * State key → Target selectors that depend on it
   */
  stateToDom: Map<string, Set<string>>;

  /**
   * Target selector → State keys it depends on
   */
  domToState: Map<string, Set<string>>;

  /**
   * Full dependency metadata for DevTools
   */
  metadata: DependencyMetadata[];
}

/**
 * Dependency metadata entry
 */
export interface DependencyMetadata {
  stateKey: string;
  selector: string;
  hasTransform: boolean;
  hasCondition: boolean;
  transformType: 'inline' | 'registry' | 'none';
  transformId?: string;
  applyMode: ApplyMode;
  property?: string;
}

/**
 * Component context extension for useStateX
 * Extends the base ComponentContext from @minimact/core
 */
export interface StateXContext {
  /**
   * All state projections for this component
   */
  stateProjections?: Map<string, StateXProjection>;

  /**
   * Dependency graph for this component
   */
  dependencyGraph?: StateXDependencyGraph;

  /**
   * Custom projection context (for applyIf conditions)
   */
  projectionContext?: any;
}

/**
 * DevTools bridge interface
 */
export interface StateXDevToolsBridge {
  /**
   * Notify DevTools of a state projection update
   */
  projectionUpdate(event: ProjectionUpdateEvent): void;

  /**
   * Notify DevTools of a transform error
   */
  transformError(event: TransformErrorEvent): void;
}

/**
 * Projection update event (for DevTools)
 */
export interface ProjectionUpdateEvent {
  componentId: string;
  stateKey: string;
  selector: string;
  oldValue: any;
  newValue: any;
  transformedValue: string | number | boolean;
  applied: boolean;
  applyIfResult?: boolean;
  latency: number;
  timestamp: number;
}

/**
 * Transform error event (for DevTools)
 */
export interface TransformErrorEvent {
  componentId: string;
  stateKey: string;
  selector: string;
  error: Error;
  value: any;
  timestamp: number;
}

/**
 * Sync options for manual sync strategy
 */
export interface ManualSyncOptions {
  /**
   * Force sync even if value hasn't changed
   */
  force?: boolean;

  /**
   * Include projection results in sync
   */
  includeResults?: boolean;
}
