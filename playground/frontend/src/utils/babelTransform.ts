/**
 * Babel Transform Utility
 * Transforms TSX/JSX code to C# using the Minimact Babel plugin
 *
 * This runs the transformation client-side using:
 * 1. @babel/standalone for core Babel functionality
 * 2. The bundled minimact-babel-plugin
 */

import * as Babel from '@babel/standalone';

export interface BabelTransformResult {
  csharpCode: string;
  error?: string;
  warnings?: string[];
}

// Cache for the loaded plugin
let cachedPlugin: any = null;

/**
 * Load the Babel plugin (from CDN or bundled)
 */
async function loadBabelPlugin(): Promise<any> {
  if (cachedPlugin) {
    return cachedPlugin;
  }

  try {
    // Try to load from dist folder (built from rollup)
    const response = await fetch('/babel-plugin/minimact-babel-plugin.js');
    if (!response.ok) {
      throw new Error(`Failed to load plugin: ${response.statusText}`);
    }

    const pluginCode = await response.text();

    // Execute the UMD module in a new context to get the plugin function
    // eslint-disable-next-line no-eval
    const moduleObj: any = {};
    const moduleExports: any = {};
    const require = (id: string) => {
      if (id === '@babel/types') return (Babel as any).types;
      if (id === '@babel/core') return Babel;
      throw new Error(`Unknown module: ${id}`);
    };

    // Execute the plugin code
    const code = `
      (function(module, exports, require) {
        ${pluginCode}
      })(moduleObj, moduleExports, require);
    `;

    // Create a function from the code to execute it
    const fn = new Function('moduleObj', 'moduleExports', 'require', 'Babel', code);
    fn(moduleObj, moduleExports, require, Babel);

    // The plugin is the default export
    cachedPlugin = moduleExports.default || moduleExports;

    return cachedPlugin;
  } catch (error) {
    console.error('Failed to load Babel plugin:', error);
    throw new Error(
      `Could not load Babel plugin. Make sure the plugin is built and available. Error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Transform TSX/JSX code to C# using the Babel plugin
 */
export async function transformTsxToCSharp(tsxCode: string): Promise<BabelTransformResult> {
  try {
    // Load the plugin
    const plugin = await loadBabelPlugin();

    if (!plugin) {
      return {
        csharpCode: '',
        error: 'Babel plugin failed to load'
      };
    }

    // Configure Babel with our plugin
    const babelConfig = {
      plugins: [plugin],
      parserOpts: {
        sourceType: 'module' as const,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy'
        ]
      }
    };

    // Transform the code
    const result = (Babel as any).transform(tsxCode, babelConfig);

    if (!result || !result.metadata) {
      return {
        csharpCode: '',
        error: 'Babel plugin did not generate metadata'
      };
    }

    const csharpCode = result.metadata.minimactCSharp;

    if (!csharpCode) {
      return {
        csharpCode: '',
        error: 'Babel plugin did not generate C# code'
      };
    }

    return {
      csharpCode
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('TSX to C# transformation failed:', errorMessage);

    return {
      csharpCode: '',
      error: `Transformation failed: ${errorMessage}`
    };
  }
}

/**
 * Reset the cached plugin (useful for testing)
 */
export function resetBabelPlugin(): void {
  cachedPlugin = null;
}
