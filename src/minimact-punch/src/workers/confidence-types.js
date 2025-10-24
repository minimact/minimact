/**
 * Types for the Confidence Engine Web Worker
 *
 * The confidence engine runs in a Web Worker to analyze user behavior
 * and predict future DOM observations before they occur.
 */
/**
 * Circular buffer for efficient event history storage
 */
export class CircularBuffer {
    constructor(capacity) {
        this.buffer = new Array(capacity);
        this.capacity = capacity;
        this.index = 0;
        this.size = 0;
    }
    push(item) {
        this.buffer[this.index] = item;
        this.index = (this.index + 1) % this.capacity;
        this.size = Math.min(this.size + 1, this.capacity);
    }
    getAll() {
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
    getLast(n) {
        const all = this.getAll();
        return all.slice(-n);
    }
    get length() {
        return this.size;
    }
    clear() {
        this.size = 0;
        this.index = 0;
    }
}
export const DEFAULT_CONFIG = {
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
