# aibrowse - AI-Oriented Minimact App Inspector

A command-line browser tool designed for AI agents (specifically Claude Code) to inspect, debug, and interact with **Minimact applications** during development.

## Overview

`aibrowse` is **not** a general web scraper or automation tool. It's a specialized inspector built specifically for **Minimact** - a server-side React framework for ASP.NET Core with SignalR-based real-time updates. It lets AI pair programming agents "see" your Minimact app through structured, semantic data - exposing DOM, SignalR messages, console logs, network activity, and interactive elements in a format optimized for LLM reasoning.

### Primary Use Case: Minimact Development

Enable Claude Code to help debug and enhance Minimact applications by:
- Monitoring SignalR WebSocket communication (events, patches, predictions)
- Inspecting server-rendered components and their DOM representation
- Tracking predictive vs verified patches from the Rust reconciliation engine
- Identifying console errors, network failures, and SignalR disconnections
- Testing interactions (clicks, form fills) and observing the server response flow
- Discovering issues in the client-server state synchronization
- Validating that the ~5KB client library is working correctly

## Core Design Principles

1. **Surgical, not comprehensive** - Focus on Minimact debugging needs, not general browsing
2. **Structured output** - Everything returns JSON for easy AI parsing
3. **Stateful sessions** - Maintain browser state across multiple command invocations
4. **SignalR-first** - Deep monitoring of WebSocket communication between client and server
5. **AI-optimized** - Output designed for LLM reasoning, not human reading
6. **Minimact-aware** - Understands the unique architecture of server-side React with predictive updates

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│   (AI Agent)    │
└────────┬────────┘
         │ CLI invocations
         ▼
┌─────────────────┐
│   aibrowse      │
│   (Node.js)     │
├─────────────────┤
│ Command Router  │
│ Session Manager │
│ Element Cache   │
│ SignalR Monitor │ ← Captures all WebSocket traffic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Playwright    │
│   (Chromium)    │
├─────────────────┤
│ WebSocket Hook  │ ← Intercepts SignalR frames
│ Console Capture │
│ Network Monitor │
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Minimact App (localhost:5000)          │
├─────────────────────────────────────────┤
│ ASP.NET Core + SignalR Hub              │
│ • Initial server-rendered HTML          │
│ • SignalR /minimact hub                 │
│ • ~5KB client JS (minimact.js)          │
│ • Real-time patch delivery              │
│   - Predicted patches (immediate)       │
│   - Verified patches (after reconcile)  │
│   - Correction patches (if needed)      │
└─────────────────────────────────────────┘
```

### Tech Stack

- **Runtime**: Node.js (v18+)
- **Browser Engine**: Playwright (Chromium headless)
- **CLI Framework**: Commander.js
- **SignalR Monitoring**: WebSocket frame interception via Playwright
- **Minimact Detection**: DOM attribute scanning (data-minimact-*)
- **Output Format**: JSON (structured for AI consumption)

## Command Reference

### Navigation
```bash
aibrowse open <url>              # Load page (typically localhost:3000)
aibrowse refresh                 # Reload current page
aibrowse close                   # Close browser session
```

### Element Discovery
```bash
aibrowse query <selector> [--limit N]   # Find DOM elements (CSS/jQuery-style)
aibrowse query --interactive            # Only buttons, inputs, links
aibrowse query --errors                 # Elements with error states
```

### SignalR Monitoring (Minimact-specific)
```bash
aibrowse signalr status                      # Check SignalR connection status
aibrowse signalr messages [--since-last]     # View SignalR hub messages
aibrowse signalr messages --type sent        # Only client->server events
aibrowse signalr messages --type received    # Only server->client patches
aibrowse signalr subscribe                   # Start capturing all messages
aibrowse signalr invoke <method> <args>      # Manually invoke server method
```

### Minimact Component Inspection
```bash
aibrowse minimact components                 # List all Minimact components
aibrowse minimact component <id>             # Inspect component metadata
aibrowse minimact patches --last N           # Show last N patches received
aibrowse minimact state                      # View exposed state (if debug mode)
```

### Debugging
```bash
aibrowse console [--errors] [--since-last]   # Console logs
aibrowse network [--failed] [--type xhr]     # Network requests
aibrowse errors                              # All errors aggregated (console + network + SignalR)
aibrowse signalr errors                      # SignalR connection/message errors
```

### Interaction (Testing)
```bash
aibrowse click <id>                     # Click cached element
aibrowse fill <id> <value>              # Fill input field
aibrowse submit <id>                    # Submit form
aibrowse wait <selector> [--timeout 5]  # Wait for element
```

### Utilities
```bash
aibrowse screenshot <path>              # Save screenshot for debugging
aibrowse eval <javascript>              # Execute arbitrary JS
```

## Output Format

All commands return JSON:

```json
{
  "status": "ok",
  "command": "query",
  "result": [...],
  "meta": {
    "timestamp": "2025-10-22T10:30:00Z",
    "url": "http://localhost:5000",
    "minimactDetected": true,
    "signalrConnected": true,
    "signalrHub": "/minimact"
  }
}
```

### Element Reference System

Elements are cached with stable IDs for easy reference across commands:

**DOM Elements**: `E0`, `E1`, `E2`, ...
```json
{
  "id": "E0",
  "tag": "button",
  "type": "button",
  "selector": ".submit-btn",
  "text": "Increment",
  "visible": true,
  "attributes": {
    "class": "submit-btn",
    "data-minimact-component": "Counter",
    "data-minimact-event": "onClick"
  }
}
```

**Minimact Components**: `C0`, `C1`, `C2`, ... (if exposed via data attributes)
```json
{
  "id": "C1",
  "name": "Counter",
  "componentId": "counter-1",
  "element": "div",
  "dataAttributes": {
    "minimact-component": "Counter",
    "minimact-id": "counter-1"
  }
}
```

**SignalR Messages**: Chronologically ordered with timestamps
```json
{
  "id": 0,
  "direction": "sent",
  "timestamp": "2025-10-22T10:30:00.123Z",
  "method": "InvokeServerEvent",
  "args": {
    "componentId": "Counter",
    "eventName": "onClick"
  }
}
```

## Example Usage Flow

### Debugging a Minimact Counter Component

```bash
# Start browser session and load Minimact app
$ aibrowse open http://localhost:5000
{
  "status": "ok",
  "result": {
    "url": "http://localhost:5000",
    "title": "Counter - Minimact App",
    "minimactDetected": true,
    "minimactVersion": "0.1.0",
    "signalrHub": "/minimact",
    "signalrConnected": true,
    "signalrTransport": "WebSockets"
  }
}

# Check for any immediate errors
$ aibrowse errors
{
  "status": "ok",
  "result": {
    "console": [],
    "network": [],
    "signalr": []
  }
}

# Discover Minimact components on the page
$ aibrowse minimact components
{
  "status": "ok",
  "result": [
    {
      "id": "C0",
      "name": "Counter",
      "componentId": "counter-1",
      "element": "div",
      "selector": "[data-minimact-component='Counter']"
    }
  ]
}

# Find the increment button
$ aibrowse query "button"
{
  "status": "ok",
  "result": [
    {
      "id": "E0",
      "tag": "button",
      "text": "Increment",
      "selector": "button.increment-btn",
      "visible": true,
      "attributes": {
        "class": "increment-btn",
        "data-minimact-component": "Counter",
        "data-minimact-event": "onClick"
      }
    }
  ]
}

# Start monitoring SignalR before interaction
$ aibrowse signalr subscribe
{
  "status": "ok",
  "result": "Subscribed to SignalR messages on hub: /minimact"
}

# Click the increment button
$ aibrowse click E0
{
  "status": "ok",
  "result": {
    "clicked": "E0",
    "selector": "button.increment-btn"
  }
}

# Check SignalR communication flow
$ aibrowse signalr messages --since-last
{
  "status": "ok",
  "result": [
    {
      "id": 0,
      "direction": "sent",
      "timestamp": "2025-10-22T10:30:00.123Z",
      "method": "InvokeServerEvent",
      "args": {
        "componentId": "counter-1",
        "eventName": "onClick",
        "eventArgs": {}
      }
    },
    {
      "id": 1,
      "direction": "received",
      "timestamp": "2025-10-22T10:30:00.128Z",
      "method": "ApplyPredictedPatch",
      "args": {
        "componentId": "counter-1",
        "patches": [
          {
            "type": "updateText",
            "path": [0, 0],
            "oldContent": "Count: 5",
            "newContent": "Count: 6"
          }
        ],
        "confidence": 0.95,
        "predictionId": "pred-1234"
      }
    },
    {
      "id": 2,
      "direction": "received",
      "timestamp": "2025-10-22T10:30:00.142Z",
      "method": "ApplyVerifiedPatch",
      "args": {
        "componentId": "counter-1",
        "patches": [
          {
            "type": "updateText",
            "path": [0, 0],
            "content": "Count: 6"
          }
        ],
        "predictionId": "pred-1234",
        "matched": true
      }
    }
  ]
}

# View recent patches received from server
$ aibrowse minimact patches --last 5
{
  "status": "ok",
  "result": [
    {
      "timestamp": "2025-10-22T10:30:00.128Z",
      "type": "predicted",
      "componentId": "counter-1",
      "confidence": 0.95,
      "patches": [{"type": "updateText", "path": [0, 0], "content": "Count: 6"}]
    },
    {
      "timestamp": "2025-10-22T10:30:00.142Z",
      "type": "verified",
      "componentId": "counter-1",
      "matched": true,
      "patches": [{"type": "updateText", "path": [0, 0], "content": "Count: 6"}]
    }
  ]
}

# Verify DOM was updated correctly
$ aibrowse query "p"
{
  "status": "ok",
  "result": [
    {
      "id": "E1",
      "tag": "p",
      "text": "Count: 6",
      "selector": "p.count-display"
    }
  ]
}

# Check console for any errors during the interaction
$ aibrowse console --since-last
{
  "status": "ok",
  "result": []
}

# Check SignalR connection health
$ aibrowse signalr status
{
  "status": "ok",
  "result": {
    "connected": true,
    "hub": "/minimact",
    "transport": "WebSockets",
    "connectionId": "conn-abc123",
    "latency": "4ms",
    "messagesReceived": 2,
    "messagesSent": 1
  }
}
```

### What Claude Code Learns:

From this session, Claude can determine:
1. ✅ SignalR connection is healthy (4ms latency, WebSocket transport)
2. ✅ Click event was sent to server successfully
3. ✅ Server responded with predicted patch in 5ms (95% confidence)
4. ✅ Prediction was verified and matched actual render (no correction needed)
5. ✅ DOM was updated correctly to "Count: 6"
6. ✅ No console errors or network failures
7. ✅ The Rust reconciliation engine is working perfectly

**Claude's response**: "Your Minimact counter is working correctly. The SignalR flow is healthy, predictions are accurate (95% confidence), and the DOM updates are immediate. The issue you mentioned is likely elsewhere in your code."

## Implementation Roadmap

### Phase 1: Core Browser Control + SignalR Monitoring (MVP)
**Goal**: Get basic page loading, inspection, and SignalR monitoring working  
**Time**: 3-4 hours

- [ ] Initialize Node.js project with Playwright
- [ ] Implement `open`, `refresh`, `close` commands
- [ ] Implement `query` with element caching (E0, E1, ...)
- [ ] Implement `console` log capture
- [ ] Implement `network` request logging
- [ ] **Implement SignalR WebSocket frame interception**
- [ ] **Implement `signalr status` command**
- [ ] **Implement `signalr messages` command with filtering**
- [ ] JSON output formatter
- [ ] Session manager (persistent browser instance)
- [ ] Minimact detection via data attributes

**Files**:
```
src/
├── cli.js           # Commander.js entry point
├── browser.js       # Playwright wrapper + WebSocket hooks
├── session.js       # Element cache + SignalR message log
├── commands/
│   ├── open.js
│   ├── query.js
│   ├── console.js
│   └── signalr.js   # SignalR-specific commands
└── formatters/
    └── json.js
```

### Phase 2: Minimact Component Discovery
**Goal**: Expose Minimact components and their metadata  
**Time**: 2-3 hours

- [ ] Scan DOM for `data-minimact-*` attributes
- [ ] Implement `minimact components` command
- [ ] Implement `minimact component <id>` command
- [ ] Implement `minimact patches --last N` command
- [ ] Component reference system (C0, C1, ...)
- [ ] Parse and expose component metadata from data attributes
- [ ] Track patch history (predicted vs verified)

**Key Challenge**: Extract maximum information from data attributes without server-side introspection

### Phase 3: Interaction & Testing
**Goal**: Enable AI to test interactions  
**Time**: 2-3 hours

- [ ] Implement `click <id>` command
- [ ] Implement `fill <id> <value>` command
- [ ] Implement `wait <selector>` command
- [ ] Add `--since-last` flag to console command
- [ ] Screenshot utility

### Phase 4: Minimact-Optimized Helpers
**Goal**: Make debugging easier for AI  
**Time**: 2-3 hours

- [ ] `errors` command (aggregates console + network + SignalR errors)
- [ ] `query --interactive` (filter for interactive elements)
- [ ] `signalr errors` (connection failures, timeout issues)
- [ ] `minimact state` (expose state if debug mode enabled)
- [ ] Detect prediction mismatches (predicted vs verified patches differ)
- [ ] Measure and report SignalR latency
- [ ] Detect Minimact client library issues

### Phase 5: Polish & Edge Cases
**Goal**: Production-ready for Claude Code  
**Time**: 2-4 hours

- [ ] Error handling and validation
- [ ] Session cleanup on crashes
- [ ] Timeout handling
- [ ] Support for iframes
- [ ] Cookie/localStorage inspection
- [ ] Multiple browser session support (if needed)

## Technical Decisions

### 1. Session Management

**Decision**: Single persistent session between commands

```javascript
// First command spawns browser
await browser.launch()

// Subsequent commands reuse same instance
await page.goto(url)

// SignalR connection persists across commands
// Element cache maintained

// Explicit cleanup
await browser.close()
```

**Rationale**: Minimact apps maintain state via SignalR connection. Fresh browser each command would:
- Lose SignalR connection state
- Require reconnection overhead
- Miss message history
- Break auth/session state

### 2. Element Caching

**Decision**: Stable numeric IDs with namespace prefixes

```javascript
elementCache = {
  'E0': { handle: ElementHandle, selector: 'button.submit' },
  'E1': { handle: ElementHandle, selector: 'input#email' },
  'C0': { 
    element: '[data-minimact-component="Counter"]',
    componentId: 'counter-1',
    name: 'Counter' 
  }
}
```

**Rationale**: 
- Selectors can be brittle (classes change, IDs missing)
- AI can reference "E0" across multiple commands
- Separate namespaces prevent collision
- Component IDs map to Minimact's server-side component instances

### 3. SignalR Message Interception

**Decision**: Intercept WebSocket frames via Playwright, parse SignalR protocol

```javascript
// Intercept WebSocket traffic
page.on('websocket', ws => {
  ws.on('framereceived', frame => {
    const message = parseSignalRMessage(frame.payload);
    if (message.type === 'Invocation') {
      signalrLog.push({
        direction: 'received',
        method: message.target,
        args: message.arguments,
        timestamp: Date.now()
      });
    }
  });
  
  ws.on('framesent', frame => {
    const message = parseSignalRMessage(frame.payload);
    signalrLog.push({
      direction: 'sent',
      method: message.target,
      args: message.arguments,
      timestamp: Date.now()
    });
  });
});
```

**Alternatives considered**:
- ❌ Modify Minimact client library - requires user changes
- ❌ Proxy SignalR connection - complex setup
- ✅ WebSocket interception - transparent, no changes needed

**Critical for debugging**:
- Track predicted vs verified patches
- Measure server response latency
- Detect prediction mismatches
- Identify SignalR connection issues

### 4. Minimact Component Detection

**Decision**: Scan DOM for data attributes

```javascript
// Minimact components expose themselves via data attributes
await page.evaluate(() => {
  const elements = document.querySelectorAll('[data-minimact-component]');
  return Array.from(elements).map(el => ({
    name: el.dataset.minimactComponent,
    componentId: el.dataset.minimactId,
    element: el.tagName.toLowerCase(),
    selector: generateSelector(el)
  }));
});
```

**Why not React DevTools?**:
- React is on the **server** (ASP.NET Core in C#)
- No React fiber tree in browser
- Components are pre-rendered HTML with data attributes
- State lives on server, not in client

**What we can access**:
- ✅ Component names and IDs from data attributes
- ✅ DOM structure and events
- ✅ SignalR messages (state changes implicit in patches)
- ❌ Direct state/props inspection (server-only)

### 5. Output Format

**Decision**: Always JSON, optimized for Claude Code parsing

```json
{
  "status": "ok|error",
  "command": "signalr messages",
  "result": [...],
  "error": "...",  // Only if status=error
  "meta": {
    "minimactDetected": true,
    "signalrConnected": true
  }
}
```

**Rationale**:
- Claude Code can parse JSON reliably
- Structured data easier for LLM reasoning
- No need for markdown/text formatting
- Consistent error handling

## Error Handling Strategy

```javascript
// All errors return JSON with error status
{
  "status": "error",
  "error": "Element not found: #missing-id",
  "code": "ELEMENT_NOT_FOUND"
}
```

**Error Codes**:
- `BROWSER_NOT_STARTED` - Need to run `open` first
- `ELEMENT_NOT_FOUND` - Selector returned no results
- `INVALID_ELEMENT_ID` - Reference like "E99" doesn't exist
- `TIMEOUT` - Wait operation exceeded timeout
- `NAVIGATION_FAILED` - Page failed to load
- `MINIMACT_NOT_DETECTED` - No Minimact components found on page
- `SIGNALR_NOT_CONNECTED` - SignalR hub connection not established
- `SIGNALR_CONNECTION_FAILED` - Failed to connect to SignalR hub
- `SIGNALR_MESSAGE_TIMEOUT` - Expected SignalR response not received
- `SIGNALR_INVOKE_FAILED` - Server method invocation failed

## Installation & Setup

```bash
# Install dependencies
npm install playwright commander

# Install Playwright browsers
npx playwright install chromium

# Make CLI executable
chmod +x bin/aibrowse

# Link for development
npm link
```

## Usage with Claude Code

```bash
# Claude Code would invoke like:
aibrowse open http://localhost:3000
aibrowse errors
aibrowse react tree
aibrowse query "button:contains('Submit')"
aibrowse click E0
```

Claude parses the JSON output and uses it to:
1. Understand app structure
2. Identify errors and issues
3. Test interactions
4. Suggest fixes to source code

## Development Notes

### SignalR Protocol Parsing

SignalR uses a text-based protocol over WebSockets. Messages are delimited by `\x1e` (record separator).

```javascript
// Parse SignalR message
function parseSignalRMessage(payload) {
  const messages = payload.split('\x1e').filter(m => m);
  return messages.map(msg => {
    const parsed = JSON.parse(msg);
    return {
      type: parsed.type, // 1 = Invocation, 2 = StreamItem, 3 = Completion
      invocationId: parsed.invocationId,
      target: parsed.target,      // Method name
      arguments: parsed.arguments, // Method args
      result: parsed.result       // For completions
    };
  });
}
```

**Message Types**:
- **Type 1 (Invocation)**: Client calls server method or server pushes to client
- **Type 2 (StreamItem)**: Streaming data chunk
- **Type 3 (Completion)**: Method invocation result

**Key Minimact Methods**:
- `InvokeServerEvent` (client → server): User interaction
- `ApplyPredictedPatch` (server → client): Optimistic update
- `ApplyVerifiedPatch` (server → client): Confirmed render
- `ApplyCorrectionPatch` (server → client): Fix wrong prediction

### Element Handle Lifetime

Playwright's `ElementHandle` objects can become stale after DOM changes. Need to:
- Store selector alongside handle
- Re-query if handle is stale
- Clear cache on navigation
- Detect when Minimact patches invalidate handles

```javascript
async function getElement(elementId) {
  const cached = elementCache.get(elementId);
  try {
    // Check if handle is still valid
    await cached.handle.evaluate(el => el.tagName);
    return cached.handle;
  } catch (e) {
    // Re-query using stored selector
    const newHandle = await page.$(cached.selector);
    elementCache.set(elementId, { ...cached, handle: newHandle });
    return newHandle;
  }
}
```

### Minimact Component Discovery

Minimact components expose metadata via data attributes:

```html
<div data-minimact-component="Counter" data-minimact-id="counter-1">
  <p>Count: 5</p>
  <button data-minimact-event="onClick">Increment</button>
</div>
```

**Discovery strategy**:
```javascript
const components = await page.evaluate(() => {
  const elements = document.querySelectorAll('[data-minimact-component]');
  return Array.from(elements).map(el => ({
    name: el.dataset.minimactComponent,
    componentId: el.dataset.minimactId,
    element: el.tagName.toLowerCase(),
    events: Array.from(el.querySelectorAll('[data-minimact-event]'))
      .map(e => e.dataset.minimactEvent)
  }));
});
```

### Console Log Capture

```javascript
page.on('console', msg => {
  consoleBuffer.push({
    type: msg.type(),      // log, warn, error, info
    text: msg.text(),
    location: msg.location(),
    timestamp: Date.now()
  });
});
```

### Network Monitoring

```javascript
page.on('response', async response => {
  networkLog.push({
    method: response.request().method(),
    url: response.url(),
    status: response.status(),
    statusText: response.statusText(),
    timestamp: Date.now()
  });
});
```

### Patch History Tracking

Track predicted vs verified patches to detect reconciliation issues:

```javascript
const patchHistory = [];

// When ApplyPredictedPatch received
patchHistory.push({
  timestamp: Date.now(),
  type: 'predicted',
  predictionId: args.predictionId,
  patches: args.patches,
  confidence: args.confidence
});

// When ApplyVerifiedPatch received
const predicted = patchHistory.find(p => 
  p.predictionId === args.predictionId && p.type === 'predicted'
);
const matched = deepEqual(predicted.patches, args.patches);

patchHistory.push({
  timestamp: Date.now(),
  type: 'verified',
  predictionId: args.predictionId,
  patches: args.patches,
  matched: matched
});

// When ApplyCorrectionPatch received (prediction was wrong)
patchHistory.push({
  timestamp: Date.now(),
  type: 'correction',
  predictionId: args.predictionId,
  patches: args.patches
});
```

This allows detecting:
- Prediction accuracy rate
- Components with low confidence predictions
- Patterns in prediction failures

## Future Enhancements

- **Prediction analytics**: Track and report prediction accuracy rates per component
- **SignalR latency heatmap**: Visualize response times across interactions
- **State diffing**: If Minimact exposes state in debug mode, show before/after diffs
- **Performance metrics**: Track render times, patch application times
- **Reconciliation analysis**: Identify components with frequent prediction mismatches
- **Accessibility audit**: Expose a11y violations in Minimact components
- **Multi-hub support**: For Minimact apps with multiple SignalR hubs
- **Offline mode detection**: Detect when SignalR disconnects and app enters offline state
- **Server-side logging bridge**: If Minimact supports it, show server-side C# logs
- **Visual diffing**: Compare screenshots before/after interactions
- **useClientState tracking**: Monitor hybrid state (server vs client-side state)

## License

MIT

## Contributing

This tool is purpose-built for **Minimact development** with Claude Code integration. Contributions should maintain focus on:

- **Minimact-specific debugging workflows** (SignalR monitoring, patch tracking, server-side React)
- **AI agent usability** (structured JSON output, stable references, clear error messages)
- **Performance** (minimal overhead, fast command execution)
- **Surgical additions** (no feature bloat, only what's needed for debugging Minimact)

**Not in scope**:
- General browser automation
- Traditional React debugging (use React DevTools)
- Visual testing or screenshot diffing (unless Minimact-specific)
- Non-Minimact frameworks

---

**Status**: Specification complete, ready for implementation  
**Target Framework**: Minimact (ASP.NET Core + SignalR + Server-Side React)  
**Next Step**: Scaffold Phase 1 (Core Browser Control + SignalR Monitoring)