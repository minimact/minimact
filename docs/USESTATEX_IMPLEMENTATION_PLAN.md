# useStateX Implementation Plan

**CSS for State Logic** - A declarative state projection system for Minimact

---

## 1. Vision & Philosophy

### The Core Insight

Just as CSS externalizes styling from HTML structure, **useStateX externalizes state-to-DOM bindings from JSX logic**.

| Concern | Traditional React | Minimact useStateX |
|---------|------------------|-------------------|
| Structure | JSX | HTML/Templates |
| Styling | Inline styles / CSS | CSS |
| State → DOM | Conditional JSX | Declarative State Manifest |

### What Makes This Revolutionary

**Traditional React:**
```tsx
function ProductCard() {
  const [price, setPrice] = useState(99);
  const user = useContext(UserContext);

  return (
    <div>
      {user.canSeePrice && (
        <div className="price">${price.toFixed(2)}</div>
      )}
      {user.isAdmin && (
        <div className="admin-price">Admin: ${price}</div>
      )}
    </div>
  );
}
```

**Problems:**
- State → DOM relationships buried in JSX
- Impossible to statically analyze
- Requires runtime execution to understand
- No way to predict which DOM nodes depend on which state

**useStateX Model:**
```tsx
function ProductCard() {
  const [price, setPrice] = useStateX(99, {
    targets: {
      '.price-display': {
        transform: v => `$${v.toFixed(2)}`,
        applyIf: ctx => ctx.user.canSeePrice
      },
      '.admin-price': {
        transform: v => `Admin: $${v}`,
        applyIf: ctx => ctx.user.isAdmin
      }
    }
  });

  return (
    <div>
      <div className="price-display"></div>
      <div className="admin-price"></div>
    </div>
  );
}
```

**Advantages:**
- ✅ **Target selectors are static** - analyzable at build time
- ✅ **Transforms are pure functions** - can be inlined/optimized
- ✅ **Conditions are declarative** - `applyIf` is inspectable
- ✅ **State-DOM dependency graph** - know exactly what depends on what
- ✅ **Template Patch System compatible** - works with parameterized patches
- ✅ **No hydration needed** - just surgical updates
- ✅ **Introspectable** - DevTools can show state → DOM mappings

---

## 2. Architecture Overview

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         useStateX Hook                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Wraps useState internally                                  │
│  2. Stores target configuration in component context           │
│  3. On state change:                                           │
│     a. Call underlying setState                                │
│     b. For each target:                                        │
│        - Evaluate applyIf(context)                             │
│        - If true: Apply transform(value)                       │
│        - Update target element via DOMPatcher                  │
│     c. Check HintQueue for template patches                    │
│     d. Sync to server (prevent stale data)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration with Existing Systems

**Builds on top of:**
- ✅ `useState` - Core state management
- ✅ `HintQueue` - Template patch matching
- ✅ `DOMPatcher` - Surgical DOM updates
- ✅ `SignalRManager` - Server synchronization
- ✅ `ComponentContext` - Hook execution context

**Adds new capabilities:**
- ✨ **Target-based projection** - Declarative state → DOM bindings
- ✨ **Conditional application** - `applyIf` for context-aware rendering
- ✨ **Transform functions** - Pure transformations of state values
- ✨ **Static analysis** - Build-time dependency graph extraction
- ✨ **Enhanced DevTools** - Introspectable state projections

---

## 3. API Design

### Core Hook Signature

```typescript
function useStateX<T>(
  initialValue: T,
  config: StateXConfig<T>
): [T, SetStateXFunction<T>]

interface StateXConfig<T> {
  /**
   * Target selectors and their projection rules
   * Keys are CSS selectors (relative to component root)
   */
  targets: Record<string, TargetProjection<T>>;

  /**
   * Optional: Global context provider for applyIf conditions
   * If not provided, uses component's context
   */
  context?: () => any;

  /**
   * Optional: Custom equality check for change detection
   * Default: Object.is
   */
  equals?: (prev: T, next: T) => boolean;

  /**
   * Optional: Sync strategy with server
   * Default: 'immediate'
   */
  sync?: 'immediate' | 'debounced' | 'manual';

  /**
   * Optional: Debounce delay in ms (if sync = 'debounced')
   * Default: 300
   */
  syncDelay?: number;
}

interface TargetProjection<T> {
  /**
   * Transform the state value before applying to DOM
   * Should be a pure function
   */
  transform: (value: T) => string | number | boolean;

  /**
   * Conditional application based on context
   * Return true to apply, false to skip
   */
  applyIf?: (context: any) => boolean;

  /**
   * Optional: How to apply the transformed value
   * Default: 'textContent'
   */
  applyAs?: 'textContent' | 'innerHTML' | 'attribute' | 'class' | 'style';

  /**
   * Optional: Attribute name (if applyAs = 'attribute')
   * Optional: Style property (if applyAs = 'style')
   * Optional: Class name to toggle (if applyAs = 'class')
   */
  property?: string;

  /**
   * Optional: Template patch hint for this target
   * Enables parameterized patch matching
   */
  template?: string;
}

type SetStateXFunction<T> = (newValue: T | ((prev: T) => T)) => void;
```

### Example Usage Patterns

#### 1. Basic Text Projection

```typescript
const [count, setCount] = useStateX(0, {
  targets: {
    '.counter-display': {
      transform: v => `Count: ${v}`,
      applyAs: 'textContent'
    }
  }
});

// HTML:
// <span class="counter-display"></span>
```

#### 2. Conditional Rendering

```typescript
const [price, setPrice] = useStateX(99.99, {
  targets: {
    '.price-public': {
      transform: v => `$${v.toFixed(2)}`,
      applyIf: ctx => !ctx.user.isPremium
    },
    '.price-premium': {
      transform: v => `Premium Price: $${(v * 0.9).toFixed(2)}`,
      applyIf: ctx => ctx.user.isPremium
    }
  }
});
```

#### 3. Class Toggle

```typescript
const [isActive, setIsActive] = useStateX(false, {
  targets: {
    '.menu-toggle': {
      transform: v => v,
      applyAs: 'class',
      property: 'active'  // Toggles 'active' class
    }
  }
});
```

#### 4. Style Projection

```typescript
const [progress, setProgress] = useStateX(0, {
  targets: {
    '.progress-bar': {
      transform: v => `${v}%`,
      applyAs: 'style',
      property: 'width'
    }
  }
});
```

#### 5. Multiple Targets with Complex Logic

```typescript
const [cart, setCart] = useStateX({ items: [], total: 0 }, {
  targets: {
    '.cart-count': {
      transform: v => v.items.length.toString(),
      applyAs: 'textContent'
    },
    '.cart-total': {
      transform: v => `$${v.total.toFixed(2)}`,
      applyAs: 'textContent',
      applyIf: ctx => v.total > 0
    },
    '.cart-empty-message': {
      transform: v => 'Your cart is empty',
      applyAs: 'textContent',
      applyIf: ctx => v.items.length === 0
    },
    '.checkout-button': {
      transform: v => v.items.length >= 3,
      applyAs: 'class',
      property: 'bulk-discount',
      applyIf: ctx => ctx.user.isLoggedIn
    }
  }
});
```

#### 6. Template Patch Integration

```typescript
const [todos, setTodos] = useStateX([], {
  targets: {
    '.todo-list': {
      transform: v => v,
      template: 'todo-list-{0}',  // Parameterized template
      applyAs: 'innerHTML'
    },
    '.todo-count': {
      transform: v => `${v.length} items`,
      applyAs: 'textContent'
    }
  }
});
```

---

## 4. Implementation Plan

### Phase 1: Core Hook Implementation (Week 1)

**Files to create:**
- `src/minimact-x/src/types.ts` - Type definitions
- `src/minimact-x/src/use-state-x.ts` - Core hook implementation
- `src/minimact-x/src/projection-engine.ts` - Target projection logic
- `src/minimact-x/src/index.ts` - Package exports

**Key features:**
1. Wrap existing `useState` hook
2. Store target configuration in component context
3. Implement basic `transform` and `applyIf` logic
4. Support `textContent` projection
5. Integrate with `DOMPatcher` for updates

**Success criteria:**
- ✅ Basic text projection works
- ✅ Conditional projection with `applyIf` works
- ✅ Integrates with existing `useState` state sync

### Phase 2: Advanced Projection Types (Week 1)

**Extend projection-engine.ts:**
1. `applyAs: 'innerHTML'` - HTML content projection
2. `applyAs: 'attribute'` - Attribute value projection
3. `applyAs: 'class'` - Class toggle projection
4. `applyAs: 'style'` - Inline style projection

**Add validation:**
- Ensure `property` is provided when required
- Warn about XSS risks with `innerHTML`
- Validate CSS selectors

**Success criteria:**
- ✅ All projection types work
- ✅ Proper error handling and warnings
- ✅ TypeScript types enforce correct usage

### Phase 3: Template Patch Integration (Week 2)

**Create:**
- `src/minimact-x/src/template-matcher.ts` - Template hint matching

**Features:**
1. Parse `template` property from config
2. Generate parameterized hints for HintQueue
3. Match state changes to template patches
4. Apply template patches with slot filling

**Integration:**
- Work with existing Template Patch System
- Support `{0}`, `{1}`, etc. slot syntax
- Handle conditional templates

**Success criteria:**
- ✅ Template patches matched correctly
- ✅ Slot filling works with transformed values
- ✅ Falls back to regular patches if no template match

### Phase 4: Context & Dependency Tracking (Week 2)

**Create:**
- `src/minimact-x/src/context-provider.ts` - Context management
- `src/minimact-x/src/dependency-graph.ts` - State → DOM mapping

**Features:**
1. Global context provider for `applyIf` conditions
2. Dependency graph extraction (which targets depend on which state)
3. Change detection optimization (only update affected targets)

**Build-time analysis:**
- Extract dependency graph metadata
- Enable static analysis in Babel plugin
- Generate TypeScript types for context

**Success criteria:**
- ✅ Context provider works
- ✅ Dependency graph is accurate
- ✅ Only affected targets are updated

### Phase 5: Server Synchronization (Week 2)

**Extend:**
- `use-state-x.ts` - Add sync strategies
- `projection-engine.ts` - Server-aware updates

**Features:**
1. `sync: 'immediate'` - Sync every state change (default)
2. `sync: 'debounced'` - Batch multiple changes
3. `sync: 'manual'` - Explicit sync control

**Server integration:**
- Use existing `SignalRManager.updateComponentState()`
- Send full state + target configuration
- Server can pre-compute patches for next render

**Success criteria:**
- ✅ All sync strategies work
- ✅ Server state stays in sync
- ✅ No stale data issues

### Phase 6: DevTools & Introspection (Week 3)

**Create:**
- `src/minimact-x/src/devtools-bridge.ts` - DevTools integration
- `src/minimact-x/src/inspector.ts` - State projection inspector

**Features:**
1. Show state → target mappings in DevTools
2. Display transform results
3. Highlight affected DOM nodes
4. Show `applyIf` evaluation results
5. Timeline of state projections

**Minimact Swig integration:**
- Real-time projection inspector panel
- Dependency graph visualization
- State projection history

**Success criteria:**
- ✅ DevTools shows all projections
- ✅ Inspector is interactive
- ✅ Helps debug projection issues

### Phase 7: Babel Plugin Integration (Week 3)

**Create:**
- `packages/babel-plugin-minimact/src/analyze-statex.ts` - Static analysis

**Features:**
1. Detect `useStateX` calls in code
2. Extract target selectors
3. Extract transform functions (if pure)
4. Extract `applyIf` conditions (if static)
5. Generate `[StateProjection]` attributes for C#

**Output:**
```csharp
[StateProjection("price", ".price-display", "v => `$${v.toFixed(2)}`", "ctx => ctx.user.canSeePrice")]
public class ProductCard : MinimactComponent
{
    // ...
}
```

**Success criteria:**
- ✅ Babel plugin extracts projections
- ✅ C# attributes generated correctly
- ✅ Server can pre-compute patches

### Phase 8: MES Certification & Documentation (Week 3)

**Files to create:**
- `src/minimact-x/README.md` - User documentation
- `src/minimact-x/INTEGRATION.md` - Integration guide
- `docs/STATEX_DEVTOOLS.md` - DevTools guide
- `docs/STATEX_EXAMPLES.md` - Cookbook examples

**MES requirements:**
- ✅ Bronze: Basic integration, TypeScript types, cleanup
- ✅ Silver: HintQueue integration, PlaygroundBridge, error handling
- ✅ Gold: Template Patch support, Babel plugin, DevTools integration

**Success criteria:**
- ✅ Achieves MES Gold certification
- ✅ Comprehensive documentation
- ✅ Example projects

---

## 5. Technical Architecture

### File Structure

```
src/minimact-x/
├── src/
│   ├── types.ts                    # TypeScript type definitions
│   ├── use-state-x.ts              # Main hook implementation
│   ├── projection-engine.ts        # Target projection logic
│   ├── template-matcher.ts         # Template patch integration
│   ├── context-provider.ts         # Context management
│   ├── dependency-graph.ts         # State → DOM mapping
│   ├── devtools-bridge.ts          # DevTools integration
│   ├── inspector.ts                # Projection inspector
│   ├── sync-strategies.ts          # Server sync logic
│   └── index.ts                    # Package exports
├── tests/
│   ├── use-state-x.test.ts
│   ├── projection-engine.test.ts
│   └── template-matcher.test.ts
├── examples/
│   ├── basic-projection.html
│   ├── conditional-rendering.html
│   ├── template-patches.html
│   └── complex-cart.html
├── package.json
├── tsconfig.json
├── rollup.config.js
├── README.md
└── INTEGRATION.md
```

### Data Flow

```
User Action (click, input, etc.)
    ↓
setStateX(newValue)
    ↓
┌─────────────────────────────────────────┐
│ 1. Call underlying setState            │ ← Wraps useState
│ 2. Update local state                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. For each target:                    │
│    a. Evaluate applyIf(context)        │ ← Conditional logic
│    b. If true:                         │
│       - Apply transform(value)         │ ← Pure transformation
│       - Query target element           │
│       - Apply via DOMPatcher           │ ← Surgical update
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. Check HintQueue for template match  │ ← Template Patch System
│    - If match: Apply parameterized     │
│    - If no match: Generate patches     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. Sync to server                      │ ← Prevent stale data
│    - SignalRManager.updateState()      │
│    - Send state + target config        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 6. Notify DevTools                     │ ← Introspection
│    - State change event                │
│    - Projection results                │
│    - Affected targets                  │
└─────────────────────────────────────────┘
```

### Component Context Extension

```typescript
interface ComponentContext {
  // ... existing fields ...

  /**
   * useStateX projections for this component
   * Maps state keys to their target configurations
   */
  stateProjections?: Map<string, StateXProjection>;

  /**
   * Dependency graph for state → DOM relationships
   * Enables static analysis and optimization
   */
  dependencyGraph?: StateXDependencyGraph;

  /**
   * Custom context provider for applyIf conditions
   * Falls back to component props/context
   */
  projectionContext?: any;
}

interface StateXProjection {
  stateKey: string;
  config: StateXConfig<any>;
  currentValue: any;
  lastUpdated: number;
  affectedTargets: string[];
}

interface StateXDependencyGraph {
  // State key → Target selectors
  stateToDom: Map<string, Set<string>>;

  // Target selector → State keys
  domToState: Map<string, Set<string>>;

  // Full dependency metadata for DevTools
  metadata: DependencyMetadata[];
}
```

---

## 6. Integration Points

### With Template Patch System

**useStateX** enhances the Template Patch System by providing:

1. **Declarative slot definitions** - Targets define which slots map to which state
2. **Transform functions** - Server can pre-apply transforms in templates
3. **Conditional templates** - `applyIf` maps to template branches

**Example:**

```typescript
// Client
const [todo, setTodo] = useStateX({ done: false, text: 'Buy milk' }, {
  targets: {
    '.todo-status': {
      transform: v => v.done ? '✓' : '○',
      template: 'todo-status-{0}',  // Maps to template slot {0}
    }
  }
});

// Server (generated by Babel)
[LoopTemplate("todo-status-{0}", ConditionalSlots = new[] {
  new ConditionalSlot(0, "item.done", TrueValue = "✓", FalseValue = "○")
})]
```

### With Minimact Swig

**Swig can provide:**
1. **Visual projection editor** - Drag-and-drop target mapping
2. **Live projection preview** - See transforms in real-time
3. **Dependency graph visualization** - Interactive state → DOM graph
4. **Transform debugger** - Step through transform functions
5. **Context inspector** - View `applyIf` conditions and their values

### With Existing Hooks

**useStateX builds on:**
- `useState` - Core state storage and sync
- `useEffect` - Cleanup and lifecycle
- `useRef` - DOM element references

**Can be combined with:**
- `useDomElementState` - DOM → State (minimact-punch)
- `useStateX` - State → DOM (this package)
- Together: **Bidirectional reactive data flow**

---

## 7. Advanced Features

### 1. Render-Time Skipping

Since `applyIf` is declarative, we can skip entire DOM subtrees:

```typescript
const [user, setUser] = useStateX({ role: 'guest' }, {
  targets: {
    '.admin-panel': {
      transform: v => '',
      applyIf: ctx => v.role === 'admin',
      skipIfFalse: true  // Don't even traverse this subtree
    }
  }
});
```

**Result:** Zero-cost abstraction for conditional rendering.

### 2. Selective Projection Caching

Cache different transformed views per user type:

```typescript
const [avatar, setAvatar] = useStateX('/default.png', {
  targets: {
    '.avatar-display': {
      transform: v => `<img src="${v}" />`,
      applyAs: 'innerHTML',
      cacheKey: ctx => ctx.user.role  // Cache per role
    }
  }
});
```

**Result:** Pre-computed projections for common user types.

### 3. Signal-Style Reactivity

Because projections are declarative, we can build a signal graph:

```typescript
const [a, setA] = useStateX(1, { /* ... */ });
const [b, setB] = useStateX(2, { /* ... */ });
const [c, setC] = useStateX(3, {
  targets: {
    '.result': {
      // Derived state!
      transform: v => `Result: ${a + b + v}`,
      dependencies: ['state_0', 'state_1']  // Track dependencies
    }
  }
});
```

**Result:** Automatic dependency tracking like Solid.js signals.

### 4. Temporal Projections

Combine with `StateHistoryTracker` from minimact-punch:

```typescript
const [price, setPrice] = useStateX(99, {
  targets: {
    '.price-trend': {
      transform: v => {
        const history = getStateHistory('price');
        const trend = history.length > 1 && v > history[0] ? '↑' : '↓';
        return `${v} ${trend}`;
      }
    }
  },
  trackHistory: true
});
```

**Result:** State projections that are time-aware.

---

## 8. Performance Considerations

### Optimization Strategies

1. **Lazy target resolution** - Only query DOM when needed
2. **Batch updates** - Group multiple state changes
3. **Memoized transforms** - Cache transform results
4. **Skip unchanged targets** - Use `equals` for change detection
5. **Web Workers** - Offload complex transforms (like minimact-punch confidence worker)

### Benchmarks

Target performance (compared to React re-render):

| Metric | React | useStateX | Improvement |
|--------|-------|-----------|-------------|
| State change to DOM update | ~16ms | ~1ms | 16x faster |
| Template patch application | ~8ms | ~0.5ms | 16x faster |
| Memory per component | ~10KB | ~2KB | 5x smaller |

---

## 9. Migration Path

### From useState

**Before:**
```typescript
const [count, setCount] = useState(0);

// JSX
<div>{count}</div>
```

**After:**
```typescript
const [count, setCount] = useStateX(0, {
  targets: {
    '.count': { transform: v => v.toString() }
  }
});

// HTML
<div class="count"></div>
```

### From React Context

**Before:**
```typescript
const user = useContext(UserContext);

// JSX
{user.isAdmin && <div>Admin Panel</div>}
```

**After:**
```typescript
const [adminPanel, setAdminPanel] = useStateX(true, {
  targets: {
    '.admin-panel': {
      transform: v => 'Admin Panel',
      applyIf: ctx => ctx.user.isAdmin
    }
  }
});

// HTML
<div class="admin-panel"></div>
```

---

## 10. Success Metrics

### Technical Metrics

- ✅ 100% type safety with TypeScript
- ✅ MES Gold certification
- ✅ <1ms average projection latency
- ✅ 90%+ template patch hit rate
- ✅ Zero memory leaks
- ✅ 95%+ test coverage

### Developer Experience Metrics

- ✅ 50% less code vs traditional React
- ✅ Static analysis catches 80%+ bugs
- ✅ DevTools provide instant insights
- ✅ 5min time-to-first-projection
- ✅ Comprehensive documentation

### Ecosystem Metrics

- ✅ Babel plugin integration
- ✅ Minimact Swig integration
- ✅ Example projects
- ✅ Community adoption
- ✅ Production-ready

---

## 11. Risk Mitigation

### Potential Issues

1. **XSS with innerHTML** - Validate/sanitize transforms
2. **Performance with many targets** - Batch updates, lazy resolution
3. **Context synchronization** - Ensure context is always fresh
4. **Server state drift** - Robust sync strategies
5. **Template patch mismatches** - Fallback to regular patches

### Solutions

- ✅ Built-in XSS warnings and sanitization
- ✅ Performance monitoring and optimization
- ✅ Context provider ensures consistency
- ✅ Multiple sync strategies (immediate/debounced/manual)
- ✅ Graceful degradation when templates fail

---

## 12. Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Core Implementation | useStateX hook, basic projections, text/HTML/attribute/class/style support |
| 2 | Template Integration | Template patch matching, context provider, dependency graph, server sync |
| 3 | DevTools & Polish | Inspector, Babel plugin, MES Gold certification, documentation |

**Total:** 3 weeks to production-ready

---

## Conclusion

**useStateX** is not just a state management library—it's a **paradigm shift** in how we think about UI architecture.

By making state projections **declarative, analyzable, and compiler-optimized**, we unlock:

- 🚀 **Predictive rendering** - Templates + projections = instant updates
- 🔍 **Static analysis** - Know state → DOM relationships at build time
- 🛠️ **Superior DevTools** - Introspectable, debuggable, visual
- ⚡ **Performance** - Zero hydration, no re-renders, surgical updates
- 💛 **Empathetic** - The framework anticipates user intent

This is **Predictive Declarative UI Architecture**—the future of web frameworks.
