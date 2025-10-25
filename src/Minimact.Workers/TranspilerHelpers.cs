using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.Workers
{
    /// <summary>
    /// C# Map class that transpiles cleanly to TypeScript Map
    /// </summary>
    public class Map<TKey, TValue> : IEnumerable<KeyValuePair<TKey, TValue>>
    {
        private Dictionary<TKey, TValue> _dict = new Dictionary<TKey, TValue>();

        public TValue this[TKey key]
        {
            get => _dict[key];
            set => _dict[key] = value;
        }

        public void Set(TKey key, TValue value)
        {
            _dict[key] = value;
        }

        public TValue Get(TKey key)
        {
            return _dict.TryGetValue(key, out TValue value) ? value : default(TValue);
        }

        public bool Has(TKey key)
        {
            return _dict.ContainsKey(key);
        }

        public bool Delete(TKey key)
        {
            return _dict.Remove(key);
        }

        public void Clear()
        {
            _dict.Clear();
        }

        public int Size => _dict.Count;

        // For foreach support - should transpile as: for (const [key, value] of map)
        public IEnumerator<KeyValuePair<TKey, TValue>> GetEnumerator()
        {
            return _dict.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return GetEnumerator();
        }

        // Additional helper for clean iteration
        public IEnumerable<KeyValuePair<TKey, TValue>> Entries()
        {
            return _dict;
        }
    }

    /// <summary>
    /// Helper for message type switching that transpiles cleanly
    /// </summary>
    public static class MessageTypeSwitch
    {
        public static void Handle(object message, string messageType,
            Action<MouseEventData> handleMouseMove = null,
            Action<ScrollEventData> handleScroll = null,
            Action<FocusEventData> handleFocus = null,
            Action<KeydownEventData> handleKeydown = null,
            Action<RegisterElementMessage> handleRegisterElement = null,
            Action<UpdateBoundsMessage> handleUpdateBounds = null,
            Action<UnregisterElementMessage> handleUnregisterElement = null,
            Action<object> handleUnknown = null)
        {
            switch (messageType)
            {
                case "mousemove":
                    handleMouseMove?.Invoke(CastMessage<MouseEventData>(message));
                    break;
                case "scroll":
                    handleScroll?.Invoke(CastMessage<ScrollEventData>(message));
                    break;
                case "focus":
                    handleFocus?.Invoke(CastMessage<FocusEventData>(message));
                    break;
                case "keydown":
                    handleKeydown?.Invoke(CastMessage<KeydownEventData>(message));
                    break;
                case "registerElement":
                    handleRegisterElement?.Invoke(CastMessage<RegisterElementMessage>(message));
                    break;
                case "updateBounds":
                    handleUpdateBounds?.Invoke(CastMessage<UpdateBoundsMessage>(message));
                    break;
                case "unregisterElement":
                    handleUnregisterElement?.Invoke(CastMessage<UnregisterElementMessage>(message));
                    break;
                default:
                    handleUnknown?.Invoke(message);
                    break;
            }
        }

        private static T CastMessage<T>(object message) where T : WorkerInputMessage
        {
            if (message is T typed)
                return typed;

            // Fallback: serialize and deserialize for type conversion
            var json = System.Text.Json.JsonSerializer.Serialize(message);
            return System.Text.Json.JsonSerializer.Deserialize<T>(json);
        }
    }

    /// <summary>
    /// Helper for clean continue logic that transpiles well
    /// </summary>
    public static class LoopHelpers
    {
        public static bool ShouldContinue(bool condition)
        {
            return condition;
        }

        public static bool ShouldSkip(bool condition)
        {
            return condition;
        }
    }
}