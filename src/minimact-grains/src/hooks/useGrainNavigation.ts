import { useEffect } from '@minimact/core';
import { getGrainRegistry } from '../core/GrainRegistry';
import { getCurrentGrainId } from './useGrain';
import { freezeGrain } from '../core/spawn';

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
export function useGrainNavigation(
  navigationFn: () => string | null
): void {
  const grainId = getCurrentGrainId();

  useEffect(() => {
    if (grainId) {
      const registry = getGrainRegistry();
      registry.updateGrain(grainId, { navigationFn });
    }
  }, [grainId, navigationFn]);
}

/**
 * Navigate a grain
 *
 * Executes the grain's navigation function and returns the next grain type.
 * Freezes the current grain if navigation occurs.
 *
 * @param fromId - ID of grain to navigate from
 * @returns Next grain type or null if no navigation
 */
export function navigateGrain(fromId: string): string | null {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(fromId);

  if (!grain || !grain.navigationFn) {
    return null;
  }

  // Execute navigation function
  const nextGrainType = grain.navigationFn();

  if (nextGrainType) {
    // Freeze current grain (preserve state)
    freezeGrain(fromId);

    // Track navigation in chain
    registry.addNavigationStep(fromId, nextGrainType);

    console.log(`[Navigation] ${fromId} → ${nextGrainType}`);

    return nextGrainType;
  }

  return null;
}

/**
 * Get grain's current navigation function
 *
 * @param grainId - ID of grain
 * @returns Navigation function or undefined
 */
export function getGrainNavigationFn(grainId: string): (() => string | null) | undefined {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);
  return grain?.navigationFn;
}
