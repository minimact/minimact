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
    duration: number;
    repeat?: boolean;
    repeatCount?: number;
    playbackRate?: number;
    easing?: EasingFunction;
    autoPlay?: boolean;
    onComplete?: () => void;
    onLoop?: () => void;
}
/**
 * Timeline instance
 */
export interface Timeline {
    timelineId: string;
    name?: string;
    config: TimelineConfig;
    keyframes: Keyframe[];
    status: TimelineStatus;
    currentTime: number;
    startTime?: number;
    pauseTime?: number;
    loopCount: number;
    stateBindings: Map<string, StateBinder>;
    effectBindings: TimelineEffect[];
    metadata?: Record<string, any>;
}
/**
 * State binder - binds timeline state to setters
 */
export interface StateBinder {
    stateKey: string;
    setter: (value: any) => void;
    interpolate?: boolean;
}
/**
 * Timeline effect - execute function at specific time
 */
export interface TimelineEffect {
    time: number;
    effect: () => void;
    executed?: boolean;
}
//# sourceMappingURL=Timeline.d.ts.map