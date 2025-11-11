import * as path from 'path';
import * as fs from 'fs/promises';
import { TranspilerService } from '@minimact/swig-shared';

/**
 * Transpile command - Transpile TSX files to C#
 */
export async function transpileCommand(
  files: string[],
  options: {
    watch?: boolean;
    project?: string;
  }
): Promise<void> {
  const projectPath = options.project || process.cwd();

  console.log(`🔄 Transpiling TSX files...`);
  console.log(`   Project: ${projectPath}`);

  try {
    const transpiler = new TranspilerService();

    if (files.length === 0) {
      // Transpile entire project
      console.log('   Mode: Full project transpilation');

      const result = await transpiler.transpileProject(projectPath);

      if (result.success) {
        console.log(`✅ Transpiled ${result.filesTranspiled} files in ${result.duration}ms`);
      } else {
        console.error(`❌ Transpilation failed with ${result.errors.length} errors:`);
        result.errors.forEach(({ file, error }) => {
          console.error(`   ${file}: ${error}`);
        });
        process.exit(1);
      }
    } else {
      // Transpile specific files
      console.log(`   Mode: Transpiling ${files.length} file(s)`);

      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        const filePath = path.isAbsolute(file) ? file : path.join(projectPath, file);

        console.log(`   Transpiling: ${file}`);

        const result = await transpiler.transpileFile(filePath);

        if (result.success) {
          console.log(`   ✅ ${file} → ${path.basename(result.outputPath!)} (${result.duration}ms)`);
          successCount++;
        } else {
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
  } catch (error) {
    console.error('❌ Transpilation failed:', error);
    throw error;
  }
}
