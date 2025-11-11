/**
 * Template State Manager - Client-Side Template Rendering
 *
 * Manages "virtual state" for text nodes using parameterized templates.
 * This enables instant hot reload with 100% coverage and minimal memory.
 *
 * Architecture:
 * - Templates loaded from .templates.json at component init
 * - State changes trigger template re-rendering
 * - Hot reload updates templates without server round-trip
 *
 * Memory: ~2KB per component (vs 100KB with prediction-based approach)
 * Coverage: 100% (works with any value)
 * Latency: <5ms for template updates
 */

import type { ConditionalElementTemplate } from './conditionalElementRenderer';

export interface Template {
  /** Template string with {0}, {1}, etc. placeholders */
  template: string;
  /** State bindings that fill the template slots */
  bindings: string[];
  /** Character positions where params are inserted */
  slots: number[];
  /** DOM hex path to the text node (e.g., "10000000.20000000") */
  path: string;
  /** Template type: static | dynamic | attribute */
  type: 'static' | 'dynamic' | 'attribute';
  /** Attribute name (only for attribute templates) */
  attribute?: string;
}

export interface TemplateMap {
  component: string;
  version: string;
  generatedAt: number;
  templates: Record<string, Template>;
  conditionalElements?: Record<string, ConditionalElementTemplate>;
}

export interface TemplatePatch {
  type: 'UpdateTextTemplate' | 'UpdatePropTemplate';
  componentId: string;
  path: number[]; // DOM index path [0, 2, 1]
  template: string;
  params: any[];
  bindings: string[];
  slots: number[];
  attribute?: string;
}

/**
 * Template State Manager - Simplified for template rendering only
 * Server now handles all path navigation via DOM indices
 */
export class TemplateStateManager {
  private templates: Map<string, Template> = new Map();
  private conditionalElements: Map<string, ConditionalElementTemplate> = new Map();
  private componentStates: Map<string, Map<string, any>> = new Map();

  /**
   * Initialize templates from .templates.json file
   */
  loadTemplateMap(componentId: string, templateMap: TemplateMap): void {
    console.log(`[TemplateState] Loading ${Object.keys(templateMap.templates).length} templates for ${componentId}`);

    for (const [nodePath, template] of Object.entries(templateMap.templates)) {
      const key = `${componentId}:${nodePath}`;

      // Normalize: Server sends 'templateString', client expects 'template'
      const normalized: Template = {
        template: (template as any).templateString || (template as any).template,
        bindings: template.bindings,
        slots: template.slots,
        path: template.path,
        type: template.type
      };

      this.templates.set(key, normalized);
    }

    // Load conditional element templates
    if (templateMap.conditionalElements) {
      const conditionalCount = Object.keys(templateMap.conditionalElements).length;
      console.log(`[TemplateState] Loading ${conditionalCount} conditional element templates for ${componentId}`);

      for (const [hexPath, conditionalTemplate] of Object.entries(templateMap.conditionalElements)) {
        const key = `${componentId}:${hexPath}`;
        this.conditionalElements.set(key, conditionalTemplate);
      }
    }

    // Initialize component state tracking
    if (!this.componentStates.has(componentId)) {
      this.componentStates.set(componentId, new Map());
    }
  }

  /**
   * Register a template for a specific node path
   */
  registerTemplate(
    componentId: string,
    nodePath: string,
    template: Template
  ): void {
    const key = `${componentId}:${nodePath}`;
    this.templates.set(key, template);
  }

  /**
   * Get template by component ID and node path
   */
  getTemplate(componentId: string, nodePath: string): Template | undefined {
    const key = `${componentId}:${nodePath}`;
    return this.templates.get(key);
  }

  /**
   * Get all templates for a component
   */
  getComponentTemplates(componentId: string): Map<string, Template> {
    const result = new Map<string, Template>();

    for (const [key, template] of this.templates.entries()) {
      if (key.startsWith(`${componentId}:`)) {
        const nodePath = key.substring(componentId.length + 1);
        result.set(nodePath, template);
      }
    }

    return result;
  }

  /**
   * Get templates bound to a specific state variable
   */
  getTemplatesBoundTo(componentId: string, stateKey: string): Template[] {
    const templates: Template[] = [];

    for (const [key, template] of this.templates.entries()) {
      if (key.startsWith(`${componentId}:`) && template.bindings.includes(stateKey)) {
        templates.push(template);
      }
    }

    return templates;
  }

  /**
   * Get conditional element templates that depend on a specific state variable
   */
  getConditionalElementsBoundTo(componentId: string, stateKey: string): Array<{ pathKey: string, template: ConditionalElementTemplate }> {
    const conditionals: Array<{ pathKey: string, template: ConditionalElementTemplate }> = [];

    for (const [key, template] of this.conditionalElements.entries()) {
      if (key.startsWith(`${componentId}:`) && template.conditionBindings.includes(stateKey)) {
        const pathKey = key.substring(componentId.length + 1);
        conditionals.push({ pathKey, template });
      }
    }

    return conditionals;
  }

  /**
   * Get all component state as a flat object (for condition evaluation)
   */
  getAllComponentState(componentId: string): Record<string, any> {
    const stateMap = this.componentStates.get(componentId);
    if (!stateMap) return {};

    const result: Record<string, any> = {};
    for (const [key, value] of stateMap.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Update component state (from useState)
   */
  updateState(componentId: string, stateKey: string, value: any): void {
    let state = this.componentStates.get(componentId);
    if (!state) {
      state = new Map();
      this.componentStates.set(componentId, state);
    }
    state.set(stateKey, value);
  }

  /**
   * Get component state value
   */
  getStateValue(componentId: string, stateKey: string): any {
    return this.componentStates.get(componentId)?.get(stateKey);
  }

  /**
   * Render template with current state values
   */
  render(componentId: string, nodePath: string): string | null {
    const template = this.getTemplate(componentId, nodePath);
    if (!template) return null;

    // Get state values for bindings
    const params = template.bindings.map(binding =>
      this.getStateValue(componentId, binding)
    );

    return this.renderWithParams(template.template, params);
  }

  /**
   * Render template with specific parameter values
   */
  renderWithParams(template: string, params: any[]): string {
    let result = template;

    // Replace {0}, {1}, etc. with parameter values
    params.forEach((param, index) => {
      const placeholder = `{${index}}`;
      const value = param !== undefined && param !== null ? String(param) : '';
      result = result.replace(placeholder, value);
    });

    return result;
  }

  /**
   * Apply template patch from hot reload
   */
  applyTemplatePatch(patch: TemplatePatch): { text: string; path: number[] } | null {
    const { componentId, path, template, params, bindings, slots, attribute } = patch;

    // Get current state values from client (not stale params from server!)
    const currentParams: any[] = [];
    for (const binding of bindings) {
      const value = this.getStateValue(componentId, binding);
      currentParams.push(value !== undefined ? value : params[currentParams.length]);
    }

    // Render template with current client state
    const text = this.renderWithParams(template, currentParams);

    // Build node path key from DOM index path array
    // Example: [0, 2, 1] → "0_2_1"
    const nodePath = this.buildNodePathKey(path);
    const key = `${componentId}:${nodePath}`;

    // Update stored template
    const existingTemplate = this.templates.get(key);
    if (existingTemplate) {
      existingTemplate.template = template;
      existingTemplate.bindings = bindings;
      existingTemplate.slots = slots;
      if (attribute) {
        existingTemplate.attribute = attribute;
      }
    } else {
      // Register new template
      this.templates.set(key, {
        template,
        bindings,
        slots,
        path: path.join('.'), // Store as string for compatibility
        type: attribute ? 'attribute' : 'dynamic',
        attribute
      });
    }

    console.log(`[TemplateState] Applied template patch: "${template}" → "${text}"`);

    return { text, path };
  }

  /**
   * Build node path key from DOM index path array
   * Example: [0, 2, 1] → "0_2_1"
   */
  private buildNodePathKey(path: number[]): string {
    return path.join('_');
  }

  /**
   * Clear all templates for a component
   */
  clearComponent(componentId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.templates.keys()) {
      if (key.startsWith(`${componentId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.templates.delete(key);
    }

    this.componentStates.delete(componentId);
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
    this.componentStates.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    const componentCount = this.componentStates.size;
    const templateCount = this.templates.size;

    // Estimate memory usage (rough estimate)
    let memoryBytes = 0;
    for (const template of this.templates.values()) {
      memoryBytes += (template.template?.length || 0) * 2; // UTF-16
      memoryBytes += (template.bindings?.length || 0) * 20; // Rough estimate
      memoryBytes += (template.slots?.length || 0) * 4; // 4 bytes per number
      memoryBytes += (template.path?.length || 0) * 2; // UTF-16 for hex string
    }

    return {
      componentCount,
      templateCount,
      memoryKB: Math.round(memoryBytes / 1024),
      avgTemplatesPerComponent: templateCount / Math.max(componentCount, 1)
    };
  }
}

/**
 * Global template state manager instance
 */
export const templateState = new TemplateStateManager();
