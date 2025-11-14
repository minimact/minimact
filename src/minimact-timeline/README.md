# @minimact/timeline 🎬

> Declarative, time-based state orchestration system for Minimact

## Features

- **Precise RAF-based scheduling** - Frame-perfect timing
- **Declarative keyframes** - Define state snapshots at specific times
- **Smooth interpolation** - Easing functions and value interpolation
- **Full playback control** - Play, pause, stop, seek, reverse
- **React hooks integration** - `useTimeline()`, `useTimelineState()`
- **Grain choreography** - Coordinate multi-agent behavior (Phase 2)
- **Server-side prediction** - Pre-compute patches for entire timeline (Phase 3)

## Installation

```bash
npm install @minimact/timeline
```

## Quick Start

```tsx
import { useTimeline, useTimelineState } from '@minimact/timeline';
import { useState } from '@minimact/core';

function AnimatedCounter() {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState('blue');

  const timeline = useTimeline({
    duration: 5000,
    repeat: true
  });

  useTimelineState(timeline, 'count', setCount, true); // interpolate numbers
  useTimelineState(timeline, 'color', setColor);

  // Define keyframes
  timeline.keyframes([
    { time: 0, state: { count: 0, color: 'blue' } },
    { time: 1000, state: { count: 25, color: 'red' }, easing: 'ease-in-out' },
    { time: 2000, state: { count: 50, color: 'green' } },
    { time: 3000, state: { count: 75, color: 'purple' } },
    { time: 4000, state: { count: 100, color: 'orange' } },
    { time: 5000, state: { count: 0, color: 'blue' } }
  ]);

  return (
    <div>
      <h1 style={{ color }}>Count: {count.toFixed(0)}</h1>
      <button onClick={() => timeline.play()}>Play</button>
      <button onClick={() => timeline.pause()}>Pause</button>
      <button onClick={() => timeline.stop()}>Stop</button>
    </div>
  );
}
```

## API

### `useTimeline(config, name?)`

Create a timeline instance.

```typescript
const timeline = useTimeline({
  duration: 10000,      // Total duration in ms
  repeat: true,         // Loop timeline
  repeatCount: 3,       // Number of loops (default: Infinity)
  playbackRate: 1.0,    // Speed (2.0 = 2x speed)
  easing: 'ease-in-out',// Default easing
  autoPlay: false,      // Start immediately
  onComplete: () => {}, // Completion callback
  onLoop: () => {}      // Loop callback
});
```

### `useTimelineState(timeline, key, setter, interpolate?)`

Bind state to timeline keyframes.

```typescript
useTimelineState(timeline, 'x', setX, true); // interpolate numbers
useTimelineState(timeline, 'color', setColor); // snap at 50% progress
```

### Timeline Methods

```typescript
timeline.play();                  // Start playback
timeline.pause();                 // Pause playback
timeline.stop();                  // Stop and reset
timeline.seek(5000);              // Jump to 5s
timeline.reverse();               // Reverse direction
timeline.setPlaybackRate(2.0);    // 2x speed

timeline.keyframe(1000, { x: 100, y: 200 });
timeline.keyframes([/* array */]);

timeline.at(2000, () => {
  console.log('Executed at 2s!');
});

timeline.on('play', () => {});
timeline.on('pause', () => {});
timeline.on('complete', () => {});
```

## Flash MX Vibes 🎞️

This is like the Flash timeline, but:
- ✅ Declarative (not imperative tweens)
- ✅ Server-predicted (Minimact magic!)
- ✅ Minimact hooks (modern DX)
- ✅ Grain choreography (AI agent coordination)

## License

MIT
