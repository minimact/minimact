/**
 * Local TSX Loader
 *
 * Loads and compiles local .tsx files using Babel + babel-plugin-minimact
 * Uses the REAL babel plugin from ../../src/babel-plugin-minimact
 */

import { transformSync } from '@babel/core';
import { invoke } from '@tauri-apps/api/core';
import * as fs from 'fs';
import * as path from 'path';

export interface CompilationResult {
  csharp: string;              // Generated C# code
  templates: TemplateMetadata; // Prediction templates
  keys: Record<string, string>; // Hex keys map
  source: string;              // Original TSX source
}

export interface TemplateMetadata {
  templates: Record<string, Template>;
  pathVariants?: Record<string, number[]>;
  events?: Record<string, EventHandler>;
}

export interface Template {
  template: string;
  binding?: string;
  bindings?: string[];
  hexPath?: string;
  type: 'text' | 'attribute' | 'conditional' | 'loop';
  slots?: number[];
  conditionalTemplates?: Record<string, string>;
}

export interface EventHandler {
  type: string;
  path: string;
  action: string;
  stateKey?: string;
}

/**
 * Compile a local TSX file to C# + templates
 */
export async function compileLocalTsx(filePath: string): Promise<CompilationResult> {
  try {
    // 1. Read the TSX file
    const source = await invoke<string>('read_local_file', { path: filePath });

    console.log(`[LocalLoader] Loaded ${filePath} (${source.length} bytes)`);

    // 2. Compile using real Babel plugin
    const result = await compileTsxSource(source, filePath);

    return result;
  } catch (error) {
    console.error('[LocalLoader] Compilation failed:', error);
    throw new Error(`Failed to compile ${filePath}: ${error}`);
  }
}

/**
 * Compile TSX source code using Babel + babel-plugin-minimact
 */
export async function compileTsxSource(
  source: string,
  filename: string
): Promise<CompilationResult> {
  try {
    console.log('[LocalLoader] Compiling with babel-plugin-minimact...');

    // Path to the actual babel plugin
    const pluginPath = path.resolve(__dirname, '../../../src/babel-plugin-minimact/index.cjs');

    // Transform using Babel
    const result = transformSync(source, {
      filename,
      presets: [
        '@babel/preset-typescript',
        '@babel/preset-react'
      ],
      plugins: [
        [pluginPath, {
          generateKeys: true,
          extractTemplates: true,
          outputPath: path.dirname(filename)
        }]
      ]
    });

    if (!result) {
      throw new Error('Babel transformation returned null');
    }

    // Read generated files
    const basePath = filename.replace(/\.tsx?$/, '');
    const csharpPath = `${basePath}.cs`;
    const templatesPath = `${basePath}.templates.json`;
    const keysPath = `${basePath}.tsx.keys`;

    console.log('[LocalLoader] Reading generated files...');
    console.log('  - C#:', csharpPath);
    console.log('  - Templates:', templatesPath);
    console.log('  - Keys:', keysPath);

    // Read C# file
    const csharp = fs.existsSync(csharpPath)
      ? fs.readFileSync(csharpPath, 'utf-8')
      : '';

    // Read templates
    const templates = fs.existsSync(templatesPath)
      ? JSON.parse(fs.readFileSync(templatesPath, 'utf-8'))
      : { templates: {} };

    // Read keys
    const keys = fs.existsSync(keysPath)
      ? JSON.parse(fs.readFileSync(keysPath, 'utf-8'))
      : {};

    console.log('[LocalLoader] Compilation complete!');
    console.log('  - C# code:', csharp.length, 'bytes');
    console.log('  - Templates:', Object.keys(templates.templates || {}).length);
    console.log('  - Keys:', Object.keys(keys).length);

    return {
      source,
      csharp,
      templates,
      keys
    };
  } catch (error) {
    console.error('[LocalLoader] Transform failed:', error);
    throw error;
  }
}

/**
 * Clean up generated files
 */
export async function cleanupGeneratedFiles(tsxPath: string): Promise<void> {
  const basePath = tsxPath.replace(/\.tsx?$/, '');
  const filesToDelete = [
    `${basePath}.cs`,
    `${basePath}.templates.json`,
    `${basePath}.tsx.keys`,
    `${basePath}.structural-changes.json`
  ];

  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`[LocalLoader] Deleted ${file}`);
    }
  }
}
