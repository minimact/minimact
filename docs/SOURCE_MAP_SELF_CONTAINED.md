# Self-Contained Source Maps

**Date**: 2025-01-07
**Status**: ✅ Final Architectural Design
**Related**: STRUCTURAL_HOT_RELOAD.md

---

## Core Principle: Only Leaves Have Length

**The key insight**: Element nodes don't store length or position. Only **text nodes (leaves)** have a `length` property. Position is calculated on-the-fly by summing sibling lengths during tree navigation.

**This enables O(1) updates with zero cascading!**

---

## Data Structure

```typescript
interface SourceMap {
  component: string;
  version: string;
  sourceFile: string;
  generatedAt: number;
  rootNode: SourceMapNode;
}

interface SourceMapNode {
  hexPath: string;              // "10000000.70000000.20000000"
  tagName: string;              // "option" or "#text"

  // ONLY LEAVES HAVE LENGTH!
  length?: number;              // Only present for text nodes

  // Tree structure
  children: SourceMapNode[];    // Array of child nodes
  childIndex: number;           // Position among siblings (0-based)
}
```

**Key points:**
- ✅ Element nodes: NO length property, just children array
- ✅ Text nodes: Have `length`, empty children array
- ✅ No offsets anywhere - position calculated during navigation
- ✅ Self-contained - each leaf is independent

---

## Example Source Map

```json
{
  "component": "ProductDetailsPage",
  "version": "1.0",
  "sourceFile": "ProductDetailsPage.tsx",
  "generatedAt": 1762521954839,
  "rootNode": {
    "hexPath": "",
    "tagName": "component",
    "childIndex": 0,
    "children": [
      {
        "hexPath": "10000000",
        "tagName": "div",
        "childIndex": 0,
        "children": [
          {
            "hexPath": "10000000.10000000",
            "tagName": "h1",
            "childIndex": 0,
            "children": [
              {
                "hexPath": "10000000.10000000.10000000",
                "tagName": "#text",
                "length": 15,
                "childIndex": 0,
                "children": []
              }
            ]
          },
          {
            "hexPath": "10000000.20000000",
            "tagName": "select",
            "childIndex": 1,
            "children": [
              {
                "hexPath": "10000000.20000000.10000000",
                "tagName": "option",
                "childIndex": 0,
                "children": [
                  {
                    "hexPath": "10000000.20000000.10000000.10000000",
                    "tagName": "#text",
                    "length": 5,
                    "childIndex": 0,
                    "children": []
                  }
                ]
              },
              {
                "hexPath": "10000000.20000000.20000000",
                "tagName": "option",
                "childIndex": 1,
                "children": [
                  {
                    "hexPath": "10000000.20000000.20000000.10000000",
                    "tagName": "#text",
                    "length": 5,
                    "childIndex": 0,
                    "children": []
                  }
                ]
              },
              {
                "hexPath": "10000000.20000000.30000000",
                "tagName": "option",
                "childIndex": 2,
                "children": [
                  {
                    "hexPath": "10000000.20000000.30000000.10000000",
                    "tagName": "#text",
                    "length": 3,
                    "childIndex": 0,
                    "children": []
                  }
                ]
              },
              {
                "hexPath": "10000000.20000000.40000000",
                "tagName": "option",
                "childIndex": 3,
                "children": [
                  {
                    "hexPath": "10000000.20000000.40000000.10000000",
                    "tagName": "#text",
                    "length": 4,
                    "childIndex": 0,
                    "children": []
                  }
                ]
              }
            ]
          },
          {
            "hexPath": "10000000.30000000",
            "tagName": "button",
            "childIndex": 2,
            "children": [
              {
                "hexPath": "10000000.30000000.10000000",
                "tagName": "#text",
                "length": 11,
                "childIndex": 0,
                "children": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Visual representation:**
```
component (no length)
└─ div 10000000 (no length)
   ├─ h1 10000000.10000000 (no length)
   │  └─ #text "Product Details" [length: 15]
   │
   ├─ select 10000000.20000000 (no length)
   │  ├─ option 10000000.20000000.10000000 (no length)
   │  │  └─ #text "Black" [length: 5]
   │  ├─ option 10000000.20000000.20000000 (no length)
   │  │  └─ #text "White" [length: 5]
   │  ├─ option 10000000.20000000.30000000 (no length)
   │  │  └─ #text "Red" [length: 3]
   │  └─ option 10000000.20000000.40000000 (no length)
   │     └─ #text "Blue" [length: 4]
   │
   └─ button 10000000.30000000 (no length)
      └─ #text "Add to Cart" [length: 11]
```

---

## Navigation Algorithm

To find cursor position, navigate the tree and **sum leaf lengths** as you go:

```typescript
/**
 * Find the node at cursor offset
 * Navigates tree, summing leaf lengths to calculate positions
 */
function findNodeAtCursor(
  rootNode: SourceMapNode,
  cursorOffset: number
): SourceMapNode | null {

  function navigate(
    node: SourceMapNode,
    currentOffset: number
  ): SourceMapNode | null {

    // Is this a leaf node with length?
    if (node.length !== undefined) {
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + node.length;

      // Is cursor inside this text node?
      if (cursorOffset >= nodeStart && cursorOffset < nodeEnd) {
        return node;
      }

      return null;
    }

    // Not a leaf - traverse children, summing lengths
    let childOffset = currentOffset;

    for (const child of node.children) {
      // Recursively check this child
      const found = navigate(child, childOffset);
      if (found) return found;

      // Move offset forward by child's total length
      childOffset += calculateTotalLength(child);
    }

    return null;
  }

  return navigate(rootNode, 0);
}

/**
 * Calculate total length of a node (sum all its leaves)
 */
function calculateTotalLength(node: SourceMapNode): number {
  // Leaf node - return its length
  if (node.length !== undefined) {
    return node.length;
  }

  // Element node - sum all children
  return node.children.reduce(
    (sum, child) => sum + calculateTotalLength(child),
    0
  );
}
```

### Navigation Example

**Cursor at offset 25** (inside "White" text):

```
Start at root, offset = 0

1. Enter div (10000000), offset = 0

2. Enter h1 (10000000.10000000), offset = 0
   - Check #text "Product Details" (length: 15)
   - Cursor 25 >= 0 && 25 < 15? ❌ No
   - offset += 15 → offset = 15

3. Enter select (10000000.20000000), offset = 15

4. Enter option1 (10000000.20000000.10000000), offset = 15
   - Check #text "Black" (length: 5)
   - Cursor 25 >= 15 && 25 < 20? ❌ No
   - offset += 5 → offset = 20

5. Enter option2 (10000000.20000000.20000000), offset = 20
   - Check #text "White" (length: 5)
   - Cursor 25 >= 20 && 25 < 25? ✅ YES!
   - **Found!** Return this text node

Result: Cursor is at character 5 (end) of "White" text node
```

---

## Update Algorithm (O(1)!)

When user edits text, **only update the leaf node's length**:

```typescript
/**
 * Update source map after text edit
 * O(1) - just update one leaf's length!
 */
function updateTextNodeLength(
  textNode: SourceMapNode,
  newLength: number
): void {
  // That's it! Just update the one property
  textNode.length = newLength;

  // NO parent updates needed!
  // NO sibling updates needed!
  // NO cascading changes!
}
```

### Update Example

**User edits "Black" → "Black Pearl"** (adds 6 characters):

```
BEFORE:
option1
└─ #text "Black" [length: 5]

UPDATE:
textNode.length = 11;  // 5 + 6 = 11

AFTER:
option1
└─ #text "Black Pearl" [length: 11]

Changed nodes: 1
Unchanged nodes: ALL OTHERS!
Time complexity: O(1)
```

**No other nodes need updating:**
- ✅ option1 element: no length property
- ✅ option2 element: no length property
- ✅ select element: no length property
- ✅ Sibling text nodes: independent
- ✅ Parent elements: no length property

**Next navigation** will automatically get correct positions by summing:
- "Product Details": 15 chars → offset 0-15
- "Black Pearl": 11 chars → offset 15-26 (was 15-20)
- "White": 5 chars → offset 26-31 (was 20-25)
- "Red": 3 chars → offset 31-34 (was 25-28)
- "Blue": 4 chars → offset 34-38 (was 28-32)

**The position shift happens automatically during navigation** - no explicit updates needed!

---

## Insertion Algorithm

When user inserts a new element, add it to children array:

```typescript
/**
 * Insert new node into source map
 */
function insertNode(
  parentNode: SourceMapNode,
  newNode: SourceMapNode,
  insertAfterIndex: number
): void {
  // Update child indices for nodes after insertion point
  for (let i = insertAfterIndex + 1; i < parentNode.children.length; i++) {
    parentNode.children[i].childIndex++;
  }

  // Set new node's index
  newNode.childIndex = insertAfterIndex + 1;

  // Insert into children array
  parentNode.children.splice(insertAfterIndex + 1, 0, newNode);
}
```

### Insertion Example

**User adds `<option>Green</option>` after "Blue"**:

```typescript
// New node structure
const greenOption = {
  hexPath: "10000000.20000000.50000000",
  tagName: "option",
  childIndex: 4,  // After Blue (index 3)
  children: [
    {
      hexPath: "10000000.20000000.50000000.10000000",
      tagName: "#text",
      length: 5,  // "Green"
      childIndex: 0,
      children: []
    }
  ]
};

// Insert into select element
const selectNode = findNodeByPath(sourceMap, "10000000.20000000");
insertNode(selectNode, greenOption, 3);  // After index 3 (Blue)
```

**Result:**
```
select 10000000.20000000
├─ option (index 0) → #text "Black" [5]
├─ option (index 1) → #text "White" [5]
├─ option (index 2) → #text "Red" [3]
├─ option (index 3) → #text "Blue" [4]
└─ option (index 4) → #text "Green" [5]  ← NEW!
```

**Next navigation automatically includes new node:**
- Offset 0-15: "Product Details"
- Offset 15-20: "Black"
- Offset 20-25: "White"
- Offset 25-28: "Red"
- Offset 28-32: "Blue"
- **Offset 32-37: "Green"** ← Automatically calculated!

---

## Deletion Algorithm

When user deletes an element, remove from children array:

```typescript
/**
 * Delete node from source map
 */
function deleteNode(
  parentNode: SourceMapNode,
  childIndex: number
): void {
  // Remove from children array
  parentNode.children.splice(childIndex, 1);

  // Update child indices for nodes after deletion
  for (let i = childIndex; i < parentNode.children.length; i++) {
    parentNode.children[i].childIndex--;
  }
}
```

### Deletion Example

**User deletes "Red" option**:

```typescript
const selectNode = findNodeByPath(sourceMap, "10000000.20000000");
deleteNode(selectNode, 2);  // Delete index 2 (Red)
```

**Result:**
```
BEFORE:
├─ option (index 0) → #text "Black" [5]
├─ option (index 1) → #text "White" [5]
├─ option (index 2) → #text "Red" [3]    ← DELETE THIS
├─ option (index 3) → #text "Blue" [4]

AFTER:
├─ option (index 0) → #text "Black" [5]
├─ option (index 1) → #text "White" [5]
└─ option (index 2) → #text "Blue" [4]   ← Index updated
```

**Next navigation automatically excludes deleted node:**
- Offset 0-15: "Product Details"
- Offset 15-20: "Black"
- Offset 20-25: "White"
- Offset 25-29: "Blue" ← Offset shifted automatically!

---

## Babel Plugin Generation

```javascript
function generateSelfContainedSourceMap(ast, componentName, filePath) {
  const sourceMap = {
    component: componentName,
    version: "1.0",
    sourceFile: filePath,
    generatedAt: Date.now(),
    rootNode: null
  };

  function createNode(astNode, hexPath, childIndex) {
    const node = {
      hexPath,
      tagName: getTagName(astNode),
      childIndex,
      children: []
    };

    // Is this a text node?
    if (astNode.type === 'JSXText') {
      const text = astNode.value.trim();
      if (text.length > 0) {
        node.length = text.length;  // ← ONLY TEXT NODES GET LENGTH!
      }
    }

    return node;
  }

  function traverse(astNode, parentHexPath, childIndex) {
    const hexCode = generateNextHexCode(childIndex);
    const hexPath = parentHexPath ? `${parentHexPath}.${hexCode}` : hexCode;

    const node = createNode(astNode, hexPath, childIndex);

    // Recursively process children
    if (astNode.children) {
      astNode.children.forEach((child, index) => {
        if (child.type === 'JSXElement' || child.type === 'JSXText') {
          const childNode = traverse(child, hexPath, index);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });
    }

    return node;
  }

  // Start traversal from component return statement
  const returnStatement = findReturnStatement(ast);
  sourceMap.rootNode = traverse(returnStatement.argument, "", 0);

  return sourceMap;
}

function generateNextHexCode(index) {
  return ((index + 1) * 0x10000000).toString(16).padStart(8, '0');
}
```

**Key points:**
- ✅ Only `JSXText` nodes get `length` property
- ✅ Element nodes just get `children` array
- ✅ No offsets calculated during generation
- ✅ Clean, simple tree structure

---

## Monaco Editor Integration

```typescript
class SelfContainedSourceMapNavigator {
  private sourceMap: SourceMap;

  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
  }

  /**
   * Find node at cursor position
   */
  findNodeAtCursor(cursorOffset: number): SourceMapNode | null {
    return this.navigate(this.sourceMap.rootNode, cursorOffset, 0);
  }

  private navigate(
    node: SourceMapNode,
    targetOffset: number,
    currentOffset: number
  ): SourceMapNode | null {

    // Is this a leaf with length?
    if (node.length !== undefined) {
      if (targetOffset >= currentOffset && targetOffset < currentOffset + node.length) {
        return node;
      }
      return null;
    }

    // Traverse children, summing lengths
    let childOffset = currentOffset;
    for (const child of node.children) {
      const found = this.navigate(child, targetOffset, childOffset);
      if (found) return found;

      childOffset += this.calculateTotalLength(child);
    }

    return null;
  }

  private calculateTotalLength(node: SourceMapNode): number {
    if (node.length !== undefined) {
      return node.length;
    }
    return node.children.reduce(
      (sum, child) => sum + this.calculateTotalLength(child),
      0
    );
  }

  /**
   * Update text node after edit
   */
  updateTextNode(textNode: SourceMapNode, newText: string): void {
    if (textNode.tagName !== '#text') {
      throw new Error('Can only update text nodes');
    }
    textNode.length = newText.length;  // O(1)!
  }

  /**
   * Insert new node
   */
  insertNode(
    parentNode: SourceMapNode,
    newNode: SourceMapNode,
    afterIndex: number
  ): void {
    // Update subsequent child indices
    for (let i = afterIndex + 1; i < parentNode.children.length; i++) {
      parentNode.children[i].childIndex++;
    }

    newNode.childIndex = afterIndex + 1;
    parentNode.children.splice(afterIndex + 1, 0, newNode);
  }

  /**
   * Calculate insertion point for Monaco
   */
  findInsertionContext(cursorOffset: number): InsertionContext | null {
    const node = this.findNodeAtCursor(cursorOffset);
    if (!node) return null;

    // Find parent element
    const parent = this.findParent(node);
    if (!parent) return null;

    // Determine position among siblings
    const siblings = parent.children;
    const currentIndex = siblings.indexOf(node);

    return {
      parentPath: parent.hexPath,
      prevSiblingPath: currentIndex > 0 ? siblings[currentIndex - 1].hexPath : null,
      nextSiblingPath: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].hexPath : null,
      insertAfterIndex: currentIndex
    };
  }

  private findParent(node: SourceMapNode): SourceMapNode | null {
    // Walk up the tree by removing last segment of hex path
    const parentPath = node.hexPath.split('.').slice(0, -1).join('.');
    return this.findNodeByPath(parentPath);
  }

  private findNodeByPath(hexPath: string): SourceMapNode | null {
    const segments = hexPath.split('.');
    let current = this.sourceMap.rootNode;

    for (const segment of segments) {
      if (!segment) continue;
      current = current.children.find(c => c.hexPath.endsWith(segment)) || null;
      if (!current) return null;
    }

    return current;
  }
}
```

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| **Find node at cursor** | O(n) | Must traverse tree, but early exit when found |
| **Update text length** | O(1) | Single property assignment |
| **Insert element** | O(siblings) | Update sibling indices only |
| **Delete element** | O(siblings) | Update sibling indices only |
| **Calculate position** | O(n) | Sum leaves during navigation (lazy) |

**Key insight**: We trade O(1) position lookup for O(1) updates. Since edits are far more frequent than cursor movements during hot reload, this is the right trade-off!

---

## Comparison: Traditional vs Self-Contained

| Feature | Absolute Offsets | Relative Offsets | Self-Contained Lengths |
|---------|------------------|------------------|------------------------|
| **Update complexity** | O(n) | O(log n) | **O(1)** ✅ |
| **Navigation complexity** | O(log n) | O(log n) | O(n) |
| **Sibling independence** | ❌ | ✅ | ✅✅✅ |
| **Parent updates** | Required | Required | **Not needed!** ✅ |
| **Memory per node** | 2 numbers | 2 numbers | **0-1 number** ✅ |
| **Conceptual simplicity** | Medium | High | **Highest** ✅ |

**Winner**: Self-contained lengths are the clear winner for hot reload!

---

## Real-World Example

### Source Code

```tsx
function ProductPage() {
  return (
    <div>
      <h1>Product Details</h1>
      <select>
        <option>Black</option>
        <option>White</option>
        <option>Red</option>
        <option>Blue</option>
      </select>
      <button>Add to Cart</button>
    </div>
  );
}
```

### Generated Source Map

```json
{
  "component": "ProductPage",
  "rootNode": {
    "hexPath": "",
    "tagName": "component",
    "childIndex": 0,
    "children": [
      {
        "hexPath": "10000000",
        "tagName": "div",
        "childIndex": 0,
        "children": [
          {
            "hexPath": "10000000.10000000",
            "tagName": "h1",
            "childIndex": 0,
            "children": [
              {
                "hexPath": "10000000.10000000.10000000",
                "tagName": "#text",
                "length": 15,
                "childIndex": 0,
                "children": []
              }
            ]
          },
          {
            "hexPath": "10000000.20000000",
            "tagName": "select",
            "childIndex": 1,
            "children": [
              {"hexPath": "10000000.20000000.10000000", "tagName": "option", "childIndex": 0,
                "children": [{"hexPath": "10000000.20000000.10000000.10000000", "tagName": "#text", "length": 5, "childIndex": 0, "children": []}]},
              {"hexPath": "10000000.20000000.20000000", "tagName": "option", "childIndex": 1,
                "children": [{"hexPath": "10000000.20000000.20000000.10000000", "tagName": "#text", "length": 5, "childIndex": 0, "children": []}]},
              {"hexPath": "10000000.20000000.30000000", "tagName": "option", "childIndex": 2,
                "children": [{"hexPath": "10000000.20000000.30000000.10000000", "tagName": "#text", "length": 3, "childIndex": 0, "children": []}]},
              {"hexPath": "10000000.20000000.40000000", "tagName": "option", "childIndex": 3,
                "children": [{"hexPath": "10000000.20000000.40000000.10000000", "tagName": "#text", "length": 4, "childIndex": 0, "children": []}]}
            ]
          },
          {
            "hexPath": "10000000.30000000",
            "tagName": "button",
            "childIndex": 2,
            "children": [
              {
                "hexPath": "10000000.30000000.10000000",
                "tagName": "#text",
                "length": 11,
                "childIndex": 0,
                "children": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Cursor Position Calculation

**User's cursor at character 22** (inside "White"):

```
Navigate from root, offset = 0:

div (10000000)
├─ h1 text "Product Details" [15] → offset 0-15
│  ✗ Cursor 22 not in range 0-15
│  Move offset: 0 + 15 = 15
│
├─ select (10000000.20000000)
│  ├─ option text "Black" [5] → offset 15-20
│  │  ✗ Cursor 22 not in range 15-20
│  │  Move offset: 15 + 5 = 20
│  │
│  ├─ option text "White" [5] → offset 20-25
│  │  ✓ Cursor 22 in range 20-25!
│  │  → Found: 10000000.20000000.20000000.10000000
│  │  → Position within text: 22 - 20 = 2 (after "Wh")
```

### Edit Scenario

**User changes "White" → "White Pearl"** (adds 6 characters):

```
Before:
{
  "hexPath": "10000000.20000000.20000000.10000000",
  "tagName": "#text",
  "length": 5
}

Update:
textNode.length = 11;

After:
{
  "hexPath": "10000000.20000000.20000000.10000000",
  "tagName": "#text",
  "length": 11
}

No other changes needed!
```

**Next navigation automatically reflects new positions:**
- "Product Details": 0-15 (unchanged)
- "Black": 15-20 (unchanged)
- "White Pearl": 20-31 (was 20-25, automatically recalculated!)
- "Red": 31-34 (was 25-28, automatically recalculated!)
- "Blue": 34-38 (was 28-32, automatically recalculated!)
- "Add to Cart": 38-49 (was 32-43, automatically recalculated!)

---

## Conclusion

**Self-contained source maps** with **leaf-only lengths** are the optimal design for hot reload because:

1. ✅ **O(1) updates** - only change one leaf's length property
2. ✅ **Zero cascading** - no parent or sibling updates needed
3. ✅ **Self-contained** - each text node is completely independent
4. ✅ **Simple** - no complex offset arithmetic
5. ✅ **Resilient** - edits don't invalidate other nodes
6. ✅ **Lazy calculation** - positions computed on-demand during navigation

**Trade-off**: Slightly slower navigation (O(n)) vs instant updates (O(1)). For hot reload, this is the right trade-off because **edits are far more frequent than cursor movements**.

This design enables **true structural hot reload** with minimal overhead and maximum resilience.

🔥 **The foundation for instant, reliable hot reload.**
