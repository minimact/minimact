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
        let messageType: var = script.get(message, "type");
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
        let elementId: string = kvp.key;
        let element: ObservableElement = kvp.value;
        if (element.observables.hover != true) {
        }
        if (!this.canPredict(elementId)) {
        }
        let result: var = this.mouseTracker.calculateHoverConfidence(element.bounds);
        if (result.confidence >= this.config.minConfidence) {
            this.sendPrediction(Object.assign(new PredictionRequestMessage(), { componentId: element.componentId, elementId: elementId, observation: { hover: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason }));
            this.predictionThrottle[elementId] = eventData.timestamp;
        }
    }

    private handleScroll(eventData: ScrollEventData): void {
        this.scrollTracker.trackScroll(eventData);
        this.currentScrollY = eventData.scrollY;
        let elementId: string = kvp.key;
        let element: ObservableElement = kvp.value;
        if (element.observables.intersection != true) {
        }
        if (!this.canPredict(elementId)) {
        }
        let result: var = this.scrollTracker.calculateIntersectionConfidence(element.bounds, eventData.scrollY);
        if (result.confidence >= this.config.minConfidence) {
            this.sendPrediction(Object.assign(new PredictionRequestMessage(), { componentId: element.componentId, elementId: elementId, observation: { isIntersecting: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason }));
            this.predictionThrottle[elementId] = eventData.timestamp;
        }
    }

    private handleFocus(eventData: FocusEventData): void {
        this.focusTracker.trackFocus(eventData);
    }

    private handleKeydown(eventData: KeydownEventData): void {
        this.focusTracker.trackKeydown(eventData);
        if (eventData.key == "Tab") {
            let prediction: var = this.focusTracker.predictNextFocus();
            if (prediction.elementId != null && prediction.confidence >= this.config.minConfidence) {
                if (this.observableElements.containsKey(prediction.elementId)) {
                    let element: ObservableElement = this.observableElements[prediction.elementId];
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
        if (this.observableElements.containsKey(message.elementId)) {
            let element: ObservableElement = this.observableElements[message.elementId];
            if (element != null) {
                element.bounds = message.bounds;
            }
        }
    }

    private unregisterElement(message: UnregisterElementMessage): void {
        this.observableElements.remove(message.elementId);
        this.predictionThrottle.remove(message.elementId);
        this.debug("Unregistered element", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    private canPredict(elementId: string): boolean {
        if (!this.predictionThrottle.containsKey(elementId)) {
            return true;
        }
        let lastTime: number = this.predictionThrottle[elementId];
        let now: number = global.performance.now();
        let timeSince: number = now - lastTime;
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

