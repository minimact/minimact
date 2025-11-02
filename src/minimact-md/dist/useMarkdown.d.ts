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
export declare function useMarkdown(initialValue: string): [string, (newValue: string | ((prev: string) => string)) => void];
//# sourceMappingURL=useMarkdown.d.ts.map