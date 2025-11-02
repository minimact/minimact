import { useState } from '@minimact/core';

/**
 * useMarkdown hook - for plain markdown content parsed to HTML on server
 *
 * Pattern: const [content, setContent] = useMarkdown('# Hello World');
 *
 * Server-side behavior:
 * - Babel transpiles this to [Markdown][State] string field
 * - Server renders markdown → HTML via MarkdownHelper.ToHtml()
 * - JSX references get wrapped in DivRawHtml(MarkdownHelper.ToHtml(content))
 *
 * Client-side behavior:
 * - Behaves exactly like useState<string>
 * - Receives pre-rendered HTML in patches from server
 * - State changes sync to server (which re-renders markdown → HTML)
 *
 * Example:
 * ```tsx
 * const [content, setContent] = useMarkdown(`
 * # My Blog Post
 *
 * This is **markdown** content with [links](https://example.com).
 *
 * ## Features
 * - GitHub Flavored Markdown
 * - Tables
 * - Syntax highlighting
 * `);
 *
 * return (
 *   <div>
 *     {content}  // Server renders as HTML automatically
 *     <button onClick={() => setContent('# Updated!')}>Update</button>
 *   </div>
 * );
 * ```
 *
 * @param initialValue - Initial markdown string
 * @returns Tuple of [content, setContent] where content is markdown string
 */
function useMarkdown(initialValue) {
    // useMarkdown is just useState<string> on the client
    // The magic happens on the server:
    // 1. Babel recognizes useMarkdown and marks field as [Markdown]
    // 2. Server renders: MarkdownHelper.ToHtml(content)
    // 3. JSX transpiler wraps in DivRawHtml node
    // 4. Client receives pre-rendered HTML via patches
    return useState(initialValue);
}

/**
 * useRazorMarkdown hook - for markdown with Razor-style syntax
 *
 * Pattern: const [content, setContent] = useRazorMarkdown(`# @title`);
 *
 * Supports Razor syntax:
 * - Variable references: @variableName, @variable.Property
 * - Inline expressions: @(expression)
 * - Conditionals: @if (condition) { ... } else { ... }
 * - Loops: @foreach (var item in items) { ... }
 * - For loops: @for (var i = 0; i < count; i++) { ... }
 * - Switch expressions: @switch (value) { case ...: ... }
 *
 * Server-side behavior:
 * - Babel transpiles Razor syntax to C# string interpolation
 * - Field marked with [RazorMarkdown][State]
 * - Evaluated in OnInitialized() using $@"..." with state values
 * - Result passed to MarkdownHelper.ToHtml()
 *
 * Client-side behavior:
 * - Behaves exactly like useState<string>
 * - Receives pre-rendered HTML in patches from server
 *
 * Example:
 * ```tsx
 * const [name] = useState('Gaming Laptop');
 * const [price] = useState(1499);
 * const [features] = useState(['RTX 4080', '32GB RAM', '1TB SSD']);
 *
 * const [description] = useRazorMarkdown(\`
 * # @name
 *
 * ## Pricing
 * - Price: **$@price**
 * - Total: **$@(price * 1.1)** (with tax)
 *
 * @if (price > 1000) {
 * 🎉 **Premium Product!**
 * } else {
 * ✅ **Great Value!**
 * }
 *
 * ## Features
 * @foreach (var feature in features) {
 * ✓ @feature
 * }
 *
 * ## Availability
 * @switch (quantity) {
 *   case 0:
 *     ❌ **Out of Stock**
 *     break;
 *   case var q when q < 5:
 *     ⚠️ **Low Stock** - Only @q remaining!
 *     break;
 *   default:
 *     ✅ **In Stock**
 *     break;
 * }
 * \`);
 *
 * return <div>{description}</div>;
 * ```
 *
 * @param initialValue - Markdown template with Razor syntax
 * @returns Tuple of [content, setContent] where content is markdown string
 */
function useRazorMarkdown(initialValue) {
    // useRazorMarkdown is useState<string> on the client
    // The magic happens at build time and server-side:
    // 1. Babel detects Razor syntax (@var, @if, @foreach, etc.)
    // 2. Babel converts Razor → C# interpolated string
    // 3. Field marked as [RazorMarkdown]
    // 4. Server evaluates in OnInitialized(): $@"# {name}"
    // 5. Result passed to MarkdownHelper.ToHtml()
    // 6. Client receives pre-rendered HTML
    return useState(initialValue);
}

/**
 * Minimact MD 📝
 *
 * Markdown rendering addon for Minimact with Razor syntax support.
 *
 * **Two Hooks:**
 * - **useMarkdown**: Plain markdown → HTML (no dynamic state)
 * - **useRazorMarkdown**: Markdown + Razor syntax (dynamic state interpolation)
 *
 * @packageDocumentation
 */
// ============================================================
// HOOKS
// ============================================================
/**
 * Plain markdown hook
 * Use for static content like documentation, help text, blog posts
 */
// ============================================================
// VERSION & METADATA
// ============================================================
const VERSION = '0.1.0';
const MES_CERTIFICATION = 'Bronze'; // Minimact Extension Standards
/**
 * Package metadata for debugging
 */
const PACKAGE_INFO = {
    name: 'minimact-md',
    version: VERSION,
    certification: MES_CERTIFICATION,
    hooks: ['useMarkdown', 'useRazorMarkdown'],
    features: [
        'GitHub Flavored Markdown (GFM)',
        'Tables, task lists, strikethrough',
        'Syntax highlighting for code blocks',
        'Razor-style templating syntax',
        'Variable interpolation (@variable)',
        'Conditionals (@if/@else)',
        'Loops (@foreach, @for)',
        'Switch expressions (@switch)',
        'Server-side rendering (Markdig)',
        'Zero client-side bundle overhead'
    ]
};

export { MES_CERTIFICATION, PACKAGE_INFO, VERSION, useMarkdown, useRazorMarkdown };
