# Razor Markdown Implementation Plan

## Overview

**Goal**: Enable Razor-style syntax in `useMarkdown` hook to support dynamic state interpolation, conditionals, loops, and expressions within markdown content.

**Key Principle**: Direct variable references (`@price`) instead of `@Model.price`, with full support for C# expressions, conditionals, loops, and switch statements.

---

## Architecture

### High-Level Flow

```
TSX Source (Razor Markdown)
         ↓
   Babel Plugin
    - Detects Razor syntax (@var, @if, @foreach, @switch)
    - Extracts referenced variables
    - Marks field as [RazorMarkdown]
    - Converts Razor → C# interpolated string
         ↓
   Generated C#
    - Field marked [RazorMarkdown][State]
    - Initialized as null!
    - Evaluated in OnInitialized() using $@"..." interpolation
         ↓
   Server Runtime
    - OnInitialized() executes
    - C# string interpolation evaluates expressions
    - Result passed to MarkdownHelper.ToHtml()
         ↓
   Rendered HTML
    - Client receives pre-rendered HTML via patches
```

---

## Supported Razor Syntax

### 1. Variable References

```tsx
const [price] = useState(99);
const [name] = useState('Product');

useMarkdown(`
Price: @price
Name: @name
Property Access: @product.Name
Method Call: @price.ToString("F2")
`);
```

**Converts to C#:**
```csharp
description = $@"
Price: {price}
Name: {name}
Property Access: {product.Name}
Method Call: {price.ToString("F2")}
";
```

---

### 2. Inline Expressions

```tsx
const [price] = useState(99);
const [quantity] = useState(5);

useMarkdown(`
Total: @(price * quantity)
Discount: @(price > 100 ? "10%" : "5%")
Formatted: @(DateTime.Now.ToString("yyyy-MM-dd"))
`);
```

**Converts to C#:**
```csharp
description = $@"
Total: {(price * quantity)}
Discount: {(price > 100 ? "10%" : "5%")}
Formatted: {(DateTime.Now.ToString("yyyy-MM-dd"))}
";
```

---

### 3. Conditionals (@if / @else)

```tsx
const [stock] = useState(15);
const [isPremium] = useState(true);

useMarkdown(`
@if (stock > 10) {
✅ **In Stock** - Ready to ship!
} else {
⚠️ **Low Stock** - Order soon!
}

@if (isPremium) {
## Premium Features
- Free shipping
- Extended warranty
}
`);
```

**Converts to C#:**
```csharp
description = $@"
{(stock > 10 ? @"
✅ **In Stock** - Ready to ship!
" : @"
⚠️ **Low Stock** - Order soon!
")}

{(isPremium ? @"
## Premium Features
- Free shipping
- Extended warranty
" : "")}
";
```

---

### 4. Loops (@foreach)

```tsx
const [features] = useState(['Fast', 'Reliable', 'Secure']);
const [tags] = useState([
  { name: 'Popular', color: 'blue' },
  { name: 'New', color: 'green' }
]);

useMarkdown(`
## Features
@foreach (var feature in features) {
- ✓ @feature
}

## Tags
@foreach (var tag in tags) {
**[@tag.name](#@tag.color)**
}
`);
```

**Converts to C#:**
```csharp
description = $@"
## Features
{string.Join("\n", features.Select(feature => $@"- ✓ {feature}"))}

## Tags
{string.Join("\n", tags.Select(tag => $@"**[{tag.name}](#{tag.color})**"))}
";
```

---

### 5. For Loops (@for)

```tsx
const [count] = useState(5);

useMarkdown(`
## Steps
@for (var i = 1; i <= count; i++) {
**Step @i**: Complete task @i
}
`);
```

**Converts to C#:**
```csharp
description = $@"
## Steps
{string.Join("\n", Enumerable.Range(1, count).Select(i => $@"**Step {i}**: Complete task {i}"))}
";
```

---

### 6. Switch Expressions (@switch)

```tsx
const [status] = useState('pending');
const [quantity] = useState(3);

useMarkdown(`
## Order Status
@switch (status) {
  case "pending":
    ⏳ Order is being processed
    break;
  case "shipped":
    📦 Order has been shipped
    break;
  case "delivered":
    ✅ Order delivered
    break;
  default:
    ❓ Unknown status
    break;
}

## Stock Alert
@switch (quantity) {
  case 0:
    ❌ Out of stock
    break;
  case var q when q < 5:
    ⚠️ Low stock - @q remaining
    break;
  default:
    ✅ In stock
    break;
}
`);
```

**Converts to C#:**
```csharp
description = $@"
## Order Status
{status switch {
  "pending" => @"⏳ Order is being processed",
  "shipped" => @"📦 Order has been shipped",
  "delivered" => @"✅ Order delivered",
  _ => @"❓ Unknown status"
}}

## Stock Alert
{quantity switch {
  0 => @"❌ Out of stock",
  var q when q < 5 => $@"⚠️ Low stock - {q} remaining",
  _ => @"✅ In stock"
}}
";
```

---

## Implementation Steps

### Phase 1: Babel Plugin Detection (Week 1)

**Files to modify:**
- `src/babel-plugin-minimact/src/extractors/hooks.cjs`
- `src/babel-plugin-minimact/src/analyzers/razorDetection.cjs` (NEW)

**Tasks:**

1. ✅ **Detect Razor Syntax**
   - Create `containsRazorSyntax(markdown)` function
   - Detect patterns: `@variableName`, `@if`, `@foreach`, `@for`, `@switch`, `@(expression)`
   - Return boolean indicating Razor presence

2. ✅ **Extract Referenced Variables**
   - Create `extractRazorVariables(markdown)` function
   - Parse Razor syntax to find all variable references
   - Extract root variable names (before any `.` property access)
   - Filter out Razor keywords (`if`, `else`, `foreach`, etc.)
   - Return `Set<string>` of variable names

3. ✅ **Update extractUseMarkdown()**
   ```javascript
   function extractUseMarkdown(path, component) {
     // ... existing code ...

     const hasRazorSyntax = containsRazorSyntax(markdownContent);
     const referencedVariables = hasRazorSyntax
       ? extractRazorVariables(markdownContent)
       : [];

     component.useMarkdown.push({
       name: contentVar.name,
       setter: setterVar.name,
       initialValue: generateCSharpExpression(initialValue),
       hasRazorSyntax: hasRazorSyntax,
       referencedVariables: Array.from(referencedVariables)
     });
   }
   ```

**Test Cases:**
```javascript
// Test 1: Simple variable
const md1 = "Price: @price";
assert(containsRazorSyntax(md1) === true);
assert(extractRazorVariables(md1).has('price'));

// Test 2: Property access
const md2 = "Name: @product.Name";
assert(extractRazorVariables(md2).has('product'));

// Test 3: Expression
const md3 = "Total: @(price * quantity)";
assert(extractRazorVariables(md3).has('price'));
assert(extractRazorVariables(md3).has('quantity'));

// Test 4: Conditional
const md4 = "@if (stock > 10) { In Stock }";
assert(extractRazorVariables(md4).has('stock'));

// Test 5: Loop
const md5 = "@foreach (var item in items) { @item }";
assert(extractRazorVariables(md5).has('items'));
```

---

### Phase 2: Razor to C# Conversion (Week 2)

**Files to create:**
- `src/babel-plugin-minimact/src/generators/razorMarkdown.cjs` (NEW)

**Tasks:**

1. ✅ **Create Main Converter**
   ```javascript
   function convertRazorMarkdownToCSharp(razorMarkdown) {
     let markdown = cleanInput(razorMarkdown);

     // Step 1: Convert @if blocks
     markdown = convertIfBlocks(markdown);

     // Step 2: Convert @foreach blocks
     markdown = convertForeachBlocks(markdown);

     // Step 3: Convert @for blocks
     markdown = convertForBlocks(markdown);

     // Step 4: Convert @switch blocks
     markdown = convertSwitchBlocks(markdown);

     // Step 5: Convert @(expression)
     markdown = convertInlineExpressions(markdown);

     // Step 6: Convert @variableName
     markdown = convertVariableReferences(markdown);

     // Step 7: Wrap in $@"..."
     return `$@"${markdown}"`;
   }
   ```

2. ✅ **Implement convertIfBlocks()**
   ```javascript
   function convertIfBlocks(markdown) {
     // Regex: @if \s* ( condition ) \s* { body } [else { elseBody }]
     const ifPattern = /@if\s*\(([^)]+)\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}(?:\s*else\s*\{((?:[^{}]|\{[^{}]*\})*)\})?/g;

     return markdown.replace(ifPattern, (match, condition, thenBody, elseBody) => {
       const then = thenBody.trim();
       const elsePart = elseBody ? elseBody.trim() : '';

       if (elsePart) {
         return `{(${condition} ? @"${then}" : @"${elsePart}")}`;
       } else {
         return `{(${condition} ? @"${then}" : "")}`;
       }
     });
   }
   ```

3. ✅ **Implement convertForeachBlocks()**
   ```javascript
   function convertForeachBlocks(markdown) {
     // Regex: @foreach \s* ( var itemVar in collection ) \s* { body }
     const foreachPattern = /@foreach\s*\(var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_.]*)\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;

     return markdown.replace(foreachPattern, (match, itemVar, collection, body) => {
       const bodyTrimmed = body.trim();
       // Recursively convert nested Razor in body
       const convertedBody = convertNestedRazor(bodyTrimmed, itemVar);
       return `{string.Join("\\n", ${collection}.Select(${itemVar} => $@"${convertedBody}"))}`;
     });
   }
   ```

4. ✅ **Implement convertForBlocks()**
   ```javascript
   function convertForBlocks(markdown) {
     // Simple for: @for (var i = start; i < count; i++)
     const forPattern = /@for\s*\(var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(\d+)\s*;\s*\1\s*<=?\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*;\s*\1\+\+\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;

     return markdown.replace(forPattern, (match, indexVar, start, count, body) => {
       const bodyTrimmed = body.trim();
       const convertedBody = convertNestedRazor(bodyTrimmed, indexVar);
       return `{string.Join("\\n", Enumerable.Range(${start}, ${count} - ${start} + 1).Select(${indexVar} => $@"${convertedBody}"))}`;
     });
   }
   ```

5. ✅ **Implement convertSwitchBlocks()**
   ```javascript
   function convertSwitchBlocks(markdown) {
     const switchPattern = /@switch\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/g;

     return markdown.replace(switchPattern, (match, expr, cases) => {
       const switchCases = [];

       // Match case patterns: case pattern: body break;
       const casePattern = /case\s+(.*?):([\s\S]*?)(?=break;)/g;
       const caseMatches = [...cases.matchAll(casePattern)];

       for (const caseMatch of caseMatches) {
         const pattern = caseMatch[1].trim();
         const body = caseMatch[2].trim();

         // Check if body contains nested @variable
         const convertedBody = convertNestedRazor(body, null);

         // Detect "var q when q < 5" pattern guards
         if (pattern.startsWith('var ')) {
           switchCases.push(`${pattern} => $@"${convertedBody}"`);
         } else {
           switchCases.push(`${pattern} => @"${convertedBody}"`);
         }
       }

       // Match default case
       const defaultMatch = cases.match(/default:([\s\S]*?)(?=break;)/);
       if (defaultMatch) {
         const body = defaultMatch[1].trim();
         const convertedBody = convertNestedRazor(body, null);
         switchCases.push(`_ => @"${convertedBody}"`);
       }

       return `{${expr} switch { ${switchCases.join(', ')} }}`;
     });
   }
   ```

6. ✅ **Implement convertInlineExpressions()**
   ```javascript
   function convertInlineExpressions(markdown) {
     // Convert @(expression) → {(expression)}
     return markdown.replace(/@\(([^)]+)\)/g, '{($1)}');
   }
   ```

7. ✅ **Implement convertVariableReferences()**
   ```javascript
   function convertVariableReferences(markdown) {
     // Convert @variableName → {variableName}
     // Convert @variable.Property → {variable.Property}
     // Skip Razor keywords
     return markdown.replace(/@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, (match, varName) => {
       const keywords = ['if', 'else', 'foreach', 'for', 'while', 'switch'];
       const rootVar = varName.split('.')[0];

       if (keywords.includes(rootVar)) {
         return match; // Leave as-is (shouldn't happen - already converted)
       }

       return `{${varName}}`;
     });
   }
   ```

8. ✅ **Implement convertNestedRazor()**
   ```javascript
   function convertNestedRazor(body, itemVar) {
     let result = body;

     // Convert @(expression)
     result = result.replace(/@\(([^)]+)\)/g, '{($1)}');

     // If itemVar provided, convert @itemVar references
     if (itemVar) {
       result = result.replace(new RegExp(`@${itemVar}(\\.[a-zA-Z_][a-zA-Z0-9_]*)*`, 'g'), (match) => {
         return `{${match.substring(1)}}`; // Remove @ and wrap in {}
       });
     }

     // Convert other @variable references
     result = result.replace(/@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, (match, varName) => {
       return `{${varName}}`;
     });

     return result;
   }
   ```

**Test Cases:**
```javascript
// Test: Variable reference
assert(convertRazorMarkdownToCSharp('Price: @price') === '$@"Price: {price}"');

// Test: Property access
assert(convertRazorMarkdownToCSharp('@product.Name') === '$@"{product.Name}"');

// Test: Expression
assert(convertRazorMarkdownToCSharp('@(price * qty)') === '$@"{(price * qty)}"');

// Test: If/else
const input1 = '@if (stock > 10) { In Stock } else { Low Stock }';
const expected1 = '$@"{(stock > 10 ? @"In Stock" : @"Low Stock")}"';
assert(convertRazorMarkdownToCSharp(input1) === expected1);

// Test: Foreach
const input2 = '@foreach (var f in features) { - @f }';
const expected2 = '$@"{string.Join("\\n", features.Select(f => $@"- {f}"))}"';
assert(convertRazorMarkdownToCSharp(input2) === expected2);

// Test: Switch
const input3 = '@switch (status) { case "new": New break; default: Other break; }';
const expected3 = '$@"{status switch { "new" => @"New", _ => @"Other" }}"';
assert(convertRazorMarkdownToCSharp(input3) === expected3);
```

---

### Phase 3: C# Code Generation (Week 3)

**Files to modify:**
- `src/babel-plugin-minimact/src/generators/component.cjs`

**Tasks:**

1. ✅ **Update Field Generation**
   ```javascript
   // In generateComponentClass()

   // Markdown fields
   for (const md of component.useMarkdown) {
     if (md.hasRazorSyntax) {
       lines.push(`    [RazorMarkdown]`);
       lines.push(`    [State]`);
       lines.push(`    private string ${md.name} = null!;`);
       lines.push('');
     } else {
       lines.push(`    [Markdown]`);
       lines.push(`    [State]`);
       lines.push(`    private string ${md.name} = ${md.initialValue};`);
       lines.push('');
     }
   }
   ```

2. ✅ **Generate OnInitialized() Method**
   ```javascript
   const razorMarkdownFields = component.useMarkdown.filter(md => md.hasRazorSyntax);

   if (razorMarkdownFields.length > 0) {
     lines.push(`    protected override void OnInitialized()`);
     lines.push(`    {`);
     lines.push(`        base.OnInitialized();`);
     lines.push('');

     for (const md of razorMarkdownFields) {
       const csharpMarkdown = convertRazorMarkdownToCSharp(md.initialValue);
       lines.push(`        ${md.name} = ${csharpMarkdown};`);
     }

     lines.push(`    }`);
     lines.push('');
   }
   ```

3. ✅ **Add Required Using Statements**
   ```javascript
   // In generateUsings()
   if (component.useMarkdown.some(md => md.hasRazorSyntax)) {
     // Check if any Razor markdown uses LINQ (foreach → Select)
     const usesLinq = component.useMarkdown.some(md =>
       md.initialValue.includes('@foreach') ||
       md.initialValue.includes('@for')
     );

     if (usesLinq) {
       usings.add('System.Linq');
     }
   }
   ```

**Example Output:**
```csharp
using System;
using System.Linq;
using Minimact.AspNetCore.Core;

public class ProductPageComponent : MinimactComponent
{
    [State]
    private string productName = "Laptop";

    [State]
    private int price = 999;

    [State]
    private int quantity = 15;

    [State]
    private List<string> features = new List<string> { "Fast", "Reliable" };

    [RazorMarkdown]
    [State]
    private string description = null!;

    protected override void OnInitialized()
    {
        base.OnInitialized();

        description = $@"
# {productName}

Price: **${price}**
Quantity: {quantity}

{(quantity > 10 ? @"
✅ In Stock
" : @"
⚠️ Low Stock
")}

## Features
{string.Join("\n", features.Select(feature => $@"- {feature}"))}
        ";
    }

    protected override VNode Render()
    {
        return new DivRawHtml(MarkdownHelper.ToHtml(description));
    }
}
```

---

### Phase 4: Server-Side Attribute (Week 3)

**Files to create:**
- `src/Minimact.AspNetCore/Core/RazorMarkdownAttribute.cs` (NEW)

**Tasks:**

1. ✅ **Create RazorMarkdownAttribute**
   ```csharp
   namespace Minimact.AspNetCore.Core;

   /// <summary>
   /// Marks a field as containing markdown with Razor-style syntax.
   /// The field must be initialized in OnInitialized() using C# string interpolation,
   /// then the result is parsed as markdown to HTML.
   ///
   /// Supports:
   /// - Variable references: @variableName
   /// - Property access: @variable.Property
   /// - Inline expressions: @(expression)
   /// - Conditionals: @if (condition) { ... } else { ... }
   /// - Loops: @foreach (var item in items) { ... }
   /// - Switch expressions: @switch (value) { case ...: ... }
   /// </summary>
   [AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
   public class RazorMarkdownAttribute : Attribute
   {
   }
   ```

2. ✅ **Update MarkdownHelper (Optional Enhancement)**

   Current `MarkdownHelper.ToHtml()` already works - no changes needed.

   But we can add validation:
   ```csharp
   /// <summary>
   /// Convert markdown string to HTML with validation
   /// </summary>
   public static string ToHtml(string markdown)
   {
       if (string.IsNullOrEmpty(markdown))
       {
           return string.Empty;
       }

       // Validate that no unprocessed Razor syntax remains
       if (markdown.Contains("@if") || markdown.Contains("@foreach") || markdown.Contains("@switch"))
       {
           throw new InvalidOperationException(
               "Unprocessed Razor syntax detected in markdown. " +
               "Ensure the field is marked with [RazorMarkdown] and initialized in OnInitialized()."
           );
       }

       return Markdown.ToHtml(markdown, Pipeline);
   }
   ```

---

### Phase 5: Client Runtime (Week 4)

**No changes needed!**

The `useMarkdown` hook in `src/client-runtime/src/hooks.ts` already works correctly:

```typescript
export function useMarkdown(initialValue: string): [string, (newValue: string) => void] {
  // Just delegates to useState - markdown evaluation happens server-side
  return useState<string>(initialValue);
}
```

**Why no changes?**
- Template literals in TSX are evaluated by JavaScript before being passed to the hook
- Babel plugin handles all Razor → C# conversion at build time
- Client receives pre-rendered HTML via patches

---

### Phase 6: Hook Library Update (Week 4)

**Files to modify:**
- `src/minimact-swig-electron/src/main/data/hook-library.ts`

**Tasks:**

1. ✅ **Update useMarkdown Entry**
   ```typescript
   {
     id: 'useMarkdown',
     name: 'useMarkdown',
     description: 'Markdown with Razor syntax - supports @variables, @if, @foreach, @switch',
     category: 'core',
     imports: ["import { useMarkdown } from '@minimact/core';"],
     example: `export function ProductPage() {
     const [name] = useState('Gaming Laptop');
     const [price] = useState(1499);
     const [quantity] = useState(8);
     const [features] = useState(['RTX 4080', '32GB RAM', '1TB SSD']);

     const [description] = useMarkdown(\`
   # @name

   ## Pricing
   - Price: **$@price**
   - Quantity: @quantity
   - Total: **$@(price * quantity)**

   @if (quantity > 10) {
   🎉 **Bulk Discount Available!**
   } else {
   ⚠️ Limited Stock
   }

   ## Features
   @foreach (var feature in features) {
   ✓ @feature
   }

   ## Availability
   @switch (quantity) {
     case 0:
       ❌ **Out of Stock**
       break;
     case var q when q < 5:
       ⚠️ **Low Stock** - Only @q remaining!
       break;
     default:
       ✅ **In Stock**
       break;
   }
     \`);

     return (
       <div className="product">
         {description}
         <button onClick={() => addToCart()}>Add to Cart</button>
       </div>
     );
   }`,
     isDefault: true
   }
   ```

---

### Phase 7: Testing (Week 5)

**Files to create:**
- `src/babel-plugin-minimact/test/razor-markdown.test.js`
- `examples/razor-markdown/ProductPage.tsx`
- `examples/razor-markdown/BlogPost.tsx`

**Test Categories:**

1. ✅ **Unit Tests - Razor Detection**
   ```javascript
   describe('Razor Detection', () => {
     test('detects @variable', () => {
       assert(containsRazorSyntax('Price: @price') === true);
     });

     test('detects @if', () => {
       assert(containsRazorSyntax('@if (x > 10) { Hi }') === true);
     });

     test('detects @foreach', () => {
       assert(containsRazorSyntax('@foreach (var i in items) {}') === true);
     });

     test('detects @switch', () => {
       assert(containsRazorSyntax('@switch (status) {}') === true);
     });

     test('ignores plain markdown', () => {
       assert(containsRazorSyntax('# Hello World') === false);
     });
   });
   ```

2. ✅ **Unit Tests - Variable Extraction**
   ```javascript
   describe('Variable Extraction', () => {
     test('extracts simple variable', () => {
       const vars = extractRazorVariables('@price');
       assert(vars.has('price'));
     });

     test('extracts property access', () => {
       const vars = extractRazorVariables('@product.Name');
       assert(vars.has('product'));
       assert(!vars.has('Name')); // Only root variable
     });

     test('extracts from expressions', () => {
       const vars = extractRazorVariables('@(price * quantity)');
       assert(vars.has('price'));
       assert(vars.has('quantity'));
     });

     test('extracts from conditionals', () => {
       const vars = extractRazorVariables('@if (stock > threshold) { @product }');
       assert(vars.has('stock'));
       assert(vars.has('threshold'));
       assert(vars.has('product'));
     });

     test('extracts from loops', () => {
       const vars = extractRazorVariables('@foreach (var item in items) { @item.name }');
       assert(vars.has('items'));
     });
   });
   ```

3. ✅ **Unit Tests - Razor to C# Conversion**
   ```javascript
   describe('Razor to C# Conversion', () => {
     test('converts variable reference', () => {
       const result = convertRazorMarkdownToCSharp('Price: @price');
       assert(result === '$@"Price: {price}"');
     });

     test('converts property access', () => {
       const result = convertRazorMarkdownToCSharp('@product.Name');
       assert(result === '$@"{product.Name}"');
     });

     test('converts expression', () => {
       const result = convertRazorMarkdownToCSharp('@(price * qty)');
       assert(result === '$@"{(price * qty)}"');
     });

     test('converts if/else', () => {
       const input = '@if (x > 10) { High } else { Low }';
       const expected = '$@"{(x > 10 ? @"High" : @"Low")}"';
       assert(convertRazorMarkdownToCSharp(input) === expected);
     });

     test('converts foreach', () => {
       const input = '@foreach (var f in features) { - @f }';
       const expected = '$@"{string.Join("\\n", features.Select(f => $@"- {f}"))}"';
       assert(convertRazorMarkdownToCSharp(input) === expected);
     });

     test('converts switch', () => {
       const input = '@switch (status) { case "new": New break; default: Other break; }';
       const expected = '$@"{status switch { "new" => @"New", _ => @"Other" }}"';
       assert(convertRazorMarkdownToCSharp(input) === expected);
     });
   });
   ```

4. ✅ **Integration Tests - Full Transpilation**
   ```javascript
   describe('Full Transpilation', () => {
     test('transpiles simple razor markdown component', () => {
       const input = `
         export function ProductPage() {
           const [name] = useState('Laptop');
           const [price] = useState(999);
           const [description] = useMarkdown(\`# @name - $@price\`);
           return <div>{description}</div>;
         }
       `;

       const result = transpile(input);

       assert(result.includes('[RazorMarkdown]'));
       assert(result.includes('private string description = null!;'));
       assert(result.includes('protected override void OnInitialized()'));
       assert(result.includes('description = $@"# {name} - ${price}";'));
     });

     test('transpiles complex razor with conditionals and loops', () => {
       const input = `
         export function BlogPost() {
           const [title] = useState('My Post');
           const [tags] = useState(['tech', 'news']);
           const [content] = useMarkdown(\`
             # @title
             @foreach (var tag in tags) { - #@tag }
             @if (tags.Length > 3) { Popular post! }
           \`);
           return <div>{content}</div>;
         }
       `;

       const result = transpile(input);

       assert(result.includes('string.Join("\\n", tags.Select('));
       assert(result.includes('? @"Popular post!"'));
     });
   });
   ```

5. ✅ **End-to-End Tests**
   - Create sample component with Razor markdown
   - Build with Babel plugin
   - Verify generated C# compiles
   - Run ASP.NET app
   - Verify HTML output is correct

---

### Phase 8: Documentation (Week 5)

**Files to create/update:**
- `docs/RAZOR_MARKDOWN_SYNTAX.md` - Full syntax reference
- `docs/RAZOR_MARKDOWN_EXAMPLES.md` - Cookbook of examples
- `README.md` - Update with Razor markdown feature

**Documentation Structure:**

1. **Syntax Reference**
   - Variable references
   - Property access
   - Inline expressions
   - Conditionals (@if/@else)
   - Loops (@foreach, @for)
   - Switch expressions
   - Nested constructs
   - Escaping @ symbol (@@)

2. **Examples**
   - E-commerce product page
   - Blog post with tags
   - Dashboard with statistics
   - Form validation messages
   - Multi-step wizard
   - Data tables

3. **Best Practices**
   - When to use Razor vs plain markdown
   - Performance considerations
   - Type safety tips
   - Debugging Razor markdown

4. **Troubleshooting**
   - Common errors
   - Build-time vs runtime errors
   - Debugging transpiled C#

---

## Edge Cases to Handle

### 1. Nested Braces in Markdown

```tsx
// Markdown code blocks with braces
useMarkdown(`
@if (x > 10) {
\`\`\`javascript
function test() {
  console.log('nested braces');
}
\`\`\`
}
`);
```

**Solution**: Use balanced brace counting in regex, or escape braces in code blocks.

---

### 2. @ Symbol in Markdown (Email Addresses)

```tsx
useMarkdown(`Contact: user@example.com`);
```

**Solution**:
- Detect `@` followed by non-identifier characters (like `@example`)
- Or require `@@` to escape: `user@@example.com`

---

### 3. Multi-line String Literals

```tsx
const longMarkdown = `
@if (condition) {
  This is a very long
  multi-line content
  that spans many lines
}
`;
```

**Solution**: Preserve newlines in C# verbatim strings (`@"..."`).

---

### 4. Complex Nested Loops

```tsx
useMarkdown(`
@foreach (var category in categories) {
  ## @category.Name
  @foreach (var product in category.Products) {
    - @product.Name: $@product.Price
  }
}
`);
```

**Solution**: Recursive conversion for nested foreach blocks.

---

### 5. Switch with Complex Patterns

```tsx
useMarkdown(`
@switch (order) {
  case { Status: "pending", Priority: > 5 }:
    High priority pending
    break;
  case var o when o.Total > 1000:
    Large order
    break;
}
`);
```

**Solution**: Parse pattern matching syntax carefully, preserve C# 9+ patterns.

---

## Performance Considerations

### Build Time
- ✅ Razor parsing happens at build time (Babel)
- ✅ No runtime overhead for syntax conversion
- ⚠️ Complex regex may slow down large files
- **Mitigation**: Cache Razor detection results

### Runtime
- ✅ String interpolation is fast (native C#)
- ✅ Markdown parsing cached by Markdig
- ⚠️ LINQ `.Select()` allocates for each render
- **Mitigation**: Consider caching OnInitialized() results if markdown doesn't change

### Memory
- ✅ No additional memory overhead
- ✅ Strings are interned by C# runtime
- ⚠️ Large markdown strings may impact memory
- **Mitigation**: Paginate very large markdown content

---

## Security Considerations

### 1. XSS Protection
- ✅ Markdown is parsed server-side (trusted)
- ✅ HTML sanitization by Markdig
- ⚠️ User input in variables could inject HTML
- **Mitigation**: Sanitize user input before passing to Razor markdown

### 2. Code Injection
- ✅ No eval() or dynamic code execution
- ✅ All expressions are C# compile-time checked
- ✅ TypeScript validates variable references
- **No risk**: Babel generates static C# code

### 3. Denial of Service
- ⚠️ Maliciously large markdown could slow parsing
- ⚠️ Deep nesting of loops could cause performance issues
- **Mitigation**: Set reasonable limits on markdown size and nesting depth

---

## Migration Path

### For Existing useMarkdown Users

**Before (Plain Markdown):**
```tsx
const [content] = useMarkdown(`# Hello World`);
```

**After (With Razor - Backward Compatible):**
```tsx
// Still works exactly the same
const [content] = useMarkdown(`# Hello World`);

// Now can also use Razor
const [name] = useState('Alice');
const [content] = useMarkdown(`# Hello @name`);
```

**No breaking changes!** Plain markdown without `@` syntax continues to work.

---

## Success Metrics

### Phase 1-2 (Detection & Conversion)
- ✅ All Razor syntax patterns detected (100% coverage)
- ✅ Variable extraction accuracy >99%
- ✅ Conversion passes all unit tests

### Phase 3-4 (Code Generation)
- ✅ Generated C# compiles without errors
- ✅ OnInitialized() executes correctly
- ✅ No runtime exceptions

### Phase 5-6 (Integration)
- ✅ Client receives correct HTML
- ✅ State changes trigger re-renders
- ✅ Markdown updates propagate to client

### Phase 7-8 (Testing & Docs)
- ✅ 90%+ code coverage
- ✅ All edge cases handled
- ✅ Documentation complete

---

## Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Detection | Razor syntax detection + variable extraction |
| 2 | Conversion | Razor → C# conversion functions |
| 3 | Generation | C# code generation + server attribute |
| 4 | Integration | Hook library update + client verification |
| 5 | Testing | Unit tests + integration tests + docs |

**Total: 5 weeks**

---

## Open Questions

1. **Should we support `@while` loops?**
   - Less common, adds complexity
   - **Decision**: Start with `@foreach` and `@for`, add `@while` if requested

2. **Should we support `@using` blocks?**
   - Example: `@using (var db = GetDb()) { ... }`
   - **Decision**: No, OnInitialized() is not async-friendly for this

3. **Should we support nested `@if` in switch cases?**
   - Example: `case "x": @if (y) { ... }`
   - **Decision**: Yes, via recursive conversion

4. **Should we support Razor helpers/functions?**
   - Example: `@helper RenderItem(Product p) { ... }`
   - **Decision**: No, use C# methods instead

5. **Should we validate referenced variables exist?**
   - Example: `@unknownVar` should warn at build time
   - **Decision**: Yes, cross-reference with component state

---

## Future Enhancements

### Post-MVP Features

1. **Razor Components**
   ```tsx
   useMarkdown(`
     @component(ProductCard, new { product = currentProduct })
   `);
   ```

2. **Razor Partials**
   ```tsx
   useMarkdown(`
     @partial("_ProductDetails")
   `);
   ```

3. **Razor Sections**
   ```tsx
   useMarkdown(`
     @section("sidebar") {
       ## Related Products
     }
   `);
   ```

4. **Async Razor**
   ```tsx
   useMarkdown(`
     @await GetProductDescriptionAsync()
   `);
   ```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding Razor syntax support to the `useMarkdown` hook. The design maintains backward compatibility, leverages existing infrastructure (Babel plugin, MarkdownHelper), and provides a familiar syntax for developers already using ASP.NET Razor.

**Key Benefits:**
- ✅ Familiar Razor syntax
- ✅ Type-safe (TypeScript + C# validation)
- ✅ Server-side rendering (security + performance)
- ✅ No breaking changes
- ✅ Full integration with Minimact ecosystem

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1: Razor detection implementation
3. Create feature branch: `feature/razor-markdown`
4. Set up automated testing pipeline
5. Implement phases sequentially with code reviews
