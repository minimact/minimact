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

postMessage(message: any): void {
}

export class ConfidenceEngine {
    private config: ConfidenceEngineConfig;
    private mouseTracker: MouseTrajectoryTracker;
    private scrollTracker: ScrollVelocityTracker;
    private focusTracker: FocusSequenceTracker;
    private observableElements: Map<string, ObservableElement>;
    private predictionThrottle: Map<string, number>;
    private currentScrollY: number;
    private messageSender: IWorkerMessageSender;
    constructor(config: ConfidenceEngineConfig, messageSender: IWorkerMessageSender) {
        this.config = config ?? defaultConfig.dEFAULT_CONFIG;
        this.messageSender = messageSender;
        this.mouseTracker = new MouseTrajectoryTracker(this.config);
        this.scrollTracker = new ScrollVelocityTracker(this.config);
        this.focusTracker = new FocusSequenceTracker(this.config);
        this.observableElements = new Map<string, ObservableElement>();
        this.predictionThrottle = new Map<string, number>();
        this.debug("Confidence Engine initialized", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    handleMessage(message: any): void {
        const messageType = this.getMessageType(message);
        messageTypeSwitch.handle(message, messageType, this.handleMouseMove, this.handleScroll, this.handleFocus, this.handleKeydown, this.registerElement, this.updateBounds, this.unregisterElement, /* TODO: ParenthesizedLambdaExpressionSyntax */);
    }

    private getMessageType(message: any): string {
        if (/* TODO: IsPatternExpressionSyntax */) {
            return dict.get("type", /* TODO: DeclarationExpressionSyntax */) ? /* TODO: ConditionalAccessExpressionSyntax */ : null;
        }
        const typeProperty = message.getType().getProperty("Type") ?? message.getType().getProperty("type");
        return /* TODO: ConditionalAccessExpressionSyntax */;
    }

    private handleMouseMove(eventData: MouseEventData): void {
        this.mouseTracker.trackMove(eventData);
        for (const [key, value] of this.observableElements) {
            const elementId: string = key;
            const element: ObservableElement = value;
            if (element.observables.hover !== true) {
                continue;
            }
            if (!this.canPredict(elementId)) {
                continue;
            }
            const result = this.mouseTracker.calculateHoverConfidence(element.bounds);
            if (result.confidence >= this.config.minConfidence) {
                this.sendPrediction({ componentId: element.componentId, elementId, observation: { hover: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason });
                this.predictionThrottle.set(elementId, eventData.timestamp);
            }
        }
    }

    private handleScroll(eventData: ScrollEventData): void {
        this.scrollTracker.trackScroll(eventData);
        this.currentScrollY = eventData.scrollY;
        for (const [key, value] of this.observableElements) {
            const elementId: string = key;
            const element: ObservableElement = value;
            if (element.observables.intersection !== true) {
                continue;
            }
            if (!this.canPredict(elementId)) {
                continue;
            }
            const result = this.scrollTracker.calculateIntersectionConfidence(element.bounds, eventData.scrollY);
            if (result.confidence >= this.config.minConfidence) {
                this.sendPrediction({ componentId: element.componentId, elementId, observation: { isIntersecting: true }, confidence: result.confidence, leadTime: result.leadTime, reason: result.reason });
                this.predictionThrottle.set(elementId, eventData.timestamp);
            }
        }
    }

    private handleFocus(eventData: FocusEventData): void {
        this.focusTracker.trackFocus(eventData);
    }

    private handleKeydown(eventData: KeydownEventData): void {
        this.focusTracker.trackKeydown(eventData);
        if (eventData.key === "Tab") {
            const prediction = this.focusTracker.predictNextFocus();
            if (prediction.elementId !== null && prediction.confidence >= this.config.minConfidence) {
                if (this.observableElements.has(prediction.elementId)) {
                    const element: ObservableElement = this.observableElements.get(prediction.elementId);
                    if (element !== null && element.observables.focus === true) {
                        this.sendPrediction({ componentId: element.componentId, elementId: prediction.elementId, observation: { focus: true }, confidence: prediction.confidence, leadTime: prediction.leadTime, reason: prediction.reason });
                    }
                }
            }
        }
    }

    private registerElement(message: RegisterElementMessage): void {
        this.observableElements.set(message.elementId, { componentId: message.componentId, elementId: message.elementId, bounds: message.bounds, observables: message.observables });
        this.debug("Registered element", /* TODO: AnonymousObjectCreationExpressionSyntax */);
    }

    private updateBounds(message: UpdateBoundsMessage): void {
        if (this.observableElements.has(message.elementId)) {
            const element: ObservableElement = this.observableElements.get(message.elementId);
            if (element !== null) {
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
        const lastTime: number = this.predictionThrottle.get(elementId);
        const now: number = dateTimeOffset.utcNow.toUnixTimeMilliseconds();
        const timeSince: number = now - lastTime;
        return timeSince >= this.config.predictionWindowMs;
    }

    private sendPrediction(message: PredictionRequestMessage): void {
        /* TODO: ConditionalAccessExpressionSyntax */;
        if (this.config.debugLogging) {
            this.debug("Prediction request", /* TODO: AnonymousObjectCreationExpressionSyntax */);
        }
    }

    private debug(message: string, data: any): void {
        if (this.config.debugLogging) {
            /* TODO: ConditionalAccessExpressionSyntax */;
        }
    }

}

export class ConfidenceEngineFactory {
    static create(config: ConfidenceEngineConfig, messageSender: IWorkerMessageSender): ConfidenceEngine {
        return new ConfidenceEngine(config, messageSender);
    }

}

