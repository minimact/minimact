/**
 * Minimact Punch 🌵 + 🍹
 *
 * DOM observation and reactivity addon for Minimact.
 * Makes the DOM itself a first-class reactive data source.
 *
 * **Dual-Mode Package:**
 * - **Standalone Mode**: Use `DomElementState` class directly (no Minimact required)
 * - **Integrated Mode**: Use `useDomElementState` hook (requires Minimact)
 *
 * @packageDocumentation
 */
// ============================================================
// STANDALONE MODE (No Minimact required)
// ============================================================
/**
 * Core classes - work without Minimact
 * Use these for vanilla JS/TS projects or testing
 */
export { DomElementState } from './dom-element-state';
export { DomElementStateValues } from './dom-element-state-values';
export { PseudoStateTracker } from './pseudo-state-tracker';
export { ThemeStateTracker, BreakpointState } from './theme-state-tracker';
export { StateHistoryTracker } from './state-history-tracker';
export { LifecycleStateTracker } from './lifecycle-state-tracker';
/**
 * Standalone hook (no Minimact integration)
 * Just creates and returns a DomElementState instance
 *
 * @deprecated Use `createDomElementState` instead for clarity
 */
export { useDomElementState as createDomElementState } from './use-dom-element-state';
// ============================================================
// INTEGRATED MODE (Requires Minimact)
// ============================================================
/**
 * Integrated hook - works with Minimact component context
 * Includes HintQueue integration for predictive rendering
 *
 * @requires minimact
 */
export { useDomElementState, cleanupDomElementStates, setComponentContext, clearComponentContext, getCurrentContext } from './integration';
/**
 * Confidence Worker (OPTIONAL)
 * Enables predictive hints based on user intent
 *
 * If worker fails to load, useDomElementState still works normally.
 */
export { ConfidenceWorkerManager } from './confidence-worker-manager';
// ============================================================
// VERSION & METADATA
// ============================================================
export const VERSION = '0.1.0';
export const MES_CERTIFICATION = 'Silver'; // Minimact Extension Standards
/**
 * Package metadata for debugging
 */
export const PACKAGE_INFO = {
    name: 'minimact-punch',
    version: VERSION,
    certification: MES_CERTIFICATION,
    modes: ['standalone', 'integrated'],
    features: [
        'IntersectionObserver integration',
        'MutationObserver integration',
        'ResizeObserver integration',
        'Statistical aggregations',
        'HintQueue predictive rendering',
        'PlaygroundBridge visualization',
        'Confidence Worker (intent-based predictions)',
        'Pseudo-state reactivity (hover, focus, active, disabled)',
        'Theme & breakpoint reactivity (dark mode, responsive layouts)',
        'Temporal features (history tracking, change patterns, trend analysis)',
        'Lifecycle state machines (finite state machines with styles, templates, transitions)'
    ]
};
