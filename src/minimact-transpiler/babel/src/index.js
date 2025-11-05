/**
 * Minimact Transpiler - Babel Plugin (Main Entry Point)
 *
 * FIRST PASS: JSX → JSON AST (Structure + Hex Paths Only)
 *
 * This plugin performs the FIRST PASS of transpilation:
 * - Traverse complete JSX tree
 * - Assign hex paths to every node (tag-agnostic!)
 * - Capture raw expressions (NO template extraction yet!)
 * - Build complete structural JSON
 *
 * SECOND PASS (future): Template extraction from raw expressions
 *
 * Modular Architecture:
 * ├─ core/        - HexPath, Nodes, Traverser
 * ├─ processors/  - Component, JSX, Attributes, Expressions, Children
 * ├─ extractors/  - Bindings, Templates, Conditionals, Loops, Styles
 * ├─ utils/       - AST, Validation, Logging, FileSystem
 * └─ legacy/      - Shared logic from babel-plugin-minimact
 *
 * This file is ORCHESTRATION ONLY - delegates all work to specialized modules.
 */

// Processors
const { processComponent } = require('./processors/component');

// Utils
const { ensureDir } = require('./utils/fileSystem');

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'minimact-transpiler-babel',

    visitor: {
      /**
       * Visit each Program (file) and process exported components
       */
      Program: {
        enter(programPath, state) {
          // Initialize component collection (like babel-plugin-minimact)
          state.file.minimactComponents = [];
        },

        exit(programPath, state) {
          const outputDir = state.opts.outputDir || './Generated';
          const hexGap = state.opts.hexGap || 0x10000000;

          // Ensure output directory exists
          ensureDir(outputDir);

          // Find all exported function components
          programPath.traverse({
            ExportNamedDeclaration(exportPath) {
              const declaration = exportPath.node.declaration;

              // export function ComponentName() { ... }
              if (t.isFunctionDeclaration(declaration)) {
                const componentJson = processComponent(declaration, outputDir, hexGap, t);
                if (componentJson) {
                  state.file.minimactComponents.push(componentJson);
                }
              }
            },

            ExportDefaultDeclaration(exportPath) {
              const declaration = exportPath.node.declaration;

              // export default function ComponentName() { ... }
              if (t.isFunctionDeclaration(declaration)) {
                const componentJson = processComponent(declaration, outputDir, hexGap, t);
                if (componentJson) {
                  state.file.minimactComponents.push(componentJson);
                }
              }
            }
          });

          // Store component JSON in metadata (like babel-plugin-minimact did with C#)
          // This allows tools like Swig to access the JSON without reading files
          if (state.file.minimactComponents && state.file.minimactComponents.length > 0) {
            // For now, assume single component per file (standard practice)
            const componentJson = state.file.minimactComponents[0];
            const jsonOutput = JSON.stringify(componentJson, null, 2);

            state.file.metadata = state.file.metadata || {};
            state.file.metadata.minimactJson = jsonOutput;
          }
        }
      }
    }
  };
};
