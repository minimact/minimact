/**
 * Options for configuring DOM element observation
 */
export interface DomElementStateOptions {
  /** CSS selector to match elements (for collection mode) */
  selector?: string | null;

  /** Track viewport intersection */
  trackIntersection?: boolean;

  /** Track DOM mutations (children, attributes, etc.) */
  trackMutation?: boolean;

  /** Track element resize */
  trackResize?: boolean;

  /** Track hover state (for confidence worker predictions) */
  trackHover?: boolean;

  /** Track focus state (for confidence worker predictions) */
  trackFocus?: boolean;

  /** IntersectionObserver options */
  intersectionOptions?: IntersectionObserverInit;

  /** Debounce time for updates (ms) */
  debounceMs?: number;

  /** Lifecycle state machine configuration */
  lifecycle?: import('./lifecycle-state-tracker').LifecycleStateConfig<any>;

  /** Server sync callback for lifecycle transitions (Minimact integration only) */
  lifecycleServerSync?: (newState: string) => void;
}

/**
 * Callback fired when DOM state changes
 */
export type DomStateChangeCallback = (state: DomElementStateSnapshot) => void;

/**
 * Snapshot of DOM element state at a point in time
 */
export interface DomElementStateSnapshot {
  /** Whether element is intersecting viewport */
  isIntersecting?: boolean;

  /** Intersection ratio (0-1) */
  intersectionRatio?: number;

  /** Direct children count */
  childrenCount?: number;

  /** Total descendants count */
  grandChildrenCount?: number;

  /** Element attributes */
  attributes?: Record<string, string>;

  /** Element classes */
  classList?: string[];

  /** Element bounding rect */
  boundingRect?: DOMRect | null;

  /** Whether element exists in DOM */
  exists?: boolean;

  /** For collections: number of elements */
  count?: number;
}
