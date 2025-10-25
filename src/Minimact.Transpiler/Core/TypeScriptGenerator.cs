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
    private readonly HashSet<string> _importedTypes = new();
    private readonly List<ClassDeclarationSyntax> _nestedClasses = new();

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
        _importedTypes.Clear();
        _nestedClasses.Clear();

        // Create generator with semantic model for type analysis
        var generator = new TypeScriptGenerator
        {
            _semanticModel = semanticModel
        };

        // First pass: collect type references and nested classes
        generator.CollectTypeReferences(root);
        generator.CollectNestedClasses(root);

        // Generate imports at the top
        generator.GenerateImports();

        // Generate hoisted nested classes as interfaces
        generator.GenerateHoistedNestedClasses();

        // Walk the syntax tree and generate TypeScript
        generator.Visit(root);

        return generator._output.ToString();
    }

    #region Import Generation

    /// <summary>
    /// Collect type references that need to be imported
    /// </summary>
    private void CollectTypeReferences(SyntaxNode root)
    {
        var typeCollector = new TypeReferenceCollector(_importedTypes);
        typeCollector.Visit(root);
    }

    /// <summary>
    /// Generate import statements at the top of the file
    /// </summary>
    private void GenerateImports()
    {
        // Types that should be imported from confidence-types
        var confidenceTypes = new HashSet<string>
        {
            "Rect", "MouseEventData", "ScrollEventData", "FocusEventData",
            "KeydownEventData", "ResizeEventData", "RegisterElementMessage",
            "UpdateBoundsMessage", "UnregisterElementMessage", "WorkerInputMessage",
            "PredictionRequestMessage", "DebugMessage", "WorkerOutputMessage",
            "MouseTrajectory", "ScrollVelocity", "ObservableElement",
            "CircularBuffer", "ConfidenceEngineConfig", "TrajectoryPoint",
            "PredictionObservation", "ObservablesConfig"
        };

        var typesToImport = _importedTypes.Where(confidenceTypes.Contains).ToList();

        if (typesToImport.Any())
        {
            WriteLine("import {");
            _indentLevel++;
            foreach (var type in typesToImport.OrderBy(t => t))
            {
                WriteIndented($"{type},");
            }
            _indentLevel--;
            WriteLine("} from './confidence-types';");
            WriteLine("");
        }
    }

    /// <summary>
    /// Visitor to collect type references
    /// </summary>
    private class TypeReferenceCollector : CSharpSyntaxWalker
    {
        private readonly HashSet<string> _importedTypes;

        public TypeReferenceCollector(HashSet<string> importedTypes)
        {
            _importedTypes = importedTypes;
        }

        public override void VisitIdentifierName(IdentifierNameSyntax node)
        {
            _importedTypes.Add(node.Identifier.ValueText);
            base.VisitIdentifierName(node);
        }

        public override void VisitGenericName(GenericNameSyntax node)
        {
            _importedTypes.Add(node.Identifier.ValueText);
            base.VisitGenericName(node);
        }
    }

    /// <summary>
    /// Collect nested classes for hoisting
    /// </summary>
    private void CollectNestedClasses(SyntaxNode root)
    {
        var collector = new NestedClassCollector(_nestedClasses);
        collector.Visit(root);
    }

    /// <summary>
    /// Generate hoisted nested classes as TypeScript interfaces
    /// </summary>
    private void GenerateHoistedNestedClasses()
    {
        foreach (var nestedClass in _nestedClasses)
        {
            var className = nestedClass.Identifier.ValueText;

            WriteLine($"export interface {className} {{");
            _indentLevel++;

            // Generate properties from auto-properties
            foreach (var member in nestedClass.Members)
            {
                if (member is PropertyDeclarationSyntax property)
                {
                    var propertyName = ToCamelCase(property.Identifier.ValueText);
                    var typeString = MapTypeToTypeScript(property.Type);
                    WriteIndented($"{propertyName}: {typeString};");
                }
            }

            _indentLevel--;
            WriteLine("}");
            WriteLine("");
        }
    }

    /// <summary>
    /// Visitor to collect nested classes
    /// </summary>
    private class NestedClassCollector : CSharpSyntaxWalker
    {
        private readonly List<ClassDeclarationSyntax> _nestedClasses;
        private int _depth = 0;

        public NestedClassCollector(List<ClassDeclarationSyntax> nestedClasses)
        {
            _nestedClasses = nestedClasses;
        }

        public override void VisitClassDeclaration(ClassDeclarationSyntax node)
        {
            _depth++;

            // If depth > 1, this is a nested class
            if (_depth > 1)
            {
                _nestedClasses.Add(node);
            }

            base.VisitClassDeclaration(node);
            _depth--;
        }
    }

    #endregion

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
        // Skip nested classes - they were already hoisted as interfaces
        if (_nestedClasses.Contains(node))
        {
            return;
        }

        var className = node.Identifier.ValueText;

        // Generate TypeScript class
        WriteIndented($"export class {className} {{");
        _indentLevel++;

        // Process class members (skip nested classes)
        foreach (var member in node.Members)
        {
            if (member is ClassDeclarationSyntax)
            {
                // Skip nested classes - already hoisted
                continue;
            }

            Visit(member);
        }

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
            var originalVarName = variable.Identifier.ValueText;
            var cleanVarName = StripConstLetSuffix(originalVarName);
            var varName = ToCamelCase(cleanVarName);
            var typeString = MapTypeToTypeScript(node.Declaration.Type);

            // Determine if this should be const or let
            string declarationType = ShouldUseConst(variable, node) ? "const" : "let";

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
                    WriteIndented($"{declarationType} {varName}: {typeString} = {initializer};");
                }
                else
                {
                    WriteIndented($"{declarationType} {varName} = {initializer};");
                }
            }
            else
            {
                // Variables without initializers must use 'let'
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

    /// <summary>
    /// Determine if a variable should use 'const' instead of 'let' based on naming convention
    /// </summary>
    private bool ShouldUseConst(VariableDeclaratorSyntax variable, LocalDeclarationStatementSyntax node)
    {
        // Variables without initializers cannot be const
        if (variable.Initializer == null)
            return false;

        var varName = variable.Identifier.ValueText;

        // Check for explicit _const suffix
        if (varName.EndsWith("_const"))
            return true;

        // Check for explicit _let suffix
        if (varName.EndsWith("_let"))
            return false;

        // Default to const for initialized variables (TypeScript best practice)
        return true;
    }

    /// <summary>
    /// Strip _const/_let suffix from variable names
    /// </summary>
    private string StripConstLetSuffix(string varName)
    {
        if (varName.EndsWith("_const"))
            return varName.Substring(0, varName.Length - 6);

        if (varName.EndsWith("_let"))
            return varName.Substring(0, varName.Length - 4);

        return varName;
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

    public override void VisitContinueStatement(ContinueStatementSyntax node)
    {
        WriteIndented("continue;");
    }

    public override void VisitBreakStatement(BreakStatementSyntax node)
    {
        WriteIndented("break;");
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
            // Use proper destructuring for Map/Dictionary iteration
            var keyVar = GetDestructuredKeyName(identifier);
            var valueVar = GetDestructuredValueName(identifier);

            WriteIndented($"for (const [{keyVar}, {valueVar}] of {expression}) {{");

            // Set up variable mapping for the loop body
            _foreachVariableMap = new Dictionary<string, (string key, string value)>
            {
                [identifier] = (keyVar, valueVar)
            };
        }
        else
        {
            WriteIndented($"for (const {identifier} of {expression}) {{");
            _foreachVariableMap = null;
        }

        _indentLevel++;
        Visit(node.Statement);
        _indentLevel--;
        WriteIndented("}");

        // Clear the variable mapping
        _foreachVariableMap = null;
    }

    private Dictionary<string, (string key, string value)>? _foreachVariableMap;

    private string GetDestructuredKeyName(string iteratorName)
    {
        // Generate semantic variable names based on the iterator variable
        if (iteratorName.Contains("entry") || iteratorName.Contains("kvp") || iteratorName.Contains("pair"))
        {
            return $"{iteratorName.Replace("entry", "").Replace("kvp", "").Replace("pair", "")}Key".Trim().ToLower();
        }

        // For generic names, use contextual names
        return "elementId"; // This matches our specific use case
    }

    private string GetDestructuredValueName(string iteratorName)
    {
        // Generate semantic variable names based on the iterator variable
        if (iteratorName.Contains("entry") || iteratorName.Contains("kvp") || iteratorName.Contains("pair"))
        {
            return $"{iteratorName.Replace("entry", "").Replace("kvp", "").Replace("pair", "")}Value".Trim().ToLower();
        }

        // For generic names, use contextual names
        return "element"; // This matches our specific use case
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
            PredefinedTypeSyntax predefined => MapPredefinedType(predefined),
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

        // Smart foreach variable mapping: Transform entry.Key -> elementId, entry.Value -> element
        if (_foreachVariableMap != null && _foreachVariableMap.ContainsKey(left))
        {
            var (keyVar, valueVar) = _foreachVariableMap[left];
            if (right == "Key")
                return keyVar;
            if (right == "Value")
                return valueVar;
        }

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
        if (left == "double" || left == "Double" || left == "number")
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

            // Array methods (critical for faithful transpilation!)
            "Slice_Array" => "slice",

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
        // Check if this is a method call that needs 'this.' prefix
        if (invocation.Expression is IdentifierNameSyntax identifier)
        {
            var identifierName = identifier.Identifier.ValueText;

            // Use semantic model to determine if this is a method on the current class
            if (_semanticModel != null)
            {
                var symbolInfo = _semanticModel.GetSymbolInfo(identifier);


                if (symbolInfo.Symbol is IMethodSymbol method && !method.IsStatic)
                {
                    // This is an instance method call on the current class - needs 'this.'
                    var methodName = MapIdentifierName(identifierName);
                    var methodArguments = invocation.ArgumentList.Arguments.Select(arg => GenerateExpression(arg.Expression)).ToArray();
                    var methodArgumentString = string.Join(", ", methodArguments);
                    return $"this.{methodName}({methodArgumentString})";
                }
            }
        }

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
            "MouseTrajectory" => true,
            "RayIntersectionResult" => true,
            "ScrollPoint" => true,
            "ScrollVelocity" => true,
            "HoverConfidenceResult" => true,
            "IntersectionConfidenceResult" => true,
            "FocusConfidenceResult" => true,
            "FocusPredictionResult" => true,
            "PredictionObservation" => true,
            "PredictionRequestMessage" => true,
            "DebugMessage" => true,
            "ObservableElement" => true,
            "ObservablesConfig" => true,
            _ => false
        };
    }

    private string GenerateBinaryExpression(BinaryExpressionSyntax binary)
    {
        var left = GenerateExpression(binary.Left);
        var right = GenerateExpression(binary.Right);
        var op = binary.OperatorToken.ValueText;

        // Map C# equality operators to TypeScript strict equality
        op = op switch
        {
            "==" => "===",
            "!=" => "!==",
            _ => op
        };

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
                var propertyName = ToCamelCase(left);

                // Use ES6 shorthand syntax when property name matches variable name
                if (propertyName == right)
                {
                    return propertyName;
                }

                return $"{propertyName}: {right}";
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
            // JS-Compatible types (explicit) - PRIMARY
            "JsMap" => "Map",
            "JsArray" => "Array",
            "JsSet" => "Set",

            // Legacy mappings (for backward compatibility) - DEPRECATED
            "Dictionary" => "Map",
            "List" => "Array",
            "Array" => "Array",

            // Primitives
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
            "PositiveInfinity" => "Number.POSITIVE_INFINITY",
            "NegativeInfinity" => "Number.NEGATIVE_INFINITY",
            "NaN" => "Number.NaN",
            "PI" => "Math.PI",
            _ => constant
        };
    }

    private string MapIdentifierName(string identifier)
    {
        // Strip _const/_let suffixes from variable names
        var cleanIdentifier = StripConstLetSuffix(identifier);

        return cleanIdentifier switch
        {
            // C# class names to TypeScript equivalents
            "Math" => "Math",
            "Array" => "Array",
            "String" => "String",
            "Console" => "console",

            // Convert to camelCase for other identifiers
            _ => ToCamelCase(cleanIdentifier)
        };
    }

    private string MapGenericType(GenericNameSyntax generic)
    {
        var typeName = generic.Identifier.ValueText;
        var typeArgs = string.Join(", ", generic.TypeArgumentList.Arguments.Select(MapTypeToTypeScript));

        return typeName switch
        {
            // JS-Compatible types (explicit) - PRIMARY
            "JsMap" => $"Map<{typeArgs}>",
            "JsArray" => $"Array<{typeArgs}>",
            "JsSet" => $"Set<{typeArgs}>",

            // Legacy mappings (for backward compatibility) - DEPRECATED
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