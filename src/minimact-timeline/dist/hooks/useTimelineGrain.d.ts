import { TimelineEngine } from '../core/Timeline';
declare module '@minimact/grains' {
    function spawnGrain(type: string, component: any, options?: any): string;
    function navigateGrain(grainId: string): string | null;
    function freezeGrain(grainId: string): void;
    function activateGrain(grainId: string): void;
    function destroyGrain(grainId: string): void;
    function getActiveGrains(): any[];
    function assignReward(grainId: string, reward: number, config?: any): void;
}
/**
 * Timeline grain action types
 */
export type TimelineGrainActionType = 'spawn' | 'navigate' | 'reward' | 'freeze' | 'activate' | 'destroy';
/**
 * Timeline grain action definition
 */
export interface TimelineGrainAction {
    time: number;
    action: TimelineGrainActionType;
    grainType?: string;
    grainId?: string;
    component?: any;
    params?: any;
}
/**
 * Spawn action parameters
 */
export interface SpawnParams {
    component: any;
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
    reward: number;
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
export declare function useTimelineGrain(timeline: TimelineEngine, actions: TimelineGrainAction[]): void;
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
export declare function createSpawnWave(startTime: number, endTime: number, count: number, grainType: string, component: any, options?: SpawnParams['options']): TimelineGrainAction[];
//# sourceMappingURL=useTimelineGrain.d.ts.map