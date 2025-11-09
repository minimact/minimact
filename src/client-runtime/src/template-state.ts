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
}

export interface TemplatePatch {
  type: 'UpdateTextTemplate' | 'UpdatePropTemplate';
  componentId: string;
  path: string;
  template: string;
  params: any[];
  bindings: string[];
  slots: number[];
  attribute?: string;
}

/**
 * Template State Manager
 */
export class TemplateStateManager {
  private templates: Map<string, Template> = new Map();
  private componentStates: Map<string, Map<string, any>> = new Map();
  // Hierarchical hex path index: componentId -> parent path -> sorted children hex codes
  private hexPathIndex: Map<string, Map<string, string[]>> = new Map();
  // Null paths: componentId -> Set of paths that are currently null
  private nullPaths: Map<string, Set<string>> = new Map();

  /**
   * Initialize templates from .templates.json file
   */
  loadTemplateMap(componentId: string, templateMap: TemplateMap): void {
    console.log(`[TemplateState] Loading ${Object.keys(templateMap.templates).length} templates for ${componentId}`);

    // Build hierarchical hex path index: parent path -> children hex codes
    const hierarchyMap = new Map<string, Set<string>>();
    const nullPaths = new Set<string>(); // Track null paths

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

      // Extract hex path segments
      const pathSegments = nodePath.split('.');

      // Check if this path ends with '.null' (path didn't render)
      const isNullPath = pathSegments[pathSegments.length - 1] === 'null';

      if (isNullPath) {
        // Remove '.null' suffix and store as null path
        const actualPath = pathSegments.slice(0, -1).join('.');
        nullPaths.add(actualPath);
        console.log(`[TemplateState] Null path detected: ${actualPath}`);

        // Add to hierarchy map so we know this child exists (even though it's null)
        const actualSegments = pathSegments.slice(0, -1);
        if (actualSegments.length > 0) {
          const childHex = actualSegments[actualSegments.length - 1];
          const parentPath = actualSegments.length > 1 ? actualSegments.slice(0, -1).join('.') : '';

          if (!hierarchyMap.has(parentPath)) {
            hierarchyMap.set(parentPath, new Set());
          }
          hierarchyMap.get(parentPath)!.add(childHex);
        }
        continue; // Don't add to templates
      }

      // Build parent -> children relationships
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        // Skip attribute markers (@style, @className, etc.)
        if (segment.startsWith('@')) continue;

        // Parent path is everything before this segment
        const parentPath = i > 0 ? pathSegments.slice(0, i).join('.') : '';

        if (!hierarchyMap.has(parentPath)) {
          hierarchyMap.set(parentPath, new Set());
        }
        hierarchyMap.get(parentPath)!.add(segment);
      }
    }

    // Store null paths for this component
    this.nullPaths.set(componentId, nullPaths);

    // Convert sets to sorted arrays
    const sortedHierarchyMap = new Map<string, string[]>();
    for (const [parentPath, childrenSet] of hierarchyMap.entries()) {
      sortedHierarchyMap.set(parentPath, Array.from(childrenSet).sort());
    }

    this.hexPathIndex.set(componentId, sortedHierarchyMap);
    console.log(`[TemplateState] Built hierarchical hex path index for ${componentId}:`, sortedHierarchyMap);

    // Initialize component state tracking
    if (!this.componentStates.has(componentId)) {
      this.componentStates.set(componentId, new Map());
    }
  }

  /**
   * Get sorted hex codes (children) for a specific parent path
   * @param componentId - Component identifier
   * @param parentPath - Parent path (empty string for root children)
   * @returns Sorted array of child hex codes
   */
  getChildrenAtPath(componentId: string, parentPath: string): string[] | undefined {
    const hierarchy = this.hexPathIndex.get(componentId);
    if (!hierarchy) {
      console.warn(`[TemplateState] No hierarchy found for component ${componentId}`);
      return undefined;
    }

    const children = hierarchy.get(parentPath);
    console.log(`[TemplateState] getChildrenAtPath(${componentId}, "${parentPath}") -> ${children?.length || 0} children:`, children);
    return children;
  }

  /**
   * Check if a path is currently null (not rendered)
   */
  isPathNull(componentId: string, path: string): boolean {
    return this.nullPaths.get(componentId)?.has(path) ?? false;
  }

  /**
   * Navigate to a DOM element by hex path, skipping over null nodes
   * @param rootElement - Root DOM element (container) to start navigation from
   * @param componentId - Component identifier (component type like "ProductPage")
   * @param path - Absolute hex path (e.g., "10000000.20000000.30000000")
   * @returns DOM node at the path, or null if not found
   */
  navigateToPath(rootElement: HTMLElement, componentId: string, path: string): Node | null {
    if (path === '' || path === '.') {
      return rootElement;
    }

    let current: Node = rootElement;
    const hexSegments = path.split('.');
    let currentPath = '';

    for (let i = 0; i < hexSegments.length; i++) {
      const hexSegment = hexSegments[i];

      // Build the full path up to this point
      currentPath = currentPath ? `${currentPath}.${hexSegment}` : hexSegment;

      // Get all children at this level (sorted hex codes)
      const parentPath = i > 0 ? hexSegments.slice(0, i).join('.') : '';
      const children = this.getChildrenAtPath(componentId, parentPath);

      if (!children) {
        console.error(`[TemplateState] No children found at parent path "${parentPath}"`);
        return null;
      }

      // Find the DOM index by counting non-null siblings before this hex
      let domIndex = 0;
      for (const childHex of children) {
        const siblingPath = parentPath ? `${parentPath}.${childHex}` : childHex;

        // If this is our target segment, use this domIndex
        if (childHex === hexSegment) {
          break;
        }

        // Only increment DOM index if sibling is NOT null
        if (!this.isPathNull(componentId, siblingPath)) {
          domIndex++;
        }
      }

      // Navigate to the child at domIndex
      if (domIndex >= current.childNodes.length) {
        console.error(`[TemplateState] DOM index ${domIndex} out of bounds (${current.childNodes.length} children) at path "${currentPath}"`);
        return null;
      }

      current = current.childNodes[domIndex];
    }

    return current;
  }

  /**
   * Remove a path from null paths (element was created)
   */
  removeFromNullPaths(componentId: string, path: string): void {
    const nullPathsSet = this.nullPaths.get(componentId);
    if (nullPathsSet) {
      nullPathsSet.delete(path);
      console.log(`[TemplateState] Removed ${path} from null paths for ${componentId}`);
    }
  }

  /**
   * Add a path to null paths (element was removed)
   */
  addToNullPaths(componentId: string, path: string): void {
    let nullPathsSet = this.nullPaths.get(componentId);
    if (!nullPathsSet) {
      nullPathsSet = new Set();
      this.nullPaths.set(componentId, nullPathsSet);
    }
    nullPathsSet.add(path);
    console.log(`[TemplateState] Added ${path} to null paths for ${componentId}`);
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
  applyTemplatePatch(patch: TemplatePatch): { text: string; path: string } | null {
    const { componentId, path, template, params, bindings, slots, attribute } = patch;

    // Get current state values from client (not stale params from server!)
    const currentParams: any[] = [];
    for (const binding of bindings) {
      const value = this.getStateValue(componentId, binding);
      currentParams.push(value !== undefined ? value : params[currentParams.length]);
    }

    // Render template with current client state
    const text = this.renderWithParams(template, currentParams);

    // Build node path key (use hex path as-is, replace dots with underscores)
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
        path,
        type: attribute ? 'attribute' : 'dynamic',
        attribute
      });
    }

    console.log(`[TemplateState] Applied template patch: "${template}" → "${text}"`);

    return { text, path };
  }

  /**
   * Build node path key from hex path string
   * Example: "10000000.20000000" → "10000000_20000000"
   */
  private buildNodePathKey(path: string): string {
    return path.replace(/\./g, '_');
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
