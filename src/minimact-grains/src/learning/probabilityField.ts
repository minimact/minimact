/**
 * Probability Field Management
 *
 * Manages probability distributions for grain navigation.
 * This is how grains make routing decisions!
 */

/**
 * Create Probability Field
 *
 * Normalizes raw weights into a valid probability distribution.
 * All probabilities sum to 1.0.
 *
 * @param options - Raw weights for each option
 * @returns Normalized probability distribution
 *
 * @example
 * ```ts
 * const field = createProbabilityField({
 *   'north': 10,
 *   'south': 5,
 *   'east': 5
 * });
 * // Returns: { north: 0.5, south: 0.25, east: 0.25 }
 * ```
 */
export function createProbabilityField(
  options: Record<string, number>
): Record<string, number> {
  const total = Object.values(options).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    // Equal distribution if all weights are zero
    const keys = Object.keys(options);
    const equalProb = 1.0 / keys.length;
    const result: Record<string, number> = {};
    keys.forEach(key => result[key] = equalProb);
    return result;
  }

  // Normalize to probabilities
  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(options)) {
    normalized[key] = val / total;
  }

  return normalized;
}

/**
 * Sample from Probability Field
 *
 * Randomly samples an option based on probabilities.
 * This is how grains choose which path to take!
 *
 * Uses weighted random sampling - options with higher
 * probabilities are more likely to be chosen.
 *
 * @param field - Probability distribution
 * @returns Sampled option key or null if empty
 *
 * @example
 * ```ts
 * const field = { 'exploreGrain': 0.7, 'exploitGrain': 0.3 };
 *
 * // 70% chance of returning 'exploreGrain'
 * // 30% chance of returning 'exploitGrain'
 * const choice = sampleFromProbabilityField(field);
 * ```
 */
export function sampleFromProbabilityField(
  field: Record<string, number>
): string | null {
  const rand = Math.random();
  let cumulative = 0;

  for (const [key, prob] of Object.entries(field)) {
    cumulative += prob;
    if (rand <= cumulative) {
      return key;
    }
  }

  // Fallback (shouldn't happen with valid probabilities)
  const keys = Object.keys(field);
  return keys.length > 0 ? keys[0] : null;
}

/**
 * Update Probability Field
 *
 * Reinforcement learning! Increases probability of rewarded option.
 * This is how grains LEARN from experience!
 *
 * Positive reward → strengthen probability
 * Negative reward → weaken probability
 *
 * @param field - Current probability field
 * @param key - Option that was chosen
 * @param reward - Reward signal (-1 to 1)
 * @param learningRate - How fast to learn (0-1), default 0.1
 * @returns Updated probability field (renormalized)
 *
 * @example
 * ```ts
 * let field = { 'north': 0.5, 'south': 0.5 };
 *
 * // Grain goes north and gets reward
 * field = updateProbabilityField(field, 'north', 1.0);
 * // Now: { north: 0.55, south: 0.45 }
 *
 * // Over time, 'north' becomes dominant
 * ```
 */
export function updateProbabilityField(
  field: Record<string, number>,
  key: string,
  reward: number,
  learningRate: number = 0.1
): Record<string, number> {
  const updated = { ...field };

  // Increase probability for rewarded option
  if (key in updated) {
    // Add reward signal (scaled by learning rate)
    updated[key] = updated[key] + learningRate * reward;

    // Clamp to [0, infinity) to prevent negative probabilities
    updated[key] = Math.max(0, updated[key]);
  }

  // Renormalize to valid probability distribution
  return createProbabilityField(updated);
}

/**
 * Merge Probability Fields
 *
 * Combines multiple probability fields with weighted average.
 * Useful for aggregating learned behaviors across multiple grains.
 *
 * @param fields - Array of probability fields
 * @param weights - Optional weights for each field (default: equal)
 * @returns Merged probability field
 *
 * @example
 * ```ts
 * const field1 = { 'north': 0.8, 'south': 0.2 };
 * const field2 = { 'north': 0.3, 'south': 0.7 };
 *
 * // Equal weighting
 * const merged = mergeProbabilityFields([field1, field2]);
 * // Returns: { north: 0.55, south: 0.45 }
 *
 * // Weighted (trust field1 more)
 * const weighted = mergeProbabilityFields([field1, field2], [0.8, 0.2]);
 * // Returns: { north: 0.7, south: 0.3 }
 * ```
 */
export function mergeProbabilityFields(
  fields: Record<string, number>[],
  weights?: number[]
): Record<string, number> {
  if (fields.length === 0) {
    return {};
  }

  // Default to equal weights
  const fieldWeights = weights || fields.map(() => 1.0 / fields.length);

  // Collect all unique keys
  const allKeys = new Set<string>();
  fields.forEach(field => {
    Object.keys(field).forEach(key => allKeys.add(key));
  });

  // Weighted average for each key
  const merged: Record<string, number> = {};
  allKeys.forEach(key => {
    let weightedSum = 0;
    let totalWeight = 0;

    fields.forEach((field, i) => {
      if (key in field) {
        weightedSum += field[key] * fieldWeights[i];
        totalWeight += fieldWeights[i];
      }
    });

    merged[key] = totalWeight > 0 ? weightedSum / totalWeight : 0;
  });

  // Renormalize
  return createProbabilityField(merged);
}

/**
 * Get Highest Probability Option
 *
 * Returns the option with maximum probability.
 * Useful for "exploit" mode (choose best known option).
 *
 * @param field - Probability field
 * @returns Key with highest probability or null if empty
 *
 * @example
 * ```ts
 * const field = { 'explore': 0.2, 'exploit': 0.8 };
 * const best = getHighestProbabilityOption(field);
 * // Returns: 'exploit'
 * ```
 */
export function getHighestProbabilityOption(
  field: Record<string, number>
): string | null {
  let maxKey: string | null = null;
  let maxProb = -Infinity;

  for (const [key, prob] of Object.entries(field)) {
    if (prob > maxProb) {
      maxProb = prob;
      maxKey = key;
    }
  }

  return maxKey;
}

/**
 * Exploration vs Exploitation
 *
 * Balances between exploring new options vs exploiting known good options.
 * Epsilon-greedy strategy.
 *
 * @param field - Probability field
 * @param epsilon - Exploration rate (0-1), higher = more exploration
 * @returns Chosen option key
 *
 * @example
 * ```ts
 * const field = { 'known': 0.9, 'unknown': 0.1 };
 *
 * // With epsilon=0.1, 10% chance of exploring, 90% chance of exploiting
 * const choice = explorationVsExploitation(field, 0.1);
 * ```
 */
export function explorationVsExploitation(
  field: Record<string, number>,
  epsilon: number = 0.1
): string | null {
  const rand = Math.random();

  if (rand < epsilon) {
    // Explore: sample from uniform distribution
    const keys = Object.keys(field);
    return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : null;
  } else {
    // Exploit: sample from learned probabilities
    return sampleFromProbabilityField(field);
  }
}
