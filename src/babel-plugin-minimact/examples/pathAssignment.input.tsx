/**
 * Example: pathAssignment.cjs - First pass that assigns hex paths to all JSX nodes
 *
 * CRITICAL: This is the FIRST PASS before any extraction.
 * Solves: Each extractor used to recalculate paths → mismatches
 * Solution: Single pass assigns paths, all extractors read from node.__minimactPath
 *
 * Functions exported:
 * - assignPathsToJSX(node, parentPath, pathGen, t) - Main traversal
 * - assignPathsToChildren(children, parentPath, pathGen, t) - Process children array
 * - assignPathsToExpression(expr, parentPath, pathGen, t) - Handle &&, ?, .map()
 * - getPathFromNode(node) - Read __minimactPath (throws if missing)
 * - getPathSegmentsFromNode(node) - Read __minimactPathSegments
 * - isValidHexPath(key) - Validate hex path format
 * - generateVNodeRepresentation(node, path, t) - For hot reload insertions
 *
 * Features:
 * - Reuses existing key attributes if valid hex format and in sort order
 * - Half-gap generation for insertions between siblings (e.g., "1.15" between "1.1" and "1.2")
 * - Hot reload: tracks structural changes (insertions)
 * - Attribute paths: element.@attrName format
 * - Handles: JSXElement, JSXFragment, JSXText, JSXExpressionContainer
 * - Recurses into conditional expressions (&&, ?:) and .map() callbacks
 */
import { useState } from '@minimact/core';

export function PathAssignmentExample() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [isVisible, setIsVisible] = useState(true);

  return (
    // 1. Root element gets path "1"
    <div className="container">
      {/* 2. Static text child */}
      <h1>Title</h1>

      {/* 3. Element with expression child */}
      <span>{count}</span>

      {/* 4. Element with attribute - attribute gets path "1.x.@onClick" */}
      <button onClick={() => setCount(count + 1)}>+</button>

      {/* 5. Conditional && - expression container gets path, JSX inside recurses */}
      {isVisible && <p>Visible content</p>}

      {/* 6. Ternary - both branches get paths */}
      {isVisible ? (
        <div>Yes</div>
      ) : (
        <div>No</div>
      )}

      {/* 7. .map() - callback JSX gets paths */}
      <ul>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {/* 8. Fragment - children become direct siblings (fragment has no path) */}
      <>
        <span>First</span>
        <span>Second</span>
      </>

      {/* 9. Nested elements - paths grow: "1.x.y.z" */}
      <div>
        <div>
          <span>Deep nesting</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT RELOAD SCENARIO: Existing keys are preserved, insertions get half-gap paths
// ═══════════════════════════════════════════════════════════════════════════════

// Before edit (from .tsx.keys file):
//   <div key="1">
//     <span key="1.1">A</span>
//     <span key="1.2">B</span>
//   </div>

// After edit (inserting new element between A and B):
//   <div key="1">
//     <span key="1.1">A</span>
//     <span>NEW</span>        ← Gets key="1.18" (half-gap between 1.1 and 1.2)
//     <span key="1.2">B</span>
//   </div>

// After assignPathsToJSX() runs on this component, AST nodes have:
//
// JSXElement (div)
//   __minimactPath: "1"
//   __minimactPathSegments: ["1"]
//   children:
//     JSXElement (h1)
//       __minimactPath: "1.1"
//       __minimactPathSegments: ["1", "1"]
//     JSXElement (span)
//       __minimactPath: "1.2"
//       children:
//         JSXExpressionContainer
//           __minimactPath: "1.2.1"
//     JSXElement (button)
//       __minimactPath: "1.3"
//       @onClick attribute:
//         __minimactPath: "1.3.@onClick"
//     JSXExpressionContainer (isVisible &&)
//       __minimactPath: "1.4"
//       inner JSXElement (p):
//         __minimactPath: "1.4.1"
//     ... etc
