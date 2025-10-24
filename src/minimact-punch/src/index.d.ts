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
 * Types - shared by both modes
 */
export type { DomElementStateOptions, DomStateChangeCallback, DomElementStateSnapshot } from './types';
export type { PseudoState } from './pseudo-state-tracker';
export type { HistoryChange, HistorySnapshot } from './state-history-tracker';
export type { LifecycleStateConfig, TransitionHistoryEntry } from './lifecycle-state-tracker';
/**
 * Standalone hook (no Minimact integration)
 * Just creates and returns a DomElementState instance
 *
 * @deprecated Use `createDomElementState` instead for clarity
 */
export { useDomElementState as createDomElementState } from './use-dom-element-state';
/**
 * Integrated hook - works with Minimact component context
 * Includes HintQueue integration for predictive rendering
 *
 * @requires minimact
 */
export { useDomElementState, cleanupDomElementStates, setComponentContext, clearComponentContext, getCurrentContext } from './integration';
/**
 * Types for integration
 */
export type { ComponentContext, HintQueue, DOMPatcher, PlaygroundBridge, SignalRManager } from './integration';
/**
 * Confidence Worker (OPTIONAL)
 * Enables predictive hints based on user intent
 *
 * If worker fails to load, useDomElementState still works normally.
 */
export { ConfidenceWorkerManager } from './confidence-worker-manager';
export type { PredictionRequestCallback, WorkerManagerConfig } from './confidence-worker-manager';
export declare const VERSION = "0.1.0";
export declare const MES_CERTIFICATION = "Silver";
/**
 * Package metadata for debugging
 */
export declare const PACKAGE_INFO: {
    readonly name: "minimact-punch";
    readonly version: "0.1.0";
    readonly certification: "Silver";
    readonly modes: readonly ["standalone", "integrated"];
    readonly features: readonly ["IntersectionObserver integration", "MutationObserver integration", "ResizeObserver integration", "Statistical aggregations", "HintQueue predictive rendering", "PlaygroundBridge visualization", "Confidence Worker (intent-based predictions)", "Pseudo-state reactivity (hover, focus, active, disabled)", "Theme & breakpoint reactivity (dark mode, responsive layouts)", "Temporal features (history tracking, change patterns, trend analysis)", "Lifecycle state machines (finite state machines with styles, templates, transitions)"];
};
//# sourceMappingURL=index.d.ts.map