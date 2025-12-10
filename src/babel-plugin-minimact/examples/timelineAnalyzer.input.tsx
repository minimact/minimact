/**
 * Example: timelineAnalyzer.cjs - Analyzes @minimact/timeline usage
 */
import { useState } from '@minimact/core';
import { useTimeline } from '@minimact/timeline';

export function TimelineAnalyzerExample() {
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [x, setX] = useState(-100);

  useTimeline({
    duration: 1000,
    easing: 'easeInOut',
    keyframes: [
      { at: 0, opacity: 0, scale: 0.5, x: -100 },
      { at: 500, opacity: 1, scale: 1.2, x: 0 },
      { at: 1000, opacity: 1, scale: 1, x: 0 }
    ],
    onComplete: () => console.log('Animation done')
  });

  return (
    <div style={{ opacity, transform: `scale(${scale}) translateX(${x}px)` }}>
      Animated content
    </div>
  );
}
