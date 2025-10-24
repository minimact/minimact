import type {
  DomElementStateOptions,
  DomStateChangeCallback,
  DomElementStateSnapshot
} from './types';
import { DomElementStateValues } from './dom-element-state-values';

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

  // Options
  private options: Required<DomElementStateOptions>;

  // Observers
  private intersectionObserver?: IntersectionObserver;
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;

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
      debounceMs: options.debounceMs ?? 16 // ~60fps
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
          this._isIntersecting = entry.isIntersecting;
          this._intersectionRatio = entry.intersectionRatio;
          this._boundingRect = entry.boundingClientRect;
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
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();

    this.intersectionObserver = undefined;
    this.mutationObserver = undefined;
    this.resizeObserver = undefined;
  }

  /**
   * Destroy the state object
   */
  destroy(): void {
    this.cleanup();
    this.onChange = undefined;
    this._element = null;
    this._elements = [];
  }
}
