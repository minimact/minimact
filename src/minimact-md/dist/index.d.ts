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
/**
 * Plain markdown hook
 * Use for static content like documentation, help text, blog posts
 */
export { useMarkdown } from './useMarkdown';
/**
 * Razor markdown hook
 * Use for dynamic content with state interpolation
 * Supports: @variables, @if, @foreach, @switch, @(expressions)
 */
export { useRazorMarkdown } from './useRazorMarkdown';
export declare const VERSION = "0.1.0";
export declare const MES_CERTIFICATION = "Bronze";
/**
 * Package metadata for debugging
 */
export declare const PACKAGE_INFO: {
    readonly name: "minimact-md";
    readonly version: "0.1.0";
    readonly certification: "Bronze";
    readonly hooks: readonly ["useMarkdown", "useRazorMarkdown"];
    readonly features: readonly ["GitHub Flavored Markdown (GFM)", "Tables, task lists, strikethrough", "Syntax highlighting for code blocks", "Razor-style templating syntax", "Variable interpolation (@variable)", "Conditionals (@if/@else)", "Loops (@foreach, @for)", "Switch expressions (@switch)", "Server-side rendering (Markdig)", "Zero client-side bundle overhead"];
};
//# sourceMappingURL=index.d.ts.map