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
export declare function createProbabilityField(options: Record<string, number>): Record<string, number>;
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
export declare function sampleFromProbabilityField(field: Record<string, number>): string | null;
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
export declare function updateProbabilityField(field: Record<string, number>, key: string, reward: number, learningRate?: number): Record<string, number>;
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
export declare function mergeProbabilityFields(fields: Record<string, number>[], weights?: number[]): Record<string, number>;
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
export declare function getHighestProbabilityOption(field: Record<string, number>): string | null;
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
export declare function explorationVsExploitation(field: Record<string, number>, epsilon?: number): string | null;
//# sourceMappingURL=probabilityField.d.ts.map