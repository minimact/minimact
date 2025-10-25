import {
    ConfidenceEngineConfig,
    FocusEventData,
    KeydownEventData,
} from './confidence-types';

// Namespace: Minimact.Workers

export class FocusSequenceTracker {
    private focusSequence: string[];
    private currentFocusIndex: number;
    private lastTabPressTime: number;
    private config: ConfidenceEngineConfig;
    constructor(config: ConfidenceEngineConfig) {
        this.config = config;
    }

    trackFocus(eventData: FocusEventData): void {
        const elementId: string = eventData.elementId;
        const existingIndex: number = Array.indexOf(this.focusSequence, elementId);
        if (existingIndex != -1) {
            this.currentFocusIndex = existingIndex;
        } else {
            const newSequence: string[] = new Array<string>(this.focusSequence.length + 1);
            Array.copy(this.focusSequence, newSequence, this.focusSequence.length);
            newSequence[this.focusSequence.length] = elementId;
            this.focusSequence = newSequence;
            this.currentFocusIndex = this.focusSequence.length - 1;
        }
    }

    trackKeydown(eventData: KeydownEventData): void {
        if (eventData.key == "Tab") {
            this.lastTabPressTime = eventData.timestamp;
        }
    }

    registerFocusSequence(elementIds: string[]): void {
        this.focusSequence = elementIds;
    }

    export class FocusConfidenceResult {
        confidence: number;
        leadTime: number;
        reason: string;
    }

    calculateFocusConfidence(elementId: string, currentTime: number): FocusConfidenceResult {
        const timeSinceTab: number = currentTime - this.lastTabPressTime;
        if (timeSinceTab > 100) {
            return { confidence: 0, leadTime: 0, reason: "no recent Tab press" };
        }
        if (this.focusSequence.length == 0 || this.currentFocusIndex == -1) {
            return { confidence: 0, leadTime: 0, reason: "no focus sequence data" };
        }
        const nextIndex: number = (this.currentFocusIndex + 1) % this.focusSequence.length;
        const nextElementId: string = this.focusSequence[nextIndex];
        if (nextElementId == elementId) {
            return { confidence: this.config.focusHighConfidence, leadTime: 50, reason: `Tab pressed, next in sequence (index ${nextIndex})` };
        }
        return { confidence: 0, leadTime: 0, reason: "not next in sequence" };
    }

    export class FocusPredictionResult {
        elementId: string;
        confidence: number;
        leadTime: number;
        reason: string;
    }

    predictNextFocus(): FocusPredictionResult {
        if (this.focusSequence.length == 0 || this.currentFocusIndex == -1) {
            return { elementId: null, confidence: 0, leadTime: 0, reason: "no focus sequence" };
        }
        const nextIndex: number = (this.currentFocusIndex + 1) % this.focusSequence.length;
        const nextElementId: string = this.focusSequence[nextIndex];
        return { elementId: nextElementId, confidence: this.config.focusHighConfidence, leadTime: 50, reason: `Tab navigation to index ${nextIndex}` };
    }

    clear(): void {
        this.focusSequence = new Array<string>(0);
        this.currentFocusIndex = -1;
        this.lastTabPressTime = 0;
    }

}

