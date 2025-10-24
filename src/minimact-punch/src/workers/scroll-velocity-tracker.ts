/**
 * Scroll Velocity Tracker
 *
 * Tracks scroll events and predicts when elements will enter the viewport
 * based on scroll velocity and deceleration patterns.
 */

import {
  ScrollEventData,
  ScrollVelocity,
  CircularBuffer,
  Rect,
  ConfidenceEngineConfig,
} from './confidence-types';

export class ScrollVelocityTracker {
  private scrollHistory: CircularBuffer<{
    scrollX: number;
    scrollY: number;
    timestamp: number;
  }>;
  private config: ConfidenceEngineConfig;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;

  constructor(config: ConfidenceEngineConfig) {
    this.config = config;
    this.scrollHistory = new CircularBuffer(config.scrollHistorySize);
  }

  /**
   * Record a scroll event
   */
  trackScroll(event: ScrollEventData): void {
    this.viewportWidth = event.viewportWidth;
    this.viewportHeight = event.viewportHeight;

    this.scrollHistory.push({
      scrollX: event.scrollX,
      scrollY: event.scrollY,
      timestamp: event.timestamp,
    });
  }

  /**
   * Get current scroll velocity
   */
  getVelocity(): ScrollVelocity | null {
    const points = this.scrollHistory.getLast(3);
    if (points.length < 2) {
      return null; // Not enough data
    }

    const first = points[0];
    const last = points[points.length - 1];
    const timeDelta = last.timestamp - first.timestamp;

    if (timeDelta === 0) {
      return null;
    }

    const dx = last.scrollX - first.scrollX;
    const dy = last.scrollY - first.scrollY;

    // Calculate velocity magnitude
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / timeDelta;

    // Determine primary direction
    let direction: 'up' | 'down' | 'left' | 'right' | 'none';
    if (Math.abs(dy) > Math.abs(dx)) {
      direction = dy > 0 ? 'down' : 'up';
    } else if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = 'none';
    }

    // Calculate deceleration
    let deceleration = 0;
    if (points.length >= 3) {
      const mid = Math.floor(points.length / 2);
      const firstHalfVelocity = this.calculateVelocity(points.slice(0, mid));
      const secondHalfVelocity = this.calculateVelocity(points.slice(mid));
      deceleration = (firstHalfVelocity - secondHalfVelocity) / timeDelta;
    }

    return {
      velocity,
      direction,
      deceleration,
    };
  }

  /**
   * Calculate intersection confidence for an element
   *
   * Returns confidence [0-1] that element will enter viewport
   */
  calculateIntersectionConfidence(
    elementBounds: Rect,
    currentScrollY: number
  ): {
    confidence: number;
    leadTime: number;
    reason: string;
  } {
    const velocity = this.getVelocity();

    if (!velocity) {
      return { confidence: 0, leadTime: 0, reason: 'no scroll data' };
    }

    // Not scrolling?
    if (velocity.velocity < 0.01) {
      // 0.01 px/ms = 10 px/s
      return { confidence: 0, leadTime: 0, reason: 'not scrolling' };
    }

    // Calculate viewport bounds
    const viewportTop = currentScrollY;
    const viewportBottom = currentScrollY + this.viewportHeight;

    // Check if element is already in viewport
    if (
      elementBounds.top < viewportBottom &&
      elementBounds.bottom > viewportTop
    ) {
      return { confidence: 1.0, leadTime: 0, reason: 'already intersecting' };
    }

    // Element above viewport?
    if (elementBounds.bottom < viewportTop) {
      // Only predict if scrolling up
      if (velocity.direction !== 'up') {
        return { confidence: 0, leadTime: 0, reason: 'element above, not scrolling up' };
      }

      const distance = viewportTop - elementBounds.bottom;
      const timeToIntersect = distance / velocity.velocity;

      if (timeToIntersect > this.config.intersectionLeadTimeMax) {
        return {
          confidence: 0,
          leadTime: timeToIntersect,
          reason: `lead time ${timeToIntersect.toFixed(0)}ms too long`,
        };
      }

      return this.calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
    }

    // Element below viewport?
    if (elementBounds.top > viewportBottom) {
      // Only predict if scrolling down
      if (velocity.direction !== 'down') {
        return {
          confidence: 0,
          leadTime: 0,
          reason: 'element below, not scrolling down',
        };
      }

      const distance = elementBounds.top - viewportBottom;
      const timeToIntersect = distance / velocity.velocity;

      if (timeToIntersect > this.config.intersectionLeadTimeMax) {
        return {
          confidence: 0,
          leadTime: timeToIntersect,
          reason: `lead time ${timeToIntersect.toFixed(0)}ms too long`,
        };
      }

      return this.calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
    }

    return { confidence: 0, leadTime: 0, reason: 'unknown state' };
  }

  /**
   * Calculate confidence based on distance and velocity
   */
  private calculateConfidenceFromDistance(
    distance: number,
    velocity: ScrollVelocity,
    timeToIntersect: number
  ): {
    confidence: number;
    leadTime: number;
    reason: string;
  } {
    // Base confidence from distance (closer = higher)
    const distanceConfidence = Math.max(0, 1 - distance / 1000); // 1000px = low confidence

    // Velocity confidence (moderate velocity = higher confidence)
    // Typical comfortable scroll: 0.5-1.5 px/ms (500-1500 px/s)
    const idealVelocity = 1.0;
    const velocityDiff = Math.abs(velocity.velocity - idealVelocity);
    const velocityConfidence = Math.max(0, 1 - velocityDiff / idealVelocity);

    // Deceleration confidence (steady or accelerating = higher confidence)
    // Decelerating = user might stop before reaching element
    const decelerationConfidence =
      velocity.deceleration <= 0 ? 1 : Math.max(0, 1 - velocity.deceleration / 0.001);

    // Time confidence (50-300ms window)
    const timeConfidence =
      timeToIntersect >= 50 && timeToIntersect <= 300
        ? 1
        : Math.max(0, 1 - Math.abs(timeToIntersect - 175) / 175);

    // Weighted combination
    const confidence =
      distanceConfidence * 0.3 +
      velocityConfidence * 0.2 +
      decelerationConfidence * 0.2 +
      timeConfidence * 0.3;

    return {
      confidence,
      leadTime: timeToIntersect,
      reason: `scroll: ${(confidence * 100).toFixed(0)}% (dist: ${distance.toFixed(0)}px, vel: ${velocity.velocity.toFixed(2)}, time: ${timeToIntersect.toFixed(0)}ms)`,
    };
  }

  /**
   * Calculate velocity from a set of scroll points
   */
  private calculateVelocity(
    points: Array<{ scrollX: number; scrollY: number; timestamp: number }>
  ): number {
    if (points.length < 2) return 0;

    const first = points[0];
    const last = points[points.length - 1];
    const timeDelta = last.timestamp - first.timestamp;

    if (timeDelta === 0) return 0;

    const dx = last.scrollX - first.scrollX;
    const dy = last.scrollY - first.scrollY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance / timeDelta;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.scrollHistory.clear();
  }
}
