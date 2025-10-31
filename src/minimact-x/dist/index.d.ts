/**
 * Minimact X 🌵 + ✨
 *
 * CSS for State Logic - Declarative state projection addon for Minimact
 *
 * **Core Philosophy:**
 * Just as CSS externalizes styling from HTML, useStateX externalizes
 * state-to-DOM bindings from JSX. This enables build-time analysis,
 * predictive rendering, and superior developer experience.
 *
 * @packageDocumentation
 */
/**
 * Main hook - declarative state with DOM projection
 * Integrated with Minimact's ComponentContext for full features
 *
 * @example
 * ```tsx
 * const [price, setPrice] = useStateX(99, {
 *   targets: {
 *     '.price-display': {
 *       transform: v => `$${v.toFixed(2)}`,
 *       applyIf: ctx => ctx.user.canSeePrice
 *     }
 *   }
 * });
 * ```
 */
export { useStateX, syncStateToServer, setComponentContext, clearComponentContext, getCurrentContext, cleanupStateProjections } from './integration';
/**
 * Standalone mode (no Minimact integration)
 * For testing or use outside of Minimact components
 * @deprecated Use integrated mode for production
 */
export { useStateX as useStateXStandalone, syncStateToServer as syncStateToServerStandalone } from './use-state-x';
/**
 * Transform registry and handler
 * Register reusable transforms globally
 *
 * @example
 * ```typescript
 * TransformHandler.registerTransform('currency-usd', v => `$${v.toFixed(2)}`);
 * ```
 */
export { TransformHandler } from './transform-handler';
/**
 * Projection engine (advanced usage)
 * Direct DOM projection without hook
 */
export { ProjectionEngine } from './projection-engine';
/**
 * All TypeScript types and interfaces
 */
export type { StateXConfig, TargetProjection, ApplyMode, SyncStrategy, SetStateXFunction, UseStateXReturn, TransformFunction, TransformRegistryEntry, ProjectionResult, StateXProjection, StateXDependencyGraph, DependencyMetadata, StateXContext, StateXDevToolsBridge, ProjectionUpdateEvent, TransformErrorEvent, ManualSyncOptions } from './types';
export declare const VERSION = "0.1.0";
export declare const MES_CERTIFICATION = "Gold";
/**
 * Package metadata for debugging
 */
export declare const PACKAGE_INFO: {
    readonly name: "minimact-x";
    readonly version: "0.1.0";
    readonly certification: "Gold";
    readonly features: readonly ["Declarative state projections", "CSS-like selector targeting", "Pure transform functions", "Conditional rendering (applyIf)", "Template Patch System integration", "Server synchronization (immediate/debounced/manual)", "Transform registry (reusable transforms)", "DevTools integration", "Babel static analysis support", "XSS protection", "Dependency graph tracking", "MES Gold certified"];
    readonly philosophy: "CSS for State Logic - Predictive Declarative UI Architecture";
};
/**
 * Quick start helper - register common transforms
 *
 * @example
 * ```typescript
 * import { setupMinimactX } from '@minimact/x';
 *
 * // Automatically registers all built-in transforms
 * setupMinimactX();
 * ```
 */
export declare function setupMinimactX(): void;
//# sourceMappingURL=index.d.ts.map