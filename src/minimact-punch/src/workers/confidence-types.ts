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
export type WorkerInputMessage =
  | MouseEventData
  | ScrollEventData
  | FocusEventData
  | KeydownEventData
  | ResizeEventData
  | RegisterElementMessage
  | UpdateBoundsMessage
  | UnregisterElementMessage;

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
  leadTime: number; // Milliseconds before observation occurs
  reason: string; // Debug info (e.g., "mouse trajectory: 0.85")
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
export type WorkerOutputMessage =
  | PredictionRequestMessage
  | DebugMessage;

/**
 * Mouse trajectory data
 */
export interface MouseTrajectory {
  points: Array<{ x: number; y: number; timestamp: number }>;
  velocity: number; // pixels per millisecond
  angle: number; // radians
  acceleration: number; // change in velocity
}

/**
 * Scroll velocity data
 */
export interface ScrollVelocity {
  velocity: number; // pixels per millisecond
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
  deceleration: number; // rate of slowdown
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
export class CircularBuffer<T> {
  private buffer: T[];
  private capacity: number;
  private index: number;
  private size: number;

  constructor(capacity: number) {
    this.buffer = new Array(capacity);
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
      return this.buffer.slice(0, this.size);
    }

    // Return in chronological order
    const result = new Array(this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      result[i] = this.buffer[(this.index + i) % this.capacity];
    }
    return result;
  }

  getLast(n: number): T[] {
    const all = this.getAll();
    return all.slice(-n);
  }

  get length(): number {
    return this.size;
  }

  clear(): void {
    this.size = 0;
    this.index = 0;
  }
}

/**
 * Configuration for confidence engine
 */
export interface ConfidenceEngineConfig {
  // Confidence thresholds
  minConfidence: number; // 0.7 - only predict above this
  hoverHighConfidence: number; // 0.85 - high confidence hover
  intersectionHighConfidence: number; // 0.90 - high confidence intersection
  focusHighConfidence: number; // 0.95 - very high confidence focus

  // Timing
  hoverLeadTimeMin: number; // 50ms - minimum lead time for hover
  hoverLeadTimeMax: number; // 300ms - maximum lead time for hover
  intersectionLeadTimeMax: number; // 300ms - maximum lead time for intersection

  // Trajectory
  maxTrajectoryAngle: number; // 30 degrees - max angle for high confidence
  minMouseVelocity: number; // 0.1 px/ms - minimum velocity to predict

  // Throttling
  maxPredictionsPerElement: number; // 2 - max predictions per element per window
  predictionWindowMs: number; // 200ms - throttle window

  // History
  mouseHistorySize: number; // 20 - number of mouse points to track
  scrollHistorySize: number; // 10 - number of scroll events to track

  // Debug
  debugLogging: boolean;
}

export const DEFAULT_CONFIG: ConfidenceEngineConfig = {
  minConfidence: 0.7,
  hoverHighConfidence: 0.85,
  intersectionHighConfidence: 0.90,
  focusHighConfidence: 0.95,
  hoverLeadTimeMin: 50,
  hoverLeadTimeMax: 300,
  intersectionLeadTimeMax: 300,
  maxTrajectoryAngle: 30,
  minMouseVelocity: 0.1,
  maxPredictionsPerElement: 2,
  predictionWindowMs: 200,
  mouseHistorySize: 20,
  scrollHistorySize: 10,
  debugLogging: false,
};
