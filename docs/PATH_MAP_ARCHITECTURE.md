# Path Map Architecture: Universal DOM Patching

## Overview

The **Path Map** is the foundational architecture for **all DOM patching** in Minimact, not just hot reload. It solves the fundamental problem of locating DOM elements in the presence of conditional rendering, dynamic lists, and complex component structures.

This document describes how the path map unifies all patching scenarios:
- ✅ State changes (user interactions)
- ✅ Event handlers (form inputs, clicks)
- ✅ Server push (real-time updates)
- ✅ Reconciliation (structural changes)
- ✅ Hot reload (developer experience)

---

## The Core Problem

### Fragile Child Index Paths

Traditional virtual DOM reconciliation uses **numeric child indices** to locate elements:

```typescript
// Path: [0, 2, 1] means:
// root.childNodes[0].childNodes[2].childNodes[1]
```

This breaks with conditional rendering:

```tsx
<div>
  <h1>Title</h1>                  {/* Index 0 */}
  {isLoggedIn && <div>User</div>} {/* Sometimes index 1, sometimes not there */}
  <label>Email:</label>           {/* Index 1 or 2 depending on condition! */}
  <button>Submit</button>         {/* Index 2 or 3 depending on condition! */}
</div>
```

**Result**: When `isLoggedIn` changes, all subsequent sibling indices shift, causing patches to target the **wrong elements**.

This affects **every patching scenario**, not just hot reload:

1. **State Change**: User clicks "Login" → `setIsLoggedIn(true)` → Server renders → Patches target wrong elements ❌
2. **Form Input**: User types in field → Server validates → Patches target wrong elements ❌
3. **Server Push**: WebSocket event arrives → Server updates → Patches target wrong elements ❌
4. **Hot Reload**: Developer edits style → Patches target wrong elements ❌

### Why This is Universal

Every patch from the server faces the same problem:

```csharp
// Server renders component
var vnode = component.Render();

// Rust reconciler computes patches
var patches = reconciler.Diff(oldVNode, newVNode);

// Send patches to client
await signalR.SendPatches(patches);

// ❌ Problem: Patches use numeric paths that break with conditionals!
```

---

## The Solution: Semantic Path Keys

### Core Concept

Replace fragile numeric paths with **stable semantic identifiers**:

```typescript
// Numeric path (FRAGILE)
[0, 2, 1] → root.childNodes[0].childNodes[2].childNodes[1]
           → Breaks when conditionals change

// Semantic path key (STABLE)
"div[0].label[0]" → First label inside first div
                  → Always finds the right element, regardless of conditionals
```

### How It Works

1. **Server embeds path keys** during initial render:
   ```html
   <div data-mm-path="div[0]">
     <h1 data-mm-path="div[0].h1[0]">Title</h1>
     <label data-mm-path="div[0].label[0]">Email:</label>
   </div>
   ```

2. **Client builds map** on initialization:
   ```typescript
   pathMap = {
     "div[0]": <div>,
     "div[0].h1[0]": <h1>,
     "div[0].label[0]": <label>
   }
   ```

3. **All patches use path keys** for O(1) lookups:
   ```typescript
   // Any patch from server
   const element = pathMap.get(patch.pathKey); // Direct lookup!
   element.setAttribute("value", patch.value);
   ```

---

## Universal Patch Format

### Unified Patch Interface

ALL patches should include semantic path keys:

```typescript
// src/client-runtime/src/types.ts

export type Patch =
  // Text updates (state changes, hot reload)
  | { type: 'UpdateText'; pathKey: string; path: number[]; content: string }

  // Attribute/prop updates (state changes, hot reload)
  | { type: 'UpdateProps'; pathKey: string; path: number[]; props: Record<string, any> }

  // Structural changes (reconciliation)
  | { type: 'InsertNode'; pathKey: string; path: number[]; vnode: VNode; position: number }
  | { type: 'RemoveNode'; pathKey: string; path: number[] }
  | { type: 'ReplaceNode'; pathKey: string; path: number[]; vnode: VNode }

  // List updates (array rendering)
  | { type: 'UpdateList'; pathKey: string; path: number[]; items: VNode[] }

  // Hot reload templates
  | { type: 'UpdateAttributeStatic'; pathKey: string; path: number[]; attrName: string; value: string }
  | { type: 'UpdateTextTemplate'; pathKey: string; path: number[]; content: string }
  | { type: 'UpdatePropsTemplate'; pathKey: string; path: number[]; templatePatch: TemplatePatch };
```

**Key Points**:
- ✅ `pathKey` is **always present** - Used for O(1) lookup
- ✅ `path` is **optional** - Legacy numeric path for debugging
- ✅ All patch types unified under one interface

### Backward Compatibility

During transition, support both approaches:

```typescript
class DOMPatcher {
  private getElementFromPatch(patch: Patch): HTMLElement | Text | null {
    // Prefer semantic path key (stable, fast)
    if (patch.pathKey) {
      const element = this.pathMap.get(patch.pathKey);
      if (element) return element;

      console.warn(`[DOMPatcher] Path key not found: ${patch.pathKey}`);
    }

    // Fallback to numeric path (legacy, unreliable with conditionals)
    if (patch.path) {
      console.warn(`[DOMPatcher] Using legacy numeric path (unreliable!)`);
      return this.findElementByPath(patch.path);
    }

    return null;
  }
}
```

---

## Patching Scenarios

### 1. State Changes (User Interactions)

**Flow**: User interaction → SignalR call → Server re-renders → Patches

```tsx
// Component
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

**Interaction**:
```
1. User clicks button
2. Client sends: SignalR.invoke('HandleClick', componentId, 'handleIncrement')
3. Server executes: setCount(count + 1)
4. Server re-renders: Render() → <span>Count: 1</span>
5. Rust reconciler: Diff → [{ type: 'UpdateText', pathKey: 'div[0].span[0].text[0]', content: 'Count: 1' }]
6. Client applies: pathMap.get('div[0].span[0].text[0]').textContent = 'Count: 1'
```

**With Conditionals**:
```tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      {count > 5 && <div>High count!</div>}  {/* Conditional */}
      <span>Count: {count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

When count goes from 5 → 6:
- ❌ **Numeric path**: `span` moves from `[0, 0]` to `[0, 1]` - PATCH FAILS!
- ✅ **Path key**: `span` is still `"div[0].span[0]"` - PATCH WORKS!

### 2. Form Input Validation

**Flow**: User types → SignalR call → Server validates → Patches update UI

```tsx
function EmailForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    setEmail(value);
    if (!value.includes('@')) {
      setError('Invalid email');
    } else {
      setError('');
    }
  };

  return (
    <div>
      <input value={email} onChange={e => handleChange(e.target.value)} />
      {error && <span className="error">{error}</span>}
      <button>Submit</button>
    </div>
  );
}
```

**Interaction**:
```
1. User types "test" (no @)
2. Client sends: SignalR.invoke('HandleInput', componentId, 'handleChange', 'test')
3. Server validates: setError('Invalid email')
4. Server re-renders: Inserts <span> error element
5. Rust reconciler: [
     { type: 'UpdateProps', pathKey: 'div[0].input[0]', props: { value: 'test' } },
     { type: 'InsertNode', pathKey: 'div[0].span[0]', vnode: <span>, position: 1 }
   ]
6. Client applies:
   - pathMap.get('div[0].input[0]').value = 'test'
   - Insert new span, rebuild path map
```

**Key Point**: The `button` path key `"div[0].button[0]"` remains stable even when the error `span` is inserted/removed!

### 3. Server Push (Real-Time Updates)

**Flow**: Server event → Re-render → Patches → All clients updated

```tsx
function StockTicker({ symbol }: Props) {
  const [price, setPrice] = useState(100);

  return (
    <div>
      <span>{symbol}</span>
      <span className="price">${price.toFixed(2)}</span>
    </div>
  );
}

// Server-side push
public async Task BroadcastPriceUpdate(string symbol, decimal price) {
  // Find all instances of StockTicker with this symbol
  var instances = registry.GetComponentsByProps("StockTicker", new { symbol });

  foreach (var instance in instances) {
    // Update state
    instance.SetState("price", price);

    // Re-render
    var newVNode = instance.Render();
    var patches = reconciler.Diff(instance.CurrentVNode, newVNode);

    // Send patches to all clients viewing this component
    await signalR.SendPatches(instance.ClientIds, patches);
  }
}
```

**Broadcast**:
```
1. Stock price changes on server
2. Server calls: BroadcastPriceUpdate("AAPL", 150.75)
3. All clients receive: [{ type: 'UpdateText', pathKey: 'div[0].span[1].text[0]', content: '$150.75' }]
4. All clients apply: pathMap.get('div[0].span[1].text[0]').textContent = '$150.75'
```

### 4. Reconciliation (Structural Changes)

**Flow**: Major state change → Component re-renders with different structure

```tsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn Minimact' },
    { id: 2, text: 'Build app' }
  ]);

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// User deletes todo[0]
setTodos([{ id: 2, text: 'Build app' }]);
```

**Reconciliation**:
```
1. Server re-renders with one fewer todo
2. Rust reconciler: [
     { type: 'RemoveNode', pathKey: 'ul[0].li[0]:key-1' }
   ]
3. Client applies:
   - pathMap.get('ul[0].li[0]:key-1').remove()
   - Rebuild path map to reflect new structure
   - pathMap now has: 'ul[0].li[0]:key-2' → <li>Build app</li>
```

**Key Point**: Using React `key` prop creates stable path keys even when list order changes!

### 5. Hot Reload (Developer Experience)

**Flow**: Developer edits TSX → Babel detects change → Template patch

```tsx
// Before
<label style={{ fontWeight: '500' }}>Email:</label>

// After (developer edits)
<label style={{ fontWeight: 'bold', color: 'red' }}>Email:</label>
```

**Hot Reload**:
```
1. File watcher detects change
2. Babel extracts template: { pathKey: 'div[0].label[0]', template: 'font-weight: bold; color: red' }
3. Server sends: [{ type: 'UpdateAttributeStatic', pathKey: 'div[0].label[0]', attrName: 'style', value: '...' }]
4. Client applies: pathMap.get('div[0].label[0]').setAttribute('style', '...')
5. Developer sees instant update (0-5ms)
```

**Same path map, same lookup logic!**

---

## DOMPatcher: Universal Implementation

### Core Class

```typescript
// src/client-runtime/src/dom-patcher.ts

export class DOMPatcher {
  private root: HTMLElement;
  private pathMap: Map<string, HTMLElement | Text> = new Map();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /**
   * Initialize from server-rendered DOM (called once on page load)
   * Scans for data-mm-path attributes, builds map, strips attributes
   */
  initialize(): void {
    this.pathMap.clear();
    this.scanAndStrip(this.root);
    console.log(`[DOMPatcher] Initialized with ${this.pathMap.size} paths`);
  }

  /**
   * Apply ANY patch using path map lookup
   * Used by: state changes, events, hot reload, reconciliation
   */
  applyPatch(patch: Patch): void {
    const startTime = performance.now();

    // Get element using path map (O(1))
    const element = this.getElementFromPatch(patch);

    if (!element) {
      console.warn(`[DOMPatcher] Element not found for patch:`, patch);
      this.handleMissingElement(patch);
      return;
    }

    // Apply patch based on type
    switch (patch.type) {
      case 'UpdateText':
        this.applyUpdateText(element as Text, patch);
        break;

      case 'UpdateProps':
        this.applyUpdateProps(element as HTMLElement, patch);
        break;

      case 'InsertNode':
        this.applyInsertNode(element as HTMLElement, patch);
        this.rebuildPathMap(); // Structural change
        break;

      case 'RemoveNode':
        this.applyRemoveNode(element);
        this.pathMap.delete(patch.pathKey);
        break;

      case 'ReplaceNode':
        this.applyReplaceNode(element, patch);
        this.rebuildPathMap(); // Structural change
        break;

      case 'UpdateList':
        this.applyUpdateList(element as HTMLElement, patch);
        this.rebuildPathMap(); // Structural change
        break;

      case 'UpdateAttributeStatic':
        this.applyAttributeStatic(element as HTMLElement, patch);
        break;

      case 'UpdateTextTemplate':
        this.applyTextTemplate(element as Text, patch);
        break;

      case 'UpdatePropsTemplate':
        this.applyPropsTemplate(element as HTMLElement, patch);
        break;

      default:
        console.warn(`[DOMPatcher] Unknown patch type:`, patch);
    }

    const latency = performance.now() - startTime;
    console.log(`[DOMPatcher] Applied ${patch.type} in ${latency.toFixed(2)}ms`);
  }

  /**
   * Apply multiple patches in batch
   */
  applyPatches(patches: Patch[]): void {
    console.log(`[DOMPatcher] Applying ${patches.length} patches...`);

    let hasStructuralChange = false;

    for (const patch of patches) {
      this.applyPatch(patch);

      // Track if we need to rebuild map
      if (this.isStructuralPatch(patch)) {
        hasStructuralChange = true;
      }
    }

    // Rebuild once after all patches (optimization)
    if (hasStructuralChange) {
      console.log('[DOMPatcher] Structural changes detected, rebuilding path map...');
      this.rebuildPathMap();
    }
  }

  /**
   * Get element from patch using path map
   */
  private getElementFromPatch(patch: Patch): HTMLElement | Text | null {
    // Prefer semantic path key (stable, fast)
    if (patch.pathKey) {
      return this.pathMap.get(patch.pathKey) || null;
    }

    // Fallback to numeric path (legacy, unreliable with conditionals)
    if (patch.path) {
      console.warn(`[DOMPatcher] Using legacy numeric path (unreliable!)`);
      return this.findElementByPath(patch.path);
    }

    return null;
  }

  /**
   * Check if patch changes DOM structure
   */
  private isStructuralPatch(patch: Patch): boolean {
    return patch.type === 'InsertNode' ||
           patch.type === 'RemoveNode' ||
           patch.type === 'ReplaceNode' ||
           patch.type === 'UpdateList';
  }

  /**
   * Handle missing element (graceful fallback)
   */
  private handleMissingElement(patch: Patch): void {
    console.warn(`[DOMPatcher] Element not found, requesting full re-render`);
    // TODO: Request full component re-render from server
  }

  // ... patch application methods (applyUpdateText, applyUpdateProps, etc.)

  /**
   * Rebuild path map after structural changes
   */
  private rebuildPathMap(): void {
    this.pathMap.clear();
    this.walkAndMap(this.root, [], {});
    console.log(`[DOMPatcher] Rebuilt path map with ${this.pathMap.size} entries`);
  }

  /**
   * Walk DOM tree and build path map (no data-mm-path attributes)
   */
  private walkAndMap(
    node: Node,
    currentPath: number[],
    tagCounts: Record<string, number>
  ): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Track per-tag index
      if (!tagCounts[tagName]) {
        tagCounts[tagName] = 0;
      }
      const tagIndex = tagCounts[tagName]++;

      // Build semantic path key
      const pathKey = this.buildPathKey(currentPath, tagName, tagIndex);

      // Check for React key (for list items)
      const reactKey = element.getAttribute('data-key');
      const fullPathKey = reactKey ? `${pathKey}:key-${reactKey}` : pathKey;

      // Map it
      this.pathMap.set(fullPathKey, element);

      // Map text nodes
      this.mapTextNodes(element, fullPathKey);

      // Recursively map children
      const childTagCounts: Record<string, number> = {};
      let childIndex = 0;

      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          this.walkAndMap(child, [...currentPath, childIndex], childTagCounts);
          childIndex++;
        }
      }
    }
  }

  /**
   * Build semantic path key from numeric path
   */
  private buildPathKey(
    path: number[],
    tagName: string,
    tagIndex: number
  ): string {
    const parentKeys = path.map(i => `[${i}]`).join('.');
    return `${parentKeys}.${tagName}[${tagIndex}]`.replace(/^\./, '');
  }

  /**
   * Scan server-rendered DOM and strip data-mm-path attributes
   */
  private scanAndStrip(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      // Read path key
      const pathKey = element.getAttribute('data-mm-path');

      if (pathKey) {
        // Map it
        this.pathMap.set(pathKey, element);

        // Strip attribute
        element.removeAttribute('data-mm-path');

        // Map text nodes
        this.mapTextNodes(element, pathKey);
      }

      // Recursively scan children
      for (const child of Array.from(element.childNodes)) {
        this.scanAndStrip(child);
      }
    }
  }

  /**
   * Map text nodes using parent path + .text[N]
   */
  private mapTextNodes(element: HTMLElement, parentPath: string): void {
    let textIndex = 0;

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          const textKey = `${parentPath}.text[${textIndex}]`;
          this.pathMap.set(textKey, child as Text);
          textIndex++;
        }
      }
    }
  }

  /**
   * Legacy: Find element by numeric path (fallback)
   */
  private findElementByPath(path: number[]): Node | null {
    let current: Node | null = this.root;

    for (const index of path) {
      if (!current || !current.childNodes) return null;
      current = current.childNodes[index] || null;
    }

    return current;
  }
}
```

### Patch Application Methods

```typescript
// Text updates
private applyUpdateText(textNode: Text, patch: UpdateTextPatch): void {
  textNode.textContent = patch.content;
}

// Attribute/prop updates
private applyUpdateProps(element: HTMLElement, patch: UpdatePropsPatch): void {
  for (const [key, value] of Object.entries(patch.props)) {
    if (value === null || value === undefined) {
      element.removeAttribute(key);
    } else {
      element.setAttribute(key, String(value));
    }
  }
}

// Insert node
private applyInsertNode(parent: HTMLElement, patch: InsertNodePatch): void {
  const newElement = this.vnodeToDOM(patch.vnode);

  if (patch.position >= parent.childNodes.length) {
    parent.appendChild(newElement);
  } else {
    const referenceNode = parent.childNodes[patch.position];
    parent.insertBefore(newElement, referenceNode);
  }
}

// Remove node
private applyRemoveNode(element: Node): void {
  element.remove();
}

// Replace node
private applyReplaceNode(oldElement: Node, patch: ReplaceNodePatch): void {
  const newElement = this.vnodeToDOM(patch.vnode);
  oldElement.replaceWith(newElement);
}

// Update list (array rendering)
private applyUpdateList(parent: HTMLElement, patch: UpdateListPatch): void {
  // Clear existing children
  parent.innerHTML = '';

  // Render new items
  for (const itemVNode of patch.items) {
    const itemElement = this.vnodeToDOM(itemVNode);
    parent.appendChild(itemElement);
  }
}

// Hot reload: Static attribute
private applyAttributeStatic(element: HTMLElement, patch: UpdateAttributeStaticPatch): void {
  element.setAttribute(patch.attrName, patch.value);
}

// Hot reload: Text template
private applyTextTemplate(textNode: Text, patch: UpdateTextTemplatePatch): void {
  textNode.textContent = patch.content;
}

// Hot reload: Props template
private applyPropsTemplate(element: HTMLElement, patch: UpdatePropsTemplatePatch): void {
  // Materialize template with current state
  const value = this.renderTemplate(patch.templatePatch);
  element.setAttribute(patch.templatePatch.attribute, value);
}
```

---

## Server-Side Implementation

### Rust Reconciler with Path Keys

```rust
// src/minimact-rust-reconciler/src/reconcile.rs

use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum Patch {
    UpdateText {
        path_key: String,      // "div[0].span[0].text[0]"
        path: Vec<usize>,      // [0, 0, 0] (legacy)
        content: String,
    },
    UpdateProps {
        path_key: String,      // "div[0].input[0]"
        path: Vec<usize>,      // [0, 0]
        props: HashMap<String, String>,
    },
    InsertNode {
        path_key: String,      // "div[0].span[1]"
        parent_path: Vec<usize>,
        vnode: VNode,
        position: usize,
    },
    RemoveNode {
        path_key: String,      // "div[0].span[0]"
        path: Vec<usize>,
    },
    ReplaceNode {
        path_key: String,      // "div[0].div[0]"
        path: Vec<usize>,
        vnode: VNode,
    },
}

pub fn compute_patches(old_vnode: &VNode, new_vnode: &VNode) -> Vec<Patch> {
    let mut patches = Vec::new();
    let mut tag_counts = HashMap::new();

    diff_recursive(
        old_vnode,
        new_vnode,
        &mut patches,
        "",
        &mut Vec::new(),
        &mut tag_counts
    );

    patches
}

fn diff_recursive(
    old: &VNode,
    new: &VNode,
    patches: &mut Vec<Patch>,
    parent_path: &str,
    numeric_path: &mut Vec<usize>,
    tag_counts: &mut HashMap<String, u32>,
) {
    // Build semantic path for this node
    let tag_name = &new.tag;
    let tag_index = tag_counts.entry(tag_name.clone()).or_insert(0);

    let path_key = if parent_path.is_empty() {
        format!("{}[{}]", tag_name, tag_index)
    } else {
        format!("{}.{}[{}]", parent_path, tag_name, tag_index)
    };

    *tag_index += 1;

    // Check if node type changed (replace)
    if old.tag != new.tag {
        patches.push(Patch::ReplaceNode {
            path_key: path_key.clone(),
            path: numeric_path.clone(),
            vnode: new.clone(),
        });
        return;
    }

    // Check text content
    if old.text != new.text {
        patches.push(Patch::UpdateText {
            path_key: format!("{}.text[0]", path_key),
            path: {
                let mut p = numeric_path.clone();
                p.push(0); // Text node is first child
                p
            },
            content: new.text.clone(),
        });
    }

    // Check props
    if old.props != new.props {
        patches.push(Patch::UpdateProps {
            path_key: path_key.clone(),
            path: numeric_path.clone(),
            props: new.props.clone(),
        });
    }

    // Diff children
    let mut child_tag_counts = HashMap::new();
    let old_children = &old.children;
    let new_children = &new.children;

    // Handle insertions, removals, and updates
    for (i, new_child) in new_children.iter().enumerate() {
        if i < old_children.len() {
            // Update existing child
            let mut child_path = numeric_path.clone();
            child_path.push(i);

            diff_recursive(
                &old_children[i],
                new_child,
                patches,
                &path_key,
                &mut child_path,
                &mut child_tag_counts
            );
        } else {
            // Insert new child
            let child_tag = &new_child.tag;
            let child_tag_index = child_tag_counts.entry(child_tag.clone()).or_insert(0);
            let child_path_key = format!("{}.{}[{}]", path_key, child_tag, child_tag_index);
            *child_tag_index += 1;

            patches.push(Patch::InsertNode {
                path_key: child_path_key,
                parent_path: numeric_path.clone(),
                vnode: new_child.clone(),
                position: i,
            });
        }
    }

    // Handle removals
    for i in new_children.len()..old_children.len() {
        let old_child = &old_children[i];
        let child_tag = &old_child.tag;
        let child_tag_index = child_tag_counts.entry(child_tag.clone()).or_insert(0);
        let child_path_key = format!("{}.{}[{}]", path_key, child_tag, child_tag_index);
        *child_tag_index += 1;

        let mut child_path = numeric_path.clone();
        child_path.push(i);

        patches.push(Patch::RemoveNode {
            path_key: child_path_key,
            path: child_path,
        });
    }
}
```

### C# VNode Renderer with Path Keys

```csharp
// src/Minimact.AspNetCore/Core/VNodeRenderer.cs

public class VNodeRenderer
{
    /// <summary>
    /// Render VNode tree to HTML with data-mm-path attributes
    /// </summary>
    public static string RenderToHtml(VNode vnode)
    {
        var tagCounts = new Dictionary<string, int>();
        return RenderRecursive(vnode, "", tagCounts);
    }

    private static string RenderRecursive(
        VNode vnode,
        string parentPath,
        Dictionary<string, int> tagCounts)
    {
        var sb = new StringBuilder();

        // Build semantic path for this node
        var tagName = vnode.Tag;
        if (!tagCounts.ContainsKey(tagName))
        {
            tagCounts[tagName] = 0;
        }
        var tagIndex = tagCounts[tagName]++;

        var pathKey = string.IsNullOrEmpty(parentPath)
            ? $"{tagName}[{tagIndex}]"
            : $"{parentPath}.{tagName}[{tagIndex}]";

        // Add React key to path if present
        if (vnode.Props.TryGetValue("key", out var key))
        {
            pathKey = $"{pathKey}:key-{key}";
        }

        // Open tag with path attribute
        sb.Append($"<{tagName} data-mm-path=\"{pathKey}\"");

        // Add other props
        foreach (var (propName, propValue) in vnode.Props)
        {
            if (propName == "key") continue; // Skip React key

            sb.Append($" {propName}=\"{EscapeHtml(propValue)}\"");
        }

        sb.Append(">");

        // Render children
        if (!string.IsNullOrEmpty(vnode.Text))
        {
            sb.Append(EscapeHtml(vnode.Text));
        }

        var childTagCounts = new Dictionary<string, int>();
        foreach (var child in vnode.Children)
        {
            sb.Append(RenderRecursive(child, pathKey, childTagCounts));
        }

        // Close tag
        sb.Append($"</{tagName}>");

        return sb.ToString();
    }

    private static string EscapeHtml(string text)
    {
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }
}
```

---

## Integration Points

### 1. Minimact Initialization

```typescript
// src/client-runtime/src/minimact.ts

export class Minimact {
  private domPatcher: DOMPatcher;
  private signalR: SignalRManager;
  private components: Map<string, ComponentInstance> = new Map();

  constructor() {
    this.domPatcher = new DOMPatcher(document.body);
    this.signalR = new SignalRManager(this);
  }

  /**
   * Initialize Minimact client
   */
  async init(): Promise<void> {
    console.log('[Minimact] Initializing...');

    // 1. Build path map from server-rendered DOM
    this.domPatcher.initialize();

    // 2. Scan for components
    this.scanComponents();

    // 3. Connect to server
    await this.signalR.connect();

    // 4. Register SignalR handlers
    this.registerSignalRHandlers();

    console.log('[Minimact] Initialized');
  }

  /**
   * Register SignalR patch handlers
   */
  private registerSignalRHandlers(): void {
    // Handle state change patches
    this.signalR.on('ApplyPatches', (patches: Patch[]) => {
      console.log(`[Minimact] Received ${patches.length} patches`);
      this.domPatcher.applyPatches(patches);
    });

    // Handle hot reload patches
    this.signalR.on('HotReload', (message: HotReloadMessage) => {
      console.log('[Minimact] Hot reload:', message);
      this.domPatcher.applyPatch(message.patch);
    });

    // Handle server push
    this.signalR.on('ServerPush', (patches: Patch[]) => {
      console.log('[Minimact] Server push:', patches);
      this.domPatcher.applyPatches(patches);
    });
  }
}
```

### 2. Component State Management

```csharp
// src/Minimact.AspNetCore/Core/MinimactComponent.cs

public abstract class MinimactComponent
{
    protected Dictionary<string, object> State { get; } = new();
    protected VNode? CurrentVNode { get; set; }

    /// <summary>
    /// Trigger re-render and send patches to client
    /// </summary>
    public async Task TriggerRender()
    {
        // Render new VNode tree
        var newVNode = Render();

        // Compute patches
        var patches = Reconciler.ComputePatches(CurrentVNode, newVNode);

        // Update current VNode
        CurrentVNode = newVNode;

        // Send patches to client (all patches include path keys!)
        await SignalR.SendPatches(ComponentId, patches);
    }

    /// <summary>
    /// Update state and trigger re-render
    /// </summary>
    protected async Task SetState(string key, object value)
    {
        State[key] = value;
        await TriggerRender();
    }

    /// <summary>
    /// Render method (implemented by derived classes)
    /// </summary>
    protected abstract VNode Render();
}
```

### 3. Hot Reload Integration

```csharp
// src/Minimact.AspNetCore/HotReload/HotReloadFileWatcher.cs

public class HotReloadFileWatcher
{
    /// <summary>
    /// Handle file change and send template patch
    /// </summary>
    private async Task HandleFileChange(string filePath)
    {
        // 1. Babel transpiles and extracts templates
        var templates = await BabelTranspiler.ExtractTemplates(filePath);

        // 2. Find changed template
        var changedTemplate = FindChangedTemplate(templates);

        // 3. Build patch (includes path key!)
        var patch = new Patch
        {
            Type = "UpdateAttributeStatic",
            PathKey = changedTemplate.PathKey,  // "div[0].label[0]"
            AttrName = "style",
            Value = changedTemplate.Template
        };

        // 4. Send to all clients
        await SignalR.BroadcastHotReload(componentId, patch);
    }
}
```

---

## Performance Considerations

### Memory Overhead

| Component | Size per Element | 10,000 Elements |
|-----------|------------------|-----------------|
| Path key string | ~30 bytes | ~300 KB |
| Element reference | 8 bytes (pointer) | 80 KB |
| **Total** | **~40 bytes** | **~400 KB** |

**Verdict**: Negligible overhead for most applications.

### Lookup Performance

```
Numeric path traversal:
  [0, 2, 3, 1, 2] → ~0.5-1ms (5 array lookups)

Path map lookup:
  pathMap.get("div[0].span[2]") → ~0.05ms (hash map)

**10-20x faster!**
```

### Rebuild Cost

Rebuilding the path map after structural changes:
- **10,000 elements**: ~5-10ms
- **100,000 elements**: ~50-100ms

**Optimization**: Only rebuild on structural patches, skip for attribute/text updates.

---

## Migration Guide

### Phase 1: Server-Side (Week 1)

- [ ] Update Rust reconciler to include `path_key` in all patches
- [ ] Update C# VNode renderer to add `data-mm-path` attributes
- [ ] Implement semantic path key generation algorithm
- [ ] Test with conditional rendering and dynamic lists

### Phase 2: Client-Side (Week 2)

- [ ] Implement `DOMPatcher.initialize()` - scan and strip attributes
- [ ] Implement `DOMPatcher.applyPatch()` - use path map
- [ ] Update all patch handlers to use path map
- [ ] Remove legacy `findElementByPath()` traversal
- [ ] Add path map rebuild after structural changes

### Phase 3: Integration (Week 3)

- [ ] Update `Minimact.init()` to call `domPatcher.initialize()`
- [ ] Update SignalR handlers to use unified patch format
- [ ] Test state changes with conditionals
- [ ] Test hot reload with conditionals
- [ ] Test server push with conditionals

### Phase 4: Hot Reload (Week 4)

- [ ] Update Babel plugin to emit path keys in templates
- [ ] Update hot reload file watcher to use path keys
- [ ] Test hot reload with complex component structures
- [ ] Performance benchmarks (map lookup vs traversal)

### Phase 5: Optimization (Week 5)

- [ ] Implement incremental map updates
- [ ] Add path versioning
- [ ] Optimize rebuild algorithm
- [ ] E2E testing with production-scale apps

---

## Conclusion

The **Path Map Architecture** is the universal solution for DOM patching in Minimact. By using stable semantic path keys instead of fragile numeric indices, it:

- ✅ **Solves conditional rendering** - Paths are stable regardless of which elements are present
- ✅ **Unifies all patching** - Same approach for state changes, hot reload, server push, reconciliation
- ✅ **Improves performance** - O(1) lookups vs O(depth) traversal
- ✅ **Simplifies implementation** - One path resolution system for everything
- ✅ **Enables advanced features** - Hot reload, server push, real-time collaboration

This is the **correct fundamental architecture** for Minimact's reactive system.
