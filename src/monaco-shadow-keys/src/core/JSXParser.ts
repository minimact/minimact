/**
 * JSX Parser
 *
 * Delegates to babel-plugin-minimact for JSX parsing
 * Extracts tag information from already-assigned hex paths
 */

import { JSXTagInfo } from './types';

export class JSXParser {
  /**
   * Parse source code and extract all JSX tags
   *
   * NOTE: This will invoke babel-plugin-minimact which assigns __minimactPath to nodes
   * We extract those paths + position info to build the shadow key map
   */
  static async parseJSX(sourceCode: string, filename: string = 'unknown.tsx'): Promise<JSXTagInfo[]> {
    const tags: JSXTagInfo[] = [];

    try {
      // Import Babel dynamically (shared with babel-plugin-minimact)
      const babel = await import('@babel/core');

      // Transform using babel-plugin-minimact
      // This assigns __minimactPath to all JSX nodes
      const result = babel.transformSync(sourceCode, {
        filename,
        presets: ['@babel/preset-typescript', '@babel/preset-react'],
        plugins: [
          // Path to our existing babel plugin
          '../../babel-plugin-minimact/index.cjs'
        ],
        parserOpts: {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        }
      });

      // NOTE: The babel plugin has already assigned paths during traversal
      // We need to extract that information from the AST nodes

      // For now, we'll do a second pass to extract the info
      // TODO: Modify babel-plugin-minimact to export tag info directly
      const ast = babel.parseSync(sourceCode, {
        filename,
        presets: ['@babel/preset-typescript'],
        parserOpts: {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        }
      });

      if (!ast) return tags;

      const traverse = await import('@babel/traverse');
      const t = await import('@babel/types');

      // Extract tags with positions
      traverse.default(ast, {
        JSXElement(path: any) {
          const node = path.node;
          const openingElement = node.openingElement;

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          const tagName = openingElement.name.name;
          const attributes = openingElement.attributes
            .filter((attr: any) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name))
            .map((attr: any) => attr.name.name);

          const loc = openingElement.loc;
          if (!loc) return;

          // Use the __minimactPath assigned by babel plugin if available
          const hexPath = (node as any).__minimactPath || '';
          const parentPath = hexPath.split('.').slice(0, -1).join('.') || '';

          tags.push({
            name: tagName,
            attributes,
            line: loc.start.line,
            column: loc.start.column + 1,
            parentPath,
            siblingIndex: 0 // Will be recalculated in ShadowKeyMap
          });
        }
      });
    } catch (error) {
      console.error('[JSXParser] Failed to parse JSX:', error);
    }

    return tags;
  }
}
