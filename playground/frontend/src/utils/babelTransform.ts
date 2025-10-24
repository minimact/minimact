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
    const global = window as any;

    // Make Babel available globally BEFORE loading the plugin
    // The plugin's IIFE will access window.Babel to set up __BABEL_TYPES__ and __BABEL_CORE__
    const tempBabel = global.Babel;
    const tempPlugin = global.MinimactBabelPlugin;

    global.Babel = Babel;

    console.log('Setting up window.Babel before plugin load:', global.Babel);
    console.log('window.Babel.types:', global.Babel?.types);
    console.log('window.Babel keys:', Object.keys(global.Babel || {}));
    console.log('Checking for types in packages:', global.Babel?.packages?.types);

    try {
      // Load the plugin script - it's now an IIFE that will:
      // 1. Set up globalThis.__BABEL_TYPES__ from window.Babel.types
      // 2. Set up globalThis.__BABEL_CORE__ from window.Babel
      // 3. Define window.MinimactBabelPlugin
      const response = await fetch('/babel-plugin/minimact-babel-plugin.js');
      if (!response.ok) {
        throw new Error(`Failed to load plugin: ${response.statusText}`);
      }

      const pluginCode = await response.text();

      // Execute the IIFE bundle
      const script = document.createElement('script');
      script.textContent = pluginCode;
      document.head.appendChild(script);
      document.head.removeChild(script);

      console.log('After plugin load - globalThis.__BABEL_TYPES__:', (globalThis as any).__BABEL_TYPES__);
      console.log('After plugin load - globalThis.__BABEL_CORE__:', (globalThis as any).__BABEL_CORE__);

      // Get the plugin from the global
      cachedPlugin = global.MinimactBabelPlugin;

      console.log('Plugin loaded successfully:', cachedPlugin);
    } finally {
      // Restore previous values (but keep the globals available for the plugin to use)
      // Don't try to delete properties that may be non-configurable
      if (tempBabel !== undefined) {
        global.Babel = tempBabel;
      }

      // Keep MinimactBabelPlugin on window - it's harmless and the plugin is cached anyway
    }

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
      console.error('Transformation completed but no C# code generated');
      console.error('Metadata:', result.metadata);
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
    console.error('Full error:', error);

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
