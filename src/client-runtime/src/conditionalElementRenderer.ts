/**
 * Conditional Element Template Renderer
 *
 * Renders complete DOM structures from conditional element templates.
 * This enables instant client-side construction of conditional elements
 * without waiting for server round-trip.
 *
 * Architecture:
 * 1. Evaluate condition expression (simple boolean logic)
 * 2. Select appropriate branch (true/false)
 * 3. Build DOM tree from element structure
 * 4. Fill dynamic bindings with current state
 * 5. Insert/replace in DOM at target path
 */

/**
 * Conditional element template structure
 */
export interface ConditionalElementTemplate {
  type: 'conditional-element';
  conditionExpression: string;
  conditionBindings: string[]; // State keys: ["state_0", "state_1"]
  conditionMapping?: Record<string, string>; // Variable name → state key: { "myState1": "state_0" }
  evaluable: boolean;
  branches: {
    true?: ElementStructure | null;
    false?: ElementStructure | null;
  };
  operator: '&&' | '?';
  parentTemplate?: string; // Parent conditional path for nested conditionals
  domPath?: number[]; // DEPRECATED: Use pathVariants instead
  pathVariants?: Record<string, number[] | null>; // Pre-computed paths for all state combinations
}

export interface ElementStructure {
  type: 'element' | 'fragment';
  tag?: string;
  hexPath?: string;
  attributes?: Record<string, string | { binding: string } | { expression: string }>;
  children?: Array<TextNode | ElementStructure>;
}

export interface TextNode {
  type: 'text';
  value?: string;
  binding?: string;
  expression?: string;
  hexPath?: string;
}

/**
 * Conditional Element Renderer
 */
export class ConditionalElementRenderer {
  // Track rendered conditional elements by path for nested resolution
  private renderedElements: Map<string, HTMLElement> = new Map();

  /**
   * Register a rendered conditional element
   */
  registerRenderedElement(path: string, element: HTMLElement): void {
    this.renderedElements.set(path, element);
  }

  /**
   * Unregister a conditional element (when removed)
   */
  unregisterRenderedElement(path: string): void {
    this.renderedElements.delete(path);
  }

  /**
   * Get rendered element for a conditional path
   */
  getRenderedElement(path: string): HTMLElement | undefined {
    return this.renderedElements.get(path);
  }

  /**
   * Evaluate a condition expression with current state
   * Supports: identifiers, &&, ||, !, comparisons
   */
  evaluateCondition(
    expression: string,
    mapping: Record<string, string> | undefined,
    state: Record<string, any>
  ): boolean {
    try {
      // Build evaluation context using variable names from mapping
      const context: Record<string, any> = {};

      if (mapping) {
        // Map: { "myState1": "state_0", "myState2": "state_1" }
        // Context: { "myState1": <value of state_0>, "myState2": <value of state_1> }
        for (const [varName, stateKey] of Object.entries(mapping)) {
          context[varName] = this.resolveBinding(state, stateKey);
        }
      }

      // Simple expression evaluation for common patterns
      // This is a safe subset - no arbitrary code execution
      return this.evaluateSafeExpression(expression, context);
    } catch (error) {
      console.error('[ConditionalElementRenderer] Failed to evaluate condition:', expression, error);
      return false;
    }
  }

  /**
   * Resolve a binding path from state
   * Example: "user.profile.name" → state.user.profile.name
   */
  private resolveBinding(state: Record<string, any>, binding: string): any {
    const parts = binding.split('.');
    let current: any = state;

    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Evaluate safe boolean expression
   * Supports: &&, ||, !, ==, ===, !=, !==, <, >, <=, >=
   */
  private evaluateSafeExpression(expression: string, context: Record<string, any>): boolean {
    // Remove whitespace for easier parsing
    const expr = expression.trim();

    // Handle negation: !myState1
    if (expr.startsWith('!') && !expr.includes(' ')) {
      const binding = expr.slice(1);
      return !context[binding];
    }

    // Handle logical AND: myState1 && !myState2
    if (expr.includes('&&')) {
      const parts = expr.split('&&').map(p => p.trim());
      return parts.every(part => this.evaluateSafeExpression(part, context));
    }

    // Handle logical OR: myState1 || myState2
    if (expr.includes('||')) {
      const parts = expr.split('||').map(p => p.trim());
      return parts.some(part => this.evaluateSafeExpression(part, context));
    }

    // Handle comparisons: count > 0, name === "admin"
    const comparisonOps = ['===', '!==', '==', '!=', '<=', '>=', '<', '>'];
    for (const op of comparisonOps) {
      if (expr.includes(op)) {
        const [left, right] = expr.split(op).map(p => p.trim());
        const leftVal = this.resolveValue(left, context);
        const rightVal = this.resolveValue(right, context);

        switch (op) {
          case '===': return leftVal === rightVal;
          case '!==': return leftVal !== rightVal;
          case '==': return leftVal == rightVal;
          case '!=': return leftVal != rightVal;
          case '<': return leftVal < rightVal;
          case '>': return leftVal > rightVal;
          case '<=': return leftVal <= rightVal;
          case '>=': return leftVal >= rightVal;
        }
      }
    }

    // Simple identifier: myState1
    if (context.hasOwnProperty(expr)) {
      return !!context[expr];
    }

    console.warn('[ConditionalElementRenderer] Could not evaluate expression:', expr);
    return false;
  }

  /**
   * Resolve a value (identifier or literal)
   */
  private resolveValue(value: string, context: Record<string, any>): any {
    // String literal: "admin"
    if (value.startsWith('"') || value.startsWith("'")) {
      return value.slice(1, -1);
    }

    // Number literal: 42, 3.14
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // Boolean literal: true, false
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Null/undefined
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Identifier from context
    if (context.hasOwnProperty(value)) {
      return context[value];
    }

    return undefined;
  }

  /**
   * Build DOM element from element structure template
   */
  buildElement(
    structure: ElementStructure,
    state: Record<string, any>
  ): HTMLElement | DocumentFragment {
    if (structure.type === 'fragment') {
      const fragment = document.createDocumentFragment();
      for (const child of structure.children || []) {
        if ('tag' in child || child.type === 'fragment' || child.type === 'element') {
          fragment.appendChild(this.buildElement(child as ElementStructure, state));
        } else {
          fragment.appendChild(this.buildTextNode(child as TextNode, state));
        }
      }
      return fragment;
    }

    // Create element
    const element = document.createElement(structure.tag!);

    // Set attributes
    if (structure.attributes) {
      for (const [key, value] of Object.entries(structure.attributes)) {
        if (typeof value === 'string') {
          // Static attribute
          element.setAttribute(key, value);
        } else if (value && typeof value === 'object') {
          if ('binding' in value) {
            // Dynamic attribute from state
            const attrValue = this.resolveBinding(state, value.binding);
            if (attrValue != null) {
              element.setAttribute(key, String(attrValue));
            }
          } else if ('expression' in value) {
            // Complex expression - skip for now (requires server)
            console.warn('[ConditionalElementRenderer] Complex attribute expression not supported:', value.expression);
          }
        }
      }
    }

    // Add children
    if (structure.children) {
      for (const child of structure.children) {
        if ('tag' in child || child.type === 'fragment' || child.type === 'element') {
          element.appendChild(this.buildElement(child as ElementStructure, state));
        } else {
          element.appendChild(this.buildTextNode(child as TextNode, state));
        }
      }
    }

    return element;
  }

  /**
   * Build text node from template
   */
  private buildTextNode(node: TextNode, state: Record<string, any>): Text {
    if (node.value !== undefined) {
      // Static text
      return document.createTextNode(node.value);
    } else if (node.binding) {
      // Dynamic text from state
      const value = this.resolveBinding(state, node.binding);
      return document.createTextNode(value != null ? String(value) : '');
    } else if (node.expression) {
      // Complex expression - return empty for now
      console.warn('[ConditionalElementRenderer] Complex text expression not supported:', node.expression);
      return document.createTextNode('');
    }
    return document.createTextNode('');
  }

  /**
   * Render conditional element and apply to DOM
   * Returns the rendered element (or null if condition is false)
   */
  render(
    pathKey: string,
    template: ConditionalElementTemplate,
    state: Record<string, any>,
    parentElement: HTMLElement,
    insertIndex: number
  ): HTMLElement | null {
    // 1. Evaluate condition
    const conditionResult = template.evaluable
      ? this.evaluateCondition(template.conditionExpression, template.conditionMapping, state)
      : false; // If not evaluable, wait for server

    if (!template.evaluable) {
      console.log('[ConditionalElementRenderer] Condition not evaluable client-side, waiting for server:', template.conditionExpression);
      return null;
    }

    // 2. Select branch
    const branch = conditionResult ? template.branches.true : template.branches.false;

    if (!branch) {
      // Condition is false and no false branch - remove element if exists
      const existingNode = parentElement.childNodes[insertIndex];
      if (existingNode) {
        parentElement.removeChild(existingNode);
      }
      // Unregister this element
      this.unregisterRenderedElement(pathKey);
      return null;
    }

    // 3. Build element from template
    const newElement = this.buildElement(branch, state);

    // 4. Insert or replace in DOM
    const existingNode = parentElement.childNodes[insertIndex];
    if (existingNode) {
      parentElement.replaceChild(newElement, existingNode);
    } else {
      if (insertIndex < parentElement.childNodes.length) {
        parentElement.insertBefore(newElement, parentElement.childNodes[insertIndex]);
      } else {
        parentElement.appendChild(newElement);
      }
    }

    // 5. Register rendered element for nested conditionals
    if (newElement instanceof HTMLElement) {
      this.registerRenderedElement(pathKey, newElement);
      return newElement;
    }

    return null;
  }
}
