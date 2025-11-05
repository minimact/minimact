# Implementation Checklist: Path to Feature Parity

**Goal**: Systematically port features from `babel-plugin-minimact` to achieve 100% parity

**Timeline**: 3 weeks (15 working days)

---

## ✅ Phase 1: Modular Architecture (COMPLETE)

- [x] Created modular structure (19 files)
- [x] Core: hexPath.js, nodes.js, traverser.js
- [x] Processors: component.js, jsx.js, attributes.js, expressions.js, children.js
- [x] Extractors: bindings.js, templates.js, conditionals.js, loops.js, styles.js
- [x] Utils: ast.js, validation.js, logging.js, fileSystem.js
- [x] Legacy: sharedLogic.js (battle-tested functions ported)
- [x] Reduced index.js from 477 lines → 70 lines (85% reduction)

---

## 📋 Phase 2A: Transform Methods & Expressions (Days 1-2)

### Transform Methods

- [ ] **Wire up extractMethodCallBindingShared()** ⭐ CRITICAL
  - **Source**: `legacy/sharedLogic.js:217-282` ✅ Already ported
  - **Target**: `processors/expressions.js:~line 130`
  - **Changes**:
    ```javascript
    // In processExpression():
    if (t.isCallExpression(expr)) {
      // Check for transform method
      const transform = extractMethodCallBindingShared(expr);
      if (transform) {
        node.binding = transform.binding;
        node.transform = transform.transform;
        node.args = transform.args;
        node.template = '{0}';
        return node;
      }
      // ... existing map/filter logic
    }
    ```
  - **Tests**: `01-ComplexTemplateLiterals.tsx:29,32,35,41,47`
  - **Validation**: Check JSON has `transform`, `binding`, `args` fields

### Binary Expressions

- [ ] **Extract identifiers from binary expressions**
  - **Source**: `legacy/sharedLogic.js:59-93` ✅ Already ported
  - **Target**: `processors/expressions.js:~line 150`
  - **Changes**:
    ```javascript
    if (t.isBinaryExpression(expr)) {
      const identifiers = [];
      extractIdentifiersShared(expr, identifiers);
      node.bindings = identifiers.map(id => ({
        type: 'Identifier',
        path: id
      }));
      node.operator = expr.operator;
      node.raw = getExpressionRaw(expr, t);
    }
    ```
  - **Tests**: `01-ComplexTemplateLiterals.tsx:35` (complex calc)
  - **Validation**: Bindings array contains all identifiers

### Success Criteria

- ✅ `.toFixed(2)` extracts transform metadata
- ✅ `price * quantity` extracts both identifiers
- ✅ `(discount * 100).toFixed(0)` combines binary + transform
- ✅ Test 01 generates valid JSON

---

## 📋 Phase 2B: Style Objects (Day 3)

### Style Object Integration

- [ ] **Integrate extractors/styles.js with attributes.js**
  - **Source**: `extractors/styles.js` ✅ Already exists
  - **Target**: `processors/attributes.js:~line 80`
  - **Changes**:
    ```javascript
    // In processAttributes():
    if (attrName === 'style' && t.isObjectExpression(expr)) {
      const { extractStyleObject } = require('../extractors/styles');
      const styleProps = extractStyleObject(expr, t);

      attrNode.type = 'StyleAttribute';
      attrNode.properties = styleProps;
      // Convert to CSS string for C#
      attrNode.cssString = stylePropsToCss(styleProps);
    }
    ```
  - **Tests**: `00-ProductDetailsPage.tsx:47,51,64,67,etc.`

### CamelCase → kebab-case Conversion

- [ ] **Port style converter utility**
  - **Source**: OLD `src/utils/styleConverter.cjs:20-50`
  - **Target**: `extractors/styles.js:~line 150`
  - **Function**:
    ```javascript
    function convertCssPropertyName(camelCase) {
      // fontSize → font-size
      return camelCase.replace(/[A-Z]/g, letter =>
        `-${letter.toLowerCase()}`
      );
    }
    ```

### Conditional Styles

- [ ] **Handle conditional style values**
  - **Example**: `opacity: isVisible ? 1 : 0.5`
  - **Target**: `extractors/styles.js:~line 50`
  - **Changes**: Already partially handled, enhance extraction

### Success Criteria

- ✅ Style objects convert to CSS strings
- ✅ CamelCase properties converted
- ✅ Conditional style values extracted
- ✅ Test 00 styles generate correctly

---

## 📋 Phase 2C: Nested Loops (Days 4-5)

### Recursive Loop Traversal

- [ ] **Add loop context tracking**
  - **Source**: OLD `src/extractors/loopTemplates.cjs:50-120`
  - **Target**: `extractors/loops.js:~line 80`
  - **Changes**:
    ```javascript
    function extractMapLoop(expr, parentPath, pathGen, t, loopContext = []) {
      // loopContext = [{ itemVar: 'category', arrayBinding: 'categories' }, ...]

      const arrayBinding = buildMemberPath(expr.callee.object, t);
      const arrowFunc = expr.arguments[0];
      const itemVar = arrowFunc.params[0]?.name || 'item';
      const indexVar = arrowFunc.params[1]?.name || null;

      // Add to context for nested loops
      const newContext = [...loopContext, { itemVar, arrayBinding }];

      // Recursively process body WITH loop context
      let body = null;
      if (t.isJSXElement(arrowFunc.body)) {
        body = traverseJSX(arrowFunc.body, parentPath, pathGen, t, {
          ...context,
          loopContext: newContext  // Pass context down!
        });
      }

      // Check for nested maps in body
      // ... recursive processing
    }
    ```
  - **Tests**: `02-NestedMapCalls.tsx:81-90,98-114`

### Loop Context in Bindings

- [ ] **Track loop variables in bindings**
  - **Target**: `extractors/bindings.js:~line 40`
  - **Changes**:
    ```javascript
    function extractBindings(expr, t, loopContext = []) {
      // Check if binding references loop variable
      if (t.isIdentifier(expr)) {
        for (const ctx of loopContext) {
          if (expr.name === ctx.itemVar) {
            return {
              type: 'LoopVariable',
              loopVar: ctx.itemVar,
              arrayBinding: ctx.arrayBinding
            };
          }
        }
      }

      if (t.isMemberExpression(expr)) {
        const path = buildMemberPath(expr, t);

        // Check if starts with loop variable
        for (const ctx of loopContext) {
          if (path.startsWith(ctx.itemVar + '.')) {
            return {
              type: 'LoopMemberExpression',
              loopVar: ctx.itemVar,
              path: path,
              relativePath: path.substring(ctx.itemVar.length + 1)
            };
          }
        }
      }
    }
    ```

### Success Criteria

- ✅ Double-nested `.map()` works
- ✅ Triple-nested `.map()` works
- ✅ Index parameters tracked
- ✅ Loop variable bindings extracted
- ✅ Test 02 generates valid JSON

---

## 📋 Phase 2D: Event Handlers (Days 6-7)

### Event Handler Detection

- [ ] **Create event handler processor**
  - **Source**: OLD `src/extractors/eventHandlers.cjs:1-200`
  - **Target**: NEW `processors/eventHandlers.js`
  - **Structure**:
    ```javascript
    function processEventHandler(attrName, expr, t, loopContext) {
      if (!isEventHandler(attrName)) return null;

      if (t.isArrowFunctionExpression(expr)) {
        return processArrowFunctionHandler(attrName, expr, t, loopContext);
      } else if (t.isIdentifier(expr)) {
        return processMethodReference(attrName, expr);
      }

      return null;
    }

    function processArrowFunctionHandler(eventName, arrowFunc, t, loopContext) {
      const params = arrowFunc.params.map(p => p.name);

      // Single expression or block?
      if (t.isBlockStatement(arrowFunc.body)) {
        return {
          eventName,
          type: 'arrow-block',
          params,
          statements: extractStatements(arrowFunc.body, t, loopContext)
        };
      } else {
        return {
          eventName,
          type: 'arrow-expression',
          params,
          expression: extractExpression(arrowFunc.body, t, loopContext)
        };
      }
    }
    ```
  - **Tests**: `00-ProductDetailsPage.tsx:66,81,154,193`

### Event Parameter Usage

- [ ] **Extract event parameter access**
  - **Example**: `(e) => setEmail(e.target.value)`
  - **Target**: `processors/eventHandlers.js:~line 80`
  - **Source**: OLD `src/extractors/eventHandlers.cjs:85-120`

### Loop Closures in Handlers

- [ ] **Handle event handlers in loops**
  - **Example**: `onClick={() => alert(item.name)}`
  - **Target**: `processors/eventHandlers.js:~line 120`
  - **Source**: OLD `src/extractors/loopTemplates.cjs:130-160`
  - **Key**: Detect if handler captures loop variables

### Integration

- [ ] **Wire event handlers into attributes.js**
  - **Target**: `processors/attributes.js:~line 90`
  - **Changes**:
    ```javascript
    if (isEventHandler(attrName)) {
      const { processEventHandler } = require('./eventHandlers');
      const handler = processEventHandler(attrName, expr, t, context.loopContext);

      result.push({
        type: 'EventHandler',
        name: attrName,
        path: attrPath,
        pathSegments: attrSegments,
        handler: handler
      });
      continue; // Skip normal attribute processing
    }
    ```

### Success Criteria

- ✅ Arrow function handlers extracted
- ✅ Method reference handlers extracted
- ✅ Event parameters tracked
- ✅ Loop variable closures detected
- ✅ Tests 00, 02, 06 work

---

## 📋 Phase 2E: Conditional Templates (Day 8)

### Ternary Value Extraction

- [ ] **Extract ternary values in text**
  - **Example**: `{isExpanded ? 'Hide' : 'Show'}`
  - **Source**: OLD `src/extractors/templates.cjs:486-510`
  - **Target**: `extractors/conditionals.js:~line 60`
  - **Changes**:
    ```javascript
    function extractConditionalExpression(expr, parentPath, pathGen, t) {
      const result = {
        condition: extractCondition(expr.test, t),
        consequent: null,
        alternate: null,
        type: null  // 'jsx' or 'value'
      };

      // Check if JSX or values
      if (t.isJSXElement(expr.consequent) || t.isJSXElement(expr.alternate)) {
        result.type = 'jsx';
        result.consequent = traverseJSX(...);
        result.alternate = traverseJSX(...);
      } else {
        result.type = 'value';
        result.consequent = extractValue(expr.consequent, t);
        result.alternate = extractValue(expr.alternate, t);
      }

      return result;
    }

    function extractValue(expr, t) {
      if (t.isStringLiteral(expr)) return expr.value;
      if (t.isNumericLiteral(expr)) return String(expr.value);
      if (t.isIdentifier(expr)) return expr.name;
      return '<complex>';
    }
    ```
  - **Tests**: `00-ProductDetailsPage.tsx:163`, `01-ComplexTemplateLiterals.tsx:38`

### Success Criteria

- ✅ Ternary text values extracted
- ✅ Conditional in attributes work
- ✅ Nested conditionals handled

---

## 📋 Phase 2F: Plugin System (Day 9)

### Plugin Detection

- [ ] **Add plugin detection to jsx.js**
  - **Source**: OLD `src/generators/plugin.cjs:10-45`
  - **Target**: `processors/jsx.js:~line 40`
  - **Changes**:
    ```javascript
    function processJSXElement(node, parentPath, pathGen, t, context) {
      const tagName = getTagName(node, t);

      // Check if plugin
      if (tagName === 'Plugin') {
        return processPluginElement(node, parentPath, pathGen, t);
      }

      // ... normal element processing
    }

    function processPluginElement(node, parentPath, pathGen, t) {
      const nameAttr = node.openingElement.attributes.find(attr =>
        t.isJSXAttribute(attr) && attr.name.name === 'name'
      );

      const pluginName = nameAttr && t.isStringLiteral(nameAttr.value)
        ? nameAttr.value.value
        : 'unknown';

      // Extract all props
      const props = {};
      for (const attr of node.openingElement.attributes) {
        if (t.isJSXAttribute(attr) && attr.name.name !== 'name') {
          props[attr.name.name] = extractAttributeValue(attr.value, t);
        }
      }

      return {
        type: 'Plugin',
        pluginName,
        props,
        path: pathGen.buildPath(parentPath, pathGen.next(parentPath)),
        pathSegments: ...
      };
    }
    ```
  - **Tests**: `04-MultiplePlugins.tsx:~lines 50-60`

### Success Criteria

- ✅ `<Plugin>` elements detected
- ✅ Plugin name extracted
- ✅ Props extracted
- ✅ Multiple plugins handled

---

## 📋 Phase 2G: Hook Detection (Day 10)

### Hook Call Detection

- [ ] **Detect hooks in component body**
  - **Target**: `processors/component.js:~line 60`
  - **Changes**:
    ```javascript
    function processComponent(functionNode, outputDir, hexGap, t) {
      // ... existing setup

      // Extract hooks BEFORE finding return statement
      const hooks = extractHooks(functionNode.body, t);

      // ... rest of processing

      const componentJson = createComponent(
        componentName,
        renderMethod,
        { hooks }  // Add hooks to component metadata
      );
    }

    function extractHooks(body, t) {
      const hooks = [];

      // Traverse body for hook calls
      traverse(body, {
        CallExpression(path) {
          const callee = path.node.callee;

          if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
            // Hook call: useState, useMvcState, etc.
            hooks.push({
              name: callee.name,
              arguments: path.node.arguments.map(arg => extractArg(arg, t))
            });
          }
        }
      });

      return hooks;
    }
    ```
  - **Tests**: `00-ProductDetailsPage.tsx:18-34`

### Success Criteria

- ✅ `useState` detected
- ✅ `useMvcState` detected
- ✅ Hook arguments extracted
- ✅ Multiple hooks tracked

---

## 📋 Phase 2H: Integration & Testing (Days 11-15)

### Day 11: Run All Tests

- [ ] Transpile all 8 test files
- [ ] Generate JSON for each
- [ ] Identify any crashes/errors

### Day 12: JSON Validation

- [ ] Compare structure with old plugin output
- [ ] Validate all required fields present
- [ ] Check path uniqueness
- [ ] Verify bindings correctness

### Day 13: Edge Case Fixes

- [ ] Fix any discovered issues
- [ ] Handle edge cases
- [ ] Add validation warnings

### Day 14: Performance Optimization

- [ ] Profile transpilation speed
- [ ] Optimize hot paths
- [ ] Ensure <1s per component

### Day 15: Documentation

- [ ] Update README
- [ ] Document known limitations
- [ ] Create migration guide
- [ ] Add examples

### Success Criteria

- ✅ All 8 test files transpile successfully
- ✅ JSON structure matches expectations
- ✅ No crashes or errors
- ✅ Performance acceptable
- ✅ Documentation complete

---

## 🎯 Final Deliverables

- [ ] ✅ Modular architecture (19 modules)
- [ ] ✅ Transform methods working
- [ ] ✅ Style objects working
- [ ] ✅ Nested loops working
- [ ] ✅ Event handlers working
- [ ] ✅ Conditional templates working
- [ ] ✅ Plugin system working
- [ ] ✅ Hook detection working
- [ ] ✅ All test files transpile
- [ ] ✅ Documentation complete

---

## 📊 Progress Tracker

| Phase | Status | Days | Completion |
|-------|--------|------|------------|
| 1. Modular Architecture | ✅ DONE | - | 100% |
| 2A. Transform Methods | ⏳ TODO | 1-2 | 0% |
| 2B. Style Objects | ⏳ TODO | 3 | 0% |
| 2C. Nested Loops | ⏳ TODO | 4-5 | 0% |
| 2D. Event Handlers | ⏳ TODO | 6-7 | 0% |
| 2E. Conditional Templates | ⏳ TODO | 8 | 0% |
| 2F. Plugin System | ⏳ TODO | 9 | 0% |
| 2G. Hook Detection | ⏳ TODO | 10 | 0% |
| 2H. Integration & Testing | ⏳ TODO | 11-15 | 0% |

**Overall Progress**: Phase 1 Complete (19 modules created) ✅

**Next Step**: Phase 2A - Wire up transform methods from `legacy/sharedLogic.js`
