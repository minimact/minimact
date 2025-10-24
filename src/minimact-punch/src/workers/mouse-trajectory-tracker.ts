/**
 * Mouse Trajectory Tracker
 *
 * Tracks mouse movement history and calculates trajectory, velocity, and
 * predicts future intersection with elements.
 */

import {
  MouseEventData,
  MouseTrajectory,
  CircularBuffer,
  Rect,
  ConfidenceEngineConfig,
} from './confidence-types';

export class MouseTrajectoryTracker {
  private mouseHistory: CircularBuffer<{ x: number; y: number; timestamp: number }>;
  private config: ConfidenceEngineConfig;

  constructor(config: ConfidenceEngineConfig) {
    this.config = config;
    this.mouseHistory = new CircularBuffer(config.mouseHistorySize);
  }

  /**
   * Record a mouse movement
   */
  trackMove(event: MouseEventData): void {
    this.mouseHistory.push({
      x: event.x,
      y: event.y,
      timestamp: event.timestamp,
    });
  }

  /**
   * Get current trajectory from recent mouse movements
   */
  getTrajectory(): MouseTrajectory | null {
    const points = this.mouseHistory.getLast(5);
    if (points.length < 2) {
      return null; // Not enough data
    }

    // Calculate velocity (pixels per millisecond)
    const first = points[0];
    const last = points[points.length - 1];
    const timeDelta = last.timestamp - first.timestamp;

    if (timeDelta === 0) {
      return null;
    }

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / timeDelta;

    // Calculate angle (radians)
    const angle = Math.atan2(dy, dx);

    // Calculate acceleration (change in velocity)
    let acceleration = 0;
    if (points.length >= 4) {
      const mid = Math.floor(points.length / 2);
      const firstHalfVelocity = this.calculateVelocity(points.slice(0, mid));
      const secondHalfVelocity = this.calculateVelocity(points.slice(mid));
      acceleration = (secondHalfVelocity - firstHalfVelocity) / timeDelta;
    }

    return {
      points,
      velocity,
      angle,
      acceleration,
    };
  }

  /**
   * Calculate hover confidence for an element
   *
   * Returns confidence [0-1] that mouse will hover element
   */
  calculateHoverConfidence(elementBounds: Rect): {
    confidence: number;
    leadTime: number;
    reason: string;
  } {
    const trajectory = this.getTrajectory();

    if (!trajectory) {
      return { confidence: 0, leadTime: 0, reason: 'no trajectory data' };
    }

    // Get current mouse position
    const lastPoint = trajectory.points[trajectory.points.length - 1];

    // Check if mouse is moving
    if (trajectory.velocity < this.config.minMouseVelocity) {
      return { confidence: 0, leadTime: 0, reason: 'mouse not moving' };
    }

    // Calculate ray intersection with element bounds
    const intersection = this.calculateRayIntersection(
      lastPoint,
      trajectory.angle,
      elementBounds
    );

    if (!intersection) {
      return { confidence: 0, leadTime: 0, reason: 'not in trajectory path' };
    }

    // Calculate time to intersection
    const timeToIntersect = intersection.distance / trajectory.velocity;

    // Outside acceptable lead time window?
    if (
      timeToIntersect < this.config.hoverLeadTimeMin ||
      timeToIntersect > this.config.hoverLeadTimeMax
    ) {
      return {
        confidence: 0,
        leadTime: timeToIntersect,
        reason: `lead time ${timeToIntersect.toFixed(0)}ms outside window`,
      };
    }

    // Calculate angle to element center
    const elementCenterX = elementBounds.left + elementBounds.width / 2;
    const elementCenterY = elementBounds.top + elementBounds.height / 2;
    const angleToCenter = Math.atan2(
      elementCenterY - lastPoint.y,
      elementCenterX - lastPoint.x
    );
    const angleDiff = Math.abs(trajectory.angle - angleToCenter);
    const angleDiffDegrees = (angleDiff * 180) / Math.PI;

    // Check if trajectory is pointing toward element
    if (angleDiffDegrees > this.config.maxTrajectoryAngle) {
      return {
        confidence: 0,
        leadTime: timeToIntersect,
        reason: `angle ${angleDiffDegrees.toFixed(0)}° too wide`,
      };
    }

    // Calculate base confidence from trajectory alignment
    const angleConfidence = 1 - angleDiffDegrees / this.config.maxTrajectoryAngle;

    // Calculate distance confidence (closer = higher confidence)
    const distanceConfidence = Math.max(
      0,
      1 - intersection.distance / 500 // 500px = low confidence
    );

    // Calculate velocity confidence (moderate velocity = higher confidence)
    // Too fast or too slow = lower confidence
    const idealVelocity = 0.5; // 0.5 px/ms = 500 px/s
    const velocityDiff = Math.abs(trajectory.velocity - idealVelocity);
    const velocityConfidence = Math.max(0, 1 - velocityDiff / idealVelocity);

    // Calculate acceleration confidence (decelerating = higher confidence)
    // User slowing down = more intentional
    const accelerationConfidence =
      trajectory.acceleration < 0 ? 1 : Math.max(0, 1 - trajectory.acceleration);

    // Weighted combination
    const confidence =
      angleConfidence * 0.4 +
      distanceConfidence * 0.3 +
      velocityConfidence * 0.2 +
      accelerationConfidence * 0.1;

    return {
      confidence,
      leadTime: timeToIntersect,
      reason: `trajectory: ${(confidence * 100).toFixed(0)}% (angle: ${angleDiffDegrees.toFixed(0)}°, dist: ${intersection.distance.toFixed(0)}px, vel: ${trajectory.velocity.toFixed(2)})`,
    };
  }

  /**
   * Calculate ray-box intersection
   * Returns distance to intersection or null if no intersection
   */
  private calculateRayIntersection(
    origin: { x: number; y: number },
    angle: number,
    box: Rect
  ): { distance: number; point: { x: number; y: number } } | null {
    // Ray direction
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Check intersection with each edge of the box
    let minDistance = Infinity;
    let intersectionPoint: { x: number; y: number } | null = null;

    // Left edge
    if (dx > 0.001) {
      const t = (box.left - origin.x) / dx;
      if (t > 0) {
        const y = origin.y + t * dy;
        if (y >= box.top && y <= box.bottom) {
          const dist = Math.sqrt((box.left - origin.x) ** 2 + (y - origin.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            intersectionPoint = { x: box.left, y };
          }
        }
      }
    }

    // Right edge
    if (dx < -0.001) {
      const t = (box.right - origin.x) / dx;
      if (t > 0) {
        const y = origin.y + t * dy;
        if (y >= box.top && y <= box.bottom) {
          const dist = Math.sqrt((box.right - origin.x) ** 2 + (y - origin.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            intersectionPoint = { x: box.right, y };
          }
        }
      }
    }

    // Top edge
    if (dy > 0.001) {
      const t = (box.top - origin.y) / dy;
      if (t > 0) {
        const x = origin.x + t * dx;
        if (x >= box.left && x <= box.right) {
          const dist = Math.sqrt((x - origin.x) ** 2 + (box.top - origin.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            intersectionPoint = { x, y: box.top };
          }
        }
      }
    }

    // Bottom edge
    if (dy < -0.001) {
      const t = (box.bottom - origin.y) / dy;
      if (t > 0) {
        const x = origin.x + t * dx;
        if (x >= box.left && x <= box.right) {
          const dist = Math.sqrt((x - origin.x) ** 2 + (box.bottom - origin.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            intersectionPoint = { x, y: box.bottom };
          }
        }
      }
    }

    if (intersectionPoint && minDistance < Infinity) {
      return { distance: minDistance, point: intersectionPoint };
    }

    return null;
  }

  /**
   * Calculate velocity from a set of points
   */
  private calculateVelocity(
    points: Array<{ x: number; y: number; timestamp: number }>
  ): number {
    if (points.length < 2) return 0;

    const first = points[0];
    const last = points[points.length - 1];
    const timeDelta = last.timestamp - first.timestamp;

    if (timeDelta === 0) return 0;

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance / timeDelta;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.mouseHistory.clear();
  }
}
