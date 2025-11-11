# Conditional Element Templates - Implementation Status

**Date**: 2025-11-10
**Status**: 90% Complete - Integration Needed

---

## What Was Built

### 1. Babel Plugin Enhancement ✅ COMPLETE

**File**: `src/babel-plugin-minimact/src/extractors/conditionalElementTemplates.cjs`

- Extracts conditional JSX expressions (`&&` and ternaries)
- Analyzes condition evaluability (simple boolean logic vs complex)
- Extracts complete element structures with dynamic bindings
- Generates metadata in `.templates.json`

**Integration**:
- Added to `processComponent.cjs` (lines 19-20, 249-259)
- Exports integrated into `index.cjs` (line 195)
- Successfully tested with `test-conditional-elements.tsx`

**Output Example**:
```json
{
  "conditionalElements": {
    "1.3": {
      "type": "conditional-element",
      "conditionExpression": "myState1 && !myState2",
      "conditionBindings": ["myState1", "myState2"],
      "evaluable": true,
      "branches": {
        "true": {
          "type": "element",
          "tag": "div",
          "attributes": { "className": "nested-content" },
          "children": [
            { "type": "text", "value": "SomeNestedDOMElementsHere" },
            { "type": "text", "binding": "myState3" }
          ]
        },
        "false": null
      },
      "operator": "&&"
    }
  }
}
```

### 2. Client Runtime ✅ COMPLETE

**File**: `src/client-runtime/src/conditionalElementRenderer.ts` (NEW)

**ConditionalElementRenderer** class with three responsibilities:

#### A. Condition Evaluation
```typescript
evaluateCondition(
  expression: string,
  bindings: string[],
  state: Record<string, any>
): boolean
```

Supports:
- ✅ Simple identifiers: `myState1`
- ✅ Negation: `!myState1`
- ✅ Logical AND/OR: `myState1 && !myState2`
- ✅ Comparisons: `count > 0`, `name === "admin"`
- ❌ Complex expressions (marked as `evaluable: false`)

#### B. DOM Tree Construction
```typescript
buildElement(
  structure: ElementStructure,
  state: Record<string, any>
): HTMLElement
```

- Creates elements with correct tag names
- Sets static/dynamic attributes
- Fills text content (static or bound to state)
- Recursively builds children

#### C. DOM Application
```typescript
render(
  template: ConditionalElementTemplate,
  state: Record<string, any>,
  parentElement: HTMLElement,
  insertIndex: number
): HTMLElement | null
```

Complete flow:
1. Evaluate condition
2. Select branch (true/false)
3. Build DOM tree
4. Insert/replace in DOM

**Integration**:
- Exported from `index.ts` (line 455)
- Added to Minimact class as `conditionalRenderer` (line 29, 84)
- Added to ComponentContext interface in `hooks.ts` (line 25)

**Build Status**: ✅ Builds successfully

### 3. Template State Management ✅ COMPLETE

**File**: `src/client-runtime/src/template-state.ts`

**Changes Made**:
- Added import of `ConditionalElementTemplate` (line 17)
- Extended `TemplateMap` interface with `conditionalElements` (line 39)
- Added storage: `private conditionalElements: Map<...>` (line 59)
- Enhanced `loadTemplateMap()` to load conditional elements (lines 83-92)
- Added `getConditionalElementsBoundTo()` method (lines 154-165)
- Added `getAllComponentState()` method (lines 170-179)

**Build Status**: ✅ Builds successfully

### 4. Server-Side Types ✅ COMPLETE

**File**: `src/Minimact.AspNetCore/HotReload/TemplateTypes.cs`

**Changes Made**:
- Added `ConditionalElementTemplate` class (lines 9-28)
  - Strongly typed with JSON property names
  - Matches TypeScript interface structure
- Extended `TemplateMap` class with `ConditionalElements` property (line 119)
  - Type: `Dictionary<string, ConditionalElementTemplate>?`
  - Automatically deserialized from `.templates.json`

**Server Flow**:
1. `TemplateHotReloadManager.LoadTemplateMapAsync()` reads `.templates.json`
2. JSON deserialization populates `ConditionalElements`
3. `SendTemplateMapToClientAsync()` sends via SignalR
4. Client receives and loads via `templateState.loadTemplateMap()`

---

## What's Missing

### ⚠️ CRITICAL: State Change Integration

**Location**: `src/client-runtime/src/hooks.ts` - `useState` function (around line 100-160)

**What Needs to Happen**:

When `setState()` is called:
1. ✅ Update local state
2. ✅ Check hint queue for patches
3. ✅ Apply patches if found
4. ❌ **CHECK CONDITIONAL ELEMENT TEMPLATES** ← MISSING!
5. ✅ Sync state to server

**Required Implementation**:

```typescript
// In hooks.ts setState function, around line 146-150

// After hint queue check and patch application...

// Check for conditional element templates that depend on this state
const conditionals = templateState.getConditionalElementsBoundTo(
  context.componentId,
  stateKey
);

if (conditionals.length > 0) {
  // Get all current state for condition evaluation
  const currentState = templateState.getAllComponentState(context.componentId);

  for (const { pathKey, template } of conditionals) {
    // Evaluate condition with updated state
    const shouldRender = context.conditionalRenderer.evaluateCondition(
      template.conditionExpression,
      template.conditionBindings,
      currentState
    );

    // TODO: Need to determine DOM insertion point
    // This requires knowing:
    // 1. Parent element
    // 2. Insert index within parent
    //
    // Options:
    // A. Store path metadata when templates are loaded
    // B. Query DOM using data attributes
    // C. Server sends DOM index path with template

    // For now, pseudocode:
    // const parentElement = findParentElement(context.element, pathKey);
    // const insertIndex = calculateInsertIndex(pathKey);

    // context.conditionalRenderer.render(
    //   template,
    //   currentState,
    //   parentElement,
    //   insertIndex
    // );
  }
}
```

### ⚠️ PATH RESOLUTION PROBLEM

**The Core Issue**:

The client needs to know **WHERE** to insert conditional elements in the DOM. We have:
- ✅ Hex path key (e.g., "1.3") from Babel
- ✅ Element structure to build
- ❌ **DOM parent element and insert index**

**Possible Solutions**:

#### Option A: Server Sends DOM Indices (Recommended)
When the server sends template map via SignalR, it should:
1. Use PathConverter to convert hex paths → DOM indices
2. Include `domPath: [0, 2]` in each conditional element template
3. Client can navigate to exact insertion point

**Required Changes**:
- `TemplateHotReloadManager.AugmentTemplateMapWithNullPaths()` needs to:
  - Process `ConditionalElements` dictionary
  - For each hex path, convert to DOM indices using PathConverter
  - Add `domPath` field to template before sending

```csharp
// In AugmentTemplateMapWithNullPaths, around line 693
if (templateMap.ConditionalElements != null)
{
    var pathConverter = new PathConverter(component.CurrentVNode);
    var augmentedConditionals = new Dictionary<string, ConditionalElementTemplate>();

    foreach (var (hexPath, template) of templateMap.ConditionalElements)
    {
        // Convert hex path to DOM indices
        var domPath = pathConverter.HexPathToDomPath(hexPath);

        // Clone template with domPath added
        // (or add DomPath property to ConditionalElementTemplate class)
        augmentedConditionals[hexPath] = template; // with domPath added
    }

    // Return augmented map with domPath info
}
```

#### Option B: Client-Side Path Resolution
Client stores DOM path mappings when elements are rendered:
- Use `data-minimact-path="1.3"` attributes on conditional parent elements
- Client queries DOM to find insertion point
- More fragile, requires DOM consistency

#### Option C: Store in ComponentContext
When component renders, store path → element mappings in context:
- `context.pathElements = new Map<string, { parent, index }>()`
- Populated during initial render
- Updated when DOM changes

---

## Testing Plan

### 1. Unit Tests (Client)
```typescript
// Test condition evaluation
expect(renderer.evaluateCondition("myState1 && !myState2",
  ["myState1", "myState2"],
  { myState1: true, myState2: false }
)).toBe(true);

// Test DOM construction
const element = renderer.buildElement({
  type: "element",
  tag: "div",
  attributes: { className: "test" },
  children: [
    { type: "text", value: "Hello" },
    { type: "text", binding: "name" }
  ]
}, { name: "World" });

expect(element.tagName).toBe("DIV");
expect(element.className).toBe("test");
expect(element.textContent).toBe("HelloWorld");
```

### 2. Integration Tests
```typescript
// Test template loading
const templateMap = {
  component: "Test",
  templates: {},
  conditionalElements: {
    "1.3": {
      conditionExpression: "isOpen",
      conditionBindings: ["isOpen"],
      evaluable: true,
      branches: { true: { /* structure */ } }
    }
  }
};

templateState.loadTemplateMap("test-component", templateMap);
const conditionals = templateState.getConditionalElementsBoundTo("test-component", "state_0");
expect(conditionals.length).toBe(1);
```

### 3. End-to-End Tests
1. Build test component with conditionals
2. Run server, load component
3. Click button to change state
4. Verify DOM element appears instantly (< 10ms)
5. Verify server confirmation arrives later (100-300ms)
6. Verify no visual changes from server (prediction was correct)

---

## Performance Characteristics

### Before (Server Round-Trip)
- Text updates: 0-5ms ✅
- Attribute updates: 0-5ms ✅
- **Conditional elements: 100-300ms** ❌

### After (With Conditional Templates)
- Text updates: 0-5ms ✅
- Attribute updates: 0-5ms ✅
- **Conditional elements: 0-5ms** ✅

### Bundle Size Impact
- ConditionalElementRenderer: ~3KB minified
- Per-component overhead: ~500 bytes per conditional
- Total increase: ~3-5KB for typical app

---

## Files Changed

### Babel Plugin
1. ✅ `src/babel-plugin-minimact/src/extractors/conditionalElementTemplates.cjs` (NEW)
2. ✅ `src/babel-plugin-minimact/src/processComponent.cjs` (modified)
3. ✅ `src/babel-plugin-minimact/src/extractors/templates.cjs` (modified - generateTemplateMapJSON)
4. ✅ `src/babel-plugin-minimact/index.cjs` (modified)

### Client Runtime
1. ✅ `src/client-runtime/src/conditionalElementRenderer.ts` (NEW)
2. ✅ `src/client-runtime/src/template-state.ts` (modified)
3. ✅ `src/client-runtime/src/hooks.ts` (modified - ComponentContext)
4. ✅ `src/client-runtime/src/index.ts` (modified - exports, Minimact class)
5. ⚠️ `src/client-runtime/src/hooks.ts` (NEEDS: useState integration)

### Server
1. ✅ `src/Minimact.AspNetCore/HotReload/TemplateTypes.cs` (modified)
2. ⚠️ `src/Minimact.AspNetCore/HotReload/TemplateHotReloadManager.cs` (NEEDS: DOM path conversion)

### Documentation
1. ✅ `docs/CONDITIONAL_ELEMENT_TEMPLATES.md` (NEW)
2. ✅ `docs/CONDITIONAL_ELEMENTS_STATUS.md` (THIS FILE)

---

## Build Status

### Babel Plugin
```bash
cd src/babel-plugin-minimact
npm run build
# ✅ SUCCESS - No errors
```

### Client Runtime
```bash
cd src/client-runtime
npm run build
# ✅ SUCCESS - Some pre-existing TypeScript warnings (not related to changes)
```

### Server
```bash
cd src/Minimact.AspNetCore
dotnet build
# ✅ SUCCESS
```

---

## Next Steps (Priority Order)

### 1. HIGH PRIORITY: Path Resolution
**Decision needed**: Choose between Options A/B/C above

**Recommended**: Option A (Server sends DOM indices)
- Most robust
- Leverages existing PathConverter
- No client-side path calculation
- Consistent with how regular templates work

**Implementation**:
1. Add `DomPath` property to `ConditionalElementTemplate` class
2. Update `AugmentTemplateMapWithNullPaths()` to process conditionals
3. Update TypeScript interface to expect `domPath`

### 2. HIGH PRIORITY: useState Integration
**File**: `src/client-runtime/src/hooks.ts`

Add conditional template checking after hint queue (around line 146):
```typescript
// Check conditional element templates
const conditionals = templateState.getConditionalElementsBoundTo(context.componentId, stateKey);
for (const { pathKey, template } of conditionals) {
  const state = templateState.getAllComponentState(context.componentId);

  // Use domPath from template (after Option A is implemented)
  const parent = navigateToParent(context.element, template.domPath);
  const insertIndex = template.domPath[template.domPath.length - 1];

  context.conditionalRenderer.render(template, state, parent, insertIndex);
}
```

### 3. MEDIUM PRIORITY: Server-Side Testing
Test that `.templates.json` files with `conditionalElements` are:
- Correctly deserialized
- Passed through to client
- Logged appropriately

### 4. LOW PRIORITY: Optimizations
- Cache built DOM elements for repeated renders
- Batch multiple conditional changes
- Add transition animations
- Integrate with loop templates

---

## Known Limitations

### Client-Side Evaluation Only Supports:
- ✅ Boolean logic (&&, ||, !)
- ✅ Simple comparisons (>, <, ===, etc.)
- ✅ Member expressions (user.isAdmin)
- ❌ Method calls (items.filter())
- ❌ Arithmetic (count * 2 + 1)
- ❌ Function calls

For complex expressions, `evaluable: false` is set, and client waits for server.

### Current Architecture Constraints:
- Client can't evaluate JSX expressions
- Server owns VNode tree truth
- Client provides instant feedback only
- Server confirms/corrects asynchronously

These constraints are by design and align with Minimact's dehydrationist architecture.

---

## Architecture Alignment

This feature completes Minimact's predictive rendering coverage while maintaining core principles:

✅ **Server owns truth** - VNode tree generated server-side
✅ **Rust reconciler authoritative** - Server patches are final
✅ **Client provides feedback** - Instant updates from templates
✅ **Server confirms** - Later confirmation with correction if needed
✅ **No client JSX evaluation** - Only safe boolean expressions
✅ **Dehydrationist** - Client can't render React expressions

---

## Summary

**What's Done**:
- Full template extraction (Babel)
- Full DOM construction (Client)
- Full type system (Server & Client)
- Documentation and testing plan

**What's Needed** (Estimated: 2-4 hours):
1. Path resolution (Server-side DOM index conversion) - **1-2 hours**
2. useState integration (Client-side template checking) - **30 minutes**
3. Testing and debugging - **1-2 hours**

**Result**: Complete predictive rendering coverage with 0-5ms latency for all updates including structural changes.

The system is **architecturally sound** and **90% complete**. The remaining work is straightforward integration with clear implementation paths.
