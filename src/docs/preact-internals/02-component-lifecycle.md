# Preact Internals - Component Lifecycle

## Component Types

Preact supports two types of components:

### 1. Function Components

Simple functions that receive props and return VNodes:

```javascript
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

### 2. Class Components

Classes extending `BaseComponent` with lifecycle methods:

```javascript
class Welcome extends Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

## BaseComponent Class

From `src/component.js`, lines 19-23:

```javascript
export function BaseComponent(props, context) {
  this.props = props;
  this.context = context;
  this._bits = 0;
}
```

### Component Instance Structure

```javascript
{
  props,              // Current props
  state,              // Current state
  context,            // Context from providers
  _bits,              // Status flags (DIRTY, FORCE, etc.)
  _nextState,         // Pending state changes
  _vnode,             // Associated VNode
  _parentDom,         // Parent DOM element
  _globalContext,     // Full context object
  _renderCallbacks,   // Effects to run after render
  _stateCallbacks,    // Callbacks from setState
  // ... other internal fields
}
```

### Component Bit Flags

From `src/constants.js`, lines 13-21:

```javascript
COMPONENT_PROCESSING_EXCEPTION = 1 << 0  // Handling error
COMPONENT_PENDING_ERROR       = 1 << 1  // Has pending error
COMPONENT_FORCE              = 1 << 2  // Force update (skip sCU)
COMPONENT_DIRTY              = 1 << 3  // Needs re-render
```

## Component Instantiation

From `src/diff/index.js`, lines 118-142:

### When VNode is Created

```javascript
if (oldVNode._component) {
  // Reuse existing component instance
  c = newVNode._component = oldVNode._component;
} else {
  // Create new component instance
  if (isClassComponent) {
    // Class component: new MyComponent(props, context)
    newVNode._component = c = new newType(newProps, componentContext);
  } else {
    // Function component: wrap in BaseComponent
    newVNode._component = c = new BaseComponent(newProps, componentContext);
    c.constructor = newType;  // Store function reference
    c.render = doRender;       // Use doRender wrapper
  }

  // Subscribe to context provider
  if (provider) provider.sub(c);

  // Initialize component state
  c.props = newProps;
  if (!c.state) c.state = {};
  c.context = componentContext;
  c._globalContext = globalContext;
  c._bits |= COMPONENT_DIRTY;
  c._renderCallbacks = [];
  c._stateCallbacks = [];
}
```

### Function Component Wrapper

From `src/diff/index.js`, lines 747-749:

```javascript
function doRender(props, state, context) {
  return this.constructor(props, context);
}
```

**Key Points:**
- Function components are wrapped in BaseComponent
- `render()` method calls the actual function: `this.constructor(props)`
- This allows function components to use same pipeline as class components

## Lifecycle Flow

### Mount (First Render)

```
1. VNode created with type = Component
2. Component instantiated: new Component(props, context)
3. getDerivedStateFromProps (if class component)
4. render() called → returns child VNodes
5. Children diffed and mounted
6. componentDidMount called
7. Refs assigned
```

From `src/diff/index.js`, key sections:

**Step 2 - Instantiation** (lines 120-142):
```javascript
newVNode._component = c = new newType(newProps, componentContext);
c.props = newProps;
if (!c.state) c.state = {};
```

**Step 3 - getDerivedStateFromProps** (lines 149-159):
```javascript
if (isClassComponent && newType.getDerivedStateFromProps != null) {
  if (c._nextState == c.state) {
    c._nextState = assign({}, c.state);
  }
  assign(
    c._nextState,
    newType.getDerivedStateFromProps(newProps, c._nextState)
  );
}
```

**Step 4-5 - render() and children** (lines 244-303):
```javascript
if (isClassComponent) {
  c.state = c._nextState;
  c._bits &= ~COMPONENT_DIRTY;
  if (renderHook) renderHook(newVNode);
  tmp = c.render(c.props, c.state, c.context);  // Call render
  // ...
} else {
  do {
    c._bits &= ~COMPONENT_DIRTY;
    if (renderHook) renderHook(newVNode);
    tmp = c.render(c.props, c.state, c.context);  // Call render
    c.state = c._nextState;
  } while (c._bits & COMPONENT_DIRTY && ++count < 25);
}

// Diff children returned from render()
oldDom = diffChildren(
  parentDom,
  isArray(tmp) ? tmp : [tmp],
  newVNode,
  oldVNode,
  // ...
);
```

**Step 6 - componentDidMount** (lines 230-234):
```javascript
if (isClassComponent && c.componentDidUpdate != null) {
  c._renderCallbacks.push(() => {
    c.componentDidUpdate(oldProps, oldState, snapshot);
  });
}
```

Note: `componentDidMount` uses the same `_renderCallbacks` queue on first render.

**Step 7 - Refs** - from `commitRoot()` (lines 416-418):
```javascript
for (let i = 0; i < refQueue.length; i++) {
  applyRef(refQueue[i], refQueue[++i], refQueue[++i]);
}
```

### Update (Re-render)

```
1. setState() or forceUpdate() called
2. Component marked DIRTY, added to render queue
3. Microtask scheduled to process queue
4. getDerivedStateFromProps (static)
5. shouldComponentUpdate (return false = skip)
6. componentWillUpdate
7. render() called → new child VNodes
8. Children diffed and updated
9. getSnapshotBeforeUpdate
10. componentDidUpdate
11. Refs updated
```

**Step 1-3 - setState**

From `src/component.js`, lines 34-61:

```javascript
BaseComponent.prototype.setState = function(update, callback) {
  let s;
  if (this._nextState != null && this._nextState != this.state) {
    s = this._nextState;
  } else {
    s = this._nextState = assign({}, this.state);
  }

  if (typeof update == 'function') {
    update = update(assign({}, s), this.props);
  }

  if (update) {
    assign(s, update);
  } else {
    return;
  }

  if (this._vnode) {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    enqueueRender(this);  // Queue re-render
  }
};
```

**enqueueRender** (lines 209-220):
```javascript
export function enqueueRender(c) {
  if (
    (!(c._bits & COMPONENT_DIRTY) &&
      (c._bits |= COMPONENT_DIRTY) &&
      rerenderQueue.push(c) &&
      !rerenderCount++) ||
    prevDebounce != options.debounceRendering
  ) {
    prevDebounce = options.debounceRendering;
    (prevDebounce || queueMicrotask)(process);  // Schedule
  }
}
```

**process** (lines 229-255):
```javascript
function process() {
  let c, l = 1;

  while (rerenderQueue.length) {
    // Sort by depth (parents before children)
    if (rerenderQueue.length > l) {
      rerenderQueue.sort(depthSort);
    }

    c = rerenderQueue.shift();
    l = rerenderQueue.length;

    if (c._bits & COMPONENT_DIRTY) {
      renderComponent(c);  // Re-render
    }
  }

  rerenderCount = 0;
}
```

**Step 4-5 - Lifecycle checks** (lines 178-224 in diff/index.js):

```javascript
// getDerivedStateFromProps
if (isClassComponent && newType.getDerivedStateFromProps != null) {
  // ... update state
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
  // Skip render - reuse old VNode
  c.props = newProps;
  c.state = c._nextState;
  c._bits &= ~COMPONENT_DIRTY;
  newVNode._dom = oldVNode._dom;
  newVNode._children = oldVNode._children;
  // ... copy state over
  break outer;
}

// componentWillUpdate (legacy)
if (c.componentWillUpdate != null) {
  c.componentWillUpdate(newProps, c._nextState, componentContext);
}
```

**Step 7-8 - render and diff** (same as mount, lines 244-303)

**Step 9-10 - getSnapshotBeforeUpdate and componentDidUpdate** (lines 275-281, 230-234):

```javascript
// Before children diff
if (
  isClassComponent &&
  oldVNode._component &&
  c.getSnapshotBeforeUpdate != null
) {
  snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
}

// After children diff (queued in _renderCallbacks)
if (isClassComponent && c.componentDidUpdate != null) {
  c._renderCallbacks.push(() => {
    c.componentDidUpdate(oldProps, oldState, snapshot);
  });
}
```

### Unmount

```
1. Component removed from tree
2. componentWillUnmount called
3. Children unmounted recursively
4. Refs cleared
5. DOM removed
```

From `src/diff/index.js`, lines 427-512 (unmount function):

```javascript
export function unmount(vnode, parentVNode, skipRemove) {
  let r;
  if ((r = options.unmount)) r(vnode);

  if ((r = vnode.ref)) {
    if (!r.current || r.current === vnode._dom) {
      applyRef(r, null, parentVNode);
    }
  }

  if ((r = vnode._component) != null) {
    // Component unmount
    if (r.componentWillUnmount) {
      try {
        r.componentWillUnmount();
      } catch (e) {
        options._catchError(e, parentVNode);
      }
    }

    r._bits &= FORCE_PROPS_REVALIDATE;
    r._vnode = null;
  }

  if ((r = vnode._children)) {
    // Unmount children
    for (let i = 0; i < r.length; i++) {
      if (r[i]) {
        unmount(
          r[i],
          parentVNode,
          skipRemove || typeof vnode.type != 'string'
        );
      }
    }
  }

  if (!skipRemove && vnode._dom != null) {
    removeNode(vnode._dom);
  }

  vnode._component = vnode._parent = vnode._dom = vnode._children = null;
}
```

## Lifecycle Methods (Class Components)

### Static Methods

**`getDerivedStateFromProps(props, state)`**
- Called before every render (mount and update)
- Returns object to merge into state, or null
- Used for syncing state with props changes
- Replaces `componentWillReceiveProps`

```javascript
static getDerivedStateFromProps(nextProps, prevState) {
  if (nextProps.value !== prevState.value) {
    return { value: nextProps.value };
  }
  return null;
}
```

### Instance Methods

**`shouldComponentUpdate(nextProps, nextState, nextContext)`**
- Called before re-render
- Return `false` to skip render
- Not called on `forceUpdate()` or initial render
- Used for performance optimization

```javascript
shouldComponentUpdate(nextProps, nextState) {
  return this.props.value !== nextProps.value;
}
```

**`componentWillUpdate(nextProps, nextState, nextContext)`** *(legacy)*
- Called before render on update
- Cannot call `setState` here
- Replaced by `getSnapshotBeforeUpdate`

**`render()`**
- Required method
- Returns VNodes describing UI
- Must be pure (no side effects)
- Called on mount and update

```javascript
render() {
  return <div>{this.props.text}</div>;
}
```

**`getSnapshotBeforeUpdate(prevProps, prevState)`**
- Called after render, before DOM mutations
- Return value passed to `componentDidUpdate`
- Used to capture DOM info before change (scroll position, etc.)

```javascript
getSnapshotBeforeUpdate(prevProps, prevState) {
  return this.divRef.scrollTop;
}
```

**`componentDidMount()`**
- Called after component mounted to DOM
- Good place for:
  - Network requests
  - DOM measurements
  - Setting up subscriptions
  - Adding event listeners

```javascript
componentDidMount() {
  this.fetchData();
  window.addEventListener('resize', this.handleResize);
}
```

**`componentDidUpdate(prevProps, prevState, snapshot)`**
- Called after update committed to DOM
- Not called on initial render
- Receives snapshot from `getSnapshotBeforeUpdate`

```javascript
componentDidUpdate(prevProps, prevState, snapshot) {
  if (prevProps.userId !== this.props.userId) {
    this.fetchUser(this.props.userId);
  }
  if (snapshot !== null) {
    this.divRef.scrollTop = snapshot;
  }
}
```

**`componentWillUnmount()`**
- Called before component removed from DOM
- Clean up:
  - Subscriptions
  - Event listeners
  - Timers
  - Cancel network requests

```javascript
componentWillUnmount() {
  window.removeEventListener('resize', this.handleResize);
  clearTimeout(this.timer);
}
```

## Render Queue and Batching

### Microtask Batching

Updates are batched using microtasks for performance:

```javascript
// Multiple setStates in same sync block
this.setState({count: 1});
this.setState({count: 2});
this.setState({count: 3});
// Only renders once with count: 3
```

**How it works:**
1. First `setState` marks component DIRTY and schedules microtask
2. Subsequent `setStates` just update `_nextState`, don't schedule new microtask
3. Microtask runs, processes all dirty components once
4. All state updates merged, single render

### Depth Sorting

Render queue sorted by depth (lines 226, 242-244):

```javascript
const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;

if (rerenderQueue.length > l) {
  rerenderQueue.sort(depthSort);
}
```

**Why?** Parents must render before children to prevent wasted work:
```
Parent renders → new props for Child → Child renders with new props
(If Child rendered first with old props, it would render twice)
```

### Infinite Loop Protection

Function components limited to 25 renders per cycle (lines 256-265):

```javascript
let count = 0;
do {
  c._bits &= ~COMPONENT_DIRTY;
  tmp = c.render(c.props, c.state, c.context);
  c.state = c._nextState;
} while (c._bits & COMPONENT_DIRTY && ++count < 25);
```

If component calls `setState` in render 25 times, it stops.

## Summary

**Component Lifecycle:**
1. Instantiation - `new Component(props, context)`
2. Initial render - `render()` called
3. Mount - `componentDidMount()`
4. Updates - `setState()` → batched re-render
5. Re-render - lifecycle checks → `render()` → `componentDidUpdate()`
6. Unmount - `componentWillUnmount()` → DOM removal

**Key Concepts:**
- Function components wrapped in BaseComponent
- Props always provided at instantiation
- Updates batched in microtask queue
- Render queue sorted by depth
- Component instances preserved across re-renders
- Lifecycle methods allow hooking into render process
