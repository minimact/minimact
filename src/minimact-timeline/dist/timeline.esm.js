import { useRef, useState, useEffect } from '@minimact/core';

let timelineCounter = 0;
/**
 * Generate unique timeline ID
 */
function generateTimelineId(name) {
    return `${name || 'timeline'}:${++timelineCounter}:${Date.now()}`;
}
/**
 * Timeline Engine
 *
 * Precise RAF-based timeline scheduler with keyframe interpolation,
 * easing functions, and playback controls.
 */
class TimelineEngine {
    constructor(config, name) {
        this.listeners = new Map();
        /**
         * Main tick function (RAF loop)
         */
        this.tick = () => {
            if (this.timeline.status !== 'playing')
                return;
            const now = performance.now();
            const elapsed = (now - this.timeline.startTime) * this.timeline.config.playbackRate;
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
    keyframe(time, state, options) {
        const keyframe = {
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
    keyframes(keyframes) {
        keyframes.forEach(kf => this.keyframe(kf.time, kf.state, kf));
    }
    /**
     * Bind state setter to timeline
     */
    bindState(stateKey, setter, interpolate = false) {
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
    at(time, effect) {
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
    play() {
        if (this.timeline.status === 'playing')
            return;
        this.timeline.status = 'playing';
        this.timeline.startTime = performance.now() - this.timeline.currentTime;
        this.emit('play');
        this.tick();
        console.log(`[Timeline] Playing from ${this.timeline.currentTime}ms`);
    }
    /**
     * Pause timeline
     */
    pause() {
        if (this.timeline.status !== 'playing')
            return;
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
    stop() {
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
    reset() {
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
    seek(time) {
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
    setPlaybackRate(rate) {
        this.timeline.config.playbackRate = rate;
        console.log(`[Timeline] Playback rate: ${rate}x`);
    }
    /**
     * Reverse playback direction
     */
    reverse() {
        this.timeline.config.playbackRate = -Math.abs(this.timeline.config.playbackRate);
        console.log('[Timeline] Reversed playback direction');
    }
    /**
     * Handle timeline completion
     */
    handleCompletion() {
        this.timeline.loopCount++;
        const shouldRepeat = this.timeline.config.repeat &&
            (this.timeline.config.repeatCount === Infinity ||
                this.timeline.loopCount < this.timeline.config.repeatCount);
        if (shouldRepeat) {
            this.emit('loop', this.timeline.loopCount);
            this.timeline.config.onLoop?.();
            this.reset();
            this.play();
        }
        else {
            this.timeline.status = 'stopped';
            this.emit('complete');
            this.timeline.config.onComplete?.();
            console.log('[Timeline] Completed');
        }
    }
    /**
     * Apply state for current time
     */
    applyKeyframeState(time) {
        // Find surrounding keyframes
        const { prev, next } = this.findSurroundingKeyframes(time);
        if (!prev && !next)
            return;
        // If exact keyframe match, apply directly
        if (prev && prev.time === time) {
            this.applyState(prev.state);
            return;
        }
        // If only one keyframe, apply it
        if (!next) {
            this.applyState(prev.state);
            return;
        }
        if (!prev) {
            this.applyState(next.state);
            return;
        }
        // Interpolate between keyframes
        const progress = (time - prev.time) / (next.time - prev.time);
        const easedProgress = this.applyEasing(progress, next.easing || this.timeline.config.easing);
        this.applyInterpolatedState(prev.state, next.state, easedProgress);
    }
    /**
     * Find keyframes surrounding current time
     */
    findSurroundingKeyframes(time) {
        let prev;
        let next;
        for (const kf of this.timeline.keyframes) {
            if (kf.time <= time) {
                prev = kf;
            }
            else if (kf.time > time && !next) {
                next = kf;
                break;
            }
        }
        return { prev, next };
    }
    /**
     * Apply state directly
     */
    applyState(state) {
        if (!state)
            return;
        for (const [key, binder] of this.timeline.stateBindings.entries()) {
            if (key in state) {
                binder.setter(state[key]);
            }
        }
    }
    /**
     * Apply interpolated state
     */
    applyInterpolatedState(prevState, nextState, progress) {
        if (!prevState || !nextState)
            return;
        for (const [key, binder] of this.timeline.stateBindings.entries()) {
            if (!(key in prevState) || !(key in nextState))
                continue;
            const prevValue = prevState[key];
            const nextValue = nextState[key];
            // Only interpolate if binder allows it and values are numbers
            if (binder.interpolate && typeof prevValue === 'number' && typeof nextValue === 'number') {
                const interpolated = prevValue + (nextValue - prevValue) * progress;
                binder.setter(interpolated);
            }
            else {
                // Snap to next value at 50% progress
                binder.setter(progress >= 0.5 ? nextValue : prevValue);
            }
        }
    }
    /**
     * Execute effects at current time
     */
    executeEffects(time) {
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
    applyEasing(progress, easing) {
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
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }
    emit(event, ...args) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(...args));
        }
    }
    /**
     * Get current timeline state
     */
    getState() {
        return this.timeline;
    }
    /**
     * Dispose timeline
     */
    dispose() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        this.listeners.clear();
        console.log('[Timeline] Disposed');
    }
}

/**
 * useTimeline Hook
 *
 * Creates a timeline instance with precise RAF-based scheduling.
 *
 * @param config - Timeline configuration
 * @param name - Optional timeline name
 * @returns TimelineEngine instance
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const timeline = useTimeline({
 *     duration: 5000,
 *     repeat: true,
 *     easing: 'ease-in-out'
 *   });
 *
 *   timeline.keyframes([
 *     { time: 0, state: { x: 0 } },
 *     { time: 5000, state: { x: 100 } }
 *   ]);
 *
 *   timeline.play();
 *
 *   return <div>Timeline running...</div>;
 * }
 * ```
 */
function useTimeline(config, name) {
    const timelineRef = useRef(null);
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

/**
 * useTimelineState Hook
 *
 * Binds a state setter to timeline keyframes.
 * The setter will be called automatically as the timeline plays.
 *
 * @param timeline - Timeline instance
 * @param stateKey - State key that matches keyframe state
 * @param setter - State setter function
 * @param interpolate - Whether to interpolate numeric values (default: false)
 *
 * @example
 * ```tsx
 * function AnimatedCounter() {
 *   const [count, setCount] = useState(0);
 *   const timeline = useTimeline({ duration: 5000 });
 *
 *   useTimelineState(timeline, 'count', setCount, true); // interpolate numbers
 *
 *   timeline.keyframes([
 *     { time: 0, state: { count: 0 } },
 *     { time: 5000, state: { count: 100 } }
 *   ]);
 *
 *   return <div>Count: {count.toFixed(0)}</div>;
 * }
 * ```
 */
function useTimelineState(timeline, stateKey, setter, interpolate = false) {
    useEffect(() => {
        timeline.bindState(stateKey, setter, interpolate);
    }, [timeline, stateKey, setter, interpolate]);
}

/**
 * useTimelineGrain Hook
 *
 * Enables timeline to orchestrate grain networks.
 * Schedule grain spawning, navigation, rewards, and lifecycle changes.
 *
 * @param timeline - Timeline engine instance
 * @param actions - Array of scheduled grain actions
 *
 * @example
 * ```tsx
 * const timeline = useTimeline({ duration: 10000, repeat: true });
 *
 * useTimelineGrain(timeline, [
 *   // Spawn grains in waves
 *   { time: 0, action: 'spawn', grainType: 'Explorer', params: { component: ExplorerGrain } },
 *   { time: 100, action: 'spawn', grainType: 'Explorer', params: { component: ExplorerGrain } },
 *
 *   // Reward grains at 5s
 *   { time: 5000, action: 'reward', grainId: 'Explorer:1', params: { reward: 10.0 } },
 *
 *   // Freeze all grains at 8s
 *   { time: 8000, action: 'freeze', grainId: 'all' },
 *
 *   // Destroy all at 10s
 *   { time: 10000, action: 'destroy', grainId: 'all' }
 * ]);
 * ```
 */
function useTimelineGrain(timeline, actions) {
    useEffect(() => {
        // Import grain functions dynamically
        let grainFunctions = {};
        try {
            // Try to import @minimact/grains
            grainFunctions = require('@minimact/grains');
        }
        catch (error) {
            console.warn('[useTimelineGrain] @minimact/grains not installed. Grain actions will be no-ops.');
            return;
        }
        const { spawnGrain, navigateGrain, freezeGrain, activateGrain, destroyGrain, getActiveGrains, assignReward } = grainFunctions;
        // Track spawned grain IDs for batch operations
        const spawnedGrainIds = [];
        // Schedule each action
        actions.forEach(({ time, action, grainType, grainId, component, params }) => {
            timeline.at(time, () => {
                switch (action) {
                    case 'spawn': {
                        if (!grainType) {
                            console.warn('[TimelineGrain] Spawn action requires grainType');
                            return;
                        }
                        const spawnParams = params;
                        const grainComponent = component || spawnParams?.component;
                        if (!grainComponent) {
                            console.warn('[TimelineGrain] Spawn action requires component');
                            return;
                        }
                        const newGrainId = spawnGrain(grainType, grainComponent, spawnParams?.options);
                        spawnedGrainIds.push(newGrainId);
                        console.log(`[TimelineGrain] Spawned grain: ${newGrainId} (type: ${grainType})`);
                        break;
                    }
                    case 'navigate': {
                        if (!grainId) {
                            console.warn('[TimelineGrain] Navigate action requires grainId');
                            return;
                        }
                        if (grainId === 'all') {
                            // Navigate all spawned grains
                            spawnedGrainIds.forEach(id => {
                                const nextGrainType = navigateGrain(id);
                                if (nextGrainType) {
                                    console.log(`[TimelineGrain] Navigated grain: ${id} → ${nextGrainType}`);
                                }
                            });
                        }
                        else {
                            const nextGrainType = navigateGrain(grainId);
                            if (nextGrainType) {
                                console.log(`[TimelineGrain] Navigated grain: ${grainId} → ${nextGrainType}`);
                            }
                        }
                        break;
                    }
                    case 'reward': {
                        if (!grainId) {
                            console.warn('[TimelineGrain] Reward action requires grainId');
                            return;
                        }
                        const rewardParams = params;
                        const reward = rewardParams?.reward ?? 1.0;
                        if (grainId === 'all') {
                            // Reward all spawned grains
                            spawnedGrainIds.forEach(id => {
                                assignReward(id, reward, rewardParams?.config);
                                console.log(`[TimelineGrain] Rewarded grain: ${id} (reward: ${reward})`);
                            });
                        }
                        else {
                            assignReward(grainId, reward, rewardParams?.config);
                            console.log(`[TimelineGrain] Rewarded grain: ${grainId} (reward: ${reward})`);
                        }
                        break;
                    }
                    case 'freeze': {
                        if (!grainId) {
                            console.warn('[TimelineGrain] Freeze action requires grainId');
                            return;
                        }
                        if (grainId === 'all') {
                            // Freeze all spawned grains
                            spawnedGrainIds.forEach(id => {
                                freezeGrain(id);
                                console.log(`[TimelineGrain] Frozen grain: ${id}`);
                            });
                        }
                        else {
                            freezeGrain(grainId);
                            console.log(`[TimelineGrain] Frozen grain: ${grainId}`);
                        }
                        break;
                    }
                    case 'activate': {
                        if (!grainId) {
                            console.warn('[TimelineGrain] Activate action requires grainId');
                            return;
                        }
                        if (grainId === 'all') {
                            // Activate all spawned grains
                            spawnedGrainIds.forEach(id => {
                                activateGrain(id);
                                console.log(`[TimelineGrain] Activated grain: ${id}`);
                            });
                        }
                        else {
                            activateGrain(grainId);
                            console.log(`[TimelineGrain] Activated grain: ${grainId}`);
                        }
                        break;
                    }
                    case 'destroy': {
                        if (!grainId) {
                            console.warn('[TimelineGrain] Destroy action requires grainId');
                            return;
                        }
                        if (grainId === 'all') {
                            // Destroy all spawned grains
                            spawnedGrainIds.forEach(id => {
                                destroyGrain(id);
                                console.log(`[TimelineGrain] Destroyed grain: ${id}`);
                            });
                            spawnedGrainIds.length = 0; // Clear array
                        }
                        else {
                            destroyGrain(grainId);
                            console.log(`[TimelineGrain] Destroyed grain: ${grainId}`);
                            // Remove from spawned list
                            const index = spawnedGrainIds.indexOf(grainId);
                            if (index !== -1) {
                                spawnedGrainIds.splice(index, 1);
                            }
                        }
                        break;
                    }
                    default:
                        console.warn(`[TimelineGrain] Unknown action: ${action}`);
                }
            });
        });
        console.log(`[useTimelineGrain] Scheduled ${actions.length} grain actions`);
    }, [timeline, actions]);
}
/**
 * Helper: Create spawn wave
 *
 * Generates an array of spawn actions over a time range.
 *
 * @param startTime - Start time (ms)
 * @param endTime - End time (ms)
 * @param count - Number of grains to spawn
 * @param grainType - Type of grain to spawn
 * @param component - Grain component
 * @param options - Spawn options
 * @returns Array of spawn actions
 *
 * @example
 * ```tsx
 * const spawnWave = createSpawnWave(0, 1000, 50, 'Explorer', ExplorerGrain);
 * useTimelineGrain(timeline, spawnWave);
 * ```
 */
function createSpawnWave(startTime, endTime, count, grainType, component, options) {
    const interval = (endTime - startTime) / count;
    const actions = [];
    for (let i = 0; i < count; i++) {
        actions.push({
            time: startTime + i * interval,
            action: 'spawn',
            grainType,
            component,
            params: { component, options }
        });
    }
    return actions;
}

/**
 * useTimelineEffect Hook
 *
 * Schedule effects to run at specific times in the timeline.
 * Similar to useEffect, but time-based instead of dependency-based.
 *
 * @param timeline - Timeline engine instance
 * @param time - When to execute effect (ms)
 * @param effect - Effect function to execute
 *
 * @example
 * ```tsx
 * const timeline = useTimeline({ duration: 5000 });
 *
 * useTimelineEffect(timeline, 1000, () => {
 *   console.log('1 second elapsed!');
 * });
 *
 * useTimelineEffect(timeline, 2500, () => {
 *   console.log('Halfway through!');
 * });
 *
 * useTimelineEffect(timeline, 5000, () => {
 *   console.log('Timeline complete!');
 * });
 * ```
 */
function useTimelineEffect(timeline, time, effect) {
    useEffect(() => {
        timeline.at(time, effect);
        console.log(`[useTimelineEffect] Scheduled effect at ${time}ms`);
    }, [timeline, time, effect]);
}
/**
 * useTimelineEffects Hook
 *
 * Schedule multiple effects at once.
 *
 * @param timeline - Timeline engine instance
 * @param effects - Array of { time, effect } objects
 *
 * @example
 * ```tsx
 * useTimelineEffects(timeline, [
 *   { time: 1000, effect: () => console.log('1s') },
 *   { time: 2000, effect: () => console.log('2s') },
 *   { time: 3000, effect: () => console.log('3s') }
 * ]);
 * ```
 */
function useTimelineEffects(timeline, effects) {
    useEffect(() => {
        effects.forEach(({ time, effect }) => {
            timeline.at(time, effect);
        });
        console.log(`[useTimelineEffects] Scheduled ${effects.length} effects`);
    }, [timeline, effects]);
}

/**
 * Synchronizes timeline with server-side pre-computed patches.
 *
 * Server pre-computes all patches at build time and sends them to client.
 * Client schedules patch delivery at precise times using timeline effects.
 *
 * This enables server-driven animations with zero runtime rendering overhead!
 */
class SignalRTimelineSync {
    constructor(timeline, connection, domPatcher, targetElement) {
        this.timeline = timeline;
        this.connection = connection;
        this.domPatcher = domPatcher;
        this.targetElement = targetElement;
        // Listen for timeline events from other clients (multi-user sync)
        this.connection.on('TimelineEvent', this.handleTimelineEvent.bind(this));
    }
    /**
     * Load timeline from server by ID
     */
    async loadFromServer(timelineId) {
        try {
            console.log(`[TimelineSync] Loading timeline from server: ${timelineId}`);
            this.patchData = await this.connection.invoke('GetTimeline', timelineId);
            console.log(`[TimelineSync] Loaded timeline: ${this.patchData.name}`);
            console.log(`  - Duration: ${this.patchData.duration}ms`);
            console.log(`  - Keyframes: ${this.patchData.keyframeCount}`);
            console.log(`  - Total patches: ${this.patchData.totalPatchCount}`);
            console.log(`  - Patch timestamps: ${Object.keys(this.patchData.patches).length}`);
            // Schedule patch delivery at each keyframe time
            this.schedulePatchDelivery();
        }
        catch (error) {
            console.error('[TimelineSync] Failed to load timeline:', error);
            throw error;
        }
    }
    /**
     * Load timeline from server by name
     */
    async loadFromServerByName(name) {
        try {
            console.log(`[TimelineSync] Loading timeline by name: ${name}`);
            this.patchData = await this.connection.invoke('GetTimelineByName', name);
            console.log(`[TimelineSync] Loaded timeline: ${this.patchData.name} (ID: ${this.patchData.timelineId})`);
            this.schedulePatchDelivery();
        }
        catch (error) {
            console.error('[TimelineSync] Failed to load timeline by name:', error);
            throw error;
        }
    }
    /**
     * Get list of available timelines from server
     */
    async getAvailableTimelines() {
        try {
            const timelines = await this.connection.invoke('GetAvailableTimelines');
            console.log(`[TimelineSync] Available timelines: ${timelines.length}`);
            timelines.forEach(t => {
                console.log(`  - ${t.name} (${t.duration}ms, ${t.keyframeCount} keyframes)`);
            });
            return timelines;
        }
        catch (error) {
            console.error('[TimelineSync] Failed to get available timelines:', error);
            throw error;
        }
    }
    /**
     * Schedule patch delivery at specific times using timeline effects
     */
    schedulePatchDelivery() {
        if (!this.patchData) {
            console.warn('[TimelineSync] No patch data to schedule');
            return;
        }
        // Schedule patches as timeline effects
        for (const [timeStr, patches] of Object.entries(this.patchData.patches)) {
            const time = parseInt(timeStr);
            if (patches.length === 0) {
                // First keyframe - no patches
                continue;
            }
            // Schedule effect at this time
            this.timeline.at(time, () => {
                console.log(`[TimelineSync] Applying ${patches.length} patches at ${time}ms`);
                this.applyPatches(patches);
            });
        }
        console.log(`[TimelineSync] Scheduled ${Object.keys(this.patchData.patches).length} patch deliveries`);
    }
    /**
     * Apply patches to DOM
     */
    applyPatches(patches) {
        if (!this.domPatcher || !this.targetElement) {
            console.warn('[TimelineSync] No DOM patcher or target element configured');
            return;
        }
        // Apply patches using DOM patcher
        this.domPatcher.applyPatches(this.targetElement, patches);
        console.log(`[TimelineSync] Applied ${patches.length} patches to DOM`);
    }
    /**
     * Set DOM patcher for patch application
     */
    setDOMPatcher(patcher, targetElement) {
        this.domPatcher = patcher;
        this.targetElement = targetElement;
        console.log('[TimelineSync] DOM patcher configured');
    }
    /**
     * Notify server of timeline playback event
     */
    async notifyEvent(eventType, currentTime) {
        if (!this.patchData) {
            console.warn('[TimelineSync] Cannot notify event - no timeline loaded');
            return;
        }
        try {
            await this.connection.invoke('TimelineEvent', this.patchData.timelineId, eventType, currentTime);
            console.log(`[TimelineSync] Notified server of event: ${eventType} at ${currentTime}ms`);
        }
        catch (error) {
            console.error('[TimelineSync] Failed to notify event:', error);
        }
    }
    /**
     * Handle timeline events from other clients (multi-user sync)
     */
    handleTimelineEvent(event) {
        if (!this.patchData || event.timelineId !== this.patchData.timelineId) {
            return; // Not our timeline
        }
        console.log(`[TimelineSync] Received event from ${event.connectionId}:`);
        console.log(`  - Event: ${event.eventType}`);
        console.log(`  - Time: ${event.currentTime}ms`);
        // Optionally sync playback with other clients
        // (Disabled by default - enable for multi-user presentations)
        // switch (event.eventType) {
        //   case 'play':
        //     this.timeline.play();
        //     break;
        //   case 'pause':
        //     this.timeline.pause();
        //     break;
        //   case 'seek':
        //     if (event.currentTime !== undefined) {
        //       this.timeline.seek(event.currentTime);
        //     }
        //     break;
        // }
    }
    /**
     * Get loaded timeline patch data
     */
    getTimelinePatchData() {
        return this.patchData;
    }
    /**
     * Dispose sync (remove event listeners)
     */
    dispose() {
        this.connection.off('TimelineEvent', this.handleTimelineEvent.bind(this));
        console.log('[TimelineSync] Disposed');
    }
}

/**
 * @minimact/timeline - Time-based state orchestration
 *
 * Declarative timelines with keyframes, easing, and precise RAF-based scheduling.
 * Think: Flash MX timeline + GSAP + Server-side prediction
 *
 * @packageDocumentation
 */
// Core exports
// Version
const VERSION = '0.2.0';
const MES_CERTIFICATION = 'Silver'; // Minimact Extension Standards - Phase 2 complete!
/**
 * Example usage:
 *
 * ```tsx
 * import { useTimeline, useTimelineState } from '@minimact/timeline';
 * import { useState } from '@minimact/core';
 *
 * function AnimatedCounter() {
 *   const [count, setCount] = useState(0);
 *   const [color, setColor] = useState('blue');
 *
 *   const timeline = useTimeline({
 *     duration: 5000,
 *     repeat: true,
 *     easing: 'ease-in-out'
 *   });
 *
 *   useTimelineState(timeline, 'count', setCount, true); // interpolate
 *   useTimelineState(timeline, 'color', setColor);
 *
 *   timeline.keyframes([
 *     { time: 0, state: { count: 0, color: 'blue' } },
 *     { time: 2500, state: { count: 50, color: 'red' } },
 *     { time: 5000, state: { count: 100, color: 'green' } }
 *   ]);
 *
 *   timeline.play();
 *
 *   return (
 *     <div>
 *       <h1 style={{ color }}>Count: {count.toFixed(0)}</h1>
 *       <button onClick={() => timeline.pause()}>Pause</button>
 *     </div>
 *   );
 * }
 * ```
 */

export { MES_CERTIFICATION, SignalRTimelineSync, TimelineEngine, VERSION, createSpawnWave, useTimeline, useTimelineEffect, useTimelineEffects, useTimelineGrain, useTimelineState };
