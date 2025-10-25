using System;

namespace Minimact.Workers
{
    /// <summary>
    /// Extension methods to match JavaScript functionality
    /// </summary>
    public static class BridgeExtensions
    {
        /// <summary>
        /// JavaScript-style toFixed method for numbers
        /// </summary>
        public static string ToFixed(this double value, int digits)
        {
            return value.ToString("F" + digits);
        }

        /// <summary>
        /// JavaScript-style toFixed method for numbers (overload for int)
        /// </summary>
        public static string ToFixed(this int value, int digits)
        {
            return ((double)value).ToFixed(digits);
        }

        /// <summary>
        /// Array slice method to match JavaScript functionality
        /// </summary>
        public static T[] Slice_Array<T>(this T[] array, int start)
        {
            if (start >= array.Length) return new T[0];
            var length = array.Length - start;
            var result = new T[length];
            Array.Copy(array, start, result, 0, length);
            return result;
        }

        /// <summary>
        /// Array slice method to match JavaScript functionality
        /// </summary>
        public static T[] Slice_Array<T>(this T[] array, int start, int end)
        {
            if (start >= array.Length || end <= start) return new T[0];
            var length = Math.Min(end, array.Length) - start;
            var result = new T[length];
            Array.Copy(array, start, result, 0, length);
            return result;
        }
    }
}