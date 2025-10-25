using System;
using System.Collections.Generic;
using Bridge;
using Bridge.Html5;

namespace Minimact.Workers
{
    /// <summary>
    /// Confidence Engine Web Worker
    ///
    /// Runs in a Web Worker (off main thread) to analyze user behavior and
    /// predict future DOM observations before they occur.
    ///
    /// Predictions:
    /// - Hover: Mouse trajectory analysis (50-300ms lead time)
    /// - Intersection: Scroll velocity analysis (up to 300ms lead time)
    /// - Focus: Tab sequence detection (50ms lead time)
    /// </summary>
    public class ConfidenceEngine
    {
        private ConfidenceEngineConfig config;
        private MouseTrajectoryTracker mouseTracker;
        private ScrollVelocityTracker scrollTracker;
        private FocusSequenceTracker focusTracker;
        private Dictionary<string, ObservableElement> observableElements; // elementId -> element
        private Dictionary<string, double> predictionThrottle; // elementId -> last prediction time
        private double currentScrollY = 0;

        public ConfidenceEngine(ConfidenceEngineConfig config = null)
        {
            this.config = config ?? DefaultConfig.DEFAULT_CONFIG;
            this.mouseTracker = new MouseTrajectoryTracker(this.config);
            this.scrollTracker = new ScrollVelocityTracker(this.config);
            this.focusTracker = new FocusSequenceTracker(this.config);
            this.observableElements = new Dictionary<string, ObservableElement>();
            this.predictionThrottle = new Dictionary<string, double>();

            this.Debug("Confidence Engine initialized", new
            {
                minConfidence = config?.MinConfidence ?? DefaultConfig.DEFAULT_CONFIG.MinConfidence,
                mouseHistorySize = config?.MouseHistorySize ?? DefaultConfig.DEFAULT_CONFIG.MouseHistorySize,
                scrollHistorySize = config?.ScrollHistorySize ?? DefaultConfig.DEFAULT_CONFIG.ScrollHistorySize
            });
        }

        /// <summary>
        /// Handle incoming messages from main thread
        /// </summary>
        public void HandleMessage(object message)
        {
            // In Bridge.NET, we need to handle dynamic message types
            var messageType = Script.Get(message, "type");

            switch (messageType)
            {
                case "mousemove":
                    this.HandleMouseMove(message.As<MouseEventData>());
                    break;

                case "scroll":
                    this.HandleScroll(message.As<ScrollEventData>());
                    break;

                case "focus":
                    this.HandleFocus(message.As<FocusEventData>());
                    break;

                case "keydown":
                    this.HandleKeydown(message.As<KeydownEventData>());
                    break;

                case "registerElement":
                    this.RegisterElement(message.As<RegisterElementMessage>());
                    break;

                case "updateBounds":
                    this.UpdateBounds(message.As<UpdateBoundsMessage>());
                    break;

                case "unregisterElement":
                    this.UnregisterElement(message.As<UnregisterElementMessage>());
                    break;

                default:
                    this.Debug("Unknown message type", message);
                    break;
            }
        }

        /// <summary>
        /// Handle mouse move event
        /// </summary>
        private void HandleMouseMove(MouseEventData eventData)
        {
            // Track movement
            this.mouseTracker.TrackMove(eventData);

            // Check all observable elements for hover predictions
            foreach (var kvp in this.observableElements)
            {
                string elementId = kvp.Key;
                ObservableElement element = kvp.Value;

                if (element.Observables.Hover != true) continue;

                // Check throttle
                if (!this.CanPredict(elementId)) continue;

                var result = this.mouseTracker.CalculateHoverConfidence(element.Bounds);

                if (result.Confidence >= this.config.MinConfidence)
                {
                    this.SendPrediction(new PredictionRequestMessage
                    {
                        ComponentId = element.ComponentId,
                        ElementId = elementId,
                        Observation = new PredictionObservation { Hover = true },
                        Confidence = result.Confidence,
                        LeadTime = result.LeadTime,
                        Reason = result.Reason
                    });

                    this.predictionThrottle[elementId] = eventData.Timestamp;
                }
            }
        }

        /// <summary>
        /// Handle scroll event
        /// </summary>
        private void HandleScroll(ScrollEventData eventData)
        {
            // Track scroll
            this.scrollTracker.TrackScroll(eventData);
            this.currentScrollY = eventData.ScrollY;

            // Check all observable elements for intersection predictions
            foreach (var kvp in this.observableElements)
            {
                string elementId = kvp.Key;
                ObservableElement element = kvp.Value;

                if (element.Observables.Intersection != true) continue;

                // Check throttle
                if (!this.CanPredict(elementId)) continue;

                var result = this.scrollTracker.CalculateIntersectionConfidence(
                    element.Bounds,
                    eventData.ScrollY
                );

                if (result.Confidence >= this.config.MinConfidence)
                {
                    this.SendPrediction(new PredictionRequestMessage
                    {
                        ComponentId = element.ComponentId,
                        ElementId = elementId,
                        Observation = new PredictionObservation { IsIntersecting = true },
                        Confidence = result.Confidence,
                        LeadTime = result.LeadTime,
                        Reason = result.Reason
                    });

                    this.predictionThrottle[elementId] = eventData.Timestamp;
                }
            }
        }

        /// <summary>
        /// Handle focus event
        /// </summary>
        private void HandleFocus(FocusEventData eventData)
        {
            this.focusTracker.TrackFocus(eventData);
        }

        /// <summary>
        /// Handle keydown event
        /// </summary>
        private void HandleKeydown(KeydownEventData eventData)
        {
            this.focusTracker.TrackKeydown(eventData);

            // If Tab was pressed, predict next focus immediately
            if (eventData.Key == "Tab")
            {
                var prediction = this.focusTracker.PredictNextFocus();

                if (prediction.ElementId != null && prediction.Confidence >= this.config.MinConfidence)
                {
                    if (this.observableElements.ContainsKey(prediction.ElementId))
                    {
                        ObservableElement element = this.observableElements[prediction.ElementId];
                        if (element != null && element.Observables.Focus == true)
                        {
                            this.SendPrediction(new PredictionRequestMessage
                            {
                                ComponentId = element.ComponentId,
                                ElementId = prediction.ElementId,
                                Observation = new PredictionObservation { Focus = true },
                                Confidence = prediction.Confidence,
                                LeadTime = prediction.LeadTime,
                                Reason = prediction.Reason
                            });
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Register an observable element
        /// </summary>
        private void RegisterElement(RegisterElementMessage message)
        {
            this.observableElements[message.ElementId] = new ObservableElement
            {
                ComponentId = message.ComponentId,
                ElementId = message.ElementId,
                Bounds = message.Bounds,
                Observables = message.Observables
            };

            this.Debug("Registered element", new
            {
                elementId = message.ElementId,
                observables = message.Observables
            });
        }

        /// <summary>
        /// Update element bounds
        /// </summary>
        private void UpdateBounds(UpdateBoundsMessage message)
        {
            if (this.observableElements.ContainsKey(message.ElementId))
            {
                ObservableElement element = this.observableElements[message.ElementId];
                if (element != null)
                {
                    element.Bounds = message.Bounds;
                }
            }
        }

        /// <summary>
        /// Unregister an element
        /// </summary>
        private void UnregisterElement(UnregisterElementMessage message)
        {
            this.observableElements.Remove(message.ElementId);
            this.predictionThrottle.Remove(message.ElementId);
            this.Debug("Unregistered element", new { elementId = message.ElementId });
        }

        /// <summary>
        /// Check if we can make a prediction for this element (throttling)
        /// </summary>
        private bool CanPredict(string elementId)
        {
            if (!this.predictionThrottle.ContainsKey(elementId))
                return true;

            double lastTime = this.predictionThrottle[elementId];
            double now = Global.Performance.Now();
            double timeSince = now - lastTime;

            return timeSince >= this.config.PredictionWindowMs;
        }

        /// <summary>
        /// Send prediction request to main thread
        /// </summary>
        private void SendPrediction(PredictionRequestMessage message)
        {
            // In Bridge.NET, postMessage is available through the global context
            Script.Call("postMessage", message);

            if (this.config.DebugLogging)
            {
                this.Debug("Prediction request", new
                {
                    elementId = message.ElementId,
                    confidence = $"{(message.Confidence * 100).ToFixed(0)}%",
                    leadTime = $"{message.LeadTime.ToFixed(0)}ms",
                    reason = message.Reason
                });
            }
        }

        /// <summary>
        /// Debug logging
        /// </summary>
        private void Debug(string message, object data = null)
        {
            if (this.config.DebugLogging)
            {
                Script.Call("postMessage", new DebugMessage
                {
                    Type = "debug",
                    Message = $"[ConfidenceEngine] {message}",
                    Data = data
                });
            }
        }
    }

    /// <summary>
    /// Worker entry point for Bridge.NET
    /// </summary>
    [FileName("confidence-engine.js")]
    public static class ConfidenceEngineWorker
    {
        private static ConfidenceEngine engine;

        [Ready]
        public static void Main()
        {
            // Initialize worker
            engine = new ConfidenceEngine();

            // Listen for messages from main thread
            Script.Call("self.addEventListener", "message", new Action<MessageEvent>((MessageEvent e) =>
            {
                engine.HandleMessage(e.Data);
            }));
        }
    }
}