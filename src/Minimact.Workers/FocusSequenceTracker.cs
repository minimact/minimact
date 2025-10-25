using System;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.Workers
{
    /// <summary>
    /// Focus Sequence Tracker
    ///
    /// Tracks focus events and Tab key presses to predict the next focused element
    /// with very high confidence (Tab sequence is deterministic).
    /// </summary>
    public class FocusSequenceTracker
    {
        private string[] focusSequence = new string[0]; // Ordered list of focusable element IDs
        private int currentFocusIndex = -1;
        private double lastTabPressTime = 0;
        private ConfidenceEngineConfig config;

        public FocusSequenceTracker(ConfidenceEngineConfig config)
        {
            this.config = config;
        }

        /// <summary>
        /// Record a focus event
        /// </summary>
        public void TrackFocus(FocusEventData eventData)
        {
            string elementId = eventData.ElementId;

            // Update focus sequence
            int existingIndex = Array.IndexOf(this.focusSequence, elementId);
            if (existingIndex != -1)
            {
                this.currentFocusIndex = existingIndex;
            }
            else
            {
                // New element in sequence
                string[] newSequence = new string[this.focusSequence.Length + 1];
                Array.Copy(this.focusSequence, newSequence, this.focusSequence.Length);
                newSequence[this.focusSequence.Length] = elementId;
                this.focusSequence = newSequence;
                this.currentFocusIndex = this.focusSequence.Length - 1;
            }
        }

        /// <summary>
        /// Record a keydown event
        /// </summary>
        public void TrackKeydown(KeydownEventData eventData)
        {
            if (eventData.Key == "Tab")
            {
                this.lastTabPressTime = eventData.Timestamp;
            }
        }

        /// <summary>
        /// Register the focus sequence for elements
        /// (Called when elements are registered with the worker)
        /// </summary>
        public void RegisterFocusSequence(string[] elementIds)
        {
            this.focusSequence = elementIds;
        }

        /// <summary>
        /// Focus confidence result
        /// </summary>
        public class FocusConfidenceResult
        {
            public double Confidence { get; set; }
            public double LeadTime { get; set; }
            public string Reason { get; set; }
        }

        /// <summary>
        /// Calculate focus confidence for an element
        ///
        /// Returns confidence [0-1] that element will receive focus
        /// </summary>
        public FocusConfidenceResult CalculateFocusConfidence(string elementId, double currentTime)
        {
            // Was Tab pressed recently? (within 100ms)
            double timeSinceTab = currentTime - this.lastTabPressTime;
            if (timeSinceTab > 100)
            {
                return new FocusConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "no recent Tab press"
                };
            }

            // Do we know the focus sequence?
            if (this.focusSequence.Length == 0 || this.currentFocusIndex == -1)
            {
                return new FocusConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "no focus sequence data"
                };
            }

            // Calculate next focus index (forward)
            int nextIndex = (this.currentFocusIndex + 1) % this.focusSequence.Length;
            string nextElementId = this.focusSequence[nextIndex];

            // Is this element the next in sequence?
            if (nextElementId == elementId)
            {
                // Very high confidence - Tab sequence is deterministic
                return new FocusConfidenceResult
                {
                    Confidence = this.config.FocusHighConfidence, // 0.95
                    LeadTime = 50, // Very short lead time (~50ms for focus to occur)
                    Reason = $"Tab pressed, next in sequence (index {nextIndex})"
                };
            }

            // Check if Shift+Tab (backward navigation)
            // For now, assume forward Tab only
            // TODO: Track Shift key for backward navigation

            return new FocusConfidenceResult
            {
                Confidence = 0,
                LeadTime = 0,
                Reason = "not next in sequence"
            };
        }

        /// <summary>
        /// Focus prediction result
        /// </summary>
        public class FocusPredictionResult
        {
            public string ElementId { get; set; }
            public double Confidence { get; set; }
            public double LeadTime { get; set; }
            public string Reason { get; set; }
        }

        /// <summary>
        /// Calculate focus confidence when Tab is pressed
        /// (More proactive - predicts immediately on Tab)
        /// </summary>
        public FocusPredictionResult PredictNextFocus()
        {
            if (this.focusSequence.Length == 0 || this.currentFocusIndex == -1)
            {
                return new FocusPredictionResult
                {
                    ElementId = null,
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "no focus sequence"
                };
            }

            int nextIndex = (this.currentFocusIndex + 1) % this.focusSequence.Length;
            string nextElementId = this.focusSequence[nextIndex];

            return new FocusPredictionResult
            {
                ElementId = nextElementId,
                Confidence = this.config.FocusHighConfidence, // 0.95
                LeadTime = 50,
                Reason = $"Tab navigation to index {nextIndex}"
            };
        }

        /// <summary>
        /// Clear history
        /// </summary>
        public void Clear()
        {
            this.focusSequence = new string[0];
            this.currentFocusIndex = -1;
            this.lastTabPressTime = 0;
        }
    }
}