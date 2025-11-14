/**
 * useGrainNavigation Hook
 *
 * Enables autonomous navigation for grains.
 * The grain can decide where to navigate next based on its internal logic,
 * learning fields, or external conditions.
 *
 * @param navigationFn - Function that returns next grain type or null
 *
 * @example
 * ```tsx
 * function ExplorerGrain({ grainId }) {
 *   useGrain(grainId);
 *
 *   const [hasFoundTarget, setHasFoundTarget] = useState(false);
 *
 *   useGrainNavigation(() => {
 *     if (hasFoundTarget) {
 *       return 'SuccessGrain'; // Navigate to success grain
 *     }
 *     return null; // Stay on current grain
 *   });
 *
 *   return <div>Exploring...</div>;
 * }
 * ```
 */
export declare function useGrainNavigation(navigationFn: () => string | null): void;
/**
 * Navigate a grain
 *
 * Executes the grain's navigation function and returns the next grain type.
 * Freezes the current grain if navigation occurs.
 *
 * @param fromId - ID of grain to navigate from
 * @returns Next grain type or null if no navigation
 */
export declare function navigateGrain(fromId: string): string | null;
/**
 * Get grain's current navigation function
 *
 * @param grainId - ID of grain
 * @returns Navigation function or undefined
 */
export declare function getGrainNavigationFn(grainId: string): (() => string | null) | undefined;
//# sourceMappingURL=useGrainNavigation.d.ts.map