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
export { useMarkdown } from './useMarkdown';

/**
 * Razor markdown hook
 * Use for dynamic content with state interpolation
 * Supports: @variables, @if, @foreach, @switch, @(expressions)
 */
export { useRazorMarkdown } from './useRazorMarkdown';

// ============================================================
// VERSION & METADATA
// ============================================================

export const VERSION = '0.1.0';
export const MES_CERTIFICATION = 'Bronze'; // Minimact Extension Standards

/**
 * Package metadata for debugging
 */
export const PACKAGE_INFO = {
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
} as const;
