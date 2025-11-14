import { useEffect } from '@minimact/core';
import { TimelineEngine } from '../core/Timeline';

// Import from @minimact/grains
// Note: These will be available when grains package is installed
declare module '@minimact/grains' {
  export function spawnGrain(type: string, component: any, options?: any): string;
  export function navigateGrain(grainId: string): string | null;
  export function freezeGrain(grainId: string): void;
  export function activateGrain(grainId: string): void;
  export function destroyGrain(grainId: string): void;
  export function getActiveGrains(): any[];
  export function assignReward(grainId: string, reward: number, config?: any): void;
}

/**
 * Timeline grain action types
 */
export type TimelineGrainActionType =
  | 'spawn'
  | 'navigate'
  | 'reward'
  | 'freeze'
  | 'activate'
  | 'destroy';

/**
 * Timeline grain action definition
 */
export interface TimelineGrainAction {
  time: number;                    // When to execute (ms)
  action: TimelineGrainActionType; // Action type
  grainType?: string;              // For spawn action
  grainId?: string;                // Target grain ID (or 'all' for batch)
  component?: any;                 // For spawn action
  params?: any;                    // Action-specific parameters
}

/**
 * Spawn action parameters
 */
export interface SpawnParams {
  component: any;                  // Grain component
  options?: {
    initialState?: any;
    probabilityField?: Record<string, number>;
    vectorField?: number[];
    metadata?: Record<string, any>;
  };
}

/**
 * Reward action parameters
 */
export interface RewardParams {
  reward: number;                  // Reward value
  config?: {
    decayFactor?: number;
    minCausalStrength?: number;
    maxDepth?: number;
  };
}

/**
 * useTimelineGrain Hook
 *
 * Enables timeline to orchestrate grain networks.
 * Schedule grain spawning, navigation, rewards, and lifecycle changes.
 *
 * @param timeline - Timeline engine instance
 * @param actions - Array of scheduled grain actions
 *
 * @example
 * ```tsx
 * const timeline = useTimeline({ duration: 10000, repeat: true });
 *
 * useTimelineGrain(timeline, [
 *   // Spawn grains in waves
 *   { time: 0, action: 'spawn', grainType: 'Explorer', params: { component: ExplorerGrain } },
 *   { time: 100, action: 'spawn', grainType: 'Explorer', params: { component: ExplorerGrain } },
 *
 *   // Reward grains at 5s
 *   { time: 5000, action: 'reward', grainId: 'Explorer:1', params: { reward: 10.0 } },
 *
 *   // Freeze all grains at 8s
 *   { time: 8000, action: 'freeze', grainId: 'all' },
 *
 *   // Destroy all at 10s
 *   { time: 10000, action: 'destroy', grainId: 'all' }
 * ]);
 * ```
 */
export function useTimelineGrain(
  timeline: TimelineEngine,
  actions: TimelineGrainAction[]
): void {
  useEffect(() => {
    // Import grain functions dynamically
    let grainFunctions: any = {};

    try {
      // Try to import @minimact/grains
      grainFunctions = require('@minimact/grains');
    } catch (error) {
      console.warn('[useTimelineGrain] @minimact/grains not installed. Grain actions will be no-ops.');
      return;
    }

    const {
      spawnGrain,
      navigateGrain,
      freezeGrain,
      activateGrain,
      destroyGrain,
      getActiveGrains,
      assignReward
    } = grainFunctions;

    // Track spawned grain IDs for batch operations
    const spawnedGrainIds: string[] = [];

    // Schedule each action
    actions.forEach(({ time, action, grainType, grainId, component, params }) => {
      timeline.at(time, () => {
        switch (action) {
          case 'spawn': {
            if (!grainType) {
              console.warn('[TimelineGrain] Spawn action requires grainType');
              return;
            }

            const spawnParams = params as SpawnParams | undefined;
            const grainComponent = component || spawnParams?.component;

            if (!grainComponent) {
              console.warn('[TimelineGrain] Spawn action requires component');
              return;
            }

            const newGrainId = spawnGrain(grainType, grainComponent, spawnParams?.options);
            spawnedGrainIds.push(newGrainId);

            console.log(`[TimelineGrain] Spawned grain: ${newGrainId} (type: ${grainType})`);
            break;
          }

          case 'navigate': {
            if (!grainId) {
              console.warn('[TimelineGrain] Navigate action requires grainId');
              return;
            }

            if (grainId === 'all') {
              // Navigate all spawned grains
              spawnedGrainIds.forEach(id => {
                const nextGrainType = navigateGrain(id);
                if (nextGrainType) {
                  console.log(`[TimelineGrain] Navigated grain: ${id} → ${nextGrainType}`);
                }
              });
            } else {
              const nextGrainType = navigateGrain(grainId);
              if (nextGrainType) {
                console.log(`[TimelineGrain] Navigated grain: ${grainId} → ${nextGrainType}`);
              }
            }
            break;
          }

          case 'reward': {
            if (!grainId) {
              console.warn('[TimelineGrain] Reward action requires grainId');
              return;
            }

            const rewardParams = params as RewardParams | undefined;
            const reward = rewardParams?.reward ?? 1.0;

            if (grainId === 'all') {
              // Reward all spawned grains
              spawnedGrainIds.forEach(id => {
                assignReward(id, reward, rewardParams?.config);
                console.log(`[TimelineGrain] Rewarded grain: ${id} (reward: ${reward})`);
              });
            } else {
              assignReward(grainId, reward, rewardParams?.config);
              console.log(`[TimelineGrain] Rewarded grain: ${grainId} (reward: ${reward})`);
            }
            break;
          }

          case 'freeze': {
            if (!grainId) {
              console.warn('[TimelineGrain] Freeze action requires grainId');
              return;
            }

            if (grainId === 'all') {
              // Freeze all spawned grains
              spawnedGrainIds.forEach(id => {
                freezeGrain(id);
                console.log(`[TimelineGrain] Frozen grain: ${id}`);
              });
            } else {
              freezeGrain(grainId);
              console.log(`[TimelineGrain] Frozen grain: ${grainId}`);
            }
            break;
          }

          case 'activate': {
            if (!grainId) {
              console.warn('[TimelineGrain] Activate action requires grainId');
              return;
            }

            if (grainId === 'all') {
              // Activate all spawned grains
              spawnedGrainIds.forEach(id => {
                activateGrain(id);
                console.log(`[TimelineGrain] Activated grain: ${id}`);
              });
            } else {
              activateGrain(grainId);
              console.log(`[TimelineGrain] Activated grain: ${grainId}`);
            }
            break;
          }

          case 'destroy': {
            if (!grainId) {
              console.warn('[TimelineGrain] Destroy action requires grainId');
              return;
            }

            if (grainId === 'all') {
              // Destroy all spawned grains
              spawnedGrainIds.forEach(id => {
                destroyGrain(id);
                console.log(`[TimelineGrain] Destroyed grain: ${id}`);
              });
              spawnedGrainIds.length = 0; // Clear array
            } else {
              destroyGrain(grainId);
              console.log(`[TimelineGrain] Destroyed grain: ${grainId}`);

              // Remove from spawned list
              const index = spawnedGrainIds.indexOf(grainId);
              if (index !== -1) {
                spawnedGrainIds.splice(index, 1);
              }
            }
            break;
          }

          default:
            console.warn(`[TimelineGrain] Unknown action: ${action}`);
        }
      });
    });

    console.log(`[useTimelineGrain] Scheduled ${actions.length} grain actions`);
  }, [timeline, actions]);
}

/**
 * Helper: Create spawn wave
 *
 * Generates an array of spawn actions over a time range.
 *
 * @param startTime - Start time (ms)
 * @param endTime - End time (ms)
 * @param count - Number of grains to spawn
 * @param grainType - Type of grain to spawn
 * @param component - Grain component
 * @param options - Spawn options
 * @returns Array of spawn actions
 *
 * @example
 * ```tsx
 * const spawnWave = createSpawnWave(0, 1000, 50, 'Explorer', ExplorerGrain);
 * useTimelineGrain(timeline, spawnWave);
 * ```
 */
export function createSpawnWave(
  startTime: number,
  endTime: number,
  count: number,
  grainType: string,
  component: any,
  options?: SpawnParams['options']
): TimelineGrainAction[] {
  const interval = (endTime - startTime) / count;
  const actions: TimelineGrainAction[] = [];

  for (let i = 0; i < count; i++) {
    actions.push({
      time: startTime + i * interval,
      action: 'spawn',
      grainType,
      component,
      params: { component, options }
    });
  }

  return actions;
}
