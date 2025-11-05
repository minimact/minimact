import type { DocumentNode, NodeType } from '../types';

/**
 * Parses path strings into structured data
 */
export class PathParser {
  /**
   * Parse a path string into segments
   * Example: "#jsx/div/p[0]/@className" → ["jsx", "div", "p[0]", "@className"]
   */
  static parsePathSegments(path: string): string[] {
    // Remove leading # if present
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;

    // Split by /
    return cleanPath.split('/').filter(seg => seg.length > 0);
  }

  /**
   * Extract array index from segment
   * Example: "p[0]" → { element: "p", index: 0 }
   */
  static parseArraySegment(segment: string): { element: string; index: number } | null {
    const match = segment.match(/^(.+)\[(\d+)\]$/);
    if (!match) return null;

    return {
      element: match[1],
      index: parseInt(match[2], 10)
    };
  }

  /**
   * Detect node type from path pattern
   */
  static detectNodeType(segments: string[]): NodeType {
    if (segments.length === 0) return "component";

    const lastSegment = segments[segments.length - 1];

    // Attributes start with @
    if (lastSegment.startsWith('@')) return "attribute";

    // Import paths
    if (segments[0] === "import") return "import";

    // Bindings
    if (lastSegment === "binding" || lastSegment === "expression") return "binding";

    // Text nodes
    if (lastSegment === "text") return "text";

    // Loops
    if (lastSegment === "loop" || lastSegment === "map") return "loop";

    // Conditionals
    if (lastSegment === "if" || lastSegment === "ternary") return "conditional";

    // Default to element
    return "element";
  }

  /**
   * Calculate depth from path
   */
  static calculateDepth(segments: string[]): number {
    // Each segment adds 1 depth, except root
    return Math.max(0, segments.length - 1);
  }

  /**
   * Extract metadata from path segments
   */
  static extractMetadata(segments: string[], type: NodeType): DocumentNode['metadata'] {
    const metadata: DocumentNode['metadata'] = {};

    if (segments.length === 0) return metadata;

    const lastSegment = segments[segments.length - 1];

    // Attribute name
    if (type === "attribute" && lastSegment.startsWith('@')) {
      metadata.attributeName = lastSegment.slice(1);
    }

    // Element tag name
    if (type === "element") {
      const arrayParsed = this.parseArraySegment(lastSegment);
      metadata.tagName = arrayParsed ? arrayParsed.element : lastSegment;
      if (arrayParsed) {
        metadata.index = arrayParsed.index;
      }
    }

    // Import source
    if (type === "import" && segments.length >= 2) {
      metadata.importSource = segments.slice(1).join('/');
      metadata.isNamedImport = segments[segments.length - 1] === "named";
    }

    return metadata;
  }

  /**
   * Parse a complete line into DocumentNode
   */
  static parseLine(line: string): DocumentNode | null {
    // Format: "#jsx/div/p[0]    content here"
    // Split into path and value
    const parts = line.split(/\s{2,}/); // Split on 2+ spaces

    if (parts.length === 0) return null;

    const pathPart = parts[0].trim();
    const valuePart = parts.slice(1).join('  ').trim(); // Preserve multiple spaces in value

    const segments = this.parsePathSegments(pathPart);
    const type = this.detectNodeType(segments);
    const depth = this.calculateDepth(segments);
    const metadata = this.extractMetadata(segments, type);

    return {
      path: pathPart.startsWith('#') ? pathPart : '#' + pathPart,
      pathSegments: segments,
      type,
      value: valuePart,
      depth,
      metadata
    };
  }

  /**
   * Parse multiple lines into document
   */
  static parseDocument(content: string): DocumentNode[] {
    const lines = content.split('\n');
    const nodes: DocumentNode[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue; // Skip empty lines

      const node = this.parseLine(trimmed);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Serialize DocumentNode back to line format
   */
  static serializeLine(node: DocumentNode): string {
    // Pad to align values
    const pathPadding = 40;
    const paddedPath = node.path.padEnd(pathPadding, ' ');
    return `${paddedPath}${node.value}`;
  }

  /**
   * Serialize document nodes back to string
   */
  static serializeDocument(nodes: DocumentNode[]): string {
    return nodes.map(node => this.serializeLine(node)).join('\n');
  }

  /**
   * Validate path syntax
   */
  static validatePath(path: string): { valid: boolean; error?: string } {
    // Must start with #
    if (!path.startsWith('#')) {
      return { valid: false, error: 'Path must start with #' };
    }

    const segments = this.parsePathSegments(path);

    // Must have at least one segment
    if (segments.length === 0) {
      return { valid: false, error: 'Path must have at least one segment' };
    }

    // Validate each segment
    for (const segment of segments) {
      // Empty segments not allowed
      if (segment.length === 0) {
        return { valid: false, error: 'Empty path segments not allowed' };
      }

      // Check array notation if present
      if (segment.includes('[')) {
        const parsed = this.parseArraySegment(segment);
        if (!parsed) {
          return { valid: false, error: `Invalid array notation: ${segment}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get parent path
   */
  static getParentPath(path: string): string | null {
    const segments = this.parsePathSegments(path);
    if (segments.length <= 1) return null;

    const parentSegments = segments.slice(0, -1);
    return '#' + parentSegments.join('/');
  }

  /**
   * Get child path
   */
  static getChildPath(parentPath: string, childSegment: string): string {
    const cleanParent = parentPath.startsWith('#') ? parentPath.slice(1) : parentPath;
    return `#${cleanParent}/${childSegment}`;
  }

  /**
   * Check if path1 is ancestor of path2
   */
  static isAncestor(path1: string, path2: string): boolean {
    return path2.startsWith(path1 + '/');
  }

  /**
   * Check if path1 is descendant of path2
   */
  static isDescendant(path1: string, path2: string): boolean {
    return path1.startsWith(path2 + '/');
  }
}
