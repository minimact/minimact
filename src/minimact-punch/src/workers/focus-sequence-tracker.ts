/**
 * Focus Sequence Tracker
 *
 * Tracks focus events and Tab key presses to predict the next focused element
 * with very high confidence (Tab sequence is deterministic).
 */

import {
  FocusEventData,
  KeydownEventData,
  ConfidenceEngineConfig,
} from './confidence-types';

export class FocusSequenceTracker {
  private focusSequence: string[] = []; // Ordered list of focusable element IDs
  private currentFocusIndex: number = -1;
  private lastTabPressTime: number = 0;
  private config: ConfidenceEngineConfig;

  constructor(config: ConfidenceEngineConfig) {
    this.config = config;
  }

  /**
   * Record a focus event
   */
  trackFocus(event: FocusEventData): void {
    const elementId = event.elementId;

    // Update focus sequence
    const existingIndex = this.focusSequence.indexOf(elementId);
    if (existingIndex !== -1) {
      this.currentFocusIndex = existingIndex;
    } else {
      // New element in sequence
      this.focusSequence.push(elementId);
      this.currentFocusIndex = this.focusSequence.length - 1;
    }
  }

  /**
   * Record a keydown event
   */
  trackKeydown(event: KeydownEventData): void {
    if (event.key === 'Tab') {
      this.lastTabPressTime = event.timestamp;
    }
  }

  /**
   * Register the focus sequence for elements
   * (Called when elements are registered with the worker)
   */
  registerFocusSequence(elementIds: string[]): void {
    this.focusSequence = elementIds;
  }

  /**
   * Calculate focus confidence for an element
   *
   * Returns confidence [0-1] that element will receive focus
   */
  calculateFocusConfidence(
    elementId: string,
    currentTime: number
  ): {
    confidence: number;
    leadTime: number;
    reason: string;
  } {
    // Was Tab pressed recently? (within 100ms)
    const timeSinceTab = currentTime - this.lastTabPressTime;
    if (timeSinceTab > 100) {
      return { confidence: 0, leadTime: 0, reason: 'no recent Tab press' };
    }

    // Do we know the focus sequence?
    if (this.focusSequence.length === 0 || this.currentFocusIndex === -1) {
      return { confidence: 0, leadTime: 0, reason: 'no focus sequence data' };
    }

    // Calculate next focus index (forward)
    const nextIndex = (this.currentFocusIndex + 1) % this.focusSequence.length;
    const nextElementId = this.focusSequence[nextIndex];

    // Is this element the next in sequence?
    if (nextElementId === elementId) {
      // Very high confidence - Tab sequence is deterministic
      return {
        confidence: this.config.focusHighConfidence, // 0.95
        leadTime: 50, // Very short lead time (~50ms for focus to occur)
        reason: `Tab pressed, next in sequence (index ${nextIndex})`,
      };
    }

    // Check if Shift+Tab (backward navigation)
    // For now, assume forward Tab only
    // TODO: Track Shift key for backward navigation

    return { confidence: 0, leadTime: 0, reason: 'not next in sequence' };
  }

  /**
   * Calculate focus confidence when Tab is pressed
   * (More proactive - predicts immediately on Tab)
   */
  predictNextFocus(): {
    elementId: string | null;
    confidence: number;
    leadTime: number;
    reason: string;
  } {
    if (this.focusSequence.length === 0 || this.currentFocusIndex === -1) {
      return {
        elementId: null,
        confidence: 0,
        leadTime: 0,
        reason: 'no focus sequence',
      };
    }

    const nextIndex = (this.currentFocusIndex + 1) % this.focusSequence.length;
    const nextElementId = this.focusSequence[nextIndex];

    return {
      elementId: nextElementId,
      confidence: this.config.focusHighConfidence, // 0.95
      leadTime: 50,
      reason: `Tab navigation to index ${nextIndex}`,
    };
  }

  /**
   * Clear history
   */
  clear(): void {
    this.focusSequence = [];
    this.currentFocusIndex = -1;
    this.lastTabPressTime = 0;
  }
}
