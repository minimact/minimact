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
export declare class PseudoStateTracker {
    private element;
    private states;
    private listeners;
    private mutationObserver?;
    private onChange?;
    constructor(element: HTMLElement, onChange?: () => void);
    /**
     * Setup all event listeners and observers
     */
    private setupListeners;
    /**
     * Add event listener and track for cleanup
     */
    private addListener;
    /**
     * Update attribute-based states
     */
    private updateAttributeStates;
    /**
     * Notify change callback
     */
    private notifyChange;
    get hover(): boolean;
    get active(): boolean;
    get focus(): boolean;
    get disabled(): boolean;
    get checked(): boolean;
    get invalid(): boolean;
    /**
     * Get all states as object
     */
    getAll(): PseudoState;
    /**
     * Cleanup - remove all listeners and observers
     */
    destroy(): void;
}
//# sourceMappingURL=pseudo-state-tracker.d.ts.map