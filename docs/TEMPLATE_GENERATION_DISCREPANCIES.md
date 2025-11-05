# Template Generation Discrepancies

**Date:** 2025-11-05
**Component:** ProductDetailsPage
**Status:** 🟡 Partial Match - 40/51 templates (78% coverage)

---

## Executive Summary

The new C# TemplateJsonGenerator produces **40 templates** compared to the old Babel plugin's **51 templates**, missing **11 templates (22%)**.

The main discrepancies are:
1. **Style attributes incorrectly typed** as "attribute-dynamic" instead of "attribute-static"
2. **Missing specialized template types**: conditional, transform, nullable, dynamic
3. **Path format differences**: hex-based vs tag-based

---

## Template Count Comparison

| Source | Total Templates |
|--------|----------------|
| **Old Plugin (Babel)** | 51 |
| **New Transpiler (C#)** | 40 |
| **Missing** | **11 (22%)** |

---

## Template Type Breakdown

### Old Plugin (Tag-Based Paths)

| Type | Count | Example |
|------|-------|---------|
| `attribute-static` | 23 | Style attributes, value attributes |
| `static` | 18 | Static text content |
| `transform` | 3 | `.toFixed(2)` transformations |
| `attribute-dynamic` | 2 | Dynamic attribute bindings |
| `conditional` | 2 | Ternary operators `{isExpanded ? "Hide" : "Show"}` |
| `dynamic` | 2 | Simple dynamic text `{count}` |
| `nullable` | 1 | Optional chaining `{viewModel.userEmail}` |
| **Total** | **51** | |

### New Transpiler (Hex-Based Paths)

| Type | Count | Example |
|------|-------|---------|
| `attribute-dynamic` | 19 | **⚠️ Includes static styles!** |
| `static` | 14 | Static text content |
| `attribute-static` | 4 | Static attributes |
| `complex` | 3 | Complex expressions |
| **Total** | **40** | |

---

## Key Discrepancies

### 1. Style Attributes Misclassified ⚠️

**Problem:** Static style attributes are being marked as "attribute-dynamic" instead of "attribute-static"

**Impact:** ~19 style attributes incorrectly typed

**Example:**
```json
// OLD (Correct):
"div[0].@style": {
  "template": "padding: 20px; font-family: system-ui",
  "type": "attribute-static"  ✓
}

// NEW (Incorrect):
"10000000.@style": {
  "template": "padding: 20px; font-family: system-ui",
  "type": "attribute-dynamic"  ✗ (should be attribute-static)
}
```

**Cause:** In `TemplateJsonGenerator.Visit(DynamicAttributeNode)`, all style objects are generated with type "attribute-dynamic", even when they have no bindings.

**Fix:** Check `StyleObject.HasBindings` or `StyleObject.Bindings.Count` and use "attribute-static" when false/zero.

---

### 2. Missing Conditional Templates

**Problem:** Conditional templates not being generated

**Impact:** 2 missing templates

**Example:**
```json
// OLD:
"[0].button[0].text[0]": {
  "template": "{0} Debug Info",
  "bindings": ["showDebugInfo"],
  "type": "conditional",
  "conditionalTemplates": {
    "true": "Hide",
    "false": "Show"
  }
}

// NEW: Missing entirely ✗
```

**Cause:** The `Visit(ConditionalTemplateNode)` method only visits branches, doesn't generate template metadata with `conditionalTemplates` property.

**Fix:** Extract conditional template mappings and add `conditionalTemplates` to TemplateMetadata.

---

### 3. Missing Transform Templates

**Problem:** Transform metadata not being captured

**Impact:** 3 missing templates

**Example:**
```json
// OLD:
"[0].div[1].text[0]": {
  "template": "Product: {0}, Price: ${1}, Qty: {2}",
  "bindings": ["productName", "price", "quantity"],
  "type": "transform",
  "transform": {
    "method": "toFixed",
    "args": [2]
  }
}

// NEW: Missing transform metadata ✗
```

**Cause:** ExpressionNode has `transform` and `transformArgs` properties in JSON, but these aren't defined in the C# ExpressionNode class.

**Fix:**
1. Add `Transform` and `TransformArgs` properties to ExpressionNode
2. Update `Visit(ComplexTemplateNode)` to check for transforms and set type to "transform"
3. Add `Transform` property to TemplateMetadata

---

### 4. Missing Nullable Templates

**Problem:** Nullable/optional chaining not being tagged

**Impact:** 1 missing template

**Example:**
```json
// OLD:
"[0].[2].div[1].text[0]": {
  "template": "Logged in as: {0}",
  "bindings": ["viewModel.userEmail"],
  "type": "nullable",
  "nullable": true
}

// NEW: Type is "complex" instead of "nullable" ✗
```

**Cause:** The nullable detection isn't implemented - no check for optional chaining (`?.`) in bindings.

**Fix:** Check if binding contains `?` and mark type as "nullable" with `nullable: true` property.

---

### 5. Missing Dynamic Type

**Problem:** Simple dynamic text marked as "complex" instead of "dynamic"

**Impact:** 2 templates

**Example:**
```json
// OLD:
"[0].[3].[0].span[0].text[0]": {
  "template": "{0}",
  "bindings": ["quantity"],
  "type": "dynamic"  ✓
}

// NEW:
"10000000.30000000.20000000.20000000.10000000": {
  "template": "{0}",
  "bindings": ["quantity"],
  "type": "complex"  ✗ (should be dynamic)
}
```

**Cause:** All ExpressionNode templates are marked as "complex" by default.

**Fix:** Check if expression is simple (single binding, no operators) and mark as "dynamic" instead.

---

## Path Format Differences

### Old Plugin (Tag-Based)
```
"[0].h1[0].text[0]"
"div[0].@style"
"[0].[3].[0].span[0].text[0]"
```
- Uses array indices `[0]`, `[1]`
- Includes tag names `div`, `h1`, `span`
- Uses `text[0]` suffix for text nodes

### New Transpiler (Hex-Based)
```
"10000000.10000000.10000000"
"10000000.@style"
"10000000.30000000.20000000.20000000.10000000"
```
- Uses hex codes `10000000`, `20000000`, `30000000`
- Tag-agnostic (268M slots between elements)
- No `text[0]` suffix

**Impact:** This is intentional and beneficial - hex paths avoid cascading renumbering when elements are inserted.

---

## Implementation Tasks

### Priority 1: Fix Style Attribute Types
```csharp
// In TemplateJsonGenerator.Visit(DynamicAttributeNode)
if (node.Subtype == "style-object" && node.StyleObject != null)
{
    var hasBindings = node.StyleObject.HasBindings == true ||
                     (node.StyleObject.Bindings?.Count > 0);

    _templates[key] = new TemplateMetadata
    {
        // ... other properties
        Type = hasBindings ? "attribute-dynamic" : "attribute-static"  // ← FIX
    };
}
```

### Priority 2: Add Transform Support
```csharp
// 1. Add to ExpressionNode class:
[JsonPropertyName("transform")]
public string? Transform { get; set; }

[JsonPropertyName("transformArgs")]
public List<object>? TransformArgs { get; set; }

[JsonPropertyName("isTransform")]
public bool? IsTransform { get; set; }

// 2. Add to TemplateMetadata class:
[JsonPropertyName("transform")]
public object? Transform { get; set; }

// 3. In Visit(ComplexTemplateNode):
if (node is ExpressionNode expr && expr.IsTransform == true)
{
    _templates[key] = new TemplateMetadata
    {
        // ... other properties
        Type = "transform",
        Transform = new
        {
            method = expr.Transform,
            args = expr.TransformArgs
        }
    };
}
```

### Priority 3: Add Conditional Template Support
```csharp
// In Visit(ConditionalTemplateNode):
public void Visit(ConditionalTemplateNode node)
{
    // Extract conditional mappings
    if (node.ConditionalTemplates != null)
    {
        var key = BuildTemplateKey(node.PathSegments, "text[0]");
        _templates[key] = new TemplateMetadata
        {
            Template = node.Template,
            Bindings = node.Bindings?.Select(b => b.Path).ToList() ?? new(),
            Slots = ExtractSlotPositions(node.Template),
            Path = node.PathSegments ?? new List<string>(),
            Type = "conditional",
            ConditionalTemplates = node.ConditionalTemplates
        };
    }

    // Still visit branches for nested nodes
    if (node.Consequent != null) node.Consequent.Accept(this);
    if (node.Alternate != null) node.Alternate.Accept(this);
}
```

### Priority 4: Add Nullable Detection
```csharp
// In Visit(ComplexTemplateNode) or Visit(ExpressionNode):
bool isNullable = node.Bindings?.Any(b => b.Path?.Contains("?") == true) == true;

if (isNullable)
{
    _templates[key] = new TemplateMetadata
    {
        // ... other properties
        Type = "nullable"
    };

    // Add to TemplateMetadata:
    [JsonPropertyName("nullable")]
    public bool? Nullable { get; set; }
}
```

### Priority 5: Distinguish Dynamic vs Complex
```csharp
// In Visit(ComplexTemplateNode):
bool isSimpleDynamic = node.Template == "{0}" &&
                       node.Bindings?.Count == 1 &&
                       !node.Template.Contains("*") &&
                       !node.Template.Contains("+") &&
                       // ... check for operators

string type = isSimpleDynamic ? "dynamic" : "complex";
```

---

## Testing Strategy

1. **Run old Babel plugin** on ProductDetailsPage.tsx → save as `ProductDetailsPage.old.templates.json`
2. **Run new C# transpiler** on same component → save as `ProductDetailsPage.new.templates.json`
3. **Compare template counts by type**
4. **Validate each discrepancy** against expected behavior
5. **Implement fixes incrementally** and re-test after each

---

## Success Criteria

✅ Template count: 51/51 (100%)
✅ All template types match: static, dynamic, complex, conditional, transform, nullable, attribute-static, attribute-dynamic
✅ Conditional templates include `conditionalTemplates` metadata
✅ Transform templates include `transform` metadata
✅ Nullable templates include `nullable` flag
✅ Style attributes correctly typed based on bindings

---

## References

- Old templates: `J:\projects\minimact\src\minimact-transpiler\babel\test-features-all\ProductDetailsPage.templates.json`
- New templates: `J:\projects\minimact\src\minimact-transpiler\babel\test-features-all\output\ProductDetailsPage.templates.json`
- Generator code: `J:\projects\minimact\src\minimact-transpiler\codegen\Minimact.Transpiler.CodeGen\Generators\TemplateJsonGenerator.cs`
- Node definitions: `J:\projects\minimact\src\minimact-transpiler\codegen\Minimact.Transpiler.CodeGen\Nodes\ComponentNode.cs`
