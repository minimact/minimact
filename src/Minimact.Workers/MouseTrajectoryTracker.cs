using System;
using Bridge;

namespace Minimact.Workers
{
    /// <summary>
    /// Mouse Trajectory Tracker
    ///
    /// Tracks mouse movement history and calculates trajectory, velocity, and
    /// predicts future intersection with elements.
    /// </summary>
    public class MouseTrajectoryTracker
    {
        private CircularBuffer<TrajectoryPoint> mouseHistory;
        private ConfidenceEngineConfig config;

        public MouseTrajectoryTracker(ConfidenceEngineConfig config)
        {
            this.config = config;
            this.mouseHistory = new CircularBuffer<TrajectoryPoint>(config.MouseHistorySize);
        }

        /// <summary>
        /// Record a mouse movement
        /// </summary>
        public void TrackMove(MouseEventData eventData)
        {
            this.mouseHistory.Push(new TrajectoryPoint
            {
                X = eventData.X,
                Y = eventData.Y,
                Timestamp = eventData.Timestamp
            });
        }

        /// <summary>
        /// Get current trajectory from recent mouse movements
        /// </summary>
        public MouseTrajectory GetTrajectory()
        {
            TrajectoryPoint[] points_const = this.mouseHistory.GetLast(5);
            if (points_const.Length < 2)
            {
                return null; // Not enough data
            }

            // Calculate velocity (pixels per millisecond)
            TrajectoryPoint first_const = points_const[0];
            TrajectoryPoint last_const = points_const[points_const.Length - 1];
            double timeDelta_const = last_const.Timestamp - first_const.Timestamp;

            if (timeDelta_const == 0)
            {
                return null;
            }

            double dx_const = last_const.X - first_const.X;
            double dy_const = last_const.Y - first_const.Y;
            double distance_const = Math.Sqrt(dx_const * dx_const + dy_const * dy_const);
            double velocity_const = distance_const / timeDelta_const;

            // Calculate angle (radians)
            double angle_const = Math.Atan2(dy_const, dx_const);

            // Calculate acceleration (change in velocity)
            double acceleration_let = 0;
            if (points_const.Length >= 4)
            {
                int mid_const = (int)Math.Floor(points_const.Length / 2.0);

                double firstHalfVelocity_const = CalculateVelocity(points_const.Slice_Array(0, mid_const));
                double secondHalfVelocity_const = CalculateVelocity(points_const.Slice_Array(mid_const));
                acceleration_let = (secondHalfVelocity_const - firstHalfVelocity_const) / timeDelta_const;
            }

            return new MouseTrajectory
            {
                Points = points_const,
                Velocity = velocity_const,
                Angle = angle_const,
                Acceleration = acceleration_let
            };
        }

        /// <summary>
        /// Hover confidence result
        /// </summary>
        [ObjectLiteral]
        public class HoverConfidenceResult
        {
            public double Confidence { get; set; }
            public double LeadTime { get; set; }
            public string Reason { get; set; }
        }

        /// <summary>
        /// Calculate hover confidence for an element
        ///
        /// Returns confidence [0-1] that mouse will hover element
        /// </summary>
        public HoverConfidenceResult CalculateHoverConfidence(Rect elementBounds)
        {
            MouseTrajectory trajectory = GetTrajectory();

            if (trajectory == null)
            {
                return new HoverConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "no trajectory data"
                };
            }

            // Get current mouse position
            TrajectoryPoint lastPoint = trajectory.Points[trajectory.Points.Length - 1];

            // Check if mouse is moving
            if (trajectory.Velocity < this.config.MinMouseVelocity)
            {
                return new HoverConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "mouse not moving"
                };
            }

            // Calculate ray intersection with element bounds
            RayIntersectionResult intersection = CalculateRayIntersection(lastPoint, trajectory.Angle, elementBounds);

            if (intersection == null)
            {
                return new HoverConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = 0,
                    Reason = "not in trajectory path"
                };
            }

            // Calculate time to intersection
            double timeToIntersect = intersection.Distance / trajectory.Velocity;

            // Outside acceptable lead time window?
            if (timeToIntersect < this.config.HoverLeadTimeMin ||
                timeToIntersect > this.config.HoverLeadTimeMax)
            {
                return new HoverConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = timeToIntersect,
                    Reason = $"lead time {timeToIntersect.ToFixed(0)}ms outside window"
                };
            }

            // Calculate angle to element center
            double elementCenterX = elementBounds.Left + elementBounds.Width / 2;
            double elementCenterY = elementBounds.Top + elementBounds.Height / 2;
            double angleToCenter = Math.Atan2(
                elementCenterY - lastPoint.Y,
                elementCenterX - lastPoint.X
            );
            double angleDiff = Math.Abs(trajectory.Angle - angleToCenter);
            double angleDiffDegrees = (angleDiff * 180) / Math.PI;

            // Check if trajectory is pointing toward element
            if (angleDiffDegrees > this.config.MaxTrajectoryAngle)
            {
                return new HoverConfidenceResult
                {
                    Confidence = 0,
                    LeadTime = timeToIntersect,
                    Reason = $"angle {angleDiffDegrees.ToFixed(0)}° too wide"
                };
            }

            // Calculate base confidence from trajectory alignment
            double angleConfidence = 1 - angleDiffDegrees / this.config.MaxTrajectoryAngle;

            // Calculate distance confidence (closer = higher confidence)
            double distanceConfidence = Math.Max(
                0,
                1 - intersection.Distance / 500 // 500px = low confidence
            );

            // Calculate velocity confidence (moderate velocity = higher confidence)
            // Too fast or too slow = lower confidence
            double idealVelocity = 0.5; // 0.5 px/ms = 500 px/s
            double velocityDiff = Math.Abs(trajectory.Velocity - idealVelocity);
            double velocityConfidence = Math.Max(0, 1 - velocityDiff / idealVelocity);

            // Calculate acceleration confidence (decelerating = higher confidence)
            // User slowing down = more intentional
            double accelerationConfidence = trajectory.Acceleration < 0 ? 1 : Math.Max(0, 1 - trajectory.Acceleration);

            // Weighted combination
            double confidence =
                angleConfidence * 0.4 +
                distanceConfidence * 0.3 +
                velocityConfidence * 0.2 +
                accelerationConfidence * 0.1;

            return new HoverConfidenceResult
            {
                Confidence = confidence,
                LeadTime = timeToIntersect,
                Reason = $"trajectory: {(confidence * 100).ToFixed(0)}% (angle: {angleDiffDegrees.ToFixed(0)}°, dist: {intersection.Distance.ToFixed(0)}px, vel: {trajectory.Velocity.ToFixed(2)})"
            };
        }

        /// <summary>
        /// Ray intersection result
        /// </summary>
        [ObjectLiteral]
        public class RayIntersectionResult
        {
            public double Distance { get; set; }
            public TrajectoryPoint Point { get; set; }
        }

        /// <summary>
        /// Calculate ray-box intersection
        /// Returns distance to intersection or null if no intersection
        /// </summary>
        private RayIntersectionResult CalculateRayIntersection(TrajectoryPoint origin, double angle, Rect box)
        {
            // Ray direction
            double dx = Math.Cos(angle);
            double dy = Math.Sin(angle);

            // Check intersection with each edge of the box
            double minDistance = double.PositiveInfinity;
            TrajectoryPoint intersectionPoint = null;

            // Left edge
            if (dx > 0.001)
            {
                double t = (box.Left - origin.X) / dx;
                if (t > 0)
                {
                    double y = origin.Y + t * dy;
                    if (y >= box.Top && y <= box.Bottom)
                    {
                        double dist = Math.Sqrt(Math.Pow(box.Left - origin.X, 2) + Math.Pow(y - origin.Y, 2));
                        if (dist < minDistance)
                        {
                            minDistance = dist;
                            intersectionPoint = new TrajectoryPoint { X = box.Left, Y = y, Timestamp = 0 };
                        }
                    }
                }
            }

            // Right edge
            if (dx < -0.001)
            {
                double t = (box.Right - origin.X) / dx;
                if (t > 0)
                {
                    double y = origin.Y + t * dy;
                    if (y >= box.Top && y <= box.Bottom)
                    {
                        double dist = Math.Sqrt(Math.Pow(box.Right - origin.X, 2) + Math.Pow(y - origin.Y, 2));
                        if (dist < minDistance)
                        {
                            minDistance = dist;
                            intersectionPoint = new TrajectoryPoint { X = box.Right, Y = y, Timestamp = 0 };
                        }
                    }
                }
            }

            // Top edge
            if (dy > 0.001)
            {
                double t = (box.Top - origin.Y) / dy;
                if (t > 0)
                {
                    double x = origin.X + t * dx;
                    if (x >= box.Left && x <= box.Right)
                    {
                        double dist = Math.Sqrt(Math.Pow(x - origin.X, 2) + Math.Pow(box.Top - origin.Y, 2));
                        if (dist < minDistance)
                        {
                            minDistance = dist;
                            intersectionPoint = new TrajectoryPoint { X = x, Y = box.Top, Timestamp = 0 };
                        }
                    }
                }
            }

            // Bottom edge
            if (dy < -0.001)
            {
                double t = (box.Bottom - origin.Y) / dy;
                if (t > 0)
                {
                    double x = origin.X + t * dx;
                    if (x >= box.Left && x <= box.Right)
                    {
                        double dist = Math.Sqrt(Math.Pow(x - origin.X, 2) + Math.Pow(box.Bottom - origin.Y, 2));
                        if (dist < minDistance)
                        {
                            minDistance = dist;
                            intersectionPoint = new TrajectoryPoint { X = x, Y = box.Bottom, Timestamp = 0 };
                        }
                    }
                }
            }

            if (intersectionPoint != null && minDistance < double.PositiveInfinity)
            {
                return new RayIntersectionResult
                {
                    Distance = minDistance,
                    Point = intersectionPoint
                };
            }

            return null;
        }

        /// <summary>
        /// Calculate velocity from a set of points
        /// </summary>
        private double CalculateVelocity(TrajectoryPoint[] points)
        {
            if (points.Length < 2) return 0;

            TrajectoryPoint first = points[0];
            TrajectoryPoint last = points[points.Length - 1];
            double timeDelta = last.Timestamp - first.Timestamp;

            if (timeDelta == 0) return 0;

            double dx = last.X - first.X;
            double dy = last.Y - first.Y;
            double distance = Math.Sqrt(dx * dx + dy * dy);

            return distance / timeDelta;
        }

        /// <summary>
        /// Clear history
        /// </summary>
        public void Clear()
        {
            this.mouseHistory.Clear();
        }
    }
}