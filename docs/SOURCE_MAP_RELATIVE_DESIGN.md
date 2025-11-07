# Relative Source Map Design

**Date**: 2025-01-07
**Status**: ✅ Architectural Decision
**Related**: STRUCTURAL_HOT_RELOAD.md

---

## The Problem: Absolute Offsets are Fragile

Traditional source maps use **absolute character offsets** from the start of the file:

```typescript
// Absolute offset source map
{
  "option1": { offset: 4800, end: 4840 },  // Character 4800-4840 in file
  "option2": { offset: 4850, end: 4890 },  // Character 4850-4890 in file
  "option3": { offset: 4900, end: 4937 }   // Character 4900-4937 in file
}
```

**Problem**: When user edits line 100 (adds 50 characters), ALL offsets after line 100 are now wrong! The entire source map must be recalculated.

```
Edit at offset 2000: +50 characters
❌ option1: 4800 → 4850  (wrong!)
❌ option2: 4850 → 4900  (wrong!)
❌ option3: 4900 → 4950  (wrong!)
```

---

## The Solution: Self-Contained Leaf Lengths

**ONLY LEAF NODES HAVE LENGTHS!** Parent nodes just contain children. No cascading updates!

```typescript
// Self-contained length-based source map
{
  rootNode: {
    hexPath: "",
    tagName: "component",
    children: [
      {
        hexPath: "10000000",
        tagName: "div",
        children: [
          {
            hexPath: "10000000.10000000",
            tagName: "h1",
            children: [
              {
                hexPath: "10000000.10000000.10000000",
                tagName: "#text",
                length: 15,     // ✅ LEAF: "Product Details" (15 chars)
                children: []
              }
            ]
          },
          {
            hexPath: "10000000.70000000",
            tagName: "select",
            children: [
              {
                hexPath: "10000000.70000000.10000000",
                tagName: "option",
                children: [
                  {
                    hexPath: "10000000.70000000.10000000.10000000",
                    tagName: "#text",
                    length: 5,    // ✅ LEAF: "Black" (5 chars)
                    children: []
                  }
                ]
              },
              {
                hexPath: "10000000.70000000.20000000",
                tagName: "option",
                children: [
                  {
                    hexPath: "10000000.70000000.20000000.10000000",
                    tagName: "#text",
                    length: 5,    // ✅ LEAF: "White" (5 chars)
                    children: []
                  }
                ]
              },
              {
                hexPath: "10000000.70000000.30000000",
                tagName: "option",
                children: [
                  {
                    hexPath: "10000000.70000000.30000000.10000000",
                    tagName: "#text",
                    length: 3,    // ✅ LEAF: "Red" (3 chars)
                    children: []
                  }
                ]
              },
              {
                hexPath: "10000000.70000000.40000000",
                tagName: "option",
                children: [
                  {
                    hexPath: "10000000.70000000.40000000.10000000",
                    tagName: "#text",
                    length: 4,    // ✅ LEAF: "Blue" (4 chars)
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
}
```

**Key Insights**:

1. **Only text nodes (leaves) have `length`** - they're self-contained
2. **Element nodes have NO length** - just children array
3. **Calculate position by summing sibling lengths** as you navigate
4. **Edit a leaf? Zero cascade!** Parent nodes don't need updating

---

## Key Benefits

### 1. Sibling Independence (Zero Cascade!)

When you edit one text node, **NOTHING ELSE needs updating**:

```
Edit "Black" → "Black Pearl" (add 6 chars):
✅ Text node: length=5 → length=11 (only change!)
✅ option1 element: NO LENGTH (unchanged!)
✅ option2 element: NO LENGTH (unchanged!)
✅ select element: NO LENGTH (unchanged!)
✅ Parent elements: NO LENGTHS (unchanged!)
```

**Cost**: O(1) - literally just update one leaf node's length!

---

### 2. Tree Navigation (Sum as You Go)

To find cursor position, navigate and **sum sibling lengths**:

```typescript
function findNodeAtCursor(rootNode: SourceMapNode, cursorOffset: number): SourceMapNode | null {
  function navigate(node: SourceMapNode, currentOffset: number): SourceMapNode | null {
    // If this is a leaf with length, check if cursor is inside
    if (node.length !== undefined) {
      if (cursorOffset >= currentOffset && cursorOffset < currentOffset + node.length) {
        return node;
      }
      return null;
    }

    // Not a leaf - traverse children, summing lengths
    let childOffset = currentOffset;
    for (const child of node.children) {
      const found = navigate(child, childOffset);
      if (found) return found;

      // Move offset forward by child's total length (sum all leaves)
      childOffset += calculateTotalLength(child);
    }

    return null;
  }

  return navigate(rootNode, 0);
}

function calculateTotalLength(node: SourceMapNode): number {
  if (node.length !== undefined) {
    return node.length;  // Leaf node
  }
  // Sum all children lengths
  return node.children.reduce((sum, child) => sum + calculateTotalLength(child), 0);
}
```

**Example**: Cursor at offset 25 (inside "White")
1. Start at root, offset=0
2. Enter div (10000000), offset=0
3. Skip h1 text "Product Details" (15 chars), offset now=15
4. Enter select (10000000.70000000), offset=15
5. Skip option1 text "Black" (5 chars), offset now=20
6. Enter option2 (10000000.70000000.20000000), offset=20
7. Check text "White" (length=5): 25 >= 20 && 25 < 25? ✅
8. **Found!** Cursor is in "White" text node

---

### 3. Incremental Updates (Trivial!)

When user types, **only update the ONE leaf node**:

```typescript
function updateNodeAfterEdit(
  leafNode: SourceMapNode,
  newLength: number
): void {
  // That's it! Just update the leaf's length
  leafNode.length = newLength;

  // NO parent updates needed!
  // NO sibling updates needed!
  // NO cascading changes!
}
```

**Cost**: O(1) - single property assignment!

---

## Data Structure

```typescript
interface SourceMapNode {
  hexPath: string;              // "10000000.70000000.20000000.10000000"
  tagName: string;              // "select" | "option" | "#text"

  // ONLY LEAVES HAVE LENGTH!
  length?: number;              // Character count (only for text nodes)

  // Tree navigation
  children: SourceMapNode[];    // Array of child nodes
  parent?: SourceMapNode;       // Reference to parent (for upward traversal)

  // Sibling navigation (optional - for convenience)
  childIndex: number;           // Position among siblings (0-based)
  nextSibling?: SourceMapNode;  // Direct reference (optional optimization)
  prevSibling?: SourceMapNode;  // Direct reference (optional optimization)
}

interface SourceMap {
  component: string;
  version: string;
  sourceFile: string;
  generatedAt: number;
  rootNode: SourceMapNode;      // Tree root (component function)
}
```

**Key Rules:**
1. ✅ `length` exists ONLY on leaf nodes (text nodes)
2. ✅ Element nodes have `children` array, NO `length`
3. ✅ Position calculated by summing sibling leaves during navigation
4. ✅ Edits update ONLY the leaf - zero cascade!

---

## Comparison: Absolute vs Leaf-Only

| Metric | Absolute Offsets | Leaf-Only Lengths |
|--------|------------------|-------------------|
| **Update on edit** | O(n) - all nodes after edit | ✅ **O(1)** - single leaf! |
| **Sibling independence** | ❌ Siblings affected | ✅ Siblings unaffected |
| **Parent updates** | ❌ All parents need update | ✅ **Zero parent updates!** |
| **Navigation** | O(n) - scan all nodes | O(n) - sum leaves (cached) |
| **Memory** | O(n) - flat map | O(n) - tree structure |
| **Insertion** | Recalculate entire map | Add new leaf node |
| **Deletion** | Recalculate entire map | Remove leaf node |
| **Complexity** | ✅ Simple arithmetic | Tree traversal + sum |
| **Cache-friendly** | ❌ Offsets invalidate | ✅ **Lengths never change!** |

---

## Real-World Example

### Scenario: User types in middle of component

**File**: ProductDetailsPage.tsx

```tsx
// Line 1-99: Component setup (2500 chars)

function ProductDetailsPage() {
  return (
    <div>                          {/* Line 100, offset 2500 */}
      <h1>Product</h1>             {/* Line 101, offset 2520 */}

      <select>                     {/* Line 103, offset 2600 */}
        <option>Black</option>     {/* Line 104, offset 2650 */}
        <option>White</option>     {/* Line 105, offset 2700 */}
        █ USER TYPES HERE          {/* Line 106, offset 2750 - INSERT! */}
        <option>Red</option>       {/* Line 107, offset 2800 */}
        <option>Blue</option>      {/* Line 108, offset 2850 */}
      </select>

      <button>Add to Cart</button> {/* Line 110, offset 3000 */}
    </div>
  );
}

// Line 112-200: More component code (3000 chars)
```

### With Absolute Offsets ❌

User types 50 characters at offset 2750:

```
BEFORE:
- Red option:  offset 2800
- Blue option: offset 2850
- Button:      offset 3000

AFTER (ALL WRONG!):
- Red option:  2800 (should be 2850!)
- Blue option: 2850 (should be 2900!)
- Button:      3000 (should be 3050!)

→ Must recalculate 50+ nodes!
```

### With Relative Ranges ✅

User types 50 characters at `relativeStart=100` inside select:

```
BEFORE:
select: relativeStart=100, relativeEnd=350
  - option1 (Black): relativeStart=50, relativeEnd=40
  - option2 (White): relativeStart=100, relativeEnd=40
  - option3 (Red):   relativeStart=150, relativeEnd=35
  - option4 (Blue):  relativeStart=200, relativeEnd=37
button: relativeStart=500, relativeEnd=100

AFTER:
select: relativeStart=100, relativeEnd=400 ✅ (+50)
  - option1 (Black): relativeStart=50, relativeEnd=40 ✅ (unchanged)
  - option2 (White): relativeStart=100, relativeEnd=40 ✅ (unchanged)
  - [NEW OPTION inserted here with relativeStart=150]
  - option3 (Red):   relativeStart=200, relativeEnd=35 ✅ (shifted +50)
  - option4 (Blue):  relativeStart=250, relativeEnd=37 ✅ (shifted +50)
button: relativeStart=500, relativeEnd=100 ✅ (unchanged - different parent!)

→ Updated: 4 nodes (select + 2 children + root)
→ Unchanged: 50+ other nodes!
```

---

## Implementation Notes

### Babel Plugin Generation

```javascript
function generateRelativeSourceMap(ast, componentName) {
  const rootNode = {
    hexPath: "",
    tagName: "component",
    relativeStart: 0,
    relativeEnd: 0,
    childIndex: 0,
    children: []
  };

  function traverse(astNode, parentSourceMapNode, parentStart) {
    const nodeStart = astNode.loc.start.offset;
    const nodeEnd = astNode.loc.end.offset;

    const sourceMapNode = {
      hexPath: generateHexPath(parentSourceMapNode),
      tagName: getTagName(astNode),
      relativeStart: nodeStart - parentStart,  // ← RELATIVE!
      relativeEnd: nodeEnd - nodeStart,         // ← SPAN, not absolute!
      childIndex: parentSourceMapNode.children.length,
      children: [],
      parent: parentSourceMapNode
    };

    parentSourceMapNode.children.push(sourceMapNode);

    // Recursively process children
    astNode.children?.forEach(child => {
      if (child.type === 'JSXElement') {
        traverse(child, sourceMapNode, nodeStart);
      }
    });

    return sourceMapNode;
  }

  // Walk AST and build tree
  const returnStatement = findReturnStatement(ast);
  traverse(returnStatement, rootNode, 0);

  return {
    component: componentName,
    version: "1.0",
    rootNode
  };
}
```

### Monaco Integration

```typescript
class RelativeSourceMapNavigator {
  private sourceMap: SourceMap;

  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
  }

  /**
   * Find node at cursor position
   */
  findNodeAtCursor(cursorOffset: number): SourceMapNode | null {
    return this.navigate(this.sourceMap.rootNode, 0, cursorOffset);
  }

  private navigate(
    node: SourceMapNode,
    parentOffset: number,
    targetOffset: number
  ): SourceMapNode | null {
    const nodeStart = parentOffset + node.relativeStart;
    const nodeEnd = nodeStart + node.relativeEnd;

    if (targetOffset >= nodeStart && targetOffset <= nodeEnd) {
      // Check children first (most specific match)
      for (const child of node.children) {
        const found = this.navigate(child, nodeStart, targetOffset);
        if (found) return found;
      }
      return node;
    }

    return null;
  }

  /**
   * Update source map after edit
   */
  updateAfterEdit(
    node: SourceMapNode,
    editPosition: number,
    deltaLength: number
  ): void {
    // Update node span
    node.relativeEnd += deltaLength;

    // Shift subsequent siblings
    if (node.parent) {
      for (const sibling of node.parent.children) {
        if (sibling.relativeStart > node.relativeStart + editPosition) {
          sibling.relativeStart += deltaLength;
        }
      }

      // Recursively update parents
      this.updateAfterEdit(node.parent, node.relativeStart, deltaLength);
    }
  }
}
```

---

## Conclusion

**Relative hierarchical source maps** are the correct architectural choice for hot reload because:

1. ✅ **Edits are localized** - only the parent chain is affected
2. ✅ **Siblings are independent** - changing one child doesn't affect others
3. ✅ **Tree navigation is natural** - matches JSX structure exactly
4. ✅ **Scales to large files** - O(log n) updates instead of O(n)
5. ✅ **Enables incremental transpilation** - can insert/remove nodes surgically

This design makes **structural hot reload** feasible for real-world applications with hundreds of components and thousands of elements.

**Cost**: Slightly more complex than flat maps, but the benefits for hot reload far outweigh the cost.

🔥 **The foundation for true instant feedback.**
