# @minimact/timeline - Implementation Plan

## 🎬 Vision

**@minimact/timeline** is a declarative, time-based state orchestration system that enables:

- **Animated UI sequences** with precise timing
- **Interactive tutorials** with scripted state changes
- **Presentation modes** with automatic transitions
- **Story-driven interfaces** with branching narratives
- **Testing automation** with reproducible scenarios
- **Grain choreography** with coordinated multi-agent behavior
- **Template patch scheduling** via SignalR for server-driven animations

Think: **GSAP + Redux DevTools Time Travel + Grain Networks + Server-Side Prediction**

---

## 🎯 Core Philosophy

1. **Timelines are declarative** - Define keyframes, not imperative animations
2. **Timelines are predictable** - Server pre-computes patches for entire timeline
3. **Timelines are controllable** - Play, pause, seek, reverse, loop
4. **Timelines are composable** - Nest timelines, branch narratives, sync multiple
5. **Timelines are server-aware** - SignalR delivers patches at scheduled times
6. **Timelines orchestrate grains** - Spawn, navigate, reward grains on schedule
7. **Timelines are inspectable** - Debug, scrub, export timeline data

---

## 📦 Package Structure

```
@minimact/timeline/
├── src/
│   ├── core/
│   │   ├── Timeline.ts              # Core timeline engine
│   │   ├── Keyframe.ts              # Keyframe definition
│   │   ├── TimelineScheduler.ts     # Precise RAF-based scheduler
│   │   ├── Easing.ts                # Easing functions (linear, ease-in-out, etc.)
│   │   └── Interpolation.ts         # Value interpolation between keyframes
│   ├── hooks/
│   │   ├── useTimeline.ts           # Main React hook
│   │   ├── useTimelineState.ts      # Bind state variables to timeline
│   │   ├── useTimelineGrain.ts      # Bind grains to timeline
│   │   └── useTimelineEffect.ts     # Run effects at specific times
│   ├── sync/
│   │   ├── SignalRTimelineSync.ts   # Server sync for patch scheduling
│   │   ├── PatchScheduler.ts        # Schedule patch delivery from server
│   │   └── TimelinePredictor.ts     # Client-side timeline prediction
│   ├── branching/
│   │   ├── TimelineBranch.ts        # Branching narratives
│   │   └── BranchCondition.ts       # Conditional branching logic
│   ├── types/
│   │   ├── Timeline.ts              # Core types
│   │   ├── Keyframe.ts              # Keyframe types
│   │   └── TimelineConfig.ts        # Configuration types
│   └── index.ts
├── package.json
├── tsconfig.json
└── rollup.config.js
```

---

## 🏗️ Phase 1: Core Timeline Engine (Client-Side)

**Goal:** Build the headless timeline runtime - precise scheduling, playback control, keyframe interpolation.

### 1.1 Type Definitions

**File:** `types/Timeline.ts`

```typescript
export type TimelineStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'seeking';

export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';

export interface TimelineConfig {
  duration: number;              // Total duration in ms
  repeat?: boolean;              // Loop timeline
  repeatCount?: number;          // Number of loops (default: Infinity if repeat=true)
  playbackRate?: number;         // Speed multiplier (1.0 = normal, 2.0 = 2x speed)
  easing?: EasingFunction;       // Global easing function
  autoPlay?: boolean;            // Start playing immediately
  onComplete?: () => void;       // Callback when timeline completes
  onLoop?: () => void;           // Callback on each loop
}

export interface Timeline {
  // Identity
  timelineId: string;
  name?: string;

  // Configuration
  config: TimelineConfig;

  // Keyframes
  keyframes: Keyframe[];

  // Current state
  status: TimelineStatus;
  currentTime: number;           // Current playback time (ms)
  startTime?: number;            // Performance.now() when play() was called
  pauseTime?: number;            // When pause() was called

  // Repeat tracking
  loopCount: number;             // Number of loops completed

  // Bindings
  stateBindings: Map<string, StateBinder>;
  grainBindings: Map<string, GrainBinder>;
  effectBindings: TimelineEffect[];

  // Metadata
  metadata?: Record<string, any>;
}

export interface StateBinder {
  stateKey: string;
  setter: (value: any) => void;
  interpolate?: boolean;         // Interpolate between keyframes
}

export interface GrainBinder {
  grainId: string;
  action: 'spawn' | 'navigate' | 'reward' | 'freeze' | 'activate' | 'destroy';
  params?: any;
}

export interface TimelineEffect {
  time: number;                  // When to execute (ms)
  effect: () => void;            // Effect function
  executed?: boolean;            // Has it been executed this loop
}
```

**File:** `types/Keyframe.ts`

```typescript
export interface Keyframe<TState = any> {
  time: number;                  // Time in ms
  state?: TState;                // State snapshot at this time
  easing?: EasingFunction;       // Override global easing
  label?: string;                // Optional label for seeking
}

export interface KeyframeWithInterpolation extends Keyframe {
  interpolatedValues?: Map<string, any>;
}
```

### 1.2 Timeline Engine

**File:** `core/Timeline.ts`

```typescript
import { Timeline, TimelineConfig, Keyframe, TimelineStatus } from '../types';

let timelineCounter = 0;

function generateTimelineId(name?: string): string {
  return `${name || 'timeline'}:${++timelineCounter}:${Date.now()}`;
}

export class TimelineEngine {
  private timeline: Timeline;
  private rafId?: number;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: TimelineConfig, name?: string) {
    this.timeline = {
      timelineId: generateTimelineId(name),
      name,
      config: {
        repeat: false,
        repeatCount: Infinity,
        playbackRate: 1.0,
        easing: 'linear',
        autoPlay: false,
        ...config
      },
      keyframes: [],
      status: 'idle',
      currentTime: 0,
      loopCount: 0,
      stateBindings: new Map(),
      grainBindings: new Map(),
      effectBindings: []
    };

    if (this.timeline.config.autoPlay) {
      this.play();
    }
  }

  /**
   * Add keyframe to timeline
   */
  keyframe<TState = any>(time: number, state: TState, options?: Partial<Keyframe>): void {
    const keyframe: Keyframe<TState> = {
      time,
      state,
      ...options
    };

    this.timeline.keyframes.push(keyframe);

    // Sort keyframes by time
    this.timeline.keyframes.sort((a, b) => a.time - b.time);

    console.log(`[Timeline] Added keyframe at ${time}ms`);
  }

  /**
   * Batch add keyframes
   */
  keyframes(keyframes: Keyframe[]): void {
    keyframes.forEach(kf => this.keyframe(kf.time, kf.state, kf));
  }

  /**
   * Bind state setter to timeline
   */
  bindState(stateKey: string, setter: (value: any) => void, interpolate: boolean = false): void {
    this.timeline.stateBindings.set(stateKey, {
      stateKey,
      setter,
      interpolate
    });

    console.log(`[Timeline] Bound state: ${stateKey} (interpolate: ${interpolate})`);
  }

  /**
   * Bind grain action to timeline
   */
  bindGrain(grainId: string, action: GrainBinder['action'], params?: any): void {
    this.timeline.grainBindings.set(grainId, {
      grainId,
      action,
      params
    });

    console.log(`[Timeline] Bound grain: ${grainId} (action: ${action})`);
  }

  /**
   * Schedule effect at specific time
   */
  at(time: number, effect: () => void): void {
    this.timeline.effectBindings.push({
      time,
      effect,
      executed: false
    });

    // Sort by time
    this.timeline.effectBindings.sort((a, b) => a.time - b.time);

    console.log(`[Timeline] Scheduled effect at ${time}ms`);
  }

  /**
   * Play timeline
   */
  play(): void {
    if (this.timeline.status === 'playing') return;

    this.timeline.status = 'playing';
    this.timeline.startTime = performance.now() - this.timeline.currentTime;

    this.emit('play');
    this.tick();

    console.log(`[Timeline] Playing from ${this.timeline.currentTime}ms`);
  }

  /**
   * Pause timeline
   */
  pause(): void {
    if (this.timeline.status !== 'playing') return;

    this.timeline.status = 'paused';
    this.timeline.pauseTime = performance.now();

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }

    this.emit('pause');

    console.log(`[Timeline] Paused at ${this.timeline.currentTime}ms`);
  }

  /**
   * Stop timeline (reset to beginning)
   */
  stop(): void {
    this.timeline.status = 'stopped';
    this.timeline.currentTime = 0;
    this.timeline.loopCount = 0;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }

    // Reset all effects
    this.timeline.effectBindings.forEach(effect => {
      effect.executed = false;
    });

    this.emit('stop');
    this.applyKeyframeState(0);

    console.log('[Timeline] Stopped and reset');
  }

  /**
   * Reset timeline to beginning (without stopping)
   */
  reset(): void {
    this.timeline.currentTime = 0;
    this.timeline.loopCount = 0;

    // Reset all effects
    this.timeline.effectBindings.forEach(effect => {
      effect.executed = false;
    });

    this.applyKeyframeState(0);

    console.log('[Timeline] Reset to beginning');
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    const wasPlaying = this.timeline.status === 'playing';

    if (wasPlaying) {
      this.pause();
    }

    this.timeline.currentTime = Math.max(0, Math.min(time, this.timeline.config.duration));

    // Reset effects that haven't been executed yet
    this.timeline.effectBindings.forEach(effect => {
      effect.executed = effect.time <= this.timeline.currentTime;
    });

    this.applyKeyframeState(this.timeline.currentTime);

    if (wasPlaying) {
      this.play();
    }

    this.emit('seek', this.timeline.currentTime);

    console.log(`[Timeline] Seeked to ${this.timeline.currentTime}ms`);
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    this.timeline.config.playbackRate = rate;
    console.log(`[Timeline] Playback rate: ${rate}x`);
  }

  /**
   * Reverse playback direction
   */
  reverse(): void {
    this.timeline.config.playbackRate = -Math.abs(this.timeline.config.playbackRate!);
    console.log('[Timeline] Reversed playback direction');
  }

  /**
   * Main tick function (RAF loop)
   */
  private tick = (): void => {
    if (this.timeline.status !== 'playing') return;

    const now = performance.now();
    const elapsed = (now - this.timeline.startTime!) * this.timeline.config.playbackRate!;

    this.timeline.currentTime = elapsed;

    // Check for timeline completion
    if (this.timeline.currentTime >= this.timeline.config.duration) {
      this.handleCompletion();
      return;
    }

    // Apply current state
    this.applyKeyframeState(this.timeline.currentTime);

    // Execute effects
    this.executeEffects(this.timeline.currentTime);

    // Continue loop
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Handle timeline completion
   */
  private handleCompletion(): void {
    this.timeline.loopCount++;

    const shouldRepeat =
      this.timeline.config.repeat &&
      (this.timeline.config.repeatCount === Infinity ||
        this.timeline.loopCount < this.timeline.config.repeatCount!);

    if (shouldRepeat) {
      this.emit('loop', this.timeline.loopCount);
      this.timeline.config.onLoop?.();
      this.reset();
      this.play();
    } else {
      this.timeline.status = 'stopped';
      this.emit('complete');
      this.timeline.config.onComplete?.();
      console.log('[Timeline] Completed');
    }
  }

  /**
   * Apply state for current time
   */
  private applyKeyframeState(time: number): void {
    // Find surrounding keyframes
    const { prev, next } = this.findSurroundingKeyframes(time);

    if (!prev && !next) return;

    // If exact keyframe match, apply directly
    if (prev && prev.time === time) {
      this.applyState(prev.state);
      return;
    }

    // If only one keyframe, apply it
    if (!next) {
      this.applyState(prev!.state);
      return;
    }

    if (!prev) {
      this.applyState(next.state);
      return;
    }

    // Interpolate between keyframes
    const progress = (time - prev.time) / (next.time - prev.time);
    const easedProgress = this.applyEasing(progress, next.easing || this.timeline.config.easing!);

    this.applyInterpolatedState(prev.state, next.state, easedProgress);
  }

  /**
   * Find keyframes surrounding current time
   */
  private findSurroundingKeyframes(time: number): { prev?: Keyframe; next?: Keyframe } {
    let prev: Keyframe | undefined;
    let next: Keyframe | undefined;

    for (const kf of this.timeline.keyframes) {
      if (kf.time <= time) {
        prev = kf;
      } else if (kf.time > time && !next) {
        next = kf;
        break;
      }
    }

    return { prev, next };
  }

  /**
   * Apply state directly
   */
  private applyState(state: any): void {
    if (!state) return;

    for (const [key, binder] of this.timeline.stateBindings.entries()) {
      if (key in state) {
        binder.setter(state[key]);
      }
    }
  }

  /**
   * Apply interpolated state
   */
  private applyInterpolatedState(prevState: any, nextState: any, progress: number): void {
    if (!prevState || !nextState) return;

    for (const [key, binder] of this.timeline.stateBindings.entries()) {
      if (!(key in prevState) || !(key in nextState)) continue;

      const prevValue = prevState[key];
      const nextValue = nextState[key];

      // Only interpolate if binder allows it and values are numbers
      if (binder.interpolate && typeof prevValue === 'number' && typeof nextValue === 'number') {
        const interpolated = prevValue + (nextValue - prevValue) * progress;
        binder.setter(interpolated);
      } else {
        // Snap to next value at 50% progress
        binder.setter(progress >= 0.5 ? nextValue : prevValue);
      }
    }
  }

  /**
   * Execute effects at current time
   */
  private executeEffects(time: number): void {
    for (const effect of this.timeline.effectBindings) {
      if (!effect.executed && time >= effect.time) {
        effect.effect();
        effect.executed = true;
        this.emit('effect', effect);
      }
    }
  }

  /**
   * Apply easing function
   */
  private applyEasing(progress: number, easing: EasingFunction): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return progress * (2 - progress);
      case 'ease-in-out':
        return progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
      default:
        return progress;
    }
  }

  /**
   * Event emitter
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  /**
   * Get current timeline state
   */
  getState(): Timeline {
    return this.timeline;
  }

  /**
   * Dispose timeline
   */
  dispose(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.listeners.clear();
    console.log('[Timeline] Disposed');
  }
}
```

### 1.3 useTimeline Hook

**File:** `hooks/useTimeline.ts`

```typescript
import { useEffect, useRef, useState } from '@minimact/core';
import { TimelineEngine } from '../core/Timeline';
import { TimelineConfig } from '../types';

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
```

### 1.4 useTimelineState Hook

**File:** `hooks/useTimelineState.ts`

```typescript
import { useEffect } from '@minimact/core';
import { TimelineEngine } from '../core/Timeline';

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
```

---

## 🏗️ Phase 2: Grain Integration

**Goal:** Enable timelines to orchestrate grain networks - spawn, navigate, reward grains on schedule.

### 2.1 useTimelineGrain Hook

**File:** `hooks/useTimelineGrain.ts`

```typescript
import { useEffect } from '@minimact/core';
import { spawnGrain, navigateGrain, assignReward, freezeGrain, activateGrain, destroyGrain } from '@minimact/grains';
import { TimelineEngine } from '../core/Timeline';

export interface TimelineGrainAction {
  time: number;
  action: 'spawn' | 'navigate' | 'reward' | 'freeze' | 'activate' | 'destroy';
  grainType?: string;
  grainId?: string;
  params?: any;
}

export function useTimelineGrain(
  timeline: TimelineEngine,
  actions: TimelineGrainAction[]
): void {
  useEffect(() => {
    actions.forEach(({ time, action, grainType, grainId, params }) => {
      timeline.at(time, () => {
        switch (action) {
          case 'spawn':
            if (!grainType) {
              console.warn('[TimelineGrain] Spawn action requires grainType');
              return;
            }
            const newGrainId = spawnGrain(grainType, params?.component, params?.options);
            console.log(`[TimelineGrain] Spawned grain: ${newGrainId}`);
            break;

          case 'navigate':
            if (!grainId) {
              console.warn('[TimelineGrain] Navigate action requires grainId');
              return;
            }
            navigateGrain(grainId);
            console.log(`[TimelineGrain] Navigated grain: ${grainId}`);
            break;

          case 'reward':
            if (!grainId) {
              console.warn('[TimelineGrain] Reward action requires grainId');
              return;
            }
            assignReward(grainId, params?.reward || 1.0, params?.config);
            console.log(`[TimelineGrain] Rewarded grain: ${grainId}`);
            break;

          case 'freeze':
            if (!grainId) {
              console.warn('[TimelineGrain] Freeze action requires grainId');
              return;
            }
            freezeGrain(grainId);
            console.log(`[TimelineGrain] Frozen grain: ${grainId}`);
            break;

          case 'activate':
            if (!grainId) {
              console.warn('[TimelineGrain] Activate action requires grainId');
              return;
            }
            activateGrain(grainId);
            console.log(`[TimelineGrain] Activated grain: ${grainId}`);
            break;

          case 'destroy':
            if (!grainId) {
              console.warn('[TimelineGrain] Destroy action requires grainId');
              return;
            }
            destroyGrain(grainId);
            console.log(`[TimelineGrain] Destroyed grain: ${grainId}`);
            break;
        }
      });
    });
  }, [timeline, actions]);
}
```

### 2.2 Grain-Controlled Timeline

Grains can also control timelines:

```typescript
// In a grain component
function SmartGrain({ grainId, timeline }: { grainId: string; timeline: TimelineEngine }) {
  useGrain(grainId);

  const [hasFoundTarget, setHasFoundTarget] = useState(false);

  useEffect(() => {
    if (hasFoundTarget) {
      // Grain found target - pause timeline
      timeline.pause();

      // Or speed up timeline
      timeline.setPlaybackRate(2.0);

      // Or seek to specific time
      timeline.seek(5000);
    }
  }, [hasFoundTarget, timeline]);

  return <div>Smart Grain</div>;
}
```

---

## 🏗️ Phase 3: Server-Side Integration

**Goal:** Server pre-computes patches for entire timeline and sends them to client for scheduled delivery via SignalR.

### 3.1 C# Timeline Definition

**File:** `Minimact.AspNetCore/Timeline/MinimactTimeline.cs`

```csharp
using Minimact.AspNetCore.Core;
using System.Collections.Generic;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Base class for server-side timeline definitions
/// </summary>
public abstract class MinimactTimeline<TState> where TState : class, new()
{
    public string TimelineId { get; set; }
    public string Name { get; set; }
    public int Duration { get; set; }
    public bool Repeat { get; set; }
    public List<TimelineKeyframe<TState>> Keyframes { get; set; } = new();

    protected MinimactTimeline(string name, int duration, bool repeat = false)
    {
        TimelineId = Guid.NewGuid().ToString();
        Name = name;
        Duration = duration;
        Repeat = repeat;

        DefineKeyframes();
    }

    /// <summary>
    /// Override to define keyframes
    /// </summary>
    protected abstract void DefineKeyframes();

    /// <summary>
    /// Add keyframe at specific time
    /// </summary>
    protected void Keyframe(int time, TState state)
    {
        Keyframes.Add(new TimelineKeyframe<TState>
        {
            Time = time,
            State = state
        });

        // Sort by time
        Keyframes.Sort((a, b) => a.Time.CompareTo(b.Time));
    }
}

/// <summary>
/// Timeline keyframe
/// </summary>
public class TimelineKeyframe<TState>
{
    public int Time { get; set; }
    public TState State { get; set; }
}
```

### 3.2 Timeline Predictor (Server)

**File:** `Minimact.AspNetCore/Timeline/TimelinePredictor.cs`

```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Reconciliation;
using System.Collections.Generic;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Pre-computes patches for entire timeline at build time
/// </summary>
public class TimelinePredictor
{
    private readonly IRustReconciler _reconciler;

    public TimelinePredictor(IRustReconciler reconciler)
    {
        _reconciler = reconciler;
    }

    /// <summary>
    /// Pre-compute all patches for timeline
    /// </summary>
    public Dictionary<int, List<Patch>> PrecomputeTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        var patchesByTime = new Dictionary<int, List<Patch>>();
        VNode? previousVNode = null;

        foreach (var keyframe in timeline.Keyframes)
        {
            // Update component state to keyframe state
            component.SetStateFromTimeline(keyframe.State);

            // Render VNode at this keyframe
            var currentVNode = component.Render();

            // Compute patches from previous state
            if (previousVNode != null)
            {
                var patches = _reconciler.ComputePatches(previousVNode, currentVNode);
                patchesByTime[keyframe.Time] = patches;
            }
            else
            {
                // First keyframe - no patches needed (initial render)
                patchesByTime[keyframe.Time] = new List<Patch>();
            }

            previousVNode = currentVNode;
        }

        return patchesByTime;
    }

    /// <summary>
    /// Export timeline patches for client
    /// </summary>
    public TimelinePatchData ExportTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        var patches = PrecomputeTimeline(timeline, component);

        return new TimelinePatchData
        {
            TimelineId = timeline.TimelineId,
            Name = timeline.Name,
            Duration = timeline.Duration,
            Repeat = timeline.Repeat,
            Patches = patches
        };
    }
}

/// <summary>
/// Timeline patch data for client
/// </summary>
public class TimelinePatchData
{
    public string TimelineId { get; set; }
    public string Name { get; set; }
    public int Duration { get; set; }
    public bool Repeat { get; set; }
    public Dictionary<int, List<Patch>> Patches { get; set; }
}
```

### 3.3 SignalR Timeline Hub

**File:** `Minimact.AspNetCore/Timeline/TimelineHub.cs`

```csharp
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// SignalR hub for timeline operations
/// </summary>
public class TimelineHub : Hub
{
    private readonly TimelineRegistry _registry;

    public TimelineHub(TimelineRegistry registry)
    {
        _registry = registry;
    }

    /// <summary>
    /// Client requests timeline data
    /// </summary>
    public async Task<TimelinePatchData> GetTimeline(string timelineId)
    {
        var timeline = _registry.GetTimeline(timelineId);

        if (timeline == null)
        {
            throw new HubException($"Timeline not found: {timelineId}");
        }

        return timeline;
    }

    /// <summary>
    /// Client notifies timeline playback event
    /// </summary>
    public async Task TimelineEvent(string timelineId, string eventType, int? currentTime = null)
    {
        // Log timeline event for analytics/debugging
        Console.WriteLine($"[Timeline] {timelineId} - {eventType} (time: {currentTime}ms)");

        // Broadcast to other clients if needed (multi-user sync)
        await Clients.Others.SendAsync("TimelineEvent", new
        {
            timelineId,
            eventType,
            currentTime
        });
    }
}
```

### 3.4 Timeline Registry (Server)

**File:** `Minimact.AspNetCore/Timeline/TimelineRegistry.cs`

```csharp
using System.Collections.Concurrent;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// Server-side timeline registry
/// </summary>
public class TimelineRegistry
{
    private readonly ConcurrentDictionary<string, TimelinePatchData> _timelines = new();
    private readonly TimelinePredictor _predictor;

    public TimelineRegistry(TimelinePredictor predictor)
    {
        _predictor = predictor;
    }

    /// <summary>
    /// Register timeline and pre-compute patches
    /// </summary>
    public void RegisterTimeline<TState>(
        MinimactTimeline<TState> timeline,
        MinimactComponent component
    ) where TState : class, new()
    {
        var patchData = _predictor.ExportTimeline(timeline, component);
        _timelines[timeline.TimelineId] = patchData;

        Console.WriteLine($"[TimelineRegistry] Registered timeline: {timeline.Name} ({timeline.TimelineId})");
        Console.WriteLine($"  - Duration: {timeline.Duration}ms");
        Console.WriteLine($"  - Keyframes: {timeline.Keyframes.Count}");
        Console.WriteLine($"  - Patch timestamps: {patchData.Patches.Count}");
    }

    /// <summary>
    /// Get timeline patch data
    /// </summary>
    public TimelinePatchData? GetTimeline(string timelineId)
    {
        _timelines.TryGetValue(timelineId, out var timeline);
        return timeline;
    }

    /// <summary>
    /// Remove timeline
    /// </summary>
    public void UnregisterTimeline(string timelineId)
    {
        _timelines.TryRemove(timelineId, out _);
        Console.WriteLine($"[TimelineRegistry] Unregistered timeline: {timelineId}");
    }

    /// <summary>
    /// Get all registered timelines
    /// </summary>
    public IEnumerable<TimelinePatchData> GetAllTimelines()
    {
        return _timelines.Values;
    }
}
```

### 3.5 Client-Side SignalR Sync

**File:** `sync/SignalRTimelineSync.ts`

```typescript
import { TimelineEngine } from '../core/Timeline';

export interface TimelinePatchData {
  timelineId: string;
  name: string;
  duration: number;
  repeat: boolean;
  patches: Record<number, any[]>; // time → patches
}

export class SignalRTimelineSync {
  private connection: any; // SignalR connection
  private timeline: TimelineEngine;
  private patchData?: TimelinePatchData;

  constructor(timeline: TimelineEngine, connection: any) {
    this.timeline = timeline;
    this.connection = connection;
  }

  /**
   * Load timeline from server
   */
  async loadFromServer(timelineId: string): Promise<void> {
    try {
      this.patchData = await this.connection.invoke('GetTimeline', timelineId);

      console.log(`[TimelineSync] Loaded timeline: ${this.patchData.name}`);
      console.log(`  - Duration: ${this.patchData.duration}ms`);
      console.log(`  - Patch timestamps: ${Object.keys(this.patchData.patches).length}`);

      // Schedule patches
      this.schedulePatchDelivery();
    } catch (error) {
      console.error('[TimelineSync] Failed to load timeline:', error);
      throw error;
    }
  }

  /**
   * Schedule patch delivery at specific times
   */
  private schedulePatchDelivery(): void {
    if (!this.patchData) return;

    // Schedule patches as timeline effects
    for (const [timeStr, patches] of Object.entries(this.patchData.patches)) {
      const time = parseInt(timeStr);

      this.timeline.at(time, () => {
        // Apply patches from server
        this.applyPatches(patches);
      });
    }
  }

  /**
   * Apply patches to DOM
   */
  private applyPatches(patches: any[]): void {
    // Get DOM patcher from Minimact runtime
    const domPatcher = (window as any).Minimact?.domPatcher;

    if (!domPatcher) {
      console.warn('[TimelineSync] No DOM patcher found');
      return;
    }

    // Apply patches
    domPatcher.applyPatches(document.body, patches);

    console.log(`[TimelineSync] Applied ${patches.length} patches`);
  }

  /**
   * Notify server of timeline events
   */
  async notifyEvent(eventType: 'play' | 'pause' | 'stop' | 'seek', currentTime?: number): Promise<void> {
    try {
      await this.connection.invoke('TimelineEvent', this.patchData?.timelineId, eventType, currentTime);
    } catch (error) {
      console.error('[TimelineSync] Failed to notify event:', error);
    }
  }
}
```

### 3.6 Example: Server-Side Timeline

```csharp
using Minimact.AspNetCore.Timeline;

namespace MyApp.Timelines;

public class CounterAnimationState
{
    public int Count { get; set; }
    public string Color { get; set; }
}

public class CounterAnimationTimeline : MinimactTimeline<CounterAnimationState>
{
    public CounterAnimationTimeline() : base("CounterAnimation", 5000, repeat: true)
    {
    }

    protected override void DefineKeyframes()
    {
        Keyframe(0, new CounterAnimationState { Count = 0, Color = "blue" });
        Keyframe(1000, new CounterAnimationState { Count = 10, Color = "red" });
        Keyframe(2000, new CounterAnimationState { Count = 20, Color = "green" });
        Keyframe(3000, new CounterAnimationState { Count = 30, Color = "purple" });
        Keyframe(4000, new CounterAnimationState { Count = 40, Color = "orange" });
        Keyframe(5000, new CounterAnimationState { Count = 0, Color = "blue" });
    }
}

// In Startup.cs / Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<TimelinePredictor>();
    services.AddSingleton<TimelineRegistry>();
}

// Register timeline
var timeline = new CounterAnimationTimeline();
var component = new CounterComponent();
timelineRegistry.RegisterTimeline(timeline, component);
```

---

## 📋 Development Milestones

### Milestone 1: Core Client Engine ✅
- [ ] Create package structure
- [ ] Implement type definitions
- [ ] Build Timeline engine with RAF scheduler
- [ ] Implement play/pause/stop/seek controls
- [ ] Implement keyframe system
- [ ] Implement easing functions
- [ ] Implement interpolation
- [ ] Create `useTimeline()` hook
- [ ] Create `useTimelineState()` hook
- [ ] Write unit tests for timeline engine

### Milestone 2: Grain Integration ✅
- [ ] Create `useTimelineGrain()` hook
- [ ] Implement grain spawn scheduling
- [ ] Implement grain navigation scheduling
- [ ] Implement grain reward scheduling
- [ ] Implement grain lifecycle scheduling (freeze/activate/destroy)
- [ ] Create grain-controlled timeline examples
- [ ] Write integration tests

### Milestone 3: Server-Side Integration ✅
- [ ] Implement `MinimactTimeline<TState>` base class
- [ ] Implement `TimelinePredictor` for patch pre-computation
- [ ] Implement `TimelineRegistry`
- [ ] Create `TimelineHub` SignalR hub
- [ ] Implement `SignalRTimelineSync` client
- [ ] Implement patch scheduling on client
- [ ] Create server-side timeline examples
- [ ] Write end-to-end tests

### Milestone 4: Advanced Features ✅
- [ ] Branching timelines (choose-your-own-adventure)
- [ ] Timeline composition (nest timelines)
- [ ] Multi-timeline sync (coordinate multiple timelines)
- [ ] Timeline scrubbing UI component
- [ ] Timeline export/import (JSON serialization)
- [ ] Timeline recording (capture live interactions)

### Milestone 5: Polish & Documentation ✅
- [ ] API documentation
- [ ] Tutorial: "Your First Timeline"
- [ ] Tutorial: "Animating with Timelines"
- [ ] Tutorial: "Grain Choreography"
- [ ] Tutorial: "Server-Driven Presentations"
- [ ] Performance optimization
- [ ] Publish to npm as `@minimact/timeline`

---

## 🎯 Example Use Cases

### 1. Animated Onboarding

```typescript
function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [highlight, setHighlight] = useState('');

  const timeline = useTimeline({
    duration: 10000,
    repeat: false
  });

  useTimelineState(timeline, 'step', setStep);
  useTimelineState(timeline, 'highlight', setHighlight);

  useEffect(() => {
    timeline.keyframes([
      { time: 0, state: { step: 1, highlight: 'welcome-button' } },
      { time: 2000, state: { step: 2, highlight: 'profile-form' } },
      { time: 5000, state: { step: 3, highlight: 'settings-panel' } },
      { time: 8000, state: { step: 4, highlight: '' } }
    ]);

    timeline.play();
  }, []);

  return (
    <div>
      <h1>Step {step}</h1>
      <button className={highlight === 'welcome-button' ? 'highlight' : ''}>
        Welcome
      </button>
    </div>
  );
}
```

### 2. Grain Swarm Choreography

```typescript
function GrainSwarm() {
  const timeline = useTimeline({ duration: 10000, repeat: true });

  useTimelineGrain(timeline, [
    // Spawn 10 grains over 1 second
    ...Array.from({ length: 10 }, (_, i) => ({
      time: i * 100,
      action: 'spawn',
      grainType: 'Explorer',
      params: {
        component: ExplorerGrain,
        options: {
          vectorField: [Math.random(), Math.random(), Math.random()]
        }
      }
    })),

    // Reward wave at 5 seconds
    { time: 5000, action: 'reward', grainId: 'all', params: { reward: 10.0 } },

    // Freeze all at 8 seconds
    { time: 8000, action: 'freeze', grainId: 'all' },

    // Destroy all at 10 seconds
    { time: 10000, action: 'destroy', grainId: 'all' }
  ]);

  return <div>Swarm Choreography</div>;
}
```

### 3. Server-Driven Presentation

```csharp
// Server timeline
public class PresentationTimeline : MinimactTimeline<SlideState>
{
    public PresentationTimeline() : base("Presentation", 60000, repeat: false)
    {
    }

    protected override void DefineKeyframes()
    {
        Keyframe(0, new SlideState { SlideNumber = 1, Title = "Welcome" });
        Keyframe(10000, new SlideState { SlideNumber = 2, Title = "Overview" });
        Keyframe(20000, new SlideState { SlideNumber = 3, Title = "Features" });
        Keyframe(30000, new SlideState { SlideNumber = 4, Title = "Demo" });
        Keyframe(50000, new SlideState { SlideNumber = 5, Title = "Q&A" });
    }
}
```

```typescript
// Client
function Presentation() {
  const [slide, setSlide] = useState(1);
  const timeline = useTimeline({ duration: 60000, repeat: false });

  useEffect(() => {
    // Load timeline from server
    const sync = new SignalRTimelineSync(timeline, signalR);
    sync.loadFromServer('presentation-timeline-id');

    timeline.play();
  }, []);

  useTimelineState(timeline, 'slideNumber', setSlide);

  return <div>Slide {slide}</div>;
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Timeline playback (play/pause/stop/seek)
- Keyframe interpolation
- Easing functions
- State binding
- Event emission

### Integration Tests
- Grain spawning on timeline
- Grain rewards through timeline
- State synchronization
- Multi-timeline coordination

### E2E Tests
- Server pre-computation
- SignalR patch delivery
- Client patch application
- Timeline recording/playback

---

## 🚀 Future Enhancements

### Phase 4: Branching Narratives
- Conditional branching based on user choices
- Timeline merging (converge paths)
- Probability-based branching (weighted choices)

### Phase 5: Recording Mode
- Record user interactions as timeline
- Export timeline JSON
- Replay recorded timelines
- Edit recorded timelines

### Phase 6: Multi-User Sync
- Shared timelines across clients
- Role-based timeline control (presenter/viewer)
- Collaborative timeline editing

---

## 🎉 Success Criteria

@minimact/timeline is successful when:

1. ✅ Developers can create timelines with keyframes
2. ✅ Timelines control state with precise timing
3. ✅ Timelines orchestrate grain networks
4. ✅ Server pre-computes patches for timelines
5. ✅ SignalR delivers patches at scheduled times
6. ✅ Timelines are composable and branching
7. ✅ Performance scales to complex timelines
8. ✅ Documentation enables quick onboarding

---

## 🧠 Philosophy

> **Timelines are declarative orchestration of state through time.**

Not just animations. Not just transitions. **Timelines are a new primitive** for building:
- Choreographed experiences with perfect timing
- Reproducible scenarios for testing
- Server-driven presentations and demos
- Grain network coordination
- Interactive narratives with branching paths

This is **GSAP meets Redux DevTools meets Grain Networks meets Server-Side Prediction** — expressed in pure declarative TypeScript + C#.

Welcome to the future of time-based state orchestration. 🎬⏱️
