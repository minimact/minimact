/**
 * useGrainField Hook
 *
 * Manages probability and vector fields for a grain.
 * This is where the MAGIC happens - spatial probability routing!
 *
 * Fields are synced to the grain registry for:
 * - Serialization (save/load)
 * - Inspection (debugging)
 * - Cross-grain queries (similarity search)
 *
 * @param initialVectorField - Initial vector field (optional)
 * @param initialProbabilityField - Initial probability distribution (optional)
 * @returns Field state and setters
 *
 * @example
 * ```tsx
 * function ExplorerGrain({ grainId }) {
 *   useGrain(grainId);
 *
 *   const { vectorField, setVectorField, probabilityField, setProbabilityField, entropy } =
 *     useGrainField(
 *       [1, 0, 0],  // Initial direction
 *       { 'north': 0.5, 'south': 0.3, 'east': 0.2 }
 *     );
 *
 *   useGrainNavigation(() => {
 *     // Sample from probability field
 *     return sampleFromProbabilityField(probabilityField);
 *   });
 *
 *   return <div>Entropy: {entropy.toFixed(2)}</div>;
 * }
 * ```
 */
export declare function useGrainField(initialVectorField?: number[], initialProbabilityField?: Record<string, number>): {
    vectorField: number[];
    setVectorField: (newValue: number[] | ((prev: number[]) => number[])) => void;
    probabilityField: Record<string, number>;
    setProbabilityField: (newValue: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    entropy: number;
};
/**
 * Compute Navigation Probabilities
 *
 * Computes probability distribution for navigating to target grains
 * based on vector field similarity.
 *
 * This is the CORE of spatial probability routing:
 * 1. Compute cosine similarity to each target
 * 2. Convert similarity to probability
 * 3. Return normalized distribution
 *
 * @param currentVectorField - Current grain's vector field
 * @param targetFields - Available target grain vector fields
 * @returns Probability distribution for navigation
 *
 * @example
 * ```tsx
 * const myField = [1, 0, 0];
 * const targets = {
 *   'explorerGrain': [0.9, 0.1, 0],
 *   'harvesterGrain': [0, 1, 0],
 *   'guardGrain': [-1, 0, 0]
 * };
 *
 * const probs = computeNavigationProbabilities(myField, targets);
 * // Returns: {
 * //   explorerGrain: 0.6,   // Most similar
 * //   harvesterGrain: 0.3,  // Orthogonal
 * //   guardGrain: 0.1       // Opposite
 * // }
 * ```
 */
export declare function computeNavigationProbabilities(currentVectorField: number[], targetFields: Record<string, number[]>): Record<string, number>;
/**
 * Get Nearby Grains
 *
 * Finds grains with similar vector fields.
 * Useful for flocking behavior, consensus, clustering.
 *
 * @param grainId - Current grain ID
 * @param maxDistance - Maximum cosine distance (0-2), default 0.5
 * @param limit - Maximum number of grains to return, default 10
 * @returns Array of nearby grain IDs sorted by similarity
 *
 * @example
 * ```tsx
 * function FlockingGrain({ grainId }) {
 *   useGrain(grainId);
 *
 *   const { vectorField } = useGrainField([1, 0, 0]);
 *
 *   useEffect(() => {
 *     // Find nearby grains
 *     const nearby = getNearbyGrains(grainId, 0.3, 5);
 *
 *     // Align with flock
 *     if (nearby.length > 0) {
 *       // Average their vector fields
 *       // ... implement flocking logic
 *     }
 *   }, [grainId, vectorField]);
 *
 *   return <div>Flock size: {nearby.length}</div>;
 * }
 * ```
 */
export declare function getNearbyGrains(grainId: string, maxDistance?: number, limit?: number): string[];
//# sourceMappingURL=useGrainField.d.ts.map