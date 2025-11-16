import { getGrainRegistry } from '../core/GrainRegistry';
import { updateProbabilityField } from '../learning/probabilityField';
import { tuneVectorField } from '../learning/vectorField';

/**
 * Reward configuration for credit assignment
 */
export interface RewardConfig {
  decayFactor?: number;       // Temporal decay (0-1), default 0.9
  minCausalStrength?: number; // Threshold for propagation, default 0.1
  maxDepth?: number;          // Max backprop depth, default 10
  learningRate?: number;      // Field update rate, default 0.1
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
export function assignReward(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const {
    decayFactor = 0.9,
    minCausalStrength = 0.1,
    maxDepth = 10,
    learningRate = 0.1
  } = config;

  const registry = getGrainRegistry();
  const chain = registry.getNavigationChain(grainId);

  if (!chain) {
    console.warn(`[Reward] No navigation chain found for grain: ${grainId}`);
    return;
  }

  // Add reward to current grain's chain
  chain.rewards.push(reward);

  console.log(`[Reward] Assigned ${reward} to grain: ${grainId}`);

  // Backpropagate through navigation chain
  let currentReward = reward;
  let depth = 0;

  for (let i = chain.path.length - 1; i >= 0 && depth < maxDepth; i--) {
    const ancestorId = chain.path[i];
    const ancestor = registry.getGrain(ancestorId);

    if (!ancestor) continue;

    // Apply temporal decay
    currentReward *= decayFactor;

    // Stop if reward too small (below causal threshold)
    if (Math.abs(currentReward) < minCausalStrength) {
      console.log(`[Reward] Stopped at ancestor ${ancestorId} (reward too small: ${currentReward.toFixed(4)})`);
      break;
    }

    // Update ancestor's fields based on reward
    updateGrainFields(ancestorId, currentReward, learningRate);

    console.log(`[Reward] Propagated ${currentReward.toFixed(3)} to ancestor: ${ancestorId} (depth: ${depth})`);

    depth++;
  }

  console.log(`[Reward] Backpropagation complete (depth: ${depth}, final reward: ${currentReward.toFixed(3)})`);
}

/**
 * Update grain's learning fields based on reward
 *
 * This is where **Hebbian learning** emerges:
 * - Fields that were sampled together with rewards get strengthened
 * - "Neurons that fire together, wire together"
 *
 * @param grainId - ID of grain to update
 * @param reward - Reward value (can be negative)
 * @param learningRate - How fast to update (0-1)
 */
function updateGrainFields(grainId: string, reward: number, learningRate: number): void {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain) return;

  // Update probability field if it exists
  if (grain.probabilityField && grain.decisionContext?.chosenPath) {
    const chosenPath = grain.decisionContext.chosenPath;

    // Strengthen probability for rewarded choice
    const updatedField = updateProbabilityField(
      grain.probabilityField,
      chosenPath,
      reward,
      learningRate
    );

    registry.updateGrain(grainId, { probabilityField: updatedField });

    console.log(`  [Field Update] Probability field updated for ${grainId}`);
  }

  // Update vector field if it exists (gradient ascent toward reward)
  if (grain.vectorField && grain.decisionContext?.targetVector) {
    const targetVector = grain.decisionContext.targetVector;

    // Tune vector field toward target (or away if negative reward)
    const updatedVector = tuneVectorField(
      grain.vectorField,
      targetVector,
      learningRate * (reward > 0 ? 1 : -1) // Negative reward = move away
    );

    registry.updateGrain(grainId, { vectorField: updatedVector });

    console.log(`  [Field Update] Vector field updated for ${grainId}`);
  }
}

/**
 * Batch assign rewards to multiple grains
 *
 * Useful for rewarding entire navigation chains or groups of grains.
 *
 * @param rewards - Map of grainId → reward value
 * @param config - Reward configuration
 */
export function batchAssignRewards(
  rewards: Record<string, number>,
  config: RewardConfig = {}
): void {
  for (const [grainId, reward] of Object.entries(rewards)) {
    assignReward(grainId, reward, config);
  }
}

/**
 * Get total rewards received by a grain
 *
 * @param grainId - ID of grain
 * @returns Total reward sum or 0 if no chain
 */
export function getTotalReward(grainId: string): number {
  const registry = getGrainRegistry();
  const chain = registry.getNavigationChain(grainId);

  if (!chain) return 0;

  return chain.rewards.reduce((sum, r) => sum + r, 0);
}

/**
 * Get average reward per decision
 *
 * @param grainId - ID of grain
 * @returns Average reward or 0 if no rewards
 */
export function getAverageReward(grainId: string): number {
  const registry = getGrainRegistry();
  const chain = registry.getNavigationChain(grainId);

  if (!chain || chain.rewards.length === 0) return 0;

  const total = chain.rewards.reduce((sum, r) => sum + r, 0);
  return total / chain.rewards.length;
}
