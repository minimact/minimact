import { TimelineEngine } from '../core/Timeline';
/**
 * useTimelineEffect Hook
 *
 * Schedule effects to run at specific times in the timeline.
 * Similar to useEffect, but time-based instead of dependency-based.
 *
 * @param timeline - Timeline engine instance
 * @param time - When to execute effect (ms)
 * @param effect - Effect function to execute
 *
 * @example
 * ```tsx
 * const timeline = useTimeline({ duration: 5000 });
 *
 * useTimelineEffect(timeline, 1000, () => {
 *   console.log('1 second elapsed!');
 * });
 *
 * useTimelineEffect(timeline, 2500, () => {
 *   console.log('Halfway through!');
 * });
 *
 * useTimelineEffect(timeline, 5000, () => {
 *   console.log('Timeline complete!');
 * });
 * ```
 */
export declare function useTimelineEffect(timeline: TimelineEngine, time: number, effect: () => void): void;
/**
 * useTimelineEffects Hook
 *
 * Schedule multiple effects at once.
 *
 * @param timeline - Timeline engine instance
 * @param effects - Array of { time, effect } objects
 *
 * @example
 * ```tsx
 * useTimelineEffects(timeline, [
 *   { time: 1000, effect: () => console.log('1s') },
 *   { time: 2000, effect: () => console.log('2s') },
 *   { time: 3000, effect: () => console.log('3s') }
 * ]);
 * ```
 */
export declare function useTimelineEffects(timeline: TimelineEngine, effects: Array<{
    time: number;
    effect: () => void;
}>): void;
//# sourceMappingURL=useTimelineEffect.d.ts.map