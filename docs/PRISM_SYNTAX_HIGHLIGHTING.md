# Prism.js Syntax Highlighting Integration

Minimact now includes built-in support for **Prism.js syntax highlighting** for code blocks in markdown content.

---

## Quick Start

### Enable Prism.js in MinimactPageRenderer

```csharp
// In your controller
public async Task<IActionResult> BlogPost()
{
    var viewModel = new BlogPostViewModel
    {
        Title = "Getting Started with Minimact",
        Content = @"
# Introduction

Here's a code example:

```csharp
public class Example
{
    public string Name { get; set; }
}
```
"
    };

    return await _renderer.RenderPage<BlogPostPage>(
        viewModel,
        "Blog Post",
        new MinimactPageRenderOptions
        {
            IncludeMarkdownExtension = true,      // Include @minimact/md
            EnablePrismSyntaxHighlighting = true  // ✅ Enable syntax highlighting
        }
    );
}
```

**That's it!** Code blocks will now be syntax highlighted automatically.

---

## Customization Options

### Change Theme

Prism.js comes with several built-in themes:

```csharp
new MinimactPageRenderOptions
{
    EnablePrismSyntaxHighlighting = true,
    PrismTheme = "prism-okaidia" // Dark theme
}
```

**Available themes**:
- `"prism"` - Default light theme (default)
- `"prism-dark"` - Dark theme
- `"prism-twilight"` - Twilight theme
- `"prism-okaidia"` - Okaidia dark theme
- `"prism-tomorrow"` - Tomorrow Night theme
- `"prism-coy"` - Coy theme
- `"prism-solarizedlight"` - Solarized Light theme
- `"prism-funky"` - Funky theme

### Customize Languages

By default, Minimact includes these languages:
- C# (`csharp`)
- JavaScript (`javascript`)
- TypeScript (`typescript`)
- CSS (`css`)
- HTML/XML (`markup`)
- JSON (`json`)
- Python (`python`)
- SQL (`sql`)
- Bash (`bash`)

To use a custom set:

```csharp
new MinimactPageRenderOptions
{
    EnablePrismSyntaxHighlighting = true,
    PrismLanguages = new List<string>
    {
        "csharp",
        "javascript",
        "python",
        "go",
        "rust",
        "java"
    }
}
```

[See all available languages](https://prismjs.com/#supported-languages) (100+ languages supported!)

---

## Example with useRazorMarkdown

```tsx
// Component.tsx
import { useRazorMarkdown } from '@minimact/md';
import { useState } from '@minimact/core';

export function TutorialPage() {
  const [language] = useState('csharp');
  const [difficulty] = useState('beginner');

  const [tutorial] = useRazorMarkdown(`
# Learn @language Programming

## Difficulty Level
@switch (difficulty) {
  case "beginner":
    🟢 **Beginner Friendly**
    break;
  case "intermediate":
    🟡 **Intermediate Level**
    break;
  case "advanced":
    🔴 **Advanced Topics**
    break;
}

## Code Example

\`\`\`@language
public class HelloWorld
{
    public static void Main()
    {
        Console.WriteLine("Hello, World!");
    }
}
\`\`\`

## Next Steps
@if (difficulty == "beginner") {
Start with the basics and practice daily!
} else {
Dive into advanced patterns and architectures.
}
  `);

  return (
    <div className="tutorial">
      {tutorial}
    </div>
  );
}
```

```csharp
// Controller.cs
return await _renderer.RenderPage<TutorialPage>(
    new TutorialViewModel { /* ... */ },
    "Tutorial",
    new MinimactPageRenderOptions
    {
        IncludeMarkdownExtension = true,
        EnablePrismSyntaxHighlighting = true,
        PrismTheme = "prism-tomorrow"
    }
);
```

---

## How It Works

### Server-Side

1. **Markdig** parses markdown and adds language classes:
   ```markdown
   ```javascript
   console.log('Hello');
   ```
   ```

2. Generates HTML with language class:
   ```html
   <pre><code class="language-javascript">console.log('Hello');</code></pre>
   ```

### Client-Side

3. **Prism.js** finds all `<code>` elements with `language-*` classes

4. Applies syntax highlighting based on the language

5. Renders beautifully colored code!

---

## CDN vs Self-Hosted

By default, Minimact uses Prism.js from **cdnjs.cloudflare.com**:

**Advantages**:
- ✅ Zero setup required
- ✅ Fast CDN delivery
- ✅ Cached across sites
- ✅ No build step

**Self-hosting** (if needed):

1. Download Prism.js from [prismjs.com/download.html](https://prismjs.com/download.html)
2. Place in `wwwroot/js/prism.js` and `wwwroot/css/prism.css`
3. Set `AdditionalHeadContent`:

```csharp
new MinimactPageRenderOptions
{
    IncludeMarkdownExtension = true,
    EnablePrismSyntaxHighlighting = false, // Disable CDN
    AdditionalHeadContent = @"
        <link href=""/css/prism.css"" rel=""stylesheet"" />
        <script src=""/js/prism.js""></script>
    "
}
```

---

## Supported Languages

Prism.js supports **100+ languages**, including:

**Programming Languages**:
- C# (`csharp`)
- JavaScript (`javascript`)
- TypeScript (`typescript`)
- Python (`python`)
- Java (`java`)
- Go (`go`)
- Rust (`rust`)
- C++ (`cpp`)
- Swift (`swift`)
- Kotlin (`kotlin`)
- PHP (`php`)
- Ruby (`ruby`)

**Web Technologies**:
- HTML/XML (`markup`)
- CSS (`css`)
- SCSS/SASS (`scss`, `sass`)
- JSON (`json`)
- GraphQL (`graphql`)

**Data & Config**:
- SQL (`sql`)
- YAML (`yaml`)
- TOML (`toml`)
- Bash (`bash`)
- PowerShell (`powershell`)
- Dockerfile (`docker`)

**Markup & Templating**:
- Markdown (`markdown`)
- JSX (`jsx`)
- TSX (`tsx`)
- Handlebars (`handlebars`)
- Liquid (`liquid`)

[Full list of supported languages](https://prismjs.com/#supported-languages)

---

## Performance

### Bundle Size

**Without Prism**:
- Page size: ~50KB (HTML + Minimact runtime)

**With Prism (default languages)**:
- Prism core: ~2KB (CSS) + ~2KB (JS)
- Language plugins: ~1KB each × 9 = ~9KB
- **Total added**: ~13KB (CDN cached)

### Loading Strategy

Prism loads **asynchronously** and doesn't block page rendering:

1. HTML renders immediately (unstyled code)
2. Prism.js loads from CDN
3. Syntax highlighting applies (< 50ms)

---

## Best Practices

### 1. Specify Language

Always specify the language in markdown:

✅ **Good**:
````markdown
```csharp
public class Example { }
```
````

❌ **Avoid**:
````markdown
```
public class Example { }
```
````

### 2. Use Appropriate Theme

Match your site's design:

- **Light sites**: `"prism"` or `"prism-coy"`
- **Dark sites**: `"prism-okaidia"` or `"prism-tomorrow"`

### 3. Load Only Needed Languages

Include only the languages you actually use:

```csharp
PrismLanguages = new List<string> { "csharp", "javascript" }
```

This reduces bundle size by ~7KB (vs all 9 default languages).

### 4. Cache CDN Resources

CDN resources are cached across sites, so most users already have Prism.js cached!

---

## Troubleshooting

### Code blocks not highlighted

**Check**:
1. Is `EnablePrismSyntaxHighlighting = true`?
2. Did you specify a language in markdown (` ```javascript `)?
3. Is the language in `PrismLanguages` list?

### Wrong colors

**Solution**: Change `PrismTheme` to match your site's design.

### Missing language

**Solution**: Add to `PrismLanguages`:

```csharp
PrismLanguages = new List<string> { "csharp", "go" }
```

---

## Advanced: Custom Prism Configuration

For advanced use cases (line numbers, line highlighting, copy button):

```csharp
new MinimactPageRenderOptions
{
    EnablePrismSyntaxHighlighting = false, // Disable auto-include
    AdditionalHeadContent = @"
        <!-- Prism core + theme -->
        <link href=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css"" rel=""stylesheet"" />

        <!-- Prism plugins -->
        <link href=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css"" rel=""stylesheet"" />
        <link href=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/toolbar/prism-toolbar.min.css"" rel=""stylesheet"" />

        <script src=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js""></script>
        <script src=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js""></script>
        <script src=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js""></script>
        <script src=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/toolbar/prism-toolbar.min.js""></script>
        <script src=""https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js""></script>
    ""
}
```

---

## Summary

✅ **One-line setup**: `EnablePrismSyntaxHighlighting = true`
✅ **100+ languages** supported
✅ **8 themes** built-in
✅ **Zero configuration** required
✅ **CDN-hosted** (fast + cached)
✅ **Works with** `useMarkdown` and `useRazorMarkdown`

**Enjoy beautiful syntax highlighting in your Minimact apps!** 🎨
