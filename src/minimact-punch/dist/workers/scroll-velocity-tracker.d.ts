/**
 * Scroll Velocity Tracker
 *
 * Tracks scroll events and predicts when elements will enter the viewport
 * based on scroll velocity and deceleration patterns.
 */
import { ScrollEventData, ScrollVelocity, Rect, ConfidenceEngineConfig } from './confidence-types';
export declare class ScrollVelocityTracker {
    private scrollHistory;
    private config;
    private viewportWidth;
    private viewportHeight;
    constructor(config: ConfidenceEngineConfig);
    /**
     * Record a scroll event
     */
    trackScroll(event: ScrollEventData): void;
    /**
     * Get current scroll velocity
     */
    getVelocity(): ScrollVelocity | null;
    /**
     * Calculate intersection confidence for an element
     *
     * Returns confidence [0-1] that element will enter viewport
     */
    calculateIntersectionConfidence(elementBounds: Rect, currentScrollY: number): {
        confidence: number;
        leadTime: number;
        reason: string;
    };
    /**
     * Calculate confidence based on distance and velocity
     */
    private calculateConfidenceFromDistance;
    /**
     * Calculate velocity from a set of scroll points
     */
    private calculateVelocity;
    /**
     * Clear history
     */
    clear(): void;
}
//# sourceMappingURL=scroll-velocity-tracker.d.ts.map