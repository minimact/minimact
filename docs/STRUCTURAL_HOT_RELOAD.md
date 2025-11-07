# Structural Hot Reload - Implementation Plan

**Date**: 2025-01-07
**Status**: 🎯 Planned Enhancement
**Priority**: 🟡 Medium - Current system handles 95% of use cases
**Prerequisite**: Template Patch System (✅ Complete)

---

## Executive Summary

This document outlines the implementation plan for **Structural Hot Reload** - the ability to add, remove, and reorder JSX elements without a page refresh. The current Template Patch System handles content and attribute updates (0.3-2.3ms), but structural changes require a full reload.

### Current Capabilities (✅ Working)

- ✅ Text content updates: `"Quantity112:"` → `"Quantity113:"` (2.3ms)
- ✅ Style updates: `margin-bottom: 20px` → `21px` (0.9ms)
- ✅ Attribute updates: `className`, `style`, `value` (0.3ms)
- ✅ Dynamic binding updates: `{quantity}`, `{price}` (2ms)

### Missing Capabilities (❌ Requires Full Reload)

- ❌ Adding elements: `<option value="Green">Green</option>`
- ❌ Removing elements: Delete a `<div>`
- ❌ Reordering elements: Move items in a list
- ❌ Structural refactors: Wrap elements in new containers

---

## The Problem

When a developer adds a new element:

```tsx
<select>
  <option value="Black">Black</option>
  <option value="White">White</option>
  <option value="Red">Red</option>
  <option value="Blue">Blue</option>
  <option value="Green">Green</option>  {/* ← NEW ELEMENT */}
</select>
```

### What Happens Now (❌ Broken)

1. **Babel transpiles** → Generates template for `10000000.70000000.20000000.50000000`
2. **Server sends patches** → `UpdateTextTemplate` for "Green"
3. **Client looks up path** → Hierarchical index only has 4 children: `[10000000, 20000000, 30000000, 40000000]`
4. **Client fails** → "Element `50000000` not found in DOM"
5. **Developer must refresh** → Full page reload to get new template map

### Console Output
```javascript
[TemplateState] getChildrenAtPath("10000000.70000000.20000000") -> 4 children:
  ['10000000', '20000000', '30000000', '40000000']

[HotReload] Element "50000000" not found in DOM at parent path "10000000.70000000.20000000"
[HotReload] ⚠️ Element not found at path: 10000000.70000000.20000000.50000000
```

---

## The Solution: Source Map + Incremental Transpilation

The key insight is that **Monaco Editor knows where you're typing**, and with a source map, we can:

1. **Map cursor position to hex path** using source ranges
2. **Calculate insertion hex code** using half-gap algorithm
3. **Incrementally transpile** only the new element
4. **Resolve state bindings** against current component state
5. **Send InsertVNode patch** to client with full VNode + template metadata
6. **Update hierarchical index** on client
7. **Insert DOM element** at calculated position

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Monaco Editor                               │
│  - Tracks cursor position (line, column, offset)                    │
│  - Detects content changes                                          │
│  - Loads source map to know hex path at cursor                      │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ onDidChangeModelContent
                 │ { offset: 4950, newCode: '<option>Green</option>' }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Source Map Lookup                              │
│  - Find node containing offset 4950                                 │
│  - Result: inside "10000000.70000000.20000000" (select)            │
│  - Previous sibling: "40000000" (Blue option)                       │
│  - Next sibling: null (end of list)                                 │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ Calculate half-gap hex code
                 │ (40000000 + ∞) / 2 = 50000000
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│               SignalR: IncrementalTranspile                         │
│  {                                                                  │
│    componentId: "ProductDetailsPage",                               │
│    insertion: {                                                     │
│      hexPath: "10000000.70000000.20000000.50000000",               │
│      parentPath: "10000000.70000000.20000000",                     │
│      afterSibling: "40000000",                                      │
│      code: '<option value="Green">Green</option>'                   │
│    }                                                                │
│  }                                                                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    C# Server Processing                             │
│  1. Parse code with Babel → Extract templates + bindings           │
│  2. Resolve bindings against component.State                       │
│  3. Create VElement with evaluated values                          │
│  4. Insert into component.CurrentVNode tree                         │
│  5. Update source map with new node                                 │
│  6. Generate patches (Rust reconciler)                              │
│  7. Send InsertVNode + templates to client                          │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ HotReload:InsertVNode
                 │ { vnode, templates, patches }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Client Hot Reload Handler                         │
│  1. Navigate to parent using hierarchical index                     │
│  2. Create DOM element: <option value="Green">Green</option>        │
│  3. Find insertion position (after sibling 40000000)                │
│  4. Insert into DOM                                                 │
│  5. Update hierarchical index: add 50000000 to children            │
│  6. Update template map: store templates for future updates        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Source Map Generation (Week 1)

**Goal**: Babel plugin generates `.sourcemap.json` with hex paths mapped to source ranges.

#### 1.1 Update Babel Plugin

**File**: `babel-plugin-minimact/src/generators/sourcemap.cjs`

```javascript
/**
 * Generate source map during transpilation
 * Maps hex paths to source code locations
 */
function generateSourceMap(ast, componentName, filePath) {
  const sourceMap = {
    component: componentName,
    version: '1.0',
    sourceFile: filePath,
    generatedAt: Date.now(),
    nodes: {}
  };

  let pathStack = [];
  let hexCodeCounter = { value: 1 };

  traverse(ast, {
    JSXElement(path) {
      const node = path.node;
      const tagName = getTagName(node);

      // Calculate hex path for this node
      const depth = pathStack.length;
      const hexCode = (hexCodeCounter.value * 0x10000000).toString(16).padStart(8, '0');
      const fullHexPath = pathStack.length > 0
        ? [...pathStack, hexCode].join('.')
        : hexCode;

      // Get parent path
      const parentPath = pathStack.length > 0 ? pathStack.join('.') : '';

      // Find next sibling
      const parent = path.parentPath;
      const siblings = parent?.node?.children?.filter(c => c.type === 'JSXElement') || [];
      const currentIndex = siblings.indexOf(node);
      const nextSibling = currentIndex < siblings.length - 1
        ? siblings[currentIndex + 1]
        : null;
      const nextSiblingHex = nextSibling
        ? ((hexCodeCounter.value + 1) * 0x10000000).toString(16).padStart(8, '0')
        : null;

      // Store node metadata
      sourceMap.nodes[fullHexPath] = {
        hexPath: fullHexPath,
        parentPath: parentPath,
        tagName: tagName,
        sourceStart: {
          line: node.loc.start.line,
          column: node.loc.start.column,
          offset: node.start
        },
        sourceEnd: {
          line: node.loc.end.line,
          column: node.loc.end.column,
          offset: node.end
        },
        childIndex: currentIndex,
        nextSiblingPath: nextSibling ? `${parentPath}.${nextSiblingHex}` : null
      };

      // Traverse children
      pathStack.push(hexCode);
      hexCodeCounter.value = 1;
      path.traverse(this);
      pathStack.pop();

      hexCodeCounter.value++;
    }
  });

  return sourceMap;
}

// Export source map alongside templates
function generateOutputFiles(ast, outputPath) {
  const componentName = getComponentName(ast);
  const templates = generateTemplates(ast);
  const sourceMap = generateSourceMap(ast, componentName, outputPath);

  // Write templates.json
  fs.writeFileSync(
    `${outputPath}.templates.json`,
    JSON.stringify(templates, null, 2)
  );

  // Write sourcemap.json
  fs.writeFileSync(
    `${outputPath}.sourcemap.json`,
    JSON.stringify(sourceMap, null, 2)
  );

  console.log(`✅ Generated templates and source map for ${componentName}`);
}
```

#### 1.2 Source Map Schema (Relative/Hierarchical)

**File**: `docs/SOURCE_MAP_SCHEMA.md`

**CRITICAL DESIGN**: The source map uses **relative ranges** that are self-contained and navigable like a tree. Each node knows its position **relative to its parent**, not absolute file offsets. This makes the map resilient to edits - changing one node doesn't invalidate others.

```typescript
interface SourceMap {
  component: string;           // "ProductDetailsPage"
  version: string;             // "1.0"
  sourceFile: string;          // "ProductDetailsPage.tsx"
  generatedAt: number;         // Unix timestamp
  rootNode: SourceMapNode;     // Tree root (component function)
}

interface SourceMapNode {
  hexPath: string;             // "10000000.70000000.20000000.40000000"
  tagName: string;             // "option"

  // RELATIVE position within parent's content
  relativeStart: number;       // Character offset from parent's opening tag
  relativeEnd: number;         // Character offset from parent's opening tag

  // Children array (hierarchical navigation)
  children: SourceMapNode[];

  // Sibling navigation
  childIndex: number;          // Position among siblings (0-based)
  nextSibling?: SourceMapNode; // Direct reference to next sibling
  prevSibling?: SourceMapNode; // Direct reference to previous sibling

  // Parent reference for upward navigation
  parent?: SourceMapNode;
}
```

### Why Relative Ranges?

**Problem with Absolute Offsets:**
```typescript
// File: ProductDetailsPage.tsx (absolute offsets)
{
  "10000000.70000000.20000000.10000000": {
    offset: 4800,  // Character 4800 in file
    end: 4840
  },
  "10000000.70000000.20000000.20000000": {
    offset: 4850,  // Character 4850 in file
    end: 4890
  }
}

// User edits line 100 (before the select) - adds 50 characters
// ❌ ALL offsets after line 100 are now WRONG!
// Need to recalculate entire source map
```

**Solution with Relative Ranges:**
```typescript
// Root node (component function)
{
  hexPath: "",
  tagName: "component",
  relativeStart: 0,
  relativeEnd: 5000,
  children: [
    {
      hexPath: "10000000",
      tagName: "div",
      relativeStart: 0,    // 0 characters from parent's opening tag
      relativeEnd: 4500,   // 4500 characters span
      children: [
        {
          hexPath: "10000000.70000000",
          tagName: "div",
          relativeStart: 2000,  // 2000 chars from parent div's start
          relativeEnd: 300,     // 300 char span
          children: [
            {
              hexPath: "10000000.70000000.20000000",
              tagName: "select",
              relativeStart: 50,   // 50 chars from parent div's start
              relativeEnd: 200,    // 200 char span
              children: [
                {
                  hexPath: "10000000.70000000.20000000.10000000",
                  tagName: "option",
                  relativeStart: 10,  // 10 chars from select's opening tag
                  relativeEnd: 40,    // 40 char span
                  children: []
                },
                {
                  hexPath: "10000000.70000000.20000000.20000000",
                  tagName: "option",
                  relativeStart: 50,  // 50 chars from select's opening tag
                  relativeEnd: 40,
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

// User edits line 100 (before the select)
// ✅ ONLY the path from root → select needs recalculation
// ✅ Sibling options unaffected!
```

### Navigating the Relative Source Map

To find the cursor position, navigate the tree from root to target:

```typescript
function findNodeAtCursor(
  rootNode: SourceMapNode,
  cursorOffset: number
): SourceMapNode | null {
  let currentOffset = 0;  // Track cumulative offset as we navigate

  function navigate(node: SourceMapNode, parentOffset: number): SourceMapNode | null {
    // Calculate absolute position of this node
    const nodeStart = parentOffset + node.relativeStart;
    const nodeEnd = nodeStart + node.relativeEnd;

    // Is cursor inside this node?
    if (cursorOffset >= nodeStart && cursorOffset <= nodeEnd) {
      // Check children first (depth-first)
      for (const child of node.children) {
        const found = navigate(child, nodeStart);
        if (found) return found;
      }

      // Cursor is in this node, not in any child
      return node;
    }

    return null;
  }

  return navigate(rootNode, 0);
}
```

### Updating After Edit

When user edits inside a node, only update that node's `relativeEnd`:

```typescript
function updateNodeAfterEdit(
  node: SourceMapNode,
  editPosition: number,  // Relative to node's start
  deltaLength: number    // +50 if added 50 chars, -20 if deleted 20
): void {
  // Update this node's span
  node.relativeEnd += deltaLength;

  // If edit happened before child, shift child's relativeStart
  for (const child of node.children) {
    if (child.relativeStart > editPosition) {
      child.relativeStart += deltaLength;
    }
  }

  // Recursively update parent spans
  if (node.parent) {
    updateNodeAfterEdit(node.parent, node.relativeStart, deltaLength);
  }
}
```

**Key Insight**: Only the **path from edited node to root** needs updating. Siblings are unaffected!

---

#### 1.3 Example Source Map (Relative/Hierarchical)

**File**: `examples/MyMvcApp/Generated/ProductDetailsPage.sourcemap.json`

```json
{
  "component": "ProductDetailsPage",
  "version": "1.0",
  "sourceFile": "ProductDetailsPage.tsx",
  "generatedAt": 1762521954839,
  "rootNode": {
    "hexPath": "",
    "tagName": "component",
    "relativeStart": 0,
    "relativeEnd": 8000,
    "childIndex": 0,
    "children": [
      {
        "hexPath": "10000000",
        "tagName": "div",
        "relativeStart": 0,
        "relativeEnd": 7900,
        "childIndex": 0,
        "children": [
          {
            "hexPath": "10000000.70000000",
            "tagName": "div",
            "relativeStart": 3000,
            "relativeEnd": 500,
            "childIndex": 6,
            "children": [
              {
                "hexPath": "10000000.70000000.20000000",
                "tagName": "select",
                "relativeStart": 100,
                "relativeEnd": 350,
                "childIndex": 1,
                "children": [
                  {
                    "hexPath": "10000000.70000000.20000000.10000000",
                    "tagName": "option",
                    "relativeStart": 50,
                    "relativeEnd": 40,
                    "childIndex": 0,
                    "children": []
                  },
                  {
                    "hexPath": "10000000.70000000.20000000.20000000",
                    "tagName": "option",
                    "relativeStart": 100,
                    "relativeEnd": 40,
                    "childIndex": 1,
                    "children": []
                  },
                  {
                    "hexPath": "10000000.70000000.20000000.30000000",
                    "tagName": "option",
                    "relativeStart": 150,
                    "relativeEnd": 35,
                    "childIndex": 2,
                    "children": []
                  },
                  {
                    "hexPath": "10000000.70000000.20000000.40000000",
                    "tagName": "option",
                    "relativeStart": 200,
                    "relativeEnd": 37,
                    "childIndex": 3,
                    "children": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Navigation Example:**

Cursor at absolute offset `3250`:
1. Start at root (offset 0)
2. Check child `10000000` (starts at 0, ends at 7900) ✅ Inside
3. Check child `10000000.70000000` (starts at 3000, ends at 3500) ✅ Inside
4. Check child `10000000.70000000.20000000` (starts at 3100, ends at 3450) ✅ Inside
5. Cursor at 3250 is inside `<select>`, before first `<option>`

**Result**: User is typing inside the select, can insert new option here!

---

### Key Advantages of Relative Source Maps

| Feature | Absolute Offsets | Relative Ranges |
|---------|------------------|-----------------|
| **Resilience** | ❌ Any edit invalidates all subsequent nodes | ✅ Only path to root needs updating |
| **Update Cost** | ❌ O(n) - recalculate entire file | ✅ O(log n) - path from edit to root |
| **Sibling Independence** | ❌ Editing one child affects siblings | ✅ Siblings completely unaffected |
| **Navigation** | ❌ Requires scanning entire map | ✅ Tree traversal from root |
| **Memory** | ✅ Flat structure | ⚠️ Tree structure (slightly larger) |
| **Complexity** | ✅ Simple offset arithmetic | ⚠️ Recursive tree navigation |

**Winner**: Relative ranges win for **hot reload** because edits are frequent and sibling independence is critical.

---

### Phase 2: Monaco Editor Integration (Week 2)

**Goal**: Monaco tracks cursor position and calculates insertion points using source map.

#### 2.1 Source Map Loader

**File**: `minimact-swig/src/editor/SourceMapLoader.ts`

```typescript
import type { SourceMap, SourceMapNode } from './types';

export class SourceMapLoader {
  private sourceMaps: Map<string, SourceMap> = new Map();

  /**
   * Load source map for a component
   */
  async loadSourceMap(componentId: string, sourcePath: string): Promise<void> {
    const response = await fetch(`/Generated/${componentId}.sourcemap.json`);
    const sourceMap: SourceMap = await response.json();

    this.sourceMaps.set(componentId, sourceMap);
    console.log(`[SourceMap] Loaded map for ${componentId}:`, sourceMap);
  }

  /**
   * Find the node containing a specific offset
   */
  findNodeAtOffset(componentId: string, offset: number): SourceMapNode | null {
    const sourceMap = this.sourceMaps.get(componentId);
    if (!sourceMap) return null;

    return Object.values(sourceMap.nodes).find(node =>
      offset >= node.sourceStart.offset && offset <= node.sourceEnd.offset
    ) || null;
  }

  /**
   * Get siblings of a node
   */
  getSiblings(componentId: string, hexPath: string): SourceMapNode[] {
    const sourceMap = this.sourceMaps.get(componentId);
    if (!sourceMap) return [];

    const node = sourceMap.nodes[hexPath];
    if (!node) return [];

    return Object.values(sourceMap.nodes)
      .filter(n => n.parentPath === node.parentPath)
      .sort((a, b) => a.childIndex - b.childIndex);
  }

  /**
   * Calculate hex code for insertion
   */
  calculateInsertionHexCode(
    componentId: string,
    prevSiblingPath: string | null,
    nextSiblingPath: string | null,
    parentPath: string
  ): string {
    // If inserting at the beginning
    if (!prevSiblingPath) {
      if (!nextSiblingPath) {
        // First child
        return `${parentPath ? parentPath + '.' : ''}10000000`;
      }
      // Insert before first child - use half of first child's hex
      const nextHex = parseInt(nextSiblingPath.split('.').pop()!, 16);
      const halfHex = Math.floor(nextHex / 2);
      return `${parentPath ? parentPath + '.' : ''}${halfHex.toString(16).padStart(8, '0')}`;
    }

    // If inserting at the end
    if (!nextSiblingPath) {
      // Insert after last child - use last + 0x10000000
      const prevHex = parseInt(prevSiblingPath.split('.').pop()!, 16);
      const newHex = prevHex + 0x10000000;
      return `${parentPath ? parentPath + '.' : ''}${newHex.toString(16).padStart(8, '0')}`;
    }

    // Insert in the middle - use average (half-gap)
    const prevHex = parseInt(prevSiblingPath.split('.').pop()!, 16);
    const nextHex = parseInt(nextSiblingPath.split('.').pop()!, 16);
    const halfGapHex = Math.floor((prevHex + nextHex) / 2);

    return `${parentPath ? parentPath + '.' : ''}${halfGapHex.toString(16).padStart(8, '0')}`;
  }

  /**
   * Update source map with new node
   */
  addNode(componentId: string, node: SourceMapNode): void {
    const sourceMap = this.sourceMaps.get(componentId);
    if (!sourceMap) return;

    sourceMap.nodes[node.hexPath] = node;
  }
}
```

#### 2.2 Cursor Tracker

**File**: `minimact-swig/src/editor/CursorTracker.ts`

```typescript
import * as monaco from 'monaco-editor';
import { SourceMapLoader } from './SourceMapLoader';

export interface InsertionContext {
  componentId: string;
  parentPath: string;
  prevSiblingPath: string | null;
  nextSiblingPath: string | null;
  calculatedHexPath: string;
  offset: number;
  lineNumber: number;
  column: number;
}

export class CursorTracker {
  private sourceMapLoader: SourceMapLoader;

  constructor(sourceMapLoader: SourceMapLoader) {
    this.sourceMapLoader = sourceMapLoader;
  }

  /**
   * Track cursor position and calculate insertion context
   */
  setupTracking(
    editor: monaco.editor.IStandaloneCodeEditor,
    componentId: string
  ): void {
    // Track content changes
    editor.onDidChangeModelContent((e) => {
      const position = editor.getPosition();
      if (!position) return;

      const model = editor.getModel();
      if (!model) return;

      const offset = model.getOffsetAt(position);

      // Find node containing cursor
      const currentNode = this.sourceMapLoader.findNodeAtOffset(componentId, offset);
      if (!currentNode) {
        console.warn('[CursorTracker] No node found at offset', offset);
        return;
      }

      // Get siblings
      const siblings = this.sourceMapLoader.getSiblings(componentId, currentNode.hexPath);
      const currentIndex = siblings.findIndex(s => s.hexPath === currentNode.hexPath);

      // Determine insertion point
      const insertionContext = this.determineInsertionPoint(
        componentId,
        currentNode,
        siblings,
        currentIndex,
        offset
      );

      console.log('[CursorTracker] Insertion context:', insertionContext);

      // Emit event for incremental transpile
      this.onInsertionDetected?.(insertionContext, e.changes[0].text);
    });

    // Track cursor movement (for hover hints, autocomplete, etc.)
    editor.onDidChangeCursorPosition((e) => {
      const offset = editor.getModel()?.getOffsetAt(e.position);
      if (!offset) return;

      const node = this.sourceMapLoader.findNodeAtOffset(componentId, offset);
      if (node) {
        console.log('[CursorTracker] Cursor at:', node.hexPath, node.tagName);
      }
    });
  }

  /**
   * Determine where new code should be inserted
   */
  private determineInsertionPoint(
    componentId: string,
    currentNode: SourceMapNode,
    siblings: SourceMapNode[],
    currentIndex: number,
    offset: number
  ): InsertionContext {
    const prevSibling = currentIndex > 0 ? siblings[currentIndex - 1] : null;
    const nextSibling = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

    // Is cursor closer to start or end of current node?
    const nodeMiddle = (currentNode.sourceStart.offset + currentNode.sourceEnd.offset) / 2;
    const isBeforeMiddle = offset < nodeMiddle;

    let insertPrevSibling: string | null;
    let insertNextSibling: string | null;

    if (isBeforeMiddle) {
      // Insert before current node
      insertPrevSibling = prevSibling?.hexPath || null;
      insertNextSibling = currentNode.hexPath;
    } else {
      // Insert after current node
      insertPrevSibling = currentNode.hexPath;
      insertNextSibling = nextSibling?.hexPath || null;
    }

    const calculatedHexPath = this.sourceMapLoader.calculateInsertionHexCode(
      componentId,
      insertPrevSibling,
      insertNextSibling,
      currentNode.parentPath
    );

    return {
      componentId,
      parentPath: currentNode.parentPath,
      prevSiblingPath: insertPrevSibling,
      nextSiblingPath: insertNextSibling,
      calculatedHexPath,
      offset,
      lineNumber: currentNode.sourceStart.line,
      column: currentNode.sourceStart.column
    };
  }

  // Callback when insertion is detected
  onInsertionDetected?: (context: InsertionContext, newCode: string) => void;
}
```

#### 2.3 Monaco Integration

**File**: `minimact-swig/src/editor/MinimactEditor.ts`

```typescript
import * as monaco from 'monaco-editor';
import { SourceMapLoader } from './SourceMapLoader';
import { CursorTracker } from './CursorTracker';
import { SignalRClient } from '../services/SignalRClient';

export class MinimactEditor {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private sourceMapLoader: SourceMapLoader;
  private cursorTracker: CursorTracker;
  private signalR: SignalRClient;
  private currentComponentId: string;

  constructor(container: HTMLElement, signalR: SignalRClient) {
    this.signalR = signalR;
    this.sourceMapLoader = new SourceMapLoader();
    this.cursorTracker = new CursorTracker(this.sourceMapLoader);

    // Create Monaco editor
    this.editor = monaco.editor.create(container, {
      value: '',
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      tabSize: 2
    });

    // Setup cursor tracking
    this.cursorTracker.onInsertionDetected = (context, newCode) => {
      this.handleInsertion(context, newCode);
    };
  }

  /**
   * Load a component file for editing
   */
  async loadComponent(componentId: string, sourcePath: string): Promise<void> {
    this.currentComponentId = componentId;

    // Load source file
    const sourceCode = await fetch(sourcePath).then(r => r.text());
    this.editor.setValue(sourceCode);

    // Load source map
    await this.sourceMapLoader.loadSourceMap(componentId, sourcePath);

    // Setup tracking for this component
    this.cursorTracker.setupTracking(this.editor, componentId);

    console.log(`[MinimactEditor] Loaded ${componentId}`);
  }

  /**
   * Handle insertion of new code
   */
  private async handleInsertion(context: InsertionContext, newCode: string): Promise<void> {
    console.log('[MinimactEditor] Detected insertion:', {
      hexPath: context.calculatedHexPath,
      code: newCode
    });

    // Send incremental transpile request to server
    await this.signalR.invoke('IncrementalTranspile', {
      componentId: context.componentId,
      insertion: {
        hexPath: context.calculatedHexPath,
        parentPath: context.parentPath,
        prevSibling: context.prevSiblingPath,
        nextSibling: context.nextSiblingPath,
        code: newCode,
        offset: context.offset
      }
    });
  }
}
```

---

### Phase 3: C# Server Processing (Week 3)

**Goal**: C# receives incremental transpile requests, resolves state bindings, and sends InsertVNode patches.

#### 3.1 Request/Response Models

**File**: `src/Minimact.AspNetCore/SignalR/IncrementalTranspileModels.cs`

```csharp
namespace Minimact.AspNetCore.SignalR;

/// <summary>
/// Request to incrementally transpile and insert new code
/// </summary>
public class IncrementalTranspileRequest
{
    public string ComponentId { get; set; } = "";
    public InsertionPoint Insertion { get; set; } = new();
}

public class InsertionPoint
{
    public string HexPath { get; set; } = "";
    public string ParentPath { get; set; } = "";
    public string? PrevSibling { get; set; }
    public string? NextSibling { get; set; }
    public string Code { get; set; } = "";
    public int Offset { get; set; }
}

/// <summary>
/// Response containing new VNode and template metadata
/// </summary>
public class InsertVNodeResponse
{
    public string ComponentId { get; set; } = "";
    public string ParentPath { get; set; } = "";
    public VNodeData VNode { get; set; } = new();
    public TemplateMetadata Templates { get; set; } = new();
}

public class VNodeData
{
    public string Path { get; set; } = "";
    public string Tag { get; set; } = "";
    public Dictionary<string, string> Props { get; set; } = new();
    public List<VNodeChildData> Children { get; set; } = new();
}

public class VNodeChildData
{
    public string Path { get; set; } = "";
    public string? Text { get; set; }
    public string? Tag { get; set; }
    public Dictionary<string, string>? Props { get; set; }
}

public class TemplateMetadata
{
    public Dictionary<string, AttributeTemplate> Attributes { get; set; } = new();
    public Dictionary<string, TextTemplate> Text { get; set; } = new();
}

public class AttributeTemplate
{
    public string Template { get; set; } = "";
    public string[] Bindings { get; set; } = Array.Empty<string>();
    public int[] Slots { get; set; } = Array.Empty<int>();
    public string Type { get; set; } = "static";
}

public class TextTemplate
{
    public string Template { get; set; } = "";
    public string[] Bindings { get; set; } = Array.Empty<string>();
    public int[] Slots { get; set; } = Array.Empty<int>();
    public string Type { get; set; } = "static";
}
```

#### 3.2 Babel Service Interface

**File**: `src/Minimact.AspNetCore/Services/IBabelService.cs`

```csharp
namespace Minimact.AspNetCore.Services;

public interface IBabelService
{
    /// <summary>
    /// Parse a JSX code fragment and extract template metadata
    /// </summary>
    Task<ParsedFragment> ParseFragmentAsync(string jsxCode);
}

public class ParsedFragment
{
    public string TagName { get; set; } = "";
    public Dictionary<string, AttributeTemplate> Attributes { get; set; } = new();
    public List<ParsedChildNode> Children { get; set; } = new();
}

public class ParsedChildNode
{
    public string Type { get; set; } = ""; // "text" | "element"
    public string? Text { get; set; }
    public TextTemplate? Template { get; set; }
    public string? TagName { get; set; }
    public string RelativePath { get; set; } = ""; // "10000000" (child hex code)
}
```

#### 3.3 Template Resolver

**File**: `src/Minimact.AspNetCore/Services/TemplateResolver.cs`

```csharp
namespace Minimact.AspNetCore.Services;

/// <summary>
/// Resolves template bindings against component state
/// </summary>
public class TemplateResolver
{
    /// <summary>
    /// Resolve a template string with state bindings
    /// Example: "Stock: {0}" + ["quantity"] + {quantity: 5} → "Stock: 5"
    /// </summary>
    public string ResolveTemplate(
        string template,
        string[] bindings,
        Dictionary<string, object> state)
    {
        var values = bindings.Select(binding => ResolveBinding(binding, state)).ToArray();

        // Fill template slots: {0}, {1}, etc.
        for (int i = 0; i < values.Length; i++)
        {
            template = template.Replace($"{{{i}}}", values[i]);
        }

        return template;
    }

    /// <summary>
    /// Resolve a single binding path against state
    /// Supports nested paths like "user.profile.name"
    /// </summary>
    private string ResolveBinding(string binding, Dictionary<string, object> state)
    {
        var keys = binding.Split('.');
        object? value = state;

        foreach (var key in keys)
        {
            if (value is Dictionary<string, object> dict && dict.ContainsKey(key))
            {
                value = dict[key];
            }
            else if (value != null)
            {
                // Try reflection for object properties
                var prop = value.GetType().GetProperty(key);
                if (prop != null)
                {
                    value = prop.GetValue(value);
                }
                else
                {
                    return "undefined";
                }
            }
            else
            {
                return "null";
            }
        }

        return value?.ToString() ?? "null";
    }

    /// <summary>
    /// Resolve attribute templates (supports conditionals)
    /// </summary>
    public string ResolveAttributeTemplate(
        AttributeTemplate template,
        Dictionary<string, object> state)
    {
        if (template.Type == "conditional")
        {
            // Handle conditional templates: {condition ? 'class-a' : 'class-b'}
            var conditionValue = ResolveBinding(template.Bindings[0], state);
            var isTrue = conditionValue == "true" || conditionValue == "True";

            // Assume template has format: "{0}" where 0 is true/false branch
            // This is simplified - real implementation would parse conditional templates
            return isTrue ? template.Template : "";
        }

        return ResolveTemplate(template.Template, template.Bindings, state);
    }
}
```

#### 3.4 MinimactHub Handler

**File**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs` (Add method)

```csharp
/// <summary>
/// Incrementally transpile and insert new JSX element
/// </summary>
public async Task IncrementalTranspile(IncrementalTranspileRequest request)
{
    try
    {
        // 1. Get component instance
        var component = _registry.GetComponent(request.ComponentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("Error", $"Component {request.ComponentId} not found");
            return;
        }

        // 2. Parse JSX fragment with Babel
        var parsedFragment = await _babelService.ParseFragmentAsync(request.Insertion.Code);

        // 3. Resolve templates against current component state
        var resolvedAttributes = new Dictionary<string, string>();
        foreach (var (attrName, attrTemplate) in parsedFragment.Attributes)
        {
            var resolvedValue = _templateResolver.ResolveAttributeTemplate(
                attrTemplate,
                component.State
            );
            resolvedAttributes[attrName] = resolvedValue;
        }

        // 4. Create VElement with resolved values
        var newVElement = new VElement(
            tag: parsedFragment.TagName,
            path: request.Insertion.HexPath,
            props: resolvedAttributes
        );

        // 5. Add children with resolved text content
        foreach (var child in parsedFragment.Children)
        {
            if (child.Type == "text" && child.Template != null)
            {
                var resolvedText = _templateResolver.ResolveTemplate(
                    child.Template.Template,
                    child.Template.Bindings,
                    component.State
                );

                var childPath = $"{request.Insertion.HexPath}.{child.RelativePath}";
                newVElement.Children.Add(new VText(resolvedText, childPath));
            }
        }

        // 6. Insert into current VNode tree
        var parentElement = FindElementByPath(component.CurrentVNode, request.Insertion.ParentPath);
        if (parentElement == null)
        {
            await Clients.Caller.SendAsync("Error", $"Parent path {request.Insertion.ParentPath} not found");
            return;
        }

        var insertIndex = FindInsertionIndex(parentElement, request.Insertion.PrevSibling);
        parentElement.Children.Insert(insertIndex, newVElement);

        // 7. Update source map
        await UpdateSourceMapAsync(request.ComponentId, request.Insertion, parsedFragment);

        // 8. Update component's CurrentVNode
        component.CurrentVNode = component.CurrentVNode; // Trigger update

        // 9. Send InsertVNode response to client
        await Clients.Client(Context.ConnectionId).SendAsync("HotReload:InsertVNode", new InsertVNodeResponse
        {
            ComponentId = request.ComponentId,
            ParentPath = request.Insertion.ParentPath,
            VNode = new VNodeData
            {
                Path = newVElement.Path,
                Tag = newVElement.Tag,
                Props = resolvedAttributes,
                Children = newVElement.Children.Select(c => new VNodeChildData
                {
                    Path = c.Path,
                    Text = (c as VText)?.Content
                }).ToList()
            },
            Templates = new TemplateMetadata
            {
                Attributes = parsedFragment.Attributes,
                Text = parsedFragment.Children
                    .Where(c => c.Template != null)
                    .ToDictionary(
                        c => $"{request.Insertion.HexPath}.{c.RelativePath}",
                        c => c.Template!
                    )
            }
        });

        Console.WriteLine($"[IncrementalTranspile] ✅ Inserted {parsedFragment.TagName} at {request.Insertion.HexPath}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[IncrementalTranspile] ❌ Error: {ex.Message}");
        await Clients.Caller.SendAsync("Error", $"Incremental transpile failed: {ex.Message}");
    }
}

private VElement? FindElementByPath(VNode root, string path)
{
    if (string.IsNullOrEmpty(path))
    {
        return root as VElement;
    }

    var segments = path.Split('.');
    VElement? current = root as VElement;

    foreach (var segment in segments)
    {
        if (current == null) return null;

        current = current.Children
            .OfType<VElement>()
            .FirstOrDefault(c => c.Path.EndsWith(segment));
    }

    return current;
}

private int FindInsertionIndex(VElement parent, string? prevSiblingPath)
{
    if (string.IsNullOrEmpty(prevSiblingPath))
    {
        return 0; // Insert at beginning
    }

    var index = parent.Children.FindIndex(c => c.Path == prevSiblingPath);
    return index >= 0 ? index + 1 : parent.Children.Count;
}

private async Task UpdateSourceMapAsync(
    string componentId,
    InsertionPoint insertion,
    ParsedFragment fragment)
{
    var sourceMapPath = Path.Combine("Generated", $"{componentId}.sourcemap.json");

    if (!File.Exists(sourceMapPath))
    {
        Console.WriteLine($"[UpdateSourceMap] ⚠️ Source map not found: {sourceMapPath}");
        return;
    }

    var sourceMapJson = await File.ReadAllTextAsync(sourceMapPath);
    var sourceMap = JsonSerializer.Deserialize<SourceMapFile>(sourceMapJson);

    if (sourceMap == null) return;

    // Add new node to source map
    sourceMap.Nodes[insertion.HexPath] = new SourceMapNode
    {
        HexPath = insertion.HexPath,
        ParentPath = insertion.ParentPath,
        TagName = fragment.TagName,
        SourceStart = new SourceLocation { Offset = insertion.Offset },
        SourceEnd = new SourceLocation { Offset = insertion.Offset + insertion.Code.Length },
        ChildIndex = sourceMap.Nodes.Values.Count(n => n.ParentPath == insertion.ParentPath),
        NextSiblingPath = insertion.NextSibling
    };

    // Save updated source map
    var updatedJson = JsonSerializer.Serialize(sourceMap, new JsonSerializerOptions { WriteIndented = true });
    await File.WriteAllTextAsync(sourceMapPath, updatedJson);

    Console.WriteLine($"[UpdateSourceMap] ✅ Added node {insertion.HexPath} to source map");
}
```

---

### Phase 4: Client Hot Reload Handler (Week 4)

**Goal**: Client receives InsertVNode patches and inserts DOM elements with hierarchical index updates.

#### 4.1 InsertVNode Handler

**File**: `src/client-runtime/src/hot-reload.ts` (Add handler)

```typescript
/**
 * Handle insertion of new VNode from incremental transpilation
 */
private handleInsertVNode(message: InsertVNodeMessage): void {
  const { componentId, parentPath, vnode, templates } = message;

  console.log(`[HotReload] 🔧 Inserting new VNode at ${vnode.path}`);

  // Find all instances of this component
  const instances = this.componentInstances.get(componentId) || [];

  instances.forEach(instance => {
    try {
      // 1. Navigate to parent element using hierarchical index
      const parentElement = this.findElementByPath(
        instance.rootElement,
        componentId,
        parentPath
      );

      if (!parentElement) {
        console.error(`[HotReload] Parent not found at path: ${parentPath}`);
        return;
      }

      // 2. Create new DOM element
      const newElement = this.createDOMElement(vnode);

      // 3. Find insertion position
      const insertIndex = this.calculateInsertionIndex(
        parentElement,
        parentPath,
        vnode.path,
        componentId
      );

      // 4. Insert into DOM
      if (insertIndex >= parentElement.children.length) {
        parentElement.appendChild(newElement);
      } else {
        parentElement.insertBefore(newElement, parentElement.children[insertIndex]);
      }

      // 5. Update hierarchical index
      this.templateState.addNodeToHierarchy(
        componentId,
        parentPath,
        vnode.path.split('.').pop()! // Last segment only
      );

      // 6. Store template metadata for future updates
      this.storeTemplateMetadata(componentId, vnode.path, templates);

      console.log(`[HotReload] 🚀 INSTANT! Inserted <${vnode.tag}> at ${vnode.path}`);
    } catch (error) {
      console.error(`[HotReload] Failed to insert VNode:`, error);
    }
  });
}

/**
 * Create DOM element from VNode data
 */
private createDOMElement(vnode: VNodeData): HTMLElement {
  const element = document.createElement(vnode.tag);

  // Set attributes
  Object.entries(vnode.props).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style') {
      element.setAttribute('style', value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Add children
  vnode.children.forEach(child => {
    if (child.text) {
      element.appendChild(document.createTextNode(child.text));
    } else if (child.tag) {
      // Recursively create child elements
      const childElement = this.createDOMElement(child as any);
      element.appendChild(childElement);
    }
  });

  return element;
}

/**
 * Calculate where to insert new element among siblings
 */
private calculateInsertionIndex(
  parentElement: Element,
  parentPath: string,
  newNodePath: string,
  componentId: string
): number {
  // Get sorted children from template hierarchy
  const sortedHexCodes = this.templateState.getChildrenAtPath(componentId, parentPath);
  if (!sortedHexCodes) return parentElement.children.length;

  // Find where new node should be inserted
  const newHexCode = newNodePath.split('.').pop()!;
  const targetIndex = sortedHexCodes.findIndex(hex =>
    parseInt(hex, 16) > parseInt(newHexCode, 16)
  );

  if (targetIndex === -1) {
    // Insert at end
    return parentElement.children.length;
  }

  // Count non-null elements before target
  let domIndex = 0;
  for (let i = 0; i < targetIndex; i++) {
    const hexCode = sortedHexCodes[i];
    const fullPath = parentPath ? `${parentPath}.${hexCode}` : hexCode;

    if (!this.templateState.isPathNull(componentId, fullPath)) {
      domIndex++;
    }
  }

  return domIndex;
}

/**
 * Store template metadata for future hot reload updates
 */
private storeTemplateMetadata(
  componentId: string,
  nodePath: string,
  templates: TemplateMetadata
): void {
  // Store attribute templates
  Object.entries(templates.attributes).forEach(([attrName, template]) => {
    const key = `${componentId}:${nodePath}.@${attrName}`;
    this.templateState.templates.set(key, {
      template: template.template,
      bindings: template.bindings,
      slots: template.slots,
      path: nodePath,
      type: template.type as any,
      attribute: attrName
    });
  });

  // Store text templates
  Object.entries(templates.text).forEach(([textPath, template]) => {
    const key = `${componentId}:${textPath}`;
    this.templateState.templates.set(key, {
      template: template.template,
      bindings: template.bindings,
      slots: template.slots,
      path: textPath,
      type: template.type as any
    });
  });

  console.log(`[TemplateState] Stored templates for ${nodePath}`, templates);
}
```

#### 4.2 Template State Updates

**File**: `src/client-runtime/src/template-state.ts` (Add method)

```typescript
/**
 * Add a new node to the hierarchical index
 * Called when InsertVNode patch is applied
 */
addNodeToHierarchy(componentId: string, parentPath: string, newHexCode: string): void {
  const hierarchy = this.hexPathIndex.get(componentId);
  if (!hierarchy) {
    console.warn(`[TemplateState] No hierarchy found for ${componentId}`);
    return;
  }

  // Get current children at parent path
  let children = hierarchy.get(parentPath);
  if (!children) {
    children = [];
    hierarchy.set(parentPath, children);
  }

  // Insert new hex code in sorted order
  const insertIndex = children.findIndex(hex =>
    parseInt(hex, 16) > parseInt(newHexCode, 16)
  );

  if (insertIndex === -1) {
    children.push(newHexCode);
  } else {
    children.splice(insertIndex, 0, newHexCode);
  }

  console.log(`[TemplateState] Added ${newHexCode} to hierarchy at parent "${parentPath}"`);
}

/**
 * Remove a node from the hierarchical index
 * Called when RemoveVNode patch is applied
 */
removeNodeFromHierarchy(componentId: string, parentPath: string, hexCode: string): void {
  const hierarchy = this.hexPathIndex.get(componentId);
  if (!hierarchy) return;

  const children = hierarchy.get(parentPath);
  if (!children) return;

  const index = children.indexOf(hexCode);
  if (index !== -1) {
    children.splice(index, 1);
    console.log(`[TemplateState] Removed ${hexCode} from hierarchy at parent "${parentPath}"`);
  }
}
```

#### 4.3 SignalR Connection

**File**: `src/client-runtime/src/index.ts` (Add listener)

```typescript
// Register InsertVNode handler
this.signalR.on('HotReload:InsertVNode', (data: any) => {
  console.log('[Minimact SignalR] HotReload:InsertVNode', data);
  this.hotReload.handleInsertVNode(data);
});
```

---

## Testing Strategy

### Test Case 1: Simple Static Element

**Input**: Add `<option value="Green">Green</option>`

**Expected Behavior**:
1. Monaco detects insertion after "Blue" option
2. Calculates hex code: `50000000`
3. Server parses static element (no bindings)
4. Client inserts DOM element in 1-2ms
5. Dropdown now has 5 options

**Success Criteria**:
- ✅ Element appears instantly without refresh
- ✅ Console shows: `[HotReload] 🚀 INSTANT! Inserted <option> at 10000000.70000000.20000000.50000000`
- ✅ Hierarchical index updated
- ✅ Subsequent hot reloads work correctly

---

### Test Case 2: Element with State Binding

**Input**: Add `<div>Stock: {quantity}</div>`

**Expected Behavior**:
1. Monaco detects insertion
2. Calculates hex code
3. Babel extracts binding: `["quantity"]`
4. Server resolves: `quantity = 5` → "Stock: 5"
5. Client inserts with resolved text
6. Template stored for future updates

**Success Criteria**:
- ✅ Element shows correct value: "Stock: 5"
- ✅ When quantity changes, text updates via template
- ✅ No page refresh required

---

### Test Case 3: Element with Dynamic Attribute

**Input**: Add `<div style={{ color: textColor }}>Text</div>`

**Expected Behavior**:
1. Babel extracts attribute template: `"color: {0}"`, `["textColor"]`
2. Server resolves: `textColor = "#ff0000"` → `"color: #ff0000"`
3. Client creates element with resolved style
4. Template stored for future hot reload

**Success Criteria**:
- ✅ Element has correct style
- ✅ When textColor changes, style updates
- ✅ Sub-millisecond update

---

### Test Case 4: Nested Element Insertion

**Input**: Add `<div><span>Nested</span></div>`

**Expected Behavior**:
1. Babel parses nested structure
2. Server creates VElement with VText child
3. Hex codes assigned: `50000000` (div), `50000000.10000000` (span), `50000000.10000000.10000000` (text)
4. Client creates DOM tree recursively
5. Hierarchical index updated for all levels

**Success Criteria**:
- ✅ Full tree inserted correctly
- ✅ All levels navigable
- ✅ Future updates work at any level

---

### Test Case 5: Half-Gap Insertion

**Input**: Add element between Red (`30000000`) and Blue (`40000000`)

**Expected Behavior**:
1. Monaco calculates: `(0x30000000 + 0x40000000) / 2 = 0x38000000`
2. Element inserted with hex code `38000000`
3. Order maintained: Red → New → Blue
4. No collisions or duplicates

**Success Criteria**:
- ✅ Correct ordering in DOM
- ✅ Hex code is exactly `38000000`
- ✅ Source map updated correctly

---

## Performance Targets

| Operation | Target Latency | Notes |
|-----------|---------------|-------|
| **Cursor tracking** | <1ms | Monaco event handler |
| **Source map lookup** | <1ms | Hash table lookup |
| **Hex code calculation** | <0.1ms | Simple arithmetic |
| **SignalR round-trip** | <50ms | Network latency |
| **Babel parsing** | <10ms | Single element parse |
| **Template resolution** | <5ms | State dictionary lookup |
| **VNode insertion** | <2ms | Tree traversal + insert |
| **DOM creation** | <5ms | Browser API |
| **Hierarchical index update** | <1ms | Array insertion |
| **Total (end-to-end)** | **<75ms** | Perception threshold: 100ms |

---

## Edge Cases & Limitations

### 1. **Conflicting Edits**

**Scenario**: Two developers edit same file simultaneously.

**Problem**: Both calculate `50000000` for different elements.

**Solution**: Add timestamp to hex code calculation or use UUID suffix.

---

### 2. **Running Out of Hex Codes**

**Scenario**: User inserts 100 elements between `30000000` and `40000000`.

**Problem**: Half-gap algorithm approaches limit: `30000000`, `38000000`, `3c000000`, `3e000000`, `3f000000`...

**Solution**: When gap < threshold (e.g., `0x1000`), trigger full retranspile to rebalance hex codes.

---

### 3. **Complex State Bindings**

**Scenario**: `<div>{users.filter(u => u.active).length} users</div>`

**Problem**: Babel can't evaluate complex JavaScript expressions.

**Solution**: Mark as `__complex__` binding, require full render:
```json
{
  "template": "{0}",
  "bindings": ["__complex__"],
  "requiresServerRender": true
}
```

**Behavior**: Server calls `component.Render()` to get value, but still uses incremental insertion.

---

### 4. **Undo/Redo**

**Scenario**: User adds element, then undoes (Ctrl+Z).

**Problem**: DOM has new element, but source code reverted.

**Solution**: Listen to Monaco's `onDidChangeModelContent` with `isUndoing` flag, send `RemoveVNode` patch.

---

### 5. **Multi-Cursor Editing**

**Scenario**: User adds 3 elements simultaneously with multi-cursor.

**Problem**: Multiple insertion contexts generated at once.

**Solution**: Batch insertions, send single `IncrementalTranspileBatch` request with array of insertions.

---

## Migration Path

### Phase 1: Opt-In Feature Flag

```csharp
// appsettings.json
{
  "Minimact": {
    "HotReload": {
      "EnableStructuralUpdates": false  // Default: disabled
    }
  }
}
```

**Benefit**: Allows gradual rollout and testing.

---

### Phase 2: Stable Components Only

Enable structural hot reload only for components marked as stable:

```tsx
// @minimact-stable
export function StableComponent() {
  // This component supports structural hot reload
}
```

**Benefit**: Protects production code from experimental features.

---

### Phase 3: Full Rollout

After 4-6 weeks of testing:
- Enable by default
- Remove feature flag
- Add to documentation

---

## Success Metrics

### Developer Experience
- ✅ 95%+ of structural edits work without refresh
- ✅ Average hot reload time <100ms
- ✅ Zero false positives (wrong insertion point)
- ✅ Graceful degradation (fall back to full reload on error)

### Technical Performance
- ✅ Source map size <50KB per component
- ✅ Memory overhead <10MB for 100 components
- ✅ CPU usage <5% during idle editing
- ✅ No memory leaks over 8-hour session

### Code Quality
- ✅ <10% increase in bundle size
- ✅ 100% test coverage for core algorithms
- ✅ Zero breaking changes to existing API
- ✅ Full backward compatibility

---

## Future Enhancements

### 1. **Visual Insertion Hints**

Show preview overlay in Monaco editor:
```
<option value="Blue">Blue</option>
┌──────────────────────────────────┐
│ Insert here? (50000000)          │ ← Hover hint
└──────────────────────────────────┘
<option value="Green">Green</option>
```

---

### 2. **Drag-and-Drop Reordering**

Monaco extension to drag JSX elements:
- Automatically updates hex codes
- Sends `ReorderVNode` patch
- Visual feedback during drag

---

### 3. **AI-Powered Insertion**

Copilot-style suggestions:
- Analyze sibling elements
- Suggest common patterns
- Auto-fill attributes based on context

---

### 4. **Collaborative Editing**

Real-time multi-user editing:
- Operational transforms for hex codes
- Conflict resolution algorithm
- Visual cursors for other developers

---

## Conclusion

Structural Hot Reload is the **final piece** of the Template Patch System puzzle. Combined with the existing sub-millisecond content/attribute updates, it creates a **truly magical development experience** where:

- ✅ Text changes update in 0.3-2.3ms
- ✅ Style tweaks update in 0.9ms
- ✅ New elements insert in <75ms
- ✅ No page refreshes ever needed
- ✅ State preserved across all changes

This positions Minimact as having the **fastest hot reload system ever built** - not just for content updates, but for structural changes too.

**Next Steps**:
1. Implement Phase 1 (Source Map Generation)
2. Test with simple static elements
3. Expand to dynamic bindings
4. Beta test with real applications
5. Full production rollout

🔥 **The future of web development is instant.**
