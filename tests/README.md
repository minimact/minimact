# Minimact Testing Infrastructure

Comprehensive testing setup for Minimact with **real browser** testing via Playwright and **mock SignalR server**.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Playwright Test (Node.js)                  │
│  - Controls mock server                                         │
│  - Asserts server state                                         │
│  - Queues hints, simulates hot reload                          │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ Control API
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MockSignalRServer (Node.js)                   │
│  - Real WebSocket server on localhost:8080                     │
│  - Implements SignalR protocol                                  │
│  - Maintains component state, hint queues                       │
│  - Bidirectional communication                                  │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ WebSocket (SignalR protocol)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Chromium Browser (Real DOM)                  │
│  - Real Minimact client code                                    │
│  - Real SignalR @microsoft/signalr                             │
│  - Real DOM, real JavaScript execution                          │
│  - Connects to ws://localhost:8080/minimact                    │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Approach?

### ✅ Benefits

1. **Real Browser Environment**
   - Real DOM (not JSDOM or happy-dom)
   - Real CSS rendering, layout, intersection observers
   - Real mutation observers, resize observers
   - Real network stack, WebSocket implementation

2. **Controlled Server Behavior**
   - No need for running ASP.NET server
   - Deterministic responses
   - Simulate edge cases (latency, errors, predictions)
   - Test hint queue, hot reload, predictive rendering

3. **Full Bidirectional Testing**
   - Client → Server: Method calls, state updates
   - Server → Client: Patches, hints, hot reload
   - Exact SignalR protocol implementation

4. **Realistic Integration Tests**
   - Tests actual client code (not mocked)
   - Tests actual SignalR library
   - Tests actual DOM APIs
   - Tests minimact-punch observers in real browser

### ⚠️ Tradeoffs

- Slower than unit tests (browser startup, network)
- More complex setup
- Requires test HTML pages

## Files

### Mock Infrastructure

```
tests/
├── mocks/
│   ├── MockSignalRConnection.ts   # In-memory mock (for Vitest unit tests)
│   ├── MockMinimactServer.ts      # In-memory server (for Vitest unit tests)
│   ├── MockSignalRServer.ts       # WebSocket server (for Playwright)
│   └── index.ts                   # Exports
├── fixtures/
│   └── minimact.fixture.ts        # Playwright fixture (auto start/stop server)
└── e2e/
    └── counter.spec.ts            # Example Playwright tests
```

### Configurations

- `playwright.config.ts` - Playwright configuration
- `vitest.config.ts` - Vitest configuration (for unit tests)

## Usage

### 1. Install Dependencies

```bash
npm install --save-dev \
  @playwright/test \
  ws \
  @types/ws
```

### 2. Write Playwright Tests

```typescript
import { test, expect } from '../fixtures/minimact.fixture';

test('counter increments', async ({ page, minimactServer }) => {
  // Register component with mock server
  minimactServer.registerComponent('Counter-123', { count: 0 });

  // Queue prediction hint
  minimactServer.queueHint('Counter-123', {
    hintId: 'increment',
    confidence: 0.95,
    patches: [
      { op: 'replace', path: '/h1/text', value: 'Count: 1' }
    ]
  });

  // Navigate to test page
  await page.goto('/test-counter.html');

  // Interact with page
  await page.click('button#increment');

  // Assert DOM updated
  await expect(page.locator('h1')).toContainText('Count: 1');

  // Assert server state synced
  expect(minimactServer.getComponentState('Counter-123')?.count).toBe(1);
});
```

### 3. Create Test HTML Pages

Create test HTML pages that load your Minimact client:

```html
<!-- test-counter.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="/dist/minimact.js"></script>
</head>
<body>
  <div id="Counter-123">
    <h1>Count: 0</h1>
    <button id="increment">Increment</button>
  </div>

  <script>
    const minimact = new Minimact({
      hubUrl: 'http://localhost:8080/minimact' // Mock server
    });

    minimact.start();
  </script>
</body>
</html>
```

### 4. Run Tests

```bash
# Run Playwright tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test counter.spec.ts

# Debug mode
npx playwright test --debug
```

## Testing Scenarios

### useState Synchronization

```typescript
test('useState syncs to server', async ({ page, minimactServer }) => {
  minimactServer.registerComponent('App-1', { isOpen: false });

  await page.goto('/test-app.html');

  // Trigger setState in browser
  await page.evaluate(() => {
    window.minimact.setState('isOpen', true);
  });

  // Assert server synced
  await waitForStateChange(minimactServer, 'App-1', 'isOpen', true);
});
```

### useDomElementState (minimact-punch)

```typescript
test('intersection observer syncs to server', async ({ page, minimactServer }) => {
  minimactServer.registerComponent('LazyImage-1', {});

  await page.goto('/test-lazy-image.html');

  // Scroll into view
  await page.evaluate(() => {
    document.querySelector('#lazy-image').scrollIntoView();
  });

  await page.waitForTimeout(100);

  // Assert server received DOM state
  const domState = minimactServer.getDomElementState('LazyImage-1', 'domElementState_0');
  expect(domState.isIntersecting).toBe(true);
});
```

### Hot Reload

```typescript
test('hot reload updates template', async ({ page, minimactServer }) => {
  minimactServer.setTemplateMap('Counter-1', {
    'h1.text': { template: 'Count: {0}', bindings: ['count'], slots: [7] }
  });

  await page.goto('/test-counter.html');

  // Simulate developer editing file
  minimactServer.simulateHotReload('Counter-1', 'h1.text', 'Counter: {0}', [5]);

  // Assert template updated without reload
  await expect(page.locator('h1')).toContainText('Counter: 5');
});
```

### Predictive Rendering

```typescript
test('cached hint applies instantly', async ({ page, minimactServer }) => {
  minimactServer.registerComponent('Counter-1', { count: 0 });

  minimactServer.queueHint('Counter-1', {
    hintId: 'increment',
    confidence: 0.95,
    patches: [{ op: 'replace', path: '/h1/text', value: 'Count: 1' }]
  });

  await page.goto('/test-counter.html');

  const startTime = Date.now();
  await page.click('button#increment');

  // Should update instantly (< 50ms)
  await expect(page.locator('h1')).toContainText('Count: 1');
  const latency = Date.now() - startTime;

  expect(latency).toBeLessThan(50); // Cached patch should be instant
});
```

### Cache Miss Scenario

```typescript
test('cache miss triggers server render', async ({ page, minimactServer }) => {
  minimactServer.registerComponent('Counter-1', { count: 0 });

  // NO hints queued - force cache miss

  minimactServer.onMethod('increment', async (componentId) => {
    const state = minimactServer.getComponentState(componentId);
    state.count++;

    setTimeout(() => {
      minimactServer.sendPatches(componentId, [
        { op: 'replace', path: '/h1/text', value: `Count: ${state.count}` }
      ]);
    }, 50); // Simulate server processing delay
  });

  await page.goto('/test-counter.html');

  await page.click('button#increment');

  // Should wait for server response (~50ms)
  await page.waitForTimeout(100);
  await expect(page.locator('h1')).toContainText('Count: 1');
});
```

## Mock Server API

### Setup

```typescript
// Register component
minimactServer.registerComponent('Counter-1', { count: 0 });

// Set template map
minimactServer.setTemplateMap('Counter-1', {
  'h1.text': {
    template: 'Count: {0}',
    bindings: ['count'],
    slots: [7]
  }
});

// Register custom method handler
minimactServer.onMethod('customMethod', async (componentId, method, params) => {
  // Custom logic
});
```

### Simulate Server Events

```typescript
// Queue hint
minimactServer.queueHint('Counter-1', {
  hintId: 'hint-id',
  confidence: 0.9,
  patches: [...]
});

// Simulate hot reload
minimactServer.simulateHotReload('Counter-1', 'h1.text', 'New: {0}', [5]);

// Send patches
minimactServer.sendPatches('Counter-1', [
  { op: 'replace', path: '/count', value: 42 }
]);
```

### Assert State

```typescript
// Get component state
const state = minimactServer.getComponentState('Counter-1');
expect(state.count).toBe(1);

// Get DOM element state
const domState = minimactServer.getDomElementState('LazyImage-1', 'domElementState_0');
expect(domState.isIntersecting).toBe(true);

// Get client count
expect(minimactServer.getClientCount()).toBe(1);
```

## Next Steps

1. ✅ Mock infrastructure created
2. ⏳ Create test HTML pages for common scenarios
3. ⏳ Set up local dev server for test pages
4. ⏳ Write comprehensive test suite
5. ⏳ Add CI/CD integration

## Related

- [Playwright Documentation](https://playwright.dev)
- [SignalR Protocol Specification](https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md)
- [Minimact Client Runtime](../src/client-runtime/README.md)
- [Minimact Punch](../src/minimact-punch/README.md)
