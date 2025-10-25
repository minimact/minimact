using System;
using Bridge;

namespace Minimact.Workers
{
    /// <summary>
    /// Scroll Velocity Tracker
    ///
    /// Tracks scroll events and predicts when elements will enter the viewport
    /// based on scroll velocity and deceleration patterns.
    /// </summary>
    public class ScrollVelocityTracker
    {
        /// <summary>
        /// Scroll point for history tracking
        /// </summary>
        [ObjectLiteral]
        public class ScrollPoint
        {
            public double ScrollX { get; set; }
            public double ScrollY { get; set; }
            public double Timestamp { get; set; }
        }

        private CircularBuffer<ScrollPoint> scrollHistory;
        private ConfidenceEngineConfig config;
        private double viewportWidth = 0;
        private double viewportHeight = 0;

        public ScrollVelocityTracker(ConfidenceEngineConfig config)
        {
            this.config = config;
            this.scrollHistory = new CircularBuffer<ScrollPoint>(config.ScrollHistorySize);
        }

        /// <summary>
        /// Record a scroll event
        /// </summary>
        public void TrackScroll(ScrollEventData eventData)
        {
            this.viewportWidth = eventData.ViewportWidth;
            this.viewportHeight = eventData.ViewportHeight;

            this.scrollHistory.Push(new ScrollPoint
            {
                ScrollX = eventData.ScrollX,
                ScrollY = eventData.ScrollY,
                Timestamp = eventData.Timestamp
            });
        }

        /// <summary>
        /// Get current scroll velocity
        /// </summary>
        public ScrollVelocity GetVelocity()
        {
            ScrollPoint[] points = this.scrollHistory.GetLast(3);
            if (points.Length < 2)
            {
                return null; // Not enough data
            }

            ScrollPoint first = points[0];
            ScrollPoint last = points[points.Length - 1];
            double timeDelta = last.Timestamp - first.Timestamp;

            if (timeDelta == 0)
            {
                return null;
            }

            double dx = last.ScrollX - first.ScrollX;
            double dy = last.ScrollY - first.ScrollY;

            // Calculate velocity magnitude
            double distance = Math.Sqrt(dx * dx + dy * dy);
            double velocity = distance / timeDelta;

            // Determine primary direction
            string direction;
            if (Math.Abs(dy) > Math.Abs(dx))
            {
                direction = dy > 0 ? "down" : "up";
            }
            else if (Math.Abs(dx) > Math.Abs(dy))
            {
                direction = dx > 0 ? "right" : "left";
            }
            else
            {
                direction = "none";
            }

            // Calculate deceleration
            double deceleration = 0;
            if (points.Length >= 3)
            {
                int mid = (int)Math.Floor(points.Length / 2.0);
                ScrollPoint[] firstHalf = new ScrollPoint[mid];
                ScrollPoint[] secondHalf = new ScrollPoint[points.Length - mid];

                Array.Copy(points, 0, firstHalf, 0, mid);
                Array.Copy(points, mid, secondHalf, 0, points.Length - mid);

                double firstHalfVelocity = CalculateVelocity(firstHalf);
                double secondHalfVelocity = CalculateVelocity(secondHalf);
                deceleration = (firstHalfVelocity - secondHalfVelocity) / timeDelta;
            }

            return new ScrollVelocity
            {
                Velocity = velocity,
                Direction = direction,
                Deceleration = deceleration
            };
        }

        /// <summary>
        /// Intersection confidence result
        /// </summary>
        [ObjectLiteral]
        public class IntersectionConfidenceResult
        {
            public double Confidence { get; set; }
            public double LeadTime { get; set; }
            public string Reason { get; set; }
        }

        /// <summary>
        /// Calculate intersection confidence for an element
        ///
        /// Returns confidence [0-1] that element will enter viewport
        /// </summary>
        public IntersectionConfidenceResult CalculateIntersectionConfidence(Rect elementBounds, double currentScrollY)
        {
            ScrollVelocity velocity = GetVelocity();

            if (velocity == null)
            {
                return new IntersectionConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "no scroll data"
                };
            }

            // Not scrolling?
            if (velocity.Velocity < 0.01)
            {
                // 0.01 px/ms = 10 px/s
                return new IntersectionConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "not scrolling"
                };
            }

            // Calculate viewport bounds
            double viewportTop = currentScrollY;
            double viewportBottom = currentScrollY + this.viewportHeight;

            // Check if element is already in viewport
            if (elementBounds.Top < viewportBottom && elementBounds.Bottom > viewportTop)
            {
                return new IntersectionConfidenceResult
                {
                    Confidence = 1.0,
                    LeadTime = 0,
                    Reason = "already intersecting"
                };
            }

            // Element above viewport?
            if (elementBounds.Bottom < viewportTop)
            {
                // Only predict if scrolling up
                if (velocity.Direction != "up")
                {
                    return new IntersectionConfidenceResult
                    {
                        Confidence = 0,
                        LeadTime = 0,
                        Reason = "element above, not scrolling up"
                    };
                }

                double distance = viewportTop - elementBounds.Bottom;
                double timeToIntersect = distance / velocity.Velocity;

                if (timeToIntersect > this.config.IntersectionLeadTimeMax)
                {
                    return new IntersectionConfidenceResult
                    {
                        Confidence = 0,
                        LeadTime = timeToIntersect,
                        Reason = $"lead time {timeToIntersect.ToFixed(0)}ms too long"
                    };
                }

                return CalculateConfidenceFromDistance(distance, velocity, timeToIntersect);
            }

            // Element below viewport?
            if (elementBounds.Top > viewportBottom)
            {
                // Only predict if scrolling down
                if (velocity.Direction != "down")
                {
                    return new IntersectionConfidenceResult
                    {
                        Confidence = 0,
                        LeadTime = 0,
                        Reason = "element below, not scrolling down"
                    };
                }

                double distance = elementBounds.Top - viewportBottom;
                double timeToIntersect = distance / velocity.Velocity;

                if (timeToIntersect > this.config.IntersectionLeadTimeMax)
                {
                    return new IntersectionConfidenceResult
                    {
                        Confidence = 0,
                        LeadTime = timeToIntersect,
                        Reason = $"lead time {timeToIntersect.ToFixed(0)}ms too long"
                    };
                }

                return CalculateConfidenceFromDistance(distance, velocity, timeToIntersect);
            }

            return new IntersectionConfidenceResult
            {
                Confidence = 0,
                LeadTime = 0,
                Reason = "unknown state"
            };
        }

        /// <summary>
        /// Calculate confidence based on distance and velocity
        /// </summary>
        private IntersectionConfidenceResult CalculateConfidenceFromDistance(
            double distance,
            ScrollVelocity velocity,
            double timeToIntersect)
        {
            // Base confidence from distance (closer = higher)
            double distanceConfidence = Math.Max(0, 1 - distance / 1000); // 1000px = low confidence

            // Velocity confidence (moderate velocity = higher confidence)
            // Typical comfortable scroll: 0.5-1.5 px/ms (500-1500 px/s)
            double idealVelocity = 1.0;
            double velocityDiff = Math.Abs(velocity.Velocity - idealVelocity);
            double velocityConfidence = Math.Max(0, 1 - velocityDiff / idealVelocity);

            // Deceleration confidence (steady or accelerating = higher confidence)
            // Decelerating = user might stop before reaching element
            double decelerationConfidence = velocity.Deceleration <= 0 ? 1 : Math.Max(0, 1 - velocity.Deceleration / 0.001);

            // Time confidence (50-300ms window)
            double timeConfidence = timeToIntersect >= 50 && timeToIntersect <= 300
                ? 1
                : Math.Max(0, 1 - Math.Abs(timeToIntersect - 175) / 175);

            // Weighted combination
            double confidence =
                distanceConfidence * 0.3 +
                velocityConfidence * 0.2 +
                decelerationConfidence * 0.2 +
                timeConfidence * 0.3;

            return new IntersectionConfidenceResult
            {
                Confidence = confidence,
                LeadTime = timeToIntersect,
                Reason = $"scroll: {(confidence * 100).ToFixed(0)}% (dist: {distance.ToFixed(0)}px, vel: {velocity.Velocity.ToFixed(2)}, time: {timeToIntersect.ToFixed(0)}ms)"
            };
        }

        /// <summary>
        /// Calculate velocity from a set of scroll points
        /// </summary>
        private double CalculateVelocity(ScrollPoint[] points)
        {
            if (points.Length < 2) return 0;

            ScrollPoint first = points[0];
            ScrollPoint last = points[points.Length - 1];
            double timeDelta = last.Timestamp - first.Timestamp;

            if (timeDelta == 0) return 0;

            double dx = last.ScrollX - first.ScrollX;
            double dy = last.ScrollY - first.ScrollY;
            double distance = Math.Sqrt(dx * dx + dy * dy);

            return distance / timeDelta;
        }

        /// <summary>
        /// Clear history
        /// </summary>
        public void Clear()
        {
            this.scrollHistory.Clear();
        }
    }
}