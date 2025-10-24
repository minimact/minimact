/**
 * Confidence Worker Manager
 *
 * Main thread manager for the Confidence Engine Web Worker.
 * Handles worker lifecycle, forwards browser events, and receives prediction requests.
 *
 * This is an OPTIONAL extension to minimact-punch - if the worker fails to load,
 * useDomElementState will still work (just without predictive hints).
 */
import type { ConfidenceEngineConfig } from './workers/confidence-types';
/**
 * Callback when worker requests a prediction
 */
export type PredictionRequestCallback = (request: {
    componentId: string;
    elementId: string;
    observation: {
        hover?: boolean;
        isIntersecting?: boolean;
        focus?: boolean;
    };
    confidence: number;
    leadTime: number;
}) => void;
/**
 * Configuration for worker manager
 */
export interface WorkerManagerConfig {
    workerPath?: string;
    config?: Partial<ConfidenceEngineConfig>;
    onPredictionRequest?: PredictionRequestCallback;
    debugLogging?: boolean;
}
/**
 * Manages the Confidence Engine Web Worker
 */
export declare class ConfidenceWorkerManager {
    private worker;
    private config;
    private workerReady;
    private onPredictionRequest?;
    private eventListeners;
    private observedElements;
    constructor(config?: WorkerManagerConfig);
    /**
     * Initialize and start the worker
     */
    start(): Promise<boolean>;
    /**
     * Stop the worker and cleanup
     */
    stop(): void;
    /**
     * Register an element for observation
     */
    registerElement(componentId: string, elementId: string, element: HTMLElement, observables: {
        hover?: boolean;
        intersection?: boolean;
        focus?: boolean;
    }): void;
    /**
     * Update element bounds (when element moves/resizes)
     */
    updateBounds(elementId: string, element: HTMLElement): void;
    /**
     * Unregister an element
     */
    unregisterElement(elementId: string): void;
    /**
     * Set prediction request callback
     */
    setOnPredictionRequest(callback: PredictionRequestCallback): void;
    /**
     * Check if worker is ready
     */
    isReady(): boolean;
    /**
     * Handle messages from worker
     */
    private handleWorkerMessage;
    /**
     * Handle prediction request from worker
     */
    private handlePredictionRequest;
    /**
     * Attach browser event listeners
     */
    private attachEventListeners;
    /**
     * Detach browser event listeners
     */
    private detachEventListeners;
    /**
     * Post message to worker
     */
    private postMessage;
    /**
     * Get element bounds relative to viewport
     */
    private getElementBounds;
    /**
     * Debug logging
     */
    private log;
}
//# sourceMappingURL=confidence-worker-manager.d.ts.map