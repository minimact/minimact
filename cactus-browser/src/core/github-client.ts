/**
 * GitHub API Client
 *
 * Fetches files from GitHub repositories using the REST API
 * Handles authentication, rate limiting, and error handling
 */

export interface GitHubFile {
  content: string;     // Decoded content
  sha: string;         // File SHA
  size: number;        // File size in bytes
  path: string;        // File path in repo
}

export interface GitHubError {
  status: number;
  message: string;
}

export class GitHubClient {
  private token?: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Fetch a single file from a repository
   *
   * @param user - Repository owner
   * @param repo - Repository name
   * @param path - File path within repo
   * @param ref - Branch, tag, or commit SHA
   * @returns File content and metadata
   */
  async fetchFile(
    user: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<GitHubFile> {
    try {
      // Remove leading slash from path
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

      const url = `${this.baseUrl}/repos/${user}/${repo}/contents/${normalizedPath}?ref=${ref}`;

      console.log(`[GitHubClient] Fetching: ${url}`);

      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();

      // Check if it's a directory
      if (Array.isArray(data)) {
        throw new Error(`Path is a directory: ${path}`);
      }

      // Decode base64 content
      const content = atob(data.content.replace(/\n/g, ''));

      console.log(`[GitHubClient] Fetched ${path} (${content.length} bytes)`);

      return {
        content,
        sha: data.sha,
        size: data.size,
        path: data.path
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch ${path}: ${error}`);
    }
  }

  /**
   * Fetch multiple files in parallel
   *
   * @param user - Repository owner
   * @param repo - Repository name
   * @param paths - Array of file paths
   * @param ref - Branch, tag, or commit SHA
   * @returns Map of path → file content
   */
  async fetchMultiple(
    user: string,
    repo: string,
    paths: string[],
    ref: string = 'main'
  ): Promise<Map<string, GitHubFile>> {
    console.log(`[GitHubClient] Fetching ${paths.length} files...`);

    const results = new Map<string, GitHubFile>();

    // Fetch in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);

      const promises = batch.map(path =>
        this.fetchFile(user, repo, path, ref)
          .then(file => ({ path, file, error: null }))
          .catch(error => ({ path, file: null, error }))
      );

      const batchResults = await Promise.all(promises);

      for (const result of batchResults) {
        if (result.file) {
          results.set(result.path, result.file);
        } else {
          console.warn(`[GitHubClient] Failed to fetch ${result.path}:`, result.error);
        }
      }

      // Small delay between batches
      if (i + batchSize < paths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[GitHubClient] Fetched ${results.size}/${paths.length} files`);

    return results;
  }

  /**
   * List files in a directory
   *
   * @param user - Repository owner
   * @param repo - Repository name
   * @param path - Directory path
   * @param ref - Branch, tag, or commit SHA
   * @returns Array of file paths
   */
  async listDirectory(
    user: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<string[]> {
    try {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      const url = `${this.baseUrl}/repos/${user}/${repo}/contents/${normalizedPath}?ref=${ref}`;

      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(`Path is not a directory: ${path}`);
      }

      return data
        .filter(item => item.type === 'file')
        .map(item => '/' + item.path);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to list directory ${path}: ${error}`);
    }
  }

  /**
   * Get repository information
   *
   * @param user - Repository owner
   * @param repo - Repository name
   * @returns Repository metadata
   */
  async getRepoInfo(user: string, repo: string): Promise<any> {
    const url = `${this.baseUrl}/repos/${user}/${repo}`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Check rate limit status
   *
   * @returns Rate limit info
   */
  async getRateLimit(): Promise<any> {
    const url = `${this.baseUrl}/rate_limit`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    return response.json();
  }

  /**
   * Set authentication token
   *
   * @param token - GitHub personal access token
   */
  setToken(token: string) {
    this.token = token;
    console.log('[GitHubClient] Authentication token set');
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cactus-Browser/1.0.0'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 404) {
      throw new Error('File or repository not found (404)');
    }

    if (status === 403) {
      const data = await response.json();
      if (data.message?.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please authenticate with a token.');
      }
      throw new Error(`GitHub API error (403): ${data.message || 'Forbidden'}`);
    }

    if (status === 401) {
      throw new Error('GitHub authentication failed. Please check your token.');
    }

    const text = await response.text();
    throw new Error(`GitHub API error (${status}): ${text}`);
  }
}
