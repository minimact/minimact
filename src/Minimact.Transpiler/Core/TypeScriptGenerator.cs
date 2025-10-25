using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text;

namespace Minimact.Transpiler.Core;

/// <summary>
/// Generates TypeScript code from C# Roslyn syntax trees
///
/// Maps C# language constructs to equivalent TypeScript while preserving
/// algorithm behavior for MockClient testing compatibility.
/// </summary>
public class TypeScriptGenerator : CSharpSyntaxWalker
{
    private readonly StringBuilder _output;
    private SemanticModel? _semanticModel;
    private int _indentLevel;

    public TypeScriptGenerator()
    {
        _output = new StringBuilder();
    }

    /// <summary>
    /// Generate TypeScript from C# syntax tree
    /// </summary>
    public string Generate(SyntaxNode root, SemanticModel semanticModel)
    {
        _output.Clear();
        _indentLevel = 0;

        // Create generator with semantic model for type analysis
        var generator = new TypeScriptGenerator
        {
            _semanticModel = semanticModel
        };

        // Walk the syntax tree and generate TypeScript
        generator.Visit(root);

        return generator._output.ToString();
    }

    #region Syntax Visitors

    public override void VisitNamespaceDeclaration(NamespaceDeclarationSyntax node)
    {
        // Skip C# namespaces - use ES6 modules instead
        WriteLine($"// Namespace: {node.Name}");
        WriteLine("");

        // Visit namespace contents
        base.VisitNamespaceDeclaration(node);
    }

    public override void VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        var className = node.Identifier.ValueText;

        // Generate TypeScript class
        WriteIndented($"export class {className} {{");
        _indentLevel++;

        // Process class members
        base.VisitClassDeclaration(node);

        _indentLevel--;
        WriteIndented("}");
        WriteLine("");
    }

    public override void VisitFieldDeclaration(FieldDeclarationSyntax node)
    {
        foreach (var variable in node.Declaration.Variables)
        {
            var fieldName = ToCamelCase(variable.Identifier.ValueText);
            var typeString = MapTypeToTypeScript(node.Declaration.Type);
            var visibility = GetVisibility(node.Modifiers);

            if (visibility == "private")
            {
                WriteIndented($"private {fieldName}: {typeString};");
            }
            else
            {
                WriteIndented($"{fieldName}: {typeString};");
            }
        }
    }

    public override void VisitPropertyDeclaration(PropertyDeclarationSyntax node)
    {
        var propertyName = ToCamelCase(node.Identifier.ValueText);
        var typeString = MapTypeToTypeScript(node.Type);
        var visibility = GetVisibility(node.Modifiers);

        if (node.AccessorList != null)
        {
            // Auto-property -> TypeScript property
            if (visibility == "private")
            {
                WriteIndented($"private {propertyName}: {typeString};");
            }
            else
            {
                WriteIndented($"{propertyName}: {typeString};");
            }
        }
    }

    public override void VisitMethodDeclaration(MethodDeclarationSyntax node)
    {
        var methodName = ToCamelCase(node.Identifier.ValueText);
        var returnType = MapTypeToTypeScript(node.ReturnType);
        var visibility = GetVisibility(node.Modifiers);
        var isStatic = node.Modifiers.Any(m => m.IsKind(SyntaxKind.StaticKeyword));

        // Build parameter list
        var parameters = node.ParameterList.Parameters
            .Select(p => $"{ToCamelCase(p.Identifier.ValueText)}: {MapTypeToTypeScript(p.Type!)}")
            .ToArray();

        var paramString = string.Join(", ", parameters);
        var staticKeyword = isStatic ? "static " : "";
        var visibilityKeyword = visibility == "private" ? "private " : "";

        WriteIndented($"{visibilityKeyword}{staticKeyword}{methodName}({paramString}): {returnType} {{");
        _indentLevel++;

        // Visit method body
        if (node.Body != null)
        {
            Visit(node.Body);
        }

        _indentLevel--;
        WriteIndented("}");
        WriteLine("");
    }

    public override void VisitConstructorDeclaration(ConstructorDeclarationSyntax node)
    {
        var parameters = node.ParameterList.Parameters
            .Select(p => $"{ToCamelCase(p.Identifier.ValueText)}: {MapTypeToTypeScript(p.Type!)}")
            .ToArray();

        var paramString = string.Join(", ", parameters);

        WriteIndented($"constructor({paramString}) {{");
        _indentLevel++;

        // Visit constructor body
        if (node.Body != null)
        {
            Visit(node.Body);
        }

        _indentLevel--;
        WriteIndented("}");
        WriteLine("");
    }

    public override void VisitBlock(BlockSyntax node)
    {
        foreach (var statement in node.Statements)
        {
            Visit(statement);
        }
    }

    public override void VisitExpressionStatement(ExpressionStatementSyntax node)
    {
        WriteIndented($"{GenerateExpression(node.Expression)};");
    }

    public override void VisitLocalDeclarationStatement(LocalDeclarationStatementSyntax node)
    {
        foreach (var variable in node.Declaration.Variables)
        {
            var varName = ToCamelCase(variable.Identifier.ValueText);
            var typeString = MapTypeToTypeScript(node.Declaration.Type);

            // Handle 'var' inference and avoid explicit types when TypeScript can infer
            bool useTypeAnnotation = true;
            if (node.Declaration.Type is IdentifierNameSyntax identifier && identifier.Identifier.ValueText == "var")
            {
                useTypeAnnotation = false; // Let TypeScript infer
            }

            if (variable.Initializer != null)
            {
                var initializer = GenerateExpression(variable.Initializer.Value);
                if (useTypeAnnotation && typeString != "var")
                {
                    WriteIndented($"let {varName}: {typeString} = {initializer};");
                }
                else
                {
                    WriteIndented($"let {varName} = {initializer};");
                }
            }
            else
            {
                if (useTypeAnnotation && typeString != "var")
                {
                    WriteIndented($"let {varName}: {typeString};");
                }
                else
                {
                    WriteIndented($"let {varName}: any;");
                }
            }
        }
    }

    public override void VisitReturnStatement(ReturnStatementSyntax node)
    {
        if (node.Expression != null)
        {
            WriteIndented($"return {GenerateExpression(node.Expression)};");
        }
        else
        {
            WriteIndented("return;");
        }
    }

    public override void VisitIfStatement(IfStatementSyntax node)
    {
        var condition = GenerateExpression(node.Condition);
        WriteIndented($"if ({condition}) {{");
        _indentLevel++;
        Visit(node.Statement);
        _indentLevel--;

        if (node.Else != null)
        {
            WriteIndented("} else {");
            _indentLevel++;
            Visit(node.Else.Statement);
            _indentLevel--;
        }

        WriteIndented("}");
    }

    public override void VisitForStatement(ForStatementSyntax node)
    {
        var declaration = node.Declaration?.Variables.FirstOrDefault();
        var condition = node.Condition != null ? GenerateExpression(node.Condition) : "";
        var incrementors = string.Join(", ", node.Incrementors.Select(GenerateExpression));

        if (declaration != null)
        {
            var varName = ToCamelCase(declaration.Identifier.ValueText);
            var initializer = declaration.Initializer != null ? GenerateExpression(declaration.Initializer.Value) : "0";
            WriteIndented($"for (let {varName} = {initializer}; {condition}; {incrementors}) {{");
        }
        else
        {
            WriteIndented($"for (; {condition}; {incrementors}) {{");
        }

        _indentLevel++;
        Visit(node.Statement);
        _indentLevel--;
        WriteIndented("}");
    }

    public override void VisitForEachStatement(ForEachStatementSyntax node)
    {
        var identifier = ToCamelCase(node.Identifier.ValueText);
        var expression = GenerateExpression(node.Expression);

        // Handle Dictionary/Map iteration specially
        if (IsDictionaryIteration(node.Expression))
        {
            WriteIndented($"for (const [{identifier.Replace("kvp", "key")}, {identifier.Replace("kvp", "value")}] of {expression}) {{");
        }
        else
        {
            WriteIndented($"for (const {identifier} of {expression}) {{");
        }

        _indentLevel++;
        Visit(node.Statement);
        _indentLevel--;
        WriteIndented("}");
    }

    private bool IsDictionaryIteration(ExpressionSyntax expression)
    {
        // Check if we're iterating over a Dictionary/Map
        return expression.ToString().Contains("Dictionary") ||
               expression.ToString().Contains("Map") ||
               expression.ToString().Contains("observableElements") ||
               expression.ToString().Contains("predictionThrottle");
    }

    #endregion

    #region Expression Generation

    private string GenerateExpression(ExpressionSyntax expression)
    {
        return expression switch
        {
            LiteralExpressionSyntax literal => GenerateLiteral(literal),
            IdentifierNameSyntax identifier => MapIdentifierName(identifier.Identifier.ValueText),
            MemberAccessExpressionSyntax memberAccess => GenerateMemberAccess(memberAccess),
            InvocationExpressionSyntax invocation => GenerateInvocation(invocation),
            ObjectCreationExpressionSyntax objectCreation => GenerateObjectCreation(objectCreation),
            BinaryExpressionSyntax binary => GenerateBinaryExpression(binary),
            AssignmentExpressionSyntax assignment => GenerateAssignment(assignment),
            ElementAccessExpressionSyntax elementAccess => GenerateElementAccess(elementAccess),
            ConditionalExpressionSyntax conditional => GenerateConditional(conditional),
            ThisExpressionSyntax => "this",
            CastExpressionSyntax cast => GenerateCastExpression(cast),
            ArrayCreationExpressionSyntax arrayCreation => GenerateArrayCreation(arrayCreation),
            ParenthesizedExpressionSyntax parenthesized => $"({GenerateExpression(parenthesized.Expression)})",
            PrefixUnaryExpressionSyntax prefix => GeneratePrefixUnary(prefix),
            PostfixUnaryExpressionSyntax postfix => GeneratePostfixUnary(postfix),
            ImplicitObjectCreationExpressionSyntax implicitObject => GenerateImplicitObjectCreation(implicitObject),
            InterpolatedStringExpressionSyntax interpolated => GenerateInterpolatedString(interpolated),
            _ => $"/* TODO: {expression.GetType().Name} */"
        };
    }

    private string GenerateLiteral(LiteralExpressionSyntax literal)
    {
        // Handle string literals properly
        if (literal.Token.IsKind(SyntaxKind.StringLiteralToken))
        {
            var value = literal.Token.ValueText;
            // Escape quotes and special characters for TypeScript
            value = value.Replace("\\", "\\\\").Replace("\"", "\\\"");
            return $"\"{value}\"";
        }

        // Handle character literals
        if (literal.Token.IsKind(SyntaxKind.CharacterLiteralToken))
        {
            return $"\"{literal.Token.ValueText}\""; // Convert char to string in TS
        }

        // Handle boolean literals
        if (literal.Token.IsKind(SyntaxKind.TrueKeyword))
        {
            return "true";
        }
        if (literal.Token.IsKind(SyntaxKind.FalseKeyword))
        {
            return "false";
        }

        // Handle null literal
        if (literal.Token.IsKind(SyntaxKind.NullKeyword))
        {
            return "null";
        }

        // Handle other literals (numbers, etc.)
        return literal.Token.ValueText;
    }

    private string GenerateMemberAccess(MemberAccessExpressionSyntax memberAccess)
    {
        var left = GenerateExpression(memberAccess.Expression);
        var right = memberAccess.Name.Identifier.ValueText;

        // Handle special cases for C# -> TS mapping
        if (left == "Math")
        {
            // Map C# Math methods to TypeScript Math (case-sensitive!)
            var tsMethod = right switch
            {
                "Sqrt" => "sqrt",
                "Abs" => "abs",
                "Floor" => "floor",
                "Atan2" => "atan2",
                "Cos" => "cos",
                "Sin" => "sin",
                "Pow" => "pow",
                "Min" => "min",
                "Max" => "max",
                "PI" => "PI",
                _ => right.ToLower()
            };
            return $"Math.{tsMethod}";
        }

        // Handle constants like double.PositiveInfinity
        if (left == "double" || left == "Double")
        {
            return MapConstant(right);
        }

        // Handle C# collection method names -> TypeScript equivalents
        var rightConverted = right switch
        {
            "Push" => "push",
            "GetLast" => "getLast",
            "GetAll" => "getAll",
            "Clear" => "clear",
            "Length" => "length",
            "Count" => "length",

            // Dictionary/Map methods (critical for worker logic!)
            "ContainsKey" => "has",
            "ContainsValue" => "hasValue", // Note: Maps don't have this, need custom logic
            "Add" => "set",
            "Remove" => "delete",
            "TryGetValue" => "get", // Note: different semantics

            _ => IsMethodCall(memberAccess) ? ToCamelCase(right) : ToCamelCase(right)
        };

        return $"{left}.{rightConverted}";
    }

    private bool IsMethodCall(MemberAccessExpressionSyntax memberAccess)
    {
        // Check if this member access is followed by parentheses (method call)
        return memberAccess.Parent is InvocationExpressionSyntax;
    }

    private string GenerateInvocation(InvocationExpressionSyntax invocation)
    {
        var expression = GenerateExpression(invocation.Expression);
        var arguments = invocation.ArgumentList.Arguments.Select(arg => GenerateExpression(arg.Expression)).ToArray();

        // Special handling for Array.Copy (critical for worker algorithms!)
        if (expression == "Array.Copy" && arguments.Length == 5)
        {
            // Array.Copy(source, srcIndex, dest, destIndex, length)
            // -> for (let i = 0; i < length; i++) dest[destIndex + i] = source[srcIndex + i];
            // But for inline expressions, use: source.slice(srcIndex, srcIndex + length).forEach((val, i) => dest[destIndex + i] = val)
            var source = arguments[0];
            var srcIndex = arguments[1];
            var dest = arguments[2];
            var destIndex = arguments[3];
            var length = arguments[4];

            return $"{source}.slice({srcIndex}, {srcIndex} + {length}).forEach((val, i) => {dest}[{destIndex} + i] = val)";
        }

        // Handle worker-specific API calls
        if (expression == "Script.Call")
        {
            // Script.Call("postMessage", message) -> postMessage(message)
            if (arguments.Length >= 2 && arguments[0].Trim('"') == "postMessage")
            {
                var messageArgs = string.Join(", ", arguments.Skip(1));
                return $"postMessage({messageArgs})";
            }

            // Script.Call("self.addEventListener", "message", handler) -> self.addEventListener("message", handler)
            if (arguments.Length >= 3 && arguments[0].Contains("addEventListener"))
            {
                var eventArgs = string.Join(", ", arguments.Skip(1));
                return $"self.addEventListener({eventArgs})";
            }
        }

        // Handle Global.Performance.Now() -> performance.now()
        if (expression == "Global.Performance.Now")
        {
            return "performance.now()";
        }

        // Handle other special method mappings
        expression = MapMethodCallToTypeScript(expression);

        var argumentString = string.Join(", ", arguments);
        return $"{expression}({argumentString})";
    }

    private string GenerateObjectCreation(ObjectCreationExpressionSyntax objectCreation)
    {
        var typeName = MapTypeToTypeScript(objectCreation.Type);

        // Handle object initializers (critical for faithfulness!)
        if (objectCreation.Initializer != null)
        {
            var initializer = GenerateObjectInitializer(objectCreation.Initializer);

            if (objectCreation.ArgumentList != null)
            {
                var arguments = string.Join(", ", objectCreation.ArgumentList.Arguments.Select(arg => GenerateExpression(arg.Expression)));
                return $"Object.assign(new {typeName}({arguments}), {initializer})";
            }
            else
            {
                // For simple object literals, just return the initializer
                if (IsSimpleObjectType(typeName))
                {
                    return initializer;
                }
                return $"Object.assign(new {typeName}(), {initializer})";
            }
        }

        if (objectCreation.ArgumentList != null)
        {
            var arguments = string.Join(", ", objectCreation.ArgumentList.Arguments.Select(arg => GenerateExpression(arg.Expression)));
            return $"new {typeName}({arguments})";
        }

        return $"new {typeName}()";
    }

    private bool IsSimpleObjectType(string typeName)
    {
        // Types that can be represented as simple object literals
        return typeName switch
        {
            "TrajectoryPoint" => true,
            "HoverConfidenceResult" => true,
            "IntersectionConfidenceResult" => true,
            "FocusConfidenceResult" => true,
            "FocusPredictionResult" => true,
            "PredictionObservation" => true,
            "ObservablesConfig" => true,
            _ => false
        };
    }

    private string GenerateBinaryExpression(BinaryExpressionSyntax binary)
    {
        var left = GenerateExpression(binary.Left);
        var right = GenerateExpression(binary.Right);
        var op = binary.OperatorToken.ValueText;

        return $"{left} {op} {right}";
    }

    private string GenerateAssignment(AssignmentExpressionSyntax assignment)
    {
        var left = GenerateExpression(assignment.Left);
        var right = GenerateExpression(assignment.Right);
        var op = assignment.OperatorToken.ValueText;

        return $"{left} {op} {right}";
    }

    private string GenerateElementAccess(ElementAccessExpressionSyntax elementAccess)
    {
        var expression = GenerateExpression(elementAccess.Expression);
        var index = GenerateExpression(elementAccess.ArgumentList.Arguments[0].Expression);

        return $"{expression}[{index}]";
    }

    private string GenerateConditional(ConditionalExpressionSyntax conditional)
    {
        var condition = GenerateExpression(conditional.Condition);
        var whenTrue = GenerateExpression(conditional.WhenTrue);
        var whenFalse = GenerateExpression(conditional.WhenFalse);

        return $"{condition} ? {whenTrue} : {whenFalse}";
    }

    private string GenerateCastExpression(CastExpressionSyntax cast)
    {
        // TypeScript doesn't need explicit casting in most cases
        // Just generate the expression being cast
        var expression = GenerateExpression(cast.Expression);
        var targetType = MapTypeToTypeScript(cast.Type);

        // Special handling for Math.Floor cast to int
        if (targetType == "number" && expression.Contains("Math.floor"))
        {
            return expression; // Math.floor already returns number
        }

        return $"({expression} as {targetType})";
    }

    private string GenerateArrayCreation(ArrayCreationExpressionSyntax arrayCreation)
    {
        if (arrayCreation.Initializer != null)
        {
            var elements = string.Join(", ", arrayCreation.Initializer.Expressions.Select(GenerateExpression));
            return $"[{elements}]";
        }

        // new T[size] -> new Array<T>(size)
        var elementType = MapTypeToTypeScript(arrayCreation.Type.ElementType);
        if (arrayCreation.Type.RankSpecifiers.Count > 0)
        {
            var firstRank = arrayCreation.Type.RankSpecifiers[0];
            if (firstRank.Sizes.Count > 0)
            {
                var size = GenerateExpression(firstRank.Sizes[0]);
                return $"new Array<{elementType}>({size})";
            }
        }

        return $"[]";
    }

    private string GeneratePrefixUnary(PrefixUnaryExpressionSyntax prefix)
    {
        var operand = GenerateExpression(prefix.Operand);
        var op = prefix.OperatorToken.ValueText;

        return $"{op}{operand}";
    }

    private string GeneratePostfixUnary(PostfixUnaryExpressionSyntax postfix)
    {
        var operand = GenerateExpression(postfix.Operand);
        var op = postfix.OperatorToken.ValueText;

        return $"{operand}{op}";
    }

    private string GenerateImplicitObjectCreation(ImplicitObjectCreationExpressionSyntax implicitObject)
    {
        if (implicitObject.ArgumentList != null)
        {
            var arguments = string.Join(", ", implicitObject.ArgumentList.Arguments.Select(arg => GenerateExpression(arg.Expression)));

            // Try to infer type from context - for now, use object literal
            if (implicitObject.Initializer != null)
            {
                return GenerateObjectInitializer(implicitObject.Initializer);
            }

            return $"{{ {arguments} }}";
        }

        return "{}";
    }

    private string GenerateObjectInitializer(InitializerExpressionSyntax initializer)
    {
        var assignments = initializer.Expressions.Select(expr =>
        {
            if (expr is AssignmentExpressionSyntax assignment)
            {
                var left = GenerateExpression(assignment.Left);
                var right = GenerateExpression(assignment.Right);
                return $"{ToCamelCase(left)}: {right}";
            }
            return GenerateExpression(expr);
        });

        return $"{{ {string.Join(", ", assignments)} }}";
    }

    private string GenerateInterpolatedString(InterpolatedStringExpressionSyntax interpolated)
    {
        var parts = new List<string>();

        foreach (var content in interpolated.Contents)
        {
            if (content is InterpolatedStringTextSyntax text)
            {
                parts.Add($"\"{text.TextToken.ValueText}\"");
            }
            else if (content is InterpolationSyntax interpolation)
            {
                var expression = GenerateExpression(interpolation.Expression);

                // Handle format specifiers (e.g., :0 for integers)
                if (interpolation.FormatClause != null)
                {
                    var format = interpolation.FormatClause.FormatStringToken.ValueText;
                    if (format == "0")
                    {
                        expression = $"{expression}.toFixed(0)";
                    }
                    else if (format.StartsWith("F"))
                    {
                        var digits = format.Length > 1 ? format[1..] : "2";
                        expression = $"{expression}.toFixed({digits})";
                    }
                }

                parts.Add($"${{{expression}}}");
            }
        }

        return $"`{string.Join("", parts.Select(p => p.Trim('"')))}`";
    }

    #endregion

    #region Type Mapping

    private string MapTypeToTypeScript(TypeSyntax? type)
    {
        if (type == null) return "any";

        return type switch
        {
            PredefinedTypeSyntax predefined => MapPredefinedType(predefined),
            IdentifierNameSyntax identifier => MapIdentifierType(identifier),
            GenericNameSyntax generic => MapGenericType(generic),
            ArrayTypeSyntax array => $"{MapTypeToTypeScript(array.ElementType)}[]",
            NullableTypeSyntax nullable => $"{MapTypeToTypeScript(nullable.ElementType)} | null",
            _ => "any"
        };
    }

    private string MapPredefinedType(PredefinedTypeSyntax predefined)
    {
        return predefined.Keyword.ValueText switch
        {
            "bool" => "boolean",
            "byte" => "number",
            "short" => "number",
            "int" => "number",
            "long" => "number",
            "float" => "number",
            "double" => "number",
            "decimal" => "number",
            "string" => "string",
            "object" => "any",
            "void" => "void",
            _ => "any"
        };
    }

    private string MapIdentifierType(IdentifierNameSyntax identifier)
    {
        var typeName = identifier.Identifier.ValueText;

        return typeName switch
        {
            "Dictionary" => "Map",
            "List" => "Array",
            "Array" => "Array",
            "String" => "string",
            "Boolean" => "boolean",
            "Double" => "number",
            "Int32" => "number",
            _ => typeName
        };
    }

    private string MapConstant(string constant)
    {
        return constant switch
        {
            "PositiveInfinity" => "Infinity",
            "NegativeInfinity" => "-Infinity",
            "NaN" => "NaN",
            "PI" => "PI",
            _ => constant
        };
    }

    private string MapIdentifierName(string identifier)
    {
        return identifier switch
        {
            // C# class names to TypeScript equivalents
            "Math" => "Math",
            "Array" => "Array",
            "String" => "String",
            "Console" => "console",

            // Convert to camelCase for other identifiers
            _ => ToCamelCase(identifier)
        };
    }

    private string MapGenericType(GenericNameSyntax generic)
    {
        var typeName = generic.Identifier.ValueText;
        var typeArgs = string.Join(", ", generic.TypeArgumentList.Arguments.Select(MapTypeToTypeScript));

        return typeName switch
        {
            "Dictionary" => $"Map<{typeArgs}>",
            "List" => $"Array<{typeArgs}>",
            "Array" => $"Array<{typeArgs}>",
            _ => $"{typeName}<{typeArgs}>"
        };
    }

    private string MapMethodCallToTypeScript(string methodCall)
    {
        // Map C# method calls to TypeScript equivalents
        return methodCall switch
        {
            // Math functions (exact mapping required!)
            "Math.Floor" => "Math.floor",
            "Math.Sqrt" => "Math.sqrt",
            "Math.Abs" => "Math.abs",
            "Math.Min" => "Math.min",
            "Math.Max" => "Math.max",
            "Math.Atan2" => "Math.atan2",
            "Math.Cos" => "Math.cos",
            "Math.Sin" => "Math.sin",
            "Math.Pow" => "Math.pow",
            "Math.PI" => "Math.PI",

            // Array methods (critical for worker logic!)
            "Array.Copy" => "Array.prototype.copyWithin.call", // Need special handling
            "Array.IndexOf" => "indexOf",

            // String methods
            "String.Join" => "join", // array.join()

            // Console
            "Console.WriteLine" => "console.log",

            // Performance API (worker specific)
            "Global.Performance.Now" => "performance.now",
            "performance.now" => "performance.now",

            // Extension methods we created
            "ToFixed" => "toFixed",

            _ => methodCall
        };
    }

    #endregion

    #region Utility Methods

    private string GetVisibility(SyntaxTokenList modifiers)
    {
        if (modifiers.Any(m => m.IsKind(SyntaxKind.PrivateKeyword)))
            return "private";
        if (modifiers.Any(m => m.IsKind(SyntaxKind.PublicKeyword)))
            return "public";
        if (modifiers.Any(m => m.IsKind(SyntaxKind.ProtectedKeyword)))
            return "protected";

        return "public"; // Default
    }

    private string ToCamelCase(string pascalCase)
    {
        if (string.IsNullOrEmpty(pascalCase))
            return pascalCase;

        return char.ToLower(pascalCase[0]) + pascalCase[1..];
    }

    private void WriteIndented(string text)
    {
        _output.AppendLine(new string(' ', _indentLevel * 4) + text);
    }

    private void WriteLine(string text = "")
    {
        _output.AppendLine(text);
    }

    #endregion
}