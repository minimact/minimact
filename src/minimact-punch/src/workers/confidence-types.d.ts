/**
 * Types for the Confidence Engine Web Worker
 *
 * The confidence engine runs in a Web Worker to analyze user behavior
 * and predict future DOM observations before they occur.
 */
/**
 * Rectangle bounds for an element
 */
export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
}
/**
 * Mouse event data sent to worker
 */
export interface MouseEventData {
    type: 'mousemove';
    x: number;
    y: number;
    timestamp: number;
}
/**
 * Scroll event data sent to worker
 */
export interface ScrollEventData {
    type: 'scroll';
    scrollX: number;
    scrollY: number;
    viewportWidth: number;
    viewportHeight: number;
    timestamp: number;
}
/**
 * Focus event data sent to worker
 */
export interface FocusEventData {
    type: 'focus';
    elementId: string;
    timestamp: number;
}
/**
 * Keydown event data sent to worker
 */
export interface KeydownEventData {
    type: 'keydown';
    key: string;
    timestamp: number;
}
/**
 * Resize event data sent to worker
 */
export interface ResizeEventData {
    type: 'resize';
    width: number;
    height: number;
    timestamp: number;
}
/**
 * Observable element registration
 */
export interface RegisterElementMessage {
    type: 'registerElement';
    componentId: string;
    elementId: string;
    bounds: Rect;
    observables: {
        hover?: boolean;
        intersection?: boolean;
        focus?: boolean;
    };
}
/**
 * Element bounds update (when element moves/resizes)
 */
export interface UpdateBoundsMessage {
    type: 'updateBounds';
    elementId: string;
    bounds: Rect;
}
/**
 * Unregister element
 */
export interface UnregisterElementMessage {
    type: 'unregisterElement';
    elementId: string;
}
/**
 * Union of all messages sent TO the worker
 */
export type WorkerInputMessage = MouseEventData | ScrollEventData | FocusEventData | KeydownEventData | ResizeEventData | RegisterElementMessage | UpdateBoundsMessage | UnregisterElementMessage;
/**
 * Prediction request sent FROM worker to main thread
 */
export interface PredictionRequestMessage {
    type: 'requestPrediction';
    componentId: string;
    elementId: string;
    observation: {
        hover?: boolean;
        isIntersecting?: boolean;
        focus?: boolean;
    };
    confidence: number;
    leadTime: number;
    reason: string;
}
/**
 * Debug message from worker
 */
export interface DebugMessage {
    type: 'debug';
    message: string;
    data?: any;
}
/**
 * Union of all messages sent FROM the worker
 */
export type WorkerOutputMessage = PredictionRequestMessage | DebugMessage;
/**
 * Mouse trajectory data
 */
export interface MouseTrajectory {
    points: Array<{
        x: number;
        y: number;
        timestamp: number;
    }>;
    velocity: number;
    angle: number;
    acceleration: number;
}
/**
 * Scroll velocity data
 */
export interface ScrollVelocity {
    velocity: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'none';
    deceleration: number;
}
/**
 * Observable element tracked by worker
 */
export interface ObservableElement {
    componentId: string;
    elementId: string;
    bounds: Rect;
    observables: {
        hover?: boolean;
        intersection?: boolean;
        focus?: boolean;
    };
    lastPredictionTime?: number;
}
/**
 * Circular buffer for efficient event history storage
 */
export declare class CircularBuffer<T> {
    private buffer;
    private capacity;
    private index;
    private size;
    constructor(capacity: number);
    push(item: T): void;
    getAll(): T[];
    getLast(n: number): T[];
    get length(): number;
    clear(): void;
}
/**
 * Configuration for confidence engine
 */
export interface ConfidenceEngineConfig {
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
export declare const DEFAULT_CONFIG: ConfidenceEngineConfig;
//# sourceMappingURL=confidence-types.d.ts.map