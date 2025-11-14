import { EasingFunction } from './Timeline';
/**
 * Timeline keyframe - state snapshot at specific time
 */
export interface Keyframe<TState = any> {
    time: number;
    state?: TState;
    easing?: EasingFunction;
    label?: string;
}
/**
 * Keyframe with interpolated values (internal use)
 */
export interface KeyframeWithInterpolation extends Keyframe {
    interpolatedValues?: Map<string, any>;
}
//# sourceMappingURL=Keyframe.d.ts.map