# Preact Internals - Overview

## Introduction

Preact is a lightweight alternative to React with the same modern API. This documentation series explains how Preact works internally by examining its source code.

## Architecture Overview

Preact's architecture consists of several key subsystems:

```
┌─────────────────────────────────────────────────┐
│                   User Code                     │
│            (JSX/Components/Hooks)               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│              createElement()                    │
│         Transforms JSX to VNodes                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│               render()                          │
│      Entry point for rendering VNodes           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│                diff()                           │
│    Reconciliation algorithm - compares old      │
│    and new VNode trees and updates DOM          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│            commitRoot()                         │
│      Executes effects and callbacks             │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Virtual Nodes (VNodes)

VNodes are lightweight JavaScript objects that represent DOM elements or components. They form a tree structure that mirrors the DOM.

**Structure** (from `src/create-element.js`):
```javascript
{
  type,           // string (element) or function (component)
  props,          // attributes and children
  key,            // unique identifier for list items
  ref,            // reference to actual DOM or component instance
  _children,      // child VNodes
  _parent,        // parent VNode
  _depth,         // depth in tree (for optimization)
  _dom,           // actual DOM node
  _component,     // component instance (if component VNode)
  _original,      // unique ID for tracking
  _index,         // index in parent's children
  _flags          // bit flags for state
}
```

### 2. Components

Components come in two forms:

**Function Components**: Simple functions that receive props and return VNodes
```javascript
function MyComponent(props) {
  return <div>{props.text}</div>;
}
```

**Class Components**: Classes that extend `BaseComponent` and have lifecycle methods
```javascript
class MyComponent extends Component {
  render() {
    return <div>{this.props.text}</div>;
  }
}
```

### 3. The Diff Algorithm

The diff algorithm (in `src/diff/`) is the heart of Preact. It:
1. Compares old and new VNode trees
2. Determines minimal DOM changes needed
3. Updates components and DOM elements
4. Manages component lifecycle

### 4. Render Pipeline

**Phase 1: JSX → VNodes**
```jsx
<div className="app">
  <MyComponent text="Hello" />
</div>
```
↓ Babel transforms to:
```javascript
createElement('div', {className: 'app'},
  createElement(MyComponent, {text: 'Hello'})
)
```
↓ Creates VNode tree

**Phase 2: Reconciliation (diff)**
- Compare new VNode tree with previous tree
- Instantiate/update components
- Call lifecycle methods
- Determine DOM operations

**Phase 3: Commit**
- Apply DOM changes
- Call refs
- Execute effects

## Key Files

| File | Purpose |
|------|---------|
| `src/create-element.js` | VNode creation (JSX compilation target) |
| `src/render.js` | Entry point for rendering |
| `src/component.js` | Component base class and lifecycle |
| `src/diff/index.js` | Main reconciliation algorithm |
| `src/diff/children.js` | Children diffing with keys |
| `src/diff/props.js` | Prop diffing and DOM updates |
| `src/options.js` | Hook system for devtools/extensions |
| `src/constants.js` | Bit flags and constants |
| `hooks/src/index.js` | Hooks implementation (useState, useEffect, etc.) |

## Performance Optimizations

1. **Bit Flags**: Uses bitwise operations for component and VNode state
2. **Object Reuse**: Reuses VNode objects when possible
3. **Shallow Comparison**: Uses `===` for prop comparison
4. **Microtask Queue**: Batches updates using `queueMicrotask`
5. **Key-based Reconciliation**: Efficient list updates using keys

## Next Documents

1. **VNode System** - Deep dive into VNode structure and creation
2. **Component Lifecycle** - Component instantiation and lifecycle methods
3. **Diff Algorithm** - How reconciliation works
4. **Hooks Implementation** - useState, useEffect, and custom hooks
5. **Props and State** - Data flow through the tree
6. **Context API** - Cross-component data sharing
7. **Refs** - Accessing DOM nodes and component instances
