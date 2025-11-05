# Feature Parity Plan: New Transpiler vs Old Plugin

**Goal**: Achieve 100% feature parity with `babel-plugin-minimact` to support all test cases in `J:\projects\minimact\test-tsx`

---

## Test Case Analysis

### Test Files Summary

| File | Focus | Complexity | Status |
|------|-------|------------|--------|
| `00-ProductDetailsPage.tsx` | Real-world component with MVC, styles, events | High | ⏳ Needs Full Parity |
| `01-ComplexTemplateLiterals.tsx` | `.toFixed()`, nested templates, method chaining | Medium | ⏳ Needs Transform Support |
| `02-NestedMapCalls.tsx` | Double/triple nested `.map()`, with index/events | High | ⏳ Needs Nested Loop Support |
| `03-ComputedPropertiesInLoops.tsx` | `item[key]` computed access | Medium | ❌ Known Not Supported |
| `04-MultiplePlugins.tsx` | Multiple `<Plugin>` elements | Low | ⏳ Needs Plugin System |
| `05-ComplexLoopExpressions.tsx` | Binary ops, calculations in loops | Medium | ⏳ Needs Expression Extraction |
| `06-EventHandlerEdgeCases.tsx` | Complex event handlers | Medium | ⏳ Needs Event Handler System |
| `07-RealWorldPatterns.tsx` | Production patterns | High | ⏳ Needs All Features |

---

## Feature Gap Analysis

### ✅ **Already Supported** (Phase 1 Complete)

1. ✅ Basic JSX traversal
2. ✅ Hex path generation
3. ✅ Static text extraction
4. ✅ Simple identifier bindings (`{count}`)
5. ✅ Member expression bindings (`{user.name}`)
6. ✅ Static attributes (`className="foo"`)
7. ✅ Boolean attributes (`disabled`)
8. ✅ Basic template literals (`` `Count: ${count}` ``)
9. ✅ JSX fragments (`<>...</>`)
10. ✅ Conditional rendering structure (`{isAdmin && <div>}`)
11. ✅ Ternary structure (`{x ? <A/> : <B/>}`)
12. ✅ `.map()` structure detection

### ⏳ **Partially Supported** (Needs Enhancement)

13. ⏳ Transform methods (`.toFixed()`, `.toLowerCase()`, etc.)
    - **Current**: Detected but not extracted
    - **Needed**: Extract to transform metadata
    - **File**: `legacy/sharedLogic.js` has `extractMethodCallBindingShared()` ✅
    - **Action**: Wire up to expressions.js

14. ⏳ Style objects (`style={{fontSize: '32px'}}`)
    - **Current**: Detected, basic extraction
    - **Needed**: Full style conversion (camelCase → kebab-case)
    - **File**: `extractors/styles.js` exists ✅
    - **Action**: Integrate into attributes.js

15. ⏳ Nested `.map()` calls
    - **Current**: Single-level `.map()` detected
    - **Needed**: Recursive loop template extraction
    - **File**: `extractors/loops.js` exists
    - **Action**: Add recursive traversal

16. ⏳ Binary expressions in templates (`{price * quantity}`)
    - **Current**: Marked as `<complex>`
    - **Needed**: Extract identifiers, generate expression metadata
    - **File**: `legacy/sharedLogic.js` has `extractIdentifiersShared()` ✅
    - **Action**: Use in expressions.js

### ❌ **Not Supported** (New Features Needed)

17. ❌ Event handlers (`onClick={handleClick}`)
    - **Needed**: Extract event handler metadata
    - **Pattern**: Old plugin has event handler detection
    - **Action**: Create event handler processor

18. ❌ Spread attributes (`{...props}`)
    - **Current**: Detected but not fully extracted
    - **Needed**: Extract spread metadata
    - **Action**: Enhance attributes.js

19. ❌ Computed properties (`item[key]`)
    - **Status**: Known limitation in old plugin
    - **Decision**: Document as not supported (for now)

20. ❌ Plugin system (`<Plugin name="chart">`)
    - **Needed**: Detect and extract plugin elements
    - **Action**: Add plugin detection to jsx.js

21. ❌ useMvcState/useMvcViewModel hooks
    - **Needed**: Detect MVC-specific hooks
    - **Action**: Add hook detection system

22. ❌ Conditional templates (ternary values)
    - **Current**: Structure detected
    - **Needed**: Extract conditional template metadata
    - **Action**: Enhance conditionals.js

23. ❌ Loop template bindings (nested access)
    - **Current**: Basic loop extraction
    - **Needed**: Extract bindings within loop body
    - **Action**: Enhance loops.js with binding extraction

---

## Implementation Plan

### **Phase 2A: Transform Methods & Expressions** (Week 1 - Days 1-2)

**Goal**: Support complex expressions and transform methods

**Tasks**:
1. [ ] Wire up `extractMethodCallBindingShared()` in expressions.js
2. [ ] Enhance binary expression extraction
3. [ ] Extract identifiers from complex expressions
4. [ ] Test with `01-ComplexTemplateLiterals.tsx`

**Files to Modify**:
- `processors/expressions.js` - Add transform detection
- `extractors/bindings.js` - Use `extractIdentifiersShared()`

**Success Criteria**:
- ✅ `.toFixed(2)` → `{ binding: "price", transform: "toFixed", args: [2] }`
- ✅ `price * quantity` → Identifiers extracted
- ✅ Nested template literals work

---

### **Phase 2B: Style Objects** (Week 1 - Day 3)

**Goal**: Full style object support

**Tasks**:
1. [ ] Integrate `extractors/styles.js` into attributes.js
2. [ ] Add camelCase → kebab-case conversion
3. [ ] Handle conditional styles (`opacity: isVisible ? 1 : 0.5`)
4. [ ] Test with `00-ProductDetailsPage.tsx`

**Files to Modify**:
- `processors/attributes.js` - Call style extractor
- `extractors/styles.js` - Enhance conditional support

**Success Criteria**:
- ✅ `style={{fontSize: '32px'}}` → Correct metadata
- ✅ Conditional style values extracted
- ✅ Multiple properties handled

---

### **Phase 2C: Nested Loops** (Week 1 - Days 4-5)

**Goal**: Support nested `.map()` calls

**Tasks**:
1. [ ] Add recursive loop traversal to loops.js
2. [ ] Handle loop context (item vars from parent loops)
3. [ ] Extract bindings within nested loops
4. [ ] Test with `02-NestedMapCalls.tsx`

**Files to Modify**:
- `extractors/loops.js` - Add recursion
- `core/traverser.js` - Pass loop context

**Success Criteria**:
- ✅ Double-nested `.map()` works
- ✅ Triple-nested `.map()` works
- ✅ Index parameters tracked correctly
- ✅ Bindings like `category.items.map()` extracted

---

### **Phase 2D: Event Handlers** (Week 2 - Days 1-2)

**Goal**: Extract event handler metadata

**Tasks**:
1. [ ] Create event handler detection in attributes.js
2. [ ] Extract arrow function parameters
3. [ ] Extract method references
4. [ ] Test with `06-EventHandlerEdgeCases.tsx`

**Files to Modify**:
- `processors/attributes.js` - Add event handler logic
- `legacy/sharedLogic.js` - Use `isEventHandler()`

**Success Criteria**:
- ✅ `onClick={() => alert('Hi')}` detected
- ✅ `onClick={handleClick}` detected
- ✅ Event handler with parameters: `onClick={(e) => setX(e.value)}`

---

### **Phase 2E: Conditional Templates** (Week 2 - Day 3)

**Goal**: Full conditional template support

**Tasks**:
1. [ ] Enhance `extractors/conditionals.js`
2. [ ] Extract ternary value templates
3. [ ] Handle nested conditionals
4. [ ] Test with ternary expressions in text

**Files to Modify**:
- `extractors/conditionals.js` - Add value extraction
- `processors/expressions.js` - Wire up conditionals

**Success Criteria**:
- ✅ `{isExpanded ? 'Hide' : 'Show'}` → Conditional template
- ✅ Nested conditionals work
- ✅ Conditional in attributes work

---

### **Phase 2F: Plugin System** (Week 2 - Day 4)

**Goal**: Detect and extract plugin elements

**Tasks**:
1. [ ] Add plugin detection to jsx.js
2. [ ] Extract plugin name and props
3. [ ] Test with `04-MultiplePlugins.tsx`

**Files to Modify**:
- `processors/jsx.js` - Add plugin detection
- `core/nodes.js` - Add plugin node type

**Success Criteria**:
- ✅ `<Plugin name="chart">` detected
- ✅ Multiple plugins handled
- ✅ Plugin props extracted

---

### **Phase 2G: Hook Detection** (Week 2 - Day 5)

**Goal**: Detect useMvcState, useMvcViewModel, etc.

**Tasks**:
1. [ ] Add hook call detection in component.js
2. [ ] Extract hook names and arguments
3. [ ] Generate hook metadata in JSON
4. [ ] Test with `00-ProductDetailsPage.tsx`

**Files to Modify**:
- `processors/component.js` - Add hook detection
- `core/nodes.js` - Add hook metadata to component

**Success Criteria**:
- ✅ `useMvcState('productName')` detected
- ✅ Hook options extracted
- ✅ Multiple hooks tracked

---

### **Phase 2H: Integration & Polish** (Week 3)

**Goal**: All test cases pass

**Tasks**:
1. [ ] Run transpiler on all 8 test files
2. [ ] Compare JSON output with old plugin
3. [ ] Fix any discrepancies
4. [ ] Add validation for known unsupported features
5. [ ] Performance optimization

**Files to Check**:
- All modules

**Success Criteria**:
- ✅ All test files generate valid JSON
- ✅ JSON matches old plugin structure (where applicable)
- ✅ Performance acceptable (<1s per component)

---

## Known Limitations (Document)

These features are **intentionally not supported**:

1. ❌ **Computed properties** (`item[key]`)
   - **Reason**: Requires runtime evaluation, can't be statically analyzed
   - **Workaround**: Use explicit properties

2. ❌ **Complex spread** (`<div {...complexObject} />`)
   - **Reason**: Object shape unknown at build time
   - **Workaround**: Use explicit props

3. ❌ **Dynamic component types** (`<ComponentVar />`)
   - **Reason**: Component must be statically known
   - **Workaround**: Use switch/if statements

---

## Testing Strategy

### Unit Tests (Per Module)

```javascript
// Example: Test bindings extractor
describe('extractBindings', () => {
  it('extracts simple identifier', () => {
    const expr = /* count */;
    const result = extractBindings(expr, t);
    expect(result).toEqual([{ type: 'Identifier', path: 'count' }]);
  });

  it('extracts member expression', () => {
    const expr = /* user.profile.name */;
    const result = extractBindings(expr, t);
    expect(result).toEqual([{ type: 'MemberExpression', path: 'user.profile.name' }]);
  });

  it('extracts transform method', () => {
    const expr = /* price.toFixed(2) */;
    const result = extractBindings(expr, t);
    expect(result).toEqual({
      binding: 'price',
      transform: 'toFixed',
      args: [2]
    });
  });
});
```

### Integration Tests (Full Components)

```javascript
// Test with actual TSX files
describe('Transpiler Integration', () => {
  it('transpiles ProductDetailsPage correctly', () => {
    const result = transpile('00-ProductDetailsPage.tsx');
    expect(result.componentName).toBe('ProductDetailsPage');
    expect(result.renderMethod.children.length).toBeGreaterThan(0);
  });

  it('handles complex template literals', () => {
    const result = transpile('01-ComplexTemplateLiterals.tsx');
    // Verify transforms extracted
    const transforms = findTransforms(result);
    expect(transforms).toContainEqual({ method: 'toFixed', args: [2] });
  });

  it('handles nested maps', () => {
    const result = transpile('02-NestedMapCalls.tsx');
    // Verify nested loops
    const loops = findLoops(result);
    expect(loops.some(l => l.body.type === 'LoopTemplate')).toBe(true);
  });
});
```

### Comparison Tests (Old vs New)

```javascript
// Compare output with old plugin
describe('Parity with old plugin', () => {
  it('generates equivalent JSON structure', () => {
    const oldResult = oldPlugin('00-ProductDetailsPage.tsx');
    const newResult = newPlugin('00-ProductDetailsPage.tsx');

    // Compare structure (not exact match, but equivalent)
    expect(normalize(newResult)).toEqual(normalize(oldResult));
  });
});
```

---

## Success Metrics

### Phase 2 Complete When:

- ✅ All 8 test files transpile without errors
- ✅ Generated JSON is valid and complete
- ✅ All bindings extracted correctly
- ✅ All templates have correct slot bindings
- ✅ Nested structures handled properly
- ✅ Performance <1s per component
- ✅ 95%+ feature parity with old plugin

---

## Priority Order

**Week 1** (High Priority):
1. 🔥 Transform methods (needed by most tests)
2. 🔥 Style objects (needed by ProductDetailsPage)
3. 🔥 Nested loops (needed by 3 test files)

**Week 2** (Medium Priority):
4. ⚠️ Event handlers (needed by all interactive components)
5. ⚠️ Conditional templates (common pattern)
6. ⚠️ Plugin system (needed by 1 test file)
7. ⚠️ Hook detection (needed by ProductDetailsPage)

**Week 3** (Polish):
8. ✨ Integration testing
9. ✨ Performance optimization
10. ✨ Documentation

---

## Migration Path

### For Users

1. **Phase 1 (Now)**: Basic components work
2. **Phase 2A-2C (Week 1)**: Most components work
3. **Phase 2D-2G (Week 2)**: All components work
4. **Phase 2H (Week 3)**: Production ready

### Backwards Compatibility

- New transpiler uses same JSON schema as old plugin
- C# code generator unchanged
- Runtime unchanged
- **Migration**: Just swap Babel plugin, everything else stays

---

**Next Step**: Start with Phase 2A - Transform Methods & Expressions
