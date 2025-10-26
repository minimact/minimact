/**
 * Core type definitions for Minimact client runtime
 */

export interface VNode {
  type: 'Element' | 'Text' | 'Fragment' | 'RawHtml';
}

export interface VElement extends VNode {
  type: 'Element';
  tag: string;
  props: Record<string, string>;
  children: VNode[];
  key?: string;
}

export interface VText extends VNode {
  type: 'Text';
  content: string;
}

export interface VFragment extends VNode {
  type: 'Fragment';
  children: VNode[];
}

export interface VRawHtml extends VNode {
  type: 'RawHtml';
  html: string;
}

/**
 * Binding with optional transform (Phase 6: Expression Templates)
 * Enables computed values like toFixed(), arithmetic, string operations
 */
export interface Binding {
  /** State variable name */
  stateKey: string;
  /** Optional: Transform to apply to value (e.g., "toFixed(2)", "* 100", "toUpperCase()") */
  transform?: string;
}

/**
 * Template patch data for parameterized updates
 * Enables 98% memory reduction by storing patterns instead of concrete values
 */
export interface TemplatePatch {
  /** Template string with {0}, {1}, etc. placeholders */
  template: string;
  /** State variable names that fill the template (simple string for backward compatibility) */
  bindings: string[] | Binding[];
  /** Character positions where parameters are inserted */
  slots: number[];
  /** Optional: Conditional templates based on binding values */
  conditionalTemplates?: Record<string, string>;
  /** Optional: Index of the binding that determines which conditional template to use */
  conditionalBindingIndex?: number;
}

/**
 * Loop template for array rendering (.map patterns)
 * Stores ONE pattern that applies to ALL array items
 * Enables 100% coverage for lists with minimal memory
 */
export interface LoopTemplate {
  /** Array state binding (e.g., "todos", "items") */
  array_binding: string;
  /** Template for each item in the array */
  item_template: ItemTemplate;
  /** Optional: Index variable name (e.g., "index", "idx") */
  index_var?: string;
  /** Optional: Separator between items (e.g., ", " for inline lists) */
  separator?: string;
}

/**
 * Template for individual items in a loop
 */
export type ItemTemplate =
  | {
      /** Simple text template (e.g., "{item.name}") */
      type: 'Text';
      template_patch: TemplatePatch;
    }
  | {
      /** Element template (e.g., <li>{item.text}</li>) */
      type: 'Element';
      tag: string;
      props_templates?: Record<string, TemplatePatch>;
      children_templates?: ItemTemplate[];
      /** Key binding for list reconciliation (e.g., "item.id") */
      key_binding?: string;
    };

export type Patch =
  | { type: 'Create'; path: number[]; node: VNode }
  | { type: 'Remove'; path: number[] }
  | { type: 'Replace'; path: number[]; node: VNode }
  | { type: 'UpdateText'; path: number[]; content: string }
  | { type: 'UpdateProps'; path: number[]; props: Record<string, string> }
  | { type: 'ReorderChildren'; path: number[]; order: string[] }
  // Template patches for runtime prediction (100% coverage with minimal memory)
  | { type: 'UpdateTextTemplate'; path: number[]; templatePatch: TemplatePatch }
  | { type: 'UpdatePropsTemplate'; path: number[]; propName: string; templatePatch: TemplatePatch }
  // Loop template patch for array rendering (.map patterns)
  | { type: 'UpdateListTemplate'; path: number[]; loopTemplate: LoopTemplate };

export interface ComponentState {
  [key: string]: any;
}

export interface MinimactOptions {
  hubUrl?: string;
  enableDebugLogging?: boolean;
  reconnectInterval?: number;
}

export interface ComponentMetadata {
  componentId: string;
  connectionId?: string;
  element: HTMLElement;
  clientState: ComponentState;
  serverState: ComponentState;
}
