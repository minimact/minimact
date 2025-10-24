/**
 * Pseudo-State Tracker
 *
 * Makes CSS pseudo-selectors (:hover, :active, :focus, :disabled) reactive JavaScript values.
 * Eliminates manual event handler tracking for pseudo-states.
 *
 * Features:
 * - Hover state (mouseenter/mouseleave)
 * - Active state (mousedown/mouseup)
 * - Focus state (focus/blur)
 * - Disabled state (attribute-based)
 * - Checked state (attribute-based)
 * - Invalid state (attribute-based)
 */

export interface PseudoState {
  hover: boolean;
  active: boolean;
  focus: boolean;
  disabled: boolean;
  checked: boolean;
  invalid: boolean;
}

export class PseudoStateTracker {
  private element: HTMLElement;
  private states: PseudoState = {
    hover: false,
    active: false,
    focus: false,
    disabled: false,
    checked: false,
    invalid: false,
  };

  private listeners: Array<{ event: string; handler: EventListener; options?: AddEventListenerOptions }> = [];
  private mutationObserver?: MutationObserver;
  private onChange?: () => void;

  constructor(element: HTMLElement, onChange?: () => void) {
    this.element = element;
    this.onChange = onChange;
    this.setupListeners();
  }

  /**
   * Setup all event listeners and observers
   */
  private setupListeners(): void {
    // Hover state
    this.addListener('mouseenter', () => {
      this.states.hover = true;
      this.notifyChange();
    });

    this.addListener('mouseleave', () => {
      this.states.hover = false;
      this.notifyChange();
    });

    // Active state
    this.addListener('mousedown', () => {
      this.states.active = true;
      this.notifyChange();
    });

    this.addListener('mouseup', () => {
      this.states.active = false;
      this.notifyChange();
    });

    // Also clear active on mouseleave (in case mouseup happens outside)
    this.addListener('mouseleave', () => {
      if (this.states.active) {
        this.states.active = false;
        this.notifyChange();
      }
    });

    // Focus state
    this.addListener('focus', () => {
      this.states.focus = true;
      this.notifyChange();
    });

    this.addListener('blur', () => {
      this.states.focus = false;
      this.notifyChange();
    });

    // Attribute-based states (use MutationObserver)
    this.mutationObserver = new MutationObserver(() => {
      this.updateAttributeStates();
    });

    this.mutationObserver.observe(this.element, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-checked', 'aria-invalid']
    });

    // Initialize attribute states
    this.updateAttributeStates();
  }

  /**
   * Add event listener and track for cleanup
   */
  private addListener(
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    this.element.addEventListener(event, handler, options);
    this.listeners.push({ event, handler, options });
  }

  /**
   * Update attribute-based states
   */
  private updateAttributeStates(): void {
    const prevDisabled = this.states.disabled;
    const prevChecked = this.states.checked;
    const prevInvalid = this.states.invalid;

    // Disabled state
    this.states.disabled =
      this.element.hasAttribute('disabled') ||
      this.element.getAttribute('aria-disabled') === 'true';

    // Checked state (for inputs)
    if (this.element instanceof HTMLInputElement) {
      this.states.checked = this.element.checked;
    } else {
      this.states.checked = this.element.getAttribute('aria-checked') === 'true';
    }

    // Invalid state (for inputs)
    if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
      this.states.invalid = !this.element.validity.valid;
    } else {
      this.states.invalid = this.element.getAttribute('aria-invalid') === 'true';
    }

    // Only notify if something actually changed
    if (
      prevDisabled !== this.states.disabled ||
      prevChecked !== this.states.checked ||
      prevInvalid !== this.states.invalid
    ) {
      this.notifyChange();
    }
  }

  /**
   * Notify change callback
   */
  private notifyChange(): void {
    if (this.onChange) {
      this.onChange();
    }
  }

  // Getters for pseudo-states
  get hover(): boolean {
    return this.states.hover;
  }

  get active(): boolean {
    return this.states.active;
  }

  get focus(): boolean {
    return this.states.focus;
  }

  get disabled(): boolean {
    return this.states.disabled;
  }

  get checked(): boolean {
    return this.states.checked;
  }

  get invalid(): boolean {
    return this.states.invalid;
  }

  /**
   * Get all states as object
   */
  getAll(): PseudoState {
    return { ...this.states };
  }

  /**
   * Cleanup - remove all listeners and observers
   */
  destroy(): void {
    // Remove all event listeners
    for (const { event, handler, options } of this.listeners) {
      this.element.removeEventListener(event, handler, options as EventListenerOptions);
    }
    this.listeners = [];

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }
  }
}
