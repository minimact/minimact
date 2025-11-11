# @minimact/md 📝

Markdown rendering addon for Minimact with Razor syntax support.

## Installation

```bash
npm install @minimact/md
```

## Features

- ✅ **GitHub Flavored Markdown** - Tables, task lists, strikethrough, etc.
- ✅ **Syntax Highlighting** - Code blocks with language detection
- ✅ **Razor Syntax** - Dynamic state interpolation with `@variable`, `@if`, `@foreach`
- ✅ **Server-Side Rendering** - Markdown → HTML on server (Markdig)
- ✅ **Zero Client Overhead** - No markdown parser in client bundle
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Reactive** - State changes trigger re-render

---

## Hooks

### `useMarkdown` - Plain Markdown

For static content without dynamic state interpolation.

```tsx
import { useMarkdown } from '@minimact/md';

export function BlogPost() {
  const [content, setContent] = useMarkdown(`
# My Blog Post

This is **markdown** content with [links](https://example.com).

## Features
- GitHub Flavored Markdown
- Tables
- Syntax highlighting

\`\`\`javascript
console.log('Code blocks work!');
\`\`\`
  `);

  return (
    <div className="blog-post">
      {content}
      <button onClick={() => setContent('# Updated!')}>Update</button>
    </div>
  );
}
```

**When to use:**
- Documentation pages
- Static blog posts
- Help text
- FAQ pages

---

### `useRazorMarkdown` - Markdown + Razor Syntax

For dynamic content with state interpolation using Razor-style syntax.

```tsx
import { useRazorMarkdown } from '@minimact/md';
import { useState } from '@minimact/core';

export function ProductPage() {
  const [name] = useState('Gaming Laptop');
  const [price] = useState(1499);
  const [quantity] = useState(8);
  const [features] = useState(['RTX 4080', '32GB RAM', '1TB SSD']);

  const [description] = useRazorMarkdown(`
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
  `);

  return (
    <div className="product">
      {description}
      <button onClick={() => addToCart()}>Add to Cart</button>
    </div>
  );
}
```

**When to use:**
- Product pages
- Dashboards
- Dynamic reports
- User profiles
- E-commerce

---

## Razor Syntax Reference

### Variable References

```tsx
const [price] = useState(99);
const [name] = useState('Product');

useRazorMarkdown(`
Price: @price
Name: @name
Property: @product.Name
Method: @price.ToString("F2")
`);
```

**Converts to C#:**
```csharp
$@"
Price: {price}
Name: {name}
Property: {product.Name}
Method: {price.ToString("F2")}
"
```

---

### Inline Expressions

```tsx
const [price] = useState(99);
const [qty] = useState(5);

useRazorMarkdown(`
Total: @(price * qty)
Discount: @(price > 100 ? "10%" : "5%")
Date: @(DateTime.Now.ToString("yyyy-MM-dd"))
`);
```

---

### Conditionals

```tsx
const [stock] = useState(15);
const [isPremium] = useState(true);

useRazorMarkdown(`
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
$@"
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
"
```

---

### Loops (@foreach)

```tsx
const [features] = useState(['Fast', 'Reliable', 'Secure']);
const [tags] = useState([
  { name: 'Popular', color: 'blue' },
  { name: 'New', color: 'green' }
]);

useRazorMarkdown(`
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
$@"
## Features
{string.Join("\n", features.Select(feature => $@"- ✓ {feature}"))}

## Tags
{string.Join("\n", tags.Select(tag => $@"**[{tag.name}](#{tag.color})**"))}
"
```

---

### For Loops

```tsx
const [count] = useState(5);

useRazorMarkdown(`
## Steps
@for (var i = 1; i <= count; i++) {
**Step @i**: Complete task @i
}
`);
```

**Converts to C#:**
```csharp
$@"
## Steps
{string.Join("\n", Enumerable.Range(1, count).Select(i => $@"**Step {i}**: Complete task {i}"))}
"
```

---

### Switch Expressions

```tsx
const [status] = useState('pending');
const [quantity] = useState(3);

useRazorMarkdown(`
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
$@"
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
"
```

---

## How It Works

### Build Time (Babel Plugin)

1. Babel detects `useRazorMarkdown` from `@minimact/md`
2. Parses Razor syntax (`@variable`, `@if`, `@foreach`, etc.)
3. Converts Razor → C# string interpolation
4. Generates C# component with `[RazorMarkdown]` attribute

### Server Runtime

1. Component initializes: `OnInitialized()` evaluates Razor expressions
2. C# string interpolation fills in state values
3. `MarkdownHelper.ToHtml()` parses markdown → HTML
4. Rust reconciler generates patches
5. Patches sent to client via SignalR

### Client Runtime

1. Client receives pre-rendered HTML patches
2. DOM updated with rendered markdown
3. State changes → Server re-renders → New patches sent

---

## Performance

- ✅ **Build time**: Razor parsing happens in Babel (zero runtime cost)
- ✅ **Server**: Fast C# string interpolation + Markdig caching
- ✅ **Client**: Zero markdown parser overhead (not in bundle)
- ✅ **Network**: Only HTML patches transmitted (not markdown)

---

## Syntax Highlighting

Code blocks automatically include language classes for syntax highlighting. Choose one of these options:

### Option 1: Prism.js (Recommended)

Add to your HTML `<head>`:

```html
<!-- Prism CSS theme -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />

<!-- Prism JS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>

<!-- Language plugins (add as needed) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
```

**Available themes**: `prism.min.css`, `prism-dark.min.css`, `prism-twilight.min.css`, `prism-okaidia.min.css`, `prism-tomorrow.min.css`

### Option 2: highlight.js

Add to your HTML `<head>`:

```html
<!-- Highlight.js theme -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css" rel="stylesheet" />

<!-- Highlight.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<!-- Initialize -->
<script>hljs.highlightAll();</script>
```

**Available themes**: `default.min.css`, `github.min.css`, `monokai.min.css`, `vs2015.min.css`, `atom-one-dark.min.css`

### How It Works

Markdown:
````markdown
```javascript
console.log('Hello World');
```
````

Server renders to HTML:
```html
<pre><code class="language-javascript">console.log('Hello World');</code></pre>
```

Browser applies syntax highlighting based on the `language-javascript` class.

---

## MES Certification

**Bronze** - Minimact Extension Standards

- ✅ Component context integration
- ✅ Index tracking
- ✅ Cleanup on unmount
- ✅ TypeScript declarations
- ⬜ HintQueue integration (not applicable for markdown)
- ⬜ PlaygroundBridge notifications (not applicable)

---

## Examples

See the `examples/` directory for complete examples:

- `basic-markdown.tsx` - Simple blog post with useMarkdown
- `razor-markdown.tsx` - Product page with useRazorMarkdown
- `blog-post.tsx` - Full blog system with tags and categories

---

## FAQ

### Q: Can I use useMarkdown without Razor syntax?

**A:** Yes! `useMarkdown` is for plain markdown without state interpolation.

### Q: What's the difference between useMarkdown and useRazorMarkdown?

| Feature | useMarkdown | useRazorMarkdown |
|---------|-------------|------------------|
| Syntax | Plain markdown | Markdown + Razor |
| State interpolation | ❌ | ✅ |
| Server overhead | Low | Medium |
| Use case | Static content | Dynamic content |

### Q: Does this work with MVC ViewModels?

**A:** Yes! You can use `useMvcState` from `@minimact/mvc` with `useRazorMarkdown`:

```tsx
import { useMvcState } from '@minimact/mvc';
import { useRazorMarkdown } from '@minimact/md';

const [productName] = useMvcState<string>('productName');
const [price] = useMvcState<decimal>('price');

const [description] = useRazorMarkdown(`
# @productName
Price: $@price
`);
```

### Q: How do I escape the @ symbol?

**A:** Use `@@` to escape:

```tsx
useRazorMarkdown(`
Email: user@@example.com
Twitter: @@username
`);
```

### Q: Can I use async/await in Razor expressions?

**A:** No, Razor markdown evaluates in `OnInitialized()` which is synchronous. Use `useServerTask` for async operations.

---

## Roadmap

- [ ] Template caching for better performance
- [ ] Custom Markdig extensions support
- [ ] Syntax validation at build time
- [ ] Visual Studio Code extension for Razor markdown
- [ ] @include directive for partials
- [ ] @component directive for nested components

---

## License

MIT

---

## Related Packages

- `@minimact/core` - Core Minimact runtime
- `@minimact/mvc` - MVC ViewModel integration
- `@minimact/punch` - DOM observation and reactivity
- `@minimact/query` - SQL for the DOM
