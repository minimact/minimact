# useDynamicState Implementation Plan

**Goal:** Separate structure from content. Define DOM once in JSX, bind values dynamically with minimal code.

---

## The MINIMACT Philosophy 🌵

**MINIMAL code. MAXIMAL power.**

```typescript
// ❌ TRADITIONAL REACT - Repeating DOM structure in every branch
{user.isPremium ? (
  <span className="price factory">{product.factoryPrice}</span>
) : (
  <span className="price retail">{product.price}</span>
)}

// ✅ MINIMACT - Structure ONCE, bind SEPARATELY
<span className="price"></span>

const dynamic = useDynamicState();
dynamic('.price', (state) =>
  state.user.isPremium ? state.product.factoryPrice : state.product.price
);
```

**Benefits:**
- ✅ DOM structure defined ONCE
- ✅ Never repeat element names
- ✅ Clear separation: structure (JSX) vs. behavior (binding)
- ✅ Function returns VALUE, not JSX
- ✅ Server evaluates → renders value
- ✅ Client re-evaluates → updates value directly
- ✅ No VDOM reconciliation, just `el.textContent = value`

---

## Core Concept

**useDynamicState** enables **minimal dynamic bindings**:

1. **Define structure in JSX** (once)
2. **Bind values with functions** (separately)
3. **Server evaluates** function with state → renders value
4. **Client re-evaluates** when state changes → updates value

```typescript
// Structure (JSX)
<div className="product">
  <span className="name"></span>
  <span className="price"></span>
  <span className="badge"></span>
</div>

// Bindings (separate)
const dynamic = useDynamicState();

dynamic('.name', (state) => state.product.name);

dynamic('.price', (state) =>
  state.user.isPremium
    ? `$${state.product.factoryPrice}`
    : `$${state.product.price}`
);

dynamic('.badge', (state) =>
  state.user.isAdmin ? 'ADMIN' :
  state.user.isPremium ? 'PREMIUM' :
  'USER'
);
```

**Server renders:**
```html
<div class="product">
  <span class="name">Cool Gadget</span>
  <span class="price">$29.99</span>
  <span class="badge">USER</span>
</div>
```

**State changes → client updates values directly. No VDOM. No reconciliation.**

---

## Why This is Minimal

| Aspect | Traditional React | MINIMACT |
|--------|------------------|----------|
| **DOM structure** | Repeated in every conditional branch | Defined ONCE in JSX |
| **Value logic** | Mixed with structure | Separated in binding |
| **Maintenance** | Change class → change everywhere | Change ONCE |
| **Updates** | VDOM reconciliation | Direct value assignment |
| **Code** | Verbose, duplicated | Minimal, clean |
| **Bundle** | Heavy (React + VDOM) | Tiny (just binding logic) |

---

## Architecture

```
1. Client-Side: useDynamicState hook
   - Register selector + value function
   - Track dependencies automatically
   - Re-evaluate when dependencies change
   - Update DOM value directly (el.textContent = value)

2. Server-Side: DynamicValueCompiler
   - Evaluate function with current state
   - Get value result
   - Insert into HTML
   - Attach metadata for hydration

3. Hydration: Zero-cost pickup
   - Read metadata from DOM
   - Register bindings
   - Ready to react to state changes
```

---

## Phase 1: Client-Side Foundation

### Step 1.1: Create minimact-dynamic package structure

```bash
src/
  minimact-dynamic/
    src/
      index.ts
      use-dynamic-state.ts
      types.ts
      dependency-tracker.ts
      value-updater.ts
    package.json
    tsconfig.json
    README.md
```

### Step 1.2: Define TypeScript types

**File: `src/minimact-dynamic/src/types.ts`**

```typescript
/**
 * Function that returns a VALUE based on state
 * NOT JSX - just a value (string, number, etc.)
 */
export type DynamicValueFunction<TState = any> = (state: TState) => string | number | boolean;

/**
 * Dynamic value binding
 */
export interface DynamicBinding {
  selector: string;
  fn: DynamicValueFunction;
  dependencies: string[];  // Auto-tracked from function
  currentValue?: any;      // Last computed value
}

/**
 * Binding metadata stored in DOM (for hydration)
 */
export interface BindingMetadata {
  bindingId: string;
  selector: string;
  dependencies: string[];
}

/**
 * Main API returned by useDynamicState()
 */
export interface DynamicStateAPI<TState = any> {
  /**
   * Register a dynamic value binding
   * @param selector - CSS selector (jQuery-like)
   * @param fn - Function that returns value based on state
   */
  (selector: string, fn: DynamicValueFunction<TState>): void;

  /**
   * Get current state
   */
  getState(): TState;

  /**
   * Update state (triggers binding re-evaluation)
   */
  setState(updater: (prev: TState) => TState): void;
  setState(newState: Partial<TState>): void;

  /**
   * Clear all bindings
   */
  clear(): void;

  /**
   * Remove specific binding
   */
  remove(selector: string): void;
}
```

### Step 1.3: Implement dependency tracking

**File: `src/minimact-dynamic/src/dependency-tracker.ts`**

```typescript
/**
 * Track which state properties a function accesses
 * Uses Proxy to intercept property reads
 */
export function trackDependencies<T extends object>(
  state: T,
  fn: (state: T) => any
): { result: any; dependencies: string[] } {
  const dependencies = new Set<string>();

  // Create proxy that tracks property access
  const proxy = createTrackingProxy(state, '', dependencies);

  // Execute function with tracking proxy
  const result = fn(proxy);

  return {
    result,
    dependencies: Array.from(dependencies)
  };
}

function createTrackingProxy<T extends object>(
  target: T,
  path: string,
  dependencies: Set<string>
): T {
  return new Proxy(target, {
    get(obj, prop) {
      const propPath = path ? `${path}.${String(prop)}` : String(prop);
      dependencies.add(propPath);

      const value = obj[prop as keyof T];

      // If value is object, return proxy for nested tracking
      if (value && typeof value === 'object') {
        return createTrackingProxy(value, propPath, dependencies);
      }

      return value;
    }
  });
}

/**
 * Check if any dependency path changed between prev and next state
 */
export function hasPathChanged(
  prevState: any,
  nextState: any,
  dependencies: string[]
): boolean {
  return dependencies.some(path => {
    const prevValue = resolvePath(path, prevState);
    const nextValue = resolvePath(path, nextState);
    return prevValue !== nextValue;
  });
}

function resolvePath(path: string, obj: any): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}
```

### Step 1.4: Implement value updater

**File: `src/minimact-dynamic/src/value-updater.ts`**

```typescript
/**
 * Update DOM element value directly
 * NO VDOM, NO RECONCILIATION
 * Just: el.textContent = value
 */
export class ValueUpdater {
  /**
   * Update value for all elements matching selector
   */
  updateValue(selector: string, value: any): void {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`[minimact-dynamic] No elements found for selector: ${selector}`);
      return;
    }

    const stringValue = String(value);

    elements.forEach(element => {
      // Direct DOM update - MINIMAL
      element.textContent = stringValue;
    });

    console.log(`[minimact-dynamic] Updated ${elements.length} elements with selector '${selector}' to value: ${stringValue}`);
  }

  /**
   * Update attribute value
   */
  updateAttribute(selector: string, attr: string, value: any): void {
    const elements = document.querySelectorAll(selector);
    const stringValue = String(value);

    elements.forEach(element => {
      element.setAttribute(attr, stringValue);
    });
  }

  /**
   * Update style property
   */
  updateStyle(selector: string, prop: string, value: any): void {
    const elements = document.querySelectorAll(selector);
    const stringValue = String(value);

    elements.forEach(element => {
      (element as HTMLElement).style[prop as any] = stringValue;
    });
  }
}
```

### Step 1.5: Implement useDynamicState hook

**File: `src/minimact-dynamic/src/use-dynamic-state.ts`**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { DynamicStateAPI, DynamicBinding, DynamicValueFunction } from './types';
import { trackDependencies, hasPathChanged } from './dependency-tracker';
import { ValueUpdater } from './value-updater';

export function useDynamicState<TState extends object = any>(
  initialState: TState
): DynamicStateAPI<TState> {
  const [state, setState] = useState<TState>(initialState);
  const prevStateRef = useRef<TState>(initialState);
  const bindingsRef = useRef<Map<string, DynamicBinding>>(new Map());
  const updaterRef = useRef<ValueUpdater>(new ValueUpdater());
  const isHydratedRef = useRef(false);

  // HYDRATION: Read pre-rendered bindings from server
  useEffect(() => {
    if (!isHydratedRef.current) {
      hydrateBindings();
      isHydratedRef.current = true;
    }
  }, []);

  /**
   * Hydrate bindings from server-rendered HTML
   */
  const hydrateBindings = () => {
    const bindingElements = document.querySelectorAll('[data-minimact-binding]');

    bindingElements.forEach(el => {
      const metadataJson = el.getAttribute('data-minimact-binding');
      if (!metadataJson) return;

      try {
        const metadata = JSON.parse(metadataJson);
        console.log(`[minimact-dynamic] Hydrated binding: ${metadata.selector}`);

        // Remove metadata (cleanup)
        el.removeAttribute('data-minimact-binding');
      } catch (error) {
        console.error('[minimact-dynamic] Failed to parse binding metadata:', error);
      }
    });

    console.log(`[minimact-dynamic] Hydrated ${bindingElements.length} bindings`);
  };

  /**
   * Register a dynamic value binding
   */
  const registerBinding = useCallback((selector: string, fn: DynamicValueFunction<TState>) => {
    // Track dependencies by executing function once with tracking proxy
    const { result: initialValue, dependencies } = trackDependencies(state, fn);

    // Store binding
    bindingsRef.current.set(selector, {
      selector,
      fn,
      dependencies,
      currentValue: initialValue
    });

    // Render initial value to DOM
    updaterRef.current.updateValue(selector, initialValue);

    console.log(`[minimact-dynamic] Registered binding '${selector}' with dependencies:`, dependencies);
  }, [state]);

  /**
   * Re-evaluate bindings when state changes
   */
  useEffect(() => {
    const prevState = prevStateRef.current;

    bindingsRef.current.forEach(binding => {
      // Check if any dependencies changed
      const shouldUpdate = hasPathChanged(prevState, state, binding.dependencies);

      if (shouldUpdate) {
        // Re-evaluate function with new state
        const newValue = binding.fn(state);

        // Update DOM directly - MINIMAL
        updaterRef.current.updateValue(binding.selector, newValue);

        // Update current value
        binding.currentValue = newValue;

        console.log(`[minimact-dynamic] Updated binding '${binding.selector}' to: ${newValue}`);
      }
    });

    // Store current state for next comparison
    prevStateRef.current = state;
  }, [state]);

  /**
   * Update state
   */
  const updateState = useCallback((updaterOrPartial: any) => {
    if (typeof updaterOrPartial === 'function') {
      setState(updaterOrPartial);
    } else {
      setState(prev => ({ ...prev, ...updaterOrPartial }));
    }
  }, []);

  // API
  const api: any = registerBinding;
  api.getState = () => state;
  api.setState = updateState;
  api.clear = () => bindingsRef.current.clear();
  api.remove = (selector: string) => bindingsRef.current.delete(selector);

  return api;
}
```

### Step 1.6: Create package entry point

**File: `src/minimact-dynamic/src/index.ts`**

```typescript
export { useDynamicState } from './use-dynamic-state';
export type {
  DynamicStateAPI,
  DynamicBinding,
  DynamicValueFunction,
  BindingMetadata
} from './types';

export const VERSION = '0.1.0';
```

### Step 1.7: Create package.json

**File: `src/minimact-dynamic/package.json`**

```json
{
  "name": "minimact-dynamic",
  "version": "0.1.0",
  "description": "Minimal dynamic value bindings for Minimact - separate structure from content",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "keywords": [
    "minimact",
    "dynamic",
    "minimal",
    "binding"
  ],
  "author": "",
  "license": "MIT",
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 1.8: Create tsconfig.json

**File: `src/minimact-dynamic/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "jsx": "react"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Phase 2: Server-Side Value Compiler (C#)

### Step 2.1: Create DynamicBinding class

**File: `src/Minimact.AspNetCore/DynamicState/DynamicBinding.cs`**

```csharp
namespace Minimact.AspNetCore.DynamicState;

/// <summary>
/// Represents a dynamic value binding
/// </summary>
public class DynamicBinding
{
    public string BindingId { get; set; } = Guid.NewGuid().ToString();
    public string Selector { get; set; } = "";
    public Func<object, object> Function { get; set; } = _ => "";
    public List<string> Dependencies { get; set; } = new();
    public object? CurrentValue { get; set; }
}
```

### Step 2.2: Create DynamicValueCompiler

**File: `src/Minimact.AspNetCore/DynamicState/DynamicValueCompiler.cs`**

```csharp
using System.Text.Json;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace Minimact.AspNetCore.DynamicState;

/// <summary>
/// Server-side compiler for dynamic value bindings
/// Evaluates functions with current state and inserts values into HTML
/// </summary>
public class DynamicValueCompiler
{
    private readonly List<DynamicBinding> _bindings = new();
    private readonly HtmlParser _parser = new();

    /// <summary>
    /// Register a dynamic value binding
    /// </summary>
    /// <param name="selector">CSS selector</param>
    /// <param name="fn">Function that returns value based on state</param>
    public void RegisterBinding(string selector, Func<object, object> fn)
    {
        // Track dependencies
        // (In real implementation, Babel transpiler would extract these)
        var dependencies = ExtractDependencies(fn);

        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = fn,
            Dependencies = dependencies
        });
    }

    /// <summary>
    /// Compile HTML with dynamic values evaluated and inserted
    /// </summary>
    public string CompileHtml(string html, object state)
    {
        var document = _parser.ParseDocument(html);

        foreach (var binding in _bindings)
        {
            // Evaluate function with current state to get VALUE
            var value = binding.Function(state);
            binding.CurrentValue = value;

            // Find elements matching selector
            var elements = document.QuerySelectorAll(binding.Selector);

            foreach (var element in elements)
            {
                // Insert value into element - MINIMAL
                element.TextContent = value?.ToString() ?? "";

                // Attach binding metadata for hydration
                var metadata = new
                {
                    bindingId = binding.BindingId,
                    selector = binding.Selector,
                    dependencies = binding.Dependencies
                };

                element.SetAttribute("data-minimact-binding", JsonSerializer.Serialize(metadata));
            }
        }

        return document.DocumentElement.OuterHtml;
    }

    /// <summary>
    /// Extract dependencies from function
    /// (In real implementation, Babel transpiler does this)
    /// </summary>
    private List<string> ExtractDependencies(Func<object, object> fn)
    {
        // Placeholder - Babel transpiler would inject this metadata
        return new List<string>();
    }

    /// <summary>
    /// Clear all bindings
    /// </summary>
    public void Clear()
    {
        _bindings.Clear();
    }
}
```

### Step 2.3: Integrate with MinimactComponent

**File: `src/Minimact.AspNetCore/Core/MinimactComponent.cs`** (additions)

```csharp
using Minimact.AspNetCore.DynamicState;

public abstract class MinimactComponent
{
    // ... existing code ...

    /// <summary>
    /// Dynamic value compiler for this component
    /// </summary>
    protected DynamicValueCompiler DynamicBindings { get; } = new();

    /// <summary>
    /// Override this to register dynamic value bindings
    /// </summary>
    protected virtual void ConfigureDynamicBindings()
    {
        // Override in derived components
    }

    /// <summary>
    /// Render with dynamic bindings compiled
    /// </summary>
    public string RenderWithDynamicBindings()
    {
        // Call user's dynamic binding configuration
        ConfigureDynamicBindings();

        // Render normal HTML
        var html = RenderToString();

        // Compile with dynamic values inserted
        var compiled = DynamicBindings.CompileHtml(html, this.State);

        // Clear bindings for next render
        DynamicBindings.Clear();

        return compiled;
    }
}
```

---

## Phase 3: Examples - The MINIMAL Way

### Example 1: Conditional pricing (MINIMAL)

**Client-side:**

```typescript
import { useDynamicState } from 'minimact-dynamic';

interface ProductState {
  user: { isPremium: boolean };
  product: { price: number; factoryPrice: number };
}

export function ProductCard() {
  const dynamic = useDynamicState<ProductState>({
    user: { isPremium: false },
    product: { price: 29.99, factoryPrice: 19.99 }
  });

  // MINIMAL binding - just the value logic
  dynamic('.price', (state) =>
    state.user.isPremium
      ? `$${state.product.factoryPrice}`
      : `$${state.product.price}`
  );

  // Structure defined ONCE
  return (
    <div className="product-card">
      <h3>Cool Gadget</h3>
      <span className="price"></span>
      <button onClick={() => dynamic.setState({ user: { isPremium: true } })}>
        Upgrade to Premium
      </button>
    </div>
  );
}
```

**Server-side (generated by Babel):**

```csharp
public class ProductCard : MinimactComponent
{
    protected override void ConfigureDynamicBindings()
    {
        // Babel transpiler converts TypeScript function to C#
        DynamicBindings.RegisterBinding(".price", (state) =>
        {
            var s = (ProductState)state;
            return s.User.IsPremium
                ? $"${s.Product.FactoryPrice}"
                : $"${s.Product.Price}";
        });
    }

    protected override VNode Render()
    {
        // Structure ONCE - MINIMAL
        return new VNode("div", new { className = "product-card" },
            new VNode("h3", "Cool Gadget"),
            new VNode("span", new { className = "price" }),
            new VNode("button", new { onClick = "..." }, "Upgrade to Premium")
        );
    }
}
```

**Server renders:**

```html
<div class="product-card">
  <h3>Cool Gadget</h3>
  <span class="price" data-minimact-binding='{"bindingId":"abc","selector":".price","dependencies":["user.isPremium","product.price","product.factoryPrice"]}'>$29.99</span>
  <button>Upgrade to Premium</button>
</div>
```

**User clicks button → state changes → binding re-evaluates:**

```typescript
// Client updates directly - MINIMAL
el.textContent = '$19.99';  // No VDOM, no reconciliation
```

### Example 2: User badge (MINIMAL)

```typescript
// Structure ONCE
<span className="badge"></span>

// Binding SEPARATELY
dynamic('.badge', (state) =>
  state.user.isAdmin ? 'ADMIN' :
  state.user.isPremium ? 'PREMIUM' :
  'USER'
);
```

### Example 3: Multiple bindings (MINIMAL)

```typescript
// Structure ONCE
<div className="user-info">
  <span className="username"></span>
  <span className="email"></span>
  <span className="status"></span>
</div>

// Bindings SEPARATELY
const dynamic = useDynamicState();

dynamic('.username', (state) => state.user.name);
dynamic('.email', (state) => state.user.email);
dynamic('.status', (state) => state.user.isOnline ? 'Online' : 'Offline');
```

### Example 4: Formatted values (MINIMAL)

```typescript
// Structure ONCE
<div className="stats">
  <span className="count"></span>
  <span className="percentage"></span>
  <span className="currency"></span>
</div>

// Bindings with formatting
dynamic('.count', (state) => `${state.items.length} items`);
dynamic('.percentage', (state) => `${(state.progress * 100).toFixed(0)}%`);
dynamic('.currency', (state) => `$${state.total.toFixed(2)}`);
```

---

## Phase 4: Performance Optimizations

### Step 4.1: Smart dependency tracking

Only re-evaluate when specific dependencies change:

```typescript
// Auto-tracked: ['user.isPremium', 'product.factoryPrice', 'product.price']

// Later, only re-evaluate if these exact paths changed
if (hasPathChanged(prevState, newState, binding.dependencies)) {
  const newValue = binding.fn(state);
  el.textContent = String(newValue);  // Direct update - MINIMAL
}
```

### Step 4.2: Batch updates

Update multiple bindings in a single frame:

```typescript
let pendingUpdates = new Set<DynamicBinding>();
let updateScheduled = false;

function scheduleUpdate(binding: DynamicBinding) {
  pendingUpdates.add(binding);

  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(() => {
      pendingUpdates.forEach(b => updateBinding(b));
      pendingUpdates.clear();
      updateScheduled = false;
    });
  }
}
```

### Step 4.3: Memoization

Cache values to avoid re-computation:

```typescript
const memoCache = new Map<string, { state: any; value: any }>();

function evaluateBinding(binding: DynamicBinding, state: any): any {
  const cached = memoCache.get(binding.bindingId);

  if (cached && shallowEqual(cached.state, state)) {
    return cached.value;
  }

  const value = binding.fn(state);
  memoCache.set(binding.bindingId, { state, value });
  return value;
}
```

---

## Phase 5: Babel Transpiler Integration

### Step 5.1: Detect useDynamicState patterns

```typescript
const dynamic = useDynamicState(initialState);
dynamic('.selector', (state) => state.value);
```

### Step 5.2: Transpile to C#

```typescript
// TypeScript
dynamic('.price', (state) =>
  state.isPremium ? state.factoryPrice : state.retailPrice
);

// Becomes C#
DynamicBindings.RegisterBinding(".price", (state) =>
{
    var s = (State)state;
    return s.IsPremium ? s.FactoryPrice : s.RetailPrice;
});
```

### Step 5.3: Extract dependencies

```typescript
// Analyzes function body
// Finds: state.isPremium, state.factoryPrice, state.retailPrice
// Generates: dependencies = ['isPremium', 'factoryPrice', 'retailPrice']
```

---

## Success Criteria

- [ ] Client package builds successfully
- [ ] Server package builds successfully
- [ ] Functions return VALUES (not JSX)
- [ ] Dependencies tracked automatically
- [ ] Bindings re-evaluate when dependencies change
- [ ] DOM updates directly (no VDOM)
- [ ] Server evaluates functions with state
- [ ] Hydration picks up bindings correctly
- [ ] Performance: < 1ms per binding update
- [ ] Code is MINIMAL
- [ ] Babel transpiler integration works

---

## Performance Targets

- **Hydration:** < 5ms for 100 bindings
- **Binding update:** < 1ms per binding
- **Bundle size:** < 3KB gzipped
- **Memory:** < 100KB for 1000 bindings
- **DOM updates:** Direct (0ms VDOM overhead)

---

## Timeline Estimate

- **Phase 1 (Client-Side):** 3-4 hours
- **Phase 2 (Server-Side):** 2-3 hours
- **Phase 3 (Examples):** 1-2 hours
- **Phase 4 (Optimizations):** 2-3 hours
- **Phase 5 (Babel Integration):** 4-5 hours

**Total:** 12-17 hours

---

## Next Steps

1. ✅ Create MINIMAL implementation plan
2. Create package structure for minimact-dynamic
3. Implement dependency tracking
4. Implement value updater
5. Implement useDynamicState hook
6. Build server-side value compiler
7. Create MINIMAL examples
8. Test end-to-end
9. Optimize performance
10. Build Babel transpiler integration

---

**MINIMACT = MINIMAL REACT** 🌵

Structure ONCE. Bind SEPARATELY. Update DIRECTLY.

**NO duplication. NO complexity. JUST MINIMAL.** ✅
