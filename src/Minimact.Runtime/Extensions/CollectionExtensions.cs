namespace Minimact.Runtime.Extensions;

using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Extension methods for JavaScript-like collection operations
/// </summary>
public static class CollectionExtensions
{
    /// <summary>
    /// JavaScript-style map() method - transforms each element using a callback
    /// </summary>
    public static IEnumerable<TResult> map<T, TResult>(this IEnumerable<T> source, Func<T, TResult> callback)
    {
        return source.Select(callback);
    }

    /// <summary>
    /// Dynamic version of map() for use with dynamic types
    /// </summary>
    public static IEnumerable<dynamic> map(this IEnumerable<dynamic> source, Func<dynamic, dynamic> callback)
    {
        return source.Select(callback);
    }

    /// <summary>
    /// JavaScript-style filter() method
    /// </summary>
    public static IEnumerable<T> filter<T>(this IEnumerable<T> source, Func<T, bool> predicate)
    {
        return source.Where(predicate);
    }

    /// <summary>
    /// Dynamic version of filter()
    /// </summary>
    public static IEnumerable<dynamic> filter(this IEnumerable<dynamic> source, Func<dynamic, bool> predicate)
    {
        return source.Where(predicate);
    }
}
