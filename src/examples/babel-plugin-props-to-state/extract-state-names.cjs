/**
 * Babel Plugin: Extract State Variable Names
 *
 * This plugin generates metadata about useState variable names
 * so the Visual Compiler can display human-readable names in the State Editor.
 *
 * Creates a .state-metadata.json file alongside each transpiled component with:
 * {
 *   "componentName": "Card",
 *   "states": [
 *     { "index": 0, "name": "title", "setter": "setTitle", "wasOriginallyProp": true },
 *     { "index": 1, "name": "isOpen", "setter": "setOpen", "wasOriginallyProp": false }
 *   ]
 * }
 */

const t = require('@babel/types');
const fs = require('fs');
const path = require('path');

module.exports = function(babel) {
  return {
    name: 'extract-state-names',

    visitor: {
      Program: {
        exit(programPath, state) {
          // Extract metadata from the entire file
          const metadata = extractStateMetadata(programPath);

          if (metadata && metadata.states.length > 0) {
            // Save metadata to .state-metadata.json
            const sourceFile = state.file.opts.filename || 'unknown.tsx';
            const outputFile = sourceFile.replace(/\.(tsx|ts|jsx|js)$/, '.state-metadata.json');

            fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
          }
        }
      }
    }
  };
};

/**
 * Extract state metadata from the entire program
 */
function extractStateMetadata(programPath) {
  const components = [];

  programPath.traverse({
    // Find all function components
    FunctionDeclaration(path) {
      const metadata = extractFromFunction(path);
      if (metadata) components.push(metadata);
    },
    ArrowFunctionExpression(path) {
      const metadata = extractFromFunction(path);
      if (metadata) components.push(metadata);
    },
    FunctionExpression(path) {
      const metadata = extractFromFunction(path);
      if (metadata) components.push(metadata);
    }
  });

  // Return the first component found (most files have one component)
  return components[0] || null;
}

/**
 * Extract state metadata from a single function component
 */
function extractFromFunction(path) {
  const componentName = getComponentName(path);
  if (!componentName) return null;

  // Skip non-React components (lowercase names)
  if (componentName[0] !== componentName[0].toUpperCase()) {
    return null;
  }

  const states = [];
  let stateIndex = 0;

  // Find all useState calls in order
  path.traverse({
    CallExpression(callPath) {
      // Check if this is a useState call
      if (
        t.isIdentifier(callPath.node.callee) &&
        callPath.node.callee.name === 'useState'
      ) {
        // Get the parent VariableDeclarator to find the variable names
        const declarator = callPath.findParent(p => p.isVariableDeclarator());

        if (declarator && t.isArrayPattern(declarator.node.id)) {
          const [stateVar, setterVar] = declarator.node.id.elements;

          if (t.isIdentifier(stateVar) && t.isIdentifier(setterVar)) {
            // Check if this was originally a prop (look for trailing comment)
            const declaration = declarator.parentPath.node;
            const wasOriginallyProp = hasPropsComment(declaration);

            states.push({
              index: stateIndex,
              name: stateVar.name,
              setter: setterVar.name,
              wasOriginallyProp
            });

            stateIndex++;
          }
        }

        // Stop traversal into nested functions
        callPath.skip();
      }
    }
  });

  if (states.length === 0) return null;

  return {
    componentName,
    states
  };
}

/**
 * Get component name from function path
 */
function getComponentName(path) {
  // Function has a name: function Card() {}
  if (path.node.id && path.node.id.name) {
    return path.node.id.name;
  }

  // Function assigned to variable: const Card = () => {}
  if (path.parent.type === 'VariableDeclarator' && path.parent.id.name) {
    return path.parent.id.name;
  }

  // Export default
  if (path.parent.type === 'ExportDefaultDeclaration') {
    return 'Component';
  }

  return null;
}

/**
 * Check if a variable declaration has a "transformed from props" comment
 */
function hasPropsComment(node) {
  if (!node.trailingComments || node.trailingComments.length === 0) {
    return false;
  }

  return node.trailingComments.some(comment =>
    comment.value.includes('transformed from props')
  );
}
