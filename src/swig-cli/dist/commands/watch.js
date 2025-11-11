"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchCommand = watchCommand;
const swig_shared_1 = require("@minimact/swig-shared");
/**
 * Watch command - Watch for TSX changes and auto-transpile
 */
async function watchCommand(options) {
    const projectPath = options.project || process.cwd();
    console.log('👀 Watching for TSX file changes...');
    console.log(`   Project: ${projectPath}`);
    console.log('   Press Ctrl+C to stop');
    console.log('');
    const transpiler = new swig_shared_1.TranspilerService();
    const watcher = new swig_shared_1.FileWatcher();
    // Initial transpilation
    console.log('🔄 Running initial transpilation...');
    const initialResult = await transpiler.transpileProject(projectPath);
    if (initialResult.success) {
        console.log(`✅ Transpiled ${initialResult.filesTranspiled} files in ${initialResult.duration}ms`);
    }
    else {
        console.error(`❌ Initial transpilation had ${initialResult.errors.length} errors:`);
        initialResult.errors.forEach(({ file, error }) => {
            console.error(`   ${file}: ${error}`);
        });
    }
    console.log('');
    console.log('👀 Watching for changes...');
    console.log('');
    // Start watching for changes
    watcher.watch(projectPath, async (filePath) => {
        console.log(`📝 File changed: ${filePath}`);
        const result = await transpiler.transpileFile(filePath);
        if (result.success) {
            console.log(`   ✅ Transpiled in ${result.duration}ms`);
        }
        else {
            console.error(`   ❌ Transpilation failed: ${result.error}`);
        }
        console.log('');
    });
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping watcher...');
        watcher.stop();
        process.exit(0);
    });
    // Keep process alive
    await new Promise(() => { });
}
