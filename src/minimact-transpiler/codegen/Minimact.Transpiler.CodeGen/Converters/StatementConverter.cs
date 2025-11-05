using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace Minimact.Transpiler.CodeGen.Converters;

/// <summary>
/// Converts JavaScript AST statements to C# statements
/// Ported from babel-plugin-minimact/src/generators/expressions.cjs (generateCSharpStatement)
/// </summary>
public class StatementConverter
{
    private readonly ExpressionConverter _expressionConverter;
    private int _indentLevel;

    public StatementConverter(ExpressionConverter? expressionConverter = null)
    {
        _expressionConverter = expressionConverter ?? new ExpressionConverter();
        _indentLevel = 0;
    }

    /// <summary>
    /// Convert a JavaScript AST statement node to C# statement string
    /// </summary>
    public string ConvertStatement(JsonElement node, int indentLevel = 0)
    {
        _indentLevel = indentLevel;

        if (!node.TryGetProperty("type", out var typeProperty))
        {
            return "";
        }

        var nodeType = typeProperty.GetString();

        return nodeType switch
        {
            "ExpressionStatement" => ConvertExpressionStatement(node),
            "ReturnStatement" => ConvertReturnStatement(node),
            "ThrowStatement" => ConvertThrowStatement(node),
            "VariableDeclaration" => ConvertVariableDeclaration(node),
            "IfStatement" => ConvertIfStatement(node),
            "TryStatement" => ConvertTryStatement(node),
            "BlockStatement" => ConvertBlockStatement(node),
            "ForStatement" => ConvertForStatement(node),
            "WhileStatement" => ConvertWhileStatement(node),
            "DoWhileStatement" => ConvertDoWhileStatement(node),
            "ForOfStatement" => ConvertForOfStatement(node),
            "SwitchStatement" => ConvertSwitchStatement(node),
            "BreakStatement" => "break;",
            "ContinueStatement" => "continue;",
            "EmptyStatement" => ";",
            _ => ConvertAsExpression(node)
        };
    }

    #region Statement Converters

    private string ConvertExpressionStatement(JsonElement node)
    {
        if (!node.TryGetProperty("expression", out var expression))
        {
            return ";";
        }

        return _expressionConverter.ConvertExpression(expression) + ";";
    }

    private string ConvertReturnStatement(JsonElement node)
    {
        // Handle empty return statement: return;
        if (!node.TryGetProperty("argument", out var argument) || argument.ValueKind == JsonValueKind.Null)
        {
            return "return;";
        }

        return $"return {_expressionConverter.ConvertExpression(argument)};";
    }

    private string ConvertThrowStatement(JsonElement node)
    {
        if (!node.TryGetProperty("argument", out var argument))
        {
            return "throw new Exception();";
        }

        return $"throw {_expressionConverter.ConvertExpression(argument)};";
    }

    private string ConvertVariableDeclaration(JsonElement node)
    {
        if (!node.TryGetProperty("declarations", out var declarations))
        {
            return "";
        }

        var results = new List<string>();

        foreach (var declaration in declarations.EnumerateArray())
        {
            if (!declaration.TryGetProperty("id", out var id))
            {
                continue;
            }

            var name = id.GetProperty("name").GetString();

            if (declaration.TryGetProperty("init", out var init) && init.ValueKind != JsonValueKind.Null)
            {
                var value = _expressionConverter.ConvertExpression(init);
                results.Add($"var {name} = {value};");
            }
            else
            {
                results.Add($"var {name};");
            }
        }

        return string.Join(" ", results);
    }

    private string ConvertIfStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        // Test condition
        if (!node.TryGetProperty("test", out var test))
        {
            return "";
        }

        var testExpr = _expressionConverter.ConvertExpression(test);
        sb.AppendLine($"if ({testExpr})");
        sb.AppendLine(indent + "{");

        // Consequent (then branch)
        if (node.TryGetProperty("consequent", out var consequent))
        {
            _indentLevel++;
            var consequentCode = ConvertStatementOrBlock(consequent);
            sb.AppendLine(AddIndent(consequentCode));
            _indentLevel--;
        }

        sb.Append(indent + "}");

        // Alternate (else branch)
        if (node.TryGetProperty("alternate", out var alternate) && alternate.ValueKind != JsonValueKind.Null)
        {
            var alternateType = alternate.GetProperty("type").GetString();

            if (alternateType == "IfStatement")
            {
                // else if
                sb.AppendLine();
                sb.Append(indent + "else ");
                _indentLevel++;
                sb.Append(ConvertIfStatement(alternate).TrimStart());
                _indentLevel--;
            }
            else
            {
                // else
                sb.AppendLine();
                sb.AppendLine(indent + "else");
                sb.AppendLine(indent + "{");
                _indentLevel++;
                var alternateCode = ConvertStatementOrBlock(alternate);
                sb.AppendLine(AddIndent(alternateCode));
                _indentLevel--;
                sb.Append(indent + "}");
            }
        }

        return sb.ToString();
    }

    private string ConvertTryStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        sb.AppendLine("try");
        sb.AppendLine(indent + "{");

        // Try block
        if (node.TryGetProperty("block", out var block))
        {
            _indentLevel++;
            var blockCode = ConvertStatementOrBlock(block);
            sb.AppendLine(AddIndent(blockCode));
            _indentLevel--;
        }

        sb.AppendLine(indent + "}");

        // Catch clause
        if (node.TryGetProperty("handler", out var handler) && handler.ValueKind != JsonValueKind.Null)
        {
            var catchParam = "ex";
            if (handler.TryGetProperty("param", out var param) && param.ValueKind != JsonValueKind.Null)
            {
                catchParam = param.GetProperty("name").GetString() ?? "ex";
            }

            sb.AppendLine(indent + $"catch (Exception {catchParam})");
            sb.AppendLine(indent + "{");

            if (handler.TryGetProperty("body", out var catchBody))
            {
                _indentLevel++;
                var catchCode = ConvertStatementOrBlock(catchBody);
                sb.AppendLine(AddIndent(catchCode));
                _indentLevel--;
            }

            sb.AppendLine(indent + "}");
        }

        // Finally block
        if (node.TryGetProperty("finalizer", out var finalizer) && finalizer.ValueKind != JsonValueKind.Null)
        {
            sb.AppendLine(indent + "finally");
            sb.AppendLine(indent + "{");

            _indentLevel++;
            var finallyCode = ConvertStatementOrBlock(finalizer);
            sb.AppendLine(AddIndent(finallyCode));
            _indentLevel--;

            sb.Append(indent + "}");
        }

        return sb.ToString().TrimEnd();
    }

    private string ConvertBlockStatement(JsonElement node)
    {
        if (!node.TryGetProperty("body", out var body))
        {
            return "";
        }

        var statements = body.EnumerateArray()
            .Select(stmt => ConvertStatement(stmt, _indentLevel))
            .Where(s => !string.IsNullOrWhiteSpace(s));

        return string.Join("\n" + GetIndent(), statements);
    }

    private string ConvertForStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        // for (init; test; update)
        var init = node.TryGetProperty("init", out var initNode) && initNode.ValueKind != JsonValueKind.Null
            ? ConvertStatement(initNode, 0).TrimEnd(';')
            : "";

        var test = node.TryGetProperty("test", out var testNode) && testNode.ValueKind != JsonValueKind.Null
            ? _expressionConverter.ConvertExpression(testNode)
            : "";

        var update = node.TryGetProperty("update", out var updateNode) && updateNode.ValueKind != JsonValueKind.Null
            ? _expressionConverter.ConvertExpression(updateNode)
            : "";

        sb.AppendLine($"for ({init}; {test}; {update})");
        sb.AppendLine(indent + "{");

        if (node.TryGetProperty("body", out var body))
        {
            _indentLevel++;
            var bodyCode = ConvertStatementOrBlock(body);
            sb.AppendLine(AddIndent(bodyCode));
            _indentLevel--;
        }

        sb.Append(indent + "}");

        return sb.ToString();
    }

    private string ConvertWhileStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        if (!node.TryGetProperty("test", out var test))
        {
            return "";
        }

        var testExpr = _expressionConverter.ConvertExpression(test);
        sb.AppendLine($"while ({testExpr})");
        sb.AppendLine(indent + "{");

        if (node.TryGetProperty("body", out var body))
        {
            _indentLevel++;
            var bodyCode = ConvertStatementOrBlock(body);
            sb.AppendLine(AddIndent(bodyCode));
            _indentLevel--;
        }

        sb.Append(indent + "}");

        return sb.ToString();
    }

    private string ConvertDoWhileStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        sb.AppendLine("do");
        sb.AppendLine(indent + "{");

        if (node.TryGetProperty("body", out var body))
        {
            _indentLevel++;
            var bodyCode = ConvertStatementOrBlock(body);
            sb.AppendLine(AddIndent(bodyCode));
            _indentLevel--;
        }

        sb.AppendLine(indent + "}");

        if (!node.TryGetProperty("test", out var test))
        {
            return sb.ToString();
        }

        var testExpr = _expressionConverter.ConvertExpression(test);
        sb.Append(indent + $"while ({testExpr});");

        return sb.ToString();
    }

    private string ConvertForOfStatement(JsonElement node)
    {
        // for (const item of items) → foreach (var item in items)
        var sb = new StringBuilder();
        var indent = GetIndent();

        if (!node.TryGetProperty("left", out var left) || !node.TryGetProperty("right", out var right))
        {
            return "";
        }

        var itemName = "item";
        if (left.TryGetProperty("declarations", out var declarations))
        {
            var firstDecl = declarations.EnumerateArray().FirstOrDefault();
            if (firstDecl.ValueKind != JsonValueKind.Undefined && firstDecl.TryGetProperty("id", out var id))
            {
                itemName = id.GetProperty("name").GetString() ?? "item";
            }
        }

        var collection = _expressionConverter.ConvertExpression(right);

        sb.AppendLine($"foreach (var {itemName} in {collection})");
        sb.AppendLine(indent + "{");

        if (node.TryGetProperty("body", out var body))
        {
            _indentLevel++;
            var bodyCode = ConvertStatementOrBlock(body);
            sb.AppendLine(AddIndent(bodyCode));
            _indentLevel--;
        }

        sb.Append(indent + "}");

        return sb.ToString();
    }

    private string ConvertSwitchStatement(JsonElement node)
    {
        var sb = new StringBuilder();
        var indent = GetIndent();

        if (!node.TryGetProperty("discriminant", out var discriminant))
        {
            return "";
        }

        var switchExpr = _expressionConverter.ConvertExpression(discriminant);
        sb.AppendLine($"switch ({switchExpr})");
        sb.AppendLine(indent + "{");

        if (node.TryGetProperty("cases", out var cases))
        {
            _indentLevel++;
            foreach (var caseNode in cases.EnumerateArray())
            {
                var caseIndent = GetIndent();

                if (caseNode.TryGetProperty("test", out var test) && test.ValueKind != JsonValueKind.Null)
                {
                    // case value:
                    var caseValue = _expressionConverter.ConvertExpression(test);
                    sb.AppendLine(caseIndent + $"case {caseValue}:");
                }
                else
                {
                    // default:
                    sb.AppendLine(caseIndent + "default:");
                }

                // Case body
                if (caseNode.TryGetProperty("consequent", out var consequent))
                {
                    _indentLevel++;
                    foreach (var stmt in consequent.EnumerateArray())
                    {
                        var stmtCode = ConvertStatement(stmt, _indentLevel);
                        sb.AppendLine(GetIndent() + stmtCode);
                    }
                    _indentLevel--;
                }
            }
            _indentLevel--;
        }

        sb.Append(indent + "}");

        return sb.ToString();
    }

    private string ConvertAsExpression(JsonElement node)
    {
        // Fallback: try to convert as expression
        return _expressionConverter.ConvertExpression(node) + ";";
    }

    #endregion

    #region Helper Methods

    private string ConvertStatementOrBlock(JsonElement node)
    {
        var nodeType = node.GetProperty("type").GetString();

        if (nodeType == "BlockStatement")
        {
            return ConvertBlockStatement(node);
        }
        else
        {
            return ConvertStatement(node, _indentLevel);
        }
    }

    private string GetIndent()
    {
        return new string(' ', _indentLevel * 4);
    }

    private string AddIndent(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return "";
        }

        var indent = GetIndent();
        var lines = code.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join("\n" + indent, lines);
    }

    #endregion
}
