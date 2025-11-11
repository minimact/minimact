"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranspilerService = void 0;
const babel = __importStar(require("@babel/core"));
const parser_1 = require("@babel/parser");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * TranspilerService - Transpiles TSX to C# using babel-plugin-minimact
 *
 * Responsibilities:
 * - Transpile single TSX files to C#
 * - Transpile entire projects
 * - Track errors and duration
 */
class TranspilerService {
    constructor(babelPluginPath) {
        // Default to synced babel-plugin from mact_modules
        // From dist/main -> ../../mact_modules/@minimact/babel-plugin
        this.babelPluginPath = babelPluginPath || path.join(__dirname, '../../mact_modules/@minimact/babel-plugin/index.cjs');
    }
    /**
     * Transpile a single TSX file to C#
     */
    async transpileFile(tsxPath) {
        const startTime = Date.now();
        try {
            // Read TSX file
            const tsxContent = await fs.readFile(tsxPath, 'utf-8');
            // Determine output path (.tsx -> .cs)
            const outputPath = tsxPath.replace(/\.tsx$/, '.cs');
            // Log for debugging
            console.log('[Transpiler] Transpiling:', tsxPath);
            console.log('[Transpiler] Plugin path:', this.babelPluginPath);
            // ⚠️ CRITICAL: Parse file first to preserve TypeScript AST
            // @babel/preset-typescript strips interface declarations, but our plugin needs them.
            // Solution: Use @babel/parser directly to get full TS AST, then transform.
            const ast = (0, parser_1.parse)(tsxContent, {
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
            const program = ast.program;
            if (!program.metadata) {
                program.metadata = {};
            }
            const interfaces = program.body.filter((stmt) => stmt.type === 'TSInterfaceDeclaration');
            program.metadata.viewModelInterfaces = interfaces;
            console.log('[Transpiler] Stored', interfaces.length, 'interfaces in AST metadata');
            // Now transform with the parsed AST
            const result = await babel.transformFromAstAsync(ast, tsxContent, {
                filename: tsxPath,
                // Plugins run in order, BEFORE presets
                plugins: [
                    // Our plugin runs FIRST - can read metadata!
                    [this.babelPluginPath, {
                            target: 'csharp',
                            framework: 'minimact'
                        }]
                ],
                // Presets run AFTER plugins (and in reverse order)
                // NOTE: NO React preset - we handle JSX ourselves and generate C# code!
                presets: [
                    '@babel/preset-typescript'
                ]
            });
            if (!result) {
                throw new Error('Transpilation produced no output');
            }
            // Extract C# code from metadata (babel plugin stores it there)
            const csharpCode = result.metadata?.minimactCSharp;
            if (!csharpCode) {
                throw new Error('Transpilation did not generate C# code. Check if the file contains valid Minimact components.');
            }
            // NOTE: C# file is now written directly by Babel plugin (index-full.cjs)
            // This ensures proper ordering: C# file BEFORE structural-changes.json
            // Removed: await fs.writeFile(outputPath, csharpCode, 'utf-8');
            // Check if .tsx.keys file was generated by Babel plugin
            const keysFilePath = tsxPath + '.keys';
            try {
                const keysFileExists = await fs.access(keysFilePath).then(() => true).catch(() => false);
                if (keysFileExists) {
                    // Read keys file
                    const keysContent = await fs.readFile(keysFilePath, 'utf-8');
                    // Replace original TSX with keys version
                    // This ensures keys persist in source for structural change detection
                    await fs.writeFile(tsxPath, keysContent, 'utf-8');
                    console.log('[Transpiler] ✅ Replaced TSX with keys version');
                }
            }
            catch (keysError) {
                // Non-fatal error - keys replacement is optional
                console.warn('[Transpiler] Failed to replace TSX with keys:', keysError);
            }
            const duration = Date.now() - startTime;
            return {
                success: true,
                outputPath,
                duration
            };
        }
        catch (error) {
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
    async transpileProject(projectPath) {
        const startTime = Date.now();
        const errors = [];
        let filesTranspiled = 0;
        async function transpileDirectory(dir, service) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                // Skip node_modules, bin, obj, .git
                if (entry.isDirectory()) {
                    if (!['node_modules', 'bin', 'obj', '.git', 'dist', 'out'].includes(entry.name)) {
                        await transpileDirectory(fullPath, service);
                    }
                }
                else if (entry.isFile() && entry.name.endsWith('.tsx')) {
                    const result = await service.transpileFile(fullPath);
                    if (result.success) {
                        filesTranspiled++;
                    }
                    else {
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
    async generateTailwindCss(projectPath) {
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
            const { stderr } = await execAsync(`npx tailwindcss -i "${inputCssPath}" -o "${outputCssPath}" --minify`, { cwd: projectPath });
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
        }
        catch (error) {
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
exports.TranspilerService = TranspilerService;
