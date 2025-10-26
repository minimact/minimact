import { Patch } from './types';
import { TemplateRenderer } from './template-renderer';

/**
 * Queued hint with pre-computed patches
 */
interface QueuedHint {
  hintId: string;
  componentId: string;
  patches: Patch[];
  confidence: number;
  predictedState: Record<string, any>;
  queuedAt: number;
  /** True if this hint contains template patches (for statistics) */
  isTemplate?: boolean;
}

/**
 * Manages hint queue for usePredictHint
 * Stores pre-computed patches and applies them when state changes match
 */
export class HintQueue {
  private hints: Map<string, QueuedHint> = new Map();
  private debugLogging: boolean;
  private maxHintAge: number = 5000; // 5 seconds TTL

  constructor(options: { debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Queue a hint from the server
   */
  queueHint(data: {
    componentId: string;
    hintId: string;
    patches: Patch[];
    confidence: number;
    predictedState: Record<string, any>;
  }): void {
    const key = `${data.componentId}:${data.hintId}`;

    // Check if this hint contains template patches
    const isTemplate = data.patches.some(patch => TemplateRenderer.isTemplatePatch(patch));

    this.hints.set(key, {
      ...data,
      queuedAt: Date.now(),
      isTemplate
    });

    const patchType = isTemplate ? '📐 TEMPLATE' : '📄 CONCRETE';
    this.log(`${patchType} hint '${data.hintId}' queued for ${data.componentId}`, data);

    // Auto-expire old hints
    this.cleanupStaleHints();
  }

  /**
   * Check if a state change matches any queued hint
   * Returns patches if match found, null otherwise
   */
  matchHint(componentId: string, stateChanges: Record<string, any>): {
    hintId: string;
    patches: Patch[];
    confidence: number;
  } | null {
    // Find hints for this component
    const componentHints = Array.from(this.hints.entries())
      .filter(([key]) => key.startsWith(`${componentId}:`))
      .map(([, hint]) => hint);

    // Check each hint to see if it matches the state change
    for (const hint of componentHints) {
      if (this.stateMatches(hint.predictedState, stateChanges)) {
        const patchType = hint.isTemplate ? '📐 TEMPLATE' : '📄 CONCRETE';
        this.log(`${patchType} hint '${hint.hintId}' matched!`, { hint, stateChanges });

        // Remove from queue
        const key = `${componentId}:${hint.hintId}`;
        this.hints.delete(key);

        // Materialize template patches with current state values
        const materializedPatches = TemplateRenderer.materializePatches(
          hint.patches,
          stateChanges
        );

        return {
          hintId: hint.hintId,
          patches: materializedPatches,
          confidence: hint.confidence
        };
      }
    }

    return null;
  }

  /**
   * Check if predicted state matches actual state change
   */
  private stateMatches(predicted: Record<string, any>, actual: Record<string, any>): boolean {
    // Check if all predicted keys match actual values
    for (const [key, predictedValue] of Object.entries(predicted)) {
      if (!(key in actual)) {
        return false; // Key not in actual change
      }

      // Deep equality check (simplified - could use lodash.isEqual in production)
      if (JSON.stringify(actual[key]) !== JSON.stringify(predictedValue)) {
        return false; // Value doesn't match
      }
    }

    return true;
  }

  /**
   * Remove hints older than maxHintAge
   */
  private cleanupStaleHints(): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    for (const [key, hint] of this.hints.entries()) {
      if (now - hint.queuedAt > this.maxHintAge) {
        staleKeys.push(key);
      }
    }

    if (staleKeys.length > 0) {
      this.log(`Removing ${staleKeys.length} stale hint(s)`, staleKeys);
      for (const key of staleKeys) {
        this.hints.delete(key);
      }
    }
  }

  /**
   * Clear all hints for a component
   */
  clearComponent(componentId: string): void {
    const keysToRemove = Array.from(this.hints.keys())
      .filter(key => key.startsWith(`${componentId}:`));

    for (const key of keysToRemove) {
      this.hints.delete(key);
    }

    if (keysToRemove.length > 0) {
      this.log(`Cleared ${keysToRemove.length} hint(s) for component ${componentId}`);
    }
  }

  /**
   * Clear all hints
   */
  clearAll(): void {
    this.hints.clear();
    this.log('Cleared all hints');
  }

  /**
   * Get stats about queued hints
   */
  getStats() {
    const allHints = Array.from(this.hints.values());
    const templateHints = allHints.filter(h => h.isTemplate);
    const concreteHints = allHints.filter(h => !h.isTemplate);

    return {
      totalHints: this.hints.size,
      templateHints: templateHints.length,
      concreteHints: concreteHints.length,
      templatePercentage: this.hints.size > 0
        ? Math.round((templateHints.length / this.hints.size) * 100)
        : 0,
      hintsByComponent: allHints.reduce((acc, hint) => {
        acc[hint.componentId] = (acc[hint.componentId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private log(message: string, ...args: any[]): void {
    if (this.debugLogging) {
      console.log(`[Minimact HintQueue] ${message}`, ...args);
    }
  }
}
