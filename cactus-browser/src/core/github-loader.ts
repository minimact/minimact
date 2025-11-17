/**
 * GitHub Loader
 *
 * Main entry point for loading TSX files from GitHub repositories
 * Orchestrates URL parsing, GitHub API calls, import resolution, and caching
 */

import { parseGhUrl, getEntryPath, buildGhUrl } from './gh-protocol';
import { GitHubClient } from './github-client';
import { resolveImports } from './import-resolver';
import { fileCache } from './file-cache';
import { compileTsxSource } from './local-loader';

export interface LoadedFiles {
  files: Map<string, string>;  // path → content
  entryPath: string;
  compiled?: Map<string, any>; // path → compilation result
}

/**
 * Load files from a gh:// URL
 *
 * @param url - gh:// URL (e.g., gh://minimact/docs/pages/index.tsx)
 * @param options - Load options
 * @returns Loaded files and metadata
 */
export async function loadFromGitHub(
  url: string,
  options: {
    useCache?: boolean;
    token?: string;
    compile?: boolean;
  } = {}
): Promise<LoadedFiles> {
  const { useCache = true, token, compile = false } = options;

  console.log(`[GitHubLoader] Loading from ${url}`);

  // 1. Parse gh:// URL
  const parsed = parseGhUrl(url);
  if (!parsed) {
    throw new Error(`Invalid gh:// URL: ${url}`);
  }

  console.log(`[GitHubLoader] Parsed:`, parsed);

  // 2. Get entry file path
  const entryPath = getEntryPath(url);
  console.log(`[GitHubLoader] Entry file: ${entryPath}`);

  // 3. Check cache first
  if (useCache) {
    const cached = await fileCache.get(url);
    if (cached) {
      console.log(`[GitHubLoader] Using cached version`);
      const files = new Map([[entryPath, cached.content]]);

      // Compile if requested
      let compiled: Map<string, any> | undefined;
      if (compile) {
        console.log(`[GitHubLoader] Compiling cached file...`);
        compiled = new Map();
        try {
          const result = await compileTsxSource(cached.content, entryPath);
          compiled.set(entryPath, result);
          console.log(`[GitHubLoader] Compiled ${entryPath}`);
        } catch (error) {
          console.error(`[GitHubLoader] Failed to compile ${entryPath}:`, error);
        }
      }

      return {
        files,
        entryPath,
        compiled
      };
    }
  }

  // 4. Create GitHub client
  const github = new GitHubClient(token);

  // 5. Resolve all imports recursively
  console.log(`[GitHubLoader] Resolving imports...`);
  const resolved = await resolveImports(
    entryPath,
    github,
    parsed.user,
    parsed.repo,
    parsed.ref,
    url
  );

  // 6. Build files map
  const files = new Map<string, string>();
  for (const [path, resolvedImport] of resolved) {
    files.set(path, resolvedImport.content);

    // Cache each file
    if (useCache) {
      await fileCache.set(buildGhUrl({ ...parsed, path }), {
        content: resolvedImport.content,
        sha: 'unknown' // TODO: Get SHA from GitHub API
      });
    }
  }

  console.log(`[GitHubLoader] Loaded ${files.size} files`);

  // 7. Optionally compile files
  let compiled: Map<string, any> | undefined;
  if (compile) {
    console.log(`[GitHubLoader] Compiling ${files.size} files...`);
    compiled = new Map();

    for (const [path, content] of files) {
      try {
        const result = await compileTsxSource(content, path);
        compiled.set(path, result);
        console.log(`[GitHubLoader] Compiled ${path}`);
      } catch (error) {
        console.error(`[GitHubLoader] Failed to compile ${path}:`, error);
      }
    }
  }

  return {
    files,
    entryPath,
    compiled
  };
}

/**
 * Load a single file from GitHub (no import resolution)
 *
 * @param url - gh:// URL
 * @param options - Load options
 * @returns File content
 */
export async function loadSingleFile(
  url: string,
  options: {
    useCache?: boolean;
    token?: string;
  } = {}
): Promise<string> {
  const { useCache = true, token } = options;

  // Parse URL
  const parsed = parseGhUrl(url);
  if (!parsed) {
    throw new Error(`Invalid gh:// URL: ${url}`);
  }

  // Check cache
  if (useCache) {
    const cached = await fileCache.get(url);
    if (cached) {
      return cached.content;
    }
  }

  // Fetch from GitHub
  const github = new GitHubClient(token);
  const file = await github.fetchFile(parsed.user, parsed.repo, parsed.path, parsed.ref);

  // Cache
  if (useCache) {
    await fileCache.set(url, {
      content: file.content,
      sha: file.sha
    });
  }

  return file.content;
}

/**
 * Prefetch files from a repository for offline use
 *
 * @param url - gh:// URL
 * @param token - GitHub token
 */
export async function prefetch(url: string, token?: string): Promise<void> {
  console.log(`[GitHubLoader] Prefetching ${url}...`);

  await loadFromGitHub(url, {
    useCache: true,
    token,
    compile: true
  });

  console.log(`[GitHubLoader] Prefetch complete`);
}

/**
 * Check if a gh:// URL is accessible
 *
 * @param url - gh:// URL
 * @param token - GitHub token
 * @returns True if accessible
 */
export async function checkAccess(url: string, token?: string): Promise<boolean> {
  try {
    await loadSingleFile(url, { useCache: false, token });
    return true;
  } catch (error) {
    console.error(`[GitHubLoader] Access check failed for ${url}:`, error);
    return false;
  }
}
