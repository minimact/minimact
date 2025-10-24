/**
 * Confidence Worker Manager
 *
 * Main thread manager for the Confidence Engine Web Worker.
 * Handles worker lifecycle, forwards browser events, and receives prediction requests.
 *
 * This is an OPTIONAL extension to minimact-punch - if the worker fails to load,
 * useDomElementState will still work (just without predictive hints).
 */
import { DEFAULT_CONFIG } from './workers/confidence-types';
/**
 * Manages the Confidence Engine Web Worker
 */
export class ConfidenceWorkerManager {
    constructor(config = {}) {
        this.worker = null;
        this.workerReady = false;
        this.eventListeners = new Map();
        this.observedElements = new Set(); // Track registered elements
        this.config = {
            workerPath: config.workerPath || '/workers/confidence-engine.worker.js',
            config: { ...DEFAULT_CONFIG, ...config.config },
            debugLogging: config.debugLogging || false,
        };
        this.onPredictionRequest = config.onPredictionRequest;
    }
    /**
     * Initialize and start the worker
     */
    async start() {
        try {
            // Check for Worker support
            if (typeof Worker === 'undefined') {
                this.log('Web Workers not supported in this browser');
                return false;
            }
            // Create worker
            this.worker = new Worker(this.config.workerPath, { type: 'module' });
            // Setup message handler
            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event.data);
            };
            // Setup error handler
            this.worker.onerror = (error) => {
                console.error('[ConfidenceWorker] Worker error:', error);
                this.workerReady = false;
            };
            // Attach browser event listeners
            this.attachEventListeners();
            this.workerReady = true;
            this.log('Worker started successfully');
            return true;
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to start worker:', error);
            return false;
        }
    }
    /**
     * Stop the worker and cleanup
     */
    stop() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
        }
        this.detachEventListeners();
        this.observedElements.clear();
        this.log('Worker stopped');
    }
    /**
     * Register an element for observation
     */
    registerElement(componentId, elementId, element, observables) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        // Get element bounds
        const bounds = this.getElementBounds(element);
        // Send to worker
        this.postMessage({
            type: 'registerElement',
            componentId,
            elementId,
            bounds,
            observables,
        });
        this.observedElements.add(elementId);
        this.log('Registered element', { elementId, observables });
    }
    /**
     * Update element bounds (when element moves/resizes)
     */
    updateBounds(elementId, element) {
        if (!this.workerReady || !this.worker || !this.observedElements.has(elementId)) {
            return;
        }
        const bounds = this.getElementBounds(element);
        this.postMessage({
            type: 'updateBounds',
            elementId,
            bounds,
        });
    }
    /**
     * Unregister an element
     */
    unregisterElement(elementId) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        this.postMessage({
            type: 'unregisterElement',
            elementId,
        });
        this.observedElements.delete(elementId);
        this.log('Unregistered element', { elementId });
    }
    /**
     * Set prediction request callback
     */
    setOnPredictionRequest(callback) {
        this.onPredictionRequest = callback;
    }
    /**
     * Check if worker is ready
     */
    isReady() {
        return this.workerReady;
    }
    /**
     * Handle messages from worker
     */
    handleWorkerMessage(message) {
        switch (message.type) {
            case 'requestPrediction':
                this.handlePredictionRequest(message);
                break;
            case 'debug':
                if (this.config.debugLogging) {
                    console.log(message.message, message.data || '');
                }
                break;
            default:
                console.warn('[ConfidenceWorker] Unknown message from worker:', message);
        }
    }
    /**
     * Handle prediction request from worker
     */
    handlePredictionRequest(request) {
        this.log('Prediction request', {
            elementId: request.elementId,
            confidence: `${(request.confidence * 100).toFixed(0)}%`,
            leadTime: `${request.leadTime.toFixed(0)}ms`,
            reason: request.reason,
        });
        if (this.onPredictionRequest) {
            this.onPredictionRequest({
                componentId: request.componentId,
                elementId: request.elementId,
                observation: request.observation,
                confidence: request.confidence,
                leadTime: request.leadTime,
            });
        }
    }
    /**
     * Attach browser event listeners
     */
    attachEventListeners() {
        // Mouse move (throttled)
        let lastMouseMove = 0;
        const mouseMoveHandler = (event) => {
            const mouseEvent = event;
            const now = performance.now();
            if (now - lastMouseMove < 16)
                return; // ~60fps throttle
            lastMouseMove = now;
            this.postMessage({
                type: 'mousemove',
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
                timestamp: now,
            });
        };
        window.addEventListener('mousemove', mouseMoveHandler, { passive: true });
        this.eventListeners.set('mousemove', mouseMoveHandler);
        // Scroll (throttled)
        let lastScroll = 0;
        const scrollHandler = () => {
            const now = performance.now();
            if (now - lastScroll < 16)
                return; // ~60fps throttle
            lastScroll = now;
            this.postMessage({
                type: 'scroll',
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timestamp: now,
            });
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        this.eventListeners.set('scroll', scrollHandler);
        // Focus
        const focusHandler = (event) => {
            const target = event.target;
            if (!target.id)
                return; // Only track elements with IDs
            this.postMessage({
                type: 'focus',
                elementId: target.id,
                timestamp: performance.now(),
            });
        };
        window.addEventListener('focus', focusHandler, { capture: true, passive: true });
        this.eventListeners.set('focus', focusHandler);
        // Keydown (Tab key)
        const keydownHandler = (event) => {
            const keyEvent = event;
            if (keyEvent.key === 'Tab') {
                this.postMessage({
                    type: 'keydown',
                    key: keyEvent.key,
                    timestamp: performance.now(),
                });
            }
        };
        window.addEventListener('keydown', keydownHandler, { passive: true });
        this.eventListeners.set('keydown', keydownHandler);
        this.log('Event listeners attached');
    }
    /**
     * Detach browser event listeners
     */
    detachEventListeners() {
        for (const [eventType, handler] of this.eventListeners) {
            if (eventType === 'focus') {
                window.removeEventListener('focus', handler, { capture: true });
            }
            else {
                window.removeEventListener(eventType, handler);
            }
        }
        this.eventListeners.clear();
        this.log('Event listeners detached');
    }
    /**
     * Post message to worker
     */
    postMessage(message) {
        if (!this.worker || !this.workerReady) {
            return;
        }
        try {
            this.worker.postMessage(message);
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to post message:', error);
        }
    }
    /**
     * Get element bounds relative to viewport
     */
    getElementBounds(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + window.scrollY,
            right: rect.right + window.scrollX,
        };
    }
    /**
     * Debug logging
     */
    log(message, data) {
        if (this.config.debugLogging) {
            console.log(`[ConfidenceWorkerManager] ${message}`, data || '');
        }
    }
}
