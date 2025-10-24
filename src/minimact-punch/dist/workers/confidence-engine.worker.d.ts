/**
 * Confidence Engine Web Worker
 *
 * Runs in a Web Worker (off main thread) to analyze user behavior and
 * predict future DOM observations before they occur.
 *
 * Predictions:
 * - Hover: Mouse trajectory analysis (50-300ms lead time)
 * - Intersection: Scroll velocity analysis (up to 300ms lead time)
 * - Focus: Tab sequence detection (50ms lead time)
 */
import { WorkerInputMessage, ConfidenceEngineConfig } from './confidence-types';
/**
 * Main Confidence Engine
 */
declare class ConfidenceEngine {
    private config;
    private mouseTracker;
    private scrollTracker;
    private focusTracker;
    private observableElements;
    private predictionThrottle;
    private currentScrollY;
    constructor(config?: ConfidenceEngineConfig);
    /**
     * Handle incoming messages from main thread
     */
    handleMessage(message: WorkerInputMessage): void;
    /**
     * Handle mouse move event
     */
    private handleMouseMove;
    /**
     * Handle scroll event
     */
    private handleScroll;
    /**
     * Handle focus event
     */
    private handleFocus;
    /**
     * Handle keydown event
     */
    private handleKeydown;
    /**
     * Register an observable element
     */
    private registerElement;
    /**
     * Update element bounds
     */
    private updateBounds;
    /**
     * Unregister an element
     */
    private unregisterElement;
    /**
     * Check if we can make a prediction for this element (throttling)
     */
    private canPredict;
    /**
     * Send prediction request to main thread
     */
    private sendPrediction;
    /**
     * Debug logging
     */
    private debug;
}
export { ConfidenceEngine };
//# sourceMappingURL=confidence-engine.worker.d.ts.map