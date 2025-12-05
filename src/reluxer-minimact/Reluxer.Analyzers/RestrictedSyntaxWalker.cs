using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Walks the syntax tree of a [TokenPattern] method body,
/// reporting diagnostics for imperative constructs that violate
/// the declarative visitor model.
/// </summary>
internal sealed class RestrictedSyntaxWalker : CSharpSyntaxWalker
{
    private readonly SyntaxNodeAnalysisContext _context;
    private readonly string _methodName;
    private int _nestedLambdaDepth = 0;

    public RestrictedSyntaxWalker(SyntaxNodeAnalysisContext context, string methodName)
    {
        _context = context;
        _methodName = methodName;
    }

    #region Loop Detection (REL001, REL007)

    public override void VisitForStatement(ForStatementSyntax node)
    {
        // Skip if inside a lambda (LINQ operations)
        if (_nestedLambdaDepth == 0)
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.LoopNotAllowed,
                node.ForKeyword.GetLocation(),
                "for"
            ));
        }

        base.VisitForStatement(node);
    }

    public override void VisitForEachStatement(ForEachStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.LoopNotAllowed,
                node.ForEachKeyword.GetLocation(),
                "foreach"
            ));
        }

        base.VisitForEachStatement(node);
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.WhileLoopNotAllowed,
                node.WhileKeyword.GetLocation()
            ));
        }

        base.VisitWhileStatement(node);
    }

    public override void VisitDoStatement(DoStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.LoopNotAllowed,
                node.DoKeyword.GetLocation(),
                "do-while"
            ));
        }

        base.VisitDoStatement(node);
    }

    #endregion

    #region Goto Detection (REL008)

    public override void VisitGotoStatement(GotoStatementSyntax node)
    {
        _context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.GotoNotAllowed,
            node.GotoKeyword.GetLocation()
        ));

        base.VisitGotoStatement(node);
    }

    public override void VisitLabeledStatement(LabeledStatementSyntax node)
    {
        // Labels themselves aren't an error, but goto to them is
        base.VisitLabeledStatement(node);
    }

    #endregion

    #region Direct Token Access Detection (REL002)

    public override void VisitElementAccessExpression(ElementAccessExpressionSyntax node)
    {
        var expression = node.Expression.ToString();

        if (IsTokenArrayAccess(expression))
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.DirectTokenAccessNotAllowed,
                node.GetLocation(),
                expression
            ));
        }

        base.VisitElementAccessExpression(node);
    }

    private static bool IsTokenArrayAccess(string expression)
    {
        // Common patterns for token array access
        var tokenPatterns = new[]
        {
            "_tokens",
            "tokens",
            "_componentBody",
            "componentBody",
            "bodyTokens",
            "paramTokens",
            "contentTokens",
            "exprTokens",
            "match.MatchedTokens",
        };

        foreach (var pattern in tokenPatterns)
        {
            if (expression.Equals(pattern, StringComparison.Ordinal) ||
                expression.EndsWith("." + pattern, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    #endregion

    #region LINQ on Tokens Detection (REL005)

    public override void VisitInvocationExpression(InvocationExpressionSyntax node)
    {
        if (node.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            var methodName = memberAccess.Name.Identifier.Text;
            var targetExpr = memberAccess.Expression.ToString();

            // Check if calling warning LINQ methods on token-like expressions
            if (IsTokenExpression(targetExpr) && AllowedMethodsRegistry.IsWarningLinqMethod(methodName))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.AvoidLinqOnTokens,
                    node.GetLocation(),
                    methodName
                ));
            }

            // Check for recursive calls without Traverse (REL009)
            if (methodName == _methodName && !IsInsideTraverseCall(node))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.RecursiveCallWithoutTraverse,
                    node.GetLocation(),
                    methodName
                ));
            }
        }

        base.VisitInvocationExpression(node);
    }

    private static bool IsTokenExpression(string expression)
    {
        var tokenIndicators = new[]
        {
            "tokens",
            "Tokens",
            "body",
            "Body",
            "content",
            "Content",
            "match.Captures",
            "match.MatchedTokens",
        };

        foreach (var indicator in tokenIndicators)
        {
            if (expression.IndexOf(indicator, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsInsideTraverseCall(SyntaxNode node)
    {
        var parent = node.Parent;
        while (parent != null)
        {
            if (parent is InvocationExpressionSyntax invocation)
            {
                var invokedMethod = invocation.Expression.ToString();
                if (invokedMethod.EndsWith("Traverse", StringComparison.Ordinal))
                {
                    return true;
                }
            }
            parent = parent.Parent;
        }
        return false;
    }

    #endregion

    #region Manual Token Type Checking Detection (REL006)

    public override void VisitBinaryExpression(BinaryExpressionSyntax node)
    {
        if (node.IsKind(SyntaxKind.EqualsExpression) ||
            node.IsKind(SyntaxKind.NotEqualsExpression))
        {
            var leftStr = node.Left.ToString();
            var rightStr = node.Right.ToString();

            // Detect: token.Type == TokenType.Identifier
            if ((leftStr.Contains(".Type") && rightStr.Contains("TokenType")) ||
                (rightStr.Contains(".Type") && leftStr.Contains("TokenType")))
            {
                var tokenType = ExtractTokenType(leftStr + rightStr);
                var suggestedPattern = SuggestPattern(tokenType);

                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.PreferPatternOverManualParsing,
                    node.GetLocation(),
                    suggestedPattern
                ));
            }
        }

        base.VisitBinaryExpression(node);
    }

    private static string ExtractTokenType(string expression)
    {
        // Extract token type from "TokenType.Identifier" etc.
        var startIndex = expression.IndexOf("TokenType.", StringComparison.Ordinal);
        if (startIndex < 0) return "Unknown";

        startIndex += "TokenType.".Length;
        var endIndex = startIndex;
        while (endIndex < expression.Length && char.IsLetterOrDigit(expression[endIndex]))
        {
            endIndex++;
        }

        return expression.Substring(startIndex, endIndex - startIndex);
    }

    private static string SuggestPattern(string tokenType)
    {
        return tokenType switch
        {
            "Identifier" => @"Use pattern: \i",
            "Keyword" => @"Use pattern: \k""value""",
            "String" => @"Use pattern: \s",
            "Number" => @"Use pattern: \n",
            "Operator" => @"Use pattern: \o""value""",
            "Punctuation" => @"Use pattern: \p""value"" or ""value""",
            "Whitespace" => @"Use pattern: \w",
            "Comment" => @"Use pattern: \c",
            "JsxTagOpen" => @"Use pattern: \jo",
            "JsxTagClose" => @"Use pattern: \jc",
            "JsxTagEnd" => @"Use pattern: \je",
            "JsxAttrName" => @"Use pattern: \ja",
            "JsxAttrValue" => @"Use pattern: \jv",
            "JsxText" => @"Use pattern: \jt",
            "Arrow" => @"Use pattern: \fa",
            "Colon" => @"Use pattern: \co or \cl",
            "QuestionMark" => @"Use pattern: \qm",
            "TypeName" => @"Use pattern: \tn",
            "GenericOpen" => @"Use pattern: \go",
            "GenericClose" => @"Use pattern: \gc",
            _ => $@"Create [TokenPattern] for TokenType.{tokenType}"
        };
    }

    #endregion

    #region Field Mutation Detection (REL003)

    public override void VisitAssignmentExpression(AssignmentExpressionSyntax node)
    {
        var left = node.Left.ToString();

        // Check for field assignment (starts with _ or this.)
        if (IsFieldMutation(left))
        {
            // Allow certain safe fields
            if (!AllowedMethodsRegistry.IsSafeReadOnlyField(left.TrimStart('_')))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    left
                ));
            }
        }

        base.VisitAssignmentExpression(node);
    }

    public override void VisitPrefixUnaryExpression(PrefixUnaryExpressionSyntax node)
    {
        // Catch ++i and --i on fields
        if (node.IsKind(SyntaxKind.PreIncrementExpression) ||
            node.IsKind(SyntaxKind.PreDecrementExpression))
        {
            var operand = node.Operand.ToString();
            if (IsFieldMutation(operand))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    operand
                ));
            }
        }

        base.VisitPrefixUnaryExpression(node);
    }

    public override void VisitPostfixUnaryExpression(PostfixUnaryExpressionSyntax node)
    {
        // Catch i++ and i-- on fields
        if (node.IsKind(SyntaxKind.PostIncrementExpression) ||
            node.IsKind(SyntaxKind.PostDecrementExpression))
        {
            var operand = node.Operand.ToString();
            if (IsFieldMutation(operand))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    operand
                ));
            }
        }

        base.VisitPostfixUnaryExpression(node);
    }

    private static bool IsFieldMutation(string expression)
    {
        // Field patterns: _fieldName, this._fieldName, this.FieldName
        if (expression.StartsWith("_", StringComparison.Ordinal))
            return true;

        if (expression.StartsWith("this.", StringComparison.Ordinal))
            return true;

        return false;
    }

    #endregion

    #region Lambda Tracking

    // Track when we're inside a lambda to allow certain constructs
    // (e.g., loops inside LINQ lambdas might be acceptable)

    public override void VisitSimpleLambdaExpression(SimpleLambdaExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitSimpleLambdaExpression(node);
        _nestedLambdaDepth--;
    }

    public override void VisitParenthesizedLambdaExpression(ParenthesizedLambdaExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitParenthesizedLambdaExpression(node);
        _nestedLambdaDepth--;
    }

    public override void VisitAnonymousMethodExpression(AnonymousMethodExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitAnonymousMethodExpression(node);
        _nestedLambdaDepth--;
    }

    #endregion
}
