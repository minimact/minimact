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
  patches: Record<number, Patch[]>; // time (ms) → patches
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
export class SignalRTimelineSync {
  private connection: SignalRConnection;
  private timeline: TimelineEngine;
  private patchData?: TimelinePatchData;
  private domPatcher?: DOMPatcher;
  private targetElement?: HTMLElement;

  constructor(
    timeline: TimelineEngine,
    connection: SignalRConnection,
    domPatcher?: DOMPatcher,
    targetElement?: HTMLElement
  ) {
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
  async loadFromServer(timelineId: string): Promise<void> {
    try {
      console.log(`[TimelineSync] Loading timeline from server: ${timelineId}`);

      this.patchData = await this.connection.invoke<TimelinePatchData>(
        'GetTimeline',
        timelineId
      );

      console.log(`[TimelineSync] Loaded timeline: ${this.patchData.name}`);
      console.log(`  - Duration: ${this.patchData.duration}ms`);
      console.log(`  - Keyframes: ${this.patchData.keyframeCount}`);
      console.log(`  - Total patches: ${this.patchData.totalPatchCount}`);
      console.log(`  - Patch timestamps: ${Object.keys(this.patchData.patches).length}`);

      // Schedule patch delivery at each keyframe time
      this.schedulePatchDelivery();
    } catch (error) {
      console.error('[TimelineSync] Failed to load timeline:', error);
      throw error;
    }
  }

  /**
   * Load timeline from server by name
   */
  async loadFromServerByName(name: string): Promise<void> {
    try {
      console.log(`[TimelineSync] Loading timeline by name: ${name}`);

      this.patchData = await this.connection.invoke<TimelinePatchData>(
        'GetTimelineByName',
        name
      );

      console.log(`[TimelineSync] Loaded timeline: ${this.patchData.name} (ID: ${this.patchData.timelineId})`);

      this.schedulePatchDelivery();
    } catch (error) {
      console.error('[TimelineSync] Failed to load timeline by name:', error);
      throw error;
    }
  }

  /**
   * Get list of available timelines from server
   */
  async getAvailableTimelines(): Promise<TimelineInfo[]> {
    try {
      const timelines = await this.connection.invoke<TimelineInfo[]>(
        'GetAvailableTimelines'
      );

      console.log(`[TimelineSync] Available timelines: ${timelines.length}`);
      timelines.forEach(t => {
        console.log(`  - ${t.name} (${t.duration}ms, ${t.keyframeCount} keyframes)`);
      });

      return timelines;
    } catch (error) {
      console.error('[TimelineSync] Failed to get available timelines:', error);
      throw error;
    }
  }

  /**
   * Schedule patch delivery at specific times using timeline effects
   */
  private schedulePatchDelivery(): void {
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
  private applyPatches(patches: Patch[]): void {
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
  setDOMPatcher(patcher: DOMPatcher, targetElement: HTMLElement): void {
    this.domPatcher = patcher;
    this.targetElement = targetElement;
    console.log('[TimelineSync] DOM patcher configured');
  }

  /**
   * Notify server of timeline playback event
   */
  async notifyEvent(
    eventType: 'play' | 'pause' | 'stop' | 'seek' | 'complete' | 'loop',
    currentTime?: number
  ): Promise<void> {
    if (!this.patchData) {
      console.warn('[TimelineSync] Cannot notify event - no timeline loaded');
      return;
    }

    try {
      await this.connection.invoke(
        'TimelineEvent',
        this.patchData.timelineId,
        eventType,
        currentTime
      );

      console.log(`[TimelineSync] Notified server of event: ${eventType} at ${currentTime}ms`);
    } catch (error) {
      console.error('[TimelineSync] Failed to notify event:', error);
    }
  }

  /**
   * Handle timeline events from other clients (multi-user sync)
   */
  private handleTimelineEvent(event: {
    timelineId: string;
    eventType: string;
    currentTime?: number;
    connectionId: string;
  }): void {
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
  getTimelinePatchData(): TimelinePatchData | undefined {
    return this.patchData;
  }

  /**
   * Dispose sync (remove event listeners)
   */
  dispose(): void {
    this.connection.off('TimelineEvent', this.handleTimelineEvent.bind(this));
    console.log('[TimelineSync] Disposed');
  }
}
