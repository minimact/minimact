/**
 * File Cache
 *
 * Caches GitHub files locally using Tauri's filesystem API
 * Implements cache invalidation based on file SHA
 */

import { invoke } from '@tauri-apps/api/core';

export interface CachedFile {
  content: string;
  sha: string;
  cachedAt: number;
  url: string;
}

export class FileCache {
  /**
   * Get a file from cache
   *
   * @param url - gh:// URL or file path
   * @returns Cached file or null if not found/expired
   */
  async get(url: string): Promise<CachedFile | null> {
    try {
      const key = this.hashUrl(url);
      const cached = await invoke<string>('read_cache', { key });

      if (!cached) {
        return null;
      }

      const parsed: CachedFile = JSON.parse(cached);

      // Check if cache is still valid (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - parsed.cachedAt > maxAge) {
        console.log(`[FileCache] Cache expired for ${url}`);
        await this.delete(url);
        return null;
      }

      console.log(`[FileCache] Cache hit for ${url}`);
      return parsed;
    } catch (error) {
      console.warn(`[FileCache] Failed to read cache for ${url}:`, error);
      return null;
    }
  }

  /**
   * Set a file in cache
   *
   * @param url - gh:// URL or file path
   * @param file - File data to cache
   */
  async set(url: string, file: Omit<CachedFile, 'cachedAt' | 'url'>): Promise<void> {
    try {
      const key = this.hashUrl(url);
      const cached: CachedFile = {
        ...file,
        cachedAt: Date.now(),
        url
      };

      await invoke('write_cache', {
        key,
        value: JSON.stringify(cached)
      });

      console.log(`[FileCache] Cached ${url}`);
    } catch (error) {
      console.error(`[FileCache] Failed to write cache for ${url}:`, error);
    }
  }

  /**
   * Delete a file from cache
   *
   * @param url - gh:// URL or file path
   */
  async delete(url: string): Promise<void> {
    try {
      const key = this.hashUrl(url);
      // For now, we don't have a delete command, so we just write empty
      await invoke('write_cache', { key, value: '' });
      console.log(`[FileCache] Deleted cache for ${url}`);
    } catch (error) {
      console.warn(`[FileCache] Failed to delete cache for ${url}:`, error);
    }
  }

  /**
   * Check if a file is cached
   *
   * @param url - gh:// URL or file path
   * @returns True if cached and valid
   */
  async has(url: string): Promise<boolean> {
    const cached = await this.get(url);
    return cached !== null;
  }

  /**
   * Check if a cached file's SHA matches
   * Used for cache invalidation
   *
   * @param url - gh:// URL or file path
   * @param sha - Expected SHA
   * @returns True if cached SHA matches
   */
  async isShaValid(url: string, sha: string): Promise<boolean> {
    const cached = await this.get(url);
    if (!cached) return false;

    return cached.sha === sha;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await invoke('clear_cache');
      console.log('[FileCache] Cleared all cache');
    } catch (error) {
      console.error('[FileCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache stats
   */
  async getStats(): Promise<{ size: number; files: number }> {
    // TODO: Implement cache stats tracking
    return { size: 0, files: 0 };
  }

  /**
   * Hash a URL to create a cache key
   *
   * @param url - URL to hash
   * @returns Cache key
   */
  private hashUrl(url: string): string {
    // Simple hash: replace non-alphanumeric with underscore
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
}

/**
 * Global file cache instance
 */
export const fileCache = new FileCache();
