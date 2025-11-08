/**
 * Shadow Key Map
 *
 * Maintains invisible JSX keys using hybrid matching:
 * - AST signature for stable matching across edits
 * - Position for conflict resolution
 */

import { KeyEntry, ShadowKeyMapData, JSXTagInfo } from './types';
import { HexPathGenerator } from './HexPathGenerator';

export class ShadowKeyMap {
  private keyMap: Map<string, KeyEntry> = new Map();
  private sourceFile: string;
  private version: string = '1.0';

  constructor(sourceFile: string, existingData?: ShadowKeyMapData) {
    this.sourceFile = sourceFile;

    if (existingData) {
      this.loadFromData(existingData);
    }
  }

  /**
   * Update keys based on current JSX tags in document
   */
  updateFromTags(tags: JSXTagInfo[]): void {
    const pathGen = new HexPathGenerator();
    const seenSignatures = new Set<string>();
    const newKeyMap = new Map<string, KeyEntry>();

    for (const tag of tags) {
      // Build AST signature (primary matching key)
      const signature = this.buildASTSignature(tag);

      // Try to find existing key by signature
      let existingKey = this.findBySignature(signature);

      // Fallback: try to find by position
      if (!existingKey) {
        const locationKey = this.buildLocationKey(tag.line, tag.column);
        existingKey = this.keyMap.get(locationKey);
      }

      if (existingKey) {
        // Existing tag - check if changed
        const changed =
          existingKey.tagName !== tag.name ||
          !this.arraysEqual(existingKey.attributes, tag.attributes);

        if (changed) {
          // Tag changed - regenerate path
          const newHexPath = pathGen.buildPath(
            tag.parentPath,
            pathGen.next(tag.parentPath)
          );

          existingKey.hexPath = newHexPath;
          existingKey.tagName = tag.name;
          existingKey.attributes = tag.attributes;
          existingKey.stable = false;
          existingKey.lastModified = Date.now();
        }

        // Update position (may have shifted)
        existingKey.line = tag.line;
        existingKey.column = tag.column;
        existingKey.astSignature = signature;

        newKeyMap.set(this.buildLocationKey(tag.line, tag.column), existingKey);
      } else {
        // New tag - generate key
        const hexPath = pathGen.buildPath(
          tag.parentPath,
          pathGen.next(tag.parentPath)
        );

        const newEntry: KeyEntry = {
          hexPath,
          tagName: tag.name,
          attributes: tag.attributes,
          astSignature: signature,
          line: tag.line,
          column: tag.column,
          stable: true,
          lastModified: Date.now()
        };

        newKeyMap.set(this.buildLocationKey(tag.line, tag.column), newEntry);
      }

      seenSignatures.add(signature);
    }

    // Replace old map with new one (deleted tags are automatically pruned)
    this.keyMap = newKeyMap;
  }

  /**
   * Find key entry by line and column
   */
  getKeyAt(line: number, column: number): KeyEntry | undefined {
    const locationKey = this.buildLocationKey(line, column);
    return this.keyMap.get(locationKey);
  }

  /**
   * Get all key entries
   */
  getAllKeys(): KeyEntry[] {
    return Array.from(this.keyMap.values());
  }

  /**
   * Serialize to JSON format
   */
  serialize(): ShadowKeyMapData {
    const keys: Record<string, KeyEntry> = {};

    for (const [locationKey, entry] of this.keyMap.entries()) {
      keys[locationKey] = entry;
    }

    return {
      version: this.version,
      sourceFile: this.sourceFile,
      lastModified: Date.now(),
      keys
    };
  }

  /**
   * Load from JSON data
   */
  private loadFromData(data: ShadowKeyMapData): void {
    this.version = data.version;
    this.sourceFile = data.sourceFile;

    for (const [locationKey, entry] of Object.entries(data.keys)) {
      this.keyMap.set(locationKey, entry);
    }
  }

  /**
   * Build AST signature for stable matching
   * Format: parentPath.tagName.firstAttribute
   */
  private buildASTSignature(tag: JSXTagInfo): string {
    const firstAttr = tag.attributes[0] || '';
    return `${tag.parentPath}.${tag.name}.${firstAttr}`;
  }

  /**
   * Find key entry by AST signature
   */
  private findBySignature(signature: string): KeyEntry | undefined {
    for (const entry of this.keyMap.values()) {
      if (entry.astSignature === signature) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Build location key from line and column
   */
  private buildLocationKey(line: number, column: number): string {
    return `${line}:${column}`;
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
