/**
 * MockMinimactServer - Server-side mock for testing bidirectional communication
 *
 * Simulates the Minimact server hub:
 * - Handles client method invocations
 * - Maintains component state
 * - Sends patches back to clients
 * - Manages hint queue
 * - Simulates hot reload
 *
 * Usage:
 *   const mockServer = new MockMinimactServer();
 *   mockServer.registerComponent('Counter-123', { count: 0 });
 *   mockServer.simulateMethodCall('Counter-123', 'increment');
 */

import type { MockSignalRConnection } from './MockSignalRConnection';

export interface ComponentState {
  [key: string]: any;
}

export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: any;
}

export interface Hint {
  hintId: string;
  patches: Patch[];
  confidence: number;
  stateChanges?: Record<string, any>;
}

export interface TemplateMap {
  [nodePath: string]: {
    template: string;
    bindings: string[];
    slots: number[];
  };
}

export class MockMinimactServer {
  private clients: Map<string, MockSignalRConnection> = new Map();
  private componentStates: Map<string, ComponentState> = new Map();
  private componentDomStates: Map<string, Map<string, any>> = new Map();
  private hintQueues: Map<string, Hint[]> = new Map();
  private templateMaps: Map<string, TemplateMap> = new Map();
  private methodHandlers: Map<string, (componentId: string, method: string, params: any[]) => void | Promise<void>> = new Map();

  /**
   * Register a component with initial state
   */
  registerComponent(componentId: string, initialState: ComponentState = {}): void {
    this.componentStates.set(componentId, { ...initialState });
    this.componentDomStates.set(componentId, new Map());
    this.hintQueues.set(componentId, []);
    console.log(`[MockServer] Component registered: ${componentId}`, initialState);
  }

  /**
   * Set template map for a component (for hot reload testing)
   */
  setTemplateMap(componentId: string, templateMap: TemplateMap): void {
    this.templateMaps.set(componentId, templateMap);
  }

  /**
   * Register custom method handler for testing
   */
  onMethod(methodName: string, handler: (componentId: string, method: string, params: any[]) => void | Promise<void>): void {
    this.methodHandlers.set(methodName, handler);
  }

  /**
   * INTERNAL: Register client connection
   */
  _registerClient(client: MockSignalRConnection): void {
    this.clients.set(client.connectionId, client);
    console.log(`[MockServer] Client connected: ${client.connectionId}`);

    // Send initial data to client
    this._sendInitialData(client);
  }

  /**
   * INTERNAL: Unregister client connection
   */
  _unregisterClient(client: MockSignalRConnection): void {
    this.clients.delete(client.connectionId);
    console.log(`[MockServer] Client disconnected: ${client.connectionId}`);
  }

  /**
   * INTERNAL: Send initial data when client connects
   */
  private _sendInitialData(client: MockSignalRConnection): void {
    // Send template maps for all components
    this.templateMaps.forEach((templateMap, componentId) => {
      client._receiveFromServer('HotReload:TemplateMap', {
        componentId,
        templates: templateMap
      });
    });

    // Send queued hints for all components
    this.hintQueues.forEach((hints, componentId) => {
      hints.forEach(hint => {
        client._receiveFromServer('QueueHint', {
          componentId,
          ...hint
        });
      });
    });
  }

  /**
   * INTERNAL: Handle client method invocation
   */
  async _handleClientInvoke(connectionId: string, methodName: string, ...args: any[]): Promise<any> {
    console.log(`[MockServer] Handling ${methodName}`, args);

    switch (methodName) {
      case 'InvokeComponentMethod':
        return this._handleComponentMethod(connectionId, args[0], args[1], args[2]);

      case 'UpdateComponentState':
        return this._handleUpdateComponentState(connectionId, args[0], args[1], args[2]);

      case 'UpdateDomElementState':
        return this._handleUpdateDomElementState(connectionId, args[0], args[1], args[2]);

      case 'RegisterComponent':
        return this._handleRegisterComponent(connectionId, args[0]);

      default:
        console.warn(`[MockServer] Unknown method: ${methodName}`);
        return undefined;
    }
  }

  /**
   * Handle InvokeComponentMethod
   */
  private async _handleComponentMethod(connectionId: string, componentId: string, method: string, params: any[]): Promise<void> {
    console.log(`[MockServer] Invoking ${method} on ${componentId}`);

    const client = this.clients.get(connectionId);
    if (!client) {
      throw new Error(`Client ${connectionId} not found`);
    }

    // Check for custom handler
    const customHandler = this.methodHandlers.get(method);
    if (customHandler) {
      await customHandler(componentId, method, params);
      return;
    }

    // Default handling for common methods
    const state = this.componentStates.get(componentId);
    if (!state) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Simulate method execution and state changes
    if (method === 'increment') {
      const currentCount = state.count || 0;
      const newCount = currentCount + 1;
      state.count = newCount;

      // Simulate server re-render and send patches
      setTimeout(() => {
        const patches: Patch[] = [
          { op: 'replace', path: '/count', value: newCount }
        ];

        client._receiveFromServer('ApplyPatches', {
          componentId,
          patches
        });
      }, 10); // Simulate 10ms server processing
    }
  }

  /**
   * Handle UpdateComponentState (from useState)
   */
  private async _handleUpdateComponentState(connectionId: string, componentId: string, stateKey: string, value: any): Promise<void> {
    console.log(`[MockServer] State update: ${componentId}.${stateKey} = ${value}`);

    const state = this.componentStates.get(componentId);
    if (!state) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Update server-side state
    state[stateKey] = value;

    const client = this.clients.get(connectionId);
    if (!client) {
      throw new Error(`Client ${connectionId} not found`);
    }

    // Simulate server re-render (usually matches prediction, sends empty patches)
    setTimeout(() => {
      client._receiveFromServer('ApplyPatches', {
        componentId,
        patches: [] // No correction needed
      });
    }, 5);
  }

  /**
   * Handle UpdateDomElementState (from useDomElementState)
   */
  private async _handleUpdateDomElementState(connectionId: string, componentId: string, stateKey: string, snapshot: any): Promise<void> {
    console.log(`[MockServer] DOM state update: ${componentId}.${stateKey}`, snapshot);

    let domStates = this.componentDomStates.get(componentId);
    if (!domStates) {
      domStates = new Map();
      this.componentDomStates.set(componentId, domStates);
    }

    // Store DOM state snapshot
    domStates.set(stateKey, snapshot);

    const client = this.clients.get(connectionId);
    if (!client) {
      throw new Error(`Client ${connectionId} not found`);
    }

    // Simulate server re-render
    setTimeout(() => {
      client._receiveFromServer('ApplyPatches', {
        componentId,
        patches: []
      });
    }, 5);
  }

  /**
   * Handle RegisterComponent
   */
  private _handleRegisterComponent(connectionId: string, componentId: string): void {
    console.log(`[MockServer] Registering component: ${componentId}`);
    if (!this.componentStates.has(componentId)) {
      this.registerComponent(componentId);
    }
  }

  /**
   * PUBLIC API: Queue a hint for prediction
   */
  queueHint(componentId: string, hint: Hint): void {
    let hints = this.hintQueues.get(componentId);
    if (!hints) {
      hints = [];
      this.hintQueues.set(componentId, hints);
    }

    hints.push(hint);

    // Send to all connected clients
    this.clients.forEach(client => {
      client._receiveFromServer('QueueHint', {
        componentId,
        ...hint
      });
    });
  }

  /**
   * PUBLIC API: Simulate hot reload template patch
   */
  simulateHotReload(componentId: string, nodePath: string, template: string, params: any[]): void {
    this.clients.forEach(client => {
      client._receiveFromServer('HotReload:TemplatePatch', {
        componentId,
        nodePath,
        template,
        params
      });
    });
  }

  /**
   * PUBLIC API: Simulate server sending patches
   */
  sendPatches(componentId: string, patches: Patch[]): void {
    this.clients.forEach(client => {
      client._receiveFromServer('ApplyPatches', {
        componentId,
        patches
      });
    });
  }

  /**
   * PUBLIC API: Get component state
   */
  getComponentState(componentId: string): ComponentState | undefined {
    return this.componentStates.get(componentId);
  }

  /**
   * PUBLIC API: Get DOM element state
   */
  getDomElementState(componentId: string, stateKey: string): any | undefined {
    const domStates = this.componentDomStates.get(componentId);
    return domStates?.get(stateKey);
  }

  /**
   * PUBLIC API: Get all connected clients
   */
  getConnectedClients(): MockSignalRConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * TESTING HELPER: Clear all state
   */
  reset(): void {
    this.componentStates.clear();
    this.componentDomStates.clear();
    this.hintQueues.clear();
    this.templateMaps.clear();
    this.methodHandlers.clear();
  }
}
