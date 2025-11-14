import { useEffect } from '@minimact/core';
import { TimelineEngine } from '../core/Timeline';

/**
 * useTimelineState Hook
 *
 * Binds a state setter to timeline keyframes.
 * The setter will be called automatically as the timeline plays.
 *
 * @param timeline - Timeline instance
 * @param stateKey - State key that matches keyframe state
 * @param setter - State setter function
 * @param interpolate - Whether to interpolate numeric values (default: false)
 *
 * @example
 * ```tsx
 * function AnimatedCounter() {
 *   const [count, setCount] = useState(0);
 *   const timeline = useTimeline({ duration: 5000 });
 *
 *   useTimelineState(timeline, 'count', setCount, true); // interpolate numbers
 *
 *   timeline.keyframes([
 *     { time: 0, state: { count: 0 } },
 *     { time: 5000, state: { count: 100 } }
 *   ]);
 *
 *   return <div>Count: {count.toFixed(0)}</div>;
 * }
 * ```
 */
export function useTimelineState<T>(
  timeline: TimelineEngine,
  stateKey: string,
  setter: (value: T) => void,
  interpolate: boolean = false
): void {
  useEffect(() => {
    timeline.bindState(stateKey, setter, interpolate);
  }, [timeline, stateKey, setter, interpolate]);
}
