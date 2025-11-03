# Template Patch System - Outstanding Issues

This document tracks critical issues discovered during template extraction testing with `00-ProductDetailsPage.tsx`.

## Status: Template Extraction Fixed ✅ → Runtime Issues Remain ❌

**Context**: We successfully fixed template extraction to capture all dynamic content (price, quantity, etc.) and handle mixed content correctly. However, several runtime issues remain that will prevent hot-reload from working properly.

---

## Issue 1: Mixed Content VNode Mismatch 🔴 CRITICAL

### Problem

When JSX has mixed static text and expressions like:
```tsx
<div>${price.toFixed(2)}</div>
```

**Template Extraction** (Babel phase):
- Sees: JSXText `"$"` + JSXExpressionContainer `{price.toFixed(2)}`
- Extracts: **ONE atomic template**: `"${0}"` with binding `price` and transform `toFixed(2)`
- Template path: `div[0].text[0]`

**C# Code Generation** (Babel phase):
```csharp
new VElement("div", ..., new VNode[]
{
    new VText("$"),                          // text[0]
    new VText($"{(price.ToString("F2"))}")   // text[1]
})
```

**Result**: TWO separate VText nodes!

### The Mismatch

- **Template expects**: One text node at `text[0]` with value `"${0}"`
- **Runtime has**: Two text nodes - `text[0]` = `"$"`, `text[1]` = `"123.45"`
- **Template match fails**: Path `div[0].text[0]` points to `"$"` only, template tries to replace it with `"$123.45"` but misses the actual value in `text[1]`

### Impact

Hot-reload will fail for ANY mixed content (text + expression). This includes:
- `${price.toFixed(2)}` → Template: `"${0}"`
- `Logged in as: {email}` → Template: `"Logged in as: {0}"`
- `{isExpanded ? 'Hide' : 'Show'} Details` → Template: `"{0} Details"`

### Root Cause

The JSX generator (`jsx.cjs`) splits mixed content into separate VText nodes during C# generation, but the template extractor treats them as a single atomic template. These two phases are inconsistent.

### Solution Options

**Option A: Generate single VText for mixed content**
```csharp
new VText($"${price.ToString("F2")}")  // ONE node with interpolation
```
- Pros: Matches template structure exactly
- Cons: Requires C# string interpolation for ALL mixed content

**Option B: Generate multiple template entries**
```json
{
  "div[0].text[0]": { "template": "$", "type": "static" },
  "div[0].text[1]": { "template": "{0}", "bindings": ["price"], "transform": {...} }
}
```
- Pros: Matches C# VNode structure exactly
- Cons: Breaks atomicity of mixed content, harder to apply as single unit

**Option C: Reconcile at runtime**
- Let the template system detect and merge adjacent text nodes
- Pros: No build-time changes needed
- Cons: Complex runtime logic, performance overhead

**Recommended**: Option A - modify JSX generator to create single VText nodes for mixed content.

---

## Issue 2: Style Attributes Not in Templates 🔴 CRITICAL

### Problem

Inline style objects are converted to CSS strings at build time and embedded in C# code:

```tsx
<div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
```

**Generated C#**:
```csharp
new VElement("div", new Dictionary<string, string> {
  ["style"] = "font-size: 32px; font-weight: bold; color: #2563eb"
}, ...)
```

**Template JSON**: ❌ No style attribute template extracted!

### The Impact

Changing ANY style in TSX requires:
1. Re-running Babel transpilation
2. Recompiling C#
3. Restarting the application

This **completely defeats hot-reload** for styling changes, which are the most common edits during UI development.

### What Should Happen

Style attributes should be extracted as attribute templates:

```json
{
  "div[0].@style": {
    "template": "font-size: 32px; font-weight: bold; color: #2563eb",
    "type": "attribute-static",
    "attribute": "style"
  }
}
```

Then the runtime can patch the style attribute without recompiling C#.

### Current State

The `extractAttributeTemplates()` function exists but only handles:
- Template literals in attributes: `className={`count-${count}`}`

It does NOT handle:
- ❌ Style objects: `style={{ fontSize: '32px' }}`
- ❌ Plain string attributes: `className="btn-primary"`
- ❌ Other static attributes: `placeholder="Enter name"`

### Solution

Extend `extractAttributeTemplates()` to extract:

1. **Static attributes** (for hot-reload):
   ```json
   { "template": "font-size: 32px; ...", "type": "attribute-static" }
   ```

2. **Dynamic style properties**:
   ```tsx
   <div style={{ width: `${progress}%`, opacity: isVisible ? 1 : 0.5 }}>
   ```
   ```json
   {
     "div[0].@style.width": { "template": "{0}%", "bindings": ["progress"] },
     "div[0].@style.opacity": { "template": "{0}", "bindings": ["isVisible"], "conditional": {...} }
   }
   ```

---

## Issue 3: Conditional Content Not in Templates 🟡 MEDIUM

### Problem

Content inside conditional JSX expressions is not extracted:

```tsx
{isAdmin && (
  <div>
    <h3>Admin Controls</h3>
    <button>Edit Product</button>
    <button>Delete Product</button>
  </div>
)}
```

**Template extraction**: ❌ Skipped entirely!

The template extractor identifies this as "structural JSX" and skips it (line 331-341 in templates.cjs).

### Impact

Hot-reload won't work for:
- Text inside conditionally rendered components
- Button labels in admin panels
- Modal content
- Expandable sections

In our test file:
- ❌ "Admin Controls" heading
- ❌ "Edit Product" button
- ❌ "Delete Product" button
- ❌ "Product Specifications" heading
- ❌ "This is where detailed product information would go."

### Current Behavior

The `extractTemplates()` function has this check:
```javascript
const isStructural = t.isJSXElement(expr) ||
                     (t.isLogicalExpression(expr) &&
                      (t.isJSXElement(expr.right) || t.isJSXFragment(expr.right))) ||
                     ...
```

When it detects `{isAdmin && <div>...</div>}`, it marks it as structural and skips traversing into the nested JSX.

### Why This Happens

The logic assumes that structural JSX will be processed when the JSX tree is traversed. But conditional expressions create **runtime branching**, and the template extractor doesn't descend into both branches.

### Solution

**Option A: Traverse both branches of conditionals**
```javascript
if (t.isLogicalExpression(expr) && t.isJSXElement(expr.right)) {
  // Don't skip - traverse the conditional branch
  traverseJSX(expr.right, currentPath);
}
```

**Option B: Extract structural templates**
Already implemented via `extractStructuralTemplates()` - but this creates element-level templates, not text templates.

**Recommended**: Option A - modify traversal logic to descend into conditional JSX branches.

---

## Issue 4: Template Path Format Inconsistency 🟡 MEDIUM

### Problem

Template paths use a hybrid format that mixes array indices and tag names:

```
"[0].[1].[0].button[0].text[0]"
```

This represents:
- `[0]` - Root element (index 0)
- `.[1]` - Second child (index 1)
- `.[0]` - First grandchild (index 0)
- `.button[0]` - First button element (tag name + index)
- `.text[0]` - First text node (special "text" marker + index)

### Issues

1. **Inconsistent format**: Sometimes uses `[index]`, sometimes uses `.tagName[index]`
2. **Tag names mixed with indices**: Makes it hard to parse programmatically
3. **Not a valid JSON path**: Can't use standard JSON path libraries

### Impact

- Runtime path matching is complex
- Path parsing requires custom logic
- Hard to debug (unclear what `[0].[1].[0]` refers to)

### Better Format Options

**Option A: Pure array indices**
```
"[0][1][0].text[0]"
```
Simple, unambiguous, but loses semantic meaning.

**Option B: Semantic path**
```
"div[0]/div[1]/button[0]/text[0]"
```
Clear, semantic, but requires runtime element type checking.

**Option C: JSON Pointer (RFC 6901)**
```
"/children/0/children/1/children/0/textNodes/0"
```
Standard format, verbose but unambiguous.

---

## Testing Needed

Once issues are fixed, validate with:

1. **Mixed content test**: Change `price` state → verify `${price}` updates via template
2. **Style hot-reload test**: Change `fontSize: '32px'` → verify style updates without recompile
3. **Conditional content test**: Toggle `isAdmin` → verify admin section text hot-reloads
4. **Sibling tracking test**: Verify all 4 option elements get unique paths
5. **Transform test**: Verify `toFixed(2)` transform is applied correctly at runtime

---

## Priority

1. 🔴 **Issue 2** (Style attributes) - Blocks 90% of UI hot-reload use cases
2. 🔴 **Issue 1** (Mixed content) - Blocks text with expressions (very common)
3. 🟡 **Issue 3** (Conditional content) - Limits hot-reload scope
4. 🟡 **Issue 4** (Path format) - Technical debt, doesn't block functionality

---

## Summary

The Template Patch System extraction is now working correctly (15 templates extracted), but **runtime hot-reload will fail** due to:

- VNode structure mismatch for mixed content
- Missing style attribute templates
- Incomplete coverage of conditional JSX content

**Next Steps**: Fix Issues 1 and 2 to enable basic hot-reload functionality, then address Issue 3 for complete coverage.
