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
            // Allow foreach over declarative pattern match results
            var collectionExpr = node.Expression.ToString();
            if (!IsDeclarativeCollection(collectionExpr))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.LoopNotAllowed,
                    node.ForEachKeyword.GetLocation(),
                    "foreach"
                ));
            }
        }

        base.VisitForEachStatement(node);
    }

    /// <summary>
    /// Checks if the collection expression is from a declarative pattern matching source,
    /// or is a parameter being processed for depth tracking (balanced bracket logic).
    /// </summary>
    private static bool IsDeclarativeCollection(string expression)
    {
        var allowedPatterns = new[]
        {
            // Pattern match results
            "MatchAll",           // PatternMatcher.MatchAll()
            "MatchAllJsxChildren", // PatternMatcher.MatchAllJsxChildren()
            "matches",            // var matches = matcher.MatchAll()

            // Model collections
            ".Children",          // element.Children (model collection)
            ".Props",             // component.Props (model collection)
            ".StateFields",       // component.StateFields
            ".EffectHooks",       // component.EffectHooks
            ".RefHooks",          // component.RefHooks
            ".EventHandlers",     // component.EventHandlers
            ".LocalVariables",    // component.LocalVariables
            ".Templates",         // component.Templates
            ".Captures",          // match.Captures
            ".NamedCaptures",     // match.NamedCaptures

            // Processed local collections
            "rawChildren",        // local processed collection
            "mergedRuns",         // local processed collection
            "stateItems",         // processed state items

            // Token parameters for depth tracking (balanced bracket logic)
            // These implement the same logic as \Bp, \Bb internally
            "tokens",             // function parameter for depth tracking
            "innerTokens",        // extracted inner tokens
            "contentTokens",      // content tokens for processing
            "valueTokens",        // value tokens
            "exprTokens",         // expression tokens
        };

        foreach (var pattern in allowedPatterns)
        {
            if (expression.IndexOf(pattern, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            // Allow while loops that iterate over processed collections (not raw tokens)
            var condition = node.Condition.ToString();
            if (!IsDeclarativeWhileCondition(condition))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.WhileLoopNotAllowed,
                    node.WhileKeyword.GetLocation()
                ));
            }
        }

        base.VisitWhileStatement(node);
    }

    /// <summary>
    /// Checks if a while loop condition is processing declarative collections
    /// or doing depth tracking (balanced bracket logic).
    /// </summary>
    private static bool IsDeclarativeWhileCondition(string condition)
    {
        var allowedPatterns = new[]
        {
            // Processed collections
            "rawChildren",    // while (i < rawChildren.Count)
            "mergedRuns",     // while processing merged runs
            "children",       // while (i < children.Count)
            "matches",        // while (i < matches.Count)
            "stateItems",     // while processing state items

            // Index-based iteration over token parameters (depth tracking)
            "tokens",         // while (i < tokens.Length)
            "innerTokens",    // while processing inner tokens
            "contentTokens",  // while processing content
            "bodyTokens",     // while processing body
            "paramTokens",    // while processing parameters

            // Depth tracking patterns
            "depth",          // while (depth > 0) - balanced bracket tracking
            "braceDepth",     // while (braceDepth > 0)
            "parenDepth",     // while (parenDepth > 0)
        };

        foreach (var pattern in allowedPatterns)
        {
            if (condition.IndexOf(pattern, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
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
