/**
 * Path Assignment Pass for Minimact
 *
 * CRITICAL: This is the FIRST PASS that runs before any extraction.
 * It assigns hex paths to every JSX node by mutating the AST.
 *
 * Problem it solves:
 * - Old system: Each extractor recalculated paths independently
 * - Result: Path mismatches between template/attribute/handler extractors
 *
 * Solution:
 * - Single pass assigns paths and stores in node.__minimactPath
 * - All extractors read from node.__minimactPath (no recalculation!)
 * - ALSO builds self-contained source map tree during traversal
 *
 * Usage:
 *   const pathGen = new HexPathGenerator();
 *   const sourceMapRoot = assignPathsToJSX(jsxRoot, '', pathGen, t);
 *   // Now all JSX nodes have __minimactPath metadata
 *   // AND we have a source map tree with leaf-only lengths
 */

const { HexPathGenerator } = require('./hexPath.cjs');

/**
 * Extract text length between two positions in source code
 * @param {string[]} lines - Source code split by lines (may contain \r from \r\n)
 * @param {number} startLine - Start line (0-based)
 * @param {number} startCol - Start column (0-based)
 * @param {number} endLine - End line (0-based)
 * @param {number} endCol - End column (0-based)
 * @returns {number} - Character count including newlines
 */
function extractTextLength(lines, startLine, startCol, endLine, endCol) {
  if (startLine === endLine) {
    // Same line - just count columns
    return endCol - startCol;
  }

  let length = 0;

  // First line: from startCol to end of line
  const firstLineContent = lines[startLine];
  const remainingCharsOnFirstLine = firstLineContent.length - startCol;

  // Add remaining chars on first line, but remove \r if present (we'll count \n separately)
  const hasCarriageReturn = firstLineContent.endsWith('\r');
  length += remainingCharsOnFirstLine;
  if (hasCarriageReturn) {
    length -= 1; // Don't count \r as part of line content
  }
  length += 1; // Add \n separator (always 1, even if file uses \r\n)

  // Middle lines: full length including newline
  for (let i = startLine + 1; i < endLine; i++) {
    const lineContent = lines[i];
    const lineHasCR = lineContent.endsWith('\r');
    length += lineContent.length;
    if (lineHasCR) {
      length -= 1; // Don't count \r
    }
    length += 1; // Add \n separator
  }

  // Last line: from start to endCol (no newline)
  length += endCol;

  return length;
}

/**
 * Assign hex paths to all JSX nodes in tree AND build source map
 *
 * Mutates AST by adding __minimactPath and __minimactPathSegments to each node.
 * This ensures consistent paths across all subsequent extractors.
 *
 * ALSO builds a source map node tree with preLength/postLength for hot reload.
 *
 * @param {Object} node - Babel AST node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {number} childIndex - Position among siblings (for source map)
 * @param {string} sourceCode - Original source code (for extracting tag text)
 * @param {Object} previousEndLoc - End location of previous sibling (for leading whitespace)
 * @returns {Object|null} - Source map node or null
 */
function assignPathsToJSX(node, parentPath, pathGen, t, childIndex = 0, sourceCode = null, previousEndLoc = null) {
  if (t.isJSXElement(node)) {
    // Generate hex path for this element
    const childHex = pathGen.next(parentPath);
    const currentPath = pathGen.buildPath(parentPath, childHex);
    const pathSegments = pathGen.parsePath(currentPath);

    // Mutate AST node with path data
    node.__minimactPath = currentPath;
    node.__minimactPathSegments = pathSegments;

    // Process attributes (for @attributeName paths)
    if (node.openingElement && node.openingElement.attributes) {
      for (const attr of node.openingElement.attributes) {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
          const attrName = attr.name.name;
          const attrPath = `${currentPath}.@${attrName}`;

          // Mutate attribute node with path
          attr.__minimactPath = attrPath;
          attr.__minimactPathSegments = [...pathSegments, `@${attrName}`];
        }
      }
    }

    // Build source map node (element - has preLength and postLength!)
    const tagName = t.isJSXIdentifier(node.openingElement.name)
      ? node.openingElement.name.name
      : 'UnknownElement';

    // Debug: Log path assignment
    console.log(`[DEBUG] Assigned path ${currentPath} to <${tagName}>`);

    let preLength = 0;
    let postLength = 0;

    // If we have source code and location info, extract actual text
    if (sourceCode && node.loc && node.openingElement.loc) {
      const selfClosing = node.openingElement.selfClosing;
      const lines = sourceCode.split('\n');

      // Calculate preLength: whitespace from previous sibling + opening tag + whitespace before first child
      const openingStart = node.openingElement.loc.start;
      const openingEnd = node.openingElement.loc.end;

      // Start position: either previous sibling's end or opening tag start
      const startLine = previousEndLoc ? previousEndLoc.line - 1 : openingStart.line - 1;
      const startCol = previousEndLoc ? previousEndLoc.column : openingStart.column;

      // If there are children, preLength includes everything up to first child
      if (node.children && node.children.length > 0) {
        // Find first non-whitespace child
        const firstRealChild = node.children.find(child =>
          (t.isJSXElement(child) || t.isJSXExpressionContainer(child) ||
           (t.isJSXText(child) && child.value.trim().length > 0))
        );

        if (firstRealChild && firstRealChild.loc) {
          // preLength = whitespace from previous + opening tag + whitespace before first child
          const endLine = firstRealChild.loc.start.line - 1;
          const endCol = firstRealChild.loc.start.column;

          preLength = extractTextLength(lines, startLine, startCol, endLine, endCol);
        } else {
          // No real children, measure from previous to end of opening tag
          preLength = extractTextLength(
            lines,
            startLine,
            startCol,
            openingEnd.line - 1,
            openingEnd.column
          );
        }
      } else {
        // No children - whitespace from previous + opening tag
        preLength = extractTextLength(
          lines,
          startLine,
          startCol,
          openingEnd.line - 1,
          openingEnd.column
        );
      }

      // Calculate postLength: just the closing tag (no whitespace)
      // Whitespace after children is handled by each child's postLength
      if (!selfClosing && node.closingElement && node.closingElement.loc) {
        const closingStart = node.closingElement.loc.start;
        const closingEnd = node.closingElement.loc.end;
        postLength = extractTextLength(
          sourceCode.split('\n'),
          closingStart.line - 1,
          closingStart.column,
          closingEnd.line - 1,
          closingEnd.column
        );
      }
    }

    const sourceMapNode = {
      hexPath: currentPath,
      tagName,
      childIndex,
      preLength,
      postLength,
      children: []
    };

    // Recursively assign paths to children and collect source map children
    if (node.children) {
      // Pass the end of opening tag as the "previous position" for first child
      const previousEndLoc = node.openingElement.loc ? node.openingElement.loc.end : null;
      sourceMapNode.children = assignPathsToChildren(
        node.children,
        currentPath,
        pathGen,
        t,
        sourceCode,
        previousEndLoc  // Previous sibling's end location (or parent's opening tag end)
      );
    }

    return sourceMapNode;
  } else if (t.isJSXFragment(node)) {
    // Fragments don't get paths - return children directly flattened
    if (node.children) {
      // For fragments, pass null as previousEndLoc since we don't have a specific location
      return {
        hexPath: parentPath,
        tagName: 'Fragment',
        childIndex,
        preLength: 0,
        postLength: 0,
        children: assignPathsToChildren(node.children, parentPath, pathGen, t, sourceCode, null)
      };
    }
    return null;
  }

  return null;
}

/**
 * Assign paths to JSX children array AND build source map children
 *
 * Handles mixed content: JSXElement, JSXText, JSXExpressionContainer, JSXFragment
 *
 * @param {Array} children - Array of Babel AST nodes
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {string} sourceCode - Original source code
 * @param {Object} previousEndLoc - End location of previous sibling (for whitespace calculation)
 * @returns {Array} - Array of source map nodes
 */
function assignPathsToChildren(children, parentPath, pathGen, t, sourceCode = null, previousEndLoc = null) {
  const sourceMapChildren = [];
  let childIndex = 0;
  let prevEndLoc = previousEndLoc;  // Track end of previous sibling

  for (const child of children) {
    if (t.isJSXElement(child)) {
      // Nested JSX element - calculate preLength including whitespace from previous sibling
      const sourceMapNode = assignPathsToJSX(child, parentPath, pathGen, t, childIndex, sourceCode, prevEndLoc);
      if (sourceMapNode) {
        sourceMapChildren.push(sourceMapNode);
        childIndex++;
        // Update previous end location for next sibling
        if (child.loc) {
          prevEndLoc = child.loc.end;
        }
      }
    } else if (t.isJSXText(child)) {
      // Static text node
      const text = child.value.trim();
      if (text) {
        const textHex = pathGen.next(parentPath);
        const textPath = pathGen.buildPath(parentPath, textHex);
        const textSegments = pathGen.parsePath(textPath);

        // Mutate text node with path
        child.__minimactPath = textPath;
        child.__minimactPathSegments = textSegments;

        // Build source map node (text - HAS length!)
        sourceMapChildren.push({
          hexPath: textPath,
          tagName: '#text',
          length: text.length,  // ✅ ONLY text nodes get length!
          childIndex,
          children: []
        });
        childIndex++;

        // Update previous end location for next sibling
        if (child.loc) {
          prevEndLoc = child.loc.end;
        }
      }
    } else if (t.isJSXExpressionContainer(child)) {
      // Expression container - assign path and recurse into structural JSX
      const expr = child.expression;

      // Skip JSX comments (empty expressions like {/* comment */})
      if (t.isJSXEmptyExpression(expr)) {
        // Don't assign path, don't increment counter - comments are ignored
        continue;
      }

      // Generate path for the expression container
      const exprHex = pathGen.next(parentPath);
      const exprPath = pathGen.buildPath(parentPath, exprHex);
      const exprSegments = pathGen.parsePath(exprPath);

      // Mutate expression container with path
      child.__minimactPath = exprPath;
      child.__minimactPathSegments = exprSegments;

      // Recurse into structural expressions (conditionals, loops)
      const exprSourceMap = assignPathsToExpression(expr, exprPath, pathGen, t, childIndex, sourceCode, null);
      if (exprSourceMap) {
        // Structural JSX (conditional/loop) - use its source map
        sourceMapChildren.push(exprSourceMap);
        childIndex++;
        // Update previous end location for next sibling
        if (child.loc) {
          prevEndLoc = child.loc.end;
        }
      } else {
        // Simple expression like {count} or {todo.done ? '✓' : '○'}
        // Add it to source map with length calculated from source code
        if (sourceCode && child.loc) {
          const exprLength = extractTextLength(
            sourceCode.split('\n'),
            child.loc.start.line - 1,
            child.loc.start.column,
            child.loc.end.line - 1,
            child.loc.end.column
          );

          sourceMapChildren.push({
            hexPath: exprPath,
            tagName: '#expression',
            length: exprLength,  // Length of {expression} including braces
            childIndex,
            children: []
          });
          childIndex++;

          // Update previous end location for next sibling
          prevEndLoc = child.loc.end;
        }
      }
    } else if (t.isJSXFragment(child)) {
      // Fragment - flatten children
      const fragmentSourceMap = assignPathsToJSX(child, parentPath, pathGen, t, childIndex, sourceCode, prevEndLoc);
      if (fragmentSourceMap && fragmentSourceMap.children) {
        // Flatten fragment children into parent
        sourceMapChildren.push(...fragmentSourceMap.children);
        childIndex += fragmentSourceMap.children.length;

        // Update previous end location for next sibling
        if (child.loc) {
          prevEndLoc = child.loc.end;
        }
      }
    }
  }

  return sourceMapChildren;
}

/**
 * Assign paths to expressions containing JSX AND build source map
 *
 * Handles:
 * - Logical AND: {isVisible && <Modal />}
 * - Ternary: {isAdmin ? <AdminPanel /> : <UserPanel />}
 * - Array.map: {items.map(item => <li>{item}</li>)}
 *
 * @param {Object} expr - Babel expression node
 * @param {string} parentPath - Parent hex path
 * @param {HexPathGenerator} pathGen - Hex path generator
 * @param {Object} t - Babel types
 * @param {number} childIndex - Position among siblings
 * @param {string} sourceCode - Original source code
 * @param {Object} previousEndLoc - End location of previous sibling (for leading whitespace)
 * @returns {Object|null} - Source map node or null
 */
function assignPathsToExpression(expr, parentPath, pathGen, t, childIndex = 0, sourceCode = null, previousEndLoc = null) {
  if (!expr) return null;

  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    // Logical AND: {isAdmin && <div>Admin Panel</div>}
    if (t.isJSXElement(expr.right)) {
      return assignPathsToJSX(expr.right, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
    } else if (t.isJSXExpressionContainer(expr.right)) {
      return assignPathsToExpression(expr.right.expression, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
    }
  } else if (t.isConditionalExpression(expr)) {
    // Ternary: {loading ? <Spinner/> : <Content/>}
    // Both branches share the same path (conditional rendering)
    // We need to assign paths to BOTH branches so template extractors can find them
    // BUT they should get the SAME path since they're mutually exclusive

    let sourceMapNode = null;

    // Assign paths to consequent (true branch)
    if (t.isJSXElement(expr.consequent)) {
      sourceMapNode = assignPathsToJSX(expr.consequent, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
    } else if (t.isJSXExpressionContainer(expr.consequent)) {
      sourceMapNode = assignPathsToExpression(expr.consequent.expression, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
    }

    // Assign paths to alternate (false branch)
    // IMPORTANT: Reset the counter so alternate gets the SAME paths as consequent
    if (expr.alternate) {
      // Save and reset the counter for this parent path
      const savedCounter = pathGen.counters[parentPath];
      const counterBeforeConsequent = savedCounter - (sourceMapNode ? 1 : 0);
      pathGen.counters[parentPath] = counterBeforeConsequent;

      if (t.isJSXElement(expr.alternate)) {
        const alternateSourceMap = assignPathsToJSX(expr.alternate, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
        // Use consequent for source map if available, otherwise alternate
        sourceMapNode = sourceMapNode || alternateSourceMap;
      } else if (t.isJSXExpressionContainer(expr.alternate)) {
        const alternateSourceMap = assignPathsToExpression(expr.alternate.expression, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
        sourceMapNode = sourceMapNode || alternateSourceMap;
      }

      // Restore the counter to where it was after consequent
      pathGen.counters[parentPath] = savedCounter;
    }

    return sourceMapNode;
  } else if (t.isCallExpression(expr) &&
             t.isMemberExpression(expr.callee) &&
             t.isIdentifier(expr.callee.property) &&
             expr.callee.property.name === 'map') {
    // Array.map: {items.map(item => <li>{item}</li>)}

    const callback = expr.arguments[0];
    if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
      const body = callback.body;

      if (t.isJSXElement(body)) {
        // Arrow function with JSX body: item => <li>{item}</li>
        return assignPathsToJSX(body, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
      } else if (t.isBlockStatement(body)) {
        // Arrow function with block: item => { return <li>{item}</li>; }
        const returnStmt = body.body.find(stmt => t.isReturnStatement(stmt));
        if (returnStmt && t.isJSXElement(returnStmt.argument)) {
          return assignPathsToJSX(returnStmt.argument, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
        }
      }
    }
  } else if (t.isJSXFragment(expr)) {
    // Fragment
    return assignPathsToJSX(expr, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
  } else if (t.isJSXElement(expr)) {
    // Direct JSX element
    return assignPathsToJSX(expr, parentPath, pathGen, t, childIndex, sourceCode, previousEndLoc);
  }

  return null;
}

/**
 * Get path from AST node (helper for extractors)
 *
 * Reads __minimactPath metadata assigned by this pass.
 * Throws error if path wasn't assigned (indicates bug).
 *
 * @param {Object} node - Babel AST node
 * @returns {string} - Hex path
 */
function getPathFromNode(node) {
  if (!node.__minimactPath) {
    throw new Error('[Minimact] Path not assigned to node! Did you forget to run assignPathsToJSX?');
  }
  return node.__minimactPath;
}

/**
 * Get path segments from AST node (helper for extractors)
 *
 * @param {Object} node - Babel AST node
 * @returns {string[]} - Path segments array
 */
function getPathSegmentsFromNode(node) {
  if (!node.__minimactPathSegments) {
    throw new Error('[Minimact] Path segments not assigned to node! Did you forget to run assignPathsToJSX?');
  }
  return node.__minimactPathSegments;
}

module.exports = {
  assignPathsToJSX,
  assignPathsToChildren,
  assignPathsToExpression,
  getPathFromNode,
  getPathSegmentsFromNode
};
