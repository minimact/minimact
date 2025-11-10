# Solution Options for External Library Support

## Problem Recap

External libraries (lodash, moment, etc.) are being transpiled directly to C# where they fail. We need a way to:
1. Keep external library code client-side only
2. Let the server know about computed values
3. Enable SignalR to communicate client-computed results to server

## Solution Options

---

## ✅ **Option 1: Auto-Detect External Imports (RECOMMENDED)**

**How it works:** The Babel plugin tracks all non-Minimact imports and treats variables using them as client-computed.

### Implementation

**Babel Plugin Changes:**

```javascript
// In processComponent.cjs
function processComponent(path, state) {
  const component = {
    // ... existing fields
    externalImports: new Set(),  // Track external libraries
    clientComputedVars: new Set() // Variables using external libs
  };

  // Track imports at Program level
  state.file.path.traverse({
    ImportDeclaration(importPath) {
      const source = importPath.node.source.value;

      // Track external (non-Minimact) imports
      if (!source.startsWith('minimact') && !source.startsWith('.')) {
        importPath.node.specifiers.forEach(spec => {
          if (spec.local) {
            component.externalImports.add(spec.local.name);
          }
        });
      }
    }
  });

  // Mark variables using external imports as client-computed
  path.traverse({
    VariableDeclarator(varPath) {
      const init = varPath.node.init;

      // Check if initializer uses external library
      if (usesExternalLibrary(init, component.externalImports)) {
        component.clientComputedVars.add(varPath.node.id.name);
      }
    }
  });
}

function usesExternalLibrary(node, externalImports) {
  // Check if expression tree contains external library references
  let uses = false;
  traverse(node, {
    Identifier(path) {
      if (externalImports.has(path.node.name)) {
        uses = true;
        path.stop();
      }
    }
  });
  return uses;
}
```

**Generated C# for ExternalLibrariesTest:**

```csharp
[Component]
public partial class ExternalLibrariesTest : MinimactComponent
{
    [State]
    private List<dynamic> items = new List<object> { /* ... */ };

    [State]
    private string sortOrder = "asc";

    // Client-computed variables (marked with attribute)
    [ClientComputed("sortedItems")]
    private List<dynamic> sortedItems => GetClientState<List<dynamic>>("sortedItems");

    [ClientComputed("totalPrice")]
    private double totalPrice => GetClientState<double>("totalPrice");

    [ClientComputed("avgPrice")]
    private double avgPrice => GetClientState<double>("avgPrice");

    [ClientComputed("cheapestItem")]
    private dynamic cheapestItem => GetClientState<dynamic>("cheapestItem");

    [ClientComputed("expensiveItems")]
    private List<dynamic> expensiveItems => GetClientState<List<dynamic>>("expensiveItems");

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Use client-computed properties normally
        return new VElement("div", ...,
            new VText($"Total: ${totalPrice.ToString("F2")}"),
            // ...
        );
    }
}
```

**Client-side behavior:**

```javascript
// Client runtime computes values and sends to server
const component = {
  items: [/* server state */],
  sortOrder: 'asc',

  // Client computes these using lodash
  get sortedItems() {
    return _.orderBy(this.items, ['price'], [this.sortOrder]);
  },

  get totalPrice() {
    return _.sumBy(this.items, 'price');
  }

  // ... etc
};

// Send computed values via SignalR
connection.invoke('UpdateClientState', {
  componentId: 'ExternalLibrariesTest-1',
  clientState: {
    sortedItems: component.sortedItems,
    totalPrice: component.totalPrice,
    avgPrice: component.avgPrice,
    cheapestItem: component.cheapestItem,
    expensiveItems: component.expensiveItems
  }
});
```

### Pros
- ✅ Zero developer annotation needed
- ✅ Works automatically for all external libraries
- ✅ Type-safe C# properties
- ✅ Fits Minimact's philosophy (convention over configuration)
- ✅ Server can still use computed values in rendering

### Cons
- ⚠️ Requires initial client render to compute values (server render may have placeholder data)
- ⚠️ Complex dependency analysis in Babel plugin

---

## ✅ **Option 2: `data-client-scope` Annotation (Existing Pattern)**

**How it works:** Extend existing `data-client-scope` to handle variable declarations.

### Implementation

**JSX:**

```jsx
function ExternalLibrariesTest() {
  const [items, setItems] = useState([...]);
  const [sortOrder, setSortOrder] = useState('asc');

  return (
    <div data-client-scope>
      {/* Everything in here runs on client only */}
      {(() => {
        const sortedItems = _.orderBy(items, ['price'], [sortOrder]);
        const totalPrice = _.sumBy(items, 'price');

        return (
          <>
            <p>Total: ${totalPrice.toFixed(2)}</p>
            {sortedItems.map(item => <div key={item.id}>{item.name}</div>)}
          </>
        );
      })()}
    </div>
  );
}
```

**Generated C#:**

```csharp
protected override VNode Render()
{
    StateManager.SyncMembersToState(this);

    return new VElement("div", new Dictionary<string, string> {
        ["data-client-scope"] = "true"
    },
        // Server renders placeholder
        new VText("<!-- Client-rendered content -->")
    );
}
```

**Client-side:** Executes full JavaScript inside `data-client-scope` elements.

### Pros
- ✅ Explicit control over what runs where
- ✅ Leverages existing `data-client-scope` infrastructure
- ✅ Simple Babel plugin logic

### Cons
- ❌ Requires developer to wrap code
- ❌ Server can't access computed values for SSR
- ❌ Less seamless than auto-detection

---

## ✅ **Option 3: `useClientComputed` Hook**

**How it works:** New hook that explicitly marks client-side computations.

### Implementation

**JSX:**

```jsx
import { useState, useClientComputed } from 'minimact';
import _ from 'lodash';

function ExternalLibrariesTest() {
  const [items, setItems] = useState([...]);
  const [sortOrder, setSortOrder] = useState('asc');

  // Declare client-computed values
  const sortedItems = useClientComputed('sortedItems', () => {
    return _.orderBy(items, ['price'], [sortOrder]);
  }, [items, sortOrder]);

  const totalPrice = useClientComputed('totalPrice', () => {
    return _.sumBy(items, 'price');
  }, [items]);

  return (
    <div>
      <p>Total: ${totalPrice.toFixed(2)}</p>
      {sortedItems.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
}
```

**Generated C#:**

```csharp
[Component]
public partial class ExternalLibrariesTest : MinimactComponent
{
    [State]
    private List<dynamic> items = new List<object> { /* ... */ };

    [State]
    private string sortOrder = "asc";

    private List<dynamic> sortedItems = new List<dynamic>();
    private double totalPrice = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // Use properties populated by client
        sortedItems = GetClientComputedValue<List<dynamic>>("sortedItems", new List<dynamic>());
        totalPrice = GetClientComputedValue<double>("totalPrice", 0);

        return new VElement("div", ...,
            new VText($"Total: ${totalPrice.ToString("F2")}"),
            // ...
        );
    }
}
```

**Client runtime:**

```javascript
// minimact client runtime enhancement
export function useClientComputed(key, computeFn, deps) {
  const component = getCurrentComponent();

  // Compute value on client
  const value = computeFn();

  // Send to server via SignalR
  component.sendClientComputed(key, value);

  return value;
}
```

### Pros
- ✅ Explicit and clear semantics
- ✅ Familiar React-like API
- ✅ Dependency tracking for recomputation
- ✅ Server gets computed values

### Cons
- ⚠️ Requires manual hook usage
- ⚠️ More verbose than auto-detection

---

## ✅ **Option 4: Hybrid Client/Server Components**

**How it works:** Introduce component-level annotation to split rendering.

### Implementation

**JSX:**

```jsx
// Mark component as hybrid
/** @minimact client-computed */
function StatisticsCard({ items }) {
  const totalPrice = _.sumBy(items, 'price');
  const avgPrice = _.meanBy(items, 'price');

  return (
    <div className="card">
      <p>Total: ${totalPrice.toFixed(2)}</p>
      <p>Average: ${avgPrice.toFixed(2)}</p>
    </div>
  );
}

// Server component uses client component
function ExternalLibrariesTest() {
  const [items, setItems] = useState([...]);

  return (
    <div>
      <StatisticsCard items={items} />
    </div>
  );
}
```

**Generated C#:**

```csharp
// StatisticsCard is not transpiled - remains client-only

[Component]
public partial class ExternalLibrariesTest : MinimactComponent
{
    [State]
    private List<dynamic> items = new List<object> { /* ... */ };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", ...,
            new VElement("div", new Dictionary<string, string> {
                ["data-component"] = "StatisticsCard",
                ["data-props"] = JsonSerializer.Serialize(new { items })
            })
        );
    }
}
```

**Client:** Mounts `StatisticsCard` as client-only island.

### Pros
- ✅ Clear separation of concerns
- ✅ Similar to React Server Components
- ✅ Good for heavy external library usage

### Cons
- ❌ Requires component-level thinking
- ❌ More complex mental model
- ❌ Potential for over-fragmentation

---

## 📊 **Comparison Matrix**

| Feature | Option 1: Auto-Detect | Option 2: data-client-scope | Option 3: useClientComputed | Option 4: Hybrid Components |
|---------|----------------------|----------------------------|-----------------------------|-----------------------------|
| **Developer Effort** | None | Low | Medium | Medium |
| **Server Access** | ✅ Yes | ❌ No | ✅ Yes | Partial |
| **Type Safety** | ✅ Full | ⚠️ Partial | ✅ Full | ✅ Full |
| **SSR Support** | ⚠️ Partial | ❌ No | ⚠️ Partial | ⚠️ Partial |
| **Complexity** | High (plugin) | Low | Medium | High |
| **Flexibility** | High | Low | High | Very High |
| **Fits Minimact** | ✅✅✅ | ✅✅ | ✅✅ | ✅ |

---

## 🎯 **Recommended Approach**

**Implement Option 1 (Auto-Detect) + Option 2 (data-client-scope) as fallback**

### Phase 1: Auto-Detection (Core)
1. Babel plugin tracks external imports
2. Variables using external libs become `[ClientComputed]` properties
3. Client computes and sends via SignalR
4. Server uses GetClientState<T>() to access values

### Phase 2: Manual Escape Hatch
1. Keep `data-client-scope` for complex cases
2. Allow developers to opt-out of auto-detection if needed

### Example Flow:

**Developer writes:**
```jsx
import _ from 'lodash';
function MyComponent() {
  const [items] = useState([...]);
  const sorted = _.sortBy(items, 'name');  // Auto-detected!

  return <div>{sorted.map(i => <p>{i.name}</p>)}</div>;
}
```

**Babel generates:**
```csharp
private List<dynamic> sorted => GetClientState<List<dynamic>>("sorted");
```

**Client executes:**
```javascript
const sorted = _.sortBy(items, 'name');
connection.invoke('UpdateClientState', { sorted });
```

**Server re-renders with client-computed `sorted`.**

---

## 🚀 **Implementation Plan**

1. ✅ Create test fixture (done: ExternalLibrariesTest.jsx)
2. ⏳ Implement external import tracking in Babel plugin
3. ⏳ Add `[ClientComputed]` attribute and GetClientState<T>() to C# runtime
4. ⏳ Enhance client runtime to compute and send external library results
5. ⏳ Add SignalR handler for UpdateClientState
6. ⏳ Test end-to-end with lodash, moment, bootstrap
7. ⏳ Document patterns and best practices
8. ⏳ Implement Minimact Punch using this infrastructure

This unblocks Minimact Punch and enables any external library to work seamlessly! 🌵 + 🍹
