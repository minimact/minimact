import { TemplatePatch, Patch } from './types';

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
      const conditionValue = stateValues[conditionBinding];

      // Lookup the template for this condition value
      const conditionalTemplate = templatePatch.conditionalTemplates[String(conditionValue)];

      if (conditionalTemplate !== undefined) {
        // If it's a simple conditional (just maps to string), return it
        if (!conditionalTemplate.includes('{')) {
          return conditionalTemplate;
        }

        // Otherwise, it's a conditional template with other bindings
        const params = templatePatch.bindings.map(binding => stateValues[binding]);
        return this.renderTemplate(conditionalTemplate, params);
      }
    }

    // Standard template rendering
    const params = templatePatch.bindings.map(binding => {
      return stateValues[binding];
    });

    return this.renderTemplate(templatePatch.template, params);
  }

  /**
   * Convert a template patch to a concrete patch with current state
   *
   * @param patch - Template patch (UpdateTextTemplate or UpdatePropsTemplate)
   * @param stateValues - Current state values
   * @returns Concrete patch (UpdateText or UpdateProps)
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
  ): Patch {
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
    return patches.map(patch => this.materializePatch(patch, stateValues));
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
      return patch.templatePatch.bindings;
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
    return templatePatch.bindings.every(binding => binding in stateValues);
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
    return templatePatch.bindings.filter(binding => !(binding in stateValues));
  }
}
