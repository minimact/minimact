# Preact Internals - The Diff Algorithm

## Overview

The diff (reconciliation) algorithm is the core of Preact. It compares old and new VNode trees and determines the minimal set of DOM operations needed to transform the UI from one state to another.

## Main Diff Entry Point

From `src/diff/index.js`, the `diff()` function signature (lines 57-69):

```javascript
function diff(
  parentDom,          // Parent DOM element
  newVNode,           // New VNode to render
  oldVNode,           // Previous VNode (or EMPTY_OBJ)
  globalContext,      // Context object
  namespace,          // 'svg', 'math', or HTML
  excessDomChildren,  // Existing DOM children (hydration)
  commitQueue,        // Components with effects
  oldDom,             // DOM node to insert before
  isHydrating,        // Whether hydrating from SSR
  refQueue,           // Refs to process
  doc                 // Document object
)
```

## Diff Flow

### High-Level Process

```
1. Check VNode type (Component vs DOM Element)
2. If Component:
   - Instantiate or reuse component instance
   - Run lifecycle methods
   - Call render()
   - Diff returned children
3. If DOM Element:
   - Create or update DOM node
   - Diff props/attributes
   - Diff children
4. Return next DOM sibling
```

### Component VNode Diff

From `src/diff/index.js`, lines 92-382:

**Step 1: Component Instantiation or Reuse**

```javascript
if (oldVNode._component) {
  // Reuse existing component
  c = newVNode._component = oldVNode._component;
} else {
  // Create new component
  if (isClassComponent) {
    newVNode._component = c = new newType(newProps, componentContext);
  } else {
    // Function component wrapped in BaseComponent
    newVNode._component = c = new BaseComponent(newProps, componentContext);
    c.constructor = newType;
    c.render = doRender;
  }

  // Initialize
  c.props = newProps;
  if (!c.state) c.state = {};
  c.context = componentContext;
  c._bits |= COMPONENT_DIRTY;
  c._renderCallbacks = [];
  c._stateCallbacks = [];
}
```

**Step 2: Lifecycle Methods**

```javascript
// getDerivedStateFromProps
if (isClassComponent && newType.getDerivedStateFromProps != null) {
  if (c._nextState == c.state) {
    c._nextState = assign({}, c.state);
  }
  assign(c._nextState, newType.getDerivedStateFromProps(newProps, c._nextState));
}

// componentWillReceiveProps (legacy)
if (
  !isNew &&
  newType.getDerivedStateFromProps == null &&
  newProps !== oldProps &&
  c.componentWillReceiveProps != null
) {
  c.componentWillReceiveProps(newProps, componentContext);
}

// shouldComponentUpdate
if (
  (!(c._bits & COMPONENT_FORCE) &&
    c.shouldComponentUpdate != null &&
    c.shouldComponentUpdate(newProps, c._nextState, componentContext) === false) ||
  newVNode._original == oldVNode._original
) {
  // Skip render - reuse old children
  c.props = newProps;
  c.state = c._nextState;
  c._bits &= ~COMPONENT_DIRTY;
  newVNode._dom = oldVNode._dom;
  newVNode._children = oldVNode._children;
  break outer;  // Exit diff early
}
```

**Step 3: Render and Diff Children**

```javascript
// Assign props before render
c.context = componentContext;
c.props = newProps;
c._parentDom = parentDom;
c._bits &= ~COMPONENT_FORCE;

if (isClassComponent) {
  c.state = c._nextState;
  c._bits &= ~COMPONENT_DIRTY;
  tmp = c.render(c.props, c.state, c.context);
} else {
  // Function component with loop for setState-in-render
  do {
    c._bits &= ~COMPONENT_DIRTY;
    tmp = c.render(c.props, c.state, c.context);
    c.state = c._nextState;
  } while (c._bits & COMPONENT_DIRTY && ++count < 25);
}

// Handle Fragment hoisting
let isTopLevelFragment = tmp != null && tmp.type === Fragment && tmp.key == null;
if (isTopLevelFragment) {
  tmp = tmp.props.children;  // Hoist Fragment children up
}

// Diff children
oldDom = diffChildren(
  parentDom,
  isArray(tmp) ? tmp : [tmp],
  newVNode,
  oldVNode,
  globalContext,
  namespace,
  excessDomChildren,
  commitQueue,
  oldDom,
  isHydrating,
  refQueue,
  doc
);
```

### DOM Element VNode Diff

For DOM elements (string type), the process is different:

```javascript
else {
  oldDom = newVNode._dom = diffElementNodes(
    oldVNode._dom,
    newVNode,
    oldVNode,
    globalContext,
    namespace,
    excessDomChildren,
    commitQueue,
    isHydrating,
    refQueue,
    doc
  );
}
```

**diffElementNodes** (from `src/diff/props.js`):
1. Create DOM element if needed
2. Diff and update properties/attributes
3. Diff children
4. Return DOM node

## Children Diffing

The children diffing algorithm is the most complex part. It's in `src/diff/children.js`.

### Algorithm Steps

From `src/diff/children.js`, lines 45-147:

**Step 1: Construct New Children Array**

```javascript
// Normalize and prepare children for diffing
oldDom = constructNewChildrenArray(
  newParentVNode,
  renderResult,
  oldChildren,
  oldDom,
  newChildrenLength
);
```

This function (lines 154-335):
1. Normalizes children (strings → text VNodes, arrays → Fragments)
2. Matches new children with old children
3. Handles VNode reuse and cloning
4. Marks nodes for insertion/deletion

**Step 2: Diff Each Child**

```javascript
for (i = 0; i < newChildrenLength; i++) {
  childVNode = newParentVNode._children[i];
  if (childVNode == null) continue;

  // Get matching old VNode (or EMPTY_OBJ if none)
  if (childVNode._index == -1) {
    oldVNode = EMPTY_OBJ;
  } else {
    oldVNode = oldChildren[childVNode._index] || EMPTY_OBJ;
  }

  childVNode._index = i;  // Update to final index

  // Recursively diff
  let result = diff(
    parentDom,
    childVNode,
    oldVNode,
    globalContext,
    namespace,
    excessDomChildren,
    commitQueue,
    oldDom,
    isHydrating,
    refQueue,
    doc
  );

  // Handle DOM insertion
  newDom = childVNode._dom;
  let shouldPlace = childVNode._flags & INSERT_VNODE;
  if (shouldPlace || oldVNode._children === childVNode._children) {
    oldDom = insert(childVNode, oldDom, parentDom, shouldPlace);
  } else if (typeof childVNode.type == 'function' && result !== undefined) {
    oldDom = result;
  } else if (newDom) {
    oldDom = newDom.nextSibling;
  }

  // Clear flags
  childVNode._flags &= ~(INSERT_VNODE | MATCHED);
}
```

### Key-Based Reconciliation

From `src/diff/children.js`, the `findMatchingIndex` function (lines 337-417):

This is how Preact matches old and new children efficiently:

```javascript
function findMatchingIndex(
  childVNode,
  oldChildren,
  skewedIndex,
  remainingOldChildren
) {
  const key = childVNode.key;
  const type = childVNode.type;
  let i = skewedIndex;

  // 1. Check skewed position first (optimization for common case)
  if (oldChildren[i] === null ||
      (oldChildren[i] &&
       oldChildren[i].key == key &&
       oldChildren[i].type === type)) {
    return i;
  }

  // 2. If key exists, search by key
  if (key != null) {
    for (i = 0; i < oldChildrenLength; i++) {
      if (oldChildren[i] &&
          oldChildren[i].key == key &&
          oldChildren[i].type === type) {
        return i;
      }
    }
  }

  // 3. Search by type (no key)
  else {
    for (i = 0; i < oldChildrenLength; i++) {
      if (oldChildren[i] &&
          oldChildren[i].key == null &&
          oldChildren[i].type === type) {
        return i;
      }
    }
  }

  return -1;  // No match found
}
```

**Matching Priority:**
1. Same position (skewed for shifts)
2. Same key + type (if key exists)
3. Same type, no key

**Why Keys Matter:**

Without keys:
```jsx
// Old:     [<div>A</div>, <div>B</div>]
// New:     [<div>B</div>, <div>A</div>]
// Result:  Updates both div's content (2 DOM ops)
```

With keys:
```jsx
// Old:     [<div key="A">A</div>, <div key="B">B</div>]
// New:     [<div key="B">B</div>, <div key="A">A</div>]
// Result:  Moves DOM nodes (1 DOM op)
```

### Skew Algorithm

The "skew" optimization (lines 254-314) handles common patterns:

**Concept:** Track expected position offset as we diff

```
Example: [0, 1, 2, 3] → [0, 1, 9, 2, 3]

i=0: Find 0 at pos 0, skew=0 ✓
i=1: Find 1 at pos 1, skew=0 ✓
i=2: Find 9 not in old, skew-- (now -1), mark INSERT
i=3: Find 2 at pos 2, expected pos (3-1)=2 ✓
i=4: Find 3 at pos 3, expected pos (4-1)=3 ✓
```

**Optimization**: Most changes are:
- Additions at end/beginning
- Removals from end/beginning
- Small shifts

Skew tracks this efficiently without full search.

## Prop Diffing

From `src/diff/props.js`, the `diffProps` function:

```javascript
function diffProps(dom, newProps, oldProps, namespace, isSvg) {
  let i;

  // Remove old props
  for (i in oldProps) {
    if (i !== 'children' && i !== 'key' && !(i in newProps)) {
      setProperty(dom, i, null, oldProps[i], namespace, isSvg);
    }
  }

  // Set new/changed props
  for (i in newProps) {
    if (
      ((!i || i[0] === 'o' && i[1] === 'n') || i === 'value' || i === 'checked' || i === 'selected') &&
      i !== 'children' &&
      i !== 'key' &&
      oldProps[i] != newProps[i]
    ) {
      setProperty(dom, i, newProps[i], oldProps[i], namespace, isSvg);
    }
  }
}
```

**Key Points:**
1. Remove props not in new props
2. Update changed props
3. Special handling for events (on*), value, checked, selected
4. Skip 'children' and 'key' (handled elsewhere)

### setProperty

Sets individual prop/attribute:

```javascript
function setProperty(dom, name, value, oldValue, namespace, isSvg) {
  name = isSvg && name != 'className' && name in ENCODED_ENTITIES ? name : name.replace(/^xlink:?/, '');

  // className → class for SVG/HTML
  if (name == 'className') name = isSvg ? 'class' : 'className';

  if (name === 'style') {
    // Handle style object
    if (typeof value == 'object') {
      if (typeof oldValue != 'object') {
        dom.style.cssText = value ? '' : oldValue;
        oldValue = null;
      }
      for (let i in value) {
        if (!oldValue || value[i] !== oldValue[i]) {
          dom.style[i] = value[i] == null ? '' : value[i];
        }
      }
      for (let i in oldValue) {
        if (!(i in value)) {
          dom.style[i] = '';
        }
      }
    } else {
      dom.style.cssText = value;
    }
  }
  // Event handlers
  else if (name[0] === 'o' && name[1] === 'n') {
    let useCapture = name !== (name = name.replace(/Capture$/, ''));
    let nameLower = name.toLowerCase();
    name = nameLower in dom ? nameLower : name.slice(2);

    if (value) {
      if (!oldValue) {
        dom.addEventListener(name, eventProxy, useCapture);
      }
    } else {
      dom.removeEventListener(name, eventProxy, useCapture);
    }

    (dom._listeners || (dom._listeners = {}))[name] = value;
  }
  // Dangerously set inner HTML
  else if (name === 'dangerouslySetInnerHTML') {
    if (value) dom.innerHTML = value.__html || '';
  }
  // Properties vs attributes
  else if (name !== 'list' && name !== 'form' && !isSvg && name in dom) {
    dom[name] = value == null ? '' : value;
  }
  // Attributes
  else if (typeof value != 'function' && name !== 'dangerouslySetInnerHTML') {
    if (value == null || value === false) {
      dom.removeAttribute(name);
    } else {
      dom.setAttribute(name, value);
    }
  }
}
```

## Commit Phase

After diff completes, the commit phase runs (from `src/diff/index.js`, lines 415-455):

```javascript
export function commitRoot(commitQueue, root, refQueue) {
  // Apply refs
  for (let i = 0; i < refQueue.length; i++) {
    applyRef(refQueue[i], refQueue[++i], refQueue[++i]);
  }

  // Call option hook
  if (options._commit) options._commit(root, commitQueue);

  // Run lifecycle callbacks
  commitQueue.some(c => {
    try {
      commitQueue = c._renderCallbacks;
      c._renderCallbacks = [];
      commitQueue.some(cb => {
        cb.call(c);
      });
    } catch (e) {
      options._catchError(e, c._vnode);
    }
  });
}
```

**Order:**
1. Apply all refs
2. Call devtools hook
3. Execute `componentDidMount` / `componentDidUpdate` callbacks

## Optimization Techniques

### 1. Bit Flags

State tracked with bitwise operations:

```javascript
// Mark for insertion
childVNode._flags |= INSERT_VNODE;

// Check if marked
if (childVNode._flags & INSERT_VNODE) { }

// Clear flag
childVNode._flags &= ~INSERT_VNODE;
```

Faster than multiple boolean properties.

### 2. Early Bailout

```javascript
if (newVNode._original == oldVNode._original) {
  // Same VNode, skip diff
  c.props = newProps;
  c.state = c._nextState;
  newVNode._dom = oldVNode._dom;
  newVNode._children = oldVNode._children;
  break outer;
}
```

### 3. Shallow Comparison

```javascript
// Props compared with ===
oldProps[i] != newProps[i]

// shouldComponentUpdate default behavior
this.props === nextProps && this.state === nextState
```

### 4. Depth Sorting

Render queue sorted by tree depth:

```javascript
rerenderQueue.sort((a, b) => a._vnode._depth - b._vnode._depth);
```

Ensures parents render before children.

### 5. Microtask Batching

Updates batched in single microtask:

```javascript
queueMicrotask(() => {
  // Process all updates at once
  processRenderQueue();
});
```

Multiple `setState` calls → single render.

## Summary

**Diff Algorithm Flow:**
1. Compare newVNode vs oldVNode
2. For components: lifecycle → render → diff children
3. For elements: diff props → diff children
4. Use keys for efficient list reconciliation
5. Track state with bit flags
6. Commit refs and effects after diff

**Key Optimizations:**
- Skew algorithm for common list patterns
- Key-based matching for lists
- Shallow prop comparison
- Bit flags for state
- Microtask batching
- Depth-sorted render queue
- Early bailout for unchanged VNodes

The diff algorithm is highly optimized for common patterns while handling edge cases correctly. It balances code size, performance, and correctness.
