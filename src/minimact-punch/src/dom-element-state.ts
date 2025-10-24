import type {
  DomElementStateOptions,
  DomStateChangeCallback,
  DomElementStateSnapshot
} from './types';
import { DomElementStateValues } from './dom-element-state-values';
import { PseudoStateTracker } from './pseudo-state-tracker';
import { ThemeStateTracker, BreakpointState } from './theme-state-tracker';
import { StateHistoryTracker } from './state-history-tracker';
import { LifecycleStateTracker } from './lifecycle-state-tracker';
import { registerDomElementState, unregisterDomElementState } from './registry';

/**
 * DomElementState - Makes the DOM itself a reactive data source
 *
 * Tracks DOM changes (intersection, mutations, resize) and provides
 * a reactive API for accessing DOM topology in your components.
 *
 * @example
 * ```typescript
 * const box = new DomElementState(element);
 * console.log(box.childrenCount); // 3
 * console.log(box.isIntersecting); // true
 * ```
 */
export class DomElementState {
  // Core properties
  private _element: HTMLElement | null = null;
  private _elements: HTMLElement[] = [];
  private _selector: string | null = null;

  // Options (lifecycle and lifecycleServerSync are optional even after initialization)
  private options: Required<Omit<DomElementStateOptions, 'lifecycle' | 'lifecycleServerSync'>> &
    Pick<DomElementStateOptions, 'lifecycle' | 'lifecycleServerSync'>;

  // Observers
  private intersectionObserver?: IntersectionObserver;
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;

  // Pseudo-state tracker
  private pseudoStateTracker?: PseudoStateTracker;

  // Theme & breakpoint tracker
  private themeStateTracker?: ThemeStateTracker;

  // History tracker (temporal features)
  private historyTracker?: StateHistoryTracker;

  // Lifecycle state machine (theatrical features)
  private lifecycleTracker?: LifecycleStateTracker<any>;

  // Reactive state
  private _isIntersecting = false;
  private _intersectionRatio = 0;
  private _boundingRect: DOMRect | null = null;
  private _childrenCount = 0;
  private _grandChildrenCount = 0;
  private _attributes: Record<string, string> = {};
  private _classList: string[] = [];
  private _exists = false;

  // Callbacks
  private onChange?: DomStateChangeCallback;
  private updatePending = false;

  constructor(
    selectorOrElement?: string | HTMLElement,
    options: DomElementStateOptions = {}
  ) {
    // Merge options with defaults
    this.options = {
      selector: options.selector ?? null,
      trackIntersection: options.trackIntersection ?? true,
      trackMutation: options.trackMutation ?? true,
      trackResize: options.trackResize ?? true,
      trackHover: options.trackHover ?? true,
      trackFocus: options.trackFocus ?? false,
      intersectionOptions: options.intersectionOptions || {},
      debounceMs: options.debounceMs ?? 16, // ~60fps
      lifecycle: options.lifecycle, // Pass through lifecycle config if provided
      lifecycleServerSync: options.lifecycleServerSync // Pass through server sync callback
    };

    // Initialize based on input
    if (typeof selectorOrElement === 'string') {
      this._selector = selectorOrElement;
      this.attachSelector(selectorOrElement);
    } else if (selectorOrElement instanceof HTMLElement) {
      this.attachElement(selectorOrElement);
    }
  }

  // ============================================================
  // PUBLIC API - Reactive Properties
  // ============================================================

  /** The DOM element (singular mode) */
  get element(): HTMLElement | null {
    return this._element;
  }

  /** All matching elements (collection mode) */
  get elements(): HTMLElement[] {
    return this._elements;
  }

  /** Whether element is in viewport */
  get isIntersecting(): boolean {
    return this._isIntersecting;
  }

  /** Percentage of element visible (0-1) */
  get intersectionRatio(): number {
    return this._intersectionRatio;
  }

  /** Element position and size */
  get boundingRect(): DOMRect | null {
    return this._boundingRect;
  }

  /** Direct children count */
  get childrenCount(): number {
    return this._childrenCount;
  }

  /** Total descendants count */
  get grandChildrenCount(): number {
    return this._grandChildrenCount;
  }

  /** All element attributes */
  get attributes(): Record<string, string> {
    return { ...this._attributes };
  }

  /** Element classes as array */
  get classList(): string[] {
    return [...this._classList];
  }

  /** Whether element exists in DOM */
  get exists(): boolean {
    return this._exists;
  }

  // Collection properties
  /** Number of elements matching selector */
  get count(): number {
    return this._elements.length;
  }

  // ============================================================
  // COLLECTION METHODS
  // ============================================================

  /**
   * Test if all elements match a condition
   */
  every(predicate: (elem: DomElementState) => boolean): boolean {
    return this._elements.every(el => {
      const state = new DomElementState(el, this.options);
      return predicate(state);
    });
  }

  /**
   * Test if any element matches a condition
   */
  some(predicate: (elem: DomElementState) => boolean): boolean {
    return this._elements.some(el => {
      const state = new DomElementState(el, this.options);
      return predicate(state);
    });
  }

  /**
   * Filter elements by condition
   */
  filter(predicate: (elem: DomElementState) => boolean): DomElementState[] {
    return this._elements
      .filter(el => {
        const state = new DomElementState(el, this.options);
        return predicate(state);
      })
      .map(el => new DomElementState(el, this.options));
  }

  /**
   * Transform each element
   */
  map<T>(fn: (elem: DomElementState) => T): T[] {
    return this._elements.map(el => {
      const state = new DomElementState(el, this.options);
      return fn(state);
    });
  }

  // ============================================================
  // STATISTICAL OPERATIONS
  // ============================================================

  /**
   * Access statistical methods for collections
   */
  get vals(): DomElementStateValues {
    return new DomElementStateValues(
      this._elements.map(el => new DomElementState(el, this.options))
    );
  }

  // ============================================================
  // ATTACHMENT METHODS
  // ============================================================

  /**
   * Attach to a single element
   */
  attachElement(element: HTMLElement): void {
    this.cleanup();

    this._element = element;
    this._elements = [element];
    this._selector = null;
    this._exists = true;

    // Register with global registry for minimact-query integration
    registerDomElementState(element, this);

    this.updateState();
    this.setupObservers();
  }

  /**
   * Attach to elements matching selector
   */
  attachSelector(selector: string): void {
    this.cleanup();

    this._selector = selector;
    const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

    this._elements = elements;
    this._element = elements[0] || null;
    this._exists = elements.length > 0;

    // Register all elements with global registry for minimact-query integration
    for (const element of elements) {
      registerDomElementState(element, this);
    }

    if (this._element) {
      this.updateState();
      this.setupObservers();
    }
  }

  /**
   * Attach to multiple specific elements
   */
  attachElements(elements: HTMLElement[]): void {
    this.cleanup();

    this._elements = elements;
    this._element = elements[0] || null;
    this._selector = null;
    this._exists = elements.length > 0;

    // Register all elements with global registry for minimact-query integration
    for (const element of elements) {
      registerDomElementState(element, this);
    }

    if (this._element) {
      this.updateState();
      this.setupObservers();
    }
  }

  // ============================================================
  // OBSERVER SETUP
  // ============================================================

  private setupObservers(): void {
    if (!this._element) return;

    if (this.options.trackIntersection) {
      this.setupIntersectionObserver();
    }

    if (this.options.trackMutation) {
      this.setupMutationObserver();
    }

    if (this.options.trackResize) {
      this.setupResizeObserver();
    }
  }

  private setupIntersectionObserver(): void {
    if (!this._element || this.intersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Store old values for history
          const oldIsIntersecting = this._isIntersecting;
          const oldIntersectionRatio = this._intersectionRatio;

          this._isIntersecting = entry.isIntersecting;
          this._intersectionRatio = entry.intersectionRatio;
          this._boundingRect = entry.boundingClientRect;

          // Record changes in history
          if (this.historyTracker) {
            if (oldIsIntersecting !== this._isIntersecting) {
              this.historyTracker.recordChange('isIntersecting', oldIsIntersecting, this._isIntersecting);
            }
            if (oldIntersectionRatio !== this._intersectionRatio) {
              this.historyTracker.recordChange('intersectionRatio', oldIntersectionRatio, this._intersectionRatio);
            }
          }

          this.scheduleUpdate();
        }
      },
      this.options.intersectionOptions
    );

    this.intersectionObserver.observe(this._element);
  }

  private setupMutationObserver(): void {
    if (!this._element || this.mutationObserver) return;

    this.mutationObserver = new MutationObserver(() => {
      this.updateState();
      this.scheduleUpdate();
    });

    this.mutationObserver.observe(this._element, {
      childList: true,
      attributes: true,
      attributeOldValue: false,
      characterData: false,
      subtree: true
    });
  }

  private setupResizeObserver(): void {
    if (!this._element || this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      this._boundingRect = this._element!.getBoundingClientRect();
      this.scheduleUpdate();
    });

    this.resizeObserver.observe(this._element);
  }

  // ============================================================
  // STATE UPDATE
  // ============================================================

  private updateState(): void {
    if (!this._element) return;

    // Store old values for history tracking
    const oldChildrenCount = this._childrenCount;
    const oldGrandChildrenCount = this._grandChildrenCount;
    const oldAttributes = { ...this._attributes };
    const oldClassList = [...this._classList];

    // Update children counts
    this._childrenCount = this._element.children.length;
    this._grandChildrenCount = this._element.querySelectorAll('*').length;

    // Update attributes
    const attrs: Record<string, string> = {};
    for (let i = 0; i < this._element.attributes.length; i++) {
      const attr = this._element.attributes[i];
      attrs[attr.name] = attr.value;
    }
    this._attributes = attrs;

    // Update classList
    this._classList = Array.from(this._element.classList);

    // Update bounding rect
    this._boundingRect = this._element.getBoundingClientRect();

    // Record changes in history tracker
    if (this.historyTracker) {
      if (oldChildrenCount !== this._childrenCount) {
        this.historyTracker.recordChange('childrenCount', oldChildrenCount, this._childrenCount);
      }

      if (oldGrandChildrenCount !== this._grandChildrenCount) {
        this.historyTracker.recordChange('grandChildrenCount', oldGrandChildrenCount, this._grandChildrenCount);
      }

      if (JSON.stringify(oldAttributes) !== JSON.stringify(this._attributes)) {
        this.historyTracker.recordChange('attributes', oldAttributes, this._attributes);
      }

      if (JSON.stringify(oldClassList) !== JSON.stringify(this._classList)) {
        this.historyTracker.recordChange('classList', oldClassList, this._classList);
      }

      // Record mutation
      this.historyTracker.recordMutation();
    }
  }

  private scheduleUpdate(): void {
    if (this.updatePending) return;

    this.updatePending = true;

    requestAnimationFrame(() => {
      this.notifyChange();
      this.updatePending = false;
    });
  }

  private notifyChange(): void {
    if (this.onChange) {
      const snapshot: DomElementStateSnapshot = {
        isIntersecting: this._isIntersecting,
        intersectionRatio: this._intersectionRatio,
        childrenCount: this._childrenCount,
        grandChildrenCount: this._grandChildrenCount,
        attributes: this.attributes,
        classList: this.classList,
        boundingRect: this._boundingRect,
        exists: this._exists,
        count: this._elements.length
      };

      this.onChange(snapshot);
    }
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Set callback for state changes
   */
  setOnChange(callback: DomStateChangeCallback): void {
    this.onChange = callback;
  }

  /**
   * Clean up all observers and resources
   */
  cleanup(): void {
    // Unregister all tracked elements from global registry
    for (const element of this._elements) {
      unregisterDomElementState(element, this);
    }

    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();

    this.intersectionObserver = undefined;
    this.mutationObserver = undefined;
    this.resizeObserver = undefined;
  }

  /**
   * Get pseudo-state tracker (lazy initialization)
   *
   * @example
   * ```typescript
   * const box = new DomElementState(element);
   * console.log(box.state.hover); // true/false
   * console.log(box.state.focus); // true/false
   * ```
   */
  get state(): PseudoStateTracker {
    if (!this.pseudoStateTracker && this._element) {
      this.pseudoStateTracker = new PseudoStateTracker(this._element, () => {
        this.notifyChange();
      });
    }

    if (!this.pseudoStateTracker) {
      throw new Error('[minimact-punch] Cannot access state - element not attached');
    }

    return this.pseudoStateTracker;
  }

  /**
   * Get theme state (dark mode, high contrast, reduced motion)
   *
   * @example
   * ```typescript
   * const app = new DomElementState(rootElement);
   * console.log(app.theme.isDark); // true/false
   * console.log(app.theme.reducedMotion); // true/false
   * ```
   */
  get theme(): ThemeStateTracker {
    if (!this.themeStateTracker) {
      this.themeStateTracker = new ThemeStateTracker(() => {
        this.notifyChange();
      });
    }

    return this.themeStateTracker;
  }

  /**
   * Get breakpoint state (sm, md, lg, xl, 2xl)
   *
   * @example
   * ```typescript
   * const app = new DomElementState(rootElement);
   * console.log(app.breakpoint.md); // true/false
   * console.log(app.breakpoint.between('md', 'lg')); // true/false
   * ```
   */
  get breakpoint(): BreakpointState {
    return new BreakpointState(this.theme);
  }

  /**
   * Get history tracker (temporal awareness)
   *
   * Provides access to:
   * - Change count, frequency analysis (changes per second/minute)
   * - Stability detection (hasStabilized, isOscillating)
   * - Trend analysis (increasing, decreasing, stable, volatile)
   * - Historical queries (updatedInLast, changedMoreThan, wasStableFor)
   * - Predictions (likelyToChangeNext, estimatedNextChange)
   *
   * @example
   * ```typescript
   * const widget = new DomElementState(element);
   * console.log(widget.history.changesPerSecond); // 0.37
   * console.log(widget.history.hasStabilized); // true
   * console.log(widget.history.trend); // 'increasing'
   * ```
   */
  get history(): StateHistoryTracker {
    if (!this.historyTracker) {
      this.historyTracker = new StateHistoryTracker(() => {
        this.notifyChange();
      });
    }

    return this.historyTracker;
  }

  /**
   * Get lifecycle state machine (theatrical engine)
   *
   * Transforms the element into a finite state machine with:
   * - Declarative states with valid transitions
   * - Styles bound to each state
   * - Templates bound to each state
   * - Lifecycle hooks (onEnter, onExit, onTransition)
   * - Auto-transitions with durations
   * - Transition history tracking
   *
   * @example
   * ```typescript
   * const modal = new DomElementState(element, {
   *   lifecycle: {
   *     states: ['hidden', 'visible'],
   *     defaultState: 'hidden',
   *     styles: {
   *       hidden: { opacity: 0 },
   *       visible: { opacity: 1 }
   *     }
   *   }
   * });
   *
   * console.log(modal.lifecycle.lifecycleState); // 'hidden'
   * modal.lifecycle.transitionTo('visible');
   * console.log(modal.lifecycle.style); // { opacity: 1 }
   * ```
   */
  get lifecycle(): LifecycleStateTracker<any> {
    if (!this.lifecycleTracker) {
      const lifecycleConfig = this.options.lifecycle;

      if (!lifecycleConfig) {
        throw new Error(
          '[minimact-punch] Cannot access lifecycle - no lifecycle config provided in options'
        );
      }

      this.lifecycleTracker = new LifecycleStateTracker(
        lifecycleConfig,
        () => {
          this.notifyChange();
        },
        this.options.lifecycleServerSync // Server sync callback (Minimact integration)
      );
    }

    return this.lifecycleTracker;
  }

  /**
   * Destroy the state object
   */
  destroy(): void {
    this.cleanup();
    this.pseudoStateTracker?.destroy();
    this.pseudoStateTracker = undefined;
    this.themeStateTracker?.destroy();
    this.themeStateTracker = undefined;
    this.historyTracker?.destroy();
    this.historyTracker = undefined;
    this.lifecycleTracker?.destroy();
    this.lifecycleTracker = undefined;
    this.onChange = undefined;
    this._element = null;
    this._elements = [];
  }
}
