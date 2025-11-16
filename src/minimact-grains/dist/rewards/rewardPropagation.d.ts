import { RewardConfig } from './creditAssignment';
/**
 * Propagate reward through entire navigation chain
 *
 * Traverses the navigation chain and assigns decayed rewards
 * to all ancestors based on temporal distance.
 *
 * @param grainId - ID of grain receiving reward
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export declare function propagateRewardThroughChain(grainId: string, reward: number, config?: RewardConfig): void;
/**
 * Propagate reward to all grains of a specific type
 *
 * Useful for rewarding entire categories of agents.
 *
 * @param grainType - Type of grains to reward
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export declare function propagateRewardToType(grainType: string, reward: number, config?: RewardConfig): void;
/**
 * Propagate reward to parent grain
 *
 * Rewards the grain that spawned this grain.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export declare function propagateRewardToParent(grainId: string, reward: number, config?: RewardConfig): void;
/**
 * Propagate reward to all children
 *
 * Rewards all grains spawned by this grain.
 *
 * @param grainId - ID of parent grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export declare function propagateRewardToChildren(grainId: string, reward: number, config?: RewardConfig): void;
/**
 * Propagate reward through sibling grains
 *
 * Rewards all grains that share the same parent.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export declare function propagateRewardToSiblings(grainId: string, reward: number, config?: RewardConfig): void;
/**
 * Propagate negative reward (punishment)
 *
 * Convenience function for punishing grains.
 *
 * @param grainId - ID of grain
 * @param punishment - Punishment magnitude (will be negated)
 * @param config - Reward configuration
 */
export declare function punishGrain(grainId: string, punishment: number, config?: RewardConfig): void;
/**
 * Delayed reward propagation
 *
 * Assigns reward after a delay. Useful for long-term rewards.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param delayMs - Delay in milliseconds
 * @param config - Reward configuration
 * @returns Promise that resolves when reward is assigned
 */
export declare function delayedReward(grainId: string, reward: number, delayMs: number, config?: RewardConfig): Promise<void>;
/**
 * Conditional reward
 *
 * Only assigns reward if condition is met.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param condition - Condition function
 * @param config - Reward configuration
 */
export declare function conditionalReward(grainId: string, reward: number, condition: () => boolean, config?: RewardConfig): void;
//# sourceMappingURL=rewardPropagation.d.ts.map