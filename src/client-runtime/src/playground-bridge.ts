/**
 * Bridge for communicating prediction events to playground parent window
 * Emits postMessage events that the React playground can listen to
 */
export class PlaygroundBridge {
  private debugLogging: boolean;

  constructor(options: { debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Notify that a prediction was received from server
   */
  predictionReceived(data: {
    componentId: string;
    hintId: string;
    patchCount: number;
    confidence: number;
  }): void {
    this.postMessage({
      type: 'minimact:prediction-received',
      data
    });

    this.log('Prediction received', data);
  }

  /**
   * Notify that a cache hit occurred (instant patch application)
   */
  cacheHit(data: {
    componentId: string;
    hintId: string;
    latency: number;
    confidence: number;
    patchCount: number;
  }): void {
    this.postMessage({
      type: 'minimact:cache-hit',
      data: {
        ...data,
        cacheHit: true,
        elapsedMs: data.latency
      }
    });

    this.log('🟢 CACHE HIT', data);
  }

  /**
   * Notify that a cache miss occurred (had to compute on server)
   */
  cacheMiss(data: {
    componentId: string;
    methodName: string;
    latency: number;
    patchCount: number;
  }): void {
    this.postMessage({
      type: 'minimact:cache-miss',
      data: {
        ...data,
        cacheHit: false,
        elapsedMs: data.latency,
        predictionConfidence: 0
      }
    });

    this.log('🔴 CACHE MISS', data);
  }

  /**
   * Notify that a correction was applied (prediction was wrong)
   */
  correctionApplied(data: {
    componentId: string;
    patchCount: number;
  }): void {
    this.postMessage({
      type: 'minimact:correction',
      data
    });

    this.log('Correction applied (prediction was incorrect)', data);
  }

  /**
   * Post message to parent window (for iframe communication)
   */
  private postMessage(message: any): void {
    // Check if we're in an iframe
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    // Also dispatch as custom event for same-window listeners
    window.dispatchEvent(new CustomEvent(message.type, { detail: message.data }));
  }

  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact PlaygroundBridge] ${message}`, data || '');
    }
  }
}
