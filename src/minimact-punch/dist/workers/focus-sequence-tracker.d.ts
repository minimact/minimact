/**
 * Focus Sequence Tracker
 *
 * Tracks focus events and Tab key presses to predict the next focused element
 * with very high confidence (Tab sequence is deterministic).
 */
import { FocusEventData, KeydownEventData, ConfidenceEngineConfig } from './confidence-types';
export declare class FocusSequenceTracker {
    private focusSequence;
    private currentFocusIndex;
    private lastTabPressTime;
    private config;
    constructor(config: ConfidenceEngineConfig);
    /**
     * Record a focus event
     */
    trackFocus(event: FocusEventData): void;
    /**
     * Record a keydown event
     */
    trackKeydown(event: KeydownEventData): void;
    /**
     * Register the focus sequence for elements
     * (Called when elements are registered with the worker)
     */
    registerFocusSequence(elementIds: string[]): void;
    /**
     * Calculate focus confidence for an element
     *
     * Returns confidence [0-1] that element will receive focus
     */
    calculateFocusConfidence(elementId: string, currentTime: number): {
        confidence: number;
        leadTime: number;
        reason: string;
    };
    /**
     * Calculate focus confidence when Tab is pressed
     * (More proactive - predicts immediately on Tab)
     */
    predictNextFocus(): {
        elementId: string | null;
        confidence: number;
        leadTime: number;
        reason: string;
    };
    /**
     * Clear history
     */
    clear(): void;
}
//# sourceMappingURL=focus-sequence-tracker.d.ts.map