# Chapter 2: VNode Trees - Simpler Than You Think

## The Virtual DOM Misconception

If you've used React, you've heard of the "Virtual DOM." It sounds complicated. Almost magical. A shadow representation of the real DOM, maintained in memory, diffed with incredible speed, patched with surgical precision.

React's documentation makes it sound essential: "The virtual DOM is a programming concept where an ideal, or 'virtual', representation of a UI is kept in memory and synced with the 'real' DOM by a library such as ReactDOM."

Here's what they don't tell you: **the virtual DOM is just a JavaScript object.**

That's it. No magic. No special algorithms (yet). Just objects representing HTML elements.

```javascript
// This JSX:
<div className="container">
  <h1>Hello</h1>
</div>

// Becomes this object:
{
  type: 'div',
  props: { className: 'container' },
  children: [
    {
      type: 'h1',
      props: {},
      children: ['Hello']
    }
  ]
}
```

The magic isn't in the data structure. The magic is in what you *do* with it: diffing, patching, reconciliation. But we'll get to that later.

First, let's build our own VNode system. Simpler than React's. More suited for server-side rendering. And with a secret weapon: stable hex paths.

## Designing VNode from First Principles

When I started building Minimact's VNode system, I wrote down the requirements:

**Must have:**
1. Represent HTML elements (div, span, button, etc.)
2. Represent text nodes ("Hello, world!")
3. Support attributes (class, id, onClick, etc.)
4. Support children (nested elements)
5. Have stable identifiers across renders (this is the key)

**Nice to have:**
1. Explicit representation of conditional rendering (`{condition && <Component />}`)
2. Compact serialization (for sending over network)
3. Easy to diff (for reconciliation)

**Don't need:**
1. React's Fiber architecture (that's for client-side scheduling)
2. React's component tree tracking (we're server-side only)
3. React's synthetic events (browser events work fine)

Here's what I came up with:

```csharp
// VNode.cs - The base class
public abstract class VNode
{
    public string Path { get; set; }  // The secret sauce
}

// Three concrete types:

// 1. VElement - Represents HTML elements
public class VElement : VNode
{
    public string Tag { get; set; }               // "div", "button", etc.
    public Dictionary<string, string> Attributes { get; set; }
    public List<VNode> Children { get; set; }
}

// 2. VText - Represents text nodes
public class VText : VNode
{
    public string Text { get; set; }
}

// 3. VNull - Represents conditional rendering (the breakthrough)
public class VNull : VNode
{
    // This is intentionally empty - it's a placeholder
}
```

That's it. Three classes. About 30 lines of code. Simpler than React's VNode structure, yet powerful enough to represent any UI.

## The VNull Breakthrough

The `VNull` class deserves special attention because it solves a problem React doesn't even acknowledge.

Consider this React code:

```jsx
function Menu({ isOpen }) {
  return (
    <div>
      <h1>My App</h1>
      {isOpen && <nav>Menu content</nav>}
      <main>Page content</main>
    </div>
  );
}
```

When `isOpen` is `false`, what does React's virtual DOM look like?

```javascript
{
  type: 'div',
  children: [
    { type: 'h1', children: ['My App'] },
    // Nothing here - the nav is just... missing
    { type: 'main', children: ['Page content'] }
  ]
}
```

The `nav` element doesn't exist in the tree. When `isOpen` becomes `true`, React has to insert the nav at position 1. When it becomes `false` again, React removes it from position 1.

**This works fine on the client.** React's reconciliation algorithm handles insertions and deletions gracefully.

**But it's a nightmare for server-side rendering with stable paths.**

Here's the problem: if we want to pre-compute patches (for instant client feedback), we need stable identifiers for elements. If element positions shift based on conditionals, our paths become unstable.

Solution? **Explicit VNull nodes.**

```csharp
// Minimact's VNode tree when isOpen = false:
new VElement("div") {
  Children = new List<VNode> {
    new VElement("h1") { Children = new List<VNode> { new VText("My App") } },
    new VNull(),  // Explicitly marks where the nav would be
    new VElement("main") { Children = new List<VNode> { new VText("Page content") } }
  }
}
```

Now the `nav` element has a *permanent address* - child index 1 of the parent div. Even when it doesn't exist in the DOM, it exists in our VNode tree as a placeholder.

**This is the key to everything:**
- Stable paths for hot reload
- Predictable patch targeting
- Simplified client-side navigation
- No complex insertion/deletion logic

React doesn't need VNull because it does all reconciliation client-side where it has the full tree context. Minimact needs VNull because we pre-compute patches server-side and send them to a "dumb" client that can't reconcile.

## The Hex Path System

Now for the secret weapon: **hex paths**.

Every VNode in Minimact has a `Path` property. It's a string like:

```
"10000000"                      // Root element
"10000000.20000000"             // Second child of root
"10000000.20000000.30000000"    // Third child of second child
```

These aren't arbitrary. They're hierarchical identifiers that:

1. **Uniquely identify every element** in the component tree
2. **Stay stable across renders** (even when content changes)
3. **Encode parent-child relationships** (you can derive parent from child)
4. **Allow insertions** without renumbering everything

Let's break down the format:

```
HEX_GAP = 0x10000000  // 268,435,456 in decimal

First child:   1 * HEX_GAP = 0x10000000
Second child:  2 * HEX_GAP = 0x20000000
Third child:   3 * HEX_GAP = 0x30000000
Fourth child:  4 * HEX_GAP = 0x40000000
```

Why hexadecimal? Why such large gaps?

**Insertions.**

Imagine you have three elements:

```
div (10000000)
├─ span (10000000.10000000)
├─ button (10000000.20000000)
└─ p (10000000.30000000)
```

Now you add a new element between `span` and `button`. In a naive system, you'd have to renumber everything:

```
// ❌ Bad: Renumber all subsequent elements
div (10000000)
├─ span (10000000.10000000)
├─ input (10000000.20000000)  // NEW - took button's position
├─ button (10000000.30000000) // Had to renumber
└─ p (10000000.40000000)      // Had to renumber
```

With hex gaps, you just insert between:

```
// ✅ Good: Insert in the gap
div (10000000)
├─ span (10000000.10000000)
├─ input (10000000.10000001)  // NEW - fits in the gap!
├─ button (10000000.20000000) // Unchanged
└─ p (10000000.30000000)      // Unchanged
```

The gap between `0x10000000` and `0x20000000` is 268 million. You can insert 268 million elements before running out of space.

**This means existing elements keep their hex paths forever.** Hot reload becomes trivial. Patch caching becomes trivial. Everything becomes trivial.

## Generating Hex Paths

Hex paths are generated at build time by the Babel plugin. When you write JSX:

```jsx
function Counter() {
  return (
    <div className="counter">
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

Babel assigns paths on first encounter:

```
div         → 10000000
  span      → 10000000.10000000
  button    → 10000000.20000000
```

These are saved to a `.tsx.keys` file:

```json
{
  "Counter.tsx": {
    "div:2:5": "10000000",
    "span:3:7": "10000000.10000000",
    "button:4:7": "10000000.20000000"
  }
}
```

The keys are `tag:line:column`. If you edit the file but don't change the structure, the paths stay the same. This is crucial for hot reload.

## Building the VNode Tree

Let's see how a component renders to VNodes:

```csharp
public class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render()
    {
        return new VElement("div", new() {
            ["class"] = "counter",
            ["key"] = "10000000"
        })
        {
            Children = new List<VNode>
            {
                new VElement("span", new() {
                    ["key"] = "10000000.10000000"
                })
                {
                    Children = new List<VNode>
                    {
                        new VText($"Count: {count}")
                        {
                            Path = "10000000.10000000.10000000"
                        }
                    }
                },
                new VElement("button", new() {
                    ["onClick"] = "Increment",
                    ["key"] = "10000000.20000000"
                })
                {
                    Children = new List<VNode>
                    {
                        new VText("+")
                        {
                            Path = "10000000.20000000.10000000"
                        }
                    }
                }
            }
        };
    }

    [EventHandler]
    public void Increment()
    {
        count++;
        TriggerRender();
    }
}
```

Notice:
- Every `VElement` has a `key` attribute with its hex path
- Every `VText` has a `Path` property
- Even text nodes get hex paths (they're nodes too!)

## The First Render Flow

Let's trace what happens when this component first renders:

**1. Server creates component instance:**
```csharp
var counter = new Counter();
var registry = new ComponentRegistry();
registry.RegisterComponent("counter-1", counter);
```

**2. Server calls Render():**
```csharp
var vnode = counter.Render();
```

This produces:
```
VElement(div, key=10000000)
├─ VElement(span, key=10000000.10000000)
│  └─ VText("Count: 0", path=10000000.10000000.10000000)
└─ VElement(button, key=10000000.20000000)
   └─ VText("+", path=10000000.20000000.10000000)
```

**3. Server serializes VNode to HTML:**
```html
<div class="counter" data-component-id="counter-1" data-key="10000000">
  <span data-key="10000000.10000000">Count: 0</span>
  <button data-key="10000000.20000000">+</button>
</div>
```

**4. Server sends HTML + metadata to client:**
```json
{
  "html": "<div class='counter'...",
  "componentId": "counter-1",
  "hints": [
    {
      "trigger": { "count": 1 },
      "patches": [
        {
          "type": "UpdateText",
          "hexPath": "10000000.10000000.10000000",
          "text": "Count: 1"
        }
      ]
    }
  ]
}
```

**5. Client injects HTML and caches hints:**
```javascript
document.getElementById('root').innerHTML = response.html;
hintQueue.enqueue(response.componentId, response.hints);
```

Done. The page is interactive instantly. No hydration. No waiting. The button works because it has a `data-component-id` and the client knows to send clicks to the server.

## The Update Flow

Now the user clicks the button. Here's what happens:

**1. Client detects click:**
```javascript
button.addEventListener('click', () => {
  signalR.invoke('HandleEvent', 'counter-1', 'Increment');
});
```

**2. Client checks hint queue (instant feedback):**
```javascript
const stateChanges = { count: 1 };  // Predicted next state
const hint = hintQueue.matchHint('counter-1', stateChanges);

if (hint) {
  // CACHE HIT! Apply patches instantly (0-5ms)
  domPatcher.applyPatches(element, hint.patches);
  // UI updates before server even responds!
}
```

**3. Server handles event:**
```csharp
public async Task HandleEvent(string componentId, string methodName)
{
    var component = registry.GetComponent(componentId);

    // Call the event handler
    component.GetType()
        .GetMethod(methodName)
        .Invoke(component, null);

    // Component's TriggerRender() was called
    // Re-render happens automatically
}
```

**4. Server reconciles VNode trees:**
```csharp
var oldVNode = component.CurrentVNode;
var newVNode = component.Render();

// Rust reconciler diffs the trees
var patches = RustBridge.Reconcile(oldVNode, newVNode);
```

**5. Server sends patches to client:**
```json
{
  "componentId": "counter-1",
  "patches": [
    {
      "type": "UpdateText",
      "hexPath": "10000000.10000000.10000000",
      "domPath": [0, 0, 0],
      "text": "Count: 1"
    }
  ]
}
```

**6. Client applies patches:**
```javascript
// Usually a no-op because hint already applied it!
// But if prediction was wrong, this corrects it
domPatcher.applyPatches(element, patches);
```

The user saw the update instantly (step 2). The server confirmed it was correct (step 6). Total user-perceived latency: 0-5ms.

## Why Hex Paths Beat React's Keys

React has a `key` prop for lists:

```jsx
{todos.map(todo => (
  <li key={todo.id}>{todo.text}</li>
))}
```

This helps React track which items moved/added/deleted. But React's keys:

1. **Only work within a list** - Siblings must have unique keys
2. **Don't encode hierarchy** - A key doesn't tell you the parent
3. **Aren't stable across components** - Different components can reuse keys
4. **Don't help with hot reload** - Keys are runtime, not build-time

Minimact's hex paths:

1. **Work everywhere** - Every element has a path
2. **Encode full hierarchy** - `10000000.20000000.30000000` tells you the ancestry
3. **Are globally unique** - Generated at build time, never collision
4. **Enable hot reload** - Stable across file saves

Compare:

```jsx
// React: Keys are values
<li key={todo.id}>  // What if todo.id changes?

// Minimact: Paths are positions
<li data-key="10000000.20000000">  // Never changes, even if content does
```

## The VNull Use Case Revisited

Let's see VNull in action with a more complex example:

```jsx
function Dashboard({ user, showAdmin }) {
  return (
    <div>
      <header>Welcome, {user.name}</header>
      {showAdmin && (
        <aside>
          <h2>Admin Panel</h2>
          <button>Settings</button>
        </aside>
      )}
      <main>Dashboard content</main>
      {user.isPremium && <footer>Premium features</footer>}
    </div>
  );
}
```

When `showAdmin=false` and `user.isPremium=false`, the VNode tree is:

```
VElement(div, 10000000)
├─ VElement(header, 10000000.10000000)
│  └─ VText("Welcome, Alice", 10000000.10000000.10000000)
├─ VNull(10000000.20000000)  // Admin panel placeholder
├─ VElement(main, 10000000.30000000)
│  └─ VText("Dashboard content", 10000000.30000000.10000000)
└─ VNull(10000000.40000000)  // Premium footer placeholder
```

When `showAdmin=true`, the admin panel VNull is replaced:

```
VElement(div, 10000000)
├─ VElement(header, 10000000.10000000)
│  └─ VText("Welcome, Alice", 10000000.10000000.10000000)
├─ VElement(aside, 10000000.20000000)  // Replaces VNull at same path!
│  ├─ VElement(h2, 10000000.20000000.10000000)
│  │  └─ VText("Admin Panel", 10000000.20000000.10000000.10000000)
│  └─ VElement(button, 10000000.20000000.20000000)
│     └─ VText("Settings", 10000000.20000000.20000000.10000000)
├─ VElement(main, 10000000.30000000)
│  └─ VText("Dashboard content", 10000000.30000000.10000000)
└─ VNull(10000000.40000000)  // Still a placeholder
```

Notice: `main` stayed at path `10000000.30000000`. No renumbering. No shifting. The path is stable whether the admin panel exists or not.

## Converting Hex Paths to DOM Paths

Here's the catch: the browser doesn't understand hex paths. It only understands array indices.

```javascript
// Hex path: "10000000.20000000.30000000"
// Needs to become: [0, 1, 2]
```

But wait - what about VNull nodes? They don't exist in the DOM!

This is where **PathConverter** comes in. It's a C# class that:

1. Traverses the VNode tree
2. Collects all VNull paths
3. Converts hex paths to DOM indices by *skipping nulls*

```csharp
public class PathConverter
{
    private VNode _rootVNode;
    private HashSet<string> _nullPaths;

    public PathConverter(VNode root)
    {
        _rootVNode = root;
        _nullPaths = new HashSet<string>();
        CollectNullPaths(root);
    }

    private void CollectNullPaths(VNode node)
    {
        if (node is VNull)
        {
            _nullPaths.Add(node.Path);
        }
        else if (node is VElement element)
        {
            foreach (var child in element.Children)
            {
                CollectNullPaths(child);
            }
        }
    }

    public List<int> HexPathToDomPath(string hexPath)
    {
        var segments = hexPath.Split('.');
        var domPath = new List<int>();
        var currentPath = "";

        for (int i = 0; i < segments.Length; i++)
        {
            currentPath = i == 0
                ? segments[i]
                : $"{currentPath}.{segments[i]}";

            if (i < segments.Length - 1)
            {
                // Count non-null siblings before this one
                var parent = GetNodeAtPath(currentPath.Substring(0, currentPath.LastIndexOf('.')));
                var childIndex = GetDomIndex(parent, currentPath);
                domPath.Add(childIndex);
            }
        }

        return domPath;
    }

    private int GetDomIndex(VNode parent, string childHexPath)
    {
        if (parent is not VElement element) return 0;

        int domIndex = 0;
        foreach (var child in element.Children)
        {
            if (child.Path == childHexPath)
            {
                return domIndex;
            }

            // Only increment for non-null nodes
            if (child is not VNull)
            {
                domIndex++;
            }
        }

        return 0;
    }
}
```

Example:

```
VNode tree:
div (10000000)
├─ span (10000000.10000000)
├─ VNull (10000000.20000000)  ← Doesn't exist in DOM
├─ button (10000000.30000000)

PathConverter.HexPathToDomPath("10000000.30000000")
→ [0, 1]  // Not [0, 2] because VNull was skipped!
```

The server does this conversion before sending patches to the client. The client receives simple array indices and doesn't need to know about VNull nodes at all.

**This is the magic.** The client is completely unaware of the complexity. It just sees:

```json
{
  "type": "UpdateText",
  "path": [0, 1, 0],
  "text": "New value"
}
```

And navigates with simple array indexing:

```javascript
let element = root;
for (const index of patch.path) {
  element = element.childNodes[index];
}
element.textContent = patch.text;
```

Fast. Simple. No edge cases.

## The Complete Picture

Let's put it all together with a diagram:

```
┌─────────────────────────────────────────────────────────────┐
│                    BABEL (Build Time)                        │
│  - Parses JSX                                                │
│  - Assigns hex paths to elements                             │
│  - Saves to .tsx.keys file                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVER (Runtime)                            │
│                                                              │
│  Component.Render()                                          │
│       ↓                                                      │
│  VNode Tree (with VNull, hex paths)                          │
│       ↓                                                      │
│  PathConverter (hex → DOM indices)                           │
│       ↓                                                      │
│  Patches with DOM paths                                      │
│       ↓                                                      │
│  Send to client                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  CLIENT (Runtime)                            │
│                                                              │
│  Receive patches                                             │
│       ↓                                                      │
│  Navigate: root.childNodes[path[0]][path[1]]...             │
│       ↓                                                      │
│  Apply: element.textContent = patch.text                     │
│       ↓                                                      │
│  Done! (0-5ms)                                               │
└─────────────────────────────────────────────────────────────┘
```

## Why This Matters

You might be thinking: "That's a lot of complexity just to avoid React's approach."

But consider what we've gained:

**1. Stable Identifiers**
- Elements keep the same path across renders
- Hot reload becomes trivial (we'll see in Chapter 7)
- Patch caching becomes trivial (Chapter 5)

**2. Explicit Conditionals**
- VNull nodes make conditional rendering explicit
- PathConverter handles the complexity server-side
- Client stays simple and fast

**3. Server-Side Control**
- Hex paths generated at build time (deterministic)
- PathConverter runs on server (where VNode tree exists)
- Client gets pre-processed DOM indices (zero overhead)

**4. Insertion Support**
- Hex gaps allow insertions without renumbering
- Hot reload can insert elements mid-component
- Structural changes don't break existing paths

Compare this to React:

**React:**
- Keys only help with lists
- No build-time path generation
- Client must reconcile (expensive)
- Hydration required (slow)

**Minimact:**
- Every element has a stable path
- Build-time path generation (fast)
- Client just applies patches (cheap)
- No hydration (instant)

## The "It's Just Objects" Insight

At the end of the day, VNode trees aren't magical. They're just objects:

```csharp
var vnode = new VElement("button") {
    Attributes = new() { ["class"] = "primary" },
    Children = new List<VNode> { new VText("Click me") }
};
```

The magic is in:
1. **Stable paths** (hex system)
2. **Explicit conditionals** (VNull)
3. **Server-side conversion** (PathConverter)
4. **Simple client navigation** (array indexing)

These four concepts form the foundation of everything else in Minimact:
- Reconciliation (Chapter 3)
- Predictive rendering (Chapter 5)
- Hot reload (Chapter 7)
- State synchronization (Chapter 8)

## What We've Built

In this chapter, we designed a VNode system from scratch:

✅ **Three node types**: VElement, VText, VNull
✅ **Hex path system**: Stable, hierarchical, insertion-friendly
✅ **VNull nodes**: Explicit conditional rendering
✅ **PathConverter**: Server-side hex → DOM conversion
✅ **Simple client**: Just array indexing

Total complexity? About 200 lines of C# code. Simpler than React's VNode system, but more powerful for our use case.

## Try It Yourself

Here's a challenge: implement your own mini VNode system. You'll need:

1. **VNode classes** (VElement, VText, VNull)
2. **A render function** that produces VNode trees
3. **A serializer** that converts VNodes to HTML
4. **A path generator** (use sequential numbers for now, hex comes later)

You can do this in any language. Try to render this component:

```jsx
function Greeting({ name, showDetails }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      {showDetails && (
        <p>Welcome to Minimact</p>
      )}
    </div>
  );
}
```

With `name="Alice"` and `showDetails=false`, your VNode tree should have a VNull placeholder where the `<p>` would be.

Once you understand VNode trees at this level, the rest of Minimact will make sense. Reconciliation is just diffing two VNode trees. Patching is just applying the differences. Hot reload is just replacing nodes while keeping paths stable.

---

*End of Chapter 2*

**Next Chapter Preview:**
*Chapter 3: The Rust Reconciler - Fast by Design*

We'll implement the heart of Minimact: a Rust-powered reconciliation engine that diffs VNode trees and generates surgical DOM patches. You'll see why Rust was chosen, how the diffing algorithm works, and how we achieve ~1ms reconciliation for typical components. We'll also explore the patch types (CreateElement, UpdateText, SetAttribute, etc.) and how they map to DOM operations.
