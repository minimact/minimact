import {
    CircularBuffer,
    ConfidenceEngineConfig,
    MouseEventData,
    MouseTrajectory,
    Rect,
    TrajectoryPoint,
} from './confidence-types';

export interface HoverConfidenceResult {
    confidence: number;
    leadTime: number;
    reason: string;
}

export interface RayIntersectionResult {
    distance: number;
    point: TrajectoryPoint;
}

// Namespace: Minimact.Workers

export class MouseTrajectoryTracker {
    private mouseHistory: CircularBuffer<TrajectoryPoint>;
    private config: ConfidenceEngineConfig;
    constructor(config: ConfidenceEngineConfig) {
        this.config = config;
        this.mouseHistory = new CircularBuffer<TrajectoryPoint>(config.mouseHistorySize);
    }

    trackMove(eventData: MouseEventData): void {
        this.mouseHistory.push({ x: eventData.x, y: eventData.y, timestamp: eventData.timestamp });
    }

    getTrajectory(): MouseTrajectory {
        const points: TrajectoryPoint[] = this.mouseHistory.getLast(5);
        if (points.length < 2) {
            return null;
        }
        const first: TrajectoryPoint = points[0];
        const last: TrajectoryPoint = points[points.length - 1];
        const timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta === 0) {
            return null;
        }
        const dx: number = last.x - first.x;
        const dy: number = last.y - first.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const velocity: number = distance / timeDelta;
        const angle: number = Math.atan2(dy, dx);
        let acceleration: number = 0;
        if (points.length >= 4) {
            const mid: number = Math.floor(points.length / 2);
            const firstHalfVelocity: number = this.calculateVelocity(points.slice(0, mid));
            const secondHalfVelocity: number = this.calculateVelocity(points.slice(mid));
            acceleration = (secondHalfVelocity - firstHalfVelocity) / timeDelta;
        }
        return { points, velocity, angle, acceleration };
    }

    calculateHoverConfidence(elementBounds: Rect): HoverConfidenceResult {
        const trajectory: MouseTrajectory = this.getTrajectory();
        if (trajectory === null) {
            return { confidence: 0, leadTime: 0, reason: "no trajectory data" };
        }
        const lastPoint: TrajectoryPoint = trajectory.points[trajectory.points.length - 1];
        if (trajectory.velocity < this.config.minMouseVelocity) {
            return { confidence: 0, leadTime: 0, reason: "mouse not moving" };
        }
        const intersection: RayIntersectionResult = this.calculateRayIntersection(lastPoint, trajectory.angle, elementBounds);
        if (intersection === null) {
            return { confidence: 0, leadTime: 0, reason: "not in trajectory path" };
        }
        const timeToIntersect: number = intersection.distance / trajectory.velocity;
        if (timeToIntersect < this.config.hoverLeadTimeMin || timeToIntersect > this.config.hoverLeadTimeMax) {
            return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms outside window` };
        }
        const elementCenterX: number = elementBounds.left + elementBounds.width / 2;
        const elementCenterY: number = elementBounds.top + elementBounds.height / 2;
        const angleToCenter: number = Math.atan2(elementCenterY - lastPoint.y, elementCenterX - lastPoint.x);
        const angleDiff: number = Math.abs(trajectory.angle - angleToCenter);
        const angleDiffDegrees: number = (angleDiff * 180) / Math.PI;
        if (angleDiffDegrees > this.config.maxTrajectoryAngle) {
            return { confidence: 0, leadTime: timeToIntersect, reason: `angle ${angleDiffDegrees.toFixed(0)}° too wide` };
        }
        const angleConfidence: number = 1 - angleDiffDegrees / this.config.maxTrajectoryAngle;
        const distanceConfidence: number = Math.max(0, 1 - intersection.distance / 500);
        const idealVelocity: number = 0.5;
        const velocityDiff: number = Math.abs(trajectory.velocity - idealVelocity);
        const velocityConfidence: number = Math.max(0, 1 - velocityDiff / idealVelocity);
        const accelerationConfidence: number = trajectory.acceleration < 0 ? 1 : Math.max(0, 1 - trajectory.acceleration);
        const confidence: number = angleConfidence * 0.4 + distanceConfidence * 0.3 + velocityConfidence * 0.2 + accelerationConfidence * 0.1;
        return { confidence, leadTime: timeToIntersect, reason: `trajectory: ${(confidence * 100).toFixed(0)}% (angle: ${angleDiffDegrees.toFixed(0)}°, dist: ${intersection.distance.toFixed(0)}px, vel: ${trajectory.velocity.toFixed(2)})` };
    }

    private calculateRayIntersection(origin: TrajectoryPoint, angle: number, box: Rect): RayIntersectionResult {
        const dx: number = Math.cos(angle);
        const dy: number = Math.sin(angle);
        const minDistance: number = Number.POSITIVE_INFINITY;
        const intersectionPoint: TrajectoryPoint = null;
        if (dx > 0.001) {
            const t: number = (box.left - origin.x) / dx;
            if (t > 0) {
                const y: number = origin.y + t * dy;
                if (y >= box.top && y <= box.bottom) {
                    const dist: number = Math.sqrt(Math.pow(box.left - origin.x, 2) + Math.pow(y - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: box.left, y, timestamp: 0 };
                    }
                }
            }
        }
        if (dx < -0.001) {
            const t: number = (box.right - origin.x) / dx;
            if (t > 0) {
                const y: number = origin.y + t * dy;
                if (y >= box.top && y <= box.bottom) {
                    const dist: number = Math.sqrt(Math.pow(box.right - origin.x, 2) + Math.pow(y - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: box.right, y, timestamp: 0 };
                    }
                }
            }
        }
        if (dy > 0.001) {
            const t: number = (box.top - origin.y) / dy;
            if (t > 0) {
                const x: number = origin.x + t * dx;
                if (x >= box.left && x <= box.right) {
                    const dist: number = Math.sqrt(Math.pow(x - origin.x, 2) + Math.pow(box.top - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x, y: box.top, timestamp: 0 };
                    }
                }
            }
        }
        if (dy < -0.001) {
            const t: number = (box.bottom - origin.y) / dy;
            if (t > 0) {
                const x: number = origin.x + t * dx;
                if (x >= box.left && x <= box.right) {
                    const dist: number = Math.sqrt(Math.pow(x - origin.x, 2) + Math.pow(box.bottom - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x, y: box.bottom, timestamp: 0 };
                    }
                }
            }
        }
        if (intersectionPoint !== null && minDistance < Number.POSITIVE_INFINITY) {
            return { distance: minDistance, point: intersectionPoint };
        }
        return null;
    }

    private calculateVelocity(points: TrajectoryPoint[]): number {
        if (points.length < 2) {
            return 0;
        }
        const first: TrajectoryPoint = points[0];
        const last: TrajectoryPoint = points[points.length - 1];
        const timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta === 0) {
            return 0;
        }
        const dx: number = last.x - first.x;
        const dy: number = last.y - first.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        return distance / timeDelta;
    }

    clear(): void {
        this.mouseHistory.clear();
    }

}

