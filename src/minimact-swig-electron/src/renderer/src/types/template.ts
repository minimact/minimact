/**
 * Template metadata types for Minimact SWIG DevTools
 */

export type TemplateType = 'static' | 'dynamic' | 'conditional' | 'loop' | 'complex';

export interface TemplateBinding {
  path: string; // e.g., "item.done", "todos"
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'computed';
  usageCount: number;
  sampleValues?: any[];
}

export interface ConditionalTemplates {
  true: string;
  false: string;
  [key: string]: string;
}

export interface BaseTemplate {
  template: string;
  bindings: string[];
  slots?: number[];
  type: TemplateType;
  path?: number[];
}

export interface StaticTemplate extends BaseTemplate {
  type: 'static';
  bindings: [];
}

export interface DynamicTemplate extends BaseTemplate {
  type: 'dynamic';
  bindings: string[];
  slots: number[];
}

export interface ConditionalTemplate extends BaseTemplate {
  type: 'conditional';
  conditionalTemplates: ConditionalTemplates;
  conditionalBindingIndex: number;
}

export interface ComplexTemplate extends BaseTemplate {
  type: 'complex';
  bindings: ['__complex__'];
}

export interface ElementTemplate {
  type: 'Element';
  tag: string;
  propsTemplates?: Record<string, TemplateNode> | null;
  childrenTemplates?: TemplateNode[] | null;
}

export interface TextTemplate {
  type: 'Text';
  template: string;
  bindings: string[];
  slots?: number[];
}

export type TemplateNode =
  | StaticTemplate
  | DynamicTemplate
  | ConditionalTemplate
  | ComplexTemplate
  | ElementTemplate
  | TextTemplate;

export interface LoopTemplate {
  stateKey: string;
  arrayBinding: string;
  itemVar: string;
  indexVar?: string | null;
  keyBinding?: string | null;
  itemTemplate: ElementTemplate;
}

export interface ComponentTemplates {
  component: string;
  version: string;
  generatedAt: number;
  templates: Record<string, TemplateNode>;
  loopTemplates?: Record<string, LoopTemplate>;
}

export interface TemplateMetadata {
  componentId: string;
  componentName: string;
  templates: ComponentTemplates;
  bindings: TemplateBinding[];
  state: Record<string, any>;
}

export interface TemplateUsage {
  templateKey: string;
  usageCount: number;
  lastUsed: number;
  avgApplicationTime: number;
  minTime: number;
  maxTime: number;
}

export interface TemplatePerformance {
  templateKey: string;
  applications: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  breakdown: {
    bindingResolution: number;
    slotFilling: number;
    domUpdates: number;
  };
}

export interface TemplateTelemetry {
  componentId: string;
  templateKey: string;
  startTime: number;
  duration: number;
  bindings: Record<string, any>;
  success: boolean;
  error?: string;
}
