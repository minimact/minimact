/**
 * @minimact/grains - Autonomous, stateful, spawnable grain system
 *
 * Declarative agents with probabilistic routing and reward-based learning.
 * Think: Orleans + React Hooks + Spatial Probability Networks
 *
 * @packageDocumentation
 */
export * from './core';
export * from './hooks';
export * from './types';
export * from './learning';
export * from './rewards';
export declare const VERSION = "0.1.0";
export declare const MES_CERTIFICATION = "Bronze";
/**
 * Example usage:
 *
 * ```tsx
 * import { spawnGrain, useGrain, useGrainReducer, useGrainNavigation } from '@minimact/grains';
 *
 * // Define grain component
 * function CounterGrain({ grainId }: { grainId: string }) {
 *   useGrain(grainId);
 *
 *   const [state, dispatch] = useGrainReducer(
 *     (state, action) => {
 *       switch (action.type) {
 *         case 'increment': return { count: state.count + 1 };
 *         case 'decrement': return { count: state.count - 1 };
 *         default: return state;
 *       }
 *     },
 *     { count: 0 }
 *   );
 *
 *   useGrainNavigation(() => {
 *     if (state.count >= 10) {
 *       return 'SuccessGrain';
 *     }
 *     return null;
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Count: {state.count}</h2>
 *       <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *     </div>
 *   );
 * }
 *
 * // Spawn grain
 * const grainId = spawnGrain('Counter', CounterGrain, {
 *   initialState: { count: 0 }
 * });
 * ```
 */
//# sourceMappingURL=index.d.ts.map