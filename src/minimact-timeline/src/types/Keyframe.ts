import { EasingFunction } from './Timeline';

/**
 * Timeline keyframe - state snapshot at specific time
 */
export interface Keyframe<TState = any> {
  time: number;                  // Time in ms
  state?: TState;                // State snapshot at this time
  easing?: EasingFunction;       // Override global easing
  label?: string;                // Optional label for seeking
}

/**
 * Keyframe with interpolated values (internal use)
 */
export interface KeyframeWithInterpolation extends Keyframe {
  interpolatedValues?: Map<string, any>;
}
