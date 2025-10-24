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
export class PseudoStateTracker {
    constructor(element, onChange) {
        this.states = {
            hover: false,
            active: false,
            focus: false,
            disabled: false,
            checked: false,
            invalid: false,
        };
        this.listeners = [];
        this.element = element;
        this.onChange = onChange;
        this.setupListeners();
    }
    /**
     * Setup all event listeners and observers
     */
    setupListeners() {
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
    addListener(event, handler, options) {
        this.element.addEventListener(event, handler, options);
        this.listeners.push({ event, handler, options });
    }
    /**
     * Update attribute-based states
     */
    updateAttributeStates() {
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
        }
        else {
            this.states.checked = this.element.getAttribute('aria-checked') === 'true';
        }
        // Invalid state (for inputs)
        if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
            this.states.invalid = !this.element.validity.valid;
        }
        else {
            this.states.invalid = this.element.getAttribute('aria-invalid') === 'true';
        }
        // Only notify if something actually changed
        if (prevDisabled !== this.states.disabled ||
            prevChecked !== this.states.checked ||
            prevInvalid !== this.states.invalid) {
            this.notifyChange();
        }
    }
    /**
     * Notify change callback
     */
    notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
    // Getters for pseudo-states
    get hover() {
        return this.states.hover;
    }
    get active() {
        return this.states.active;
    }
    get focus() {
        return this.states.focus;
    }
    get disabled() {
        return this.states.disabled;
    }
    get checked() {
        return this.states.checked;
    }
    get invalid() {
        return this.states.invalid;
    }
    /**
     * Get all states as object
     */
    getAll() {
        return { ...this.states };
    }
    /**
     * Cleanup - remove all listeners and observers
     */
    destroy() {
        // Remove all event listeners
        for (const { event, handler, options } of this.listeners) {
            this.element.removeEventListener(event, handler, options);
        }
        this.listeners = [];
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }
    }
}
