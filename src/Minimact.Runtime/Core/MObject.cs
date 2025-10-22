using System;
using Newtonsoft.Json.Linq;

namespace Minimact.Runtime.Core
{
    /// <summary>
    /// Wrapper for JavaScript-like objects that handles null/undefined and truthiness
    /// Provides implicit conversion to bool for JavaScript truthiness semantics
    /// </summary>
    public class MObject
    {
        public dynamic Value { get; }
        public bool IsNull { get; }
        public bool IsUndefined { get; }

        public MObject(dynamic value, bool isUndefined = false)
        {
            Value = value;
            IsNull = value == null;
            IsUndefined = isUndefined;
        }

        public static MObject Null => new MObject(null, false);
        public static MObject Undefined => new MObject(null, true);

        /// <summary>
        /// Implicit conversion to bool for JavaScript truthiness
        /// - null/undefined → false
        /// - false → false
        /// - 0, "" → false
        /// - Everything else → true
        /// </summary>
        public static implicit operator bool(MObject obj)
        {
            if (obj == null || obj.IsNull || obj.IsUndefined)
                return false;

            var value = obj.Value;

            // Handle JValue/JToken from JSON deserialization
            if (value is JValue jval)
            {
                value = jval.Value;
            }

            // JavaScript truthiness rules
            if (value is bool b) return b;
            if (value is int i) return i != 0;
            if (value is long l) return l != 0;
            if (value is double d) return d != 0 && !double.IsNaN(d);
            if (value is string s) return s.Length > 0;

            // Objects and arrays are truthy
            return true;
        }

        /// <summary>
        /// Implicit conversion from dynamic to MObject
        /// </summary>
        public static implicit operator MObject(JValue value)
        {
            return new MObject(value?.Value);
        }

        /// <summary>
        /// Implicit conversion from bool to MObject
        /// </summary>
        public static implicit operator MObject(bool value)
        {
            return new MObject(value);
        }

        public override string ToString()
        {
            if (IsUndefined) return "undefined";
            if (IsNull) return "null";
            return Value?.ToString() ?? "null";
        }
    }
}
