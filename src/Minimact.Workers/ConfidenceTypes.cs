using System;
using System.Collections.Generic;
using Bridge;

namespace Minimact.Workers
{
    /// <summary>
    /// Types for the Confidence Engine Web Worker
    ///
    /// The confidence engine runs in a Web Worker to analyze user behavior
    /// and predict future DOM observations before they occur.
    /// </summary>

    /// <summary>
    /// Rectangle bounds for an element
    /// </summary>
    [ObjectLiteral]
    public class Rect
    {
        public double Top { get; set; }
        public double Left { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }
        public double Bottom { get; set; }
        public double Right { get; set; }
    }

    /// <summary>
    /// Mouse event data sent to worker
    /// </summary>
    [ObjectLiteral]
    public class MouseEventData
    {
        public string Type { get; set; } = "mousemove";
        public double X { get; set; }
        public double Y { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Scroll event data sent to worker
    /// </summary>
    [ObjectLiteral]
    public class ScrollEventData
    {
        public string Type { get; set; } = "scroll";
        public double ScrollX { get; set; }
        public double ScrollY { get; set; }
        public double ViewportWidth { get; set; }
        public double ViewportHeight { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Focus event data sent to worker
    /// </summary>
    [ObjectLiteral]
    public class FocusEventData
    {
        public string Type { get; set; } = "focus";
        public string ElementId { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Keydown event data sent to worker
    /// </summary>
    [ObjectLiteral]
    public class KeydownEventData
    {
        public string Type { get; set; } = "keydown";
        public string Key { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Resize event data sent to worker
    /// </summary>
    [ObjectLiteral]
    public class ResizeEventData
    {
        public string Type { get; set; } = "resize";
        public double Width { get; set; }
        public double Height { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Observable element registration observables config
    /// </summary>
    [ObjectLiteral]
    public class ObservablesConfig
    {
        public bool? Hover { get; set; }
        public bool? Intersection { get; set; }
        public bool? Focus { get; set; }
    }

    /// <summary>
    /// Observable element registration
    /// </summary>
    [ObjectLiteral]
    public class RegisterElementMessage
    {
        public string Type { get; set; } = "registerElement";
        public string ComponentId { get; set; }
        public string ElementId { get; set; }
        public Rect Bounds { get; set; }
        public ObservablesConfig Observables { get; set; }
    }

    /// <summary>
    /// Element bounds update (when element moves/resizes)
    /// </summary>
    [ObjectLiteral]
    public class UpdateBoundsMessage
    {
        public string Type { get; set; } = "updateBounds";
        public string ElementId { get; set; }
        public Rect Bounds { get; set; }
    }

    /// <summary>
    /// Unregister element
    /// </summary>
    [ObjectLiteral]
    public class UnregisterElementMessage
    {
        public string Type { get; set; } = "unregisterElement";
        public string ElementId { get; set; }
    }

    /// <summary>
    /// Base class for worker input messages (union type equivalent)
    /// </summary>
    [ObjectLiteral]
    public abstract class WorkerInputMessage
    {
        public abstract string Type { get; set; }
    }

    /// <summary>
    /// Prediction observation data
    /// </summary>
    [ObjectLiteral]
    public class PredictionObservation
    {
        public bool? Hover { get; set; }
        public bool? IsIntersecting { get; set; }
        public bool? Focus { get; set; }
    }

    /// <summary>
    /// Prediction request sent FROM worker to main thread
    /// </summary>
    [ObjectLiteral]
    public class PredictionRequestMessage
    {
        public string Type { get; set; } = "requestPrediction";
        public string ComponentId { get; set; }
        public string ElementId { get; set; }
        public PredictionObservation Observation { get; set; }
        public double Confidence { get; set; }
        public double LeadTime { get; set; } // Milliseconds before observation occurs
        public string Reason { get; set; } // Debug info (e.g., "mouse trajectory: 0.85")
    }

    /// <summary>
    /// Debug message from worker
    /// </summary>
    [ObjectLiteral]
    public class DebugMessage
    {
        public string Type { get; set; } = "debug";
        public string Message { get; set; }
        public object Data { get; set; } // equivalent to any
    }

    /// <summary>
    /// Base class for worker output messages (union type equivalent)
    /// </summary>
    [ObjectLiteral]
    public abstract class WorkerOutputMessage
    {
        public abstract string Type { get; set; }
    }

    /// <summary>
    /// Point data for mouse trajectory
    /// </summary>
    [ObjectLiteral]
    public class TrajectoryPoint
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Timestamp { get; set; }
    }

    /// <summary>
    /// Mouse trajectory data
    /// </summary>
    [ObjectLiteral]
    public class MouseTrajectory
    {
        public TrajectoryPoint[] Points { get; set; }
        public double Velocity { get; set; } // pixels per millisecond
        public double Angle { get; set; } // radians
        public double Acceleration { get; set; } // change in velocity
    }

    /// <summary>
    /// Scroll velocity data
    /// </summary>
    [ObjectLiteral]
    public class ScrollVelocity
    {
        public double Velocity { get; set; } // pixels per millisecond
        public string Direction { get; set; } // 'up' | 'down' | 'left' | 'right' | 'none'
        public double Deceleration { get; set; } // rate of slowdown
    }

    /// <summary>
    /// Observable element tracked by worker
    /// </summary>
    [ObjectLiteral]
    public class ObservableElement
    {
        public string ComponentId { get; set; }
        public string ElementId { get; set; }
        public Rect Bounds { get; set; }
        public ObservablesConfig Observables { get; set; }
        public double? LastPredictionTime { get; set; }
    }

    /// <summary>
    /// Circular buffer for efficient event history storage
    /// </summary>
    public class CircularBuffer<T>
    {
        private T[] buffer;
        private int capacity;
        private int index;
        private int size;

        public CircularBuffer(int capacity)
        {
            this.buffer = new T[capacity];
            this.capacity = capacity;
            this.index = 0;
            this.size = 0;
        }

        public void Push(T item)
        {
            this.buffer[this.index] = item;
            this.index = (this.index + 1) % this.capacity;
            this.size = Math.Min(this.size + 1, this.capacity);
        }

        public T[] GetAll()
        {
            if (this.size < this.capacity)
            {
                T[] result = new T[this.size];
                Array.Copy(this.buffer, 0, result, 0, this.size);
                return result;
            }

            // Return in chronological order
            T[] chronological = new T[this.capacity];
            for (int i = 0; i < this.capacity; i++)
            {
                chronological[i] = this.buffer[(this.index + i) % this.capacity];
            }
            return chronological;
        }

        public T[] GetLast(int n)
        {
            T[] all = GetAll();
            int startIndex = Math.Max(0, all.Length - n);
            T[] result = new T[all.Length - startIndex];
            Array.Copy(all, startIndex, result, 0, result.Length);
            return result;
        }

        public int Length
        {
            get { return this.size; }
        }

        public void Clear()
        {
            this.size = 0;
            this.index = 0;
        }
    }

    /// <summary>
    /// Configuration for confidence engine
    /// </summary>
    [ObjectLiteral]
    public class ConfidenceEngineConfig
    {
        // Confidence thresholds
        public double MinConfidence { get; set; } // 0.7 - only predict above this
        public double HoverHighConfidence { get; set; } // 0.85 - high confidence hover
        public double IntersectionHighConfidence { get; set; } // 0.90 - high confidence intersection
        public double FocusHighConfidence { get; set; } // 0.95 - very high confidence focus

        // Timing
        public double HoverLeadTimeMin { get; set; } // 50ms - minimum lead time for hover
        public double HoverLeadTimeMax { get; set; } // 300ms - maximum lead time for hover
        public double IntersectionLeadTimeMax { get; set; } // 300ms - maximum lead time for intersection

        // Trajectory
        public double MaxTrajectoryAngle { get; set; } // 30 degrees - max angle for high confidence
        public double MinMouseVelocity { get; set; } // 0.1 px/ms - minimum velocity to predict

        // Throttling
        public int MaxPredictionsPerElement { get; set; } // 2 - max predictions per element per window
        public double PredictionWindowMs { get; set; } // 200ms - throttle window

        // History
        public int MouseHistorySize { get; set; } // 20 - number of mouse points to track
        public int ScrollHistorySize { get; set; } // 10 - number of scroll events to track

        // Debug
        public bool DebugLogging { get; set; }
    }

    /// <summary>
    /// Default configuration matching TypeScript DEFAULT_CONFIG
    /// </summary>
    public static class DefaultConfig
    {
        public static readonly ConfidenceEngineConfig DEFAULT_CONFIG = new ConfidenceEngineConfig
        {
            MinConfidence = 0.7,
            HoverHighConfidence = 0.85,
            IntersectionHighConfidence = 0.90,
            FocusHighConfidence = 0.95,
            HoverLeadTimeMin = 50,
            HoverLeadTimeMax = 300,
            IntersectionLeadTimeMax = 300,
            MaxTrajectoryAngle = 30,
            MinMouseVelocity = 0.1,
            MaxPredictionsPerElement = 2,
            PredictionWindowMs = 200,
            MouseHistorySize = 20,
            ScrollHistorySize = 10,
            DebugLogging = false
        };
    }
}