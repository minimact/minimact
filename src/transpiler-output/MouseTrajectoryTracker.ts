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
        let points: TrajectoryPoint[] = this.mouseHistory.getLast(5);
        if (points.length < 2) {
            return null;
        }
        let first: TrajectoryPoint = points[0];
        let last: TrajectoryPoint = points[points.length - 1];
        let timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return null;
        }
        let dx: number = last.x - first.x;
        let dy: number = last.y - first.y;
        let distance: number = Math.sqrt(dx * dx + dy * dy);
        let velocity: number = distance / timeDelta;
        let angle: number = Math.atan2(dy, dx);
        let acceleration: number = 0;
        if (points.length >= 4) {
            let mid: number = Math.floor(points.length / 2);
            let firstHalf: TrajectoryPoint[] = new Array<TrajectoryPoint>(mid);
            let secondHalf: TrajectoryPoint[] = new Array<TrajectoryPoint>(points.length - mid);
            Array.copy(points, 0, firstHalf, 0, mid);
            Array.copy(points, mid, secondHalf, 0, points.length - mid);
            let firstHalfVelocity: number = calculateVelocity(firstHalf);
            let secondHalfVelocity: number = calculateVelocity(secondHalf);
            acceleration = (secondHalfVelocity - firstHalfVelocity) / timeDelta;
        }
        return Object.assign(new MouseTrajectory(), { points: points, velocity: velocity, angle: angle, acceleration: acceleration });
    }

    export class HoverConfidenceResult {
        confidence: number;
        leadTime: number;
        reason: string;
    }

    calculateHoverConfidence(elementBounds: Rect): HoverConfidenceResult {
        let trajectory: MouseTrajectory = getTrajectory();
        if (trajectory == null) {
            return { confidence: 0, leadTime: 0, reason: "no trajectory data" };
        }
        let lastPoint: TrajectoryPoint = trajectory.points[trajectory.points.length - 1];
        if (trajectory.velocity < this.config.minMouseVelocity) {
            return { confidence: 0, leadTime: 0, reason: "mouse not moving" };
        }
        let intersection: RayIntersectionResult = calculateRayIntersection(lastPoint, trajectory.angle, elementBounds);
        if (intersection == null) {
            return { confidence: 0, leadTime: 0, reason: "not in trajectory path" };
        }
        let timeToIntersect: number = intersection.distance / trajectory.velocity;
        if (timeToIntersect < this.config.hoverLeadTimeMin || timeToIntersect > this.config.hoverLeadTimeMax) {
            return { confidence: 0, leadTime: timeToIntersect, reason: `lead time ${timeToIntersect.toFixed(0)}ms outside window` };
        }
        let elementCenterX: number = elementBounds.left + elementBounds.width / 2;
        let elementCenterY: number = elementBounds.top + elementBounds.height / 2;
        let angleToCenter: number = Math.atan2(elementCenterY - lastPoint.y, elementCenterX - lastPoint.x);
        let angleDiff: number = Math.abs(trajectory.angle - angleToCenter);
        let angleDiffDegrees: number = (angleDiff * 180) / Math.PI;
        if (angleDiffDegrees > this.config.maxTrajectoryAngle) {
            return { confidence: 0, leadTime: timeToIntersect, reason: `angle ${angleDiffDegrees.toFixed(0)}° too wide` };
        }
        let angleConfidence: number = 1 - angleDiffDegrees / this.config.maxTrajectoryAngle;
        let distanceConfidence: number = Math.max(0, 1 - intersection.distance / 500);
        let idealVelocity: number = 0.5;
        let velocityDiff: number = Math.abs(trajectory.velocity - idealVelocity);
        let velocityConfidence: number = Math.max(0, 1 - velocityDiff / idealVelocity);
        let accelerationConfidence: number = trajectory.acceleration < 0 ? 1 : Math.max(0, 1 - trajectory.acceleration);
        let confidence: number = angleConfidence * 0.4 + distanceConfidence * 0.3 + velocityConfidence * 0.2 + accelerationConfidence * 0.1;
        return { confidence: confidence, leadTime: timeToIntersect, reason: `trajectory: ${(confidence * 100).toFixed(0)}% (angle: ${angleDiffDegrees.toFixed(0)}°, dist: ${intersection.distance.toFixed(0)}px, vel: ${trajectory.velocity.toFixed(2)})` };
    }

    export class RayIntersectionResult {
        distance: number;
        point: TrajectoryPoint;
    }

    private calculateRayIntersection(origin: TrajectoryPoint, angle: number, box: Rect): RayIntersectionResult {
        let dx: number = Math.cos(angle);
        let dy: number = Math.sin(angle);
        let minDistance: number = /* TODO: PredefinedTypeSyntax */.positiveInfinity;
        let intersectionPoint: TrajectoryPoint = null;
        if (dx > 0.001) {
            let t: number = (box.left - origin.x) / dx;
            if (t > 0) {
                let y: number = origin.y + t * dy;
                if (y >= box.top && y <= box.bottom) {
                    let dist: number = Math.sqrt(Math.pow(box.left - origin.x, 2) + Math.pow(y - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: box.left, y: y, timestamp: 0 };
                    }
                }
            }
        }
        if (dx < -0.001) {
            let t: number = (box.right - origin.x) / dx;
            if (t > 0) {
                let y: number = origin.y + t * dy;
                if (y >= box.top && y <= box.bottom) {
                    let dist: number = Math.sqrt(Math.pow(box.right - origin.x, 2) + Math.pow(y - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: box.right, y: y, timestamp: 0 };
                    }
                }
            }
        }
        if (dy > 0.001) {
            let t: number = (box.top - origin.y) / dy;
            if (t > 0) {
                let x: number = origin.x + t * dx;
                if (x >= box.left && x <= box.right) {
                    let dist: number = Math.sqrt(Math.pow(x - origin.x, 2) + Math.pow(box.top - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: x, y: box.top, timestamp: 0 };
                    }
                }
            }
        }
        if (dy < -0.001) {
            let t: number = (box.bottom - origin.y) / dy;
            if (t > 0) {
                let x: number = origin.x + t * dx;
                if (x >= box.left && x <= box.right) {
                    let dist: number = Math.sqrt(Math.pow(x - origin.x, 2) + Math.pow(box.bottom - origin.y, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        intersectionPoint = { x: x, y: box.bottom, timestamp: 0 };
                    }
                }
            }
        }
        if (intersectionPoint != null && minDistance < /* TODO: PredefinedTypeSyntax */.positiveInfinity) {
            return Object.assign(new RayIntersectionResult(), { distance: minDistance, point: intersectionPoint });
        }
        return null;
    }

    private calculateVelocity(points: TrajectoryPoint[]): number {
        if (points.length < 2) {
            return 0;
        }
        let first: TrajectoryPoint = points[0];
        let last: TrajectoryPoint = points[points.length - 1];
        let timeDelta: number = last.timestamp - first.timestamp;
        if (timeDelta == 0) {
            return 0;
        }
        let dx: number = last.x - first.x;
        let dy: number = last.y - first.y;
        let distance: number = Math.sqrt(dx * dx + dy * dy);
        return distance / timeDelta;
    }

    clear(): void {
        this.mouseHistory.clear();
    }

}

