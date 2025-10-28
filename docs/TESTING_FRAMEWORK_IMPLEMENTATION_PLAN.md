# Minimact Testing Framework Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for building `minimact-test`, a testing framework designed specifically for Minimact's unique architecture: server-side React components, template-based prediction, and real-time SignalR communication.

**Timeline:** 12-16 weeks
**Team Size:** 2-3 developers
**Dependencies:** Vitest/Jest, JSDOM, Mock SignalR, Rust WASM reconciler

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MINIMACT TESTING FRAMEWORK                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Unit Tests   │  │ Integration  │  │  E2E Tests   │      │
│  │              │  │    Tests     │  │              │      │
│  │ - Templates  │  │ - Mock Server│  │ - Real Server│      │
│  │ - Renderer   │  │ - SignalR    │  │ - Playwright │      │
│  │ - DOM Ops    │  │ - State Sync │  │ - Full Stack │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│         ┌─────────────────┴──────────────────┐              │
│         │                                    │              │
│  ┌──────▼────────┐              ┌───────────▼────────┐     │
│  │ Test Client   │              │  Mock Server       │     │
│  │               │              │                    │     │
│  │ - Minimact    │◄─────────────┤ - Component Mgmt   │     │
│  │ - Template    │   Mock       │ - State Sync       │     │
│  │   Renderer    │   SignalR    │ - Patch Generation │     │
│  │ - HintQueue   │              │ - Rust Reconciler  │     │
│  │ - DOM Patcher │              │   (WASM)           │     │
│  └───────────────┘              └────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Weeks 1-3)

### Objectives
- Set up testing infrastructure
- Create mock server foundation
- Build basic component rendering

### Deliverables

#### 1.1 Project Setup
```bash
src/minimact-test/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                    # Public API
│   ├── render/
│   │   ├── renderComponent.ts      # Component renderer
│   │   ├── TestClient.ts           # Extended Minimact client
│   │   └── container.ts            # JSDOM container
│   ├── server/
│   │   ├── MockServer.ts           # Mock C# server
│   │   ├── ComponentRegistry.ts    # Component management
│   │   └── StateManager.ts         # State synchronization
│   ├── events/
│   │   ├── fireEvent.ts            # Event simulation
│   │   └── waitFor.ts              # Async utilities
│   ├── assertions/
│   │   ├── template.ts             # Template assertions
│   │   ├── state.ts                # State assertions
│   │   └── dom.ts                  # DOM assertions
│   └── mocks/
│       ├── SignalR.ts              # Mock SignalR connection
│       └── RustReconciler.ts       # WASM reconciler wrapper
└── tests/
    └── self-tests/                 # Tests for the framework itself
```

**Tasks:**
- [x] Initialize npm package with TypeScript
- [ ] Configure Vitest with JSDOM
- [ ] Set up module exports and public API
- [ ] Create basic directory structure
- [ ] Write package.json with dependencies

**Dependencies:**
```json
{
  "dependencies": {
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@types/jsdom": "^21.0.0",
    "happy-dom": "^12.0.0"
  },
  "peerDependencies": {
    "minimact": "workspace:*"
  }
}
```

#### 1.2 Mock SignalR Connection

**File:** `src/mocks/SignalR.ts`

```typescript
/**
 * Mock SignalR connection for testing
 * Simulates real-time bidirectional communication without network
 */
export class MockSignalRConnection {
  private handlers: Map<string, Function[]> = new Map();
  private mockServer: MockServer;
  public connectionId: string;
  public state: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor(mockServer: MockServer) {
    this.mockServer = mockServer;
    this.connectionId = `mock-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    this.state = 'connecting';
    await new Promise(resolve => setTimeout(resolve, 0)); // Simulate async
    this.state = 'connected';
  }

  async invoke(method: string, ...args: any[]): Promise<any> {
    // Route to mock server
    return this.mockServer.handleInvoke(method, ...args);
  }

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }

  async stop(): Promise<void> {
    this.state = 'disconnected';
  }
}
```

**Tasks:**
- [ ] Implement connection lifecycle (start, stop, reconnect)
- [ ] Create event handler registry
- [ ] Build method invocation routing
- [ ] Add connection state management
- [ ] Write unit tests for mock connection

#### 1.3 Basic Component Renderer

**File:** `src/render/renderComponent.ts`

```typescript
import { JSDOM } from 'jsdom';
import { MockServer } from '../server/MockServer';
import { TestClient } from './TestClient';

export interface RenderOptions<TProps = any> {
  initialState?: Record<string, any>;
  props?: TProps;
  mockSignalR?: boolean;
  enableDebugLogging?: boolean;
}

export interface RenderResult {
  container: HTMLElement;
  client: TestClient;
  server: MockServer;
  debug: {
    logHTML: () => void;
    logState: () => void;
    logTemplates: () => void;
  };
}

/**
 * Render a Minimact component for testing
 *
 * @example
 * const { container, client } = await renderComponent(Counter, {
 *   initialState: { count: 0 }
 * });
 */
export async function renderComponent<TComponent, TProps = any>(
  Component: new () => TComponent,
  options: RenderOptions<TProps> = {}
): Promise<RenderResult> {
  // 1. Create JSDOM environment
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:5000',
    pretendToBeVisual: true, // Enable layout calculations
    resources: 'usable'
  });

  global.window = dom.window as any;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;

  // 2. Initialize mock server
  const server = new MockServer({
    enableDebugLogging: options.enableDebugLogging || false
  });

  // 3. Render component on server
  const html = await server.renderComponent(Component, {
    initialState: options.initialState,
    props: options.props
  });

  // 4. Insert HTML into container
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  // 5. Initialize test client
  const client = new TestClient(container, {
    mockServer: server,
    enableDebugLogging: options.enableDebugLogging || false
  });

  // 6. Hydrate client
  await client.start();

  // 7. Return test interface
  return {
    container,
    client,
    server,
    debug: {
      logHTML: () => console.log(container.innerHTML),
      logState: () => console.log(server.getAllComponentStates()),
      logTemplates: () => console.log(client.hintQueue.getAllTemplates())
    }
  };
}
```

**Tasks:**
- [ ] Set up JSDOM environment with proper globals
- [ ] Implement server-side rendering integration
- [ ] Create container management
- [ ] Build client hydration
- [ ] Add debug utilities
- [ ] Write integration tests

---

## Phase 2: Mock Server Implementation (Weeks 4-6)

### Objectives
- Build mock C# server in TypeScript
- Implement component lifecycle
- Create state synchronization
- Integrate Rust reconciler (WASM)

### Deliverables

#### 2.1 Mock Server Core

**File:** `src/server/MockServer.ts`

```typescript
import { RustReconciler } from '../mocks/RustReconciler';
import { ComponentRegistry } from './ComponentRegistry';
import { VNode, Patch } from 'minimact/types';

export interface MockServerOptions {
  enableDebugLogging?: boolean;
  enableTemplateExtraction?: boolean;
}

/**
 * Mock server simulating ASP.NET Core + Rust reconciliation
 */
export class MockServer {
  private componentRegistry: ComponentRegistry;
  private reconciler: RustReconciler;
  private options: MockServerOptions;

  // SignalR method handlers
  private methodHandlers: Map<string, Function> = new Map();

  constructor(options: MockServerOptions = {}) {
    this.options = options;
    this.componentRegistry = new ComponentRegistry();
    this.reconciler = new RustReconciler({
      enableTemplateExtraction: options.enableTemplateExtraction ?? true
    });

    this.registerDefaultHandlers();
  }

  /**
   * Render component to HTML
   */
  async renderComponent<TComponent>(
    ComponentClass: new () => TComponent,
    options: {
      initialState?: Record<string, any>;
      props?: any;
    }
  ): Promise<string> {
    // 1. Instantiate component
    const instance = new ComponentClass() as any;
    const componentId = this.generateComponentId();

    // 2. Set initial state
    if (options.initialState) {
      Object.keys(options.initialState).forEach(key => {
        instance.state = instance.state || {};
        instance.state[key] = options.initialState![key];
      });
    }

    // 3. Set props
    if (options.props) {
      instance.props = options.props;
    }

    // 4. Call lifecycle methods
    if (instance.onInitialized) {
      await instance.onInitialized();
    }

    // 5. Render to VNode
    const vnode = instance.render();

    // 6. Convert VNode to HTML
    const html = this.reconciler.vnodeToHtml(vnode);

    // 7. Register component
    this.componentRegistry.register(componentId, instance, vnode);

    // 8. Extract templates (if enabled)
    if (this.options.enableTemplateExtraction) {
      const templates = this.reconciler.extractTemplates(vnode);
      this.componentRegistry.setTemplates(componentId, templates);
    }

    this.log(`Rendered component ${componentId}`);

    return html;
  }

  /**
   * Handle SignalR method invocation
   */
  async handleInvoke(method: string, ...args: any[]): Promise<any> {
    const handler = this.methodHandlers.get(method);

    if (!handler) {
      throw new Error(`Unknown method: ${method}`);
    }

    return handler(...args);
  }

  /**
   * Register default SignalR handlers
   */
  private registerDefaultHandlers(): void {
    // Register component
    this.methodHandlers.set('RegisterComponent', async (componentId: string) => {
      this.log(`Component registered: ${componentId}`);
      return { success: true };
    });

    // Invoke component method
    this.methodHandlers.set('InvokeComponentMethod', async (
      componentId: string,
      methodName: string,
      args: any[]
    ) => {
      return this.invokeComponentMethod(componentId, methodName, args);
    });

    // Update component state
    this.methodHandlers.set('UpdateComponentState', async (
      componentId: string,
      stateKey: string,
      value: any
    ) => {
      return this.updateComponentState(componentId, stateKey, value);
    });

    // Update DOM element state
    this.methodHandlers.set('UpdateDomElementState', async (
      componentId: string,
      stateKey: string,
      snapshot: any
    ) => {
      return this.updateDomElementState(componentId, stateKey, snapshot);
    });
  }

  /**
   * Invoke method on component instance
   */
  private async invokeComponentMethod(
    componentId: string,
    methodName: string,
    args: any[]
  ): Promise<{ patches: Patch[] }> {
    const component = this.componentRegistry.get(componentId);

    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // 1. Get old VNode
    const oldVNode = component.vnode;

    // 2. Invoke method
    if (typeof component.instance[methodName] !== 'function') {
      throw new Error(`Method not found: ${methodName}`);
    }

    await component.instance[methodName](...args);

    // 3. Re-render
    const newVNode = component.instance.render();

    // 4. Compute patches
    const patches = this.reconciler.computePatches(oldVNode, newVNode);

    // 5. Update stored VNode
    this.componentRegistry.updateVNode(componentId, newVNode);

    this.log(`Method invoked: ${componentId}.${methodName}() → ${patches.length} patches`);

    return { patches };
  }

  /**
   * Update component state from client
   */
  private async updateComponentState(
    componentId: string,
    stateKey: string,
    value: any
  ): Promise<{ patches: Patch[] }> {
    const component = this.componentRegistry.get(componentId);

    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // 1. Update state
    component.instance.state = component.instance.state || {};
    component.instance.state[stateKey] = value;

    // 2. Re-render
    const oldVNode = component.vnode;
    const newVNode = component.instance.render();

    // 3. Compute patches
    const patches = this.reconciler.computePatches(oldVNode, newVNode);

    // 4. Update stored VNode
    this.componentRegistry.updateVNode(componentId, newVNode);

    this.log(`State updated: ${componentId}.${stateKey} = ${value} → ${patches.length} patches`);

    return { patches };
  }

  /**
   * Update DOM element state from client
   */
  private async updateDomElementState(
    componentId: string,
    stateKey: string,
    snapshot: any
  ): Promise<{ patches: Patch[] }> {
    // Similar to updateComponentState but for DOM element state
    // Implementation depends on how DomElementState integrates

    const component = this.componentRegistry.get(componentId);

    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // Store DOM state
    component.instance.domState = component.instance.domState || {};
    component.instance.domState[stateKey] = snapshot;

    // Re-render and compute patches
    const oldVNode = component.vnode;
    const newVNode = component.instance.render();
    const patches = this.reconciler.computePatches(oldVNode, newVNode);

    this.componentRegistry.updateVNode(componentId, newVNode);

    return { patches };
  }

  /**
   * Get component state for assertions
   */
  getComponentState(componentId: string): any {
    const component = this.componentRegistry.get(componentId);
    return component?.instance.state || null;
  }

  /**
   * Get all component states for debugging
   */
  getAllComponentStates(): Record<string, any> {
    const states: Record<string, any> = {};

    for (const [id, component] of this.componentRegistry.getAll()) {
      states[id] = component.instance.state;
    }

    return states;
  }

  private generateComponentId(): string {
    return `test-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, data?: any): void {
    if (this.options.enableDebugLogging) {
      console.log(`[MockServer] ${message}`, data || '');
    }
  }
}
```

**Tasks:**
- [ ] Implement component instantiation
- [ ] Build VNode rendering
- [ ] Create patch computation
- [ ] Add state synchronization handlers
- [ ] Implement lifecycle methods
- [ ] Write unit tests for server

#### 2.2 Component Registry

**File:** `src/server/ComponentRegistry.ts`

```typescript
import { VNode } from 'minimact/types';

export interface RegisteredComponent {
  instance: any;
  vnode: VNode;
  templates: Map<string, any>;
  createdAt: Date;
}

/**
 * Manages component instances during tests
 */
export class ComponentRegistry {
  private components: Map<string, RegisteredComponent> = new Map();

  register(componentId: string, instance: any, vnode: VNode): void {
    this.components.set(componentId, {
      instance,
      vnode,
      templates: new Map(),
      createdAt: new Date()
    });
  }

  get(componentId: string): RegisteredComponent | undefined {
    return this.components.get(componentId);
  }

  getAll(): Map<string, RegisteredComponent> {
    return this.components;
  }

  updateVNode(componentId: string, vnode: VNode): void {
    const component = this.components.get(componentId);
    if (component) {
      component.vnode = vnode;
    }
  }

  setTemplates(componentId: string, templates: Map<string, any>): void {
    const component = this.components.get(componentId);
    if (component) {
      component.templates = templates;
    }
  }

  delete(componentId: string): void {
    this.components.delete(componentId);
  }

  clear(): void {
    this.components.clear();
  }
}
```

**Tasks:**
- [ ] Implement component storage
- [ ] Add VNode management
- [ ] Create template storage
- [ ] Build component lookup
- [ ] Write unit tests

#### 2.3 Rust Reconciler Wrapper (WASM)

**File:** `src/mocks/RustReconciler.ts`

```typescript
import { VNode, Patch } from 'minimact/types';

/**
 * Wrapper around Rust reconciler WASM module
 * Falls back to JS implementation if WASM not available
 */
export class RustReconciler {
  private wasmModule: any;
  private useWasm: boolean = false;

  constructor(options: { enableTemplateExtraction?: boolean } = {}) {
    // Try to load WASM module
    try {
      // This would load the actual Rust reconciler compiled to WASM
      // this.wasmModule = require('minimact-reconciler-wasm');
      // this.useWasm = true;
    } catch {
      console.warn('[RustReconciler] WASM not available, using JS fallback');
      this.useWasm = false;
    }
  }

  /**
   * Convert VNode to HTML string
   */
  vnodeToHtml(vnode: VNode): string {
    if (this.useWasm) {
      return this.wasmModule.vnode_to_html(JSON.stringify(vnode));
    }

    // JS fallback
    return this.vnodeToHtmlJS(vnode);
  }

  /**
   * Compute patches between two VNodes
   */
  computePatches(oldVNode: VNode, newVNode: VNode): Patch[] {
    if (this.useWasm) {
      const patchesJson = this.wasmModule.compute_patches(
        JSON.stringify(oldVNode),
        JSON.stringify(newVNode)
      );
      return JSON.parse(patchesJson);
    }

    // JS fallback
    return this.computePatchesJS(oldVNode, newVNode);
  }

  /**
   * Extract templates from VNode
   */
  extractTemplates(vnode: VNode): Map<string, any> {
    if (this.useWasm) {
      const templatesJson = this.wasmModule.extract_templates(JSON.stringify(vnode));
      const templatesObj = JSON.parse(templatesJson);
      return new Map(Object.entries(templatesObj));
    }

    // JS fallback
    return this.extractTemplatesJS(vnode);
  }

  // ============================================================
  // JavaScript Fallback Implementations
  // ============================================================

  private vnodeToHtmlJS(vnode: VNode): string {
    if (vnode.type === 'Text') {
      return this.escapeHtml((vnode as any).content);
    }

    if (vnode.type === 'Element') {
      const element = vnode as any;
      const tag = element.tag;
      const props = element.props || {};
      const children = element.children || [];

      // Build opening tag
      let html = `<${tag}`;

      // Add attributes
      for (const [key, value] of Object.entries(props)) {
        if (value !== null && value !== undefined && value !== false) {
          html += ` ${key}="${this.escapeHtml(String(value))}"`;
        }
      }

      // Self-closing tags
      if (this.isSelfClosing(tag) && children.length === 0) {
        html += ' />';
        return html;
      }

      html += '>';

      // Add children
      for (const child of children) {
        html += this.vnodeToHtmlJS(child);
      }

      // Closing tag
      html += `</${tag}>`;

      return html;
    }

    return '';
  }

  private computePatchesJS(oldVNode: VNode, newVNode: VNode): Patch[] {
    // Simplified diffing algorithm
    // Real implementation would match Rust reconciler behavior

    const patches: Patch[] = [];

    // If nodes are completely different, replace
    if (oldVNode.type !== newVNode.type) {
      patches.push({
        type: 'Replace',
        path: [],
        node: newVNode
      } as any);
      return patches;
    }

    // Text node changes
    if (oldVNode.type === 'Text' && newVNode.type === 'Text') {
      const oldText = (oldVNode as any).content;
      const newText = (newVNode as any).content;

      if (oldText !== newText) {
        patches.push({
          type: 'UpdateText',
          path: [],
          content: newText
        } as any);
      }
    }

    // Element changes
    if (oldVNode.type === 'Element' && newVNode.type === 'Element') {
      const oldElement = oldVNode as any;
      const newElement = newVNode as any;

      // Props changes
      const propChanges = this.diffProps(oldElement.props, newElement.props);
      if (Object.keys(propChanges).length > 0) {
        patches.push({
          type: 'UpdateProps',
          path: [],
          props: propChanges
        } as any);
      }

      // Children changes (simplified)
      const oldChildren = oldElement.children || [];
      const newChildren = newElement.children || [];

      for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
        if (i >= oldChildren.length) {
          // New child added
          patches.push({
            type: 'Create',
            path: [i],
            node: newChildren[i]
          } as any);
        } else if (i >= newChildren.length) {
          // Child removed
          patches.push({
            type: 'Remove',
            path: [i]
          } as any);
        } else {
          // Recursively diff children
          const childPatches = this.computePatchesJS(oldChildren[i], newChildren[i]);
          for (const patch of childPatches) {
            patches.push({
              ...patch,
              path: [i, ...patch.path]
            });
          }
        }
      }
    }

    return patches;
  }

  private extractTemplatesJS(vnode: VNode): Map<string, any> {
    // Simplified template extraction
    // Real implementation would match Rust template extractor

    const templates = new Map<string, any>();

    // Extract text templates
    this.extractTextTemplates(vnode, [], templates);

    return templates;
  }

  private extractTextTemplates(
    vnode: VNode,
    path: number[],
    templates: Map<string, any>
  ): void {
    if (vnode.type === 'Text') {
      const content = (vnode as any).content;

      // Check if text contains variables (simplified)
      // Real implementation would parse template syntax
      if (content.includes('{') && content.includes('}')) {
        templates.set(path.join('_'), {
          template: content,
          bindings: [], // Would be extracted properly
          slots: [], // Would be calculated properly
          path
        });
      }
    }

    if (vnode.type === 'Element') {
      const children = (vnode as any).children || [];
      children.forEach((child: VNode, index: number) => {
        this.extractTextTemplates(child, [...path, index], templates);
      });
    }
  }

  private diffProps(oldProps: any, newProps: any): Record<string, any> {
    const changes: Record<string, any> = {};

    // Check for changed/added props
    for (const [key, value] of Object.entries(newProps || {})) {
      if (oldProps?.[key] !== value) {
        changes[key] = value;
      }
    }

    // Check for removed props
    for (const key of Object.keys(oldProps || {})) {
      if (!(key in (newProps || {}))) {
        changes[key] = null;
      }
    }

    return changes;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  private isSelfClosing(tag: string): boolean {
    return ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag);
  }
}
```

**Tasks:**
- [ ] Implement WASM module loading
- [ ] Build JS fallback implementations
- [ ] Create VNode to HTML conversion
- [ ] Implement patch computation
- [ ] Add template extraction
- [ ] Write unit tests for both WASM and JS paths

---

## Phase 3: Test Client (Weeks 7-9)

### Objectives
- Build TestClient extending Minimact
- Expose internals for assertions
- Create event simulation
- Implement async utilities

### Deliverables

#### 3.1 Test Client

**File:** `src/render/TestClient.ts`

```typescript
import { Minimact } from 'minimact';
import { TemplateRenderer } from 'minimact/template-renderer';
import { HintQueue } from 'minimact/hint-queue';
import { DOMPatcher } from 'minimact/dom-patcher';
import { MockSignalRConnection } from '../mocks/SignalR';
import { MockServer } from '../server/MockServer';

export interface TestClientOptions {
  mockServer: MockServer;
  enableDebugLogging?: boolean;
}

/**
 * Extended Minimact client for testing
 * Exposes internals and provides testing utilities
 */
export class TestClient extends Minimact {
  // Expose internals for assertions
  public templateRenderer: TemplateRenderer;
  public hintQueue: HintQueue;
  public domPatcher: DOMPatcher;
  public mockSignalR: MockSignalRConnection;
  public mockServer: MockServer;

  // Track operations for assertions
  private patchHistory: Array<{ timestamp: Date; patches: any[] }> = [];
  private templateHistory: Array<{ timestamp: Date; template: any }> = [];
  private stateHistory: Array<{ timestamp: Date; componentId: string; stateKey: string; value: any }> = [];

  constructor(rootElement: HTMLElement, options: TestClientOptions) {
    // Create mock SignalR connection
    const mockSignalR = new MockSignalRConnection(options.mockServer);

    // Initialize parent with mock connection
    super(rootElement, {
      hubUrl: '/test', // Not used in mock mode
      enableDebugLogging: options.enableDebugLogging
    });

    // Replace SignalR with mock
    (this as any).signalR = mockSignalR;
    this.mockSignalR = mockSignalR;
    this.mockServer = options.mockServer;

    // Expose internals
    this.templateRenderer = (this as any).templateRenderer;
    this.hintQueue = (this as any).hintQueue;
    this.domPatcher = (this as any).domPatcher;

    // Hook into operations for tracking
    this.setupTracking();
  }

  /**
   * Set up tracking for assertions
   */
  private setupTracking(): void {
    // Track patch applications
    const originalApplyPatches = this.domPatcher.applyPatches.bind(this.domPatcher);
    this.domPatcher.applyPatches = (element: HTMLElement, patches: any[]) => {
      this.patchHistory.push({
        timestamp: new Date(),
        patches: [...patches]
      });
      return originalApplyPatches(element, patches);
    };

    // Track template materializations
    const originalMaterialize = this.templateRenderer.materializePatch.bind(this.templateRenderer);
    (this.templateRenderer as any).materializePatch = (patch: any, state: any) => {
      this.templateHistory.push({
        timestamp: new Date(),
        template: { patch, state }
      });
      return originalMaterialize(patch, state);
    };
  }

  // ============================================================
  // Test Utilities
  // ============================================================

  /**
   * Wait for template to be cached
   */
  async waitForTemplate(templateId: string, timeout = 5000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (this.hintQueue.hasTemplate(templateId)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for template: ${templateId}`);
  }

  /**
   * Wait for server state sync
   */
  async waitForServerSync(timeout = 5000): Promise<void> {
    // In mock mode, sync is immediate
    // But we add small delay to simulate real behavior
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Wait for patches to be applied
   */
  async waitForPatches(minCount = 1, timeout = 5000): Promise<void> {
    const start = Date.now();
    const initialCount = this.patchHistory.length;

    while (Date.now() - start < timeout) {
      if (this.patchHistory.length >= initialCount + minCount) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for ${minCount} patches`);
  }

  /**
   * Get component state from server
   */
  getComponentState(componentId: string): any {
    return this.mockServer.getComponentState(componentId);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    return this.hintQueue.getCacheHitRate();
  }

  /**
   * Get last applied patches
   */
  getLastPatches(count = 1): any[][] {
    return this.patchHistory
      .slice(-count)
      .map(entry => entry.patches);
  }

  /**
   * Get last materialized templates
   */
  getLastTemplates(count = 1): any[] {
    return this.templateHistory
      .slice(-count)
      .map(entry => entry.template);
  }

  /**
   * Clear history (for fresh assertions in multi-step tests)
   */
  clearHistory(): void {
    this.patchHistory = [];
    this.templateHistory = [];
    this.stateHistory = [];
  }

  /**
   * Get debug snapshot for test failures
   */
  getDebugSnapshot(): any {
    return {
      patchHistory: this.patchHistory,
      templateHistory: this.templateHistory,
      stateHistory: this.stateHistory,
      cacheHitRate: this.getCacheHitRate(),
      templates: this.hintQueue.getAllTemplates(),
      serverState: this.mockServer.getAllComponentStates()
    };
  }
}
```

**Tasks:**
- [ ] Extend Minimact class
- [ ] Expose internal subsystems
- [ ] Implement operation tracking
- [ ] Build test utilities
- [ ] Add debug helpers
- [ ] Write unit tests

#### 3.2 Event Simulation

**File:** `src/events/fireEvent.ts`

```typescript
import { TestClient } from '../render/TestClient';

/**
 * Simulate user events on DOM elements
 * Mimics real browser behavior including SignalR communication
 */
export const fireEvent = {
  /**
   * Simulate click event
   */
  async click(element: HTMLElement, client?: TestClient): Promise<void> {
    // 1. Fire DOM event
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);

    // 2. If client provided, wait for processing
    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate input event (for text inputs)
   */
  async input(element: HTMLInputElement, value: string, client?: TestClient): Promise<void> {
    // 1. Set value
    element.value = value;

    // 2. Fire input event
    const event = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: value
    });
    element.dispatchEvent(event);

    // 3. Wait for processing
    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate change event
   */
  async change(element: HTMLElement, value: any, client?: TestClient): Promise<void> {
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
      (element as any).value = value;
    }

    const event = new Event('change', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate submit event
   */
  async submit(form: HTMLFormElement, client?: TestClient): Promise<void> {
    const event = new Event('submit', {
      bubbles: true,
      cancelable: true
    });
    form.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate keyboard events
   */
  async keyDown(element: HTMLElement, key: string, client?: TestClient): Promise<void> {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  async keyUp(element: HTMLElement, key: string, client?: TestClient): Promise<void> {
    const event = new KeyboardEvent('keyup', {
      key,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate mouse events
   */
  async mouseEnter(element: HTMLElement, client?: TestClient): Promise<void> {
    const event = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  async mouseLeave(element: HTMLElement, client?: TestClient): Promise<void> {
    const event = new MouseEvent('mouseleave', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  /**
   * Simulate focus/blur
   */
  async focus(element: HTMLElement, client?: TestClient): Promise<void> {
    element.focus();

    const event = new FocusEvent('focus', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  },

  async blur(element: HTMLElement, client?: TestClient): Promise<void> {
    element.blur();

    const event = new FocusEvent('blur', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);

    if (client) {
      await client.waitForServerSync();
    }
  }
};
```

**Tasks:**
- [ ] Implement all common DOM events
- [ ] Add event option support
- [ ] Create async handling
- [ ] Build synthetic event helpers
- [ ] Write unit tests

#### 3.3 Async Utilities

**File:** `src/events/waitFor.ts`

```typescript
/**
 * Wait for a condition to be true
 */
export async function waitFor(
  callback: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 50;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await callback();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition (${timeout}ms)`);
}

/**
 * Wait for element to appear
 */
export async function waitForElement(
  selector: string,
  options?: { timeout?: number }
): Promise<HTMLElement> {
  let element: HTMLElement | null = null;

  await waitFor(() => {
    element = document.querySelector(selector);
    return !!element;
  }, options);

  return element!;
}

/**
 * Wait for text content
 */
export async function waitForText(
  element: HTMLElement,
  text: string,
  options?: { timeout?: number }
): Promise<void> {
  await waitFor(() => {
    return element.textContent?.includes(text) || false;
  }, options);
}

/**
 * Wait for element to be removed
 */
export async function waitForElementToBeRemoved(
  element: HTMLElement,
  options?: { timeout?: number }
): Promise<void> {
  await waitFor(() => {
    return !document.body.contains(element);
  }, options);
}
```

**Tasks:**
- [ ] Implement waitFor with timeout
- [ ] Add element waiting utilities
- [ ] Create text content waiting
- [ ] Build removal waiting
- [ ] Write unit tests

---

## Phase 4: Assertions (Weeks 10-11)

### Objectives
- Create Minimact-specific assertions
- Build template assertions
- Add state sync assertions
- Implement performance assertions

### Deliverables

#### 4.1 Template Assertions

**File:** `src/assertions/template.ts`

```typescript
import { TestClient } from '../render/TestClient';
import { expect } from 'vitest';

/**
 * Template-specific assertions for Minimact
 */
export const expectTemplate = {
  /**
   * Assert template was materialized with specific values
   */
  toHaveBeenMaterialized(
    client: TestClient,
    expectedTemplate: string,
    expectedState: Record<string, any>
  ): void {
    const last = client.getLastTemplates(1)[0];

    if (!last) {
      throw new Error('No templates have been materialized');
    }

    expect(last.patch.template).toBe(expectedTemplate);

    // Check state bindings
    const { bindings } = last.patch;
    bindings.forEach((binding: string) => {
      expect(last.state).toHaveProperty(binding);
      expect(last.state[binding]).toBe(expectedState[binding]);
    });
  },

  /**
   * Assert template exists in cache
   */
  toBeCached(
    client: TestClient,
    componentId: string,
    stateChanges: Record<string, any>
  ): void {
    const hint = client.hintQueue.matchHint(componentId, stateChanges);
    expect(hint).toBeDefined();
  },

  /**
   * Assert cache hit rate meets minimum
   */
  toHaveCacheHitRate(
    client: TestClient,
    minRate: number
  ): void {
    const rate = client.getCacheHitRate();
    expect(rate).toBeGreaterThanOrEqual(minRate);
  },

  /**
   * Assert loop template exists
   */
  toHaveLoopTemplate(
    client: TestClient,
    arrayBinding: string
  ): void {
    const templates = client.hintQueue.getAllTemplates();
    const loopTemplate = Array.from(templates.values()).find(
      t => t.loopTemplate?.array_binding === arrayBinding
    );

    expect(loopTemplate).toBeDefined();
  },

  /**
   * Assert conditional template has correct branches
   */
  toHaveConditionalBranches(
    client: TestClient,
    conditionBinding: string,
    branches: Record<string, string>
  ): void {
    const templates = client.hintQueue.getAllTemplates();
    const conditionalTemplate = Array.from(templates.values()).find(
      t => t.conditionalTemplates && t.bindings.includes(conditionBinding)
    );

    expect(conditionalTemplate).toBeDefined();
    expect(conditionalTemplate!.conditionalTemplates).toEqual(branches);
  },

  /**
   * Assert template binding dependencies
   */
  toHaveBindings(
    client: TestClient,
    templateId: string,
    expectedBindings: string[]
  ): void {
    const template = client.hintQueue.getTemplate(templateId);
    expect(template).toBeDefined();
    expect(template!.bindings).toEqual(expectedBindings);
  },

  /**
   * Assert template materialized to specific value
   */
  toMaterializeAs(
    client: TestClient,
    template: string,
    state: Record<string, any>,
    expectedResult: string
  ): void {
    const result = client.templateRenderer.renderTemplate(
      template,
      Object.values(state)
    );
    expect(result).toBe(expectedResult);
  }
};
```

**Tasks:**
- [ ] Implement materialization assertions
- [ ] Build cache assertions
- [ ] Create loop template assertions
- [ ] Add conditional assertions
- [ ] Write self-tests

#### 4.2 State Assertions

**File:** `src/assertions/state.ts`

```typescript
import { TestClient } from '../render/TestClient';
import { expect } from 'vitest';

/**
 * State synchronization assertions
 */
export const expectState = {
  /**
   * Assert client and server state are in sync
   */
  toBeSynced(
    client: TestClient,
    componentId: string,
    stateKey: string,
    expectedValue: any
  ): void {
    // Check server state
    const serverState = client.getComponentState(componentId);
    expect(serverState).toHaveProperty(stateKey);
    expect(serverState[stateKey]).toEqual(expectedValue);

    // Check client state (via state manager)
    // This would need access to client-side state
    // Implementation depends on how state is exposed
  },

  /**
   * Assert server has correct state
   */
  toHaveServerState(
    client: TestClient,
    componentId: string,
    expectedState: Record<string, any>
  ): void {
    const serverState = client.getComponentState(componentId);

    for (const [key, value] of Object.entries(expectedState)) {
      expect(serverState).toHaveProperty(key);
      expect(serverState[key]).toEqual(value);
    }
  },

  /**
   * Assert DOM element state was synced
   */
  toHaveDomStateSynced(
    client: TestClient,
    componentId: string,
    stateKey: string,
    snapshot: any
  ): void {
    const serverState = client.getComponentState(componentId);
    expect(serverState.domState).toHaveProperty(stateKey);
    expect(serverState.domState[stateKey]).toEqual(snapshot);
  }
};
```

**Tasks:**
- [ ] Implement sync assertions
- [ ] Build state comparison
- [ ] Create DOM state assertions
- [ ] Write self-tests

#### 4.3 Performance Assertions

**File:** `src/assertions/performance.ts`

```typescript
import { TestClient } from '../render/TestClient';
import { expect } from 'vitest';

/**
 * Performance-related assertions
 */
export const expectPerformance = {
  /**
   * Assert cache hit rate is above threshold
   */
  toHaveCacheHitRate(
    client: TestClient,
    minRate: number
  ): void {
    const rate = client.getCacheHitRate();
    expect(rate).toBeGreaterThanOrEqual(minRate);
  },

  /**
   * Assert template materialization time
   */
  toMaterializeWithin(
    client: TestClient,
    maxMs: number,
    template: any,
    state: Record<string, any>
  ): void {
    const start = performance.now();
    client.templateRenderer.materializePatch(template, state);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(maxMs);
  },

  /**
   * Assert number of patches applied
   */
  toApplyPatchCount(
    client: TestClient,
    expectedCount: number
  ): void {
    const lastPatches = client.getLastPatches(1)[0];
    expect(lastPatches).toHaveLength(expectedCount);
  },

  /**
   * Assert patches applied within time limit
   */
  toApplyPatchesWithin(
    client: TestClient,
    maxMs: number
  ): void {
    // This would require timing tracking in TestClient
    // Implementation TBD based on requirements
  }
};
```

**Tasks:**
- [ ] Implement cache hit rate assertions
- [ ] Build timing assertions
- [ ] Create patch count assertions
- [ ] Write self-tests

---

## Phase 5: Documentation & Examples (Week 12)

### Objectives
- Write comprehensive documentation
- Create example test suites
- Build migration guide
- Add API reference

### Deliverables

#### 5.1 Main Documentation

**File:** `README.md`

```markdown
# minimact-test

Official testing framework for Minimact - server-side React with template prediction.

## Installation

```bash
npm install --save-dev minimact-test vitest
```

## Quick Start

```typescript
import { describe, it, expect } from 'vitest';
import { renderComponent, fireEvent, expectTemplate } from 'minimact-test';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments count on click', async () => {
    const { container, client } = await renderComponent(Counter);

    await fireEvent.click(container.querySelector('button'));

    expect(container.querySelector('button').textContent).toBe('Count: 1');
    expectTemplate.toBeCached(client, 'counter', { count: 1 });
  });
});
```

## Features

- ✅ Server-side rendering simulation
- ✅ Template prediction testing
- ✅ State synchronization verification
- ✅ Cache hit rate assertions
- ✅ Performance benchmarking
- ✅ Mock SignalR communication
- ✅ Full TypeScript support

## API Reference

### renderComponent()

Render a Minimact component for testing.

```typescript
const { container, client, server } = await renderComponent(MyComponent, {
  initialState: { count: 0 },
  props: { title: 'Test' },
  enableDebugLogging: false
});
```

### fireEvent

Simulate user interactions.

```typescript
await fireEvent.click(element);
await fireEvent.input(input, 'Hello');
await fireEvent.change(select, 'option2');
```

### expectTemplate

Template-specific assertions.

```typescript
expectTemplate.toBeCached(client, componentId, stateChanges);
expectTemplate.toHaveLoopTemplate(client, 'todos');
expectTemplate.toHaveCacheHitRate(client, 0.95);
```

### expectState

State synchronization assertions.

```typescript
expectState.toBeSynced(client, componentId, 'count', 42);
expectState.toHaveServerState(client, componentId, { count: 42 });
```

## Examples

See `/examples` directory for complete test suites.

## License

MIT
```

#### 5.2 Example Test Suites

**File:** `examples/counter.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { renderComponent, fireEvent, expectTemplate, expectState } from 'minimact-test';

describe('Counter Component', () => {
  it('renders initial state', async () => {
    const { container } = await renderComponent(Counter, {
      initialState: { count: 0 }
    });

    expect(container.querySelector('button')?.textContent).toBe('Count: 0');
  });

  it('increments on click', async () => {
    const { container, client } = await renderComponent(Counter);

    const button = container.querySelector('button');
    await fireEvent.click(button!);

    expect(button?.textContent).toBe('Count: 1');
    expectState.toHaveServerState(client, 'counter', { count: 1 });
  });

  it('uses template after first click', async () => {
    const { container, client } = await renderComponent(Counter);

    const button = container.querySelector('button');

    // First click - learns template
    await fireEvent.click(button!);
    expectTemplate.toHaveBindings(client, 'count_text', ['count']);

    // Second click - uses template
    client.clearHistory();
    await fireEvent.click(button!);
    expectTemplate.toBeCached(client, 'counter', { count: 2 });
  });

  it('maintains high cache hit rate', async () => {
    const { container, client } = await renderComponent(Counter);

    const button = container.querySelector('button');

    // Click 100 times
    for (let i = 0; i < 100; i++) {
      await fireEvent.click(button!);
    }

    expectTemplate.toHaveCacheHitRate(client, 0.99);
  });
});
```

**File:** `examples/todo-list.test.ts`

```typescript
describe('TodoList Component', () => {
  it('adds todo with loop template', async () => {
    const { container, client } = await renderComponent(TodoList);

    // Add first todo
    const input = container.querySelector('input');
    await fireEvent.input(input!, 'Buy milk');
    await fireEvent.click(container.querySelector('button.add')!);

    // Check loop template was created
    expectTemplate.toHaveLoopTemplate(client, 'todos');

    // Add second todo - should use template
    await fireEvent.input(input!, 'Buy eggs');
    await fireEvent.click(container.querySelector('button.add')!);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Buy milk');
    expect(items[1].textContent).toContain('Buy eggs');
  });

  it('deletes todo with reorder template', async () => {
    const { container, client } = await renderComponent(TodoList, {
      initialState: {
        todos: [
          { id: 1, text: 'A' },
          { id: 2, text: 'B' },
          { id: 3, text: 'C' }
        ]
      }
    });

    // Delete middle item
    const deleteButtons = container.querySelectorAll('.delete');
    await fireEvent.click(deleteButtons[1]);

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('A');
    expect(items[1].textContent).toContain('C');
  });
});
```

**Tasks:**
- [ ] Write README with quick start
- [ ] Create API reference
- [ ] Build example test suites
- [ ] Add migration guide from other frameworks
- [ ] Write troubleshooting guide

---

## Phase 6: Advanced Features (Weeks 13-16)

### Objectives
- Add E2E testing support
- Build snapshot testing
- Create visual regression testing
- Implement performance profiling

### Deliverables

#### 6.1 E2E Testing Integration

**File:** `src/e2e/playwright.ts`

```typescript
import { test as base } from '@playwright/test';
import { MinimactTestServer } from './test-server';

/**
 * Playwright integration for E2E testing
 */
export const test = base.extend<{
  minimactServer: MinimactTestServer;
}>({
  minimactServer: async ({}, use) => {
    const server = new MinimactTestServer({
      port: 5555,
      enableTemplateExtraction: true
    });

    await server.start();
    await use(server);
    await server.stop();
  }
});

export { expect } from '@playwright/test';
```

**Example E2E Test:**

```typescript
import { test, expect } from 'minimact-test/e2e';

test('counter increments on click', async ({ page, minimactServer }) => {
  await page.goto('http://localhost:5555/counter');

  const button = page.locator('button');
  await expect(button).toHaveText('Count: 0');

  await button.click();
  await expect(button).toHaveText('Count: 1');

  // Assert template was used
  const stats = await minimactServer.getTemplateStats();
  expect(stats.cacheHitRate).toBeGreaterThan(0.95);
});
```

#### 6.2 Snapshot Testing

**File:** `src/snapshots/snapshot.ts`

```typescript
/**
 * Snapshot testing for Minimact components
 */
export async function toMatchSnapshot(
  component: any,
  options?: {
    initialState?: any;
    props?: any;
  }
): Promise<void> {
  const { container } = await renderComponent(component, options);

  // Snapshot HTML
  expect(container.innerHTML).toMatchSnapshot();

  // Optionally snapshot templates
  // expect(client.hintQueue.getAllTemplates()).toMatchSnapshot();
}
```

**Example:**

```typescript
it('matches snapshot', async () => {
  await toMatchSnapshot(Counter, {
    initialState: { count: 42 }
  });
});
```

#### 6.3 Performance Profiling

**File:** `src/profiling/profiler.ts`

```typescript
/**
 * Performance profiler for Minimact tests
 */
export class MinimactProfiler {
  private metrics: {
    templateMaterialization: number[];
    patchApplication: number[];
    serverRoundTrip: number[];
    cacheHits: number;
    cacheMisses: number;
  };

  startProfiling(client: TestClient): void {
    // Hook into client operations and track timings
  }

  stopProfiling(): ProfilingReport {
    return {
      avgTemplateMaterialization: this.avg(this.metrics.templateMaterialization),
      avgPatchApplication: this.avg(this.metrics.patchApplication),
      avgServerRoundTrip: this.avg(this.metrics.serverRoundTrip),
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      p95TemplateMaterialization: this.percentile(this.metrics.templateMaterialization, 0.95),
      p99TemplateMaterialization: this.percentile(this.metrics.templateMaterialization, 0.99)
    };
  }
}
```

**Example:**

```typescript
it('meets performance requirements', async () => {
  const { client } = await renderComponent(BigList, {
    initialState: { items: generateItems(1000) }
  });

  const profiler = new MinimactProfiler();
  profiler.startProfiling(client);

  // Perform 100 operations
  for (let i = 0; i < 100; i++) {
    await fireEvent.click(container.querySelector('.sort'));
  }

  const report = profiler.stopProfiling();

  expect(report.avgTemplateMaterialization).toBeLessThan(5);
  expect(report.cacheHitRate).toBeGreaterThan(0.95);
});
```

**Tasks:**
- [ ] Build Playwright integration
- [ ] Implement snapshot testing
- [ ] Create performance profiler
- [ ] Add visual regression testing
- [ ] Write documentation

---

## Testing Strategy

### Unit Tests
- Template rendering
- Patch computation
- State synchronization
- Event handling

### Integration Tests
- Component rendering
- Template caching
- Mock server communication
- State sync flow

### E2E Tests
- Full application flow
- Real server integration
- Browser behavior
- Performance benchmarks

---

## Success Metrics

1. **Coverage**
   - [ ] 90%+ code coverage
   - [ ] All public APIs tested
   - [ ] Edge cases covered

2. **Performance**
   - [ ] Test suite runs in < 5 seconds (unit)
   - [ ] Test suite runs in < 30 seconds (integration)
   - [ ] E2E tests run in < 2 minutes

3. **Developer Experience**
   - [ ] Clear error messages
   - [ ] Helpful debug utilities
   - [ ] Comprehensive documentation
   - [ ] Easy to get started

---

## Dependencies

### Required
- `vitest` or `jest` - Test runner
- `jsdom` or `happy-dom` - DOM environment
- `@playwright/test` - E2E testing (optional)

### Peer Dependencies
- `minimact` - The framework being tested

### Internal Dependencies
- Rust reconciler (WASM) - For accurate patch computation
- Minimact types - Shared type definitions

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WASM module availability | High | Implement JS fallback |
| SignalR mock accuracy | Medium | Extensive integration tests |
| Performance overhead | Low | Optimize with caching |
| Browser API compatibility | Medium | Use JSDOM/Happy-DOM |

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Foundation | 3 weeks | Project setup, mock SignalR, basic renderer |
| 2. Mock Server | 3 weeks | Server implementation, reconciler, registry |
| 3. Test Client | 3 weeks | Extended client, events, utilities |
| 4. Assertions | 2 weeks | Template, state, performance assertions |
| 5. Documentation | 1 week | README, examples, migration guide |
| 6. Advanced | 4 weeks | E2E, snapshots, profiling |
| **Total** | **16 weeks** | Complete testing framework |

---

## Future Enhancements

- [ ] Visual regression testing with Percy/Chromatic
- [ ] Coverage reports for templates (not just code)
- [ ] Mutation testing
- [ ] Performance regression detection
- [ ] Browser compatibility testing
- [ ] Accessibility testing integration
- [ ] Test generation from component types

---

## Getting Started

```bash
# Install
npm install --save-dev minimact-test

# Run tests
npm test

# With coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

---

**Built with ❤️ for the Minimact community**
