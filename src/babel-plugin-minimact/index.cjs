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

/**
 * Extract all key attribute values from TSX source code
 *
 * @param {string} sourceCode - TSX source code
 * @returns {Set<string>} - Set of all key values
 */
function extractAllKeysFromSource(sourceCode) {
  const keys = new Set();

  // Match key="value" or key='value' or key={value}
  const keyRegex = /key=(?:"([^"]+)"|'([^']+)'|\{([^}]+)\})/g;
  let match;

  while ((match = keyRegex.exec(sourceCode)) !== null) {
    const keyValue = match[1] || match[2] || match[3];

    // Only include string literal keys (not expressions)
    if (match[1] || match[2]) {
      keys.add(keyValue);
    }
  }

  return keys;
}

module.exports = function(babel) {
  const generate = require('@babel/generator').default;

  return {
    name: 'minimact-full',

    pre(file) {
      // Save the original code BEFORE React preset transforms JSX
      // This allows us to generate .tsx.keys with real JSX syntax
      file.originalCode = file.code;
      console.log(`[Minimact Keys] pre() hook - Saved original code (${file.code ? file.code.length : 0} chars)`);
    },

    visitor: {
      Program: {
        enter(path, state) {
          // Initialize minimactComponents array
          state.file.minimactComponents = [];

          // Collect all top-level function declarations for potential inclusion as helpers
          state.file.topLevelFunctions = [];

          path.traverse({
            FunctionDeclaration(funcPath) {
              // Only collect top-level functions (not nested inside components)
              if (funcPath.parent.type === 'Program' || funcPath.parent.type === 'ExportNamedDeclaration') {
                const funcName = funcPath.node.id ? funcPath.node.id.name : null;
                // Skip if it's a component (starts with uppercase)
                if (funcName && funcName[0] === funcName[0].toLowerCase()) {
                  state.file.topLevelFunctions.push({
                    name: funcName,
                    node: funcPath.node,
                    path: funcPath
                  });
                }
              }
            }
          });
        },

        exit(programPath, state) {
          // 🔥 Generate .tsx.keys FIRST - from original JSX source with keys added
          // This must happen BEFORE JSX is replaced with null!
          const inputFilePath = state.file.opts.filename;
          console.log(`[Minimact Keys] inputFilePath: ${inputFilePath}, originalCode exists: ${!!state.file.originalCode}`);
          if (inputFilePath && state.file.originalCode) {
            const babelCore = require('@babel/core');
            const babelTypes = require('@babel/types');
            const { HexPathGenerator } = require('./src/utils/hexPath.cjs');
            const { assignPathsToJSX } = require('./src/utils/pathAssignment.cjs');

            try {
              // Parse the original code (with JSX, not createElement)
              const originalAst = babelCore.parseSync(state.file.originalCode, {
                filename: inputFilePath,
                presets: ['@babel/preset-typescript'], // Only TypeScript, NO React preset!
                plugins: []
              });

              // Now add keys to this fresh AST
              babelCore.traverse(originalAst, {
                FunctionDeclaration(funcPath) {
                  // Find components (must have JSX return)
                  funcPath.traverse({
                    ReturnStatement(returnPath) {
                      if (returnPath.getFunctionParent() === funcPath &&
                          babelTypes.isJSXElement(returnPath.node.argument)) {
                        // This is a component! Add keys to its JSX
                        const pathGen = new HexPathGenerator();
                        assignPathsToJSX(returnPath.node.argument, '', pathGen, babelTypes);
                      }
                    }
                  });
                }
              });

              // Generate code from the keyed AST
              const output = generate(originalAst, {
                retainLines: false,
                comments: true,
                retainFunctionParens: true
              });

              const keysFilePath = inputFilePath + '.keys';
              fs.writeFileSync(keysFilePath, output.code);
              console.log(`[Minimact Keys] ✅ Generated ${nodePath.basename(keysFilePath)} with JSX syntax`);
            } catch (error) {
              console.error(`[Minimact Keys] ❌ Failed to generate .tsx.keys:`, error);
            }
          }

          // 🔥 STEP 2: NOW nullify JSX in all components (after .tsx.keys generation)
          const t = require('@babel/types');
          if (state.file.componentPathsToNullify) {
            for (const componentPath of state.file.componentPathsToNullify) {
              componentPath.traverse({
                ReturnStatement(returnPath) {
                  if (returnPath.getFunctionParent() === componentPath) {
                    returnPath.node.argument = t.nullLiteral();
                  }
                }
              });
            }
            console.log(`[Minimact] ✅ Nullified JSX in ${state.file.componentPathsToNullify.length} components`);
          }

          // 🔥 STEP 3: Generate C# code (now with nullified JSX)
          if (state.file.minimactComponents && state.file.minimactComponents.length > 0) {
            const csharpCode = generateCSharpFile(state.file.minimactComponents, state);

            state.file.metadata = state.file.metadata || {};
            state.file.metadata.minimactCSharp = csharpCode;

            // Generate .templates.json files for hot reload
            const inputFilePath2 = state.file.opts.filename;
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

                // Generate .structural-changes.json files for hot reload
                if (component.structuralChanges && component.structuralChanges.length > 0) {
                  // Read previous .tsx.keys to detect deletions
                  const keysFilePath = inputFilePath + '.keys';
                  let previousKeys = new Set();

                  if (fs.existsSync(keysFilePath)) {
                    try {
                      const previousSource = fs.readFileSync(keysFilePath, 'utf-8');
                      previousKeys = extractAllKeysFromSource(previousSource);
                      console.log(`[Hot Reload] Read ${previousKeys.size} keys from previous transpilation`);
                    } catch (error) {
                      console.error(`[Hot Reload] Failed to read ${keysFilePath}:`, error);
                    }
                  }

                  // Collect current keys from AST
                  const currentKeys = new Set();
                  programPath.traverse({
                    JSXElement(jsxPath) {
                      const keyAttr = jsxPath.node.openingElement.attributes.find(attr =>
                        t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
                      );
                      if (keyAttr && t.isStringLiteral(keyAttr.value)) {
                        currentKeys.add(keyAttr.value.value);
                      }
                    }
                  });

                  // Detect deletions
                  const allChanges = [...component.structuralChanges];
                  for (const prevKey of previousKeys) {
                    if (!currentKeys.has(prevKey)) {
                      console.log(`[Hot Reload] 🗑️  Deletion detected at path "${prevKey}"`);
                      allChanges.push({
                        type: 'delete',
                        path: prevKey
                      });
                    }
                  }

                  // Write structural changes file if there are any changes
                  if (allChanges.length > 0) {
                    const structuralChangesJSON = {
                      componentName: component.name,
                      timestamp: new Date().toISOString(),
                      sourceFile: inputFilePath,
                      changes: allChanges
                    };

                    const outputDir = nodePath.dirname(inputFilePath);
                    const changesFilePath = nodePath.join(outputDir, `${component.name}.structural-changes.json`);

                    try {
                      fs.writeFileSync(changesFilePath, JSON.stringify(structuralChangesJSON, null, 2));
                      console.log(`[Hot Reload] ✅ Generated ${changesFilePath} with ${allChanges.length} changes`);
                    } catch (error) {
                      console.error(`[Hot Reload] Failed to write ${changesFilePath}:`, error);
                    }
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