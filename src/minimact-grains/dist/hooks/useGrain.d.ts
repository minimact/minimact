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
export declare function useGrain(grainId: string): void;
/**
 * Get current grain ID
 *
 * Returns the grain ID of the currently executing grain component.
 * This is used internally by other hooks to access grain context.
 *
 * @returns Current grain ID or null if outside grain context
 */
export declare function getCurrentGrainId(): string | null;
/**
 * Set current grain ID (for testing/internal use)
 */
export declare function setCurrentGrainId(grainId: string | null): void;
//# sourceMappingURL=useGrain.d.ts.map