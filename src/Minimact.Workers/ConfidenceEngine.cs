using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Minimact.Workers
{
    /// <summary>
    /// Interface for web worker message posting
    /// </summary>
    public interface IWorkerMessageSender
    {
        void PostMessage(object message);
    }

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
        private Map<string, ObservableElement> observableElements; // elementId -> element
        private Map<string, double> predictionThrottle; // elementId -> last prediction time
        private double currentScrollY = 0;
        private IWorkerMessageSender messageSender;

        public ConfidenceEngine(ConfidenceEngineConfig config = null, IWorkerMessageSender messageSender = null)
        {
            this.config = config ?? DefaultConfig.DEFAULT_CONFIG;
            this.messageSender = messageSender;
            this.mouseTracker = new MouseTrajectoryTracker(this.config);
            this.scrollTracker = new ScrollVelocityTracker(this.config);
            this.focusTracker = new FocusSequenceTracker(this.config);
            this.observableElements = new Map<string, ObservableElement>();
            this.predictionThrottle = new Map<string, double>();

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
            // Extract message type (compatible with Bridge.NET Script.Get approach)
            var messageType = GetMessageType(message);

            // Use transpiler-friendly switch helper
            MessageTypeSwitch.Handle(message, messageType,
                handleMouseMove: this.HandleMouseMove,
                handleScroll: this.HandleScroll,
                handleFocus: this.HandleFocus,
                handleKeydown: this.HandleKeydown,
                handleRegisterElement: this.RegisterElement,
                handleUpdateBounds: this.UpdateBounds,
                handleUnregisterElement: this.UnregisterElement,
                handleUnknown: (msg) => this.Debug("Unknown message type", msg)
            );
        }

        /// <summary>
        /// Extract message type from dynamic object (for web worker compatibility)
        /// </summary>
        private string GetMessageType(object message)
        {
            // In Bridge.NET, this would be Script.Get(message, "type")
            // For pure C#, we need to handle dynamic property access
            if (message is IDictionary<string, object> dict)
            {
                return dict.TryGetValue("type", out var type) ? type?.ToString() : null;
            }

            // Use reflection as fallback for dynamic objects
            var typeProperty = message.GetType().GetProperty("Type") ?? message.GetType().GetProperty("type");
            return typeProperty?.GetValue(message)?.ToString();
        }

        /// <summary>
        /// Handle mouse move event
        /// </summary>
        private void HandleMouseMove(MouseEventData eventData)
        {
            // Track movement
            this.mouseTracker.TrackMove(eventData);

            // Check all observable elements for hover predictions
            foreach (var entry in this.observableElements)
            {
                string elementId = entry.Key;
                ObservableElement element = entry.Value;

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

                    this.predictionThrottle.Set(elementId, eventData.Timestamp);
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
            foreach (var entry in this.observableElements)
            {
                string elementId = entry.Key;
                ObservableElement element = entry.Value;

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

                    this.predictionThrottle.Set(elementId, eventData.Timestamp);
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
                    if (this.observableElements.Has(prediction.ElementId))
                    {
                        ObservableElement element = this.observableElements.Get(prediction.ElementId);
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
            this.observableElements.Set(message.ElementId, new ObservableElement
            {
                ComponentId = message.ComponentId,
                ElementId = message.ElementId,
                Bounds = message.Bounds,
                Observables = message.Observables
            });

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
            if (this.observableElements.Has(message.ElementId))
            {
                ObservableElement element = this.observableElements.Get(message.ElementId);
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
            this.observableElements.Delete(message.ElementId);
            this.predictionThrottle.Delete(message.ElementId);
            this.Debug("Unregistered element", new { elementId = message.ElementId });
        }

        /// <summary>
        /// Check if we can make a prediction for this element (throttling)
        /// </summary>
        private bool CanPredict(string elementId)
        {
            if (!this.predictionThrottle.Has(elementId))
                return true;

            double lastTime = this.predictionThrottle.Get(elementId);
            double now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            double timeSince = now - lastTime;

            return timeSince >= this.config.PredictionWindowMs;
        }

        /// <summary>
        /// Send prediction request to main thread
        /// </summary>
        private void SendPrediction(PredictionRequestMessage message)
        {
            this.messageSender?.PostMessage(message);

            if (this.config.DebugLogging)
            {
                this.Debug("Prediction request", new
                {
                    elementId = message.ElementId,
                    confidence = $"{(message.Confidence * 100):F0}%",
                    leadTime = $"{message.LeadTime:F0}ms",
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
                this.messageSender?.PostMessage(new DebugMessage
                {
                    Type = "debug",
                    Message = $"[ConfidenceEngine] {message}",
                    Data = data
                });
            }
        }
    }

    /// <summary>
    /// Factory for creating confidence engine instances
    /// </summary>
    public static class ConfidenceEngineFactory
    {
        /// <summary>
        /// Create a confidence engine with a message sender
        /// </summary>
        public static ConfidenceEngine Create(ConfidenceEngineConfig config = null, IWorkerMessageSender messageSender = null)
        {
            return new ConfidenceEngine(config, messageSender);
        }
    }
}