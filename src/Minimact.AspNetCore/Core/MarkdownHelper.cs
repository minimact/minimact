using Markdig;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Helper class for parsing markdown content to HTML with syntax highlighting support
/// </summary>
public static class MarkdownHelper
{
    /// <summary>
    /// Markdown pipeline with advanced extensions (GFM, tables, task lists, etc.)
    /// Code blocks automatically include language classes (e.g., class="language-javascript")
    /// for client-side syntax highlighting with Prism.js or highlight.js
    /// </summary>
    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions() // Includes:
                                 // - GitHub Flavored Markdown (GFM)
                                 // - Tables
                                 // - Task lists
                                 // - Strikethrough
                                 // - Auto-identifiers
                                 // - Auto-links
                                 // - Emphasis extras
                                 // - Pipe tables
                                 // - Grid tables
                                 // - Fenced code blocks (with language classes)
        .Build();

    /// <summary>
    /// Convert markdown string to HTML
    ///
    /// Fenced code blocks will include language classes for syntax highlighting:
    ///
    /// Markdown Input:
    /// ```javascript
    /// console.log('Hello World');
    /// ```
    ///
    /// HTML Output:
    /// <pre><code class="language-javascript">console.log('Hello World');</code></pre>
    ///
    /// To enable syntax highlighting on the client:
    /// 1. Add Prism.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    /// 2. Add Prism theme: <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
    /// 3. Add language plugins as needed (e.g., prism-csharp.min.js, prism-javascript.min.js)
    ///
    /// Or use highlight.js:
    /// 1. Add highlight.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    /// 2. Add theme: <link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css" rel="stylesheet" />
    /// 3. Initialize: <script>hljs.highlightAll();</script>
    /// </summary>
    public static string ToHtml(string markdown)
    {
        if (string.IsNullOrEmpty(markdown))
        {
            return string.Empty;
        }

        return Markdown.ToHtml(markdown, Pipeline);
    }
}
