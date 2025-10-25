import {
    ConfidenceEngineConfig,
    ObservablesConfig,
    PredictionObservation,
    Rect,
    TrajectoryPoint,
} from './confidence-types';

// Namespace: Minimact.Workers

export class Rect {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
}

export class MouseEventData {
    type: string;
    x: number;
    y: number;
    timestamp: number;
}

export class ScrollEventData {
    type: string;
    scrollX: number;
    scrollY: number;
    viewportWidth: number;
    viewportHeight: number;
    timestamp: number;
}

export class FocusEventData {
    type: string;
    elementId: string;
    timestamp: number;
}

export class KeydownEventData {
    type: string;
    key: string;
    timestamp: number;
}

export class ResizeEventData {
    type: string;
    width: number;
    height: number;
    timestamp: number;
}

export class ObservablesConfig {
    hover: boolean | null;
    intersection: boolean | null;
    focus: boolean | null;
}

export class RegisterElementMessage {
    type: string;
    componentId: string;
    elementId: string;
    bounds: Rect;
    observables: ObservablesConfig;
}

export class UpdateBoundsMessage {
    type: string;
    elementId: string;
    bounds: Rect;
}

export class UnregisterElementMessage {
    type: string;
    elementId: string;
}

export class WorkerInputMessage {
    type: string;
}

export class PredictionObservation {
    hover: boolean | null;
    isIntersecting: boolean | null;
    focus: boolean | null;
}

export class PredictionRequestMessage {
    type: string;
    componentId: string;
    elementId: string;
    observation: PredictionObservation;
    confidence: number;
    leadTime: number;
    reason: string;
}

export class DebugMessage {
    type: string;
    message: string;
    data: any;
}

export class WorkerOutputMessage {
    type: string;
}

export class TrajectoryPoint {
    x: number;
    y: number;
    timestamp: number;
}

export class MouseTrajectory {
    points: TrajectoryPoint[];
    velocity: number;
    angle: number;
    acceleration: number;
}

export class ScrollVelocity {
    velocity: number;
    direction: string;
    deceleration: number;
}

export class ObservableElement {
    componentId: string;
    elementId: string;
    bounds: Rect;
    observables: ObservablesConfig;
    lastPredictionTime: number | null;
}

export class CircularBuffer {
    private buffer: T[];
    private capacity: number;
    private index: number;
    private size: number;
    constructor(capacity: number) {
        this.buffer = new Array<T>(capacity);
        this.capacity = capacity;
        this.index = 0;
        this.size = 0;
    }

    push(item: T): void {
        this.buffer[this.index] = item;
        this.index = (this.index + 1) % this.capacity;
        this.size = Math.min(this.size + 1, this.capacity);
    }

    getAll(): T[] {
        if (this.size < this.capacity) {
            const result: T[] = new Array<T>(this.size);
            Array.copy(this.buffer, 0, result, 0, this.size);
            return result;
        }
        const chronological: T[] = new Array<T>(this.capacity);
        for (let i = 0; i < this.capacity; i++) {
            chronological[i] = this.buffer[(this.index + i) % this.capacity];
        }
        return chronological;
    }

    getLast(n: number): T[] {
        const all: T[] = getAll();
        const startIndex: number = Math.max(0, all.length - n);
        const result: T[] = new Array<T>(all.length - startIndex);
        Array.copy(all, startIndex, result, 0, result.length);
        return result;
    }

    length: number;
    clear(): void {
        this.size = 0;
        this.index = 0;
    }

}

export class ConfidenceEngineConfig {
    minConfidence: number;
    hoverHighConfidence: number;
    intersectionHighConfidence: number;
    focusHighConfidence: number;
    hoverLeadTimeMin: number;
    hoverLeadTimeMax: number;
    intersectionLeadTimeMax: number;
    maxTrajectoryAngle: number;
    minMouseVelocity: number;
    maxPredictionsPerElement: number;
    predictionWindowMs: number;
    mouseHistorySize: number;
    scrollHistorySize: number;
    debugLogging: boolean;
}

export class DefaultConfig {
    dEFAULT_CONFIG: ConfidenceEngineConfig;
}

