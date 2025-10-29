/**
 * Component State Types
 *
 * Types for inspecting component state, refs, and hooks
 */

export interface ComponentStateSnapshot {
  componentId: string
  componentName: string
  state: Record<string, any>
  refs: Record<string, any>
  domElementStates: Record<string, DomElementStateSnapshot>
  queryResults: Record<string, any>
  effects: EffectInfo[]
  templates: LoopTemplate[]
  timestamp: number
}

export interface DomElementStateSnapshot {
  selector: string | null
  isIntersecting: boolean
  intersectionRatio: number
  childrenCount: number
  grandChildrenCount: number
  attributes: Record<string, string>
  classList: string[]
  exists: boolean
  count: number
}

export interface EffectInfo {
  index: number
  deps: any[] | undefined
  hasCleanup: boolean
}

export interface LoopTemplate {
  stateKey: string
  arrayBinding: string
  itemVar: string
  indexVar: string | null
  keyBinding: string | null
  itemTemplate: TemplateNode
}

export interface TemplateNode {
  type: 'Element' | 'Text' | 'conditional'
  tag?: string
  template?: string
  bindings?: string[]
  slots?: number[]
  conditionalTemplates?: Record<string, string>
  conditionalBindingIndex?: number
  propsTemplates?: Record<string, TemplateBinding>
  childrenTemplates?: TemplateNode[]
}

export interface TemplateBinding {
  template: string
  bindings: string[]
  slots: number[]
  type: 'static' | 'dynamic' | 'conditional'
  conditionalTemplates?: Record<string, string>
  conditionalBindingIndex?: number
}

export interface ComponentTree {
  componentId: string
  componentName: string
  children: ComponentTree[]
}

export interface StateUpdateRequest {
  componentId: string
  stateKey: string
  value: any
}
