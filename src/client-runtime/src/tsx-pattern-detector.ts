/**
 * TSX Pattern Detector
 *
 * Detects common edit patterns in TSX code to enable instant hot reload
 * via prediction cache lookup (0-5ms instead of 50ms with esbuild)
 */

export interface TsxEditPattern {
  type: 'text-content' | 'class-name' | 'attribute' | 'inline-style' | 'element-added' | 'element-removed' | 'complex';
  confidence: number; // 0.0 - 1.0

  // For text-content
  path?: string;
  oldValue?: string;
  newValue?: string;

  // For class-name
  oldClasses?: string[];
  newClasses?: string[];

  // For attribute
  attribute?: string;

  // For inline-style
  styleProperty?: string;

  // For element-added/removed
  element?: string;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export class TsxPatternDetector {
  /**
   * Detect what kind of edit was made to TSX code
   * Returns a pattern that can be matched against prediction cache
   */
  detectEditPattern(oldTsx: string, newTsx: string): TsxEditPattern {
    // Quick check: If identical, no pattern
    if (oldTsx === newTsx) {
      return { type: 'complex', confidence: 0 };
    }

    const diff = this.computeDiff(oldTsx, newTsx);

    // Fast path 1: Pure text content change (40% of edits)
    const textPattern = this.detectTextChange(diff);
    if (textPattern) return textPattern;

    // Fast path 2: Class name change (25% of edits)
    const classPattern = this.detectClassChange(diff);
    if (classPattern) return classPattern;

    // Fast path 3: Attribute change (15% of edits)
    const attrPattern = this.detectAttributeChange(diff);
    if (attrPattern) return attrPattern;

    // Fast path 4: Inline style change (10% of edits)
    const stylePattern = this.detectStyleChange(diff);
    if (stylePattern) return stylePattern;

    // Fast path 5: Element added/removed (5% of edits)
    const elementPattern = this.detectElementChange(diff);
    if (elementPattern) return elementPattern;

    // Complex change - fall back to server
    return { type: 'complex', confidence: 0.5 };
  }

  /**
   * Compute line-based diff between old and new TSX
   */
  private computeDiff(oldTsx: string, newTsx: string): DiffResult {
    const oldLines = oldTsx.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newLines = newTsx.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    const added = newLines.filter(line => !oldSet.has(line));
    const removed = oldLines.filter(line => !newSet.has(line));
    const unchanged = newLines.filter(line => oldSet.has(line));

    return { added, removed, unchanged };
  }

  /**
   * Detect pure text content change
   * Example: <div>Hello</div> → <div>Hello World</div>
   */
  private detectTextChange(diff: DiffResult): TsxEditPattern | null {
    // Exactly one line changed
    if (diff.removed.length !== 1 || diff.added.length !== 1) {
      return null;
    }

    const removed = diff.removed[0];
    const added = diff.added[0];

    // Extract tags and content
    const removedMatch = removed.match(/^<(\w+)[^>]*>(.*)<\/\1>$/);
    const addedMatch = added.match(/^<(\w+)[^>]*>(.*)<\/\1>$/);

    if (!removedMatch || !addedMatch) {
      return null;
    }

    const [, removedTag, removedContent] = removedMatch;
    const [, addedTag, addedContent] = addedMatch;

    // Same tag, different content
    if (removedTag === addedTag && removedContent !== addedContent) {
      // Check if only text changed (no attributes)
      const removedAttrs = this.extractAttributes(removed);
      const addedAttrs = this.extractAttributes(added);

      if (JSON.stringify(removedAttrs) === JSON.stringify(addedAttrs)) {
        return {
          type: 'text-content',
          path: removedTag,
          oldValue: removedContent.trim(),
          newValue: addedContent.trim(),
          confidence: 0.99
        };
      }
    }

    return null;
  }

  /**
   * Detect className change
   * Example: className="btn" → className="btn btn-primary"
   */
  private detectClassChange(diff: DiffResult): TsxEditPattern | null {
    if (diff.removed.length !== 1 || diff.added.length !== 1) {
      return null;
    }

    const removed = diff.removed[0];
    const added = diff.added[0];

    // Extract className values
    const removedClassMatch = removed.match(/className=["']([^"']+)["']/);
    const addedClassMatch = added.match(/className=["']([^"']+)["']/);

    if (!removedClassMatch || !addedClassMatch) {
      return null;
    }

    const removedClasses = removedClassMatch[1].split(/\s+/);
    const addedClasses = addedClassMatch[1].split(/\s+/);

    // Check if rest of line is identical (except className)
    const withoutClass = (str: string) => str.replace(/className=["'][^"']*["']/, 'className="__PLACEHOLDER__"');

    if (withoutClass(removed) === withoutClass(added)) {
      return {
        type: 'class-name',
        oldClasses: removedClasses,
        newClasses: addedClasses,
        confidence: 0.98
      };
    }

    return null;
  }

  /**
   * Detect attribute change
   * Example: disabled="true" → disabled="false"
   */
  private detectAttributeChange(diff: DiffResult): TsxEditPattern | null {
    if (diff.removed.length !== 1 || diff.added.length !== 1) {
      return null;
    }

    const removed = diff.removed[0];
    const added = diff.added[0];

    const removedAttrs = this.extractAttributes(removed);
    const addedAttrs = this.extractAttributes(added);

    // Find which attribute changed
    const changedAttr = Object.keys(addedAttrs).find(
      key => removedAttrs[key] !== addedAttrs[key]
    );

    if (!changedAttr) {
      return null;
    }

    // Check if only one attribute changed
    const removedKeys = Object.keys(removedAttrs);
    const addedKeys = Object.keys(addedAttrs);

    if (removedKeys.length !== addedKeys.length) {
      return null;
    }

    const unchangedAttrs = removedKeys.filter(
      key => key !== changedAttr && removedAttrs[key] === addedAttrs[key]
    );

    if (unchangedAttrs.length === removedKeys.length - 1) {
      return {
        type: 'attribute',
        attribute: changedAttr,
        oldValue: removedAttrs[changedAttr],
        newValue: addedAttrs[changedAttr],
        confidence: 0.97
      };
    }

    return null;
  }

  /**
   * Detect inline style change
   * Example: style={{ color: 'red' }} → style={{ color: 'blue' }}
   */
  private detectStyleChange(diff: DiffResult): TsxEditPattern | null {
    if (diff.removed.length !== 1 || diff.added.length !== 1) {
      return null;
    }

    const removed = diff.removed[0];
    const added = diff.added[0];

    // Extract style attribute
    const removedStyleMatch = removed.match(/style=\{\{([^}]+)\}\}/);
    const addedStyleMatch = added.match(/style=\{\{([^}]+)\}\}/);

    if (!removedStyleMatch || !addedStyleMatch) {
      return null;
    }

    const removedStyles = this.parseInlineStyle(removedStyleMatch[1]);
    const addedStyles = this.parseInlineStyle(addedStyleMatch[1]);

    // Find which style property changed
    const changedProp = Object.keys(addedStyles).find(
      key => removedStyles[key] !== addedStyles[key]
    );

    if (!changedProp) {
      return null;
    }

    // Check if only one property changed
    if (Object.keys(removedStyles).length !== Object.keys(addedStyles).length) {
      return null;
    }

    const unchangedProps = Object.keys(removedStyles).filter(
      key => key !== changedProp && removedStyles[key] === addedStyles[key]
    );

    if (unchangedProps.length === Object.keys(removedStyles).length - 1) {
      return {
        type: 'inline-style',
        styleProperty: changedProp,
        oldValue: removedStyles[changedProp],
        newValue: addedStyles[changedProp],
        confidence: 0.96
      };
    }

    return null;
  }

  /**
   * Detect element added or removed
   * Example: Adding <div>New</div> to JSX
   */
  private detectElementChange(diff: DiffResult): TsxEditPattern | null {
    // Element added: New line appears
    if (diff.added.length === 1 && diff.removed.length === 0) {
      const added = diff.added[0];
      const elementMatch = added.match(/^<(\w+)/);

      if (elementMatch) {
        return {
          type: 'element-added',
          element: added,
          confidence: 0.90
        };
      }
    }

    // Element removed: Line disappears
    if (diff.removed.length === 1 && diff.added.length === 0) {
      const removed = diff.removed[0];
      const elementMatch = removed.match(/^<(\w+)/);

      if (elementMatch) {
        return {
          type: 'element-removed',
          element: removed,
          confidence: 0.90
        };
      }
    }

    return null;
  }

  /**
   * Extract attributes from JSX element
   */
  private extractAttributes(jsx: string): Record<string, string> {
    const attrs: Record<string, string> = {};

    // Match all attribute="value" or attribute='value' patterns
    const attrRegex = /(\w+)=["']([^"']+)["']/g;
    let match;

    while ((match = attrRegex.exec(jsx)) !== null) {
      attrs[match[1]] = match[2];
    }

    return attrs;
  }

  /**
   * Parse inline style object
   * Example: "color: 'red', fontSize: '16px'" → { color: 'red', fontSize: '16px' }
   */
  private parseInlineStyle(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {};

    // Split by comma
    const pairs = styleStr.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        // Remove quotes
        const cleanValue = value.replace(/['"]/g, '');
        styles[key] = cleanValue;
      }
    }

    return styles;
  }

  /**
   * Build cache key from pattern
   * Used to lookup pre-computed patches
   */
  buildCacheKey(componentId: string, pattern: TsxEditPattern): string {
    switch (pattern.type) {
      case 'text-content':
        return `${componentId}:text:${pattern.path}:${pattern.oldValue}→${pattern.newValue}`;

      case 'class-name':
        return `${componentId}:class:${pattern.oldClasses?.join(',')}→${pattern.newClasses?.join(',')}`;

      case 'attribute':
        return `${componentId}:attr:${pattern.attribute}:${pattern.oldValue}→${pattern.newValue}`;

      case 'inline-style':
        return `${componentId}:style:${pattern.styleProperty}:${pattern.oldValue}→${pattern.newValue}`;

      case 'element-added':
        return `${componentId}:add:${this.hashElement(pattern.element!)}`;

      case 'element-removed':
        return `${componentId}:remove:${this.hashElement(pattern.element!)}`;

      default:
        return `${componentId}:complex`;
    }
  }

  /**
   * Simple hash for element string
   */
  private hashElement(element: string): string {
    let hash = 0;
    for (let i = 0; i < element.length; i++) {
      const char = element.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
