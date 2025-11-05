/**
 * JSON Node Type Definitions for Minimact Transpiler
 *
 * These node types form the intermediate representation (IR) between
 * Babel's JSX parsing and C#'s code generation.
 *
 * Each node type maps to a C# class for deserialization and visitor pattern processing.
 */

/**
 * Base node properties shared by all node types
 * @typedef {Object} BaseNode
 * @property {string} type - Discriminator for C# deserialization
 * @property {string} path - Hex path (e.g., "10000000.20000000")
 * @property {string[]} pathSegments - Parsed segments (e.g., ["10000000", "20000000"])
 */

/**
 * Root component definition
 * @typedef {Object} ComponentNode
 * @property {'Component'} type
 * @property {string} componentName - C# class name (e.g., "TodoList")
 * @property {RenderMethodNode} renderMethod - The Render() method body
 * @property {Object.<string, string>} imports - Import statements (for future use)
 */

/**
 * Render method container
 * @typedef {Object} RenderMethodNode
 * @property {'RenderMethod'} type
 * @property {BaseNode[]} children - Top-level JSX elements
 */

/**
 * JSX Element (e.g., <div>, <span>, <button>)
 * @typedef {BaseNode} JSXElementNode
 * @property {'JSXElement'} type
 * @property {string} tag - Element tag name (e.g., "div", "button")
 * @property {boolean} isStructural - True if element has no dynamic content (optimization hint)
 * @property {AttributeTemplateNode[]} attributes - Element attributes
 * @property {BaseNode[]} children - Child nodes
 */

/**
 * Text template with dynamic bindings
 * Example: "Count: {0}" with bindings: ["count"]
 * @typedef {BaseNode} TextTemplateNode
 * @property {'TextTemplate'} type
 * @property {string} template - Template string with {0}, {1}... placeholders
 * @property {string[]} bindings - State/prop bindings (e.g., ["count", "user.name"])
 * @property {number[]} slots - Slot indices (e.g., [0, 1])
 */

/**
 * Attribute template with dynamic bindings
 * Example: className="count-{0}" with bindings: ["count"]
 * @typedef {BaseNode} AttributeTemplateNode
 * @property {'AttributeTemplate'} type
 * @property {string} attribute - Attribute name (e.g., "className", "style")
 * @property {string} template - Template string with placeholders
 * @property {string[]} bindings - State/prop bindings
 * @property {number[]} slots - Slot indices
 * @property {string} [subtype] - Optional subtype (e.g., "style-object" for style={{...}})
 */

/**
 * Loop template (Array.map)
 * Example: todos.map((todo, i) => <li>...</li>)
 * @typedef {BaseNode} LoopTemplateNode
 * @property {'LoopTemplate'} type
 * @property {string} binding - Array binding (e.g., "todos")
 * @property {string} itemVar - Item variable name (e.g., "todo")
 * @property {string} [indexVar] - Index variable name (e.g., "i") - optional
 * @property {JSXElementNode} body - Loop body (single JSX element)
 */

/**
 * Conditional template (ternary or logical AND)
 * Example: {isAdmin ? <AdminPanel/> : <UserPanel/>}
 * Example: {isVisible && <Modal/>}
 * @typedef {BaseNode} ConditionalTemplateNode
 * @property {'ConditionalTemplate'} type
 * @property {string} condition - Condition binding (e.g., "isAdmin", "isVisible")
 * @property {string} operator - Operator type: "ternary", "and", "or"
 * @property {BaseNode} consequent - True branch (if/then)
 * @property {BaseNode} [alternate] - False branch (else) - optional for logical AND
 */

/**
 * Static text node (no bindings)
 * Example: <p>Hello World</p>
 * @typedef {BaseNode} StaticTextNode
 * @property {'StaticText'} type
 * @property {string} content - Static text content
 */

/**
 * Complex expression template (needs C# evaluation)
 * Example: {count * 2 + 1} → template: "{0} * 2 + 1", bindings: ["count"]
 * Example: {Math.floor(price * 1.2)} → template: "Math.floor({0} * 1.2)", bindings: ["price"]
 * @typedef {BaseNode} ComplexTemplateNode
 * @property {'ComplexTemplate'} type
 * @property {string} template - Expression template with {0}, {1}... placeholders
 * @property {string[]} bindings - State/prop bindings (e.g., ["price", "tax"])
 * @property {Object} expressionTree - AST of the expression for C# evaluation
 */

// ============================================================================
// Factory functions for creating nodes
// ============================================================================

/**
 * Create a Component node
 */
function createComponent(componentName, renderMethod, hooks, eventHandlers) {
  return {
    type: 'Component',
    componentName,
    renderMethod,
    imports: {},
    hooks: hooks || {
      useState: [],
      useMvcState: [],
      useMvcViewModel: null,
      useEffect: [],
      useRef: []
    },
    eventHandlers: eventHandlers || []
  };
}

/**
 * Create a RenderMethod node
 */
function createRenderMethod(children = []) {
  return {
    type: 'RenderMethod',
    children
  };
}

/**
 * Create a JSXElement node
 */
function createJSXElement(tag, path, pathSegments, attributes = [], children = [], isStructural = false) {
  return {
    type: 'JSXElement',
    tag,
    path,
    pathSegments,
    isStructural,
    attributes,
    children
  };
}

/**
 * Create a TextTemplate node
 */
function createTextTemplate(path, pathSegments, template, bindings, slots) {
  return {
    type: 'TextTemplate',
    path,
    pathSegments,
    template,
    bindings,
    slots
  };
}

/**
 * Create a StaticText node
 */
function createStaticText(path, pathSegments, content) {
  return {
    type: 'StaticText',
    path,
    pathSegments,
    content
  };
}

/**
 * Create an AttributeTemplate node
 */
function createAttributeTemplate(path, pathSegments, attribute, template, bindings, slots, subtype = null) {
  const node = {
    type: 'AttributeTemplate',
    path,
    pathSegments,
    attribute,
    template,
    bindings,
    slots
  };

  if (subtype) {
    node.subtype = subtype;
  }

  return node;
}

/**
 * Create a LoopTemplate node
 */
function createLoopTemplate(path, pathSegments, binding, itemVar, body, indexVar = null) {
  const node = {
    type: 'LoopTemplate',
    path,
    pathSegments,
    binding,
    itemVar,
    body
  };

  if (indexVar) {
    node.indexVar = indexVar;
  }

  return node;
}

/**
 * Create a ConditionalTemplate node
 */
function createConditionalTemplate(path, pathSegments, condition, operator, consequent, alternate = null) {
  const node = {
    type: 'ConditionalTemplate',
    path,
    pathSegments,
    condition,
    operator,
    consequent
  };

  if (alternate) {
    node.alternate = alternate;
  }

  return node;
}

/**
 * Create a ComplexTemplate node
 */
function createComplexTemplate(path, pathSegments, template, bindings, expressionTree) {
  return {
    type: 'ComplexTemplate',
    path,
    pathSegments,
    template,
    bindings,
    expressionTree
  };
}

module.exports = {
  // Factory functions
  createComponent,
  createRenderMethod,
  createJSXElement,
  createTextTemplate,
  createStaticText,
  createAttributeTemplate,
  createLoopTemplate,
  createConditionalTemplate,
  createComplexTemplate
};
