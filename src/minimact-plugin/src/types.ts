/**
 * Plugin template metadata sent from server
 */
export interface PluginTemplate {
  /** Plugin name (e.g., "Clock", "Weather") */
  pluginName: string;

  /** Plugin version (semver) */
  version: string;

  /** Loop template metadata from [LoopTemplate] C# attributes */
  templates: LoopTemplate[];

  /** Plugin assets (CSS, JS, images) */
  assets: PluginAssets;

  /** Optional JSON schema for state validation */
  stateSchema?: string;
}

/**
 * Loop template structure (matches server-side C# [LoopTemplate])
 */
export interface LoopTemplate {
  stateKey: string;
  arrayBinding: string;
  itemVar: string;
  indexVar?: string;
  keyBinding?: string;
  itemTemplate: ItemTemplate;
}

/**
 * Item template within a loop
 */
export interface ItemTemplate {
  type: 'Element' | 'Text' | 'Fragment';
  tag?: string;
  propsTemplates?: Record<string, PropTemplate>;
  childrenTemplates?: (ItemTemplate | TextTemplate)[];
}

/**
 * Text template with slot bindings
 */
export interface TextTemplate {
  type: 'Text';
  template: string;
  bindings: string[];
  slots: number[];
}

/**
 * Property template (for element attributes)
 */
export interface PropTemplate {
  template: string;
  bindings: string[];
  slots: number[];
  type: 'static' | 'dynamic' | 'conditional' | 'binding';
  conditionalTemplates?: {
    true?: string;
    false?: string;
  };
  conditionalBindingIndex?: number;
}

/**
 * Plugin assets
 */
export interface PluginAssets {
  /** CSS file URLs */
  cssFiles: string[];

  /** JavaScript file URLs */
  jsFiles: string[];

  /** Image URLs (key = identifier, value = URL) */
  images: Record<string, string>;

  /** Font URLs */
  fonts: string[];
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  /** Whether to lazy-load assets (default: true) */
  lazyLoad?: boolean;

  /** Asset cache duration in milliseconds (default: 24 hours) */
  cacheDuration?: number;

  /** Custom asset base path */
  assetBasePath?: string;
}

/**
 * Plugin state binding
 */
export interface PluginStateBinding {
  pluginName: string;
  version: string;
  state: any;
  element: HTMLElement;
}
