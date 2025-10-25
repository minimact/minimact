import {
    CircularBuffer,
    ConfidenceEngineConfig,
    Rect,
    ScrollEventData,
    ScrollVelocity,
} from './confidence-types';

// Namespace: Minimact.Workers

export class ScrollVelocityTracker {
    export class ScrollPoint {
        scrollX: number;
        scrollY: number;
        timestamp: number;
    }

    private scrollHistory: CircularBuffer<ScrollPoint>;
    private config: ConfidenceEngineConfig;
    private viewportWidth: number;
    private viewportHeight: number;
    constructor(config: ConfidenceEngineConfig) {
        this.config = config;
        this.scrollHistory = new CircularBuffer<ScrollPoint>(config.scrollHistorySize);
    }

    trackScroll(eventData: ScrollEventData): void {
        this.viewportWidth = eventData.viewportWidth;
        this.viewportHeight = eventData.viewportHeight;
        this.scrollHistory.push({ scrollX: eventData.scrollX, scrollY: eventData.scrollY, timestamp: eventData.timestamp });
    }

    getVelocity(): ScrollVelocity {
        const points: ScrollPoint[] = this.scrollHistory.getLast(3);
        if (points.length < 2) {
            return null;
        }
        const first: ScrollPoint = points[0];
        const last: ScrollPoint = points[points.length - 1];
        const timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return null;
        }
        const dx: number = last.scrollX - first.scrollX;
        const dy: number = last.scrollY - first.scrollY;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const velocity: number = distance / timeDelta;
        let direction: string;
        if (Math.abs(dy) > Math.abs(dx)) {
            direction = dy > 0 ? "down" : "up";
        } else {
            if (Math.abs(dx) > Math.abs(dy)) {
                direction = dx > 0 ? "right" : "left";
            } else {
                direction = "none";
            }
        }
        const deceleration: number = 0;
        if (points.length >= 3) {
            const mid: number = Math.floor(points.length / 2);
            const firstHalf: ScrollPoint[] = new Array<ScrollPoint>(mid);
            const secondHalf: ScrollPoint[] = new Array<ScrollPoint>(points.length - mid);
            Array.copy(points, 0, firstHalf, 0, mid);
            Array.copy(points, mid, secondHalf, 0, points.length - mid);
            const firstHalfVelocity: number = this.calculateVelocity(firstHalf);
            const secondHalfVelocity: number = this.calculateVelocity(secondHalf);
            deceleration = (firstHalfVelocity - secondHalfVelocity) / timeDelta;
        }
        return { velocity, direction, deceleration };
    }

    export class IntersectionConfidenceResult {
        confidence: number;
        leadTime: number;
        reason: string;
    }

    calculateIntersectionConfidence(elementBounds: Rect, currentScrollY: number): IntersectionConfidenceResult {
        const velocity: ScrollVelocity = this.getVelocity();
        if (velocity == null) {
            return { confidence: 0, leadTime: 0, reason: "no scroll data" };
        }
        if (velocity.velocity < 0.01) {
            return { confidence: 0, leadTime: 0, reason: "not scrolling" };
        }
        const viewportTop: number = currentScrollY;
        const viewportBottom: number = currentScrollY + this.viewportHeight;
        if (elementBounds.top < viewportBottom && elementBounds.bottom > viewportTop) {
            return { confidence: 1, leadTime: 0, reason: "already intersecting" };
        }
        if (elementBounds.bottom < viewportTop) {
            if (velocity.direction != "up") {
                return { confidence: 0, leadTime: 0, reason: "element above, not scrolling up" };
            }
            const distance: number = viewportTop - elementBounds.bottom;
            const timeToIntersect: number = distance / velocity.velocity;
            if (timeToIntersect > this.config.intersectionLeadTimeMax) {
                return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms too long` };
            }
            return this.calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
        }
        if (elementBounds.top > viewportBottom) {
            if (velocity.direction != "down") {
                return { confidence: 0, leadTime: 0, reason: "element below, not scrolling down" };
            }
            const distance: number = elementBounds.top - viewportBottom;
            const timeToIntersect: number = distance / velocity.velocity;
            if (timeToIntersect > this.config.intersectionLeadTimeMax) {
                return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms too long` };
            }
            return this.calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
        }
        return { confidence: 0, leadTime: 0, reason: "unknown state" };
    }

    private calculateConfidenceFromDistance(distance: number, velocity: ScrollVelocity, timeToIntersect: number): IntersectionConfidenceResult {
        const distanceConfidence: number = Math.max(0, 1 - distance / 1000);
        const idealVelocity: number = 1;
        const velocityDiff: number = Math.abs(velocity.velocity - idealVelocity);
        const velocityConfidence: number = Math.max(0, 1 - velocityDiff / idealVelocity);
        const decelerationConfidence: number = velocity.deceleration <= 0 ? 1 : Math.max(0, 1 - velocity.deceleration / 0.001);
        const timeConfidence: number = timeToIntersect >= 50 && timeToIntersect <= 300 ? 1 : Math.max(0, 1 - Math.abs(timeToIntersect - 175) / 175);
        const confidence: number = distanceConfidence * 0.3 + velocityConfidence * 0.2 + decelerationConfidence * 0.2 + timeConfidence * 0.3;
        return { confidence, leadTime: timeToIntersect, reason: `scroll: ${(confidence * 100).toFixed(0)}% (dist: ${distance.toFixed(0)}px, vel: ${velocity.velocity.toFixed(2)}, time: ${timeToIntersect.toFixed(0)}ms)` };
    }

    private calculateVelocity(points: ScrollPoint[]): number {
        if (points.length < 2) {
            return 0;
        }
        const first: ScrollPoint = points[0];
        const last: ScrollPoint = points[points.length - 1];
        const timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return 0;
        }
        const dx: number = last.scrollX - first.scrollX;
        const dy: number = last.scrollY - first.scrollY;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        return distance / timeDelta;
    }

    clear(): void {
        this.scrollHistory.clear();
    }

}

