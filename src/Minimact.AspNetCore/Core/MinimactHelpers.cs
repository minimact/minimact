using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Runtime helpers for dynamic JSX transformation
/// Used when compile-time transformation is insufficient (spread operators, dynamic children, etc.)
/// </summary>
public static class Minimact
{
    /// <summary>
    /// Creates a VNode element with dynamic props and children
    /// Equivalent to React.createElement() but returns VNode
    /// </summary>
    /// <param name="tagOrComponent">HTML tag name or component type</param>
    /// <param name="props">Props object (anonymous object, dictionary, or null)</param>
    /// <param name="children">Variable number of children (VNode, string, arrays, null)</param>
    /// <returns>VNode representing the element</returns>
    public static VNode createElement(string tagOrComponent, object? props, params object?[]? children)
    {
        var propsDict = ConvertProps(props);
        var vnodeChildren = ConvertChildren(children);

        return new VElement(tagOrComponent, propsDict, vnodeChildren);
    }

    /// <summary>
    /// Fragment container (renders children without wrapper element)
    /// Equivalent to React.Fragment or &lt;&gt;&lt;/&gt;
    /// </summary>
    /// <param name="children">Children to render</param>
    /// <returns>Fragment containing the children</returns>
    public static VNode Fragment(params object?[]? children)
    {
        var vnodeChildren = ConvertChildren(children);
        return new Core.Fragment(vnodeChildren);
    }

    /// <summary>
    /// Converts props object to Dictionary&lt;string, string&gt;
    /// Handles: dictionaries, anonymous objects, null
    /// </summary>
    private static Dictionary<string, string> ConvertProps(object? props)
    {
        if (props == null)
            return new Dictionary<string, string>();

        // Already a string dictionary
        if (props is Dictionary<string, string> dict)
            return dict;

        // IDictionary<string, object> (common from deserialization)
        if (props is IDictionary<string, object> objDict)
        {
            return objDict.ToDictionary(
                kv => kv.Key,
                kv => kv.Value?.ToString() ?? ""
            );
        }

        // IDictionary (non-generic)
        if (props is IDictionary nonGenericDict)
        {
            var result = new Dictionary<string, string>();
            foreach (DictionaryEntry entry in nonGenericDict)
            {
                if (entry.Key != null)
                    result[entry.Key.ToString()!] = entry.Value?.ToString() ?? "";
            }
            return result;
        }

        // Anonymous object or POCO - use reflection
        var propsDict = new Dictionary<string, string>();
        var type = props.GetType();

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var value = prop.GetValue(props);
            if (value != null)
            {
                // Handle event handlers (skip them for now, they're registered separately)
                if (prop.Name.StartsWith("on") && value is Delegate)
                    continue;

                propsDict[prop.Name] = value.ToString()!;
            }
        }

        return propsDict;
    }

    /// <summary>
    /// Converts children array to VNode[]
    /// Handles: VNode, string, numbers, arrays, IEnumerable, null
    /// </summary>
    private static VNode[] ConvertChildren(object?[]? children)
    {
        if (children == null || children.Length == 0)
            return Array.Empty<VNode>();

        var result = new List<VNode>();

        foreach (var child in children)
        {
            // Preserve null for conditional rendering (e.g., {condition && <Component />})
            // Note: At runtime we don't have path info, so we use empty path
            // Transpiler-generated code should create VNull with proper paths
            if (child == null)
            {
                result.Add(new VNull("")); // Runtime null - no path available
                continue;
            }

            // Already a VNode
            if (child is VNode vnode)
            {
                result.Add(vnode);
                continue;
            }

            // String content
            if (child is string str)
            {
                if (!string.IsNullOrWhiteSpace(str))
                    result.Add(new VText(str));
                continue;
            }

            // Numeric content
            if (child is int || child is long || child is float || child is double || child is decimal)
            {
                result.Add(new VText(child.ToString()!));
                continue;
            }

            // Boolean (render as text)
            if (child is bool boolean)
            {
                result.Add(new VText(boolean.ToString().ToLower()));
                continue;
            }

            // Array of VNodes
            if (child is VNode[] vnodeArray)
            {
                result.AddRange(vnodeArray);
                continue;
            }

            // IEnumerable<VNode> (from LINQ Select, etc.)
            if (child is IEnumerable<VNode> vnodeEnumerable)
            {
                result.AddRange(vnodeEnumerable);
                continue;
            }

            // Generic IEnumerable (try to convert each item)
            if (child is IEnumerable enumerable and not string)
            {
                foreach (var item in enumerable)
                {
                    var converted = ConvertChildren(new[] { item });
                    result.AddRange(converted);
                }
                continue;
            }

            // Fallback: toString()
            result.Add(new VText(child.ToString()!));
        }

        return result.ToArray();
    }

    /// <summary>
    /// Merges two prop objects (for spread operator support)
    /// Usage: new { a = 1 }.MergeWith(new { b = 2 }) => { a = 1, b = 2 }
    /// </summary>
    public static Dictionary<string, object> MergeWith(this object first, object? second)
    {
        var merged = new Dictionary<string, object>();

        // Add first object props
        if (first != null)
        {
            if (first is IDictionary<string, object> firstDict)
            {
                foreach (var kv in firstDict)
                    merged[kv.Key] = kv.Value;
            }
            else
            {
                foreach (var prop in first.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                {
                    var value = prop.GetValue(first);
                    if (value != null)
                        merged[prop.Name] = value;
                }
            }
        }

        // Add/override with second object props
        if (second != null)
        {
            if (second is IDictionary<string, object> secondDict)
            {
                foreach (var kv in secondDict)
                    merged[kv.Key] = kv.Value;
            }
            else
            {
                foreach (var prop in second.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                {
                    var value = prop.GetValue(second);
                    if (value != null)
                        merged[prop.Name] = value;
                }
            }
        }

        return merged;
    }

    /// <summary>
    /// Merges multiple prop objects (for multiple spread operators)
    /// Usage: MergeProps(obj1, obj2, obj3)
    /// </summary>
    public static Dictionary<string, object> MergeProps(params object?[] propObjects)
    {
        var merged = new Dictionary<string, object>();

        foreach (var props in propObjects)
        {
            if (props == null)
                continue;

            if (props is IDictionary<string, object> dict)
            {
                foreach (var kv in dict)
                    merged[kv.Key] = kv.Value;
            }
            else
            {
                foreach (var prop in props.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                {
                    var value = prop.GetValue(props);
                    if (value != null)
                        merged[prop.Name] = value;
                }
            }
        }

        return merged;
    }
}
