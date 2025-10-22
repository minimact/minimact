/**
 * Minimact Babel Plugin (Modular Version)
 *
 * Main entry point for the Babel plugin.
 *
 * This file:
 * 1. Imports all modules from src/
 * 2. Exports the Babel plugin structure
 * 3. Provides visitors for FunctionDeclaration/ArrowFunctionExpression
 * 4. Generates C# output in Program.exit
 *
 * Plugin Structure:
 * - Pre: Initialize state.file.minimactComponents
 * - Visitor: Process each component via processComponent
 * - Post: Generate C# file via generateCSharpFile and store in metadata
 */

const { declare } = require('@babel/helper-plugin-utils');
const t = require('@babel/types');

// TODO: Import modules once functions are moved:
// const { processComponent } = require('./src/processComponent.cjs');
// const { generateCSharpFile } = require('./src/generators/csharpFile.cjs');

module.exports = declare((api, options) => {
  api.assertVersion(7);

  return {
    name: 'babel-plugin-minimact',

    pre(state) {
      // Initialize components array
      this.file.minimactComponents = [];
    },

    visitor: {
      FunctionDeclaration(path, state) {
        // TODO: Call processComponent(path, state)
      },

      ArrowFunctionExpression(path, state) {
        // Only process if it's exported (top-level component)
        if (path.parent.type === 'VariableDeclarator' &&
            path.parentPath?.parent?.type === 'ExportNamedDeclaration') {
          // TODO: Call processComponent(path, state)
        }
      },

      Program: {
        exit(path, state) {
          // Generate C# output
          if (state.file.minimactComponents.length > 0) {
            // TODO: Call generateCSharpFile(state.file.minimactComponents, state)
            // const csharpCode = generateCSharpFile(state.file.minimactComponents, state);
            // state.file.metadata = state.file.metadata || {};
            // state.file.metadata.minimactCSharp = csharpCode;
          }
        }
      }
    }
  };
});
