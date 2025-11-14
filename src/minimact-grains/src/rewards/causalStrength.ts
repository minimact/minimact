/**
 * Compute causal strength based on time to reward
 *
 * Uses exponential decay - actions closer in time to the reward
 * have higher causal strength.
 *
 * @param timeToReward - Milliseconds between action and reward
 * @param confidence - Confidence in the causal link (0-1), default 1.0
 * @param halfLife - Time in ms for 50% decay, default 10000 (10 seconds)
 * @returns Causal strength (0-1)
 *
 * @example
 * ```tsx
 * // Action happened 5 seconds before reward
 * const strength = computeCausalStrength(5000); // ~0.7
 *
 * // Action happened 20 seconds before reward
 * const strength = computeCausalStrength(20000); // ~0.25
 * ```
 */
export function computeCausalStrength(
  timeToReward: number,
  confidence: number = 1.0,
  halfLife: number = 10000
): number {
  // Exponential decay: strength = e^(-t / halfLife)
  const timeDecay = Math.exp(-timeToReward / halfLife);

  return confidence * timeDecay;
}

/**
 * Compute temporal credit assignment for entire navigation chain
 *
 * Assigns decayed rewards to each step in the chain based on
 * time distance from the reward event.
 *
 * @param timestamps - Array of action timestamps (ms)
 * @param rewardTimestamp - When the reward occurred (ms)
 * @param baseReward - Base reward value
 * @param halfLife - Decay half-life in ms
 * @returns Array of rewards for each timestamp
 *
 * @example
 * ```tsx
 * const timestamps = [1000, 2000, 3000, 4000]; // Actions at 1s, 2s, 3s, 4s
 * const rewardTimestamp = 5000; // Reward at 5s
 * const baseReward = 10.0;
 *
 * const rewards = computeTemporalCreditAssignment(timestamps, rewardTimestamp, baseReward);
 * // [6.07, 7.41, 8.65, 9.51] - more recent actions get more credit
 * ```
 */
export function computeTemporalCreditAssignment(
  timestamps: number[],
  rewardTimestamp: number,
  baseReward: number,
  halfLife: number = 10000
): number[] {
  return timestamps.map(timestamp => {
    const timeToReward = rewardTimestamp - timestamp;

    // Ensure non-negative time
    if (timeToReward < 0) {
      console.warn('[CausalStrength] Negative time to reward - action after reward?');
      return 0;
    }

    const strength = computeCausalStrength(timeToReward, 1.0, halfLife);
    return baseReward * strength;
  });
}

/**
 * Compute spatial causal strength
 *
 * Actions closer in space (vector similarity) to the reward state
 * have higher causal strength.
 *
 * @param actionVector - Vector representing the action state
 * @param rewardVector - Vector representing the reward state
 * @param confidence - Confidence in the causal link (0-1)
 * @returns Causal strength (0-1)
 */
export function computeSpatialCausalStrength(
  actionVector: number[],
  rewardVector: number[],
  confidence: number = 1.0
): number {
  if (actionVector.length !== rewardVector.length) {
    throw new Error('Vectors must have same dimensions');
  }

  // Compute cosine similarity
  const dotProduct = actionVector.reduce((sum, a, i) => sum + a * rewardVector[i], 0);
  const magA = Math.sqrt(actionVector.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(rewardVector.reduce((sum, b) => sum + b * b, 0));

  if (magA === 0 || magB === 0) return 0;

  const similarity = dotProduct / (magA * magB);

  // Convert similarity [-1, 1] to strength [0, 1]
  const strength = (similarity + 1) / 2;

  return confidence * strength;
}

/**
 * Compute combined temporal + spatial causal strength
 *
 * Combines time-based and space-based causal strength.
 *
 * @param timeToReward - Milliseconds between action and reward
 * @param actionVector - Vector representing the action state
 * @param rewardVector - Vector representing the reward state
 * @param temporalWeight - Weight for temporal component (0-1), default 0.5
 * @returns Combined causal strength (0-1)
 */
export function computeCombinedCausalStrength(
  timeToReward: number,
  actionVector: number[],
  rewardVector: number[],
  temporalWeight: number = 0.5
): number {
  const temporalStrength = computeCausalStrength(timeToReward);
  const spatialStrength = computeSpatialCausalStrength(actionVector, rewardVector);

  return temporalWeight * temporalStrength + (1 - temporalWeight) * spatialStrength;
}

/**
 * Discount rewards by depth
 *
 * Classic reinforcement learning gamma discount factor.
 * Rewards N steps back get discounted by gamma^N.
 *
 * @param reward - Base reward value
 * @param depth - Steps back from reward
 * @param gamma - Discount factor (0-1), default 0.9
 * @returns Discounted reward
 */
export function discountReward(
  reward: number,
  depth: number,
  gamma: number = 0.9
): number {
  return reward * Math.pow(gamma, depth);
}

/**
 * Compute eligibility trace
 *
 * Implements λ-return for more sophisticated credit assignment.
 * Combines temporal decay with eligibility traces.
 *
 * @param timeToReward - Time to reward in ms
 * @param lambda - Eligibility trace decay (0-1), default 0.9
 * @param gamma - Discount factor (0-1), default 0.9
 * @returns Eligibility value (0-1)
 */
export function computeEligibilityTrace(
  timeToReward: number,
  lambda: number = 0.9,
  gamma: number = 0.9
): number {
  // Convert time to approximate "steps" (assuming 100ms per step)
  const steps = Math.floor(timeToReward / 100);

  // λ-return: λ^n * γ^n
  return Math.pow(lambda, steps) * Math.pow(gamma, steps);
}
