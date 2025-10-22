# Preact Internals - VNode System

## What is a VNode?

A VNode (Virtual Node) is a plain JavaScript object that describes what should be rendered. It's a lightweight representation of a DOM element or component.

## VNode Structure

From `src/create-element.js`, lines 51-65:

```javascript
const vnode = {
  type,           // Type of node
  props,          // Properties/attributes
  key,            // Unique key for reconciliation
  ref,            // Reference callback
  _children: null,      // Array of child VNodes
  _parent: null,        // Parent VNode
  _depth: 0,           // Tree depth (optimization)
  _dom: null,          // Actual DOM node reference
  _component: null,    // Component instance (if applicable)
  constructor: undefined,  // Always undefined (security)
  _original: ++vnodeId,    // Unique ID
  _index: -1,          // Index in parent's children array
  _flags: 0            // Bit flags for state
};
```

### Field Breakdown

#### Public Fields

**`type`**
- For DOM elements: string like `'div'`, `'span'`, `'button'`
- For components: the component function or class
- For text nodes: `null`

**`props`**
- Object containing all attributes/properties
- Includes `children` property for child nodes
- Example: `{className: 'btn', onClick: handler, children: [...]}`

**`key`**
- Optional unique identifier (string or number)
- Used for efficient list reconciliation
- Example: `<div key="item-1">...</div>` → `key: "item-1"`

**`ref`**
- Callback function or ref object
- Called with DOM node or component instance after mount
- Example: `<div ref={node => this.div = node}>`

#### Internal Fields (prefixed with `_`)

**`_children`**
- Array of child VNodes
- `null` initially, populated during diff
- Flattened from `props.children`

**`_parent`**
- Reference to parent VNode
- Used to traverse tree upward
- `null` for root VNode

**`_depth`**
- How deep in the tree this VNode is (root = 0)
- Used to sort render queue by depth
- Ensures parents render before children

**`_dom`**
- Reference to actual DOM node
- `null` for component VNodes (they don't have direct DOM)
- Used to find where to insert new nodes

**`_component`**
- Component instance for component VNodes
- `null` for DOM element VNodes
- Holds state, props, and lifecycle methods

**`_original`**
- Unique incrementing ID for this VNode
- Used to detect if VNode has changed identity
- Helps with shouldComponentUpdate optimization

**`_index`**
- Position in parent's `_children` array
- Used during diff to match old and new children
- Updated as children are reordered

**`_flags`**
- Bitwise flags for VNode state
- From `src/constants.js`:
  - `MODE_HYDRATE` (1 << 5): Hydrating from SSR
  - `MODE_SUSPENDED` (1 << 7): Suspended on previous render
  - `INSERT_VNODE` (1 << 2): Needs insertion during patch
  - `MATCHED` (1 << 1): Matched with old VNode in diff
  - `FORCE_PROPS_REVALIDATE` (1 << 0): Props must revalidate

## VNode Creation

### createElement (JSX Target)

From `src/create-element.js`, lines 16-33:

```javascript
function createElement(type, props, children) {
  let normalizedProps = {},
    key,
    ref,
    i;

  // Extract key and ref from props
  for (i in props) {
    if (i == 'key') key = props[i];
    else if (i == 'ref' && typeof type != 'function') ref = props[i];
    else normalizedProps[i] = props[i];
  }

  // Handle children arguments
  if (arguments.length > 2) {
    normalizedProps.children =
      arguments.length > 3 ? slice.call(arguments, 2) : children;
  }

  return createVNode(type, normalizedProps, key, ref, null);
}
```

**Key Points:**
1. `key` and `ref` are extracted from props
2. For component VNodes, `ref` stays in props (handled differently)
3. Multiple children arguments are collected into array
4. Delegates to `createVNode` for actual creation

### JSX Transformation Example

**Input JSX:**
```jsx
<div className="container" key="main">
  <h1>Title</h1>
  <p>Content</p>
</div>
```

**Babel Output:**
```javascript
createElement(
  'div',
  { className: 'container', key: 'main' },
  createElement('h1', null, 'Title'),
  createElement('p', null, 'Content')
)
```

**Resulting VNode Tree:**
```javascript
{
  type: 'div',
  props: {
    className: 'container',
    children: [
      {
        type: 'h1',
        props: { children: ['Title'] },
        key: null,
        ...
      },
      {
        type: 'p',
        props: { children: ['Content'] },
        key: null,
        ...
      }
    ]
  },
  key: 'main',
  ref: null,
  _children: null, // Will be populated during diff
  ...
}
```

### createVNode (Internal)

From `src/create-element.js`, lines 47-71:

```javascript
function createVNode(type, props, key, ref, original) {
  const vnode = {
    type,
    props,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    _component: null,
    constructor: undefined,
    _original: original == null ? ++vnodeId : original,
    _index: -1,
    _flags: 0
  };

  // Call options.vnode hook for devtools
  if (original == null && options.vnode != null) {
    options.vnode(vnode);
  }

  return vnode;
}
```

**Key Points:**
1. Creates plain object with fixed shape (V8 optimization)
2. `constructor: undefined` prevents JSON injection attacks
3. `original` parameter used for cloning VNodes (reusing ID)
4. `options.vnode` hook allows devtools to track VNode creation

## VNode Types

### 1. DOM Element VNodes

```javascript
{
  type: 'div',  // HTML tag name
  props: { className: 'app', onClick: handler },
  _children: [...child VNodes...],
  _dom: <actual DOM element>,
  _component: null
}
```

### 2. Component VNodes

```javascript
{
  type: MyComponent,  // Component function/class
  props: { text: 'Hello', count: 5 },
  _children: null,  // Components manage own children
  _dom: null,  // Components don't have direct DOM
  _component: <component instance>
}
```

### 3. Text VNodes

Text is handled specially - no VNode created, just raw string/number in children array:

```javascript
{
  type: 'div',
  props: {
    children: ['Hello ', 'World']  // Text as strings
  }
}
```

### 4. Fragment VNodes

```jsx
<>
  <div>One</div>
  <div>Two</div>
</>
```

```javascript
{
  type: Fragment,  // Special Fragment function
  props: {
    children: [divVNode1, divVNode2]
  }
}
```

Fragment function (lines 77-79):
```javascript
export function Fragment(props) {
  return props.children;  // Just returns children, no wrapper
}
```

## VNode Lifecycle

### 1. Creation
```
JSX → createElement() → createVNode() → VNode object
```

### 2. First Render
```
VNode → diff() → DOM creation → _dom field populated
```

### 3. Update
```
New VNode → diff(newVNode, oldVNode) → DOM updates
```

### 4. Unmount
```
Remove from tree → unmount callbacks → DOM removal
```

## VNode Cloning

VNodes are sometimes cloned to create new instances with shared identity:

```javascript
const newVNode = assign({}, oldVNode);
newVNode._original = oldVNode._original + 1;
```

Used in:
- Re-renders (line 136 in `diff/index.js`)
- Maintaining VNode identity while creating new diff target

## Special Cases

### null/undefined/boolean Children

These are ignored and don't create VNodes:

```jsx
<div>
  {true}
  {false}
  {null}
  {undefined}
</div>
```

All four children are skipped during rendering.

### Fragments in JSX

```jsx
<div>
  <>{items.map(item => <Item key={item.id} />)}</>
</div>
```

The Fragment's children are hoisted up to parent, so `<div>` directly contains Item VNodes.

## Performance Considerations

### Object Shape Consistency

VNodes always have the same shape (same properties in same order). This allows V8 to optimize:
- Property access is faster (hidden classes)
- Memory layout is predictable
- Fewer deoptimizations

### Bit Flags

Using bit flags for state is faster than multiple boolean properties:
```javascript
// Fast: Single number, bitwise operations
_flags |= MODE_HYDRATE;
if (_flags & MODE_HYDRATE) { }

// Slower: Multiple boolean properties
_isHydrating = true;
if (_isHydrating) { }
```

### VNode Reuse

When `_original` ID is reused, Preact knows the VNode represents the same conceptual node, enabling:
- Faster prop comparison
- Component instance preservation
- Reduced GC pressure

## Summary

VNodes are the foundation of Preact's virtual DOM:
- Lightweight objects representing UI
- Contain both public API (type, props, key, ref) and internal state (_children, _dom, etc.)
- Created by `createElement` from JSX
- Form a tree structure mirroring the desired DOM
- Diffed against previous tree to determine minimal DOM updates
- Performance optimized through consistent object shapes and bit flags
