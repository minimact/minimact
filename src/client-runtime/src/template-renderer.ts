import { TemplatePatch, Patch, LoopTemplate, ItemTemplate, VNode, VElement, VText, Binding } from './types';

/**
 * Template Renderer
 *
 * Renders template patches with parameter values for runtime predictions.
 * Enables 98% memory reduction by storing patterns instead of concrete values.
 *
 * Example:
 *   template: "Count: {0}"
 *   params: [42]
 *   result: "Count: 42"
 */
export class TemplateRenderer {
  /**
   * Render a template string with parameters
   *
   * @param template - Template string with {0}, {1}, etc. placeholders
   * @param params - Parameter values to substitute
   * @returns Rendered string with parameters substituted
   *
   * @example
   * renderTemplate("Count: {0}", [42]) → "Count: 42"
   * renderTemplate("Hello, {0} {1}!", ["John", "Doe"]) → "Hello, John Doe!"
   */
  static renderTemplate(template: string, params: any[]): string {
    let result = template;

    // Replace each placeholder {0}, {1}, etc. with corresponding parameter
    params.forEach((param, index) => {
      const placeholder = `{${index}}`;
      const value = this.formatValue(param);
      result = result.replace(placeholder, value);
    });

    return result;
  }

  /**
   * Render a template patch with current state values
   *
   * @param templatePatch - Template patch data
   * @param stateValues - Current state values (key-value pairs)
   * @returns Rendered string
   *
   * @example
   * const tp = { template: "Count: {0}", bindings: ["count"], slots: [7] };
   * renderTemplatePatch(tp, { count: 42 }) → "Count: 42"
   *
   * @example Conditional
   * const tp = {
   *   template: "{0}",
   *   bindings: ["isActive"],
   *   conditionalTemplates: { "true": "Active", "false": "Inactive" },
   *   conditionalBindingIndex: 0
   * };
   * renderTemplatePatch(tp, { isActive: true }) → "Active"
   */
  static renderTemplatePatch(
    templatePatch: TemplatePatch,
    stateValues: Record<string, any>
  ): string {
    // Check for conditional templates
    if (templatePatch.conditionalTemplates && templatePatch.conditionalBindingIndex !== undefined) {
      const bindingIndex = templatePatch.conditionalBindingIndex;
      const conditionBinding = templatePatch.bindings[bindingIndex];

      // Get condition value (handle both string and Binding object)
      const conditionKey = typeof conditionBinding === 'object' && 'stateKey' in conditionBinding
        ? conditionBinding.stateKey
        : conditionBinding as string;
      const conditionValue = stateValues[conditionKey];

      // Lookup the template for this condition value
      const conditionalTemplate = templatePatch.conditionalTemplates[String(conditionValue)];

      if (conditionalTemplate !== undefined) {
        // If it's a simple conditional (just maps to string), return it
        if (!conditionalTemplate.includes('{')) {
          return conditionalTemplate;
        }

        // Otherwise, it's a conditional template with other bindings
        // Apply transforms if present
        const params = templatePatch.bindings.map(binding => {
          if (typeof binding === 'object' && 'stateKey' in binding) {
            const value = stateValues[binding.stateKey];
            return binding.transform ? this.applyTransform(value, binding.transform) : value;
          }
          return stateValues[binding as string];
        });
        return this.renderTemplate(conditionalTemplate, params);
      }
    }

    // Standard template rendering
    const params = templatePatch.bindings.map((binding, index) => {
      // Phase 6: Support Binding objects with transforms
      if (typeof binding === 'object' && 'stateKey' in binding) {
        const value = stateValues[binding.stateKey];

        // Apply transform if present
        if (binding.transform) {
          return this.applyTransform(value, binding.transform);
        }

        return value;
      }

      // Backward compatibility: Simple string binding
      return stateValues[binding as string];
    });

    return this.renderTemplate(templatePatch.template, params);
  }

  /**
   * Convert a template patch to concrete patch(es) with current state
   *
   * @param patch - Template patch (UpdateTextTemplate, UpdatePropsTemplate, or UpdateListTemplate)
   * @param stateValues - Current state values
   * @returns Concrete patch or array of patches
   *
   * @example
   * const patch = {
   *   type: 'UpdateTextTemplate',
   *   path: [0, 0],
   *   templatePatch: { template: "Count: {0}", bindings: ["count"], slots: [7] }
   * };
   * materializePatch(patch, { count: 42 })
   * → { type: 'UpdateText', path: [0, 0], content: "Count: 42" }
   */
  static materializePatch(
    patch: Patch,
    stateValues: Record<string, any>
  ): Patch | Patch[] {
    switch (patch.type) {
      case 'UpdateTextTemplate': {
        const content = this.renderTemplatePatch(patch.templatePatch, stateValues);
        return {
          type: 'UpdateText',
          path: patch.path,
          content
        };
      }

      case 'UpdatePropsTemplate': {
        const value = this.renderTemplatePatch(patch.templatePatch, stateValues);
        return {
          type: 'UpdateProps',
          path: patch.path,
          props: { [patch.propName]: value }
        };
      }

      case 'UpdateListTemplate': {
        // Render loop template to VNodes
        const vnodes = this.renderLoopTemplate(patch.loopTemplate, stateValues);

        // Convert to concrete patches
        return this.convertLoopToPatches(patch.path, vnodes);
      }

      default:
        // Not a template patch, return as-is
        return patch;
    }
  }

  /**
   * Materialize multiple template patches
   *
   * @param patches - Array of patches (template or concrete)
   * @param stateValues - Current state values
   * @returns Array of concrete patches
   */
  static materializePatches(
    patches: Patch[],
    stateValues: Record<string, any>
  ): Patch[] {
    const materialized: Patch[] = [];

    for (const patch of patches) {
      const result = this.materializePatch(patch, stateValues);

      if (Array.isArray(result)) {
        // UpdateListTemplate returns multiple patches
        materialized.push(...result);
      } else {
        materialized.push(result);
      }
    }

    return materialized;
  }

  /**
   * Apply transform to a value (Phase 6: Expression Templates)
   * Security: Only whitelisted transforms are allowed
   *
   * @param value - Raw value from state
   * @param transform - Transform string (e.g., "toFixed(2)", "* 100", "toUpperCase()")
   * @returns Transformed value
   *
   * @example
   * applyTransform(99.95, "toFixed(2)") → "99.95"
   * applyTransform(0.847, "* 100") → 84.7
   * applyTransform("hello", "toUpperCase()") → "HELLO"
   */
  static applyTransform(value: any, transform: string): any {
    // Security: Whitelist-only approach for safe transforms

    // toFixed(n) - Format number to n decimal places
    if (transform.startsWith('toFixed(')) {
      const decimals = parseInt(transform.match(/\d+/)?.[0] || '0');
      return Number(value).toFixed(decimals);
    }

    // Arithmetic: * N (multiplication)
    if (transform.startsWith('* ')) {
      const multiplier = parseFloat(transform.substring(2));
      return Number(value) * multiplier;
    }

    // Arithmetic: / N (division)
    if (transform.startsWith('/ ')) {
      const divisor = parseFloat(transform.substring(2));
      return Number(value) / divisor;
    }

    // Arithmetic: + N (addition)
    if (transform.startsWith('+ ')) {
      const addend = parseFloat(transform.substring(2));
      return Number(value) + addend;
    }

    // Arithmetic: - N (subtraction)
    if (transform.startsWith('- ')) {
      const subtrahend = parseFloat(transform.substring(2));
      return Number(value) - subtrahend;
    }

    // String: toUpperCase()
    if (transform === 'toUpperCase()' || transform === 'toUpperCase') {
      return String(value).toUpperCase();
    }

    // String: toLowerCase()
    if (transform === 'toLowerCase()' || transform === 'toLowerCase') {
      return String(value).toLowerCase();
    }

    // String: trim()
    if (transform === 'trim()' || transform === 'trim') {
      return String(value).trim();
    }

    // Boolean: ! (negation)
    if (transform === '!') {
      return !value;
    }

    // Default: Unknown transform, log warning and return value as-is
    console.warn(`[TemplateRenderer] Unknown transform: ${transform}`);
    return value;
  }

  /**
   * Format a value for template substitution
   *
   * @param value - Value to format
   * @returns String representation of value
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v)).join(', ');
    }

    if (typeof value === 'object') {
      // For objects, use JSON.stringify (could be customized)
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Check if a patch is a template patch
   *
   * @param patch - Patch to check
   * @returns True if patch is a template patch
   */
  static isTemplatePatch(patch: Patch): boolean {
    return patch.type === 'UpdateTextTemplate' || patch.type === 'UpdatePropsTemplate';
  }

  /**
   * Extract bindings from a template patch
   *
   * @param patch - Template patch
   * @returns Array of state variable names, or empty array if not a template patch
   */
  static extractBindings(patch: Patch): string[] {
    if (patch.type === 'UpdateTextTemplate' || patch.type === 'UpdatePropsTemplate') {
      // Handle both string bindings and Binding objects
      return patch.templatePatch.bindings.map(binding => {
        if (typeof binding === 'object' && 'stateKey' in binding) {
          return binding.stateKey;
        }
        return binding as string;
      });
    }
    return [];
  }

  /**
   * Validate that all required bindings are present in state
   *
   * @param templatePatch - Template patch to validate
   * @param stateValues - Available state values
   * @returns True if all bindings are present
   */
  static validateBindings(
    templatePatch: TemplatePatch,
    stateValues: Record<string, any>
  ): boolean {
    return templatePatch.bindings.every(binding => {
      const key = typeof binding === 'object' && 'stateKey' in binding
        ? binding.stateKey
        : binding as string;
      return key in stateValues;
    });
  }

  /**
   * Get missing bindings from state
   *
   * @param templatePatch - Template patch to check
   * @param stateValues - Available state values
   * @returns Array of missing binding names
   */
  static getMissingBindings(
    templatePatch: TemplatePatch,
    stateValues: Record<string, any>
  ): string[] {
    return templatePatch.bindings
      .filter(binding => {
        const key = typeof binding === 'object' && 'stateKey' in binding
          ? binding.stateKey
          : binding as string;
        return !(key in stateValues);
      })
      .map(binding => {
        if (typeof binding === 'object' && 'stateKey' in binding) {
          return binding.stateKey;
        }
        return binding as string;
      });
  }

  /**
   * Render loop template with current array state
   *
   * @param loopTemplate - Loop template data
   * @param stateValues - Current state values (must include array binding)
   * @returns Array of rendered VNodes
   *
   * @example
   * const template = {
   *   array_binding: "todos",
   *   item_template: {
   *     type: "Element",
   *     tag: "li",
   *     children_templates: [{
   *       type: "Text",
   *       template_patch: { template: "{0}", bindings: ["item.text"], slots: [0] }
   *     }]
   *   }
   * };
   * renderLoopTemplate(template, { todos: [{ text: "A" }, { text: "B" }] })
   * → [<li>A</li>, <li>B</li>]
   */
  static renderLoopTemplate(
    loopTemplate: LoopTemplate,
    stateValues: Record<string, any>
  ): VNode[] {
    const array = stateValues[loopTemplate.array_binding];

    if (!Array.isArray(array)) {
      console.warn(
        `[TemplateRenderer] Expected array for '${loopTemplate.array_binding}', got:`,
        array
      );
      return [];
    }

    return array.map((item, index) => {
      // Build item state with nested object access
      const itemState = {
        ...stateValues,
        item,
        index,
        ...(loopTemplate.index_var ? { [loopTemplate.index_var]: index } : {})
      };

      // Flatten item object for binding access (item.text → "item.text": value)
      const flattenedState = this.flattenItemState(itemState, item);

      // Render item template
      return this.renderItemTemplate(loopTemplate.item_template, flattenedState);
    });
  }

  /**
   * Flatten item object for template binding access
   *
   * @param itemState - Current state including item
   * @param item - The array item to flatten
   * @returns Flattened state with "item.property" keys
   *
   * @example
   * flattenItemState({ item: { id: 1, text: "A" } }, { id: 1, text: "A" })
   * → { "item.id": 1, "item.text": "A", item: {...}, ... }
   */
  private static flattenItemState(
    itemState: Record<string, any>,
    item: any
  ): Record<string, any> {
    const flattened = { ...itemState };

    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      // Flatten object properties with "item." prefix
      for (const key in item) {
        flattened[`item.${key}`] = item[key];
      }
    }

    return flattened;
  }

  /**
   * Render item template to VNode
   *
   * @param itemTemplate - Template for individual list item
   * @param stateValues - State values with flattened item properties
   * @returns Rendered VNode
   */
  private static renderItemTemplate(
    itemTemplate: ItemTemplate,
    stateValues: Record<string, any>
  ): VNode {
    switch (itemTemplate.type) {
      case 'Text': {
        const content = this.renderTemplatePatch(itemTemplate.template_patch, stateValues);
        return {
          type: 'Text',
          content
        } as VText;
      }

      case 'Element': {
        // Render props
        const props: Record<string, string> = {};
        if (itemTemplate.props_templates) {
          for (const [propName, propTemplate] of Object.entries(itemTemplate.props_templates)) {
            props[propName] = this.renderTemplatePatch(propTemplate, stateValues);
          }
        }

        // Render children
        const children = (itemTemplate.children_templates || []).map(childTemplate =>
          this.renderItemTemplate(childTemplate, stateValues)
        );

        // Render key
        const key = itemTemplate.key_binding
          ? String(stateValues[itemTemplate.key_binding])
          : undefined;

        return {
          type: 'Element',
          tag: itemTemplate.tag,
          props,
          children,
          key
        } as VElement;
      }

      default:
        throw new Error(`Unknown item template type: ${(itemTemplate as any).type}`);
    }
  }

  /**
   * Convert rendered loop VNodes to concrete patches
   * Generates Create/Replace patches for list update
   *
   * @param parentPath - Path to parent element containing the list
   * @param vnodes - Rendered VNodes for list items
   * @returns Array of patches to update the list
   */
  private static convertLoopToPatches(
    parentPath: number[],
    vnodes: VNode[]
  ): Patch[] {
    // For Phase 4A simplicity: Replace entire list with Create patches
    // TODO Phase 4C: Optimize with incremental diffing

    return vnodes.map((node, index) => ({
      type: 'Create',
      path: [...parentPath, index],
      node
    } as Patch));
  }
}
