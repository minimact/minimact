import { getGrainRegistry } from '../core/GrainRegistry';
import { assignReward, RewardConfig } from './creditAssignment';
import { computeTemporalCreditAssignment } from './causalStrength';

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
export function propagateRewardThroughChain(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const registry = getGrainRegistry();
  const chain = registry.getNavigationChain(grainId);

  if (!chain) {
    console.warn(`[RewardPropagation] No chain for grain: ${grainId}`);
    return;
  }

  const rewardTimestamp = Date.now();

  // Compute temporal credit assignment for all ancestors
  const ancestorRewards = computeTemporalCreditAssignment(
    chain.timestamps,
    rewardTimestamp,
    reward
  );

  console.log(`[RewardPropagation] Propagating reward through chain of length ${chain.path.length}`);

  // Assign rewards to each ancestor
  chain.path.forEach((ancestorId, index) => {
    const ancestorReward = ancestorRewards[index];

    if (ancestorReward > 0) {
      assignReward(ancestorId, ancestorReward, {
        ...config,
        maxDepth: 1 // Don't double-propagate
      });
    }
  });

  // Assign reward to current grain
  assignReward(grainId, reward, {
    ...config,
    maxDepth: 1
  });
}

/**
 * Propagate reward to all grains of a specific type
 *
 * Useful for rewarding entire categories of agents.
 *
 * @param grainType - Type of grains to reward
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export function propagateRewardToType(
  grainType: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const registry = getGrainRegistry();
  const grains = registry.getGrainsByType(grainType);

  console.log(`[RewardPropagation] Rewarding ${grains.length} grains of type: ${grainType}`);

  grains.forEach(grain => {
    assignReward(grain.grainId, reward, config);
  });
}

/**
 * Propagate reward to parent grain
 *
 * Rewards the grain that spawned this grain.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export function propagateRewardToParent(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain || !grain.parentId) {
    console.warn(`[RewardPropagation] No parent for grain: ${grainId}`);
    return;
  }

  console.log(`[RewardPropagation] Rewarding parent ${grain.parentId} from child ${grainId}`);

  assignReward(grain.parentId, reward, config);
}

/**
 * Propagate reward to all children
 *
 * Rewards all grains spawned by this grain.
 *
 * @param grainId - ID of parent grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export function propagateRewardToChildren(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain || grain.childIds.length === 0) {
    console.warn(`[RewardPropagation] No children for grain: ${grainId}`);
    return;
  }

  console.log(`[RewardPropagation] Rewarding ${grain.childIds.length} children of ${grainId}`);

  grain.childIds.forEach(childId => {
    assignReward(childId, reward, config);
  });
}

/**
 * Propagate reward through sibling grains
 *
 * Rewards all grains that share the same parent.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
export function propagateRewardToSiblings(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain || !grain.parentId) {
    console.warn(`[RewardPropagation] No parent for grain: ${grainId}`);
    return;
  }

  const parent = registry.getGrain(grain.parentId);
  if (!parent) return;

  const siblings = parent.childIds.filter(id => id !== grainId);

  console.log(`[RewardPropagation] Rewarding ${siblings.length} siblings of ${grainId}`);

  siblings.forEach(siblingId => {
    assignReward(siblingId, reward, config);
  });
}

/**
 * Propagate negative reward (punishment)
 *
 * Convenience function for punishing grains.
 *
 * @param grainId - ID of grain
 * @param punishment - Punishment magnitude (will be negated)
 * @param config - Reward configuration
 */
export function punishGrain(
  grainId: string,
  punishment: number,
  config: RewardConfig = {}
): void {
  assignReward(grainId, -Math.abs(punishment), config);
}

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
export function delayedReward(
  grainId: string,
  reward: number,
  delayMs: number,
  config: RewardConfig = {}
): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      assignReward(grainId, reward, config);
      resolve();
    }, delayMs);
  });
}

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
export function conditionalReward(
  grainId: string,
  reward: number,
  condition: () => boolean,
  config: RewardConfig = {}
): void {
  if (condition()) {
    assignReward(grainId, reward, config);
  }
}
