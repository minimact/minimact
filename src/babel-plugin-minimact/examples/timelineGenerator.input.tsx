/**
 * Example: timelineGenerator.cjs - Generates timeline animation attributes
 */
import { useState } from '@minimact/core';
import { useTimeline } from '@minimact/timeline';

export function TimelineGeneratorExample() {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Multi-property timeline with easing
  useTimeline({
    duration: 2000,
    easing: 'cubicBezier(0.4, 0, 0.2, 1)',
    loop: true,
    keyframes: [
      { at: 0, progress: 0, opacity: 0, rotation: 0 },
      { at: 500, opacity: 1 },
      { at: 1000, progress: 50, rotation: 180 },
      { at: 1500, opacity: 0.5 },
      { at: 2000, progress: 100, opacity: 1, rotation: 360 }
    ],
    onUpdate: (t) => console.log('Time:', t),
    onComplete: () => console.log('Loop complete')
  });

  return (
    <div
      style={{
        opacity,
        transform: `rotate(${rotation}deg)`,
        '--progress': `${progress}%`
      }}
    >
      Animation: {progress}%
    </div>
  );
}
