/**
 * Minimact Babel Plugin - Complete Implementation
 *
 * Features:
 * - Dependency tracking for hybrid rendering
 * - Smart span splitting for mixed client/server state
 * - All hooks: useState, useEffect, useRef, useClientState, useMarkdown, useTemplate
 * - Conditional rendering (ternary, &&)
 * - List rendering (.map with key)
 * - Fragment support
 * - Props support
 * - TypeScript interface → C# class conversion
 */

const t = require('@babel/types');
const { traverse } = require('@babel/core');
const fs = require('fs');
const nodePath = require('path');

// Modular imports
const { processComponent } = require('./src/processComponent.cjs');
const { generateCSharpFile } = require('./src/generators/csharpFile.cjs');
const { generateTemplateMapJSON } = require('./src/extractors/templates.cjs');

module.exports = function(babel) {
  return {
    name: 'minimact-full',

    visitor: {
      Program: {
        exit(path, state) {
          if (state.file.minimactComponents && state.file.minimactComponents.length > 0) {
            const csharpCode = generateCSharpFile(state.file.minimactComponents, state);

            state.file.metadata = state.file.metadata || {};
            state.file.metadata.minimactCSharp = csharpCode;

            // Generate .templates.json files for hot reload
            const inputFilePath = state.file.opts.filename;
            if (inputFilePath) {
              for (const component of state.file.minimactComponents) {
                if (component.templates && Object.keys(component.templates).length > 0) {
                  const templateMapJSON = generateTemplateMapJSON(
                    component.name,
                    component.templates,
                    {} // Attribute templates already included in component.templates
                  );

                  // Write to .templates.json file
                  const outputDir = nodePath.dirname(inputFilePath);
                  const templateFilePath = nodePath.join(outputDir, `${component.name}.templates.json`);

                  try {
                    fs.writeFileSync(templateFilePath, JSON.stringify(templateMapJSON, null, 2));
                    console.log(`[Minimact Templates] Generated ${templateFilePath}`);
                  } catch (error) {
                    console.error(`[Minimact Templates] Failed to write ${templateFilePath}:`, error);
                  }
                }
              }
            }
          }
        }
      },

      FunctionDeclaration(path, state) {
        processComponent(path, state);
      },

      ArrowFunctionExpression(path, state) {
        if (path.parent.type === 'VariableDeclarator' || path.parent.type === 'ExportNamedDeclaration') {
          processComponent(path, state);
        }
      },

      FunctionExpression(path, state) {
        if (path.parent.type === 'VariableDeclarator') {
          processComponent(path, state);
        }
      }
    }
  };
};