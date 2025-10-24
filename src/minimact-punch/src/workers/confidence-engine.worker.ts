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

import {
  WorkerInputMessage,
  WorkerOutputMessage,
  PredictionRequestMessage,
  ObservableElement,
  ConfidenceEngineConfig,
  DEFAULT_CONFIG,
  MouseEventData,
  ScrollEventData,
  FocusEventData,
  KeydownEventData,
  RegisterElementMessage,
  UpdateBoundsMessage,
  UnregisterElementMessage,
} from './confidence-types';
import { MouseTrajectoryTracker } from './mouse-trajectory-tracker';
import { ScrollVelocityTracker } from './scroll-velocity-tracker';
import { FocusSequenceTracker } from './focus-sequence-tracker';

/**
 * Main Confidence Engine
 */
class ConfidenceEngine {
  private config: ConfidenceEngineConfig;
  private mouseTracker: MouseTrajectoryTracker;
  private scrollTracker: ScrollVelocityTracker;
  private focusTracker: FocusSequenceTracker;
  private observableElements: Map<string, ObservableElement>; // elementId -> element
  private predictionThrottle: Map<string, number>; // elementId -> last prediction time
  private currentScrollY: number = 0;

  constructor(config: ConfidenceEngineConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.mouseTracker = new MouseTrajectoryTracker(config);
    this.scrollTracker = new ScrollVelocityTracker(config);
    this.focusTracker = new FocusSequenceTracker(config);
    this.observableElements = new Map();
    this.predictionThrottle = new Map();

    this.debug('Confidence Engine initialized', {
      minConfidence: config.minConfidence,
      mouseHistorySize: config.mouseHistorySize,
      scrollHistorySize: config.scrollHistorySize,
    });
  }

  /**
   * Handle incoming messages from main thread
   */
  handleMessage(message: WorkerInputMessage): void {
    switch (message.type) {
      case 'mousemove':
        this.handleMouseMove(message);
        break;

      case 'scroll':
        this.handleScroll(message);
        break;

      case 'focus':
        this.handleFocus(message);
        break;

      case 'keydown':
        this.handleKeydown(message);
        break;

      case 'registerElement':
        this.registerElement(message);
        break;

      case 'updateBounds':
        this.updateBounds(message);
        break;

      case 'unregisterElement':
        this.unregisterElement(message);
        break;

      default:
        this.debug('Unknown message type', message);
    }
  }

  /**
   * Handle mouse move event
   */
  private handleMouseMove(event: MouseEventData): void {
    // Track movement
    this.mouseTracker.trackMove(event);

    // Check all observable elements for hover predictions
    for (const [elementId, element] of this.observableElements) {
      if (!element.observables.hover) continue;

      // Check throttle
      if (!this.canPredict(elementId)) continue;

      const result = this.mouseTracker.calculateHoverConfidence(element.bounds);

      if (result.confidence >= this.config.minConfidence) {
        this.sendPrediction({
          componentId: element.componentId,
          elementId,
          observation: { hover: true },
          confidence: result.confidence,
          leadTime: result.leadTime,
          reason: result.reason,
        });

        this.predictionThrottle.set(elementId, event.timestamp);
      }
    }
  }

  /**
   * Handle scroll event
   */
  private handleScroll(event: ScrollEventData): void {
    // Track scroll
    this.scrollTracker.trackScroll(event);
    this.currentScrollY = event.scrollY;

    // Check all observable elements for intersection predictions
    for (const [elementId, element] of this.observableElements) {
      if (!element.observables.intersection) continue;

      // Check throttle
      if (!this.canPredict(elementId)) continue;

      const result = this.scrollTracker.calculateIntersectionConfidence(
        element.bounds,
        event.scrollY
      );

      if (result.confidence >= this.config.minConfidence) {
        this.sendPrediction({
          componentId: element.componentId,
          elementId,
          observation: { isIntersecting: true },
          confidence: result.confidence,
          leadTime: result.leadTime,
          reason: result.reason,
        });

        this.predictionThrottle.set(elementId, event.timestamp);
      }
    }
  }

  /**
   * Handle focus event
   */
  private handleFocus(event: FocusEventData): void {
    this.focusTracker.trackFocus(event);
  }

  /**
   * Handle keydown event
   */
  private handleKeydown(event: KeydownEventData): void {
    this.focusTracker.trackKeydown(event);

    // If Tab was pressed, predict next focus immediately
    if (event.key === 'Tab') {
      const prediction = this.focusTracker.predictNextFocus();

      if (prediction.elementId && prediction.confidence >= this.config.minConfidence) {
        const element = this.observableElements.get(prediction.elementId);
        if (element && element.observables.focus) {
          this.sendPrediction({
            componentId: element.componentId,
            elementId: prediction.elementId,
            observation: { focus: true },
            confidence: prediction.confidence,
            leadTime: prediction.leadTime,
            reason: prediction.reason,
          });
        }
      }
    }
  }

  /**
   * Register an observable element
   */
  private registerElement(message: RegisterElementMessage): void {
    this.observableElements.set(message.elementId, {
      componentId: message.componentId,
      elementId: message.elementId,
      bounds: message.bounds,
      observables: message.observables,
    });

    this.debug('Registered element', {
      elementId: message.elementId,
      observables: message.observables,
    });
  }

  /**
   * Update element bounds
   */
  private updateBounds(message: UpdateBoundsMessage): void {
    const element = this.observableElements.get(message.elementId);
    if (element) {
      element.bounds = message.bounds;
    }
  }

  /**
   * Unregister an element
   */
  private unregisterElement(message: UnregisterElementMessage): void {
    this.observableElements.delete(message.elementId);
    this.predictionThrottle.delete(message.elementId);
    this.debug('Unregistered element', { elementId: message.elementId });
  }

  /**
   * Check if we can make a prediction for this element (throttling)
   */
  private canPredict(elementId: string): boolean {
    const lastTime = this.predictionThrottle.get(elementId);
    if (!lastTime) return true;

    const now = performance.now();
    const timeSince = now - lastTime;

    return timeSince >= this.config.predictionWindowMs;
  }

  /**
   * Send prediction request to main thread
   */
  private sendPrediction(data: Omit<PredictionRequestMessage, 'type'>): void {
    const message: PredictionRequestMessage = {
      type: 'requestPrediction',
      ...data,
    };

    postMessage(message);

    if (this.config.debugLogging) {
      this.debug('Prediction request', {
        elementId: data.elementId,
        confidence: `${(data.confidence * 100).toFixed(0)}%`,
        leadTime: `${data.leadTime.toFixed(0)}ms`,
        reason: data.reason,
      });
    }
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: any): void {
    if (this.config.debugLogging) {
      postMessage({
        type: 'debug',
        message: `[ConfidenceEngine] ${message}`,
        data,
      });
    }
  }
}

// Initialize worker
const engine = new ConfidenceEngine();

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerInputMessage>) => {
  engine.handleMessage(event.data);
});

// Export for testing (won't be available in worker context)
export { ConfidenceEngine };
