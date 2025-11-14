import { TimelineEngine } from '../core/Timeline';
import { Patch } from '../types';
/**
 * Timeline patch data from server (matches C# TimelinePatchData)
 */
export interface TimelinePatchData {
    timelineId: string;
    name: string;
    duration: number;
    repeat: boolean;
    repeatCount: number;
    easing: string;
    patches: Record<number, Patch[]>;
    keyframeCount: number;
    totalPatchCount: number;
    exportedAt: string;
}
/**
 * Timeline info for listing available timelines
 */
export interface TimelineInfo {
    timelineId: string;
    name: string;
    duration: number;
    keyframeCount: number;
    repeat: boolean;
}
/**
 * SignalR connection interface (compatible with @microsoft/signalr)
 */
export interface SignalRConnection {
    invoke<T = any>(methodName: string, ...args: any[]): Promise<T>;
    on(methodName: string, handler: (...args: any[]) => void): void;
    off(methodName: string, handler: (...args: any[]) => void): void;
}
/**
 * DOM Patcher interface (from @minimact/core)
 */
export interface DOMPatcher {
    applyPatches(element: HTMLElement, patches: Patch[]): void;
}
/**
 * Synchronizes timeline with server-side pre-computed patches.
 *
 * Server pre-computes all patches at build time and sends them to client.
 * Client schedules patch delivery at precise times using timeline effects.
 *
 * This enables server-driven animations with zero runtime rendering overhead!
 */
export declare class SignalRTimelineSync {
    private connection;
    private timeline;
    private patchData?;
    private domPatcher?;
    private targetElement?;
    constructor(timeline: TimelineEngine, connection: SignalRConnection, domPatcher?: DOMPatcher, targetElement?: HTMLElement);
    /**
     * Load timeline from server by ID
     */
    loadFromServer(timelineId: string): Promise<void>;
    /**
     * Load timeline from server by name
     */
    loadFromServerByName(name: string): Promise<void>;
    /**
     * Get list of available timelines from server
     */
    getAvailableTimelines(): Promise<TimelineInfo[]>;
    /**
     * Schedule patch delivery at specific times using timeline effects
     */
    private schedulePatchDelivery;
    /**
     * Apply patches to DOM
     */
    private applyPatches;
    /**
     * Set DOM patcher for patch application
     */
    setDOMPatcher(patcher: DOMPatcher, targetElement: HTMLElement): void;
    /**
     * Notify server of timeline playback event
     */
    notifyEvent(eventType: 'play' | 'pause' | 'stop' | 'seek' | 'complete' | 'loop', currentTime?: number): Promise<void>;
    /**
     * Handle timeline events from other clients (multi-user sync)
     */
    private handleTimelineEvent;
    /**
     * Get loaded timeline patch data
     */
    getTimelinePatchData(): TimelinePatchData | undefined;
    /**
     * Dispose sync (remove event listeners)
     */
    dispose(): void;
}
//# sourceMappingURL=SignalRTimelineSync.d.ts.map