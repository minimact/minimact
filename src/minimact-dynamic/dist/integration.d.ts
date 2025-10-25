/**
 * Minimact Integration Layer for Dynamic State
 *
 * Provides dynamic value bindings without React dependencies.
 * Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
 */
import type { DynamicStateAPI } from './types';
/**
 * Create a dynamic state manager with automatic dependency tracking
 *
 * @param initialState - Initial state object
 * @returns Dynamic state API
 *
 * @example
 * ```typescript
 * const dynamic = useDynamicState({
 *   user: { isPremium: false },
 *   product: { price: 29.99, factoryPrice: 19.99 }
 * });
 *
 * // Structure ONCE
 * <span className="price"></span>
 *
 * // Bind SEPARATELY
 * dynamic('.price', (state) =>
 *   state.user.isPremium ? state.product.factoryPrice : state.product.price
 * );
 *
 * // Update state
 * dynamic.setState({ user: { isPremium: true } });
 * // → Direct DOM update: el.textContent = '$19.99' (< 1ms!)
 * ```
 */
export declare function useDynamicState<TState extends object = any>(initialState: TState): DynamicStateAPI<TState>;
//# sourceMappingURL=integration.d.ts.map