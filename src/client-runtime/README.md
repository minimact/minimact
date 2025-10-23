# Minimact Client Runtime

Client-side JavaScript/TypeScript runtime for the Minimact framework. Handles DOM patching, SignalR communication, client state management, and hybrid rendering.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Minimact Client Runtime                    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  SignalR     │  │  DOMPatcher  │  │ ClientState  │     │
│  │  Manager     │  │              │  │  Manager     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────┬───────┴──────────────────┘              │
│                   │                                         │
│         ┌─────────▼─────────┐                               │
│         │   Minimact Core    │                               │
│         │  (Orchestrator)   │                               │
│         └─────────┬─────────┘                               │
│                   │                                         │
│         ┌─────────▼─────────┐  ┌──────────────┐            │
│         │   Hydration       │  │    Event     │            │
│         │   Manager         │  │  Delegation  │            │
│         └───────────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Features

✅ **SignalR Integration** - Real-time bidirectional communication with server
✅ **DOM Patching** - Surgical DOM updates from server-generated patches
✅ **Client State** - Local reactive state (useClientState) without server round-trips
✅ **Hybrid Rendering** - Smart partitioning of client/server/mixed zones
✅ **Event Delegation** - Efficient event handling with single root listener
✅ **Hydration** - Attach interactivity to server-rendered HTML
✅ **TypeScript** - Full type safety and IDE support

## Installation

```bash
npm install
npm run build
```

This generates:
- `dist/minimact.js` - IIFE bundle for browsers
- `dist/minimact.esm.js` - ES module bundle
- `dist/minimact.d.ts` - TypeScript definitions

## Usage

### Basic Setup

```html
<!DOCTYPE html>
<html>
<body data-minimact-auto-init>
  <!-- Component rendered by server -->
  <div data-minimact-component="counter-1">
    <h1>Count: <span data-bind="count">0</span></h1>
    <button data-onclick="Increment">+</button>
  </div>

  <!-- Include SignalR -->
  <script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.0/dist/browser/signalr.min.js"></script>

  <!-- Include Minimact -->
  <script src="minimact.js"></script>
</body>
</html>
```

The `data-minimact-auto-init` attribute automatically starts Minimact on page load.

### Manual Initialization

```javascript
import Minimact from 'minimact-client';

const minimact = new Minimact(document.body, {
  hubUrl: '/minimact',
  enableDebugLogging: true,
  reconnectInterval: 5000
});

await minimact.start();
```

### Client State (useClientState)

```html
<!-- Client-only zone - no server round-trips -->
<div data-minimact-client-scope>
  <input data-state="username" placeholder="Username" />
  <p>Hello, <span data-bind="username"></span>!</p>
</div>
```

The input updates instantly on every keystroke, with ~1ms latency.

### Server State

```html
<!-- Server-controlled zone -->
<div data-minimact-server-scope>
  <button data-onclick="LoadData">Load</button>
  <p>Items: <span data-bind="itemCount">0</span></p>
</div>
```

Button clicks trigger server methods, updates arrive via SignalR patches (~47ms latency).

### Hybrid Rendering

```html
<!-- Mixed dependencies - smart span splitting -->
<p>
  Found
  <span data-minimact-server-scope data-bind="resultCount">0</span>
  results for
  "<span data-minimact-client-scope data-bind="query"></span>"
</p>
```

Each span updates independently - client span instantly, server span on data changes.

## API Reference

### Minimact Class

```typescript
class Minimact {
  constructor(rootElement: HTMLElement | string, options?: MinimactOptions);

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Component management
  hydrateComponent(componentId: string, element: HTMLElement): void;

  // Client state
  getClientState(componentId: string, key: string): any;
  setClientState(componentId: string, key: string, value: any): void;
  subscribeToState(componentId: string, key: string, callback: (value: any) => void): () => void;

  // Connection info
  get connectionState(): string;
  get connectionId(): string | null;
}
```

### Options

```typescript
interface MinimactOptions {
  hubUrl?: string;                 // Default: '/minimact'
  enableDebugLogging?: boolean;    // Default: false
  reconnectInterval?: number;      // Default: 5000ms
}
```

## Data Attributes

### Component Markers

- `data-minimact-component="id"` - Marks a component root
- `data-minimact-component-id="id"` - Set during hydration

### Zone Markers

- `data-minimact-client-scope` - Pure client zone (no server communication)
- `data-minimact-server-scope` - Pure server zone (patch-controlled)
- Neither attribute = hybrid zone (contains both)

### State Binding

- `data-state="key"` - Bind input element to client state key
- `data-bind="key"` - Bind element content to state key
- `data-bind-html` - Bind using innerHTML instead of textContent

### Event Handlers

- `data-onclick="MethodName"` - Click event → server method
- `data-oninput="MethodName"` - Input event → server method
- `data-onchange="MethodName"` - Change event → server method
- Format: `MethodName` or `MethodName:arg1:arg2`

## Examples

See `examples/` folder:

1. **counter.html** - Basic counter with server state
2. **hybrid-rendering.html** - Demonstrates client/server/hybrid zones

## Performance

| Operation | Latency | Description |
|-----------|---------|-------------|
| Client state update | ~1ms | Local DOM manipulation only |
| Server state update | ~47ms | SignalR round-trip + Rust reconciliation |
| Hybrid update | ~1ms + ~47ms | Each zone updates independently |

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode
npm run dev

# Run tests (when implemented)
npm test
```

## Project Structure

```
client-runtime/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── signalr-manager.ts       # SignalR connection management
│   ├── dom-patcher.ts           # DOM patching engine
│   ├── client-state.ts          # Client state management
│   ├── event-delegation.ts      # Event handling
│   ├── hydration.ts             # Server HTML hydration
│   └── types.ts                 # TypeScript definitions
├── examples/
│   ├── counter.html             # Basic example
│   └── hybrid-rendering.html    # Advanced example
├── dist/                        # Build output
├── package.json
├── tsconfig.json
└── rollup.config.js
```

## Browser Support

- Modern browsers with ES2020 support
- SignalR WebSocket or SSE support
- Tested on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Integration with Server

The client runtime expects:

1. **SignalR Hub** at `/minimact` (configurable)
2. **Component registration** via `RegisterComponent(componentId)`
3. **Patch format** matching Rust reconciliation engine output
4. **Method invocation** via `InvokeComponentMethod(componentId, methodName, argsJson)`

See `Minimact.AspNetCore` C# project for server implementation.

## Debugging

Enable debug logging:

```html
<body data-minimact-auto-init data-minimact-debug>
```

Or programmatically:

```javascript
const minimact = new Minimact(document.body, {
  enableDebugLogging: true
});
```

Console output includes:
- SignalR connection events
- DOM patch operations
- Client state changes
- Event delegation triggers
- Hydration progress

## License

MIT
