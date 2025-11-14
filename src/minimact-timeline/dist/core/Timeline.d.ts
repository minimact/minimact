import { Timeline, TimelineConfig, Keyframe } from '../types';
/**
 * Timeline Engine
 *
 * Precise RAF-based timeline scheduler with keyframe interpolation,
 * easing functions, and playback controls.
 */
export declare class TimelineEngine {
    private timeline;
    private rafId?;
    private listeners;
    constructor(config: TimelineConfig, name?: string);
    /**
     * Add keyframe to timeline
     */
    keyframe<TState = any>(time: number, state: TState, options?: Partial<Keyframe>): void;
    /**
     * Batch add keyframes
     */
    keyframes(keyframes: Keyframe[]): void;
    /**
     * Bind state setter to timeline
     */
    bindState(stateKey: string, setter: (value: any) => void, interpolate?: boolean): void;
    /**
     * Schedule effect at specific time
     */
    at(time: number, effect: () => void): void;
    /**
     * Play timeline
     */
    play(): void;
    /**
     * Pause timeline
     */
    pause(): void;
    /**
     * Stop timeline (reset to beginning)
     */
    stop(): void;
    /**
     * Reset timeline to beginning (without stopping)
     */
    reset(): void;
    /**
     * Seek to specific time
     */
    seek(time: number): void;
    /**
     * Set playback rate
     */
    setPlaybackRate(rate: number): void;
    /**
     * Reverse playback direction
     */
    reverse(): void;
    /**
     * Main tick function (RAF loop)
     */
    private tick;
    /**
     * Handle timeline completion
     */
    private handleCompletion;
    /**
     * Apply state for current time
     */
    private applyKeyframeState;
    /**
     * Find keyframes surrounding current time
     */
    private findSurroundingKeyframes;
    /**
     * Apply state directly
     */
    private applyState;
    /**
     * Apply interpolated state
     */
    private applyInterpolatedState;
    /**
     * Execute effects at current time
     */
    private executeEffects;
    /**
     * Apply easing function
     */
    private applyEasing;
    /**
     * Event emitter
     */
    on(event: string, listener: Function): void;
    private emit;
    /**
     * Get current timeline state
     */
    getState(): Timeline;
    /**
     * Dispose timeline
     */
    dispose(): void;
}
//# sourceMappingURL=Timeline.d.ts.map