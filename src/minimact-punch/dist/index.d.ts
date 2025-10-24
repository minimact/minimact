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
/**
 * Types - shared by both modes
 */
export type { DomElementStateOptions, DomStateChangeCallback, DomElementStateSnapshot } from './types';
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
export type { ComponentContext, HintQueue, DOMPatcher, PlaygroundBridge } from './integration';
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
    readonly features: readonly ["IntersectionObserver integration", "MutationObserver integration", "ResizeObserver integration", "Statistical aggregations", "HintQueue predictive rendering", "PlaygroundBridge visualization"];
};
//# sourceMappingURL=index.d.ts.map