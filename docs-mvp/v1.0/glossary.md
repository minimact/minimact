# Glossary

A comprehensive guide to Minimact terminology, concepts, and the vocabulary of the Posthydrationist movement.

---

## Community

### Minimalist
**noun** | /ˈmɪnɪməlɪst/

A developer who uses Minimact. More than just a user label - it's an identity that represents a commitment to building reactive UIs with minimal code, minimal JavaScript, and maximum control.

> "I'm a Minimalist" means: I don't need 45KB of JavaScript to build reactive UIs. I don't need hydration waterfalls. I build with intention, not bloat.

**Usage:**
- "Hey Minimalists! Check out the new Quantum Stack extensions."
- "As a Minimalist, I ship features 3x faster than with traditional frameworks."
- "The Minimalist community values performance over bundle size."

### Posthydrationist
**noun** | /poʊst-haɪˈdreɪʃənɪst/

A developer who embraces the Posthydrationist philosophy: rejecting client-side hydration in favor of server-first architecture with predictive rendering. All Minimalists are Posthydrationists, but the term encompasses the broader movement beyond just Minimact.

**See also:** [Posthydrationist Manifesto](/v1.0/architecture/posthydrationist-manifesto)

---

## Core Concepts

### Hydration
**noun** | /haɪˈdreɪʃən/

**Traditional definition:** The process of attaching JavaScript event handlers to server-rendered HTML, making it interactive.

**Minimact perspective:** An unnecessary tax that duplicates logic, delays interactivity (150-300ms), and bloats bundles. Minimact eliminates hydration entirely.

**Example:**
```
Traditional: Server renders HTML → Client downloads React → Hydrate (150-300ms) → Interactive
Minimact:    Server renders HTML → Client applies patches (2-3ms) → Interactive ✨
```

### Predictive Rendering
**noun** | /prɪˈdɪktɪv ˈrɛndərɪŋ/

Minimact's revolutionary approach where a Rust engine predicts likely UI state changes and pre-computes DOM patches before the user even triggers them. When the predicted state occurs, patches are applied instantly from the HintQueue (0-1ms).

**How it works:**
1. Rust observes patterns: "When count = 9, it often becomes 10 next"
2. Pre-computes patches for count = 10
3. Sends patches to client's HintQueue
4. User clicks increment → 🟢 **CACHE HIT!** Apply in 0-1ms

**Performance:** 99% faster than traditional reactive updates.

### Patch
**noun** | /pætʃ/

A minimal DOM operation sent from the server to the client. Instead of sending full HTML or reconciling a Virtual DOM, Minimact sends surgical patches like "set attribute X to Y" or "append child Z".

**Types:**
- `setAttribute` - Change an attribute
- `removeAttribute` - Remove an attribute
- `appendChild` - Add a child node
- `removeChild` - Remove a child node
- `replaceChild` - Replace a child node
- `setTextContent` - Update text content

**Example:**
```typescript
// User clicks button, server sends:
{
  type: 'setAttribute',
  selector: '#counter',
  attribute: 'data-count',
  value: '10'
}
```

### HintQueue
**noun** | /hɪnt kjuː/

Client-side cache that stores pre-computed patches from the Rust predictor. When state changes, the client checks the HintQueue first before making a network request. Cache hits result in 0-1ms updates with zero network latency.

**Cache hit rate:** Typically 80-95% in production applications.

---

## Architecture

### VNode
**noun** | /ˈviː noʊd/ (Virtual Node)

Minimact's lightweight representation of a DOM element on the server. Unlike React's Virtual DOM (which exists on both client and server), Minimact's VNodes only exist on the server and are used to compute patches.

**Example:**
```csharp
new VNode("div", new { className = "card" },
    new VNode("h2", "Title"),
    new VNode("p", "Content")
)
```

### SignalR
**noun** | /ˈsɪɡnəl ɑːr/

Microsoft's real-time communication library used by Minimact for bidirectional state sync between client and server. Maintains a persistent WebSocket connection.

**Usage in Minimact:**
- Client → Server: State changes, events, hook results
- Server → Client: Patches, predicted patches, component updates

### Bundle
**noun** | /ˈbʌndəl/

A behavioral anchor in minimact-bundle that applies attributes, classes, or styles to arbitrary DOM elements matching a CSS selector - without wrapper divs.

**Example:**
```typescript
registerBundle("hero", ".hero h1, .hero p, button");
useBundle("hero", { class: "fade-in" });
```

**Revolutionary concept:** Behavior decoupled from structure.

---

## Quantum Stack Extensions

### minimact-punch 🥊
**DOM as Reactive Data Source**

Extension that provides `useDomElementState()` - transforming the DOM into a comprehensive reactive state system with 80+ queryable properties (intersection, mutations, size, pseudo-states, theme, performance metrics).

**Philosophy:** The DOM is not just output - it's input.

### minimact-query 🗃️
**SQL for the DOM**

Extension that brings full SQL syntax to DOM querying: SELECT, WHERE, JOIN, GROUP BY, HAVING, ORDER BY, aggregate functions, and set operations.

**Philosophy:** The DOM is a queryable relational database.

### minimact-quantum 🌌
**Quantum DOM Entanglement**

Extension that enables identity sync across clients through mutation vectors. Not data sync - **IDENTITY sync**. The same element exists in multiple locations simultaneously.

**Philosophy:** The DOM is a distributed shared reality.

### minimact-bundle 🎯
**Declarative DOM Selector Primitives**

Extension that provides `registerBundle()` and `useBundle()` for applying behavior to arbitrary DOM elements without wrapper divs.

**Philosophy:** The DOM is a declarative puppet.

### minimact-spatial 📐
**Spatial Computing for the Web**

Extension that treats the viewport as a 2D queryable database. Query spatial regions with properties like coverage, element density, and intersection ratios.

**Philosophy:** The DOM is a 2D spatial database.

### minimact-trees 🌳
**Universal Decision Trees**

Extension that provides declarative state machines with automatic key parsing. XState but minimal and predictive.

**Philosophy:** The DOM is a state machine runtime.

---

## Performance Terms

### Cache Hit
**noun** | /kæʃ hɪt/

When a predicted patch exists in the HintQueue and can be applied immediately (0-1ms) without a server round-trip.

**Example:** User increments counter from 9 to 10 → Rust predicted this → 🟢 CACHE HIT!

### Cache Miss
**noun** | /kæʃ mɪs/

When a state change wasn't predicted and requires a server round-trip to compute patches (5-15ms).

**Still fast:** Even cache misses are 10x faster than traditional hydration.

### Time to Interactive (TTI)
**noun** | /taɪm tuː ɪntərˈæktɪv/

How long before users can interact with the page.

**Comparison:**
- React SSR: 150-300ms (hydration)
- Minimact: 2-3ms (no hydration)

### Bundle Size
**noun** | /ˈbʌndəl saɪz/

Amount of JavaScript sent to the client.

**Comparison:**
- React 18: 45KB gzipped
- Vue 3: 34KB gzipped
- **Minimact: 12.01KB gzipped** (70% smaller)

---

## Component Patterns

### MinimactComponent
**class** | /ˈmɪnɪmækt kəmˈpoʊnənt/

Base class for server-side Minimact components written in C#. Created by transpiling JSX/TSX or written directly.

**Example:**
```csharp
public class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        return new VNode("div", "Hello Minimalists!");
    }
}
```

### State Sync
**noun** | /steɪt sɪŋk/

The process of synchronizing state between client and server via SignalR. Client-side hooks (like `useDomElementState()`) automatically sync their results to the server, where components read them during rendering.

**Flow:**
```
Client: useDomElementState() evaluates → Result
    ↓ SignalR
Server: State["domElementState_0"] = result
    ↓ Re-render
Server: Compute patches based on new state
    ↓ SignalR
Client: Apply patches
```

### Hook Index
**noun** | /hʊk ˈɪndɛks/

Zero-based index used to track multiple instances of the same hook in a component. First `useDomElementState()` → `domElementState_0`, second → `domElementState_1`, etc.

**Why needed:** Multiple hook calls must maintain stable identities across renders.

---

## Philosophy Terms

### Posthydrationism
**noun** | /poʊst-haɪˈdreɪʃənɪzm/

The architectural philosophy that rejects client-side hydration in favor of server-first rendering with predictive patches. Core principles:

1. **Server-first, always** - Logic lives on the server
2. **Patches over reconciliation** - Direct DOM updates
3. **Prediction over reaction** - Pre-compute likely states
4. **Bundles over wrappers** - Behavior without structure pollution
5. **Minimal over maximal** - 13KB does what 45KB used to
6. **State sync over hydration** - Real-time updates, zero bootup cost

**See:** [Posthydrationist Manifesto](/v1.0/architecture/posthydrationist-manifesto)

### Minimal Code, Maximum Control
**phrase** | /ˈmɪnɪməl koʊd ˈmæksɪməm kənˈtroʊl/

The Minimact motto. Achieve more with less: less JavaScript, less complexity, less latency - but more power, more performance, more developer joy.

### DOM Domination
**phrase** | /dɑːm dɑːmɪˈneɪʃən/

The Minimact approach to the DOM: not just rendering to it, but making it a first-class reactive data source, spatial database, and distributed system.

### Structure ≠ Behavior
**principle** | /ˈstrʌktʃər ɪkwəlz bɪˈheɪvjər/

Core Minimact insight: HTML structure (elements, hierarchy) should be decoupled from behavior (styling, interactivity, state). Achieved through bundles and declarative primitives.

---

## Abbreviations

| Term | Full Name | Description |
|------|-----------|-------------|
| **TTI** | Time to Interactive | How long before page is interactive |
| **SSR** | Server-Side Rendering | Rendering HTML on the server |
| **VDOM** | Virtual DOM | In-memory representation of DOM (Minimact doesn't use this on client) |
| **HQ** | HintQueue | Client-side cache for predicted patches |
| **MES** | Minimact Extension Standards | Certification system for extensions |
| **JSX** | JavaScript XML | Declarative syntax for UI components |
| **TSX** | TypeScript XML | TypeScript version of JSX |

---

## Common Phrases

### "Never hydrate. Always Minimact."
**The official Minimalist slogan.** The battle cry of the Posthydrationist movement.

- **NEVER HYDRATE** - Reject client-side hydration entirely
- **ALWAYS MINIMACT** - Choose server-first architecture with predictive rendering

Used at conferences, on banners, in team spaces, and wherever Minimalists gather. This isn't just a tagline - it's a declaration of architectural intent.

### "Never hydrate"
The core Minimact principle: eliminate hydration entirely by using patches and predictive rendering.

### "The DOM is no longer a view layer"
Philosophical statement: The Quantum Stack transforms the DOM into a queryable, reactive, distributed database.

### "Patches over reconciliation"
Technical principle: Send surgical DOM updates instead of reconciling Virtual DOMs.

### "Server-first architecture"
Architectural pattern: Logic lives on the server, client is a thin patch applier.

### "0-1ms on cache hit"
Performance claim: Predicted state changes apply instantly from HintQueue.

### "13KB runtime"
Bundle size: Minimact client runtime is 70% smaller than React.

### "Opening a portal" 🌌
What minimact-quantum does: Creates quantum entanglement between DOM elements across physical space.

### "The viewport is a 2D database"
What minimact-spatial enables: Querying spatial regions as reactive data sources.

---

## Anti-Patterns (What Minimalists Avoid)

### Wrapper Div Hell
**anti-pattern**

Wrapping elements in unnecessary divs just to apply styles or behavior. Minimalists use bundles instead.

```typescript
// ❌ Wrapper hell
<div className="fade-in">
  <h1>Title</h1>
</div>

// ✅ Minimalist approach
registerBundle("hero", "h1");
useBundle("hero", { class: "fade-in" });
<h1>Title</h1>
```

### Client-Side State Duplication
**anti-pattern**

Maintaining the same state on both client and server. Minimalists use state sync - server is the source of truth.

### Hydration Waterfalls
**anti-pattern**

Loading JavaScript → Parsing → Executing → Hydrating → Finally interactive (150-300ms).

Minimalists skip this entirely: Patches → Interactive (2-3ms).

### Bundle Bloat
**anti-pattern**

Shipping 45KB+ of JavaScript for basic interactivity. Minimalists ship 13KB total.

---

## Historical Context

### Pre-Minimact Era
Before 2025, developers had to choose:
- **SSR frameworks** (slow interactivity)
- **SPA frameworks** (slow initial load)
- **"Islands architecture"** (complexity)

### Post-Minimact Era
After 2025, Minimalists have both:
- ✅ Instant initial render (SSR)
- ✅ Instant interactivity (patches + prediction)
- ✅ Minimal complexity (13KB runtime)

---

## Resources

- [Key Insights](/v1.0/architecture/key-insights) - Why Minimact exists
- [Posthydrationist Manifesto](/v1.0/architecture/posthydrationist-manifesto) - The movement
- [Getting Started](/v1.0/guide/getting-started) - Build your first app
- [Quantum Stack](/v1.0/extensions/) - All 6 extensions
- [API Reference](/v1.0/api/hooks) - Complete API docs

---

## Contributing to the Glossary

Found a term that should be added? Open an issue or PR on GitHub with:
- **Term** - The word or phrase
- **Definition** - Clear, concise explanation
- **Example** - Code or usage example
- **Related terms** - Cross-references

---

**Welcome to the Minimalist community!** 🌵✨
