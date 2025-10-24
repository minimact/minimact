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

const t$9 = globalThis.__BABEL_TYPES__;

/**
 * Convert TypeScript type annotation to C# type
 */
function tsTypeToCSharpType$2(tsType) {
  if (!tsType) return 'dynamic';

  // TSStringKeyword -> string
  if (t$9.isTSStringKeyword(tsType)) return 'string';

  // TSNumberKeyword -> double
  if (t$9.isTSNumberKeyword(tsType)) return 'double';

  // TSBooleanKeyword -> bool
  if (t$9.isTSBooleanKeyword(tsType)) return 'bool';

  // TSAnyKeyword -> dynamic
  if (t$9.isTSAnyKeyword(tsType)) return 'dynamic';

  // TSArrayType -> List<T>
  if (t$9.isTSArrayType(tsType)) {
    const elementType = tsTypeToCSharpType$2(tsType.elementType);
    return `List<${elementType}>`;
  }

  // TSTypeLiteral (object type) -> dynamic
  if (t$9.isTSTypeLiteral(tsType)) return 'dynamic';

  // TSTypeReference (custom types, interfaces) -> dynamic
  if (t$9.isTSTypeReference(tsType)) return 'dynamic';

  // Default to dynamic for full JSX semantics
  return 'dynamic';
}

/**
 * Infer C# type from initial value
 */
function inferType$1(node) {
  if (!node) return 'dynamic';

  if (t$9.isStringLiteral(node)) return 'string';
  if (t$9.isNumericLiteral(node)) return 'int';
  if (t$9.isBooleanLiteral(node)) return 'bool';
  if (t$9.isNullLiteral(node)) return 'dynamic';
  if (t$9.isArrayExpression(node)) return 'List<dynamic>';
  if (t$9.isObjectExpression(node)) return 'dynamic';

  return 'dynamic';
}


var typeConversion = {
  inferType: inferType$1,
  tsTypeToCSharpType: tsTypeToCSharpType$2
};

/**
 * Dependency Analyzer
 */

const t$8 = globalThis.__BABEL_TYPES__;

/**
 * Analyze dependencies in JSX expressions
 * Walk the AST manually to find identifier dependencies
 */
function analyzeDependencies(jsxExpr, component) {
  const deps = new Set();

  function walk(node) {
    if (!node) return;

    // Check if this is an identifier that's a state variable
    if (t$8.isIdentifier(node)) {
      const name = node.name;
      if (component.stateTypes.has(name)) {
        deps.add({
          name: name,
          type: component.stateTypes.get(name) // 'client' or 'server'
        });
      }
    }

    // Recursively walk the tree
    if (t$8.isConditionalExpression(node)) {
      walk(node.test);
      walk(node.consequent);
      walk(node.alternate);
    } else if (t$8.isLogicalExpression(node)) {
      walk(node.left);
      walk(node.right);
    } else if (t$8.isMemberExpression(node)) {
      walk(node.object);
      walk(node.property);
    } else if (t$8.isCallExpression(node)) {
      walk(node.callee);
      node.arguments.forEach(walk);
    } else if (t$8.isBinaryExpression(node)) {
      walk(node.left);
      walk(node.right);
    } else if (t$8.isUnaryExpression(node)) {
      walk(node.argument);
    } else if (t$8.isArrowFunctionExpression(node) || t$8.isFunctionExpression(node)) {
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

const t$7 = globalThis.__BABEL_TYPES__;


/**
 * Detect if attributes contain spread operators
 */
function hasSpreadProps(attributes) {
  return attributes.some(attr => t$7.isJSXSpreadAttribute(attr));
}

/**
 * Detect if children contain dynamic patterns (like .map())
 */
function hasDynamicChildren(children) {
  return children.some(child => {
    if (!t$7.isJSXExpressionContainer(child)) return false;
    const expr = child.expression;

    // Check for .map() calls
    if (t$7.isCallExpression(expr) &&
        t$7.isMemberExpression(expr.callee) &&
        t$7.isIdentifier(expr.callee.property, { name: 'map' })) {
      return true;
    }

    // Check for array expressions from LINQ/Select
    if (t$7.isCallExpression(expr) &&
        t$7.isMemberExpression(expr.callee) &&
        (t$7.isIdentifier(expr.callee.property, { name: 'Select' }) ||
         t$7.isIdentifier(expr.callee.property, { name: 'ToArray' }))) {
      return true;
    }

    // Check for conditionals with JSX: {condition ? <A/> : <B/>}
    if (t$7.isConditionalExpression(expr)) {
      if (t$7.isJSXElement(expr.consequent) || t$7.isJSXFragment(expr.consequent) ||
          t$7.isJSXElement(expr.alternate) || t$7.isJSXFragment(expr.alternate)) {
        return true;
      }
    }

    // Check for logical expressions with JSX: {condition && <Element/>}
    if (t$7.isLogicalExpression(expr)) {
      if (t$7.isJSXElement(expr.right) || t$7.isJSXFragment(expr.right)) {
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
    if (!t$7.isJSXAttribute(attr)) return false;
    const value = attr.value;

    if (!t$7.isJSXExpressionContainer(value)) return false;
    const expr = value.expression;

    // Check for conditional spread: {...(condition && { prop: value })}
    if (t$7.isConditionalExpression(expr) || t$7.isLogicalExpression(expr)) {
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

const t$6 = globalThis.__BABEL_TYPES__;

/**
 * Extract event handler name
 */
function extractEventHandler(value, component) {
  if (t$6.isStringLiteral(value)) {
    return value.value;
  }

  if (t$6.isJSXExpressionContainer(value)) {
    const expr = value.expression;

    if (t$6.isArrowFunctionExpression(expr) || t$6.isFunctionExpression(expr)) {
      // Inline arrow function - extract to named method
      const handlerName = `Handle${component.eventHandlers.length}`;
      component.eventHandlers.push({ name: handlerName, body: expr.body });
      return handlerName;
    }

    if (t$6.isIdentifier(expr)) {
      return expr.name;
    }

    if (t$6.isCallExpression(expr)) {
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

	      if (name.startsWith('on')) {
	        // Event handler
	        const handlerName = extractEventHandler(value, component);
	        eventHandlers.push(`["${name.toLowerCase()}"] = "${handlerName}"`);
	      } else if (name.startsWith('data-minimact-')) {
	        // Keep minimact attributes as-is
	        const val = t.isStringLiteral(value) ? value.value : _generateCSharpExpression(value.expression);
	        dataMinimactAttrs.push(`["${name}"] = "${val}"`);
	      } else {
	        // Regular prop
	        if (t.isStringLiteral(value)) {
	          // String literal - use as-is with quotes
	          props.push(`["${name}"] = "${escapeCSharpString(value.value)}"`);
	        } else if (t.isJSXExpressionContainer(value)) {
	          // Expression - wrap in string interpolation
	          const expr = _generateCSharpExpression(value.expression);
	          props.push(`["${name}"] = $"{${expr}}"`);
	        } else {
	          // Fallback
	          props.push(`["${name}"] = ""`);
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
	        // Expression needs string interpolation wrapper
	        return `new VText($"{${c.code}}")`;
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
	        propValue = generateCSharpExpression(value.expression);
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
	      : generateCSharpExpression(expr.consequent);
	    const alternate = t.isJSXElement(expr.alternate) || t.isJSXFragment(expr.alternate)
	      ? generateRuntimeHelperForJSXNode(expr.alternate, component, indent)
	      : generateCSharpExpression(expr.alternate);
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
	 */
	function generateCSharpExpression(node) {
	  if (!node) return 'null';

	  if (t.isStringLiteral(node)) {
	    return `"${escapeCSharpString(node.value)}"`;
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

	  if (t.isMemberExpression(node)) {
	    const object = generateCSharpExpression(node.object);
	    const propertyName = t.isIdentifier(node.property) ? node.property.name : null;

	    // Handle JavaScript to C# API conversions
	    if (propertyName === 'length' && !node.computed) {
	      // array.length → array.Count
	      return `${object}.Count`;
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

	  if (t.isBinaryExpression(node)) {
	    const left = generateCSharpExpression(node.left);
	    const right = generateCSharpExpression(node.right);
	    // Convert JavaScript operators to C# operators
	    let operator = node.operator;
	    if (operator === '===') operator = '==';
	    if (operator === '!==') operator = '!=';
	    return `${left} ${operator} ${right}`;
	  }

	  if (t.isCallExpression(node)) {
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
 * Hook Extractors
 */

const t$5 = globalThis.__BABEL_TYPES__;
const { generateCSharpExpression: generateCSharpExpression$2 } = requireExpressions();
const { inferType } = typeConversion;

/**
 * Extract hook calls (useState, useClientState, etc.)
 */
function extractHook$1(path, component) {
  const node = path.node;

  if (!t$5.isIdentifier(node.callee)) return;

  const hookName = node.callee.name;

  switch (hookName) {
    case 'useState':
      extractUseState(path, component, 'useState');
      break;
    case 'useClientState':
      extractUseState(path, component, 'useClientState');
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
  }
}

/**
 * Extract useState or useClientState
 */
function extractUseState(path, component, hookType) {
  const parent = path.parent;

  if (!t$5.isVariableDeclarator(parent)) return;
  if (!t$5.isArrayPattern(parent.id)) return;

  const [stateVar, setterVar] = parent.id.elements;
  const initialValue = path.node.arguments[0];

  const stateInfo = {
    name: stateVar.name,
    setter: setterVar.name,
    initialValue: generateCSharpExpression$2(initialValue),
    type: inferType(initialValue)
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

  if (!t$5.isVariableDeclarator(parent)) return;

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

  if (!t$5.isVariableDeclarator(parent)) return;
  if (!t$5.isArrayPattern(parent.id)) return;

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

  if (t$5.isStringLiteral(templateName)) {
    component.useTemplate = {
      name: templateName.value,
      props: {}
    };

    // Extract template props if provided
    if (templateProps && t$5.isObjectExpression(templateProps)) {
      for (const prop of templateProps.properties) {
        if (t$5.isObjectProperty(prop) && t$5.isIdentifier(prop.key)) {
          const propName = prop.key.name;
          let propValue = '';

          if (t$5.isStringLiteral(prop.value)) {
            propValue = prop.value.value;
          } else if (t$5.isNumericLiteral(prop.value)) {
            propValue = prop.value.value.toString();
          } else if (t$5.isBooleanLiteral(prop.value)) {
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

  if (!t$5.isVariableDeclarator(parent)) return;

  const fieldName = parent.id.name;
  const fieldKey = path.node.arguments[0];
  const validationRules = path.node.arguments[1];

  const validationInfo = {
    name: fieldName,
    fieldKey: t$5.isStringLiteral(fieldKey) ? fieldKey.value : fieldName,
    rules: {}
  };

  // Extract validation rules from the object
  if (validationRules && t$5.isObjectExpression(validationRules)) {
    for (const prop of validationRules.properties) {
      if (t$5.isObjectProperty(prop) && t$5.isIdentifier(prop.key)) {
        const ruleName = prop.key.name;
        let ruleValue = null;

        if (t$5.isStringLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t$5.isNumericLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t$5.isBooleanLiteral(prop.value)) {
          ruleValue = prop.value.value;
        } else if (t$5.isRegExpLiteral(prop.value)) {
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

  if (!t$5.isVariableDeclarator(parent)) return;

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

  if (!t$5.isVariableDeclarator(parent)) return;
  if (!t$5.isArrayPattern(parent.id)) return;

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

  if (!t$5.isVariableDeclarator(parent)) return;

  const dropdownName = parent.id.name;
  const routeArg = path.node.arguments[0];

  let routeReference = null;

  // Try to extract route reference (e.g., Routes.Api.Units.GetAll)
  if (routeArg && t$5.isMemberExpression(routeArg)) {
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
  if (!t$5.isVariableDeclarator(parent)) return;

  const pubName = parent.id.name;
  const channel = path.node.arguments[0];

  component.usePub = component.usePub || [];
  component.usePub.push({
    name: pubName,
    channel: t$5.isStringLiteral(channel) ? channel.value : null
  });
}

/**
 * Extract useSub
 */
function extractUseSub(path, component) {
  const parent = path.parent;
  if (!t$5.isVariableDeclarator(parent)) return;

  const subName = parent.id.name;
  const channel = path.node.arguments[0];
  const callback = path.node.arguments[1];

  component.useSub = component.useSub || [];
  component.useSub.push({
    name: subName,
    channel: t$5.isStringLiteral(channel) ? channel.value : null,
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
    delay: t$5.isNumericLiteral(delay) ? delay.value : 0
  });
}

/**
 * Extract useSignalR
 */
function extractUseSignalR(path, component) {
  const parent = path.parent;
  if (!t$5.isVariableDeclarator(parent)) return;

  const signalRName = parent.id.name;
  const hubUrl = path.node.arguments[0];
  const onMessage = path.node.arguments[1];

  component.useSignalR = component.useSignalR || [];
  component.useSignalR.push({
    name: signalRName,
    hubUrl: t$5.isStringLiteral(hubUrl) ? hubUrl.value : null,
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
    hintId: t$5.isStringLiteral(hintId) ? hintId.value : null,
    predictedState: predictedState
  });
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
  extractUsePredictHint
};

/**
 * Local Variables Extractor
 */

const t$4 = globalThis.__BABEL_TYPES__;
const { generateCSharpExpression: generateCSharpExpression$1 } = requireExpressions();
const { tsTypeToCSharpType: tsTypeToCSharpType$1 } = typeConversion;

/**
 * Extract local variables (const/let/var) from function body
 */
function extractLocalVariables$1(path, component) {
  const declarations = path.node.declarations;

  for (const declarator of declarations) {
    // Skip if it's a hook call (already handled)
    if (t$4.isCallExpression(declarator.init)) {
      const callee = declarator.init.callee;
      if (t$4.isIdentifier(callee) && callee.name.startsWith('use')) {
        continue; // Skip hook calls
      }
    }

    // Check if this is an event handler (arrow function or function expression)
    if (t$4.isIdentifier(declarator.id) && declarator.init) {
      const varName = declarator.id.name;

      // If it's an arrow function or function expression, treat it as an event handler
      if (t$4.isArrowFunctionExpression(declarator.init) || t$4.isFunctionExpression(declarator.init)) {
        component.eventHandlers.push({
          name: varName,
          body: declarator.init.body,
          params: declarator.init.params
        });
        continue;
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
        initialValue: initValue
      });
    }
  }
}

var localVariables = {
  extractLocalVariables: extractLocalVariables$1
};

/**
 * Prop Type Inference
 * Infers C# types for props based on how they're used in the component
 */

const t$3 = globalThis.__BABEL_TYPES__;

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
    if (t$3.isBlockStatement(node)) {
      for (const statement of node.body) {
        analyzePropUsage(statement);
      }
      return;
    }

    // Handle VariableDeclaration
    if (t$3.isVariableDeclaration(node)) {
      for (const declarator of node.declarations) {
        if (declarator.init) {
          analyzePropUsage(declarator.init);
        }
      }
      return;
    }

    // Handle ReturnStatement
    if (t$3.isReturnStatement(node)) {
      analyzePropUsage(node.argument);
      return;
    }

    // Handle ExpressionStatement
    if (t$3.isExpressionStatement(node)) {
      analyzePropUsage(node.expression);
      return;
    }

    // Check if prop is used in conditional context (implies boolean)
    if (t$3.isConditionalExpression(node)) {
      const testName = extractPropName(node.test);
      if (testName && propUsage[testName]) {
        propUsage[testName].usedAsBoolean = true;
      }
      analyzePropUsage(node.consequent);
      analyzePropUsage(node.alternate);
    }

    // Check if prop is used in logical expression (implies boolean)
    if (t$3.isLogicalExpression(node)) {
      const leftName = extractPropName(node.left);
      if (leftName && propUsage[leftName]) {
        propUsage[leftName].usedAsBoolean = true;
      }
      analyzePropUsage(node.right);
    }

    // Check if prop is used with .map(), .filter(), etc (implies array)
    if (t$3.isCallExpression(node) && t$3.isMemberExpression(node.callee)) {
      const objectName = extractPropName(node.callee.object);
      const methodName = t$3.isIdentifier(node.callee.property) ? node.callee.property.name : null;

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
    if (t$3.isBinaryExpression(node)) {
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
    if (t$3.isMemberExpression(node)) {
      const objectName = extractPropName(node.object);
      const propertyName = t$3.isIdentifier(node.property) ? node.property.name : null;

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
    if (t$3.isJSXElement(node)) {
      for (const child of node.children) {
        analyzePropUsage(child);
      }
      for (const attr of node.openingElement.attributes) {
        if (t$3.isJSXAttribute(attr) && t$3.isJSXExpressionContainer(attr.value)) {
          analyzePropUsage(attr.value.expression);
        }
      }
    }

    if (t$3.isJSXExpressionContainer(node)) {
      analyzePropUsage(node.expression);
    }

    // Recurse into arrow functions
    if (t$3.isArrowFunctionExpression(node)) {
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
  if (t$3.isIdentifier(node)) {
    return node.name;
  }
  if (t$3.isMemberExpression(node)) {
    return extractPropName(node.object);
  }
  return null;
}

var propTypeInference = {
  inferPropTypes: inferPropTypes$1
};

/**
 * Component Processor
 *
 * Main entry point for processing a component function/class.
 */

const t$2 = globalThis.__BABEL_TYPES__;
const { getComponentName } = helpers;
const { tsTypeToCSharpType } = typeConversion;
const { extractHook } = hooks;
const { extractLocalVariables } = localVariables;
const { inferPropTypes } = propTypeInference;

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
    stateTypes: new Map(), // Track which hook each state came from
    dependencies: new Map() // Track dependencies per JSX node
  };

  // Extract props from function parameters
  const params = path.node.params;
  if (params.length > 0 && t$2.isObjectPattern(params[0])) {
    // Destructured props: function Component({ prop1, prop2 })
    // Check if there's a type annotation on the parameter
    const paramTypeAnnotation = params[0].typeAnnotation?.typeAnnotation;

    for (const property of params[0].properties) {
      if (t$2.isObjectProperty(property) && t$2.isIdentifier(property.key)) {
        let propType = 'dynamic';

        // Try to extract type from TypeScript annotation
        if (paramTypeAnnotation && t$2.isTSTypeLiteral(paramTypeAnnotation)) {
          const propName = property.key.name;
          const tsProperty = paramTypeAnnotation.members.find(
            member => t$2.isTSPropertySignature(member) &&
                     t$2.isIdentifier(member.key) &&
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
  } else if (params.length > 0 && t$2.isIdentifier(params[0])) {
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
    : t$2.blockStatement([t$2.returnStatement(path.node.body)]);

  // Extract hooks and local variables
  path.traverse({
    CallExpression(hookPath) {
      extractHook(hookPath, component);
    },

    VariableDeclaration(varPath) {
      // Only extract local variables at the top level of the function body
      if (varPath.getFunctionParent() === path && varPath.parent.type === 'BlockStatement') {
        extractLocalVariables(varPath, component);
      }
    },

    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === path) {
        // Deep clone the AST node to preserve it before we replace JSX with null
        component.renderBody = t$2.cloneNode(returnPath.node.argument, true);
      }
    }
  });

  // Infer prop types from usage BEFORE replacing JSX with null
  // Pass the entire function body to analyze all usage (including JSX)
  inferPropTypes(component, body);

  // Now replace JSX to prevent @babel/preset-react from transforming it
  path.traverse({
    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === path) {
        returnPath.node.argument = t$2.nullLiteral();
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

const t$1 = globalThis.__BABEL_TYPES__;
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
  if (t$1.isJSXElement(node) || t$1.isJSXFragment(node)) {
    return `${indentStr}return ${generateJSXElement(node, component, indent)};`;
  }

  if (t$1.isConditionalExpression(node)) {
    // Ternary: condition ? a : b
    return generateConditional(node, component, indent);
  }

  if (t$1.isLogicalExpression(node) && node.operator === '&&') {
    // Short-circuit: condition && <Element>
    return generateShortCircuit(node, component, indent);
  }

  if (t$1.isCallExpression(node) && t$1.isMemberExpression(node.callee) && node.callee.property.name === 'map') {
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
 * Component Generator
 */

const t = globalThis.__BABEL_TYPES__;
const { generateRenderBody } = renderBody;
const { generateCSharpExpression, generateCSharpStatement, setCurrentComponent } = requireExpressions();

/**
 * Generate C# class for a component
 */
function generateComponent$1(component) {
  // Set the current component context for useState setter detection
  setCurrentComponent(component);

  const lines = [];

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

  // Render method (or RenderContent for templates)
  const renderMethodName = component.useTemplate ? 'RenderContent' : 'Render';
  lines.push(`    protected override VNode ${renderMethodName}()`);
  lines.push('    {');

  // Only add StateManager sync if NOT using a template (templates handle this themselves)
  if (!component.useTemplate) {
    lines.push('        StateManager.SyncMembersToState(this);');
    lines.push('');
  }

  // Local variables
  for (const localVar of component.localVariables) {
    lines.push(`        ${localVar.type} ${localVar.name} = ${localVar.initialValue};`);
  }
  if (component.localVariables.length > 0) {
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

    lines.push(`    private void ${handler.name}(${paramStr})`);
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

  lines.push('}');

  return lines;
}

var component = {
  generateComponent: generateComponent$1
};

/**
 * C# File Generator
 */

const { generateComponent } = component;

/**
 * Generate C# file from components
 */
function generateCSharpFile$1(components, state) {
  const lines = [];

  // Usings
  lines.push('using Minimact.AspNetCore.Core;');
  lines.push('using Minimact.AspNetCore.Extensions;');
  lines.push('using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;');
  lines.push('using System.Collections.Generic;');
  lines.push('using System.Linq;');
  lines.push('using System.Threading.Tasks;');
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

// Modular imports
const { processComponent } = processComponent_1;
const { generateCSharpFile } = csharpFile;

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

export { indexFull$1 as default };
//# sourceMappingURL=minimact-babel-plugin.esm.js.map
