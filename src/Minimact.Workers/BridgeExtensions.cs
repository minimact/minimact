using Bridge;

namespace Minimact.Workers
{
    /// <summary>
    /// Extension methods to match JavaScript functionality in Bridge.NET
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
    }
}