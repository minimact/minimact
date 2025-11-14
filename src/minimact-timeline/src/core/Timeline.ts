import { Timeline, TimelineConfig, Keyframe, TimelineStatus, EasingFunction, StateBinder, TimelineEffect } from '../types';

let timelineCounter = 0;

/**
 * Generate unique timeline ID
 */
function generateTimelineId(name?: string): string {
  return `${name || 'timeline'}:${++timelineCounter}:${Date.now()}`;
}

/**
 * Timeline Engine
 *
 * Precise RAF-based timeline scheduler with keyframe interpolation,
 * easing functions, and playback controls.
 */
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
