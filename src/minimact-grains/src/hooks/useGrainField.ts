import { useState, useEffect } from '@minimact/core';
import { getGrainRegistry } from '../core/GrainRegistry';
import { getCurrentGrainId } from './useGrain';
import { cosineSimilarity } from '../learning/vectorField';
import { createProbabilityField, sampleFromProbabilityField } from '../learning/probabilityField';
import { calculateEntropy } from '../learning/entropy';

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
export function useGrainField(
  initialVectorField?: number[],
  initialProbabilityField?: Record<string, number>
) {
  const grainId = getCurrentGrainId();
  const registry = getGrainRegistry();

  const [vectorField, setVectorField] = useState<number[]>(
    initialVectorField || []
  );
  const [probabilityField, setProbabilityField] = useState<Record<string, number>>(
    initialProbabilityField || {}
  );
  const [entropy, setEntropy] = useState<number>(0);

  // Update registry when fields change
  useEffect(() => {
    if (grainId) {
      registry.updateGrain(grainId, {
        vectorField,
        probabilityField,
        entropy
      });
    }
  }, [grainId, vectorField, probabilityField, entropy, registry]);

  // Calculate entropy when probability field changes
  useEffect(() => {
    if (Object.keys(probabilityField).length > 0) {
      const newEntropy = calculateEntropy(probabilityField);
      setEntropy(newEntropy);
    }
  }, [probabilityField]);

  return {
    vectorField,
    setVectorField,
    probabilityField,
    setProbabilityField,
    entropy
  };
}

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
export function computeNavigationProbabilities(
  currentVectorField: number[],
  targetFields: Record<string, number[]>
): Record<string, number> {
  if (currentVectorField.length === 0) {
    // No vector field → uniform distribution
    const keys = Object.keys(targetFields);
    const uniform: Record<string, number> = {};
    const prob = 1.0 / keys.length;
    keys.forEach(key => uniform[key] = prob);
    return uniform;
  }

  const similarities: Record<string, number> = {};

  // Compute cosine similarity to each target
  for (const [key, targetField] of Object.entries(targetFields)) {
    const similarity = cosineSimilarity(currentVectorField, targetField);

    // Convert similarity [-1, 1] to probability [0, 1]
    // Add 1 to shift range: [0, 2]
    // Divide by 2: [0, 1]
    similarities[key] = (similarity + 1) / 2;
  }

  // Normalize to probability distribution
  return createProbabilityField(similarities);
}

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
export function getNearbyGrains(
  grainId: string,
  maxDistance: number = 0.5,
  limit: number = 10
): string[] {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain || !grain.vectorField) {
    return [];
  }

  const activeGrains = registry.getActiveGrains();

  // Compute similarity to all other grains
  const similarities: Array<{ grainId: string; similarity: number }> = [];

  for (const other of activeGrains) {
    if (other.grainId === grainId) continue; // Skip self
    if (!other.vectorField) continue; // Skip grains without vector fields

    const similarity = cosineSimilarity(grain.vectorField, other.vectorField);

    // Cosine distance = 1 - similarity (similarity is in [-1, 1])
    // Map to [0, 2] range where 0 = identical, 2 = opposite
    const distance = 1 - similarity;

    if (distance <= maxDistance) {
      similarities.push({
        grainId: other.grainId,
        similarity
      });
    }
  }

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top N grain IDs
  return similarities.slice(0, limit).map(s => s.grainId);
}
