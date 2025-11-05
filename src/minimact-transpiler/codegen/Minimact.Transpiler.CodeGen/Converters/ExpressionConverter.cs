using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Minimact.Transpiler.CodeGen.Converters;

/// <summary>
/// Converts JavaScript AST expressions to C# code
/// Ported from babel-plugin-minimact/src/generators/expressions.cjs
/// </summary>
public class ExpressionConverter
{
    private readonly Dictionary<string, object> _componentMetadata;
    private readonly Stack<List<string>> _mapContextStack;

    public ExpressionConverter(Dictionary<string, object>? componentMetadata = null)
    {
        _componentMetadata = componentMetadata ?? new Dictionary<string, object>();
        _mapContextStack = new Stack<List<string>>();
    }

    /// <summary>
    /// Convert a JavaScript AST node to C# expression string
    /// </summary>
    public string ConvertExpression(JsonElement node, bool wrapStrings = true)
    {
        if (!node.TryGetProperty("type", out var typeProperty))
        {
            throw new ArgumentException("AST node must have a 'type' property");
        }

        var nodeType = typeProperty.GetString();

        return nodeType switch
        {
            // Literals
            "StringLiteral" => ConvertStringLiteral(node, wrapStrings),
            "NumericLiteral" => ConvertNumericLiteral(node),
            "BooleanLiteral" => ConvertBooleanLiteral(node),
            "NullLiteral" => "null",

            // Identifiers
            "Identifier" => ConvertIdentifier(node),

            // Member expressions
            "MemberExpression" => ConvertMemberExpression(node),

            // Binary expressions
            "BinaryExpression" => ConvertBinaryExpression(node),
            "LogicalExpression" => ConvertLogicalExpression(node),
            "UnaryExpression" => ConvertUnaryExpression(node),

            // Conditional
            "ConditionalExpression" => ConvertConditionalExpression(node),

            // Function calls
            "CallExpression" => ConvertCallExpression(node, wrapStrings),

            // Array expressions
            "ArrayExpression" => ConvertArrayExpression(node),

            // Object expressions
            "ObjectExpression" => ConvertObjectExpression(node),

            // Template literals
            "TemplateLiteral" => ConvertTemplateLiteral(node),

            // Arrow functions
            "ArrowFunctionExpression" => ConvertArrowFunctionExpression(node),

            // Optional chaining
            "OptionalMemberExpression" => ConvertOptionalMemberExpression(node),
            "OptionalCallExpression" => ConvertOptionalCallExpression(node),

            _ => throw new NotImplementedException($"AST node type '{nodeType}' not yet supported")
        };
    }

    #region Literal Conversions

    private string ConvertStringLiteral(JsonElement node, bool wrapStrings)
    {
        var value = node.GetProperty("value").GetString() ?? "";
        if (!wrapStrings) return value;
        return $"\"{EscapeString(value)}\"";
    }

    private string ConvertNumericLiteral(JsonElement node)
    {
        return node.GetProperty("value").GetDouble().ToString();
    }

    private string ConvertBooleanLiteral(JsonElement node)
    {
        return node.GetProperty("value").GetBoolean() ? "true" : "false";
    }

    #endregion

    #region Identifier and Member Expression Conversions

    private string ConvertIdentifier(JsonElement node)
    {
        return node.GetProperty("name").GetString() ?? "";
    }

    private string ConvertMemberExpression(JsonElement node)
    {
        var obj = ConvertExpression(node.GetProperty("object"));
        var property = node.GetProperty("property");
        var computed = node.GetProperty("computed").GetBoolean();

        if (computed)
        {
            var prop = ConvertExpression(property);
            return $"{obj}[{prop}]";
        }
        else
        {
            var propName = property.GetProperty("name").GetString();

            // Convert .length → .Count for arrays/collections
            if (propName == "length")
            {
                return $"{obj}.Count";
            }

            return $"{obj}.{propName}";
        }
    }

    private string ConvertOptionalMemberExpression(JsonElement node)
    {
        var obj = ConvertExpression(node.GetProperty("object"));
        var property = node.GetProperty("property");
        var computed = node.GetProperty("computed").GetBoolean();

        if (computed)
        {
            var prop = ConvertExpression(property);
            return $"{obj}?[{prop}]";
        }
        else
        {
            var propName = property.GetProperty("name").GetString();
            return $"{obj}?.{propName}";
        }
    }

    #endregion

    #region Binary and Logical Expressions

    private string ConvertBinaryExpression(JsonElement node)
    {
        var left = ConvertExpression(node.GetProperty("left"));
        var right = ConvertExpression(node.GetProperty("right"));
        var op = node.GetProperty("operator").GetString();

        // Convert === to == and !== to !=
        if (op == "===") op = "==";
        if (op == "!==") op = "!=";

        return $"({left} {op} {right})";
    }

    private string ConvertLogicalExpression(JsonElement node)
    {
        var left = ConvertExpression(node.GetProperty("left"));
        var right = ConvertExpression(node.GetProperty("right"));
        var op = node.GetProperty("operator").GetString();

        // Convert && to && and || to ||
        return $"({left} {op} {right})";
    }

    private string ConvertUnaryExpression(JsonElement node)
    {
        var argument = ConvertExpression(node.GetProperty("argument"));
        var op = node.GetProperty("operator").GetString();
        var prefix = node.GetProperty("prefix").GetBoolean();

        if (prefix)
        {
            return $"{op}{argument}";
        }
        else
        {
            return $"{argument}{op}";
        }
    }

    #endregion

    #region Conditional Expression

    private string ConvertConditionalExpression(JsonElement node)
    {
        var test = ConvertExpression(node.GetProperty("test"));
        var consequent = ConvertExpression(node.GetProperty("consequent"));
        var alternate = ConvertExpression(node.GetProperty("alternate"));

        return $"({test}) ? {consequent} : {alternate}";
    }

    #endregion

    #region Call Expression (The Big One!)

    private string ConvertCallExpression(JsonElement node, bool wrapStrings)
    {
        var callee = node.GetProperty("callee");

        // Check if it's a member expression (method call)
        if (callee.GetProperty("type").GetString() == "MemberExpression")
        {
            return ConvertMethodCall(node, callee, wrapStrings);
        }

        // Check if it's an identifier (function call)
        if (callee.GetProperty("type").GetString() == "Identifier")
        {
            return ConvertFunctionCall(node, callee, wrapStrings);
        }

        // Generic call expression
        var calleeStr = ConvertExpression(callee);
        var args = ConvertArguments(node.GetProperty("arguments"));
        return $"{calleeStr}({args})";
    }

    private string ConvertMethodCall(JsonElement node, JsonElement callee, bool wrapStrings)
    {
        var obj = callee.GetProperty("object");
        var property = callee.GetProperty("property");
        var methodName = property.GetProperty("name").GetString() ?? "";
        var args = node.GetProperty("arguments");

        // Math methods
        if (obj.GetProperty("type").GetString() == "Identifier" &&
            obj.GetProperty("name").GetString() == "Math")
        {
            return ConvertMathMethod(methodName, args);
        }

        // String methods
        return methodName switch
        {
            "toLowerCase" => $"{ConvertExpression(obj)}.ToLower()",
            "toUpperCase" => $"{ConvertExpression(obj)}.ToUpper()",
            "substring" => ConvertSubstring(obj, args),
            "padStart" => ConvertPadStart(obj, args),
            "padEnd" => ConvertPadEnd(obj, args),
            "toFixed" => ConvertToFixed(obj, args),
            "toLocaleString" => $"{ConvertExpression(obj)}.ToString(\"g\")",
            "trim" => $"{ConvertExpression(obj)}.Trim()",
            "split" => ConvertSplit(obj, args),
            "join" => ConvertJoin(obj, args),
            "includes" => ConvertIncludes(obj, args),
            "startsWith" => ConvertStartsWith(obj, args),
            "endsWith" => ConvertEndsWith(obj, args),
            "indexOf" => ConvertIndexOf(obj, args),
            "replace" => ConvertReplace(obj, args),
            "slice" => ConvertSlice(obj, args),
            "map" => ConvertMap(obj, args),
            "filter" => ConvertFilter(obj, args),
            "find" => ConvertFind(obj, args),
            "some" => ConvertSome(obj, args),
            "every" => ConvertEvery(obj, args),
            "reduce" => ConvertReduce(obj, args),
            "push" => ConvertPush(obj, args),
            "pop" => $"{ConvertExpression(obj)}.RemoveAt({ConvertExpression(obj)}.Count - 1)",
            "shift" => $"{ConvertExpression(obj)}.RemoveAt(0)",
            "unshift" => ConvertUnshift(obj, args),
            "sort" => ConvertSort(obj, args),
            "reverse" => ConvertReverse(obj),
            "concat" => ConvertConcat(obj, args),
            "json" => ConvertJsonMethod(obj),
            _ => $"{ConvertExpression(obj)}.{methodName}({ConvertArguments(args)})"
        };
    }

    private string ConvertFunctionCall(JsonElement node, JsonElement callee, bool wrapStrings)
    {
        var functionName = callee.GetProperty("name").GetString() ?? "";
        var args = node.GetProperty("arguments");

        return functionName switch
        {
            "encodeURIComponent" => $"Uri.EscapeDataString({ConvertArguments(args)})",
            "decodeURIComponent" => $"Uri.UnescapeDataString({ConvertArguments(args)})",
            "fetch" => ConvertFetch(args),
            "alert" => $"Console.WriteLine({ConvertArguments(args)})",
            "String" => ConvertStringConstructor(args),
            "parseInt" => $"int.Parse({ConvertArguments(args)})",
            "parseFloat" => $"double.Parse({ConvertArguments(args)})",
            "isNaN" => $"double.IsNaN({ConvertArguments(args)})",
            _ => CheckForStateSetterOrGenericCall(functionName, args)
        };
    }

    private string CheckForStateSetterOrGenericCall(string functionName, JsonElement args)
    {
        // Check if it's a useState setter
        // This requires component metadata to be provided
        // For now, just generate a generic call
        return $"{functionName}({ConvertArguments(args)})";
    }

    #endregion

    #region Math Method Conversions

    private string ConvertMathMethod(string methodName, JsonElement args)
    {
        var pascalMethodName = char.ToUpper(methodName[0]) + methodName.Substring(1);
        var argsStr = ConvertArguments(args);

        // Cast floor/ceil/round to int for array indexing compatibility
        if (methodName == "floor" || methodName == "ceil" || methodName == "round")
        {
            return $"(int)Math.{pascalMethodName}({argsStr})";
        }

        return $"Math.{pascalMethodName}({argsStr})";
    }

    #endregion

    #region String Method Conversions

    private string ConvertSubstring(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Substring({argsStr})";
    }

    private string ConvertPadStart(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0) return $"{objStr}.PadLeft(0)";

        var length = ConvertExpression(argsArray[0]);

        if (argsArray.Count == 1)
        {
            return $"{objStr}.PadLeft({length})";
        }

        // Convert string literal to char if single character
        var padChar = ConvertPadChar(argsArray[1]);
        return $"{objStr}.PadLeft({length}, {padChar})";
    }

    private string ConvertPadEnd(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0) return $"{objStr}.PadRight(0)";

        var length = ConvertExpression(argsArray[0]);

        if (argsArray.Count == 1)
        {
            return $"{objStr}.PadRight({length})";
        }

        var padChar = ConvertPadChar(argsArray[1]);
        return $"{objStr}.PadRight({length}, {padChar})";
    }

    private string ConvertPadChar(JsonElement arg)
    {
        if (arg.GetProperty("type").GetString() == "StringLiteral")
        {
            var str = arg.GetProperty("value").GetString();
            if (str?.Length == 1)
            {
                return $"'{str[0]}'";
            }
        }
        return ConvertExpression(arg);
    }

    private string ConvertToFixed(JsonElement obj, JsonElement args)
    {
        var objExpr = ConvertExpression(obj);

        // Preserve parentheses for complex expressions
        var objType = obj.GetProperty("type").GetString();
        if (objType == "BinaryExpression" || objType == "LogicalExpression" ||
            objType == "ConditionalExpression" || objType == "CallExpression")
        {
            objExpr = $"({objExpr})";
        }

        var argsArray = args.EnumerateArray().ToList();
        var decimals = 2;

        if (argsArray.Count > 0 && argsArray[0].GetProperty("type").GetString() == "NumericLiteral")
        {
            decimals = argsArray[0].GetProperty("value").GetInt32();
        }

        return $"{objExpr}.ToString(\"F{decimals}\")";
    }

    private string ConvertSplit(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Split({argsStr})";
    }

    private string ConvertJoin(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"string.Join({argsStr}, {objStr})";
    }

    private string ConvertIncludes(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Contains({argsStr})";
    }

    private string ConvertStartsWith(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.StartsWith({argsStr})";
    }

    private string ConvertEndsWith(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.EndsWith({argsStr})";
    }

    private string ConvertIndexOf(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.IndexOf({argsStr})";
    }

    private string ConvertReplace(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Replace({argsStr})";
    }

    private string ConvertSlice(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return objStr;
        }

        if (argsArray.Count == 1)
        {
            var start = ConvertExpression(argsArray[0]);
            return $"{objStr}.Skip({start}).ToList()";
        }

        var startExpr = ConvertExpression(argsArray[0]);
        var endExpr = ConvertExpression(argsArray[1]);
        return $"{objStr}.Skip({startExpr}).Take({endExpr} - {startExpr}).ToList()";
    }

    #endregion

    #region Array Method Conversions

    private string ConvertMap(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return $"{objStr}.Select(x => x).ToList()";
        }

        var callback = argsArray[0];
        var lambda = ConvertArrowFunctionExpression(callback);

        // Check if we need to cast for dynamic objects
        var needsCast = objStr.Contains("?.") || objStr.Contains("?");
        var castedObj = needsCast ? $"((IEnumerable<dynamic>){objStr})" : objStr;
        var castedLambda = needsCast ? $"(Func<dynamic, dynamic>)({lambda})" : lambda;

        return $"{castedObj}.Select({castedLambda}).ToList()";
    }

    private string ConvertFilter(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return $"{objStr}.ToList()";
        }

        var callback = argsArray[0];
        var lambda = ConvertArrowFunctionExpression(callback);

        return $"{objStr}.Where({lambda}).ToList()";
    }

    private string ConvertFind(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return $"{objStr}.FirstOrDefault()";
        }

        var callback = argsArray[0];
        var lambda = ConvertArrowFunctionExpression(callback);

        return $"{objStr}.FirstOrDefault({lambda})";
    }

    private string ConvertSome(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return $"{objStr}.Any()";
        }

        var callback = argsArray[0];
        var lambda = ConvertArrowFunctionExpression(callback);

        return $"{objStr}.Any({lambda})";
    }

    private string ConvertEvery(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return "true";
        }

        var callback = argsArray[0];
        var lambda = ConvertArrowFunctionExpression(callback);

        return $"{objStr}.All({lambda})";
    }

    private string ConvertReduce(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count < 2)
        {
            throw new ArgumentException("reduce requires at least 2 arguments");
        }

        var callback = argsArray[0];
        var initialValue = ConvertExpression(argsArray[1]);
        var lambda = ConvertArrowFunctionExpression(callback);

        return $"{objStr}.Aggregate({initialValue}, {lambda})";
    }

    private string ConvertPush(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Add({argsStr})";
    }

    private string ConvertUnshift(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Insert(0, {argsStr})";
    }

    private string ConvertSort(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return $"{objStr}.OrderBy(x => x).ToList()";
        }

        // With custom comparator - more complex
        return $"{objStr}.OrderBy(x => x).ToList() /* TODO: Custom comparator */";
    }

    private string ConvertReverse(JsonElement obj)
    {
        var objStr = ConvertExpression(obj);
        return $"{objStr}.Reverse().ToList()";
    }

    private string ConvertConcat(JsonElement obj, JsonElement args)
    {
        var objStr = ConvertExpression(obj);
        var argsStr = ConvertArguments(args);
        return $"{objStr}.Concat({argsStr}).ToList()";
    }

    #endregion

    #region Special Conversions

    private string ConvertFetch(JsonElement args)
    {
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return "new HttpClient().GetAsync(\"\")";
        }

        var url = ConvertExpression(argsArray[0]);
        return $"new HttpClient().GetAsync({url})";
    }

    private string ConvertJsonMethod(JsonElement obj)
    {
        var objStr = ConvertExpression(obj);
        return $"{objStr}.Content.ReadFromJsonAsync<dynamic>()";
    }

    private string ConvertStringConstructor(JsonElement args)
    {
        var argsArray = args.EnumerateArray().ToList();

        if (argsArray.Count == 0)
        {
            return "\"\"";
        }

        var arg = ConvertExpression(argsArray[0]);
        return $"({arg}).ToString()";
    }

    #endregion

    #region Array and Object Expressions

    private string ConvertArrayExpression(JsonElement node)
    {
        var elements = node.GetProperty("elements");
        var items = elements.EnumerateArray()
            .Select(e => ConvertExpression(e))
            .ToList();

        return $"new[] {{ {string.Join(", ", items)} }}";
    }

    private string ConvertObjectExpression(JsonElement node)
    {
        var properties = node.GetProperty("properties");
        var props = properties.EnumerateArray()
            .Select(p => {
                var key = ConvertExpression(p.GetProperty("key"));
                var value = ConvertExpression(p.GetProperty("value"));
                return $"{key} = {value}";
            })
            .ToList();

        return $"new {{ {string.Join(", ", props)} }}";
    }

    #endregion

    #region Template Literals

    private string ConvertTemplateLiteral(JsonElement node)
    {
        var quasis = node.GetProperty("quasis").EnumerateArray().ToList();
        var expressions = node.GetProperty("expressions").EnumerateArray().ToList();

        var parts = new List<string>();

        for (int i = 0; i < quasis.Count; i++)
        {
            var quasi = quasis[i].GetProperty("value").GetProperty("cooked").GetString();
            parts.Add(EscapeString(quasi ?? ""));

            if (i < expressions.Count)
            {
                parts.Add($"{{{ConvertExpression(expressions[i])}}}");
            }
        }

        return $"$\"{string.Join("", parts)}\"";
    }

    #endregion

    #region Arrow Function Expression

    private string ConvertArrowFunctionExpression(JsonElement node)
    {
        var params_ = node.GetProperty("params");
        var paramNames = params_.EnumerateArray()
            .Select(p => p.GetProperty("name").GetString() ?? "")
            .ToList();

        // C# requires parentheses for 0 or 2+ parameters
        var paramsStr = paramNames.Count == 1
            ? paramNames[0]
            : $"({string.Join(", ", paramNames)})";

        var body = node.GetProperty("body");
        var bodyType = body.GetProperty("type").GetString();

        string bodyStr;
        if (bodyType == "BlockStatement")
        {
            // Multi-statement body - needs full conversion
            bodyStr = "{ /* TODO: Block statement conversion */ }";
        }
        else
        {
            // Expression body
            bodyStr = ConvertExpression(body);
        }

        return $"{paramsStr} => {bodyStr}";
    }

    #endregion

    #region Optional Chaining

    private string ConvertOptionalCallExpression(JsonElement node)
    {
        var callee = ConvertExpression(node.GetProperty("callee"));
        var args = ConvertArguments(node.GetProperty("arguments"));
        return $"{callee}?.Invoke({args})";
    }

    #endregion

    #region Helper Methods

    private string ConvertArguments(JsonElement args)
    {
        return string.Join(", ", args.EnumerateArray().Select(arg => ConvertExpression(arg)));
    }

    private string EscapeString(string str)
    {
        return str
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }

    #endregion
}
