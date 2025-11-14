/**
 * Entropy Tracking
 *
 * Measures uncertainty in probability distributions and vector fields.
 * High entropy = explore, Low entropy = exploit!
 */
/**
 * Calculate Entropy
 *
 * Shannon entropy for probability distribution.
 * Measures uncertainty/randomness in the distribution.
 *
 * - High entropy (near log2(n)): Uniform distribution, maximum uncertainty
 * - Low entropy (near 0): Concentrated distribution, low uncertainty
 *
 * @param probabilities - Probability distribution
 * @returns Entropy in bits
 *
 * @example
 * ```ts
 * // Uniform distribution (maximum entropy for 4 options)
 * const maxEntropy = calculateEntropy({
 *   'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25
 * });
 * // Returns: 2.0 bits (log2(4))
 *
 * // Concentrated distribution (low entropy)
 * const lowEntropy = calculateEntropy({
 *   'a': 0.95, 'b': 0.03, 'c': 0.01, 'd': 0.01
 * });
 * // Returns: ~0.33 bits (very certain about 'a')
 * ```
 */
export declare function calculateEntropy(probabilities: Record<string, number>): number;
/**
 * Calculate Maximum Entropy
 *
 * Maximum possible entropy for N options.
 * Achieved when all options have equal probability.
 *
 * @param numOptions - Number of options
 * @returns Maximum entropy in bits
 *
 * @example
 * ```ts
 * const maxEntropy = calculateMaxEntropy(4);
 * // Returns: 2.0 (log2(4))
 * ```
 */
export declare function calculateMaxEntropy(numOptions: number): number;
/**
 * Normalized Entropy
 *
 * Entropy normalized to [0, 1] range.
 * 1.0 = maximum uncertainty (uniform distribution)
 * 0.0 = zero uncertainty (single option has probability 1.0)
 *
 * @param probabilities - Probability distribution
 * @returns Normalized entropy [0, 1]
 *
 * @example
 * ```ts
 * const uniform = { 'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25 };
 * normalizedEntropy(uniform); // Returns: 1.0
 *
 * const certain = { 'a': 1.0 };
 * normalizedEntropy(certain); // Returns: 0.0
 * ```
 */
export declare function normalizedEntropy(probabilities: Record<string, number>): number;
/**
 * Calculate Uncertainty
 *
 * Measures uncertainty in vector field routing.
 * High uncertainty = all target fields have similar similarity scores.
 * Low uncertainty = one target field is clearly most similar.
 *
 * This is used for exploration/exploitation balance:
 * - High uncertainty → explore (sample more)
 * - Low uncertainty → exploit (use best known path)
 *
 * @param vectorField - Current grain's vector field
 * @param targetFields - Available target grain vector fields
 * @returns Uncertainty score [0, 1]
 *
 * @example
 * ```ts
 * const myField = [1, 0, 0];
 * const targets = {
 *   'grainA': [0.9, 0.1, 0],   // Very similar
 *   'grainB': [0.5, 0.5, 0],   // Somewhat similar
 *   'grainC': [-1, 0, 0]       // Opposite
 * };
 *
 * const uncertainty = calculateUncertainty(myField, targets);
 * // Low uncertainty (grainA clearly best match)
 * ```
 */
export declare function calculateUncertainty(vectorField: number[], targetFields: Record<string, number[]>): number;
/**
 * Confidence Score
 *
 * Inverse of normalized entropy.
 * High confidence = low entropy (certain about choice)
 * Low confidence = high entropy (uncertain about choice)
 *
 * @param probabilities - Probability distribution
 * @returns Confidence [0, 1]
 *
 * @example
 * ```ts
 * const certain = { 'best': 0.95, 'other': 0.05 };
 * confidence(certain); // Returns: ~0.95 (high confidence)
 *
 * const uncertain = { 'a': 0.5, 'b': 0.5 };
 * confidence(uncertain); // Returns: 0.0 (low confidence)
 * ```
 */
export declare function confidence(probabilities: Record<string, number>): number;
/**
 * Exploration Rate from Entropy
 *
 * Derives epsilon (exploration rate) from entropy.
 * High entropy → explore more
 * Low entropy → exploit more
 *
 * @param probabilities - Probability distribution
 * @param minEpsilon - Minimum exploration rate (default 0.05)
 * @param maxEpsilon - Maximum exploration rate (default 0.5)
 * @returns Epsilon for epsilon-greedy strategy
 *
 * @example
 * ```ts
 * const uniform = { 'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25 };
 * explorationRateFromEntropy(uniform);
 * // Returns: 0.5 (high entropy → explore!)
 *
 * const concentrated = { 'a': 0.9, 'b': 0.1 };
 * explorationRateFromEntropy(concentrated);
 * // Returns: ~0.1 (low entropy → exploit!)
 * ```
 */
export declare function explorationRateFromEntropy(probabilities: Record<string, number>, minEpsilon?: number, maxEpsilon?: number): number;
/**
 * KL Divergence
 *
 * Measures difference between two probability distributions.
 * Used to track how much a grain's probability field has changed.
 *
 * @param p - First probability distribution
 * @param q - Second probability distribution
 * @returns KL divergence (non-negative)
 *
 * @example
 * ```ts
 * const before = { 'a': 0.5, 'b': 0.5 };
 * const after = { 'a': 0.9, 'b': 0.1 };
 *
 * const divergence = klDivergence(before, after);
 * // Returns: ~0.51 (significant change)
 * ```
 */
export declare function klDivergence(p: Record<string, number>, q: Record<string, number>): number;
//# sourceMappingURL=entropy.d.ts.map