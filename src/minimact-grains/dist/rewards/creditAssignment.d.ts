/**
 * Reward configuration for credit assignment
 */
export interface RewardConfig {
    decayFactor?: number;
    minCausalStrength?: number;
    maxDepth?: number;
    learningRate?: number;
}
/**
 * Assign reward to a grain and backpropagate through navigation chain
 *
 * This implements **temporal credit assignment** - grains that led to
 * the rewarded outcome get their fields tuned, with exponential decay
 * based on time/distance from the reward.
 *
 * @param grainId - ID of grain receiving reward
 * @param reward - Reward value (positive = good, negative = bad)
 * @param config - Reward configuration options
 *
 * @example
 * ```tsx
 * // Grain found target location
 * useEffect(() => {
 *   const distance = euclideanDistance(position, targetPosition);
 *   if (distance < 1.0) {
 *     assignReward(grainId, 10.0); // Big reward!
 *   }
 * }, [position, targetPosition]);
 * ```
 */
export declare function assignReward(grainId: string, reward: number, config?: RewardConfig): void;
/**
 * Batch assign rewards to multiple grains
 *
 * Useful for rewarding entire navigation chains or groups of grains.
 *
 * @param rewards - Map of grainId → reward value
 * @param config - Reward configuration
 */
export declare function batchAssignRewards(rewards: Record<string, number>, config?: RewardConfig): void;
/**
 * Get total rewards received by a grain
 *
 * @param grainId - ID of grain
 * @returns Total reward sum or 0 if no chain
 */
export declare function getTotalReward(grainId: string): number;
/**
 * Get average reward per decision
 *
 * @param grainId - ID of grain
 * @returns Average reward or 0 if no rewards
 */
export declare function getAverageReward(grainId: string): number;
//# sourceMappingURL=creditAssignment.d.ts.map