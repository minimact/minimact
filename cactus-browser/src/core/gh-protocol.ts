/**
 * gh:// Protocol Parser
 *
 * Parses and builds GitHub repository URLs in the gh:// format
 *
 * Format: gh://user/repo@ref/path#fragment
 * Examples:
 *   gh://minimact/docs
 *   gh://you/blog@dev/posts/hello.tsx
 *   gh://facebook/react@v18.0.0/docs/hooks.tsx#intro
 */

export interface GhUrl {
  user: string;
  repo: string;
  ref: string;        // branch, tag, or commit SHA (default: 'main')
  path: string;       // path within repo (default: '/pages/index.tsx')
  fragment?: string;  // #component-name
}

/**
 * Parse a gh:// URL into its components
 *
 * @param url - gh:// URL to parse
 * @returns Parsed components or null if invalid
 */
export function parseGhUrl(url: string): GhUrl | null {
  // Format: gh://user/repo@ref/path#fragment
  const pattern = /^gh:\/\/([^\/]+)\/([^@\/]+)(?:@([^\/]+))?(\/[^#]*)?(?:#(.+))?$/;
  const match = url.match(pattern);

  if (!match) {
    console.error('[GhProtocol] Invalid gh:// URL:', url);
    return null;
  }

  return {
    user: match[1],
    repo: match[2],
    ref: match[3] || 'main',
    path: match[4] || '/pages/index.tsx',
    fragment: match[5]
  };
}

/**
 * Build a gh:// URL from components
 *
 * @param parts - URL components
 * @returns Complete gh:// URL
 */
export function buildGhUrl(parts: GhUrl): string {
  let url = `gh://${parts.user}/${parts.repo}`;

  if (parts.ref !== 'main') {
    url += `@${parts.ref}`;
  }

  url += parts.path;

  if (parts.fragment) {
    url += `#${parts.fragment}`;
  }

  return url;
}

/**
 * Extract the entry file path from a gh:// URL
 * Handles directory vs file paths
 *
 * @param url - gh:// URL
 * @returns Entry file path
 */
export function getEntryPath(url: string): string {
  const parsed = parseGhUrl(url);
  if (!parsed) {
    throw new Error(`Invalid gh:// URL: ${url}`);
  }

  // If path ends with .tsx or .ts, it's a file
  if (parsed.path.match(/\.tsx?$/)) {
    return parsed.path;
  }

  // Otherwise, append /index.tsx
  const normalized = parsed.path.endsWith('/') ? parsed.path : `${parsed.path}/`;
  return `${normalized}index.tsx`;
}

/**
 * Check if a URL is a valid gh:// URL
 *
 * @param url - URL to check
 * @returns True if valid gh:// URL
 */
export function isGhUrl(url: string): boolean {
  return url.startsWith('gh://') && parseGhUrl(url) !== null;
}

/**
 * Normalize a gh:// URL (remove trailing slashes, normalize path)
 *
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export function normalizeGhUrl(url: string): string {
  const parsed = parseGhUrl(url);
  if (!parsed) {
    throw new Error(`Invalid gh:// URL: ${url}`);
  }

  // Normalize path (remove trailing slash unless it's root)
  if (parsed.path !== '/' && parsed.path.endsWith('/')) {
    parsed.path = parsed.path.slice(0, -1);
  }

  return buildGhUrl(parsed);
}

/**
 * Resolve a relative path against a gh:// URL base
 *
 * @param base - Base gh:// URL
 * @param relative - Relative path (e.g., './components/Button.tsx')
 * @returns Absolute gh:// URL
 */
export function resolveGhUrl(base: string, relative: string): string {
  const parsed = parseGhUrl(base);
  if (!parsed) {
    throw new Error(`Invalid base gh:// URL: ${base}`);
  }

  // If relative is absolute gh://, return as-is
  if (relative.startsWith('gh://')) {
    return relative;
  }

  // If relative is absolute path, use it
  if (relative.startsWith('/')) {
    parsed.path = relative;
    return buildGhUrl(parsed);
  }

  // Resolve relative path
  const basePath = parsed.path.substring(0, parsed.path.lastIndexOf('/'));
  const resolvedPath = resolvePath(basePath, relative);
  parsed.path = resolvedPath;

  return buildGhUrl(parsed);
}

/**
 * Resolve a relative path against a base path
 *
 * @param base - Base path
 * @param relative - Relative path
 * @returns Resolved path
 */
function resolvePath(base: string, relative: string): string {
  const parts = base.split('/').filter(p => p);
  const relativeParts = relative.split('/').filter(p => p);

  for (const part of relativeParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}
