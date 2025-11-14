import { TimelineEngine } from '../core/Timeline';
import { TimelineConfig } from '../types';
/**
 * useTimeline Hook
 *
 * Creates a timeline instance with precise RAF-based scheduling.
 *
 * @param config - Timeline configuration
 * @param name - Optional timeline name
 * @returns TimelineEngine instance
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const timeline = useTimeline({
 *     duration: 5000,
 *     repeat: true,
 *     easing: 'ease-in-out'
 *   });
 *
 *   timeline.keyframes([
 *     { time: 0, state: { x: 0 } },
 *     { time: 5000, state: { x: 100 } }
 *   ]);
 *
 *   timeline.play();
 *
 *   return <div>Timeline running...</div>;
 * }
 * ```
 */
export declare function useTimeline(config: TimelineConfig, name?: string): TimelineEngine;
//# sourceMappingURL=useTimeline.d.ts.map