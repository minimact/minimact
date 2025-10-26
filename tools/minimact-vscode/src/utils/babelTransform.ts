import * as path from 'path';

/**
 * Transform TSX code to C# using the Minimact Babel plugin
 */
export async function transformTsxToCSharp(tsxCode: string, filename: string = 'Component.tsx'): Promise<string | null> {
  try {
    // Dynamically import @babel/core (it's a dev dependency in the babel plugin)
    const babelCore = await import('@babel/core');

    // Find the babel plugin - it should be in the project's node_modules or as a sibling
    const projectRoot = findProjectRoot();
    const pluginPath = projectRoot
      ? path.join(projectRoot, 'src', 'babel-plugin-minimact', 'index-full.cjs')
      : null;

    if (!pluginPath) {
      console.error('[Minimact] Could not find babel-plugin-minimact');
      return null;
    }

    // Transform the code
    const result = await babelCore.transformAsync(tsxCode, {
      filename,
      presets: [
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        '@babel/preset-react'
      ],
      plugins: [
        pluginPath
      ]
    });

    // The C# code is stored in metadata
    if (result?.metadata && (result.metadata as any).minimactCSharp) {
      return (result.metadata as any).minimactCSharp;
    }

    console.warn('[Minimact] No C# output generated');
    return null;

  } catch (error) {
    console.error('[Minimact] Babel transformation failed:', error);
    return null;
  }
}

/**
 * Find the project root by looking for package.json with minimact dependencies
 */
function findProjectRoot(): string | null {
  const fs = require('fs');
  const currentDir = process.cwd();

  // Try current directory and parent directories
  let dir = currentDir;
  for (let i = 0; i < 5; i++) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        // Check if this looks like a Minimact project
        if (packageJson.dependencies?.minimact ||
            packageJson.devDependencies?.minimact ||
            packageJson.name === 'minimact') {
          return dir;
        }
      } catch (e) {
        // Continue searching
      }
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) break; // Reached root
    dir = parentDir;
  }

  return null;
}

/**
 * Check if Babel plugin is available
 */
export async function isBabelPluginAvailable(): Promise<boolean> {
  try {
    const projectRoot = findProjectRoot();
    if (!projectRoot) return false;

    const fs = require('fs');
    const pluginPath = path.join(projectRoot, 'src', 'babel-plugin-minimact', 'index-full.cjs');

    return fs.existsSync(pluginPath);
  } catch {
    return false;
  }
}
