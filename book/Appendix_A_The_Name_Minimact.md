# Appendix A: The Name "Minimact"

## Minimal Anticipatory Client Technology

When I first started building this framework, I called it "Project Dehydrate" (because it removed the hydration step). Then "ServerReact" (too obvious). Then "HexTree" (after the hex paths). None of them felt right.

The breakthrough came when I realized what the framework actually *is*:

**Minimact = Minimal Anticipatory Client Technology**

Let's break down each word, because the name encodes the entire philosophy.

---

## Minimal

**Definition:** The smallest possible client footprint.

**What it means in Minimact:**
- Client bundle: **~20KB** (vs React's 140KB)
- No JSX evaluation engine (server-only)
- No virtual DOM diffing algorithm (server-only)
- No reconciliation logic (server-only)
- No hydration system (doesn't exist)

**The client does exactly three things:**
1. Apply DOM patches (DOMPatcher)
2. Listen for events (SignalR)
3. Match predictions (HintQueue)

That's it. Everything else happens on the server.

**Why "Minimal"?**

React ships:
```
react.production.min.js:       6.4 KB
react-dom.production.min.js:   130.2 KB
Your app bundle:               Variable (50-500 KB typical)
──────────────────────────────────────────
Total:                         ~200 KB minimum
```

Minimact ships:
```
minimact-client.min.js:        ~20 KB
Your app bundle:               0 KB (server-only)
──────────────────────────────────────────
Total:                         ~20 KB total
```

**The philosophy:**
> If the client doesn't need it, don't ship it.

React ships the reconciler because the client needs to re-render. Minimact doesn't ship the reconciler because **the client never re-renders**.

---

## Anticipatory

**Definition:** Predicting what the user will do next and pre-computing the response.

**What it means in Minimact:**
- Server predicts state changes (e.g., "user will click increment")
- Server pre-computes patches for those predictions
- Server caches patches client-side (HintQueue)
- When user acts, client applies cached patches **instantly** (0.1-5ms)

**Example:**

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Traditional React flow:**
```
User clicks → JS executes → setState() → React re-renders →
Reconciliation → DOM update

Time: 10-50ms
```

**Minimact's anticipatory flow:**
```
On first render, server predicts:
"If count becomes 1, patch will be: UpdateText(path: [0, 0], text: 'Count: 1')"

Sends prediction to client → Client caches it

User clicks → Client checks cache → Found prediction! →
Apply patch immediately

Time: 0.1-5ms (no server round-trip needed!)
```

**The breakthrough:**

Most state changes are **highly predictable**:
- Button clicks (increment, decrement, toggle)
- Form inputs (text change, checkbox toggle)
- Tab switches (activeTab = 0 → 1 → 2)
- Pagination (page 1 → 2 → 3)

Why make the server recompute the same patches every time? **Pre-compute them once, cache them client-side, reuse them instantly.**

**The Template System:**

Minimact's anticipatory nature comes from the **template patch system**:

```tsx
<span>Count: {count}</span>
```

Becomes a **template**:
```json
{
  "template": "Count: {0}",
  "bindings": ["count"],
  "path": "10000000.20000000.10000000"
}
```

Now the client can render **any** count value instantly:
- `count = 0` → "Count: 0"
- `count = 42` → "Count: 42"
- `count = 9999` → "Count: 9999"

**No server round-trip. No re-rendering. Just template slot-filling.**

**Why "Anticipatory"?**

Because the framework **anticipates** user actions and **prepares** responses in advance. It's not reactive (responding to changes after they happen). It's **anticipatory** (preparing for changes before they happen).

---

## Client

**Definition:** The browser-side runtime that displays the UI.

**What it means in Minimact:**

The client is **deliberately dumb**. It doesn't understand:
- JSX syntax (`{condition && <Component />}`)
- React expressions (`{items.map(x => <li>{x}</li>)}`)
- Component logic (hooks, lifecycle, state management)
- Business rules (validation, authorization, data fetching)

**The client only understands:**
- DOM operations (createElement, setAttribute, textContent)
- Patch instructions (UpdateText, UpdateProp, Remove, Create)
- Path navigation (traverse childNodes by index)
- Template rendering (fill slots with values)

**This is intentional.**

By keeping the client dumb, we:
1. Reduce bundle size (no reconciler, no JSX evaluator)
2. Eliminate hydration (client doesn't need component code)
3. Centralize logic (server is source of truth)
4. Improve security (business logic never exposed)

**The "Dehydrationist" Philosophy:**

Traditional SSR frameworks:
```
Server: Render to HTML
Client: Download React → Re-render (hydrate) → Attach handlers
```

**Why hydrate?** Because the client needs to understand the component tree to handle updates.

Minimact:
```
Server: Render to HTML + Send patches
Client: Apply patches directly (no re-rendering needed)
```

**No hydration** because the client doesn't need to understand components. It just needs to apply patches.

**Why "Client"?**

To emphasize that this is a **client-server architecture**, not a purely client-side framework. The "Minimal Anticipatory Client" is the browser runtime. The server is the rendering engine.

React blurs this line (components run everywhere). Minimact sharpens it (components run on server, client displays results).

---

## Technology

**Definition:** The complete system (not just a library).

**What it means in Minimact:**

Minimact isn't just a JavaScript library. It's a **complete technology stack**:

**1. Babel Plugin (Build-Time)**
- Transpiles TSX → C#
- Generates hex paths for stable element addressing
- Extracts templates for anticipatory rendering
- Detects structural changes for hot reload

**2. C# Runtime (Server-Side)**
- Component model (classes with hooks)
- VNode tree generation
- State management
- Event handling via SignalR

**3. Rust Reconciler (Server-Side)**
- VNode diffing (0.9ms)
- Patch generation
- Path-based HashMap reconciliation (O(1))
- Validation (DoS prevention)

**4. TypeScript Client (Browser)**
- DOMPatcher (applies patches)
- SignalRManager (WebSocket communication)
- HintQueue (caches predictions)
- TemplateRenderer (slot filling)

**5. Hot Reload System (Development)**
- Template hot reload (0.1-5ms)
- Structural hot reload (15-40ms)
- FileSystemWatcher with debouncing
- State preservation across reloads

**6. Minimact Swig (IDE)**
- Electron-based development environment
- Monaco editor with TypeScript support
- Component inspector (live state viewing)
- Performance metrics dashboard

**It's not a library you `npm install`. It's a complete development platform.**

**Why "Technology"?**

Because "framework" undersells it. React is a framework. Minimact is an entire technology stack that includes:
- Compiler (Babel plugin)
- Runtime (C# + Rust)
- Client (TypeScript)
- Development tools (Swig IDE)
- Hot reload system
- Extension ecosystem (MES standards)

---

## Putting It All Together

**Minimal Anticipatory Client Technology**

A complete technology stack where:

1. **Minimal** - The client does the bare minimum (apply patches)
2. **Anticipatory** - The server predicts changes and pre-computes responses
3. **Client** - Browser runtime that displays UI (but doesn't render components)
4. **Technology** - Complete system from build tools to IDE

**The acronym works because it's pronounceable: "Minimact" (min-ih-makt)**

And it's memorable because it suggests:
- "Minimal" (small, efficient)
- "Act" (takes action, does work)
- "Compact" (contained, tight)

---

## Alternative Interpretations

The name also works as a play on words:

**"Minimal" + "React"**
- Minimact is React, but minimal
- React's philosophy, without React's bloat

**"Mini" + "Impact"**
- Small bundle, big performance impact
- Tiny client, massive speed improvements

**"Minimum" + "Interaction"**
- Minimum client-server round-trips
- Minimum JavaScript shipped
- Minimum hydration (zero)

All of these interpretations are valid. The name encodes multiple meanings, which makes it richer.

---

## The Philosophy in One Sentence

**Minimact: Ship the minimum client code necessary to display UI, anticipate user actions to pre-compute patches, and let the server handle all rendering logic.**

---

## Why Not Other Names?

**Why not "ServerReact"?**
- Too obvious
- Doesn't convey the anticipatory nature
- Sounds like a React fork (it's not)

**Why not "Dehydrate"?**
- Clever, but too abstract
- Doesn't explain what it does
- Sounds like a data serialization library

**Why not "FastReact"?**
- Overpromises ("fast" is subjective)
- Doesn't convey the architecture
- Sounds like a marketing gimmick

**Why not "HexTree"?**
- Too focused on one implementation detail
- Doesn't convey the anticipatory nature
- Not intuitive for newcomers

**Minimact works because:**
- ✅ It's pronounceable (min-ih-makt)
- ✅ It's memorable (sounds like "mini compact")
- ✅ It encodes the philosophy (minimal, anticipatory, client, technology)
- ✅ It's unique (no naming conflicts)
- ✅ It suggests React without copying it

---

## The Design Principles Encoded in the Name

When you see "Minimact," you should immediately think:

**Minimal:**
- Small bundles
- Focused responsibilities
- No unnecessary complexity
- Ship only what's needed

**Anticipatory:**
- Predict user actions
- Pre-compute responses
- Cache predictions client-side
- Instant feedback

**Client:**
- Browser-side display layer
- Dumb renderer (by design)
- No component logic
- Patch applicator

**Technology:**
- Complete stack
- Build tools → Runtime → IDE
- Not just a library
- Entire development platform

---

## The Evolution of the Name

**Version 1: Project Dehydrate**
- Too clever, confusing
- "Dehydrate" sounds negative

**Version 2: ServerReact**
- Too generic
- Sounds like a React plugin

**Version 3: HexTree**
- Too technical
- Only describes one feature

**Version 4: Minimact** ✅
- Pronounceable
- Memorable
- Encodes philosophy
- Unique

**The final name was worth the search.**

---

## How to Explain Minimact to Others

**Elevator pitch:**
> "Minimact is a server-side React architecture that ships 7x less JavaScript, hot reloads 666x faster, and achieves 100% prediction accuracy by anticipating user actions and pre-computing patches."

**One sentence:**
> "Minimal Anticipatory Client Technology—a framework where the server renders, the client displays, and predictions eliminate latency."

**Tweet (280 characters):**
> "Minimact: React's DX, 20KB bundle, 0.1ms hot reload. Minimal client (no hydration), anticipatory patches (pre-computed), complete technology (Babel→Rust→C#). The server renders, the client displays. 666x faster."

---

## The Name as Documentation

Good names are self-documenting. When you hear "Minimact," you should be able to infer:
- **Minimal** → Small, focused, efficient
- **Anticipatory** → Predictive, cached, instant
- **Client** → Browser runtime, display layer
- **Technology** → Complete stack, not just a library

**The name teaches the architecture.**

---

## Conclusion

**Minimact** isn't just a name—it's a philosophy encoded in four words:

- Keep the client **minimal**
- Make the system **anticipatory**
- Respect the **client-server** boundary
- Build complete **technology**, not just libraries

When you build with Minimact, you're not just using a framework. You're adopting a philosophy: **ship less, predict more, let the server work.**

That's what **Minimal Anticipatory Client Technology** means.

---

*Return to: [Table of Contents](#)*
