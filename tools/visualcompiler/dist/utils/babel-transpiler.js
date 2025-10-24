/**
 * Babel Transpiler for Visual Compiler
 *
 * Transpiles TypeScript/JSX components to executable JavaScript
 * for dynamic import and rendering
 */
import * as babel from '@babel/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class BabelTranspiler {
    constructor() {
        this.babelOptions = {
            presets: [
                ['@babel/preset-env', {
                        targets: { node: 'current' },
                        modules: false
                    }],
                ['@babel/preset-react', {
                        runtime: 'automatic'
                    }],
                '@babel/preset-typescript'
            ],
            plugins: [],
            filename: 'component.tsx'
        };
    }
    /**
     * Transpile a TypeScript/JSX file to JavaScript
     */
    async transpileFile(options) {
        const { sourceFile, outputDir, enableLogging } = options;
        if (enableLogging) {
            console.log(`🔄 Transpiling: ${sourceFile}`);
        }
        // Read source file
        const sourceCode = await fs.readFile(sourceFile, 'utf-8');
        // Apply module import replacement for React shim
        const shimmedSource = this.replaceReactImports(sourceCode);
        // Transpile with Babel
        const result = await babel.transformAsync(shimmedSource, {
            ...this.babelOptions,
            filename: sourceFile
        });
        if (!result || !result.code) {
            throw new Error(`Failed to transpile ${sourceFile}`);
        }
        // Write to output directory if specified
        if (outputDir) {
            const outputFile = path.join(outputDir, path.basename(sourceFile).replace(/\.tsx?$/, '.js'));
            await fs.mkdir(outputDir, { recursive: true });
            await fs.writeFile(outputFile, result.code);
            if (enableLogging) {
                console.log(`✅ Transpiled to: ${outputFile}`);
            }
            return outputFile;
        }
        return result.code;
    }
    /**
     * Replace React imports with our shim
     */
    replaceReactImports(sourceCode) {
        // Replace React imports with our shim
        let shimmed = sourceCode;
        // Replace main React import
        shimmed = shimmed.replace(/import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]react['"];?/g, `import React from '${this.getShimPath('react-shim.js')}';`);
        // Replace named React imports
        shimmed = shimmed.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react['"];?/g, (match, imports) => {
            return `import { ${imports} } from '${this.getShimPath('react-shim.js')}';`;
        });
        // Replace useAuth hooks
        shimmed = shimmed.replace(/import\s+\{[^}]*useAuth[^}]*\}\s+from\s+['"][^'"]*['"];?/g, `import { useAuth } from '${this.getShimPath('react-shim.js')}';`);
        // Replace useTabNavigation hooks
        shimmed = shimmed.replace(/import\s+\{[^}]*useTabNavigation[^}]*\}\s+from\s+['"][^'"]*['"];?/g, `import { useTabNavigation } from '${this.getShimPath('react-shim.js')}';`);
        // Replace local component imports with absolute paths to FailSquare frontend
        const failsquareFrontendPath = path.resolve(__dirname, '../../../../failsquare-frontend/src').replace(/\\/g, '/');
        // Replace relative component imports
        shimmed = shimmed.replace(/import\s+([^}]+)\s+from\s+['"]\.\.\/components\/([^'"]+)['"];?/g, (match, imports, componentPath) => {
            // Add .tsx extension if not present
            const fullPath = componentPath.includes('.') ? componentPath : `${componentPath}.tsx`;
            const absolutePath = `${failsquareFrontendPath}/components/${fullPath}`;
            return `import ${imports} from 'file://${absolutePath}';`;
        });
        // Replace relative page imports
        shimmed = shimmed.replace(/import\s+([^}]+)\s+from\s+['"]\.\/([^'"]+)['"];?/g, (match, imports, pagePath) => {
            // Add .tsx extension if not present
            const fullPath = pagePath.includes('.') ? pagePath : `${pagePath}.tsx`;
            const absolutePath = `${failsquareFrontendPath}/pages/${fullPath}`;
            return `import ${imports} from 'file://${absolutePath}';`;
        });
        return shimmed;
    }
    /**
     * Get the path to our shim files
     */
    getShimPath(shimFile) {
        // Return relative path to the shim from the compiled output
        return path.resolve(__dirname, shimFile).replace(/\\/g, '/');
    }
    /**
     * Create a temporary transpiled version for dynamic import
     */
    async createTemporaryTranspiledFile(sourceFile) {
        const tempDir = path.join(__dirname, '../../temp-transpiled');
        const fileName = path.basename(sourceFile, path.extname(sourceFile)) + '.js';
        const tempFile = path.join(tempDir, fileName);
        // Ensure temp directory exists
        await fs.mkdir(tempDir, { recursive: true });
        // Transpile and write to temp file
        const transpiledCode = await this.transpileFile({
            sourceFile,
            enableLogging: true
        });
        await fs.writeFile(tempFile, transpiledCode);
        // Return as file URL for ES modules compatibility
        return `file://${tempFile.replace(/\\/g, '/')}`;
    }
    /**
     * Transpile the entire FailSquare frontend codebase
     */
    async transpileEntireCodebase() {
        const failsquareSrcDir = path.resolve(__dirname, '../../../failsquare-frontend/src');
        const outputDir = path.join(__dirname, '../../transpiled-failsquare');
        console.log(`🔄 Transpiling entire FailSquare codebase from: ${failsquareSrcDir}`);
        console.log(`📁 Output directory: ${outputDir}`);
        // Clean output directory
        try {
            await fs.rm(outputDir, { recursive: true, force: true });
        }
        catch (error) {
            // Directory might not exist
        }
        await fs.mkdir(outputDir, { recursive: true });
        // Get all TypeScript/JSX files
        const files = await this.getAllTSXFiles(failsquareSrcDir);
        console.log(`📋 Found ${files.length} TypeScript/JSX files to transpile`);
        // Transpile each file
        for (const file of files) {
            try {
                console.log(`🔄 Transpiling: ${path.relative(failsquareSrcDir, file)}`);
                const sourceCode = await fs.readFile(file, 'utf-8');
                // Apply React shim replacements and fix imports
                const shimmedSource = this.replaceImportsForCodebase(sourceCode, file, failsquareSrcDir);
                // Transpile with Babel
                const result = await babel.transformAsync(shimmedSource, {
                    ...this.babelOptions,
                    filename: file
                });
                if (!result || !result.code) {
                    console.warn(`⚠️ Failed to transpile ${file}, skipping`);
                    continue;
                }
                // Write to output directory preserving structure
                const relativePath = path.relative(failsquareSrcDir, file);
                const outputFile = path.join(outputDir, relativePath).replace(/\.tsx?$/, '.js');
                const outputFileDir = path.dirname(outputFile);
                await fs.mkdir(outputFileDir, { recursive: true });
                await fs.writeFile(outputFile, result.code);
                console.log(`✅ Transpiled: ${relativePath}`);
            }
            catch (error) {
                console.warn(`⚠️ Error transpiling ${file}:`, error instanceof Error ? error.message : String(error));
                // Continue with other files
            }
        }
        console.log(`🎉 Transpilation complete! Output in: ${outputDir}`);
        return outputDir;
    }
    /**
     * Get all TypeScript/JSX files recursively
     */
    async getAllTSXFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules, dist, and other build directories
                    if (!entry.name.includes('node_modules') &&
                        !entry.name.includes('dist') &&
                        !entry.name.includes('.git') &&
                        !entry.name.includes('coverage')) {
                        files.push(...await this.getAllTSXFiles(fullPath));
                    }
                }
                else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
                    // Include TypeScript and JSX files
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            console.warn(`Warning: Could not read directory ${dir}:`, error instanceof Error ? error.message : String(error));
        }
        return files;
    }
    /**
     * Replace imports for entire codebase transpilation
     */
    replaceImportsForCodebase(sourceCode, currentFile, baseDir) {
        let shimmed = sourceCode;
        // Replace React imports with our shim
        shimmed = shimmed.replace(/import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]react['"];?/g, `import React from '${this.getShimPath('react-shim.js')}';`);
        shimmed = shimmed.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react['"];?/g, (match, imports) => {
            return `import { ${imports} } from '${this.getShimPath('react-shim.js')}';`;
        });
        // Replace custom hooks with shim
        shimmed = shimmed.replace(/import\s+\{[^}]*useAuth[^}]*\}\s+from\s+['"][^'"]*['"];?/g, `import { useAuth } from '${this.getShimPath('react-shim.js')}';`);
        shimmed = shimmed.replace(/import\s+\{[^}]*useTabNavigation[^}]*\}\s+from\s+['"][^'"]*['"];?/g, `import { useTabNavigation } from '${this.getShimPath('react-shim.js')}';`);
        // Replace relative imports with absolute paths to maintain structure
        const currentDir = path.dirname(currentFile);
        // Replace relative imports (./something or ../something)
        shimmed = shimmed.replace(/import\s+([^}]+)\s+from\s+['"](\.[^'"]+)['"];?/g, (match, imports, relativePath) => {
            // Resolve the relative path to absolute
            const resolvedPath = path.resolve(currentDir, relativePath);
            // Add .js extension if no extension present
            let finalPath = resolvedPath;
            if (!path.extname(finalPath)) {
                finalPath += '.js';
            }
            else if (finalPath.endsWith('.tsx') || finalPath.endsWith('.ts')) {
                finalPath = finalPath.replace(/\.tsx?$/, '.js');
            }
            // Convert to file URL for ES modules
            return `import ${imports} from 'file://${finalPath.replace(/\\/g, '/')}';`;
        });
        // Replace absolute imports from src (like 'components/Button')
        shimmed = shimmed.replace(/import\s+([^}]+)\s+from\s+['"]([^'"./][^'"]+)['"];?/g, (match, imports, modulePath) => {
            // Check if it's a local module (not npm package)
            if (!modulePath.includes('antd') &&
                !modulePath.includes('react') &&
                !modulePath.includes('@ant-design') &&
                !modulePath.includes('date-fns') &&
                !modulePath.includes('axios')) {
                const absolutePath = path.resolve(baseDir, modulePath);
                let finalPath = absolutePath;
                if (!path.extname(finalPath)) {
                    finalPath += '.js';
                }
                else if (finalPath.endsWith('.tsx') || finalPath.endsWith('.ts')) {
                    finalPath = finalPath.replace(/\.tsx?$/, '.js');
                }
                return `import ${imports} from 'file://${finalPath.replace(/\\/g, '/')}';`;
            }
            // Keep npm package imports as-is
            return match;
        });
        return shimmed;
    }
    /**
     * Clean up temporary files
     */
    async cleanupTempFiles() {
        const tempDir = path.join(__dirname, '../../temp-transpiled');
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore errors if directory doesn't exist
        }
    }
}
// Export singleton instance
export const babelTranspiler = new BabelTranspiler();
