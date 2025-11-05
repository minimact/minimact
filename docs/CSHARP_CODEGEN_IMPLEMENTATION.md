# C# Code Generation Implementation Plan

**Goal:** Achieve full parity with `babel-plugin-minimact` by generating complete working C# components and templates.json files.

---

## Current State Analysis

### Original Babel Plugin (`babel-plugin-minimact`)

**Outputs:**
1. **`.cs` file** - Complete working C# component
2. **`.templates.json` file** - Templates for Rust predictor

**C# Output Structure:**
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ProductDetailsPage : MinimactComponent
{
    // 1. State Fields with [State] attribute
    [State]
    private decimal cartTotal = 0;

    // 2. MVC State Properties (read from controller)
    private string productName => GetState<string>("productName");

    // 3. Hook-derived fields (useMvcViewModel, usePubSub, etc.)
    private dynamic viewModel = null;

    // 4. Full Render() implementation with inline VNode construction
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var productName = GetState<string>("productName");

        return MinimactHelpers.createElement("div",
            new { style = "..." },
            new VElement("h1", new Dictionary<string, string>(), $"{productName}"),
            // ... full VNode tree
        );
    }

    // 5. Event Handler Methods
    public void Handle2() { SetState(nameof(showDebugInfo), false); }

    // 6. Setter Methods for useState
    private void setQuantity(int value) { SetState("initialQuantity", value); }
}
```

**templates.json Structure:**
```json
{
  "component": "ProductDetailsPage",
  "version": "1.0",
  "generatedAt": 1762225463867,
  "templates": {
    "[0].h1[0].text[0]": {
      "template": "{0}950040830",
      "bindings": ["productName"],
      "slots": [0],
      "path": [0, 0, 0],
      "type": "dynamic"
    },
    "[0].[0].div[0].text[0]": {
      "template": "${0}",
      "bindings": ["price"],
      "slots": [12],
      "path": [0, 0, 0, 0],
      "type": "transform",
      "transform": {
        "method": "toFixed",
        "args": [2]
      }
    }
  }
}
```

### New Transpiler (`minimact-transpiler`)

**Current Outputs:**
1. **JSON IR** - Intermediate representation with hex paths
2. **C# attributes only** - Metadata, NOT working code

**Current C# Output:**
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Attributes;

namespace Generated;

[TextTemplate(Path = new[] { "10000000", "20000000" }, Template = "{0}", Bindings = new[] { "count" })]
[ComplexTemplate(Path = new[] { "10000000", "30000000" }, Template = "Math.floor({0} * 1.2)", Bindings = new[] { "price" })]
public class ProductDetailsPage : MinimactComponent
{
    protected override VNode Render()
    {
        // TODO: Render implementation will be generated
        return new VNode();
    }
}
```

**Missing:**
- ❌ State field declarations
- ❌ MVC state properties
- ❌ Hook transformations
- ❌ Full Render() VNode tree
- ❌ Event handler methods
- ❌ Setter methods
- ❌ templates.json generation

---

## Implementation Roadmap

### Phase 1: Extend JSON IR with Complete Semantic Information

**Current JSON IR captures:**
- ✅ JSX structure with hex paths
- ✅ Template bindings
- ✅ Expression trees
- ✅ Loop/conditional structures

**Missing from JSON IR:**
- ❌ **State declarations** (from `useState` calls)
- ❌ **MVC state bindings** (from `useMvcState` calls)
- ❌ **Hook metadata** (usePubSub, useMvcViewModel, useEffect, useRef)
- ❌ **Event handler signatures** (parameter types, names)
- ❌ **Import statements** (for external libraries)

**Action Items:**

#### 1.1 Add Hook Extraction to Babel Plugin

**File:** `babel/src/extractors/hooks.js` (NEW)

```javascript
/**
 * Extract React hooks and Minimact hooks from component
 *
 * Handles:
 * - useState(initialValue) → State field + setter method
 * - useMvcState({ productName, price }) → MVC state properties
 * - useMvcViewModel() → dynamic viewModel field
 * - usePubSub(channel) → pub/sub methods
 * - useEffect/useRef → lifecycle tracking
 */

function extractHooks(componentPath, t) {
  const hooks = {
    state: [],        // useState calls
    mvcState: [],     // useMvcState bindings
    mvcViewModel: null, // useMvcViewModel flag
    pubSub: [],       // usePubSub channels
    effects: [],      // useEffect calls
    refs: []          // useRef calls
  };

  // Traverse function body for hook calls
  componentPath.traverse({
    CallExpression(callPath) {
      const callee = callPath.node.callee;

      if (t.isIdentifier(callee)) {
        switch (callee.name) {
          case 'useState':
            hooks.state.push(extractUseState(callPath, t));
            break;
          case 'useMvcState':
            hooks.mvcState = extractUseMvcState(callPath, t);
            break;
          case 'useMvcViewModel':
            hooks.mvcViewModel = true;
            break;
          case 'usePubSub':
            hooks.pubSub.push(extractUsePubSub(callPath, t));
            break;
          case 'useEffect':
            hooks.effects.push(extractUseEffect(callPath, t));
            break;
          case 'useRef':
            hooks.refs.push(extractUseRef(callPath, t));
            break;
        }
      }
    }
  });

  return hooks;
}

function extractUseState(callPath, t) {
  // const [count, setCount] = useState(0);
  const parent = callPath.parentPath;

  if (t.isVariableDeclarator(parent.node)) {
    const id = parent.node.id;

    if (t.isArrayPattern(id) && id.elements.length === 2) {
      const stateVar = id.elements[0].name;
      const setter = id.elements[1].name;
      const initialValue = callPath.node.arguments[0];

      return {
        stateVar,           // "count"
        setter,             // "setCount"
        initialValue,       // AST node for initial value
        initialValueLiteral: getValueLiteral(initialValue, t),
        type: inferType(initialValue, t)  // "int", "string", "bool", "decimal"
      };
    }
  }

  return null;
}

function extractUseMvcState(callPath, t) {
  // const { productName, price } = useMvcState({ productName, price });
  const parent = callPath.parentPath;

  if (t.isVariableDeclarator(parent.node)) {
    const id = parent.node.id;

    if (t.isObjectPattern(id)) {
      return id.properties.map(prop => {
        const key = prop.key.name;
        const alias = prop.value.name;

        // Look for type from object argument
        const arg = callPath.node.arguments[0];
        const type = inferMvcStateType(arg, key, t);

        return {
          key,              // "productName"
          alias,            // "productName" (can be different)
          type,             // "string"
          mvcKey: key       // Key passed to GetState<T>()
        };
      });
    }
  }

  return [];
}

function inferType(node, t) {
  if (t.isNumericLiteral(node)) {
    return node.value % 1 === 0 ? 'int' : 'decimal';
  }
  if (t.isStringLiteral(node)) return 'string';
  if (t.isBooleanLiteral(node)) return 'bool';
  if (t.isArrayExpression(node)) return 'array';
  if (t.isObjectExpression(node)) return 'object';
  return 'dynamic';
}
```

#### 1.2 Add Event Handler Extraction

**File:** `babel/src/extractors/eventHandlers.js` (ENHANCE)

```javascript
/**
 * Extract event handler metadata for C# code generation
 *
 * Handles:
 * - Inline arrow functions: onClick={() => setCount(count + 1)}
 * - Function references: onClick={handleClick}
 * - With parameters: onChange={(e) => setColor(e.target.value)}
 */

function extractEventHandler(node, t) {
  // Current: Returns handler ID (e.g., "Handle2")
  // Enhanced: Return full signature information

  return {
    handlerId: generateHandlerId(),       // "Handle2"
    functionName: null,                   // "handleClick" if named reference
    parameters: extractParameters(node, t), // [{name: "e", type: "dynamic"}]
    isInline: t.isArrowFunctionExpression(node) || t.isFunctionExpression(node),
    body: node.body,                      // AST for handler body
    capturedVars: extractCapturedVars(node, t) // Variables from closure
  };
}

function extractParameters(node, t) {
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    return node.params.map(param => ({
      name: param.name,
      type: inferParameterType(param, t) // Based on usage
    }));
  }
  return [];
}

function extractCapturedVars(node, t) {
  // Find variables from parent scope used in handler
  const captured = [];

  traverse(node, {
    Identifier(path) {
      if (isFromOuterScope(path)) {
        captured.push(path.node.name);
      }
    }
  });

  return captured;
}
```

#### 1.3 Update ComponentNode JSON Schema

**File:** `babel/src/nodes.js`

```javascript
/**
 * Component node with complete semantic information
 */
function createComponent(componentName, renderMethod, hooks, eventHandlers, imports) {
  return {
    type: 'Component',
    componentName,
    renderMethod,
    imports,

    // NEW: Hook metadata
    hooks: {
      state: hooks.state || [],           // useState calls
      mvcState: hooks.mvcState || [],     // useMvcState bindings
      mvcViewModel: hooks.mvcViewModel || false,
      pubSub: hooks.pubSub || [],
      effects: hooks.effects || [],
      refs: hooks.refs || []
    },

    // NEW: Event handler metadata
    eventHandlers: eventHandlers || {}    // { "Handle2": {...}, "Handle3": {...} }
  };
}
```

---

### Phase 2: Implement Full C# Code Generation

**File:** `codegen/Minimact.Transpiler.CodeGen/Visitors/CSharpCodeGenerator.cs` (REWRITE)

#### 2.1 Component Class Structure

```csharp
public class CSharpCodeGenerator : INodeVisitor
{
    private readonly StringBuilder _output = new();
    private readonly StringBuilder _renderBody = new();
    private readonly Dictionary<string, EventHandlerInfo> _eventHandlers = new();
    private int _indentLevel = 0;

    public string GetOutput() => _output.ToString();

    public void Visit(ComponentNode node)
    {
        // 1. Generate using statements
        GenerateUsings();

        // 2. Generate namespace
        WriteLine($"namespace Minimact.Components;");
        WriteLine();

        // 3. Generate [Component] attribute
        WriteLine("[Component]");

        // 4. Generate class declaration
        WriteLine($"public partial class {node.ComponentName} : MinimactComponent");
        WriteLine("{");
        Indent();

        // 5. Generate state fields
        GenerateStateFields(node.Hooks.State);

        // 6. Generate MVC state properties
        GenerateMvcStateProperties(node.Hooks.MvcState);

        // 7. Generate hook-derived fields
        GenerateHookFields(node.Hooks);

        // 8. Generate Render() method
        GenerateRenderMethod(node.RenderMethod);

        // 9. Generate event handler methods
        GenerateEventHandlers(_eventHandlers);

        // 10. Generate setter methods
        GenerateSetterMethods(node.Hooks.State);

        // 11. Generate lifecycle methods (OnInitialized for pubsub)
        GenerateLifecycleMethods(node.Hooks);

        Dedent();
        WriteLine("}");
    }
}
```

#### 2.2 State Field Generation

```csharp
private void GenerateStateFields(List<StateInfo> stateHooks)
{
    foreach (var state in stateHooks)
    {
        WriteLine($"[State]");
        WriteLine($"private {GetCSharpType(state.Type)} {state.StateVar} = {FormatInitialValue(state.InitialValue, state.Type)};");
        WriteLine();
    }
}

// Example output:
// [State]
// private int count = 0;
//
// [State]
// private bool showDebugInfo = false;
```

#### 2.3 MVC State Properties

```csharp
private void GenerateMvcStateProperties(List<MvcStateInfo> mvcBindings)
{
    if (mvcBindings.Count == 0) return;

    WriteLine("// MVC State properties");

    foreach (var binding in mvcBindings)
    {
        WriteLine($"private {GetCSharpType(binding.Type)} {binding.Alias} => GetState<{GetCSharpType(binding.Type)}>(\"{binding.MvcKey}\");");
    }

    WriteLine();
}

// Example output:
// // MVC State properties
// private string productName => GetState<string>("productName");
// private decimal price => GetState<decimal>("price");
```

#### 2.4 Full Render() Method Generation

This is the **most critical** part - generating the complete VNode tree.

```csharp
private void GenerateRenderMethod(RenderMethodNode renderMethod)
{
    WriteLine("protected override VNode Render()");
    WriteLine("{");
    Indent();

    WriteLine("StateManager.SyncMembersToState(this);");
    WriteLine();

    // Generate local variable declarations for MVC state
    GenerateMvcStateLocals();

    // Generate return statement with VNode tree
    Write("return ");
    GenerateVNodeTree(renderMethod.Children);
    WriteLine(";");

    Dedent();
    WriteLine("}");
    WriteLine();
}

private void GenerateVNodeTree(List<BaseNode> children)
{
    if (children.Count == 0)
    {
        Write("new VNode()");
        return;
    }

    if (children.Count == 1)
    {
        GenerateVNode(children[0]);
        return;
    }

    // Multiple children - wrap in helper
    Write("MinimactHelpers.createElement(\"div\", null, ");
    for (int i = 0; i < children.Count; i++)
    {
        GenerateVNode(children[i]);
        if (i < children.Count - 1) Write(", ");
    }
    Write(")");
}

private void GenerateVNode(BaseNode node)
{
    switch (node)
    {
        case JSXElementNode element:
            GenerateVElement(element);
            break;
        case StaticTextNode text:
            Write($"new VText(\"{EscapeString(text.Content)}\")");
            break;
        case TextTemplateNode template:
            GenerateTextTemplate(template);
            break;
        case ComplexTemplateNode complex:
            GenerateComplexTemplate(complex);
            break;
        case Expression expr when expr.IsConditional:
            GenerateConditional(expr);
            break;
        case Expression expr when expr.IsLoop:
            GenerateLoop(expr);
            break;
        default:
            GenerateExpression(node);
            break;
    }
}

private void GenerateVElement(JSXElementNode element)
{
    // Generate: new VElement("tag", attributes, children)
    Write($"new VElement(\"{element.Tag}\", ");

    // Generate attributes dictionary
    GenerateAttributesDictionary(element.Attributes);
    Write(", ");

    // Generate children
    if (element.Children.Count == 0)
    {
        // No children - just close
        Write("new VNode[0])");
    }
    else if (element.Children.Count == 1 && element.Children[0] is StaticTextNode stn)
    {
        // Single static text - use string overload
        Write($"\"{EscapeString(stn.Content)}\")");
    }
    else if (element.Children.Count == 1)
    {
        // Single node child
        GenerateVNode(element.Children[0]);
        Write(")");
    }
    else
    {
        // Multiple children - array
        Write("new VNode[] { ");
        for (int i = 0; i < element.Children.Count; i++)
        {
            GenerateVNode(element.Children[i]);
            if (i < element.Children.Count - 1) Write(", ");
        }
        Write(" })");
    }
}

private void GenerateAttributesDictionary(List<AttributeNode> attributes)
{
    if (attributes.Count == 0)
    {
        Write("new Dictionary<string, string>()");
        return;
    }

    Write("new Dictionary<string, string> { ");

    for (int i = 0; i < attributes.Count; i++)
    {
        var attr = attributes[i];

        if (attr is StaticAttributeNode staticAttr)
        {
            Write($"[\"{attr.Name}\"] = \"{EscapeString(staticAttr.Value)}\"");
        }
        else if (attr is DynamicAttributeNode dynAttr)
        {
            if (attr.Name.StartsWith("on"))
            {
                // Event handler
                Write($"[\"{attr.Name}\"] = \"{dynAttr.HandlerId}\"");
            }
            else
            {
                // Dynamic value
                Write($"[\"{attr.Name}\"] = ");
                GenerateAttributeValue(dynAttr);
            }
        }

        if (i < attributes.Count - 1) Write(", ");
    }

    Write(" }");
}

private void GenerateTextTemplate(TextTemplateNode template)
{
    // new VText($"{productName}")
    // new VText($"Count: {count}")

    var csharpTemplate = ConvertTemplateToCSharp(template.Template, template.Bindings);
    Write($"new VText($\"{csharpTemplate}\")");
}

private string ConvertTemplateToCSharp(string template, List<string> bindings)
{
    // Convert "{0}" placeholders to "{binding}" for C# string interpolation
    // Example: "Count: {0}" + ["count"] → "Count: {count}"

    string result = template;

    for (int i = 0; i < bindings.Count; i++)
    {
        result = result.Replace($"{{{i}}}", $"{{{bindings[i]}}}");
    }

    return EscapeString(result);
}

private void GenerateComplexTemplate(ComplexTemplateNode complex)
{
    // Evaluate expression tree at codegen time
    // Convert to C# expression

    var csharpExpr = EvaluateExpressionTree(complex.ExpressionTree, complex.Bindings);
    Write($"new VText($\"{{{csharpExpr}}}\")");
}

private string EvaluateExpressionTree(ExpressionTreeNode tree, List<string> bindings)
{
    switch (tree.Type)
    {
        case "Binding":
            return bindings[tree.Slot.Value];

        case "Literal":
            return tree.Raw;

        case "BinaryExpression":
            var left = EvaluateExpressionTree(tree.Left, bindings);
            var right = EvaluateExpressionTree(tree.Right, bindings);
            return $"({left} {tree.Operator} {right})";

        case "CallExpression":
            var args = string.Join(", ", tree.Arguments.Select(a => EvaluateExpressionTree(a, bindings)));
            return $"{tree.Callee}({args})";

        case "MemberExpression":
            var obj = EvaluateExpressionTree(tree.Object, bindings);
            var prop = EvaluateExpressionTree(tree.Property, bindings);
            return tree.Computed == true ? $"{obj}[{prop}]" : $"{obj}.{prop}";

        case "ObjectExpression":
            // For now, use anonymous object syntax
            var props = string.Join(", ", tree.Properties.Select(p =>
                $"{p.Key} = {EvaluateExpressionTree(p.Value, bindings)}"));
            return $"new {{ {props} }}";

        default:
            return "<complex>";
    }
}

private void GenerateConditional(Expression expr)
{
    // (condition) ? consequent : alternate

    Write("(");
    GenerateConditionExpression(expr.Condition);
    Write(") ? ");

    if (expr.Consequent != null)
    {
        GenerateVNode(expr.Consequent);
    }
    else
    {
        Write("null");
    }

    Write(" : ");

    if (expr.Alternate != null)
    {
        GenerateVNode(expr.Alternate);
    }
    else
    {
        Write("null");
    }
}
```

#### 2.5 Event Handler Methods

```csharp
private void GenerateEventHandlers(Dictionary<string, EventHandlerInfo> handlers)
{
    foreach (var kvp in handlers)
    {
        var handlerId = kvp.Key;
        var info = kvp.Value;

        // Determine return type (void or Task)
        var returnType = info.IsAsync ? "async Task" : "void";

        // Generate parameters
        var parameters = string.Join(", ", info.Parameters.Select(p => $"{p.Type} {p.Name}"));

        WriteLine($"public {returnType} {handlerId}({parameters})");
        WriteLine("{");
        Indent();

        // Generate handler body
        GenerateHandlerBody(info);

        Dedent();
        WriteLine("}");
        WriteLine();
    }
}

// Example output:
// public void Handle2()
// {
//     SetState(nameof(showDebugInfo), false);
// }
//
// public void Handle6(dynamic value)
// {
//     setColor(value);
// }
```

#### 2.6 Setter Methods

```csharp
private void GenerateSetterMethods(List<StateInfo> stateHooks)
{
    foreach (var state in stateHooks)
    {
        var setterName = state.Setter; // "setCount"
        var stateVar = state.StateVar;  // "count"
        var type = GetCSharpType(state.Type);

        WriteLine($"private void {setterName}({type} value)");
        WriteLine("{");
        Indent();

        if (IsMvcState(state))
        {
            // MVC state uses key-based SetState
            WriteLine($"SetState(\"{state.MvcKey}\", value);");
        }
        else
        {
            // Local state uses field directly
            WriteLine($"{stateVar} = value;");
            WriteLine($"SetState(nameof({stateVar}), value);");
        }

        Dedent();
        WriteLine("}");
        WriteLine();
    }
}

// Example output:
// private void setQuantity(int value)
// {
//     SetState("initialQuantity", value);
// }
```

---

### Phase 3: Generate templates.json

**File:** `codegen/Minimact.Transpiler.CodeGen/Visitors/TemplateJsonGenerator.cs` (NEW)

```csharp
/// <summary>
/// Visitor that generates templates.json for Rust predictor
/// </summary>
public class TemplateJsonGenerator : INodeVisitor
{
    private readonly Dictionary<string, TemplateInfo> _templates = new();
    private string _componentName = "";

    public string GetJson()
    {
        var output = new
        {
            component = _componentName,
            version = "1.0",
            generatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            templates = _templates
        };

        return JsonSerializer.Serialize(output, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    public void Visit(ComponentNode node)
    {
        _componentName = node.ComponentName;

        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(this);
        }
    }

    public void Visit(TextTemplateNode node)
    {
        if (node.Bindings.Count == 0) return;

        // Convert hex path to tag-based path for Rust
        var tagPath = ConvertHexPathToTagPath(node.PathSegments);

        _templates[tagPath] = new TemplateInfo
        {
            Template = node.Template,
            Bindings = node.Bindings,
            Slots = node.Slots,
            Path = ConvertToNumericPath(node.PathSegments),
            Type = "dynamic"
        };
    }

    public void Visit(ComplexTemplateNode node)
    {
        if (node.Bindings.Count == 0) return;

        var tagPath = ConvertHexPathToTagPath(node.PathSegments);

        _templates[tagPath] = new TemplateInfo
        {
            Template = node.Template,
            Bindings = node.Bindings,
            Slots = new List<int>(), // Computed from template
            Path = ConvertToNumericPath(node.PathSegments),
            Type = DetermineComplexType(node),
            ExpressionTree = node.ExpressionTree // Include for runtime evaluation
        };
    }

    private string ConvertHexPathToTagPath(List<string> hexSegments)
    {
        // Convert hex path to tag-based path
        // This requires tracking element tags during traversal
        // For now, use hex-to-index mapping

        // Example: ["10000000", "20000000"] → "[0].[1]"
        var indices = hexSegments.Select(hex => HexToIndex(hex));
        return $"[{string.Join("].[", indices)}]";
    }

    private int HexToIndex(string hex)
    {
        // Convert hex segment to 0-based index
        // 10000000 → 0, 20000000 → 1, 30000000 → 2
        return (int.Parse(hex, System.Globalization.NumberStyles.HexNumber) / 0x10000000) - 1;
    }

    private string DetermineComplexType(ComplexTemplateNode node)
    {
        // Analyze expression tree to determine type
        if (HasTransformMethod(node.ExpressionTree))
        {
            return "transform";
        }

        if (HasConditional(node.ExpressionTree))
        {
            return "conditional";
        }

        return "complex";
    }
}

class TemplateInfo
{
    public string Template { get; set; }
    public List<string> Bindings { get; set; }
    public List<int> Slots { get; set; }
    public List<int> Path { get; set; }
    public string Type { get; set; }
    public object Transform { get; set; }
    public ExpressionTreeNode ExpressionTree { get; set; }
}
```

---

### Phase 4: CLI Transpiler Tool

**File:** `codegen/Minimact.Transpiler.Cli/Program.cs` (NEW)

```csharp
/// <summary>
/// CLI tool that orchestrates: JSON IR → C# + templates.json
/// </summary>
class Program
{
    static async Task Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: minimact-transpiler <input.json> [--output-dir ./Generated]");
            return;
        }

        var inputFile = args[0];
        var outputDir = GetArgValue(args, "--output-dir", "./Generated");

        // 1. Read JSON IR
        var jsonText = await File.ReadAllTextAsync(inputFile);
        var component = JsonSerializer.Deserialize<ComponentNode>(jsonText);

        // 2. Generate C# code
        var csharpGenerator = new CSharpCodeGenerator();
        component.Accept(csharpGenerator);
        var csharpCode = csharpGenerator.GetOutput();

        var csharpFile = Path.Combine(outputDir, $"{component.ComponentName}.cs");
        await File.WriteAllTextAsync(csharpFile, csharpCode);
        Console.WriteLine($"✅ Generated: {csharpFile}");

        // 3. Generate templates.json
        var templateGenerator = new TemplateJsonGenerator();
        component.Accept(templateGenerator);
        var templatesJson = templateGenerator.GetJson();

        var templatesFile = Path.Combine(outputDir, $"{component.ComponentName}.templates.json");
        await File.WriteAllTextAsync(templatesFile, templatesJson);
        Console.WriteLine($"✅ Generated: {templatesFile}");
    }
}
```

---

## Testing & Verification

### Test Cases

1. **Simple Counter** - useState, event handlers
2. **Product Details** - MVC state, complex templates, conditionals
3. **Todo List** - Loops, nested structures
4. **Pub/Sub** - usePubSub hooks, lifecycle methods
5. **Complex Expressions** - All ComplexTemplate types

### Verification Checklist

For each test case, verify:

- [ ] C# compiles without errors
- [ ] Render() method returns correct VNode structure
- [ ] State fields have correct types and initial values
- [ ] Event handlers have correct signatures
- [ ] Setter methods work correctly
- [ ] templates.json matches original babel plugin format
- [ ] Rust predictor can load templates.json
- [ ] Runtime behavior matches original

### Diff Comparison

```bash
# Compare new transpiler output vs original babel plugin
diff Generated/ProductDetailsPage.cs Pages/ProductDetailsPage.cs
diff Generated/ProductDetailsPage.templates.json Pages/ProductDetailsPage.templates.json
```

---

## Implementation Timeline

**Week 1: Hook Extraction**
- Day 1-2: Implement hook extractors (useState, useMvcState)
- Day 3-4: Add event handler extraction
- Day 5: Update JSON IR schema

**Week 2: C# Code Generation**
- Day 1-2: State fields and MVC properties
- Day 3-5: Full Render() method with VNode tree generation

**Week 3: Complex Features**
- Day 1-2: Event handlers and setters
- Day 3-4: ComplexTemplate evaluation
- Day 5: Conditionals and loops

**Week 4: templates.json + Testing**
- Day 1-2: TemplateJsonGenerator implementation
- Day 3-4: CLI tool and integration
- Day 5: Testing and verification

---

## Success Criteria

✅ **Byte-for-byte compatibility** with original babel plugin output (modulo whitespace/formatting)

✅ **All test cases pass** - generated C# compiles and runs correctly

✅ **templates.json format** matches original for Rust predictor compatibility

✅ **No regressions** - existing features continue to work

✅ **Documentation complete** - README updated with usage examples
