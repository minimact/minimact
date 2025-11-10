# Implementation Plan: External Library Support (Option 1)

## Goal
Enable automatic detection and handling of external third-party libraries (lodash, moment, etc.) so they work seamlessly in Minimact's client-server architecture.

## Success Criteria
- ✅ `ExternalLibrariesTest.jsx` fixture transpiles without errors
- ✅ C# compiles with valid `GetClientState<T>()` calls
- ✅ Client computes external library results
- ✅ SignalR syncs client-computed values to server
- ✅ Server re-renders using synced values
- ✅ End-to-end test passes in `test-client-sim.js`

---

## Phase 1: Babel Plugin Enhancement

### 1.1 Track External Imports

**File:** `src/babel-plugin-minimact/src/processComponent.cjs`

**Changes:**
```javascript
function processComponent(path, state) {
  const component = {
    // ... existing fields
    externalImports: new Set(),      // NEW: Track external library identifiers
    clientComputedVars: new Set()    // NEW: Track variables using external libs
  };

  // NEW: Traverse imports at file level
  state.file.path.traverse({
    ImportDeclaration(importPath) {
      const source = importPath.node.source.value;

      // Skip Minimact imports and relative imports
      if (source.startsWith('minimact') || source.startsWith('.') || source.startsWith('/')) {
        return;
      }

      // Track external library identifiers
      importPath.node.specifiers.forEach(spec => {
        if (t.isImportDefaultSpecifier(spec)) {
          // import _ from 'lodash'
          component.externalImports.add(spec.local.name);
        } else if (t.isImportSpecifier(spec)) {
          // import { sortBy } from 'lodash'
          component.externalImports.add(spec.local.name);
        } else if (t.isImportNamespaceSpecifier(spec)) {
          // import * as _ from 'lodash'
          component.externalImports.add(spec.local.name);
        }
      });
    }
  });

  // Rest of existing logic...
}
```

### 1.2 Detect Client-Computed Variables

**File:** `src/babel-plugin-minimact/src/extractors/localVariables.cjs`

**New Function:**
```javascript
/**
 * Check if an expression uses external libraries
 */
function usesExternalLibrary(node, externalImports, visited = new WeakSet()) {
  if (!node || visited.has(node)) return false;
  visited.add(node);

  // Direct identifier match
  if (t.isIdentifier(node) && externalImports.has(node.name)) {
    return true;
  }

  // Member expression (_.sortBy, moment().format)
  if (t.isMemberExpression(node)) {
    return usesExternalLibrary(node.object, externalImports, visited);
  }

  // Call expression (_.sortBy(...), moment(...))
  if (t.isCallExpression(node)) {
    return usesExternalLibrary(node.callee, externalImports, visited);
  }

  // Binary/Logical/Conditional expressions
  if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
    return usesExternalLibrary(node.left, externalImports, visited) ||
           usesExternalLibrary(node.right, externalImports, visited);
  }

  if (t.isConditionalExpression(node)) {
    return usesExternalLibrary(node.test, externalImports, visited) ||
           usesExternalLibrary(node.consequent, externalImports, visited) ||
           usesExternalLibrary(node.alternate, externalImports, visited);
  }

  // Array/Object expressions
  if (t.isArrayExpression(node)) {
    return node.elements.some(el => usesExternalLibrary(el, externalImports, visited));
  }

  if (t.isObjectExpression(node)) {
    return node.properties.some(prop =>
      usesExternalLibrary(prop.value, externalImports, visited)
    );
  }

  // Arrow functions and function expressions
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    return usesExternalLibrary(node.body, externalImports, visited);
  }

  // Block statement
  if (t.isBlockStatement(node)) {
    return node.body.some(stmt => usesExternalLibrary(stmt, externalImports, visited));
  }

  // Return statement
  if (t.isReturnStatement(node)) {
    return usesExternalLibrary(node.argument, externalImports, visited);
  }

  return false;
}

module.exports = { extractLocalVariables, usesExternalLibrary };
```

**Update `extractLocalVariables`:**
```javascript
function extractLocalVariables(path, component) {
  const declaration = path.node;

  declaration.declarations.forEach(declarator => {
    if (t.isIdentifier(declarator.id)) {
      const varName = declarator.id.name;
      const init = declarator.init;

      // Check if this variable uses external libraries
      const isClientComputed = usesExternalLibrary(init, component.externalImports);

      if (isClientComputed) {
        // Mark as client-computed
        component.clientComputedVars.add(varName);
      }

      component.localVariables.push({
        name: varName,
        init: init,
        isClientComputed: isClientComputed  // NEW flag
      });
    }
  });
}
```

### 1.3 Generate Client-Computed Properties

**File:** `src/babel-plugin-minimact/src/generators/csharpClass.cjs`

**Update generation logic:**
```javascript
function generateCSharpClass(component) {
  let classBody = '';

  // ... existing state generation

  // NEW: Generate client-computed properties
  component.localVariables
    .filter(v => v.isClientComputed)
    .forEach(variable => {
      const csharpType = inferCSharpType(variable.init);

      classBody += `
    [ClientComputed("${variable.name}")]
    private ${csharpType} ${variable.name} => GetClientState<${csharpType}>("${variable.name}");
`;
    });

  // ... rest of class generation
}

/**
 * Infer C# type from AST node (basic heuristics)
 */
function inferCSharpType(node) {
  if (!node) return 'dynamic';

  // Array types
  if (t.isArrayExpression(node)) return 'List<dynamic>';
  if (t.isCallExpression(node)) {
    const callee = node.callee;
    if (t.isMemberExpression(callee)) {
      const method = callee.property.name;
      // Common array methods return arrays
      if (['map', 'filter', 'sort', 'orderBy', 'sortBy'].includes(method)) {
        return 'List<dynamic>';
      }
      // Aggregation methods return numbers
      if (['reduce', 'sum', 'sumBy', 'mean', 'meanBy'].includes(method)) {
        return 'double';
      }
      // Find methods return single item
      if (['find', 'minBy', 'maxBy'].includes(method)) {
        return 'dynamic';
      }
    }
  }

  // String operations
  if (t.isTemplateLiteral(node) || t.isStringLiteral(node)) return 'string';

  // Numbers
  if (t.isNumericLiteral(node)) return 'double';

  // Booleans
  if (t.isBooleanLiteral(node)) return 'bool';

  // Default
  return 'dynamic';
}
```

---

## Phase 2: C# Runtime Support

### 2.1 Add ClientComputed Attribute

**File:** `src/Minimact.AspNetCore/Core/Attributes.cs` (or create if doesn't exist)

```csharp
using System;

namespace Minimact.AspNetCore.Core
{
    /// <summary>
    /// Marks a property as client-computed (calculated using external libraries on client-side)
    /// </summary>
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
    public class ClientComputedAttribute : Attribute
    {
        public string Key { get; }

        public ClientComputedAttribute(string key)
        {
            Key = key;
        }
    }
}
```

### 2.2 Add GetClientState Method

**File:** `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

```csharp
public abstract class MinimactComponent
{
    // ... existing members

    /// <summary>
    /// Client-computed state synced from browser
    /// </summary>
    protected Dictionary<string, object> ClientState { get; set; } = new Dictionary<string, object>();

    /// <summary>
    /// Get a client-computed value with type safety and default fallback
    /// </summary>
    protected T GetClientState<T>(string key, T defaultValue = default)
    {
        if (ClientState.TryGetValue(key, out var value))
        {
            try
            {
                if (value is JsonElement jsonElement)
                {
                    // Deserialize from JSON
                    return JsonSerializer.Deserialize<T>(jsonElement.GetRawText());
                }
                return (T)value;
            }
            catch
            {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    /// <summary>
    /// Update client-computed state (called by SignalR)
    /// </summary>
    public void UpdateClientState(Dictionary<string, object> updates)
    {
        foreach (var kvp in updates)
        {
            ClientState[kvp.Key] = kvp.Value;
        }
    }
}
```

---

## Phase 3: Client Runtime Enhancement

### 3.1 Client-Computed State Tracker

**File:** `src/client-runtime/src/clientComputed.ts` (NEW)

```typescript
import { VNode } from './types';

/**
 * Registry of client-computed variables and their compute functions
 */
interface ClientComputedRegistry {
  [componentId: string]: {
    [varName: string]: () => any;
  };
}

const computedRegistry: ClientComputedRegistry = {};

/**
 * Register a client-computed variable
 */
export function registerClientComputed(
  componentId: string,
  varName: string,
  computeFn: () => any
): void {
  if (!computedRegistry[componentId]) {
    computedRegistry[componentId] = {};
  }
  computedRegistry[componentId][varName] = computeFn;
}

/**
 * Compute all client values for a component
 */
export function computeClientState(componentId: string): Record<string, any> {
  const computed = computedRegistry[componentId];
  if (!computed) return {};

  const result: Record<string, any> = {};

  for (const [varName, computeFn] of Object.entries(computed)) {
    try {
      result[varName] = computeFn();
    } catch (error) {
      console.error(`Error computing ${varName}:`, error);
      result[varName] = null;
    }
  }

  return result;
}

/**
 * Send computed state to server via SignalR
 */
export async function syncClientState(
  componentId: string,
  connection: any
): Promise<void> {
  const clientState = computeClientState(componentId);

  if (Object.keys(clientState).length > 0) {
    await connection.invoke('UpdateClientState', componentId, clientState);
  }
}
```

### 3.2 Integration with Main Runtime

**File:** `src/client-runtime/src/index.ts`

```typescript
import { syncClientState } from './clientComputed';

// ... existing code

async function handleStateChange(componentId: string, stateKey: string, value: any) {
  // Update local state
  updateState(componentId, stateKey, value);

  // Compute client state that may depend on this change
  await syncClientState(componentId, connection);

  // Send state change to server
  await connection.invoke('UpdateState', componentId, stateKey, value);
}
```

---

## Phase 4: SignalR Hub Handler

### 4.1 Add UpdateClientState Method

**File:** `src/Minimact.AspNetCore/Hubs/MinimactHub.cs`

```csharp
public class MinimactHub : Hub
{
    // ... existing methods

    /// <summary>
    /// Receives client-computed state and triggers re-render
    /// </summary>
    public async Task UpdateClientState(string componentId, Dictionary<string, object> clientState)
    {
        // Get component instance
        var component = ComponentRegistry.GetComponent(componentId);
        if (component == null)
        {
            return;
        }

        // Update client state
        component.UpdateClientState(clientState);

        // Re-render with new client-computed values
        var vnode = component.Render();

        // Compute patches
        var patches = Differ.ComputePatches(component.PreviousVNode, vnode);
        component.PreviousVNode = vnode;

        // Send patches to client
        await Clients.Caller.SendAsync("ReceivePatches", componentId, patches);

        // Notify predictor
        PredictorService.Learn(componentId, patches);
    }
}
```

---

## Phase 5: Code Generation for ExternalLibrariesTest

### 5.1 Expected Generated C#

After implementing phases 1-4, `ExternalLibrariesTest.jsx` should generate:

```csharp
using Minimact.AspNetCore.Core;
using System.Collections.Generic;

namespace Minimact.Components;

[Component]
public partial class ExternalLibrariesTest : MinimactComponent
{
    [State]
    private List<dynamic> items = new List<object> { /* ... */ };

    [State]
    private string sortOrder = "asc";

    // Client-computed properties
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

        // Use client-computed values naturally
        return new VElement("div", new Dictionary<string, string> { ["className"] = "container mt-4" },
            new VElement("h1", ..., "External Libraries Test"),
            new VElement("p", ..., $"Total: ${totalPrice.ToString("F2")}"),
            new VElement("p", ..., $"Average: ${avgPrice.ToString("F2")}"),
            // ... rest of render
        );
    }

    private void toggleSort()
    {
        sortOrder = sortOrder == "asc" ? "desc" : "asc";
        SetState(nameof(sortOrder), sortOrder);
    }
}
```

### 5.2 Expected Client-Side JS

The client bundle should include:

```javascript
import _ from 'lodash';
import moment from 'moment';

// Register computations
registerClientComputed('ExternalLibrariesTest-1', 'sortedItems', () => {
  const items = getState('items');
  const sortOrder = getState('sortOrder');
  return _.orderBy(items, ['price'], [sortOrder]);
});

registerClientComputed('ExternalLibrariesTest-1', 'totalPrice', () => {
  const items = getState('items');
  return _.sumBy(items, 'price');
});

// ... etc
```

---

## Phase 6: Testing

### 6.1 Update test-client-sim.js

Add validation for client-computed variables:

```javascript
function validateClientComputed(component) {
  const validations = [];

  // Check that client-computed vars are marked
  if (component.clientComputedVars && component.clientComputedVars.size > 0) {
    const csharp = generateCSharpForComponent(component);

    component.clientComputedVars.forEach(varName => {
      const hasAttribute = csharp.includes(`[ClientComputed("${varName}")]`);
      const hasProperty = csharp.includes(`GetClientState<`);

      validations.push({
        feature: `Client-computed: ${varName}`,
        passed: hasAttribute && hasProperty,
        details: hasAttribute && hasProperty
          ? `✓ Correctly marked as client-computed`
          : `✗ Missing [ClientComputed] or GetClientState`
      });
    });
  }

  return validations;
}
```

### 6.2 End-to-End Test Flow

1. Transpile `ExternalLibrariesTest.jsx`
2. Compile C# (should succeed)
3. Initial server render (placeholders for client-computed values)
4. Client hydrates and computes values
5. Client sends computed state via SignalR
6. Server re-renders with real values
7. Validate final output

---

## Phase 7: Documentation

### 7.1 Developer Guide

**File:** `docs/EXTERNAL_LIBRARIES.md`

Content:
- How external libraries work automatically
- Examples with lodash, moment, d3
- When to use `data-client-scope` escape hatch
- Performance considerations
- Debugging client-computed state

### 7.2 API Reference

Update API docs with:
- `[ClientComputed]` attribute
- `GetClientState<T>()` method
- Client runtime `registerClientComputed()` function

---

## Success Metrics

After implementation:

✅ ExternalLibrariesTest.jsx transpiles cleanly
✅ Generated C# compiles without errors
✅ Test passes in test-client-sim.js
✅ Sample app runs with lodash/moment
✅ SignalR successfully syncs client state
✅ Predictor learns from client-computed patterns
✅ Dev tools show client-computed variables

---

## Timeline Estimate

- **Phase 1 (Babel):** 2-3 days
- **Phase 2 (C# Runtime):** 1-2 days
- **Phase 3 (Client Runtime):** 2-3 days
- **Phase 4 (SignalR):** 1 day
- **Phase 5 (Code Gen):** 1 day
- **Phase 6 (Testing):** 2-3 days
- **Phase 7 (Docs):** 1-2 days

**Total:** ~10-15 days

---

## Next: Minimact Punch

Once external libraries work, we can implement Minimact Punch using the exact same infrastructure:

```jsx
import { useDomElementState } from 'minimact-punch';  // External library!

const items = useDomElementState('.item');  // Auto-detected as client-computed
```

The Babel plugin will treat it like lodash, the C# will use `GetClientState()`, and the client will compute DOM state and sync via SignalR.

**All can be state. All can be delicious.** 🌵 + 🍹
