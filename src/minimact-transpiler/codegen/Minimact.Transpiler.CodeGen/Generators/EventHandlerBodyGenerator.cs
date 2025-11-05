using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using Minimact.Transpiler.CodeGen.Converters;
using Minimact.Transpiler.CodeGen.Nodes;

namespace Minimact.Transpiler.CodeGen.Generators;

/// <summary>
/// Generates C# event handler method bodies from AST
/// Matches behavior of babel-plugin-minimact/src/generators/component.cjs (event handler generation)
/// </summary>
public class EventHandlerBodyGenerator
{
    private readonly ExpressionConverter _expressionConverter;
    private readonly StatementConverter _statementConverter;

    public EventHandlerBodyGenerator(
        ExpressionConverter? expressionConverter = null,
        StatementConverter? statementConverter = null)
    {
        _expressionConverter = expressionConverter ?? new ExpressionConverter();
        _statementConverter = statementConverter ?? new StatementConverter(_expressionConverter);
    }

    /// <summary>
    /// Generate complete event handler method
    /// </summary>
    public string GenerateEventHandlerMethod(EventHandlerMetadata handler, int indentLevel = 1)
    {
        var sb = new StringBuilder();
        var indent = GetIndent(indentLevel);

        // Generate parameter list
        var paramList = GenerateParameterList(handler);
        var paramStr = paramList.Count > 0 ? string.Join(", ", paramList) : "";

        // Determine return type
        var returnType = handler.IsAsync ? "async Task" : "void";

        // Method signature
        sb.AppendLine($"{indent}public {returnType} {handler.Name}({paramStr})");
        sb.AppendLine($"{indent}{{");

        // Method body
        var bodyIndent = GetIndent(indentLevel + 1);
        var bodyCode = GenerateMethodBody(handler, indentLevel + 1);

        if (!string.IsNullOrWhiteSpace(bodyCode))
        {
            sb.AppendLine(bodyCode);
        }

        sb.Append($"{indent}}}");

        return sb.ToString();
    }

    /// <summary>
    /// Generate parameter list for event handler
    /// </summary>
    private List<string> GenerateParameterList(EventHandlerMetadata handler)
    {
        var paramList = new List<string>();

        // Add regular parameters
        if (handler.Params != null)
        {
            foreach (var param in handler.Params)
            {
                if (param is JsonElement jsonParam)
                {
                    if (jsonParam.ValueKind == JsonValueKind.Object &&
                        jsonParam.TryGetProperty("type", out var typeProperty) &&
                        typeProperty.GetString() == "Identifier")
                    {
                        var paramName = jsonParam.GetProperty("name").GetString() ?? "arg";
                        paramList.Add($"dynamic {paramName}");
                    }
                    else
                    {
                        paramList.Add("dynamic arg");
                    }
                }
                else
                {
                    paramList.Add("dynamic arg");
                }
            }
        }

        // Add captured parameters from .map() context (e.g., item, index)
        if (handler.CapturedParams != null && handler.CapturedParams.Count > 0)
        {
            paramList.AddRange(handler.CapturedParams.Select(p => $"dynamic {p}"));
        }

        return paramList;
    }

    /// <summary>
    /// Generate method body from AST
    /// </summary>
    private string GenerateMethodBody(EventHandlerMetadata handler, int indentLevel)
    {
        if (handler.Body == null)
        {
            return "";
        }

        var bodyIndent = GetIndent(indentLevel);

        // Convert body object to JsonElement if needed
        JsonElement bodyJson;
        if (handler.Body is JsonElement json)
        {
            bodyJson = json;
        }
        else if (handler.Body is string jsonString)
        {
            bodyJson = JsonDocument.Parse(jsonString).RootElement;
        }
        else
        {
            // Try to serialize and deserialize
            var jsonStr = JsonSerializer.Serialize(handler.Body);
            bodyJson = JsonDocument.Parse(jsonStr).RootElement;
        }

        if (!bodyJson.TryGetProperty("type", out var typeProperty))
        {
            return "";
        }

        var bodyType = typeProperty.GetString();

        if (bodyType == "BlockStatement")
        {
            // Block statement: { ... }
            return GenerateBlockStatementBody(bodyJson, indentLevel);
        }
        else
        {
            // Expression body: () => expression
            var expression = _expressionConverter.ConvertExpression(bodyJson);
            return $"{bodyIndent}{expression};";
        }
    }

    /// <summary>
    /// Generate body from BlockStatement
    /// </summary>
    private string GenerateBlockStatementBody(JsonElement blockNode, int indentLevel)
    {
        if (!blockNode.TryGetProperty("body", out var body))
        {
            return "";
        }

        var sb = new StringBuilder();
        var bodyIndent = GetIndent(indentLevel);

        foreach (var statement in body.EnumerateArray())
        {
            var statementCode = _statementConverter.ConvertStatement(statement, indentLevel);

            if (!string.IsNullOrWhiteSpace(statementCode))
            {
                // Check if statement already has proper indentation
                if (statementCode.StartsWith(bodyIndent))
                {
                    sb.AppendLine(statementCode);
                }
                else
                {
                    // Add indentation
                    var lines = statementCode.Split('\n');
                    foreach (var line in lines)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            sb.AppendLine(bodyIndent + line.TrimStart());
                        }
                    }
                }
            }
        }

        return sb.ToString().TrimEnd('\r', '\n');
    }

    /// <summary>
    /// Generate multiple event handler methods
    /// </summary>
    public string GenerateEventHandlerMethods(List<EventHandlerMetadata> handlers, int indentLevel = 1)
    {
        if (handlers == null || handlers.Count == 0)
        {
            return "";
        }

        var sb = new StringBuilder();

        foreach (var handler in handlers)
        {
            sb.AppendLine();
            sb.AppendLine(GenerateEventHandlerMethod(handler, indentLevel));
        }

        return sb.ToString();
    }

    #region Helper Methods

    private string GetIndent(int level)
    {
        return new string(' ', level * 4);
    }

    #endregion
}
