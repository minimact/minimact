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
	function tsTypeToCSharpType$3(tsType) {
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
	    const elementType = tsTypeToCSharpType$3(tsType.elementType);
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
	  if (t$g.isNumericLiteral(node)) return 'int';
	  if (t$g.isBooleanLiteral(node)) return 'bool';
	  if (t$g.isNullLiteral(node)) return 'dynamic';
	  if (t$g.isArrayExpression(node)) return 'List<dynamic>';
	  if (t$g.isObjectExpression(node)) return 'dynamic';

	  return 'dynamic';
	}


	var typeConversion = {
	  inferType: inferType$2,
	  tsTypeToCSharpType: tsTypeToCSharpType$3
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

	      component.eventHandlers.push({
	        name: handlerName,
	        body: body,
	        params: params
	      });
	      return handlerName;
	    }

	    if (t$d.isIdentifier(expr)) {
	      return expr.name;
	    }

	    if (t$d.isCallExpression(expr)) {
	      // () => someMethod() - extract
	      const handlerName = `Handle${component.eventHandlers.length}`;
	      component.eventHandlers.push({ name: handlerName, body: expr });
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
		const { generateExpression } = requireExpressions();

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
		      return generateExpression(stateBinding.expression);

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
		    const value = generateExpression(prop.value);
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

	var jsx;
	var hasRequiredJsx;

	function requireJsx () {
		if (hasRequiredJsx) return jsx;
		hasRequiredJsx = 1;
		const t = globalThis.__BABEL_TYPES__;
		const { escapeCSharpString } = helpers;
		const { hasSpreadProps, hasDynamicChildren, hasComplexProps } = detection;
		const { extractEventHandler } = eventHandlers;
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
		  const { generateCSharpExpression: _generateCSharpExpression } = requireExpressions();

		  const indentStr = '    '.repeat(indent);

		  if (t.isJSXFragment(node)) {
		    return generateFragment(node, component, indent);
		  }

		  const tagName = node.openingElement.name.name;
		  const attributes = node.openingElement.attributes;
		  const children = node.children;

		  // Check if this is a Plugin element
		  if (tagName === 'Plugin') {
		    const { generatePluginNode } = requirePlugin();
		    // Find the matching plugin metadata from component.pluginUsages
		    const pluginMetadata = component.pluginUsages.find(p => {
		      // Match by finding the plugin in the same location in the tree
		      // For now, just use the first match (simple case)
		      return true; // TODO: Improve matching logic if multiple plugins
		    });

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

		  // Build VElement construction
		  if (childrenCode.length === 0) {
		    return `new VElement("${tagName}", ${propsStr})`;
		  } else if (childrenCode.length === 1 && childrenCode[0].type === 'text') {
		    return `new VElement("${tagName}", ${propsStr}, ${childrenCode[0].code})`;
		  } else {
		    // Wrap children appropriately for VNode array
		    const childrenArray = childrenCode.map(c => {
		      if (c.type === 'text') {
		        // Text already has quotes, wrap in VText
		        return `new VText(${c.code})`;
		      } else if (c.type === 'expression') {
		        // Expression needs string interpolation wrapper with extra parentheses for complex expressions
		        return `new VText($"{(${c.code})}")`;
		      } else {
		        // Element is already a VNode
		        return c.code;
		      }
		    }).join(',\n' + indentStr + '    ');
		    return `new VElement("${tagName}", ${propsStr}, new VNode[]\n${indentStr}{\n${indentStr}    ${childrenArray}\n${indentStr}})`;
		  }
		}

		/**
		 * Generate children
		 */
		function generateChildren(children, component, indent) {
		  const result = [];

		  // Lazy load to avoid circular dependency
		  const { generateJSXExpression } = requireExpressions();

		  for (const child of children) {
		    if (t.isJSXText(child)) {
		      const text = child.value.trim();
		      if (text) {
		        result.push({ type: 'text', code: `"${escapeCSharpString(text)}"` });
		      }
		    } else if (t.isJSXElement(child)) {
		      result.push({ type: 'element', code: generateJSXElement(child, component, indent + 1) });
		    } else if (t.isJSXExpressionContainer(child)) {
		      result.push({ type: 'expression', code: generateJSXExpression(child.expression, component, indent) });
		    }
		  }

		  return result;
		}

		jsx = {
		  generateFragment,
		  generateJSXElement,
		  generateChildren
		};
		return jsx;
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
		// Lazy load to avoid circular dependencies with jsx.cjs and expressions.cjs

		/**
		 * Generate runtime helper call for complex JSX patterns
		 * Uses MinimactHelpers.createElement() for dynamic scenarios
		 */
		function generateRuntimeHelperCall(tagName, attributes, children, component, indent) {
		  // Lazy load to avoid circular dependency
		  const { generateCSharpExpression } = requireExpressions();
		  const { generateJSXElement } = requireJsx();

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

		      // Handle conditionals with JSX: {condition ? <A/> : <B/>}
		      if (t.isConditionalExpression(expr)) {
		        const { generateBooleanExpression } = requireExpressions();
		        const condition = generateBooleanExpression(expr.test);
		        const consequent = t.isJSXElement(expr.consequent) || t.isJSXFragment(expr.consequent)
		          ? generateJSXElement(expr.consequent, component, indent + 1)
		          : generateCSharpExpression(expr.consequent);
		        const alternate = t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)
		          ? generateJSXElement(expr.alternate, component, indent + 1)
		          : generateCSharpExpression(expr.alternate);
		        childrenArgs.push(`(${condition}) ? ${consequent} : ${alternate}`);
		      }
		      // Handle logical expressions with JSX: {condition && <Element/>}
		      else if (t.isLogicalExpression(expr) && expr.operator === '&&') {
		        const { generateBooleanExpression } = requireExpressions();
		        const left = generateBooleanExpression(expr.left);
		        const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
		          ? generateJSXElement(expr.right, component, indent + 1)
		          : generateCSharpExpression(expr.right);
		        childrenArgs.push(`(${left}) ? ${right} : null`);
		      }
		      // Handle .map() with JSX callback
		      else if (t.isCallExpression(expr) &&
		               t.isMemberExpression(expr.callee) &&
		               t.isIdentifier(expr.callee.property, { name: 'map' })) {
		        // Lazy load generateMapExpression
		        const { generateMapExpression } = requireExpressions();
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
		  const { generateCSharpExpression } = requireExpressions();

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

		  return 'null';
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

	var expressions;
	var hasRequiredExpressions;

	function requireExpressions () {
		if (hasRequiredExpressions) return expressions;
		hasRequiredExpressions = 1;
		const t = globalThis.__BABEL_TYPES__;
		const { escapeCSharpString } = helpers;
		const { analyzeDependencies } = dependencies;
		const { classifyNode } = classification;
		const { generateRuntimeHelperForJSXNode } = requireRuntimeHelpers();
		const { generateJSXElement } = requireJsx();

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
		    const alternate = t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)
		      ? generateRuntimeHelperForJSXNode(expr.alternate, component, indent)
		      : generateCSharpExpression(expr.alternate, false); // Normal C# expression context
		    return `(${condition}) ? ${consequent} : ${alternate}`;
		  }

		  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
		    // Short-circuit with JSX: condition && <Element/>
		    // Force runtime helpers for JSX in logical expressions
		    const left = generateBooleanExpression(expr.left);
		    const right = t.isJSXElement(expr.right) || t.isJSXFragment(expr.right)
		      ? generateRuntimeHelperForJSXNode(expr.right, component, indent)
		      : generateCSharpExpression(expr.right);
		    // Use != null for truthy check (works for bool, object, int, etc.)
		    return `(${left}) ? ${right} : null`;
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

		  const itemCode = t.isJSXElement(body)
		    ? generateJSXElement(body, component, indent + 1)
		    : generateJSXElement(body.body, component, indent + 1);

		  // C# Select supports (item, index) => ...
		  if (indexParam) {
		    return `${arrayName}.Select((${itemParam}, ${indexParam}) => ${itemCode}).ToArray()`;
		  } else {
		    return `${arrayName}.Select(${itemParam} => ${itemCode}).ToArray()`;
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
		    return `return ${generateCSharpExpression(node.argument)};`;
		  }

		  if (t.isVariableDeclaration(node)) {
		    const declarations = node.declarations.map(d => {
		      const name = d.id.name;
		      const value = generateCSharpExpression(d.init);
		      return `var ${name} = ${value};`;
		    }).join(' ');
		    return declarations;
		  }

		  // Fallback: try to convert as expression
		  return generateCSharpExpression(node) + ';';
		}

		/**
		 * Generate C# expression from JS expression
		 * @param {boolean} inInterpolation - True if this expression will be inside $"{...}"
		 */
		function generateCSharpExpression(node, inInterpolation = false) {
		  if (!node) return 'null';

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
		    return 'null';
		  }

		  if (t.isIdentifier(node)) {
		    return node.name;
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

		    const property = node.computed
		      ? `[${generateCSharpExpression(node.property)}]`
		      : `.${propertyName}`;
		    return `${object}${property}`;
		  }

		  if (t.isArrayExpression(node)) {
		    const elements = node.elements.map(e => generateCSharpExpression(e)).join(', ');
		    return `new List<object> { ${elements} }`;
		  }

		  if (t.isUnaryExpression(node)) {
		    // Handle unary expressions: !expr, -expr, +expr, etc.
		    const argument = generateCSharpExpression(node.argument, inInterpolation);
		    const operator = node.operator;
		    return `${operator}${argument}`;
		  }

		  if (t.isBinaryExpression(node)) {
		    const left = generateCSharpExpression(node.left);
		    const right = generateCSharpExpression(node.right);
		    // Convert JavaScript operators to C# operators
		    let operator = node.operator;
		    if (operator === '===') operator = '==';
		    if (operator === '!==') operator = '!=';
		    return `${left} ${operator} ${right}`;
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

		    // Handle alert() → Console.WriteLine() (or custom alert implementation)
		    if (t.isIdentifier(node.callee, { name: 'alert' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(' + ');
		      return `Console.WriteLine(${args})`;
		    }

		    // Handle console.log → Console.WriteLine
		    if (t.isMemberExpression(node.callee) &&
		        t.isIdentifier(node.callee.object, { name: 'console' }) &&
		        t.isIdentifier(node.callee.property, { name: 'log' })) {
		      const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(' + ');
		      return `Console.WriteLine(${args})`;
		    }

		    // Handle .toFixed(n) → .ToString("Fn")
		    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property, { name: 'toFixed' })) {
		      const object = generateCSharpExpression(node.callee.object);
		      const decimals = node.arguments.length > 0 && t.isNumericLiteral(node.arguments[0])
		        ? node.arguments[0].value
		        : 2;
		      return `${object}.ToString("F${decimals}")`;
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

		    // Generic function call
		    const callee = generateCSharpExpression(node.callee);
		    const args = node.arguments.map(arg => generateCSharpExpression(arg)).join(', ');
		    return `${callee}(${args})`;
		  }

		  if (t.isTemplateLiteral(node)) {
		    // Convert template literal to C# string interpolation
		    let result = '$"';
		    for (let i = 0; i < node.quasis.length; i++) {
		      result += node.quasis[i].value.raw;
		      if (i < node.expressions.length) {
		        result += '{' + generateCSharpExpression(node.expressions[i]) + '}';
		      }
		    }
		    result += '"';
		    return result;
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

		  return 'null';
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

		expressions = {
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
		return expressions;
	}

	/**
	 * useStateX Extractor
	 * Extracts useStateX hook calls and analyzes transform functions for C# generation
	 */

	const t$c = globalThis.__BABEL_TYPES__;
	const { generateCSharpExpression: generateCSharpExpression$3 } = requireExpressions();
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
	const { generateCSharpExpression: generateCSharpExpression$2 } = requireExpressions();
	const { inferType, tsTypeToCSharpType: tsTypeToCSharpType$2 } = typeConversion;
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

	  // Check if there's a generic type parameter (e.g., useState<decimal>(0))
	  let explicitType = null;
	  if (path.node.typeParameters && path.node.typeParameters.params.length > 0) {
	    const typeParam = path.node.typeParameters.params[0];
	    explicitType = tsTypeToCSharpType$2(typeParam);
	    console.log(`[useState] Found explicit type parameter for '${stateVar.name}': ${explicitType}`);
	  }

	  const stateInfo = {
	    name: stateVar.name,
	    setter: setterVar.name,
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
	  let csharpType = typeParam ? tsTypeToCSharpType$2(typeParam) : 'dynamic';

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
	          const csharpType = tsTypeToCSharpType$2(typeAnnotation);
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
	const { generateCSharpExpression: generateCSharpExpression$1 } = requireExpressions();
	const { tsTypeToCSharpType: tsTypeToCSharpType$1 } = typeConversion;

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
	        varType = tsTypeToCSharpType$1(declarator.id.typeAnnotation.typeAnnotation);
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

	  // Build path stack for tracking node positions
	  const pathStack = [];

	  /**
	   * Traverse JSX tree and extract text templates
	   */
	  function traverseJSX(node, parentPath = []) {
	    if (t$8.isJSXElement(node)) {
	      const tagName = node.openingElement.name.name;
	      const elementIndex = pathStack.filter(p => p.tag === tagName).length;
	      const currentPath = [...parentPath, elementIndex];
	      const pathKey = buildPathKey(tagName, elementIndex, parentPath);

	      pathStack.push({ tag: tagName, index: elementIndex });

	      // Process children
	      let textNodeIndex = 0;
	      for (const child of node.children) {
	        if (t$8.isJSXText(child)) {
	          const text = child.value.trim();
	          if (text) {
	            // Static text - create template without bindings
	            const textPath = `${pathKey}.text[${textNodeIndex}]`;
	            templates[textPath] = {
	              template: text,
	              bindings: [],
	              slots: [],
	              path: [...currentPath, textNodeIndex],
	              type: 'static'
	            };
	            textNodeIndex++;
	          }
	        } else if (t$8.isJSXExpressionContainer(child)) {
	          // Expression in text position: <h1>{count}</h1>
	          // Only create text template if this is actual text content, not structural JSX
	          const expr = child.expression;

	          // Skip structural JSX (elements, fragments, conditionals with JSX, comments)
	          const isStructural = t$8.isJSXElement(expr) ||
	                               t$8.isJSXFragment(expr) ||
	                               t$8.isJSXEmptyExpression(expr) || // Comments: {/* ... */}
	                               (t$8.isLogicalExpression(expr) &&
	                                (t$8.isJSXElement(expr.right) || t$8.isJSXFragment(expr.right))) ||
	                               (t$8.isConditionalExpression(expr) &&
	                                (t$8.isJSXElement(expr.consequent) || t$8.isJSXElement(expr.alternate) ||
	                                 t$8.isJSXFragment(expr.consequent) || t$8.isJSXFragment(expr.alternate)));

	          if (!isStructural) {
	            // This is a text expression, extract template
	            const template = extractTextTemplate(node.children, currentPath, textNodeIndex);
	            if (template) {
	              const textPath = `${pathKey}.text[${textNodeIndex}]`;
	              templates[textPath] = template;
	              textNodeIndex++;
	            }
	          }
	        } else if (t$8.isJSXElement(child)) {
	          traverseJSX(child, currentPath);
	        }
	      }

	      pathStack.pop();
	    } else if (t$8.isJSXFragment(node)) {
	      // Handle fragments
	      for (const child of node.children) {
	        if (t$8.isJSXElement(child)) {
	          traverseJSX(child, parentPath);
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
	      path: [...currentPath, textIndex],
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

	  /**
	   * Build path key for template map
	   * Example: div[0].h1[0].text → "div[0].h1[0]"
	   */
	  function buildPathKey(tagName, index, parentPath) {
	    const parentKeys = [];
	    let currentPath = parentPath;

	    // Build parent path from indices
	    // This is simplified - in production we'd track tag names
	    for (let i = 0; i < currentPath.length; i++) {
	      parentKeys.push(`[${currentPath[i]}]`);
	    }

	    return `${parentKeys.join('.')}.${tagName}[${index}]`.replace(/^\./, '');
	  }

	  // Start traversal
	  traverseJSX(renderBody);

	  return templates;
	}

	/**
	 * Extract templates for attributes (props)
	 * Example: <div className={`count-${count}`} />
	 */
	function extractAttributeTemplates$1(renderBody, component) {
	  const templates = {};

	  function traverseJSX(node, parentPath = []) {
	    if (t$8.isJSXElement(node)) {
	      const tagName = node.openingElement.name.name;
	      const currentPath = [...parentPath, 0]; // Simplified

	      // Check attributes for template expressions
	      for (const attr of node.openingElement.attributes) {
	        if (t$8.isJSXAttribute(attr) && t$8.isJSXExpressionContainer(attr.value)) {
	          const expr = attr.value.expression;

	          // Template literal: className={`count-${count}`}
	          if (t$8.isTemplateLiteral(expr)) {
	            const template = extractTemplateLiteral(expr);
	            if (template) {
	              const attrPath = `${tagName}[${currentPath.join(',')}].@${attr.name.name}`;
	              templates[attrPath] = {
	                ...template,
	                path: currentPath,
	                attribute: attr.name.name
	              };
	            }
	          }
	        }
	      }

	      // Traverse children
	      for (const child of node.children) {
	        if (t$8.isJSXElement(child)) {
	          traverseJSX(child, currentPath);
	        }
	      }
	    }
	  }

	  function extractTemplateLiteral(node) {
	    let templateStr = '';
	    const bindings = [];
	    const slots = [];

	    for (let i = 0; i < node.quasis.length; i++) {
	      const quasi = node.quasis[i];
	      templateStr += quasi.value.raw;

	      if (i < node.expressions.length) {
	        const expr = node.expressions[i];
	        slots.push(templateStr.length);
	        templateStr += `{${i}}`;

	        if (t$8.isIdentifier(expr)) {
	          bindings.push(expr.name);
	        } else {
	          bindings.push('__complex__');
	        }
	      }
	    }

	    return {
	      template: templateStr,
	      bindings,
	      slots,
	      type: 'attribute'
	    };
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
	    const itemTemplate = extractElementTemplate(jsxElement, itemVar);
	    if (!itemTemplate) {
	      console.warn('[Loop Template] Could not extract item template from JSX');
	      return null;
	    }

	    // Extract key binding
	    const keyBinding = extractKeyBinding(jsxElement, itemVar);

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
	  function extractKeyBinding(jsxElement, itemVar) {
	    const keyAttr = jsxElement.openingElement.attributes.find(
	      attr => t$7.isJSXAttribute(attr) &&
	              t$7.isIdentifier(attr.name) &&
	              attr.name.name === 'key'
	    );

	    if (!keyAttr) return null;

	    const keyValue = keyAttr.value;
	    if (t$7.isJSXExpressionContainer(keyValue)) {
	      return buildBindingPath(keyValue.expression, itemVar);
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
	      itemVar);

	    // Extract children templates
	    const childrenTemplates = extractChildrenTemplates(
	      jsxElement.children,
	      itemVar);

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
	          const conditionalTemplate = extractConditionalTemplate(expr, itemVar);
	          if (conditionalTemplate) {
	            templates[propName] = conditionalTemplate;
	            continue;
	          }
	        }

	        // Template literal: {`item-${todo.id}`}
	        if (t$7.isTemplateLiteral(expr)) {
	          const template = extractTemplateFromTemplateLiteral(expr, itemVar);
	          if (template) {
	            templates[propName] = template;
	            continue;
	          }
	        }

	        // Simple binding: {todo.text}, {todo.done}
	        const binding = buildBindingPath(expr, itemVar);
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
	    const binding = buildBindingPath(test, itemVar);
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
	        const binding = buildBindingPath(expr, itemVar);

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
	        const template = extractTextTemplate(child.expression, itemVar);
	        if (template) {
	          templates.push(template);
	        }
	        continue;
	      }

	      // Nested element: <li><span>{todo.text}</span></li>
	      if (t$7.isJSXElement(child)) {
	        const elementTemplate = extractElementTemplate(child, itemVar);
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
	   * - Complex: {todo.count + 1} → transformation template (future)
	   */
	  function extractTextTemplate(expr, itemVar, indexVar) {
	    // Conditional expression: {todo.done ? '✓' : '○'}
	    if (t$7.isConditionalExpression(expr)) {
	      const conditionalTemplate = extractConditionalTemplate(expr, itemVar);
	      if (conditionalTemplate) {
	        return {
	          type: 'Text',
	          ...conditionalTemplate
	        };
	      }
	    }

	    // Simple binding: {todo.text}
	    const binding = buildBindingPath(expr, itemVar);
	    if (binding) {
	      return {
	        type: 'Text',
	        template: '{0}',
	        bindings: [binding],
	        slots: [0]
	      };
	    }

	    // TODO: Handle binary expressions (todo.count + 1), method calls (todo.text.toUpperCase()), etc.
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
	   */
	  function buildBindingPath(expr, itemVar) {
	    if (t$7.isIdentifier(expr)) {
	      // Just the item variable itself
	      if (expr.name === itemVar) {
	        return null; // Can't template the entire item object
	      }
	      // Index variable
	      if (expr.name === 'index') {
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

	    return null;
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
	    const binding = buildMemberPath(memberExpr);
	    if (!binding) return null;

	    // Get property name
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
	const { tsTypeToCSharpType } = typeConversion;
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
	            propType = tsTypeToCSharpType(tsProperty.typeAnnotation.typeAnnotation);
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

	    ReturnStatement(returnPath) {
	      if (returnPath.getFunctionParent() === path) {
	        // Deep clone the AST node to preserve it before we replace JSX with null
	        component.renderBody = t$3.cloneNode(returnPath.node.argument, true);
	      }
	    }
	  });

	  // Infer prop types from usage BEFORE replacing JSX with null
	  // Pass the entire function body to analyze all usage (including JSX)
	  inferPropTypes(component, body);

	  // Extract templates from JSX for hot reload (BEFORE replacing JSX with null)
	  if (component.renderBody) {
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
	          console.log(`  - ${et.binding}.${et.method}(${et.args.join(', ')})`);
	        } else if (et.operator) {
	          console.log(`  - ${et.operator}${et.binding}`);
	        } else {
	          console.log(`  - ${et.bindings.join(', ')}`);
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

	  // Now replace JSX to prevent @babel/preset-react from transforming it
	  path.traverse({
	    ReturnStatement(returnPath) {
	      if (returnPath.getFunctionParent() === path) {
	        returnPath.node.argument = t$3.nullLiteral();
	      }
	    }
	  });

	  state.file.minimactComponents.push(component);
	}

	var processComponent_1 = {
	  processComponent: processComponent$1
	};

	/**
	 * Render Body Generator
	 */

	const t$2 = globalThis.__BABEL_TYPES__;
	const { generateJSXElement } = requireJsx();
	const { generateConditional, generateShortCircuit, generateMapExpression } = requireExpressions();

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

	  if (t$1.isCallExpression(expr)) {
	    const callee = transpileExpression(expr.callee);
	    const args = expr.arguments.map(arg => transpileExpression(arg)).join(', ');

	    // Handle special method calls
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
	 * Component Generator
	 */

	const t = globalThis.__BABEL_TYPES__;
	const { generateRenderBody } = renderBody;
	const { generateCSharpExpression, generateCSharpStatement, setCurrentComponent } = requireExpressions();
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
	    const paramStr = params.length > 0
	      ? params.map(p => t.isIdentifier(p) ? `dynamic ${p.name}` : 'dynamic arg').join(', ')
	      : '';

	    // Event handlers must be public so SignalR hub can call them
	    lines.push(`    public void ${handler.name}(${paramStr})`);
	    lines.push('    {');

	    // Generate method body
	    if (handler.body) {
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

	var indexFull = function(babel) {
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

	var indexFull$1 = /*@__PURE__*/getDefaultExportFromCjs(indexFull);

	return indexFull$1;

})(require$$0, require$$1);
//# sourceMappingURL=minimact-babel-plugin.js.map
