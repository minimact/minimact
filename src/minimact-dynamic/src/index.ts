/**
 * minimact-dynamic
 *
 * Minimal dynamic value bindings for Minimact.
 * Separate structure from content. Define DOM once, bind values separately.
 *
 * Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
 *
 * @example
 * ```typescript
 * import { useDynamicState } from 'minimact-dynamic';
 *
 * const dynamic = useDynamicState({
 *   user: { isPremium: false },
 *   product: { price: 29.99 }
 * });
 *
 * // Structure ONCE
 * <span className="price"></span>
 *
 * // Bind SEPARATELY
 * dynamic('.price', (state) =>
 *   state.user.isPremium ? `$${state.product.price * 0.8}` : `$${state.product.price}`
 * );
 * ```
 */

export { useDynamicState } from './integration';
export { ValueUpdater } from './value-updater';
export { trackDependencies, hasPathChanged, shallowEqual } from './dependency-tracker';

export type {
  DynamicStateAPI,
  DynamicBinding,
  DynamicOrderBinding,
  DynamicValueFunction,
  DynamicOrderFunction,
  BindingMetadata,
  DependencyTrackingResult
} from './types';

export const VERSION = '0.1.0';
export const PHILOSOPHY = 'Structure ONCE. Bind SEPARATELY. Update DIRECTLY.';
