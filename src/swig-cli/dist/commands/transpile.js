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
exports.transpileCommand = transpileCommand;
const path = __importStar(require("path"));
const swig_shared_1 = require("@minimact/swig-shared");
/**
 * Transpile command - Transpile TSX files to C#
 */
async function transpileCommand(files, options) {
    const projectPath = options.project || process.cwd();
    console.log(`🔄 Transpiling TSX files...`);
    console.log(`   Project: ${projectPath}`);
    try {
        const transpiler = new swig_shared_1.TranspilerService();
        if (files.length === 0) {
            // Transpile entire project
            console.log('   Mode: Full project transpilation');
            const result = await transpiler.transpileProject(projectPath);
            if (result.success) {
                console.log(`✅ Transpiled ${result.filesTranspiled} files in ${result.duration}ms`);
            }
            else {
                console.error(`❌ Transpilation failed with ${result.errors.length} errors:`);
                result.errors.forEach(({ file, error }) => {
                    console.error(`   ${file}: ${error}`);
                });
                process.exit(1);
            }
        }
        else {
            // Transpile specific files
            console.log(`   Mode: Transpiling ${files.length} file(s)`);
            let successCount = 0;
            let errorCount = 0;
            for (const file of files) {
                const filePath = path.isAbsolute(file) ? file : path.join(projectPath, file);
                console.log(`   Transpiling: ${file}`);
                const result = await transpiler.transpileFile(filePath);
                if (result.success) {
                    console.log(`   ✅ ${file} → ${path.basename(result.outputPath)} (${result.duration}ms)`);
                    successCount++;
                }
                else {
                    console.error(`   ❌ ${file}: ${result.error}`);
                    errorCount++;
                }
            }
            console.log('');
            console.log(`✅ Transpiled ${successCount} file(s), ${errorCount} error(s)`);
            if (errorCount > 0) {
                process.exit(1);
            }
        }
    }
    catch (error) {
        console.error('❌ Transpilation failed:', error);
        throw error;
    }
}
