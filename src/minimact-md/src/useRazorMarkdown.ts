import { useState } from '@minimact/core';

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
export function useRazorMarkdown(initialValue: string): [string, (newValue: string | ((prev: string) => string)) => void] {
  // useRazorMarkdown is useState<string> on the client
  // The magic happens at build time and server-side:
  // 1. Babel detects Razor syntax (@var, @if, @foreach, etc.)
  // 2. Babel converts Razor → C# interpolated string
  // 3. Field marked as [RazorMarkdown]
  // 4. Server evaluates in OnInitialized(): $@"# {name}"
  // 5. Result passed to MarkdownHelper.ToHtml()
  // 6. Client receives pre-rendered HTML

  return useState<string>(initialValue);
}
