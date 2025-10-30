import type {
  PluginTemplate,
  PluginAssets,
  PluginRegistrationOptions,
  LoopTemplate,
  ItemTemplate,
  TextTemplate,
  PropTemplate
} from './types';

/**
 * Main plugin renderer class
 * Manages plugin template registration and application
 */
export class PluginRenderer {
  private registeredPlugins = new Map<string, PluginTemplate>();
  private loadedAssets = new Set<string>();
  private options: Required<PluginRegistrationOptions>;

  constructor(options: PluginRegistrationOptions = {}) {
    this.options = {
      lazyLoad: options.lazyLoad ?? true,
      cacheDuration: options.cacheDuration ?? 86400000, // 24 hours
      assetBasePath: options.assetBasePath ?? '/plugin-assets'
    };
  }

  /**
   * Register a plugin's templates and assets
   * Called when server sends plugin metadata on first render
   */
  registerPlugin(template: PluginTemplate): void {
    const key = `${template.pluginName}@${template.version}`;

    if (this.registeredPlugins.has(key)) {
      console.log(`[minimact-plugin] Plugin ${key} already registered`);
      return;
    }

    console.log(`[minimact-plugin] Registering plugin: ${key}`);

    // Load assets
    this.loadAssets(template.assets);

    // Store template
    this.registeredPlugins.set(key, template);

    console.log(`[minimact-plugin] ✓ Registered plugin: ${key}`);
  }

  /**
   * Apply plugin template with state to DOM element
   */
  applyTemplate(pluginName: string, state: any, element: HTMLElement): void {
    const template = this.getLatestVersion(pluginName);

    if (!template) {
      console.error(`[minimact-plugin] Plugin not registered: ${pluginName}`);
      return;
    }

    // Apply the first template (typically there's only one)
    if (template.templates.length > 0) {
      this.applyLoopTemplate(template.templates[0], state, element);
    }
  }

  /**
   * Apply a loop template
   */
  private applyLoopTemplate(loopTemplate: LoopTemplate, state: any, element: HTMLElement): void {
    // Resolve array binding from state
    const array = this.resolvePath(state, loopTemplate.arrayBinding);

    if (!Array.isArray(array)) {
      console.error(`[minimact-plugin] Expected array for binding "${loopTemplate.arrayBinding}", got:`, array);
      return;
    }

    // Clear existing children
    element.innerHTML = '';

    // Render each item
    array.forEach((item, index) => {
      const itemContext = {
        item,
        index
      };

      const itemElement = this.renderItemTemplate(loopTemplate.itemTemplate, itemContext);
      if (itemElement) {
        element.appendChild(itemElement);
      }
    });
  }

  /**
   * Render an item template
   */
  private renderItemTemplate(template: ItemTemplate, context: any): HTMLElement | Text | null {
    if (template.type === 'Text') {
      const textTemplate = template as any as TextTemplate;
      const text = this.fillSlots(textTemplate.template, textTemplate.bindings, context);
      return document.createTextNode(text);
    }

    if (template.type === 'Element') {
      const element = document.createElement(template.tag || 'div');

      // Apply props
      if (template.propsTemplates) {
        for (const [propName, propTemplate] of Object.entries(template.propsTemplates)) {
          const propValue = this.applyPropTemplate(propTemplate, context);
          if (propName === 'className' || propName === 'class') {
            element.className = propValue;
          } else {
            element.setAttribute(propName, propValue);
          }
        }
      }

      // Render children
      if (template.childrenTemplates) {
        for (const childTemplate of template.childrenTemplates) {
          const childElement = this.renderItemTemplate(childTemplate as ItemTemplate, context);
          if (childElement) {
            element.appendChild(childElement);
          }
        }
      }

      return element;
    }

    return null;
  }

  /**
   * Apply a property template
   */
  private applyPropTemplate(propTemplate: PropTemplate, context: any): string {
    if (propTemplate.type === 'static') {
      return propTemplate.template;
    }

    if (propTemplate.type === 'conditional' && propTemplate.conditionalTemplates) {
      const conditionValue = this.resolvePath(context, propTemplate.bindings[0]);
      const branch = conditionValue ? 'true' : 'false';
      return propTemplate.conditionalTemplates[branch] || '';
    }

    // Dynamic or binding type - fill slots
    return this.fillSlots(propTemplate.template, propTemplate.bindings, context);
  }

  /**
   * Fill template slots with values from context
   */
  private fillSlots(template: string, bindings: string[], context: any): string {
    let result = template;

    bindings.forEach((binding, index) => {
      const value = this.resolvePath(context, binding);
      const placeholder = `{${index}}`;
      result = result.replace(placeholder, String(value ?? ''));
    });

    return result;
  }

  /**
   * Resolve a dot-notation path from context
   * E.g., "item.hours" resolves context.item.hours
   */
  private resolvePath(context: any, path: string): any {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Load plugin assets (CSS, JS, images)
   */
  private loadAssets(assets: PluginAssets): void {
    // Load CSS files
    assets.cssFiles.forEach(url => this.loadCss(url));

    // Load JS files
    assets.jsFiles.forEach(url => this.loadScript(url));

    // Preload images
    assets.images && Object.values(assets.images).forEach(url => this.preloadImage(url));

    // Load fonts
    assets.fonts?.forEach(url => this.loadFont(url));
  }

  /**
   * Load CSS file
   */
  private loadCss(url: string): void {
    if (this.loadedAssets.has(url)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      console.log(`[minimact-plugin] ✓ Loaded CSS: ${url}`);
    };
    link.onerror = () => {
      console.error(`[minimact-plugin] ✗ Failed to load CSS: ${url}`);
    };

    document.head.appendChild(link);
    this.loadedAssets.add(url);
  }

  /**
   * Load JavaScript file
   */
  private loadScript(url: string): void {
    if (this.loadedAssets.has(url)) {
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      console.log(`[minimact-plugin] ✓ Loaded JS: ${url}`);
    };
    script.onerror = () => {
      console.error(`[minimact-plugin] ✗ Failed to load JS: ${url}`);
    };

    document.head.appendChild(script);
    this.loadedAssets.add(url);
  }

  /**
   * Preload image
   */
  private preloadImage(url: string): void {
    if (this.loadedAssets.has(url)) {
      return;
    }

    const img = new Image();
    img.src = url;
    this.loadedAssets.add(url);
  }

  /**
   * Load font
   */
  private loadFont(url: string): void {
    if (this.loadedAssets.has(url)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = url;
    link.crossOrigin = 'anonymous';

    document.head.appendChild(link);
    this.loadedAssets.add(url);
  }

  /**
   * Get the latest version of a plugin
   */
  private getLatestVersion(pluginName: string): PluginTemplate | undefined {
    const versions = Array.from(this.registeredPlugins.keys())
      .filter(k => k.startsWith(pluginName + '@'))
      .sort((a, b) => {
        // Simple semver sort (for MVP, can be improved)
        const versionA = a.split('@')[1];
        const versionB = b.split('@')[1];
        return versionB.localeCompare(versionA);
      });

    return versions.length > 0
      ? this.registeredPlugins.get(versions[0])
      : undefined;
  }

  /**
   * Get plugin by exact version
   */
  getPlugin(pluginName: string, version?: string): PluginTemplate | undefined {
    if (version) {
      return this.registeredPlugins.get(`${pluginName}@${version}`);
    }
    return this.getLatestVersion(pluginName);
  }

  /**
   * Check if plugin is registered
   */
  isRegistered(pluginName: string, version?: string): boolean {
    return this.getPlugin(pluginName, version) !== undefined;
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string, version?: string): void {
    if (version) {
      this.registeredPlugins.delete(`${pluginName}@${version}`);
    } else {
      // Remove all versions
      const keys = Array.from(this.registeredPlugins.keys())
        .filter(k => k.startsWith(pluginName + '@'));
      keys.forEach(k => this.registeredPlugins.delete(k));
    }
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Map<string, PluginTemplate> {
    return new Map(this.registeredPlugins);
  }
}
