# SignalM Implementation Plan

**SignalM**: Lightweight real-time transport for modern browsers

---

## Overview

SignalM is a minimal real-time communication library for ASP.NET Core that provides the same developer experience as SignalR but optimized for modern browsers. It uses WebSocket + JSON only, eliminating legacy transport mechanisms and protocol overhead.

### Goals

1. ✅ **Tiny bundle**: 2-3 KB gzipped (vs SignalR's 18 KB)
2. ✅ **Drop-in compatible**: Works with SignalR Hub API on server
3. ✅ **Modern only**: WebSocket + JSON (no SSE, Long Polling, MessagePack)
4. ✅ **Same DX**: Familiar `invoke()` and `on()` API
5. ✅ **Standalone**: Can be used without Minimact
6. ✅ **Production-ready**: Reconnection, error handling, connection management

### Non-Goals

- ❌ Transport fallback (SSE, Long Polling)
- ❌ MessagePack protocol
- ❌ Streaming (IAsyncEnumerable)
- ❌ Legacy browser support (IE11, etc.)
- ❌ Protocol negotiation

---

## Architecture

### Client (TypeScript)

```
signalm/
├── src/
│   ├── SignalMConnection.ts      # Main connection class
│   ├── JsonProtocol.ts           # SignalR JSON protocol implementation
│   ├── WebSocketTransport.ts     # WebSocket wrapper
│   ├── RetryPolicy.ts            # Exponential backoff for reconnection
│   ├── EventEmitter.ts           # Event handling
│   ├── types.ts                  # TypeScript types
│   └── index.ts                  # Public API
├── package.json
├── tsconfig.json
├── rollup.config.js              # Build config
└── README.md
```

### Server (C#)

```
SignalM/
├── src/
│   ├── SignalMHub.cs             # Base hub class (extends Hub)
│   ├── SignalMMiddleware.cs      # WebSocket middleware
│   ├── SignalMConnectionManager.cs  # Connection tracking
│   ├── JsonProtocol.cs           # Protocol implementation
│   └── Extensions/
│       └── SignalMServiceExtensions.cs  # DI extensions
├── SignalM.csproj
└── README.md
```

---

## Phase 1: Client Implementation (TypeScript)

### 1.1 Core Connection Class

**File**: `src/SignalMConnection.ts`

```typescript
/**
 * SignalM Connection
 *
 * Lightweight WebSocket-based connection compatible with SignalR hubs.
 * Supports method invocation, event handling, and automatic reconnection.
 */
export class SignalMConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, Function[]>();
  private pendingInvocations = new Map<string, PendingInvocation>();
  private invocationId = 0;
  private reconnectPolicy: IRetryPolicy;
  private state: ConnectionState = ConnectionState.Disconnected;
  private reconnectAttempts = 0;
  private eventEmitter: EventEmitter;

  constructor(url: string, options?: SignalMOptions) {
    this.url = url;
    this.reconnectPolicy = options?.reconnectPolicy || new ExponentialBackoffRetryPolicy();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Start the connection
   */
  async start(): Promise<void> {
    if (this.state !== ConnectionState.Disconnected) {
      throw new Error('Connection is already started');
    }

    this.state = ConnectionState.Connecting;
    return this.connect();
  }

  /**
   * Stop the connection
   */
  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.state = ConnectionState.Disconnected;
    this.eventEmitter.emit('disconnected');
  }

  /**
   * Invoke a server method
   */
  async invoke<T = any>(methodName: string, ...args: any[]): Promise<T> {
    if (this.state !== ConnectionState.Connected) {
      throw new Error('Connection is not in Connected state');
    }

    const invocationId = this.generateInvocationId();
    const message = JsonProtocol.writeInvocation(invocationId, methodName, args);

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingInvocations.delete(invocationId);
        reject(new Error(`Invocation '${methodName}' timed out`));
      }, 30000); // 30 second timeout

      this.pendingInvocations.set(invocationId, {
        resolve,
        reject,
        timeout
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * Send a message without expecting a response
   */
  send(methodName: string, ...args: any[]): void {
    if (this.state !== ConnectionState.Connected) {
      throw new Error('Connection is not in Connected state');
    }

    const message = JsonProtocol.writeMessage(methodName, args);
    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Register a handler for server-to-client method calls
   */
  on(methodName: string, handler: (...args: any[]) => void): void {
    if (!this.handlers.has(methodName)) {
      this.handlers.set(methodName, []);
    }
    this.handlers.get(methodName)!.push(handler);
  }

  /**
   * Remove a handler
   */
  off(methodName: string, handler: (...args: any[]) => void): void {
    const handlers = this.handlers.get(methodName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Register event listeners (connected, disconnected, reconnecting, etc.)
   */
  onConnected(handler: () => void): void {
    this.eventEmitter.on('connected', handler);
  }

  onDisconnected(handler: () => void): void {
    this.eventEmitter.on('disconnected', handler);
  }

  onReconnecting(handler: () => void): void {
    this.eventEmitter.on('reconnecting', handler);
  }

  onReconnected(handler: () => void): void {
    this.eventEmitter.on('reconnected', handler);
  }

  /**
   * Get current connection state
   */
  get connectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Internal: Connect to WebSocket
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state = ConnectionState.Connected;
        this.reconnectAttempts = 0;
        this.eventEmitter.emit('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[SignalM] WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        this.handleClose(event);
      };
    });
  }

  /**
   * Internal: Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case MessageType.Invocation:
          // Server calling client method
          this.handleInvocation(message);
          break;

        case MessageType.Completion:
          // Response to client invoke()
          this.handleCompletion(message);
          break;

        case MessageType.Ping:
          // Server ping (respond with pong)
          this.handlePing();
          break;

        default:
          console.warn('[SignalM] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[SignalM] Error parsing message:', error);
    }
  }

  /**
   * Internal: Handle server-to-client invocation
   */
  private handleInvocation(message: InvocationMessage): void {
    const handlers = this.handlers.get(message.target);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...(message.arguments || []));
        } catch (error) {
          console.error(`[SignalM] Error in handler for '${message.target}':`, error);
        }
      });
    }
  }

  /**
   * Internal: Handle completion (response to invoke)
   */
  private handleCompletion(message: CompletionMessage): void {
    const pending = this.pendingInvocations.get(message.invocationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingInvocations.delete(message.invocationId);

      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  /**
   * Internal: Handle ping
   */
  private handlePing(): void {
    const pongMessage = JsonProtocol.writePong();
    this.ws?.send(JSON.stringify(pongMessage));
  }

  /**
   * Internal: Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    this.state = ConnectionState.Disconnected;
    this.ws = null;

    // Reject all pending invocations
    this.pendingInvocations.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    });
    this.pendingInvocations.clear();

    // Attempt reconnection if not normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    } else {
      this.eventEmitter.emit('disconnected');
    }
  }

  /**
   * Internal: Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    const delay = this.reconnectPolicy.nextRetryDelay(this.reconnectAttempts);

    if (delay === null) {
      // Max retries exceeded
      this.eventEmitter.emit('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.state = ConnectionState.Reconnecting;
    this.eventEmitter.emit('reconnecting');

    setTimeout(async () => {
      try {
        await this.connect();
        this.eventEmitter.emit('reconnected');
      } catch (error) {
        console.error('[SignalM] Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Internal: Build WebSocket URL
   */
  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = this.url.startsWith('/')
      ? `${protocol}//${window.location.host}${this.url}`
      : this.url;

    return baseUrl;
  }

  /**
   * Internal: Generate unique invocation ID
   */
  private generateInvocationId(): string {
    return (++this.invocationId).toString();
  }
}
```

---

### 1.2 JSON Protocol

**File**: `src/JsonProtocol.ts`

```typescript
/**
 * SignalR JSON Protocol Implementation
 *
 * Implements the SignalR JSON protocol for message serialization.
 * Compatible with ASP.NET Core SignalR hubs.
 */
export class JsonProtocol {
  /**
   * Write invocation message (client → server RPC call)
   */
  static writeInvocation(
    invocationId: string,
    target: string,
    args: any[]
  ): InvocationMessage {
    return {
      type: MessageType.Invocation,
      invocationId,
      target,
      arguments: args
    };
  }

  /**
   * Write message without response (fire-and-forget)
   */
  static writeMessage(target: string, args: any[]): InvocationMessage {
    return {
      type: MessageType.Invocation,
      target,
      arguments: args
    };
  }

  /**
   * Write pong message (response to ping)
   */
  static writePong(): PongMessage {
    return {
      type: MessageType.Ping
    };
  }

  /**
   * Parse incoming message
   */
  static parseMessage(data: string): Message {
    return JSON.parse(data);
  }
}

/**
 * SignalR message types
 */
export enum MessageType {
  Invocation = 1,
  StreamItem = 2,
  Completion = 3,
  StreamInvocation = 4,
  CancelInvocation = 5,
  Ping = 6,
  Close = 7
}

/**
 * Message interfaces
 */
export interface InvocationMessage {
  type: MessageType.Invocation;
  invocationId?: string;
  target: string;
  arguments: any[];
}

export interface CompletionMessage {
  type: MessageType.Completion;
  invocationId: string;
  result?: any;
  error?: string;
}

export interface PongMessage {
  type: MessageType.Ping;
}

export type Message = InvocationMessage | CompletionMessage | PongMessage;
```

---

### 1.3 Retry Policy

**File**: `src/RetryPolicy.ts`

```typescript
/**
 * Retry policy interface
 */
export interface IRetryPolicy {
  /**
   * Get next retry delay in milliseconds
   * Returns null if max retries exceeded
   */
  nextRetryDelay(retryAttempt: number): number | null;
}

/**
 * Exponential backoff retry policy
 *
 * Retry delays: 0ms, 2s, 10s, 30s, then 60s max
 */
export class ExponentialBackoffRetryPolicy implements IRetryPolicy {
  private delays = [0, 2000, 10000, 30000];
  private maxDelay = 60000; // 60 seconds

  nextRetryDelay(retryAttempt: number): number | null {
    // Allow infinite retries, but cap delay
    if (retryAttempt < this.delays.length) {
      return this.delays[retryAttempt];
    }
    return this.maxDelay;
  }
}

/**
 * Fixed interval retry policy
 */
export class FixedRetryPolicy implements IRetryPolicy {
  constructor(
    private interval: number = 5000,
    private maxRetries: number = 10
  ) {}

  nextRetryDelay(retryAttempt: number): number | null {
    if (retryAttempt >= this.maxRetries) {
      return null;
    }
    return this.interval;
  }
}

/**
 * No retry policy (fail immediately)
 */
export class NoRetryPolicy implements IRetryPolicy {
  nextRetryDelay(): null {
    return null;
  }
}
```

---

### 1.4 Event Emitter

**File**: `src/EventEmitter.ts`

```typescript
/**
 * Simple event emitter
 */
export class EventEmitter {
  private events = new Map<string, Function[]>();

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  clear(): void {
    this.events.clear();
  }
}
```

---

### 1.5 Types

**File**: `src/types.ts`

```typescript
/**
 * Connection state
 */
export enum ConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting'
}

/**
 * SignalM connection options
 */
export interface SignalMOptions {
  /** Custom retry policy */
  reconnectPolicy?: IRetryPolicy;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Pending invocation tracking
 */
export interface PendingInvocation {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: number;
}
```

---

### 1.6 Public API

**File**: `src/index.ts`

```typescript
/**
 * SignalM - Lightweight real-time for modern browsers
 *
 * Compatible with ASP.NET Core SignalR hubs
 * WebSocket + JSON only, ~2 KB gzipped
 */

export { SignalMConnection } from './SignalMConnection';
export { ConnectionState } from './types';
export type { SignalMOptions } from './types';

export {
  ExponentialBackoffRetryPolicy,
  FixedRetryPolicy,
  NoRetryPolicy
} from './RetryPolicy';
export type { IRetryPolicy } from './RetryPolicy';

// Version
export const VERSION = '1.0.0';
```

---

### 1.7 Build Configuration

**File**: `rollup.config.js`

```javascript
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',

  output: [
    {
      file: 'dist/signalm.js',
      format: 'umd',
      name: 'SignalM',
      sourcemap: true
    },
    {
      file: 'dist/signalm.min.js',
      format: 'umd',
      name: 'SignalM',
      sourcemap: true,
      plugins: [terser({
        compress: {
          passes: 3,
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          unsafe_math: true
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        }
      })]
    },
    {
      file: 'dist/signalm.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],

  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src'
    })
  ]
};
```

---

### 1.8 Package.json

**File**: `package.json`

```json
{
  "name": "signalm",
  "version": "1.0.0",
  "description": "Lightweight real-time transport for modern browsers - compatible with ASP.NET Core SignalR",
  "main": "dist/signalm.js",
  "module": "dist/signalm.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "signalr",
    "websocket",
    "real-time",
    "aspnetcore",
    "dotnet",
    "lightweight"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/minimact/signalm"
  },
  "devDependencies": {
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "rollup": "^3.0.0",
    "rollup-plugin-terser": "^7.0.2",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Phase 2: Server Implementation (C#)

### 2.1 Base Hub Class

**File**: `SignalMHub.cs`

```csharp
using Microsoft.AspNetCore.SignalR;

namespace SignalM;

/// <summary>
/// Base class for SignalM hubs
///
/// Drop-in replacement for Hub that works with SignalM clients.
/// Fully compatible with standard SignalR clients as well.
/// </summary>
public abstract class SignalMHub : Hub
{
    // Inherits all SignalR Hub functionality:
    // - Clients (IHubCallerClients)
    // - Context (HubCallerContext)
    // - Groups (IGroupManager)

    // No additional implementation needed!
    // SignalM clients speak standard SignalR JSON protocol
}
```

**That's it!** SignalM clients use the standard SignalR JSON protocol, so they work with standard `Hub` classes. No custom server implementation needed for basic functionality.

---

### 2.2 Extensions (Optional - for DI)

**File**: `Extensions/SignalMServiceExtensions.cs`

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace SignalM.Extensions;

/// <summary>
/// Extension methods for adding SignalM to ASP.NET Core
/// </summary>
public static class SignalMServiceExtensions
{
    /// <summary>
    /// Add SignalM services (just SignalR under the hood)
    /// </summary>
    public static ISignalRServerBuilder AddSignalM(this IServiceCollection services)
    {
        // SignalM uses standard SignalR on the server
        return services.AddSignalR(options =>
        {
            // Optimize for WebSocket + JSON only
            options.EnableDetailedErrors = false;
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
        });
    }

    /// <summary>
    /// Map a SignalM hub endpoint
    /// </summary>
    public static HubRouteBuilder MapSignalMHub<THub>(
        this IEndpointRouteBuilder endpoints,
        string pattern
    ) where THub : Hub
    {
        // Just map as a regular SignalR hub
        return endpoints.MapHub<THub>(pattern);
    }
}
```

---

### 2.3 NuGet Package Configuration

**File**: `SignalM.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>

    <!-- Package metadata -->
    <PackageId>SignalM</PackageId>
    <Version>1.0.0</Version>
    <Authors>Your Name</Authors>
    <Description>Lightweight real-time transport for modern browsers - server-side companion to signalm NPM package</Description>
    <PackageTags>signalr;websocket;real-time;aspnetcore;dotnet</PackageTags>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
    <RepositoryUrl>https://github.com/minimact/signalm</RepositoryUrl>
    <PackageProjectUrl>https://github.com/minimact/signalm</PackageProjectUrl>
    <PackageReadmeFile>README.md</PackageReadmeFile>
  </PropertyGroup>

  <ItemGroup>
    <!-- SignalM uses standard SignalR on server -->
    <PackageReference Include="Microsoft.AspNetCore.SignalR.Core" Version="8.0.0" />
  </ItemGroup>

  <ItemGroup>
    <None Include="README.md" Pack="true" PackagePath="\" />
  </ItemGroup>

</Project>
```

---

## Phase 3: Integration with Minimact

### 3.1 Create SignalM Manager

**File**: `src/client-runtime/src/signalm-manager.ts`

```typescript
import { SignalMConnection, ConnectionState } from 'signalm';
import { Patch } from './types';

/**
 * SignalM Manager for Minimact
 *
 * Lightweight alternative to SignalRManager using SignalM
 */
export class SignalMManager {
  private connection: SignalMConnection;
  private connectionId: string | null = null;
  private debugLogging: boolean;
  private eventHandlers: Map<string, Set<Function>>;

  constructor(hubUrl: string = '/minimact', options: { debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
    this.eventHandlers = new Map();

    this.connection = new SignalMConnection(hubUrl, {
      debug: this.debugLogging
    });

    this.setupEventHandlers();
  }

  /**
   * Setup SignalM event handlers
   */
  private setupEventHandlers(): void {
    // Handle component updates from server
    this.connection.on('UpdateComponent', (componentId: string, html: string) => {
      this.log('UpdateComponent', { componentId, html });
      this.emit('updateComponent', { componentId, html });
    });

    // Handle patch updates from server
    this.connection.on('ApplyPatches', (componentId: string, patches: Patch[]) => {
      this.log('ApplyPatches', { componentId, patches });
      this.emit('applyPatches', { componentId, patches });
    });

    // Handle predicted patches
    this.connection.on('ApplyPrediction', (data: { componentId: string, patches: Patch[], confidence: number }) => {
      this.log(`ApplyPrediction (${(data.confidence * 100).toFixed(0)}% confident)`, data);
      this.emit('applyPrediction', data);
    });

    // Handle hint queueing
    this.connection.on('QueueHint', (data: any) => {
      this.log(`Hint '${data.hintId}' queued`, data);
      this.emit('queueHint', data);
    });

    // Handle errors
    this.connection.on('Error', (message: string) => {
      console.error('[Minimact] Server error:', message);
      this.emit('error', { message });
    });

    // Connection events
    this.connection.onConnected(() => {
      this.log('Connected');
      this.emit('connected', { connectionId: this.connectionId });
    });

    this.connection.onReconnecting(() => {
      this.log('Reconnecting...');
      this.emit('reconnecting');
    });

    this.connection.onReconnected(() => {
      this.log('Reconnected');
      this.emit('reconnected', { connectionId: this.connectionId });
    });

    this.connection.onDisconnected(() => {
      this.log('Disconnected');
      this.emit('disconnected');
    });
  }

  /**
   * Start the connection
   */
  async start(): Promise<void> {
    await this.connection.start();
    this.log('SignalM connection started');
  }

  /**
   * Stop the connection
   */
  async stop(): Promise<void> {
    await this.connection.stop();
    this.log('SignalM connection stopped');
  }

  /**
   * Invoke a component method on the server
   */
  async invokeComponentMethod(componentId: string, methodName: string, args: any[]): Promise<void> {
    try {
      await this.connection.invoke('InvokeComponentMethod', componentId, methodName, args);
      this.log('Method invoked', { componentId, methodName, args });
    } catch (error) {
      console.error('[Minimact] Failed to invoke method:', error);
      throw error;
    }
  }

  /**
   * Register a component with the server
   */
  async registerComponent(componentId: string): Promise<void> {
    try {
      await this.connection.invoke('RegisterComponent', componentId);
      this.log('Component registered', { componentId });
    } catch (error) {
      console.error('[Minimact] Failed to register component:', error);
      throw error;
    }
  }

  /**
   * Update component state on the server
   */
  async updateComponentState(componentId: string, stateKey: string, value: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateComponentState', componentId, stateKey, value);
      this.log('Updated component state', { componentId, stateKey, value });
    } catch (error) {
      console.error('[Minimact] Failed to update component state:', error);
      throw error;
    }
  }

  /**
   * Update DOM element state on the server
   */
  async updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void> {
    try {
      await this.connection.invoke('UpdateDomElementState', componentId, stateKey, snapshot);
      this.log('Updated DOM element state', { componentId, stateKey, snapshot });
    } catch (error) {
      console.error('[Minimact] Failed to update DOM element state:', error);
      throw error;
    }
  }

  /**
   * Update client-computed state on the server
   */
  async updateClientComputedState(componentId: string, computedValues: Record<string, any>): Promise<void> {
    try {
      await this.connection.invoke('UpdateClientComputedState', componentId, computedValues);
      this.log('Updated client-computed state', { componentId, computedValues });
    } catch (error) {
      console.error('[Minimact] Failed to update client-computed state:', error);
      throw error;
    }
  }

  /**
   * Event subscription
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Get connection state
   */
  get state(): ConnectionState {
    return this.connection.connectionState;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact/SignalM] ${message}`, data || '');
    }
  }
}
```

---

### 3.2 Minimact Lite Entry Point

**File**: `src/client-runtime/src/index.lite.ts`

```typescript
import { SignalMManager } from './signalm-manager';
import { DOMPatcher } from './dom-patcher';
import { ClientStateManager } from './client-state';
import { EventDelegation } from './event-delegation';
import { HydrationManager } from './hydration';
import { HintQueue } from './hint-queue';
import { PlaygroundBridge } from './playground-bridge';
import { MinimactOptions, Patch } from './types';

/**
 * Minimact Lite - Powered by SignalM
 *
 * Lightweight version using SignalM instead of SignalR
 * Bundle size: ~10 KB gzipped (vs 25 KB with SignalR)
 */
export class Minimact {
  private signalM: SignalMManager;
  private domPatcher: DOMPatcher;
  private clientState: ClientStateManager;
  private hydration: HydrationManager;
  private hintQueue: HintQueue;
  private playgroundBridge: PlaygroundBridge;
  private eventDelegation: EventDelegation | null = null;
  private options: Required<MinimactOptions>;
  private rootElement: HTMLElement;

  constructor(rootElement: HTMLElement | string = document.body, options: MinimactOptions = {}) {
    // ... same as regular Minimact, but using SignalMManager instead

    this.signalM = new SignalMManager(this.options.hubUrl, {
      debugLogging: this.options.enableDebugLogging
    });

    // ... rest of initialization
  }

  // ... rest of Minimact class (identical to regular version)
}

// Export all hooks and utilities
export * from './hooks';
export * from './useContext';
export * from './useComputed';
// ... etc
```

---

### 3.3 Package.json Configuration

**File**: `src/client-runtime/package.json`

```json
{
  "name": "minimact",
  "version": "1.0.0",
  "description": "Server-side React for ASP.NET Core",
  "main": "dist/minimact.js",
  "module": "dist/minimact.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/minimact.esm.js",
      "require": "./dist/minimact.js",
      "types": "./dist/index.d.ts"
    },
    "./lite": {
      "import": "./dist/minimact-lite.esm.js",
      "require": "./dist/minimact-lite.js",
      "types": "./dist/index.lite.d.ts"
    }
  },
  "scripts": {
    "build": "rollup -c",
    "build:analyze": "rollup -c --environment ANALYZE"
  },
  "dependencies": {
    "@microsoft/signalr": "^8.0.0"
  },
  "peerDependencies": {
    "signalm": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "signalm": {
      "optional": true
    }
  }
}
```

---

### 3.4 Rollup Build for Lite Version

**File**: `src/client-runtime/rollup.config.js`

```javascript
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import analyze from 'rollup-plugin-analyzer';

const isAnalyze = process.env.ANALYZE === 'true';

const configs = [
  // Full version (with SignalR)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/minimact.js',
        format: 'umd',
        name: 'Minimact',
        sourcemap: true
      },
      {
        file: 'dist/minimact.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: [],
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
      isAnalyze && analyze({ summaryOnly: true })
    ].filter(Boolean)
  },

  // Lite version (with SignalM)
  {
    input: 'src/index.lite.ts',
    output: [
      {
        file: 'dist/minimact-lite.js',
        format: 'umd',
        name: 'Minimact',
        sourcemap: true,
        globals: {
          'signalm': 'SignalM'
        }
      },
      {
        file: 'dist/minimact-lite.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external: ['signalm'],
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.lite.json' }),
      terser(),
      isAnalyze && analyze({ summaryOnly: true })
    ].filter(Boolean)
  }
];

export default configs;
```

---

## Phase 4: Documentation

### 4.1 SignalM README

**File**: `signalm/README.md`

```markdown
# SignalM

**Lightweight real-time transport for modern browsers**

SignalM is a minimal WebSocket-based library compatible with ASP.NET Core SignalR hubs. It provides the same developer experience as SignalR but with **90% smaller bundle size**.

## Features

- ✅ **2 KB gzipped** (vs SignalR's 18 KB)
- ✅ **Drop-in compatible** with SignalR hubs
- ✅ **WebSocket + JSON** only (modern browsers)
- ✅ **Automatic reconnection** with exponential backoff
- ✅ **TypeScript** support
- ✅ **Zero dependencies**

## Installation

### Client (npm)

```bash
npm install signalm
```

### Server (NuGet)

```bash
dotnet add package SignalM
```

## Quick Start

### Client (TypeScript/JavaScript)

```typescript
import { SignalMConnection } from 'signalm';

const connection = new SignalMConnection('/hub');

// Server → Client method handling
connection.on('ReceiveMessage', (user, message) => {
  console.log(`${user}: ${message}`);
});

// Start connection
await connection.start();

// Client → Server method invocation
await connection.invoke('SendMessage', 'Alice', 'Hello!');
```

### Server (C#)

```csharp
using SignalM;

// Define your hub (same as SignalR!)
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}

// Startup configuration
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR(); // or .AddSignalM() for optimized settings

var app = builder.Build();
app.MapHub<ChatHub>("/hub");
app.Run();
```

## API Reference

### SignalMConnection

#### Constructor

```typescript
new SignalMConnection(url: string, options?: SignalMOptions)
```

**Options:**
- `reconnectPolicy`: Custom retry policy (default: exponential backoff)
- `debug`: Enable debug logging (default: false)

#### Methods

**`start(): Promise<void>`**
Start the connection

**`stop(): Promise<void>`**
Stop the connection

**`invoke<T>(methodName: string, ...args: any[]): Promise<T>`**
Invoke server method and wait for result

**`send(methodName: string, ...args: any[]): void`**
Send message without waiting for response

**`on(methodName: string, handler: Function): void`**
Register handler for server→client calls

**`off(methodName: string, handler: Function): void`**
Unregister handler

#### Events

**`onConnected(handler: () => void)`**
Called when connected

**`onDisconnected(handler: () => void)`**
Called when disconnected

**`onReconnecting(handler: () => void)`**
Called when reconnecting

**`onReconnected(handler: () => void)`**
Called when reconnected

#### Properties

**`connectionState: ConnectionState`**
Current connection state (Disconnected, Connecting, Connected, Reconnecting)

## Retry Policies

### Exponential Backoff (default)

```typescript
import { SignalMConnection, ExponentialBackoffRetryPolicy } from 'signalm';

const connection = new SignalMConnection('/hub', {
  reconnectPolicy: new ExponentialBackoffRetryPolicy()
});
// Retries: 0ms, 2s, 10s, 30s, then 60s max
```

### Fixed Interval

```typescript
import { FixedRetryPolicy } from 'signalm';

const connection = new SignalMConnection('/hub', {
  reconnectPolicy: new FixedRetryPolicy(5000, 10) // 5s interval, 10 max retries
});
```

### No Retry

```typescript
import { NoRetryPolicy } from 'signalm';

const connection = new SignalMConnection('/hub', {
  reconnectPolicy: new NoRetryPolicy() // Fail immediately
});
```

## Comparison with SignalR

| Feature | SignalR | SignalM |
|---------|---------|---------|
| **Bundle Size** | 18 KB | **2 KB** |
| **WebSocket** | ✅ | ✅ |
| **Long Polling** | ✅ | ❌ |
| **Server-Sent Events** | ✅ | ❌ |
| **MessagePack** | ✅ | ❌ JSON only |
| **Streaming** | ✅ | ❌ |
| **Reconnection** | ✅ | ✅ |
| **TypeScript** | ✅ | ✅ |
| **Server Compatibility** | ✅ | ✅ Same hubs |

## When to Use SignalM

**Use SignalM** if:
- ✅ You're building for modern browsers (95%+ users)
- ✅ You want the smallest possible bundle
- ✅ You only need WebSocket transport
- ✅ You don't need MessagePack or streaming

**Use SignalR** if:
- ❌ You need enterprise compatibility (old proxies, firewalls)
- ❌ You need transport fallback (SSE, Long Polling)
- ❌ You need MessagePack protocol
- ❌ You need streaming (IAsyncEnumerable)

## Browser Support

SignalM requires:
- ✅ WebSocket API (all modern browsers)
- ✅ ES2015+ (Chrome 51+, Firefox 54+, Safari 10+, Edge 15+)

## License

MIT

## Credits

SignalM implements the SignalR JSON protocol specification. It is compatible with ASP.NET Core SignalR hubs but is not affiliated with or endorsed by Microsoft.
```

---

### 4.2 Minimact README Update

Add this section to `README.md`:

```markdown
## Bundle Size Options

Minimact offers two bundle sizes to fit your needs:

### Full Version (25 KB gzipped) - Recommended for Enterprise

```bash
npm install minimact
```

```typescript
import { Minimact } from 'minimact';
```

Includes full SignalR client with:
- ✅ All transports (WebSocket, SSE, Long Polling)
- ✅ MessagePack support
- ✅ Maximum compatibility
- ✅ Enterprise-ready

### Lite Version (10 KB gzipped) - Recommended for Modern Apps

```bash
npm install minimact signalm
```

```typescript
import { Minimact } from 'minimact/lite';
```

Powered by SignalM with:
- ✅ WebSocket + JSON only
- ✅ Modern browsers (95%+ users)
- ✅ **60% smaller bundle**
- ✅ Same great DX

**Both work with the same ASP.NET Core server** - upgrade or downgrade anytime with zero code changes!

### Which Should I Choose?

**Use `minimact/lite`** if:
- You're building for modern browsers
- You want the smallest bundle
- You don't need legacy transport fallbacks

**Use `minimact` (full)** if:
- You need enterprise compatibility
- You need transport fallback for restrictive firewalls
- You need maximum compatibility

> 💡 **Tip**: Start with `/lite` and only upgrade to full if needed!
```

---

## Phase 5: Testing

### 5.1 Client Unit Tests

**File**: `signalm/tests/SignalMConnection.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalMConnection, ConnectionState } from '../src';

describe('SignalMConnection', () => {
  let connection: SignalMConnection;
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    connection = new SignalMConnection('ws://localhost/hub');
  });

  it('should start in Disconnected state', () => {
    expect(connection.connectionState).toBe(ConnectionState.Disconnected);
  });

  it('should connect when start() is called', async () => {
    const startPromise = connection.start();

    // Simulate WebSocket open
    mockWebSocket.onopen?.();

    await startPromise;

    expect(connection.connectionState).toBe(ConnectionState.Connected);
  });

  it('should invoke server method', async () => {
    // Start connection
    const startPromise = connection.start();
    mockWebSocket.onopen?.();
    await startPromise;

    // Invoke method
    const invokePromise = connection.invoke('TestMethod', 'arg1', 'arg2');

    // Verify message sent
    expect(mockWebSocket.send).toHaveBeenCalled();
    const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
    expect(sentMessage.type).toBe(1); // Invocation
    expect(sentMessage.target).toBe('TestMethod');
    expect(sentMessage.arguments).toEqual(['arg1', 'arg2']);

    // Simulate server response
    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: 3, // Completion
        invocationId: sentMessage.invocationId,
        result: 'success'
      })
    });

    const result = await invokePromise;
    expect(result).toBe('success');
  });

  it('should handle server→client invocations', async () => {
    const handler = vi.fn();
    connection.on('ServerMethod', handler);

    // Start connection
    const startPromise = connection.start();
    mockWebSocket.onopen?.();
    await startPromise;

    // Simulate server calling client
    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: 1, // Invocation
        target: 'ServerMethod',
        arguments: ['arg1', 'arg2']
      })
    });

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should reconnect on connection loss', async () => {
    // Start connection
    const startPromise = connection.start();
    mockWebSocket.onopen?.();
    await startPromise;

    // Simulate connection loss
    mockWebSocket.onclose?.({ code: 1006 }); // Abnormal closure

    // Should attempt reconnection
    expect(connection.connectionState).toBe(ConnectionState.Reconnecting);
  });

  it('should stop cleanly', async () => {
    // Start connection
    const startPromise = connection.start();
    mockWebSocket.onopen?.();
    await startPromise;

    // Stop
    await connection.stop();

    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Normal closure');
    expect(connection.connectionState).toBe(ConnectionState.Disconnected);
  });
});
```

---

### 5.2 Integration Tests

**File**: `tests/integration/signalm.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SignalMConnection } from 'signalm';

describe('SignalM Integration Tests', () => {
  it('should connect to real SignalR hub', async () => {
    // Requires test server running
    const connection = new SignalMConnection('http://localhost:5000/hub');

    await connection.start();

    expect(connection.connectionState).toBe('Connected');

    await connection.stop();
  }, 10000);

  it('should invoke server method and get response', async () => {
    const connection = new SignalMConnection('http://localhost:5000/hub');
    await connection.start();

    const result = await connection.invoke('Echo', 'test message');

    expect(result).toBe('test message');

    await connection.stop();
  }, 10000);

  it('should receive server→client calls', async () => {
    const connection = new SignalMConnection('http://localhost:5000/hub');

    let receivedMessage = '';
    connection.on('ReceiveMessage', (message: string) => {
      receivedMessage = message;
    });

    await connection.start();
    await connection.invoke('BroadcastMessage', 'Hello');

    // Wait for message
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toBe('Hello');

    await connection.stop();
  }, 10000);
});
```

---

## Phase 6: Launch Checklist

### 6.1 Pre-Launch Tasks

- [ ] **Client Implementation**
  - [ ] SignalMConnection class
  - [ ] JsonProtocol implementation
  - [ ] RetryPolicy classes
  - [ ] EventEmitter
  - [ ] TypeScript declarations
  - [ ] Build configuration (Rollup)
  - [ ] Unit tests (80%+ coverage)

- [ ] **Server Implementation**
  - [ ] SignalMHub base class
  - [ ] Extension methods
  - [ ] NuGet package config
  - [ ] XML documentation

- [ ] **Integration**
  - [ ] SignalMManager for Minimact
  - [ ] Minimact Lite entry point
  - [ ] Dual-build configuration
  - [ ] Integration tests

- [ ] **Documentation**
  - [ ] SignalM README with examples
  - [ ] Minimact README update
  - [ ] API documentation
  - [ ] Migration guide
  - [ ] Bundle size comparison

- [ ] **Testing**
  - [ ] Unit tests (client)
  - [ ] Integration tests (client + server)
  - [ ] Bundle size verification
  - [ ] Cross-browser testing

- [ ] **Publishing**
  - [ ] NPM package: `signalm`
  - [ ] NuGet package: `SignalM`
  - [ ] NPM package: `minimact` (updated)
  - [ ] GitHub releases

### 6.2 Launch Day Tasks

- [ ] Publish NPM packages
  ```bash
  cd signalm && npm publish
  cd ../minimact && npm publish
  ```

- [ ] Publish NuGet package
  ```bash
  dotnet pack SignalM.csproj
  dotnet nuget push SignalM.1.0.0.nupkg
  ```

- [ ] Create GitHub releases
  - Tag: `signalm-v1.0.0`
  - Tag: `minimact-v1.0.0`

- [ ] Social media announcement
  - Twitter/X thread
  - Reddit (r/dotnet, r/csharp, r/webdev)
  - Dev.to article
  - LinkedIn post

- [ ] Community outreach
  - Submit to Awesome .NET
  - Post in Discord servers
  - Email .NET newsletters

### 6.3 Post-Launch Tasks

- [ ] Monitor GitHub issues
- [ ] Respond to feedback
- [ ] Track bundle size metrics
- [ ] Gather adoption stats
- [ ] Plan v1.1 features

---

## Timeline Estimate

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| **Week 1** | Client implementation | 16-20 hours | None |
| | - SignalMConnection | 6 hours | |
| | - Protocol & transport | 4 hours | |
| | - Retry policies | 2 hours | |
| | - Build config | 2 hours | |
| | - Unit tests | 6 hours | |
| **Week 2** | Server implementation | 8-10 hours | Week 1 |
| | - Hub base class | 2 hours | |
| | - Extensions | 2 hours | |
| | - NuGet config | 2 hours | |
| | - Integration tests | 4 hours | |
| **Week 3** | Minimact integration | 12-16 hours | Week 2 |
| | - SignalMManager | 4 hours | |
| | - Lite entry point | 2 hours | |
| | - Dual build | 3 hours | |
| | - Testing | 5 hours | |
| **Week 4** | Documentation & launch | 8-12 hours | Week 3 |
| | - READMEs | 4 hours | |
| | - Examples | 2 hours | |
| | - Publishing | 2 hours | |
| | - Marketing | 4 hours | |

**Total**: 44-58 hours (~1 month part-time, ~2 weeks full-time)

---

## Success Metrics

### Technical Metrics

- ✅ **Bundle size**: ≤3 KB gzipped (client)
- ✅ **Test coverage**: ≥80%
- ✅ **Build time**: <5 seconds
- ✅ **Zero runtime errors** in integration tests

### Adoption Metrics (6 months)

- 🎯 **NPM downloads**: 1,000+/month
- 🎯 **NuGet downloads**: 500+/month
- 🎯 **GitHub stars**: 200+
- 🎯 **Issues/PRs**: Active community

### Community Metrics

- 🎯 **Reddit upvotes**: 100+ on launch post
- 🎯 **Twitter impressions**: 5,000+
- 🎯 **Blog views**: 1,000+
- 🎯 **Mentions**: 10+ in the wild

---

## Risk Mitigation

### Risk 1: SignalR Protocol Changes

**Likelihood**: Low
**Impact**: High

**Mitigation**:
- Document SignalR protocol version (currently 1.0)
- Pin to specific protocol version
- Test against multiple ASP.NET Core versions

### Risk 2: Browser WebSocket Compatibility

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Document browser support clearly
- Test on real devices
- Provide fallback guidance (use full SignalR)

### Risk 3: Poor Adoption

**Likelihood**: Medium
**Impact**: Low (standalone value)

**Mitigation**:
- Position as part of Minimact ecosystem
- Works standalone (not tied to Minimact)
- Provide migration path from SignalR

### Risk 4: Maintenance Burden

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Keep scope minimal (no feature creep)
- Automate testing and publishing
- Document contribution guidelines

---

## Future Enhancements (v2.0+)

### Potential Features

1. **HTTP Long Polling Fallback** (optional)
   - For environments that block WebSocket
   - Opt-in via option flag
   - Adds ~3 KB to bundle

2. **Binary Protocol** (optional)
   - Alternative to JSON for performance
   - Custom protocol (not MessagePack)
   - Adds ~1 KB to bundle

3. **Compression** (optional)
   - Compress messages over threshold
   - Using native compression APIs
   - Adds ~2 KB to bundle

4. **Request Batching**
   - Batch multiple invocations
   - Reduce round trips
   - No bundle size impact

5. **TypeScript Hub Proxies**
   - Code generation for type-safe hubs
   - Similar to SignalR TypeScript generation
   - Separate package

---

## Conclusion

SignalM fills a real gap in the .NET ecosystem: **lightweight real-time for modern browsers**. By stripping away enterprise bloat (SSE, Long Polling, MessagePack), we can deliver the same developer experience as SignalR in **90% less bundle size**.

**Key Benefits**:
- ✅ Helps Minimact (60% smaller bundle)
- ✅ Standalone value (useful beyond Minimact)
- ✅ Community contribution (.NET ecosystem)
- ✅ Technical leadership (shows expertise)

**Next Steps**:
1. Reserve NPM/NuGet package names
2. Create GitHub repo
3. Build client POC (Week 1)
4. Launch in 4 weeks

**Let's do this!** 🚀
