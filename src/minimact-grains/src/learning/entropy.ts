import { cosineSimilarity } from './vectorField';

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
export function calculateEntropy(probabilities: Record<string, number>): number {
  let entropy = 0;

  for (const prob of Object.values(probabilities)) {
    if (prob > 0 && prob <= 1) {
      // H = -Σ p(x) * log2(p(x))
      entropy -= prob * Math.log2(prob);
    }
  }

  return entropy;
}

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
export function calculateMaxEntropy(numOptions: number): number {
  if (numOptions <= 0) return 0;
  return Math.log2(numOptions);
}

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
export function normalizedEntropy(probabilities: Record<string, number>): number {
  const numOptions = Object.keys(probabilities).length;
  if (numOptions <= 1) return 0;

  const entropy = calculateEntropy(probabilities);
  const maxEntropy = calculateMaxEntropy(numOptions);

  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

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
export function calculateUncertainty(
  vectorField: number[],
  targetFields: Record<string, number[]>
): number {
  const targetList = Object.values(targetFields);

  if (targetList.length === 0) return 1.0; // Maximum uncertainty if no targets

  // Compute similarity to each target
  const similarities = targetList.map(target =>
    Math.abs(cosineSimilarity(vectorField, target))
  );

  if (similarities.length === 1) return 0; // No uncertainty with single option

  // Calculate variance of similarities
  const mean = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
  const variance = similarities.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / similarities.length;

  // High variance = low uncertainty (clear best choice)
  // Low variance = high uncertainty (all similar)
  // Normalize using sigmoid-like function
  return 1.0 / (1.0 + variance * 10);
}

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
export function confidence(probabilities: Record<string, number>): number {
  return 1.0 - normalizedEntropy(probabilities);
}

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
export function explorationRateFromEntropy(
  probabilities: Record<string, number>,
  minEpsilon: number = 0.05,
  maxEpsilon: number = 0.5
): number {
  const norm = normalizedEntropy(probabilities);

  // Linear interpolation between min and max epsilon
  return minEpsilon + norm * (maxEpsilon - minEpsilon);
}

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
export function klDivergence(
  p: Record<string, number>,
  q: Record<string, number>
): number {
  let divergence = 0;

  for (const key of Object.keys(p)) {
    const pVal = p[key];
    const qVal = q[key] || 1e-10; // Avoid log(0)

    if (pVal > 0) {
      divergence += pVal * Math.log2(pVal / qVal);
    }
  }

  return divergence;
}
