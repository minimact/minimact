/**
 * Hex Path Generator (same as babel-plugin-minimact)
 *
 * Generates lexicographically sortable, insertion-friendly paths using hex codes.
 */

export class HexPathGenerator {
  private gap: number;
  private counters: Record<string, number> = {};

  constructor(gap: number = 0x10000000) {
    this.gap = gap;
  }

  /**
   * Generate next hex code for a given parent path
   */
  next(parentPath: string = ''): string {
    if (!this.counters[parentPath]) {
      this.counters[parentPath] = 0;
    }

    this.counters[parentPath]++;

    // For root level, use gap-based spacing
    // For children, use simple sequential hex
    const hexValue = (
      parentPath === ''
        ? this.counters[parentPath] * this.gap
        : this.counters[parentPath]
    ).toString(16);

    // Remove trailing zeros for compactness
    return hexValue.replace(/0+$/, '') || '0';
  }

  /**
   * Build full path by joining parent and child
   */
  buildPath(parentPath: string, childHex: string): string {
    return parentPath ? `${parentPath}.${childHex}` : childHex;
  }

  /**
   * Reset counter for a specific parent
   */
  reset(parentPath: string = ''): void {
    delete this.counters[parentPath];
  }

  /**
   * Reset all counters
   */
  resetAll(): void {
    this.counters = {};
  }
}
