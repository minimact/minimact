import { useEffect, useRef, useState } from '@minimact/core';
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
export function useTimeline(config: TimelineConfig, name?: string): TimelineEngine {
  const timelineRef = useRef<TimelineEngine | null>(null);
  const [, forceUpdate] = useState(0);

  if (!timelineRef.current) {
    timelineRef.current = new TimelineEngine(config, name);

    // Force re-render on timeline events
    timelineRef.current.on('play', () => forceUpdate(n => n + 1));
    timelineRef.current.on('pause', () => forceUpdate(n => n + 1));
    timelineRef.current.on('stop', () => forceUpdate(n => n + 1));
    timelineRef.current.on('seek', () => forceUpdate(n => n + 1));
  }

  useEffect(() => {
    return () => {
      timelineRef.current?.dispose();
    };
  }, []);

  return timelineRef.current;
}
