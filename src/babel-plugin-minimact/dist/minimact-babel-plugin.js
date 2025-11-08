(function() {
  // Inject Babel types and core as globals for the plugin to use
  if (typeof window !== 'undefined' && window.Babel) {
    // @babel/standalone exposes types via packages.types, not directly as .types
    globalThis.__BABEL_TYPES__ = window.Babel.packages?.types || window.Babel.types;
    globalThis.__BABEL_CORE__ = window.Babel;
  }
})();
var MinimactBabelPlugin = (function (require$$0, require$$1) {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	/**
	 * Utility Helpers
	 *
	 * General utility functions used throughout the plugin.
	 *
	 * Functions to move:
	 * - escapeCSharpString(str) - Escapes special characters for C# strings
	 * - getComponentName(path) - Extracts component name from function/class declaration
	 *
	 * Utilities:
	 * - escapeCSharpString: Handles \, ", \n, \r, \t escaping
	 * - getComponentName: Supports FunctionDeclaration, ArrowFunctionExpression, etc.
	 *
	 * Returns processed string or component name
	 */

	// TODO: Move the following functions here:
	// - escapeCSharpString
	// - getComponentName

	/**
	 * Escape C# string
	 */
	function escapeCSharpString(str) {
	  return str
	    .replace(/\\/g, '\\\\')
	    .replace(/"/g, '\\"')
	    .replace(/\n/g, '\\n')
	    .replace(/\r/g, '\\r')
	    .replace(/\t/g, '\\t');
	}

	/**
	 * Get component name from path
	 */
	function getComponentName$1(path) {
	  if (path.node.id) {
	    return path.node.id.name;
	  }

	  if (path.parent.type === 'VariableDeclarator') {
	    return path.parent.id.name;
	  }

	  if (path.parent.type === 'ExportNamedDeclaration') {
	    return path.node.id ? path.node.id.name : null;
	  }

	  return null;
	}


	var helpers = {
	  escapeCSharpString,
	  getComponentName: getComponentName$1,
	};

	/**
	 * Type Conversion
	 */

	const t$g = globalThis.__BABEL_TYPES__;

	/**
	 * Convert TypeScript type annotation to C# type
	 */
	function tsTypeToCSharpType$4(tsType) {
	  if (!tsType) return 'dynamic';

	  // TSStringKeyword -> string
	  if (t$g.isTSStringKeyword(tsType)) return 'string';

	  // TSNumberKeyword -> double
	  if (t$g.isTSNumberKeyword(tsType)) return 'double';

	  // TSBooleanKeyword -> bool
	  if (t$g.isTSBooleanKeyword(tsType)) return 'bool';

	  // TSAnyKeyword -> dynamic
	  if (t$g.isTSAnyKeyword(tsType)) return 'dynamic';

	  // TSArrayType -> List<T>
	  if (t$g.isTSArrayType(tsType)) {
	    const elementType = tsTypeToCSharpType$4(tsType.elementType);
	    return `List<${elementType}>`;
	  }

	  // TSTypeLiteral (object type) -> dynamic
	  if (t$g.isTSTypeLiteral(tsType)) return 'dynamic';

	  // TSTypeReference (custom types, interfaces)
	  if (t$g.isTSTypeReference(tsType)) {
	    // Handle @minimact/mvc type mappings
	    if (t$g.isIdentifier(tsType.typeName)) {
	      const typeName = tsType.typeName.name;

	      // Map @minimact/mvc types to C# types
	      const typeMap = {
	        'decimal': 'decimal',
	        'int': 'int',
	        'int32': 'int',
	        'int64': 'long',
	        'long': 'long',
	        'float': 'float',
	        'float32': 'float',
	        'float64': 'double',
	        'double': 'double',
	        'short': 'short',
	        'int16': 'short',
	        'byte': 'byte',
	        'Guid': 'Guid',
	        'DateTime': 'DateTime',
	        'DateOnly': 'DateOnly',
	        'TimeOnly': 'TimeOnly'
	      };

	      if (typeMap[typeName]) {
	        return typeMap[typeName];
	      }
	    }

	    // Other type references default to dynamic
	    return 'dynamic';
	  }

	  // Default to dynamic for full JSX semantics
	  return 'dynamic';
	}

	/**
	 * Infer C# type from initial value
	 */
	function inferType$2(node) {
	  if (!node) return 'dynamic';

	  if (t$g.isStringLiteral(node)) return 'string';
	  if (t$g.isNumericLiteral(node)) {
	    // Check if the number has a decimal point
	    // If the value is a whole number, use int; otherwise use double
	    const value = node.value;
	    return Number.isInteger(value) ? 'int' : 'double';
	  }
	  if (t$g.isBooleanLiteral(node)) return 'bool';
	  if (t$g.isNullLiteral(node)) return 'dynamic';
	  if (t$g.isArrayExpression(node)) return 'List<dynamic>';
	  if (t$g.isObjectExpression(node)) return 'dynamic';

	  return 'dynamic';
	}


	var typeConversion = {
	  inferType: inferType$2,
	  tsTypeToCSharpType: tsTypeToCSharpType$4
	};

	/**
	 * Dependency Analyzer
	 */

	const t$f = globalThis.__BABEL_TYPES__;

	/**
	 * Analyze dependencies in JSX expressions
	 * Walk the AST manually to find identifier dependencies
	 */
	function analyzeDependencies(jsxExpr, component) {
	  const deps = new Set();

	  function walk(node) {
	    if (!node) return;

	    // Check if this is an identifier that's a state variable
	    if (t$f.isIdentifier(node)) {
	      const name = node.name;
	      if (component.stateTypes.has(name)) {
	        deps.add({
	          name: name,
	          type: component.stateTypes.get(name) // 'client' or 'server'
	        });
	      }
	    }

	    // Recursively walk the tree
	    if (t$f.isConditionalExpression(node)) {
	      walk(node.test);
	      walk(node.consequent);
	      walk(node.alternate);
	    } else if (t$f.isLogicalExpression(node)) {
	      walk(node.left);
	      walk(node.right);
	    } else if (t$f.isMemberExpression(node)) {
	      walk(node.object);
	      walk(node.property);
	    } else if (t$f.isCallExpression(node)) {
	      walk(node.callee);
	      node.arguments.forEach(walk);
	    } else if (t$f.isBinaryExpression(node)) {
	      walk(node.left);
	      walk(node.right);
	    } else if (t$f.isUnaryExpression(node)) {
	      walk(node.argument);
	    } else if (t$f.isArrowFunctionExpression(node) || t$f.isFunctionExpression(node)) {
	      walk(node.body);
	    }
	  }

	  walk(jsxExpr);
	  return deps;
	}


	var dependencies = {
	  analyzeDependencies
	};

	/**
	 * Node Classification
	 *
	 * Classifies JSX nodes as static, dynamic, or hybrid based on dependencies.
	 *
	 * Function to move:
	 * - classifyNode(deps) - Classifies based on dependency set
	 *
	 * Classifications:
	 * - 'static': No dependencies (can be compile-time VNode)
	 * - 'dynamic': All dependencies are from same zone (state or props)
	 * - 'hybrid': Mixed dependencies (needs runtime helpers)
	 *
	 * Currently returns 'hybrid' for any dependencies as a conservative approach.
	 *
	 * Returns classification string
	 */

	// TODO: Move classifyNode function here

	/**
	 * Classify a JSX node based on dependencies
	 */
	function classifyNode(deps) {
	  if (deps.size === 0) {
	    return 'static';
	  }

	  const types = new Set([...deps].map(d => d.type));

	  if (types.size === 1) {
	    return types.has('client') ? 'client' : 'server';
	  }

	  return 'hybrid'; // Mixed dependencies
	}

	var classification = {
	  classifyNode
	};

	/**
	 * Hex Path Generator for Minimact
	 *
	 * Generates lexicographically sortable, insertion-friendly paths using 8-digit hex codes.
	 *
	 * Benefits:
	 * - No renumbering needed when inserting elements
	 * - String comparison works for sorting
	 * - Billions of slots between any two elements
	 * - Easy to visualize tree structure
	 *
	 * Example:
	 *   div [10000000]
	 *     span [10000000.10000000]
	 *     span [10000000.20000000]
	 *     p [10000000.30000000]
	 *   section [20000000]
	 */

	var hexPath;
	var hasRequiredHexPath;

	function requireHexPath () {
		if (hasRequiredHexPath) return hexPath;
		hasRequiredHexPath = 1;
		class HexPathGenerator {
		  /**
		   * @param {number} gap - Spacing between elements (default: 0x10000000 = 268,435,456)
		   */
		  constructor(gap = 0x10000000) {
		    this.gap = gap;
		    this.counters = {}; // Track counters per parent path
		  }

		  /**
		   * Generate next hex code for a given parent path
		   * @param {string} parentPath - Parent path (e.g., "10000000" or "10000000.1")
		   * @returns {string} - Next hex code (compact: 1, 2, 3...a, b, c...10, 11...)
		   */
		  next(parentPath = '') {
		    if (!this.counters[parentPath]) {
		      this.counters[parentPath] = 0;
		    }

		    this.counters[parentPath]++;
		    // For root level (empty parent), use gap-based spacing for components
		    // For child elements, use simple sequential hex (1, 2, 3...a, b, c...)
		    const hexValue = (parentPath === '' ? this.counters[parentPath] * this.gap : this.counters[parentPath]).toString(16);
		    // Truncate trailing zeroes to keep paths compact (1 instead of 10000000)
		    return hexValue.replace(/0+$/, '') || '0';
		  }

		  /**
		   * Build full path by joining parent and child
		   * @param {string} parentPath - Parent path
		   * @param {string} childHex - Child hex code
		   * @returns {string} - Full path (e.g., "10000000.20000000")
		   */
		  buildPath(parentPath, childHex) {
		    return parentPath ? `${parentPath}.${childHex}` : childHex;
		  }

		  /**
		   * Parse path into segments
		   * @param {string} path - Full path (e.g., "10000000.20000000.30000000")
		   * @returns {string[]} - Array of hex segments
		   */
		  parsePath(path) {
		    return path.split('.');
		  }

		  /**
		   * Get depth of a path (number of segments)
		   * @param {string} path - Full path
		   * @returns {number} - Depth (0 for root, 1 for first level, etc.)
		   */
		  getDepth(path) {
		    return path ? this.parsePath(path).length : 0;
		  }

		  /**
		   * Get parent path
		   * @param {string} path - Full path
		   * @returns {string|null} - Parent path or null if root
		   */
		  getParentPath(path) {
		    const lastDot = path.lastIndexOf('.');
		    return lastDot > 0 ? path.substring(0, lastDot) : null;
		  }

		  /**
		   * Check if path1 is ancestor of path2
		   * @param {string} ancestorPath - Potential ancestor
		   * @param {string} descendantPath - Potential descendant
		   * @returns {boolean}
		   */
		  isAncestorOf(ancestorPath, descendantPath) {
		    return descendantPath.startsWith(ancestorPath + '.');
		  }

		  /**
		   * Reset counter for a specific parent (useful for testing)
		   * @param {string} parentPath - Parent path to reset
		   */
		  reset(parentPath = '') {
		    delete this.counters[parentPath];
		  }

		  /**
		   * Reset all counters (useful for testing)
		   */
		  resetAll() {
		    this.counters = {};
		  }

		  /**
		   * Generate a path between two existing paths (for future insertion)
		   * @param {string} path1 - First path
		   * @param {string} path2 - Second path
		   * @returns {string} - Midpoint path
		   */
		  static generatePathBetween(path1, path2) {
		    const segments1 = path1.split('.');
		    const segments2 = path2.split('.');

		    // Find common prefix length
		    let commonLength = 0;
		    while (commonLength < Math.min(segments1.length, segments2.length) &&
		           segments1[commonLength] === segments2[commonLength]) {
		      commonLength++;
		    }

		    // Get the differing segments
		    const seg1 = commonLength < segments1.length
		      ? parseInt(segments1[commonLength], 16)
		      : 0;
		    const seg2 = commonLength < segments2.length
		      ? parseInt(segments2[commonLength], 16)
		      : 0;

		    // Generate midpoint
		    const midpoint = Math.floor((seg1 + seg2) / 2);
		    const newSegment = midpoint.toString(16).padStart(8, '0');

		    // Build new path
		    const prefix = segments1.slice(0, commonLength).join('.');
		    return prefix ? `${prefix}.${newSegment}` : newSegment;
		  }

		  /**
		   * Check if there's sufficient gap between two paths
		   * @param {string} path1 - First path
		   * @param {string} path2 - Second path
		   * @param {number} minGap - Minimum required gap (default: 0x00100000)
		   * @returns {boolean}
		   */
		  static hasSufficientGap(path1, path2, minGap = 0x00100000) {
		    const seg1 = parseInt(path1.split('.').pop(), 16);
		    const seg2 = parseInt(path2.split('.').pop(), 16);
		    return Math.abs(seg2 - seg1) > minGap;
		  }
		}

		hexPath = { HexPathGenerator };
		return hexPath;
	}

	/**
	 * Path Assignment Pass for Minimact
	 *
	 * CRITICAL: This is the FIRST PASS that runs before any extraction.
	 * It assigns hex paths to every JSX node by mutating the AST.
	 *
	 * Problem it solves:
	 * - Old system: Each extractor recalculated paths independently
	 * - Result: Path mismatches between template/attribute/handler extractors
	 *
	 * Solution:
	 * - Single pass assigns paths and stores in node.__minimactPath
	 * - All extractors read from node.__minimactPath (no recalculation!)
	 *
	 * Usage:
	 *   const pathGen = new HexPathGenerator();
	 *   assignPathsToJSX(jsxRoot, '', pathGen, t);
	 *   // Now all JSX nodes have __minimactPath metadata
	 */

	var pathAssignment;
	var hasRequiredPathAssignment;

	function requirePathAssignment () {
		if (hasRequiredPathAssignment) return pathAssignment;
		hasRequiredPathAssignment = 1;
		requireHexPath();

		/**
		 * Assign hex paths to all JSX nodes in tree
		 *
		 * Mutates AST by adding __minimactPath and __minimactPathSegments to each node.
		 * This ensures consistent paths across all subsequent extractors.
		 *
		 * @param {Object} node - Babel AST node
		 * @param {string} parentPath - Parent hex path
		 * @param {HexPathGenerator} pathGen - Hex path generator
		 * @param {Object} t - Babel types
		 * @param {string|null} previousSiblingKey - Previous sibling's key for sort validation
		 * @param {string|null} nextSiblingKey - Next sibling's key for sort validation
		 * @param {Array} structuralChanges - Array to collect structural changes for hot reload
		 */
		function assignPathsToJSX(node, parentPath, pathGen, t, previousSiblingKey = null, nextSiblingKey = null, structuralChanges = []) {
		  if (t.isJSXElement(node)) {
		    let currentPath;
		    let pathSegments;
		    let useExistingKey = false;

		    // Check if element already has a key attribute
		    if (node.openingElement && node.openingElement.attributes) {
		      const keyAttr = node.openingElement.attributes.find(attr =>
		        t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
		      );

		      if (keyAttr && t.isStringLiteral(keyAttr.value)) {
		        const existingKey = keyAttr.value.value;

		        // Validate the key: must be valid hex path format AND in correct sort order
		        if (isValidHexPath(existingKey) && isInSortOrder(existingKey, previousSiblingKey, nextSiblingKey)) {
		          // Use the existing key as the path
		          currentPath = existingKey;
		          pathSegments = pathGen.parsePath(currentPath);
		          useExistingKey = true;

		          // CRITICAL: Synchronize the path generator's counter with this existing key
		          // This prevents duplicate keys when auto-generating for the next sibling
		          syncPathGeneratorWithKey(currentPath, parentPath, pathGen);

		          console.log(`[Path Assignment] ♻️  Using existing key="${currentPath}" for <${node.openingElement.name.name}>`);
		        } else if (!isValidHexPath(existingKey)) {
		          console.warn(`[Path Assignment] ⚠️  Invalid key format "${existingKey}" - generating new path`);
		        } else {
		          console.warn(`[Path Assignment] ⚠️  Key "${existingKey}" is out of order (prev: ${previousSiblingKey}, next: ${nextSiblingKey}) - generating half-gap`);
		        }
		      }
		    }

		    // If no valid existing key, generate a new one
		    if (!useExistingKey) {
		      const isNewInsertion = !!(previousSiblingKey || nextSiblingKey);

		      // If we have previous and next siblings, generate a half-gap between them
		      if (previousSiblingKey && nextSiblingKey) {
		        currentPath = generateHalfGap(previousSiblingKey, nextSiblingKey, parentPath);
		        console.log(`[Path Assignment] ⚡ Generated half-gap key="${currentPath}" between "${previousSiblingKey}" and "${nextSiblingKey}"`);

		        // Track insertion for hot reload
		        if (isNewInsertion) {
		          console.log(`[Hot Reload] 🆕 Insertion detected at path "${currentPath}"`);
		          const vnode = generateVNodeRepresentation(node, currentPath, t);
		          if (vnode) {
		            structuralChanges.push({
		              type: 'insert',
		              path: currentPath,
		              vnode: vnode
		            });
		          }
		        }
		      } else {
		        // Normal sequential generation
		        const childHex = pathGen.next(parentPath);
		        currentPath = pathGen.buildPath(parentPath, childHex);
		      }

		      pathSegments = pathGen.parsePath(currentPath);

		      // Add or update key prop to JSX element
		      if (node.openingElement && node.openingElement.attributes) {
		        // Check if key already exists (but was invalid)
		        const existingKeyAttr = node.openingElement.attributes.find(attr =>
		          t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
		        );

		        if (existingKeyAttr && t.isStringLiteral(existingKeyAttr.value)) {
		          // Update existing key
		          existingKeyAttr.value = t.stringLiteral(currentPath);
		          console.log(`[Path Assignment] ✅ Replaced invalid key with "${currentPath}" on <${node.openingElement.name.name}>`);
		        } else {
		          // Add new key
		          const keyAttr = t.jsxAttribute(
		            t.jsxIdentifier('key'),
		            t.stringLiteral(currentPath)
		          );
		          node.openingElement.attributes.unshift(keyAttr);
		          console.log(`[Path Assignment] ✅ Added key="${currentPath}" to <${node.openingElement.name.name}>`);
		        }
		      }
		    }

		    // Mutate AST node with path data
		    node.__minimactPath = currentPath;
		    node.__minimactPathSegments = pathSegments;

		    // Process attributes (for @attributeName paths)
		    if (node.openingElement && node.openingElement.attributes) {
		      for (const attr of node.openingElement.attributes) {
		        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
		          const attrName = attr.name.name;
		          const attrPath = `${currentPath}.@${attrName}`;

		          // Mutate attribute node with path
		          attr.__minimactPath = attrPath;
		          attr.__minimactPathSegments = [...pathSegments, `@${attrName}`];
		        }
		      }
		    }

		    // Recursively assign paths to children
		    if (node.children) {
		      assignPathsToChildren(node.children, currentPath, pathGen, t, structuralChanges);
		    }
		  } else if (t.isJSXFragment(node)) {
		    // Fragments don't get paths - children become direct siblings
		    if (node.children) {
		      assignPathsToChildren(node.children, parentPath, pathGen, t, structuralChanges);
		    }
		  }
		}

		/**
		 * Assign paths to JSX children array
		 *
		 * Handles mixed content: JSXElement, JSXText, JSXExpressionContainer, JSXFragment
		 *
		 * @param {Array} children - Array of Babel AST nodes
		 * @param {string} parentPath - Parent hex path
		 * @param {HexPathGenerator} pathGen - Hex path generator
		 * @param {Object} t - Babel types
		 * @param {Array} structuralChanges - Array to collect structural changes for hot reload
		 */
		function assignPathsToChildren(children, parentPath, pathGen, t, structuralChanges = []) {
		  let previousKey = null; // Track previous sibling's key for sort order validation

		  for (let i = 0; i < children.length; i++) {
		    const child = children[i];

		    if (t.isJSXElement(child)) {
		      // Look ahead to find next sibling's key (if it exists)
		      let nextKey = null;
		      for (let j = i + 1; j < children.length; j++) {
		        if (t.isJSXElement(children[j])) {
		          const nextKeyAttr = children[j].openingElement?.attributes?.find(attr =>
		            t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
		          );
		          if (nextKeyAttr && t.isStringLiteral(nextKeyAttr.value)) {
		            nextKey = nextKeyAttr.value.value;
		            break;
		          }
		        }
		      }

		      // Nested JSX element - pass previous and next keys for validation
		      assignPathsToJSX(child, parentPath, pathGen, t, previousKey, nextKey, structuralChanges);

		      // Update previousKey for next sibling
		      if (child.__minimactPath) {
		        previousKey = child.__minimactPath;
		      }
		    } else if (t.isJSXText(child)) {
		      // Static text node
		      const text = child.value.trim();
		      if (text) {
		        const textHex = pathGen.next(parentPath);
		        const textPath = pathGen.buildPath(parentPath, textHex);
		        const textSegments = pathGen.parsePath(textPath);

		        // Mutate text node with path
		        child.__minimactPath = textPath;
		        child.__minimactPathSegments = textSegments;
		      }
		    } else if (t.isJSXExpressionContainer(child)) {
		      // Expression container - assign path and recurse into structural JSX
		      const expr = child.expression;

		      // Skip JSX comments (empty expressions like {/* comment */})
		      if (t.isJSXEmptyExpression(expr)) {
		        // Don't assign path, don't increment counter - comments are ignored
		        continue;
		      }

		      // Generate path for the expression container
		      const exprHex = pathGen.next(parentPath);
		      const exprPath = pathGen.buildPath(parentPath, exprHex);
		      const exprSegments = pathGen.parsePath(exprPath);

		      // Mutate expression container with path
		      child.__minimactPath = exprPath;
		      child.__minimactPathSegments = exprSegments;

		      // Recurse into structural expressions (conditionals, loops)
		      assignPathsToExpression(expr, exprPath, pathGen, t, structuralChanges);
		    } else if (t.isJSXFragment(child)) {
		      // Fragment - flatten children
		      assignPathsToJSX(child, parentPath, pathGen, t, null, null, structuralChanges);
		    }
		  }
		}

		/**
		 * Assign paths to expressions containing JSX
		 *
		 * Handles:
		 * - Logical AND: {isVisible && <Modal />}
		 * - Ternary: {isAdmin ? <AdminPanel /> : <UserPanel />}
		 * - Array.map: {items.map(item => <li>{item}</li>)}
		 *
		 * @param {Object} expr - Babel expression node
		 * @param {string} parentPath - Parent hex path
		 * @param {HexPathGenerator} pathGen - Hex path generator
		 * @param {Object} t - Babel types
		 * @param {Array} structuralChanges - Array to collect structural changes for hot reload
		 */
		function assignPathsToExpression(expr, parentPath, pathGen, t, structuralChanges = []) {
		  if (!expr) return;

		  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
		    // Logical AND: {isAdmin && <div>Admin Panel</div>}
		    if (t.isJSXElement(expr.right)) {
		      assignPathsToJSX(expr.right, parentPath, pathGen, t, null, null, structuralChanges);
		    } else if (t.isJSXExpressionContainer(expr.right)) {
		      assignPathsToExpression(expr.right.expression, parentPath, pathGen, t, structuralChanges);
		    }
		  } else if (t.isConditionalExpression(expr)) {
		    // Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}

		    // Assign paths to consequent (true branch)
		    if (t.isJSXElement(expr.consequent)) {
		      assignPathsToJSX(expr.consequent, parentPath, pathGen, t, null, null, structuralChanges);
		    } else if (t.isJSXExpressionContainer(expr.consequent)) {
		      assignPathsToExpression(expr.consequent.expression, parentPath, pathGen, t, structuralChanges);
		    }

		    // Assign paths to alternate (false branch)
		    if (expr.alternate) {
		      if (t.isJSXElement(expr.alternate)) {
		        assignPathsToJSX(expr.alternate, parentPath, pathGen, t, null, null, structuralChanges);
		      } else if (t.isJSXExpressionContainer(expr.alternate)) {
		        assignPathsToExpression(expr.alternate.expression, parentPath, pathGen, t, structuralChanges);
		      }
		    }
		  } else if (t.isCallExpression(expr) &&
		             t.isMemberExpression(expr.callee) &&
		             t.isIdentifier(expr.callee.property) &&
		             expr.callee.property.name === 'map') {
		    // Array.map: {items.map(item => <li>{item}</li>)}

		    const callback = expr.arguments[0];
		    if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
		      const body = callback.body;

		      if (t.isJSXElement(body)) {
		        // Arrow function with JSX body: item => <li>{item}</li>
		        assignPathsToJSX(body, parentPath, pathGen, t, null, null, structuralChanges);
		      } else if (t.isBlockStatement(body)) {
		        // Arrow function with block: item => { return <li>{item}</li>; }
		        const returnStmt = body.body.find(stmt => t.isReturnStatement(stmt));
		        if (returnStmt && t.isJSXElement(returnStmt.argument)) {
		          assignPathsToJSX(returnStmt.argument, parentPath, pathGen, t, null, null, structuralChanges);
		        }
		      }
		    }
		  } else if (t.isJSXFragment(expr)) {
		    // Fragment
		    assignPathsToJSX(expr, parentPath, pathGen, t, null, null, structuralChanges);
		  } else if (t.isJSXElement(expr)) {
		    // Direct JSX element
		    assignPathsToJSX(expr, parentPath, pathGen, t, null, null, structuralChanges);
		  }
		}

		/**
		 * Get path from AST node (helper for extractors)
		 *
		 * Reads __minimactPath metadata assigned by this pass.
		 * Throws error if path wasn't assigned (indicates bug).
		 *
		 * @param {Object} node - Babel AST node
		 * @returns {string} - Hex path
		 */
		function getPathFromNode(node) {
		  if (!node.__minimactPath) {
		    throw new Error('[Minimact] Path not assigned to node! Did you forget to run assignPathsToJSX?');
		  }
		  return node.__minimactPath;
		}

		/**
		 * Get path segments from AST node (helper for extractors)
		 *
		 * @param {Object} node - Babel AST node
		 * @returns {string[]} - Path segments array
		 */
		function getPathSegmentsFromNode(node) {
		  if (!node.__minimactPathSegments) {
		    throw new Error('[Minimact] Path segments not assigned to node! Did you forget to run assignPathsToJSX?');
		  }
		  return node.__minimactPathSegments;
		}

		/**
		 * Validate if a string is a valid hex path
		 *
		 * Valid formats:
		 * - "1" (single hex segment)
		 * - "1.1" (dot-separated hex segments)
		 * - "a.b.c" (multiple segments)
		 *
		 * Invalid formats:
		 * - "foo" (non-hex characters)
		 * - "1..2" (empty segments)
		 * - ".1" (leading dot)
		 * - "1." (trailing dot)
		 *
		 * @param {string} key - The key to validate
		 * @returns {boolean} - True if valid hex path format
		 */
		function isValidHexPath(key) {
		  if (!key || typeof key !== 'string') {
		    return false;
		  }

		  // Must not start or end with dot
		  if (key.startsWith('.') || key.endsWith('.')) {
		    return false;
		  }

		  // Split by dots and validate each segment
		  const segments = key.split('.');

		  for (const segment of segments) {
		    // Each segment must be non-empty and valid hex (0-9, a-f)
		    if (!segment || !/^[0-9a-f]+$/i.test(segment)) {
		      return false;
		    }
		  }

		  return true;
		}

		/**
		 * Check if a key is in correct lexicographic sort order
		 *
		 * @param {string} key - The key to check
		 * @param {string|null} previousKey - Previous sibling's key (must be less than key)
		 * @param {string|null} nextKey - Next sibling's key (must be greater than key)
		 * @returns {boolean} - True if key is in correct sort order
		 */
		function isInSortOrder(key, previousKey, nextKey) {
		  // If there's a previous key, current must be greater
		  if (previousKey && key <= previousKey) {
		    return false;
		  }

		  // If there's a next key, current must be less
		  if (nextKey && key >= nextKey) {
		    return false;
		  }

		  return true;
		}

		/**
		 * Synchronize the path generator's counter with an existing key
		 *
		 * When we use an existing key instead of generating a new one, we need to
		 * update the path generator's internal counter so it doesn't reuse that key.
		 *
		 * @param {string} existingKey - The existing key we're using (e.g., "1.2")
		 * @param {string} parentPath - Parent path (e.g., "1")
		 * @param {HexPathGenerator} pathGen - Path generator to synchronize
		 */
		function syncPathGeneratorWithKey(existingKey, parentPath, pathGen) {
		  // Extract the child segment from the existing key
		  const parentPrefix = parentPath ? parentPath + '.' : '';
		  const childHex = existingKey.startsWith(parentPrefix)
		    ? existingKey.slice(parentPrefix.length)
		    : existingKey;

		  // Convert to decimal to get the numeric value
		  const childNum = parseInt(childHex, 16);

		  // Update the counter for this parent path to be at least one past this key
		  // This ensures the next call to pathGen.next() won't reuse this key
		  if (!pathGen.counters[parentPath]) {
		    pathGen.counters[parentPath] = 0;
		  }

		  // Set counter to the max of current counter or the existing key's value
		  pathGen.counters[parentPath] = Math.max(pathGen.counters[parentPath], childNum);
		}

		/**
		 * Generate a half-gap hex path between two keys
		 *
		 * Takes the average of two hex paths to create a value that sorts between them.
		 *
		 * @param {string} prevKey - Previous sibling's key (e.g., "1.1")
		 * @param {string} nextKey - Next sibling's key (e.g., "1.2")
		 * @param {string} parentPath - Parent path (e.g., "1")
		 * @returns {string} - Half-gap hex path (e.g., "1.15")
		 */
		function generateHalfGap(prevKey, nextKey, parentPath) {
		  // Remove parent path prefix to get just the child segment
		  const parentPrefix = parentPath ? parentPath + '.' : '';
		  const prevChild = prevKey.startsWith(parentPrefix) ? prevKey.slice(parentPrefix.length) : prevKey;
		  const nextChild = nextKey.startsWith(parentPrefix) ? nextKey.slice(parentPrefix.length) : nextKey;

		  // Convert child hex segments to decimal
		  const prevNum = parseInt(prevChild, 16);
		  const nextNum = parseInt(nextChild, 16);

		  // Calculate midpoint
		  const midNum = Math.floor((prevNum + nextNum) / 2);

		  // If midpoint equals prevNum, we need more precision (add a fractional hex digit)
		  if (midNum === prevNum) {
		    // Generate a value between prevNum and nextNum by adding .8 (half of 0x10)
		    const midHex = prevChild + '8';
		    return parentPath ? `${parentPath}.${midHex}` : midHex;
		  }

		  // Convert back to hex (without padding to keep it compact)
		  const midHex = midNum.toString(16);

		  // Build full path
		  return parentPath ? `${parentPath}.${midHex}` : midHex;
		}

		/**
		 * Convert a Babel JSX AST node to VNode JSON representation for hot reload
		 *
		 * @param {Object} node - Babel JSX element node
		 * @param {string} path - Hex path for this node
		 * @param {Object} t - Babel types
		 * @returns {Object} - VNode representation for C#
		 */
		function generateVNodeRepresentation(node, path, t) {
		  if (!t.isJSXElement(node)) {
		    return null;
		  }

		  const tagName = node.openingElement.name.name;
		  const attributes = {};

		  // Extract attributes
		  for (const attr of node.openingElement.attributes) {
		    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
		      const attrName = attr.name.name;

		      if (attrName === 'key') continue; // Skip key attribute

		      if (t.isStringLiteral(attr.value)) {
		        attributes[attrName] = attr.value.value;
		      } else if (t.isJSXExpressionContainer(attr.value)) {
		        // For expressions, mark as dynamic
		        attributes[attrName] = '__DYNAMIC__';
		      } else if (attr.value === null) {
		        // Boolean attribute (e.g., <input disabled />)
		        attributes[attrName] = true;
		      }
		    }
		  }

		  // Extract children (simplified - only static content and basic structure)
		  const children = [];
		  if (node.children) {
		    for (const child of node.children) {
		      if (t.isJSXText(child)) {
		        const text = child.value.trim();
		        if (text) {
		          children.push({
		            type: 'text',
		            path: child.__minimactPath || `${path}.${children.length + 1}`,
		            value: text
		          });
		        }
		      } else if (t.isJSXElement(child)) {
		        // Nested element - include path and tag
		        children.push({
		          type: 'element',
		          path: child.__minimactPath || `${path}.${children.length + 1}`,
		          tag: child.openingElement.name.name
		        });
		      } else if (t.isJSXExpressionContainer(child)) {
		        // Expression - mark as dynamic
		        children.push({
		          type: 'expression',
		          path: child.__minimactPath || `${path}.${children.length + 1}`,
		          value: '__DYNAMIC__'
		        });
		      }
		    }
		  }

		  return {
		    type: 'element',
		    tag: tagName,
		    path: path,
		    attributes: attributes,
		    children: children
		  };
		}

		pathAssignment = {
		  assignPathsToJSX,
		  assignPathsToChildren,
		  assignPathsToExpression,
		  getPathFromNode,
		  getPathSegmentsFromNode,
		  isValidHexPath,
		  generateVNodeRepresentation
		};
		return pathAssignment;
	}

	/**
	 * Pattern Detection
	 */

	const t$e = globalThis.__BABEL_TYPES__;


	/**
	 * Detect if attributes contain spread operators
	 */
	function hasSpreadProps(attributes) {
	  return attributes.some(attr => t$e.isJSXSpreadAttribute(attr));
	}

	/**
	 * Detect if children contain dynamic patterns (like .map())
	 */
	function hasDynamicChildren(children) {
	  return children.some(child => {
	    if (!t$e.isJSXExpressionContainer(child)) return false;
	    const expr = child.expression;

	    // Check for .map() calls
	    if (t$e.isCallExpression(expr) &&
	        t$e.isMemberExpression(expr.callee) &&
	        t$e.isIdentifier(expr.callee.property, { name: 'map' })) {
	      return true;
	    }

	    // Check for array expressions from LINQ/Select
	    if (t$e.isCallExpression(expr) &&
	        t$e.isMemberExpression(expr.callee) &&
	        (t$e.isIdentifier(expr.callee.property, { name: 'Select' }) ||
	         t$e.isIdentifier(expr.callee.property, { name: 'ToArray' }))) {
	      return true;
	    }

	    // Check for conditionals with JSX: {condition ? <A/> : <B/>}
	    if (t$e.isConditionalExpression(expr)) {
	      if (t$e.isJSXElement(expr.consequent) || t$e.isJSXFragment(expr.consequent) ||
	          t$e.isJSXElement(expr.alternate) || t$e.isJSXFragment(expr.alternate)) {
	        return true;
	      }
	    }

	    // Check for logical expressions with JSX: {condition && <Element/>}
	    if (t$e.isLogicalExpression(expr)) {
	      if (t$e.isJSXElement(expr.right) || t$e.isJSXFragment(expr.right)) {
	        return true;
	      }
	    }

	    return false;
	  });
	}

	/**
	 * Detect if props contain complex expressions
	 */
	function hasComplexProps(attributes) {
	  return attributes.some(attr => {
	    if (!t$e.isJSXAttribute(attr)) return false;
	    const value = attr.value;

	    if (!t$e.isJSXExpressionContainer(value)) return false;
	    const expr = value.expression;

	    // Check for conditional spread: {...(condition && { prop: value })}
	    if (t$e.isConditionalExpression(expr) || t$e.isLogicalExpression(expr)) {
	      return true;
	    }

	    return false;
	  });
	}

	var detection = {
	  hasSpreadProps,
	  hasDynamicChildren,
	  hasComplexProps
	};

	/**
	 * Event Handlers Extractor
	 */

	const t$d = globalThis.__BABEL_TYPES__;

	/**
	 * Extract event handler name
	 */
	function extractEventHandler(value, component) {
	  if (t$d.isStringLiteral(value)) {
	    return value.value;
	  }

	  if (t$d.isJSXExpressionContainer(value)) {
	    const expr = value.expression;

	    if (t$d.isArrowFunctionExpression(expr) || t$d.isFunctionExpression(expr)) {
	      // Inline arrow function - extract to named method
	      const handlerName = `Handle${component.eventHandlers.length}`;

	      // Check if the function is async
	      const isAsync = expr.async || false;

	      // Detect curried functions (functions that return functions)
	      // Pattern: (e) => (id) => action(id)
	      // This is invalid for event handlers because the returned function is never called
	      if (t$d.isArrowFunctionExpression(expr.body) || t$d.isFunctionExpression(expr.body)) {
	        // Generate a handler that throws a helpful error
	        component.eventHandlers.push({
	          name: handlerName,
	          body: null, // Will be handled specially in component generator
	          params: expr.params,
	          capturedParams: [],
	          isAsync: false,
	          isCurriedError: true // Flag to generate error throw
	        });

	        return handlerName;
	      }

	      // Simplify common pattern: (e) => func(e.target.value)
	      // Transform to: (value) => func(value)
	      let body = expr.body;
	      let params = expr.params;

	      if (t$d.isCallExpression(body) && params.length === 1 && t$d.isIdentifier(params[0])) {
	        const eventParam = params[0].name; // e.g., "e"
	        const args = body.arguments;

	        // Check if any argument is e.target.value
	        const transformedArgs = args.map(arg => {
	          if (t$d.isMemberExpression(arg) &&
	              t$d.isMemberExpression(arg.object) &&
	              t$d.isIdentifier(arg.object.object, { name: eventParam }) &&
	              t$d.isIdentifier(arg.object.property, { name: 'target' }) &&
	              t$d.isIdentifier(arg.property, { name: 'value' })) {
	            // Replace e.target.value with direct value parameter
	            return t$d.identifier('value');
	          }
	          return arg;
	        });

	        // If we transformed any args, update the body and param name
	        if (transformedArgs.some((arg, i) => arg !== args[i])) {
	          body = t$d.callExpression(body.callee, transformedArgs);
	          params = [t$d.identifier('value')];
	        }
	      }

	      // Check if we're inside a .map() context and capture those variables
	      const capturedParams = component.currentMapContext ? component.currentMapContext.params : [];

	      // Handle parameter destructuring
	      // Convert ({ target: { value } }) => ... into (e) => ... with unpacking in body
	      const hasDestructuring = params.some(p => t$d.isObjectPattern(p));
	      let processedBody = body;
	      let processedParams = params;

	      if (hasDestructuring && params.length === 1 && t$d.isObjectPattern(params[0])) {
	        // Extract destructured properties
	        const destructuringStatements = [];
	        const eventParam = t$d.identifier('e');

	        function extractDestructured(pattern, path = []) {
	          if (t$d.isObjectPattern(pattern)) {
	            for (const prop of pattern.properties) {
	              if (t$d.isObjectProperty(prop)) {
	                const key = t$d.isIdentifier(prop.key) ? prop.key.name : null;
	                if (key && t$d.isIdentifier(prop.value)) {
	                  // Simple: { value } or { target: { value } }
	                  const varName = prop.value.name;
	                  const accessPath = [...path, key];
	                  destructuringStatements.push({ varName, accessPath });
	                } else if (key && t$d.isObjectPattern(prop.value)) {
	                  // Nested: { target: { value } }
	                  extractDestructured(prop.value, [...path, key]);
	                }
	              }
	            }
	          }
	        }

	        extractDestructured(params[0]);
	        processedParams = [eventParam];

	        // Prepend destructuring assignments to body
	        if (destructuringStatements.length > 0) {
	          const assignments = destructuringStatements.map(({ varName, accessPath }) => {
	            // Build e.Target.Value access chain
	            let access = eventParam;
	            for (const key of accessPath) {
	              const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
	              access = t$d.memberExpression(access, t$d.identifier(capitalizedKey));
	            }
	            return t$d.variableDeclaration('var', [
	              t$d.variableDeclarator(t$d.identifier(varName), access)
	            ]);
	          });

	          // Wrap body in block statement with destructuring
	          if (t$d.isBlockStatement(body)) {
	            processedBody = t$d.blockStatement([...assignments, ...body.body]);
	          } else {
	            processedBody = t$d.blockStatement([...assignments, t$d.expressionStatement(body)]);
	          }
	        }
	      }

	      component.eventHandlers.push({
	        name: handlerName,
	        body: processedBody,
	        params: processedParams,
	        capturedParams: capturedParams,  // e.g., ['item', 'index']
	        isAsync: isAsync  // Track if handler is async
	      });

	      // Return handler registration string
	      // If there are captured params, append them as colon-separated interpolations
	      // Format: "Handle0:{item}:{index}" - matches client's existing "Method:arg1:arg2" parser
	      if (capturedParams.length > 0) {
	        const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
	        return `${handlerName}:${capturedRefs}`;
	      }

	      return handlerName;
	    }

	    if (t$d.isIdentifier(expr)) {
	      return expr.name;
	    }

	    if (t$d.isCallExpression(expr)) {
	      // () => someMethod() - extract
	      const handlerName = `Handle${component.eventHandlers.length}`;

	      // Check if we're inside a .map() context and capture those variables
	      const capturedParams = component.currentMapContext ? component.currentMapContext.params : [];

	      component.eventHandlers.push({
	        name: handlerName,
	        body: expr,
	        capturedParams: capturedParams  // e.g., ['item', 'index']
	      });

	      // Return handler registration string
	      // If there are captured params, append them as colon-separated interpolations
	      // Format: "Handle0:{item}:{index}" - matches client's existing "Method:arg1:arg2" parser
	      if (capturedParams.length > 0) {
	        const capturedRefs = capturedParams.map(p => `{${p}}`).join(':');
	        return `${handlerName}:${capturedRefs}`;
	      }

	      return handlerName;
	    }
	  }

	  return 'UnknownHandler';
	}



	var eventHandlers = {
	  extractEventHandler
	};

	/**
	 * Generate C# code for Plugin elements
	 * Transforms <Plugin name="..." state={...} /> to C# PluginNode instances
	 *
	 * Phase 3: Babel Plugin Integration
	 */

	var plugin;
	var hasRequiredPlugin;

	function requirePlugin () {
		if (hasRequiredPlugin) return plugin;
		hasRequiredPlugin = 1;
		const { generateCSharpExpression } = requireExpressions$1();

		/**
		 * Generate C# code for a plugin usage
		 * @param {Object} pluginMetadata - Plugin usage metadata from analyzer
		 * @param {Object} componentState - Component metadata
		 * @returns {string} C# code
		 */
		function generatePluginNode(pluginMetadata, componentState) {
		  const { pluginName, stateBinding, version } = pluginMetadata;

		  // Generate state expression
		  const stateCode = generateStateExpression(stateBinding);

		  // Generate PluginNode constructor call
		  if (version) {
		    // Future: Support version-specific plugin loading
		    // For now, version is informational only
		    return `new PluginNode("${pluginName}", ${stateCode}) /* v${version} */`;
		  }

		  return `new PluginNode("${pluginName}", ${stateCode})`;
		}

		/**
		 * Generate C# expression for plugin state
		 * @param {Object} stateBinding - State binding metadata
		 * @param {Object} componentState - Component metadata
		 * @returns {string} C# code
		 */
		function generateStateExpression(stateBinding, componentState) {
		  switch (stateBinding.type) {
		    case 'identifier':
		      // Simple identifier: state={currentTime} -> currentTime
		      return stateBinding.name;

		    case 'memberExpression':
		      // Member expression: state={this.state.time} -> state.time (remove 'this')
		      return stateBinding.binding;

		    case 'objectExpression':
		      // Inline object: state={{ hours: h, minutes: m }}
		      return generateInlineObject(stateBinding);

		    case 'complexExpression':
		      // Complex expression: evaluate using expression generator
		      return generateCSharpExpression(stateBinding.expression);

		    default:
		      throw new Error(`Unknown state binding type: ${stateBinding.type}`);
		  }
		}

		/**
		 * Generate C# code for inline object expression
		 * @param {Object} stateBinding - State binding with objectExpression type
		 * @param {Object} componentState - Component metadata
		 * @returns {string} C# anonymous object code
		 */
		function generateInlineObject(stateBinding, componentState) {
		  const properties = stateBinding.properties;

		  if (!properties || properties.length === 0) {
		    return 'new { }';
		  }

		  const propStrings = properties.map(prop => {
		    const key = prop.key.name || prop.key.value;
		    const value = generateCSharpExpression(prop.value);
		    return `${key} = ${value}`;
		  });

		  return `new { ${propStrings.join(', ')} }`;
		}

		/**
		 * Generate using directives needed for plugins
		 * @returns {Array<string>} Using statements
		 */
		function generatePluginUsings() {
		  return [
		    'using Minimact.AspNetCore.Core;',
		    'using Minimact.AspNetCore.Plugins;'
		  ];
		}

		/**
		 * Check if component uses plugins (for conditional using statement inclusion)
		 * @param {Object} componentState - Component metadata
		 * @returns {boolean}
		 */
		function usesPlugins(componentState) {
		  return componentState.pluginUsages && componentState.pluginUsages.length > 0;
		}

		/**
		 * Generate comment documenting plugin usage
		 * @param {Object} pluginMetadata - Plugin metadata
		 * @returns {string} C# comment
		 */
		function generatePluginComment(pluginMetadata) {
		  const { pluginName, stateBinding, version } = pluginMetadata;

		  const versionInfo = version ? ` (v${version})` : '';
		  const stateInfo = stateBinding.stateType
		    ? ` : ${stateBinding.stateType}`
		    : '';

		  return `// Plugin: ${pluginName}${versionInfo}, State: ${stateBinding.binding}${stateInfo}`;
		}

		/**
		 * Generate validation code for plugin state (optional, for runtime safety)
		 * @param {Object} pluginMetadata - Plugin metadata
		 * @returns {string|null} C# validation code or null
		 */
		function generatePluginValidation(pluginMetadata) {
		  // Future enhancement: Generate runtime validation
		  // For now, validation happens in PluginManager
		  return null;
		}

		plugin = {
		  generatePluginNode,
		  generateStateExpression,
		  generateInlineObject,
		  generatePluginUsings,
		  generatePluginComment,
		  generatePluginValidation,
		  usesPlugins
		};
		return plugin;
	}

	/**
	 * Style Converter
	 * Converts JavaScript style objects to CSS strings
	 */

	var styleConverter;
	var hasRequiredStyleConverter;

	function requireStyleConverter () {
		if (hasRequiredStyleConverter) return styleConverter;
		hasRequiredStyleConverter = 1;
		const t = globalThis.__BABEL_TYPES__;

		/**
		 * Convert camelCase to kebab-case
		 * Example: marginTop -> margin-top
		 */
		function camelToKebab(str) {
		  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
		}

		/**
		 * Convert a style value to CSS string
		 */
		function convertStyleValue(value) {
		  if (t.isStringLiteral(value)) {
		    return value.value;
		  } else if (t.isNumericLiteral(value)) {
		    // Add 'px' for numeric values (except certain properties)
		    return `${value.value}px`;
		  } else if (t.isIdentifier(value)) {
		    return value.name;
		  }
		  return String(value);
		}

		/**
		 * Convert a JavaScript style object expression to CSS string
		 * Example: { marginTop: '12px', color: 'red' } -> "margin-top: 12px; color: red;"
		 */
		function convertStyleObjectToCss(objectExpression) {
		  if (!t.isObjectExpression(objectExpression)) {
		    throw new Error('Expected ObjectExpression for style');
		  }

		  const cssProperties = [];

		  for (const prop of objectExpression.properties) {
		    if (t.isObjectProperty(prop) && !prop.computed) {
		      const key = t.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value);
		      const cssKey = camelToKebab(key);
		      const cssValue = convertStyleValue(prop.value);
		      cssProperties.push(`${cssKey}: ${cssValue}`);
		    }
		  }

		  return cssProperties.join('; ');
		}

		styleConverter = {
		  convertStyleObjectToCss,
		  camelToKebab
		};
		return styleConverter;
	}

	/**
	 * JSX Generators
	 */

	var jsx$1;
	var hasRequiredJsx$1;

	function requireJsx$1 () {
		if (hasRequiredJsx$1) return jsx$1;
		hasRequiredJsx$1 = 1;
		const t = globalThis.__BABEL_TYPES__;
		const { escapeCSharpString } = helpers;
		const { hasSpreadProps, hasDynamicChildren, hasComplexProps } = detection;
		const { extractEventHandler } = eventHandlers;
		requirePathAssignment();
		// Note: generateCSharpExpression, generateRuntimeHelperCall and generateJSXExpression will be lazy-loaded to avoid circular dependencies

		/**
		 * Generate Fragment
		 */
		function generateFragment(node, component, indent) {
		  const children = generateChildren(node.children, component, indent);
		  const childrenArray = children.map(c => c.code).join(', ');
		  return `new Fragment(${childrenArray})`;
		}

		/**
		 * Generate C# for JSX element
		 */
		function generateJSXElement(node, component, indent) {
		  // Lazy load to avoid circular dependencies
		  const { generateCSharpExpression: _generateCSharpExpression } = requireExpressions$1();

		  const indentStr = '    '.repeat(indent);

		  if (t.isJSXFragment(node)) {
		    return generateFragment(node, component, indent);
		  }

		  // Validate that this is actually a JSXElement
		  if (!t.isJSXElement(node)) {
		    console.error('[jsx.cjs] generateJSXElement called with non-JSX node:', node?.type || 'undefined');
		    throw new Error(`generateJSXElement expects JSXElement or JSXFragment, received: ${node?.type || 'undefined'}`);
		  }

		  const tagName = node.openingElement.name.name;
		  const attributes = node.openingElement.attributes;
		  const children = node.children;

		  // Get hex path from AST node (assigned by pathAssignment.cjs)
		  const hexPath = node.__minimactPath || '';

		  // Check if this is a Plugin element
		  if (tagName === 'Plugin') {
		    const { generatePluginNode } = requirePlugin();

		    // Find the matching plugin metadata from component.pluginUsages
		    // Use the plugin index tracker to match plugins in order
		    if (!component._pluginRenderIndex) {
		      component._pluginRenderIndex = 0;
		    }

		    const pluginMetadata = component.pluginUsages[component._pluginRenderIndex];
		    component._pluginRenderIndex++;

		    if (pluginMetadata) {
		      return generatePluginNode(pluginMetadata, component);
		    } else {
		      // Fallback if plugin metadata not found (shouldn't happen)
		      console.warn(`[jsx.cjs] Plugin metadata not found for <Plugin> element`);
		      return 'new VText("<!-- Plugin not found -->")'
		    }
		  }

		  // Check if this element has markdown attribute and markdown content
		  const hasMarkdownAttr = attributes.some(attr =>
		    t.isJSXAttribute(attr) && attr.name.name === 'markdown'
		  );

		  if (hasMarkdownAttr) {
		    // Check if child is a markdown state variable
		    if (children.length === 1 && t.isJSXExpressionContainer(children[0])) {
		      const expr = children[0].expression;
		      if (t.isIdentifier(expr)) {
		        const varName = expr.name;
		        // Check if this is a markdown state variable
		        if (component.stateTypes.get(varName) === 'markdown') {
		          // Return DivRawHtml with MarkdownHelper.ToHtml()
		          return `new DivRawHtml(MarkdownHelper.ToHtml(${varName}))`;
		        }
		      }
		    }
		  }

		  // Detect if this needs runtime helpers (hybrid approach)
		  const needsRuntimeHelper = hasSpreadProps(attributes) ||
		                              hasDynamicChildren(children) ||
		                              hasComplexProps(attributes);

		  if (needsRuntimeHelper) {
		    // Lazy load to avoid circular dependency
		    const { generateRuntimeHelperCall } = requireRuntimeHelpers();
		    return generateRuntimeHelperCall(tagName, attributes, children, component, indent);
		  }

		  // Direct VNode construction (compile-time approach)
		  // Extract props and event handlers
		  const props = [];
		  const eventHandlers = [];
		  let dataMinimactAttrs = [];

		  for (const attr of attributes) {
		    if (t.isJSXAttribute(attr)) {
		      const name = attr.name.name;
		      const value = attr.value;

		      // Convert className to class for HTML compatibility
		      const htmlAttrName = name === 'className' ? 'class' : name;

		      if (name.startsWith('on')) {
		        // Event handler
		        const handlerName = extractEventHandler(value, component);
		        eventHandlers.push(`["${name.toLowerCase()}"] = "${handlerName}"`);
		      } else if (name.startsWith('data-minimact-')) {
		        // Keep minimact attributes as-is
		        const val = t.isStringLiteral(value) ? value.value : _generateCSharpExpression(value.expression);
		        dataMinimactAttrs.push(`["${htmlAttrName}"] = "${val}"`);
		      } else {
		        // Regular prop
		        if (t.isStringLiteral(value)) {
		          // String literal - use as-is with quotes
		          props.push(`["${htmlAttrName}"] = "${escapeCSharpString(value.value)}"`);
		        } else if (t.isJSXExpressionContainer(value)) {
		          // Special handling for style attribute with object expression
		          if (name === 'style' && t.isObjectExpression(value.expression)) {
		            const { convertStyleObjectToCss } = requireStyleConverter();
		            const cssString = convertStyleObjectToCss(value.expression);
		            props.push(`["style"] = "${cssString}"`);
		          } else {
		            // Expression - wrap in string interpolation
		            const expr = _generateCSharpExpression(value.expression);
		            props.push(`["${htmlAttrName}"] = $"{${expr}}"`);
		          }
		        } else {
		          // Fallback
		          props.push(`["${htmlAttrName}"] = ""`);
		        }
		      }
		    }
		  }

		  // Build props dictionary
		  const allProps = [...props, ...eventHandlers, ...dataMinimactAttrs];
		  const propsStr = allProps.length > 0
		    ? `new Dictionary<string, string> { ${allProps.join(', ')} }`
		    : 'new Dictionary<string, string>()';

		  // Generate children
		  const childrenCode = generateChildren(children, component, indent);

		  // Build VElement construction with hex path
		  if (childrenCode.length === 0) {
		    return `new VElement("${tagName}", "${hexPath}", ${propsStr})`;
		  } else if (childrenCode.length === 1 && (childrenCode[0].type === 'text' || childrenCode[0].type === 'mixed')) {
		    return `new VElement("${tagName}", "${hexPath}", ${propsStr}, ${childrenCode[0].code})`;
		  } else {
		    // Wrap children appropriately for VNode array
		    const childrenArray = childrenCode.map(c => {
		      if (c.type === 'text') {
		        // Text already has quotes, wrap in VText with path from node
		        const textPath = c.node.__minimactPath || '';
		        return `new VText(${c.code}, "${textPath}")`;
		      } else if (c.type === 'expression') {
		        // Expression needs string interpolation wrapper with extra parentheses for complex expressions
		        const exprPath = c.node.__minimactPath || '';
		        return `new VText($"{(${c.code})}", "${exprPath}")`;
		      } else if (c.type === 'mixed') {
		        // Mixed content is already an interpolated string, wrap in VText
		        // Use path from first child node
		        const mixedPath = c.node ? (c.node.__minimactPath || '') : '';
		        return `new VText(${c.code}, "${mixedPath}")`;
		      } else {
		        // Element is already a VNode
		        return c.code;
		      }
		    }).join(',\n' + indentStr + '    ');
		    return `new VElement("${tagName}", "${hexPath}", ${propsStr}, new VNode[]\n${indentStr}{\n${indentStr}    ${childrenArray}\n${indentStr}})`;
		  }
		}

		/**
		 * Generate children
		 */
		function generateChildren(children, component, indent) {
		  const result = [];

		  // Lazy load to avoid circular dependency
		  const { generateJSXExpression } = requireExpressions$1();

		  // First pass: collect all children with their types
		  const childList = [];
		  for (const child of children) {
		    // Skip undefined/null children
		    if (!child) {
		      console.warn('[jsx.cjs] Skipping undefined child in children array');
		      continue;
		    }

		    if (t.isJSXText(child)) {
		      const text = child.value.trim();
		      if (text) {
		        childList.push({ type: 'text', code: `"${escapeCSharpString(text)}"`, raw: text, node: child });
		      }
		    } else if (t.isJSXElement(child)) {
		      childList.push({ type: 'element', code: generateJSXElement(child, component, indent + 1), node: child });
		    } else if (t.isJSXExpressionContainer(child)) {
		      const expr = child.expression;

		      // Skip JSX comments (empty expressions like {/* comment */})
		      if (t.isJSXEmptyExpression(expr)) {
		        continue; // Don't add to childList - comments are ignored
		      }

		      // Skip structural JSX
		      const isStructural = t.isJSXElement(expr) ||
		                           t.isJSXFragment(expr) ||
		                           (t.isLogicalExpression(expr) && (t.isJSXElement(expr.right) || t.isJSXFragment(expr.right))) ||
		                           (t.isConditionalExpression(expr) &&
		                            (t.isJSXElement(expr.consequent) || t.isJSXElement(expr.alternate) ||
		                             t.isJSXFragment(expr.consequent) || t.isJSXFragment(expr.alternate)));

		      if (!isStructural) {
		        childList.push({ type: 'expression', code: generateJSXExpression(expr, component, indent), node: child });
		      } else {
		        childList.push({ type: 'element', code: generateJSXExpression(expr, component, indent), node: child });
		      }
		    } else if (t.isJSXFragment(child)) {
		      childList.push({ type: 'element', code: generateFragment(child, component, indent + 1), node: child });
		    } else {
		      console.warn(`[jsx.cjs] Unknown child type: ${child.type}`);
		    }
		  }

		  // Second pass: merge consecutive text/expression children into mixed content
		  let i = 0;
		  while (i < childList.length) {
		    const current = childList[i];

		    // Check if this starts a mixed content sequence (text or expression followed by text or expression)
		    if ((current.type === 'text' || current.type === 'expression') && i + 1 < childList.length) {
		      const next = childList[i + 1];

		      if (next.type === 'text' || next.type === 'expression') {
		        // Found mixed content! Merge consecutive text/expression children
		        const mixedChildren = [current];
		        let j = i + 1;

		        while (j < childList.length && (childList[j].type === 'text' || childList[j].type === 'expression')) {
		          mixedChildren.push(childList[j]);
		          j++;
		        }

		        // Build a single interpolated string
		        let interpolatedCode = '';
		        for (const child of mixedChildren) {
		          if (child.type === 'text') {
		            interpolatedCode += escapeCSharpString(child.raw);
		          } else {
		            interpolatedCode += `{(${child.code})}`;
		          }
		        }

		        result.push({ type: 'mixed', code: `$"${interpolatedCode}"` });
		        i = j; // Skip merged children
		        continue;
		      }
		    }

		    // Not mixed content, add as-is
		    result.push(current);
		    i++;
		  }

		  return result;
		}

		jsx$1 = {
		  generateFragment,
		  generateJSXElement,
		  generateChildren
		};
		return jsx$1;
	}

	/**
	 * Runtime Helper Generators
	 */

	var runtimeHelpers;
	var hasRequiredRuntimeHelpers;

	function requireRuntimeHelpers () {
		if (hasRequiredRuntimeHelpers) return runtimeHelpers;
		hasRequiredRuntimeHelpers = 1;
		const t = globalThis.__BABEL_TYPES__;
		const { escapeCSharpString } = helpers;
		requirePathAssignment();
		// Lazy load to avoid circular dependencies with jsx.cjs and expressions.cjs

		/**
		 * Generate runtime helper call for complex JSX patterns
		 * Uses MinimactHelpers.createElement() for dynamic scenarios
		 */
		function generateRuntimeHelperCall(tagName, attributes, children, component, indent) {
		  // Lazy load to avoid circular dependency
		  const { generateCSharpExpression } = requireExpressions$1();
		  const { generateJSXElement } = requireJsx$1();

		  // Build props object
		  let propsCode = 'null';
		  const regularProps = [];
		  const spreadProps = [];

		  for (const attr of attributes) {
		    if (t.isJSXSpreadAttribute(attr)) {
		      // Spread operator: {...props}
		      spreadProps.push(generateCSharpExpression(attr.argument));
		    } else if (t.isJSXAttribute(attr)) {
		      const name = attr.name.name;
		      const value = attr.value;

		      // Convert attribute value to C# expression
		      let propValue;
		      if (t.isStringLiteral(value)) {
		        propValue = `"${escapeCSharpString(value.value)}"`;
		      } else if (t.isJSXExpressionContainer(value)) {
		        // Special handling for style attribute with object expression
		        if (name === 'style' && t.isObjectExpression(value.expression)) {
		          const { convertStyleObjectToCss } = requireStyleConverter();
		          const cssString = convertStyleObjectToCss(value.expression);
		          propValue = `"${cssString}"`;
		        } else {
		          propValue = generateCSharpExpression(value.expression);
		        }
		      } else if (value === null) {
		        propValue = '"true"'; // Boolean attribute like <input disabled />
		      } else {
		        propValue = `"${value}"`;
		      }

		      regularProps.push(`${name} = ${propValue}`);
		    }
		  }

		  // Build props with potential spread merging
		  if (regularProps.length > 0 && spreadProps.length > 0) {
		    // Need to merge: ((object)new { prop1 = val1 }).MergeWith((object)spreadObj)
		    // Cast both to object to avoid dynamic dispatch issues
		    const regularPropsObj = `new { ${regularProps.join(', ')} }`;
		    propsCode = `((object)${regularPropsObj})`;
		    for (const spreadProp of spreadProps) {
		      propsCode = `${propsCode}.MergeWith((object)${spreadProp})`;
		    }
		  } else if (regularProps.length > 0) {
		    // Just regular props
		    propsCode = `new { ${regularProps.join(', ')} }`;
		  } else if (spreadProps.length > 0) {
		    // Just spread props
		    propsCode = spreadProps[0];
		    for (let i = 1; i < spreadProps.length; i++) {
		      propsCode = `((object)${propsCode}).MergeWith((object)${spreadProps[i]})`;
		    }
		  }

		  // Build children
		  const childrenArgs = [];
		  for (const child of children) {
		    if (t.isJSXText(child)) {
		      const text = child.value.trim();
		      if (text) {
		        childrenArgs.push(`"${escapeCSharpString(text)}"`);
		      }
		    } else if (t.isJSXElement(child)) {
		      childrenArgs.push(generateJSXElement(child, component, indent + 1));
		    } else if (t.isJSXExpressionContainer(child)) {
		      const expr = child.expression;

		      // Skip JSX comments (empty expressions like {/* comment */})
		      if (t.isJSXEmptyExpression(expr)) {
		        continue; // Don't add to childrenArgs
		      }

		      // Handle conditionals with JSX: {condition ? <A/> : <B/>}
		      if (t.isConditionalExpression(expr)) {
		        const { generateBooleanExpression } = requireExpressions$1();
		        const condition = generateBooleanExpression(expr.test);
		        const consequent = t.isJSXElement(expr.consequent) || t.isJSXFragment(expr.consequent)
		          ? generateJSXElement(expr.consequent, component, indent + 1)
		          : generateCSharpExpression(expr.consequent);

		        // Handle alternate - if null literal, use VNull with path
		        let alternate;
		        if (!expr.alternate || t.isNullLiteral(expr.alternate)) {
		          const exprPath = child.__minimactPath || '';
		          alternate = `new VNull("${exprPath}")`;
		        } else if (t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)) {
		          alternate = generateJSXElement(expr.alternate, component, indent + 1);
		        } else {
		          alternate = generateCSharpExpression(expr.alternate);
		        }

		        childrenArgs.push(`(${condition}) ? ${consequent} : ${alternate}`);
		      }
		      // Handle logical expressions with JSX: {condition && <Element/>}
		      else if (t.isLogicalExpression(expr) && expr.operator === '&&') {
		        const { generateBooleanExpression } = requireExpressions$1();
		        const left = generateBooleanExpression(expr.left);
		        const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
		          ? generateJSXElement(expr.right, component, indent + 1)
		          : generateCSharpExpression(expr.right);
		        const exprPath = child.__minimactPath || '';
		        childrenArgs.push(`(${left}) ? ${right} : new VNull("${exprPath}")`);
		      }
		      // Handle .map() with JSX callback
		      else if (t.isCallExpression(expr) &&
		               t.isMemberExpression(expr.callee) &&
		               t.isIdentifier(expr.callee.property, { name: 'map' })) {
		        // Lazy load generateMapExpression
		        const { generateMapExpression } = requireExpressions$1();
		        childrenArgs.push(generateMapExpression(expr, component, indent));
		      }
		      // Dynamic children (e.g., items.Select(...))
		      else {
		        childrenArgs.push(generateCSharpExpression(child.expression));
		      }
		    }
		  }

		  // Generate the createElement call
		  if (childrenArgs.length === 0) {
		    return `MinimactHelpers.createElement("${tagName}", ${propsCode})`;
		  } else if (childrenArgs.length === 1) {
		    return `MinimactHelpers.createElement("${tagName}", ${propsCode}, ${childrenArgs[0]})`;
		  } else {
		    const childrenStr = childrenArgs.join(', ');
		    return `MinimactHelpers.createElement("${tagName}", ${propsCode}, ${childrenStr})`;
		  }
		}

		/**
		 * Force runtime helper generation for a JSX node (used in conditionals/logical expressions)
		 */
		function generateRuntimeHelperForJSXNode(node, component, indent) {
		  // Lazy load to avoid circular dependency
		  const { generateCSharpExpression } = requireExpressions$1();

		  if (t.isJSXFragment(node)) {
		    // Handle fragments
		    const children = node.children;
		    const childrenArgs = [];
		    for (const child of children) {
		      if (t.isJSXText(child)) {
		        const text = child.value.trim();
		        if (text) {
		          childrenArgs.push(`"${escapeCSharpString(text)}"`);
		        }
		      } else if (t.isJSXElement(child)) {
		        childrenArgs.push(generateRuntimeHelperForJSXNode(child, component, indent + 1));
		      } else if (t.isJSXExpressionContainer(child)) {
		        // Skip JSX comments (empty expressions like {/* comment */})
		        if (t.isJSXEmptyExpression(child.expression)) {
		          continue; // Don't add to childrenArgs
		        }
		        childrenArgs.push(generateCSharpExpression(child.expression));
		      }
		    }
		    if (childrenArgs.length === 0) {
		      return 'MinimactHelpers.Fragment()';
		    }
		    return `MinimactHelpers.Fragment(${childrenArgs.join(', ')})`;
		  }

		  if (t.isJSXElement(node)) {
		    const tagName = node.openingElement.name.name;
		    const attributes = node.openingElement.attributes;
		    const children = node.children;
		    return generateRuntimeHelperCall(tagName, attributes, children, component, indent);
		  }

		  // Fallback for null/undefined nodes
		  const nodePath = node.__minimactPath || '';
		  return `new VNull("${nodePath}")`;
		}




		runtimeHelpers = {
		  generateRuntimeHelperCall,
		  generateRuntimeHelperForJSXNode
		};
		return runtimeHelpers;
	}

	/**
	 * Expression Generators
	 */

	var expressions$1;
	var hasRequiredExpressions$1;

	function requireExpressions$1 () {
		if (hasRequiredExpressions$1) return expressions$1;
		hasRequiredExpressions$1 = 1;
		const t = globalThis.__BABEL_TYPES__;
		const { escapeCSharpString } = helpers;
		const { analyzeDependencies } = dependencies;
		const { classifyNode } = classification;
		const { generateRuntimeHelperForJSXNode } = requireRuntimeHelpers();
		const { generateJSXElement } = requireJsx$1();
		requirePathAssignment();

		// Module-level variable to store current component context
		// This allows useState setter detection without threading component through all calls
		let currentComponent = null;

		/**
		 * Generate expression for use in boolean context (conditionals, logical operators)
		 * Wraps expressions in MObject for JavaScript truthiness semantics
		 */
		function generateBooleanExpression(expr) {
		  const generated = generateCSharpExpression(expr);

		  // Check if this is a member expression on dynamic object (like user.isAdmin)
		  if (t.isMemberExpression(expr) && !expr.computed && t.isIdentifier(expr.object)) {
		    // Wrap dynamic member access in MObject for proper truthiness
		    return `new MObject(${generated})`;
		  }

		  // Check if this is a simple identifier that might be dynamic
		  if (t.isIdentifier(expr)) {
		    // Wrap in MObject for null/truthiness handling
		    return `new MObject(${generated})`;
		  }

		  // For other expressions (literals, etc.), use as-is
		  return generated;
		}

		/**
		 * Generate JSX expression (e.g., {count}, {user.name})
		 */
		function generateJSXExpression(expr, component, indent) {
		  // Analyze dependencies
		  const deps = analyzeDependencies(expr, component);
		  const zone = classifyNode(deps);

		  // For hybrid zones, we need to split
		  if (zone === 'hybrid') {
		    return generateHybridExpression(expr);
		  }

		  // Handle special JSX expression types
		  if (t.isConditionalExpression(expr)) {
		    // Ternary with JSX: condition ? <A/> : <B/>
		    // Force runtime helpers for JSX in conditionals
		    const condition = generateBooleanExpression(expr.test);
		    const consequent = t.isJSXElement(expr.consequent) || t.isJSXFragment(expr.consequent)
		      ? generateRuntimeHelperForJSXNode(expr.consequent, component, indent)
		      : generateCSharpExpression(expr.consequent, false); // Normal C# expression context

		    // Handle alternate - if null literal, use VNull with path
		    let alternate;
		    if (!expr.alternate || t.isNullLiteral(expr.alternate)) {
		      const exprPath = expr.__minimactPath || '';
		      alternate = `new VNull("${exprPath}")`;
		    } else if (t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)) {
		      alternate = generateRuntimeHelperForJSXNode(expr.alternate, component, indent);
		    } else {
		      alternate = generateCSharpExpression(expr.alternate, false); // Normal C# expression context
		    }

		    return `(${condition}) ? ${consequent} : ${alternate}`;
		  }

		  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
		    // Short-circuit with JSX: condition && <Element/>
		    // Force runtime helpers for JSX in logical expressions
		    const left = generateBooleanExpression(expr.left);
		    const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
		      ? generateRuntimeHelperForJSXNode(expr.right, component, indent)
		      : generateCSharpExpression(expr.right);
		    // Get path for VNull (use the expression container's path)
		    const exprPath = expr.__minimactPath || '';
		    return `(${left}) ? ${right} : new VNull("${exprPath}")`;
		  }

		  if (t.isCallExpression(expr) &&
		      t.isMemberExpression(expr.callee) &&
		      t.isIdentifier(expr.callee.property, { name: 'map' })) {
		    // Array.map() with JSX callback
		    return generateMapExpression(expr, component, indent);
		  }

		  // Generate C# expression
		  return generateCSharpExpression(expr);
		}

		/**
		 * Generate conditional (ternary)
		 */
		function generateConditional(node, component, indent) {
		  const indentStr = '    '.repeat(indent);
		  const condition = generateCSharpExpression(node.test);
		  const consequent = generateJSXElement(node.consequent, component, indent);
		  const alternate = generateJSXElement(node.alternate, component, indent);

		  return `${indentStr}return ${condition}\n${indentStr}    ? ${consequent}\n${indentStr}    : ${alternate};`;
		}

		/**
		 * Generate short-circuit (&&)
		 */
		function generateShortCircuit(node, component, indent) {
		  const indentStr = '    '.repeat(indent);
		  const condition = generateCSharpExpression(node.left);
		  const element = generateJSXElement(node.right, component, indent);

		  return `${indentStr}if (${condition})\n${indentStr}{\n${indentStr}    return ${element};\n${indentStr}}\n${indentStr}return new VText("");`;
		}

		/**
		 * Generate .map() expression
		 */
		function generateMapExpression(node, component, indent) {
		  const array = node.callee.object;
		  const callback = node.arguments[0];

		  const arrayName = array.name || generateCSharpExpression(array);
		  const itemParam = callback.params[0].name;
		  const indexParam = callback.params[1] ? callback.params[1].name : null;
		  const body = callback.body;

		  // Track map context for event handler closure capture (nested maps)
		  const previousMapContext = component ? component.currentMapContext : null;
		  const previousParams = previousMapContext ? previousMapContext.params : [];
		  const currentParams = indexParam ? [itemParam, indexParam] : [itemParam];
		  if (component) {
		    component.currentMapContext = { params: [...previousParams, ...currentParams] };
		  }

		  let itemCode;
		  let hasBlockStatements = false;

		  if (t.isJSXElement(body)) {
		    // Direct JSX return: item => <div>...</div>
		    itemCode = generateJSXElement(body, component, indent + 1);
		  } else if (t.isBlockStatement(body)) {
		    // Block statement: item => { const x = ...; return <div>...</div>; }
		    // Need to generate a statement lambda in C#
		    hasBlockStatements = true;

		    const statements = [];
		    let returnJSX = null;

		    // Process all statements in the block
		    for (const stmt of body.body) {
		      if (t.isReturnStatement(stmt) && t.isJSXElement(stmt.argument)) {
		        returnJSX = stmt.argument;
		        // Don't add return statement to statements array yet
		      } else if (t.isVariableDeclaration(stmt)) {
		        // Convert variable declarations: const displayValue = item[field];
		        for (const decl of stmt.declarations) {
		          const varName = decl.id.name;
		          const init = decl.init ? generateCSharpExpression(decl.init) : 'null';
		          statements.push(`var ${varName} = ${init};`);
		        }
		      } else {
		        // Other statements - convert them
		        statements.push(generateCSharpStatement(stmt));
		      }
		    }

		    if (!returnJSX) {
		      console.error('[generateMapExpression] Block statement has no JSX return');
		      throw new Error('Map callback with block statement must return JSX element');
		    }

		    const jsxCode = generateJSXElement(returnJSX, component, indent + 1);
		    statements.push(`return ${jsxCode};`);

		    itemCode = statements.join(' ');
		  } else {
		    console.error('[generateMapExpression] Unsupported callback body type:', body?.type);
		    throw new Error(`Unsupported map callback body type: ${body?.type}`);
		  }

		  // Restore previous context
		  if (component) {
		    component.currentMapContext = previousMapContext;
		  }

		  // Check if array is dynamic (likely from outer .map())
		  const needsCast = arrayName.includes('.') && !arrayName.match(/^[A-Z]/); // Property access, not static class
		  const castedArray = needsCast ? `((IEnumerable<dynamic>)${arrayName})` : arrayName;

		  // C# Select supports (item, index) => ...
		  if (hasBlockStatements) {
		    // Use statement lambda: item => { statements; return jsx; }
		    if (indexParam) {
		      const lambdaExpr = `(${itemParam}, ${indexParam}) => { ${itemCode} }`;
		      const castedLambda = needsCast ? `(Func<dynamic, int, dynamic>)(${lambdaExpr})` : lambdaExpr;
		      return `${castedArray}.Select(${castedLambda}).ToArray()`;
		    } else {
		      const lambdaExpr = `${itemParam} => { ${itemCode} }`;
		      const castedLambda = needsCast ? `(Func<dynamic, dynamic>)(${lambdaExpr})` : lambdaExpr;
		      return `${castedArray}.Select(${castedLambda}).ToArray()`;
		    }
		  } else {
		    // Use expression lambda: item => jsx
		    if (indexParam) {
		      const lambdaExpr = `(${itemParam}, ${indexParam}) => ${itemCode}`;
		      const castedLambda = needsCast ? `(Func<dynamic, int, dynamic>)(${lambdaExpr})` : lambdaExpr;
		      return `${castedArray}.Select(${castedLambda}).ToArray()`;
		    } else {
		      const lambdaExpr = `${itemParam} => ${itemCode}`;
		      const castedLambda = needsCast ? `(Func<dynamic, dynamic>)(${lambdaExpr})` : lambdaExpr;
		      return `${castedArray}.Select(${castedLambda}).ToArray()`;
		    }
		  }
		}

		/**
		 * Generate C# statement from JavaScript AST node
		 */
		function generateCSharpStatement(node) {
		  if (!node) return '';

		  if (t.isExpressionStatement(node)) {
		    return generateCSharpExpression(node.expression) + ';';
		  }

		  if (t.isReturnStatement(node)) {
		    // Handle empty return statement: return; (not return null;)
		    if (node.argument === null || node.argument === undefined) {
		      return 'return;';
		    }
		    return `return ${generateCSharpExpression(node.argument)};`;
		  }

		  if (t.isThrowStatement(node)) {
		    return `throw ${generateCSharpExpression(node.argument)};`;
		  }

		  if (t.isVariableDeclaration(node)) {
		    const declarations = node.declarations.map(d => {
		      const name = d.id.name;
		      const value = generateCSharpExpression(d.init);
		      return `var ${name} = ${value};`;
		    }).join(' ');
		    return declarations;
		  }

		  if (t.isIfStatement(node)) {
		    const test = generateCSharpExpression(node.test);
		    let result = `if (${test}) {\n`;

		    // Handle consequent (then branch)
		    if (t.isBlockStatement(node.consequent)) {
		      for (const stmt of node.consequent.body) {
		        result += '    ' + generateCSharpStatement(stmt) + '\n';
		      }
		    } else {
		      result += '    ' + generateCSharpStatement(node.consequent) + '\n';
		    }

		    result += '}';

		    // Handle alternate (else branch) if it exists
		    if (node.alternate) {
		      result += ' else {\n';
		      if (t.isBlockStatement(node.alternate)) {
		        for (const stmt of node.alternate.body) {
		          result += '    ' + generateCSharpStatement(stmt) + '\n';
		        }
		      } else if (t.isIfStatement(node.alternate)) {
		        // else if
		        result += '    ' + generateCSharpStatement(node.alternate) + '\n';
		      } else {
		        result += '    ' + generateCSharpStatement(node.alternate) + '\n';
		      }
		      result += '}';
		    }

		    return result;
		  }

		  if (t.isTryStatement(node)) {
		    let result = 'try {\n';

		    // Handle try block
		    if (t.isBlockStatement(node.block)) {
		      for (const stmt of node.block.body) {
		        result += '    ' + generateCSharpStatement(stmt) + '\n';
		      }
		    }

		    result += '}';

		    // Handle catch clause
		    if (node.handler) {
		      const catchParam = node.handler.param ? node.handler.param.name : 'ex';
		      result += ` catch (Exception ${catchParam}) {\n`;

		      if (t.isBlockStatement(node.handler.body)) {
		        for (const stmt of node.handler.body.body) {
		          result += '    ' + generateCSharpStatement(stmt) + '\n';
		        }
		      }

		      result += '}';
		    }

		    // Handle finally block
		    if (node.finalizer) {
		      result += ' finally {\n';

		      if (t.isBlockStatement(node.finalizer)) {
		        for (const stmt of node.finalizer.body) {
		          result += '    ' + generateCSharpStatement(stmt) + '\n';
		        }
		      }

		      result += '}';
		    }

		    return result;
		  }

		  // Fallback: try to convert as expression
		  return generateCSharpExpression(node) + ';';
		}

		/**
		 * Generate C# expression from JS expression
		 * @param {boolean} inInterpolation - True if this expression will be inside $"{...}"
		 */
		function generateCSharpExpression(node, inInterpolation = false) {
		  if (!node) {
		    const nodePath = node?.__minimactPath || '';
		    return `new VNull("${nodePath}")`;
		  }

		  if (t.isStringLiteral(node)) {
		    // In string interpolation context, escape the quotes: \"text\"
		    // Otherwise use normal quotes: "text"
		    if (inInterpolation) {
		      return `\\"${escapeCSharpString(node.value)}\\"`;
		    } else {
		      return `"${escapeCSharpString(node.value)}"`;
		    }
		  }

		  if (t.isNumericLiteral(node)) {
		    return String(node.value);
		  }

		  if (t.isBooleanLiteral(node)) {
		    return node.value ? 'true' : 'false';
		  }

		  if (t.isNullLiteral(node)) {
		    const nodePath = node.__minimactPath || '';
		    return `new VNull("${nodePath}")`;
		  }

		  if (t.isIdentifier(node)) {
		    return node.name;
		  }

		  if (t.isAwaitExpression(node)) {
		    return `await ${generateCSharpExpression(node.argument, inInterpolation)}`;
		  }

		  // Handle TypeScript type assertions: (e.target as any) → e.target (strip the cast)
		  // In C#, we rely on dynamic typing, so type casts are usually unnecessary
		  if (t.isTSAsExpression(node)) {
		    return generateCSharpExpression(node.expression, inInterpolation);
		  }

		  // Handle TypeScript type assertions (angle bracket syntax): <any>e.target → e.target
		  if (t.isTSTypeAssertion(node)) {
		    return generateCSharpExpression(node.expression, inInterpolation);
		  }

		  // Handle optional chaining: viewModel?.userEmail → viewModel?.UserEmail
		  if (t.isOptionalMemberExpression(node)) {
		    const object = generateCSharpExpression(node.object, inInterpolation);
		    const propertyName = t.isIdentifier(node.property) ? node.property.name : null;

		    // Capitalize first letter for C# property convention (userEmail → UserEmail)
		    const csharpProperty = propertyName
		      ? propertyName.charAt(0).toUpperCase() + propertyName.slice(1)
		      : propertyName;

		    const property = node.computed
		      ? `?[${generateCSharpExpression(node.property, inInterpolation)}]`
		      : `?.${csharpProperty}`;
		    return `${object}${property}`;
		  }

		  if (t.isMemberExpression(node)) {
		    const object = generateCSharpExpression(node.object);
		    const propertyName = t.isIdentifier(node.property) ? node.property.name : null;

		    // Handle JavaScript to C# API conversions
		    if (propertyName === 'length' && !node.computed) {
		      // array.length → array.Count
		      return `${object}.Count`;
		    }

		    // Handle event object property access (e.target.value → e.Target.Value)
		    if (propertyName === 'target' && !node.computed) {
		      return `${object}.Target`;
		    }
		    if (propertyName === 'value' && !node.computed) {
		      // Capitalize for C# property convention
		      return `${object}.Value`;
		    }
		    if (propertyName === 'checked' && !node.computed) {
		      // Capitalize for C# property convention
		      return `${object}.Checked`;
		    }

		    // Handle exception properties (err.message → err.Message)
		    if (propertyName === 'message' && !node.computed) {
		      return `${object}.Message`;
		    }

		    // Handle fetch Response properties (response.ok → response.IsSuccessStatusCode)
		    if (propertyName === 'ok' && !node.computed) {
		      return `${object}.IsSuccessStatusCode`;
		    }

		    const property = node.computed
		      ? `[${generateCSharpExpression(node.property)}]`
		      : `.${propertyName}`;
		    return `${object}${property}`;
		  }

		  if (t.isArrayExpression(node)) {
		    // Check if array contains spread elements
		    const hasSpread = node.elements.some(e => t.isSpreadElement(e));

		    if (hasSpread) {
		      // Handle spread operator: [...array, item] → array.Concat(new[] { item }).ToList()
		      const parts = [];
		      let currentLiteral = [];

		      for (const element of node.elements) {
		        if (t.isSpreadElement(element)) {
		          // Flush current literal elements
		          if (currentLiteral.length > 0) {
		            const literalCode = currentLiteral.map(e => generateCSharpExpression(e)).join(', ');
		            parts.push(`new List<object> { ${literalCode} }`);
		            currentLiteral = [];
		          }
		          // Add spread array
		          parts.push(`((IEnumerable<object>)${generateCSharpExpression(element.argument)})`);
		        } else {
		          currentLiteral.push(element);
		        }
		      }

		      // Flush remaining literals
		      if (currentLiteral.length > 0) {
		        const literalCode = currentLiteral.map(e => generateCSharpExpression(e)).join(', ');
		        parts.push(`new List<object> { ${literalCode} }`);
		      }

		      // Combine with Concat
		      if (parts.length === 1) {
		        return `${parts[0]}.ToList()`;
		      } else {
		        const concats = parts.slice(1).map(p => `.Concat(${p})`).join('');
		        return `${parts[0]}${concats}.ToList()`;
		      }
		    }

		    // No spread - simple array literal
		    const elements = node.elements.map(e => generateCSharpExpression(e)).join(', ');
		    // Use List<dynamic> for empty arrays to be compatible with dynamic LINQ results
		    const listType = elements.length === 0 ? 'dynamic' : 'object';
		    return `new List<${listType}> { ${elements} }`;
		  }

		  if (t.isUnaryExpression(node)) {
		    // Handle unary expressions: !expr, -expr, +expr, etc.
		    const argument = generateCSharpExpression(node.argument, inInterpolation);
		    const operator = node.operator;
		    return `${operator}${argument}`;
		  }

		  if (t.isBinaryExpression(node)) {
		    // Helper function to get operator precedence (higher = tighter binding)
		    const getPrecedence = (op) => {
		      if (op === '*' || op === '/' || op === '%') return 3;
		      if (op === '+' || op === '-') return 2;
		      if (op === '==' || op === '!=' || op === '===' || op === '!==' ||
		          op === '<' || op === '>' || op === '<=' || op === '>=') return 1;
		      return 0;
		    };

		    const currentPrecedence = getPrecedence(node.operator);

		    // Generate left side, wrap in parentheses if needed
		    let left = generateCSharpExpression(node.left);
		    if (t.isBinaryExpression(node.left)) {
		      const leftPrecedence = getPrecedence(node.left.operator);
		      // Wrap in parentheses if left has lower precedence
		      if (leftPrecedence < currentPrecedence) {
		        left = `(${left})`;
		      }
		    }

		    // Generate right side, wrap in parentheses if needed
		    let right = generateCSharpExpression(node.right);
		    if (t.isBinaryExpression(node.right)) {
		      const rightPrecedence = getPrecedence(node.right.operator);
		      // Wrap in parentheses if right has lower or equal precedence
		      // Equal precedence on right needs parens for left-associative operators
		      if (rightPrecedence <= currentPrecedence) {
		        right = `(${right})`;
		      }
		    }

		    // Convert JavaScript operators to C# operators
		    let operator = node.operator;
		    if (operator === '===') operator = '==';
		    if (operator === '!==') operator = '!=';
		    return `${left} ${operator} ${right}`;
		  }

		  if (t.isLogicalExpression(node)) {
		    const left = generateCSharpExpression(node.left);
		    const right = generateCSharpExpression(node.right);

		    if (node.operator === '||') {
		      // JavaScript: a || b
		      // C#: a ?? b (null coalescing)
		      return `(${left}) ?? (${right})`;
		    } else if (node.operator === '&&') {
		      // Check if right side is a boolean expression (comparison, logical, etc.)
		      const rightIsBooleanExpr = t.isBinaryExpression(node.right) ||
		                                  t.isLogicalExpression(node.right) ||
		                                  t.isUnaryExpression(node.right);

		      if (rightIsBooleanExpr) {
		        // JavaScript: a && (b > 0)
		        // C#: (a) && (b > 0) - boolean AND
		        return `(${left}) && (${right})`;
		      } else {
		        // JavaScript: a && <jsx> or a && someValue
		        // C#: a != null ? value : VNull (for objects)
		        const nodePath = node.__minimactPath || '';
		        return `(${left}) != null ? (${right}) : new VNull("${nodePath}")`;
		      }
		    }

		    return `${left} ${node.operator} ${right}`;
		  }

		  if (t.isConditionalExpression(node)) {
		    // Handle ternary operator: test ? consequent : alternate
		    // Children are always in normal C# expression context, not interpolation context
		    const test = generateCSharpExpression(node.test, false);
		    const consequent = generateCSharpExpression(node.consequent, false);
		    const alternate = generateCSharpExpression(node.alternate, false);
		    return `(${test}) ? ${consequent} : ${alternate}`;
		  }

		  if (t.isCallExpression(node)) {
		    // Handle Math.max() → Math.Max()
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Math' }) &&
		        t.isIdentifier(node.callee.property, { name: 'max' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		      return `Math.Max(${args})`;
		    }

		    // Handle Math.min() → Math.Min()
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Math' }) &&
		        t.isIdentifier(node.callee.property, { name: 'min' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		      return `Math.Min(${args})`;
		    }

		    // Handle other Math methods (floor, ceil, round, pow, log, etc.) → Pascal case
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Math' })) {
		      const methodName = node.callee.property.name;
		      const pascalMethodName = methodName.charAt(0).toUpperCase() + methodName.slice(1);
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');

		      // Cast floor/ceil/round to int for array indexing compatibility
		      if (methodName === 'floor' || methodName === 'ceil' || methodName === 'round') {
		        return `(int)Math.${pascalMethodName}(${args})`;
		      }

		      return `Math.${pascalMethodName}(${args})`;
		    }

		    // Handle encodeURIComponent() → Uri.EscapeDataString()
		    if (t.isIdentifier(node.callee, { name: 'encodeURIComponent' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		      return `Uri.EscapeDataString(${args})`;
		    }

		    // Handle fetch() → HttpClient call
		    // Note: This generates a basic wrapper. Real implementation would use IHttpClientFactory
		    if (t.isIdentifier(node.callee, { name: 'fetch' })) {
		      const url = node.arguments.length > 0 ? generateCSharpExpression(node.arguments[0]) : '""';
		      // Return HttpResponseMessage (await is handled by caller)
		      return `new HttpClient().GetAsync(${url})`;
		    }

		    // Handle Promise.resolve(value) → Task.FromResult(value)
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Promise' }) &&
		        t.isIdentifier(node.callee.property, { name: 'resolve' })) {
		      if (node.arguments.length > 0) {
		        const value = generateCSharpExpression(node.arguments[0]);
		        return `Task.FromResult(${value})`;
		      }
		      return `Task.CompletedTask`;
		    }

		    // Handle Promise.reject(error) → Task.FromException(error)
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Promise' }) &&
		        t.isIdentifier(node.callee.property, { name: 'reject' })) {
		      if (node.arguments.length > 0) {
		        const error = generateCSharpExpression(node.arguments[0]);
		        return `Task.FromException(new Exception(${error}))`;
		      }
		    }

		    // Handle alert() → Console.WriteLine() (or custom alert implementation)
		    if (t.isIdentifier(node.callee, { name: 'alert' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(' + ');
		      return `Console.WriteLine(${args})`;
		    }

		    // Handle String(value) → value.ToString()
		    if (t.isIdentifier(node.callee, { name: 'String' })) {
		      if (node.arguments.length > 0) {
		        const arg = generateCSharpExpression(node.arguments[0]);
		        return `(${arg}).ToString()`;
		      }
		      return '""';
		    }

		    // Handle Object.keys() → dictionary.Keys or reflection for objects
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'Object' }) &&
		        t.isIdentifier(node.callee.property, { name: 'keys' })) {
		      if (node.arguments.length > 0) {
		        const obj = generateCSharpExpression(node.arguments[0]);
		        // For dynamic objects, cast to IDictionary and get Keys
		        return `((IDictionary<string, object>)${obj}).Keys`;
		      }
		    }

		    // Handle console.log → Console.WriteLine
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'console' }) &&
		        t.isIdentifier(node.callee.property, { name: 'log' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(' + ');
		      return `Console.WriteLine(${args})`;
		    }

		    // Handle response.json() → response.Content.ReadFromJsonAsync<dynamic>()
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'json' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      return `${object}.Content.ReadFromJsonAsync<dynamic>()`;
		    }

		    // Handle .toFixed(n) → .ToString("Fn")
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toFixed' })) {
		      let object = generateCSharpExpression(node.callee.object);

		      // Preserve parentheses for complex expressions (binary operations, conditionals, etc.)
		      // This ensures operator precedence is maintained: (price * quantity).toFixed(2) → (price * quantity).ToString("F2")
		      if (t.isBinaryExpression(node.callee.object) ||
		          t.isLogicalExpression(node.callee.object) ||
		          t.isConditionalExpression(node.callee.object) ||
		          t.isCallExpression(node.callee.object)) {
		        object = `(${object})`;
		      }

		      const decimals = node.arguments.length > 0 && t.isNumericLiteral(node.arguments[0])
		        ? node.arguments[0].value
		        : 2;
		      return `${object}.ToString("F${decimals}")`;
		    }

		    // Handle .toLocaleString() → .ToString("g") (DateTime)
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toLocaleString' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      return `${object}.ToString("g")`;
		    }

		    // Handle .toLowerCase() → .ToLower()
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toLowerCase' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      return `${object}.ToLower()`;
		    }

		    // Handle .toUpperCase() → .ToUpper()
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toUpperCase' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      return `${object}.ToUpper()`;
		    }

		    // Handle .substring(start, end) → .Substring(start, end)
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'substring' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		      return `${object}.Substring(${args})`;
		    }

		    // Handle .padStart(length, char) → .PadLeft(length, char)
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'padStart' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      const length = node.arguments[0] ? generateCSharpExpression(node.arguments[0]) : '0';
		      let padChar = node.arguments[1] ? generateCSharpExpression(node.arguments[1]) : '" "';

		      // Convert string literal "0" to char literal '0'
		      if (t.isStringLiteral(node.arguments[1]) && node.arguments[1].value.length === 1) {
		        padChar = `'${node.arguments[1].value}'`;
		      }

		      return `${object}.PadLeft(${length}, ${padChar})`;
		    }

		    // Handle .padEnd(length, char) → .PadRight(length, char)
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'padEnd' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      const length = node.arguments[0] ? generateCSharpExpression(node.arguments[0]) : '0';
		      let padChar = node.arguments[1] ? generateCSharpExpression(node.arguments[1]) : '" "';

		      // Convert string literal "0" to char literal '0'
		      if (t.isStringLiteral(node.arguments[1]) && node.arguments[1].value.length === 1) {
		        padChar = `'${node.arguments[1].value}'`;
		      }

		      return `${object}.PadRight(${length}, ${padChar})`;
		    }

		    // Handle useState/useClientState setters → SetState calls
		    if (t.isIdentifier(node.callee) && currentComponent) {
		      const setterName = node.callee.name;

		      // Check if this is a useState setter
		      const useState = [...(currentComponent.useState || []), ...(currentComponent.useClientState || [])]
		        .find(state => state.setter === setterName);

		      if (useState && node.arguments.length > 0) {
		        const newValue = generateCSharpExpression(node.arguments[0]);
		        return `SetState(nameof(${useState.name}), ${newValue})`;
		      }
		    }

		    // Handle .map() → .Select()
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'map' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      if (node.arguments.length > 0) {
		        const callback = node.arguments[0];
		        if (t.isArrowFunctionExpression(callback)) {
		          const paramNames = callback.params.map(p => p.name);
		          // C# requires parentheses for 0 or 2+ parameters
		          const params = paramNames.length === 1
		            ? paramNames[0]
		            : `(${paramNames.join(', ')})`;

		          // Handle JSX in arrow function body
		          let body;
		          if (t.isBlockStatement(callback.body)) {
		            body = `{ ${callback.body.body.map(stmt => generateCSharpStatement(stmt)).join(' ')} }`;
		          } else if (t.isJSXElement(callback.body) || t.isJSXFragment(callback.body)) {
		            // JSX element - use generateJSXElement with currentComponent context
		            // Store map context for event handler closure capture
		            // For nested maps, we need to ACCUMULATE params, not replace them
		            const previousMapContext = currentComponent ? currentComponent.currentMapContext : null;
		            const previousParams = previousMapContext ? previousMapContext.params : [];
		            if (currentComponent) {
		              // Combine previous params with current params for nested map support
		              currentComponent.currentMapContext = { params: [...previousParams, ...paramNames] };
		            }
		            body = generateJSXElement(callback.body, currentComponent, 0);
		            // Restore previous context
		            if (currentComponent) {
		              currentComponent.currentMapContext = previousMapContext;
		            }
		          } else {
		            body = generateCSharpExpression(callback.body);
		          }

		          // Cast to IEnumerable<dynamic> if we detect dynamic access
		          // Check for optional chaining or property access (likely dynamic)
		          const needsCast = object.includes('?.') || object.includes('?') || object.includes('.');
		          const castedObject = needsCast ? `((IEnumerable<dynamic>)${object})` : object;

		          // If the object needs casting (is dynamic), we also need to cast the lambda
		          // to prevent CS1977: "Cannot use a lambda expression as an argument to a dynamically dispatched operation"
		          const lambdaExpr = `${params} => ${body}`;
		          const castedLambda = needsCast ? `(Func<dynamic, dynamic>)(${lambdaExpr})` : lambdaExpr;

		          return `${castedObject}.Select(${castedLambda}).ToList()`;
		        }
		      }
		    }

		    // Generic function call
		    const callee = generateCSharpExpression(node.callee);
		    const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		    return `${callee}(${args})`;
		  }

		  if (t.isOptionalCallExpression(node)) {
		    // Handle optional call: array?.map(...)
		    // Check if this is .map() which needs to be converted to .Select()
		    if (t.isOptionalMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.property, { name: 'map' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      if (node.arguments.length > 0) {
		        const callback = node.arguments[0];
		        if (t.isArrowFunctionExpression(callback)) {
		          const paramNames = callback.params.map(p => p.name);
		          // C# requires parentheses for 0 or 2+ parameters
		          const params = paramNames.length === 1
		            ? paramNames[0]
		            : `(${paramNames.join(', ')})`;

		          // Handle JSX in arrow function body
		          let body;
		          if (t.isBlockStatement(callback.body)) {
		            body = `{ ${callback.body.body.map(stmt => generateCSharpStatement(stmt)).join(' ')} }`;
		          } else if (t.isJSXElement(callback.body) || t.isJSXFragment(callback.body)) {
		            // JSX element - use generateJSXElement with currentComponent context
		            // Store map context for event handler closure capture
		            // For nested maps, we need to ACCUMULATE params, not replace them
		            const previousMapContext = currentComponent ? currentComponent.currentMapContext : null;
		            const previousParams = previousMapContext ? previousMapContext.params : [];
		            if (currentComponent) {
		              // Combine previous params with current params for nested map support
		              currentComponent.currentMapContext = { params: [...previousParams, ...paramNames] };
		            }
		            body = generateJSXElement(callback.body, currentComponent, 0);
		            // Restore previous context
		            if (currentComponent) {
		              currentComponent.currentMapContext = previousMapContext;
		            }
		          } else {
		            body = generateCSharpExpression(callback.body);
		          }

		          // Cast to IEnumerable<dynamic> for optional chaining (likely dynamic)
		          const castedObject = `((IEnumerable<dynamic>)${object})`;

		          // Cast result to List<dynamic> for ?? operator compatibility
		          // Anonymous types from Select need explicit Cast<dynamic>() before ToList()
		          return `${castedObject}?.Select(${params} => ${body})?.Cast<dynamic>().ToList()`;
		        }
		      }
		    }

		    // Generic optional call
		    const callee = generateCSharpExpression(node.callee);
		    const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		    return `${callee}(${args})`;
		  }

		  if (t.isTemplateLiteral(node)) {
		    // Convert template literal to C# string

		    // If no expressions, use verbatim string literal (@"...") to avoid escaping issues
		    if (node.expressions.length === 0) {
		      const text = node.quasis[0].value.raw;
		      // Use verbatim string literal (@"...") for multiline or strings with special chars
		      // Escape " as "" in verbatim strings
		      const escaped = text.replace(/"/g, '""');
		      return `@"${escaped}"`;
		    }

		    // Has expressions - use C# string interpolation
		    let result = '$"';
		    for (let i = 0; i < node.quasis.length; i++) {
		      // Escape special chars in C# interpolated strings
		      let text = node.quasis[i].value.raw;
		      // Escape { and } by doubling them
		      text = text.replace(/{/g, '{{').replace(/}/g, '}}');
		      // Escape " as \"
		      text = text.replace(/"/g, '\\"');
		      result += text;

		      if (i < node.expressions.length) {
		        const expr = node.expressions[i];
		        // Wrap conditional (ternary) expressions in parentheses to avoid ':' conflict in C# interpolation
		        const exprCode = generateCSharpExpression(expr);
		        const needsParens = t.isConditionalExpression(expr);
		        result += '{' + (needsParens ? `(${exprCode})` : exprCode) + '}';
		      }
		    }
		    result += '"';
		    return result;
		  }

		  if (t.isNewExpression(node)) {
		    // Handle new Promise(resolve => setTimeout(resolve, ms)) → Task.Delay(ms)
		    if (t.isIdentifier(node.callee, { name: 'Promise' }) && node.arguments.length > 0) {
		      const callback = node.arguments[0];

		      // Check if it's the setTimeout pattern
		      if (t.isArrowFunctionExpression(callback) && callback.params.length === 1) {
		        const resolveParam = callback.params[0].name;
		        const body = callback.body;

		        // Check if body is: setTimeout(resolve, ms)
		        if (t.isCallExpression(body) &&
		            t.isIdentifier(body.callee, { name: 'setTimeout' }) &&
		            body.arguments.length === 2 &&
		            t.isIdentifier(body.arguments[0], { name: resolveParam })) {
		          const delay = generateCSharpExpression(body.arguments[1]);
		          return `Task.Delay(${delay})`;
		        }
		      }

		      // Generic Promise constructor - not directly supported in C#
		      // Return Task.CompletedTask as a fallback
		      return `Task.CompletedTask`;
		    }

		    // Handle new Date() → DateTime.Parse()
		    if (t.isIdentifier(node.callee, { name: 'Date' })) {
		      if (node.arguments.length === 0) {
		        return 'DateTime.Now';
		      } else if (node.arguments.length === 1) {
		        const arg = generateCSharpExpression(node.arguments[0]);
		        return `DateTime.Parse(${arg})`;
		      }
		    }

		    // Handle new Error() → new Exception()
		    if (t.isIdentifier(node.callee, { name: 'Error' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		      return `new Exception(${args})`;
		    }

		    // Handle other new expressions: new Foo() → new Foo()
		    const callee = generateCSharpExpression(node.callee);
		    const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		    return `new ${callee}(${args})`;
		  }

		  if (t.isObjectExpression(node)) {
		    // Convert JS object literal to C# anonymous object or Dictionary
		    // Check if any key has hyphens (invalid for C# anonymous types)
		    const hasHyphenatedKeys = node.properties.some(prop => {
		      if (t.isObjectProperty(prop)) {
		        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
		        return typeof key === 'string' && key.includes('-');
		      }
		      return false;
		    });

		    const properties = node.properties.map(prop => {
		      if (t.isObjectProperty(prop)) {
		        const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
		        const value = generateCSharpExpression(prop.value);

		        if (hasHyphenatedKeys) {
		          // Use Dictionary syntax with quoted keys
		          return `["${key}"] = ${value}`;
		        } else {
		          // Use anonymous object syntax
		          return `${key} = ${value}`;
		        }
		      }
		      return '';
		    }).filter(p => p !== '');

		    if (properties.length === 0) return 'null';

		    if (hasHyphenatedKeys) {
		      return `new Dictionary<string, object> { ${properties.join(', ')} }`;
		    } else {
		      return `new { ${properties.join(', ')} }`;
		    }
		  }

		  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
		    // Arrow function: (x) => x * 2  →  x => x * 2
		    // Function expression: function(x) { return x * 2; }  →  x => x * 2
		    const params = node.params.map(p => {
		      if (t.isIdentifier(p)) return p.name;
		      if (t.isObjectPattern(p)) return '{...}'; // Destructuring - simplified
		      return 'param';
		    }).join(', ');

		    // Wrap params in parentheses if multiple or none
		    const paramsString = node.params.length === 1 ? params : `(${params})`;

		    // Generate function body
		    let body;
		    if (t.isBlockStatement(node.body)) {
		      // Block body: (x) => { return x * 2; }
		      const statements = node.body.body.map(stmt => generateCSharpStatement(stmt)).join(' ');
		      body = `{ ${statements} }`;
		    } else {
		      // Expression body: (x) => x * 2
		      body = generateCSharpExpression(node.body);
		    }

		    return `${paramsString} => ${body}`;
		  }

		  // Fallback for unknown node types
		  const nodePath = node?.__minimactPath || '';
		  return `new VNull("${nodePath}")`;
		}

		/**
		 * Generate attribute value
		 */
		function generateAttributeValue(value) {
		  if (!value) return '""';

		  if (t.isStringLiteral(value)) {
		    return `"${escapeCSharpString(value.value)}"`;
		  }

		  if (t.isJSXExpressionContainer(value)) {
		    return generateCSharpExpression(value.expression);
		  }

		  return '""';
		}

		/**
		 * Generate hybrid expression with smart span splitting
		 */
		function generateHybridExpression(expr, component, deps, indent) {
		  // For now, return a simplified version
		  // TODO: Implement full AST splitting logic
		  return `new VText(${generateCSharpExpression(expr)})`;
		}




		/**
		 * Set the current component context for useState setter detection
		 */
		function setCurrentComponent(component) {
		  currentComponent = component;
		}

		expressions$1 = {
		  generateAttributeValue,
		  generateCSharpExpression,
		  generateCSharpStatement,
		  generateMapExpression,
		  generateConditional,
		  generateShortCircuit,
		  generateHybridExpression,
		  generateJSXExpression,
		  generateBooleanExpression,
		  setCurrentComponent
		};
		return expressions$1;
	}

	/**
	 * useStateX Extractor
	 * Extracts useStateX hook calls and analyzes transform functions for C# generation
	 */

	const t$c = globalThis.__BABEL_TYPES__;
	const { generateCSharpExpression: generateCSharpExpression$3 } = requireExpressions$1();
	const { inferType: inferType$1 } = typeConversion;

	/**
	 * Extract useStateX hook and analyze projections
	 *
	 * @example
	 * const [price, setPrice] = useStateX(99, {
	 *   targets: {
	 *     '.price-display': {
	 *       transform: v => `$${v.toFixed(2)}`,
	 *       applyIf: ctx => ctx.user.canSeePrice
	 *     }
	 *   }
	 * });
	 */
	function extractUseStateX$1(path, component) {
	  const node = path.node;

	  // Get the variable declarator (const [price, setPrice] = ...)
	  const parent = path.parentPath.node;
	  if (!t$c.isVariableDeclarator(parent) || !t$c.isArrayPattern(parent.id)) {
	    console.warn('[useStateX] Expected array pattern destructuring');
	    return;
	  }

	  const [valueBinding, setterBinding] = parent.id.elements;
	  if (!t$c.isIdentifier(valueBinding)) {
	    console.warn('[useStateX] Expected identifier for value binding');
	    return;
	  }

	  const varName = valueBinding.name;
	  const setterName = setterBinding ? setterBinding.name : `set${varName[0].toUpperCase()}${varName.slice(1)}`;

	  // Get initial value and config
	  const [initialValueArg, configArg] = node.arguments;

	  if (!configArg || !t$c.isObjectExpression(configArg)) {
	    console.warn('[useStateX] Expected config object as second argument');
	    return;
	  }

	  // Extract initial value
	  let initialValue = null;
	  let initialValueType = 'dynamic';

	  if (initialValueArg) {
	    if (t$c.isLiteral(initialValueArg)) {
	      initialValue = initialValueArg.value;
	      initialValueType = inferType$1(initialValueArg);
	    } else {
	      initialValue = generateCSharpExpression$3(initialValueArg);
	      initialValueType = 'dynamic';
	    }
	  }

	  // Extract target projections
	  const targets = extractTargets(configArg);

	  // Extract sync strategy
	  const sync = extractSyncStrategy(configArg);

	  // Store useStateX metadata
	  component.useStateX = component.useStateX || [];
	  component.useStateX.push({
	    varName,
	    setterName,
	    initialValue,
	    initialValueType,
	    targets,
	    sync
	  });

	  // Track state type
	  component.stateTypes = component.stateTypes || new Map();
	  component.stateTypes.set(varName, 'useStateX');
	}

	/**
	 * Extract target projection configurations
	 */
	function extractTargets(configObject) {
	  const targets = [];

	  // Find targets property
	  const targetsProp = configObject.properties.find(
	    p => t$c.isIdentifier(p.key) && p.key.name === 'targets'
	  );

	  if (!targetsProp || !t$c.isObjectExpression(targetsProp.value)) {
	    return targets;
	  }

	  // Process each target selector
	  targetsProp.value.properties.forEach(target => {
	    const selector = target.key.value || target.key.name;
	    const targetConfig = target.value;

	    if (!t$c.isObjectExpression(targetConfig)) {
	      return;
	    }

	    const projection = {
	      selector,
	      transform: null,
	      transformId: null,
	      transformType: 'none',
	      applyIf: null,
	      applyAs: 'textContent',
	      property: null,
	      template: null
	    };

	    // Extract each property
	    targetConfig.properties.forEach(prop => {
	      const propName = prop.key.name;
	      const propValue = prop.value;

	      switch (propName) {
	        case 'transform':
	          if (t$c.isArrowFunctionExpression(propValue) || t$c.isFunctionExpression(propValue)) {
	            // Analyze transform function
	            const transformAnalysis = analyzeTransformFunction(propValue);
	            projection.transform = transformAnalysis.csharpCode;
	            projection.transformType = transformAnalysis.type;
	          }
	          break;

	        case 'transformId':
	          if (t$c.isStringLiteral(propValue)) {
	            projection.transformId = propValue.value;
	            projection.transformType = 'registry';
	          }
	          break;

	        case 'applyIf':
	          if (t$c.isArrowFunctionExpression(propValue) || t$c.isFunctionExpression(propValue)) {
	            // Analyze applyIf condition
	            projection.applyIf = analyzeApplyIfCondition(propValue);
	          }
	          break;

	        case 'applyAs':
	          if (t$c.isStringLiteral(propValue)) {
	            projection.applyAs = propValue.value;
	          }
	          break;

	        case 'property':
	          if (t$c.isStringLiteral(propValue)) {
	            projection.property = propValue.value;
	          }
	          break;

	        case 'template':
	          if (t$c.isStringLiteral(propValue)) {
	            projection.template = propValue.value;
	          }
	          break;
	      }
	    });

	    targets.push(projection);
	  });

	  return targets;
	}

	/**
	 * Analyze transform function and generate C# equivalent
	 *
	 * Supports:
	 * - Template literals with simple expressions
	 * - Method calls (toFixed, toUpperCase, etc.)
	 * - Ternary expressions
	 * - Property access
	 */
	function analyzeTransformFunction(arrowFn) {
	  const param = arrowFn.params[0]; // 'v'
	  const paramName = param ? param.name : 'v';
	  const body = arrowFn.body;

	  // Template literal: `$${v.toFixed(2)}`
	  if (t$c.isTemplateLiteral(body)) {
	    return {
	      type: 'template',
	      csharpCode: generateCSharpFromTemplate(body, paramName)
	    };
	  }

	  // Ternary: v > 10 ? 'High' : 'Low'
	  if (t$c.isConditionalExpression(body)) {
	    return {
	      type: 'ternary',
	      csharpCode: generateCSharpFromTernary(body, paramName)
	    };
	  }

	  // Method call: v.toUpperCase()
	  if (t$c.isCallExpression(body)) {
	    return {
	      type: 'method-call',
	      csharpCode: generateCSharpFromMethodCall(body, paramName)
	    };
	  }

	  // Member expression: v.firstName
	  if (t$c.isMemberExpression(body)) {
	    return {
	      type: 'property-access',
	      csharpCode: generateCSharpFromMemberExpression(body, paramName)
	    };
	  }

	  // Fallback: complex
	  return {
	    type: 'complex',
	    csharpCode: null
	  };
	}

	/**
	 * Generate C# code from template literal
	 * Example: `$${v.toFixed(2)}` → $"${v.ToString("F2")}"
	 */
	function generateCSharpFromTemplate(templateLiteral, paramName) {
	  let csharpCode = '$"';

	  for (let i = 0; i < templateLiteral.quasis.length; i++) {
	    const quasi = templateLiteral.quasis[i];
	    csharpCode += quasi.value.raw;

	    if (i < templateLiteral.expressions.length) {
	      const expr = templateLiteral.expressions[i];
	      csharpCode += '{' + generateCSharpFromExpression(expr, paramName) + '}';
	    }
	  }

	  csharpCode += '"';
	  return csharpCode;
	}

	/**
	 * Generate C# code from ternary expression
	 * Example: v > 10 ? 'High' : 'Low' → v > 10 ? "High" : "Low"
	 */
	function generateCSharpFromTernary(ternary, paramName) {
	  const test = generateCSharpFromExpression(ternary.test, paramName);
	  const consequent = generateCSharpFromExpression(ternary.consequent, paramName);
	  const alternate = generateCSharpFromExpression(ternary.alternate, paramName);

	  return `${test} ? ${consequent} : ${alternate}`;
	}

	/**
	 * Generate C# code from method call
	 * Example: v.toFixed(2) → v.ToString("F2")
	 */
	function generateCSharpFromMethodCall(callExpr, paramName) {
	  if (t$c.isMemberExpression(callExpr.callee)) {
	    const object = generateCSharpFromExpression(callExpr.callee.object, paramName);
	    const method = callExpr.callee.property.name;
	    const args = callExpr.arguments;

	    // Map JS methods to C# equivalents
	    const methodMap = {
	      'toFixed': (args) => {
	        const decimals = args[0] && t$c.isNumericLiteral(args[0]) ? args[0].value : 2;
	        return `ToString("F${decimals}")`;
	      },
	      'toUpperCase': () => 'ToUpper()',
	      'toLowerCase': () => 'ToLower()',
	      'toString': () => 'ToString()',
	      'trim': () => 'Trim()',
	      'length': () => 'Length'
	    };

	    const csharpMethod = methodMap[method] ? methodMap[method](args) : `${method}()`;
	    return `${object}.${csharpMethod}`;
	  }

	  return 'null';
	}

	/**
	 * Generate C# code from member expression
	 * Example: v.firstName → v.FirstName
	 */
	function generateCSharpFromMemberExpression(memberExpr, paramName) {
	  const object = generateCSharpFromExpression(memberExpr.object, paramName);
	  const property = memberExpr.property.name;

	  // Pascal case the property name for C#
	  const csharpProperty = property.charAt(0).toUpperCase() + property.slice(1);

	  return `${object}.${csharpProperty}`;
	}

	/**
	 * Generate C# code from any expression
	 */
	function generateCSharpFromExpression(expr, paramName) {
	  if (t$c.isIdentifier(expr)) {
	    return expr.name === paramName || expr.name === 'v' ? 'v' : expr.name;
	  }

	  if (t$c.isStringLiteral(expr)) {
	    return `"${expr.value}"`;
	  }

	  if (t$c.isNumericLiteral(expr)) {
	    return expr.value.toString();
	  }

	  if (t$c.isBooleanLiteral(expr)) {
	    return expr.value ? 'true' : 'false';
	  }

	  if (t$c.isMemberExpression(expr)) {
	    return generateCSharpFromMemberExpression(expr, paramName);
	  }

	  if (t$c.isCallExpression(expr)) {
	    return generateCSharpFromMethodCall(expr, paramName);
	  }

	  if (t$c.isBinaryExpression(expr)) {
	    const left = generateCSharpFromExpression(expr.left, paramName);
	    const right = generateCSharpFromExpression(expr.right, paramName);
	    const operator = expr.operator;
	    return `${left} ${operator} ${right}`;
	  }

	  return 'null';
	}

	/**
	 * Analyze applyIf condition
	 * Example: ctx => ctx.user.isAdmin → "ctx => ctx.User.IsAdmin"
	 */
	function analyzeApplyIfCondition(arrowFn) {
	  const param = arrowFn.params[0]; // 'ctx'
	  const paramName = param ? param.name : 'ctx';
	  const body = arrowFn.body;

	  const csharpCondition = generateCSharpFromExpression(body, paramName);

	  return {
	    csharpCode: `${paramName} => ${csharpCondition}`,
	    type: 'arrow'
	  };
	}

	/**
	 * Extract sync strategy
	 */
	function extractSyncStrategy(configObject) {
	  const syncProp = configObject.properties.find(
	    p => t$c.isIdentifier(p.key) && p.key.name === 'sync'
	  );

	  if (!syncProp || !t$c.isStringLiteral(syncProp.value)) {
	    return 'immediate';
	  }

	  return syncProp.value.value;
	}

	var useStateX = {
	  extractUseStateX: extractUseStateX$1
	};

	/**
	 * Hook Extractors
	 */

	const t$b = globalThis.__BABEL_TYPES__;
	const { generateCSharpExpression: generateCSharpExpression$2 } = requireExpressions$1();
	const { inferType, tsTypeToCSharpType: tsTypeToCSharpType$3 } = typeConversion;
	const { extractUseStateX } = useStateX;

	/**
	 * Extract hook calls (useState, useClientState, etc.)
	 */
	function extractHook$1(path, component) {
	  const node = path.node;

	  if (!t$b.isIdentifier(node.callee)) return;

	  const hookName = node.callee.name;

	  switch (hookName) {
	    case 'useState':
	      extractUseState(path, component, 'useState');
	      break;
	    case 'useClientState':
	      extractUseState(path, component, 'useClientState');
	      break;
	    case 'useStateX':
	      extractUseStateX(path, component);
	      break;
	    case 'useEffect':
	      extractUseEffect(path, component);
	      break;
	    case 'useRef':
	      extractUseRef(path, component);
	      break;
	    case 'useMarkdown':
	      extractUseMarkdown(path, component);
	      break;
	    case 'useRazorMarkdown':
	      extractUseRazorMarkdown(path, component);
	      break;
	    case 'useTemplate':
	      extractUseTemplate(path, component);
	      break;
	    case 'useValidation':
	      extractUseValidation(path, component);
	      break;
	    case 'useModal':
	      extractUseModal(path, component);
	      break;
	    case 'useToggle':
	      extractUseToggle(path, component);
	      break;
	    case 'useDropdown':
	      extractUseDropdown(path, component);
	      break;
	    case 'usePub':
	      extractUsePub(path, component);
	      break;
	    case 'useSub':
	      extractUseSub(path, component);
	      break;
	    case 'useMicroTask':
	      extractUseMicroTask(path, component);
	      break;
	    case 'useMacroTask':
	      extractUseMacroTask(path, component);
	      break;
	    case 'useSignalR':
	      extractUseSignalR(path, component);
	      break;
	    case 'usePredictHint':
	      extractUsePredictHint(path, component);
	      break;
	    case 'useServerTask':
	      extractUseServerTask(path, component);
	      break;
	    case 'usePaginatedServerTask':
	      extractUsePaginatedServerTask(path, component);
	      break;
	    case 'useMvcState':
	      extractUseMvcState(path, component);
	      break;
	    case 'useMvcViewModel':
	      extractUseMvcViewModel(path, component);
	      break;
	  }
	}

	/**
	 * Extract useState or useClientState
	 */
	function extractUseState(path, component, hookType) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isArrayPattern(parent.id)) return;

	  const [stateVar, setterVar] = parent.id.elements;
	  const initialValue = path.node.arguments[0];

	  // Handle read-only state (no setter): const [value] = useState(...)
	  if (!stateVar) {
	    console.log(`[useState] Skipping invalid destructuring (no state variable)`);
	    return;
	  }

	  // Check if there's a generic type parameter (e.g., useState<decimal>(0))
	  let explicitType = null;
	  if (path.node.typeParameters && path.node.typeParameters.params.length > 0) {
	    const typeParam = path.node.typeParameters.params[0];
	    explicitType = tsTypeToCSharpType$3(typeParam);
	    console.log(`[useState] Found explicit type parameter for '${stateVar.name}': ${explicitType}`);
	  }

	  const stateInfo = {
	    name: stateVar.name,
	    setter: setterVar ? setterVar.name : null, // Setter is optional (read-only state)
	    initialValue: generateCSharpExpression$2(initialValue),
	    type: explicitType || inferType(initialValue) // Prefer explicit type over inferred
	  };

	  if (hookType === 'useState') {
	    component.useState.push(stateInfo);
	    component.stateTypes.set(stateVar.name, 'server');
	  } else {
	    component.useClientState.push(stateInfo);
	    component.stateTypes.set(stateVar.name, 'client');
	  }
	}

	/**
	 * Extract useEffect
	 */
	function extractUseEffect(path, component) {
	  const callback = path.node.arguments[0];
	  const dependencies = path.node.arguments[1];

	  component.useEffect.push({
	    body: callback,
	    dependencies: dependencies
	  });
	}

	/**
	 * Extract useRef
	 */
	function extractUseRef(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const refName = parent.id.name;
	  const initialValue = path.node.arguments[0];

	  component.useRef.push({
	    name: refName,
	    initialValue: generateCSharpExpression$2(initialValue)
	  });
	}

	/**
	 * Extract useMarkdown
	 */
	function extractUseMarkdown(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isArrayPattern(parent.id)) return;

	  const [contentVar, setterVar] = parent.id.elements;
	  const initialValue = path.node.arguments[0];

	  component.useMarkdown.push({
	    name: contentVar.name,
	    setter: setterVar.name,
	    initialValue: generateCSharpExpression$2(initialValue)
	  });

	  // Track as markdown state type
	  component.stateTypes.set(contentVar.name, 'markdown');
	}

	/**
	 * Extract useRazorMarkdown - markdown with Razor syntax
	 */
	function extractUseRazorMarkdown(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isArrayPattern(parent.id)) return;

	  const [contentVar, setterVar] = parent.id.elements;
	  const initialValue = path.node.arguments[0];

	  // Initialize useRazorMarkdown array if it doesn't exist
	  if (!component.useRazorMarkdown) {
	    component.useRazorMarkdown = [];
	  }

	  // Extract raw markdown string (for Razor conversion)
	  let rawMarkdown = '';
	  if (t$b.isStringLiteral(initialValue)) {
	    rawMarkdown = initialValue.value;
	  } else if (t$b.isTemplateLiteral(initialValue)) {
	    // Template literal - extract raw string
	    rawMarkdown = initialValue.quasis.map(q => q.value.raw).join('');
	  }

	  component.useRazorMarkdown.push({
	    name: contentVar.name,
	    setter: setterVar.name,
	    initialValue: rawMarkdown, // Store raw markdown for Razor conversion
	    hasRazorSyntax: true, // Will be determined by Razor detection later
	    referencedVariables: [] // Will be populated by Razor variable extraction
	  });

	  // Track as razor-markdown state type
	  component.stateTypes.set(contentVar.name, 'razor-markdown');
	}

	/**
	 * Extract useTemplate
	 */
	function extractUseTemplate(path, component) {
	  const templateName = path.node.arguments[0];
	  const templateProps = path.node.arguments[1];

	  if (t$b.isStringLiteral(templateName)) {
	    component.useTemplate = {
	      name: templateName.value,
	      props: {}
	    };

	    // Extract template props if provided
	    if (templateProps && t$b.isObjectExpression(templateProps)) {
	      for (const prop of templateProps.properties) {
	        if (t$b.isObjectProperty(prop) && t$b.isIdentifier(prop.key)) {
	          const propName = prop.key.name;
	          let propValue = '';

	          if (t$b.isStringLiteral(prop.value)) {
	            propValue = prop.value.value;
	          } else if (t$b.isNumericLiteral(prop.value)) {
	            propValue = prop.value.value.toString();
	          } else if (t$b.isBooleanLiteral(prop.value)) {
	            propValue = prop.value.value.toString();
	          }

	          component.useTemplate.props[propName] = propValue;
	        }
	      }
	    }
	  }
	}

	/**
	 * Extract useValidation
	 */
	function extractUseValidation(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const fieldName = parent.id.name;
	  const fieldKey = path.node.arguments[0];
	  const validationRules = path.node.arguments[1];

	  const validationInfo = {
	    name: fieldName,
	    fieldKey: t$b.isStringLiteral(fieldKey) ? fieldKey.value : fieldName,
	    rules: {}
	  };

	  // Extract validation rules from the object
	  if (validationRules && t$b.isObjectExpression(validationRules)) {
	    for (const prop of validationRules.properties) {
	      if (t$b.isObjectProperty(prop) && t$b.isIdentifier(prop.key)) {
	        const ruleName = prop.key.name;
	        let ruleValue = null;

	        if (t$b.isStringLiteral(prop.value)) {
	          ruleValue = prop.value.value;
	        } else if (t$b.isNumericLiteral(prop.value)) {
	          ruleValue = prop.value.value;
	        } else if (t$b.isBooleanLiteral(prop.value)) {
	          ruleValue = prop.value.value;
	        } else if (t$b.isRegExpLiteral(prop.value)) {
	          ruleValue = `/${prop.value.pattern}/${prop.value.flags || ''}`;
	        }

	        validationInfo.rules[ruleName] = ruleValue;
	      }
	    }
	  }

	  component.useValidation.push(validationInfo);
	}

	/**
	 * Extract useModal
	 */
	function extractUseModal(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const modalName = parent.id.name;

	  component.useModal.push({
	    name: modalName
	  });
	}

	/**
	 * Extract useToggle
	 */
	function extractUseToggle(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isArrayPattern(parent.id)) return;

	  const [stateVar, toggleFunc] = parent.id.elements;
	  const initialValue = path.node.arguments[0];

	  const toggleInfo = {
	    name: stateVar.name,
	    toggleFunc: toggleFunc.name,
	    initialValue: generateCSharpExpression$2(initialValue)
	  };

	  component.useToggle.push(toggleInfo);
	}

	/**
	 * Extract useDropdown
	 */
	function extractUseDropdown(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const dropdownName = parent.id.name;
	  const routeArg = path.node.arguments[0];

	  let routeReference = null;

	  // Try to extract route reference (e.g., Routes.Api.Units.GetAll)
	  if (routeArg && t$b.isMemberExpression(routeArg)) {
	    routeReference = generateCSharpExpression$2(routeArg);
	  }

	  component.useDropdown.push({
	    name: dropdownName,
	    route: routeReference
	  });
	}

	/**
	 * Extract usePub
	 */
	function extractUsePub(path, component) {
	  const parent = path.parent;
	  if (!t$b.isVariableDeclarator(parent)) return;

	  const pubName = parent.id.name;
	  const channel = path.node.arguments[0];

	  component.usePub = component.usePub || [];
	  component.usePub.push({
	    name: pubName,
	    channel: t$b.isStringLiteral(channel) ? channel.value : null
	  });
	}

	/**
	 * Extract useSub
	 */
	function extractUseSub(path, component) {
	  const parent = path.parent;
	  if (!t$b.isVariableDeclarator(parent)) return;

	  const subName = parent.id.name;
	  const channel = path.node.arguments[0];
	  const callback = path.node.arguments[1];

	  component.useSub = component.useSub || [];
	  component.useSub.push({
	    name: subName,
	    channel: t$b.isStringLiteral(channel) ? channel.value : null,
	    hasCallback: !!callback
	  });
	}

	/**
	 * Extract useMicroTask
	 */
	function extractUseMicroTask(path, component) {
	  const callback = path.node.arguments[0];

	  component.useMicroTask = component.useMicroTask || [];
	  component.useMicroTask.push({
	    body: callback
	  });
	}

	/**
	 * Extract useMacroTask
	 */
	function extractUseMacroTask(path, component) {
	  const callback = path.node.arguments[0];
	  const delay = path.node.arguments[1];

	  component.useMacroTask = component.useMacroTask || [];
	  component.useMacroTask.push({
	    body: callback,
	    delay: t$b.isNumericLiteral(delay) ? delay.value : 0
	  });
	}

	/**
	 * Extract useSignalR
	 */
	function extractUseSignalR(path, component) {
	  const parent = path.parent;
	  if (!t$b.isVariableDeclarator(parent)) return;

	  const signalRName = parent.id.name;
	  const hubUrl = path.node.arguments[0];
	  const onMessage = path.node.arguments[1];

	  component.useSignalR = component.useSignalR || [];
	  component.useSignalR.push({
	    name: signalRName,
	    hubUrl: t$b.isStringLiteral(hubUrl) ? hubUrl.value : null,
	    hasOnMessage: !!onMessage
	  });
	}

	/**
	 * Extract usePredictHint
	 */
	function extractUsePredictHint(path, component) {
	  const hintId = path.node.arguments[0];
	  const predictedState = path.node.arguments[1];

	  component.usePredictHint = component.usePredictHint || [];
	  component.usePredictHint.push({
	    hintId: t$b.isStringLiteral(hintId) ? hintId.value : null,
	    predictedState: predictedState
	  });
	}

	/**
	 * Extract useServerTask
	 *
	 * Detects: const task = useServerTask(async () => { ... }, options)
	 * Transpiles async function → C# async Task<T>
	 * Generates [ServerTask] attribute
	 */
	function extractUseServerTask(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const taskName = parent.id.name;
	  const asyncFunction = path.node.arguments[0];
	  const options = path.node.arguments[1];

	  // Validate async function
	  if (!asyncFunction || (!t$b.isArrowFunctionExpression(asyncFunction) && !t$b.isFunctionExpression(asyncFunction))) {
	    console.warn('[useServerTask] First argument must be an async function');
	    return;
	  }

	  if (!asyncFunction.async) {
	    console.warn('[useServerTask] Function must be async');
	    return;
	  }

	  // Check if streaming (async function*)
	  const isStreaming = asyncFunction.generator === true;

	  // Extract parameters
	  const parameters = asyncFunction.params.map(param => {
	    if (t$b.isIdentifier(param)) {
	      return {
	        name: param.name,
	        type: param.typeAnnotation ? extractTypeAnnotation(param.typeAnnotation) : 'object'
	      };
	    }
	    return null;
	  }).filter(Boolean);

	  // Extract options
	  let streamingEnabled = isStreaming;
	  let estimatedChunks = null;
	  let runtime = 'csharp'; // Default to C#
	  let parallel = false;

	  if (options && t$b.isObjectExpression(options)) {
	    for (const prop of options.properties) {
	      if (t$b.isObjectProperty(prop) && t$b.isIdentifier(prop.key)) {
	        if (prop.key.name === 'stream' && t$b.isBooleanLiteral(prop.value)) {
	          streamingEnabled = prop.value.value;
	        }
	        if (prop.key.name === 'estimatedChunks' && t$b.isNumericLiteral(prop.value)) {
	          estimatedChunks = prop.value.value;
	        }
	        if (prop.key.name === 'runtime' && t$b.isStringLiteral(prop.value)) {
	          runtime = prop.value.value; // 'csharp' | 'rust' | 'auto'
	        }
	        if (prop.key.name === 'parallel' && t$b.isBooleanLiteral(prop.value)) {
	          parallel = prop.value.value;
	        }
	      }
	    }
	  }

	  // Initialize component.useServerTask if needed
	  component.useServerTask = component.useServerTask || [];

	  // Store server task info
	  component.useServerTask.push({
	    name: taskName,
	    asyncFunction: asyncFunction,
	    parameters: parameters,
	    isStreaming: streamingEnabled,
	    estimatedChunks: estimatedChunks,
	    returnType: extractReturnType(asyncFunction),
	    runtime: runtime, // 'csharp' | 'rust' | 'auto'
	    parallel: parallel // Enable Rayon parallel processing
	  });
	}

	/**
	 * Extract usePaginatedServerTask hook
	 *
	 * Detects: const users = usePaginatedServerTask(async ({ page, pageSize, filters }) => { ... }, options)
	 * Generates TWO server tasks:
	 *   1. Fetch task (with page params)
	 *   2. Count task (from getTotalCount option)
	 */
	function extractUsePaginatedServerTask(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;

	  const taskName = parent.id.name;
	  const fetchFunction = path.node.arguments[0];
	  const options = path.node.arguments[1];

	  // Validate fetch function
	  if (!fetchFunction || (!t$b.isArrowFunctionExpression(fetchFunction) && !t$b.isFunctionExpression(fetchFunction))) {
	    console.warn('[usePaginatedServerTask] First argument must be an async function');
	    return;
	  }

	  if (!fetchFunction.async) {
	    console.warn('[usePaginatedServerTask] Function must be async');
	    return;
	  }

	  // Extract fetch function parameters
	  // Expected: ({ page, pageSize, filters }: PaginationParams<TFilter>) => Promise<T[]>
	  const parameters = [
	    { name: 'page', type: 'int' },
	    { name: 'pageSize', type: 'int' },
	    { name: 'filters', type: 'object' }
	  ];

	  // Extract options
	  let runtime = 'csharp'; // Default to C#
	  let parallel = false;
	  let pageSize = 20;
	  let getTotalCountFn = null;

	  if (options && t$b.isObjectExpression(options)) {
	    for (const prop of options.properties) {
	      if (t$b.isObjectProperty(prop) && t$b.isIdentifier(prop.key)) {
	        if (prop.key.name === 'runtime' && t$b.isStringLiteral(prop.value)) {
	          runtime = prop.value.value;
	        }
	        if (prop.key.name === 'parallel' && t$b.isBooleanLiteral(prop.value)) {
	          parallel = prop.value.value;
	        }
	        if (prop.key.name === 'pageSize' && t$b.isNumericLiteral(prop.value)) {
	          pageSize = prop.value.value;
	        }
	        if (prop.key.name === 'getTotalCount') {
	          getTotalCountFn = prop.value;
	        }
	      }
	    }
	  }

	  // Initialize component.useServerTask if needed
	  component.useServerTask = component.useServerTask || [];
	  component.paginatedTasks = component.paginatedTasks || [];

	  // 1. Add fetch task
	  const fetchTaskName = `${taskName}_fetch`;
	  component.useServerTask.push({
	    name: fetchTaskName,
	    asyncFunction: fetchFunction,
	    parameters: parameters,
	    isStreaming: false,
	    estimatedChunks: null,
	    returnType: 'List<object>', // Will be refined by type inference
	    runtime: runtime,
	    parallel: parallel
	  });

	  // 2. Add count task (if getTotalCount provided)
	  let countTaskName = null;
	  if (getTotalCountFn && (t$b.isArrowFunctionExpression(getTotalCountFn) || t$b.isFunctionExpression(getTotalCountFn))) {
	    countTaskName = `${taskName}_count`;

	    const countParameters = [
	      { name: 'filters', type: 'object' }
	    ];

	    component.useServerTask.push({
	      name: countTaskName,
	      asyncFunction: getTotalCountFn,
	      parameters: countParameters,
	      isStreaming: false,
	      estimatedChunks: null,
	      returnType: 'int',
	      runtime: runtime,
	      parallel: false // Count queries don't need parallelization
	    });
	  }

	  // Store pagination metadata
	  component.paginatedTasks.push({
	    name: taskName,
	    fetchTaskName: fetchTaskName,
	    countTaskName: countTaskName,
	    pageSize: pageSize,
	    runtime: runtime,
	    parallel: parallel
	  });

	  console.log(`[usePaginatedServerTask] Extracted pagination tasks for '${taskName}':`, {
	    fetch: fetchTaskName,
	    count: countTaskName,
	    runtime,
	    parallel
	  });
	}

	/**
	 * Extract TypeScript type annotation
	 */
	function extractTypeAnnotation(typeAnnotation) {
	  // Strip TSTypeAnnotation wrapper
	  const actualType = typeAnnotation.typeAnnotation || typeAnnotation;

	  if (t$b.isTSStringKeyword(actualType)) {
	    return 'string';
	  }
	  if (t$b.isTSNumberKeyword(actualType)) {
	    return 'double';
	  }
	  if (t$b.isTSBooleanKeyword(actualType)) {
	    return 'bool';
	  }
	  if (t$b.isTSArrayType(actualType)) {
	    const elementType = extractTypeAnnotation(actualType.elementType);
	    return `List<${elementType}>`;
	  }
	  if (t$b.isTSTypeReference(actualType) && t$b.isIdentifier(actualType.typeName)) {
	    return actualType.typeName.name; // Use custom type as-is
	  }

	  return 'object';
	}

	/**
	 * Extract return type from async function
	 */
	function extractReturnType(asyncFunction) {
	  // Check for explicit return type annotation
	  if (asyncFunction.returnType) {
	    const returnType = asyncFunction.returnType.typeAnnotation;

	    // Promise<T> → T
	    if (t$b.isTSTypeReference(returnType) &&
	        t$b.isIdentifier(returnType.typeName) &&
	        returnType.typeName.name === 'Promise') {
	      if (returnType.typeParameters && returnType.typeParameters.params.length > 0) {
	        return extractTypeAnnotation(returnType.typeParameters.params[0]);
	      }
	    }

	    return extractTypeAnnotation(returnType);
	  }

	  // Try to infer from return statements
	  // For now, default to object
	  return 'object';
	}

	/**
	 * Extract useMvcState hook
	 *
	 * Pattern: const [value, setValue] = useMvcState<T>('propertyName', options?)
	 *
	 * This hook accesses MVC ViewModel properties passed from the controller.
	 * The babel plugin treats these as special client-side state that maps
	 * to server ViewModel properties.
	 */
	function extractUseMvcState(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isArrayPattern(parent.id)) return;

	  const elements = parent.id.elements;
	  const propertyNameArg = path.node.arguments[0];

	  // Extract property name (must be string literal)
	  if (!t$b.isStringLiteral(propertyNameArg)) {
	    console.warn('[useMvcState] Property name must be a string literal');
	    return;
	  }

	  const propertyName = propertyNameArg.value;

	  // useMvcState can return either [value] or [value, setter]
	  // depending on mutability
	  const stateVar = elements[0];
	  const setterVar = elements.length > 1 ? elements[1] : null;

	  // Extract TypeScript generic type: useMvcState<string>('name')
	  // But prefer the type from the ViewModel interface if available (more reliable)
	  const typeParam = path.node.typeParameters?.params[0];
	  let csharpType = typeParam ? tsTypeToCSharpType$3(typeParam) : 'dynamic';

	  // Try to find the actual type from the ViewModel interface
	  const interfaceType = findViewModelPropertyType(path, propertyName);
	  if (interfaceType) {
	    csharpType = interfaceType;
	    console.log(`[useMvcState] Found type for '${propertyName}' from interface: ${interfaceType}`);
	  } else {
	    console.log(`[useMvcState] Using generic type for '${propertyName}': ${csharpType}`);
	  }

	  // Initialize useMvcState array if needed
	  component.useMvcState = component.useMvcState || [];

	  const mvcStateInfo = {
	    name: stateVar ? stateVar.name : null,
	    setter: setterVar ? setterVar.name : null,
	    propertyName: propertyName,
	    type: csharpType  // ✅ Use type from interface (preferred) or generic fallback
	  };

	  component.useMvcState.push(mvcStateInfo);

	  // Track as MVC state type
	  if (stateVar) {
	    component.stateTypes = component.stateTypes || new Map();
	    component.stateTypes.set(stateVar.name, 'mvc');
	  }
	}

	/**
	 * Extract useMvcViewModel hook
	 *
	 * Pattern: const viewModel = useMvcViewModel<TViewModel>()
	 *
	 * This hook provides read-only access to the entire MVC ViewModel.
	 * The babel plugin doesn't need to generate C# for this as it's
	 * purely client-side access to the embedded ViewModel JSON.
	 */
	function extractUseMvcViewModel(path, component) {
	  const parent = path.parent;

	  if (!t$b.isVariableDeclarator(parent)) return;
	  if (!t$b.isIdentifier(parent.id)) return;

	  const viewModelVarName = parent.id.name;

	  // Initialize useMvcViewModel array if needed
	  component.useMvcViewModel = component.useMvcViewModel || [];

	  component.useMvcViewModel.push({
	    name: viewModelVarName
	  });

	  // Note: This is primarily for documentation/tracking purposes.
	  // The actual ViewModel access happens client-side via window.__MINIMACT_VIEWMODEL__
	}

	/**
	 * Find the type of a property from the ViewModel interface
	 *
	 * Searches the AST for an interface named *ViewModel and extracts the property type
	 */
	function findViewModelPropertyType(path, propertyName, component) {
	  // Find the program (top-level) node
	  let programPath = path;
	  while (programPath && !t$b.isProgram(programPath.node)) {
	    programPath = programPath.parentPath;
	  }

	  if (!programPath) {
	    console.log(`[findViewModelPropertyType] No program path found for ${propertyName}`);
	    return null;
	  }

	  // ⚠️ CRITICAL: Check metadata first (interfaces stored before transformation)
	  // The TranspilerService stores interfaces in metadata before @babel/preset-typescript strips them
	  let viewModelInterface = null;
	  const programNode = programPath.node;

	  if (programNode.metadata && programNode.metadata.viewModelInterfaces) {
	    const interfaces = programNode.metadata.viewModelInterfaces;
	    console.log(`[findViewModelPropertyType] Found ${interfaces.length} interfaces in metadata`);

	    for (const iface of interfaces) {
	      if (iface.id && iface.id.name && iface.id.name.endsWith('ViewModel')) {
	        viewModelInterface = iface;
	        console.log(`[findViewModelPropertyType] ✅ Using interface from metadata: ${iface.id.name}`);
	        break;
	      }
	    }
	  } else {
	    // Fallback: Search program body (won't work if TypeScript preset already ran)
	    console.log(`[findViewModelPropertyType] No metadata found, searching program body`);

	    if (!programNode || !programNode.body) {
	      console.log(`[findViewModelPropertyType] No program body found`);
	      return null;
	    }

	    console.log(`[findViewModelPropertyType] Program body has ${programNode.body.length} statements`);

	    // Debug: Log all statement types
	    programNode.body.forEach((stmt, idx) => {
	      console.log(`[findViewModelPropertyType] Statement ${idx}: ${stmt.type}`);
	    });

	    // Iterate through top-level statements to find interface declarations
	    let interfaceCount = 0;
	    for (const statement of programNode.body) {
	      if (t$b.isTSInterfaceDeclaration(statement)) {
	        interfaceCount++;
	        const interfaceName = statement.id.name;
	        console.log(`[findViewModelPropertyType] Found interface #${interfaceCount}: ${interfaceName}`);

	        // Look for interfaces ending with "ViewModel"
	        if (interfaceName.endsWith('ViewModel')) {
	          viewModelInterface = statement;
	          console.log(`[findViewModelPropertyType] ✅ Using interface: ${interfaceName}`);
	          break; // Use the first matching interface
	        }
	      }
	    }

	    console.log(`[findViewModelPropertyType] Total interfaces found: ${interfaceCount}`);
	  }

	  if (!viewModelInterface) {
	    console.log(`[findViewModelPropertyType] ❌ No ViewModel interface found`);
	    return null;
	  }

	  // Find the property in the interface
	  for (const member of viewModelInterface.body.body) {
	    if (t$b.isTSPropertySignature(member)) {
	      const key = member.key;

	      if (t$b.isIdentifier(key) && key.name === propertyName) {
	        // Found the property! Extract its type
	        const typeAnnotation = member.typeAnnotation?.typeAnnotation;
	        console.log(`[findViewModelPropertyType] Found property ${propertyName}, typeAnnotation:`, typeAnnotation);
	        if (typeAnnotation) {
	          const csharpType = tsTypeToCSharpType$3(typeAnnotation);
	          console.log(`[findViewModelPropertyType] Mapped ${propertyName} type to: ${csharpType}`);
	          return csharpType;
	        }
	      }
	    }
	  }

	  console.log(`[findViewModelPropertyType] Property ${propertyName} not found in interface`);
	  return null;
	}

	var hooks = {
	  extractHook: extractHook$1,
	  extractUseState,
	  extractUseEffect,
	  extractUseRef,
	  extractUseMarkdown,
	  extractUseRazorMarkdown,
	  extractUseTemplate,
	  extractUseValidation,
	  extractUseModal,
	  extractUseToggle,
	  extractUseDropdown,
	  extractUsePub,
	  extractUseSub,
	  extractUseMicroTask,
	  extractUseMacroTask,
	  extractUseSignalR,
	  extractUsePredictHint,
	  extractUseServerTask,
	  extractUseMvcState,
	  extractUseMvcViewModel
	};

	/**
	 * Local Variables Extractor
	 */

	const t$a = globalThis.__BABEL_TYPES__;
	const { generateCSharpExpression: generateCSharpExpression$1 } = requireExpressions$1();
	const { tsTypeToCSharpType: tsTypeToCSharpType$2 } = typeConversion;

	/**
	 * Check if an expression uses external libraries
	 */
	function usesExternalLibrary(node, externalImports, visited = new WeakSet()) {
	  if (!node || visited.has(node)) return false;
	  visited.add(node);

	  // Direct identifier match
	  if (t$a.isIdentifier(node) && externalImports.has(node.name)) {
	    return true;
	  }

	  // Member expression (_.sortBy, moment().format)
	  if (t$a.isMemberExpression(node)) {
	    return usesExternalLibrary(node.object, externalImports, visited);
	  }

	  // Call expression (_.sortBy(...), moment(...))
	  if (t$a.isCallExpression(node)) {
	    return usesExternalLibrary(node.callee, externalImports, visited) ||
	           node.arguments.some(arg => usesExternalLibrary(arg, externalImports, visited));
	  }

	  // Binary/Logical expressions
	  if (t$a.isBinaryExpression(node) || t$a.isLogicalExpression(node)) {
	    return usesExternalLibrary(node.left, externalImports, visited) ||
	           usesExternalLibrary(node.right, externalImports, visited);
	  }

	  // Conditional expression
	  if (t$a.isConditionalExpression(node)) {
	    return usesExternalLibrary(node.test, externalImports, visited) ||
	           usesExternalLibrary(node.consequent, externalImports, visited) ||
	           usesExternalLibrary(node.alternate, externalImports, visited);
	  }

	  // Array expressions
	  if (t$a.isArrayExpression(node)) {
	    return node.elements.some(el => el && usesExternalLibrary(el, externalImports, visited));
	  }

	  // Object expressions
	  if (t$a.isObjectExpression(node)) {
	    return node.properties.some(prop =>
	      t$a.isObjectProperty(prop) && usesExternalLibrary(prop.value, externalImports, visited)
	    );
	  }

	  // Arrow functions and function expressions
	  if (t$a.isArrowFunctionExpression(node) || t$a.isFunctionExpression(node)) {
	    return usesExternalLibrary(node.body, externalImports, visited);
	  }

	  // Block statement
	  if (t$a.isBlockStatement(node)) {
	    return node.body.some(stmt => usesExternalLibrary(stmt, externalImports, visited));
	  }

	  // Return statement
	  if (t$a.isReturnStatement(node)) {
	    return usesExternalLibrary(node.argument, externalImports, visited);
	  }

	  // Expression statement
	  if (t$a.isExpressionStatement(node)) {
	    return usesExternalLibrary(node.expression, externalImports, visited);
	  }

	  return false;
	}

	/**
	 * Extract local variables (const/let/var) from function body
	 */
	function extractLocalVariables$1(path, component, types) {
	  const declarations = path.node.declarations;

	  for (const declarator of declarations) {
	    // Skip if it's a hook call (already handled)
	    if (t$a.isCallExpression(declarator.init)) {
	      const callee = declarator.init.callee;
	      if (t$a.isIdentifier(callee) && callee.name.startsWith('use')) {
	        continue; // Skip hook calls
	      }
	    }

	    // Check if this is an event handler (arrow function or function expression)
	    if (t$a.isIdentifier(declarator.id) && declarator.init) {
	      const varName = declarator.id.name;

	      // If it's an arrow function or function expression
	      if (t$a.isArrowFunctionExpression(declarator.init) || t$a.isFunctionExpression(declarator.init)) {
	        // Check if the function body uses external libraries
	        const usesExternal = usesExternalLibrary(declarator.init.body, component.externalImports);

	        if (usesExternal) {
	          // Mark as client-computed function
	          component.clientComputedVars.add(varName);

	          component.localVariables.push({
	            name: varName,
	            type: 'dynamic', // Will be refined to Func<> in generator
	            initialValue: 'null',
	            isClientComputed: true,
	            isFunction: true,
	            init: declarator.init
	          });
	        } else {
	          // Regular event handler
	          component.eventHandlers.push({
	            name: varName,
	            body: declarator.init.body,
	            params: declarator.init.params
	          });
	        }
	        continue;
	      }

	      // Check if this variable uses external libraries
	      const isClientComputed = usesExternalLibrary(declarator.init, component.externalImports);

	      if (isClientComputed) {
	        // Mark as client-computed
	        component.clientComputedVars.add(varName);
	      }

	      // Otherwise, treat as a regular local variable
	      const initValue = generateCSharpExpression$1(declarator.init);

	      // Try to infer type from TypeScript annotation or initial value
	      let varType = 'var'; // C# var for type inference
	      if (declarator.id.typeAnnotation?.typeAnnotation) {
	        varType = tsTypeToCSharpType$2(declarator.id.typeAnnotation.typeAnnotation);
	      }

	      component.localVariables.push({
	        name: varName,
	        type: varType,
	        initialValue: initValue,
	        isClientComputed: isClientComputed,  // NEW: Flag for client-computed
	        init: declarator.init  // NEW: Store AST node for type inference
	      });
	    }
	  }
	}

	var localVariables = {
	  extractLocalVariables: extractLocalVariables$1,
	  usesExternalLibrary
	};

	/**
	 * Prop Type Inference
	 * Infers C# types for props based on how they're used in the component
	 */

	const t$9 = globalThis.__BABEL_TYPES__;

	/**
	 * Infer prop types from usage in the component body
	 */
	function inferPropTypes$1(component, body) {
	  const propUsage = {};

	  // Initialize tracking for each prop
	  for (const prop of component.props) {
	    propUsage[prop.name] = {
	      usedAsBoolean: false,
	      usedAsNumber: false,
	      usedAsString: false,
	      usedAsArray: false,
	      usedAsObject: false,
	      hasArrayMethods: false,
	      hasNumberOperations: false
	    };
	  }

	  // Traverse the body to analyze prop usage
	  function analyzePropUsage(node) {
	    if (!node) return;

	    // Handle BlockStatement (function body)
	    if (t$9.isBlockStatement(node)) {
	      for (const statement of node.body) {
	        analyzePropUsage(statement);
	      }
	      return;
	    }

	    // Handle VariableDeclaration
	    if (t$9.isVariableDeclaration(node)) {
	      for (const declarator of node.declarations) {
	        if (declarator.init) {
	          analyzePropUsage(declarator.init);
	        }
	      }
	      return;
	    }

	    // Handle ReturnStatement
	    if (t$9.isReturnStatement(node)) {
	      analyzePropUsage(node.argument);
	      return;
	    }

	    // Handle ExpressionStatement
	    if (t$9.isExpressionStatement(node)) {
	      analyzePropUsage(node.expression);
	      return;
	    }

	    // Check if prop is used in conditional context (implies boolean)
	    if (t$9.isConditionalExpression(node)) {
	      const testName = extractPropName(node.test);
	      if (testName && propUsage[testName]) {
	        propUsage[testName].usedAsBoolean = true;
	      }
	      analyzePropUsage(node.consequent);
	      analyzePropUsage(node.alternate);
	    }

	    // Check if prop is used in logical expression (implies boolean)
	    if (t$9.isLogicalExpression(node)) {
	      const leftName = extractPropName(node.left);
	      if (leftName && propUsage[leftName]) {
	        propUsage[leftName].usedAsBoolean = true;
	      }
	      analyzePropUsage(node.right);
	    }

	    // Check if prop is used with .map(), .filter(), etc (implies array)
	    if (t$9.isCallExpression(node) && t$9.isMemberExpression(node.callee)) {
	      const objectName = extractPropName(node.callee.object);
	      const methodName = t$9.isIdentifier(node.callee.property) ? node.callee.property.name : null;

	      if (objectName && propUsage[objectName]) {
	        if (methodName === 'map' || methodName === 'filter' || methodName === 'forEach' ||
	            methodName === 'find' || methodName === 'some' || methodName === 'every' ||
	            methodName === 'reduce' || methodName === 'sort' || methodName === 'slice') {
	          propUsage[objectName].usedAsArray = true;
	          propUsage[objectName].hasArrayMethods = true;
	        }
	      }

	      // Recurse into arguments
	      for (const arg of node.arguments) {
	        analyzePropUsage(arg);
	      }
	    }

	    // Check if prop is used in arithmetic operations (implies number)
	    if (t$9.isBinaryExpression(node)) {
	      if (['+', '-', '*', '/', '%', '>', '<', '>=', '<='].includes(node.operator)) {
	        const leftName = extractPropName(node.left);
	        const rightName = extractPropName(node.right);

	        if (leftName && propUsage[leftName]) {
	          propUsage[leftName].usedAsNumber = true;
	          propUsage[leftName].hasNumberOperations = true;
	        }
	        if (rightName && propUsage[rightName]) {
	          propUsage[rightName].usedAsNumber = true;
	          propUsage[rightName].hasNumberOperations = true;
	        }
	      }

	      analyzePropUsage(node.left);
	      analyzePropUsage(node.right);
	    }

	    // Check member access for .length (could be array or string)
	    if (t$9.isMemberExpression(node)) {
	      const objectName = extractPropName(node.object);
	      const propertyName = t$9.isIdentifier(node.property) ? node.property.name : null;

	      if (objectName && propUsage[objectName]) {
	        if (propertyName === 'length') {
	          // Could be array or string, mark both
	          propUsage[objectName].usedAsArray = true;
	          propUsage[objectName].usedAsString = true;
	        } else if (propertyName) {
	          // Accessing a property implies object
	          propUsage[objectName].usedAsObject = true;
	        }
	      }

	      analyzePropUsage(node.object);
	      if (node.computed) {
	        analyzePropUsage(node.property);
	      }
	    }

	    // Recurse into JSX elements
	    if (t$9.isJSXElement(node)) {
	      for (const child of node.children) {
	        analyzePropUsage(child);
	      }
	      for (const attr of node.openingElement.attributes) {
	        if (t$9.isJSXAttribute(attr) && t$9.isJSXExpressionContainer(attr.value)) {
	          analyzePropUsage(attr.value.expression);
	        }
	      }
	    }

	    if (t$9.isJSXExpressionContainer(node)) {
	      analyzePropUsage(node.expression);
	    }

	    // Recurse into arrow functions
	    if (t$9.isArrowFunctionExpression(node)) {
	      analyzePropUsage(node.body);
	    }

	    // Recurse into arrays
	    if (Array.isArray(node)) {
	      for (const item of node) {
	        analyzePropUsage(item);
	      }
	    }
	  }

	  analyzePropUsage(body);

	  // Now infer types based on usage patterns
	  for (const prop of component.props) {
	    if (prop.type !== 'dynamic') {
	      // Already has explicit type from TypeScript, don't override
	      continue;
	    }

	    const usage = propUsage[prop.name];

	    if (usage.hasArrayMethods) {
	      // Definitely an array if array methods are called
	      prop.type = 'List<dynamic>';
	    } else if (usage.usedAsArray && !usage.hasNumberOperations) {
	      // Used as array (e.g., .length on array)
	      prop.type = 'List<dynamic>';
	    } else if (usage.usedAsBoolean && !usage.usedAsNumber && !usage.usedAsString && !usage.usedAsObject && !usage.usedAsArray) {
	      // Used only as boolean
	      prop.type = 'bool';
	    } else if (usage.hasNumberOperations && !usage.usedAsBoolean && !usage.usedAsArray) {
	      // Used in arithmetic operations
	      prop.type = 'double';
	    } else if (usage.usedAsObject && !usage.usedAsArray && !usage.usedAsBoolean) {
	      // Used as object with property access
	      prop.type = 'dynamic';
	    } else {
	      // Keep as dynamic for complex cases
	      prop.type = 'dynamic';
	    }
	  }
	}

	/**
	 * Extract prop name from an expression
	 */
	function extractPropName(node) {
	  if (t$9.isIdentifier(node)) {
	    return node.name;
	  }
	  if (t$9.isMemberExpression(node)) {
	    return extractPropName(node.object);
	  }
	  return null;
	}

	var propTypeInference = {
	  inferPropTypes: inferPropTypes$1
	};

	/**
	 * Template Extractor for Hot Reload
	 *
	 * Extracts parameterized templates from JSX text nodes for instant hot reload.
	 * This enables 100% coverage with minimal memory (2KB vs 100KB per component).
	 *
	 * Architecture:
	 * - Build time: Extract templates with {0}, {1} placeholders
	 * - Runtime: Re-hydrate templates with current state values
	 * - Hot reload: Send template patches instead of re-rendering
	 */

	const t$8 = globalThis.__BABEL_TYPES__;
	const { getPathFromNode, getPathSegmentsFromNode } = requirePathAssignment();

	/**
	 * Shared helper: Extract identifiers from expression (module-level for reuse)
	 */
	function extractIdentifiersShared(expr, result) {
	  if (t$8.isIdentifier(expr)) {
	    result.push(expr.name);
	  } else if (t$8.isBinaryExpression(expr) || t$8.isLogicalExpression(expr)) {
	    extractIdentifiersShared(expr.left, result);
	    extractIdentifiersShared(expr.right, result);
	  } else if (t$8.isUnaryExpression(expr)) {
	    extractIdentifiersShared(expr.argument, result);
	  } else if (t$8.isMemberExpression(expr)) {
	    result.push(buildMemberPathShared(expr));
	  }
	}

	/**
	 * Shared helper: Build member expression path
	 */
	function buildMemberPathShared(expr) {
	  const parts = [];
	  let current = expr;

	  while (t$8.isMemberExpression(current)) {
	    if (t$8.isIdentifier(current.property)) {
	      parts.unshift(current.property.name);
	    }
	    current = current.object;
	  }

	  if (t$8.isIdentifier(current)) {
	    parts.unshift(current.name);
	  }

	  return parts.join('.');
	}

	/**
	 * Shared helper: Extract method call binding
	 * Handles: price.toFixed(2), text.toLowerCase(), etc.
	 */
	function extractMethodCallBindingShared(expr) {
	  const callee = expr.callee;

	  if (!t$8.isMemberExpression(callee) && !t$8.isOptionalMemberExpression(callee)) {
	    return null;
	  }

	  const methodName = t$8.isIdentifier(callee.property) ? callee.property.name : null;
	  if (!methodName) return null;

	  const transformMethods = [
	    'toFixed', 'toString', 'toLowerCase', 'toUpperCase',
	    'trim', 'trimStart', 'trimEnd'
	  ];

	  if (!transformMethods.includes(methodName)) {
	    return null;
	  }

	  let binding = null;
	  if (t$8.isMemberExpression(callee.object)) {
	    binding = buildMemberPathShared(callee.object);
	  } else if (t$8.isIdentifier(callee.object)) {
	    binding = callee.object.name;
	  } else if (t$8.isBinaryExpression(callee.object)) {
	    const identifiers = [];
	    extractIdentifiersShared(callee.object, identifiers);
	    binding = `__expr__:${identifiers.join(',')}`;
	  }

	  if (!binding) return null;

	  const args = expr.arguments.map(arg => {
	    if (t$8.isNumericLiteral(arg)) return arg.value;
	    if (t$8.isStringLiteral(arg)) return arg.value;
	    if (t$8.isBooleanLiteral(arg)) return arg.value;
	    return null;
	  }).filter(v => v !== null);

	  return {
	    transform: methodName,
	    binding: binding,
	    args: args
	  };
	}

	/**
	 * Check if expression is a .map() call (including chained calls like .filter().map())
	 */
	function isMapCallExpression(expr) {
	  if (!t$8.isCallExpression(expr)) {
	    return false;
	  }

	  // Check if it's a direct .map() call
	  if (t$8.isMemberExpression(expr.callee) &&
	      t$8.isIdentifier(expr.callee.property) &&
	      expr.callee.property.name === 'map') {
	    return true;
	  }

	  // Check if it's a chained call ending in .map()
	  // e.g., items.filter(...).map(...), items.slice(0, 10).map(...)
	  let current = expr;
	  while (t$8.isCallExpression(current)) {
	    if (t$8.isMemberExpression(current.callee) &&
	        t$8.isIdentifier(current.callee.property) &&
	        current.callee.property.name === 'map') {
	      return true;
	    }
	    // Move to the next call in the chain
	    if (t$8.isMemberExpression(current.callee)) {
	      current = current.callee.object;
	    } else {
	      break;
	    }
	  }

	  return false;
	}

	/**
	 * Shared helper: Extract binding from expression
	 */
	function extractBindingShared(expr, component) {
	  if (t$8.isIdentifier(expr)) {
	    return expr.name;
	  } else if (t$8.isMemberExpression(expr)) {
	    return buildMemberPathShared(expr);
	  } else if (t$8.isCallExpression(expr)) {
	    // First try method call binding (toFixed, etc.)
	    const methodBinding = extractMethodCallBindingShared(expr);
	    if (methodBinding) {
	      return methodBinding;
	    }

	    // Otherwise, handle chained method calls: todo.text.substring(0, 10).toUpperCase()
	    return extractComplexCallExpression(expr);
	  } else if (t$8.isBinaryExpression(expr)) {
	    // Handle binary expressions: todo.priority + 1, price * quantity, etc.
	    return extractBinaryExpressionBinding(expr);
	  } else if (t$8.isLogicalExpression(expr)) {
	    // Handle logical expressions: todo.dueDate || 'No due date'
	    return extractLogicalExpressionBinding(expr);
	  } else if (t$8.isUnaryExpression(expr)) {
	    // Handle unary expressions: !todo.completed
	    return extractUnaryExpressionBinding(expr);
	  } else {
	    return null;
	  }
	}

	/**
	 * Extract binding from binary expression
	 * Examples: todo.priority + 1, price * quantity, index * 2 + 1
	 */
	function extractBinaryExpressionBinding(expr) {
	  const identifiers = [];
	  extractIdentifiersShared(expr, identifiers);

	  // Use __expr__ prefix to indicate this is a computed expression
	  return `__expr__:${identifiers.join(',')}`;
	}

	/**
	 * Extract binding from logical expression
	 * Examples: todo.dueDate || 'No due date', condition && value
	 */
	function extractLogicalExpressionBinding(expr) {
	  const identifiers = [];
	  extractIdentifiersShared(expr, identifiers);

	  // Use __expr__ prefix to indicate this is a computed expression
	  return `__expr__:${identifiers.join(',')}`;
	}

	/**
	 * Extract binding from unary expression
	 * Examples: !todo.completed, -value
	 */
	function extractUnaryExpressionBinding(expr) {
	  const identifiers = [];
	  extractIdentifiersShared(expr, identifiers);

	  // Use __expr__ prefix to indicate this is a computed expression
	  return `__expr__:${identifiers.join(',')}`;
	}

	/**
	 * Extract binding from complex call expression (non-transform methods)
	 * Examples: todo.text.substring(0, 10).toUpperCase(), array.concat(other)
	 */
	function extractComplexCallExpression(expr) {
	  const identifiers = [];
	  extractIdentifiersShared(expr, identifiers);

	  if (identifiers.length === 0) {
	    return null;
	  }

	  // Use __expr__ prefix to indicate this is a computed expression
	  return `__expr__:${identifiers.join(',')}`;
	}

	/**
	 * Shared helper: Extract template literal (module-level for reuse)
	 */
	function extractTemplateLiteralShared(node, component) {
	  let templateStr = '';
	  const bindings = [];
	  const slots = [];
	  const transforms = [];
	  const conditionals = [];

	  for (let i = 0; i < node.quasis.length; i++) {
	    const quasi = node.quasis[i];
	    templateStr += quasi.value.raw;

	    if (i < node.expressions.length) {
	      const expr = node.expressions[i];
	      slots.push(templateStr.length);
	      templateStr += `{${i}}`;

	      const binding = extractBindingShared(expr);

	      if (binding && typeof binding === 'object' && binding.transform) {
	        bindings.push(binding.binding);
	        transforms.push({
	          slotIndex: i,
	          method: binding.transform,
	          args: binding.args
	        });
	      } else if (binding) {
	        bindings.push(binding);
	      } else {
	        bindings.push('__complex__');
	      }
	    }
	  }

	  const result = {
	    template: templateStr,
	    bindings,
	    slots,
	    type: 'attribute'
	  };

	  if (transforms.length > 0) {
	    result.transforms = transforms;
	  }
	  if (conditionals.length > 0) {
	    result.conditionals = conditionals;
	  }

	  return result;
	}

	/**
	 * Extract all templates from JSX render body
	 *
	 * Returns a map of node paths to templates:
	 * {
	 *   "div[0].h1[0].text": {
	 *     template: "Count: {0}",
	 *     bindings: ["count"],
	 *     slots: [7],
	 *     path: [0, 0]
	 *   }
	 * }
	 */
	function extractTemplates$1(renderBody, component) {
	  if (!renderBody) return {};

	  const templates = {};

	  /**
	   * Traverse JSX tree and extract text templates
	   */
	  function traverseJSX(node, parentPath = [], siblingCounts = {}) {
	    if (t$8.isJSXElement(node)) {
	      const tagName = node.openingElement.name.name;

	      // 🔥 USE PRE-ASSIGNED HEX PATH (no recalculation!)
	      const pathKey = node.__minimactPath || null;
	      if (!pathKey) {
	        throw new Error(`[Template Extractor] No __minimactPath found on <${tagName}>. Did assignPathsToJSX run first?`);
	      }

	      // For backward compatibility with attribute extraction that expects array paths
	      const currentPath = getPathSegmentsFromNode(node);

	      // Process children
	      let textNodeIndex = 0;

	      // First pass: Identify text/expression children and check for mixed content
	      const textChildren = [];
	      let hasTextNodes = false;
	      let hasExpressionNodes = false;

	      for (const child of node.children) {
	        if (t$8.isJSXText(child)) {
	          const text = child.value.trim();
	          if (text) {
	            textChildren.push(child);
	            hasTextNodes = true;
	          }
	        } else if (t$8.isJSXExpressionContainer(child)) {
	          const expr = child.expression;

	          // Skip structural JSX
	          const isStructural = t$8.isJSXElement(expr) ||
	                               t$8.isJSXFragment(expr) ||
	                               t$8.isJSXEmptyExpression(expr) ||
	                               (t$8.isLogicalExpression(expr) &&
	                                (t$8.isJSXElement(expr.right) || t$8.isJSXFragment(expr.right))) ||
	                               (t$8.isConditionalExpression(expr) &&
	                                (t$8.isJSXElement(expr.consequent) || t$8.isJSXElement(expr.alternate) ||
	                                 t$8.isJSXFragment(expr.consequent) || t$8.isJSXFragment(expr.alternate))) ||
	                               isMapCallExpression(expr);

	          if (!isStructural) {
	            textChildren.push(child);
	            hasExpressionNodes = true;
	          }
	        }
	      }

	      // Second pass: Process text content
	      if (textChildren.length > 0) {
	        // Check if this is mixed content (text + expressions together)
	        const isMixedContent = hasTextNodes && hasExpressionNodes;

	        if (isMixedContent) {
	          // Mixed content: process all children together as one template
	          // Use the first child's hex path as the template path
	          const firstTextChild = textChildren[0];
	          const textPath = firstTextChild.__minimactPath || `${pathKey}.text[${textNodeIndex}]`;

	          const template = extractTextTemplate(node.children, currentPath);
	          if (template) {
	            console.log(`[Template Extractor] Found mixed content in <${tagName}>: "${template.template.substring(0, 50)}" (path: ${textPath})`);
	            templates[textPath] = template;
	            textNodeIndex++;
	          }
	        } else {
	          // Pure text or pure expressions: process each separately
	          for (const child of textChildren) {
	            if (t$8.isJSXText(child)) {
	              const text = child.value.trim();
	              if (text) {
	                // 🔥 USE PRE-ASSIGNED HEX PATH for text nodes
	                const textPath = child.__minimactPath || `${pathKey}.text[${textNodeIndex}]`;
	                console.log(`[Template Extractor] Found static text in <${tagName}>: "${text}" (path: ${textPath})`);
	                templates[textPath] = {
	                  template: text,
	                  bindings: [],
	                  slots: [],
	                  path: getPathSegmentsFromNode(child),
	                  type: 'static'
	                };
	                textNodeIndex++;
	              }
	            } else if (t$8.isJSXExpressionContainer(child)) {
	              // Pure expression: extract template for this child only
	              // 🔥 USE PRE-ASSIGNED HEX PATH for expression containers
	              const exprPath = child.__minimactPath || `${pathKey}.text[${textNodeIndex}]`;

	              const template = extractTextTemplate([child], currentPath);
	              if (template) {
	                console.log(`[Template Extractor] Found dynamic expression in <${tagName}>: "${template.template}" (path: ${exprPath})`);
	                templates[exprPath] = template;
	                textNodeIndex++;
	              }
	            }
	          }
	        }
	      }

	      // Third pass: Traverse JSXElement children
	      const childSiblingCounts = {}; // Fresh sibling counts for children
	      for (const child of node.children) {
	        if (t$8.isJSXElement(child)) {
	          traverseJSX(child, currentPath, childSiblingCounts);
	        } else if (t$8.isJSXExpressionContainer(child)) {
	          const expr = child.expression;

	          // Traverse conditional JSX branches to extract templates from their content
	          // This handles: {condition && <div>...</div>} and {condition ? <A/> : <B/>}
	          if (t$8.isLogicalExpression(expr) && expr.operator === '&&') {
	            // Logical AND: {isAdmin && <div>Admin Panel</div>}
	            if (t$8.isJSXElement(expr.right)) {
	              console.log(`[Template Extractor] Traversing conditional branch (&&) in <${tagName}>`);
	              traverseJSX(expr.right, currentPath, childSiblingCounts);
	            }
	          } else if (t$8.isConditionalExpression(expr)) {
	            // Ternary: {isAdmin ? <AdminPanel/> : <UserPanel/>}
	            if (t$8.isJSXElement(expr.consequent)) {
	              console.log(`[Template Extractor] Traversing conditional branch (? consequent) in <${tagName}>`);
	              traverseJSX(expr.consequent, currentPath, childSiblingCounts);
	            }
	            if (t$8.isJSXElement(expr.alternate)) {
	              console.log(`[Template Extractor] Traversing conditional branch (? alternate) in <${tagName}>`);
	              traverseJSX(expr.alternate, currentPath, childSiblingCounts);
	            }
	          }
	        }
	      }
	    } else if (t$8.isJSXFragment(node)) {
	      // Handle fragments
	      const childSiblingCounts = {}; // Fresh sibling counts for fragment children
	      for (const child of node.children) {
	        if (t$8.isJSXElement(child)) {
	          traverseJSX(child, parentPath, childSiblingCounts);
	        }
	      }
	    }
	  }

	  /**
	   * Extract template from mixed text/expression children
	   * Example: <h1>Count: {count}</h1> → "Count: {0}"
	   */
	  function extractTextTemplate(children, currentPath, textIndex) {
	    let templateStr = '';
	    const bindings = [];
	    const slots = [];
	    let paramIndex = 0;
	    let hasExpressions = false;
	    let conditionalTemplates = null;
	    let transformMetadata = null;
	    let nullableMetadata = null;

	    for (const child of children) {
	      if (t$8.isJSXText(child)) {
	        const text = child.value;
	        templateStr += text;
	      } else if (t$8.isJSXExpressionContainer(child)) {
	        hasExpressions = true;

	        // Special case: Template literal inside JSX expression container
	        // Example: {`${(discount * 100).toFixed(0)}%`}
	        if (t$8.isTemplateLiteral(child.expression)) {
	          const templateResult = extractTemplateLiteralShared(child.expression);
	          if (templateResult) {
	            // Merge the template literal's content into the current template
	            templateStr += templateResult.template;
	            // Add the template literal's bindings
	            for (const binding of templateResult.bindings) {
	              bindings.push(binding);
	            }
	            // Store transforms and conditionals if present
	            if (templateResult.transforms && templateResult.transforms.length > 0) {
	              transformMetadata = templateResult.transforms[0]; // Simplified: take first transform
	            }
	            if (templateResult.conditionals && templateResult.conditionals.length > 0) {
	              conditionalTemplates = {
	                true: templateResult.conditionals[0].trueValue,
	                false: templateResult.conditionals[0].falseValue
	              };
	            }
	            paramIndex++;
	            continue; // Skip normal binding extraction
	          }
	        }

	        const binding = extractBinding(child.expression);

	        if (binding && typeof binding === 'object' && binding.conditional) {
	          // Conditional binding (ternary)
	          slots.push(templateStr.length);
	          templateStr += `{${paramIndex}}`;
	          bindings.push(binding.conditional);

	          // Store conditional template values
	          conditionalTemplates = {
	            true: binding.trueValue,
	            false: binding.falseValue
	          };

	          paramIndex++;
	        } else if (binding && typeof binding === 'object' && binding.transform) {
	          // Phase 1: Transform binding (method call)
	          slots.push(templateStr.length);
	          templateStr += `{${paramIndex}}`;
	          bindings.push(binding.binding);

	          // Store transform metadata
	          transformMetadata = {
	            method: binding.transform,
	            args: binding.args
	          };

	          paramIndex++;
	        } else if (binding && typeof binding === 'object' && binding.nullable) {
	          // Phase 2: Nullable binding (optional chaining)
	          slots.push(templateStr.length);
	          templateStr += `{${paramIndex}}`;
	          bindings.push(binding.binding);

	          // Mark as nullable
	          nullableMetadata = true;

	          paramIndex++;
	        } else if (binding) {
	          // Simple binding (string)
	          slots.push(templateStr.length);
	          templateStr += `{${paramIndex}}`;
	          bindings.push(binding);
	          paramIndex++;
	        } else {
	          // Complex expression - can't template it
	          templateStr += `{${paramIndex}}`;
	          bindings.push('__complex__');
	          paramIndex++;
	        }
	      }
	    }

	    // Clean up whitespace
	    templateStr = templateStr.trim();

	    if (!hasExpressions) return null;

	    // Determine template type
	    let templateType = 'dynamic';
	    if (conditionalTemplates) {
	      templateType = 'conditional';
	    } else if (transformMetadata) {
	      templateType = 'transform';
	    } else if (nullableMetadata) {
	      templateType = 'nullable';
	    }

	    const result = {
	      template: templateStr,
	      bindings,
	      slots,
	      path: currentPath,  // Already has full hex path from getPathSegmentsFromNode
	      type: templateType
	    };

	    // Add conditional template values if present
	    if (conditionalTemplates) {
	      result.conditionalTemplates = conditionalTemplates;
	    }

	    // Add transform metadata if present
	    if (transformMetadata) {
	      result.transform = transformMetadata;
	    }

	    // Add nullable flag if present
	    if (nullableMetadata) {
	      result.nullable = true;
	    }

	    return result;
	  }

	  /**
	   * Extract binding name from expression
	   * Supports:
	   * - Identifiers: {count}
	   * - Member expressions: {user.name}
	   * - Simple operations: {count + 1}
	   * - Conditionals: {isExpanded ? 'Hide' : 'Show'}
	   * - Method calls: {price.toFixed(2)}
	   * - Optional chaining: {viewModel?.userEmail}
	   */
	  function extractBinding(expr, component) {
	    if (t$8.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$8.isMemberExpression(expr)) {
	      return buildMemberPath(expr);
	    } else if (t$8.isOptionalMemberExpression(expr)) {
	      // Phase 2: Optional chaining (viewModel?.userEmail)
	      return extractOptionalChainBinding(expr);
	    } else if (t$8.isCallExpression(expr)) {
	      // Phase 1: Method calls (price.toFixed(2))
	      return extractMethodCallBinding(expr);
	    } else if (t$8.isBinaryExpression(expr) || t$8.isUnaryExpression(expr)) {
	      // Simple operations - extract all identifiers
	      const identifiers = [];
	      extractIdentifiers(expr, identifiers);
	      return identifiers.join('.');
	    } else if (t$8.isConditionalExpression(expr)) {
	      // Ternary expression: {isExpanded ? 'Hide' : 'Show'}
	      // Return special marker that will be processed into conditional template
	      return extractConditionalBinding(expr);
	    } else {
	      // Complex expression
	      return null;
	    }
	  }

	  /**
	   * Extract conditional binding from ternary expression
	   * Returns object with test identifier and consequent/alternate values
	   * Example: isExpanded ? 'Hide' : 'Show'
	   * Returns: { conditional: 'isExpanded', trueValue: 'Hide', falseValue: 'Show' }
	   */
	  function extractConditionalBinding(expr) {
	    // Check if test is a simple identifier
	    if (!t$8.isIdentifier(expr.test)) {
	      // Complex test condition - mark as complex
	      return null;
	    }

	    // Check if consequent and alternate are literals
	    const trueValue = extractLiteralValue(expr.consequent);
	    const falseValue = extractLiteralValue(expr.alternate);

	    if (trueValue === null || falseValue === null) {
	      // Not simple literals - mark as complex
	      return null;
	    }

	    // Return conditional template metadata
	    return {
	      conditional: expr.test.name,
	      trueValue,
	      falseValue
	    };
	  }

	  /**
	   * Extract literal value from node (string, number, boolean)
	   */
	  function extractLiteralValue(node) {
	    if (t$8.isStringLiteral(node)) {
	      return node.value;
	    } else if (t$8.isNumericLiteral(node)) {
	      return node.value.toString();
	    } else if (t$8.isBooleanLiteral(node)) {
	      return node.value.toString();
	    } else {
	      return null;
	    }
	  }

	  /**
	   * Extract method call binding (Phase 1)
	   * Handles: price.toFixed(2), text.toLowerCase(), etc.
	   * Returns: { transform: 'toFixed', binding: 'price', args: [2] }
	   */
	  function extractMethodCallBinding(expr) {
	    const callee = expr.callee;

	    // Only handle method calls (obj.method()), not function calls (func())
	    if (!t$8.isMemberExpression(callee) && !t$8.isOptionalMemberExpression(callee)) {
	      return null;
	    }

	    const methodName = t$8.isIdentifier(callee.property) ? callee.property.name : null;
	    if (!methodName) {
	      return null;
	    }

	    // Supported transformation methods
	    const transformMethods = [
	      'toFixed', 'toString', 'toLowerCase', 'toUpperCase',
	      'trim', 'trimStart', 'trimEnd'
	    ];

	    if (!transformMethods.includes(methodName)) {
	      return null; // Unsupported method - mark as complex
	    }

	    // Extract the object being called (price from price.toFixed(2))
	    let binding = null;
	    if (t$8.isMemberExpression(callee.object)) {
	      binding = buildMemberPath(callee.object);
	    } else if (t$8.isOptionalMemberExpression(callee.object)) {
	      binding = buildOptionalMemberPath(callee.object);
	    } else if (t$8.isIdentifier(callee.object)) {
	      binding = callee.object.name;
	    } else if (t$8.isBinaryExpression(callee.object)) {
	      // Handle expressions like (discount * 100).toFixed(0)
	      // Extract all identifiers from the binary expression
	      const identifiers = [];
	      extractIdentifiers(callee.object, identifiers);
	      binding = `__expr__:${identifiers.join(',')}`;
	    }

	    if (!binding) {
	      return null; // Can't extract binding
	    }

	    // Extract method arguments (e.g., 2 from toFixed(2))
	    const args = expr.arguments.map(arg => {
	      if (t$8.isNumericLiteral(arg)) return arg.value;
	      if (t$8.isStringLiteral(arg)) return arg.value;
	      if (t$8.isBooleanLiteral(arg)) return arg.value;
	      return null;
	    }).filter(v => v !== null);

	    // Return transform binding metadata
	    return {
	      transform: methodName,
	      binding: binding,
	      args: args
	    };
	  }

	  /**
	   * Extract optional chaining binding (Phase 2)
	   * Handles: viewModel?.userEmail, obj?.prop1?.prop2
	   * Returns: { nullable: true, binding: 'viewModel.userEmail' }
	   */
	  function extractOptionalChainBinding(expr) {
	    const path = buildOptionalMemberPath(expr);

	    if (!path) {
	      return null; // Can't build path
	    }

	    return {
	      nullable: true,
	      binding: path
	    };
	  }

	  /**
	   * Build optional member expression path: viewModel?.userEmail → "viewModel.userEmail"
	   */
	  function buildOptionalMemberPath(expr) {
	    const parts = [];
	    let current = expr;

	    while (t$8.isOptionalMemberExpression(current) || t$8.isMemberExpression(current)) {
	      if (t$8.isIdentifier(current.property)) {
	        parts.unshift(current.property.name);
	      } else {
	        return null; // Computed property
	      }
	      current = current.object;
	    }

	    if (t$8.isIdentifier(current)) {
	      parts.unshift(current.name);
	      return parts.join('.');
	    }

	    return null;
	  }

	  /**
	   * Build member expression path: user.name → "user.name"
	   */
	  function buildMemberPath(expr) {
	    const parts = [];
	    let current = expr;

	    while (t$8.isMemberExpression(current)) {
	      if (t$8.isIdentifier(current.property)) {
	        parts.unshift(current.property.name);
	      }
	      current = current.object;
	    }

	    if (t$8.isIdentifier(current)) {
	      parts.unshift(current.name);
	    }

	    return parts.join('.');
	  }

	  /**
	   * Extract all identifiers from expression
	   */
	  function extractIdentifiers(expr, result) {
	    if (t$8.isIdentifier(expr)) {
	      result.push(expr.name);
	    } else if (t$8.isBinaryExpression(expr) || t$8.isLogicalExpression(expr)) {
	      extractIdentifiers(expr.left, result);
	      extractIdentifiers(expr.right, result);
	    } else if (t$8.isUnaryExpression(expr)) {
	      extractIdentifiers(expr.argument, result);
	    } else if (t$8.isMemberExpression(expr)) {
	      result.push(buildMemberPath(expr));
	    }
	  }

	  // Start traversal
	  traverseJSX(renderBody);

	  return templates;
	}

	/**
	 * Extract templates for attributes (props)
	 * Supports:
	 * - Template literals: className={`count-${count}`}
	 * - Style objects: style={{ fontSize: '32px', color: isActive ? 'red' : 'blue' }}
	 * - Static string attributes: className="btn-primary"
	 */
	function extractAttributeTemplates$1(renderBody, component) {
	  const templates = {};

	  // Traverse JSX tree using pre-assigned hex paths
	  function traverseJSX(node) {
	    if (t$8.isJSXElement(node)) {
	      const tagName = node.openingElement.name.name;

	      // 🔥 USE PRE-ASSIGNED HEX PATH (no recalculation!)
	      const elementPath = node.__minimactPath;
	      if (!elementPath) {
	        throw new Error(`[Attribute Extractor] No __minimactPath found on <${tagName}>. Did assignPathsToJSX run first?`);
	      }

	      const currentPath = getPathSegmentsFromNode(node);

	      // Check attributes for template expressions
	      for (const attr of node.openingElement.attributes) {
	        if (t$8.isJSXAttribute(attr)) {
	          const attrName = attr.name.name;
	          const attrValue = attr.value;

	          // 🔥 USE PRE-ASSIGNED ATTRIBUTE PATH
	          const attrPath = attr.__minimactPath || `${elementPath}.@${attrName}`;

	          // 1. Template literal: className={`count-${count}`}
	          if (t$8.isJSXExpressionContainer(attrValue) && t$8.isTemplateLiteral(attrValue.expression)) {
	            const template = extractTemplateLiteralShared(attrValue.expression);
	            if (template) {
	              console.log(`[Attribute Template] Found template literal in ${attrName}: "${template.template}" (path: ${attrPath})`);
	              templates[attrPath] = {
	                ...template,
	                path: currentPath,
	                attribute: attrName,
	                type: template.bindings.length > 0 ? 'attribute-dynamic' : 'attribute-static'
	              };
	            }
	          }
	          // 2. Style object: style={{ fontSize: '32px', opacity: isVisible ? 1 : 0.5 }}
	          else if (attrName === 'style' && t$8.isJSXExpressionContainer(attrValue) && t$8.isObjectExpression(attrValue.expression)) {
	            const styleTemplate = extractStyleObjectTemplate(attrValue.expression, tagName, null, null, currentPath);
	            if (styleTemplate) {
	              console.log(`[Attribute Template] Found style object: "${styleTemplate.template.substring(0, 60)}..." (path: ${attrPath})`);
	              templates[attrPath] = styleTemplate;
	            }
	          }
	          // 3. Static string attribute: className="btn-primary", placeholder="Enter name"
	          else if (t$8.isStringLiteral(attrValue)) {
	            console.log(`[Attribute Template] Found static attribute ${attrName}: "${attrValue.value}" (path: ${attrPath})`);
	            templates[attrPath] = {
	              template: attrValue.value,
	              bindings: [],
	              slots: [],
	              path: currentPath,
	              attribute: attrName,
	              type: 'attribute-static'
	            };
	          }
	          // 4. Simple expression (for future dynamic attribute support)
	          else if (t$8.isJSXExpressionContainer(attrValue)) {
	            const expr = attrValue.expression;
	            // Check if it's a simple binding (identifier or member expression)
	            if (t$8.isIdentifier(expr) || t$8.isMemberExpression(expr)) {
	              const binding = t$8.isIdentifier(expr) ? expr.name : buildMemberPathShared(expr);
	              console.log(`[Attribute Template] Found dynamic attribute ${attrName}: binding="${binding}" (path: ${attrPath})`);
	              templates[attrPath] = {
	                template: '{0}',
	                bindings: [binding],
	                slots: [0],
	                path: currentPath,
	                attribute: attrName,
	                type: 'attribute-dynamic'
	              };
	            }
	          }
	        }
	      }

	      // Traverse children (no need to track indices - paths are pre-assigned!)
	      for (const child of node.children) {
	        if (t$8.isJSXElement(child)) {
	          traverseJSX(child);
	        }
	      }
	    }
	  }

	  /**
	   * Extract template from style object
	   * Handles: { fontSize: '32px', opacity: isVisible ? 1 : 0.5 }
	   */
	  function extractStyleObjectTemplate(objectExpr, tagName, elementIndex, parentPath, currentPath, component) {
	    requireStyleConverter();

	    let hasBindings = false;
	    const cssProperties = [];
	    const bindings = [];
	    const slots = [];
	    let slotIndex = 0;

	    // Check each property for dynamic values
	    for (const prop of objectExpr.properties) {
	      if (t$8.isObjectProperty(prop) && !prop.computed) {
	        const key = t$8.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value);
	        const cssKey = camelToKebabShared(key);
	        const value = prop.value;

	        // Check if value is dynamic (expression, conditional, etc.)
	        if (t$8.isConditionalExpression(value) || t$8.isIdentifier(value) || t$8.isMemberExpression(value)) {
	          // Dynamic value - extract binding
	          hasBindings = true;
	          const binding = extractBindingShared(value);
	          if (binding) {
	            bindings.push(typeof binding === 'object' ? binding.binding || binding.conditional : binding);
	            cssProperties.push(`${cssKey}: {${slotIndex}}`);
	            slots.push(cssProperties.join('; ').lastIndexOf('{'));
	            slotIndex++;
	          } else {
	            // Complex expression - fall back to static
	            const cssValue = convertStyleValueShared(value);
	            cssProperties.push(`${cssKey}: ${cssValue}`);
	          }
	        } else {
	          // Static value
	          const cssValue = convertStyleValueShared(value);
	          cssProperties.push(`${cssKey}: ${cssValue}`);
	        }
	      }
	    }

	    const cssString = cssProperties.join('; ');

	    return {
	      template: cssString,
	      bindings: bindings,
	      slots: slots,
	      path: currentPath,
	      attribute: 'style',
	      type: hasBindings ? 'attribute-dynamic' : 'attribute-static'
	    };
	  }

	  /**
	   * Convert camelCase to kebab-case (shared helper)
	   */
	  function camelToKebabShared(str) {
	    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
	  }

	  /**
	   * Convert style value to CSS string (shared helper)
	   */
	  function convertStyleValueShared(value) {
	    if (t$8.isStringLiteral(value)) {
	      return value.value;
	    } else if (t$8.isNumericLiteral(value)) {
	      return `${value.value}px`;
	    } else if (t$8.isIdentifier(value)) {
	      return value.name;
	    }
	    return String(value);
	  }

	  if (renderBody) {
	    traverseJSX(renderBody);
	  }

	  return templates;
	}

	/**
	 * Generate template map JSON file content
	 */
	function generateTemplateMapJSON$1(componentName, templates, attributeTemplates) {
	  const allTemplates = {
	    ...templates,
	    ...attributeTemplates
	  };

	  return {
	    component: componentName,
	    version: '1.0',
	    generatedAt: Date.now(),
	    templates: Object.entries(allTemplates).reduce((acc, [path, template]) => {
	      acc[path] = {
	        template: template.template,
	        bindings: template.bindings,
	        slots: template.slots,
	        path: template.path,
	        type: template.type
	      };

	      // Include conditionalTemplates if present (for ternary expressions)
	      if (template.conditionalTemplates) {
	        acc[path].conditionalTemplates = template.conditionalTemplates;
	      }

	      // Include transform metadata if present (for method calls like toFixed)
	      if (template.transform) {
	        acc[path].transform = template.transform;
	      }

	      // Include nullable flag if present (for optional chaining)
	      if (template.nullable) {
	        acc[path].nullable = template.nullable;
	      }

	      return acc;
	    }, {})
	  };
	}

	/**
	 * Add template metadata to component for C# code generation
	 */
	function addTemplateMetadata$1(component, templates) {
	  component.templates = templates;

	  // Add template bindings to track which state affects which templates
	  component.templateBindings = new Map();

	  for (const [path, template] of Object.entries(templates)) {
	    for (const binding of template.bindings) {
	      if (!component.templateBindings.has(binding)) {
	        component.templateBindings.set(binding, []);
	      }
	      component.templateBindings.get(binding).push(path);
	    }
	  }
	}

	var templates = {
	  extractTemplates: extractTemplates$1,
	  extractAttributeTemplates: extractAttributeTemplates$1,
	  generateTemplateMapJSON: generateTemplateMapJSON$1,
	  addTemplateMetadata: addTemplateMetadata$1
	};

	/**
	 * Loop Template Extractor
	 *
	 * Extracts parameterized loop templates from .map() expressions for predictive rendering.
	 * This enables 100% coverage for list rendering patterns with O(1) memory.
	 *
	 * Architecture:
	 * - Build time: Detect .map() patterns and extract item templates
	 * - Runtime (Rust predictor): Use Babel-generated templates as primary source
	 * - Fallback: Rust runtime extraction if Babel can't generate template
	 *
	 * Example:
	 * {todos.map(todo => <li>{todo.text}</li>)}
	 * →
	 * LoopTemplate {
	 *   arrayBinding: "todos",
	 *   itemVar: "todo",
	 *   itemTemplate: ElementTemplate {
	 *     tag: "li",
	 *     children: [TextTemplate { template: "{0}", bindings: ["item.text"] }]
	 *   }
	 * }
	 */

	const t$7 = globalThis.__BABEL_TYPES__;

	/**
	 * Extract all loop templates from JSX render body
	 *
	 * Returns array of loop template metadata:
	 * [
	 *   {
	 *     stateKey: "todos",
	 *     arrayBinding: "todos",
	 *     itemVar: "todo",
	 *     indexVar: "index",
	 *     keyBinding: "item.id",
	 *     itemTemplate: { ... }
	 *   }
	 * ]
	 */
	function extractLoopTemplates$1(renderBody, component) {
	  if (!renderBody) return [];

	  const loopTemplates = [];

	  /**
	   * Traverse JSX tree looking for .map() call expressions
	   */
	  function traverseJSX(node) {
	    if (t$7.isJSXElement(node)) {
	      // Check attributes for .map() expressions
	      for (const attr of node.openingElement.attributes) {
	        if (t$7.isJSXAttribute(attr) && t$7.isJSXExpressionContainer(attr.value)) {
	          findMapExpressions(attr.value.expression);
	        }
	      }

	      // Check children for .map() expressions
	      for (const child of node.children) {
	        if (t$7.isJSXExpressionContainer(child)) {
	          findMapExpressions(child.expression);
	        } else if (t$7.isJSXElement(child)) {
	          traverseJSX(child);
	        } else if (t$7.isJSXFragment(child)) {
	          for (const fragmentChild of child.children) {
	            if (t$7.isJSXElement(fragmentChild)) {
	              traverseJSX(fragmentChild);
	            }
	          }
	        }
	      }
	    } else if (t$7.isJSXFragment(node)) {
	      for (const child of node.children) {
	        if (t$7.isJSXElement(child)) {
	          traverseJSX(child);
	        }
	      }
	    }
	  }

	  /**
	   * Find .map() call expressions recursively
	   */
	  function findMapExpressions(expr) {
	    if (!expr) return;

	    // Direct .map() call: items.map(...)
	    if (t$7.isCallExpression(expr) &&
	        t$7.isMemberExpression(expr.callee) &&
	        t$7.isIdentifier(expr.callee.property) &&
	        expr.callee.property.name === 'map') {

	      const loopTemplate = extractLoopTemplate(expr);
	      if (loopTemplate) {
	        loopTemplates.push(loopTemplate);
	      }
	    }

	    // Chained operations: items.filter(...).map(...)
	    if (t$7.isCallExpression(expr) &&
	        t$7.isMemberExpression(expr.callee)) {
	      findMapExpressions(expr.callee.object);
	    }

	    // Wrapped in other expressions
	    if (t$7.isLogicalExpression(expr) || t$7.isConditionalExpression(expr)) {
	      findMapExpressions(expr.left || expr.test);
	      findMapExpressions(expr.right || expr.consequent);
	      if (expr.alternate) findMapExpressions(expr.alternate);
	    }
	  }

	  /**
	   * Extract loop template from .map() call expression
	   *
	   * Example:
	   * todos.map((todo, index) => <li key={todo.id}>{todo.text}</li>)
	   */
	  function extractLoopTemplate(mapCallExpr) {
	    // Get array binding (the object being mapped)
	    const arrayBinding = extractArrayBinding(mapCallExpr.callee.object);
	    if (!arrayBinding) {
	      console.warn('[Loop Template] Could not extract array binding from .map()');
	      return null;
	    }

	    // Get callback function (arrow function or function expression)
	    const callback = mapCallExpr.arguments[0];
	    if (!t$7.isArrowFunctionExpression(callback) && !t$7.isFunctionExpression(callback)) {
	      console.warn('[Loop Template] .map() callback is not a function');
	      return null;
	    }

	    // Get item and index parameter names
	    const itemVar = callback.params[0] ? callback.params[0].name : 'item';
	    const indexVar = callback.params[1] ? callback.params[1].name : null;

	    // Get JSX element returned by callback
	    const jsxElement = extractJSXFromCallback(callback);
	    if (!jsxElement) {
	      console.warn('[Loop Template] .map() callback does not return JSX element');
	      return null;
	    }

	    // Extract item template from JSX element
	    const itemTemplate = extractElementTemplate(jsxElement, itemVar, indexVar);
	    if (!itemTemplate) {
	      console.warn('[Loop Template] Could not extract item template from JSX');
	      return null;
	    }

	    // Extract key binding
	    const keyBinding = extractKeyBinding(jsxElement, itemVar, indexVar);

	    return {
	      stateKey: arrayBinding,  // For C# attribute: which state variable triggers this template
	      arrayBinding,            // Runtime: which array to iterate
	      itemVar,                 // Runtime: variable name for each item
	      indexVar,                // Runtime: variable name for index (optional)
	      keyBinding,              // Runtime: expression for React key (optional)
	      itemTemplate             // Runtime: template for each list item
	    };
	  }

	  /**
	   * Extract array binding from member expression
	   *
	   * Examples:
	   * - todos.map(...) → "todos"
	   * - this.state.items.map(...) → "items"
	   * - [...todos].map(...) → "todos"
	   */
	  function extractArrayBinding(expr) {
	    if (t$7.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$7.isMemberExpression(expr)) {
	      // Get the last property name
	      if (t$7.isIdentifier(expr.property)) {
	        return expr.property.name;
	      }
	    } else if (t$7.isCallExpression(expr)) {
	      // Handle array methods like .reverse(), .slice()
	      if (t$7.isMemberExpression(expr.callee)) {
	        return extractArrayBinding(expr.callee.object);
	      }
	    } else if (t$7.isArrayExpression(expr)) {
	      // Spread array: [...todos]
	      if (expr.elements.length > 0 && t$7.isSpreadElement(expr.elements[0])) {
	        return extractArrayBinding(expr.elements[0].argument);
	      }
	    }
	    return null;
	  }

	  /**
	   * Extract JSX element from callback function body
	   */
	  function extractJSXFromCallback(callback) {
	    const body = callback.body;

	    // Arrow function with direct JSX return: (...) => <li>...</li>
	    if (t$7.isJSXElement(body)) {
	      return body;
	    }

	    // Arrow function or function expression with block body
	    if (t$7.isBlockStatement(body)) {
	      // Find return statement
	      for (const stmt of body.body) {
	        if (t$7.isReturnStatement(stmt) && t$7.isJSXElement(stmt.argument)) {
	          return stmt.argument;
	        }
	      }
	    }

	    // Expression wrapped in parentheses or conditional
	    if (t$7.isConditionalExpression(body)) {
	      // Handle ternary: condition ? <div/> : <span/>
	      // For now, just take the consequent (true branch)
	      if (t$7.isJSXElement(body.consequent)) {
	        return body.consequent;
	      }
	    }

	    if (t$7.isLogicalExpression(body) && body.operator === '&&') {
	      // Handle logical AND: condition && <div/>
	      if (t$7.isJSXElement(body.right)) {
	        return body.right;
	      }
	    }

	    return null;
	  }

	  /**
	   * Extract key binding from JSX element
	   *
	   * Example: <li key={todo.id}> → "item.id"
	   */
	  function extractKeyBinding(jsxElement, itemVar, indexVar) {
	    const keyAttr = jsxElement.openingElement.attributes.find(
	      attr => t$7.isJSXAttribute(attr) &&
	              t$7.isIdentifier(attr.name) &&
	              attr.name.name === 'key'
	    );

	    if (!keyAttr) return null;

	    const keyValue = keyAttr.value;
	    if (t$7.isJSXExpressionContainer(keyValue)) {
	      return buildBindingPath(keyValue.expression, itemVar, indexVar);
	    } else if (t$7.isStringLiteral(keyValue)) {
	      return null; // Static key (not based on item data)
	    }

	    return null;
	  }

	  /**
	   * Extract element template from JSX element
	   *
	   * Returns template in format compatible with Rust LoopTemplate:
	   * {
	   *   type: "Element",
	   *   tag: "li",
	   *   propsTemplates: { className: { template: "{0}", bindings: ["item.done"], ... } },
	   *   childrenTemplates: [ ... ],
	   *   keyBinding: "item.id"
	   * }
	   */
	  function extractElementTemplate(jsxElement, itemVar, indexVar) {
	    const tagName = jsxElement.openingElement.name.name;

	    // Extract prop templates
	    const propsTemplates = extractPropTemplates(
	      jsxElement.openingElement.attributes,
	      itemVar,
	      indexVar
	    );

	    // Extract children templates
	    const childrenTemplates = extractChildrenTemplates(
	      jsxElement.children,
	      itemVar,
	      indexVar
	    );

	    return {
	      type: 'Element',
	      tag: tagName,
	      propsTemplates: Object.keys(propsTemplates).length > 0 ? propsTemplates : null,
	      childrenTemplates: childrenTemplates.length > 0 ? childrenTemplates : null
	    };
	  }

	  /**
	   * Extract prop templates from JSX attributes
	   *
	   * Handles:
	   * - Simple bindings: checked={todo.done} → { template: "{0}", bindings: ["item.done"] }
	   * - Conditionals: className={todo.done ? 'done' : 'pending'} → conditional template
	   * - Template literals: className={`item-${todo.id}`} → template with placeholder
	   */
	  function extractPropTemplates(attributes, itemVar, indexVar) {
	    const templates = {};

	    for (const attr of attributes) {
	      // Skip non-JSXAttribute (spreads, etc.)
	      if (!t$7.isJSXAttribute(attr)) continue;

	      // Skip key attribute (handled separately)
	      if (attr.name.name === 'key') continue;

	      const propName = attr.name.name;
	      const propValue = attr.value;

	      // Static string: className="static"
	      if (t$7.isStringLiteral(propValue)) {
	        templates[propName] = {
	          template: propValue.value,
	          bindings: [],
	          slots: [],
	          type: 'static'
	        };
	        continue;
	      }

	      // Expression: {todo.done}, {todo.done ? 'yes' : 'no'}
	      if (t$7.isJSXExpressionContainer(propValue)) {
	        const expr = propValue.expression;

	        // Conditional: {todo.done ? 'active' : 'inactive'}
	        if (t$7.isConditionalExpression(expr)) {
	          const conditionalTemplate = extractConditionalTemplate(expr, itemVar, indexVar);
	          if (conditionalTemplate) {
	            templates[propName] = conditionalTemplate;
	            continue;
	          }
	        }

	        // Template literal: {`item-${todo.id}`}
	        if (t$7.isTemplateLiteral(expr)) {
	          const template = extractTemplateFromTemplateLiteral(expr, itemVar, indexVar);
	          if (template) {
	            templates[propName] = template;
	            continue;
	          }
	        }

	        // Simple binding: {todo.text}, {todo.done}
	        const binding = buildBindingPath(expr, itemVar, indexVar);
	        if (binding) {
	          templates[propName] = {
	            template: '{0}',
	            bindings: [binding],
	            slots: [0],
	            type: 'binding'
	          };
	        }
	      }
	    }

	    return templates;
	  }

	  /**
	   * Extract conditional template from ternary expression
	   *
	   * Example: todo.done ? 'completed' : 'pending'
	   * →
	   * {
	   *   template: "{0}",
	   *   bindings: ["item.done"],
	   *   conditionalTemplates: { "true": "completed", "false": "pending" },
	   *   conditionalBindingIndex: 0
	   * }
	   */
	  function extractConditionalTemplate(conditionalExpr, itemVar, indexVar) {
	    const test = conditionalExpr.test;
	    const consequent = conditionalExpr.consequent;
	    const alternate = conditionalExpr.alternate;

	    // Extract binding from test expression
	    const binding = buildBindingPath(test, itemVar, indexVar);
	    if (!binding) return null;

	    // Extract literal values from consequent and alternate
	    const trueValue = extractLiteralValue(consequent);
	    const falseValue = extractLiteralValue(alternate);

	    if (trueValue === null || falseValue === null) {
	      // Complex expressions in branches - can't template it
	      return null;
	    }

	    return {
	      template: '{0}',
	      bindings: [binding],
	      slots: [0],
	      conditionalTemplates: {
	        'true': trueValue,
	        'false': falseValue
	      },
	      conditionalBindingIndex: 0,
	      type: 'conditional'
	    };
	  }

	  /**
	   * Extract template from template literal
	   *
	   * Example: `item-${todo.id}`
	   * →
	   * {
	   *   template: "item-{0}",
	   *   bindings: ["item.id"],
	   *   slots: [5]
	   * }
	   */
	  function extractTemplateFromTemplateLiteral(templateLiteral, itemVar, indexVar) {
	    let templateStr = '';
	    const bindings = [];
	    const slots = [];

	    for (let i = 0; i < templateLiteral.quasis.length; i++) {
	      const quasi = templateLiteral.quasis[i];
	      templateStr += quasi.value.raw;

	      if (i < templateLiteral.expressions.length) {
	        const expr = templateLiteral.expressions[i];
	        const binding = buildBindingPath(expr, itemVar, indexVar);

	        if (binding) {
	          slots.push(templateStr.length);
	          templateStr += `{${bindings.length}}`;
	          bindings.push(binding);
	        } else {
	          // Complex expression - can't template it
	          return null;
	        }
	      }
	    }

	    return {
	      template: templateStr,
	      bindings,
	      slots,
	      type: 'template-literal'
	    };
	  }

	  /**
	   * Extract children templates from JSX children
	   *
	   * Returns array of templates (text or element)
	   */
	  function extractChildrenTemplates(children, itemVar, indexVar) {
	    const templates = [];

	    for (const child of children) {
	      // Static text: <li>Static text</li>
	      if (t$7.isJSXText(child)) {
	        const text = child.value.trim();
	        if (text) {
	          templates.push({
	            type: 'Text',
	            template: text,
	            bindings: [],
	            slots: []
	          });
	        }
	        continue;
	      }

	      // Expression: <li>{todo.text}</li>
	      if (t$7.isJSXExpressionContainer(child)) {
	        const template = extractTextTemplate(child.expression, itemVar, indexVar);
	        if (template) {
	          templates.push(template);
	        }
	        continue;
	      }

	      // Nested element: <li><span>{todo.text}</span></li>
	      if (t$7.isJSXElement(child)) {
	        const elementTemplate = extractElementTemplate(child, itemVar, indexVar);
	        if (elementTemplate) {
	          templates.push(elementTemplate);
	        }
	        continue;
	      }
	    }

	    return templates;
	  }

	  /**
	   * Extract text template from expression
	   *
	   * Handles:
	   * - Simple binding: {todo.text} → { template: "{0}", bindings: ["item.text"] }
	   * - Conditional: {todo.done ? '✓' : '○'} → conditional template
	   * - Binary expressions: {todo.count + 1} → expression template
	   * - Method calls: {todo.text.toUpperCase()} → expression template
	   * - Logical expressions: {todo.date || 'N/A'} → expression template
	   */
	  function extractTextTemplate(expr, itemVar, indexVar) {
	    // Template literal: {`${user.firstName} ${user.lastName}`}
	    if (t$7.isTemplateLiteral(expr)) {
	      const templateLiteralResult = extractTemplateFromTemplateLiteral(expr, itemVar, indexVar);
	      if (templateLiteralResult) {
	        return {
	          type: 'Text',
	          ...templateLiteralResult
	        };
	      }
	    }

	    // Conditional expression: {todo.done ? '✓' : '○'}
	    if (t$7.isConditionalExpression(expr)) {
	      const conditionalTemplate = extractConditionalTemplate(expr, itemVar, indexVar);
	      if (conditionalTemplate) {
	        return {
	          type: 'Text',
	          ...conditionalTemplate
	        };
	      }
	    }

	    // Try to extract binding (handles simple, binary, method calls, etc.)
	    const binding = buildBindingPath(expr, itemVar, indexVar);
	    if (binding) {
	      return {
	        type: 'Text',
	        template: '{0}',
	        bindings: [binding],
	        slots: [0]
	      };
	    }

	    // No binding found
	    return null;
	  }

	  /**
	   * Build binding path from expression relative to item variable
	   *
	   * Examples:
	   * - todo → null (just the item itself)
	   * - todo.text → "item.text"
	   * - todo.author.name → "item.author.name"
	   * - index → "index"
	   * - todo.priority + 1 → "__expr__:item.priority"
	   * - todo.text.toUpperCase() → "__expr__:item.text"
	   * - index * 2 + 1 → "__expr__:index"
	   */
	  function buildBindingPath(expr, itemVar, indexVar) {
	    if (t$7.isIdentifier(expr)) {
	      // Just the item variable itself
	      if (expr.name === itemVar) {
	        return null; // Can't template the entire item object
	      }
	      // Index variable
	      if (expr.name === 'index' || expr.name === indexVar) {
	        return 'index';
	      }
	      // Other identifier (likely a closure variable)
	      return null;
	    }

	    if (t$7.isMemberExpression(expr)) {
	      const path = buildMemberExpressionPath(expr);
	      if (path && path.startsWith(itemVar + '.')) {
	        // Replace item variable with "item" prefix
	        return 'item' + path.substring(itemVar.length);
	      }
	    }

	    // Handle binary expressions: todo.priority + 1, price * quantity, etc.
	    if (t$7.isBinaryExpression(expr)) {
	      return extractLoopBinaryExpression(expr, itemVar, indexVar);
	    }

	    // Handle logical expressions: todo.dueDate || 'No due date'
	    if (t$7.isLogicalExpression(expr)) {
	      return extractLoopLogicalExpression(expr, itemVar, indexVar);
	    }

	    // Handle unary expressions: !todo.completed, -value
	    if (t$7.isUnaryExpression(expr)) {
	      return extractLoopUnaryExpression(expr, itemVar, indexVar);
	    }

	    // Handle call expressions: todo.text.toUpperCase(), array.concat()
	    if (t$7.isCallExpression(expr)) {
	      return extractLoopCallExpression(expr, itemVar, indexVar);
	    }

	    return null;
	  }

	  /**
	   * Extract binding from binary expression in loop
	   * Examples: todo.priority + 1, price * quantity, index * 2 + 1
	   */
	  function extractLoopBinaryExpression(expr, itemVar, indexVar) {
	    const identifiers = [];
	    extractLoopIdentifiers(expr, identifiers, itemVar, indexVar);

	    if (identifiers.length === 0) {
	      return null;
	    }

	    // Use __expr__ prefix to indicate this is a computed expression
	    return `__expr__:${identifiers.join(',')}`;
	  }

	  /**
	   * Extract binding from logical expression in loop
	   * Examples: todo.dueDate || 'No due date', condition && value
	   */
	  function extractLoopLogicalExpression(expr, itemVar, indexVar) {
	    const identifiers = [];
	    extractLoopIdentifiers(expr, identifiers, itemVar, indexVar);

	    if (identifiers.length === 0) {
	      return null;
	    }

	    // Use __expr__ prefix to indicate this is a computed expression
	    return `__expr__:${identifiers.join(',')}`;
	  }

	  /**
	   * Extract binding from unary expression in loop
	   * Examples: !todo.completed, -value
	   */
	  function extractLoopUnaryExpression(expr, itemVar, indexVar) {
	    const identifiers = [];
	    extractLoopIdentifiers(expr, identifiers, itemVar, indexVar);

	    if (identifiers.length === 0) {
	      return null;
	    }

	    // Use __expr__ prefix to indicate this is a computed expression
	    return `__expr__:${identifiers.join(',')}`;
	  }

	  /**
	   * Extract binding from call expression in loop
	   * Examples: todo.text.toUpperCase(), todo.text.substring(0, 10)
	   */
	  function extractLoopCallExpression(expr, itemVar, indexVar) {
	    const identifiers = [];
	    extractLoopIdentifiers(expr, identifiers, itemVar, indexVar);

	    if (identifiers.length === 0) {
	      return null;
	    }

	    // Use __expr__ prefix to indicate this is a computed expression
	    return `__expr__:${identifiers.join(',')}`;
	  }

	  /**
	   * Extract identifiers from expression, converting item references to "item" prefix
	   */
	  function extractLoopIdentifiers(expr, result, itemVar, indexVar) {
	    if (t$7.isIdentifier(expr)) {
	      if (expr.name === itemVar) {
	        // Don't add raw item variable
	        return;
	      } else if (expr.name === 'index' || expr.name === indexVar) {
	        result.push('index');
	      } else {
	        result.push(expr.name);
	      }
	    } else if (t$7.isBinaryExpression(expr) || t$7.isLogicalExpression(expr)) {
	      extractLoopIdentifiers(expr.left, result, itemVar, indexVar);
	      extractLoopIdentifiers(expr.right, result, itemVar, indexVar);
	    } else if (t$7.isUnaryExpression(expr)) {
	      extractLoopIdentifiers(expr.argument, result, itemVar, indexVar);
	    } else if (t$7.isMemberExpression(expr)) {
	      const path = buildMemberExpressionPath(expr);
	      if (path) {
	        if (path.startsWith(itemVar + '.')) {
	          // Replace item variable with "item" prefix
	          result.push('item' + path.substring(itemVar.length));
	        } else {
	          result.push(path);
	        }
	      } else {
	        // Complex member expression (e.g., (a + b).toFixed())
	        // Extract from both object and property
	        extractLoopIdentifiers(expr.object, result, itemVar, indexVar);
	        if (t$7.isIdentifier(expr.property)) {
	          result.push(expr.property.name);
	        }
	      }
	    } else if (t$7.isCallExpression(expr)) {
	      // Extract from callee
	      extractLoopIdentifiers(expr.callee, result, itemVar, indexVar);
	      // Extract from arguments
	      for (const arg of expr.arguments) {
	        extractLoopIdentifiers(arg, result, itemVar, indexVar);
	      }
	    }
	  }

	  /**
	   * Build full path from member expression
	   *
	   * Example: todo.author.name → "todo.author.name"
	   */
	  function buildMemberExpressionPath(expr) {
	    const parts = [];
	    let current = expr;

	    while (t$7.isMemberExpression(current)) {
	      if (t$7.isIdentifier(current.property)) {
	        parts.unshift(current.property.name);
	      } else {
	        return null; // Computed property (not supported)
	      }
	      current = current.object;
	    }

	    if (t$7.isIdentifier(current)) {
	      parts.unshift(current.name);
	      return parts.join('.');
	    }

	    return null;
	  }

	  /**
	   * Extract literal value from expression
	   */
	  function extractLiteralValue(expr) {
	    if (t$7.isStringLiteral(expr)) {
	      return expr.value;
	    } else if (t$7.isNumericLiteral(expr)) {
	      return expr.value;
	    } else if (t$7.isBooleanLiteral(expr)) {
	      return expr.value;
	    } else if (t$7.isNullLiteral(expr)) {
	      return null;
	    }
	    return null; // Complex expression
	  }

	  // Start traversal
	  traverseJSX(renderBody);

	  return loopTemplates;
	}

	var loopTemplates = {
	  extractLoopTemplates: extractLoopTemplates$1
	};

	/**
	 * Structural Template Extractor (Phase 5)
	 *
	 * Extracts templates for conditional rendering patterns where the DOM structure changes.
	 * This handles cases like loading states, authentication states, error boundaries, etc.
	 *
	 * Examples:
	 * - {isLoading ? <Spinner /> : <Content />}
	 * - {user ? <Dashboard /> : <LoginForm />}
	 * - {error && <ErrorMessage />}
	 *
	 * Architecture:
	 * - Build time: Detect conditional patterns and extract both branches
	 * - Runtime: Store structural templates with condition binding
	 * - Prediction: Choose correct branch based on current state
	 */

	const t$6 = globalThis.__BABEL_TYPES__;

	/**
	 * Extract structural templates from JSX render body
	 *
	 * Returns array of structural template metadata:
	 * [
	 *   {
	 *     type: 'conditional',
	 *     stateKey: 'isLoggedIn',
	 *     conditionBinding: 'isLoggedIn',
	 *     branches: {
	 *       'true': { type: 'Element', tag: 'div', ... },
	 *       'false': { type: 'Element', tag: 'div', ... }
	 *     }
	 *   }
	 * ]
	 */
	function extractStructuralTemplates$1(renderBody, component) {
	  if (!renderBody) return [];

	  const structuralTemplates = [];

	  /**
	   * Traverse JSX tree looking for conditional expressions that affect structure
	   */
	  function traverseJSX(node, path = []) {
	    if (t$6.isJSXElement(node)) {
	      // Check children for conditional expressions
	      for (let i = 0; i < node.children.length; i++) {
	        const child = node.children[i];

	        if (t$6.isJSXExpressionContainer(child)) {
	          const expr = child.expression;

	          // Ternary: {condition ? <A /> : <B />}
	          if (t$6.isConditionalExpression(expr)) {
	            const template = extractConditionalStructuralTemplate(expr, component, [...path, i]);
	            if (template) {
	              structuralTemplates.push(template);
	            }
	          }

	          // Logical AND: {condition && <Component />}
	          if (t$6.isLogicalExpression(expr) && expr.operator === '&&') {
	            const template = extractLogicalAndTemplate(expr, component, [...path, i]);
	            if (template) {
	              structuralTemplates.push(template);
	            }
	          }
	        } else if (t$6.isJSXElement(child)) {
	          traverseJSX(child, [...path, i]);
	        }
	      }
	    } else if (t$6.isJSXFragment(node)) {
	      for (let i = 0; i < node.children.length; i++) {
	        const child = node.children[i];
	        if (t$6.isJSXElement(child)) {
	          traverseJSX(child, [...path, i]);
	        } else if (t$6.isJSXExpressionContainer(child)) {
	          const expr = child.expression;

	          if (t$6.isConditionalExpression(expr)) {
	            const template = extractConditionalStructuralTemplate(expr, component, [...path, i]);
	            if (template) {
	              structuralTemplates.push(template);
	            }
	          }

	          if (t$6.isLogicalExpression(expr) && expr.operator === '&&') {
	            const template = extractLogicalAndTemplate(expr, component, [...path, i]);
	            if (template) {
	              structuralTemplates.push(template);
	            }
	          }
	        }
	      }
	    }
	  }

	  /**
	   * Extract structural template from ternary conditional
	   *
	   * Example: {isLoggedIn ? <Dashboard /> : <LoginForm />}
	   * →
	   * {
	   *   type: 'conditional',
	   *   conditionBinding: 'isLoggedIn',
	   *   branches: {
	   *     'true': ElementTemplate { tag: 'Dashboard', ... },
	   *     'false': ElementTemplate { tag: 'LoginForm', ... }
	   *   }
	   * }
	   */
	  function extractConditionalStructuralTemplate(conditionalExpr, component, path) {
	    const test = conditionalExpr.test;
	    const consequent = conditionalExpr.consequent;
	    const alternate = conditionalExpr.alternate;

	    // Extract condition binding
	    const conditionBinding = extractBinding(test);
	    if (!conditionBinding) {
	      console.warn('[Structural Template] Could not extract condition binding');
	      return null;
	    }

	    // Check if both branches are JSX elements (structural change)
	    const hasTrueBranch = t$6.isJSXElement(consequent) || t$6.isJSXFragment(consequent);
	    const hasFalseBranch = t$6.isJSXElement(alternate) || t$6.isJSXFragment(alternate) || t$6.isNullLiteral(alternate);

	    if (!hasTrueBranch && !hasFalseBranch) {
	      // Not a structural template (probably just conditional text)
	      return null;
	    }

	    // Extract templates for both branches
	    const branches = {};

	    if (hasTrueBranch) {
	      const trueBranch = extractElementOrFragmentTemplate(consequent);
	      if (trueBranch) {
	        branches['true'] = trueBranch;
	      }
	    }

	    if (hasFalseBranch) {
	      if (t$6.isNullLiteral(alternate)) {
	        branches['false'] = { type: 'Null' };
	      } else {
	        const falseBranch = extractElementOrFragmentTemplate(alternate);
	        if (falseBranch) {
	          branches['false'] = falseBranch;
	        }
	      }
	    }

	    // Determine state key (for C# attribute)
	    const stateKey = extractStateKey(test);

	    return {
	      type: 'conditional',
	      stateKey: stateKey || conditionBinding,
	      conditionBinding,
	      branches,
	      path
	    };
	  }

	  /**
	   * Extract structural template from logical AND
	   *
	   * Example: {error && <ErrorMessage />}
	   * →
	   * {
	   *   type: 'logicalAnd',
	   *   conditionBinding: 'error',
	   *   branches: {
	   *     'truthy': ElementTemplate { tag: 'ErrorMessage', ... },
	   *     'falsy': { type: 'Null' }
	   *   }
	   * }
	   */
	  function extractLogicalAndTemplate(logicalExpr, component, path) {
	    const left = logicalExpr.left;
	    const right = logicalExpr.right;

	    // Extract condition binding from left side
	    const conditionBinding = extractBinding(left);
	    if (!conditionBinding) {
	      return null;
	    }

	    // Check if right side is JSX element (structural change)
	    if (!t$6.isJSXElement(right) && !t$6.isJSXFragment(right)) {
	      return null;
	    }

	    // Extract template for truthy case
	    const truthyBranch = extractElementOrFragmentTemplate(right);
	    if (!truthyBranch) {
	      return null;
	    }

	    const stateKey = extractStateKey(left);

	    return {
	      type: 'logicalAnd',
	      stateKey: stateKey || conditionBinding,
	      conditionBinding,
	      branches: {
	        'truthy': truthyBranch,
	        'falsy': { type: 'Null' }
	      },
	      path
	    };
	  }

	  /**
	   * Extract element or fragment template
	   */
	  function extractElementOrFragmentTemplate(node, component) {
	    if (t$6.isJSXElement(node)) {
	      return extractSimpleElementTemplate(node);
	    } else if (t$6.isJSXFragment(node)) {
	      return {
	        type: 'Fragment',
	        children: node.children
	          .filter(child => t$6.isJSXElement(child) || t$6.isJSXText(child))
	          .map(child => {
	            if (t$6.isJSXElement(child)) {
	              return extractSimpleElementTemplate(child);
	            } else if (t$6.isJSXText(child)) {
	              const text = child.value.trim();
	              return text ? { type: 'Text', content: text } : null;
	            }
	          })
	          .filter(Boolean)
	      };
	    }
	    return null;
	  }

	  /**
	   * Extract simple element template (without nested state dependencies)
	   *
	   * For structural templates, we extract a simplified version that captures:
	   * - Tag name
	   * - Static props
	   * - Structure (not deeply nested templates)
	   */
	  function extractSimpleElementTemplate(jsxElement, component) {
	    const tagName = jsxElement.openingElement.name.name;
	    const attributes = jsxElement.openingElement.attributes;

	    // Extract static props only (complex props handled separately)
	    const props = {};
	    for (const attr of attributes) {
	      if (t$6.isJSXAttribute(attr)) {
	        const propName = attr.name.name;
	        const propValue = attr.value;

	        if (t$6.isStringLiteral(propValue)) {
	          props[propName] = propValue.value;
	        } else if (t$6.isJSXExpressionContainer(propValue)) {
	          // Mark as dynamic (will be re-evaluated)
	          const expr = propValue.expression;
	          if (t$6.isIdentifier(expr)) {
	            props[propName] = { binding: expr.name };
	          } else {
	            props[propName] = { expression: true };
	          }
	        }
	      }
	    }

	    // Extract children (simplified)
	    const children = jsxElement.children
	      .filter(child => t$6.isJSXElement(child) || t$6.isJSXText(child))
	      .map(child => {
	        if (t$6.isJSXElement(child)) {
	          return extractSimpleElementTemplate(child);
	        } else if (t$6.isJSXText(child)) {
	          const text = child.value.trim();
	          return text ? { type: 'Text', content: text } : null;
	        }
	      })
	      .filter(Boolean);

	    return {
	      type: 'Element',
	      tag: tagName,
	      props: Object.keys(props).length > 0 ? props : null,
	      children: children.length > 0 ? children : null
	    };
	  }

	  /**
	   * Extract binding from expression
	   */
	  function extractBinding(expr, component) {
	    if (t$6.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$6.isMemberExpression(expr)) {
	      return buildMemberPath(expr);
	    } else if (t$6.isUnaryExpression(expr) && expr.operator === '!') {
	      // Handle !isLoading
	      const binding = extractBinding(expr.argument);
	      return binding ? `!${binding}` : null;
	    }
	    return null;
	  }

	  /**
	   * Extract state key (root variable name) from expression
	   */
	  function extractStateKey(expr, component) {
	    if (t$6.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$6.isMemberExpression(expr)) {
	      // Get root object: user.isLoggedIn → "user"
	      let current = expr;
	      while (t$6.isMemberExpression(current)) {
	        current = current.object;
	      }
	      if (t$6.isIdentifier(current)) {
	        return current.name;
	      }
	    } else if (t$6.isUnaryExpression(expr)) {
	      return extractStateKey(expr.argument);
	    }
	    return null;
	  }

	  /**
	   * Build member expression path
	   */
	  function buildMemberPath(expr) {
	    const parts = [];
	    let current = expr;

	    while (t$6.isMemberExpression(current)) {
	      if (t$6.isIdentifier(current.property)) {
	        parts.unshift(current.property.name);
	      }
	      current = current.object;
	    }

	    if (t$6.isIdentifier(current)) {
	      parts.unshift(current.name);
	    }

	    return parts.join('.');
	  }

	  // Start traversal
	  traverseJSX(renderBody);

	  return structuralTemplates;
	}

	var structuralTemplates = {
	  extractStructuralTemplates: extractStructuralTemplates$1
	};

	/**
	 * Expression Template Extractor (Phase 6)
	 *
	 * Extracts templates for computed values and transformations.
	 * This handles cases like number formatting, arithmetic, string operations, etc.
	 *
	 * Examples:
	 * - {price.toFixed(2)}
	 * - {count * 2 + 1}
	 * - {name.toUpperCase()}
	 * - {items.length}
	 *
	 * Architecture:
	 * - Build time: Detect expression patterns and extract transformation metadata
	 * - Runtime: Store expression templates with bindings and transforms
	 * - Prediction: Apply transforms to current state values
	 *
	 * Security Note:
	 * Only safe, whitelisted transformations are supported. No arbitrary JavaScript execution.
	 */

	const t$5 = globalThis.__BABEL_TYPES__;

	/**
	 * Supported transformation types
	 */
	const SUPPORTED_TRANSFORMS = {
	  // Number formatting
	  'toFixed': { type: 'numberFormat', safe: true },
	  'toPrecision': { type: 'numberFormat', safe: true },
	  'toExponential': { type: 'numberFormat', safe: true },

	  // String operations
	  'toUpperCase': { type: 'stringTransform', safe: true },
	  'toLowerCase': { type: 'stringTransform', safe: true },
	  'trim': { type: 'stringTransform', safe: true },
	  'substring': { type: 'stringTransform', safe: true },
	  'substr': { type: 'stringTransform', safe: true },
	  'slice': { type: 'stringTransform', safe: true },

	  // Array operations
	  'length': { type: 'property', safe: true },
	  'join': { type: 'arrayTransform', safe: true },

	  // Math operations (handled separately via binary expressions)
	  // +, -, *, /, %
	};

	/**
	 * Extract expression templates from JSX render body
	 *
	 * Returns array of expression template metadata:
	 * [
	 *   {
	 *     type: 'expression',
	 *     template: '${0}',
	 *     bindings: ['price'],
	 *     transforms: [
	 *       { type: 'toFixed', args: [2] }
	 *     ]
	 *   }
	 * ]
	 */
	function extractExpressionTemplates$1(renderBody, component) {
	  if (!renderBody) return [];

	  const expressionTemplates = [];

	  /**
	   * Traverse JSX tree looking for expression containers
	   */
	  function traverseJSX(node, path = []) {
	    if (t$5.isJSXElement(node)) {
	      // Check children for expressions
	      for (let i = 0; i < node.children.length; i++) {
	        const child = node.children[i];

	        if (t$5.isJSXExpressionContainer(child)) {
	          const template = extractExpressionTemplate(child.expression, component, [...path, i]);
	          if (template) {
	            expressionTemplates.push(template);
	          }
	        } else if (t$5.isJSXElement(child)) {
	          traverseJSX(child, [...path, i]);
	        }
	      }

	      // Check attributes for expressions
	      for (const attr of node.openingElement.attributes) {
	        if (t$5.isJSXAttribute(attr) && t$5.isJSXExpressionContainer(attr.value)) {
	          const template = extractExpressionTemplate(attr.value.expression, component, path);
	          if (template) {
	            template.attribute = attr.name.name;
	            expressionTemplates.push(template);
	          }
	        }
	      }
	    }
	  }

	  /**
	   * Extract expression template from expression node
	   */
	  function extractExpressionTemplate(expr, component, path) {
	    // Skip if it's a simple identifier (no transformation)
	    if (t$5.isIdentifier(expr)) {
	      return null;
	    }

	    // Skip conditionals (handled by structural templates)
	    if (t$5.isConditionalExpression(expr) || t$5.isLogicalExpression(expr)) {
	      return null;
	    }

	    // Method call: price.toFixed(2)
	    if (t$5.isCallExpression(expr) && t$5.isMemberExpression(expr.callee)) {
	      return extractMethodCallTemplate(expr, component, path);
	    }

	    // Binary expression: count * 2 + 1
	    if (t$5.isBinaryExpression(expr)) {
	      return extractBinaryExpressionTemplate(expr, component, path);
	    }

	    // Member expression: user.name, items.length
	    if (t$5.isMemberExpression(expr)) {
	      return extractMemberExpressionTemplate(expr, component, path);
	    }

	    // Unary expression: -count, +value
	    if (t$5.isUnaryExpression(expr)) {
	      return extractUnaryExpressionTemplate(expr, component, path);
	    }

	    return null;
	  }

	  /**
	   * Extract template from method call
	   *
	   * Example: price.toFixed(2)
	   * →
	   * {
	   *   type: 'methodCall',
	   *   binding: 'price',
	   *   method: 'toFixed',
	   *   args: [2],
	   *   transform: { type: 'numberFormat', method: 'toFixed', args: [2] }
	   * }
	   */
	  function extractMethodCallTemplate(callExpr, component, path) {
	    const callee = callExpr.callee;
	    const args = callExpr.arguments;

	    // Get binding (e.g., 'price' from price.toFixed())
	    const binding = extractBinding(callee.object);
	    if (!binding) return null;

	    // Get method name
	    const methodName = callee.property.name;

	    // Check if this is a supported transformation
	    if (!SUPPORTED_TRANSFORMS[methodName]) {
	      console.warn(`[Expression Template] Unsupported method: ${methodName}`);
	      return null;
	    }

	    // Extract arguments
	    const extractedArgs = args.map(arg => {
	      if (t$5.isNumericLiteral(arg)) return arg.value;
	      if (t$5.isStringLiteral(arg)) return arg.value;
	      if (t$5.isBooleanLiteral(arg)) return arg.value;
	      return null;
	    }).filter(a => a !== null);

	    // Determine state key
	    const stateKey = extractStateKey(callee.object);

	    return {
	      type: 'methodCall',
	      stateKey: stateKey || binding,
	      binding,
	      method: methodName,
	      args: extractedArgs,
	      transform: {
	        type: SUPPORTED_TRANSFORMS[methodName].type,
	        method: methodName,
	        args: extractedArgs
	      },
	      path
	    };
	  }

	  /**
	   * Extract template from binary expression
	   *
	   * Example: count * 2 + 1
	   * →
	   * {
	   *   type: 'binaryExpression',
	   *   bindings: ['count'],
	   *   expression: 'count * 2 + 1',
	   *   transform: {
	   *     type: 'arithmetic',
	   *     operations: [
	   *       { op: '*', right: 2 },
	   *       { op: '+', right: 1 }
	   *     ]
	   *   }
	   * }
	   */
	  function extractBinaryExpressionTemplate(binaryExpr, component, path) {
	    // Extract all identifiers
	    const identifiers = [];
	    extractIdentifiers(binaryExpr, identifiers);

	    if (identifiers.length === 0) return null;

	    // For simple cases (single identifier with constant), extract transform
	    if (identifiers.length === 1) {
	      const binding = identifiers[0];
	      const transform = analyzeBinaryExpression(binaryExpr, binding);

	      if (transform) {
	        const stateKey = binding.split('.')[0];
	        return {
	          type: 'binaryExpression',
	          stateKey,
	          bindings: [binding],
	          transform,
	          path
	        };
	      }
	    }

	    // Complex multi-variable expression - store as formula
	    return {
	      type: 'complexExpression',
	      stateKey: identifiers[0].split('.')[0],
	      bindings: identifiers,
	      expression: generateExpressionString(binaryExpr),
	      path
	    };
	  }

	  /**
	   * Analyze binary expression to extract arithmetic operations
	   *
	   * Example: count * 2 + 1 with binding="count"
	   * →
	   * {
	   *   type: 'arithmetic',
	   *   operations: [
	   *     { op: '*', value: 2 },
	   *     { op: '+', value: 1 }
	   *   ]
	   * }
	   */
	  function analyzeBinaryExpression(expr, targetBinding) {
	    const operations = [];

	    function analyze(node) {
	      if (t$5.isBinaryExpression(node)) {
	        const { left, operator, right } = node;

	        // Check if one side is our target binding
	        const leftIsTarget = isBindingExpression(left, targetBinding);
	        const rightIsTarget = isBindingExpression(right, targetBinding);

	        if (leftIsTarget && t$5.isNumericLiteral(right)) {
	          operations.push({ op: operator, value: right.value, side: 'right' });
	        } else if (rightIsTarget && t$5.isNumericLiteral(left)) {
	          operations.push({ op: operator, value: left.value, side: 'left' });
	        } else {
	          // Recurse
	          analyze(left);
	          analyze(right);
	        }
	      }
	    }

	    analyze(expr);

	    if (operations.length > 0) {
	      return {
	        type: 'arithmetic',
	        operations
	      };
	    }

	    return null;
	  }

	  /**
	   * Check if expression is our target binding
	   */
	  function isBindingExpression(expr, targetBinding) {
	    const binding = extractBinding(expr);
	    return binding === targetBinding;
	  }

	  /**
	   * Extract template from member expression
	   *
	   * Example: items.length
	   * →
	   * {
	   *   type: 'memberExpression',
	   *   binding: 'items.length',
	   *   transform: { type: 'property', property: 'length' }
	   * }
	   */
	  function extractMemberExpressionTemplate(memberExpr, component, path) {
	    // Check for computed property access: item[field]
	    if (memberExpr.computed) {
	      console.warn('[Minimact Warning] Computed property access detected - skipping template optimization (requires runtime evaluation)');

	      // Return a special marker indicating this needs runtime evaluation
	      // The C# generator will handle this as dynamic property access
	      return {
	        type: 'computedMemberExpression',
	        isComputed: true,
	        requiresRuntimeEval: true,
	        object: memberExpr.object,
	        property: memberExpr.property,
	        path
	      };
	    }

	    const binding = buildMemberPath(memberExpr);
	    if (!binding) return null;

	    // Get property name (only for non-computed properties)
	    const propertyName = memberExpr.property.name;

	    // Check if it's a supported property
	    if (!SUPPORTED_TRANSFORMS[propertyName]) {
	      return null;
	    }

	    const stateKey = extractStateKey(memberExpr);

	    return {
	      type: 'memberExpression',
	      stateKey: stateKey || binding.split('.')[0],
	      binding,
	      property: propertyName,
	      transform: {
	        type: SUPPORTED_TRANSFORMS[propertyName].type,
	        property: propertyName
	      },
	      path
	    };
	  }

	  /**
	   * Extract template from unary expression
	   *
	   * Example: -count, +value
	   */
	  function extractUnaryExpressionTemplate(unaryExpr, component, path) {
	    const { operator, argument } = unaryExpr;

	    const binding = extractBinding(argument);
	    if (!binding) return null;

	    if (operator === '-' || operator === '+') {
	      const stateKey = extractStateKey(argument);

	      return {
	        type: 'unaryExpression',
	        stateKey: stateKey || binding,
	        binding,
	        operator,
	        transform: {
	          type: 'unary',
	          operator
	        },
	        path
	      };
	    }

	    return null;
	  }

	  /**
	   * Extract binding from expression
	   */
	  function extractBinding(expr) {
	    if (t$5.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$5.isMemberExpression(expr)) {
	      return buildMemberPath(expr);
	    }
	    return null;
	  }

	  /**
	   * Extract state key (root variable)
	   */
	  function extractStateKey(expr, component) {
	    if (t$5.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$5.isMemberExpression(expr)) {
	      let current = expr;
	      while (t$5.isMemberExpression(current)) {
	        current = current.object;
	      }
	      if (t$5.isIdentifier(current)) {
	        return current.name;
	      }
	    }
	    return null;
	  }

	  /**
	   * Build member expression path
	   */
	  function buildMemberPath(expr) {
	    const parts = [];
	    let current = expr;

	    while (t$5.isMemberExpression(current)) {
	      if (t$5.isIdentifier(current.property)) {
	        parts.unshift(current.property.name);
	      }
	      current = current.object;
	    }

	    if (t$5.isIdentifier(current)) {
	      parts.unshift(current.name);
	    }

	    return parts.join('.');
	  }

	  /**
	   * Extract all identifiers from expression
	   */
	  function extractIdentifiers(expr, result) {
	    if (t$5.isIdentifier(expr)) {
	      result.push(expr.name);
	    } else if (t$5.isBinaryExpression(expr)) {
	      extractIdentifiers(expr.left, result);
	      extractIdentifiers(expr.right, result);
	    } else if (t$5.isUnaryExpression(expr)) {
	      extractIdentifiers(expr.argument, result);
	    } else if (t$5.isMemberExpression(expr)) {
	      const path = buildMemberPath(expr);
	      if (path) result.push(path);
	    }
	  }

	  /**
	   * Generate expression string for complex expressions
	   */
	  function generateExpressionString(expr) {
	    if (t$5.isIdentifier(expr)) {
	      return expr.name;
	    } else if (t$5.isNumericLiteral(expr)) {
	      return String(expr.value);
	    } else if (t$5.isBinaryExpression(expr)) {
	      const left = generateExpressionString(expr.left);
	      const right = generateExpressionString(expr.right);
	      return `${left} ${expr.operator} ${right}`;
	    } else if (t$5.isUnaryExpression(expr)) {
	      const arg = generateExpressionString(expr.argument);
	      return `${expr.operator}${arg}`;
	    } else if (t$5.isMemberExpression(expr)) {
	      return buildMemberPath(expr);
	    }
	    return '?';
	  }

	  // Start traversal
	  traverseJSX(renderBody);

	  return expressionTemplates;
	}

	var expressionTemplates = {
	  extractExpressionTemplates: extractExpressionTemplates$1,
	  SUPPORTED_TRANSFORMS
	};

	/**
	 * Analyze <Plugin name="..." state={...} /> JSX elements in React components
	 * Detects plugin usage and extracts metadata for C# code generation
	 *
	 * Phase 3: Babel Plugin Integration
	 *
	 * Transforms:
	 *   <Plugin name="Clock" state={currentTime} />
	 *
	 * To C# code:
	 *   new PluginNode("Clock", currentTime)
	 */

	const t$4 = globalThis.__BABEL_TYPES__;

	/**
	 * Analyze JSX tree for Plugin elements
	 * @param {Object} path - Babel path to component function
	 * @param {Object} componentState - Component metadata being built
	 * @returns {Array} Array of plugin usage metadata
	 */
	function analyzePluginUsage$1(path, componentState) {
	  const pluginUsages = [];

	  path.traverse({
	    JSXElement(jsxPath) {
	      const openingElement = jsxPath.node.openingElement;

	      // Check if this is a <Plugin> element
	      if (!isPluginElement(openingElement)) {
	        return;
	      }

	      try {
	        const pluginMetadata = extractPluginMetadata(openingElement, componentState);
	        pluginUsages.push(pluginMetadata);

	        // Log for debugging
	        console.log(`[analyzePluginUsage] Found plugin usage: ${pluginMetadata.pluginName}`);
	      } catch (error) {
	        console.error(`[analyzePluginUsage] Error analyzing plugin:`, error.message);
	        throw error;
	      }
	    }
	  });

	  return pluginUsages;
	}

	/**
	 * Check if JSX element is a <Plugin> component
	 * @param {Object} openingElement - JSX opening element
	 * @returns {boolean}
	 */
	function isPluginElement(openingElement) {
	  // Check for <Plugin> or <Plugin.Something>
	  const name = openingElement.name;

	  if (t$4.isJSXIdentifier(name)) {
	    return name.name === 'Plugin';
	  }

	  if (t$4.isJSXMemberExpression(name)) {
	    return name.object.name === 'Plugin';
	  }

	  return false;
	}

	/**
	 * Extract plugin metadata from JSX element
	 * @param {Object} openingElement - JSX opening element
	 * @param {Object} componentState - Component metadata
	 * @returns {Object} Plugin metadata
	 */
	function extractPluginMetadata(openingElement, componentState) {
	  const nameAttr = findAttribute(openingElement.attributes, 'name');
	  const stateAttr = findAttribute(openingElement.attributes, 'state');
	  const versionAttr = findAttribute(openingElement.attributes, 'version');

	  // Validate required attributes
	  if (!nameAttr) {
	    throw new Error('Plugin element requires "name" attribute');
	  }

	  if (!stateAttr) {
	    throw new Error('Plugin element requires "state" attribute');
	  }

	  // Extract plugin name (must be a string literal)
	  const pluginName = extractPluginName(nameAttr);

	  // Extract state binding (can be expression or identifier)
	  const stateBinding = extractStateBinding(stateAttr, componentState);

	  // Extract optional version
	  const version = versionAttr ? extractVersion(versionAttr) : null;

	  return {
	    pluginName,
	    stateBinding,
	    version,
	    // Store original JSX for reference
	    jsxElement: openingElement
	  };
	}

	/**
	 * Find attribute by name in JSX attributes
	 * @param {Array} attributes - JSX attributes
	 * @param {string} name - Attribute name to find
	 * @returns {Object|null}
	 */
	function findAttribute(attributes, name) {
	  return attributes.find(attr =>
	    t$4.isJSXAttribute(attr) && attr.name.name === name
	  );
	}

	/**
	 * Extract plugin name from name attribute
	 * Must be a string literal (e.g., name="Clock")
	 * @param {Object} nameAttr - JSX attribute node
	 * @returns {string}
	 */
	function extractPluginName(nameAttr) {
	  const value = nameAttr.value;

	  // String literal: name="Clock"
	  if (t$4.isStringLiteral(value)) {
	    return value.value;
	  }

	  // JSX expression: name={"Clock"} (also a string literal)
	  if (t$4.isJSXExpressionContainer(value) && t$4.isStringLiteral(value.expression)) {
	    return value.expression.value;
	  }

	  throw new Error('Plugin "name" attribute must be a string literal (e.g., name="Clock")');
	}

	/**
	 * Extract state binding from state attribute
	 * Can be an identifier or expression
	 * @param {Object} stateAttr - JSX attribute node
	 * @param {Object} componentState - Component metadata
	 * @returns {Object} State binding metadata
	 */
	function extractStateBinding(stateAttr, componentState) {
	  const value = stateAttr.value;

	  if (!t$4.isJSXExpressionContainer(value)) {
	    throw new Error('Plugin "state" attribute must be a JSX expression (e.g., state={currentTime})');
	  }

	  const expression = value.expression;

	  // Simple identifier: state={currentTime}
	  if (t$4.isIdentifier(expression)) {
	    return {
	      type: 'identifier',
	      name: expression.name,
	      binding: expression.name,
	      stateType: inferStateType(expression.name, componentState)
	    };
	  }

	  // Member expression: state={this.state.time}
	  if (t$4.isMemberExpression(expression)) {
	    const binding = generateBindingPath(expression);
	    return {
	      type: 'memberExpression',
	      binding,
	      expression: expression,
	      stateType: inferStateType(binding, componentState)
	    };
	  }

	  // Object expression: state={{ hours: h, minutes: m }}
	  if (t$4.isObjectExpression(expression)) {
	    return {
	      type: 'objectExpression',
	      binding: '__inline_object__',
	      properties: expression.properties,
	      expression: expression
	    };
	  }

	  // Any other expression (will be evaluated at runtime)
	  return {
	    type: 'complexExpression',
	    binding: '__complex__',
	    expression: expression
	  };
	}

	/**
	 * Extract version from version attribute
	 * @param {Object} versionAttr - JSX attribute node
	 * @returns {string|null}
	 */
	function extractVersion(versionAttr) {
	  const value = versionAttr.value;

	  if (t$4.isStringLiteral(value)) {
	    return value.value;
	  }

	  if (t$4.isJSXExpressionContainer(value) && t$4.isStringLiteral(value.expression)) {
	    return value.expression.value;
	  }

	  return null;
	}

	/**
	 * Generate binding path from member expression
	 * e.g., this.state.time -> "state.time"
	 * @param {Object} expression - Member expression AST node
	 * @returns {string}
	 */
	function generateBindingPath(expression) {
	  const parts = [];

	  function traverse(node) {
	    if (t$4.isIdentifier(node)) {
	      // Skip 'this' prefix
	      if (node.name !== 'this') {
	        parts.unshift(node.name);
	      }
	    } else if (t$4.isMemberExpression(node)) {
	      if (t$4.isIdentifier(node.property)) {
	        parts.unshift(node.property.name);
	      }
	      traverse(node.object);
	    }
	  }

	  traverse(expression);
	  return parts.join('.');
	}

	/**
	 * Infer state type from binding name and component metadata
	 * @param {string} bindingName - Name of the state binding
	 * @param {Object} componentState - Component metadata
	 * @returns {string|null}
	 */
	function inferStateType(bindingName, componentState) {
	  // Check useState declarations
	  if (componentState.useState) {
	    const stateDecl = componentState.useState.find(s =>
	      s.name === bindingName || s.setterName === bindingName
	    );
	    if (stateDecl) {
	      return stateDecl.type || 'object';
	    }
	  }

	  // Check props
	  if (componentState.props) {
	    const prop = componentState.props.find(p => p.name === bindingName);
	    if (prop) {
	      return prop.type || 'object';
	    }
	  }

	  // Check local variables
	  if (componentState.localVariables) {
	    const localVar = componentState.localVariables.find(v => v.name === bindingName);
	    if (localVar) {
	      return localVar.type || 'object';
	    }
	  }

	  // Default to object if we can't infer
	  return 'object';
	}

	/**
	 * Validate plugin usage (called after analysis)
	 * @param {Array} pluginUsages - Array of plugin usage metadata
	 * @throws {Error} If validation fails
	 */
	function validatePluginUsage$1(pluginUsages) {
	  for (const plugin of pluginUsages) {
	    // Validate plugin name format
	    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(plugin.pluginName)) {
	      throw new Error(
	        `Invalid plugin name "${plugin.pluginName}". ` +
	        `Plugin names must start with a letter and contain only letters and numbers.`
	      );
	    }

	    // Validate state binding
	    if (plugin.stateBinding.binding === '__complex__') {
	      console.warn(
	        `[analyzePluginUsage] Complex expression used for plugin "${plugin.pluginName}" state. ` +
	        `This will be evaluated at runtime.`
	      );
	    }

	    // Validate version format if provided
	    if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
	      console.warn(
	        `[analyzePluginUsage] Invalid semver format for plugin "${plugin.pluginName}": ${plugin.version}`
	      );
	    }
	  }
	}

	var analyzePluginUsage_1 = {
	  analyzePluginUsage: analyzePluginUsage$1,
	  validatePluginUsage: validatePluginUsage$1,
	  isPluginElement,
	  extractPluginMetadata
	};

	/**
	 * Component Processor
	 *
	 * Main entry point for processing a component function/class.
	 */

	const t$3 = globalThis.__BABEL_TYPES__;
	const { getComponentName } = helpers;
	const { tsTypeToCSharpType: tsTypeToCSharpType$1 } = typeConversion;
	const { extractHook } = hooks;
	const { extractLocalVariables } = localVariables;
	const { inferPropTypes } = propTypeInference;
	const {
	  extractTemplates,
	  extractAttributeTemplates,
	  addTemplateMetadata
	} = templates;
	const { extractLoopTemplates } = loopTemplates;
	const { extractStructuralTemplates } = structuralTemplates;
	const { extractExpressionTemplates } = expressionTemplates;
	const { analyzePluginUsage, validatePluginUsage } = analyzePluginUsage_1;
	const { HexPathGenerator } = requireHexPath();
	const { assignPathsToJSX } = requirePathAssignment();

	/**
	 * Process a component function
	 */
	function processComponent$1(path, state) {
	  const componentName = getComponentName(path);

	  if (!componentName) return;
	  if (componentName[0] !== componentName[0].toUpperCase()) return; // Not a component

	  state.file.minimactComponents = state.file.minimactComponents || [];

	  const component = {
	    name: componentName,
	    props: [],
	    useState: [],
	    useClientState: [],
	    useStateX: [], // Declarative state projections
	    useEffect: [],
	    useRef: [],
	    useMarkdown: [],
	    useTemplate: null,
	    useValidation: [],
	    useModal: [],
	    useToggle: [],
	    useDropdown: [],
	    eventHandlers: [],
	    localVariables: [], // Local variables (const/let/var) in function body
	    helperFunctions: [], // Helper functions declared in function body
	    renderBody: null,
	    pluginUsages: [], // Plugin instances (<Plugin name="..." state={...} />)
	    stateTypes: new Map(), // Track which hook each state came from
	    dependencies: new Map(), // Track dependencies per JSX node
	    externalImports: new Set(), // Track external library identifiers
	    clientComputedVars: new Set() // Track variables using external libs
	  };

	  // Track external imports at file level
	  state.file.path.traverse({
	    ImportDeclaration(importPath) {
	      const source = importPath.node.source.value;

	      // Skip Minimact imports, relative imports, and CSS imports
	      if (source.startsWith('minimact') ||
	          source.startsWith('.') ||
	          source.startsWith('/') ||
	          source.endsWith('.css') ||
	          source.endsWith('.scss') ||
	          source.endsWith('.sass')) {
	        return;
	      }

	      // Track external library identifiers
	      importPath.node.specifiers.forEach(spec => {
	        if (t$3.isImportDefaultSpecifier(spec)) {
	          // import _ from 'lodash'
	          component.externalImports.add(spec.local.name);
	        } else if (t$3.isImportSpecifier(spec)) {
	          // import { sortBy } from 'lodash'
	          component.externalImports.add(spec.local.name);
	        } else if (t$3.isImportNamespaceSpecifier(spec)) {
	          // import * as _ from 'lodash'
	          component.externalImports.add(spec.local.name);
	        }
	      });
	    }
	  });

	  // Extract props from function parameters
	  const params = path.node.params;
	  if (params.length > 0 && t$3.isObjectPattern(params[0])) {
	    // Destructured props: function Component({ prop1, prop2 })
	    // Check if there's a type annotation on the parameter
	    const paramTypeAnnotation = params[0].typeAnnotation?.typeAnnotation;

	    for (const property of params[0].properties) {
	      if (t$3.isObjectProperty(property) && t$3.isIdentifier(property.key)) {
	        let propType = 'dynamic';

	        // Try to extract type from TypeScript annotation
	        if (paramTypeAnnotation && t$3.isTSTypeLiteral(paramTypeAnnotation)) {
	          const propName = property.key.name;
	          const tsProperty = paramTypeAnnotation.members.find(
	            member => t$3.isTSPropertySignature(member) &&
	                     t$3.isIdentifier(member.key) &&
	                     member.key.name === propName
	          );
	          if (tsProperty && tsProperty.typeAnnotation) {
	            propType = tsTypeToCSharpType$1(tsProperty.typeAnnotation.typeAnnotation);
	          }
	        }

	        component.props.push({
	          name: property.key.name,
	          type: propType
	        });
	      }
	    }
	  } else if (params.length > 0 && t$3.isIdentifier(params[0])) {
	    // Props as single object: function Component(props)
	    // Use 'dynamic' to allow property access
	    component.props.push({
	      name: params[0].name,
	      type: 'dynamic'
	    });
	  }

	  // Find function body
	  const body = path.node.body.type === 'BlockStatement'
	    ? path.node.body
	    : t$3.blockStatement([t$3.returnStatement(path.node.body)]);

	  // Extract hooks and local variables
	  path.traverse({
	    CallExpression(hookPath) {
	      extractHook(hookPath, component);
	    },

	    VariableDeclaration(varPath) {
	      // Only extract local variables at the top level of the function body
	      if (varPath.getFunctionParent() === path && varPath.parent.type === 'BlockStatement') {
	        extractLocalVariables(varPath, component, t$3);
	      }
	    },

	    FunctionDeclaration(funcPath) {
	      // Only extract helper functions at the top level of the component body
	      // (not nested functions inside other functions)
	      if (funcPath.getFunctionParent() === path && funcPath.parent.type === 'BlockStatement') {
	        const funcName = funcPath.node.id.name;
	        const params = funcPath.node.params.map(param => {
	          if (t$3.isIdentifier(param)) {
	            // Simple parameter: (name)
	            const paramType = param.typeAnnotation?.typeAnnotation
	              ? tsTypeToCSharpType$1(param.typeAnnotation.typeAnnotation)
	              : 'dynamic';
	            return { name: param.name, type: paramType };
	          }
	          return { name: 'param', type: 'dynamic' };
	        });

	        const returnType = funcPath.node.returnType?.typeAnnotation
	          ? tsTypeToCSharpType$1(funcPath.node.returnType.typeAnnotation)
	          : 'void';

	        const isAsync = funcPath.node.async;

	        component.helperFunctions.push({
	          name: funcName,
	          params,
	          returnType,
	          isAsync,
	          body: funcPath.node.body // Store the function body AST
	        });
	      }
	    },

	    ReturnStatement(returnPath) {
	      if (returnPath.getFunctionParent() === path) {
	        // Store a REFERENCE to the actual live AST node (not a clone!)
	        // We'll add keys to THIS node, and it will persist in the Program tree
	        component.renderBody = returnPath.node.argument;
	      }
	    }
	  });

	  // Infer prop types from usage BEFORE replacing JSX with null
	  // Pass the entire function body to analyze all usage (including JSX)
	  inferPropTypes(component, body);

	  // Extract templates from JSX for hot reload (BEFORE replacing JSX with null)
	  if (component.renderBody) {
	    // 🔥 CRITICAL: Assign hex paths to all JSX nodes FIRST
	    // This ensures all extractors use the same paths (no recalculation!)
	    const pathGen = new HexPathGenerator();
	    const structuralChanges = []; // Track insertions for hot reload
	    assignPathsToJSX(component.renderBody, '', pathGen, t$3, null, null, structuralChanges);
	    console.log(`[Minimact Hex Paths] ✅ Assigned hex paths to ${componentName} JSX tree`);

	    // Store structural changes on component for later processing
	    if (structuralChanges.length > 0) {
	      component.structuralChanges = structuralChanges;
	      console.log(`[Hot Reload] Found ${structuralChanges.length} structural changes in ${componentName}`);
	    }

	    const textTemplates = extractTemplates(component.renderBody, component);
	    const attrTemplates = extractAttributeTemplates(component.renderBody, component);
	    const allTemplates = { ...textTemplates, ...attrTemplates };

	    // Add template metadata to component
	    addTemplateMetadata(component, allTemplates);

	    console.log(`[Minimact Templates] Extracted ${Object.keys(allTemplates).length} templates from ${componentName}`);

	    // Extract loop templates for predictive rendering (.map() patterns)
	    const loopTemplates = extractLoopTemplates(component.renderBody, component);
	    component.loopTemplates = loopTemplates;

	    if (loopTemplates.length > 0) {
	      console.log(`[Minimact Loop Templates] Extracted ${loopTemplates.length} loop templates from ${componentName}:`);
	      loopTemplates.forEach(lt => {
	        console.log(`  - ${lt.stateKey}.map(${lt.itemVar} => ...)`);
	      });
	    }

	    // Extract structural templates for conditional rendering (Phase 5)
	    const structuralTemplates = extractStructuralTemplates(component.renderBody, component);
	    component.structuralTemplates = structuralTemplates;

	    if (structuralTemplates.length > 0) {
	      console.log(`[Minimact Structural Templates] Extracted ${structuralTemplates.length} structural templates from ${componentName}:`);
	      structuralTemplates.forEach(st => {
	        console.log(`  - ${st.type === 'conditional' ? 'Ternary' : 'Logical AND'}: ${st.conditionBinding}`);
	      });
	    }

	    // Extract expression templates for computed values (Phase 6)
	    const expressionTemplates = extractExpressionTemplates(component.renderBody, component);
	    component.expressionTemplates = expressionTemplates;

	    if (expressionTemplates.length > 0) {
	      console.log(`[Minimact Expression Templates] Extracted ${expressionTemplates.length} expression templates from ${componentName}:`);
	      expressionTemplates.forEach(et => {
	        if (et.method) {
	          console.log(`  - ${et.binding}.${et.method}(${et.args?.join(', ') || ''})`);
	        } else if (et.operator) {
	          console.log(`  - ${et.operator}${et.binding}`);
	        } else if (et.bindings) {
	          console.log(`  - ${et.bindings.join(', ')}`);
	        } else {
	          console.log(`  - ${JSON.stringify(et)}`);
	        }
	      });
	    }

	    // Analyze plugin usage (Phase 3: Plugin System)
	    const pluginUsages = analyzePluginUsage(path, component);
	    component.pluginUsages = pluginUsages;

	    if (pluginUsages.length > 0) {
	      // Validate plugin usage
	      validatePluginUsage(pluginUsages);

	      console.log(`[Minimact Plugins] Found ${pluginUsages.length} plugin usage(s) in ${componentName}:`);
	      pluginUsages.forEach(plugin => {
	        const versionInfo = plugin.version ? ` v${plugin.version}` : '';
	        console.log(`  - <Plugin name="${plugin.pluginName}"${versionInfo} state={${plugin.stateBinding.binding}} />`);
	      });
	    }
	  }

	  // Detect which top-level helper functions are referenced by this component
	  if (state.file.topLevelFunctions && state.file.topLevelFunctions.length > 0) {
	    const referencedFunctionNames = new Set();

	    // Traverse the component to find all function calls
	    path.traverse({
	      CallExpression(callPath) {
	        if (t$3.isIdentifier(callPath.node.callee)) {
	          const funcName = callPath.node.callee.name;
	          // Check if this matches a top-level function
	          const helperFunc = state.file.topLevelFunctions.find(f => f.name === funcName);
	          if (helperFunc) {
	            referencedFunctionNames.add(funcName);
	          }
	        }
	      }
	    });

	    // Add referenced functions to component's topLevelHelperFunctions array
	    component.topLevelHelperFunctions = state.file.topLevelFunctions
	      .filter(f => referencedFunctionNames.has(f.name))
	      .map(f => ({
	        name: f.name,
	        node: f.node
	      }));

	    if (component.topLevelHelperFunctions.length > 0) {
	      console.log(`[Minimact Helpers] Component '${componentName}' references ${component.topLevelHelperFunctions.length} helper function(s):`);
	      component.topLevelHelperFunctions.forEach(f => {
	        console.log(`  - ${f.name}()`);
	      });
	    }
	  }

	  // Store the component path so we can nullify JSX later (after .tsx.keys generation)
	  if (!state.file.componentPathsToNullify) {
	    state.file.componentPathsToNullify = [];
	  }
	  state.file.componentPathsToNullify.push(path);

	  state.file.minimactComponents.push(component);
	}

	var processComponent_1 = {
	  processComponent: processComponent$1
	};

	/**
	 * Render Body Generator
	 */

	const t$2 = globalThis.__BABEL_TYPES__;
	const { generateJSXElement } = requireJsx$1();
	const { generateConditional, generateShortCircuit, generateMapExpression } = requireExpressions$1();

	/**
	 * Generate C# code for render body
	 */
	function generateRenderBody$1(node, component, indent) {
	  const indentStr = '    '.repeat(indent);

	  if (!node) {
	    return `${indentStr}return new VText("");`;
	  }

	  // Handle different node types
	  if (t$2.isJSXElement(node) || t$2.isJSXFragment(node)) {
	    return `${indentStr}return ${generateJSXElement(node, component, indent)};`;
	  }

	  if (t$2.isConditionalExpression(node)) {
	    // Ternary: condition ? a : b
	    return generateConditional(node, component, indent);
	  }

	  if (t$2.isLogicalExpression(node) && node.operator === '&&') {
	    // Short-circuit: condition && <Element>
	    return generateShortCircuit(node, component, indent);
	  }

	  if (t$2.isCallExpression(node) && t$2.isMemberExpression(node.callee) && node.callee.property.name === 'map') {
	    // Array.map()
	    return generateMapExpression(node, component, indent);
	  }

	  // Fallback
	  return `${indentStr}return new VText("${node.type}");`;
	}

	var renderBody = {
	  generateRenderBody: generateRenderBody$1
	};

	/**
	 * TypeScript → C# Transpiler
	 *
	 * Transpiles TypeScript async functions to C# async Tasks
	 * for useServerTask support
	 */

	const t$1 = globalThis.__BABEL_TYPES__;

	/**
	 * Transpile async function body → C# code
	 */
	function transpileAsyncFunctionToCSharp$1(asyncFunction) {
	  const body = asyncFunction.body;
	  asyncFunction.params;

	  let csharpCode = '';

	  // Transpile body
	  if (t$1.isBlockStatement(body)) {
	    csharpCode = transpileBlockStatement(body);
	  } else {
	    // Arrow function with expression body: () => expr
	    csharpCode = `return ${transpileExpression(body)};`;
	  }

	  return csharpCode;
	}

	/**
	 * Transpile TypeScript block statement → C# code
	 */
	function transpileBlockStatement(block) {
	  let code = '';

	  for (const statement of block.body) {
	    code += transpileStatement(statement) + '\n';
	  }

	  return code;
	}

	/**
	 * Transpile individual TypeScript statement → C# statement
	 */
	function transpileStatement(statement) {
	  if (t$1.isVariableDeclaration(statement)) {
	    const declarations = statement.declarations.map(decl => {
	      const name = decl.id.name;
	      const init = decl.init ? transpileExpression(decl.init) : 'null';
	      if (name === 'chartData') {
	        console.log(`[DEBUG chartData] init type: ${decl.init?.type}, result: ${init}`);
	      }
	      return `var ${name} = ${init};`;
	    });
	    return declarations.join('\n');
	  }

	  if (t$1.isReturnStatement(statement)) {
	    return `return ${transpileExpression(statement.argument)};`;
	  }

	  if (t$1.isExpressionStatement(statement)) {
	    // Check for yield expression (streaming)
	    if (t$1.isYieldExpression(statement.expression)) {
	      return `yield return ${transpileExpression(statement.expression.argument)};`;
	    }
	    return `${transpileExpression(statement.expression)};`;
	  }

	  if (t$1.isForStatement(statement)) {
	    const init = statement.init ? transpileStatement(statement.init).replace(/;$/, '') : '';
	    const test = statement.test ? transpileExpression(statement.test) : 'true';
	    const update = statement.update ? transpileExpression(statement.update) : '';
	    const body = transpileStatement(statement.body);
	    return `for (${init}; ${test}; ${update})\n{\n${indent$1(body, 4)}\n}`;
	  }

	  if (t$1.isForOfStatement(statement)) {
	    const left = t$1.isVariableDeclaration(statement.left)
	      ? statement.left.declarations[0].id.name
	      : statement.left.name;
	    const right = transpileExpression(statement.right);
	    const body = transpileStatement(statement.body);

	    // Check if it's for await of (streaming)
	    if (statement.await) {
	      return `await foreach (var ${left} in ${right})\n{\n${indent$1(body, 4)}\n}`;
	    }

	    return `foreach (var ${left} in ${right})\n{\n${indent$1(body, 4)}\n}`;
	  }

	  if (t$1.isWhileStatement(statement)) {
	    const test = transpileExpression(statement.test);
	    const body = transpileStatement(statement.body);
	    return `while (${test})\n{\n${indent$1(body, 4)}\n}`;
	  }

	  if (t$1.isIfStatement(statement)) {
	    const test = transpileExpression(statement.test);
	    const consequent = transpileStatement(statement.consequent);
	    const alternate = statement.alternate
	      ? `\nelse\n{\n${indent$1(transpileStatement(statement.alternate), 4)}\n}`
	      : '';
	    return `if (${test})\n{\n${indent$1(consequent, 4)}\n}${alternate}`;
	  }

	  if (t$1.isBlockStatement(statement)) {
	    return transpileBlockStatement(statement);
	  }

	  if (t$1.isTryStatement(statement)) {
	    const block = transpileBlockStatement(statement.block);
	    const handler = statement.handler ? transpileCatchClause(statement.handler) : '';
	    const finalizer = statement.finalizer
	      ? `\nfinally\n{\n${indent$1(transpileBlockStatement(statement.finalizer), 4)}\n}`
	      : '';
	    return `try\n{\n${indent$1(block, 4)}\n}${handler}${finalizer}`;
	  }

	  if (t$1.isThrowStatement(statement)) {
	    return `throw ${transpileExpression(statement.argument)};`;
	  }

	  if (t$1.isBreakStatement(statement)) {
	    return 'break;';
	  }

	  if (t$1.isContinueStatement(statement)) {
	    return 'continue;';
	  }

	  // Default: convert to string (may need refinement)
	  return `/* TODO: Transpile ${statement.type} */`;
	}

	/**
	 * Transpile TypeScript expression → C# expression
	 */
	function transpileExpression(expr) {
	  if (!expr) return 'null';

	  if (t$1.isStringLiteral(expr)) {
	    return `"${escapeString(expr.value)}"`;
	  }

	  if (t$1.isNumericLiteral(expr)) {
	    return expr.value.toString();
	  }

	  if (t$1.isBooleanLiteral(expr)) {
	    return expr.value ? 'true' : 'false';
	  }

	  if (t$1.isNullLiteral(expr)) {
	    return 'null';
	  }

	  if (t$1.isIdentifier(expr)) {
	    // Special handling for progress parameter
	    if (expr.name === 'progress') {
	      return 'progress';
	    }
	    // Special handling for cancellation token
	    if (expr.name === 'cancellationToken' || expr.name === 'cancel') {
	      return 'cancellationToken';
	    }
	    return expr.name;
	  }

	  if (t$1.isMemberExpression(expr)) {
	    const object = transpileExpression(expr.object);
	    const property = expr.computed
	      ? `[${transpileExpression(expr.property)}]`
	      : `.${expr.property.name}`;

	    // Handle special member expressions
	    const fullExpr = `${object}${property}`;
	    return transpileMemberExpression(fullExpr, object, property);
	  }

	  if (t$1.isOptionalMemberExpression(expr)) {
	    const object = transpileExpression(expr.object);
	    const property = expr.computed
	      ? `[${transpileExpression(expr.property)}]`
	      : `.${expr.property.name}`;

	    // In C#, optional chaining (?.) is just ?.
	    const fullExpr = `${object}?${property}`;
	    return transpileMemberExpression(fullExpr, object, property);
	  }

	  if (t$1.isCallExpression(expr)) {
	    const callee = transpileExpression(expr.callee);
	    const args = expr.arguments.map(arg => transpileExpression(arg)).join(', ');

	    // Handle special method calls
	    return transpileMethodCall(callee, args);
	  }

	  if (t$1.isOptionalCallExpression(expr)) {
	    const callee = transpileExpression(expr.callee);
	    const args = expr.arguments.map(arg => transpileExpression(arg)).join(', ');

	    // In C#, optional call (?.) is handled via null-conditional operator
	    // The callee should already have ? from OptionalMemberExpression
	    return transpileMethodCall(callee, args);
	  }

	  if (t$1.isAwaitExpression(expr)) {
	    return `await ${transpileExpression(expr.argument)}`;
	  }

	  if (t$1.isArrayExpression(expr)) {
	    const elements = expr.elements.map(el => transpileExpression(el)).join(', ');
	    return `new[] { ${elements} }`;
	  }

	  if (t$1.isObjectExpression(expr)) {
	    const props = expr.properties.map(prop => {
	      if (t$1.isObjectProperty(prop)) {
	        const key = t$1.isIdentifier(prop.key) ? prop.key.name : transpileExpression(prop.key);
	        const value = transpileExpression(prop.value);
	        return `${capitalize$1(key)} = ${value}`;
	      }
	      if (t$1.isSpreadElement(prop)) {
	        // C# object spread using with expression (C# 9+)
	        return `/* spread: ${transpileExpression(prop.argument)} */`;
	      }
	      return '';
	    }).filter(Boolean).join(', ');
	    return `new { ${props} }`;
	  }

	  if (t$1.isArrowFunctionExpression(expr)) {
	    const params = expr.params.map(p => p.name).join(', ');
	    const body = t$1.isBlockStatement(expr.body)
	      ? `{\n${indent$1(transpileBlockStatement(expr.body), 4)}\n}`
	      : transpileExpression(expr.body);
	    return `(${params}) => ${body}`;
	  }

	  if (t$1.isParenthesizedExpression(expr)) {
	    // Unwrap parentheses - just transpile the inner expression
	    return transpileExpression(expr.expression);
	  }

	  if (t$1.isBinaryExpression(expr)) {
	    const left = transpileExpression(expr.left);
	    const right = transpileExpression(expr.right);
	    const operator = transpileOperator(expr.operator);
	    return `(${left} ${operator} ${right})`;
	  }

	  if (t$1.isLogicalExpression(expr)) {
	    const left = transpileExpression(expr.left);
	    const right = transpileExpression(expr.right);
	    const operator = transpileOperator(expr.operator);
	    return `(${left} ${operator} ${right})`;
	  }

	  if (t$1.isUnaryExpression(expr)) {
	    const operator = transpileOperator(expr.operator);
	    const argument = transpileExpression(expr.argument);
	    return expr.prefix ? `${operator}${argument}` : `${argument}${operator}`;
	  }

	  if (t$1.isConditionalExpression(expr)) {
	    const test = transpileExpression(expr.test);
	    const consequent = transpileExpression(expr.consequent);
	    const alternate = transpileExpression(expr.alternate);
	    return `(${test} ? ${consequent} : ${alternate})`;
	  }

	  if (t$1.isTemplateLiteral(expr)) {
	    // Convert template literal to C# interpolated string
	    return transpileTemplateLiteral(expr);
	  }

	  if (t$1.isNewExpression(expr)) {
	    const callee = transpileExpression(expr.callee);
	    const args = expr.arguments.map(arg => transpileExpression(arg)).join(', ');
	    return `new ${callee}(${args})`;
	  }

	  if (t$1.isAssignmentExpression(expr)) {
	    const left = transpileExpression(expr.left);
	    const right = transpileExpression(expr.right);
	    const operator = transpileOperator(expr.operator);
	    return `${left} ${operator} ${right}`;
	  }

	  if (t$1.isUpdateExpression(expr)) {
	    const argument = transpileExpression(expr.argument);
	    const operator = expr.operator;
	    return expr.prefix ? `${operator}${argument}` : `${argument}${operator}`;
	  }

	  console.warn(`[transpileExpression] Unknown expression type: ${expr.type}`);
	  return `/* TODO: ${expr.type} */`;
	}

	/**
	 * Transpile member expression (handle special cases)
	 */
	function transpileMemberExpression(fullExpr, object, property) {
	  // progress.report() → progress.Report()
	  if (object === 'progress' && property === '.report') {
	    return 'progress.Report';
	  }

	  // cancellationToken.requested → cancellationToken.IsCancellationRequested
	  if ((object === 'cancellationToken' || object === 'cancel') && property === '.requested') {
	    return 'cancellationToken.IsCancellationRequested';
	  }

	  return fullExpr;
	}

	/**
	 * Transpile method call (handle special methods)
	 */
	function transpileMethodCall(callee, args) {
	  // Array methods: .map → .Select, .filter → .Where, etc.
	  const mappings = {
	    '.map': '.Select',
	    '.filter': '.Where',
	    '.reduce': '.Aggregate',
	    '.find': '.FirstOrDefault',
	    '.findIndex': '.FindIndex',
	    '.some': '.Any',
	    '.every': '.All',
	    '.includes': '.Contains',
	    '.sort': '.OrderBy',
	    '.reverse': '.Reverse',
	    '.slice': '.Skip',
	    '.concat': '.Concat',
	    '.join': '.Join',
	    'console.log': 'Console.WriteLine',
	    'console.error': 'Console.Error.WriteLine',
	    'console.warn': 'Console.WriteLine',
	    'Math.floor': 'Math.Floor',
	    'Math.ceil': 'Math.Ceiling',
	    'Math.round': 'Math.Round',
	    'Math.abs': 'Math.Abs',
	    'Math.max': 'Math.Max',
	    'Math.min': 'Math.Min',
	    'Math.sqrt': 'Math.Sqrt',
	    'Math.pow': 'Math.Pow',
	    'JSON.stringify': 'JsonSerializer.Serialize',
	    'JSON.parse': 'JsonSerializer.Deserialize'
	  };

	  for (const [ts, csharp] of Object.entries(mappings)) {
	    if (callee.includes(ts)) {
	      const transpiledCallee = callee.replace(ts, csharp);
	      return `${transpiledCallee}(${args})`;
	    }
	  }

	  // Special handling for .toFixed()
	  if (callee.endsWith('.toFixed')) {
	    const obj = callee.replace('.toFixed', '');
	    return `${obj}.ToString("F" + ${args})`;
	  }

	  // Special handling for .split()
	  if (callee.endsWith('.split')) {
	    const obj = callee.replace('.split', '');
	    return `${obj}.Split(${args})`;
	  }

	  // Special handling for fetch (convert to HttpClient call)
	  if (callee === 'fetch') {
	    return `await _httpClient.GetStringAsync(${args})`;
	  }

	  return `${callee}(${args})`;
	}

	/**
	 * Transpile operator
	 */
	function transpileOperator(op) {
	  const mappings = {
	    '===': '==',
	    '!==': '!=',
	    '&&': '&&',
	    '||': '||',
	    '!': '!',
	    '+': '+',
	    '-': '-',
	    '*': '*',
	    '/': '/',
	    '%': '%',
	    '<': '<',
	    '>': '>',
	    '<=': '<=',
	    '>=': '>=',
	    '=': '=',
	    '+=': '+=',
	    '-=': '-=',
	    '*=': '*=',
	    '/=': '/=',
	    '++': '++',
	    '--': '--'
	  };
	  return mappings[op] || op;
	}

	/**
	 * Transpile catch clause
	 */
	function transpileCatchClause(handler) {
	  const param = handler.param ? handler.param.name : 'ex';
	  const body = transpileBlockStatement(handler.body);
	  return `\ncatch (Exception ${param})\n{\n${indent$1(body, 4)}\n}`;
	}

	/**
	 * Transpile template literal → C# interpolated string
	 */
	function transpileTemplateLiteral(expr) {
	  let result = '$"';

	  for (let i = 0; i < expr.quasis.length; i++) {
	    result += expr.quasis[i].value.cooked;

	    if (i < expr.expressions.length) {
	      result += `{${transpileExpression(expr.expressions[i])}}`;
	    }
	  }

	  result += '"';
	  return result;
	}

	/**
	 * Escape string for C#
	 */
	function escapeString(str) {
	  return str
	    .replace(/\\/g, '\\\\')
	    .replace(/"/g, '\\"')
	    .replace(/\n/g, '\\n')
	    .replace(/\r/g, '\\r')
	    .replace(/\t/g, '\\t');
	}

	/**
	 * Capitalize first letter
	 */
	function capitalize$1(str) {
	  if (!str) return '';
	  return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Indent code
	 */
	function indent$1(code, spaces) {
	  const prefix = ' '.repeat(spaces);
	  return code.split('\n').map(line => prefix + line).join('\n');
	}

	var typescriptToCSharp = {
	  transpileAsyncFunctionToCSharp: transpileAsyncFunctionToCSharp$1,
	  transpileExpression,
	  transpileStatement,
	  transpileBlockStatement
	};

	/**
	 * Server Task Generator
	 *
	 * Generates C# async Task methods from useServerTask calls
	 */

	const { transpileAsyncFunctionToCSharp } = typescriptToCSharp;

	/**
	 * Generate C# server task methods
	 */
	function generateServerTaskMethods$1(component) {
	  if (!component.useServerTask || component.useServerTask.length === 0) {
	    return [];
	  }

	  const lines = [];

	  for (let i = 0; i < component.useServerTask.length; i++) {
	    const task = component.useServerTask[i];
	    const taskId = `serverTask_${i}`;

	    // Generate method
	    lines.push('');
	    lines.push(`    [ServerTask("${taskId}"${task.isStreaming ? ', Streaming = true' : ''})]`);

	    // Method signature
	    const returnType = task.isStreaming
	      ? `IAsyncEnumerable<${task.returnType}>`
	      : `Task<${task.returnType}>`;

	    const params = [];

	    // Add user parameters
	    for (const param of task.parameters) {
	      params.push(`${param.type} ${param.name}`);
	    }

	    // Add progress parameter (non-streaming only)
	    if (!task.isStreaming) {
	      params.push('IProgress<double> progress');
	    }

	    // Add cancellation token
	    if (task.isStreaming) {
	      params.push('[EnumeratorCancellation] CancellationToken cancellationToken = default');
	    } else {
	      params.push('CancellationToken cancellationToken');
	    }

	    const methodName = capitalize(taskId);
	    const paramsList = params.join(', ');

	    lines.push(`    private async ${returnType} ${methodName}(${paramsList})`);
	    lines.push(`    {`);

	    // Transpile function body
	    const csharpBody = transpileAsyncFunctionToCSharp(task.asyncFunction);
	    const indentedBody = indent(csharpBody, 8);

	    lines.push(indentedBody);
	    lines.push(`    }`);
	  }

	  return lines;
	}

	/**
	 * Capitalize first letter
	 */
	function capitalize(str) {
	  if (!str) return '';
	  return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Indent code
	 */
	function indent(code, spaces) {
	  const prefix = ' '.repeat(spaces);
	  return code.split('\n').map(line => line ? prefix + line : '').join('\n');
	}

	var serverTask = {
	  generateServerTaskMethods: generateServerTaskMethods$1
	};

	/**
	 * Razor Markdown to C# Conversion
	 *
	 * Converts Razor-style syntax in markdown to C# string interpolation.
	 *
	 * Input (TSX):
	 *   `# @name - $@price`
	 *
	 * Output (C#):
	 *   $@"# {name} - ${price}"
	 *
	 * Supported conversions:
	 * - @variable → {variable}
	 * - @variable.Property → {variable.Property}
	 * - @(expression) → {(expression)}
	 * - @if (cond) { ... } else { ... } → {(cond ? @"..." : @"...")}
	 * - @foreach (var x in xs) { ... } → {string.Join("\n", xs.Select(x => $@"..."))}
	 * - @for (var i = 1; i <= count; i++) { ... } → {string.Join("\n", Enumerable.Range(1, count).Select(i => $@"..."))}
	 * - @switch (x) { case ...: ... } → {x switch { ... => @"...", _ => @"..." }}
	 */

	var razorMarkdown;
	var hasRequiredRazorMarkdown;

	function requireRazorMarkdown () {
		if (hasRequiredRazorMarkdown) return razorMarkdown;
		hasRequiredRazorMarkdown = 1;
		/**
		 * Convert Razor markdown to C# interpolated string
		 *
		 * @param {string} razorMarkdown - Markdown with Razor syntax
		 * @returns {string} C# interpolated string ($@"...")
		 */
		function convertRazorMarkdownToCSharp(razorMarkdown) {
		  if (!razorMarkdown || typeof razorMarkdown !== 'string') {
		    return '$@""';
		  }

		  let markdown = razorMarkdown;

		  // Step 1: Convert @if blocks (must come before variable references)
		  markdown = convertIfBlocks(markdown);

		  // Step 2: Convert @foreach blocks
		  markdown = convertForeachBlocks(markdown);

		  // Step 3: Convert @for blocks
		  markdown = convertForBlocks(markdown);

		  // Step 4: Convert @switch blocks
		  markdown = convertSwitchBlocks(markdown);

		  // Step 5: Convert @(expression)
		  markdown = convertInlineExpressions(markdown);

		  // Step 6: Convert @variableName (must come last)
		  markdown = convertVariableReferences(markdown);

		  // Step 7: Escape any remaining unescaped quotes
		  // Already handled by nested verbatim strings (@"...")

		  // Step 8: Wrap in $@"..."
		  return `$@"${markdown}"`;
		}

		/**
		 * Convert @if blocks to C# ternary expressions
		 *
		 * @if (condition) { body } → {(condition ? @"body" : "")}
		 * @if (condition) { body } else { elseBody } → {(condition ? @"body" : @"elseBody")}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertIfBlocks(markdown) {
		  // Pattern: @if \s* ( condition ) \s* { body } [else { elseBody }]
		  // Using [\s\S] to match any character including newlines

		  const ifPattern = /@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}(?:\s*else\s*\{([\s\S]*?)\})?/g;

		  return markdown.replace(ifPattern, (match, condition, thenBody, elseBody) => {
		    const then = thenBody.trim();
		    const elsePart = elseBody ? elseBody.trim() : '';

		    // Recursively convert nested Razor in the bodies
		    const convertedThen = convertNestedRazor(then);
		    const convertedElse = elsePart ? convertNestedRazor(elsePart) : '';

		    if (convertedElse) {
		      return `{(${condition} ? @"${convertedThen}" : @"${convertedElse}")}`;
		    } else {
		      return `{(${condition} ? @"${convertedThen}" : "")}`;
		    }
		  });
		}

		/**
		 * Convert @foreach blocks to LINQ Select
		 *
		 * @foreach (var item in collection) { body } →
		 * {string.Join("\n", collection.Select(item => $@"body"))}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertForeachBlocks(markdown) {
		  // Pattern: @foreach \s* ( var itemVar in collection ) \s* { body }
		  // Using [\s\S] to match any character including newlines
		  const foreachPattern = /@foreach\s*\(\s*var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_.]*)\)\s*\{([\s\S]*?)\}/g;

		  return markdown.replace(foreachPattern, (match, itemVar, collection, body) => {
		    const bodyTrimmed = body.trim();
		    // Recursively convert nested Razor in body (preserving item variable references)
		    const convertedBody = convertNestedRazor(bodyTrimmed, itemVar);

		    return `{string.Join("\\n", ${collection}.Select(${itemVar} => $@"${convertedBody}"))}`;
		  });
		}

		/**
		 * Convert @for blocks to Enumerable.Range
		 *
		 * @for (var i = 1; i <= count; i++) { body } →
		 * {string.Join("\n", Enumerable.Range(1, count).Select(i => $@"body"))}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertForBlocks(markdown) {
		  // Pattern: @for ( var indexVar = start; indexVar <= end; indexVar++ ) { body }
		  // Using [\s\S] to match any character including newlines
		  // End can be either a number or a variable name
		  const forPattern = /@for\s*\(\s*var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(\d+)\s*;\s*\1\s*<=?\s*([a-zA-Z_0-9][a-zA-Z0-9_.]*)\s*;\s*\1\+\+\s*\)\s*\{([\s\S]*?)\}/g;

		  return markdown.replace(forPattern, (match, indexVar, start, end, body) => {
		    const bodyTrimmed = body.trim();
		    const convertedBody = convertNestedRazor(bodyTrimmed, indexVar);

		    // Enumerable.Range(start, count) where count = end - start + 1
		    // But if end is a variable, we need: Enumerable.Range(start, end - start + 1)
		    const isEndNumeric = /^\d+$/.test(end);
		    const count = isEndNumeric
		      ? (parseInt(end) - parseInt(start) + 1).toString()
		      : `${end} - ${start} + 1`;

		    return `{string.Join("\\n", Enumerable.Range(${start}, ${count}).Select(${indexVar} => $@"${convertedBody}"))}`;
		  });
		}

		/**
		 * Convert @switch blocks to C# switch expressions
		 *
		 * @switch (expr) { case "x": body break; default: defaultBody break; } →
		 * {expr switch { "x" => @"body", _ => @"defaultBody" }}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertSwitchBlocks(markdown) {
		  const switchPattern = /@switch\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/g;

		  return markdown.replace(switchPattern, (match, expr, cases) => {
		    const switchCases = [];

		    // Match case patterns: case pattern: body break;
		    const casePattern = /case\s+(.*?):([\s\S]*?)(?=break;)/g;
		    const caseMatches = [...cases.matchAll(casePattern)];

		    for (const caseMatch of caseMatches) {
		      const pattern = caseMatch[1].trim();
		      const body = caseMatch[2].trim();

		      // Recursively convert nested Razor in body
		      const convertedBody = convertNestedRazor(body);

		      // Check if pattern contains 'var' (pattern guard)
		      // e.g., "var q when q < 5"
		      if (pattern.startsWith('var ')) {
		        // Pattern guard - use $@"..." for interpolation
		        switchCases.push(`${pattern} => $@"${convertedBody}"`);
		      } else {
		        // Simple pattern - use @"..." (no interpolation needed unless body has @)
		        switchCases.push(`${pattern} => @"${convertedBody}"`);
		      }
		    }

		    // Match default case: default: body break;
		    const defaultMatch = cases.match(/default:([\s\S]*?)(?=break;)/);
		    if (defaultMatch) {
		      const body = defaultMatch[1].trim();
		      const convertedBody = convertNestedRazor(body);
		      switchCases.push(`_ => @"${convertedBody}"`);
		    }

		    return `{${expr} switch { ${switchCases.join(', ')} }}`;
		  });
		}

		/**
		 * Convert @(expression) to {(expression)}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertInlineExpressions(markdown) {
		  // Convert @(expression) → {(expression)}
		  return markdown.replace(/@\(([^)]+)\)/g, '{($1)}');
		}

		/**
		 * Convert @variableName to {variableName}
		 *
		 * @param {string} markdown
		 * @returns {string}
		 */
		function convertVariableReferences(markdown) {
		  // Convert @variableName → {variableName}
		  // Convert @variable.Property → {variable.Property}
		  // Convert @variable.Method() → {variable.Method()}

		  // Pattern: @ followed by identifier, with optional property/method chain
		  // But skip Razor keywords (already converted)
		  const keywords = ['if', 'else', 'foreach', 'for', 'while', 'switch'];

		  return markdown.replace(/@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\([^)]*\))*)/g, (match, varPath) => {
		    const rootVar = varPath.split(/[.(]/)[0];

		    // Skip Razor keywords (shouldn't happen - already converted)
		    if (keywords.includes(rootVar)) {
		      return match;
		    }

		    return `{${varPath}}`;
		  });
		}

		/**
		 * Recursively convert nested Razor syntax within bodies
		 *
		 * Used for converting Razor inside @if, @foreach, @for, @switch bodies
		 *
		 * @param {string} body - Body text that may contain nested Razor
		 * @param {string} [itemVar] - Loop item variable to preserve (for @foreach, @for)
		 * @returns {string} Body with Razor converted to C# interpolation placeholders
		 */
		function convertNestedRazor(body, itemVar = null) {
		  let result = body;

		  // Step 1: Convert @(expression)
		  result = result.replace(/@\(([^)]+)\)/g, '{($1)}');

		  // Step 2: If itemVar provided, convert @itemVar references
		  if (itemVar) {
		    // Convert @itemVar.property or @itemVar
		    const itemPattern = new RegExp(`@${itemVar}(\\.[a-zA-Z_][a-zA-Z0-9_]*|\\([^)]*\\))*`, 'g');
		    result = result.replace(itemPattern, (match) => {
		      return `{${match.substring(1)}}`; // Remove @ and wrap in {}
		    });
		  }

		  // Step 3: Convert other @variable references
		  result = result.replace(/@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\([^)]*\))*)/g, (match, varPath) => {
		    // Don't double-convert itemVar (already done above)
		    if (itemVar && varPath.startsWith(itemVar)) {
		      return match;
		    }

		    return `{${varPath}}`;
		  });

		  // Step 4: Escape quotes in the body for C# verbatim strings
		  // Replace " with "" for @"..." strings
		  result = result.replace(/"/g, '""');

		  return result;
		}

		razorMarkdown = {
		  convertRazorMarkdownToCSharp,
		  convertIfBlocks,
		  convertForeachBlocks,
		  convertForBlocks,
		  convertSwitchBlocks,
		  convertInlineExpressions,
		  convertVariableReferences,
		  convertNestedRazor
		};
		return razorMarkdown;
	}

	/**
	 * Component Generator
	 */

	const t = globalThis.__BABEL_TYPES__;
	const { generateRenderBody } = renderBody;
	const { generateCSharpExpression, generateCSharpStatement, setCurrentComponent } = requireExpressions$1();
	const { generateServerTaskMethods } = serverTask;

	/**
	 * Generate C# class for a component
	 */
	function generateComponent$1(component) {
	  // Set the current component context for useState setter detection
	  setCurrentComponent(component);

	  const lines = [];

	  // Loop template attributes (for predictive rendering)
	  if (component.loopTemplates && component.loopTemplates.length > 0) {
	    for (const loopTemplate of component.loopTemplates) {
	      const templateJson = JSON.stringify(loopTemplate)
	        .replace(/"/g, '""'); // Escape quotes for C# verbatim string

	      lines.push(`[LoopTemplate("${loopTemplate.stateKey}", @"${templateJson}")]`);
	    }
	  }

	  // StateX projection attributes (for declarative state projections)
	  if (component.useStateX && component.useStateX.length > 0) {
	    for (let i = 0; i < component.useStateX.length; i++) {
	      const stateX = component.useStateX[i];
	      const stateKey = `stateX_${i}`;

	      for (const target of stateX.targets) {
	        const parts = [];

	        // Required: stateKey and selector
	        parts.push(`"${stateKey}"`);
	        parts.push(`"${target.selector}"`);

	        // Optional: Transform (C# lambda)
	        if (target.transform) {
	          parts.push(`Transform = @"${target.transform}"`);
	        }

	        // Optional: TransformId (registry reference)
	        if (target.transformId) {
	          parts.push(`TransformId = "${target.transformId}"`);
	        }

	        // Optional: ApplyAs mode
	        if (target.applyAs && target.applyAs !== 'textContent') {
	          parts.push(`ApplyAs = "${target.applyAs}"`);
	        }

	        // Optional: Property name
	        if (target.property) {
	          parts.push(`Property = "${target.property}"`);
	        }

	        // Optional: ApplyIf condition
	        if (target.applyIf && target.applyIf.csharpCode) {
	          parts.push(`ApplyIf = @"${target.applyIf.csharpCode}"`);
	        }

	        // Optional: Template hint
	        if (target.template) {
	          parts.push(`Template = "${target.template}"`);
	        }

	        lines.push(`[StateXTransform(${parts.join(', ')})]`);
	      }
	    }
	  }

	  // Class declaration
	  lines.push('[Component]');

	  const baseClass = component.useTemplate
	    ? component.useTemplate.name
	    : 'MinimactComponent';

	  lines.push(`public partial class ${component.name} : ${baseClass}`);
	  lines.push('{');

	  // Template properties (from useTemplate)
	  if (component.useTemplate && component.useTemplate.props) {
	    for (const [propName, propValue] of Object.entries(component.useTemplate.props)) {
	      // Capitalize first letter for C# property name
	      const csharpPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
	      lines.push(`    public override string ${csharpPropName} => "${propValue}";`);
	      lines.push('');
	    }
	  }

	  // Prop fields (from function parameters)
	  for (const prop of component.props) {
	    lines.push(`    [Prop]`);
	    lines.push(`    public ${prop.type} ${prop.name} { get; set; }`);
	    lines.push('');
	  }

	  // State fields (useState)
	  for (const state of component.useState) {
	    lines.push(`    [State]`);
	    lines.push(`    private ${state.type} ${state.name} = ${state.initialValue};`);
	    lines.push('');
	  }

	  // MVC State fields (useMvcState)
	  // ❌ DO NOT GENERATE [State] FIELDS FOR useMvcState!
	  // MVC ViewModel already populates these values in the State dictionary.
	  // Instead, generate readonly properties that access State dictionary with typed GetState<T>.
	  if (component.useMvcState) {
	    for (const mvcState of component.useMvcState) {
	      const csharpType = mvcState.type || 'dynamic';
	      lines.push(`    // MVC State property: ${mvcState.propertyName}`);
	      lines.push(`    private ${csharpType} ${mvcState.name} => GetState<${csharpType}>("${mvcState.propertyName}");`);
	      lines.push('');
	    }
	  }

	  // MVC ViewModel fields (useMvcViewModel)
	  if (component.useMvcViewModel) {
	    for (const viewModel of component.useMvcViewModel) {
	      lines.push(`    // useMvcViewModel - read-only access to entire ViewModel`);
	      lines.push(`    private dynamic ${viewModel.name} = null;`);
	      lines.push('');
	    }
	  }

	  // State fields (useStateX)
	  for (const stateX of component.useStateX) {
	    lines.push(`    [State]`);
	    lines.push(`    private ${stateX.initialValueType} ${stateX.varName} = ${stateX.initialValue};`);
	    lines.push('');
	  }

	  // Ref fields (useRef)
	  for (const ref of component.useRef) {
	    lines.push(`    [Ref]`);
	    lines.push(`    private object ${ref.name} = ${ref.initialValue};`);
	    lines.push('');
	  }

	  // Markdown fields (useMarkdown)
	  for (const md of component.useMarkdown) {
	    lines.push(`    [Markdown]`);
	    lines.push(`    [State]`);
	    lines.push(`    private string ${md.name} = ${md.initialValue};`);
	    lines.push('');
	  }

	  // Razor Markdown fields (useRazorMarkdown)
	  // These are initialized in OnInitialized() after Razor syntax is evaluated
	  if (component.useRazorMarkdown) {
	    for (const md of component.useRazorMarkdown) {
	      lines.push(`    [RazorMarkdown]`);
	      lines.push(`    [State]`);
	      lines.push(`    private string ${md.name} = null!;`);
	      lines.push('');
	    }
	  }

	  // Validation fields (useValidation)
	  for (const validation of component.useValidation) {
	    lines.push(`    [Validation]`);
	    lines.push(`    private ValidationField ${validation.name} = new ValidationField`);
	    lines.push(`    {`);
	    lines.push(`        FieldKey = "${validation.fieldKey}",`);

	    // Add validation rules
	    if (validation.rules.required) {
	      lines.push(`        Required = ${validation.rules.required.toString().toLowerCase()},`);
	    }
	    if (validation.rules.minLength) {
	      lines.push(`        MinLength = ${validation.rules.minLength},`);
	    }
	    if (validation.rules.maxLength) {
	      lines.push(`        MaxLength = ${validation.rules.maxLength},`);
	    }
	    if (validation.rules.pattern) {
	      lines.push(`        Pattern = @"${validation.rules.pattern}",`);
	    }
	    if (validation.rules.message) {
	      lines.push(`        Message = "${validation.rules.message}"`);
	    }

	    lines.push(`    };`);
	    lines.push('');
	  }

	  // Modal fields (useModal)
	  for (const modal of component.useModal) {
	    lines.push(`    private ModalState ${modal.name} = new ModalState();`);
	    lines.push('');
	  }

	  // Toggle fields (useToggle)
	  for (const toggle of component.useToggle) {
	    lines.push(`    [State]`);
	    lines.push(`    private bool ${toggle.name} = ${toggle.initialValue};`);
	    lines.push('');
	  }

	  // Dropdown fields (useDropdown)
	  for (const dropdown of component.useDropdown) {
	    lines.push(`    private DropdownState ${dropdown.name} = new DropdownState();`);
	    lines.push('');
	  }

	  // Pub/Sub fields (usePub)
	  if (component.usePub) {
	    for (const pub of component.usePub) {
	      const channelStr = pub.channel ? `"${pub.channel}"` : 'null';
	      lines.push(`    // usePub: ${pub.name}`);
	      lines.push(`    private string ${pub.name}_channel = ${channelStr};`);
	      lines.push('');
	    }
	  }

	  // Pub/Sub fields (useSub)
	  if (component.useSub) {
	    for (const sub of component.useSub) {
	      const channelStr = sub.channel ? `"${sub.channel}"` : 'null';
	      lines.push(`    // useSub: ${sub.name}`);
	      lines.push(`    private string ${sub.name}_channel = ${channelStr};`);
	      lines.push(`    private dynamic ${sub.name}_value = null;`);
	      lines.push('');
	    }
	  }

	  // Task scheduling fields (useMicroTask)
	  if (component.useMicroTask) {
	    for (let i = 0; i < component.useMicroTask.length; i++) {
	      lines.push(`    // useMicroTask ${i}`);
	      lines.push(`    private bool _microTaskScheduled_${i} = false;`);
	      lines.push('');
	    }
	  }

	  // Task scheduling fields (useMacroTask)
	  if (component.useMacroTask) {
	    for (let i = 0; i < component.useMacroTask.length; i++) {
	      const task = component.useMacroTask[i];
	      lines.push(`    // useMacroTask ${i} (delay: ${task.delay}ms)`);
	      lines.push(`    private bool _macroTaskScheduled_${i} = false;`);
	      lines.push('');
	    }
	  }

	  // SignalR fields (useSignalR)
	  if (component.useSignalR) {
	    for (const signalR of component.useSignalR) {
	      const hubUrlStr = signalR.hubUrl ? `"${signalR.hubUrl}"` : 'null';
	      lines.push(`    // useSignalR: ${signalR.name}`);
	      lines.push(`    private string ${signalR.name}_hubUrl = ${hubUrlStr};`);
	      lines.push(`    private bool ${signalR.name}_connected = false;`);
	      lines.push(`    private string ${signalR.name}_connectionId = null;`);
	      lines.push(`    private string ${signalR.name}_error = null;`);
	      lines.push('');
	    }
	  }

	  // Predict hint fields (usePredictHint)
	  if (component.usePredictHint) {
	    for (let i = 0; i < component.usePredictHint.length; i++) {
	      const hint = component.usePredictHint[i];
	      const hintIdStr = hint.hintId ? `"${hint.hintId}"` : `"hint_${i}"`;
	      lines.push(`    // usePredictHint: ${hintIdStr}`);
	      lines.push(`    private string _hintId_${i} = ${hintIdStr};`);
	      lines.push('');
	    }
	  }

	  // Client-computed properties (from external libraries)
	  const clientComputedVars = component.localVariables.filter(v => v.isClientComputed);
	  if (clientComputedVars.length > 0) {
	    lines.push('    // Client-computed properties (external libraries)');
	    for (const clientVar of clientComputedVars) {
	      const csharpType = inferCSharpTypeFromInit(clientVar.init);
	      lines.push(`    [ClientComputed("${clientVar.name}")]`);
	      lines.push(`    private ${csharpType} ${clientVar.name} => GetClientState<${csharpType}>("${clientVar.name}", default);`);
	      lines.push('');
	    }
	  }

	  // Server Task methods (useServerTask)
	  const serverTaskMethods = generateServerTaskMethods(component);
	  for (const line of serverTaskMethods) {
	    lines.push(line);
	  }

	  // Render method (or RenderContent for templates)
	  const renderMethodName = component.useTemplate ? 'RenderContent' : 'Render';
	  lines.push(`    protected override VNode ${renderMethodName}()`);
	  lines.push('    {');

	  // Only add StateManager sync if NOT using a template (templates handle this themselves)
	  if (!component.useTemplate) {
	    lines.push('        StateManager.SyncMembersToState(this);');
	    lines.push('');
	  }

	  // MVC State local variables - read from State dictionary
	  if (component.useMvcState && component.useMvcState.length > 0) {
	    lines.push('        // MVC State - read from State dictionary');
	    for (const mvcState of component.useMvcState) {
	      const csharpType = mvcState.type !== 'object' ? mvcState.type : 'dynamic';
	      // Use propertyName (e.g., 'initialQuantity') not variable name (e.g., 'quantity')
	      lines.push(`        var ${mvcState.name} = GetState<${csharpType}>("${mvcState.propertyName}");`);
	    }
	    lines.push('');
	  }

	  // Local variables (exclude client-computed ones, they're properties now)
	  const regularLocalVars = component.localVariables.filter(v => !v.isClientComputed);
	  for (const localVar of regularLocalVars) {
	    lines.push(`        ${localVar.type} ${localVar.name} = ${localVar.initialValue};`);
	  }
	  if (regularLocalVars.length > 0) {
	    lines.push('');
	  }

	  if (component.renderBody) {
	    const renderCode = generateRenderBody(component.renderBody, component, 2);
	    lines.push(renderCode);
	  } else {
	    lines.push('        return new VText("");');
	  }

	  lines.push('    }');

	  // Effect methods (useEffect)
	  let effectIndex = 0;
	  for (const effect of component.useEffect) {
	    lines.push('');

	    // Extract dependency names from array
	    const deps = [];
	    if (effect.dependencies && t.isArrayExpression(effect.dependencies)) {
	      for (const dep of effect.dependencies.elements) {
	        if (t.isIdentifier(dep)) {
	          deps.push(dep.name);
	        }
	      }
	    }

	    // Generate [OnStateChanged] for each dependency
	    for (const dep of deps) {
	      lines.push(`    [OnStateChanged("${dep}")]`);
	    }

	    lines.push(`    private void Effect_${effectIndex}()`);
	    lines.push('    {');

	    // Extract and convert effect body
	    if (effect.body && t.isArrowFunctionExpression(effect.body)) {
	      const body = effect.body.body;
	      if (t.isBlockStatement(body)) {
	        // Multi-statement effect
	        for (const stmt of body.body) {
	          lines.push(`        ${generateCSharpStatement(stmt)}`);
	        }
	      } else {
	        // Single expression effect
	        lines.push(`        ${generateCSharpExpression(body)};`);
	      }
	    }

	    lines.push('    }');
	    effectIndex++;
	  }

	  // Event handlers
	  for (const handler of component.eventHandlers) {
	    lines.push('');

	    // Generate parameter list
	    const params = handler.params || [];
	    let paramList = params.length > 0
	      ? params.map(p => t.isIdentifier(p) ? `dynamic ${p.name}` : 'dynamic arg')
	      : [];

	    // Add captured parameters from .map() context (e.g., item, index)
	    const capturedParams = handler.capturedParams || [];
	    if (capturedParams.length > 0) {
	      paramList = paramList.concat(capturedParams.map(p => `dynamic ${p}`));
	    }

	    const paramStr = paramList.join(', ');

	    // Event handlers must be public so SignalR hub can call them
	    // Use async Task if handler contains await
	    const returnType = handler.isAsync ? 'async Task' : 'void';
	    lines.push(`    public ${returnType} ${handler.name}(${paramStr})`);
	    lines.push('    {');

	    // Check if this is a curried function error
	    if (handler.isCurriedError) {
	      lines.push(`        throw new InvalidOperationException(`);
	      lines.push(`            "Event handler '${handler.name}' returns a function instead of executing an action. " +`);
	      lines.push(`            "This is a curried function pattern (e.g., (e) => (id) => action(id)) which is invalid for event handlers. " +`);
	      lines.push(`            "The returned function is never called by the event system. " +`);
	      lines.push(`            "Fix: Use (e) => action(someValue) or create a properly bound handler."`);
	      lines.push(`        );`);
	    }
	    // Generate method body
	    else if (handler.body) {
	      if (t.isBlockStatement(handler.body)) {
	        // Block statement: { ... }
	        for (const statement of handler.body.body) {
	          const csharpStmt = generateCSharpStatement(statement);
	          if (csharpStmt) {
	            lines.push(`        ${csharpStmt}`);
	          }
	        }
	      } else {
	        // Expression body: () => expression
	        const csharpExpr = generateCSharpExpression(handler.body);
	        lines.push(`        ${csharpExpr};`);
	      }
	    }

	    lines.push('    }');
	  }

	  // Toggle methods (useToggle)
	  for (const toggle of component.useToggle) {
	    lines.push('');
	    lines.push(`    private void ${toggle.toggleFunc}()`);
	    lines.push('    {');
	    lines.push(`        ${toggle.name} = !${toggle.name};`);
	    lines.push(`        SetState("${toggle.name}", ${toggle.name});`);
	    lines.push('    }');
	  }

	  // MVC State setter methods (useMvcState)
	  // MVC State setter methods - REMOVED
	  // These are now generated at the end of the class (after event handlers)
	  // with the correct property names from the ViewModel (not variable names)

	  // Pub/Sub methods (usePub)
	  if (component.usePub) {
	    for (const pub of component.usePub) {
	      lines.push('');
	      lines.push(`    // Publish to ${pub.name}_channel`);
	      lines.push(`    private void ${pub.name}(dynamic value, PubSubOptions? options = null)`);
	      lines.push('    {');
	      lines.push(`        EventAggregator.Instance.Publish(${pub.name}_channel, value, options);`);
	      lines.push('    }');
	    }
	  }

	  // Pub/Sub methods (useSub)
	  if (component.useSub) {
	    for (const sub of component.useSub) {
	      lines.push('');
	      lines.push(`    // Subscribe to ${sub.name}_channel`);
	      lines.push(`    protected override void OnInitialized()`);
	      lines.push('    {');
	      lines.push(`        base.OnInitialized();`);
	      lines.push(`        `);
	      lines.push(`        // Subscribe to ${sub.name}_channel`);
	      lines.push(`        EventAggregator.Instance.Subscribe(${sub.name}_channel, (msg) => {`);
	      lines.push(`            ${sub.name}_value = msg.Value;`);
	      lines.push(`            SetState("${sub.name}_value", ${sub.name}_value);`);
	      lines.push(`        });`);
	      lines.push('    }');
	    }
	  }

	  // SignalR methods (useSignalR)
	  if (component.useSignalR) {
	    for (const signalR of component.useSignalR) {
	      lines.push('');
	      lines.push(`    // SignalR send method for ${signalR.name}`);
	      lines.push(`    // Note: useSignalR is primarily client-side.`);
	      lines.push(`    // Server-side SignalR invocation can use HubContext directly if needed.`);
	      lines.push(`    private async Task ${signalR.name}_send(string methodName, params object[] args)`);
	      lines.push('    {');
	      lines.push(`        if (HubContext != null && ConnectionId != null)`);
	      lines.push(`        {`);
	      lines.push(`            // Send message to specific client connection`);
	      lines.push(`            await HubContext.Clients.Client(ConnectionId).SendAsync(methodName, args);`);
	      lines.push(`        }`);
	      lines.push('    }');
	    }
	  }

	  // MVC State setter methods
	  if (component.useMvcState) {
	    for (const mvcState of component.useMvcState) {
	      if (mvcState.setter) {
	        const csharpType = mvcState.type !== 'object' ? mvcState.type : 'dynamic';
	        lines.push('');
	        lines.push(`    private void ${mvcState.setter}(${csharpType} value)`);
	        lines.push('    {');
	        lines.push(`        SetState("${mvcState.propertyName}", value);`);
	        lines.push('    }');
	      }
	    }
	  }

	  // OnInitialized method for Razor Markdown initialization
	  if (component.useRazorMarkdown && component.useRazorMarkdown.length > 0) {
	    const { convertRazorMarkdownToCSharp } = requireRazorMarkdown();

	    lines.push('');
	    lines.push('    protected override void OnInitialized()');
	    lines.push('    {');
	    lines.push('        base.OnInitialized();');
	    lines.push('');

	    for (const md of component.useRazorMarkdown) {
	      // Convert Razor markdown to C# string interpolation
	      const csharpMarkdown = convertRazorMarkdownToCSharp(md.initialValue);
	      lines.push(`        ${md.name} = ${csharpMarkdown};`);
	    }

	    lines.push('    }');
	  }

	  // Helper functions (function declarations in component body)
	  if (component.helperFunctions && component.helperFunctions.length > 0) {
	    for (const func of component.helperFunctions) {
	      lines.push('');

	      const returnType = func.isAsync
	        ? (func.returnType === 'void' ? 'async Task' : `async Task<${func.returnType}>`)
	        : func.returnType;

	      const params = (func.params || []).map(p => `${p.type} ${p.name}`).join(', ');

	      lines.push(`    private ${returnType} ${func.name}(${params})`);
	      lines.push('    {');

	      // Generate function body
	      if (func.body && t.isBlockStatement(func.body)) {
	        for (const statement of func.body.body) {
	          const stmtCode = generateCSharpStatement(statement, 2);
	          lines.push(stmtCode);
	        }
	      }

	      lines.push('    }');
	    }
	  }

	  // Helper functions (standalone functions referenced by component)
	  if (component.topLevelHelperFunctions && component.topLevelHelperFunctions.length > 0) {
	    for (const helper of component.topLevelHelperFunctions) {
	      lines.push('');
	      lines.push(`    // Helper function: ${helper.name}`);

	      // Generate the function signature
	      const func = helper.node;
	      const params = (func.params || []).map(p => {
	        // Get parameter type from TypeScript annotation
	        let paramType = 'dynamic';
	        if (p.typeAnnotation && p.typeAnnotation.typeAnnotation) {
	          paramType = tsTypeToCSharpType(p.typeAnnotation.typeAnnotation);
	        }
	        return `${paramType} ${p.name}`;
	      }).join(', ');

	      // Get return type from TypeScript annotation
	      let returnType = 'dynamic';
	      if (func.returnType && func.returnType.typeAnnotation) {
	        returnType = tsTypeToCSharpType(func.returnType.typeAnnotation);
	      }

	      lines.push(`    private static ${returnType} ${helper.name}(${params})`);
	      lines.push('    {');

	      // Generate function body
	      if (t.isBlockStatement(func.body)) {
	        for (const statement of func.body.body) {
	          const csharpStmt = generateCSharpStatement(statement);
	          if (csharpStmt) {
	            lines.push(`        ${csharpStmt}`);
	          }
	        }
	      } else {
	        // Expression body (arrow function)
	        const csharpExpr = generateCSharpExpression(func.body);
	        lines.push(`        return ${csharpExpr};`);
	      }

	      lines.push('    }');
	    }
	  }

	  lines.push('}');

	  return lines;
	}

	/**
	 * Infer C# type from JavaScript AST node (for client-computed variables)
	 */
	function inferCSharpTypeFromInit(node) {
	  if (!node) return 'dynamic';

	  // Array types
	  if (t.isArrayExpression(node)) {
	    return 'List<dynamic>';
	  }

	  // Call expressions - try to infer from method name
	  if (t.isCallExpression(node)) {
	    const callee = node.callee;

	    if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
	      const method = callee.property.name;

	      // Common array methods return arrays
	      if (['map', 'filter', 'sort', 'sortBy', 'orderBy', 'slice', 'concat'].includes(method)) {
	        return 'List<dynamic>';
	      }

	      // Aggregation methods return numbers
	      if (['reduce', 'sum', 'sumBy', 'mean', 'meanBy', 'average', 'count', 'size'].includes(method)) {
	        return 'double';
	      }

	      // Find methods return single item
	      if (['find', 'minBy', 'maxBy', 'first', 'last'].includes(method)) {
	        return 'dynamic';
	      }

	      // String methods
	      if (['format', 'toString', 'join'].includes(method)) {
	        return 'string';
	      }
	    }

	    // Direct function calls (moment(), _.chain(), etc.)
	    return 'dynamic';
	  }

	  // String operations
	  if (t.isTemplateLiteral(node) || t.isStringLiteral(node)) {
	    return 'string';
	  }

	  // Numbers
	  if (t.isNumericLiteral(node)) {
	    return 'double';
	  }

	  // Booleans
	  if (t.isBooleanLiteral(node)) {
	    return 'bool';
	  }

	  // Binary expressions - try to infer from operation
	  if (t.isBinaryExpression(node)) {
	    if (['+', '-', '*', '/', '%'].includes(node.operator)) {
	      return 'double';
	    }
	    if (['==', '===', '!=', '!==', '<', '>', '<=', '>='].includes(node.operator)) {
	      return 'bool';
	    }
	  }

	  // Logical expressions
	  if (t.isLogicalExpression(node)) {
	    return 'bool';
	  }

	  // Default to dynamic
	  return 'dynamic';
	}

	var component = {
	  generateComponent: generateComponent$1,
	  inferCSharpTypeFromInit
	};

	/**
	 * C# File Generator
	 */

	const { generateComponent } = component;
	const { usesPlugins } = requirePlugin();

	/**
	 * Generate C# file from components
	 */
	function generateCSharpFile$1(components, state) {
	  const lines = [];

	  // Check if any component uses plugins
	  const hasPlugins = components.some(c => usesPlugins(c));

	  // Usings
	  lines.push('using Minimact.AspNetCore.Core;');
	  lines.push('using Minimact.AspNetCore.Extensions;');
	  lines.push('using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;');
	  lines.push('using System.Collections.Generic;');
	  lines.push('using System.Linq;');
	  lines.push('using System.Threading.Tasks;');

	  // Add plugin using directives if any component uses plugins
	  if (hasPlugins) {
	    lines.push('using Minimact.AspNetCore.Plugins;');
	  }

	  lines.push('');

	  // Namespace (extract from file path or use default)
	  const namespace = state.opts.namespace || 'Minimact.Components';
	  lines.push(`namespace ${namespace};`);
	  lines.push('');

	  // Generate each component
	  for (const component of components) {
	    lines.push(...generateComponent(component));
	    lines.push('');
	  }

	  return lines.join('\n');
	}


	var csharpFile = {
	  generateCSharpFile: generateCSharpFile$1
	};

	var lib = {};

	var sourceMap = {};

	var genMapping_umd = {exports: {}};

	var sourcemapCodec_umd = {exports: {}};

	var hasRequiredSourcemapCodec_umd;

	function requireSourcemapCodec_umd () {
		if (hasRequiredSourcemapCodec_umd) return sourcemapCodec_umd.exports;
		hasRequiredSourcemapCodec_umd = 1;
		(function (module, exports) {
			(function (global, factory) {
			  {
			    factory(module);
			    module.exports = def(module);
			  }
			  function def(m) { return 'default' in m.exports ? m.exports.default : m.exports; }
			})(commonjsGlobal, (function (module) {
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __export = (target, all) => {
			  for (var name in all)
			    __defProp(target, name, { get: all[name], enumerable: true });
			};
			var __copyProps = (to, from, except, desc) => {
			  if (from && typeof from === "object" || typeof from === "function") {
			    for (let key of __getOwnPropNames(from))
			      if (!__hasOwnProp.call(to, key) && key !== except)
			        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
			  }
			  return to;
			};
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

			// src/sourcemap-codec.ts
			var sourcemap_codec_exports = {};
			__export(sourcemap_codec_exports, {
			  decode: () => decode,
			  decodeGeneratedRanges: () => decodeGeneratedRanges,
			  decodeOriginalScopes: () => decodeOriginalScopes,
			  encode: () => encode,
			  encodeGeneratedRanges: () => encodeGeneratedRanges,
			  encodeOriginalScopes: () => encodeOriginalScopes
			});
			module.exports = __toCommonJS(sourcemap_codec_exports);

			// src/vlq.ts
			var comma = ",".charCodeAt(0);
			var semicolon = ";".charCodeAt(0);
			var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
			var intToChar = new Uint8Array(64);
			var charToInt = new Uint8Array(128);
			for (let i = 0; i < chars.length; i++) {
			  const c = chars.charCodeAt(i);
			  intToChar[i] = c;
			  charToInt[c] = i;
			}
			function decodeInteger(reader, relative) {
			  let value = 0;
			  let shift = 0;
			  let integer = 0;
			  do {
			    const c = reader.next();
			    integer = charToInt[c];
			    value |= (integer & 31) << shift;
			    shift += 5;
			  } while (integer & 32);
			  const shouldNegate = value & 1;
			  value >>>= 1;
			  if (shouldNegate) {
			    value = -2147483648 | -value;
			  }
			  return relative + value;
			}
			function encodeInteger(builder, num, relative) {
			  let delta = num - relative;
			  delta = delta < 0 ? -delta << 1 | 1 : delta << 1;
			  do {
			    let clamped = delta & 31;
			    delta >>>= 5;
			    if (delta > 0) clamped |= 32;
			    builder.write(intToChar[clamped]);
			  } while (delta > 0);
			  return num;
			}
			function hasMoreVlq(reader, max) {
			  if (reader.pos >= max) return false;
			  return reader.peek() !== comma;
			}

			// src/strings.ts
			var bufLength = 1024 * 16;
			var td = typeof TextDecoder !== "undefined" ? /* @__PURE__ */ new TextDecoder() : typeof Buffer !== "undefined" ? {
			  decode(buf) {
			    const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
			    return out.toString();
			  }
			} : {
			  decode(buf) {
			    let out = "";
			    for (let i = 0; i < buf.length; i++) {
			      out += String.fromCharCode(buf[i]);
			    }
			    return out;
			  }
			};
			var StringWriter = class {
			  constructor() {
			    this.pos = 0;
			    this.out = "";
			    this.buffer = new Uint8Array(bufLength);
			  }
			  write(v) {
			    const { buffer } = this;
			    buffer[this.pos++] = v;
			    if (this.pos === bufLength) {
			      this.out += td.decode(buffer);
			      this.pos = 0;
			    }
			  }
			  flush() {
			    const { buffer, out, pos } = this;
			    return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
			  }
			};
			var StringReader = class {
			  constructor(buffer) {
			    this.pos = 0;
			    this.buffer = buffer;
			  }
			  next() {
			    return this.buffer.charCodeAt(this.pos++);
			  }
			  peek() {
			    return this.buffer.charCodeAt(this.pos);
			  }
			  indexOf(char) {
			    const { buffer, pos } = this;
			    const idx = buffer.indexOf(char, pos);
			    return idx === -1 ? buffer.length : idx;
			  }
			};

			// src/scopes.ts
			var EMPTY = [];
			function decodeOriginalScopes(input) {
			  const { length } = input;
			  const reader = new StringReader(input);
			  const scopes = [];
			  const stack = [];
			  let line = 0;
			  for (; reader.pos < length; reader.pos++) {
			    line = decodeInteger(reader, line);
			    const column = decodeInteger(reader, 0);
			    if (!hasMoreVlq(reader, length)) {
			      const last = stack.pop();
			      last[2] = line;
			      last[3] = column;
			      continue;
			    }
			    const kind = decodeInteger(reader, 0);
			    const fields = decodeInteger(reader, 0);
			    const hasName = fields & 1;
			    const scope = hasName ? [line, column, 0, 0, kind, decodeInteger(reader, 0)] : [line, column, 0, 0, kind];
			    let vars = EMPTY;
			    if (hasMoreVlq(reader, length)) {
			      vars = [];
			      do {
			        const varsIndex = decodeInteger(reader, 0);
			        vars.push(varsIndex);
			      } while (hasMoreVlq(reader, length));
			    }
			    scope.vars = vars;
			    scopes.push(scope);
			    stack.push(scope);
			  }
			  return scopes;
			}
			function encodeOriginalScopes(scopes) {
			  const writer = new StringWriter();
			  for (let i = 0; i < scopes.length; ) {
			    i = _encodeOriginalScopes(scopes, i, writer, [0]);
			  }
			  return writer.flush();
			}
			function _encodeOriginalScopes(scopes, index, writer, state) {
			  const scope = scopes[index];
			  const { 0: startLine, 1: startColumn, 2: endLine, 3: endColumn, 4: kind, vars } = scope;
			  if (index > 0) writer.write(comma);
			  state[0] = encodeInteger(writer, startLine, state[0]);
			  encodeInteger(writer, startColumn, 0);
			  encodeInteger(writer, kind, 0);
			  const fields = scope.length === 6 ? 1 : 0;
			  encodeInteger(writer, fields, 0);
			  if (scope.length === 6) encodeInteger(writer, scope[5], 0);
			  for (const v of vars) {
			    encodeInteger(writer, v, 0);
			  }
			  for (index++; index < scopes.length; ) {
			    const next = scopes[index];
			    const { 0: l, 1: c } = next;
			    if (l > endLine || l === endLine && c >= endColumn) {
			      break;
			    }
			    index = _encodeOriginalScopes(scopes, index, writer, state);
			  }
			  writer.write(comma);
			  state[0] = encodeInteger(writer, endLine, state[0]);
			  encodeInteger(writer, endColumn, 0);
			  return index;
			}
			function decodeGeneratedRanges(input) {
			  const { length } = input;
			  const reader = new StringReader(input);
			  const ranges = [];
			  const stack = [];
			  let genLine = 0;
			  let definitionSourcesIndex = 0;
			  let definitionScopeIndex = 0;
			  let callsiteSourcesIndex = 0;
			  let callsiteLine = 0;
			  let callsiteColumn = 0;
			  let bindingLine = 0;
			  let bindingColumn = 0;
			  do {
			    const semi = reader.indexOf(";");
			    let genColumn = 0;
			    for (; reader.pos < semi; reader.pos++) {
			      genColumn = decodeInteger(reader, genColumn);
			      if (!hasMoreVlq(reader, semi)) {
			        const last = stack.pop();
			        last[2] = genLine;
			        last[3] = genColumn;
			        continue;
			      }
			      const fields = decodeInteger(reader, 0);
			      const hasDefinition = fields & 1;
			      const hasCallsite = fields & 2;
			      const hasScope = fields & 4;
			      let callsite = null;
			      let bindings = EMPTY;
			      let range;
			      if (hasDefinition) {
			        const defSourcesIndex = decodeInteger(reader, definitionSourcesIndex);
			        definitionScopeIndex = decodeInteger(
			          reader,
			          definitionSourcesIndex === defSourcesIndex ? definitionScopeIndex : 0
			        );
			        definitionSourcesIndex = defSourcesIndex;
			        range = [genLine, genColumn, 0, 0, defSourcesIndex, definitionScopeIndex];
			      } else {
			        range = [genLine, genColumn, 0, 0];
			      }
			      range.isScope = !!hasScope;
			      if (hasCallsite) {
			        const prevCsi = callsiteSourcesIndex;
			        const prevLine = callsiteLine;
			        callsiteSourcesIndex = decodeInteger(reader, callsiteSourcesIndex);
			        const sameSource = prevCsi === callsiteSourcesIndex;
			        callsiteLine = decodeInteger(reader, sameSource ? callsiteLine : 0);
			        callsiteColumn = decodeInteger(
			          reader,
			          sameSource && prevLine === callsiteLine ? callsiteColumn : 0
			        );
			        callsite = [callsiteSourcesIndex, callsiteLine, callsiteColumn];
			      }
			      range.callsite = callsite;
			      if (hasMoreVlq(reader, semi)) {
			        bindings = [];
			        do {
			          bindingLine = genLine;
			          bindingColumn = genColumn;
			          const expressionsCount = decodeInteger(reader, 0);
			          let expressionRanges;
			          if (expressionsCount < -1) {
			            expressionRanges = [[decodeInteger(reader, 0)]];
			            for (let i = -1; i > expressionsCount; i--) {
			              const prevBl = bindingLine;
			              bindingLine = decodeInteger(reader, bindingLine);
			              bindingColumn = decodeInteger(reader, bindingLine === prevBl ? bindingColumn : 0);
			              const expression = decodeInteger(reader, 0);
			              expressionRanges.push([expression, bindingLine, bindingColumn]);
			            }
			          } else {
			            expressionRanges = [[expressionsCount]];
			          }
			          bindings.push(expressionRanges);
			        } while (hasMoreVlq(reader, semi));
			      }
			      range.bindings = bindings;
			      ranges.push(range);
			      stack.push(range);
			    }
			    genLine++;
			    reader.pos = semi + 1;
			  } while (reader.pos < length);
			  return ranges;
			}
			function encodeGeneratedRanges(ranges) {
			  if (ranges.length === 0) return "";
			  const writer = new StringWriter();
			  for (let i = 0; i < ranges.length; ) {
			    i = _encodeGeneratedRanges(ranges, i, writer, [0, 0, 0, 0, 0, 0, 0]);
			  }
			  return writer.flush();
			}
			function _encodeGeneratedRanges(ranges, index, writer, state) {
			  const range = ranges[index];
			  const {
			    0: startLine,
			    1: startColumn,
			    2: endLine,
			    3: endColumn,
			    isScope,
			    callsite,
			    bindings
			  } = range;
			  if (state[0] < startLine) {
			    catchupLine(writer, state[0], startLine);
			    state[0] = startLine;
			    state[1] = 0;
			  } else if (index > 0) {
			    writer.write(comma);
			  }
			  state[1] = encodeInteger(writer, range[1], state[1]);
			  const fields = (range.length === 6 ? 1 : 0) | (callsite ? 2 : 0) | (isScope ? 4 : 0);
			  encodeInteger(writer, fields, 0);
			  if (range.length === 6) {
			    const { 4: sourcesIndex, 5: scopesIndex } = range;
			    if (sourcesIndex !== state[2]) {
			      state[3] = 0;
			    }
			    state[2] = encodeInteger(writer, sourcesIndex, state[2]);
			    state[3] = encodeInteger(writer, scopesIndex, state[3]);
			  }
			  if (callsite) {
			    const { 0: sourcesIndex, 1: callLine, 2: callColumn } = range.callsite;
			    if (sourcesIndex !== state[4]) {
			      state[5] = 0;
			      state[6] = 0;
			    } else if (callLine !== state[5]) {
			      state[6] = 0;
			    }
			    state[4] = encodeInteger(writer, sourcesIndex, state[4]);
			    state[5] = encodeInteger(writer, callLine, state[5]);
			    state[6] = encodeInteger(writer, callColumn, state[6]);
			  }
			  if (bindings) {
			    for (const binding of bindings) {
			      if (binding.length > 1) encodeInteger(writer, -binding.length, 0);
			      const expression = binding[0][0];
			      encodeInteger(writer, expression, 0);
			      let bindingStartLine = startLine;
			      let bindingStartColumn = startColumn;
			      for (let i = 1; i < binding.length; i++) {
			        const expRange = binding[i];
			        bindingStartLine = encodeInteger(writer, expRange[1], bindingStartLine);
			        bindingStartColumn = encodeInteger(writer, expRange[2], bindingStartColumn);
			        encodeInteger(writer, expRange[0], 0);
			      }
			    }
			  }
			  for (index++; index < ranges.length; ) {
			    const next = ranges[index];
			    const { 0: l, 1: c } = next;
			    if (l > endLine || l === endLine && c >= endColumn) {
			      break;
			    }
			    index = _encodeGeneratedRanges(ranges, index, writer, state);
			  }
			  if (state[0] < endLine) {
			    catchupLine(writer, state[0], endLine);
			    state[0] = endLine;
			    state[1] = 0;
			  } else {
			    writer.write(comma);
			  }
			  state[1] = encodeInteger(writer, endColumn, state[1]);
			  return index;
			}
			function catchupLine(writer, lastLine, line) {
			  do {
			    writer.write(semicolon);
			  } while (++lastLine < line);
			}

			// src/sourcemap-codec.ts
			function decode(mappings) {
			  const { length } = mappings;
			  const reader = new StringReader(mappings);
			  const decoded = [];
			  let genColumn = 0;
			  let sourcesIndex = 0;
			  let sourceLine = 0;
			  let sourceColumn = 0;
			  let namesIndex = 0;
			  do {
			    const semi = reader.indexOf(";");
			    const line = [];
			    let sorted = true;
			    let lastCol = 0;
			    genColumn = 0;
			    while (reader.pos < semi) {
			      let seg;
			      genColumn = decodeInteger(reader, genColumn);
			      if (genColumn < lastCol) sorted = false;
			      lastCol = genColumn;
			      if (hasMoreVlq(reader, semi)) {
			        sourcesIndex = decodeInteger(reader, sourcesIndex);
			        sourceLine = decodeInteger(reader, sourceLine);
			        sourceColumn = decodeInteger(reader, sourceColumn);
			        if (hasMoreVlq(reader, semi)) {
			          namesIndex = decodeInteger(reader, namesIndex);
			          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
			        } else {
			          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
			        }
			      } else {
			        seg = [genColumn];
			      }
			      line.push(seg);
			      reader.pos++;
			    }
			    if (!sorted) sort(line);
			    decoded.push(line);
			    reader.pos = semi + 1;
			  } while (reader.pos <= length);
			  return decoded;
			}
			function sort(line) {
			  line.sort(sortComparator);
			}
			function sortComparator(a, b) {
			  return a[0] - b[0];
			}
			function encode(decoded) {
			  const writer = new StringWriter();
			  let sourcesIndex = 0;
			  let sourceLine = 0;
			  let sourceColumn = 0;
			  let namesIndex = 0;
			  for (let i = 0; i < decoded.length; i++) {
			    const line = decoded[i];
			    if (i > 0) writer.write(semicolon);
			    if (line.length === 0) continue;
			    let genColumn = 0;
			    for (let j = 0; j < line.length; j++) {
			      const segment = line[j];
			      if (j > 0) writer.write(comma);
			      genColumn = encodeInteger(writer, segment[0], genColumn);
			      if (segment.length === 1) continue;
			      sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex);
			      sourceLine = encodeInteger(writer, segment[2], sourceLine);
			      sourceColumn = encodeInteger(writer, segment[3], sourceColumn);
			      if (segment.length === 4) continue;
			      namesIndex = encodeInteger(writer, segment[4], namesIndex);
			    }
			  }
			  return writer.flush();
			}
			}));
			
		} (sourcemapCodec_umd));
		return sourcemapCodec_umd.exports;
	}

	var traceMapping_umd = {exports: {}};

	var resolveUri_umd = {exports: {}};

	var hasRequiredResolveUri_umd;

	function requireResolveUri_umd () {
		if (hasRequiredResolveUri_umd) return resolveUri_umd.exports;
		hasRequiredResolveUri_umd = 1;
		(function (module, exports) {
			(function (global, factory) {
			    module.exports = factory() ;
			})(commonjsGlobal, (function () {
			    // Matches the scheme of a URL, eg "http://"
			    const schemeRegex = /^[\w+.-]+:\/\//;
			    /**
			     * Matches the parts of a URL:
			     * 1. Scheme, including ":", guaranteed.
			     * 2. User/password, including "@", optional.
			     * 3. Host, guaranteed.
			     * 4. Port, including ":", optional.
			     * 5. Path, including "/", optional.
			     * 6. Query, including "?", optional.
			     * 7. Hash, including "#", optional.
			     */
			    const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
			    /**
			     * File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
			     * with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
			     *
			     * 1. Host, optional.
			     * 2. Path, which may include "/", guaranteed.
			     * 3. Query, including "?", optional.
			     * 4. Hash, including "#", optional.
			     */
			    const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
			    function isAbsoluteUrl(input) {
			        return schemeRegex.test(input);
			    }
			    function isSchemeRelativeUrl(input) {
			        return input.startsWith('//');
			    }
			    function isAbsolutePath(input) {
			        return input.startsWith('/');
			    }
			    function isFileUrl(input) {
			        return input.startsWith('file:');
			    }
			    function isRelative(input) {
			        return /^[.?#]/.test(input);
			    }
			    function parseAbsoluteUrl(input) {
			        const match = urlRegex.exec(input);
			        return makeUrl(match[1], match[2] || '', match[3], match[4] || '', match[5] || '/', match[6] || '', match[7] || '');
			    }
			    function parseFileUrl(input) {
			        const match = fileRegex.exec(input);
			        const path = match[2];
			        return makeUrl('file:', '', match[1] || '', '', isAbsolutePath(path) ? path : '/' + path, match[3] || '', match[4] || '');
			    }
			    function makeUrl(scheme, user, host, port, path, query, hash) {
			        return {
			            scheme,
			            user,
			            host,
			            port,
			            path,
			            query,
			            hash,
			            type: 7 /* Absolute */,
			        };
			    }
			    function parseUrl(input) {
			        if (isSchemeRelativeUrl(input)) {
			            const url = parseAbsoluteUrl('http:' + input);
			            url.scheme = '';
			            url.type = 6 /* SchemeRelative */;
			            return url;
			        }
			        if (isAbsolutePath(input)) {
			            const url = parseAbsoluteUrl('http://foo.com' + input);
			            url.scheme = '';
			            url.host = '';
			            url.type = 5 /* AbsolutePath */;
			            return url;
			        }
			        if (isFileUrl(input))
			            return parseFileUrl(input);
			        if (isAbsoluteUrl(input))
			            return parseAbsoluteUrl(input);
			        const url = parseAbsoluteUrl('http://foo.com/' + input);
			        url.scheme = '';
			        url.host = '';
			        url.type = input
			            ? input.startsWith('?')
			                ? 3 /* Query */
			                : input.startsWith('#')
			                    ? 2 /* Hash */
			                    : 4 /* RelativePath */
			            : 1 /* Empty */;
			        return url;
			    }
			    function stripPathFilename(path) {
			        // If a path ends with a parent directory "..", then it's a relative path with excess parent
			        // paths. It's not a file, so we can't strip it.
			        if (path.endsWith('/..'))
			            return path;
			        const index = path.lastIndexOf('/');
			        return path.slice(0, index + 1);
			    }
			    function mergePaths(url, base) {
			        normalizePath(base, base.type);
			        // If the path is just a "/", then it was an empty path to begin with (remember, we're a relative
			        // path).
			        if (url.path === '/') {
			            url.path = base.path;
			        }
			        else {
			            // Resolution happens relative to the base path's directory, not the file.
			            url.path = stripPathFilename(base.path) + url.path;
			        }
			    }
			    /**
			     * The path can have empty directories "//", unneeded parents "foo/..", or current directory
			     * "foo/.". We need to normalize to a standard representation.
			     */
			    function normalizePath(url, type) {
			        const rel = type <= 4 /* RelativePath */;
			        const pieces = url.path.split('/');
			        // We need to preserve the first piece always, so that we output a leading slash. The item at
			        // pieces[0] is an empty string.
			        let pointer = 1;
			        // Positive is the number of real directories we've output, used for popping a parent directory.
			        // Eg, "foo/bar/.." will have a positive 2, and we can decrement to be left with just "foo".
			        let positive = 0;
			        // We need to keep a trailing slash if we encounter an empty directory (eg, splitting "foo/" will
			        // generate `["foo", ""]` pieces). And, if we pop a parent directory. But once we encounter a
			        // real directory, we won't need to append, unless the other conditions happen again.
			        let addTrailingSlash = false;
			        for (let i = 1; i < pieces.length; i++) {
			            const piece = pieces[i];
			            // An empty directory, could be a trailing slash, or just a double "//" in the path.
			            if (!piece) {
			                addTrailingSlash = true;
			                continue;
			            }
			            // If we encounter a real directory, then we don't need to append anymore.
			            addTrailingSlash = false;
			            // A current directory, which we can always drop.
			            if (piece === '.')
			                continue;
			            // A parent directory, we need to see if there are any real directories we can pop. Else, we
			            // have an excess of parents, and we'll need to keep the "..".
			            if (piece === '..') {
			                if (positive) {
			                    addTrailingSlash = true;
			                    positive--;
			                    pointer--;
			                }
			                else if (rel) {
			                    // If we're in a relativePath, then we need to keep the excess parents. Else, in an absolute
			                    // URL, protocol relative URL, or an absolute path, we don't need to keep excess.
			                    pieces[pointer++] = piece;
			                }
			                continue;
			            }
			            // We've encountered a real directory. Move it to the next insertion pointer, which accounts for
			            // any popped or dropped directories.
			            pieces[pointer++] = piece;
			            positive++;
			        }
			        let path = '';
			        for (let i = 1; i < pointer; i++) {
			            path += '/' + pieces[i];
			        }
			        if (!path || (addTrailingSlash && !path.endsWith('/..'))) {
			            path += '/';
			        }
			        url.path = path;
			    }
			    /**
			     * Attempts to resolve `input` URL/path relative to `base`.
			     */
			    function resolve(input, base) {
			        if (!input && !base)
			            return '';
			        const url = parseUrl(input);
			        let inputType = url.type;
			        if (base && inputType !== 7 /* Absolute */) {
			            const baseUrl = parseUrl(base);
			            const baseType = baseUrl.type;
			            switch (inputType) {
			                case 1 /* Empty */:
			                    url.hash = baseUrl.hash;
			                // fall through
			                case 2 /* Hash */:
			                    url.query = baseUrl.query;
			                // fall through
			                case 3 /* Query */:
			                case 4 /* RelativePath */:
			                    mergePaths(url, baseUrl);
			                // fall through
			                case 5 /* AbsolutePath */:
			                    // The host, user, and port are joined, you can't copy one without the others.
			                    url.user = baseUrl.user;
			                    url.host = baseUrl.host;
			                    url.port = baseUrl.port;
			                // fall through
			                case 6 /* SchemeRelative */:
			                    // The input doesn't have a schema at least, so we need to copy at least that over.
			                    url.scheme = baseUrl.scheme;
			            }
			            if (baseType > inputType)
			                inputType = baseType;
			        }
			        normalizePath(url, inputType);
			        const queryHash = url.query + url.hash;
			        switch (inputType) {
			            // This is impossible, because of the empty checks at the start of the function.
			            // case UrlType.Empty:
			            case 2 /* Hash */:
			            case 3 /* Query */:
			                return queryHash;
			            case 4 /* RelativePath */: {
			                // The first char is always a "/", and we need it to be relative.
			                const path = url.path.slice(1);
			                if (!path)
			                    return queryHash || '.';
			                if (isRelative(base || input) && !isRelative(path)) {
			                    // If base started with a leading ".", or there is no base and input started with a ".",
			                    // then we need to ensure that the relative path starts with a ".". We don't know if
			                    // relative starts with a "..", though, so check before prepending.
			                    return './' + path + queryHash;
			                }
			                return path + queryHash;
			            }
			            case 5 /* AbsolutePath */:
			                return url.path + queryHash;
			            default:
			                return url.scheme + '//' + url.user + url.host + url.port + url.path + queryHash;
			        }
			    }

			    return resolve;

			}));
			
		} (resolveUri_umd));
		return resolveUri_umd.exports;
	}

	var hasRequiredTraceMapping_umd;

	function requireTraceMapping_umd () {
		if (hasRequiredTraceMapping_umd) return traceMapping_umd.exports;
		hasRequiredTraceMapping_umd = 1;
		(function (module, exports) {
			(function (global, factory) {
			  {
			    factory(module, requireResolveUri_umd(), requireSourcemapCodec_umd());
			    module.exports = def(module);
			  }
			  function def(m) { return 'default' in m.exports ? m.exports.default : m.exports; }
			})(commonjsGlobal, (function (module, require_resolveURI, require_sourcemapCodec) {
			var __create = Object.create;
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __getProtoOf = Object.getPrototypeOf;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __commonJS = (cb, mod) => function __require() {
			  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
			};
			var __export = (target, all) => {
			  for (var name in all)
			    __defProp(target, name, { get: all[name], enumerable: true });
			};
			var __copyProps = (to, from, except, desc) => {
			  if (from && typeof from === "object" || typeof from === "function") {
			    for (let key of __getOwnPropNames(from))
			      if (!__hasOwnProp.call(to, key) && key !== except)
			        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
			  }
			  return to;
			};
			var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
			  // If the importer is in node compatibility mode or this is not an ESM
			  // file that has been converted to a CommonJS file using a Babel-
			  // compatible transform (i.e. "__esModule" has not been set), then set
			  // "default" to the CommonJS "module.exports" for node compatibility.
			  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
			  mod
			));
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

			// umd:@jridgewell/sourcemap-codec
			var require_sourcemap_codec = __commonJS({
			  "umd:@jridgewell/sourcemap-codec"(exports, module2) {
			    module2.exports = require_sourcemapCodec;
			  }
			});

			// umd:@jridgewell/resolve-uri
			var require_resolve_uri = __commonJS({
			  "umd:@jridgewell/resolve-uri"(exports, module2) {
			    module2.exports = require_resolveURI;
			  }
			});

			// src/trace-mapping.ts
			var trace_mapping_exports = {};
			__export(trace_mapping_exports, {
			  AnyMap: () => FlattenMap,
			  FlattenMap: () => FlattenMap,
			  GREATEST_LOWER_BOUND: () => GREATEST_LOWER_BOUND,
			  LEAST_UPPER_BOUND: () => LEAST_UPPER_BOUND,
			  TraceMap: () => TraceMap,
			  allGeneratedPositionsFor: () => allGeneratedPositionsFor,
			  decodedMap: () => decodedMap,
			  decodedMappings: () => decodedMappings,
			  eachMapping: () => eachMapping,
			  encodedMap: () => encodedMap,
			  encodedMappings: () => encodedMappings,
			  generatedPositionFor: () => generatedPositionFor,
			  isIgnored: () => isIgnored,
			  originalPositionFor: () => originalPositionFor,
			  presortedDecodedMap: () => presortedDecodedMap,
			  sourceContentFor: () => sourceContentFor,
			  traceSegment: () => traceSegment
			});
			module.exports = __toCommonJS(trace_mapping_exports);
			var import_sourcemap_codec = __toESM(require_sourcemap_codec());

			// src/resolve.ts
			var import_resolve_uri = __toESM(require_resolve_uri());

			// src/strip-filename.ts
			function stripFilename(path) {
			  if (!path) return "";
			  const index = path.lastIndexOf("/");
			  return path.slice(0, index + 1);
			}

			// src/resolve.ts
			function resolver(mapUrl, sourceRoot) {
			  const from = stripFilename(mapUrl);
			  const prefix = sourceRoot ? sourceRoot + "/" : "";
			  return (source) => (0, import_resolve_uri.default)(prefix + (source || ""), from);
			}

			// src/sourcemap-segment.ts
			var COLUMN = 0;
			var SOURCES_INDEX = 1;
			var SOURCE_LINE = 2;
			var SOURCE_COLUMN = 3;
			var NAMES_INDEX = 4;
			var REV_GENERATED_LINE = 1;
			var REV_GENERATED_COLUMN = 2;

			// src/sort.ts
			function maybeSort(mappings, owned) {
			  const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
			  if (unsortedIndex === mappings.length) return mappings;
			  if (!owned) mappings = mappings.slice();
			  for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
			    mappings[i] = sortSegments(mappings[i], owned);
			  }
			  return mappings;
			}
			function nextUnsortedSegmentLine(mappings, start) {
			  for (let i = start; i < mappings.length; i++) {
			    if (!isSorted(mappings[i])) return i;
			  }
			  return mappings.length;
			}
			function isSorted(line) {
			  for (let j = 1; j < line.length; j++) {
			    if (line[j][COLUMN] < line[j - 1][COLUMN]) {
			      return false;
			    }
			  }
			  return true;
			}
			function sortSegments(line, owned) {
			  if (!owned) line = line.slice();
			  return line.sort(sortComparator);
			}
			function sortComparator(a, b) {
			  return a[COLUMN] - b[COLUMN];
			}

			// src/by-source.ts
			function buildBySources(decoded, memos) {
			  const sources = memos.map(() => []);
			  for (let i = 0; i < decoded.length; i++) {
			    const line = decoded[i];
			    for (let j = 0; j < line.length; j++) {
			      const seg = line[j];
			      if (seg.length === 1) continue;
			      const sourceIndex2 = seg[SOURCES_INDEX];
			      const sourceLine = seg[SOURCE_LINE];
			      const sourceColumn = seg[SOURCE_COLUMN];
			      const source = sources[sourceIndex2];
			      const segs = source[sourceLine] || (source[sourceLine] = []);
			      segs.push([sourceColumn, i, seg[COLUMN]]);
			    }
			  }
			  for (let i = 0; i < sources.length; i++) {
			    const source = sources[i];
			    for (let j = 0; j < source.length; j++) {
			      const line = source[j];
			      if (line) line.sort(sortComparator);
			    }
			  }
			  return sources;
			}

			// src/binary-search.ts
			var found = false;
			function binarySearch(haystack, needle, low, high) {
			  while (low <= high) {
			    const mid = low + (high - low >> 1);
			    const cmp = haystack[mid][COLUMN] - needle;
			    if (cmp === 0) {
			      found = true;
			      return mid;
			    }
			    if (cmp < 0) {
			      low = mid + 1;
			    } else {
			      high = mid - 1;
			    }
			  }
			  found = false;
			  return low - 1;
			}
			function upperBound(haystack, needle, index) {
			  for (let i = index + 1; i < haystack.length; index = i++) {
			    if (haystack[i][COLUMN] !== needle) break;
			  }
			  return index;
			}
			function lowerBound(haystack, needle, index) {
			  for (let i = index - 1; i >= 0; index = i--) {
			    if (haystack[i][COLUMN] !== needle) break;
			  }
			  return index;
			}
			function memoizedState() {
			  return {
			    lastKey: -1,
			    lastNeedle: -1,
			    lastIndex: -1
			  };
			}
			function memoizedBinarySearch(haystack, needle, state, key) {
			  const { lastKey, lastNeedle, lastIndex } = state;
			  let low = 0;
			  let high = haystack.length - 1;
			  if (key === lastKey) {
			    if (needle === lastNeedle) {
			      found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
			      return lastIndex;
			    }
			    if (needle >= lastNeedle) {
			      low = lastIndex === -1 ? 0 : lastIndex;
			    } else {
			      high = lastIndex;
			    }
			  }
			  state.lastKey = key;
			  state.lastNeedle = needle;
			  return state.lastIndex = binarySearch(haystack, needle, low, high);
			}

			// src/types.ts
			function parse(map) {
			  return typeof map === "string" ? JSON.parse(map) : map;
			}

			// src/flatten-map.ts
			var FlattenMap = function(map, mapUrl) {
			  const parsed = parse(map);
			  if (!("sections" in parsed)) {
			    return new TraceMap(parsed, mapUrl);
			  }
			  const mappings = [];
			  const sources = [];
			  const sourcesContent = [];
			  const names = [];
			  const ignoreList = [];
			  recurse(
			    parsed,
			    mapUrl,
			    mappings,
			    sources,
			    sourcesContent,
			    names,
			    ignoreList,
			    0,
			    0,
			    Infinity,
			    Infinity
			  );
			  const joined = {
			    version: 3,
			    file: parsed.file,
			    names,
			    sources,
			    sourcesContent,
			    mappings,
			    ignoreList
			  };
			  return presortedDecodedMap(joined);
			};
			function recurse(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
			  const { sections } = input;
			  for (let i = 0; i < sections.length; i++) {
			    const { map, offset } = sections[i];
			    let sl = stopLine;
			    let sc = stopColumn;
			    if (i + 1 < sections.length) {
			      const nextOffset = sections[i + 1].offset;
			      sl = Math.min(stopLine, lineOffset + nextOffset.line);
			      if (sl === stopLine) {
			        sc = Math.min(stopColumn, columnOffset + nextOffset.column);
			      } else if (sl < stopLine) {
			        sc = columnOffset + nextOffset.column;
			      }
			    }
			    addSection(
			      map,
			      mapUrl,
			      mappings,
			      sources,
			      sourcesContent,
			      names,
			      ignoreList,
			      lineOffset + offset.line,
			      columnOffset + offset.column,
			      sl,
			      sc
			    );
			  }
			}
			function addSection(input, mapUrl, mappings, sources, sourcesContent, names, ignoreList, lineOffset, columnOffset, stopLine, stopColumn) {
			  const parsed = parse(input);
			  if ("sections" in parsed) return recurse(...arguments);
			  const map = new TraceMap(parsed, mapUrl);
			  const sourcesOffset = sources.length;
			  const namesOffset = names.length;
			  const decoded = decodedMappings(map);
			  const { resolvedSources, sourcesContent: contents, ignoreList: ignores } = map;
			  append(sources, resolvedSources);
			  append(names, map.names);
			  if (contents) append(sourcesContent, contents);
			  else for (let i = 0; i < resolvedSources.length; i++) sourcesContent.push(null);
			  if (ignores) for (let i = 0; i < ignores.length; i++) ignoreList.push(ignores[i] + sourcesOffset);
			  for (let i = 0; i < decoded.length; i++) {
			    const lineI = lineOffset + i;
			    if (lineI > stopLine) return;
			    const out = getLine(mappings, lineI);
			    const cOffset = i === 0 ? columnOffset : 0;
			    const line = decoded[i];
			    for (let j = 0; j < line.length; j++) {
			      const seg = line[j];
			      const column = cOffset + seg[COLUMN];
			      if (lineI === stopLine && column >= stopColumn) return;
			      if (seg.length === 1) {
			        out.push([column]);
			        continue;
			      }
			      const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
			      const sourceLine = seg[SOURCE_LINE];
			      const sourceColumn = seg[SOURCE_COLUMN];
			      out.push(
			        seg.length === 4 ? [column, sourcesIndex, sourceLine, sourceColumn] : [column, sourcesIndex, sourceLine, sourceColumn, namesOffset + seg[NAMES_INDEX]]
			      );
			    }
			  }
			}
			function append(arr, other) {
			  for (let i = 0; i < other.length; i++) arr.push(other[i]);
			}
			function getLine(arr, index) {
			  for (let i = arr.length; i <= index; i++) arr[i] = [];
			  return arr[index];
			}

			// src/trace-mapping.ts
			var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
			var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
			var LEAST_UPPER_BOUND = -1;
			var GREATEST_LOWER_BOUND = 1;
			var TraceMap = class {
			  constructor(map, mapUrl) {
			    const isString = typeof map === "string";
			    if (!isString && map._decodedMemo) return map;
			    const parsed = parse(map);
			    const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
			    this.version = version;
			    this.file = file;
			    this.names = names || [];
			    this.sourceRoot = sourceRoot;
			    this.sources = sources;
			    this.sourcesContent = sourcesContent;
			    this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || void 0;
			    const resolve = resolver(mapUrl, sourceRoot);
			    this.resolvedSources = sources.map(resolve);
			    const { mappings } = parsed;
			    if (typeof mappings === "string") {
			      this._encoded = mappings;
			      this._decoded = void 0;
			    } else if (Array.isArray(mappings)) {
			      this._encoded = void 0;
			      this._decoded = maybeSort(mappings, isString);
			    } else if (parsed.sections) {
			      throw new Error(`TraceMap passed sectioned source map, please use FlattenMap export instead`);
			    } else {
			      throw new Error(`invalid source map: ${JSON.stringify(parsed)}`);
			    }
			    this._decodedMemo = memoizedState();
			    this._bySources = void 0;
			    this._bySourceMemos = void 0;
			  }
			};
			function cast(map) {
			  return map;
			}
			function encodedMappings(map) {
			  var _a, _b;
			  return (_b = (_a = cast(map))._encoded) != null ? _b : _a._encoded = (0, import_sourcemap_codec.encode)(cast(map)._decoded);
			}
			function decodedMappings(map) {
			  var _a;
			  return (_a = cast(map))._decoded || (_a._decoded = (0, import_sourcemap_codec.decode)(cast(map)._encoded));
			}
			function traceSegment(map, line, column) {
			  const decoded = decodedMappings(map);
			  if (line >= decoded.length) return null;
			  const segments = decoded[line];
			  const index = traceSegmentInternal(
			    segments,
			    cast(map)._decodedMemo,
			    line,
			    column,
			    GREATEST_LOWER_BOUND
			  );
			  return index === -1 ? null : segments[index];
			}
			function originalPositionFor(map, needle) {
			  let { line, column, bias } = needle;
			  line--;
			  if (line < 0) throw new Error(LINE_GTR_ZERO);
			  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
			  const decoded = decodedMappings(map);
			  if (line >= decoded.length) return OMapping(null, null, null, null);
			  const segments = decoded[line];
			  const index = traceSegmentInternal(
			    segments,
			    cast(map)._decodedMemo,
			    line,
			    column,
			    bias || GREATEST_LOWER_BOUND
			  );
			  if (index === -1) return OMapping(null, null, null, null);
			  const segment = segments[index];
			  if (segment.length === 1) return OMapping(null, null, null, null);
			  const { names, resolvedSources } = map;
			  return OMapping(
			    resolvedSources[segment[SOURCES_INDEX]],
			    segment[SOURCE_LINE] + 1,
			    segment[SOURCE_COLUMN],
			    segment.length === 5 ? names[segment[NAMES_INDEX]] : null
			  );
			}
			function generatedPositionFor(map, needle) {
			  const { source, line, column, bias } = needle;
			  return generatedPosition(map, source, line, column, bias || GREATEST_LOWER_BOUND, false);
			}
			function allGeneratedPositionsFor(map, needle) {
			  const { source, line, column, bias } = needle;
			  return generatedPosition(map, source, line, column, bias || LEAST_UPPER_BOUND, true);
			}
			function eachMapping(map, cb) {
			  const decoded = decodedMappings(map);
			  const { names, resolvedSources } = map;
			  for (let i = 0; i < decoded.length; i++) {
			    const line = decoded[i];
			    for (let j = 0; j < line.length; j++) {
			      const seg = line[j];
			      const generatedLine = i + 1;
			      const generatedColumn = seg[0];
			      let source = null;
			      let originalLine = null;
			      let originalColumn = null;
			      let name = null;
			      if (seg.length !== 1) {
			        source = resolvedSources[seg[1]];
			        originalLine = seg[2] + 1;
			        originalColumn = seg[3];
			      }
			      if (seg.length === 5) name = names[seg[4]];
			      cb({
			        generatedLine,
			        generatedColumn,
			        source,
			        originalLine,
			        originalColumn,
			        name
			      });
			    }
			  }
			}
			function sourceIndex(map, source) {
			  const { sources, resolvedSources } = map;
			  let index = sources.indexOf(source);
			  if (index === -1) index = resolvedSources.indexOf(source);
			  return index;
			}
			function sourceContentFor(map, source) {
			  const { sourcesContent } = map;
			  if (sourcesContent == null) return null;
			  const index = sourceIndex(map, source);
			  return index === -1 ? null : sourcesContent[index];
			}
			function isIgnored(map, source) {
			  const { ignoreList } = map;
			  if (ignoreList == null) return false;
			  const index = sourceIndex(map, source);
			  return index === -1 ? false : ignoreList.includes(index);
			}
			function presortedDecodedMap(map, mapUrl) {
			  const tracer = new TraceMap(clone(map, []), mapUrl);
			  cast(tracer)._decoded = map.mappings;
			  return tracer;
			}
			function decodedMap(map) {
			  return clone(map, decodedMappings(map));
			}
			function encodedMap(map) {
			  return clone(map, encodedMappings(map));
			}
			function clone(map, mappings) {
			  return {
			    version: map.version,
			    file: map.file,
			    names: map.names,
			    sourceRoot: map.sourceRoot,
			    sources: map.sources,
			    sourcesContent: map.sourcesContent,
			    mappings,
			    ignoreList: map.ignoreList || map.x_google_ignoreList
			  };
			}
			function OMapping(source, line, column, name) {
			  return { source, line, column, name };
			}
			function GMapping(line, column) {
			  return { line, column };
			}
			function traceSegmentInternal(segments, memo, line, column, bias) {
			  let index = memoizedBinarySearch(segments, column, memo, line);
			  if (found) {
			    index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
			  } else if (bias === LEAST_UPPER_BOUND) index++;
			  if (index === -1 || index === segments.length) return -1;
			  return index;
			}
			function sliceGeneratedPositions(segments, memo, line, column, bias) {
			  let min = traceSegmentInternal(segments, memo, line, column, GREATEST_LOWER_BOUND);
			  if (!found && bias === LEAST_UPPER_BOUND) min++;
			  if (min === -1 || min === segments.length) return [];
			  const matchedColumn = found ? column : segments[min][COLUMN];
			  if (!found) min = lowerBound(segments, matchedColumn, min);
			  const max = upperBound(segments, matchedColumn, min);
			  const result = [];
			  for (; min <= max; min++) {
			    const segment = segments[min];
			    result.push(GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]));
			  }
			  return result;
			}
			function generatedPosition(map, source, line, column, bias, all) {
			  var _a, _b;
			  line--;
			  if (line < 0) throw new Error(LINE_GTR_ZERO);
			  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
			  const { sources, resolvedSources } = map;
			  let sourceIndex2 = sources.indexOf(source);
			  if (sourceIndex2 === -1) sourceIndex2 = resolvedSources.indexOf(source);
			  if (sourceIndex2 === -1) return all ? [] : GMapping(null, null);
			  const bySourceMemos = (_a = cast(map))._bySourceMemos || (_a._bySourceMemos = sources.map(memoizedState));
			  const generated = (_b = cast(map))._bySources || (_b._bySources = buildBySources(decodedMappings(map), bySourceMemos));
			  const segments = generated[sourceIndex2][line];
			  if (segments == null) return all ? [] : GMapping(null, null);
			  const memo = bySourceMemos[sourceIndex2];
			  if (all) return sliceGeneratedPositions(segments, memo, line, column, bias);
			  const index = traceSegmentInternal(segments, memo, line, column, bias);
			  if (index === -1) return GMapping(null, null);
			  const segment = segments[index];
			  return GMapping(segment[REV_GENERATED_LINE] + 1, segment[REV_GENERATED_COLUMN]);
			}
			}));
			
		} (traceMapping_umd));
		return traceMapping_umd.exports;
	}

	var hasRequiredGenMapping_umd;

	function requireGenMapping_umd () {
		if (hasRequiredGenMapping_umd) return genMapping_umd.exports;
		hasRequiredGenMapping_umd = 1;
		(function (module, exports) {
			(function (global, factory) {
			  {
			    factory(module, requireSourcemapCodec_umd(), requireTraceMapping_umd());
			    module.exports = def(module);
			  }
			  function def(m) { return 'default' in m.exports ? m.exports.default : m.exports; }
			})(commonjsGlobal, (function (module, require_sourcemapCodec, require_traceMapping) {
			var __create = Object.create;
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __getProtoOf = Object.getPrototypeOf;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __commonJS = (cb, mod) => function __require() {
			  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
			};
			var __export = (target, all) => {
			  for (var name in all)
			    __defProp(target, name, { get: all[name], enumerable: true });
			};
			var __copyProps = (to, from, except, desc) => {
			  if (from && typeof from === "object" || typeof from === "function") {
			    for (let key of __getOwnPropNames(from))
			      if (!__hasOwnProp.call(to, key) && key !== except)
			        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
			  }
			  return to;
			};
			var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
			  // If the importer is in node compatibility mode or this is not an ESM
			  // file that has been converted to a CommonJS file using a Babel-
			  // compatible transform (i.e. "__esModule" has not been set), then set
			  // "default" to the CommonJS "module.exports" for node compatibility.
			  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
			  mod
			));
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

			// umd:@jridgewell/sourcemap-codec
			var require_sourcemap_codec = __commonJS({
			  "umd:@jridgewell/sourcemap-codec"(exports, module2) {
			    module2.exports = require_sourcemapCodec;
			  }
			});

			// umd:@jridgewell/trace-mapping
			var require_trace_mapping = __commonJS({
			  "umd:@jridgewell/trace-mapping"(exports, module2) {
			    module2.exports = require_traceMapping;
			  }
			});

			// src/gen-mapping.ts
			var gen_mapping_exports = {};
			__export(gen_mapping_exports, {
			  GenMapping: () => GenMapping,
			  addMapping: () => addMapping,
			  addSegment: () => addSegment,
			  allMappings: () => allMappings,
			  fromMap: () => fromMap,
			  maybeAddMapping: () => maybeAddMapping,
			  maybeAddSegment: () => maybeAddSegment,
			  setIgnore: () => setIgnore,
			  setSourceContent: () => setSourceContent,
			  toDecodedMap: () => toDecodedMap,
			  toEncodedMap: () => toEncodedMap
			});
			module.exports = __toCommonJS(gen_mapping_exports);

			// src/set-array.ts
			var SetArray = class {
			  constructor() {
			    this._indexes = { __proto__: null };
			    this.array = [];
			  }
			};
			function cast(set) {
			  return set;
			}
			function get(setarr, key) {
			  return cast(setarr)._indexes[key];
			}
			function put(setarr, key) {
			  const index = get(setarr, key);
			  if (index !== void 0) return index;
			  const { array, _indexes: indexes } = cast(setarr);
			  const length = array.push(key);
			  return indexes[key] = length - 1;
			}
			function remove(setarr, key) {
			  const index = get(setarr, key);
			  if (index === void 0) return;
			  const { array, _indexes: indexes } = cast(setarr);
			  for (let i = index + 1; i < array.length; i++) {
			    const k = array[i];
			    array[i - 1] = k;
			    indexes[k]--;
			  }
			  indexes[key] = void 0;
			  array.pop();
			}

			// src/gen-mapping.ts
			var import_sourcemap_codec = __toESM(require_sourcemap_codec());
			var import_trace_mapping = __toESM(require_trace_mapping());

			// src/sourcemap-segment.ts
			var COLUMN = 0;
			var SOURCES_INDEX = 1;
			var SOURCE_LINE = 2;
			var SOURCE_COLUMN = 3;
			var NAMES_INDEX = 4;

			// src/gen-mapping.ts
			var NO_NAME = -1;
			var GenMapping = class {
			  constructor({ file, sourceRoot } = {}) {
			    this._names = new SetArray();
			    this._sources = new SetArray();
			    this._sourcesContent = [];
			    this._mappings = [];
			    this.file = file;
			    this.sourceRoot = sourceRoot;
			    this._ignoreList = new SetArray();
			  }
			};
			function cast2(map) {
			  return map;
			}
			function addSegment(map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
			  return addSegmentInternal(
			    false,
			    map,
			    genLine,
			    genColumn,
			    source,
			    sourceLine,
			    sourceColumn,
			    name,
			    content
			  );
			}
			function addMapping(map, mapping) {
			  return addMappingInternal(false, map, mapping);
			}
			var maybeAddSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
			  return addSegmentInternal(
			    true,
			    map,
			    genLine,
			    genColumn,
			    source,
			    sourceLine,
			    sourceColumn,
			    name,
			    content
			  );
			};
			var maybeAddMapping = (map, mapping) => {
			  return addMappingInternal(true, map, mapping);
			};
			function setSourceContent(map, source, content) {
			  const {
			    _sources: sources,
			    _sourcesContent: sourcesContent
			    // _originalScopes: originalScopes,
			  } = cast2(map);
			  const index = put(sources, source);
			  sourcesContent[index] = content;
			}
			function setIgnore(map, source, ignore = true) {
			  const {
			    _sources: sources,
			    _sourcesContent: sourcesContent,
			    _ignoreList: ignoreList
			    // _originalScopes: originalScopes,
			  } = cast2(map);
			  const index = put(sources, source);
			  if (index === sourcesContent.length) sourcesContent[index] = null;
			  if (ignore) put(ignoreList, index);
			  else remove(ignoreList, index);
			}
			function toDecodedMap(map) {
			  const {
			    _mappings: mappings,
			    _sources: sources,
			    _sourcesContent: sourcesContent,
			    _names: names,
			    _ignoreList: ignoreList
			    // _originalScopes: originalScopes,
			    // _generatedRanges: generatedRanges,
			  } = cast2(map);
			  removeEmptyFinalLines(mappings);
			  return {
			    version: 3,
			    file: map.file || void 0,
			    names: names.array,
			    sourceRoot: map.sourceRoot || void 0,
			    sources: sources.array,
			    sourcesContent,
			    mappings,
			    // originalScopes,
			    // generatedRanges,
			    ignoreList: ignoreList.array
			  };
			}
			function toEncodedMap(map) {
			  const decoded = toDecodedMap(map);
			  return Object.assign({}, decoded, {
			    // originalScopes: decoded.originalScopes.map((os) => encodeOriginalScopes(os)),
			    // generatedRanges: encodeGeneratedRanges(decoded.generatedRanges as GeneratedRange[]),
			    mappings: (0, import_sourcemap_codec.encode)(decoded.mappings)
			  });
			}
			function fromMap(input) {
			  const map = new import_trace_mapping.TraceMap(input);
			  const gen = new GenMapping({ file: map.file, sourceRoot: map.sourceRoot });
			  putAll(cast2(gen)._names, map.names);
			  putAll(cast2(gen)._sources, map.sources);
			  cast2(gen)._sourcesContent = map.sourcesContent || map.sources.map(() => null);
			  cast2(gen)._mappings = (0, import_trace_mapping.decodedMappings)(map);
			  if (map.ignoreList) putAll(cast2(gen)._ignoreList, map.ignoreList);
			  return gen;
			}
			function allMappings(map) {
			  const out = [];
			  const { _mappings: mappings, _sources: sources, _names: names } = cast2(map);
			  for (let i = 0; i < mappings.length; i++) {
			    const line = mappings[i];
			    for (let j = 0; j < line.length; j++) {
			      const seg = line[j];
			      const generated = { line: i + 1, column: seg[COLUMN] };
			      let source = void 0;
			      let original = void 0;
			      let name = void 0;
			      if (seg.length !== 1) {
			        source = sources.array[seg[SOURCES_INDEX]];
			        original = { line: seg[SOURCE_LINE] + 1, column: seg[SOURCE_COLUMN] };
			        if (seg.length === 5) name = names.array[seg[NAMES_INDEX]];
			      }
			      out.push({ generated, source, original, name });
			    }
			  }
			  return out;
			}
			function addSegmentInternal(skipable, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
			  const {
			    _mappings: mappings,
			    _sources: sources,
			    _sourcesContent: sourcesContent,
			    _names: names
			    // _originalScopes: originalScopes,
			  } = cast2(map);
			  const line = getIndex(mappings, genLine);
			  const index = getColumnIndex(line, genColumn);
			  if (!source) {
			    if (skipable && skipSourceless(line, index)) return;
			    return insert(line, index, [genColumn]);
			  }
			  const sourcesIndex = put(sources, source);
			  const namesIndex = name ? put(names, name) : NO_NAME;
			  if (sourcesIndex === sourcesContent.length) sourcesContent[sourcesIndex] = content != null ? content : null;
			  if (skipable && skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex)) {
			    return;
			  }
			  return insert(
			    line,
			    index,
			    name ? [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex] : [genColumn, sourcesIndex, sourceLine, sourceColumn]
			  );
			}
			function getIndex(arr, index) {
			  for (let i = arr.length; i <= index; i++) {
			    arr[i] = [];
			  }
			  return arr[index];
			}
			function getColumnIndex(line, genColumn) {
			  let index = line.length;
			  for (let i = index - 1; i >= 0; index = i--) {
			    const current = line[i];
			    if (genColumn >= current[COLUMN]) break;
			  }
			  return index;
			}
			function insert(array, index, value) {
			  for (let i = array.length; i > index; i--) {
			    array[i] = array[i - 1];
			  }
			  array[index] = value;
			}
			function removeEmptyFinalLines(mappings) {
			  const { length } = mappings;
			  let len = length;
			  for (let i = len - 1; i >= 0; len = i, i--) {
			    if (mappings[i].length > 0) break;
			  }
			  if (len < length) mappings.length = len;
			}
			function putAll(setarr, array) {
			  for (let i = 0; i < array.length; i++) put(setarr, array[i]);
			}
			function skipSourceless(line, index) {
			  if (index === 0) return true;
			  const prev = line[index - 1];
			  return prev.length === 1;
			}
			function skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex) {
			  if (index === 0) return false;
			  const prev = line[index - 1];
			  if (prev.length === 1) return false;
			  return sourcesIndex === prev[SOURCES_INDEX] && sourceLine === prev[SOURCE_LINE] && sourceColumn === prev[SOURCE_COLUMN] && namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME);
			}
			function addMappingInternal(skipable, map, mapping) {
			  const { generated, source, original, name, content } = mapping;
			  if (!source) {
			    return addSegmentInternal(
			      skipable,
			      map,
			      generated.line - 1,
			      generated.column,
			      null,
			      null,
			      null,
			      null,
			      null
			    );
			  }
			  return addSegmentInternal(
			    skipable,
			    map,
			    generated.line - 1,
			    generated.column,
			    source,
			    original.line - 1,
			    original.column,
			    name,
			    content
			  );
			}
			}));
			
		} (genMapping_umd));
		return genMapping_umd.exports;
	}

	var hasRequiredSourceMap;

	function requireSourceMap () {
		if (hasRequiredSourceMap) return sourceMap;
		hasRequiredSourceMap = 1;

		Object.defineProperty(sourceMap, "__esModule", {
		  value: true
		});
		sourceMap.default = void 0;
		var _genMapping = requireGenMapping_umd();
		var _traceMapping = requireTraceMapping_umd();
		class SourceMap {
		  constructor(opts, code) {
		    var _opts$sourceFileName;
		    this._map = void 0;
		    this._rawMappings = void 0;
		    this._sourceFileName = void 0;
		    this._lastGenLine = 0;
		    this._lastSourceLine = 0;
		    this._lastSourceColumn = 0;
		    this._inputMap = null;
		    const map = this._map = new _genMapping.GenMapping({
		      sourceRoot: opts.sourceRoot
		    });
		    this._sourceFileName = (_opts$sourceFileName = opts.sourceFileName) == null ? void 0 : _opts$sourceFileName.replace(/\\/g, "/");
		    this._rawMappings = undefined;
		    if (opts.inputSourceMap) {
		      this._inputMap = new _traceMapping.TraceMap(opts.inputSourceMap);
		      const resolvedSources = this._inputMap.resolvedSources;
		      if (resolvedSources.length) {
		        for (let i = 0; i < resolvedSources.length; i++) {
		          var _this$_inputMap$sourc;
		          (0, _genMapping.setSourceContent)(map, resolvedSources[i], (_this$_inputMap$sourc = this._inputMap.sourcesContent) == null ? void 0 : _this$_inputMap$sourc[i]);
		        }
		      }
		    }
		    if (typeof code === "string" && !opts.inputSourceMap) {
		      (0, _genMapping.setSourceContent)(map, this._sourceFileName, code);
		    } else if (typeof code === "object") {
		      for (const sourceFileName of Object.keys(code)) {
		        (0, _genMapping.setSourceContent)(map, sourceFileName.replace(/\\/g, "/"), code[sourceFileName]);
		      }
		    }
		  }
		  get() {
		    return (0, _genMapping.toEncodedMap)(this._map);
		  }
		  getDecoded() {
		    return (0, _genMapping.toDecodedMap)(this._map);
		  }
		  getRawMappings() {
		    return this._rawMappings || (this._rawMappings = (0, _genMapping.allMappings)(this._map));
		  }
		  mark(generated, line, column, identifierName, identifierNamePos, filename) {
		    var _originalMapping;
		    this._rawMappings = undefined;
		    let originalMapping;
		    if (line != null) {
		      if (this._inputMap) {
		        originalMapping = (0, _traceMapping.originalPositionFor)(this._inputMap, {
		          line,
		          column: column
		        });
		        if (!originalMapping.name && identifierNamePos) {
		          const originalIdentifierMapping = (0, _traceMapping.originalPositionFor)(this._inputMap, identifierNamePos);
		          if (originalIdentifierMapping.name) {
		            identifierName = originalIdentifierMapping.name;
		          }
		        }
		      } else {
		        originalMapping = {
		          name: null,
		          source: (filename == null ? void 0 : filename.replace(/\\/g, "/")) || this._sourceFileName,
		          line: line,
		          column: column
		        };
		      }
		    }
		    (0, _genMapping.maybeAddMapping)(this._map, {
		      name: identifierName,
		      generated,
		      source: (_originalMapping = originalMapping) == null ? void 0 : _originalMapping.source,
		      original: originalMapping
		    });
		  }
		}
		sourceMap.default = SourceMap;

		
		return sourceMap;
	}

	var printer = {};

	var buffer = {};

	var hasRequiredBuffer;

	function requireBuffer () {
		if (hasRequiredBuffer) return buffer;
		hasRequiredBuffer = 1;

		Object.defineProperty(buffer, "__esModule", {
		  value: true
		});
		buffer.default = void 0;
		class Buffer {
		  constructor(map, indentChar) {
		    this._map = null;
		    this._buf = "";
		    this._str = "";
		    this._appendCount = 0;
		    this._last = 0;
		    this._queue = [];
		    this._queueCursor = 0;
		    this._canMarkIdName = true;
		    this._indentChar = "";
		    this._fastIndentations = [];
		    this._position = {
		      line: 1,
		      column: 0
		    };
		    this._sourcePosition = {
		      identifierName: undefined,
		      identifierNamePos: undefined,
		      line: undefined,
		      column: undefined,
		      filename: undefined
		    };
		    this._map = map;
		    this._indentChar = indentChar;
		    for (let i = 0; i < 64; i++) {
		      this._fastIndentations.push(indentChar.repeat(i));
		    }
		    this._allocQueue();
		  }
		  _allocQueue() {
		    const queue = this._queue;
		    for (let i = 0; i < 16; i++) {
		      queue.push({
		        char: 0,
		        repeat: 1,
		        line: undefined,
		        column: undefined,
		        identifierName: undefined,
		        identifierNamePos: undefined,
		        filename: ""
		      });
		    }
		  }
		  _pushQueue(char, repeat, line, column, filename) {
		    const cursor = this._queueCursor;
		    if (cursor === this._queue.length) {
		      this._allocQueue();
		    }
		    const item = this._queue[cursor];
		    item.char = char;
		    item.repeat = repeat;
		    item.line = line;
		    item.column = column;
		    item.filename = filename;
		    this._queueCursor++;
		  }
		  _popQueue() {
		    if (this._queueCursor === 0) {
		      throw new Error("Cannot pop from empty queue");
		    }
		    return this._queue[--this._queueCursor];
		  }
		  get() {
		    this._flush();
		    const map = this._map;
		    const result = {
		      code: (this._buf + this._str).trimRight(),
		      decodedMap: map == null ? void 0 : map.getDecoded(),
		      get __mergedMap() {
		        return this.map;
		      },
		      get map() {
		        const resultMap = map ? map.get() : null;
		        result.map = resultMap;
		        return resultMap;
		      },
		      set map(value) {
		        Object.defineProperty(result, "map", {
		          value,
		          writable: true
		        });
		      },
		      get rawMappings() {
		        const mappings = map == null ? void 0 : map.getRawMappings();
		        result.rawMappings = mappings;
		        return mappings;
		      },
		      set rawMappings(value) {
		        Object.defineProperty(result, "rawMappings", {
		          value,
		          writable: true
		        });
		      }
		    };
		    return result;
		  }
		  append(str, maybeNewline) {
		    this._flush();
		    this._append(str, this._sourcePosition, maybeNewline);
		  }
		  appendChar(char) {
		    this._flush();
		    this._appendChar(char, 1, this._sourcePosition);
		  }
		  queue(char) {
		    if (char === 10) {
		      while (this._queueCursor !== 0) {
		        const char = this._queue[this._queueCursor - 1].char;
		        if (char !== 32 && char !== 9) {
		          break;
		        }
		        this._queueCursor--;
		      }
		    }
		    const sourcePosition = this._sourcePosition;
		    this._pushQueue(char, 1, sourcePosition.line, sourcePosition.column, sourcePosition.filename);
		  }
		  queueIndentation(repeat) {
		    if (repeat === 0) return;
		    this._pushQueue(-1, repeat, undefined, undefined, undefined);
		  }
		  _flush() {
		    const queueCursor = this._queueCursor;
		    const queue = this._queue;
		    for (let i = 0; i < queueCursor; i++) {
		      const item = queue[i];
		      this._appendChar(item.char, item.repeat, item);
		    }
		    this._queueCursor = 0;
		  }
		  _appendChar(char, repeat, sourcePos) {
		    this._last = char;
		    if (char === -1) {
		      const fastIndentation = this._fastIndentations[repeat];
		      if (fastIndentation !== undefined) {
		        this._str += fastIndentation;
		      } else {
		        this._str += repeat > 1 ? this._indentChar.repeat(repeat) : this._indentChar;
		      }
		    } else {
		      this._str += repeat > 1 ? String.fromCharCode(char).repeat(repeat) : String.fromCharCode(char);
		    }
		    if (char !== 10) {
		      this._mark(sourcePos.line, sourcePos.column, sourcePos.identifierName, sourcePos.identifierNamePos, sourcePos.filename);
		      this._position.column += repeat;
		    } else {
		      this._position.line++;
		      this._position.column = 0;
		    }
		    if (this._canMarkIdName) {
		      sourcePos.identifierName = undefined;
		      sourcePos.identifierNamePos = undefined;
		    }
		  }
		  _append(str, sourcePos, maybeNewline) {
		    const len = str.length;
		    const position = this._position;
		    this._last = str.charCodeAt(len - 1);
		    if (++this._appendCount > 4096) {
		      +this._str;
		      this._buf += this._str;
		      this._str = str;
		      this._appendCount = 0;
		    } else {
		      this._str += str;
		    }
		    if (!maybeNewline && !this._map) {
		      position.column += len;
		      return;
		    }
		    const {
		      column,
		      identifierName,
		      identifierNamePos,
		      filename
		    } = sourcePos;
		    let line = sourcePos.line;
		    if ((identifierName != null || identifierNamePos != null) && this._canMarkIdName) {
		      sourcePos.identifierName = undefined;
		      sourcePos.identifierNamePos = undefined;
		    }
		    let i = str.indexOf("\n");
		    let last = 0;
		    if (i !== 0) {
		      this._mark(line, column, identifierName, identifierNamePos, filename);
		    }
		    while (i !== -1) {
		      position.line++;
		      position.column = 0;
		      last = i + 1;
		      if (last < len && line !== undefined) {
		        this._mark(++line, 0, undefined, undefined, filename);
		      }
		      i = str.indexOf("\n", last);
		    }
		    position.column += len - last;
		  }
		  _mark(line, column, identifierName, identifierNamePos, filename) {
		    var _this$_map;
		    (_this$_map = this._map) == null || _this$_map.mark(this._position, line, column, identifierName, identifierNamePos, filename);
		  }
		  removeTrailingNewline() {
		    const queueCursor = this._queueCursor;
		    if (queueCursor !== 0 && this._queue[queueCursor - 1].char === 10) {
		      this._queueCursor--;
		    }
		  }
		  removeLastSemicolon() {
		    const queueCursor = this._queueCursor;
		    if (queueCursor !== 0 && this._queue[queueCursor - 1].char === 59) {
		      this._queueCursor--;
		    }
		  }
		  getLastChar() {
		    const queueCursor = this._queueCursor;
		    return queueCursor !== 0 ? this._queue[queueCursor - 1].char : this._last;
		  }
		  getNewlineCount() {
		    const queueCursor = this._queueCursor;
		    let count = 0;
		    if (queueCursor === 0) return this._last === 10 ? 1 : 0;
		    for (let i = queueCursor - 1; i >= 0; i--) {
		      if (this._queue[i].char !== 10) {
		        break;
		      }
		      count++;
		    }
		    return count === queueCursor && this._last === 10 ? count + 1 : count;
		  }
		  endsWithCharAndNewline() {
		    const queue = this._queue;
		    const queueCursor = this._queueCursor;
		    if (queueCursor !== 0) {
		      const lastCp = queue[queueCursor - 1].char;
		      if (lastCp !== 10) return;
		      if (queueCursor > 1) {
		        return queue[queueCursor - 2].char;
		      } else {
		        return this._last;
		      }
		    }
		  }
		  hasContent() {
		    return this._queueCursor !== 0 || !!this._last;
		  }
		  exactSource(loc, cb) {
		    if (!this._map) {
		      cb();
		      return;
		    }
		    this.source("start", loc);
		    const identifierName = loc.identifierName;
		    const sourcePos = this._sourcePosition;
		    if (identifierName) {
		      this._canMarkIdName = false;
		      sourcePos.identifierName = identifierName;
		    }
		    cb();
		    if (identifierName) {
		      this._canMarkIdName = true;
		      sourcePos.identifierName = undefined;
		      sourcePos.identifierNamePos = undefined;
		    }
		    this.source("end", loc);
		  }
		  source(prop, loc) {
		    if (!this._map) return;
		    this._normalizePosition(prop, loc, 0);
		  }
		  sourceWithOffset(prop, loc, columnOffset) {
		    if (!this._map) return;
		    this._normalizePosition(prop, loc, columnOffset);
		  }
		  _normalizePosition(prop, loc, columnOffset) {
		    const pos = loc[prop];
		    const target = this._sourcePosition;
		    if (pos) {
		      target.line = pos.line;
		      target.column = Math.max(pos.column + columnOffset, 0);
		      target.filename = loc.filename;
		    }
		  }
		  getCurrentColumn() {
		    const queue = this._queue;
		    const queueCursor = this._queueCursor;
		    let lastIndex = -1;
		    let len = 0;
		    for (let i = 0; i < queueCursor; i++) {
		      const item = queue[i];
		      if (item.char === 10) {
		        lastIndex = len;
		      }
		      len += item.repeat;
		    }
		    return lastIndex === -1 ? this._position.column + len : len - 1 - lastIndex;
		  }
		  getCurrentLine() {
		    let count = 0;
		    const queue = this._queue;
		    for (let i = 0; i < this._queueCursor; i++) {
		      if (queue[i].char === 10) {
		        count++;
		      }
		    }
		    return this._position.line + count;
		  }
		}
		buffer.default = Buffer;

		
		return buffer;
	}

	var node = {};

	var whitespace = {};

	var hasRequiredWhitespace;

	function requireWhitespace () {
		if (hasRequiredWhitespace) return whitespace;
		hasRequiredWhitespace = 1;

		Object.defineProperty(whitespace, "__esModule", {
		  value: true
		});
		whitespace.nodes = void 0;
		var _t = globalThis.__BABEL_TYPES__;
		const {
		  FLIPPED_ALIAS_KEYS,
		  isArrayExpression,
		  isAssignmentExpression,
		  isBinary,
		  isBlockStatement,
		  isCallExpression,
		  isFunction,
		  isIdentifier,
		  isLiteral,
		  isMemberExpression,
		  isObjectExpression,
		  isOptionalCallExpression,
		  isOptionalMemberExpression,
		  isStringLiteral
		} = _t;
		function crawlInternal(node, state) {
		  if (!node) return state;
		  if (isMemberExpression(node) || isOptionalMemberExpression(node)) {
		    crawlInternal(node.object, state);
		    if (node.computed) crawlInternal(node.property, state);
		  } else if (isBinary(node) || isAssignmentExpression(node)) {
		    crawlInternal(node.left, state);
		    crawlInternal(node.right, state);
		  } else if (isCallExpression(node) || isOptionalCallExpression(node)) {
		    state.hasCall = true;
		    crawlInternal(node.callee, state);
		  } else if (isFunction(node)) {
		    state.hasFunction = true;
		  } else if (isIdentifier(node)) {
		    state.hasHelper = state.hasHelper || node.callee && isHelper(node.callee);
		  }
		  return state;
		}
		function crawl(node) {
		  return crawlInternal(node, {
		    hasCall: false,
		    hasFunction: false,
		    hasHelper: false
		  });
		}
		function isHelper(node) {
		  if (!node) return false;
		  if (isMemberExpression(node)) {
		    return isHelper(node.object) || isHelper(node.property);
		  } else if (isIdentifier(node)) {
		    return node.name === "require" || node.name.charCodeAt(0) === 95;
		  } else if (isCallExpression(node)) {
		    return isHelper(node.callee);
		  } else if (isBinary(node) || isAssignmentExpression(node)) {
		    return isIdentifier(node.left) && isHelper(node.left) || isHelper(node.right);
		  } else {
		    return false;
		  }
		}
		function isType(node) {
		  return isLiteral(node) || isObjectExpression(node) || isArrayExpression(node) || isIdentifier(node) || isMemberExpression(node);
		}
		const nodes = whitespace.nodes = {
		  AssignmentExpression(node) {
		    const state = crawl(node.right);
		    if (state.hasCall && state.hasHelper || state.hasFunction) {
		      return state.hasFunction ? 1 | 2 : 2;
		    }
		    return 0;
		  },
		  SwitchCase(node, parent) {
		    return (!!node.consequent.length || parent.cases[0] === node ? 1 : 0) | (!node.consequent.length && parent.cases[parent.cases.length - 1] === node ? 2 : 0);
		  },
		  LogicalExpression(node) {
		    if (isFunction(node.left) || isFunction(node.right)) {
		      return 2;
		    }
		    return 0;
		  },
		  Literal(node) {
		    if (isStringLiteral(node) && node.value === "use strict") {
		      return 2;
		    }
		    return 0;
		  },
		  CallExpression(node) {
		    if (isFunction(node.callee) || isHelper(node)) {
		      return 1 | 2;
		    }
		    return 0;
		  },
		  OptionalCallExpression(node) {
		    if (isFunction(node.callee)) {
		      return 1 | 2;
		    }
		    return 0;
		  },
		  VariableDeclaration(node) {
		    for (let i = 0; i < node.declarations.length; i++) {
		      const declar = node.declarations[i];
		      let enabled = isHelper(declar.id) && !isType(declar.init);
		      if (!enabled && declar.init) {
		        const state = crawl(declar.init);
		        enabled = isHelper(declar.init) && state.hasCall || state.hasFunction;
		      }
		      if (enabled) {
		        return 1 | 2;
		      }
		    }
		    return 0;
		  },
		  IfStatement(node) {
		    if (isBlockStatement(node.consequent)) {
		      return 1 | 2;
		    }
		    return 0;
		  }
		};
		nodes.ObjectProperty = nodes.ObjectTypeProperty = nodes.ObjectMethod = function (node, parent) {
		  if (parent.properties[0] === node) {
		    return 1;
		  }
		  return 0;
		};
		nodes.ObjectTypeCallProperty = function (node, parent) {
		  var _parent$properties;
		  if (parent.callProperties[0] === node && !((_parent$properties = parent.properties) != null && _parent$properties.length)) {
		    return 1;
		  }
		  return 0;
		};
		nodes.ObjectTypeIndexer = function (node, parent) {
		  var _parent$properties2, _parent$callPropertie;
		  if (parent.indexers[0] === node && !((_parent$properties2 = parent.properties) != null && _parent$properties2.length) && !((_parent$callPropertie = parent.callProperties) != null && _parent$callPropertie.length)) {
		    return 1;
		  }
		  return 0;
		};
		nodes.ObjectTypeInternalSlot = function (node, parent) {
		  var _parent$properties3, _parent$callPropertie2, _parent$indexers;
		  if (parent.internalSlots[0] === node && !((_parent$properties3 = parent.properties) != null && _parent$properties3.length) && !((_parent$callPropertie2 = parent.callProperties) != null && _parent$callPropertie2.length) && !((_parent$indexers = parent.indexers) != null && _parent$indexers.length)) {
		    return 1;
		  }
		  return 0;
		};
		[["Function", true], ["Class", true], ["Loop", true], ["LabeledStatement", true], ["SwitchStatement", true], ["TryStatement", true]].forEach(function ([type, amounts]) {
		  [type].concat(FLIPPED_ALIAS_KEYS[type] || []).forEach(function (type) {
		    const ret = amounts ? 1 | 2 : 0;
		    nodes[type] = () => ret;
		  });
		});

		
		return whitespace;
	}

	var parentheses = {};

	var hasRequiredParentheses;

	function requireParentheses () {
		if (hasRequiredParentheses) return parentheses;
		hasRequiredParentheses = 1;

		Object.defineProperty(parentheses, "__esModule", {
		  value: true
		});
		parentheses.AssignmentExpression = AssignmentExpression;
		parentheses.Binary = Binary;
		parentheses.BinaryExpression = BinaryExpression;
		parentheses.ClassExpression = ClassExpression;
		parentheses.ArrowFunctionExpression = parentheses.ConditionalExpression = ConditionalExpression;
		parentheses.DoExpression = DoExpression;
		parentheses.FunctionExpression = FunctionExpression;
		parentheses.FunctionTypeAnnotation = FunctionTypeAnnotation;
		parentheses.Identifier = Identifier;
		parentheses.LogicalExpression = LogicalExpression;
		parentheses.NullableTypeAnnotation = NullableTypeAnnotation;
		parentheses.ObjectExpression = ObjectExpression;
		parentheses.OptionalIndexedAccessType = OptionalIndexedAccessType;
		parentheses.OptionalCallExpression = parentheses.OptionalMemberExpression = OptionalMemberExpression;
		parentheses.SequenceExpression = SequenceExpression;
		parentheses.TSSatisfiesExpression = parentheses.TSAsExpression = TSAsExpression;
		parentheses.TSConditionalType = TSConditionalType;
		parentheses.TSConstructorType = parentheses.TSFunctionType = TSFunctionType;
		parentheses.TSInferType = TSInferType;
		parentheses.TSInstantiationExpression = TSInstantiationExpression;
		parentheses.TSIntersectionType = TSIntersectionType;
		parentheses.UnaryLike = parentheses.TSTypeAssertion = UnaryLike;
		parentheses.TSTypeOperator = TSTypeOperator;
		parentheses.TSUnionType = TSUnionType;
		parentheses.IntersectionTypeAnnotation = parentheses.UnionTypeAnnotation = UnionTypeAnnotation;
		parentheses.UpdateExpression = UpdateExpression;
		parentheses.AwaitExpression = parentheses.YieldExpression = YieldExpression;
		var _t = globalThis.__BABEL_TYPES__;
		var _index = requireNode();
		const {
		  isArrayTypeAnnotation,
		  isBinaryExpression,
		  isCallExpression,
		  isForOfStatement,
		  isIndexedAccessType,
		  isMemberExpression,
		  isObjectPattern,
		  isOptionalMemberExpression,
		  isYieldExpression,
		  isStatement
		} = _t;
		const PRECEDENCE = new Map([["||", 0], ["??", 0], ["|>", 0], ["&&", 1], ["|", 2], ["^", 3], ["&", 4], ["==", 5], ["===", 5], ["!=", 5], ["!==", 5], ["<", 6], [">", 6], ["<=", 6], [">=", 6], ["in", 6], ["instanceof", 6], [">>", 7], ["<<", 7], [">>>", 7], ["+", 8], ["-", 8], ["*", 9], ["/", 9], ["%", 9], ["**", 10]]);
		function getBinaryPrecedence(node, nodeType) {
		  if (nodeType === "BinaryExpression" || nodeType === "LogicalExpression") {
		    return PRECEDENCE.get(node.operator);
		  }
		  if (nodeType === "TSAsExpression" || nodeType === "TSSatisfiesExpression") {
		    return PRECEDENCE.get("in");
		  }
		}
		function isTSTypeExpression(nodeType) {
		  return nodeType === "TSAsExpression" || nodeType === "TSSatisfiesExpression" || nodeType === "TSTypeAssertion";
		}
		const isClassExtendsClause = (node, parent) => {
		  const parentType = parent.type;
		  return (parentType === "ClassDeclaration" || parentType === "ClassExpression") && parent.superClass === node;
		};
		const hasPostfixPart = (node, parent) => {
		  const parentType = parent.type;
		  return (parentType === "MemberExpression" || parentType === "OptionalMemberExpression") && parent.object === node || (parentType === "CallExpression" || parentType === "OptionalCallExpression" || parentType === "NewExpression") && parent.callee === node || parentType === "TaggedTemplateExpression" && parent.tag === node || parentType === "TSNonNullExpression";
		};
		function NullableTypeAnnotation(node, parent) {
		  return isArrayTypeAnnotation(parent);
		}
		function FunctionTypeAnnotation(node, parent, tokenContext) {
		  const parentType = parent.type;
		  return (parentType === "UnionTypeAnnotation" || parentType === "IntersectionTypeAnnotation" || parentType === "ArrayTypeAnnotation" || Boolean(tokenContext & _index.TokenContext.arrowFlowReturnType)
		  );
		}
		function UpdateExpression(node, parent) {
		  return hasPostfixPart(node, parent) || isClassExtendsClause(node, parent);
		}
		function needsParenBeforeExpressionBrace(tokenContext) {
		  return Boolean(tokenContext & (_index.TokenContext.expressionStatement | _index.TokenContext.arrowBody));
		}
		function ObjectExpression(node, parent, tokenContext) {
		  return needsParenBeforeExpressionBrace(tokenContext);
		}
		function DoExpression(node, parent, tokenContext) {
		  return !node.async && Boolean(tokenContext & _index.TokenContext.expressionStatement);
		}
		function Binary(node, parent) {
		  const parentType = parent.type;
		  if (node.type === "BinaryExpression" && node.operator === "**" && parentType === "BinaryExpression" && parent.operator === "**") {
		    return parent.left === node;
		  }
		  if (isClassExtendsClause(node, parent)) {
		    return true;
		  }
		  if (hasPostfixPart(node, parent) || parentType === "UnaryExpression" || parentType === "SpreadElement" || parentType === "AwaitExpression") {
		    return true;
		  }
		  const parentPos = getBinaryPrecedence(parent, parentType);
		  if (parentPos != null) {
		    const nodePos = getBinaryPrecedence(node, node.type);
		    if (parentPos === nodePos && parentType === "BinaryExpression" && parent.right === node || parentPos > nodePos) {
		      return true;
		    }
		  }
		}
		function UnionTypeAnnotation(node, parent) {
		  const parentType = parent.type;
		  return parentType === "ArrayTypeAnnotation" || parentType === "NullableTypeAnnotation" || parentType === "IntersectionTypeAnnotation" || parentType === "UnionTypeAnnotation";
		}
		function OptionalIndexedAccessType(node, parent) {
		  return isIndexedAccessType(parent) && parent.objectType === node;
		}
		function TSAsExpression(node, parent) {
		  if ((parent.type === "AssignmentExpression" || parent.type === "AssignmentPattern") && parent.left === node) {
		    return true;
		  }
		  if (parent.type === "BinaryExpression" && (parent.operator === "|" || parent.operator === "&") && node === parent.left) {
		    return true;
		  }
		  return Binary(node, parent);
		}
		function TSConditionalType(node, parent) {
		  const parentType = parent.type;
		  if (parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSOptionalType" || parentType === "TSTypeOperator" || parentType === "TSTypeParameter") {
		    return true;
		  }
		  if ((parentType === "TSIntersectionType" || parentType === "TSUnionType") && parent.types[0] === node) {
		    return true;
		  }
		  if (parentType === "TSConditionalType" && (parent.checkType === node || parent.extendsType === node)) {
		    return true;
		  }
		  return false;
		}
		function TSUnionType(node, parent) {
		  const parentType = parent.type;
		  return parentType === "TSIntersectionType" || parentType === "TSTypeOperator" || parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSOptionalType";
		}
		function TSIntersectionType(node, parent) {
		  const parentType = parent.type;
		  return parentType === "TSTypeOperator" || parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSOptionalType";
		}
		function TSInferType(node, parent) {
		  const parentType = parent.type;
		  if (parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSOptionalType") {
		    return true;
		  }
		  if (node.typeParameter.constraint) {
		    if ((parentType === "TSIntersectionType" || parentType === "TSUnionType") && parent.types[0] === node) {
		      return true;
		    }
		  }
		  return false;
		}
		function TSTypeOperator(node, parent) {
		  const parentType = parent.type;
		  return parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSOptionalType";
		}
		function TSInstantiationExpression(node, parent) {
		  const parentType = parent.type;
		  return (parentType === "CallExpression" || parentType === "OptionalCallExpression" || parentType === "NewExpression" || parentType === "TSInstantiationExpression") && !!parent.typeParameters;
		}
		function TSFunctionType(node, parent) {
		  const parentType = parent.type;
		  return parentType === "TSIntersectionType" || parentType === "TSUnionType" || parentType === "TSTypeOperator" || parentType === "TSOptionalType" || parentType === "TSArrayType" || parentType === "TSIndexedAccessType" && parent.objectType === node || parentType === "TSConditionalType" && (parent.checkType === node || parent.extendsType === node);
		}
		function BinaryExpression(node, parent, tokenContext) {
		  return node.operator === "in" && Boolean(tokenContext & _index.TokenContext.forInOrInitHeadAccumulate);
		}
		function SequenceExpression(node, parent) {
		  const parentType = parent.type;
		  if (parentType === "SequenceExpression" || parentType === "ParenthesizedExpression" || parentType === "MemberExpression" && parent.property === node || parentType === "OptionalMemberExpression" && parent.property === node || parentType === "TemplateLiteral") {
		    return false;
		  }
		  if (parentType === "ClassDeclaration") {
		    return true;
		  }
		  if (parentType === "ForOfStatement") {
		    return parent.right === node;
		  }
		  if (parentType === "ExportDefaultDeclaration") {
		    return true;
		  }
		  return !isStatement(parent);
		}
		function YieldExpression(node, parent) {
		  const parentType = parent.type;
		  return parentType === "BinaryExpression" || parentType === "LogicalExpression" || parentType === "UnaryExpression" || parentType === "SpreadElement" || hasPostfixPart(node, parent) || parentType === "AwaitExpression" && isYieldExpression(node) || parentType === "ConditionalExpression" && node === parent.test || isClassExtendsClause(node, parent) || isTSTypeExpression(parentType);
		}
		function ClassExpression(node, parent, tokenContext) {
		  return Boolean(tokenContext & (_index.TokenContext.expressionStatement | _index.TokenContext.exportDefault));
		}
		function UnaryLike(node, parent) {
		  return hasPostfixPart(node, parent) || isBinaryExpression(parent) && parent.operator === "**" && parent.left === node || isClassExtendsClause(node, parent);
		}
		function FunctionExpression(node, parent, tokenContext) {
		  return Boolean(tokenContext & (_index.TokenContext.expressionStatement | _index.TokenContext.exportDefault));
		}
		function ConditionalExpression(node, parent) {
		  const parentType = parent.type;
		  if (parentType === "UnaryExpression" || parentType === "SpreadElement" || parentType === "BinaryExpression" || parentType === "LogicalExpression" || parentType === "ConditionalExpression" && parent.test === node || parentType === "AwaitExpression" || isTSTypeExpression(parentType)) {
		    return true;
		  }
		  return UnaryLike(node, parent);
		}
		function OptionalMemberExpression(node, parent) {
		  return isCallExpression(parent) && parent.callee === node || isMemberExpression(parent) && parent.object === node;
		}
		function AssignmentExpression(node, parent, tokenContext) {
		  if (needsParenBeforeExpressionBrace(tokenContext) && isObjectPattern(node.left)) {
		    return true;
		  } else {
		    return ConditionalExpression(node, parent);
		  }
		}
		function LogicalExpression(node, parent) {
		  const parentType = parent.type;
		  if (isTSTypeExpression(parentType)) return true;
		  if (parentType !== "LogicalExpression") return false;
		  switch (node.operator) {
		    case "||":
		      return parent.operator === "??" || parent.operator === "&&";
		    case "&&":
		      return parent.operator === "??";
		    case "??":
		      return parent.operator !== "??";
		  }
		}
		function Identifier(node, parent, tokenContext, getRawIdentifier) {
		  var _node$extra;
		  const parentType = parent.type;
		  if ((_node$extra = node.extra) != null && _node$extra.parenthesized && parentType === "AssignmentExpression" && parent.left === node) {
		    const rightType = parent.right.type;
		    if ((rightType === "FunctionExpression" || rightType === "ClassExpression") && parent.right.id == null) {
		      return true;
		    }
		  }
		  if (getRawIdentifier && getRawIdentifier(node) !== node.name) {
		    return false;
		  }
		  if (node.name === "let") {
		    const isFollowedByBracket = isMemberExpression(parent, {
		      object: node,
		      computed: true
		    }) || isOptionalMemberExpression(parent, {
		      object: node,
		      computed: true,
		      optional: false
		    });
		    if (isFollowedByBracket && tokenContext & (_index.TokenContext.expressionStatement | _index.TokenContext.forInitHead | _index.TokenContext.forInHead)) {
		      return true;
		    }
		    return Boolean(tokenContext & _index.TokenContext.forOfHead);
		  }
		  return node.name === "async" && isForOfStatement(parent, {
		    left: node,
		    await: false
		  });
		}

		
		return parentheses;
	}

	var hasRequiredNode;

	function requireNode () {
		if (hasRequiredNode) return node;
		hasRequiredNode = 1;

		Object.defineProperty(node, "__esModule", {
		  value: true
		});
		node.TokenContext = void 0;
		node.isLastChild = isLastChild;
		node.needsParens = needsParens;
		node.needsWhitespace = needsWhitespace;
		node.needsWhitespaceAfter = needsWhitespaceAfter;
		node.needsWhitespaceBefore = needsWhitespaceBefore;
		var whitespace = requireWhitespace();
		var parens = requireParentheses();
		var _t = globalThis.__BABEL_TYPES__;
		const {
		  FLIPPED_ALIAS_KEYS,
		  VISITOR_KEYS,
		  isCallExpression,
		  isDecorator,
		  isExpressionStatement,
		  isMemberExpression,
		  isNewExpression,
		  isParenthesizedExpression
		} = _t;
		node.TokenContext = {
		  normal: 0,
		  expressionStatement: 1,
		  arrowBody: 2,
		  exportDefault: 4,
		  arrowFlowReturnType: 8,
		  forInitHead: 16,
		  forInHead: 32,
		  forOfHead: 64,
		  forInOrInitHeadAccumulate: 128,
		  forInOrInitHeadAccumulatePassThroughMask: 128
		};
		function expandAliases(obj) {
		  const map = new Map();
		  function add(type, func) {
		    const fn = map.get(type);
		    map.set(type, fn ? function (node, parent, stack, getRawIdentifier) {
		      var _fn;
		      return (_fn = fn(node, parent, stack, getRawIdentifier)) != null ? _fn : func(node, parent, stack, getRawIdentifier);
		    } : func);
		  }
		  for (const type of Object.keys(obj)) {
		    const aliases = FLIPPED_ALIAS_KEYS[type];
		    if (aliases) {
		      for (const alias of aliases) {
		        add(alias, obj[type]);
		      }
		    } else {
		      add(type, obj[type]);
		    }
		  }
		  return map;
		}
		const expandedParens = expandAliases(parens);
		const expandedWhitespaceNodes = expandAliases(whitespace.nodes);
		function isOrHasCallExpression(node) {
		  if (isCallExpression(node)) {
		    return true;
		  }
		  return isMemberExpression(node) && isOrHasCallExpression(node.object);
		}
		function needsWhitespace(node, parent, type) {
		  var _expandedWhitespaceNo;
		  if (!node) return false;
		  if (isExpressionStatement(node)) {
		    node = node.expression;
		  }
		  const flag = (_expandedWhitespaceNo = expandedWhitespaceNodes.get(node.type)) == null ? void 0 : _expandedWhitespaceNo(node, parent);
		  if (typeof flag === "number") {
		    return (flag & type) !== 0;
		  }
		  return false;
		}
		function needsWhitespaceBefore(node, parent) {
		  return needsWhitespace(node, parent, 1);
		}
		function needsWhitespaceAfter(node, parent) {
		  return needsWhitespace(node, parent, 2);
		}
		function needsParens(node, parent, tokenContext, getRawIdentifier) {
		  var _expandedParens$get;
		  if (!parent) return false;
		  if (isNewExpression(parent) && parent.callee === node) {
		    if (isOrHasCallExpression(node)) return true;
		  }
		  if (isDecorator(parent)) {
		    return !isDecoratorMemberExpression(node) && !(isCallExpression(node) && isDecoratorMemberExpression(node.callee)) && !isParenthesizedExpression(node);
		  }
		  return ((_expandedParens$get = expandedParens.get(node.type)) == null ? void 0 : _expandedParens$get(node, parent, tokenContext, getRawIdentifier)) || false;
		}
		function isDecoratorMemberExpression(node) {
		  switch (node.type) {
		    case "Identifier":
		      return true;
		    case "MemberExpression":
		      return !node.computed && node.property.type === "Identifier" && isDecoratorMemberExpression(node.object);
		    default:
		      return false;
		  }
		}
		function isLastChild(parent, child) {
		  const visitorKeys = VISITOR_KEYS[parent.type];
		  for (let i = visitorKeys.length - 1; i >= 0; i--) {
		    const val = parent[visitorKeys[i]];
		    if (val === child) {
		      return true;
		    } else if (Array.isArray(val)) {
		      let j = val.length - 1;
		      while (j >= 0 && val[j] === null) j--;
		      return j >= 0 && val[j] === child;
		    } else if (val) {
		      return false;
		    }
		  }
		  return false;
		}

		
		return node;
	}

	var tokenMap = {};

	var hasRequiredTokenMap;

	function requireTokenMap () {
		if (hasRequiredTokenMap) return tokenMap;
		hasRequiredTokenMap = 1;

		Object.defineProperty(tokenMap, "__esModule", {
		  value: true
		});
		tokenMap.TokenMap = void 0;
		var _t = globalThis.__BABEL_TYPES__;
		const {
		  traverseFast,
		  VISITOR_KEYS
		} = _t;
		class TokenMap {
		  constructor(ast, tokens, source) {
		    this._tokens = void 0;
		    this._source = void 0;
		    this._nodesToTokenIndexes = new Map();
		    this._nodesOccurrencesCountCache = new Map();
		    this._tokensCache = new Map();
		    this._tokens = tokens;
		    this._source = source;
		    traverseFast(ast, node => {
		      const indexes = this._getTokensIndexesOfNode(node);
		      if (indexes.length > 0) this._nodesToTokenIndexes.set(node, indexes);
		    });
		    this._tokensCache.clear();
		  }
		  has(node) {
		    return this._nodesToTokenIndexes.has(node);
		  }
		  getIndexes(node) {
		    return this._nodesToTokenIndexes.get(node);
		  }
		  find(node, condition) {
		    const indexes = this._nodesToTokenIndexes.get(node);
		    if (indexes) {
		      for (let k = 0; k < indexes.length; k++) {
		        const index = indexes[k];
		        const tok = this._tokens[index];
		        if (condition(tok, index)) return tok;
		      }
		    }
		    return null;
		  }
		  findLastIndex(node, condition) {
		    const indexes = this._nodesToTokenIndexes.get(node);
		    if (indexes) {
		      for (let k = indexes.length - 1; k >= 0; k--) {
		        const index = indexes[k];
		        const tok = this._tokens[index];
		        if (condition(tok, index)) return index;
		      }
		    }
		    return -1;
		  }
		  findMatching(node, test, occurrenceCount = 0) {
		    const indexes = this._nodesToTokenIndexes.get(node);
		    if (indexes) {
		      let i = 0;
		      const count = occurrenceCount;
		      if (count > 1) {
		        const cache = this._nodesOccurrencesCountCache.get(node);
		        if (cache && cache.test === test && cache.count < count) {
		          i = cache.i + 1;
		          occurrenceCount -= cache.count + 1;
		        }
		      }
		      for (; i < indexes.length; i++) {
		        const tok = this._tokens[indexes[i]];
		        if (this.matchesOriginal(tok, test)) {
		          if (occurrenceCount === 0) {
		            if (count > 0) {
		              this._nodesOccurrencesCountCache.set(node, {
		                test,
		                count,
		                i
		              });
		            }
		            return tok;
		          }
		          occurrenceCount--;
		        }
		      }
		    }
		    return null;
		  }
		  matchesOriginal(token, test) {
		    if (token.end - token.start !== test.length) return false;
		    if (token.value != null) return token.value === test;
		    return this._source.startsWith(test, token.start);
		  }
		  startMatches(node, test) {
		    const indexes = this._nodesToTokenIndexes.get(node);
		    if (!indexes) return false;
		    const tok = this._tokens[indexes[0]];
		    if (tok.start !== node.start) return false;
		    return this.matchesOriginal(tok, test);
		  }
		  endMatches(node, test) {
		    const indexes = this._nodesToTokenIndexes.get(node);
		    if (!indexes) return false;
		    const tok = this._tokens[indexes[indexes.length - 1]];
		    if (tok.end !== node.end) return false;
		    return this.matchesOriginal(tok, test);
		  }
		  _getTokensIndexesOfNode(node) {
		    if (node.start == null || node.end == null) return [];
		    const {
		      first,
		      last
		    } = this._findTokensOfNode(node, 0, this._tokens.length - 1);
		    let low = first;
		    const children = childrenIterator(node);
		    if ((node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") && node.declaration && node.declaration.type === "ClassDeclaration") {
		      children.next();
		    }
		    const indexes = [];
		    for (const child of children) {
		      if (child == null) continue;
		      if (child.start == null || child.end == null) continue;
		      const childTok = this._findTokensOfNode(child, low, last);
		      const high = childTok.first;
		      for (let k = low; k < high; k++) indexes.push(k);
		      low = childTok.last + 1;
		    }
		    for (let k = low; k <= last; k++) indexes.push(k);
		    return indexes;
		  }
		  _findTokensOfNode(node, low, high) {
		    const cached = this._tokensCache.get(node);
		    if (cached) return cached;
		    const first = this._findFirstTokenOfNode(node.start, low, high);
		    const last = this._findLastTokenOfNode(node.end, first, high);
		    this._tokensCache.set(node, {
		      first,
		      last
		    });
		    return {
		      first,
		      last
		    };
		  }
		  _findFirstTokenOfNode(start, low, high) {
		    while (low <= high) {
		      const mid = high + low >> 1;
		      if (start < this._tokens[mid].start) {
		        high = mid - 1;
		      } else if (start > this._tokens[mid].start) {
		        low = mid + 1;
		      } else {
		        return mid;
		      }
		    }
		    return low;
		  }
		  _findLastTokenOfNode(end, low, high) {
		    while (low <= high) {
		      const mid = high + low >> 1;
		      if (end < this._tokens[mid].end) {
		        high = mid - 1;
		      } else if (end > this._tokens[mid].end) {
		        low = mid + 1;
		      } else {
		        return mid;
		      }
		    }
		    return high;
		  }
		}
		tokenMap.TokenMap = TokenMap;
		function* childrenIterator(node) {
		  if (node.type === "TemplateLiteral") {
		    yield node.quasis[0];
		    for (let i = 1; i < node.quasis.length; i++) {
		      yield node.expressions[i - 1];
		      yield node.quasis[i];
		    }
		    return;
		  }
		  const keys = VISITOR_KEYS[node.type];
		  for (const key of keys) {
		    const child = node[key];
		    if (!child) continue;
		    if (Array.isArray(child)) {
		      yield* child;
		    } else {
		      yield child;
		    }
		  }
		}

		
		return tokenMap;
	}

	var generators = {};

	var templateLiterals = {};

	var hasRequiredTemplateLiterals;

	function requireTemplateLiterals () {
		if (hasRequiredTemplateLiterals) return templateLiterals;
		hasRequiredTemplateLiterals = 1;

		Object.defineProperty(templateLiterals, "__esModule", {
		  value: true
		});
		templateLiterals.TaggedTemplateExpression = TaggedTemplateExpression;
		templateLiterals.TemplateElement = TemplateElement;
		templateLiterals.TemplateLiteral = TemplateLiteral;
		templateLiterals._printTemplate = _printTemplate;
		function TaggedTemplateExpression(node) {
		  this.print(node.tag);
		  {
		    this.print(node.typeParameters);
		  }
		  this.print(node.quasi);
		}
		function TemplateElement() {
		  throw new Error("TemplateElement printing is handled in TemplateLiteral");
		}
		function _printTemplate(node, substitutions) {
		  const quasis = node.quasis;
		  let partRaw = "`";
		  for (let i = 0; i < quasis.length - 1; i++) {
		    partRaw += quasis[i].value.raw;
		    this.token(partRaw + "${", true);
		    this.print(substitutions[i]);
		    partRaw = "}";
		    if (this.tokenMap) {
		      const token = this.tokenMap.findMatching(node, "}", i);
		      if (token) this._catchUpTo(token.loc.start);
		    }
		  }
		  partRaw += quasis[quasis.length - 1].value.raw;
		  this.token(partRaw + "`", true);
		}
		function TemplateLiteral(node) {
		  this._printTemplate(node, node.expressions);
		}

		
		return templateLiterals;
	}

	var expressions = {};

	var hasRequiredExpressions;

	function requireExpressions () {
		if (hasRequiredExpressions) return expressions;
		hasRequiredExpressions = 1;

		Object.defineProperty(expressions, "__esModule", {
		  value: true
		});
		expressions.LogicalExpression = expressions.BinaryExpression = expressions.AssignmentExpression = AssignmentExpression;
		expressions.AssignmentPattern = AssignmentPattern;
		expressions.AwaitExpression = AwaitExpression;
		expressions.BindExpression = BindExpression;
		expressions.CallExpression = CallExpression;
		expressions.ConditionalExpression = ConditionalExpression;
		expressions.Decorator = Decorator;
		expressions.DoExpression = DoExpression;
		expressions.EmptyStatement = EmptyStatement;
		expressions.ExpressionStatement = ExpressionStatement;
		expressions.Import = Import;
		expressions.MemberExpression = MemberExpression;
		expressions.MetaProperty = MetaProperty;
		expressions.ModuleExpression = ModuleExpression;
		expressions.NewExpression = NewExpression;
		expressions.OptionalCallExpression = OptionalCallExpression;
		expressions.OptionalMemberExpression = OptionalMemberExpression;
		expressions.ParenthesizedExpression = ParenthesizedExpression;
		expressions.PrivateName = PrivateName;
		expressions.SequenceExpression = SequenceExpression;
		expressions.Super = Super;
		expressions.ThisExpression = ThisExpression;
		expressions.UnaryExpression = UnaryExpression;
		expressions.UpdateExpression = UpdateExpression;
		expressions.V8IntrinsicIdentifier = V8IntrinsicIdentifier;
		expressions.YieldExpression = YieldExpression;
		expressions._shouldPrintDecoratorsBeforeExport = _shouldPrintDecoratorsBeforeExport;
		var _t = globalThis.__BABEL_TYPES__;
		var _index = requireNode();
		const {
		  isCallExpression,
		  isLiteral,
		  isMemberExpression,
		  isNewExpression,
		  isPattern
		} = _t;
		function UnaryExpression(node) {
		  const {
		    operator
		  } = node;
		  if (operator === "void" || operator === "delete" || operator === "typeof" || operator === "throw") {
		    this.word(operator);
		    this.space();
		  } else {
		    this.token(operator);
		  }
		  this.print(node.argument);
		}
		function DoExpression(node) {
		  if (node.async) {
		    this.word("async", true);
		    this.space();
		  }
		  this.word("do");
		  this.space();
		  this.print(node.body);
		}
		function ParenthesizedExpression(node) {
		  this.tokenChar(40);
		  const exit = this.enterDelimited();
		  this.print(node.expression);
		  exit();
		  this.rightParens(node);
		}
		function UpdateExpression(node) {
		  if (node.prefix) {
		    this.token(node.operator);
		    this.print(node.argument);
		  } else {
		    this.print(node.argument, true);
		    this.token(node.operator);
		  }
		}
		function ConditionalExpression(node) {
		  this.print(node.test);
		  this.space();
		  this.tokenChar(63);
		  this.space();
		  this.print(node.consequent);
		  this.space();
		  this.tokenChar(58);
		  this.space();
		  this.print(node.alternate);
		}
		function NewExpression(node, parent) {
		  this.word("new");
		  this.space();
		  this.print(node.callee);
		  if (this.format.minified && node.arguments.length === 0 && !node.optional && !isCallExpression(parent, {
		    callee: node
		  }) && !isMemberExpression(parent) && !isNewExpression(parent)) {
		    return;
		  }
		  this.print(node.typeArguments);
		  {
		    this.print(node.typeParameters);
		    if (node.optional) {
		      this.token("?.");
		    }
		  }
		  if (node.arguments.length === 0 && this.tokenMap && !this.tokenMap.endMatches(node, ")")) {
		    return;
		  }
		  this.tokenChar(40);
		  const exit = this.enterDelimited();
		  this.printList(node.arguments, this.shouldPrintTrailingComma(")"));
		  exit();
		  this.rightParens(node);
		}
		function SequenceExpression(node) {
		  this.printList(node.expressions);
		}
		function ThisExpression() {
		  this.word("this");
		}
		function Super() {
		  this.word("super");
		}
		function _shouldPrintDecoratorsBeforeExport(node) {
		  if (typeof this.format.decoratorsBeforeExport === "boolean") {
		    return this.format.decoratorsBeforeExport;
		  }
		  return typeof node.start === "number" && node.start === node.declaration.start;
		}
		function Decorator(node) {
		  this.tokenChar(64);
		  this.print(node.expression);
		  this.newline();
		}
		function OptionalMemberExpression(node) {
		  let {
		    computed
		  } = node;
		  const {
		    optional,
		    property
		  } = node;
		  this.print(node.object);
		  if (!computed && isMemberExpression(property)) {
		    throw new TypeError("Got a MemberExpression for MemberExpression property");
		  }
		  if (isLiteral(property) && typeof property.value === "number") {
		    computed = true;
		  }
		  if (optional) {
		    this.token("?.");
		  }
		  if (computed) {
		    this.tokenChar(91);
		    this.print(property);
		    this.tokenChar(93);
		  } else {
		    if (!optional) {
		      this.tokenChar(46);
		    }
		    this.print(property);
		  }
		}
		function OptionalCallExpression(node) {
		  this.print(node.callee);
		  {
		    this.print(node.typeParameters);
		  }
		  if (node.optional) {
		    this.token("?.");
		  }
		  this.print(node.typeArguments);
		  this.tokenChar(40);
		  const exit = this.enterDelimited();
		  this.printList(node.arguments);
		  exit();
		  this.rightParens(node);
		}
		function CallExpression(node) {
		  this.print(node.callee);
		  this.print(node.typeArguments);
		  {
		    this.print(node.typeParameters);
		  }
		  this.tokenChar(40);
		  const exit = this.enterDelimited();
		  this.printList(node.arguments, this.shouldPrintTrailingComma(")"));
		  exit();
		  this.rightParens(node);
		}
		function Import() {
		  this.word("import");
		}
		function AwaitExpression(node) {
		  this.word("await");
		  this.space();
		  this.print(node.argument);
		}
		function YieldExpression(node) {
		  if (node.delegate) {
		    this.word("yield", true);
		    this.tokenChar(42);
		    if (node.argument) {
		      this.space();
		      this.print(node.argument);
		    }
		  } else if (node.argument) {
		    this.word("yield", true);
		    this.space();
		    this.print(node.argument);
		  } else {
		    this.word("yield");
		  }
		}
		function EmptyStatement() {
		  this.semicolon(true);
		}
		function ExpressionStatement(node) {
		  this.tokenContext |= _index.TokenContext.expressionStatement;
		  this.print(node.expression);
		  this.semicolon();
		}
		function AssignmentPattern(node) {
		  this.print(node.left);
		  if (node.left.type === "Identifier" || isPattern(node.left)) {
		    if (node.left.optional) this.tokenChar(63);
		    this.print(node.left.typeAnnotation);
		  }
		  this.space();
		  this.tokenChar(61);
		  this.space();
		  this.print(node.right);
		}
		function AssignmentExpression(node) {
		  this.print(node.left);
		  this.space();
		  if (node.operator === "in" || node.operator === "instanceof") {
		    this.word(node.operator);
		  } else {
		    this.token(node.operator);
		    this._endsWithDiv = node.operator === "/";
		  }
		  this.space();
		  this.print(node.right);
		}
		function BindExpression(node) {
		  this.print(node.object);
		  this.token("::");
		  this.print(node.callee);
		}
		function MemberExpression(node) {
		  this.print(node.object);
		  if (!node.computed && isMemberExpression(node.property)) {
		    throw new TypeError("Got a MemberExpression for MemberExpression property");
		  }
		  let computed = node.computed;
		  if (isLiteral(node.property) && typeof node.property.value === "number") {
		    computed = true;
		  }
		  if (computed) {
		    const exit = this.enterDelimited();
		    this.tokenChar(91);
		    this.print(node.property);
		    this.tokenChar(93);
		    exit();
		  } else {
		    this.tokenChar(46);
		    this.print(node.property);
		  }
		}
		function MetaProperty(node) {
		  this.print(node.meta);
		  this.tokenChar(46);
		  this.print(node.property);
		}
		function PrivateName(node) {
		  this.tokenChar(35);
		  this.print(node.id);
		}
		function V8IntrinsicIdentifier(node) {
		  this.tokenChar(37);
		  this.word(node.name);
		}
		function ModuleExpression(node) {
		  this.word("module", true);
		  this.space();
		  this.tokenChar(123);
		  this.indent();
		  const {
		    body
		  } = node;
		  if (body.body.length || body.directives.length) {
		    this.newline();
		  }
		  this.print(body);
		  this.dedent();
		  this.rightBrace(node);
		}

		
		return expressions;
	}

	var statements = {};

	var hasRequiredStatements;

	function requireStatements () {
		if (hasRequiredStatements) return statements;
		hasRequiredStatements = 1;

		Object.defineProperty(statements, "__esModule", {
		  value: true
		});
		statements.BreakStatement = BreakStatement;
		statements.CatchClause = CatchClause;
		statements.ContinueStatement = ContinueStatement;
		statements.DebuggerStatement = DebuggerStatement;
		statements.DoWhileStatement = DoWhileStatement;
		statements.ForOfStatement = statements.ForInStatement = void 0;
		statements.ForStatement = ForStatement;
		statements.IfStatement = IfStatement;
		statements.LabeledStatement = LabeledStatement;
		statements.ReturnStatement = ReturnStatement;
		statements.SwitchCase = SwitchCase;
		statements.SwitchStatement = SwitchStatement;
		statements.ThrowStatement = ThrowStatement;
		statements.TryStatement = TryStatement;
		statements.VariableDeclaration = VariableDeclaration;
		statements.VariableDeclarator = VariableDeclarator;
		statements.WhileStatement = WhileStatement;
		statements.WithStatement = WithStatement;
		var _t = globalThis.__BABEL_TYPES__;
		const {
		  isFor,
		  isForStatement,
		  isIfStatement,
		  isStatement
		} = _t;
		function WithStatement(node) {
		  this.word("with");
		  this.space();
		  this.tokenChar(40);
		  this.print(node.object);
		  this.tokenChar(41);
		  this.printBlock(node);
		}
		function IfStatement(node) {
		  this.word("if");
		  this.space();
		  this.tokenChar(40);
		  this.print(node.test);
		  this.tokenChar(41);
		  this.space();
		  const needsBlock = node.alternate && isIfStatement(getLastStatement(node.consequent));
		  if (needsBlock) {
		    this.tokenChar(123);
		    this.newline();
		    this.indent();
		  }
		  this.printAndIndentOnComments(node.consequent);
		  if (needsBlock) {
		    this.dedent();
		    this.newline();
		    this.tokenChar(125);
		  }
		  if (node.alternate) {
		    if (this.endsWith(125)) this.space();
		    this.word("else");
		    this.space();
		    this.printAndIndentOnComments(node.alternate);
		  }
		}
		function getLastStatement(statement) {
		  const {
		    body
		  } = statement;
		  if (isStatement(body) === false) {
		    return statement;
		  }
		  return getLastStatement(body);
		}
		function ForStatement(node) {
		  this.word("for");
		  this.space();
		  this.tokenChar(40);
		  {
		    const exit = this.enterForStatementInit();
		    this.print(node.init);
		    exit();
		  }
		  this.tokenChar(59);
		  if (node.test) {
		    this.space();
		    this.print(node.test);
		  }
		  this.token(";", false, 1);
		  if (node.update) {
		    this.space();
		    this.print(node.update);
		  }
		  this.tokenChar(41);
		  this.printBlock(node);
		}
		function WhileStatement(node) {
		  this.word("while");
		  this.space();
		  this.tokenChar(40);
		  this.print(node.test);
		  this.tokenChar(41);
		  this.printBlock(node);
		}
		function ForXStatement(node) {
		  this.word("for");
		  this.space();
		  const isForOf = node.type === "ForOfStatement";
		  if (isForOf && node.await) {
		    this.word("await");
		    this.space();
		  }
		  this.noIndentInnerCommentsHere();
		  this.tokenChar(40);
		  {
		    const exit = this.enterForXStatementInit(isForOf);
		    this.print(node.left);
		    exit == null || exit();
		  }
		  this.space();
		  this.word(isForOf ? "of" : "in");
		  this.space();
		  this.print(node.right);
		  this.tokenChar(41);
		  this.printBlock(node);
		}
		statements.ForInStatement = ForXStatement;
		statements.ForOfStatement = ForXStatement;
		function DoWhileStatement(node) {
		  this.word("do");
		  this.space();
		  this.print(node.body);
		  this.space();
		  this.word("while");
		  this.space();
		  this.tokenChar(40);
		  this.print(node.test);
		  this.tokenChar(41);
		  this.semicolon();
		}
		function printStatementAfterKeyword(printer, node) {
		  if (node) {
		    printer.space();
		    printer.printTerminatorless(node);
		  }
		  printer.semicolon();
		}
		function BreakStatement(node) {
		  this.word("break");
		  printStatementAfterKeyword(this, node.label);
		}
		function ContinueStatement(node) {
		  this.word("continue");
		  printStatementAfterKeyword(this, node.label);
		}
		function ReturnStatement(node) {
		  this.word("return");
		  printStatementAfterKeyword(this, node.argument);
		}
		function ThrowStatement(node) {
		  this.word("throw");
		  printStatementAfterKeyword(this, node.argument);
		}
		function LabeledStatement(node) {
		  this.print(node.label);
		  this.tokenChar(58);
		  this.space();
		  this.print(node.body);
		}
		function TryStatement(node) {
		  this.word("try");
		  this.space();
		  this.print(node.block);
		  this.space();
		  if (node.handlers) {
		    this.print(node.handlers[0]);
		  } else {
		    this.print(node.handler);
		  }
		  if (node.finalizer) {
		    this.space();
		    this.word("finally");
		    this.space();
		    this.print(node.finalizer);
		  }
		}
		function CatchClause(node) {
		  this.word("catch");
		  this.space();
		  if (node.param) {
		    this.tokenChar(40);
		    this.print(node.param);
		    this.print(node.param.typeAnnotation);
		    this.tokenChar(41);
		    this.space();
		  }
		  this.print(node.body);
		}
		function SwitchStatement(node) {
		  this.word("switch");
		  this.space();
		  this.tokenChar(40);
		  this.print(node.discriminant);
		  this.tokenChar(41);
		  this.space();
		  this.tokenChar(123);
		  this.printSequence(node.cases, true);
		  this.rightBrace(node);
		}
		function SwitchCase(node) {
		  if (node.test) {
		    this.word("case");
		    this.space();
		    this.print(node.test);
		    this.tokenChar(58);
		  } else {
		    this.word("default");
		    this.tokenChar(58);
		  }
		  if (node.consequent.length) {
		    this.newline();
		    this.printSequence(node.consequent, true);
		  }
		}
		function DebuggerStatement() {
		  this.word("debugger");
		  this.semicolon();
		}
		function VariableDeclaration(node, parent) {
		  if (node.declare) {
		    this.word("declare");
		    this.space();
		  }
		  const {
		    kind
		  } = node;
		  if (kind === "await using") {
		    this.word("await");
		    this.space();
		    this.word("using", true);
		  } else {
		    this.word(kind, kind === "using");
		  }
		  this.space();
		  let hasInits = false;
		  if (!isFor(parent)) {
		    for (const declar of node.declarations) {
		      if (declar.init) {
		        hasInits = true;
		      }
		    }
		  }
		  this.printList(node.declarations, undefined, undefined, node.declarations.length > 1, hasInits ? function (occurrenceCount) {
		    this.token(",", false, occurrenceCount);
		    this.newline();
		  } : undefined);
		  if (isFor(parent)) {
		    if (isForStatement(parent)) {
		      if (parent.init === node) return;
		    } else {
		      if (parent.left === node) return;
		    }
		  }
		  this.semicolon();
		}
		function VariableDeclarator(node) {
		  this.print(node.id);
		  if (node.definite) this.tokenChar(33);
		  this.print(node.id.typeAnnotation);
		  if (node.init) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(node.init);
		  }
		}

		
		return statements;
	}

	var classes = {};

	var hasRequiredClasses;

	function requireClasses () {
		if (hasRequiredClasses) return classes;
		hasRequiredClasses = 1;

		Object.defineProperty(classes, "__esModule", {
		  value: true
		});
		classes.ClassAccessorProperty = ClassAccessorProperty;
		classes.ClassBody = ClassBody;
		classes.ClassExpression = classes.ClassDeclaration = ClassDeclaration;
		classes.ClassMethod = ClassMethod;
		classes.ClassPrivateMethod = ClassPrivateMethod;
		classes.ClassPrivateProperty = ClassPrivateProperty;
		classes.ClassProperty = ClassProperty;
		classes.StaticBlock = StaticBlock;
		classes._classMethodHead = _classMethodHead;
		var _t = globalThis.__BABEL_TYPES__;
		const {
		  isExportDefaultDeclaration,
		  isExportNamedDeclaration
		} = _t;
		function ClassDeclaration(node, parent) {
		  const inExport = isExportDefaultDeclaration(parent) || isExportNamedDeclaration(parent);
		  if (!inExport || !this._shouldPrintDecoratorsBeforeExport(parent)) {
		    this.printJoin(node.decorators);
		  }
		  if (node.declare) {
		    this.word("declare");
		    this.space();
		  }
		  if (node.abstract) {
		    this.word("abstract");
		    this.space();
		  }
		  this.word("class");
		  if (node.id) {
		    this.space();
		    this.print(node.id);
		  }
		  this.print(node.typeParameters);
		  if (node.superClass) {
		    this.space();
		    this.word("extends");
		    this.space();
		    this.print(node.superClass);
		    this.print(node.superTypeParameters);
		  }
		  if (node.implements) {
		    this.space();
		    this.word("implements");
		    this.space();
		    this.printList(node.implements);
		  }
		  this.space();
		  this.print(node.body);
		}
		function ClassBody(node) {
		  this.tokenChar(123);
		  if (node.body.length === 0) {
		    this.tokenChar(125);
		  } else {
		    this.newline();
		    const separator = classBodyEmptySemicolonsPrinter(this, node);
		    separator == null || separator(-1);
		    const exit = this.enterDelimited();
		    this.printJoin(node.body, true, true, separator, true);
		    exit();
		    if (!this.endsWith(10)) this.newline();
		    this.rightBrace(node);
		  }
		}
		function classBodyEmptySemicolonsPrinter(printer, node) {
		  if (!printer.tokenMap || node.start == null || node.end == null) {
		    return null;
		  }
		  const indexes = printer.tokenMap.getIndexes(node);
		  if (!indexes) return null;
		  let k = 1;
		  let occurrenceCount = 0;
		  let nextLocIndex = 0;
		  const advanceNextLocIndex = () => {
		    while (nextLocIndex < node.body.length && node.body[nextLocIndex].start == null) {
		      nextLocIndex++;
		    }
		  };
		  advanceNextLocIndex();
		  return i => {
		    if (nextLocIndex <= i) {
		      nextLocIndex = i + 1;
		      advanceNextLocIndex();
		    }
		    const end = nextLocIndex === node.body.length ? node.end : node.body[nextLocIndex].start;
		    let tok;
		    while (k < indexes.length && printer.tokenMap.matchesOriginal(tok = printer._tokens[indexes[k]], ";") && tok.start < end) {
		      printer.token(";", undefined, occurrenceCount++);
		      k++;
		    }
		  };
		}
		function ClassProperty(node) {
		  this.printJoin(node.decorators);
		  if (!node.static && !this.format.preserveFormat) {
		    var _node$key$loc;
		    const endLine = (_node$key$loc = node.key.loc) == null || (_node$key$loc = _node$key$loc.end) == null ? void 0 : _node$key$loc.line;
		    if (endLine) this.catchUp(endLine);
		  }
		  this.tsPrintClassMemberModifiers(node);
		  if (node.computed) {
		    this.tokenChar(91);
		    this.print(node.key);
		    this.tokenChar(93);
		  } else {
		    this._variance(node);
		    this.print(node.key);
		  }
		  if (node.optional) {
		    this.tokenChar(63);
		  }
		  if (node.definite) {
		    this.tokenChar(33);
		  }
		  this.print(node.typeAnnotation);
		  if (node.value) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(node.value);
		  }
		  this.semicolon();
		}
		function ClassAccessorProperty(node) {
		  var _node$key$loc2;
		  this.printJoin(node.decorators);
		  const endLine = (_node$key$loc2 = node.key.loc) == null || (_node$key$loc2 = _node$key$loc2.end) == null ? void 0 : _node$key$loc2.line;
		  if (endLine) this.catchUp(endLine);
		  this.tsPrintClassMemberModifiers(node);
		  this.word("accessor", true);
		  this.space();
		  if (node.computed) {
		    this.tokenChar(91);
		    this.print(node.key);
		    this.tokenChar(93);
		  } else {
		    this._variance(node);
		    this.print(node.key);
		  }
		  if (node.optional) {
		    this.tokenChar(63);
		  }
		  if (node.definite) {
		    this.tokenChar(33);
		  }
		  this.print(node.typeAnnotation);
		  if (node.value) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(node.value);
		  }
		  this.semicolon();
		}
		function ClassPrivateProperty(node) {
		  this.printJoin(node.decorators);
		  this.tsPrintClassMemberModifiers(node);
		  this.print(node.key);
		  if (node.optional) {
		    this.tokenChar(63);
		  }
		  if (node.definite) {
		    this.tokenChar(33);
		  }
		  this.print(node.typeAnnotation);
		  if (node.value) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(node.value);
		  }
		  this.semicolon();
		}
		function ClassMethod(node) {
		  this._classMethodHead(node);
		  this.space();
		  this.print(node.body);
		}
		function ClassPrivateMethod(node) {
		  this._classMethodHead(node);
		  this.space();
		  this.print(node.body);
		}
		function _classMethodHead(node) {
		  this.printJoin(node.decorators);
		  if (!this.format.preserveFormat) {
		    var _node$key$loc3;
		    const endLine = (_node$key$loc3 = node.key.loc) == null || (_node$key$loc3 = _node$key$loc3.end) == null ? void 0 : _node$key$loc3.line;
		    if (endLine) this.catchUp(endLine);
		  }
		  this.tsPrintClassMemberModifiers(node);
		  this._methodHead(node);
		}
		function StaticBlock(node) {
		  this.word("static");
		  this.space();
		  this.tokenChar(123);
		  if (node.body.length === 0) {
		    this.tokenChar(125);
		  } else {
		    this.newline();
		    this.printSequence(node.body, true);
		    this.rightBrace(node);
		  }
		}

		
		return classes;
	}

	var methods = {};

	var hasRequiredMethods;

	function requireMethods () {
		if (hasRequiredMethods) return methods;
		hasRequiredMethods = 1;

		Object.defineProperty(methods, "__esModule", {
		  value: true
		});
		methods.ArrowFunctionExpression = ArrowFunctionExpression;
		methods.FunctionDeclaration = methods.FunctionExpression = FunctionExpression;
		methods._functionHead = _functionHead;
		methods._methodHead = _methodHead;
		methods._param = _param;
		methods._parameters = _parameters;
		methods._params = _params;
		methods._predicate = _predicate;
		methods._shouldPrintArrowParamsParens = _shouldPrintArrowParamsParens;
		var _t = globalThis.__BABEL_TYPES__;
		var _index = requireNode();
		const {
		  isIdentifier
		} = _t;
		function _params(node, idNode, parentNode) {
		  this.print(node.typeParameters);
		  const nameInfo = _getFuncIdName.call(this, idNode, parentNode);
		  if (nameInfo) {
		    this.sourceIdentifierName(nameInfo.name, nameInfo.pos);
		  }
		  this.tokenChar(40);
		  this._parameters(node.params, ")");
		  const noLineTerminator = node.type === "ArrowFunctionExpression";
		  this.print(node.returnType, noLineTerminator);
		  this._noLineTerminator = noLineTerminator;
		}
		function _parameters(parameters, endToken) {
		  const exit = this.enterDelimited();
		  const trailingComma = this.shouldPrintTrailingComma(endToken);
		  const paramLength = parameters.length;
		  for (let i = 0; i < paramLength; i++) {
		    this._param(parameters[i]);
		    if (trailingComma || i < paramLength - 1) {
		      this.token(",", undefined, i);
		      this.space();
		    }
		  }
		  this.token(endToken);
		  exit();
		}
		function _param(parameter) {
		  this.printJoin(parameter.decorators);
		  this.print(parameter);
		  if (parameter.optional) {
		    this.tokenChar(63);
		  }
		  this.print(parameter.typeAnnotation);
		}
		function _methodHead(node) {
		  const kind = node.kind;
		  const key = node.key;
		  if (kind === "get" || kind === "set") {
		    this.word(kind);
		    this.space();
		  }
		  if (node.async) {
		    this.word("async", true);
		    this.space();
		  }
		  if (kind === "method" || kind === "init") {
		    if (node.generator) {
		      this.tokenChar(42);
		    }
		  }
		  if (node.computed) {
		    this.tokenChar(91);
		    this.print(key);
		    this.tokenChar(93);
		  } else {
		    this.print(key);
		  }
		  if (node.optional) {
		    this.tokenChar(63);
		  }
		  this._params(node, node.computed && node.key.type !== "StringLiteral" ? undefined : node.key);
		}
		function _predicate(node, noLineTerminatorAfter) {
		  if (node.predicate) {
		    if (!node.returnType) {
		      this.tokenChar(58);
		    }
		    this.space();
		    this.print(node.predicate, noLineTerminatorAfter);
		  }
		}
		function _functionHead(node, parent) {
		  if (node.async) {
		    this.word("async");
		    if (!this.format.preserveFormat) {
		      this._endsWithInnerRaw = false;
		    }
		    this.space();
		  }
		  this.word("function");
		  if (node.generator) {
		    if (!this.format.preserveFormat) {
		      this._endsWithInnerRaw = false;
		    }
		    this.tokenChar(42);
		  }
		  this.space();
		  if (node.id) {
		    this.print(node.id);
		  }
		  this._params(node, node.id, parent);
		  if (node.type !== "TSDeclareFunction") {
		    this._predicate(node);
		  }
		}
		function FunctionExpression(node, parent) {
		  this._functionHead(node, parent);
		  this.space();
		  this.print(node.body);
		}
		function ArrowFunctionExpression(node, parent) {
		  if (node.async) {
		    this.word("async", true);
		    this.space();
		  }
		  if (this._shouldPrintArrowParamsParens(node)) {
		    this._params(node, undefined, parent);
		  } else {
		    this.print(node.params[0], true);
		  }
		  this._predicate(node, true);
		  this.space();
		  this.printInnerComments();
		  this.token("=>");
		  this.space();
		  this.tokenContext |= _index.TokenContext.arrowBody;
		  this.print(node.body);
		}
		function _shouldPrintArrowParamsParens(node) {
		  var _firstParam$leadingCo, _firstParam$trailingC;
		  if (node.params.length !== 1) return true;
		  if (node.typeParameters || node.returnType || node.predicate) {
		    return true;
		  }
		  const firstParam = node.params[0];
		  if (!isIdentifier(firstParam) || firstParam.typeAnnotation || firstParam.optional || (_firstParam$leadingCo = firstParam.leadingComments) != null && _firstParam$leadingCo.length || (_firstParam$trailingC = firstParam.trailingComments) != null && _firstParam$trailingC.length) {
		    return true;
		  }
		  if (this.tokenMap) {
		    if (node.loc == null) return true;
		    if (this.tokenMap.findMatching(node, "(") !== null) return true;
		    const arrowToken = this.tokenMap.findMatching(node, "=>");
		    if ((arrowToken == null ? void 0 : arrowToken.loc) == null) return true;
		    return arrowToken.loc.start.line !== node.loc.start.line;
		  }
		  if (this.format.retainLines) return true;
		  return false;
		}
		function _getFuncIdName(idNode, parent) {
		  let id = idNode;
		  if (!id && parent) {
		    const parentType = parent.type;
		    if (parentType === "VariableDeclarator") {
		      id = parent.id;
		    } else if (parentType === "AssignmentExpression" || parentType === "AssignmentPattern") {
		      id = parent.left;
		    } else if (parentType === "ObjectProperty" || parentType === "ClassProperty") {
		      if (!parent.computed || parent.key.type === "StringLiteral") {
		        id = parent.key;
		      }
		    } else if (parentType === "ClassPrivateProperty" || parentType === "ClassAccessorProperty") {
		      id = parent.key;
		    }
		  }
		  if (!id) return;
		  let nameInfo;
		  if (id.type === "Identifier") {
		    var _id$loc, _id$loc2;
		    nameInfo = {
		      pos: (_id$loc = id.loc) == null ? void 0 : _id$loc.start,
		      name: ((_id$loc2 = id.loc) == null ? void 0 : _id$loc2.identifierName) || id.name
		    };
		  } else if (id.type === "PrivateName") {
		    var _id$loc3;
		    nameInfo = {
		      pos: (_id$loc3 = id.loc) == null ? void 0 : _id$loc3.start,
		      name: "#" + id.id.name
		    };
		  } else if (id.type === "StringLiteral") {
		    var _id$loc4;
		    nameInfo = {
		      pos: (_id$loc4 = id.loc) == null ? void 0 : _id$loc4.start,
		      name: id.value
		    };
		  }
		  return nameInfo;
		}

		
		return methods;
	}

	var modules = {};

	var hasRequiredModules;

	function requireModules () {
		if (hasRequiredModules) return modules;
		hasRequiredModules = 1;

		Object.defineProperty(modules, "__esModule", {
		  value: true
		});
		modules.ExportAllDeclaration = ExportAllDeclaration;
		modules.ExportDefaultDeclaration = ExportDefaultDeclaration;
		modules.ExportDefaultSpecifier = ExportDefaultSpecifier;
		modules.ExportNamedDeclaration = ExportNamedDeclaration;
		modules.ExportNamespaceSpecifier = ExportNamespaceSpecifier;
		modules.ExportSpecifier = ExportSpecifier;
		modules.ImportAttribute = ImportAttribute;
		modules.ImportDeclaration = ImportDeclaration;
		modules.ImportDefaultSpecifier = ImportDefaultSpecifier;
		modules.ImportExpression = ImportExpression;
		modules.ImportNamespaceSpecifier = ImportNamespaceSpecifier;
		modules.ImportSpecifier = ImportSpecifier;
		modules._printAttributes = _printAttributes;
		var _t = globalThis.__BABEL_TYPES__;
		var _index = requireNode();
		const {
		  isClassDeclaration,
		  isExportDefaultSpecifier,
		  isExportNamespaceSpecifier,
		  isImportDefaultSpecifier,
		  isImportNamespaceSpecifier,
		  isStatement
		} = _t;
		function ImportSpecifier(node) {
		  if (node.importKind === "type" || node.importKind === "typeof") {
		    this.word(node.importKind);
		    this.space();
		  }
		  this.print(node.imported);
		  if (node.local && node.local.name !== node.imported.name) {
		    this.space();
		    this.word("as");
		    this.space();
		    this.print(node.local);
		  }
		}
		function ImportDefaultSpecifier(node) {
		  this.print(node.local);
		}
		function ExportDefaultSpecifier(node) {
		  this.print(node.exported);
		}
		function ExportSpecifier(node) {
		  if (node.exportKind === "type") {
		    this.word("type");
		    this.space();
		  }
		  this.print(node.local);
		  if (node.exported && node.local.name !== node.exported.name) {
		    this.space();
		    this.word("as");
		    this.space();
		    this.print(node.exported);
		  }
		}
		function ExportNamespaceSpecifier(node) {
		  this.tokenChar(42);
		  this.space();
		  this.word("as");
		  this.space();
		  this.print(node.exported);
		}
		let warningShown = false;
		function _printAttributes(node, hasPreviousBrace) {
		  var _node$extra;
		  const {
		    importAttributesKeyword
		  } = this.format;
		  const {
		    attributes,
		    assertions
		  } = node;
		  if (attributes && !importAttributesKeyword && node.extra && (node.extra.deprecatedAssertSyntax || node.extra.deprecatedWithLegacySyntax) && !warningShown) {
		    warningShown = true;
		    console.warn(`\
You are using import attributes, without specifying the desired output syntax.
Please specify the "importAttributesKeyword" generator option, whose value can be one of:
 - "with"        : \`import { a } from "b" with { type: "json" };\`
 - "assert"      : \`import { a } from "b" assert { type: "json" };\`
 - "with-legacy" : \`import { a } from "b" with type: "json";\`
`);
		  }
		  const useAssertKeyword = importAttributesKeyword === "assert" || !importAttributesKeyword && assertions;
		  this.word(useAssertKeyword ? "assert" : "with");
		  this.space();
		  if (!useAssertKeyword && (importAttributesKeyword === "with-legacy" || !importAttributesKeyword && (_node$extra = node.extra) != null && _node$extra.deprecatedWithLegacySyntax)) {
		    this.printList(attributes || assertions);
		    return;
		  }
		  const occurrenceCount = hasPreviousBrace ? 1 : 0;
		  this.token("{", undefined, occurrenceCount);
		  this.space();
		  this.printList(attributes || assertions, this.shouldPrintTrailingComma("}"));
		  this.space();
		  this.token("}", undefined, occurrenceCount);
		}
		function ExportAllDeclaration(node) {
		  var _node$attributes, _node$assertions;
		  this.word("export");
		  this.space();
		  if (node.exportKind === "type") {
		    this.word("type");
		    this.space();
		  }
		  this.tokenChar(42);
		  this.space();
		  this.word("from");
		  this.space();
		  if ((_node$attributes = node.attributes) != null && _node$attributes.length || (_node$assertions = node.assertions) != null && _node$assertions.length) {
		    this.print(node.source, true);
		    this.space();
		    this._printAttributes(node, false);
		  } else {
		    this.print(node.source);
		  }
		  this.semicolon();
		}
		function maybePrintDecoratorsBeforeExport(printer, node) {
		  if (isClassDeclaration(node.declaration) && printer._shouldPrintDecoratorsBeforeExport(node)) {
		    printer.printJoin(node.declaration.decorators);
		  }
		}
		function ExportNamedDeclaration(node) {
		  maybePrintDecoratorsBeforeExport(this, node);
		  this.word("export");
		  this.space();
		  if (node.declaration) {
		    const declar = node.declaration;
		    this.print(declar);
		    if (!isStatement(declar)) this.semicolon();
		  } else {
		    if (node.exportKind === "type") {
		      this.word("type");
		      this.space();
		    }
		    const specifiers = node.specifiers.slice(0);
		    let hasSpecial = false;
		    for (;;) {
		      const first = specifiers[0];
		      if (isExportDefaultSpecifier(first) || isExportNamespaceSpecifier(first)) {
		        hasSpecial = true;
		        this.print(specifiers.shift());
		        if (specifiers.length) {
		          this.tokenChar(44);
		          this.space();
		        }
		      } else {
		        break;
		      }
		    }
		    let hasBrace = false;
		    if (specifiers.length || !specifiers.length && !hasSpecial) {
		      hasBrace = true;
		      this.tokenChar(123);
		      if (specifiers.length) {
		        this.space();
		        this.printList(specifiers, this.shouldPrintTrailingComma("}"));
		        this.space();
		      }
		      this.tokenChar(125);
		    }
		    if (node.source) {
		      var _node$attributes2, _node$assertions2;
		      this.space();
		      this.word("from");
		      this.space();
		      if ((_node$attributes2 = node.attributes) != null && _node$attributes2.length || (_node$assertions2 = node.assertions) != null && _node$assertions2.length) {
		        this.print(node.source, true);
		        this.space();
		        this._printAttributes(node, hasBrace);
		      } else {
		        this.print(node.source);
		      }
		    }
		    this.semicolon();
		  }
		}
		function ExportDefaultDeclaration(node) {
		  maybePrintDecoratorsBeforeExport(this, node);
		  this.word("export");
		  this.noIndentInnerCommentsHere();
		  this.space();
		  this.word("default");
		  this.space();
		  this.tokenContext |= _index.TokenContext.exportDefault;
		  const declar = node.declaration;
		  this.print(declar);
		  if (!isStatement(declar)) this.semicolon();
		}
		function ImportDeclaration(node) {
		  var _node$attributes3, _node$assertions3;
		  this.word("import");
		  this.space();
		  const isTypeKind = node.importKind === "type" || node.importKind === "typeof";
		  if (isTypeKind) {
		    this.noIndentInnerCommentsHere();
		    this.word(node.importKind);
		    this.space();
		  } else if (node.module) {
		    this.noIndentInnerCommentsHere();
		    this.word("module");
		    this.space();
		  } else if (node.phase) {
		    this.noIndentInnerCommentsHere();
		    this.word(node.phase);
		    this.space();
		  }
		  const specifiers = node.specifiers.slice(0);
		  const hasSpecifiers = !!specifiers.length;
		  while (hasSpecifiers) {
		    const first = specifiers[0];
		    if (isImportDefaultSpecifier(first) || isImportNamespaceSpecifier(first)) {
		      this.print(specifiers.shift());
		      if (specifiers.length) {
		        this.tokenChar(44);
		        this.space();
		      }
		    } else {
		      break;
		    }
		  }
		  let hasBrace = false;
		  if (specifiers.length) {
		    hasBrace = true;
		    this.tokenChar(123);
		    this.space();
		    this.printList(specifiers, this.shouldPrintTrailingComma("}"));
		    this.space();
		    this.tokenChar(125);
		  } else if (isTypeKind && !hasSpecifiers) {
		    hasBrace = true;
		    this.tokenChar(123);
		    this.tokenChar(125);
		  }
		  if (hasSpecifiers || isTypeKind) {
		    this.space();
		    this.word("from");
		    this.space();
		  }
		  if ((_node$attributes3 = node.attributes) != null && _node$attributes3.length || (_node$assertions3 = node.assertions) != null && _node$assertions3.length) {
		    this.print(node.source, true);
		    this.space();
		    this._printAttributes(node, hasBrace);
		  } else {
		    this.print(node.source);
		  }
		  this.semicolon();
		}
		function ImportAttribute(node) {
		  this.print(node.key);
		  this.tokenChar(58);
		  this.space();
		  this.print(node.value);
		}
		function ImportNamespaceSpecifier(node) {
		  this.tokenChar(42);
		  this.space();
		  this.word("as");
		  this.space();
		  this.print(node.local);
		}
		function ImportExpression(node) {
		  this.word("import");
		  if (node.phase) {
		    this.tokenChar(46);
		    this.word(node.phase);
		  }
		  this.tokenChar(40);
		  const shouldPrintTrailingComma = this.shouldPrintTrailingComma(")");
		  this.print(node.source);
		  if (node.options != null) {
		    this.tokenChar(44);
		    this.space();
		    this.print(node.options);
		  }
		  if (shouldPrintTrailingComma) {
		    this.tokenChar(44);
		  }
		  this.rightParens(node);
		}

		
		return modules;
	}

	var types = {};

	var jsesc_1;
	var hasRequiredJsesc;

	function requireJsesc () {
		if (hasRequiredJsesc) return jsesc_1;
		hasRequiredJsesc = 1;

		const object = {};
		const hasOwnProperty = object.hasOwnProperty;
		const forOwn = (object, callback) => {
			for (const key in object) {
				if (hasOwnProperty.call(object, key)) {
					callback(key, object[key]);
				}
			}
		};

		const extend = (destination, source) => {
			if (!source) {
				return destination;
			}
			forOwn(source, (key, value) => {
				destination[key] = value;
			});
			return destination;
		};

		const forEach = (array, callback) => {
			const length = array.length;
			let index = -1;
			while (++index < length) {
				callback(array[index]);
			}
		};

		const fourHexEscape = (hex) => {
			return '\\u' + ('0000' + hex).slice(-4);
		};

		const hexadecimal = (code, lowercase) => {
			let hexadecimal = code.toString(16);
			if (lowercase) return hexadecimal;
			return hexadecimal.toUpperCase();
		};

		const toString = object.toString;
		const isArray = Array.isArray;
		const isBuffer = (value) => {
			return typeof Buffer === 'function' && Buffer.isBuffer(value);
		};
		const isObject = (value) => {
			// This is a very simple check, but it’s good enough for what we need.
			return toString.call(value) == '[object Object]';
		};
		const isString = (value) => {
			return typeof value == 'string' ||
				toString.call(value) == '[object String]';
		};
		const isNumber = (value) => {
			return typeof value == 'number' ||
				toString.call(value) == '[object Number]';
		};
		const isBigInt = (value) => {
		  return typeof value == 'bigint';
		};
		const isFunction = (value) => {
			return typeof value == 'function';
		};
		const isMap = (value) => {
			return toString.call(value) == '[object Map]';
		};
		const isSet = (value) => {
			return toString.call(value) == '[object Set]';
		};

		/*--------------------------------------------------------------------------*/

		// https://mathiasbynens.be/notes/javascript-escapes#single
		const singleEscapes = {
			'\\': '\\\\',
			'\b': '\\b',
			'\f': '\\f',
			'\n': '\\n',
			'\r': '\\r',
			'\t': '\\t'
			// `\v` is omitted intentionally, because in IE < 9, '\v' == 'v'.
			// '\v': '\\x0B'
		};
		const regexSingleEscape = /[\\\b\f\n\r\t]/;

		const regexDigit = /[0-9]/;
		const regexWhitespace = /[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;

		const escapeEverythingRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['"`])|[^]/g;
		const escapeNonAsciiRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['"`])|[^ !#-&\(-\[\]-_a-~]/g;

		const jsesc = (argument, options) => {
			const increaseIndentation = () => {
				oldIndent = indent;
				++options.indentLevel;
				indent = options.indent.repeat(options.indentLevel);
			};
			// Handle options
			const defaults = {
				'escapeEverything': false,
				'minimal': false,
				'isScriptContext': false,
				'quotes': 'single',
				'wrap': false,
				'es6': false,
				'json': false,
				'compact': true,
				'lowercaseHex': false,
				'numbers': 'decimal',
				'indent': '\t',
				'indentLevel': 0,
				'__inline1__': false,
				'__inline2__': false
			};
			const json = options && options.json;
			if (json) {
				defaults.quotes = 'double';
				defaults.wrap = true;
			}
			options = extend(defaults, options);
			if (
				options.quotes != 'single' &&
				options.quotes != 'double' &&
				options.quotes != 'backtick'
			) {
				options.quotes = 'single';
			}
			const quote = options.quotes == 'double' ?
				'"' :
				(options.quotes == 'backtick' ?
					'`' :
					'\''
				);
			const compact = options.compact;
			const lowercaseHex = options.lowercaseHex;
			let indent = options.indent.repeat(options.indentLevel);
			let oldIndent = '';
			const inline1 = options.__inline1__;
			const inline2 = options.__inline2__;
			const newLine = compact ? '' : '\n';
			let result;
			let isEmpty = true;
			const useBinNumbers = options.numbers == 'binary';
			const useOctNumbers = options.numbers == 'octal';
			const useDecNumbers = options.numbers == 'decimal';
			const useHexNumbers = options.numbers == 'hexadecimal';

			if (json && argument && isFunction(argument.toJSON)) {
				argument = argument.toJSON();
			}

			if (!isString(argument)) {
				if (isMap(argument)) {
					if (argument.size == 0) {
						return 'new Map()';
					}
					if (!compact) {
						options.__inline1__ = true;
						options.__inline2__ = false;
					}
					return 'new Map(' + jsesc(Array.from(argument), options) + ')';
				}
				if (isSet(argument)) {
					if (argument.size == 0) {
						return 'new Set()';
					}
					return 'new Set(' + jsesc(Array.from(argument), options) + ')';
				}
				if (isBuffer(argument)) {
					if (argument.length == 0) {
						return 'Buffer.from([])';
					}
					return 'Buffer.from(' + jsesc(Array.from(argument), options) + ')';
				}
				if (isArray(argument)) {
					result = [];
					options.wrap = true;
					if (inline1) {
						options.__inline1__ = false;
						options.__inline2__ = true;
					}
					if (!inline2) {
						increaseIndentation();
					}
					forEach(argument, (value) => {
						isEmpty = false;
						if (inline2) {
							options.__inline2__ = false;
						}
						result.push(
							(compact || inline2 ? '' : indent) +
							jsesc(value, options)
						);
					});
					if (isEmpty) {
						return '[]';
					}
					if (inline2) {
						return '[' + result.join(', ') + ']';
					}
					return '[' + newLine + result.join(',' + newLine) + newLine +
						(compact ? '' : oldIndent) + ']';
				} else if (isNumber(argument) || isBigInt(argument)) {
					if (json) {
						// Some number values (e.g. `Infinity`) cannot be represented in JSON.
						// `BigInt` values less than `-Number.MAX_VALUE` or greater than
		        // `Number.MAX_VALUE` cannot be represented in JSON so they will become
		        // `-Infinity` or `Infinity`, respectively, and then become `null` when
		        // stringified.
						return JSON.stringify(Number(argument));
					}

		      let result;
					if (useDecNumbers) {
						result = String(argument);
					} else if (useHexNumbers) {
						let hexadecimal = argument.toString(16);
						if (!lowercaseHex) {
							hexadecimal = hexadecimal.toUpperCase();
						}
						result = '0x' + hexadecimal;
					} else if (useBinNumbers) {
						result = '0b' + argument.toString(2);
					} else if (useOctNumbers) {
						result = '0o' + argument.toString(8);
					}

		      if (isBigInt(argument)) {
		        return result + 'n';
		      }
		      return result;
				} else if (isBigInt(argument)) {
					if (json) {
						// `BigInt` values less than `-Number.MAX_VALUE` or greater than
		        // `Number.MAX_VALUE` will become `-Infinity` or `Infinity`,
		        // respectively, and cannot be represented in JSON.
						return JSON.stringify(Number(argument));
					}
		      return argument + 'n';
		    } else if (!isObject(argument)) {
					if (json) {
						// For some values (e.g. `undefined`, `function` objects),
						// `JSON.stringify(value)` returns `undefined` (which isn’t valid
						// JSON) instead of `'null'`.
						return JSON.stringify(argument) || 'null';
					}
					return String(argument);
				} else { // it’s an object
					result = [];
					options.wrap = true;
					increaseIndentation();
					forOwn(argument, (key, value) => {
						isEmpty = false;
						result.push(
							(compact ? '' : indent) +
							jsesc(key, options) + ':' +
							(compact ? '' : ' ') +
							jsesc(value, options)
						);
					});
					if (isEmpty) {
						return '{}';
					}
					return '{' + newLine + result.join(',' + newLine) + newLine +
						(compact ? '' : oldIndent) + '}';
				}
			}

			const regex = options.escapeEverything ? escapeEverythingRegex : escapeNonAsciiRegex;
			result = argument.replace(regex, (char, pair, lone, quoteChar, index, string) => {
				if (pair) {
					if (options.minimal) return pair;
					const first = pair.charCodeAt(0);
					const second = pair.charCodeAt(1);
					if (options.es6) {
						// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
						const codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
						const hex = hexadecimal(codePoint, lowercaseHex);
						return '\\u{' + hex + '}';
					}
					return fourHexEscape(hexadecimal(first, lowercaseHex)) + fourHexEscape(hexadecimal(second, lowercaseHex));
				}

				if (lone) {
					return fourHexEscape(hexadecimal(lone.charCodeAt(0), lowercaseHex));
				}

				if (
					char == '\0' &&
					!json &&
					!regexDigit.test(string.charAt(index + 1))
				) {
					return '\\0';
				}

				if (quoteChar) {
					if (quoteChar == quote || options.escapeEverything) {
						return '\\' + quoteChar;
					}
					return quoteChar;
				}

				if (regexSingleEscape.test(char)) {
					// no need for a `hasOwnProperty` check here
					return singleEscapes[char];
				}

				if (options.minimal && !regexWhitespace.test(char)) {
					return char;
				}

				const hex = hexadecimal(char.charCodeAt(0), lowercaseHex);
				if (json || hex.length > 2) {
					return fourHexEscape(hex);
				}

				return '\\x' + ('00' + hex).slice(-2);
			});

			if (quote == '`') {
				result = result.replace(/\$\{/g, '\\${');
			}
			if (options.isScriptContext) {
				// https://mathiasbynens.be/notes/etago
				result = result
					.replace(/<\/(script|style)/gi, '<\\/$1')
					.replace(/<!--/g, json ? '\\u003C!--' : '\\x3C!--');
			}
			if (options.wrap) {
				result = quote + result + quote;
			}
			return result;
		};

		jsesc.version = '3.0.2';

		jsesc_1 = jsesc;
		return jsesc_1;
	}

	var hasRequiredTypes;

	function requireTypes () {
		if (hasRequiredTypes) return types;
		hasRequiredTypes = 1;

		Object.defineProperty(types, "__esModule", {
		  value: true
		});
		types.ArgumentPlaceholder = ArgumentPlaceholder;
		types.ArrayPattern = types.ArrayExpression = ArrayExpression;
		types.BigIntLiteral = BigIntLiteral;
		types.BooleanLiteral = BooleanLiteral;
		types.Identifier = Identifier;
		types.NullLiteral = NullLiteral;
		types.NumericLiteral = NumericLiteral;
		types.ObjectPattern = types.ObjectExpression = ObjectExpression;
		types.ObjectMethod = ObjectMethod;
		types.ObjectProperty = ObjectProperty;
		types.PipelineBareFunction = PipelineBareFunction;
		types.PipelinePrimaryTopicReference = PipelinePrimaryTopicReference;
		types.PipelineTopicExpression = PipelineTopicExpression;
		types.RecordExpression = RecordExpression;
		types.RegExpLiteral = RegExpLiteral;
		types.SpreadElement = types.RestElement = RestElement;
		types.StringLiteral = StringLiteral;
		types.TopicReference = TopicReference;
		types.TupleExpression = TupleExpression;
		types.VoidPattern = VoidPattern;
		types._getRawIdentifier = _getRawIdentifier;
		var _t = globalThis.__BABEL_TYPES__;
		var _jsesc = requireJsesc();
		const {
		  isAssignmentPattern,
		  isIdentifier
		} = _t;
		let lastRawIdentNode = null;
		let lastRawIdentResult = "";
		function _getRawIdentifier(node) {
		  if (node === lastRawIdentNode) return lastRawIdentResult;
		  lastRawIdentNode = node;
		  const {
		    name
		  } = node;
		  const token = this.tokenMap.find(node, tok => tok.value === name);
		  if (token) {
		    lastRawIdentResult = this._originalCode.slice(token.start, token.end);
		    return lastRawIdentResult;
		  }
		  return lastRawIdentResult = node.name;
		}
		function Identifier(node) {
		  var _node$loc;
		  this.sourceIdentifierName(((_node$loc = node.loc) == null ? void 0 : _node$loc.identifierName) || node.name);
		  this.word(this.tokenMap ? this._getRawIdentifier(node) : node.name);
		}
		function ArgumentPlaceholder() {
		  this.tokenChar(63);
		}
		function RestElement(node) {
		  this.token("...");
		  this.print(node.argument);
		}
		function ObjectExpression(node) {
		  const props = node.properties;
		  this.tokenChar(123);
		  if (props.length) {
		    const exit = this.enterDelimited();
		    this.space();
		    this.printList(props, this.shouldPrintTrailingComma("}"), true, true);
		    this.space();
		    exit();
		  }
		  this.sourceWithOffset("end", node.loc, -1);
		  this.tokenChar(125);
		}
		function ObjectMethod(node) {
		  this.printJoin(node.decorators);
		  this._methodHead(node);
		  this.space();
		  this.print(node.body);
		}
		function ObjectProperty(node) {
		  this.printJoin(node.decorators);
		  if (node.computed) {
		    this.tokenChar(91);
		    this.print(node.key);
		    this.tokenChar(93);
		  } else {
		    if (isAssignmentPattern(node.value) && isIdentifier(node.key) && node.key.name === node.value.left.name) {
		      this.print(node.value);
		      return;
		    }
		    this.print(node.key);
		    if (node.shorthand && isIdentifier(node.key) && isIdentifier(node.value) && node.key.name === node.value.name) {
		      return;
		    }
		  }
		  this.tokenChar(58);
		  this.space();
		  this.print(node.value);
		}
		function ArrayExpression(node) {
		  const elems = node.elements;
		  const len = elems.length;
		  this.tokenChar(91);
		  const exit = this.enterDelimited();
		  for (let i = 0; i < elems.length; i++) {
		    const elem = elems[i];
		    if (elem) {
		      if (i > 0) this.space();
		      this.print(elem);
		      if (i < len - 1 || this.shouldPrintTrailingComma("]")) {
		        this.token(",", false, i);
		      }
		    } else {
		      this.token(",", false, i);
		    }
		  }
		  exit();
		  this.tokenChar(93);
		}
		function RecordExpression(node) {
		  const props = node.properties;
		  let startToken;
		  let endToken;
		  {
		    if (this.format.recordAndTupleSyntaxType === "bar") {
		      startToken = "{|";
		      endToken = "|}";
		    } else if (this.format.recordAndTupleSyntaxType !== "hash" && this.format.recordAndTupleSyntaxType != null) {
		      throw new Error(`The "recordAndTupleSyntaxType" generator option must be "bar" or "hash" (${JSON.stringify(this.format.recordAndTupleSyntaxType)} received).`);
		    } else {
		      startToken = "#{";
		      endToken = "}";
		    }
		  }
		  this.token(startToken);
		  if (props.length) {
		    this.space();
		    this.printList(props, this.shouldPrintTrailingComma(endToken), true, true);
		    this.space();
		  }
		  this.token(endToken);
		}
		function TupleExpression(node) {
		  const elems = node.elements;
		  const len = elems.length;
		  let startToken;
		  let endToken;
		  {
		    if (this.format.recordAndTupleSyntaxType === "bar") {
		      startToken = "[|";
		      endToken = "|]";
		    } else if (this.format.recordAndTupleSyntaxType === "hash") {
		      startToken = "#[";
		      endToken = "]";
		    } else {
		      throw new Error(`${this.format.recordAndTupleSyntaxType} is not a valid recordAndTuple syntax type`);
		    }
		  }
		  this.token(startToken);
		  for (let i = 0; i < elems.length; i++) {
		    const elem = elems[i];
		    if (elem) {
		      if (i > 0) this.space();
		      this.print(elem);
		      if (i < len - 1 || this.shouldPrintTrailingComma(endToken)) {
		        this.token(",", false, i);
		      }
		    }
		  }
		  this.token(endToken);
		}
		function RegExpLiteral(node) {
		  this.word(`/${node.pattern}/${node.flags}`);
		}
		function BooleanLiteral(node) {
		  this.word(node.value ? "true" : "false");
		}
		function NullLiteral() {
		  this.word("null");
		}
		function NumericLiteral(node) {
		  const raw = this.getPossibleRaw(node);
		  const opts = this.format.jsescOption;
		  const value = node.value;
		  const str = value + "";
		  if (opts.numbers) {
		    this.number(_jsesc(value, opts), value);
		  } else if (raw == null) {
		    this.number(str, value);
		  } else if (this.format.minified) {
		    this.number(raw.length < str.length ? raw : str, value);
		  } else {
		    this.number(raw, value);
		  }
		}
		function StringLiteral(node) {
		  const raw = this.getPossibleRaw(node);
		  if (!this.format.minified && raw !== undefined) {
		    this.token(raw);
		    return;
		  }
		  const val = _jsesc(node.value, this.format.jsescOption);
		  this.token(val);
		}
		function BigIntLiteral(node) {
		  const raw = this.getPossibleRaw(node);
		  if (!this.format.minified && raw !== undefined) {
		    this.word(raw);
		    return;
		  }
		  this.word(node.value + "n");
		}
		const validTopicTokenSet = new Set(["^^", "@@", "^", "%", "#"]);
		function TopicReference() {
		  const {
		    topicToken
		  } = this.format;
		  if (validTopicTokenSet.has(topicToken)) {
		    this.token(topicToken);
		  } else {
		    const givenTopicTokenJSON = JSON.stringify(topicToken);
		    const validTopics = Array.from(validTopicTokenSet, v => JSON.stringify(v));
		    throw new Error(`The "topicToken" generator option must be one of ` + `${validTopics.join(", ")} (${givenTopicTokenJSON} received instead).`);
		  }
		}
		function PipelineTopicExpression(node) {
		  this.print(node.expression);
		}
		function PipelineBareFunction(node) {
		  this.print(node.callee);
		}
		function PipelinePrimaryTopicReference() {
		  this.tokenChar(35);
		}
		function VoidPattern() {
		  this.word("void");
		}

		
		return types;
	}

	var flow = {};

	var hasRequiredFlow;

	function requireFlow () {
		if (hasRequiredFlow) return flow;
		hasRequiredFlow = 1;
		(function (exports) {

			Object.defineProperty(exports, "__esModule", {
			  value: true
			});
			exports.AnyTypeAnnotation = AnyTypeAnnotation;
			exports.ArrayTypeAnnotation = ArrayTypeAnnotation;
			exports.BooleanLiteralTypeAnnotation = BooleanLiteralTypeAnnotation;
			exports.BooleanTypeAnnotation = BooleanTypeAnnotation;
			exports.DeclareClass = DeclareClass;
			exports.DeclareExportAllDeclaration = DeclareExportAllDeclaration;
			exports.DeclareExportDeclaration = DeclareExportDeclaration;
			exports.DeclareFunction = DeclareFunction;
			exports.DeclareInterface = DeclareInterface;
			exports.DeclareModule = DeclareModule;
			exports.DeclareModuleExports = DeclareModuleExports;
			exports.DeclareOpaqueType = DeclareOpaqueType;
			exports.DeclareTypeAlias = DeclareTypeAlias;
			exports.DeclareVariable = DeclareVariable;
			exports.DeclaredPredicate = DeclaredPredicate;
			exports.EmptyTypeAnnotation = EmptyTypeAnnotation;
			exports.EnumBooleanBody = EnumBooleanBody;
			exports.EnumBooleanMember = EnumBooleanMember;
			exports.EnumDeclaration = EnumDeclaration;
			exports.EnumDefaultedMember = EnumDefaultedMember;
			exports.EnumNumberBody = EnumNumberBody;
			exports.EnumNumberMember = EnumNumberMember;
			exports.EnumStringBody = EnumStringBody;
			exports.EnumStringMember = EnumStringMember;
			exports.EnumSymbolBody = EnumSymbolBody;
			exports.ExistsTypeAnnotation = ExistsTypeAnnotation;
			exports.FunctionTypeAnnotation = FunctionTypeAnnotation;
			exports.FunctionTypeParam = FunctionTypeParam;
			exports.IndexedAccessType = IndexedAccessType;
			exports.InferredPredicate = InferredPredicate;
			exports.InterfaceDeclaration = InterfaceDeclaration;
			exports.GenericTypeAnnotation = exports.ClassImplements = exports.InterfaceExtends = InterfaceExtends;
			exports.InterfaceTypeAnnotation = InterfaceTypeAnnotation;
			exports.IntersectionTypeAnnotation = IntersectionTypeAnnotation;
			exports.MixedTypeAnnotation = MixedTypeAnnotation;
			exports.NullLiteralTypeAnnotation = NullLiteralTypeAnnotation;
			exports.NullableTypeAnnotation = NullableTypeAnnotation;
			Object.defineProperty(exports, "NumberLiteralTypeAnnotation", {
			  enumerable: true,
			  get: function () {
			    return _types2.NumericLiteral;
			  }
			});
			exports.NumberTypeAnnotation = NumberTypeAnnotation;
			exports.ObjectTypeAnnotation = ObjectTypeAnnotation;
			exports.ObjectTypeCallProperty = ObjectTypeCallProperty;
			exports.ObjectTypeIndexer = ObjectTypeIndexer;
			exports.ObjectTypeInternalSlot = ObjectTypeInternalSlot;
			exports.ObjectTypeProperty = ObjectTypeProperty;
			exports.ObjectTypeSpreadProperty = ObjectTypeSpreadProperty;
			exports.OpaqueType = OpaqueType;
			exports.OptionalIndexedAccessType = OptionalIndexedAccessType;
			exports.QualifiedTypeIdentifier = QualifiedTypeIdentifier;
			Object.defineProperty(exports, "StringLiteralTypeAnnotation", {
			  enumerable: true,
			  get: function () {
			    return _types2.StringLiteral;
			  }
			});
			exports.StringTypeAnnotation = StringTypeAnnotation;
			exports.SymbolTypeAnnotation = SymbolTypeAnnotation;
			exports.ThisTypeAnnotation = ThisTypeAnnotation;
			exports.TupleTypeAnnotation = TupleTypeAnnotation;
			exports.TypeAlias = TypeAlias;
			exports.TypeAnnotation = TypeAnnotation;
			exports.TypeCastExpression = TypeCastExpression;
			exports.TypeParameter = TypeParameter;
			exports.TypeParameterDeclaration = exports.TypeParameterInstantiation = TypeParameterInstantiation;
			exports.TypeofTypeAnnotation = TypeofTypeAnnotation;
			exports.UnionTypeAnnotation = UnionTypeAnnotation;
			exports.Variance = Variance;
			exports.VoidTypeAnnotation = VoidTypeAnnotation;
			exports._interfaceish = _interfaceish;
			exports._variance = _variance;
			var _t = globalThis.__BABEL_TYPES__;
			var _modules = requireModules();
			var _index = requireNode();
			var _types2 = requireTypes();
			const {
			  isDeclareExportDeclaration,
			  isStatement
			} = _t;
			function AnyTypeAnnotation() {
			  this.word("any");
			}
			function ArrayTypeAnnotation(node) {
			  this.print(node.elementType, true);
			  this.tokenChar(91);
			  this.tokenChar(93);
			}
			function BooleanTypeAnnotation() {
			  this.word("boolean");
			}
			function BooleanLiteralTypeAnnotation(node) {
			  this.word(node.value ? "true" : "false");
			}
			function NullLiteralTypeAnnotation() {
			  this.word("null");
			}
			function DeclareClass(node, parent) {
			  if (!isDeclareExportDeclaration(parent)) {
			    this.word("declare");
			    this.space();
			  }
			  this.word("class");
			  this.space();
			  this._interfaceish(node);
			}
			function DeclareFunction(node, parent) {
			  if (!isDeclareExportDeclaration(parent)) {
			    this.word("declare");
			    this.space();
			  }
			  this.word("function");
			  this.space();
			  this.print(node.id);
			  this.print(node.id.typeAnnotation.typeAnnotation);
			  if (node.predicate) {
			    this.space();
			    this.print(node.predicate);
			  }
			  this.semicolon();
			}
			function InferredPredicate() {
			  this.tokenChar(37);
			  this.word("checks");
			}
			function DeclaredPredicate(node) {
			  this.tokenChar(37);
			  this.word("checks");
			  this.tokenChar(40);
			  this.print(node.value);
			  this.tokenChar(41);
			}
			function DeclareInterface(node) {
			  this.word("declare");
			  this.space();
			  this.InterfaceDeclaration(node);
			}
			function DeclareModule(node) {
			  this.word("declare");
			  this.space();
			  this.word("module");
			  this.space();
			  this.print(node.id);
			  this.space();
			  this.print(node.body);
			}
			function DeclareModuleExports(node) {
			  this.word("declare");
			  this.space();
			  this.word("module");
			  this.tokenChar(46);
			  this.word("exports");
			  this.print(node.typeAnnotation);
			}
			function DeclareTypeAlias(node) {
			  this.word("declare");
			  this.space();
			  this.TypeAlias(node);
			}
			function DeclareOpaqueType(node, parent) {
			  if (!isDeclareExportDeclaration(parent)) {
			    this.word("declare");
			    this.space();
			  }
			  this.OpaqueType(node);
			}
			function DeclareVariable(node, parent) {
			  if (!isDeclareExportDeclaration(parent)) {
			    this.word("declare");
			    this.space();
			  }
			  this.word("var");
			  this.space();
			  this.print(node.id);
			  this.print(node.id.typeAnnotation);
			  this.semicolon();
			}
			function DeclareExportDeclaration(node) {
			  this.word("declare");
			  this.space();
			  this.word("export");
			  this.space();
			  if (node.default) {
			    this.word("default");
			    this.space();
			  }
			  FlowExportDeclaration.call(this, node);
			}
			function DeclareExportAllDeclaration(node) {
			  this.word("declare");
			  this.space();
			  _modules.ExportAllDeclaration.call(this, node);
			}
			function EnumDeclaration(node) {
			  const {
			    id,
			    body
			  } = node;
			  this.word("enum");
			  this.space();
			  this.print(id);
			  this.print(body);
			}
			function enumExplicitType(context, name, hasExplicitType) {
			  if (hasExplicitType) {
			    context.space();
			    context.word("of");
			    context.space();
			    context.word(name);
			  }
			  context.space();
			}
			function enumBody(context, node) {
			  const {
			    members
			  } = node;
			  context.token("{");
			  context.indent();
			  context.newline();
			  for (const member of members) {
			    context.print(member);
			    context.newline();
			  }
			  if (node.hasUnknownMembers) {
			    context.token("...");
			    context.newline();
			  }
			  context.dedent();
			  context.token("}");
			}
			function EnumBooleanBody(node) {
			  const {
			    explicitType
			  } = node;
			  enumExplicitType(this, "boolean", explicitType);
			  enumBody(this, node);
			}
			function EnumNumberBody(node) {
			  const {
			    explicitType
			  } = node;
			  enumExplicitType(this, "number", explicitType);
			  enumBody(this, node);
			}
			function EnumStringBody(node) {
			  const {
			    explicitType
			  } = node;
			  enumExplicitType(this, "string", explicitType);
			  enumBody(this, node);
			}
			function EnumSymbolBody(node) {
			  enumExplicitType(this, "symbol", true);
			  enumBody(this, node);
			}
			function EnumDefaultedMember(node) {
			  const {
			    id
			  } = node;
			  this.print(id);
			  this.tokenChar(44);
			}
			function enumInitializedMember(context, node) {
			  context.print(node.id);
			  context.space();
			  context.token("=");
			  context.space();
			  context.print(node.init);
			  context.token(",");
			}
			function EnumBooleanMember(node) {
			  enumInitializedMember(this, node);
			}
			function EnumNumberMember(node) {
			  enumInitializedMember(this, node);
			}
			function EnumStringMember(node) {
			  enumInitializedMember(this, node);
			}
			function FlowExportDeclaration(node) {
			  if (node.declaration) {
			    const declar = node.declaration;
			    this.print(declar);
			    if (!isStatement(declar)) this.semicolon();
			  } else {
			    this.tokenChar(123);
			    if (node.specifiers.length) {
			      this.space();
			      this.printList(node.specifiers);
			      this.space();
			    }
			    this.tokenChar(125);
			    if (node.source) {
			      this.space();
			      this.word("from");
			      this.space();
			      this.print(node.source);
			    }
			    this.semicolon();
			  }
			}
			function ExistsTypeAnnotation() {
			  this.tokenChar(42);
			}
			function FunctionTypeAnnotation(node, parent) {
			  this.print(node.typeParameters);
			  this.tokenChar(40);
			  if (node.this) {
			    this.word("this");
			    this.tokenChar(58);
			    this.space();
			    this.print(node.this.typeAnnotation);
			    if (node.params.length || node.rest) {
			      this.tokenChar(44);
			      this.space();
			    }
			  }
			  this.printList(node.params);
			  if (node.rest) {
			    if (node.params.length) {
			      this.tokenChar(44);
			      this.space();
			    }
			    this.token("...");
			    this.print(node.rest);
			  }
			  this.tokenChar(41);
			  const type = parent == null ? void 0 : parent.type;
			  if (type != null && (type === "ObjectTypeCallProperty" || type === "ObjectTypeInternalSlot" || type === "DeclareFunction" || type === "ObjectTypeProperty" && parent.method)) {
			    this.tokenChar(58);
			  } else {
			    this.space();
			    this.token("=>");
			  }
			  this.space();
			  this.print(node.returnType);
			}
			function FunctionTypeParam(node) {
			  this.print(node.name);
			  if (node.optional) this.tokenChar(63);
			  if (node.name) {
			    this.tokenChar(58);
			    this.space();
			  }
			  this.print(node.typeAnnotation);
			}
			function InterfaceExtends(node) {
			  this.print(node.id);
			  this.print(node.typeParameters, true);
			}
			function _interfaceish(node) {
			  var _node$extends;
			  this.print(node.id);
			  this.print(node.typeParameters);
			  if ((_node$extends = node.extends) != null && _node$extends.length) {
			    this.space();
			    this.word("extends");
			    this.space();
			    this.printList(node.extends);
			  }
			  if (node.type === "DeclareClass") {
			    var _node$mixins, _node$implements;
			    if ((_node$mixins = node.mixins) != null && _node$mixins.length) {
			      this.space();
			      this.word("mixins");
			      this.space();
			      this.printList(node.mixins);
			    }
			    if ((_node$implements = node.implements) != null && _node$implements.length) {
			      this.space();
			      this.word("implements");
			      this.space();
			      this.printList(node.implements);
			    }
			  }
			  this.space();
			  this.print(node.body);
			}
			function _variance(node) {
			  var _node$variance;
			  const kind = (_node$variance = node.variance) == null ? void 0 : _node$variance.kind;
			  if (kind != null) {
			    if (kind === "plus") {
			      this.tokenChar(43);
			    } else if (kind === "minus") {
			      this.tokenChar(45);
			    }
			  }
			}
			function InterfaceDeclaration(node) {
			  this.word("interface");
			  this.space();
			  this._interfaceish(node);
			}
			function andSeparator(occurrenceCount) {
			  this.space();
			  this.token("&", false, occurrenceCount);
			  this.space();
			}
			function InterfaceTypeAnnotation(node) {
			  var _node$extends2;
			  this.word("interface");
			  if ((_node$extends2 = node.extends) != null && _node$extends2.length) {
			    this.space();
			    this.word("extends");
			    this.space();
			    this.printList(node.extends);
			  }
			  this.space();
			  this.print(node.body);
			}
			function IntersectionTypeAnnotation(node) {
			  this.printJoin(node.types, undefined, undefined, andSeparator);
			}
			function MixedTypeAnnotation() {
			  this.word("mixed");
			}
			function EmptyTypeAnnotation() {
			  this.word("empty");
			}
			function NullableTypeAnnotation(node) {
			  this.tokenChar(63);
			  this.print(node.typeAnnotation);
			}
			function NumberTypeAnnotation() {
			  this.word("number");
			}
			function StringTypeAnnotation() {
			  this.word("string");
			}
			function ThisTypeAnnotation() {
			  this.word("this");
			}
			function TupleTypeAnnotation(node) {
			  this.tokenChar(91);
			  this.printList(node.types);
			  this.tokenChar(93);
			}
			function TypeofTypeAnnotation(node) {
			  this.word("typeof");
			  this.space();
			  this.print(node.argument);
			}
			function TypeAlias(node) {
			  this.word("type");
			  this.space();
			  this.print(node.id);
			  this.print(node.typeParameters);
			  this.space();
			  this.tokenChar(61);
			  this.space();
			  this.print(node.right);
			  this.semicolon();
			}
			function TypeAnnotation(node, parent) {
			  this.tokenChar(58);
			  this.space();
			  if (parent.type === "ArrowFunctionExpression") {
			    this.tokenContext |= _index.TokenContext.arrowFlowReturnType;
			  } else if (node.optional) {
			    this.tokenChar(63);
			  }
			  this.print(node.typeAnnotation);
			}
			function TypeParameterInstantiation(node) {
			  this.tokenChar(60);
			  this.printList(node.params);
			  this.tokenChar(62);
			}
			function TypeParameter(node) {
			  this._variance(node);
			  this.word(node.name);
			  if (node.bound) {
			    this.print(node.bound);
			  }
			  if (node.default) {
			    this.space();
			    this.tokenChar(61);
			    this.space();
			    this.print(node.default);
			  }
			}
			function OpaqueType(node) {
			  this.word("opaque");
			  this.space();
			  this.word("type");
			  this.space();
			  this.print(node.id);
			  this.print(node.typeParameters);
			  if (node.supertype) {
			    this.tokenChar(58);
			    this.space();
			    this.print(node.supertype);
			  }
			  if (node.impltype) {
			    this.space();
			    this.tokenChar(61);
			    this.space();
			    this.print(node.impltype);
			  }
			  this.semicolon();
			}
			function ObjectTypeAnnotation(node) {
			  if (node.exact) {
			    this.token("{|");
			  } else {
			    this.tokenChar(123);
			  }
			  const props = [...node.properties, ...(node.callProperties || []), ...(node.indexers || []), ...(node.internalSlots || [])];
			  if (props.length) {
			    this.newline();
			    this.space();
			    this.printJoin(props, true, true, undefined, undefined, () => {
			      if (props.length !== 1 || node.inexact) {
			        this.tokenChar(44);
			        this.space();
			      }
			    });
			    this.space();
			  }
			  if (node.inexact) {
			    this.indent();
			    this.token("...");
			    if (props.length) {
			      this.newline();
			    }
			    this.dedent();
			  }
			  if (node.exact) {
			    this.token("|}");
			  } else {
			    this.tokenChar(125);
			  }
			}
			function ObjectTypeInternalSlot(node) {
			  if (node.static) {
			    this.word("static");
			    this.space();
			  }
			  this.tokenChar(91);
			  this.tokenChar(91);
			  this.print(node.id);
			  this.tokenChar(93);
			  this.tokenChar(93);
			  if (node.optional) this.tokenChar(63);
			  if (!node.method) {
			    this.tokenChar(58);
			    this.space();
			  }
			  this.print(node.value);
			}
			function ObjectTypeCallProperty(node) {
			  if (node.static) {
			    this.word("static");
			    this.space();
			  }
			  this.print(node.value);
			}
			function ObjectTypeIndexer(node) {
			  if (node.static) {
			    this.word("static");
			    this.space();
			  }
			  this._variance(node);
			  this.tokenChar(91);
			  if (node.id) {
			    this.print(node.id);
			    this.tokenChar(58);
			    this.space();
			  }
			  this.print(node.key);
			  this.tokenChar(93);
			  this.tokenChar(58);
			  this.space();
			  this.print(node.value);
			}
			function ObjectTypeProperty(node) {
			  if (node.proto) {
			    this.word("proto");
			    this.space();
			  }
			  if (node.static) {
			    this.word("static");
			    this.space();
			  }
			  if (node.kind === "get" || node.kind === "set") {
			    this.word(node.kind);
			    this.space();
			  }
			  this._variance(node);
			  this.print(node.key);
			  if (node.optional) this.tokenChar(63);
			  if (!node.method) {
			    this.tokenChar(58);
			    this.space();
			  }
			  this.print(node.value);
			}
			function ObjectTypeSpreadProperty(node) {
			  this.token("...");
			  this.print(node.argument);
			}
			function QualifiedTypeIdentifier(node) {
			  this.print(node.qualification);
			  this.tokenChar(46);
			  this.print(node.id);
			}
			function SymbolTypeAnnotation() {
			  this.word("symbol");
			}
			function orSeparator(occurrenceCount) {
			  this.space();
			  this.token("|", false, occurrenceCount);
			  this.space();
			}
			function UnionTypeAnnotation(node) {
			  this.printJoin(node.types, undefined, undefined, orSeparator);
			}
			function TypeCastExpression(node) {
			  this.tokenChar(40);
			  this.print(node.expression);
			  this.print(node.typeAnnotation);
			  this.tokenChar(41);
			}
			function Variance(node) {
			  if (node.kind === "plus") {
			    this.tokenChar(43);
			  } else {
			    this.tokenChar(45);
			  }
			}
			function VoidTypeAnnotation() {
			  this.word("void");
			}
			function IndexedAccessType(node) {
			  this.print(node.objectType, true);
			  this.tokenChar(91);
			  this.print(node.indexType);
			  this.tokenChar(93);
			}
			function OptionalIndexedAccessType(node) {
			  this.print(node.objectType);
			  if (node.optional) {
			    this.token("?.");
			  }
			  this.tokenChar(91);
			  this.print(node.indexType);
			  this.tokenChar(93);
			}

			
		} (flow));
		return flow;
	}

	var base = {};

	var hasRequiredBase;

	function requireBase () {
		if (hasRequiredBase) return base;
		hasRequiredBase = 1;

		Object.defineProperty(base, "__esModule", {
		  value: true
		});
		base.BlockStatement = BlockStatement;
		base.Directive = Directive;
		base.DirectiveLiteral = DirectiveLiteral;
		base.File = File;
		base.InterpreterDirective = InterpreterDirective;
		base.Placeholder = Placeholder;
		base.Program = Program;
		function File(node) {
		  if (node.program) {
		    this.print(node.program.interpreter);
		  }
		  this.print(node.program);
		}
		function Program(node) {
		  var _node$directives;
		  this.noIndentInnerCommentsHere();
		  this.printInnerComments();
		  const directivesLen = (_node$directives = node.directives) == null ? void 0 : _node$directives.length;
		  if (directivesLen) {
		    var _node$directives$trai;
		    const newline = node.body.length ? 2 : 1;
		    this.printSequence(node.directives, undefined, newline);
		    if (!((_node$directives$trai = node.directives[directivesLen - 1].trailingComments) != null && _node$directives$trai.length)) {
		      this.newline(newline);
		    }
		  }
		  this.printSequence(node.body);
		}
		function BlockStatement(node) {
		  var _node$directives2;
		  this.tokenChar(123);
		  const exit = this.enterDelimited();
		  const directivesLen = (_node$directives2 = node.directives) == null ? void 0 : _node$directives2.length;
		  if (directivesLen) {
		    var _node$directives$trai2;
		    const newline = node.body.length ? 2 : 1;
		    this.printSequence(node.directives, true, newline);
		    if (!((_node$directives$trai2 = node.directives[directivesLen - 1].trailingComments) != null && _node$directives$trai2.length)) {
		      this.newline(newline);
		    }
		  }
		  this.printSequence(node.body, true);
		  exit();
		  this.rightBrace(node);
		}
		function Directive(node) {
		  this.print(node.value);
		  this.semicolon();
		}
		const unescapedSingleQuoteRE = /(?:^|[^\\])(?:\\\\)*'/;
		const unescapedDoubleQuoteRE = /(?:^|[^\\])(?:\\\\)*"/;
		function DirectiveLiteral(node) {
		  const raw = this.getPossibleRaw(node);
		  if (!this.format.minified && raw !== undefined) {
		    this.token(raw);
		    return;
		  }
		  const {
		    value
		  } = node;
		  if (!unescapedDoubleQuoteRE.test(value)) {
		    this.token(`"${value}"`);
		  } else if (!unescapedSingleQuoteRE.test(value)) {
		    this.token(`'${value}'`);
		  } else {
		    throw new Error("Malformed AST: it is not possible to print a directive containing" + " both unescaped single and double quotes.");
		  }
		}
		function InterpreterDirective(node) {
		  this.token(`#!${node.value}`);
		  this.newline(1, true);
		}
		function Placeholder(node) {
		  this.token("%%");
		  this.print(node.name);
		  this.token("%%");
		  if (node.expectedNode === "Statement") {
		    this.semicolon();
		  }
		}

		
		return base;
	}

	var jsx = {};

	var hasRequiredJsx;

	function requireJsx () {
		if (hasRequiredJsx) return jsx;
		hasRequiredJsx = 1;

		Object.defineProperty(jsx, "__esModule", {
		  value: true
		});
		jsx.JSXAttribute = JSXAttribute;
		jsx.JSXClosingElement = JSXClosingElement;
		jsx.JSXClosingFragment = JSXClosingFragment;
		jsx.JSXElement = JSXElement;
		jsx.JSXEmptyExpression = JSXEmptyExpression;
		jsx.JSXExpressionContainer = JSXExpressionContainer;
		jsx.JSXFragment = JSXFragment;
		jsx.JSXIdentifier = JSXIdentifier;
		jsx.JSXMemberExpression = JSXMemberExpression;
		jsx.JSXNamespacedName = JSXNamespacedName;
		jsx.JSXOpeningElement = JSXOpeningElement;
		jsx.JSXOpeningFragment = JSXOpeningFragment;
		jsx.JSXSpreadAttribute = JSXSpreadAttribute;
		jsx.JSXSpreadChild = JSXSpreadChild;
		jsx.JSXText = JSXText;
		function JSXAttribute(node) {
		  this.print(node.name);
		  if (node.value) {
		    this.tokenChar(61);
		    this.print(node.value);
		  }
		}
		function JSXIdentifier(node) {
		  this.word(node.name);
		}
		function JSXNamespacedName(node) {
		  this.print(node.namespace);
		  this.tokenChar(58);
		  this.print(node.name);
		}
		function JSXMemberExpression(node) {
		  this.print(node.object);
		  this.tokenChar(46);
		  this.print(node.property);
		}
		function JSXSpreadAttribute(node) {
		  this.tokenChar(123);
		  this.token("...");
		  this.print(node.argument);
		  this.rightBrace(node);
		}
		function JSXExpressionContainer(node) {
		  this.tokenChar(123);
		  this.print(node.expression);
		  this.rightBrace(node);
		}
		function JSXSpreadChild(node) {
		  this.tokenChar(123);
		  this.token("...");
		  this.print(node.expression);
		  this.rightBrace(node);
		}
		function JSXText(node) {
		  const raw = this.getPossibleRaw(node);
		  if (raw !== undefined) {
		    this.token(raw, true);
		  } else {
		    this.token(node.value, true);
		  }
		}
		function JSXElement(node) {
		  const open = node.openingElement;
		  this.print(open);
		  if (open.selfClosing) return;
		  this.indent();
		  for (const child of node.children) {
		    this.print(child);
		  }
		  this.dedent();
		  this.print(node.closingElement);
		}
		function spaceSeparator() {
		  this.space();
		}
		function JSXOpeningElement(node) {
		  this.tokenChar(60);
		  this.print(node.name);
		  {
		    if (node.typeArguments) {
		      this.print(node.typeArguments);
		    }
		    this.print(node.typeParameters);
		  }
		  if (node.attributes.length > 0) {
		    this.space();
		    this.printJoin(node.attributes, undefined, undefined, spaceSeparator);
		  }
		  if (node.selfClosing) {
		    this.space();
		    this.tokenChar(47);
		  }
		  this.tokenChar(62);
		}
		function JSXClosingElement(node) {
		  this.tokenChar(60);
		  this.tokenChar(47);
		  this.print(node.name);
		  this.tokenChar(62);
		}
		function JSXEmptyExpression() {
		  this.printInnerComments();
		}
		function JSXFragment(node) {
		  this.print(node.openingFragment);
		  this.indent();
		  for (const child of node.children) {
		    this.print(child);
		  }
		  this.dedent();
		  this.print(node.closingFragment);
		}
		function JSXOpeningFragment() {
		  this.tokenChar(60);
		  this.tokenChar(62);
		}
		function JSXClosingFragment() {
		  this.token("</");
		  this.tokenChar(62);
		}

		
		return jsx;
	}

	var typescript = {};

	var hasRequiredTypescript;

	function requireTypescript () {
		if (hasRequiredTypescript) return typescript;
		hasRequiredTypescript = 1;

		Object.defineProperty(typescript, "__esModule", {
		  value: true
		});
		typescript.TSAnyKeyword = TSAnyKeyword;
		typescript.TSArrayType = TSArrayType;
		typescript.TSSatisfiesExpression = typescript.TSAsExpression = TSTypeExpression;
		typescript.TSBigIntKeyword = TSBigIntKeyword;
		typescript.TSBooleanKeyword = TSBooleanKeyword;
		typescript.TSCallSignatureDeclaration = TSCallSignatureDeclaration;
		typescript.TSInterfaceHeritage = typescript.TSClassImplements = TSClassImplements;
		typescript.TSConditionalType = TSConditionalType;
		typescript.TSConstructSignatureDeclaration = TSConstructSignatureDeclaration;
		typescript.TSConstructorType = TSConstructorType;
		typescript.TSDeclareFunction = TSDeclareFunction;
		typescript.TSDeclareMethod = TSDeclareMethod;
		typescript.TSEnumBody = TSEnumBody;
		typescript.TSEnumDeclaration = TSEnumDeclaration;
		typescript.TSEnumMember = TSEnumMember;
		typescript.TSExportAssignment = TSExportAssignment;
		typescript.TSExternalModuleReference = TSExternalModuleReference;
		typescript.TSFunctionType = TSFunctionType;
		typescript.TSImportEqualsDeclaration = TSImportEqualsDeclaration;
		typescript.TSImportType = TSImportType;
		typescript.TSIndexSignature = TSIndexSignature;
		typescript.TSIndexedAccessType = TSIndexedAccessType;
		typescript.TSInferType = TSInferType;
		typescript.TSInstantiationExpression = TSInstantiationExpression;
		typescript.TSInterfaceBody = TSInterfaceBody;
		typescript.TSInterfaceDeclaration = TSInterfaceDeclaration;
		typescript.TSIntersectionType = TSIntersectionType;
		typescript.TSIntrinsicKeyword = TSIntrinsicKeyword;
		typescript.TSLiteralType = TSLiteralType;
		typescript.TSMappedType = TSMappedType;
		typescript.TSMethodSignature = TSMethodSignature;
		typescript.TSModuleBlock = TSModuleBlock;
		typescript.TSModuleDeclaration = TSModuleDeclaration;
		typescript.TSNamedTupleMember = TSNamedTupleMember;
		typescript.TSNamespaceExportDeclaration = TSNamespaceExportDeclaration;
		typescript.TSNeverKeyword = TSNeverKeyword;
		typescript.TSNonNullExpression = TSNonNullExpression;
		typescript.TSNullKeyword = TSNullKeyword;
		typescript.TSNumberKeyword = TSNumberKeyword;
		typescript.TSObjectKeyword = TSObjectKeyword;
		typescript.TSOptionalType = TSOptionalType;
		typescript.TSParameterProperty = TSParameterProperty;
		typescript.TSParenthesizedType = TSParenthesizedType;
		typescript.TSPropertySignature = TSPropertySignature;
		typescript.TSQualifiedName = TSQualifiedName;
		typescript.TSRestType = TSRestType;
		typescript.TSStringKeyword = TSStringKeyword;
		typescript.TSSymbolKeyword = TSSymbolKeyword;
		typescript.TSTemplateLiteralType = TSTemplateLiteralType;
		typescript.TSThisType = TSThisType;
		typescript.TSTupleType = TSTupleType;
		typescript.TSTypeAliasDeclaration = TSTypeAliasDeclaration;
		typescript.TSTypeAnnotation = TSTypeAnnotation;
		typescript.TSTypeAssertion = TSTypeAssertion;
		typescript.TSTypeLiteral = TSTypeLiteral;
		typescript.TSTypeOperator = TSTypeOperator;
		typescript.TSTypeParameter = TSTypeParameter;
		typescript.TSTypeParameterDeclaration = typescript.TSTypeParameterInstantiation = TSTypeParameterInstantiation;
		typescript.TSTypePredicate = TSTypePredicate;
		typescript.TSTypeQuery = TSTypeQuery;
		typescript.TSTypeReference = TSTypeReference;
		typescript.TSUndefinedKeyword = TSUndefinedKeyword;
		typescript.TSUnionType = TSUnionType;
		typescript.TSUnknownKeyword = TSUnknownKeyword;
		typescript.TSVoidKeyword = TSVoidKeyword;
		typescript.tsPrintClassMemberModifiers = tsPrintClassMemberModifiers;
		typescript.tsPrintFunctionOrConstructorType = tsPrintFunctionOrConstructorType;
		typescript.tsPrintPropertyOrMethodName = tsPrintPropertyOrMethodName;
		typescript.tsPrintSignatureDeclarationBase = tsPrintSignatureDeclarationBase;
		function TSTypeAnnotation(node, parent) {
		  this.token((parent.type === "TSFunctionType" || parent.type === "TSConstructorType") && parent.typeAnnotation === node ? "=>" : ":");
		  this.space();
		  if (node.optional) this.tokenChar(63);
		  this.print(node.typeAnnotation);
		}
		function TSTypeParameterInstantiation(node, parent) {
		  this.tokenChar(60);
		  let printTrailingSeparator = parent.type === "ArrowFunctionExpression" && node.params.length === 1;
		  if (this.tokenMap && node.start != null && node.end != null) {
		    printTrailingSeparator && (printTrailingSeparator = !!this.tokenMap.find(node, t => this.tokenMap.matchesOriginal(t, ",")));
		    printTrailingSeparator || (printTrailingSeparator = this.shouldPrintTrailingComma(">"));
		  }
		  this.printList(node.params, printTrailingSeparator);
		  this.tokenChar(62);
		}
		function TSTypeParameter(node) {
		  if (node.const) {
		    this.word("const");
		    this.space();
		  }
		  if (node.in) {
		    this.word("in");
		    this.space();
		  }
		  if (node.out) {
		    this.word("out");
		    this.space();
		  }
		  this.word(node.name);
		  if (node.constraint) {
		    this.space();
		    this.word("extends");
		    this.space();
		    this.print(node.constraint);
		  }
		  if (node.default) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(node.default);
		  }
		}
		function TSParameterProperty(node) {
		  if (node.accessibility) {
		    this.word(node.accessibility);
		    this.space();
		  }
		  if (node.readonly) {
		    this.word("readonly");
		    this.space();
		  }
		  this._param(node.parameter);
		}
		function TSDeclareFunction(node, parent) {
		  if (node.declare) {
		    this.word("declare");
		    this.space();
		  }
		  this._functionHead(node, parent);
		  this.semicolon();
		}
		function TSDeclareMethod(node) {
		  this._classMethodHead(node);
		  this.semicolon();
		}
		function TSQualifiedName(node) {
		  this.print(node.left);
		  this.tokenChar(46);
		  this.print(node.right);
		}
		function TSCallSignatureDeclaration(node) {
		  this.tsPrintSignatureDeclarationBase(node);
		  maybePrintTrailingCommaOrSemicolon(this, node);
		}
		function maybePrintTrailingCommaOrSemicolon(printer, node) {
		  if (!printer.tokenMap || !node.start || !node.end) {
		    printer.semicolon();
		    return;
		  }
		  if (printer.tokenMap.endMatches(node, ",")) {
		    printer.token(",");
		  } else if (printer.tokenMap.endMatches(node, ";")) {
		    printer.semicolon();
		  }
		}
		function TSConstructSignatureDeclaration(node) {
		  this.word("new");
		  this.space();
		  this.tsPrintSignatureDeclarationBase(node);
		  maybePrintTrailingCommaOrSemicolon(this, node);
		}
		function TSPropertySignature(node) {
		  const {
		    readonly
		  } = node;
		  if (readonly) {
		    this.word("readonly");
		    this.space();
		  }
		  this.tsPrintPropertyOrMethodName(node);
		  this.print(node.typeAnnotation);
		  maybePrintTrailingCommaOrSemicolon(this, node);
		}
		function tsPrintPropertyOrMethodName(node) {
		  if (node.computed) {
		    this.tokenChar(91);
		  }
		  this.print(node.key);
		  if (node.computed) {
		    this.tokenChar(93);
		  }
		  if (node.optional) {
		    this.tokenChar(63);
		  }
		}
		function TSMethodSignature(node) {
		  const {
		    kind
		  } = node;
		  if (kind === "set" || kind === "get") {
		    this.word(kind);
		    this.space();
		  }
		  this.tsPrintPropertyOrMethodName(node);
		  this.tsPrintSignatureDeclarationBase(node);
		  maybePrintTrailingCommaOrSemicolon(this, node);
		}
		function TSIndexSignature(node) {
		  const {
		    readonly,
		    static: isStatic
		  } = node;
		  if (isStatic) {
		    this.word("static");
		    this.space();
		  }
		  if (readonly) {
		    this.word("readonly");
		    this.space();
		  }
		  this.tokenChar(91);
		  this._parameters(node.parameters, "]");
		  this.print(node.typeAnnotation);
		  maybePrintTrailingCommaOrSemicolon(this, node);
		}
		function TSAnyKeyword() {
		  this.word("any");
		}
		function TSBigIntKeyword() {
		  this.word("bigint");
		}
		function TSUnknownKeyword() {
		  this.word("unknown");
		}
		function TSNumberKeyword() {
		  this.word("number");
		}
		function TSObjectKeyword() {
		  this.word("object");
		}
		function TSBooleanKeyword() {
		  this.word("boolean");
		}
		function TSStringKeyword() {
		  this.word("string");
		}
		function TSSymbolKeyword() {
		  this.word("symbol");
		}
		function TSVoidKeyword() {
		  this.word("void");
		}
		function TSUndefinedKeyword() {
		  this.word("undefined");
		}
		function TSNullKeyword() {
		  this.word("null");
		}
		function TSNeverKeyword() {
		  this.word("never");
		}
		function TSIntrinsicKeyword() {
		  this.word("intrinsic");
		}
		function TSThisType() {
		  this.word("this");
		}
		function TSFunctionType(node) {
		  this.tsPrintFunctionOrConstructorType(node);
		}
		function TSConstructorType(node) {
		  if (node.abstract) {
		    this.word("abstract");
		    this.space();
		  }
		  this.word("new");
		  this.space();
		  this.tsPrintFunctionOrConstructorType(node);
		}
		function tsPrintFunctionOrConstructorType(node) {
		  const {
		    typeParameters
		  } = node;
		  const parameters = node.parameters;
		  this.print(typeParameters);
		  this.tokenChar(40);
		  this._parameters(parameters, ")");
		  this.space();
		  const returnType = node.typeAnnotation;
		  this.print(returnType);
		}
		function TSTypeReference(node) {
		  const typeArguments = node.typeParameters;
		  this.print(node.typeName, !!typeArguments);
		  this.print(typeArguments);
		}
		function TSTypePredicate(node) {
		  if (node.asserts) {
		    this.word("asserts");
		    this.space();
		  }
		  this.print(node.parameterName);
		  if (node.typeAnnotation) {
		    this.space();
		    this.word("is");
		    this.space();
		    this.print(node.typeAnnotation.typeAnnotation);
		  }
		}
		function TSTypeQuery(node) {
		  this.word("typeof");
		  this.space();
		  this.print(node.exprName);
		  const typeArguments = node.typeParameters;
		  if (typeArguments) {
		    this.print(typeArguments);
		  }
		}
		function TSTypeLiteral(node) {
		  printBraced(this, node, () => this.printJoin(node.members, true, true));
		}
		function TSArrayType(node) {
		  this.print(node.elementType, true);
		  this.tokenChar(91);
		  this.tokenChar(93);
		}
		function TSTupleType(node) {
		  this.tokenChar(91);
		  this.printList(node.elementTypes, this.shouldPrintTrailingComma("]"));
		  this.tokenChar(93);
		}
		function TSOptionalType(node) {
		  this.print(node.typeAnnotation);
		  this.tokenChar(63);
		}
		function TSRestType(node) {
		  this.token("...");
		  this.print(node.typeAnnotation);
		}
		function TSNamedTupleMember(node) {
		  this.print(node.label);
		  if (node.optional) this.tokenChar(63);
		  this.tokenChar(58);
		  this.space();
		  this.print(node.elementType);
		}
		function TSUnionType(node) {
		  tsPrintUnionOrIntersectionType(this, node, "|");
		}
		function TSIntersectionType(node) {
		  tsPrintUnionOrIntersectionType(this, node, "&");
		}
		function tsPrintUnionOrIntersectionType(printer, node, sep) {
		  var _printer$tokenMap;
		  let hasLeadingToken = 0;
		  if ((_printer$tokenMap = printer.tokenMap) != null && _printer$tokenMap.startMatches(node, sep)) {
		    hasLeadingToken = 1;
		    printer.token(sep);
		  }
		  printer.printJoin(node.types, undefined, undefined, function (i) {
		    this.space();
		    this.token(sep, undefined, i + hasLeadingToken);
		    this.space();
		  });
		}
		function TSConditionalType(node) {
		  this.print(node.checkType);
		  this.space();
		  this.word("extends");
		  this.space();
		  this.print(node.extendsType);
		  this.space();
		  this.tokenChar(63);
		  this.space();
		  this.print(node.trueType);
		  this.space();
		  this.tokenChar(58);
		  this.space();
		  this.print(node.falseType);
		}
		function TSInferType(node) {
		  this.word("infer");
		  this.print(node.typeParameter);
		}
		function TSParenthesizedType(node) {
		  this.tokenChar(40);
		  this.print(node.typeAnnotation);
		  this.tokenChar(41);
		}
		function TSTypeOperator(node) {
		  this.word(node.operator);
		  this.space();
		  this.print(node.typeAnnotation);
		}
		function TSIndexedAccessType(node) {
		  this.print(node.objectType, true);
		  this.tokenChar(91);
		  this.print(node.indexType);
		  this.tokenChar(93);
		}
		function TSMappedType(node) {
		  const {
		    nameType,
		    optional,
		    readonly,
		    typeAnnotation
		  } = node;
		  this.tokenChar(123);
		  const exit = this.enterDelimited();
		  this.space();
		  if (readonly) {
		    tokenIfPlusMinus(this, readonly);
		    this.word("readonly");
		    this.space();
		  }
		  this.tokenChar(91);
		  {
		    this.word(node.typeParameter.name);
		  }
		  this.space();
		  this.word("in");
		  this.space();
		  {
		    this.print(node.typeParameter.constraint);
		  }
		  if (nameType) {
		    this.space();
		    this.word("as");
		    this.space();
		    this.print(nameType);
		  }
		  this.tokenChar(93);
		  if (optional) {
		    tokenIfPlusMinus(this, optional);
		    this.tokenChar(63);
		  }
		  if (typeAnnotation) {
		    this.tokenChar(58);
		    this.space();
		    this.print(typeAnnotation);
		  }
		  this.space();
		  exit();
		  this.tokenChar(125);
		}
		function tokenIfPlusMinus(self, tok) {
		  if (tok !== true) {
		    self.token(tok);
		  }
		}
		function TSTemplateLiteralType(node) {
		  this._printTemplate(node, node.types);
		}
		function TSLiteralType(node) {
		  this.print(node.literal);
		}
		function TSClassImplements(node) {
		  this.print(node.expression);
		  this.print(node.typeArguments);
		}
		function TSInterfaceDeclaration(node) {
		  const {
		    declare,
		    id,
		    typeParameters,
		    extends: extendz,
		    body
		  } = node;
		  if (declare) {
		    this.word("declare");
		    this.space();
		  }
		  this.word("interface");
		  this.space();
		  this.print(id);
		  this.print(typeParameters);
		  if (extendz != null && extendz.length) {
		    this.space();
		    this.word("extends");
		    this.space();
		    this.printList(extendz);
		  }
		  this.space();
		  this.print(body);
		}
		function TSInterfaceBody(node) {
		  printBraced(this, node, () => this.printJoin(node.body, true, true));
		}
		function TSTypeAliasDeclaration(node) {
		  const {
		    declare,
		    id,
		    typeParameters,
		    typeAnnotation
		  } = node;
		  if (declare) {
		    this.word("declare");
		    this.space();
		  }
		  this.word("type");
		  this.space();
		  this.print(id);
		  this.print(typeParameters);
		  this.space();
		  this.tokenChar(61);
		  this.space();
		  this.print(typeAnnotation);
		  this.semicolon();
		}
		function TSTypeExpression(node) {
		  const {
		    type,
		    expression,
		    typeAnnotation
		  } = node;
		  this.print(expression, true);
		  this.space();
		  this.word(type === "TSAsExpression" ? "as" : "satisfies");
		  this.space();
		  this.print(typeAnnotation);
		}
		function TSTypeAssertion(node) {
		  const {
		    typeAnnotation,
		    expression
		  } = node;
		  this.tokenChar(60);
		  this.print(typeAnnotation);
		  this.tokenChar(62);
		  this.space();
		  this.print(expression);
		}
		function TSInstantiationExpression(node) {
		  this.print(node.expression);
		  {
		    this.print(node.typeParameters);
		  }
		}
		function TSEnumDeclaration(node) {
		  const {
		    declare,
		    const: isConst,
		    id
		  } = node;
		  if (declare) {
		    this.word("declare");
		    this.space();
		  }
		  if (isConst) {
		    this.word("const");
		    this.space();
		  }
		  this.word("enum");
		  this.space();
		  this.print(id);
		  this.space();
		  {
		    TSEnumBody.call(this, node);
		  }
		}
		function TSEnumBody(node) {
		  printBraced(this, node, () => {
		    var _this$shouldPrintTrai;
		    return this.printList(node.members, (_this$shouldPrintTrai = this.shouldPrintTrailingComma("}")) != null ? _this$shouldPrintTrai : true, true, true);
		  });
		}
		function TSEnumMember(node) {
		  const {
		    id,
		    initializer
		  } = node;
		  this.print(id);
		  if (initializer) {
		    this.space();
		    this.tokenChar(61);
		    this.space();
		    this.print(initializer);
		  }
		}
		function TSModuleDeclaration(node) {
		  const {
		    declare,
		    id,
		    kind
		  } = node;
		  if (declare) {
		    this.word("declare");
		    this.space();
		  }
		  {
		    if (!node.global) {
		      this.word(kind != null ? kind : id.type === "Identifier" ? "namespace" : "module");
		      this.space();
		    }
		    this.print(id);
		    if (!node.body) {
		      this.semicolon();
		      return;
		    }
		    let body = node.body;
		    while (body.type === "TSModuleDeclaration") {
		      this.tokenChar(46);
		      this.print(body.id);
		      body = body.body;
		    }
		    this.space();
		    this.print(body);
		  }
		}
		function TSModuleBlock(node) {
		  printBraced(this, node, () => this.printSequence(node.body, true));
		}
		function TSImportType(node) {
		  const {
		    argument,
		    qualifier,
		    options
		  } = node;
		  this.word("import");
		  this.tokenChar(40);
		  this.print(argument);
		  if (options) {
		    this.tokenChar(44);
		    this.print(options);
		  }
		  this.tokenChar(41);
		  if (qualifier) {
		    this.tokenChar(46);
		    this.print(qualifier);
		  }
		  const typeArguments = node.typeParameters;
		  if (typeArguments) {
		    this.print(typeArguments);
		  }
		}
		function TSImportEqualsDeclaration(node) {
		  const {
		    id,
		    moduleReference
		  } = node;
		  if (node.isExport) {
		    this.word("export");
		    this.space();
		  }
		  this.word("import");
		  this.space();
		  this.print(id);
		  this.space();
		  this.tokenChar(61);
		  this.space();
		  this.print(moduleReference);
		  this.semicolon();
		}
		function TSExternalModuleReference(node) {
		  this.token("require(");
		  this.print(node.expression);
		  this.tokenChar(41);
		}
		function TSNonNullExpression(node) {
		  this.print(node.expression);
		  this.tokenChar(33);
		}
		function TSExportAssignment(node) {
		  this.word("export");
		  this.space();
		  this.tokenChar(61);
		  this.space();
		  this.print(node.expression);
		  this.semicolon();
		}
		function TSNamespaceExportDeclaration(node) {
		  this.word("export");
		  this.space();
		  this.word("as");
		  this.space();
		  this.word("namespace");
		  this.space();
		  this.print(node.id);
		  this.semicolon();
		}
		function tsPrintSignatureDeclarationBase(node) {
		  const {
		    typeParameters
		  } = node;
		  const parameters = node.parameters;
		  this.print(typeParameters);
		  this.tokenChar(40);
		  this._parameters(parameters, ")");
		  const returnType = node.typeAnnotation;
		  this.print(returnType);
		}
		function tsPrintClassMemberModifiers(node) {
		  const isPrivateField = node.type === "ClassPrivateProperty";
		  const isPublicField = node.type === "ClassAccessorProperty" || node.type === "ClassProperty";
		  printModifiersList(this, node, [isPublicField && node.declare && "declare", !isPrivateField && node.accessibility]);
		  if (node.static) {
		    this.word("static");
		    this.space();
		  }
		  printModifiersList(this, node, [!isPrivateField && node.abstract && "abstract", !isPrivateField && node.override && "override", (isPublicField || isPrivateField) && node.readonly && "readonly"]);
		}
		function printBraced(printer, node, cb) {
		  printer.token("{");
		  const exit = printer.enterDelimited();
		  cb();
		  exit();
		  printer.rightBrace(node);
		}
		function printModifiersList(printer, node, modifiers) {
		  var _printer$tokenMap2;
		  const modifiersSet = new Set();
		  for (const modifier of modifiers) {
		    if (modifier) modifiersSet.add(modifier);
		  }
		  (_printer$tokenMap2 = printer.tokenMap) == null || _printer$tokenMap2.find(node, tok => {
		    if (modifiersSet.has(tok.value)) {
		      printer.token(tok.value);
		      printer.space();
		      modifiersSet.delete(tok.value);
		      return modifiersSet.size === 0;
		    }
		    return false;
		  });
		  for (const modifier of modifiersSet) {
		    printer.word(modifier);
		    printer.space();
		  }
		}

		
		return typescript;
	}

	var hasRequiredGenerators;

	function requireGenerators () {
		if (hasRequiredGenerators) return generators;
		hasRequiredGenerators = 1;
		(function (exports) {

			Object.defineProperty(exports, "__esModule", {
			  value: true
			});
			var _templateLiterals = requireTemplateLiterals();
			Object.keys(_templateLiterals).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _templateLiterals[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _templateLiterals[key];
			    }
			  });
			});
			var _expressions = requireExpressions();
			Object.keys(_expressions).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _expressions[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _expressions[key];
			    }
			  });
			});
			var _statements = requireStatements();
			Object.keys(_statements).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _statements[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _statements[key];
			    }
			  });
			});
			var _classes = requireClasses();
			Object.keys(_classes).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _classes[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _classes[key];
			    }
			  });
			});
			var _methods = requireMethods();
			Object.keys(_methods).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _methods[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _methods[key];
			    }
			  });
			});
			var _modules = requireModules();
			Object.keys(_modules).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _modules[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _modules[key];
			    }
			  });
			});
			var _types = requireTypes();
			Object.keys(_types).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _types[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _types[key];
			    }
			  });
			});
			var _flow = requireFlow();
			Object.keys(_flow).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _flow[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _flow[key];
			    }
			  });
			});
			var _base = requireBase();
			Object.keys(_base).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _base[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _base[key];
			    }
			  });
			});
			var _jsx = requireJsx();
			Object.keys(_jsx).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _jsx[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _jsx[key];
			    }
			  });
			});
			var _typescript = requireTypescript();
			Object.keys(_typescript).forEach(function (key) {
			  if (key === "default" || key === "__esModule") return;
			  if (key in exports && exports[key] === _typescript[key]) return;
			  Object.defineProperty(exports, key, {
			    enumerable: true,
			    get: function () {
			      return _typescript[key];
			    }
			  });
			});

			
		} (generators));
		return generators;
	}

	var deprecated = {};

	var hasRequiredDeprecated;

	function requireDeprecated () {
		if (hasRequiredDeprecated) return deprecated;
		hasRequiredDeprecated = 1;

		Object.defineProperty(deprecated, "__esModule", {
		  value: true
		});
		deprecated.addDeprecatedGenerators = addDeprecatedGenerators;
		function addDeprecatedGenerators(PrinterClass) {
		  {
		    const deprecatedBabel7Generators = {
		      Noop() {},
		      TSExpressionWithTypeArguments(node) {
		        this.print(node.expression);
		        this.print(node.typeParameters);
		      },
		      DecimalLiteral(node) {
		        const raw = this.getPossibleRaw(node);
		        if (!this.format.minified && raw !== undefined) {
		          this.word(raw);
		          return;
		        }
		        this.word(node.value + "m");
		      }
		    };
		    Object.assign(PrinterClass.prototype, deprecatedBabel7Generators);
		  }
		}

		
		return deprecated;
	}

	var hasRequiredPrinter;

	function requirePrinter () {
		if (hasRequiredPrinter) return printer;
		hasRequiredPrinter = 1;

		Object.defineProperty(printer, "__esModule", {
		  value: true
		});
		printer.default = void 0;
		var _buffer = requireBuffer();
		var _index = requireNode();
		var n = _index;
		var _t = globalThis.__BABEL_TYPES__;
		var _tokenMap = requireTokenMap();
		var generatorFunctions = requireGenerators();
		var _deprecated = requireDeprecated();
		const {
		  isExpression,
		  isFunction,
		  isStatement,
		  isClassBody,
		  isTSInterfaceBody,
		  isTSEnumMember
		} = _t;
		const SCIENTIFIC_NOTATION = /e/i;
		const ZERO_DECIMAL_INTEGER = /\.0+$/;
		const HAS_NEWLINE = /[\n\r\u2028\u2029]/;
		const HAS_NEWLINE_OR_BlOCK_COMMENT_END = /[\n\r\u2028\u2029]|\*\//;
		function commentIsNewline(c) {
		  return c.type === "CommentLine" || HAS_NEWLINE.test(c.value);
		}
		const {
		  needsParens
		} = n;
		class Printer {
		  constructor(format, map, tokens = null, originalCode = null) {
		    this.tokenContext = _index.TokenContext.normal;
		    this._tokens = null;
		    this._originalCode = null;
		    this._currentNode = null;
		    this._indent = 0;
		    this._indentRepeat = 0;
		    this._insideAux = false;
		    this._noLineTerminator = false;
		    this._noLineTerminatorAfterNode = null;
		    this._printAuxAfterOnNextUserNode = false;
		    this._printedComments = new Set();
		    this._endsWithInteger = false;
		    this._endsWithWord = false;
		    this._endsWithDiv = false;
		    this._lastCommentLine = 0;
		    this._endsWithInnerRaw = false;
		    this._indentInnerComments = true;
		    this.tokenMap = null;
		    this._boundGetRawIdentifier = this._getRawIdentifier.bind(this);
		    this._printSemicolonBeforeNextNode = -1;
		    this._printSemicolonBeforeNextToken = -1;
		    this.format = format;
		    this._tokens = tokens;
		    this._originalCode = originalCode;
		    this._indentRepeat = format.indent.style.length;
		    this._inputMap = (map == null ? void 0 : map._inputMap) || null;
		    this._buf = new _buffer.default(map, format.indent.style[0]);
		  }
		  enterForStatementInit() {
		    this.tokenContext |= _index.TokenContext.forInitHead | _index.TokenContext.forInOrInitHeadAccumulate;
		    return () => this.tokenContext = _index.TokenContext.normal;
		  }
		  enterForXStatementInit(isForOf) {
		    if (isForOf) {
		      this.tokenContext |= _index.TokenContext.forOfHead;
		      return null;
		    } else {
		      this.tokenContext |= _index.TokenContext.forInHead | _index.TokenContext.forInOrInitHeadAccumulate;
		      return () => this.tokenContext = _index.TokenContext.normal;
		    }
		  }
		  enterDelimited() {
		    const oldTokenContext = this.tokenContext;
		    const oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
		    if (!(oldTokenContext & _index.TokenContext.forInOrInitHeadAccumulate) && oldNoLineTerminatorAfterNode === null) {
		      return () => {};
		    }
		    this._noLineTerminatorAfterNode = null;
		    this.tokenContext = _index.TokenContext.normal;
		    return () => {
		      this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
		      this.tokenContext = oldTokenContext;
		    };
		  }
		  generate(ast) {
		    if (this.format.preserveFormat) {
		      this.tokenMap = new _tokenMap.TokenMap(ast, this._tokens, this._originalCode);
		    }
		    this.print(ast);
		    this._maybeAddAuxComment();
		    return this._buf.get();
		  }
		  indent() {
		    const {
		      format
		    } = this;
		    if (format.preserveFormat || format.compact || format.concise) {
		      return;
		    }
		    this._indent++;
		  }
		  dedent() {
		    const {
		      format
		    } = this;
		    if (format.preserveFormat || format.compact || format.concise) {
		      return;
		    }
		    this._indent--;
		  }
		  semicolon(force = false) {
		    this._maybeAddAuxComment();
		    if (force) {
		      this._appendChar(59);
		      this._noLineTerminator = false;
		      return;
		    }
		    if (this.tokenMap) {
		      const node = this._currentNode;
		      if (node.start != null && node.end != null) {
		        if (!this.tokenMap.endMatches(node, ";")) {
		          this._printSemicolonBeforeNextNode = this._buf.getCurrentLine();
		          return;
		        }
		        const indexes = this.tokenMap.getIndexes(this._currentNode);
		        this._catchUpTo(this._tokens[indexes[indexes.length - 1]].loc.start);
		      }
		    }
		    this._queue(59);
		    this._noLineTerminator = false;
		  }
		  rightBrace(node) {
		    if (this.format.minified) {
		      this._buf.removeLastSemicolon();
		    }
		    this.sourceWithOffset("end", node.loc, -1);
		    this.tokenChar(125);
		  }
		  rightParens(node) {
		    this.sourceWithOffset("end", node.loc, -1);
		    this.tokenChar(41);
		  }
		  space(force = false) {
		    const {
		      format
		    } = this;
		    if (format.compact || format.preserveFormat) return;
		    if (force) {
		      this._space();
		    } else if (this._buf.hasContent()) {
		      const lastCp = this.getLastChar();
		      if (lastCp !== 32 && lastCp !== 10) {
		        this._space();
		      }
		    }
		  }
		  word(str, noLineTerminatorAfter = false) {
		    this.tokenContext &= _index.TokenContext.forInOrInitHeadAccumulatePassThroughMask;
		    this._maybePrintInnerComments(str);
		    this._maybeAddAuxComment();
		    if (this.tokenMap) this._catchUpToCurrentToken(str);
		    if (this._endsWithWord || this._endsWithDiv && str.charCodeAt(0) === 47) {
		      this._space();
		    }
		    this._append(str, false);
		    this._endsWithWord = true;
		    this._noLineTerminator = noLineTerminatorAfter;
		  }
		  number(str, number) {
		    function isNonDecimalLiteral(str) {
		      if (str.length > 2 && str.charCodeAt(0) === 48) {
		        const secondChar = str.charCodeAt(1);
		        return secondChar === 98 || secondChar === 111 || secondChar === 120;
		      }
		      return false;
		    }
		    this.word(str);
		    this._endsWithInteger = Number.isInteger(number) && !isNonDecimalLiteral(str) && !SCIENTIFIC_NOTATION.test(str) && !ZERO_DECIMAL_INTEGER.test(str) && str.charCodeAt(str.length - 1) !== 46;
		  }
		  token(str, maybeNewline = false, occurrenceCount = 0) {
		    this.tokenContext &= _index.TokenContext.forInOrInitHeadAccumulatePassThroughMask;
		    this._maybePrintInnerComments(str, occurrenceCount);
		    this._maybeAddAuxComment();
		    if (this.tokenMap) this._catchUpToCurrentToken(str, occurrenceCount);
		    const lastChar = this.getLastChar();
		    const strFirst = str.charCodeAt(0);
		    if (lastChar === 33 && (str === "--" || strFirst === 61) || strFirst === 43 && lastChar === 43 || strFirst === 45 && lastChar === 45 || strFirst === 46 && this._endsWithInteger) {
		      this._space();
		    }
		    this._append(str, maybeNewline);
		    this._noLineTerminator = false;
		  }
		  tokenChar(char) {
		    this.tokenContext &= _index.TokenContext.forInOrInitHeadAccumulatePassThroughMask;
		    const str = String.fromCharCode(char);
		    this._maybePrintInnerComments(str);
		    this._maybeAddAuxComment();
		    if (this.tokenMap) this._catchUpToCurrentToken(str);
		    const lastChar = this.getLastChar();
		    if (char === 43 && lastChar === 43 || char === 45 && lastChar === 45 || char === 46 && this._endsWithInteger) {
		      this._space();
		    }
		    this._appendChar(char);
		    this._noLineTerminator = false;
		  }
		  newline(i = 1, force) {
		    if (i <= 0) return;
		    if (!force) {
		      if (this.format.retainLines || this.format.compact) return;
		      if (this.format.concise) {
		        this.space();
		        return;
		      }
		    }
		    if (i > 2) i = 2;
		    i -= this._buf.getNewlineCount();
		    for (let j = 0; j < i; j++) {
		      this._newline();
		    }
		    return;
		  }
		  endsWith(char) {
		    return this.getLastChar() === char;
		  }
		  getLastChar() {
		    return this._buf.getLastChar();
		  }
		  endsWithCharAndNewline() {
		    return this._buf.endsWithCharAndNewline();
		  }
		  removeTrailingNewline() {
		    this._buf.removeTrailingNewline();
		  }
		  exactSource(loc, cb) {
		    if (!loc) {
		      cb();
		      return;
		    }
		    this._catchUp("start", loc);
		    this._buf.exactSource(loc, cb);
		  }
		  source(prop, loc) {
		    if (!loc) return;
		    this._catchUp(prop, loc);
		    this._buf.source(prop, loc);
		  }
		  sourceWithOffset(prop, loc, columnOffset) {
		    if (!loc || this.format.preserveFormat) return;
		    this._catchUp(prop, loc);
		    this._buf.sourceWithOffset(prop, loc, columnOffset);
		  }
		  sourceIdentifierName(identifierName, pos) {
		    if (!this._buf._canMarkIdName) return;
		    const sourcePosition = this._buf._sourcePosition;
		    sourcePosition.identifierNamePos = pos;
		    sourcePosition.identifierName = identifierName;
		  }
		  _space() {
		    this._queue(32);
		  }
		  _newline() {
		    this._queue(10);
		  }
		  _catchUpToCurrentToken(str, occurrenceCount = 0) {
		    const token = this.tokenMap.findMatching(this._currentNode, str, occurrenceCount);
		    if (token) this._catchUpTo(token.loc.start);
		    if (this._printSemicolonBeforeNextToken !== -1 && this._printSemicolonBeforeNextToken === this._buf.getCurrentLine()) {
		      this._buf.appendChar(59);
		      this._endsWithWord = false;
		      this._endsWithInteger = false;
		      this._endsWithDiv = false;
		    }
		    this._printSemicolonBeforeNextToken = -1;
		    this._printSemicolonBeforeNextNode = -1;
		  }
		  _append(str, maybeNewline) {
		    this._maybeIndent(str.charCodeAt(0));
		    this._buf.append(str, maybeNewline);
		    this._endsWithWord = false;
		    this._endsWithInteger = false;
		    this._endsWithDiv = false;
		  }
		  _appendChar(char) {
		    this._maybeIndent(char);
		    this._buf.appendChar(char);
		    this._endsWithWord = false;
		    this._endsWithInteger = false;
		    this._endsWithDiv = false;
		  }
		  _queue(char) {
		    this._maybeIndent(char);
		    this._buf.queue(char);
		    this._endsWithWord = false;
		    this._endsWithInteger = false;
		  }
		  _maybeIndent(firstChar) {
		    if (this._indent && firstChar !== 10 && this.endsWith(10)) {
		      this._buf.queueIndentation(this._getIndent());
		    }
		  }
		  _shouldIndent(firstChar) {
		    if (this._indent && firstChar !== 10 && this.endsWith(10)) {
		      return true;
		    }
		  }
		  catchUp(line) {
		    if (!this.format.retainLines) return;
		    const count = line - this._buf.getCurrentLine();
		    for (let i = 0; i < count; i++) {
		      this._newline();
		    }
		  }
		  _catchUp(prop, loc) {
		    const {
		      format
		    } = this;
		    if (!format.preserveFormat) {
		      if (format.retainLines && loc != null && loc[prop]) {
		        this.catchUp(loc[prop].line);
		      }
		      return;
		    }
		    const pos = loc == null ? void 0 : loc[prop];
		    if (pos != null) this._catchUpTo(pos);
		  }
		  _catchUpTo({
		    line,
		    column,
		    index
		  }) {
		    const count = line - this._buf.getCurrentLine();
		    if (count > 0 && this._noLineTerminator) {
		      return;
		    }
		    for (let i = 0; i < count; i++) {
		      this._newline();
		    }
		    const spacesCount = count > 0 ? column : column - this._buf.getCurrentColumn();
		    if (spacesCount > 0) {
		      const spaces = this._originalCode ? this._originalCode.slice(index - spacesCount, index).replace(/[^\t\x0B\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/gu, " ") : " ".repeat(spacesCount);
		      this._append(spaces, false);
		    }
		  }
		  _getIndent() {
		    return this._indentRepeat * this._indent;
		  }
		  printTerminatorless(node) {
		    this._noLineTerminator = true;
		    this.print(node);
		  }
		  print(node, noLineTerminatorAfter = false, trailingCommentsLineOffset) {
		    var _node$extra, _node$leadingComments, _node$leadingComments2;
		    if (!node) return;
		    this._endsWithInnerRaw = false;
		    const nodeType = node.type;
		    const format = this.format;
		    const oldConcise = format.concise;
		    if (node._compact) {
		      format.concise = true;
		    }
		    const printMethod = this[nodeType];
		    if (printMethod === undefined) {
		      throw new ReferenceError(`unknown node of type ${JSON.stringify(nodeType)} with constructor ${JSON.stringify(node.constructor.name)}`);
		    }
		    const parent = this._currentNode;
		    this._currentNode = node;
		    if (this.tokenMap) {
		      this._printSemicolonBeforeNextToken = this._printSemicolonBeforeNextNode;
		    }
		    const oldInAux = this._insideAux;
		    this._insideAux = node.loc == null;
		    this._maybeAddAuxComment(this._insideAux && !oldInAux);
		    const parenthesized = (_node$extra = node.extra) == null ? void 0 : _node$extra.parenthesized;
		    let shouldPrintParens = parenthesized && format.preserveFormat || parenthesized && format.retainFunctionParens && nodeType === "FunctionExpression" || needsParens(node, parent, this.tokenContext, format.preserveFormat ? this._boundGetRawIdentifier : undefined);
		    if (!shouldPrintParens && parenthesized && (_node$leadingComments = node.leadingComments) != null && _node$leadingComments.length && node.leadingComments[0].type === "CommentBlock") {
		      const parentType = parent == null ? void 0 : parent.type;
		      switch (parentType) {
		        case "ExpressionStatement":
		        case "VariableDeclarator":
		        case "AssignmentExpression":
		        case "ReturnStatement":
		          break;
		        case "CallExpression":
		        case "OptionalCallExpression":
		        case "NewExpression":
		          if (parent.callee !== node) break;
		        default:
		          shouldPrintParens = true;
		      }
		    }
		    let indentParenthesized = false;
		    if (!shouldPrintParens && this._noLineTerminator && ((_node$leadingComments2 = node.leadingComments) != null && _node$leadingComments2.some(commentIsNewline) || this.format.retainLines && node.loc && node.loc.start.line > this._buf.getCurrentLine())) {
		      shouldPrintParens = true;
		      indentParenthesized = true;
		    }
		    let oldNoLineTerminatorAfterNode;
		    let oldTokenContext;
		    if (!shouldPrintParens) {
		      noLineTerminatorAfter || (noLineTerminatorAfter = !!parent && this._noLineTerminatorAfterNode === parent && n.isLastChild(parent, node));
		      if (noLineTerminatorAfter) {
		        var _node$trailingComment;
		        if ((_node$trailingComment = node.trailingComments) != null && _node$trailingComment.some(commentIsNewline)) {
		          if (isExpression(node)) shouldPrintParens = true;
		        } else {
		          oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
		          this._noLineTerminatorAfterNode = node;
		        }
		      }
		    }
		    if (shouldPrintParens) {
		      this.tokenChar(40);
		      if (indentParenthesized) this.indent();
		      this._endsWithInnerRaw = false;
		      if (this.tokenContext & _index.TokenContext.forInOrInitHeadAccumulate) {
		        oldTokenContext = this.tokenContext;
		        this.tokenContext = _index.TokenContext.normal;
		      }
		      oldNoLineTerminatorAfterNode = this._noLineTerminatorAfterNode;
		      this._noLineTerminatorAfterNode = null;
		    }
		    this._lastCommentLine = 0;
		    this._printLeadingComments(node, parent);
		    const loc = nodeType === "Program" || nodeType === "File" ? null : node.loc;
		    this.exactSource(loc, printMethod.bind(this, node, parent));
		    if (shouldPrintParens) {
		      this._printTrailingComments(node, parent);
		      if (indentParenthesized) {
		        this.dedent();
		        this.newline();
		      }
		      this.tokenChar(41);
		      this._noLineTerminator = noLineTerminatorAfter;
		      if (oldTokenContext) this.tokenContext = oldTokenContext;
		    } else if (noLineTerminatorAfter && !this._noLineTerminator) {
		      this._noLineTerminator = true;
		      this._printTrailingComments(node, parent);
		    } else {
		      this._printTrailingComments(node, parent, trailingCommentsLineOffset);
		    }
		    this._currentNode = parent;
		    format.concise = oldConcise;
		    this._insideAux = oldInAux;
		    if (oldNoLineTerminatorAfterNode !== undefined) {
		      this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
		    }
		    this._endsWithInnerRaw = false;
		  }
		  _maybeAddAuxComment(enteredPositionlessNode) {
		    if (enteredPositionlessNode) this._printAuxBeforeComment();
		    if (!this._insideAux) this._printAuxAfterComment();
		  }
		  _printAuxBeforeComment() {
		    if (this._printAuxAfterOnNextUserNode) return;
		    this._printAuxAfterOnNextUserNode = true;
		    const comment = this.format.auxiliaryCommentBefore;
		    if (comment) {
		      this._printComment({
		        type: "CommentBlock",
		        value: comment
		      }, 0);
		    }
		  }
		  _printAuxAfterComment() {
		    if (!this._printAuxAfterOnNextUserNode) return;
		    this._printAuxAfterOnNextUserNode = false;
		    const comment = this.format.auxiliaryCommentAfter;
		    if (comment) {
		      this._printComment({
		        type: "CommentBlock",
		        value: comment
		      }, 0);
		    }
		  }
		  getPossibleRaw(node) {
		    const extra = node.extra;
		    if ((extra == null ? void 0 : extra.raw) != null && extra.rawValue != null && node.value === extra.rawValue) {
		      return extra.raw;
		    }
		  }
		  printJoin(nodes, statement, indent, separator, printTrailingSeparator, iterator, trailingCommentsLineOffset) {
		    if (!(nodes != null && nodes.length)) return;
		    if (indent == null && this.format.retainLines) {
		      var _nodes$0$loc;
		      const startLine = (_nodes$0$loc = nodes[0].loc) == null ? void 0 : _nodes$0$loc.start.line;
		      if (startLine != null && startLine !== this._buf.getCurrentLine()) {
		        indent = true;
		      }
		    }
		    if (indent) this.indent();
		    const newlineOpts = {
		      nextNodeStartLine: 0
		    };
		    const boundSeparator = separator == null ? void 0 : separator.bind(this);
		    const len = nodes.length;
		    for (let i = 0; i < len; i++) {
		      const node = nodes[i];
		      if (!node) continue;
		      if (statement) this._printNewline(i === 0, newlineOpts);
		      this.print(node, undefined, trailingCommentsLineOffset || 0);
		      iterator == null || iterator(node, i);
		      if (boundSeparator != null) {
		        if (i < len - 1) boundSeparator(i, false);else if (printTrailingSeparator) boundSeparator(i, true);
		      }
		      if (statement) {
		        var _node$trailingComment2;
		        if (!((_node$trailingComment2 = node.trailingComments) != null && _node$trailingComment2.length)) {
		          this._lastCommentLine = 0;
		        }
		        if (i + 1 === len) {
		          this.newline(1);
		        } else {
		          var _nextNode$loc;
		          const nextNode = nodes[i + 1];
		          newlineOpts.nextNodeStartLine = ((_nextNode$loc = nextNode.loc) == null ? void 0 : _nextNode$loc.start.line) || 0;
		          this._printNewline(true, newlineOpts);
		        }
		      }
		    }
		    if (indent) this.dedent();
		  }
		  printAndIndentOnComments(node) {
		    const indent = node.leadingComments && node.leadingComments.length > 0;
		    if (indent) this.indent();
		    this.print(node);
		    if (indent) this.dedent();
		  }
		  printBlock(parent) {
		    const node = parent.body;
		    if (node.type !== "EmptyStatement") {
		      this.space();
		    }
		    this.print(node);
		  }
		  _printTrailingComments(node, parent, lineOffset) {
		    const {
		      innerComments,
		      trailingComments
		    } = node;
		    if (innerComments != null && innerComments.length) {
		      this._printComments(2, innerComments, node, parent, lineOffset);
		    }
		    if (trailingComments != null && trailingComments.length) {
		      this._printComments(2, trailingComments, node, parent, lineOffset);
		    }
		  }
		  _printLeadingComments(node, parent) {
		    const comments = node.leadingComments;
		    if (!(comments != null && comments.length)) return;
		    this._printComments(0, comments, node, parent);
		  }
		  _maybePrintInnerComments(nextTokenStr, nextTokenOccurrenceCount) {
		    if (this._endsWithInnerRaw) {
		      var _this$tokenMap;
		      this.printInnerComments((_this$tokenMap = this.tokenMap) == null ? void 0 : _this$tokenMap.findMatching(this._currentNode, nextTokenStr, nextTokenOccurrenceCount));
		    }
		    this._endsWithInnerRaw = true;
		    this._indentInnerComments = true;
		  }
		  printInnerComments(nextToken) {
		    const node = this._currentNode;
		    const comments = node.innerComments;
		    if (!(comments != null && comments.length)) return;
		    const hasSpace = this.endsWith(32);
		    const indent = this._indentInnerComments;
		    const printedCommentsCount = this._printedComments.size;
		    if (indent) this.indent();
		    this._printComments(1, comments, node, undefined, undefined, nextToken);
		    if (hasSpace && printedCommentsCount !== this._printedComments.size) {
		      this.space();
		    }
		    if (indent) this.dedent();
		  }
		  noIndentInnerCommentsHere() {
		    this._indentInnerComments = false;
		  }
		  printSequence(nodes, indent, trailingCommentsLineOffset) {
		    this.printJoin(nodes, true, indent != null ? indent : false, undefined, undefined, undefined, trailingCommentsLineOffset);
		  }
		  printList(items, printTrailingSeparator, statement, indent, separator, iterator) {
		    this.printJoin(items, statement, indent, separator != null ? separator : commaSeparator, printTrailingSeparator, iterator);
		  }
		  shouldPrintTrailingComma(listEnd) {
		    if (!this.tokenMap) return null;
		    const listEndIndex = this.tokenMap.findLastIndex(this._currentNode, token => this.tokenMap.matchesOriginal(token, listEnd));
		    if (listEndIndex <= 0) return null;
		    return this.tokenMap.matchesOriginal(this._tokens[listEndIndex - 1], ",");
		  }
		  _printNewline(newLine, opts) {
		    const format = this.format;
		    if (format.retainLines || format.compact) return;
		    if (format.concise) {
		      this.space();
		      return;
		    }
		    if (!newLine) {
		      return;
		    }
		    const startLine = opts.nextNodeStartLine;
		    const lastCommentLine = this._lastCommentLine;
		    if (startLine > 0 && lastCommentLine > 0) {
		      const offset = startLine - lastCommentLine;
		      if (offset >= 0) {
		        this.newline(offset || 1);
		        return;
		      }
		    }
		    if (this._buf.hasContent()) {
		      this.newline(1);
		    }
		  }
		  _shouldPrintComment(comment, nextToken) {
		    if (comment.ignore) return 0;
		    if (this._printedComments.has(comment)) return 0;
		    if (this._noLineTerminator && HAS_NEWLINE_OR_BlOCK_COMMENT_END.test(comment.value)) {
		      return 2;
		    }
		    if (nextToken && this.tokenMap) {
		      const commentTok = this.tokenMap.find(this._currentNode, token => token.value === comment.value);
		      if (commentTok && commentTok.start > nextToken.start) {
		        return 2;
		      }
		    }
		    this._printedComments.add(comment);
		    if (!this.format.shouldPrintComment(comment.value)) {
		      return 0;
		    }
		    return 1;
		  }
		  _printComment(comment, skipNewLines) {
		    const noLineTerminator = this._noLineTerminator;
		    const isBlockComment = comment.type === "CommentBlock";
		    const printNewLines = isBlockComment && skipNewLines !== 1 && !this._noLineTerminator;
		    if (printNewLines && this._buf.hasContent() && skipNewLines !== 2) {
		      this.newline(1);
		    }
		    const lastCharCode = this.getLastChar();
		    if (lastCharCode !== 91 && lastCharCode !== 123 && lastCharCode !== 40) {
		      this.space();
		    }
		    let val;
		    if (isBlockComment) {
		      val = `/*${comment.value}*/`;
		      if (this.format.indent.adjustMultilineComment) {
		        var _comment$loc;
		        const offset = (_comment$loc = comment.loc) == null ? void 0 : _comment$loc.start.column;
		        if (offset) {
		          const newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
		          val = val.replace(newlineRegex, "\n");
		        }
		        if (this.format.concise) {
		          val = val.replace(/\n(?!$)/g, `\n`);
		        } else {
		          let indentSize = this.format.retainLines ? 0 : this._buf.getCurrentColumn();
		          if (this._shouldIndent(47) || this.format.retainLines) {
		            indentSize += this._getIndent();
		          }
		          val = val.replace(/\n(?!$)/g, `\n${" ".repeat(indentSize)}`);
		        }
		      }
		    } else if (!noLineTerminator) {
		      val = `//${comment.value}`;
		    } else {
		      val = `/*${comment.value}*/`;
		    }
		    if (this._endsWithDiv) this._space();
		    if (this.tokenMap) {
		      const {
		        _printSemicolonBeforeNextToken,
		        _printSemicolonBeforeNextNode
		      } = this;
		      this._printSemicolonBeforeNextToken = -1;
		      this._printSemicolonBeforeNextNode = -1;
		      this.source("start", comment.loc);
		      this._append(val, isBlockComment);
		      this._printSemicolonBeforeNextNode = _printSemicolonBeforeNextNode;
		      this._printSemicolonBeforeNextToken = _printSemicolonBeforeNextToken;
		    } else {
		      this.source("start", comment.loc);
		      this._append(val, isBlockComment);
		    }
		    if (!isBlockComment && !noLineTerminator) {
		      this.newline(1, true);
		    }
		    if (printNewLines && skipNewLines !== 3) {
		      this.newline(1);
		    }
		  }
		  _printComments(type, comments, node, parent, lineOffset = 0, nextToken) {
		    const nodeLoc = node.loc;
		    const len = comments.length;
		    let hasLoc = !!nodeLoc;
		    const nodeStartLine = hasLoc ? nodeLoc.start.line : 0;
		    const nodeEndLine = hasLoc ? nodeLoc.end.line : 0;
		    let lastLine = 0;
		    let leadingCommentNewline = 0;
		    const maybeNewline = this._noLineTerminator ? function () {} : this.newline.bind(this);
		    for (let i = 0; i < len; i++) {
		      const comment = comments[i];
		      const shouldPrint = this._shouldPrintComment(comment, nextToken);
		      if (shouldPrint === 2) {
		        hasLoc = false;
		        break;
		      }
		      if (hasLoc && comment.loc && shouldPrint === 1) {
		        const commentStartLine = comment.loc.start.line;
		        const commentEndLine = comment.loc.end.line;
		        if (type === 0) {
		          let offset = 0;
		          if (i === 0) {
		            if (this._buf.hasContent() && (comment.type === "CommentLine" || commentStartLine !== commentEndLine)) {
		              offset = leadingCommentNewline = 1;
		            }
		          } else {
		            offset = commentStartLine - lastLine;
		          }
		          lastLine = commentEndLine;
		          maybeNewline(offset);
		          this._printComment(comment, 1);
		          if (i + 1 === len) {
		            maybeNewline(Math.max(nodeStartLine - lastLine, leadingCommentNewline));
		            lastLine = nodeStartLine;
		          }
		        } else if (type === 1) {
		          const offset = commentStartLine - (i === 0 ? nodeStartLine : lastLine);
		          lastLine = commentEndLine;
		          maybeNewline(offset);
		          this._printComment(comment, 1);
		          if (i + 1 === len) {
		            maybeNewline(Math.min(1, nodeEndLine - lastLine));
		            lastLine = nodeEndLine;
		          }
		        } else {
		          const offset = commentStartLine - (i === 0 ? nodeEndLine - lineOffset : lastLine);
		          lastLine = commentEndLine;
		          maybeNewline(offset);
		          this._printComment(comment, 1);
		        }
		      } else {
		        hasLoc = false;
		        if (shouldPrint !== 1) {
		          continue;
		        }
		        if (len === 1) {
		          const singleLine = comment.loc ? comment.loc.start.line === comment.loc.end.line : !HAS_NEWLINE.test(comment.value);
		          const shouldSkipNewline = singleLine && !isStatement(node) && !isClassBody(parent) && !isTSInterfaceBody(parent) && !isTSEnumMember(node);
		          if (type === 0) {
		            this._printComment(comment, shouldSkipNewline && node.type !== "ObjectExpression" || singleLine && isFunction(parent, {
		              body: node
		            }) ? 1 : 0);
		          } else if (shouldSkipNewline && type === 2) {
		            this._printComment(comment, 1);
		          } else {
		            this._printComment(comment, 0);
		          }
		        } else if (type === 1 && !(node.type === "ObjectExpression" && node.properties.length > 1) && node.type !== "ClassBody" && node.type !== "TSInterfaceBody") {
		          this._printComment(comment, i === 0 ? 2 : i === len - 1 ? 3 : 0);
		        } else {
		          this._printComment(comment, 0);
		        }
		      }
		    }
		    if (type === 2 && hasLoc && lastLine) {
		      this._lastCommentLine = lastLine;
		    }
		  }
		}
		Object.assign(Printer.prototype, generatorFunctions);
		{
		  (0, _deprecated.addDeprecatedGenerators)(Printer);
		}
		printer.default = Printer;
		function commaSeparator(occurrenceCount, last) {
		  this.token(",", false, occurrenceCount);
		  if (!last) this.space();
		}

		
		return printer;
	}

	var hasRequiredLib;

	function requireLib () {
		if (hasRequiredLib) return lib;
		hasRequiredLib = 1;

		Object.defineProperty(lib, "__esModule", {
		  value: true
		});
		lib.default = void 0;
		lib.generate = generate;
		var _sourceMap = requireSourceMap();
		var _printer = requirePrinter();
		function normalizeOptions(code, opts, ast) {
		  if (opts.experimental_preserveFormat) {
		    if (typeof code !== "string") {
		      throw new Error("`experimental_preserveFormat` requires the original `code` to be passed to @babel/generator as a string");
		    }
		    if (!opts.retainLines) {
		      throw new Error("`experimental_preserveFormat` requires `retainLines` to be set to `true`");
		    }
		    if (opts.compact && opts.compact !== "auto") {
		      throw new Error("`experimental_preserveFormat` is not compatible with the `compact` option");
		    }
		    if (opts.minified) {
		      throw new Error("`experimental_preserveFormat` is not compatible with the `minified` option");
		    }
		    if (opts.jsescOption) {
		      throw new Error("`experimental_preserveFormat` is not compatible with the `jsescOption` option");
		    }
		    if (!Array.isArray(ast.tokens)) {
		      throw new Error("`experimental_preserveFormat` requires the AST to have attached the token of the input code. Make sure to enable the `tokens: true` parser option.");
		    }
		  }
		  const format = {
		    auxiliaryCommentBefore: opts.auxiliaryCommentBefore,
		    auxiliaryCommentAfter: opts.auxiliaryCommentAfter,
		    shouldPrintComment: opts.shouldPrintComment,
		    preserveFormat: opts.experimental_preserveFormat,
		    retainLines: opts.retainLines,
		    retainFunctionParens: opts.retainFunctionParens,
		    comments: opts.comments == null || opts.comments,
		    compact: opts.compact,
		    minified: opts.minified,
		    concise: opts.concise,
		    indent: {
		      adjustMultilineComment: true,
		      style: "  "
		    },
		    jsescOption: Object.assign({
		      quotes: "double",
		      wrap: true,
		      minimal: false
		    }, opts.jsescOption),
		    topicToken: opts.topicToken,
		    importAttributesKeyword: opts.importAttributesKeyword
		  };
		  {
		    var _opts$recordAndTupleS;
		    format.decoratorsBeforeExport = opts.decoratorsBeforeExport;
		    format.jsescOption.json = opts.jsonCompatibleStrings;
		    format.recordAndTupleSyntaxType = (_opts$recordAndTupleS = opts.recordAndTupleSyntaxType) != null ? _opts$recordAndTupleS : "hash";
		  }
		  if (format.minified) {
		    format.compact = true;
		    format.shouldPrintComment = format.shouldPrintComment || (() => format.comments);
		  } else {
		    format.shouldPrintComment = format.shouldPrintComment || (value => format.comments || value.includes("@license") || value.includes("@preserve"));
		  }
		  if (format.compact === "auto") {
		    format.compact = typeof code === "string" && code.length > 500000;
		    if (format.compact) {
		      console.error("[BABEL] Note: The code generator has deoptimised the styling of " + `${opts.filename} as it exceeds the max of ${"500KB"}.`);
		    }
		  }
		  if (format.compact || format.preserveFormat) {
		    format.indent.adjustMultilineComment = false;
		  }
		  const {
		    auxiliaryCommentBefore,
		    auxiliaryCommentAfter,
		    shouldPrintComment
		  } = format;
		  if (auxiliaryCommentBefore && !shouldPrintComment(auxiliaryCommentBefore)) {
		    format.auxiliaryCommentBefore = undefined;
		  }
		  if (auxiliaryCommentAfter && !shouldPrintComment(auxiliaryCommentAfter)) {
		    format.auxiliaryCommentAfter = undefined;
		  }
		  return format;
		}
		{
		  lib.CodeGenerator = class CodeGenerator {
		    constructor(ast, opts = {}, code) {
		      this._ast = void 0;
		      this._format = void 0;
		      this._map = void 0;
		      this._ast = ast;
		      this._format = normalizeOptions(code, opts, ast);
		      this._map = opts.sourceMaps ? new _sourceMap.default(opts, code) : null;
		    }
		    generate() {
		      const printer = new _printer.default(this._format, this._map);
		      return printer.generate(this._ast);
		    }
		  };
		}
		function generate(ast, opts = {}, code) {
		  const format = normalizeOptions(code, opts, ast);
		  const map = opts.sourceMaps ? new _sourceMap.default(opts, code) : null;
		  const printer = new _printer.default(format, map, ast.tokens, typeof code === "string" ? code : null);
		  return printer.generate(ast);
		}
		lib.default = generate;

		
		return lib;
	}

	/**
	 * Hook Signature Extractor
	 *
	 * Detects structural changes in hook usage (additions/removals/reordering)
	 * for hot reload instance replacement.
	 */

	var hookSignature;
	var hasRequiredHookSignature;

	function requireHookSignature () {
		if (hasRequiredHookSignature) return hookSignature;
		hasRequiredHookSignature = 1;
		const fs = require$$0;
		const path = require$$1;

		/**
		 * Extract hook signature from component
		 *
		 * Returns array of hook metadata for structural change detection
		 */
		function extractHookSignature(component) {
		  const hooks = [];
		  let index = 0;

		  // Extract useState
		  for (const stateInfo of component.useState) {
		    hooks.push({
		      type: 'useState',
		      varName: stateInfo.name,
		      index: index++
		    });
		  }

		  // Extract useClientState
		  for (const stateInfo of component.useClientState) {
		    hooks.push({
		      type: 'useClientState',
		      varName: stateInfo.name,
		      index: index++
		    });
		  }

		  // Extract useStateX (declarative state projections)
		  if (component.useStateX) {
		    for (const stateInfo of component.useStateX) {
		      hooks.push({
		        type: 'useStateX',
		        varName: stateInfo.name,
		        index: index++
		      });
		    }
		  }

		  // Extract useEffect
		  for (const effect of component.useEffect) {
		    const depsCount = effect.dependencies
		      ? (effect.dependencies.elements ? effect.dependencies.elements.length : -1)
		      : -1; // -1 = no deps array (runs every render)

		    hooks.push({
		      type: 'useEffect',
		      depsCount: depsCount,
		      index: index++
		    });
		  }

		  // Extract useRef
		  for (const refInfo of component.useRef) {
		    hooks.push({
		      type: 'useRef',
		      varName: refInfo.name,
		      index: index++
		    });
		  }

		  // Extract useMarkdown
		  for (const markdownInfo of component.useMarkdown) {
		    hooks.push({
		      type: 'useMarkdown',
		      varName: markdownInfo.name,
		      index: index++
		    });
		  }

		  // Extract useRazorMarkdown
		  if (component.useRazorMarkdown) {
		    for (const razorInfo of component.useRazorMarkdown) {
		      hooks.push({
		        type: 'useRazorMarkdown',
		        varName: razorInfo.name,
		        index: index++
		      });
		    }
		  }

		  // Extract useTemplate
		  if (component.useTemplate) {
		    hooks.push({
		      type: 'useTemplate',
		      templateName: component.useTemplate.name,
		      index: index++
		    });
		  }

		  // Extract useValidation
		  for (const validation of component.useValidation) {
		    hooks.push({
		      type: 'useValidation',
		      varName: validation.name,
		      fieldKey: validation.fieldKey,
		      index: index++
		    });
		  }

		  // Extract useModal
		  for (const modal of component.useModal) {
		    hooks.push({
		      type: 'useModal',
		      varName: modal.name,
		      index: index++
		    });
		  }

		  // Extract useToggle
		  for (const toggle of component.useToggle) {
		    hooks.push({
		      type: 'useToggle',
		      varName: toggle.name,
		      index: index++
		    });
		  }

		  // Extract useDropdown
		  for (const dropdown of component.useDropdown) {
		    hooks.push({
		      type: 'useDropdown',
		      varName: dropdown.name,
		      index: index++
		    });
		  }

		  // Extract usePub
		  if (component.usePub) {
		    for (const pub of component.usePub) {
		      hooks.push({
		        type: 'usePub',
		        varName: pub.name,
		        channel: pub.channel,
		        index: index++
		      });
		    }
		  }

		  // Extract useSub
		  if (component.useSub) {
		    for (const sub of component.useSub) {
		      hooks.push({
		        type: 'useSub',
		        varName: sub.name,
		        channel: sub.channel,
		        index: index++
		      });
		    }
		  }

		  // Extract useMicroTask
		  if (component.useMicroTask) {
		    for (const _ of component.useMicroTask) {
		      hooks.push({
		        type: 'useMicroTask',
		        index: index++
		      });
		    }
		  }

		  // Extract useMacroTask
		  if (component.useMacroTask) {
		    for (const task of component.useMacroTask) {
		      hooks.push({
		        type: 'useMacroTask',
		        delay: task.delay,
		        index: index++
		      });
		    }
		  }

		  // Extract useSignalR
		  if (component.useSignalR) {
		    for (const signalR of component.useSignalR) {
		      hooks.push({
		        type: 'useSignalR',
		        varName: signalR.name,
		        hubUrl: signalR.hubUrl,
		        index: index++
		      });
		    }
		  }

		  // Extract usePredictHint
		  if (component.usePredictHint) {
		    for (const hint of component.usePredictHint) {
		      hooks.push({
		        type: 'usePredictHint',
		        hintId: hint.hintId,
		        index: index++
		      });
		    }
		  }

		  // Extract useServerTask
		  if (component.useServerTask) {
		    for (const task of component.useServerTask) {
		      hooks.push({
		        type: 'useServerTask',
		        varName: task.name,
		        runtime: task.runtime,
		        isStreaming: task.isStreaming,
		        index: index++
		      });
		    }
		  }

		  // Extract usePaginatedServerTask (tracked via paginatedTasks)
		  if (component.paginatedTasks) {
		    for (const pagTask of component.paginatedTasks) {
		      hooks.push({
		        type: 'usePaginatedServerTask',
		        varName: pagTask.name,
		        runtime: pagTask.runtime,
		        index: index++
		      });
		    }
		  }

		  // Extract useMvcState
		  if (component.useMvcState) {
		    for (const mvcState of component.useMvcState) {
		      hooks.push({
		        type: 'useMvcState',
		        varName: mvcState.name,
		        propertyName: mvcState.propertyName,
		        index: index++
		      });
		    }
		  }

		  // Extract useMvcViewModel
		  if (component.useMvcViewModel) {
		    for (const mvcViewModel of component.useMvcViewModel) {
		      hooks.push({
		        type: 'useMvcViewModel',
		        varName: mvcViewModel.name,
		        index: index++
		      });
		    }
		  }

		  return hooks;
		}

		/**
		 * Write hook signature to file
		 */
		function writeHookSignature(componentName, hooks, inputFilePath) {
		  const signature = {
		    componentName: componentName,
		    timestamp: new Date().toISOString(),
		    hooks: hooks
		  };

		  const outputDir = path.dirname(inputFilePath);
		  const signatureFilePath = path.join(outputDir, `${componentName}.hooks.json`);

		  try {
		    fs.writeFileSync(signatureFilePath, JSON.stringify(signature, null, 2));
		    console.log(`[Hook Signature] ✅ Wrote ${path.basename(signatureFilePath)} with ${hooks.length} hooks`);
		  } catch (error) {
		    console.error(`[Hook Signature] Failed to write ${signatureFilePath}:`, error);
		  }
		}

		/**
		 * Read previous hook signature from file
		 */
		function readPreviousHookSignature(componentName, inputFilePath) {
		  const outputDir = path.dirname(inputFilePath);
		  const signatureFilePath = path.join(outputDir, `${componentName}.hooks.json`);

		  if (!fs.existsSync(signatureFilePath)) {
		    return null; // First transpilation
		  }

		  try {
		    const json = fs.readFileSync(signatureFilePath, 'utf-8');
		    const signature = JSON.parse(json);
		    console.log(`[Hook Signature] 📖 Read ${path.basename(signatureFilePath)} with ${signature.hooks.length} hooks`);
		    return signature.hooks;
		  } catch (error) {
		    console.error(`[Hook Signature] Failed to read ${signatureFilePath}:`, error);
		    return null;
		  }
		}

		/**
		 * Compare two hook signatures and detect changes
		 */
		function compareHookSignatures(previousHooks, currentHooks) {
		  const changes = [];

		  // Check if hook count changed
		  if (previousHooks.length !== currentHooks.length) {
		    console.log(`[Hook Changes] Hook count changed: ${previousHooks.length} → ${currentHooks.length}`);
		  }

		  // Compare each hook by index
		  const maxLength = Math.max(previousHooks.length, currentHooks.length);

		  for (let i = 0; i < maxLength; i++) {
		    const prevHook = previousHooks[i];
		    const currHook = currentHooks[i];

		    if (!prevHook && currHook) {
		      // Hook added
		      const hookDesc = getHookDescription(currHook);
		      console.log(`[Hook Changes] 🆕 Hook added at index ${i}: ${hookDesc}`);
		      changes.push({
		        type: 'hook-added',
		        hookType: currHook.type,
		        varName: currHook.varName,
		        index: i
		      });
		    } else if (prevHook && !currHook) {
		      // Hook removed
		      const hookDesc = getHookDescription(prevHook);
		      console.log(`[Hook Changes] 🗑️  Hook removed at index ${i}: ${hookDesc}`);
		      changes.push({
		        type: 'hook-removed',
		        hookType: prevHook.type,
		        varName: prevHook.varName,
		        index: i
		      });
		    } else if (prevHook && currHook) {
		      // Check if hook type changed
		      if (prevHook.type !== currHook.type) {
		        console.log(`[Hook Changes] 🔄 Hook type changed at index ${i}: ${prevHook.type} → ${currHook.type}`);
		        changes.push({
		          type: 'hook-type-changed',
		          oldHookType: prevHook.type,
		          newHookType: currHook.type,
		          index: i
		        });
		      }

		      // Check if variable name changed (for hooks with variables)
		      if (prevHook.varName && currHook.varName && prevHook.varName !== currHook.varName) {
		        console.log(`[Hook Changes] 🔄 Hook variable changed at index ${i}: ${prevHook.varName} → ${currHook.varName}`);
		        changes.push({
		          type: 'hook-variable-changed',
		          hookType: currHook.type,
		          oldVarName: prevHook.varName,
		          newVarName: currHook.varName,
		          index: i
		        });
		      }

		      // Check if property name changed (for useMvcState)
		      if (prevHook.propertyName && currHook.propertyName && prevHook.propertyName !== currHook.propertyName) {
		        console.log(`[Hook Changes] 🔄 useMvcState property changed at index ${i}: ${prevHook.propertyName} → ${currHook.propertyName}`);
		        changes.push({
		          type: 'hook-property-changed',
		          hookType: 'useMvcState',
		          oldPropertyName: prevHook.propertyName,
		          newPropertyName: currHook.propertyName,
		          index: i
		        });
		      }

		      // Check if channel changed (for usePub/useSub)
		      if (prevHook.channel !== undefined && currHook.channel !== undefined && prevHook.channel !== currHook.channel) {
		        console.log(`[Hook Changes] 🔄 ${currHook.type} channel changed at index ${i}: ${prevHook.channel} → ${currHook.channel}`);
		        // Note: Channel change is NOT structural (doesn't affect C# fields), so we don't add it to changes
		        // But we log it for visibility
		      }

		      // Check if runtime changed (for useServerTask/usePaginatedServerTask)
		      if (prevHook.runtime && currHook.runtime && prevHook.runtime !== currHook.runtime) {
		        console.log(`[Hook Changes] 🔄 ${currHook.type} runtime changed at index ${i}: ${prevHook.runtime} → ${currHook.runtime}`);
		        changes.push({
		          type: 'hook-runtime-changed',
		          hookType: currHook.type,
		          oldRuntime: prevHook.runtime,
		          newRuntime: currHook.runtime,
		          index: i
		        });
		      }

		      // Check if deps count changed (for useEffect)
		      // NOTE: Deps count change is NOT a structural change (doesn't affect C# fields)
		      // The effect body and registration stay the same, only execution timing changes
		      // So we log it but don't add to structural changes
		      if (prevHook.depsCount !== undefined &&
		          currHook.depsCount !== undefined &&
		          prevHook.depsCount !== currHook.depsCount) {
		        console.log(`[Hook Changes] ℹ️  useEffect deps count changed at index ${i}: ${prevHook.depsCount} → ${currHook.depsCount} deps (NOT structural)`);
		      }

		      // Check if streaming changed (for useServerTask)
		      if (prevHook.isStreaming !== undefined && currHook.isStreaming !== undefined && prevHook.isStreaming !== currHook.isStreaming) {
		        console.log(`[Hook Changes] 🔄 useServerTask streaming changed at index ${i}: ${prevHook.isStreaming} → ${currHook.isStreaming}`);
		        changes.push({
		          type: 'hook-streaming-changed',
		          hookType: 'useServerTask',
		          oldStreaming: prevHook.isStreaming,
		          newStreaming: currHook.isStreaming,
		          index: i
		        });
		      }
		    }
		  }

		  return changes;
		}

		/**
		 * Get a human-readable description of a hook
		 */
		function getHookDescription(hook) {
		  if (hook.varName) {
		    return `${hook.type} (${hook.varName})`;
		  }
		  if (hook.templateName) {
		    return `${hook.type} (${hook.templateName})`;
		  }
		  if (hook.hintId) {
		    return `${hook.type} (${hook.hintId})`;
		  }
		  if (hook.fieldKey) {
		    return `${hook.type} (${hook.fieldKey})`;
		  }
		  if (hook.propertyName) {
		    return `${hook.type} (${hook.propertyName})`;
		  }
		  if (hook.channel) {
		    return `${hook.type} (${hook.channel})`;
		  }
		  return hook.type;
		}

		hookSignature = {
		  extractHookSignature,
		  writeHookSignature,
		  readPreviousHookSignature,
		  compareHookSignatures
		};
		return hookSignature;
	}

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
	const fs = require$$0;
	const nodePath = require$$1;

	// Modular imports
	const { processComponent } = processComponent_1;
	const { generateCSharpFile } = csharpFile;
	const { generateTemplateMapJSON } = templates;

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

	var indexFull = function(babel) {
	  const generate = requireLib().default;

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
	            const babelCore = globalThis.__BABEL_CORE__;
	            const babelTypes = globalThis.__BABEL_TYPES__;
	            const { HexPathGenerator } = requireHexPath();
	            const { assignPathsToJSX } = requirePathAssignment();

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
	          const t = globalThis.__BABEL_TYPES__;
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
	            state.file.opts.filename;
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

	                // 🔥 HOOK CHANGE DETECTION
	                // Extract hook signature and compare with previous to detect hook changes
	                const {
	                  extractHookSignature,
	                  writeHookSignature,
	                  readPreviousHookSignature,
	                  compareHookSignatures
	                } = requireHookSignature();

	                // Extract current hook signature
	                const currentHooks = extractHookSignature(component);

	                // Write current signature to file (for next comparison)
	                writeHookSignature(component.name, currentHooks, inputFilePath);

	                // Read previous signature
	                const previousHooks = readPreviousHookSignature(component.name, inputFilePath);

	                // Compare signatures and detect hook changes
	                let hookChanges = [];
	                if (previousHooks) {
	                  hookChanges = compareHookSignatures(previousHooks, currentHooks);
	                  if (hookChanges.length > 0) {
	                    console.log(`[Hook Changes] Detected ${hookChanges.length} hook change(s) in ${component.name}`);
	                  }
	                } else {
	                  console.log(`[Hook Signature] No previous signature found for ${component.name} (first transpilation)`);
	                }

	                // 🔥 JSX STRUCTURAL CHANGE DETECTION
	                // Combine JSX changes + hook changes into single structural changes array
	                const jsxChanges = component.structuralChanges || [];

	                // Read previous .tsx.keys to detect JSX deletions
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

	                // Collect current keys from the newly generated .tsx.keys file
	                const currentKeys = new Set();
	                const newKeysFilePath = inputFilePath + '.keys';
	                if (fs.existsSync(newKeysFilePath)) {
	                  try {
	                    const currentSource = fs.readFileSync(newKeysFilePath, 'utf-8');
	                    const extractedKeys = extractAllKeysFromSource(currentSource);
	                    extractedKeys.forEach(key => currentKeys.add(key));
	                    console.log(`[Hot Reload] Read ${currentKeys.size} keys from current transpilation`);
	                  } catch (error) {
	                    console.error(`[Hot Reload] Failed to read current keys:`, error);
	                  }
	                }

	                // Detect JSX deletions
	                const jsxDeletions = [];
	                for (const prevKey of previousKeys) {
	                  if (!currentKeys.has(prevKey)) {
	                    console.log(`[Hot Reload] 🗑️  JSX deletion detected at path "${prevKey}"`);
	                    jsxDeletions.push({
	                      type: 'delete',
	                      path: prevKey
	                    });
	                  }
	                }

	                // Combine ALL structural changes (JSX insertions + JSX deletions + hook changes)
	                const allChanges = [...jsxChanges, ...jsxDeletions, ...hookChanges];

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
	                    console.log(`[Hot Reload] ✅ Generated ${changesFilePath} with ${allChanges.length} changes (${jsxChanges.length} JSX insertions, ${jsxDeletions.length} JSX deletions, ${hookChanges.length} hook changes)`);
	                  } catch (error) {
	                    console.error(`[Hot Reload] Failed to write ${changesFilePath}:`, error);
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

	var indexFull$1 = /*@__PURE__*/getDefaultExportFromCjs(indexFull);

	return indexFull$1;

})(require$$0, require$$1);
//# sourceMappingURL=minimact-babel-plugin.js.map
