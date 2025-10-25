/**
 * minimact-dynamic - Type definitions
 * Minimal dynamic value bindings for Minimact
 */

/**
 * Function that returns a VALUE based on state
 * NOT JSX - just a value (string, number, boolean)
 */
export type DynamicValueFunction<TState = any> = (state: TState) => string | number | boolean;

/**
 * Function that returns an array of selectors for element ordering (DOM Choreography)
 */
export type DynamicOrderFunction<TState = any> = (state: TState) => string[];

/**
 * Dynamic value binding
 */
export interface DynamicBinding<TState = any> {
  /** Unique identifier for this binding */
  bindingId: string;

  /** CSS selector */
  selector: string;

  /** Value function */
  fn: DynamicValueFunction<TState>;

  /** Auto-tracked dependencies (e.g., ['user.isPremium', 'product.price']) */
  dependencies: string[];

  /** Last computed value (for memoization) */
  currentValue?: any;
}

/**
 * Dynamic order binding (DOM Choreography)
 */
export interface DynamicOrderBinding<TState = any> {
  /** Unique identifier for this binding */
  bindingId: string;

  /** Container selector */
  containerSelector: string;

  /** Order function that returns array of child selectors */
  fn: DynamicOrderFunction<TState>;

  /** Auto-tracked dependencies */
  dependencies: string[];

  /** Last computed order */
  currentOrder?: string[];
}

/**
 * Binding metadata stored in DOM (for hydration)
 */
export interface BindingMetadata {
  bindingId: string;
  selector: string;
  dependencies: string[];
}

/**
 * Main API returned by useDynamicState()
 */
export interface DynamicStateAPI<TState = any> {
  /**
   * Register a dynamic value binding
   * @param selector - CSS selector
   * @param fn - Function that returns value based on state
   *
   * @example
   * ```typescript
   * dynamic('.price', (state) =>
   *   state.isPremium ? state.factoryPrice : state.retailPrice
   * );
   * ```
   */
  (selector: string, fn: DynamicValueFunction<TState>): void;

  /**
   * Register element order binding (DOM Choreography)
   * Elements move based on state, never destroyed
   *
   * @param containerSelector - Container selector
   * @param fn - Function that returns ordered array of child selectors
   *
   * @example
   * ```typescript
   * dynamic.order('.cards', (state) =>
   *   state.items.map(item => `#card-${item.id}`)
   * );
   * ```
   */
  order(containerSelector: string, fn: DynamicOrderFunction<TState>): void;

  /**
   * Register attribute binding
   * @param selector - CSS selector
   * @param attribute - Attribute name
   * @param fn - Function that returns attribute value
   *
   * @example
   * ```typescript
   * dynamic.attr('img', 'src', (state) => state.imageUrl);
   * ```
   */
  attr(selector: string, attribute: string, fn: DynamicValueFunction<TState>): void;

  /**
   * Register class binding
   * @param selector - CSS selector
   * @param fn - Function that returns class string
   *
   * @example
   * ```typescript
   * dynamic.class('.button', (state) =>
   *   state.isActive ? 'button active' : 'button'
   * );
   * ```
   */
  class(selector: string, fn: DynamicValueFunction<TState>): void;

  /**
   * Register style binding
   * @param selector - CSS selector
   * @param property - Style property name
   * @param fn - Function that returns style value
   *
   * @example
   * ```typescript
   * dynamic.style('.progress', 'width', (state) => `${state.progress}%`);
   * ```
   */
  style(selector: string, property: string, fn: DynamicValueFunction<TState>): void;

  /**
   * Register visibility binding
   * @param selector - CSS selector
   * @param fn - Function that returns visibility boolean
   *
   * @example
   * ```typescript
   * dynamic.show('.modal', (state) => state.isModalOpen);
   * ```
   */
  show(selector: string, fn: (state: TState) => boolean): void;

  /**
   * Get current state
   */
  getState(): TState;

  /**
   * Update state (triggers binding re-evaluation)
   * Can pass updater function or partial state object
   */
  setState(updater: (prev: TState) => TState): void;
  setState(newState: Partial<TState>): void;

  /**
   * Clear all bindings
   */
  clear(): void;

  /**
   * Remove specific binding
   */
  remove(selector: string): void;
}

/**
 * Dependency tracking result
 */
export interface DependencyTrackingResult {
  result: any;
  dependencies: string[];
}
