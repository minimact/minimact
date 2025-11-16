/**
 * Import Resolver
 *
 * Resolves import statements in TSX files and recursively fetches dependencies
 * Handles both relative imports (./components/Button) and package imports (@minimact/core)
 */

import { GitHubClient } from './github-client';
import { resolveGhUrl } from './gh-protocol';

export interface ResolvedImport {
  path: string;
  content: string;
  dependencies: string[];
}

/**
 * Resolve all imports starting from an entry file
 *
 * @param entryPath - Entry file path (e.g., /pages/index.tsx)
 * @param github - GitHub API client
 * @param user - Repository owner
 * @param repo - Repository name
 * @param ref - Branch, tag, or commit SHA
 * @param baseUrl - Base gh:// URL for resolving relative imports
 * @returns Map of path → resolved import
 */
export async function resolveImports(
  entryPath: string,
  github: GitHubClient,
  user: string,
  repo: string,
  ref: string,
  baseUrl: string
): Promise<Map<string, ResolvedImport>> {
  const resolved = new Map<string, ResolvedImport>();
  const queue: string[] = [entryPath];
  const visited = new Set<string>();

  console.log(`[ImportResolver] Starting from ${entryPath}`);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;

    if (visited.has(currentPath)) {
      continue;
    }

    visited.add(currentPath);

    try {
      // Fetch file from GitHub
      console.log(`[ImportResolver] Fetching ${currentPath}...`);
      const file = await github.fetchFile(user, repo, currentPath, ref);

      // Extract imports from source
      const imports = extractImports(file.content);
      console.log(`[ImportResolver] Found ${imports.length} imports in ${currentPath}`);

      // Resolve relative imports to absolute paths
      const dependencies: string[] = [];

      for (const imp of imports) {
        // Skip package imports (they'll be bundled separately)
        if (!imp.startsWith('./') && !imp.startsWith('../') && !imp.startsWith('/')) {
          console.log(`[ImportResolver] Skipping package import: ${imp}`);
          continue;
        }

        // Resolve relative path
        const resolvedPath = resolveImportPath(currentPath, imp);
        dependencies.push(resolvedPath);

        // Add to queue if not already visited
        if (!visited.has(resolvedPath)) {
          queue.push(resolvedPath);
        }
      }

      // Store resolved import
      resolved.set(currentPath, {
        path: currentPath,
        content: file.content,
        dependencies
      });

      console.log(`[ImportResolver] Resolved ${currentPath} with ${dependencies.length} dependencies`);
    } catch (error) {
      console.error(`[ImportResolver] Failed to resolve ${currentPath}:`, error);
      // Continue with other files even if one fails
    }
  }

  console.log(`[ImportResolver] Complete! Resolved ${resolved.size} files`);

  return resolved;
}

/**
 * Extract import statements from TypeScript/TSX source code
 *
 * @param source - Source code
 * @returns Array of import paths
 */
export function extractImports(source: string): string[] {
  const imports: string[] = [];

  // Match: import ... from 'path'
  // Match: import ... from "path"
  const importPattern = /import\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1]);
  }

  // Also match: require('path')
  const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  while ((match = requirePattern.exec(source)) !== null) {
    if (!imports.includes(match[1])) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Resolve an import path relative to the current file
 *
 * @param currentPath - Current file path (e.g., /pages/index.tsx)
 * @param importPath - Import statement path (e.g., ../components/Button)
 * @returns Resolved absolute path
 */
export function resolveImportPath(currentPath: string, importPath: string): string {
  // If it's already absolute, return as-is
  if (importPath.startsWith('/')) {
    return normalizeImportPath(importPath);
  }

  // Get directory of current file
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));

  // Resolve relative path
  const resolved = resolvePath(currentDir, importPath);

  return normalizeImportPath(resolved);
}

/**
 * Resolve a relative path against a base path
 *
 * @param base - Base path (e.g., /pages)
 * @param relative - Relative path (e.g., ../components/Button)
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

/**
 * Normalize an import path (add .tsx extension if missing)
 *
 * @param path - Import path
 * @returns Normalized path with extension
 */
function normalizeImportPath(path: string): string {
  // If it already has an extension, return as-is
  if (path.match(/\.(tsx?|jsx?|json)$/)) {
    return path;
  }

  // Try .tsx first (most common for Minimact)
  return `${path}.tsx`;
}

/**
 * Build a dependency graph from resolved imports
 *
 * @param resolved - Map of resolved imports
 * @returns Dependency graph (path → dependencies)
 */
export function buildDependencyGraph(
  resolved: Map<string, ResolvedImport>
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const [path, resolvedImport] of resolved) {
    const deps = new Set(resolvedImport.dependencies);
    graph.set(path, deps);
  }

  return graph;
}

/**
 * Get files in topological order (dependencies before dependents)
 *
 * @param resolved - Map of resolved imports
 * @returns Array of paths in topological order
 */
export function getTopologicalOrder(
  resolved: Map<string, ResolvedImport>
): string[] {
  const graph = buildDependencyGraph(resolved);
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(path: string) {
    if (visited.has(path)) return;
    visited.add(path);

    const deps = graph.get(path) || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    result.push(path);
  }

  for (const path of resolved.keys()) {
    visit(path);
  }

  return result;
}
