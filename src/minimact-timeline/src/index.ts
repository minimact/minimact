/**
 * @minimact/timeline - Time-based state orchestration
 *
 * Declarative timelines with keyframes, easing, and precise RAF-based scheduling.
 * Think: Flash MX timeline + GSAP + Server-side prediction
 *
 * @packageDocumentation
 */

// Core exports
export * from './core';
export * from './hooks';
export * from './types';
export * from './sync';

// Version
export const VERSION = '0.2.0';
export const MES_CERTIFICATION = 'Silver'; // Minimact Extension Standards - Phase 2 complete!

/**
 * Example usage:
 *
 * ```tsx
 * import { useTimeline, useTimelineState } from '@minimact/timeline';
 * import { useState } from '@minimact/core';
 *
 * function AnimatedCounter() {
 *   const [count, setCount] = useState(0);
 *   const [color, setColor] = useState('blue');
 *
 *   const timeline = useTimeline({
 *     duration: 5000,
 *     repeat: true,
 *     easing: 'ease-in-out'
 *   });
 *
 *   useTimelineState(timeline, 'count', setCount, true); // interpolate
 *   useTimelineState(timeline, 'color', setColor);
 *
 *   timeline.keyframes([
 *     { time: 0, state: { count: 0, color: 'blue' } },
 *     { time: 2500, state: { count: 50, color: 'red' } },
 *     { time: 5000, state: { count: 100, color: 'green' } }
 *   ]);
 *
 *   timeline.play();
 *
 *   return (
 *     <div>
 *       <h1 style={{ color }}>Count: {count.toFixed(0)}</h1>
 *       <button onClick={() => timeline.pause()}>Pause</button>
 *     </div>
 *   );
 * }
 * ```
 */
