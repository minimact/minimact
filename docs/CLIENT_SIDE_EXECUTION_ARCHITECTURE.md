# Client-Side Execution Architecture

## Overview

Minimact executes event handlers and effects entirely on the client side for instant interactivity, while maintaining a clean, unpolluted DOM and global scope. This document explains how handlers and effects are transmitted, bound, and executed in the browser.

---

## Core Principles

### 1. **No DOM Pollution**
- HTML elements contain **no `data-handler` or `data-event` attributes**
- Pure, semantic HTML is rendered by the server
- Client navigates to elements using **pre-computed DOM index paths**

### 2. **No Window Pollution**
- **No `window.MinimactHandlers`** global registry
- **No `window.MinimactEffects`** global registry
- **No `window.__MinimactHooks`** global hooks
- Everything scoped to component instance via constructor options

### 3. **Initial Payload Architecture**
- All handlers and effects sent in **initial HTML page load**
- SignalR used **only for hot reload and state sync**, not initial setup
- Server pre-computes DOM indices using PathConverter

---

## The Flow

### 1. User Writes TSX

```typescript
export function Counter() {
  const [count, setCount] = useState(0);

  // Effect
  useEffect(() => {
    console.log('Count changed:', count);
    const timer = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [count]);

  // Event handler
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

---

### 2. Babel Transpiles to C# + Extracts Client Code

**Server-Side C# (for rendering):**
```csharp
[Component]
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    [OnStateChanged("count")]
    private void Effect_0()
    {
        Console.WriteLine($"Count changed: {count}");
    }

    public void HandleClick_10000000()
    {
        count++;
        SetState("count", count);
    }

    protected override VNode Render()
    {
        return new VElement("button", new() {
            ["onClick"] = "HandleClick_10000000"
        })
        {
            Children = new List<VNode> { new VText($"Count: {count}") }
        };
    }
}
```

**Client-Side JavaScript (extracted by Babel):**

```csharp
protected override Dictionary<string, string> GetClientHandlers()
{
    return new Dictionary<string, string>
    {
        ["HandleClick_10000000"] = @"function() {
            const useState = this.useState;
            const [count, setCount] = useState('count');
            setCount(count + 1);
        }"
    };
}

protected override Dictionary<string, EffectDefinition> GetClientEffects()
{
    return new Dictionary<string, EffectDefinition>
    {
        ["Effect_0"] = new EffectDefinition
        {
            Callback = @"function() {
                const useState = this.useState;
                const useRef = this.useRef;
                const [count, setCount] = useState('count');

                console.log('Count changed:', count);
                const timer = setInterval(() => {
                    setCount(count + 1);
                }, 1000);
                return () => clearInterval(timer);
            }",
            Dependencies = new[] { "count" }
        }
    };
}
```

**Key Transformations:**
- ✅ Arrow functions → Regular functions (for `.bind()` compatibility)
- ✅ Hook mappings injected at top: `const useState = this.useState;`
- ✅ Closures work naturally (no rewriting needed)

---

### 3. Server Renders HTML + Generates Initial Payload

**MinimactPageRenderer.cs generates:**

```html
<!DOCTYPE html>
<html>
<head>
    <script src="/js/minimact.js"></script>
</head>
<body>
    <div id="minimact-root" data-minimact-component="Counter_abc123">
        <!-- Pure HTML, no attributes -->
        <button>Count: 0</button>
    </div>

    <script>
        const minimact = new Minimact.Minimact('#minimact-root', {
            componentId: 'Counter_abc123',

            // ✅ Handlers with pre-computed DOM paths
            handlers: [
                {
                    domPath: [0],              // Navigate to button at index [0]
                    eventType: "click",
                    jsCode: function() {
                        const useState = this.useState;
                        const [count, setCount] = useState('count');
                        setCount(count + 1);
                    }
                }
            ],

            // ✅ Effects (no DOM paths needed)
            effects: [
                {
                    callback: function() {
                        const useState = this.useState;
                        const useRef = this.useRef;
                        const [count, setCount] = useState('count');

                        console.log('Count changed:', count);
                        const timer = setInterval(() => {
                            setCount(count + 1);
                        }, 1000);
                        return () => clearInterval(timer);
                    },
                    dependencies: ["count"]
                }
            ]
        });

        minimact.start();
    </script>
</body>
</html>
```

**How Server Computes `domPath`:**

```csharp
// In MinimactPageRenderer
private HandlerConfig[] GenerateHandlerConfigs(MinimactComponent component)
{
    var handlers = new List<HandlerConfig>();
    var clientHandlers = component.GetClientHandlers();

    // Get VNode tree
    var vnode = component.CurrentVNode;

    // Create PathConverter
    var pathConverter = new PathConverter(vnode);

    // Walk VNode tree, find onClick handlers
    WalkVNode(vnode, (node, hexPath) => {
        if (node.Props.ContainsKey("onClick"))
        {
            var handlerName = node.Props["onClick"];
            var jsCode = clientHandlers[handlerName];

            // ✅ Convert hex path → DOM indices
            var domPath = pathConverter.HexPathToDomPath(hexPath);

            handlers.Add(new HandlerConfig
            {
                DomPath = domPath,
                EventType = "click",
                JsCode = jsCode
            });
        }
    });

    return handlers.ToArray();
}
```

---

### 4. Client Runtime Binds and Executes

**Client Runtime (minimact.ts):**

```typescript
export class Minimact {
  private handlers: HandlerConfig[];
  private effects: EffectConfig[];
  private hookContext: any;
  private element: HTMLElement;

  constructor(selector: string, options: MinimactOptions) {
    this.element = document.querySelector(selector)!;
    this.handlers = options.handlers || [];
    this.effects = options.effects || [];

    // ✅ Create hook context (shared by handlers and effects)
    this.hookContext = {
      useState: (key: string) => {
        const value = this.state.get(key);
        const setter = (newValue: any) => {
          // 1. Apply template patch instantly
          const hint = this.hintQueue.matchHint(this.componentId, { [key]: newValue });
          if (hint) {
            this.domPatcher.applyPatches(this.element, hint.patches);
          }

          // 2. Update local state
          this.state.set(key, newValue);

          // 3. Sync to server (background)
          this.signalR.updateComponentState(this.componentId, key, newValue);
        };
        return [value, setter];
      },

      useRef: (key: string) => {
        return this.refs.get(key) || { current: null };
      }
    };
  }

  start() {
    this.initializeComponent();

    // ✅ Attach handlers using DOM paths
    this.attachHandlers();

    // ✅ Run effects
    this.runEffects();
  }

  private attachHandlers() {
    for (const handler of this.handlers) {
      // Navigate to element using DOM index path
      const element = this.navigateToDomElement(this.element, handler.domPath);

      if (element) {
        // ✅ Bind handler to hook context
        const boundHandler = handler.jsCode.bind(this.hookContext);

        // Attach event listener
        element.addEventListener(handler.eventType, boundHandler);
      }
    }
  }

  private runEffects() {
    for (const effect of this.effects) {
      // ✅ Bind effect callback to hook context
      const boundCallback = effect.callback.bind(this.hookContext);

      // Execute effect (after render)
      queueMicrotask(() => {
        const cleanup = boundCallback();
        if (typeof cleanup === 'function') {
          this.effectCleanups.push(cleanup);
        }
      });
    }
  }

  private navigateToDomElement(root: HTMLElement, path: number[]): HTMLElement | null {
    let current: HTMLElement | ChildNode = root;

    for (const index of path) {
      if (current.childNodes[index]) {
        current = current.childNodes[index];
      } else {
        return null;
      }
    }

    return current as HTMLElement;
  }
}

interface MinimactOptions {
  componentId: string;
  handlers?: HandlerConfig[];
  effects?: EffectConfig[];
}

interface HandlerConfig {
  domPath: number[];
  eventType: string;
  jsCode: Function;
}

interface EffectConfig {
  callback: Function;
  dependencies: string[];
}
```

---

## Why This Works

### 1. **Pure HTML DOM**
```html
<!-- Server renders clean HTML -->
<button>Count: 0</button>

<!-- No pollution: -->
<!-- ❌ NOT: <button data-handler="HandleClick" data-event="click"> -->
```

### 2. **Scoped Execution Context**
```javascript
// Hook context bound via .bind(this)
const boundHandler = handler.jsCode.bind(this.hookContext);

// Inside handler, this.useState is available:
function() {
    const useState = this.useState;  // ← Works!
    const [count, setCount] = useState('count');
    setCount(count + 1);
}
```

### 3. **Instant Updates via Template Patches**
```typescript
const setter = (newValue: any) => {
    // ✅ Apply cached template patch (0-5ms)
    const hint = this.hintQueue.matchHint(this.componentId, { [key]: newValue });
    if (hint) {
        this.domPatcher.applyPatches(this.element, hint.patches);
    }

    // ✅ Sync to server in background
    this.signalR.updateComponentState(this.componentId, key, newValue);
};
```

**Flow:**
1. User clicks button
2. Handler executes: `setCount(count + 1)`
3. Template patch applies instantly (0-5ms) ⚡
4. State syncs to server in background
5. Server re-renders and sends correction patches (if needed)

---

## Differences: Handlers vs Effects

| Aspect | Handlers | Effects |
|--------|----------|---------|
| **Need DOM Paths?** | ✅ Yes (attach to elements) | ❌ No (just execute) |
| **Attached to Elements?** | ✅ Yes (event listeners) | ❌ No (run on mount/deps change) |
| **When Executed?** | On user interaction (click, etc.) | On mount or dependency change |
| **Cleanup?** | N/A | ✅ Yes (return function) |
| **Example Use Cases** | Button clicks, form submissions | Timers, subscriptions, logging |

---

## SignalR's Actual Role

SignalR is **NOT** used for initial handler/effect setup. It's used for:

### 1. **State Synchronization (Client → Server)**
```typescript
// After applying template patch
this.signalR.updateComponentState(this.componentId, 'count', newValue);
```

### 2. **Re-render Patches (Server → Client)**
```csharp
// Server re-renders and sends patches
await hubContext.Clients.Client(connectionId).SendAsync("ApplyPatches", patches);
```

### 3. **Hot Reload (Development)**
```csharp
// File changes trigger hot reload
await hubContext.Clients.All.SendAsync("HotReload:TemplatePatch", {
    componentId: "Counter",
    templatePatch: { ... }
});
```

---

## Security Benefits

### 1. **No Global Access**
- Handlers and effects can't be accessed via `window`
- No way to call them from console or inject scripts
- Each component instance has isolated context

### 2. **No DOM Attribute Leakage**
- HTML doesn't reveal handler structure
- No `data-handler="executePayment"` to expose business logic
- Clean, semantic HTML

### 3. **Server Authority**
- Server validates all state changes
- Client patches are predictions, server has final say
- Business logic stays on server

---

## Example: Complete Counter Component

**TSX Input:**
```typescript
export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
```

**Generated HTML (Initial Payload):**
```html
<div id="minimact-root">
  <div>
    <h1>Count: 0</h1>
    <button>Increment</button>
    <button>Decrement</button>
  </div>
</div>

<script>
  const minimact = new Minimact.Minimact('#minimact-root', {
    componentId: 'Counter_abc123',

    handlers: [
      {
        domPath: [0, 1],
        eventType: "click",
        jsCode: function() {
          const useState = this.useState;
          const [count, setCount] = useState('count');
          setCount(count + 1);
        }
      },
      {
        domPath: [0, 2],
        eventType: "click",
        jsCode: function() {
          const useState = this.useState;
          const [count, setCount] = useState('count');
          setCount(count - 1);
        }
      }
    ],

    effects: [
      {
        callback: function() {
          const useState = this.useState;
          const [count, setCount] = useState('count');
          document.title = `Count: ${count}`;
        },
        dependencies: ["count"]
      }
    ]
  });

  minimact.start();
</script>
```

**What Happens When User Clicks "Increment":**

1. Event listener fires (attached via `domPath [0,1]`)
2. Handler executes: `setCount(count + 1)`
3. Template patch applies instantly: `<h1>Count: 1</h1>` (0-5ms) ⚡
4. State syncs to server via SignalR (background)
5. Effect runs: `document.title = "Count: 1"`
6. Server re-renders, sends patches (usually no-op if prediction correct)

---

## Summary

### Architecture Benefits

✅ **Clean HTML** - No data attributes, pure semantic markup
✅ **No Global Pollution** - Everything scoped to component instances
✅ **Secure** - Handlers/effects not accessible globally
✅ **Fast** - Template patches apply in 0-5ms
✅ **Type-Safe** - TypeScript → C# with full type inference
✅ **DX** - Write React, get server-side performance

### The Magic Formula

```
TSX Code
    ↓ Babel
C# (server rendering) + JavaScript (client execution)
    ↓ Server
Initial HTML with handlers/effects in constructor
    ↓ Client
.bind() hooks to context → Instant execution
    ↓ Template Patches
0-5ms updates, no round trips needed
```

**Result:** React DX + Server-side rendering + Instant interactivity = Minimact 🌵
