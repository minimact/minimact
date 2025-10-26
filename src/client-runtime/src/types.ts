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
 * Template patch data for parameterized updates
 * Enables 98% memory reduction by storing patterns instead of concrete values
 */
export interface TemplatePatch {
  /** Template string with {0}, {1}, etc. placeholders */
  template: string;
  /** State variable names that fill the template */
  bindings: string[];
  /** Character positions where parameters are inserted */
  slots: number[];
}

export type Patch =
  | { type: 'Create'; path: number[]; node: VNode }
  | { type: 'Remove'; path: number[] }
  | { type: 'Replace'; path: number[]; node: VNode }
  | { type: 'UpdateText'; path: number[]; content: string }
  | { type: 'UpdateProps'; path: number[]; props: Record<string, string> }
  | { type: 'ReorderChildren'; path: number[]; order: string[] }
  // Template patches for runtime prediction (100% coverage with minimal memory)
  | { type: 'UpdateTextTemplate'; path: number[]; templatePatch: TemplatePatch }
  | { type: 'UpdatePropsTemplate'; path: number[]; propName: string; templatePatch: TemplatePatch };

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
