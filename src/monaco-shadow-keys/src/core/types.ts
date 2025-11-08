/**
 * Shadow Key Map Types
 *
 * Hybrid approach: AST signature for stable matching + position for conflict resolution
 */

export interface KeyEntry {
  /** Hex path (e.g., "1.2.3") */
  hexPath: string;

  /** JSX tag name (e.g., "div", "span") */
  tagName: string;

  /** Attribute names (for change detection) */
  attributes: string[];

  /** AST-based signature for stable matching across edits */
  astSignature: string;

  /** Position in source (line:column, 1-based) */
  line: number;
  column: number;

  /** Whether this key is stable (false = needs regeneration) */
  stable: boolean;

  /** Timestamp of last modification */
  lastModified: number;
}

export interface ShadowKeyMapData {
  /** Format version */
  version: string;

  /** Source file name */
  sourceFile: string;

  /** Last modification timestamp */
  lastModified: number;

  /** Map of location keys to key entries */
  keys: Record<string, KeyEntry>;
}

export interface JSXTagInfo {
  /** Tag name */
  name: string;

  /** Attribute names */
  attributes: string[];

  /** Position in source (1-based) */
  line: number;
  column: number;

  /** Parent tag's hex path (or '' for root) */
  parentPath: string;

  /** Index among siblings */
  siblingIndex: number;
}
