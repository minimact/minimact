# Reluxer Transformer Multi-Output Enhancement Guide

## Overview

This document describes how to enhance the Reluxer Transformer to achieve full feature parity with `babel-plugin-minimact`, generating all 5 output file types from a single TSX input while leveraging Reluxer's declarative `[TokenPattern]` architecture.

## Current State vs Target State

### Current Output (2 files)
```
Counter.tsx → Counter.cs
            → Counter.templates.json
```

### Target Output (5 files)
```
Counter.tsx → Counter.cs                    # C# component class
            → Counter.templates.json        # Parameterized templates for prediction
            → Counter.hooks.json            # Hook declarations with indices
            → Counter.structural-changes.json # VNode insert/delete operations
            → Counter.tsx.keys              # Stable hex key mapping
```

---

## File Format Specifications

### 1. `.hooks.json` - Hook Declarations

**Purpose:** Tracks all hooks used in the component with their types, variable names, and indices. Used by the hot reload system to detect hook changes (additions, removals, reordering).

**Schema:**
```json
{
  "componentName": "Counter",
  "timestamp": "2025-12-05T20:32:54.220Z",
  "hooks": [
    {
      "type": "useState",
      "varName": "count",
      "index": 0
    },
    {
      "type": "useState",
      "varName": "message",
      "index": 1
    },
    {
      "type": "useEffect",
      "index": 2,
      "deps": ["count"]
    },
    {
      "type": "useRef",
      "varName": "inputRef",
      "index": 3
    }
  ]
}
```

**Hook Types to Track:**
| Hook | Fields |
|------|--------|
| `useState` | `type`, `varName`, `index` |
| `useEffect` | `type`, `index`, `deps` (dependency array) |
| `useRef` | `type`, `varName`, `index` |
| `useMvcState` | `type`, `varName`, `viewModelKey`, `index`, `mutable` |
| `useMvcViewModel` | `type`, `varName`, `index` |
| `useDomElementState` | `type`, `varName`, `selector`, `index` |

**Data Source:** `ComponentModel.StateFields`, `ComponentModel.MvcStateFields`, plus new fields for effects and refs.

---

### 2. `.structural-changes.json` - VNode Operations

**Purpose:** Describes the VNode tree structure for initial render and hot reload. Used by `StructuralChangeManager` on the server to apply JSX changes without full page reload.

**Schema:**
```json
{
  "componentName": "Counter",
  "timestamp": "2025-12-05T20:32:54.221Z",
  "sourceFile": "path/to/Counter.tsx",
  "changes": [
    {
      "type": "insert",
      "path": "1",
      "vnode": {
        "type": "element",
        "tag": "div",
        "path": "1",
        "attributes": {
          "className": "counter"
        },
        "children": [
          { "type": "element", "path": "1.1", "tag": "h3" },
          { "type": "element", "path": "1.2", "tag": "p" },
          { "type": "element", "path": "1.3", "tag": "button" }
        ]
      }
    },
    {
      "type": "insert",
      "path": "1.1",
      "vnode": {
        "type": "element",
        "tag": "h3",
        "path": "1.1",
        "attributes": {},
        "children": [
          { "type": "text", "path": "1.1.1", "value": "Counter" }
        ]
      }
    }
  ]
}
```

**VNode Types:**
| Type | Fields |
|------|--------|
| `element` | `type`, `tag`, `path`, `attributes`, `children` |
| `text` | `type`, `path`, `value` |
| `expression` | `type`, `path`, `value` (`"__DYNAMIC__"` for bindings) |
| `conditional` | `type`, `path`, `condition`, `trueBranch`, `falseBranch` |
| `list` | `type`, `path`, `arrayBinding`, `itemTemplate` |
| `component` | `type`, `path`, `componentName`, `props` |

**Change Types:**
- `insert` - New element added
- `delete` - Element removed (tracked by missing keys)
- `update` - Element attributes/children changed
- `move` - Element reordered (same key, different position)

**Data Source:** `ComponentModel.RenderTree` (VNodeModel hierarchy)

---

### 3. `.tsx.keys` - Stable Hex Key Mapping

**Purpose:** Persists hex keys across file saves so that element identities remain stable. This enables:
- Hot reload to correlate old vs new elements
- Accurate structural change detection
- Predictable patch targeting

**Schema:**
```json
{
  "version": "1.0",
  "componentName": "Counter",
  "generatedAt": 1764966774219,
  "keys": {
    "div:8:10": "10000000",
    "h3:9:15": "10000001",
    "p:10:20": "10000002",
    "button:11:25": "10000003"
  },
  "nextKey": "10000004"
}
```

**Key Format:** `{tagName}:{startLine}:{startColumn}` → `{hexKey}`

**Key Allocation Strategy:**
- Gap-based: `HEX_GAP = 0x10000000` between siblings
- Allows insertions: Between `10000000` and `20000000`, can insert `10000001`, `10000002`, etc.
- Nested paths: `1.2.3` means root child 1, its child 2, its child 3

**Persistence Flow:**
1. On first transpile: Generate new keys, write `.tsx.keys`
2. On subsequent transpiles: Load existing keys, only generate new keys for new elements
3. Deleted elements: Keys removed from file (tracked as deletions in structural-changes)

---

## Architecture Changes

### Updated `TransformResult`

```csharp
public class TransformResult
{
    // Existing
    public string Code { get; set; } = "";
    public string TemplateJson { get; set; } = "";
    public List<ComponentModel> Components { get; set; } = new();

    // New outputs
    public string HooksJson { get; set; } = "";
    public string StructuralChangesJson { get; set; } = "";
    public string KeysJson { get; set; } = "";

    // Previous keys (for change detection)
    public Dictionary<string, string>? PreviousKeys { get; set; }

    public IEnumerable<(string Extension, string Content)> GetOutputs()
    {
        yield return (".cs", Code);

        if (!string.IsNullOrEmpty(TemplateJson))
            yield return (".templates.json", TemplateJson);

        if (!string.IsNullOrEmpty(HooksJson))
            yield return (".hooks.json", HooksJson);

        if (!string.IsNullOrEmpty(StructuralChangesJson))
            yield return (".structural-changes.json", StructuralChangesJson);

        if (!string.IsNullOrEmpty(KeysJson))
            yield return (".tsx.keys", KeysJson);
    }
}
```

### Updated `TransformOptions`

```csharp
public class TransformOptions
{
    // Existing
    public string Namespace { get; set; } = "MinimactTest.Components";
    public bool GeneratePartialClasses { get; set; } = true;
    public bool IncludeUsings { get; set; } = true;
    public string IndentString { get; set; } = "    ";
    public bool GenerateTemplates { get; set; } = true;

    // New options
    public bool GenerateHooks { get; set; } = true;
    public bool GenerateStructuralChanges { get; set; } = true;
    public bool GenerateKeys { get; set; } = true;

    /// <summary>
    /// Path to existing .tsx.keys file for key persistence.
    /// If null, generates all new keys.
    /// </summary>
    public string? ExistingKeysPath { get; set; }

    /// <summary>
    /// Source file path (for structural-changes.json sourceFile field).
    /// </summary>
    public string? SourceFilePath { get; set; }
}
```

### Updated `ComponentModel`

```csharp
public class ComponentModel
{
    // Existing fields...

    // New: Effect hooks
    public List<EffectHook> EffectHooks { get; } = new();

    // New: Ref hooks
    public List<RefHook> RefHooks { get; } = new();

    // New: Key mappings (for .tsx.keys persistence)
    public Dictionary<string, string> ElementKeys { get; } = new();

    // New: Computed hook index (order of all hooks)
    public int NextHookIndex { get; set; } = 0;
}

public class EffectHook
{
    public int Index { get; set; }
    public List<string> Dependencies { get; } = new();
    public bool HasCleanup { get; set; }
}

public class RefHook
{
    public string Name { get; set; } = "";
    public int Index { get; set; }
    public string? InitialValue { get; set; }
}
```

---

## New Generators

### 1. `HooksGenerator.cs`

```csharp
namespace Reluxer.Transformer;

/// <summary>
/// Generates .hooks.json from ComponentModel.
/// </summary>
public class HooksGenerator
{
    public string Generate(ComponentModel component)
    {
        var output = new HooksJsonOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O")
        };

        // Add useState hooks
        foreach (var state in component.StateFields)
        {
            output.Hooks.Add(new HookEntry
            {
                Type = "useState",
                VarName = state.Name,
                Index = state.HookIndex
            });
        }

        // Add useMvcState hooks
        foreach (var mvc in component.MvcStateFields)
        {
            output.Hooks.Add(new HookEntry
            {
                Type = "useMvcState",
                VarName = mvc.LocalName,
                ViewModelKey = mvc.ViewModelKey,
                Index = mvc.HookIndex,
                Mutable = !string.IsNullOrEmpty(mvc.SetterName)
            });
        }

        // Add useEffect hooks
        foreach (var effect in component.EffectHooks)
        {
            output.Hooks.Add(new HookEntry
            {
                Type = "useEffect",
                Index = effect.Index,
                Deps = effect.Dependencies.ToArray()
            });
        }

        // Add useRef hooks
        foreach (var refHook in component.RefHooks)
        {
            output.Hooks.Add(new HookEntry
            {
                Type = "useRef",
                VarName = refHook.Name,
                Index = refHook.Index
            });
        }

        // Sort by index
        output.Hooks = output.Hooks.OrderBy(h => h.Index).ToList();

        return JsonSerializer.Serialize(output, JsonOptions);
    }
}
```

### 2. `StructuralChangesGenerator.cs`

```csharp
namespace Reluxer.Transformer;

/// <summary>
/// Generates .structural-changes.json from VNode render tree.
/// </summary>
public class StructuralChangesGenerator
{
    public string Generate(ComponentModel component, string? sourceFile = null)
    {
        var output = new StructuralChangesOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O"),
            SourceFile = sourceFile
        };

        if (component.RenderTree != null)
        {
            // Generate insert operations for entire tree (initial render)
            GenerateInsertOperations(component.RenderTree, output.Changes);
        }

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Generates changes by comparing old vs new render trees.
    /// </summary>
    public string GenerateWithDiff(
        ComponentModel component,
        VNodeModel? previousTree,
        string? sourceFile = null)
    {
        var output = new StructuralChangesOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O"),
            SourceFile = sourceFile
        };

        if (previousTree == null)
        {
            // No previous tree - all inserts
            if (component.RenderTree != null)
                GenerateInsertOperations(component.RenderTree, output.Changes);
        }
        else
        {
            // Diff trees
            DiffTrees(previousTree, component.RenderTree, output.Changes);
        }

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    private void GenerateInsertOperations(VNodeModel node, List<StructuralChange> changes)
    {
        var vnodeJson = ConvertToVNodeJson(node);
        changes.Add(new StructuralChange
        {
            Type = "insert",
            Path = node.HexPath,
            VNode = vnodeJson
        });

        // Recursively add children
        if (node is VElementModel element)
        {
            foreach (var child in element.Children)
            {
                GenerateInsertOperations(child, changes);
            }
        }
    }

    private VNodeJson ConvertToVNodeJson(VNodeModel node)
    {
        return node switch
        {
            VElementModel e => new VNodeJson
            {
                Type = "element",
                Tag = e.TagName,
                Path = e.HexPath,
                Attributes = e.Attributes
                    .Where(a => !a.Value.IsEventHandler)
                    .ToDictionary(
                        a => a.Key == "class" ? "className" : a.Key,
                        a => a.Value.IsDynamic ? "__DYNAMIC__" : a.Value.RawValue
                    ),
                Children = e.Children.Select(c => ConvertToVNodeJsonSummary(c)).ToList()
            },
            VTextModel t => new VNodeJson
            {
                Type = t.IsDynamic ? "expression" : "text",
                Path = t.HexPath,
                Value = t.IsDynamic ? "__DYNAMIC__" : t.Text
            },
            VConditionalModel c => new VNodeJson
            {
                Type = "conditional",
                Path = c.HexPath,
                Condition = c.Condition
            },
            VListModel l => new VNodeJson
            {
                Type = "list",
                Path = l.HexPath,
                ArrayBinding = l.ArrayExpression
            },
            VComponentWrapperModel w => new VNodeJson
            {
                Type = "component",
                Path = w.HexPath,
                ComponentName = w.ComponentName
            },
            _ => new VNodeJson { Type = "unknown", Path = node.HexPath }
        };
    }

    private VNodeJson ConvertToVNodeJsonSummary(VNodeModel node)
    {
        // Lightweight version for children array (just type, path, tag)
        return node switch
        {
            VElementModel e => new VNodeJson { Type = "element", Path = e.HexPath, Tag = e.TagName },
            VTextModel t => new VNodeJson { Type = t.IsDynamic ? "expression" : "text", Path = t.HexPath },
            _ => new VNodeJson { Type = "unknown", Path = node.HexPath }
        };
    }
}
```

### 3. `KeysGenerator.cs`

```csharp
namespace Reluxer.Transformer;

/// <summary>
/// Generates and persists .tsx.keys for stable element identification.
/// </summary>
public class KeysGenerator
{
    private const int HEX_GAP = 0x10000000;

    private Dictionary<string, string> _existingKeys = new();
    private int _nextKeyValue = 1;

    /// <summary>
    /// Loads existing keys from a .tsx.keys file.
    /// </summary>
    public void LoadExistingKeys(string json)
    {
        var data = JsonSerializer.Deserialize<KeysJsonFile>(json);
        if (data?.Keys != null)
        {
            _existingKeys = new Dictionary<string, string>(data.Keys);

            // Parse nextKey to continue sequence
            if (!string.IsNullOrEmpty(data.NextKey) &&
                int.TryParse(data.NextKey, NumberStyles.HexNumber, null, out var next))
            {
                _nextKeyValue = next / HEX_GAP;
            }
        }
    }

    /// <summary>
    /// Generates keys JSON, reusing existing keys where possible.
    /// </summary>
    public string Generate(ComponentModel component, IReadOnlyList<Token> tokens)
    {
        var output = new KeysJsonFile
        {
            Version = "1.0",
            ComponentName = component.Name,
            GeneratedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // Collect all JSX elements with their positions
        var elements = CollectJsxElements(tokens);

        foreach (var elem in elements)
        {
            var locationKey = $"{elem.TagName}:{elem.Line}:{elem.Column}";

            if (_existingKeys.TryGetValue(locationKey, out var existingKey))
            {
                // Reuse existing key
                output.Keys[locationKey] = existingKey;
            }
            else
            {
                // Generate new key
                var newKey = (_nextKeyValue++ * HEX_GAP).ToString("X8");
                output.Keys[locationKey] = newKey;
            }
        }

        output.NextKey = (_nextKeyValue * HEX_GAP).ToString("X8");

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Gets the hex key for an element at a given position.
    /// </summary>
    public string GetKeyForElement(string tagName, int line, int column)
    {
        var locationKey = $"{tagName}:{line}:{column}";

        if (_existingKeys.TryGetValue(locationKey, out var key))
            return key;

        // Generate new
        var newKey = (_nextKeyValue++ * HEX_GAP).ToString("X8");
        _existingKeys[locationKey] = newKey;
        return newKey;
    }

    private List<JsxElementInfo> CollectJsxElements(IReadOnlyList<Token> tokens)
    {
        var elements = new List<JsxElementInfo>();

        foreach (var token in tokens)
        {
            if (token.Type == TokenType.JsxTagOpen)
            {
                var tagName = token.Value.TrimStart('<');
                elements.Add(new JsxElementInfo
                {
                    TagName = tagName,
                    Line = token.Line,
                    Column = token.Column
                });
            }
        }

        return elements;
    }
}

internal class JsxElementInfo
{
    public string TagName { get; set; } = "";
    public int Line { get; set; }
    public int Column { get; set; }
}
```

---

## New Visitors

### `EffectVisitor.cs` - Extract useEffect hooks

```csharp
namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Extracts useEffect hooks from component bodies.
/// </summary>
public class EffectVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public EffectVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody,
                nameof(VisitUseEffectWithDeps),
                nameof(VisitUseEffectNoDeps));
        }
    }

    // Match: useEffect(() => { ... }, [deps])
    // Uses \Bp for balanced parens, \Bb for balanced braces, \Bk for balanced brackets
    [TokenPattern(@"\i""useEffect"" ""("" (\Bp)? \fa (\Bb) "","" (\Bk) "")""", Priority = 100)]
    public void VisitUseEffectWithDeps(TokenMatch match, Token[]? paramsTokens, Token[] bodyTokens, Token[] depsTokens)
    {
        var effect = new EffectHook
        {
            Index = _component.NextHookIndex++,
            HasCleanup = HasReturnStatement(bodyTokens)
        };

        // Extract dependency names from bracket content
        var deps = depsTokens
            .Where(t => t.Type == TokenType.Identifier)
            .Select(t => t.Value)
            .ToList();

        effect.Dependencies.AddRange(deps);
        _component.EffectHooks.Add(effect);
    }

    // Match: useEffect(() => { ... }) - no dependency array (runs every render)
    [TokenPattern(@"\i""useEffect"" ""("" (\Bp)? \fa (\Bb) "")""", Priority = 90)]
    public void VisitUseEffectNoDeps(TokenMatch match, Token[]? paramsTokens, Token[] bodyTokens)
    {
        var effect = new EffectHook
        {
            Index = _component.NextHookIndex++,
            HasCleanup = HasReturnStatement(bodyTokens)
        };

        // No dependencies = runs every render (empty deps would be [])
        _component.EffectHooks.Add(effect);
    }

    private bool HasReturnStatement(Token[] tokens)
    {
        // Simple check - look for return keyword
        return tokens.Any(t => t.Type == TokenType.Keyword && t.Value == "return");
    }
}
```

### `RefVisitor.cs` - Extract useRef hooks

```csharp
namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Extracts useRef hooks from component bodies.
/// </summary>
public class RefVisitor : TokenVisitor
{
    private readonly ComponentModel _component;
    private Token[]? _componentBody;

    public RefVisitor(ComponentModel component)
    {
        _component = component;
    }

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _componentBody = Context.Get<Token[]>($"ComponentBody:{_component.Name}");

        if (_componentBody != null && _componentBody.Length > 0)
        {
            Traverse(_componentBody, nameof(VisitUseRef));
        }
    }

    // Match: const name = useRef(initialValue)
    [TokenPattern(@"\k""const"" (\i) ""="" \i""useRef"" ""("" (.*?) "")""")]
    public void VisitUseRef(TokenMatch match, string name, Token[] initialValueTokens)
    {
        var refHook = new RefHook
        {
            Name = name,
            Index = _component.NextHookIndex++,
            InitialValue = initialValueTokens.Length > 0
                ? string.Join("", initialValueTokens.Select(t => t.Value))
                : null
        };

        _component.RefHooks.Add(refHook);
    }
}
```

---

## Updated Pipeline

### `TsxTransformer.cs` Updates

```csharp
public TransformResult Transform(IReadOnlyList<Token> tokens, string source)
{
    var result = new TransformResult();
    var sharedContext = new VisitorContext();

    // Phase 1: Extract components
    var componentVisitor = new ComponentVisitor();
    componentVisitor.Visit(tokens, source, sharedContext);
    var components = componentVisitor.Components;

    // Phase 1.5: Extract props
    foreach (var component in components)
    {
        var paramsKey = $"ComponentParams:{component.Name}";
        var paramTokens = sharedContext.Get<Token[]>(paramsKey);
        if (paramTokens != null && paramTokens.Length > 0)
        {
            var propsVisitor = new PropsVisitor();
            propsVisitor.ExtractPropsFromParams(paramTokens, component.Name);
            foreach (var prop in propsVisitor.Props)
                component.Props.Add(prop);
        }
    }

    // Phase 2: Extract state (useState hooks)
    foreach (var component in components)
    {
        var stateVisitor = new StateVisitor(component);
        stateVisitor.Visit(tokens, source, sharedContext);
    }

    // Phase 2.5: Extract effects (useEffect hooks) - NEW
    if (_options.GenerateHooks)
    {
        foreach (var component in components)
        {
            var effectVisitor = new EffectVisitor(component);
            effectVisitor.Visit(tokens, source, sharedContext);
        }
    }

    // Phase 2.6: Extract refs (useRef hooks) - NEW
    if (_options.GenerateHooks)
    {
        foreach (var component in components)
        {
            var refVisitor = new RefVisitor(component);
            refVisitor.Visit(tokens, source, sharedContext);
        }
    }

    // Phase 3: Extract event handlers and local variables
    foreach (var component in components)
    {
        var handlerVisitor = new HandlerVisitor(component);
        handlerVisitor.Visit(tokens, source, sharedContext);
    }

    // Phase 4: Build render tree (JSX -> VNode)
    foreach (var component in components)
    {
        var jsxVisitor = new JsxVisitor(component);
        jsxVisitor.Visit(tokens, source, sharedContext);
    }

    // Phase 5: Generate C# code
    var csharpGenerator = new CSharpGenerator(_options);
    result.Code = csharpGenerator.Generate(components);
    result.Components = components;

    // Phase 6: Generate template JSON
    if (_options.GenerateTemplates)
    {
        var templateGenerator = new TemplateGenerator(_options);
        result.TemplateJson = components.Count == 1
            ? templateGenerator.Generate(components[0])
            : templateGenerator.Generate(components);
    }

    // Phase 7: Generate hooks JSON - NEW
    if (_options.GenerateHooks)
    {
        var hooksGenerator = new HooksGenerator();
        foreach (var component in components)
        {
            result.HooksJson = hooksGenerator.Generate(component);
            // Note: For multiple components, may need per-component files
        }
    }

    // Phase 8: Generate structural changes JSON - NEW
    if (_options.GenerateStructuralChanges)
    {
        var structuralGenerator = new StructuralChangesGenerator();
        foreach (var component in components)
        {
            result.StructuralChangesJson = structuralGenerator.Generate(
                component,
                _options.SourceFilePath);
        }
    }

    // Phase 9: Generate keys JSON - NEW
    if (_options.GenerateKeys)
    {
        var keysGenerator = new KeysGenerator();

        // Load existing keys if available
        if (!string.IsNullOrEmpty(_options.ExistingKeysPath) &&
            File.Exists(_options.ExistingKeysPath))
        {
            keysGenerator.LoadExistingKeys(File.ReadAllText(_options.ExistingKeysPath));
        }

        foreach (var component in components)
        {
            result.KeysJson = keysGenerator.Generate(component, tokens);
        }
    }

    return result;
}
```

---

## Pattern DSL Enhancements

The existing pattern DSL is well-suited for this task. Key patterns used:

| Pattern | Usage |
|---------|-------|
| `\Bp` | Balanced parentheses - for function params `()` |
| `\Bb` | Balanced braces - for function body `{}` |
| `\Bk` | Balanced brackets - for dependency array `[]` |
| `\fa` | Function arrow `=>` |
| `\i"name"` | Specific identifier (e.g., `\i"useEffect"`) |
| `\k"const"` | Specific keyword |
| `(.*?)` | Non-greedy capture |
| `(?:...)?` | Optional non-capturing group |

### Example Patterns for Hook Extraction

```csharp
// useState with destructuring
[TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" ""="" \i""useState"" ""(""")]

// useEffect with deps array
[TokenPattern(@"\i""useEffect"" ""("" (\Bp)? \fa (\Bb) "","" (\Bk) "")""")]

// useRef
[TokenPattern(@"\k""const"" (\i) ""="" \i""useRef"" ""("" (.*?) "")""")]

// useMvcState with generic type
[TokenPattern(@"\k""const"" ""["" (\i) ""]"" \o""="" \i""useMvcState"" \go (\tn) \gc ""("" (\s)")]
```

---

## File Writing Integration

### CLI Usage

```csharp
// Example CLI that writes all output files
public static void TransformFile(string tsxPath, string outputDir)
{
    var source = File.ReadAllText(tsxPath);
    var baseName = Path.GetFileNameWithoutExtension(tsxPath);
    var keysPath = Path.Combine(outputDir, $"{baseName}.tsx.keys");

    var options = new TransformOptions
    {
        Namespace = "Minimact.Components",
        GenerateTemplates = true,
        GenerateHooks = true,
        GenerateStructuralChanges = true,
        GenerateKeys = true,
        ExistingKeysPath = File.Exists(keysPath) ? keysPath : null,
        SourceFilePath = tsxPath
    };

    var transformer = new TsxTransformer(options);
    var result = transformer.Transform(source);

    // Write all outputs
    foreach (var (extension, content) in result.GetOutputs())
    {
        var outputPath = Path.Combine(outputDir, $"{baseName}{extension}");
        File.WriteAllText(outputPath, content);
        Console.WriteLine($"Wrote: {outputPath}");
    }
}
```

### Watch Mode Integration

```csharp
// For Swig IDE integration - watch for changes
public class TransformWatcher
{
    private readonly FileSystemWatcher _watcher;
    private readonly TsxTransformer _transformer;

    public void OnTsxChanged(string tsxPath)
    {
        // Load previous keys for stable identifiers
        var keysPath = Path.ChangeExtension(tsxPath, ".tsx.keys");
        var options = new TransformOptions
        {
            ExistingKeysPath = File.Exists(keysPath) ? keysPath : null,
            SourceFilePath = tsxPath
        };

        var result = _transformer.Transform(File.ReadAllText(tsxPath));

        // Write outputs
        foreach (var (ext, content) in result.GetOutputs())
        {
            File.WriteAllText(Path.ChangeExtension(tsxPath, ext), content);
        }

        // Notify hot reload system
        NotifyHotReload(tsxPath, result);
    }
}
```

---

## Testing Strategy

### Unit Tests

```csharp
[TestClass]
public class HooksGeneratorTests
{
    [TestMethod]
    public void Generate_WithUseState_OutputsCorrectJson()
    {
        var component = new ComponentModel { Name = "Counter" };
        component.StateFields.Add(new StateField
        {
            Name = "count",
            SetterName = "setCount",
            HookIndex = 0
        });

        var generator = new HooksGenerator();
        var json = generator.Generate(component);

        var output = JsonSerializer.Deserialize<HooksJsonOutput>(json);

        Assert.AreEqual("Counter", output.ComponentName);
        Assert.AreEqual(1, output.Hooks.Count);
        Assert.AreEqual("useState", output.Hooks[0].Type);
        Assert.AreEqual("count", output.Hooks[0].VarName);
    }
}

[TestClass]
public class StructuralChangesGeneratorTests
{
    [TestMethod]
    public void Generate_WithRenderTree_OutputsInsertOperations()
    {
        var component = new ComponentModel { Name = "Counter" };
        component.RenderTree = new VElementModel
        {
            TagName = "div",
            HexPath = "1",
            Children = { new VTextModel { HexPath = "1.1", Text = "Hello" } }
        };

        var generator = new StructuralChangesGenerator();
        var json = generator.Generate(component, "Counter.tsx");

        var output = JsonSerializer.Deserialize<StructuralChangesOutput>(json);

        Assert.AreEqual("Counter", output.ComponentName);
        Assert.IsTrue(output.Changes.Any(c => c.Type == "insert" && c.Path == "1"));
    }
}
```

### Integration Tests

```csharp
[TestMethod]
public void Transform_CounterTsx_GeneratesAllFiveFiles()
{
    var source = @"
import { useState } from '@minimact/core';

export default function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <span>{count}</span>
            <button onClick={() => setCount(count + 1)}>+</button>
        </div>
    );
}";

    var transformer = new TsxTransformer(new TransformOptions
    {
        GenerateTemplates = true,
        GenerateHooks = true,
        GenerateStructuralChanges = true,
        GenerateKeys = true
    });

    var result = transformer.Transform(source);

    Assert.IsFalse(string.IsNullOrEmpty(result.Code));
    Assert.IsFalse(string.IsNullOrEmpty(result.TemplateJson));
    Assert.IsFalse(string.IsNullOrEmpty(result.HooksJson));
    Assert.IsFalse(string.IsNullOrEmpty(result.StructuralChangesJson));
    Assert.IsFalse(string.IsNullOrEmpty(result.KeysJson));

    var outputs = result.GetOutputs().ToList();
    Assert.AreEqual(5, outputs.Count);
}
```

---

## Migration Checklist

- [ ] Update `ComponentModel` with new fields (`EffectHooks`, `RefHooks`, `ElementKeys`, `NextHookIndex`)
- [ ] Update `StateField` with `HookIndex` property
- [ ] Create `HooksGenerator.cs`
- [ ] Create `StructuralChangesGenerator.cs`
- [ ] Create `KeysGenerator.cs`
- [ ] Create `EffectVisitor.cs`
- [ ] Create `RefVisitor.cs`
- [ ] Update `StateVisitor` to track hook indices
- [ ] Update `TransformOptions` with new flags
- [ ] Update `TransformResult` with new outputs and `GetOutputs()` method
- [ ] Update `TsxTransformer` pipeline with new phases
- [ ] Add JSON model classes for each output format
- [ ] Write unit tests for each generator
- [ ] Write integration tests for full pipeline
- [ ] Update CLI/Swig integration to write all files

---

## Benefits of This Architecture

1. **Declarative Patterns**: Hook extraction uses `[TokenPattern]` attributes instead of imperative AST walking
2. **Single Pass Model**: All data collected into `ComponentModel`, then generators produce outputs
3. **Composable Generators**: Each generator is independent - can enable/disable individually
4. **Key Persistence**: `.tsx.keys` enables stable identifiers across hot reloads
5. **Full Parity**: Matches babel-plugin-minimact output exactly
6. **C# Ecosystem**: No Node.js dependency, integrates with .NET tooling
7. **Testable**: Each generator can be unit tested in isolation

---

## Appendix: JSON Schema Definitions

### hooks.json Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["componentName", "timestamp", "hooks"],
  "properties": {
    "componentName": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "hooks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "index"],
        "properties": {
          "type": { "enum": ["useState", "useEffect", "useRef", "useMvcState", "useMvcViewModel"] },
          "varName": { "type": "string" },
          "index": { "type": "integer" },
          "deps": { "type": "array", "items": { "type": "string" } },
          "viewModelKey": { "type": "string" },
          "mutable": { "type": "boolean" }
        }
      }
    }
  }
}
```

### structural-changes.json Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["componentName", "timestamp", "changes"],
  "properties": {
    "componentName": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "sourceFile": { "type": "string" },
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "path"],
        "properties": {
          "type": { "enum": ["insert", "delete", "update", "move"] },
          "path": { "type": "string" },
          "vnode": { "$ref": "#/definitions/vnode" }
        }
      }
    }
  },
  "definitions": {
    "vnode": {
      "type": "object",
      "required": ["type", "path"],
      "properties": {
        "type": { "enum": ["element", "text", "expression", "conditional", "list", "component"] },
        "tag": { "type": "string" },
        "path": { "type": "string" },
        "value": { "type": "string" },
        "attributes": { "type": "object" },
        "children": { "type": "array", "items": { "$ref": "#/definitions/vnode" } }
      }
    }
  }
}
```

### tsx.keys Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "componentName", "generatedAt", "keys", "nextKey"],
  "properties": {
    "version": { "type": "string" },
    "componentName": { "type": "string" },
    "generatedAt": { "type": "integer" },
    "keys": {
      "type": "object",
      "additionalProperties": { "type": "string", "pattern": "^[0-9A-F]+$" }
    },
    "nextKey": { "type": "string", "pattern": "^[0-9A-F]+$" }
  }
}
```
