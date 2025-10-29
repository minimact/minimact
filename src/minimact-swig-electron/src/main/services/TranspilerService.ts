import * as babel from '@babel/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TranspileResult, TranspileProjectResult } from '../types/project';

/**
 * TranspilerService - Transpiles TSX to C# using babel-plugin-minimact
 *
 * Responsibilities:
 * - Transpile single TSX files to C#
 * - Transpile entire projects
 * - Track errors and duration
 */
export class TranspilerService {
  private babelPluginPath: string;

  constructor(babelPluginPath?: string) {
    // Default to babel-plugin-minimact in parent directory
    this.babelPluginPath = babelPluginPath || path.join(
      __dirname,
      '../../../../../babel-plugin-minimact'
    );
  }

  /**
   * Transpile a single TSX file to C#
   */
  async transpileFile(tsxPath: string): Promise<TranspileResult> {
    const startTime = Date.now();

    try {
      // Read TSX file
      const tsxContent = await fs.readFile(tsxPath, 'utf-8');

      // Determine output path (.tsx -> .cs)
      const outputPath = tsxPath.replace(/\.tsx$/, '.cs');

      // Transpile using babel
      const result = await babel.transformAsync(tsxContent, this.getBabelConfig());

      if (!result || !result.code) {
        throw new Error('Transpilation produced no output');
      }

      // Write C# output
      await fs.writeFile(outputPath, result.code, 'utf-8');

      const duration = Date.now() - startTime;

      return {
        success: true,
        outputPath,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * Transpile all TSX files in a project
   */
  async transpileProject(projectPath: string): Promise<TranspileProjectResult> {
    const startTime = Date.now();

    const errors: Array<{ file: string; error: string }> = [];
    let filesTranspiled = 0;

    async function transpileDirectory(dir: string, service: TranspilerService) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, bin, obj, .git
        if (entry.isDirectory()) {
          if (!['node_modules', 'bin', 'obj', '.git', 'dist', 'out'].includes(entry.name)) {
            await transpileDirectory(fullPath, service);
          }
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
          const result = await service.transpileFile(fullPath);

          if (result.success) {
            filesTranspiled++;
          } else {
            errors.push({
              file: fullPath,
              error: result.error || 'Unknown error'
            });
          }
        }
      }
    }

    await transpileDirectory(projectPath, this);

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      filesTranspiled,
      errors,
      duration
    };
  }

  /**
   * Get Babel configuration for transpilation
   */
  private getBabelConfig(): babel.TransformOptions {
    return {
      filename: 'component.tsx',
      presets: [
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ],
      plugins: [
        [this.babelPluginPath, {
          target: 'csharp',
          framework: 'minimact'
        }]
      ]
    };
  }
}
