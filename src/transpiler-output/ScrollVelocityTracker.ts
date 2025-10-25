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
        this.scrollHistory.push(Object.assign(new ScrollPoint(), { scrollX: eventData.scrollX, scrollY: eventData.scrollY, timestamp: eventData.timestamp }));
    }

    getVelocity(): ScrollVelocity {
        let points: ScrollPoint[] = this.scrollHistory.getLast(3);
        if (points.length < 2) {
            return null;
        }
        let first: ScrollPoint = points[0];
        let last: ScrollPoint = points[points.length - 1];
        let timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return null;
        }
        let dx: number = last.scrollX - first.scrollX;
        let dy: number = last.scrollY - first.scrollY;
        let distance: number = Math.sqrt(dx * dx + dy * dy);
        let velocity: number = distance / timeDelta;
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
        let deceleration: number = 0;
        if (points.length >= 3) {
            let mid: number = Math.floor(points.length / 2);
            let firstHalf: ScrollPoint[] = new Array<ScrollPoint>(mid);
            let secondHalf: ScrollPoint[] = new Array<ScrollPoint>(points.length - mid);
            Array.copy(points, 0, firstHalf, 0, mid);
            Array.copy(points, mid, secondHalf, 0, points.length - mid);
            let firstHalfVelocity: number = calculateVelocity(firstHalf);
            let secondHalfVelocity: number = calculateVelocity(secondHalf);
            deceleration = (firstHalfVelocity - secondHalfVelocity) / timeDelta;
        }
        return Object.assign(new ScrollVelocity(), { velocity: velocity, direction: direction, deceleration: deceleration });
    }

    export class IntersectionConfidenceResult {
        confidence: number;
        leadTime: number;
        reason: string;
    }

    calculateIntersectionConfidence(elementBounds: Rect, currentScrollY: number): IntersectionConfidenceResult {
        let velocity: ScrollVelocity = getVelocity();
        if (velocity == null) {
            return { confidence: 0, leadTime: 0, reason: "no scroll data" };
        }
        if (velocity.velocity < 0.01) {
            return { confidence: 0, leadTime: 0, reason: "not scrolling" };
        }
        let viewportTop: number = currentScrollY;
        let viewportBottom: number = currentScrollY + this.viewportHeight;
        if (elementBounds.top < viewportBottom && elementBounds.bottom > viewportTop) {
            return { confidence: 1, leadTime: 0, reason: "already intersecting" };
        }
        if (elementBounds.bottom < viewportTop) {
            if (velocity.direction != "up") {
                return { confidence: 0, leadTime: 0, reason: "element above, not scrolling up" };
            }
            let distance: number = viewportTop - elementBounds.bottom;
            let timeToIntersect: number = distance / velocity.velocity;
            if (timeToIntersect > this.config.intersectionLeadTimeMax) {
                return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms too long` };
            }
            return calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
        }
        if (elementBounds.top > viewportBottom) {
            if (velocity.direction != "down") {
                return { confidence: 0, leadTime: 0, reason: "element below, not scrolling down" };
            }
            let distance: number = elementBounds.top - viewportBottom;
            let timeToIntersect: number = distance / velocity.velocity;
            if (timeToIntersect > this.config.intersectionLeadTimeMax) {
                return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms too long` };
            }
            return calculateConfidenceFromDistance(distance, velocity, timeToIntersect);
        }
        return { confidence: 0, leadTime: 0, reason: "unknown state" };
    }

    private calculateConfidenceFromDistance(distance: number, velocity: ScrollVelocity, timeToIntersect: number): IntersectionConfidenceResult {
        let distanceConfidence: number = Math.max(0, 1 - distance / 1000);
        let idealVelocity: number = 1;
        let velocityDiff: number = Math.abs(velocity.velocity - idealVelocity);
        let velocityConfidence: number = Math.max(0, 1 - velocityDiff / idealVelocity);
        let decelerationConfidence: number = velocity.deceleration <= 0 ? 1 : Math.max(0, 1 - velocity.deceleration / 0.001);
        let timeConfidence: number = timeToIntersect >= 50 && timeToIntersect <= 300 ? 1 : Math.max(0, 1 - Math.abs(timeToIntersect - 175) / 175);
        let confidence: number = distanceConfidence * 0.3 + velocityConfidence * 0.2 + decelerationConfidence * 0.2 + timeConfidence * 0.3;
        return { confidence: confidence, leadTime: timeToIntersect, reason: `scroll: ${(confidence * 100).toFixed(0)}% (dist: ${distance.toFixed(0)}px, vel: ${velocity.velocity.toFixed(2)}, time: ${timeToIntersect.toFixed(0)}ms)` };
    }

    private calculateVelocity(points: ScrollPoint[]): number {
        if (points.length < 2) {
            return 0;
        }
        let first: ScrollPoint = points[0];
        let last: ScrollPoint = points[points.length - 1];
        let timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return 0;
        }
        let dx: number = last.scrollX - first.scrollX;
        let dy: number = last.scrollY - first.scrollY;
        let distance: number = Math.sqrt(dx * dx + dy * dy);
        return distance / timeDelta;
    }

    clear(): void {
        this.scrollHistory.clear();
    }

}

