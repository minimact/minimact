import { useEffect, useRef } from '@minimact/core';
import { getGrainRegistry } from '../core/GrainRegistry';

/**
 * Current grain ID (thread-local state)
 */
let currentGrainId: string | null = null;

/**
 * useGrain Hook
 *
 * Binds a React component to a grain in the registry.
 * This establishes the component as the "execution context" for the grain,
 * allowing other hooks (useGrainReducer, useGrainNavigation) to access
 * the current grain ID.
 *
 * @param grainId - Unique grain identifier
 *
 * @example
 * ```tsx
 * function MyGrain({ grainId }: { grainId: string }) {
 *   useGrain(grainId);
 *
 *   const [state, dispatch] = useGrainReducer(reducer, initialState);
 *
 *   return <div>Grain: {grainId}</div>;
 * }
 * ```
 */
export function useGrain(grainId: string): void {
  const registry = getGrainRegistry();
  const isRegistered = useRef(false);

  useEffect(() => {
    if (!isRegistered.current) {
      // Set as current grain context
      currentGrainId = grainId;

      const grain = registry.getGrain(grainId);
      if (!grain) {
        console.warn(`[useGrain] Grain ${grainId} not found in registry`);
      } else {
        console.log(`[useGrain] Bound to grain: ${grainId} (type: ${grain.type})`);
      }

      isRegistered.current = true;
    }

    // Cleanup: clear current grain context
    return () => {
      currentGrainId = null;
    };
  }, [grainId, registry]);
}

/**
 * Get current grain ID
 *
 * Returns the grain ID of the currently executing grain component.
 * This is used internally by other hooks to access grain context.
 *
 * @returns Current grain ID or null if outside grain context
 */
export function getCurrentGrainId(): string | null {
  return currentGrainId;
}

/**
 * Set current grain ID (for testing/internal use)
 */
export function setCurrentGrainId(grainId: string | null): void {
  currentGrainId = grainId;
}
