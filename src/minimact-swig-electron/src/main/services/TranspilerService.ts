import * as babel from '@babel/core';
import { parse } from '@babel/parser';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { TranspileResult, TranspileProjectResult } from '../types/project';

const execAsync = promisify(exec);

/**
 * Extended metadata interface that includes our custom minimactJson property
 */
interface MinimactBabelFileMetadata extends babel.BabelFileMetadata {
  minimactJson?: string;
}

/**
 * TranspilerService - Transpiles TSX to JSON using minimact-transpiler-babel
 *
 * Responsibilities:
 * - Transpile single TSX files to JSON (for runtime component loading)
 * - Transpile entire projects
 * - Track errors and duration
 *
 * Architecture:
 * TSX → Babel (minimact-transpiler-babel) → JSON → ASP.NET Runtime (ComponentLoader) → Roslyn → Component
 */
export class TranspilerService {
  private babelPluginPath: string;

  constructor(babelPluginPath?: string) {
    // Default to new transpiler-babel from mact_modules
    // From dist/main -> ../../mact_modules/@minimact/transpiler-babel
    this.babelPluginPath = babelPluginPath || path.join(
      __dirname,
      '../../mact_modules/@minimact/transpiler-babel/src/index.js'
    );
  }

  /**
   * Transpile a single TSX file to JSON
   */
  async transpileFile(tsxPath: string): Promise<TranspileResult> {
    const startTime = Date.now();

    try {
      // Read TSX file
      const tsxContent = await fs.readFile(tsxPath, 'utf-8');

      // Determine output path (.tsx -> .json)
      const outputPath = tsxPath.replace(/\.tsx$/, '.json');

      // Log for debugging
      console.log('[Transpiler] Transpiling:', tsxPath);
      console.log('[Transpiler] Output:', outputPath);
      console.log('[Transpiler] Plugin path:', this.babelPluginPath);

      // ⚠️ CRITICAL: Parse file first to preserve TypeScript AST
      // @babel/preset-typescript strips interface declarations, but our plugin needs them.
      // Solution: Use @babel/parser directly to get full TS AST, then transform.
      const ast = parse(tsxContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        sourceFilename: tsxPath
      });

      // Debug: Log what's in the AST
      console.log('[Transpiler] AST has', ast.program.body.length, 'statements');
      ast.program.body.forEach((stmt, idx) => {
        console.log(`[Transpiler] AST Statement ${idx}:`, stmt.type);
        if (stmt.type === 'TSInterfaceDeclaration') {
          console.log(`[Transpiler]   → Interface name: ${stmt.id.name}`);
        }
      });

      //⚠️ SOLUTION: Store interface info in AST metadata BEFORE transformation
      // The @babel/preset-typescript will strip interfaces during transformation,
      // but our plugin can access this metadata!
      const program = ast.program as any;
      if (!program.metadata) {
        program.metadata = {};
      }

      const interfaces = program.body.filter((stmt: any) => stmt.type === 'TSInterfaceDeclaration');
      program.metadata.viewModelInterfaces = interfaces;

      console.log('[Transpiler] Stored', interfaces.length, 'interfaces in AST metadata');

      // Now transform with the parsed AST
      // IMPORTANT: We don't use @babel/preset-react because it transforms JSX to _jsx() calls
      // Our plugin needs to see the raw JSX structure, not the transformed output
      const result = await babel.transformFromAstAsync(ast, tsxContent, {
        filename: tsxPath,
        // Only run our plugin - no React or TypeScript transforms
        plugins: [
          [this.babelPluginPath, {
            outputDir: path.dirname(outputPath),
            hexGap: 0x10000000
          }]
        ],
        // Don't transform JSX or TypeScript - we just want to analyze the structure
        presets: []
      });

      if (!result) {
        throw new Error('Transpilation produced no output');
      }

      // Debug: Log what metadata we got
      console.log('[Transpiler] Result metadata keys:', result.metadata ? Object.keys(result.metadata) : 'none');
      console.log('[Transpiler] minimactJson present?', !!(result.metadata as any)?.minimactJson);

      // Extract JSON from metadata (babel plugin stores it there)
      const jsonOutput = (result.metadata as MinimactBabelFileMetadata | undefined)?.minimactJson;

      if (!jsonOutput) {
        console.error('[Transpiler] Full metadata:', JSON.stringify(result.metadata, null, 2));
        throw new Error('Transpilation did not generate JSON output. Check if the file contains valid Minimact components.');
      }

      // Write JSON output
      await fs.writeFile(outputPath, jsonOutput, 'utf-8');

      const duration = Date.now() - startTime;

      return {
        success: true,
        outputPath,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[Transpiler] Error transpiling:', tsxPath);
      console.error('[Transpiler] Error details:', error);

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

    // Generate Tailwind CSS if configured
    await this.generateTailwindCss(projectPath);

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      filesTranspiled,
      errors,
      duration
    };
  }

  /**
   * Generate Tailwind CSS for a project
   * Scans TSX files for Tailwind classes and generates purged/minified CSS
   */
  async generateTailwindCss(projectPath: string): Promise<{ success: boolean; outputPath?: string; error?: string; duration: number }> {
    const startTime = Date.now();

    try {
      const tailwindConfigPath = path.join(projectPath, 'tailwind.config.js');
      const inputCssPath = path.join(projectPath, 'src/styles/tailwind.css');
      const outputCssPath = path.join(projectPath, 'wwwroot/css/tailwind.css');

      // Check if Tailwind is configured
      const configExists = await fs.access(tailwindConfigPath).then(() => true).catch(() => false);
      if (!configExists) {
        console.log('[Tailwind] No tailwind.config.js found, skipping CSS generation');
        return {
          success: true,
          duration: Date.now() - startTime
        };
      }

      // Check if input CSS exists
      const inputExists = await fs.access(inputCssPath).then(() => true).catch(() => false);
      if (!inputExists) {
        console.log('[Tailwind] No src/styles/tailwind.css found, skipping CSS generation');
        return {
          success: true,
          duration: Date.now() - startTime
        };
      }

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputCssPath), { recursive: true });

      console.log('[Tailwind] Generating CSS...');

      // Run Tailwind CLI
      const { stderr } = await execAsync(
        `npx tailwindcss -i "${inputCssPath}" -o "${outputCssPath}" --minify`,
        { cwd: projectPath }
      );

      if (stderr && !stderr.includes('Done in')) {
        console.warn('[Tailwind] Warnings:', stderr);
      }

      // Get file size
      const stats = await fs.stat(outputCssPath);
      const fileSizeKB = (stats.size / 1024).toFixed(1);

      console.log(`[Tailwind] ✓ Generated CSS: ${outputCssPath} (${fileSizeKB} KB)`);

      const duration = Date.now() - startTime;

      return {
        success: true,
        outputPath: outputCssPath,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[Tailwind] Error generating CSS:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }
}
