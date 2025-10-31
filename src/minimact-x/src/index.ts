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

// ============================================================
// CORE HOOK (Integrated Mode - DEFAULT)
// ============================================================

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
export {
  useStateX,
  syncStateToServer,
  setComponentContext,
  clearComponentContext,
  getCurrentContext,
  cleanupStateProjections
} from './integration';

/**
 * Standalone mode (no Minimact integration)
 * For testing or use outside of Minimact components
 * @deprecated Use integrated mode for production
 */
export {
  useStateX as useStateXStandalone,
  syncStateToServer as syncStateToServerStandalone
} from './use-state-x';

// ============================================================
// TRANSFORM HANDLING
// ============================================================

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

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * All TypeScript types and interfaces
 */
export type {
  // Configuration types
  StateXConfig,
  TargetProjection,
  ApplyMode,
  SyncStrategy,

  // Function types
  SetStateXFunction,
  UseStateXReturn,
  TransformFunction,

  // Registry types
  TransformRegistryEntry,

  // Result types
  ProjectionResult,
  StateXProjection,

  // Dependency graph types
  StateXDependencyGraph,
  DependencyMetadata,

  // Context extension
  StateXContext,

  // DevTools types
  StateXDevToolsBridge,
  ProjectionUpdateEvent,
  TransformErrorEvent,

  // Misc
  ManualSyncOptions
} from './types';

// ============================================================
// VERSION & METADATA
// ============================================================

export const VERSION = '0.1.0';
export const MES_CERTIFICATION = 'Gold'; // Minimact Extension Standards

/**
 * Package metadata for debugging
 */
export const PACKAGE_INFO = {
  name: 'minimact-x',
  version: VERSION,
  certification: MES_CERTIFICATION,
  features: [
    'Declarative state projections',
    'CSS-like selector targeting',
    'Pure transform functions',
    'Conditional rendering (applyIf)',
    'Template Patch System integration',
    'Server synchronization (immediate/debounced/manual)',
    'Transform registry (reusable transforms)',
    'DevTools integration',
    'Babel static analysis support',
    'XSS protection',
    'Dependency graph tracking',
    'MES Gold certified'
  ],
  philosophy: 'CSS for State Logic - Predictive Declarative UI Architecture'
} as const;

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
export function setupMinimactX(): void {
  console.log(
    `[Minimact X] v${VERSION} initialized ✨\n` +
    `MES Certification: ${MES_CERTIFICATION}\n` +
    `Philosophy: ${PACKAGE_INFO.philosophy}`
  );

  // Transforms are auto-registered in TransformHandler
  // This function is just for explicit initialization
}
