/**
 * MockSignalRServer - WebSocket-based mock server for Playwright tests
 *
 * Implements SignalR's WebSocket protocol so real client code can connect.
 * Runs as a real HTTP/WebSocket server that Chromium can connect to.
 *
 * Architecture:
 * - Playwright test (Node.js) controls this mock server
 * - Real Minimact client (in Chromium) connects via WebSocket
 * - Bidirectional communication flows through real WebSocket
 *
 * Usage:
 *   const server = new MockSignalRServer(8080);
 *   await server.start();
 *
 *   // In test: Control server behavior
 *   server.queueHint('Counter-123', { hintId: 'inc', patches: [...] });
 *
 *   // In browser: Real client connects
 *   const connection = new signalR.HubConnectionBuilder()
 *     .withUrl('http://localhost:8080/minimact')
 *     .build();
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

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

interface SignalRMessage {
  type: number; // 1 = Invocation, 2 = StreamItem, 3 = Completion, 4 = StreamInvocation, 5 = CancelInvocation, 6 = Ping, 7 = Close
  invocationId?: string;
  target?: string;
  arguments?: any[];
  error?: string;
  result?: any;
}

const RECORD_SEPARATOR = String.fromCharCode(0x1e);

export class MockSignalRServer {
  private httpServer: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private componentStates: Map<string, ComponentState> = new Map();
  private componentDomStates: Map<string, Map<string, any>> = new Map();
  private hintQueues: Map<string, Hint[]> = new Map();
  private templateMaps: Map<string, TemplateMap> = new Map();
  private methodHandlers: Map<string, (componentId: string, method: string, params: any[]) => void | Promise<void>> = new Map();
  private port: number;
  private nextConnectionId = 1;

  constructor(port: number = 8080) {
    this.port = port;

    // Create HTTP server for SignalR negotiate endpoint
    this.httpServer = createServer(this.handleHttpRequest.bind(this));

    // Create WebSocket server
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', this.handleConnection.bind(this));

    // Handle upgrade to WebSocket
    this.httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url || '');

      if (pathname === '/minimact') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  /**
   * Handle HTTP requests (negotiate endpoint)
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const { pathname } = parse(req.url || '');

    console.log(`[MockServer] HTTP Request: ${req.method} ${req.url} (pathname: ${pathname})`);

    // CORS headers (can't use * when credentials are included)
    const origin = req.headers.origin || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-requested-with, x-signalr-user-agent');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // SignalR negotiate endpoint (with or without query params)
    if (pathname === '/minimact/negotiate' || pathname?.startsWith('/minimact/negotiate')) {
      const connectionId = `conn-${this.nextConnectionId++}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connectionId,
        availableTransports: [
          { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }
        ]
      }));
      console.log(`[MockServer] Negotiate complete: ${connectionId}`);
      return;
    }

    console.log(`[MockServer] 404: ${pathname}`);
    res.writeHead(404);
    res.end('Not found');
  }

  /**
   * Handle WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const { query } = parse(req.url || '', true);
    const connectionId = (query.id as string) || `conn-${this.nextConnectionId++}`;

    console.log(`[MockServer] Client connected: ${connectionId}`);
    this.clients.set(connectionId, ws);

    // Send handshake response (SignalR protocol)
    ws.send('{}' + RECORD_SEPARATOR);

    ws.on('message', (data: Buffer) => {
      this.handleMessage(connectionId, ws, data.toString());
    });

    ws.on('close', () => {
      console.log(`[MockServer] Client disconnected: ${connectionId}`);
      this.clients.delete(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`[MockServer] WebSocket error for ${connectionId}:`, error);
    });

    // Send initial data
    setTimeout(() => this.sendInitialData(connectionId, ws), 100);
  }

  /**
   * Handle incoming SignalR message
   */
  private handleMessage(connectionId: string, ws: WebSocket, data: string): void {
    // SignalR uses record separator to delimit messages
    const messages = data.split(RECORD_SEPARATOR).filter(m => m.trim());

    for (const msgStr of messages) {
      try {
        const msg: SignalRMessage = JSON.parse(msgStr);

        if (msg.type === 6) {
          // Ping - respond with ping
          this.send(ws, { type: 6 });
          continue;
        }

        if (msg.type === 1 && msg.target) {
          // Invocation
          this.handleInvocation(connectionId, ws, msg);
        }
      } catch (error) {
        console.error('[MockServer] Error parsing message:', error);
      }
    }
  }

  /**
   * Handle method invocation from client
   */
  private async handleInvocation(connectionId: string, ws: WebSocket, msg: SignalRMessage): Promise<void> {
    const target = msg.target!;
    const args = msg.arguments || [];
    const invocationId = msg.invocationId;

    console.log(`[MockServer] Invocation: ${target}`, args);

    try {
      let result: any;

      switch (target) {
        case 'InvokeComponentMethod':
          result = await this.handleComponentMethod(connectionId, ws, args[0], args[1], args[2]);
          break;

        case 'UpdateComponentState':
          result = await this.handleUpdateComponentState(connectionId, ws, args[0], args[1], args[2]);
          break;

        case 'UpdateDomElementState':
          result = await this.handleUpdateDomElementState(connectionId, ws, args[0], args[1], args[2]);
          break;

        case 'RegisterComponent':
          result = this.handleRegisterComponent(args[0]);
          break;

        default:
          console.warn(`[MockServer] Unknown target: ${target}`);
      }

      // Send completion
      if (invocationId) {
        this.send(ws, {
          type: 3, // Completion
          invocationId,
          result
        });
      }
    } catch (error: any) {
      // Send error
      if (invocationId) {
        this.send(ws, {
          type: 3, // Completion
          invocationId,
          error: error.message
        });
      }
    }
  }

  /**
   * Send SignalR message to client
   */
  private send(ws: WebSocket, msg: SignalRMessage | any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg) + RECORD_SEPARATOR);
    }
  }

  /**
   * Send message to specific client by connection ID
   */
  private sendToClient(connectionId: string, target: string, ...args: any[]): void {
    const ws = this.clients.get(connectionId);
    if (ws) {
      this.send(ws, {
        type: 1, // Invocation
        target,
        arguments: args
      });
    }
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(target: string, ...args: any[]): void {
    this.clients.forEach((ws, connectionId) => {
      this.sendToClient(connectionId, target, ...args);
    });
  }

  /**
   * Send initial data when client connects
   */
  private sendInitialData(connectionId: string, ws: WebSocket): void {
    // Send template maps
    this.templateMaps.forEach((templateMap, componentId) => {
      this.send(ws, {
        type: 1,
        target: 'HotReload:TemplateMap',
        arguments: [{
          componentId,
          templates: templateMap
        }]
      });
    });

    // Send queued hints
    this.hintQueues.forEach((hints, componentId) => {
      hints.forEach(hint => {
        this.send(ws, {
          type: 1,
          target: 'QueueHint',
          arguments: [{
            componentId,
            ...hint
          }]
        });
      });
    });
  }

  /**
   * Handle InvokeComponentMethod
   */
  private async handleComponentMethod(connectionId: string, ws: WebSocket, componentId: string, method: string, params: any[]): Promise<void> {
    console.log(`[MockServer] Invoking ${method} on ${componentId}`);

    // Check for custom handler
    const customHandler = this.methodHandlers.get(method);
    if (customHandler) {
      await customHandler(componentId, method, params);
      return;
    }

    // Default handling
    const state = this.componentStates.get(componentId);
    if (!state) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Simulate common methods
    if (method === 'increment') {
      const currentCount = state.count || 0;
      const newCount = currentCount + 1;
      state.count = newCount;

      // Send patches after delay (simulate rendering)
      setTimeout(() => {
        this.sendToClient(connectionId, 'ApplyPatches', {
          componentId,
          patches: [
            { op: 'replace', path: '/count', value: newCount }
          ]
        });
      }, 10);
    }
  }

  /**
   * Handle UpdateComponentState
   */
  private async handleUpdateComponentState(connectionId: string, ws: WebSocket, componentId: string, stateKey: string, value: any): Promise<void> {
    console.log(`[MockServer] State update: ${componentId}.${stateKey} = ${value}`);

    const state = this.componentStates.get(componentId);
    if (!state) {
      throw new Error(`Component ${componentId} not found`);
    }

    state[stateKey] = value;

    // Send acknowledgment patches
    setTimeout(() => {
      this.sendToClient(connectionId, 'ApplyPatches', {
        componentId,
        patches: []
      });
    }, 5);
  }

  /**
   * Handle UpdateDomElementState
   */
  private async handleUpdateDomElementState(connectionId: string, ws: WebSocket, componentId: string, stateKey: string, snapshot: any): Promise<void> {
    console.log(`[MockServer] DOM state update: ${componentId}.${stateKey}`, snapshot);

    let domStates = this.componentDomStates.get(componentId);
    if (!domStates) {
      domStates = new Map();
      this.componentDomStates.set(componentId, domStates);
    }

    domStates.set(stateKey, snapshot);

    setTimeout(() => {
      this.sendToClient(connectionId, 'ApplyPatches', {
        componentId,
        patches: []
      });
    }, 5);
  }

  /**
   * Handle RegisterComponent
   */
  private handleRegisterComponent(componentId: string): void {
    console.log(`[MockServer] Registering component: ${componentId}`);
    if (!this.componentStates.has(componentId)) {
      this.registerComponent(componentId);
    }
  }

  // ============================================================================
  // PUBLIC API - Control from tests
  // ============================================================================

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`[MockServer] Listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close all WebSocket connections
      this.clients.forEach(ws => ws.close());
      this.clients.clear();

      // Close WebSocket server
      this.wss.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        // Close HTTP server
        this.httpServer.close((err) => {
          if (err) {
            reject(err);
            return;
          }

          console.log('[MockServer] Stopped');
          resolve();
        });
      });
    });
  }

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
   * Set template map for a component
   */
  setTemplateMap(componentId: string, templateMap: TemplateMap): void {
    this.templateMaps.set(componentId, templateMap);
  }

  /**
   * Register custom method handler
   */
  onMethod(methodName: string, handler: (componentId: string, method: string, params: any[]) => void | Promise<void>): void {
    this.methodHandlers.set(methodName, handler);
  }

  /**
   * Queue a hint for prediction
   */
  queueHint(componentId: string, hint: Hint): void {
    let hints = this.hintQueues.get(componentId);
    if (!hints) {
      hints = [];
      this.hintQueues.set(componentId, hints);
    }

    hints.push(hint);

    // Broadcast to all clients
    this.broadcast('QueueHint', {
      componentId,
      ...hint
    });
  }

  /**
   * Simulate hot reload
   */
  simulateHotReload(componentId: string, nodePath: string, template: string, params: any[]): void {
    this.broadcast('HotReload:TemplatePatch', {
      componentId,
      nodePath,
      template,
      params
    });
  }

  /**
   * Send patches to all clients
   */
  sendPatches(componentId: string, patches: Patch[]): void {
    this.broadcast('ApplyPatches', {
      componentId,
      patches
    });
  }

  /**
   * Get component state
   */
  getComponentState(componentId: string): ComponentState | undefined {
    return this.componentStates.get(componentId);
  }

  /**
   * Get DOM element state
   */
  getDomElementState(componentId: string, stateKey: string): any | undefined {
    const domStates = this.componentDomStates.get(componentId);
    return domStates?.get(stateKey);
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.componentStates.clear();
    this.componentDomStates.clear();
    this.hintQueues.clear();
    this.templateMaps.clear();
    this.methodHandlers.clear();
  }
}
