/**
 * Timeline playback status
 */
export type TimelineStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'seeking';

/**
 * Easing function types
 */
export type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * Timeline configuration
 */
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

/**
 * Timeline instance
 */
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
  effectBindings: TimelineEffect[];

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * State binder - binds timeline state to setters
 */
export interface StateBinder {
  stateKey: string;
  setter: (value: any) => void;
  interpolate?: boolean;         // Interpolate between keyframes
}

/**
 * Timeline effect - execute function at specific time
 */
export interface TimelineEffect {
  time: number;                  // When to execute (ms)
  effect: () => void;            // Effect function
  executed?: boolean;            // Has it been executed this loop
}
