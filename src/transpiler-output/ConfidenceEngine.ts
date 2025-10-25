import {
    ConfidenceEngineConfig,
    DebugMessage,
    FocusEventData,
    KeydownEventData,
    MouseEventData,
    ObservableElement,
    PredictionObservation,
    PredictionRequestMessage,
    RegisterElementMessage,
    ScrollEventData,
    UnregisterElementMessage,
    UpdateBoundsMessage,
} from './confidence-types';

// Namespace: Minimact.Workers

export class ConfidenceEngine {
    private config: ConfidenceEngineConfig;
    private mouseTracker: MouseTrajectoryTracker;
    private scrollTracker: ScrollVelocityTracker;
    private focusTracker: FocusSequenceTracker;
    private observableElements: Map<string, ObservableElement>;
    private predictionThrottle: Map<string, number>;
    private currentScrollY: number;
    constructor(config: ConfidenceEngineConfig) {
        this.config = config ?? defaultConfig.dEFAULT_CONFIG;
        this.mouseTracker = new MouseTrajectoryTracker(this.config);
        this.scrollTracker = new ScrollVelocityTracker(this.config);
        this.focusTracker = new FocusSequenceTracker(this.config);
        this.observableElements = new Map<string, ObservableElement>();
        this.predictionThrottle = new Map<string, number>();
        this.debug("Confidence Engine initialized", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    handleMessage(message: any): void {
        const messageType = script.get(message, "type");
        this.handleMouseMove(message.as());
        this.handleScroll(message.as());
        this.handleFocus(message.as());
        this.handleKeydown(message.as());
        this.registerElement(message.as());
        this.updateBounds(message.as());
        this.unregisterElement(message.as());
        this.debug("Unknown message type", message);
    }

    private handleMouseMove(eventData: MouseEventData): void {
        this.mouseTracker.trackMove(eventData);
        for (const [key, value] of this.observableElements) {
            const elementId: string = kvp.key;
            const element: ObservableElement = kvp.value;
            if (element.observables.hover != true) {
            }
            if (!this.canPredict(elementId)) {
            }
            const result = this.mouseTracker.calculateHoverConfidence(element.bounds);
            if (result.confidence >= this.config.minConfidence) {
                this.sendPrediction(Object.assign(new PredictionRequestMessage(), { componentId: element.componentId, elementId: elementId, observation: { hover: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason }));
                this.predictionThrottle[elementId] = eventData.timestamp;
            }
        }
    }

    private handleScroll(eventData: ScrollEventData): void {
        this.scrollTracker.trackScroll(eventData);
        this.currentScrollY = eventData.scrollY;
        for (const [key, value] of this.observableElements) {
            const elementId: string = kvp.key;
            const element: ObservableElement = kvp.value;
            if (element.observables.intersection != true) {
            }
            if (!this.canPredict(elementId)) {
            }
            const result = this.scrollTracker.calculateIntersectionConfidence(element.bounds, eventData.scrollY);
            if (result.confidence >= this.config.minConfidence) {
                this.sendPrediction(Object.assign(new PredictionRequestMessage(), { componentId: element.componentId, elementId: elementId, observation: { isIntersecting: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason }));
                this.predictionThrottle[elementId] = eventData.timestamp;
            }
        }
    }

    private handleFocus(eventData: FocusEventData): void {
        this.focusTracker.trackFocus(eventData);
    }

    private handleKeydown(eventData: KeydownEventData): void {
        this.focusTracker.trackKeydown(eventData);
        if (eventData.key == "Tab") {
            const prediction = this.focusTracker.predictNextFocus();
            if (prediction.elementId != null && prediction.confidence >= this.config.minConfidence) {
                if (this.observableElements.has(prediction.elementId)) {
                    const element: ObservableElement = this.observableElements[prediction.elementId];
                    if (element != null && element.observables.focus == true) {
                        this.sendPrediction(Object.assign(new PredictionRequestMessage(), { componentId: element.componentId, elementId: prediction.elementId, observation: { focus: true }, confidence: prediction.confidence, leadTime: prediction.leadTime, reason: prediction.reason }));
                    }
                }
            }
        }
    }

    private registerElement(message: RegisterElementMessage): void {
        this.observableElements[message.elementId] = Object.assign(new ObservableElement(), { componentId: message.componentId, elementId: message.elementId, bounds: message.bounds, observables: message.observables });
        this.debug("Registered element", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    private updateBounds(message: UpdateBoundsMessage): void {
        if (this.observableElements.has(message.elementId)) {
            const element: ObservableElement = this.observableElements[message.elementId];
            if (element != null) {
                element.bounds = message.bounds;
            }
        }
    }

    private unregisterElement(message: UnregisterElementMessage): void {
        this.observableElements.delete(message.elementId);
        this.predictionThrottle.delete(message.elementId);
        this.debug("Unregistered element", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    private canPredict(elementId: string): boolean {
        if (!this.predictionThrottle.has(elementId)) {
            return true;
        }
        const lastTime: number = this.predictionThrottle[elementId];
        const now: number = global.performance.now();
        const timeSince: number = now - lastTime;
        return timeSince >= this.config.predictionWindowMs;
    }

    private sendPrediction(message: PredictionRequestMessage): void {
        script.call("postMessage", message);
        if (this.config.debugLogging) {
            this.debug("Prediction request", /* TODO: AnonymousObjectCreationExpressionSyntax */);
        }
    }

    private debug(message: string, data: any): void {
        if (this.config.debugLogging) {
            script.call("postMessage", Object.assign(new DebugMessage(), { type: "debug", message: `[ConfidenceEngine] ${message}`, data: data }));
        }
    }

}

export class ConfidenceEngineWorker {
    private engine: ConfidenceEngine;
    static main(): void {
        engine = new ConfidenceEngine();
        script.call("self.addEventListener", "message", new Action<MessageEvent>(/* TODO: ParenthesizedLambdaExpressionSyntax */));
    }

}

