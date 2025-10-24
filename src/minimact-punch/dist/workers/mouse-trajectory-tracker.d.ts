/**
 * Mouse Trajectory Tracker
 *
 * Tracks mouse movement history and calculates trajectory, velocity, and
 * predicts future intersection with elements.
 */
import { MouseEventData, MouseTrajectory, Rect, ConfidenceEngineConfig } from './confidence-types';
export declare class MouseTrajectoryTracker {
    private mouseHistory;
    private config;
    constructor(config: ConfidenceEngineConfig);
    /**
     * Record a mouse movement
     */
    trackMove(event: MouseEventData): void;
    /**
     * Get current trajectory from recent mouse movements
     */
    getTrajectory(): MouseTrajectory | null;
    /**
     * Calculate hover confidence for an element
     *
     * Returns confidence [0-1] that mouse will hover element
     */
    calculateHoverConfidence(elementBounds: Rect): {
        confidence: number;
        leadTime: number;
        reason: string;
    };
    /**
     * Calculate ray-box intersection
     * Returns distance to intersection or null if no intersection
     */
    private calculateRayIntersection;
    /**
     * Calculate velocity from a set of points
     */
    private calculateVelocity;
    /**
     * Clear history
     */
    clear(): void;
}
//# sourceMappingURL=mouse-trajectory-tracker.d.ts.map