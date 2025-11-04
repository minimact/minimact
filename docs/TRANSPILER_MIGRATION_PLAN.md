# Minimact Transpiler Migration Plan

**From babel-plugin-minimact to minimact-transpiler**

## Executive Summary

This document outlines the migration from the existing `babel-plugin-minimact` (direct C# string generation) to the new `minimact-transpiler` (JSON intermediate representation with visitor pattern).

### Migration Timeline: 3-4 Weeks

- **Week 1**: Foundation & Core Template Extraction
- **Week 2**: Advanced Features (Loops, Conditionals)
- **Week 3**: Integration & Testing
- **Week 4**: Deployment & Deprecation

## Why Migrate?

### Current Problems with babel-plugin-minimact

| Issue | Impact | Severity |
|-------|--------|----------|
| **String Manipulation** | Hard to debug, error-prone | 🔴 High |
| **No Type Safety** | Runtime errors in generated code | 🔴 High |
| **Mixed Concerns** | Parsing + codegen in one place | 🟡 Medium |
| **Hard to Extend** | New features require Babel+C# knowledge | 🟡 Medium |
| **Difficult Testing** | Can't test phases independently | 🟡 Medium |
| **Tag-Based Paths** | div[0], span[0] - renumbering cascade | 🔴 High |

### Benefits of minimact-transpiler

| Benefit | Impact | Value |
|---------|--------|-------|
| **Separation of Concerns** | Babel focuses on parsing, C# on codegen | ✅ High |
| **Type Safety** | C# classes with JSON deserialization | ✅ High |
| **Tag-Agnostic Hex Paths** | 10000000, 20000000 - insert anywhere | ✅ High |
| **Visitor Pattern** | Easy to extend and maintain | ✅ High |
| **JSON Inspection** | Debug intermediate representation | ✅ Medium |
| **Independent Testing** | Test Babel and C# phases separately | ✅ Medium |

## 🔴 BREAKING CHANGE: Path System

### Old System - Tag-Based Indexing

**Problem:** Each tag type maintains its own counter.

```tsx
<div>                   <!-- div[0] -->
  <span>Text 1</span>   <!-- div[0].span[0] -->
  <span>Text 2</span>   <!-- div[0].span[1] -->
  <div>Nested</div>     <!-- div[0].div[0] -->
  <p>Paragraph</p>      <!-- div[0].p[0] -->
</div>
```

**Path format:** `tagName[index]` where index is per-tag-type.

**Insertion Problem:**
```tsx
<div>                   <!-- div[0] -->
  <span>Text 1</span>   <!-- div[0].span[0] ✅ unchanged -->
  <p>NEW!</p>           <!-- div[0].p[0] 🆕 inserted -->
  <span>Text 2</span>   <!-- div[0].span[1] ✅ unchanged (lucky!) -->
  <div>Nested</div>     <!-- div[0].div[0] ✅ unchanged -->
  <p>Paragraph</p>      <!-- div[0].p[1] ❌ WAS p[0], now p[1]! -->
</div>
```

Result: Inserting `<p>` between spans causes the *other* `<p>` to renumber from `p[0]` → `p[1]`.

### New System - Tag-Agnostic Hex Codes

**Solution:** Paths are independent of tag names. Every child gets the next hex code, regardless of tag.

```tsx
<div>                   <!-- 10000000 -->
  <span>Text 1</span>   <!-- 10000000.10000000 -->
  <span>Text 2</span>   <!-- 10000000.20000000 -->
  <div>Nested</div>     <!-- 10000000.30000000 -->
  <p>Paragraph</p>      <!-- 10000000.40000000 -->
</div>
```

**Path format:** `hexCode.hexCode` where hex codes are sequential with large gaps (0x10000000).

**Insertion Solution:**
```tsx
<div>                   <!-- 10000000 ✅ unchanged -->
  <span>Text 1</span>   <!-- 10000000.10000000 ✅ unchanged -->
  <p>NEW!</p>           <!-- 10000000.15000000 🆕 inserted in gap! -->
  <span>Text 2</span>   <!-- 10000000.20000000 ✅ unchanged -->
  <div>Nested</div>     <!-- 10000000.30000000 ✅ unchanged -->
  <p>Paragraph</p>      <!-- 10000000.40000000 ✅ unchanged -->
</div>
```

Result: ✅ **ZERO renumbering!** The new `<p>` gets `15000000` which fits between `10000000` and `20000000`.

### Key Advantages

1. **Tag-Agnostic**: A `<div>` is just `10000000`, a `<span>` is `20000000`. Tags are irrelevant to paths.
2. **No Renumbering**: Insert anywhere without touching existing paths.
3. **Lexicographic Sorting**: Paths sort correctly as strings (`"10000000" < "20000000"`).
4. **Huge Gap Space**: 268 million slots between each element (0x10000000 = 268,435,456).
5. **Future-Proof**: Practically impossible to run out of insertion space.

### Migration Impact

**Old Attribute Paths:**
```
div[0].@className
div[1].span[0].@style
```

**New Attribute Paths:**
```
10000000.@className
20000000.10000000.@style
```

**Old Template Paths:**
```csharp
[TextTemplate(Path = new[] { "div", "0", "span", "0" }, ...)]
```

**New Template Paths:**
```csharp
[TextTemplate(Path = new[] { "10000000", "10000000" }, ...)]
```

## Migration Strategy

### Phase 0: Preparation (3 days)

**Objectives:**
- Set up parallel infrastructure
- Create test harness
- Document existing behavior

**Tasks:**

1. **Create Test Suite** (1 day)
   - [ ] Extract test components from examples
   - [ ] Document expected output for each
   - [ ] Create comparison tool (old vs new output)

   ```bash
   tests/
   ├── fixtures/
   │   ├── Counter.tsx          # Simple state + event
   │   ├── TodoList.tsx         # Loops + conditionals
   │   ├── Styles.tsx           # Style objects
   │   └── Conditionals.tsx     # Complex logic
   ├── expected/
   │   └── old-plugin/          # Output from babel-plugin-minimact
   └── compare.js               # Comparison tool
   ```

2. **Document Existing Features** (1 day)
   - [ ] List all template types currently supported
   - [ ] Document all attribute handling cases
   - [ ] Map out event handler patterns
   - [ ] Identify edge cases and special handling

   Create: `docs/EXISTING_FEATURES_INVENTORY.md`

3. **Set Up Parallel Build** (1 day)
   - [ ] Configure both plugins to run side-by-side
   - [ ] Generate output to different directories
   - [ ] Add npm scripts for comparison

   ```json
   // package.json
   {
     "scripts": {
       "build:old": "babel src --plugins=babel-plugin-minimact --out-dir=Generated/old",
       "build:new": "babel src --plugins=minimact-transpiler/babel --out-dir=Generated/json && dotnet run --project minimact-transpiler/codegen",
       "build:compare": "npm run build:old && npm run build:new && node tests/compare.js"
     }
   }
   ```

### Phase 1: Structural Traversal & Path Generation (Week 1 - 5 days)

**Objectives:**
- Build complete JSX tree structure with hex paths
- Create JSON nodes for ALL JSX elements, text, and expressions
- Validate path generation and tree structure
- NO template extraction yet - just structure!

**Philosophy:**
> "First pass: Build the skeleton. Second pass: Add the meat."

**Tasks:**

#### Day 1-2: JSX Tree Traversal

**Goal:** Traverse the entire JSX tree and create JSON nodes for every element, maintaining parent-child relationships with hex paths.

**Source Files to Study:**
- `babel-plugin-minimact/src/extractors/templates.cjs` → `traverseJSX()` function (structure only, ignore template logic)

**Features to Implement:**

1. **JSXElement Traversal**
   ```tsx
   <div>
     <span>Text</span>
     <button>Click</button>
   </div>
   ```

   **Expected JSON Structure:**
   ```json
   {
     "type": "JSXElement",
     "tag": "div",
     "path": "10000000",
     "pathSegments": ["10000000"],
     "children": [
       {
         "type": "JSXElement",
         "tag": "span",
         "path": "10000000.10000000",
         "pathSegments": ["10000000", "10000000"],
         "children": [...]
       },
       {
         "type": "JSXElement",
         "tag": "button",
         "path": "10000000.20000000",
         "pathSegments": ["10000000", "20000000"],
         "children": [...]
       }
     ]
   }
   ```

2. **JSXText Handling**
   ```tsx
   <p>Hello World</p>
   ```

   **JSON:**
   ```json
   {
     "type": "JSXElement",
     "tag": "p",
     "path": "10000000",
     "children": [
       {
         "type": "StaticText",
         "path": "10000000.10000000",
         "pathSegments": ["10000000", "10000000"],
         "content": "Hello World"
       }
     ]
   }
   ```

3. **JSXExpressionContainer Handling**
   ```tsx
   <div>{count}</div>
   <div>{`Count: ${count}`}</div>
   ```

   **JSON (placeholder nodes for now):**
   ```json
   {
     "type": "JSXElement",
     "tag": "div",
     "path": "10000000",
     "children": [
       {
         "type": "Expression",
         "path": "10000000.10000000",
         "pathSegments": ["10000000", "10000000"],
         "expressionType": "Identifier",
         "raw": "count"
       }
     ]
   }
   ```

4. **Nested Structure**
   ```tsx
   <div>
     <section>
       <article>
         <h1>Title</h1>
       </article>
     </section>
   </div>
   ```

   **Verify paths:**
   - div: `10000000`
   - section: `10000000.10000000`
   - article: `10000000.10000000.10000000`
   - h1: `10000000.10000000.10000000.10000000`

**Migration Checklist:**

```markdown
- [ ] Implement traverseJSX() that visits every node
- [ ] Generate hex paths for every node
- [ ] Track parent-child relationships
- [ ] Handle JSXElement nodes
- [ ] Handle JSXText nodes (create StaticText)
- [ ] Handle JSXExpressionContainer (create placeholder Expression nodes)
- [ ] Handle JSXFragment (<>...</>)
- [ ] Maintain sibling order (critical for path generation)
- [ ] Test with deeply nested structures
- [ ] Validate all paths are unique
- [ ] Validate all paths are lexicographically sortable
```

**Acceptance Criteria:**
- [ ] Every JSX element has a unique hex path
- [ ] Sibling order is preserved (10000000, 20000000, 30000000...)
- [ ] Parent-child relationships are correct
- [ ] No path collisions
- [ ] Paths sort correctly as strings
- [ ] JSON structure is valid and complete

#### Day 3: Fragment, Conditional, and Loop Structure

**Goal:** Handle structural patterns (fragments, conditionals, loops) WITHOUT extracting templates. Just capture their presence and structure.

**Features to Implement:**

1. **Fragments**
   ```tsx
   <>
     <h1>Title</h1>
     <p>Content</p>
   </>
   ```

   **JSON (no Fragment node, children become direct siblings):**
   ```json
   {
     "type": "RenderMethod",
     "children": [
       { "type": "JSXElement", "tag": "h1", "path": "10000000", ... },
       { "type": "JSXElement", "tag": "p", "path": "20000000", ... }
     ]
   }
   ```

2. **Conditional Branches (Structure Only)**
   ```tsx
   {isVisible && <Modal />}
   {isAdmin ? <Admin /> : <User />}
   ```

   **JSON (mark as conditional, don't extract yet):**
   ```json
   {
     "type": "ConditionalStructure",
     "path": "10000000",
     "pathSegments": ["10000000"],
     "operator": "and",
     "branches": [
       {
         "type": "JSXElement",
         "tag": "Modal",
         "path": "10000000.10000000",
         ...
       }
     ]
   }
   ```

3. **Loop Structure (Array.map)**
   ```tsx
   {todos.map(todo => <li>{todo.text}</li>)}
   ```

   **JSON (mark as loop, don't extract yet):**
   ```json
   {
     "type": "LoopStructure",
     "path": "10000000",
     "pathSegments": ["10000000"],
     "body": {
       "type": "JSXElement",
       "tag": "li",
       "path": "10000000.10000000",
       ...
     }
   }
   ```

**Migration Checklist:**

```markdown
- [ ] Detect JSXFragment and flatten children
- [ ] Detect LogicalExpression (&&, ||)
- [ ] Detect ConditionalExpression (ternary)
- [ ] Create ConditionalStructure nodes
- [ ] Traverse both branches of conditionals
- [ ] Detect CallExpression with .map()
- [ ] Create LoopStructure nodes
- [ ] Traverse loop body
- [ ] Assign unique paths within conditional branches
- [ ] Assign unique paths within loop bodies
- [ ] Test with TodoList.tsx structure
```

**Acceptance Criteria:**
- [ ] Fragments handled correctly (no wrapper node)
- [ ] Conditionals detected and both branches traversed
- [ ] Loops detected and body traversed
- [ ] All paths unique across all branches
- [ ] Structure complete for complex components

#### Day 4: Attribute Structure

**Goal:** Capture ALL attributes with their raw values. NO template extraction yet, just record what's there.

**Features to Implement:**

1. **Static Attributes**
   ```tsx
   <div className="container" id="main">
   ```

   **JSON:**
   ```json
   {
     "type": "JSXElement",
     "tag": "div",
     "path": "10000000",
     "attributes": [
       {
         "type": "StaticAttribute",
         "name": "className",
         "value": "container",
         "path": "10000000.@className"
       },
       {
         "type": "StaticAttribute",
         "name": "id",
         "value": "main",
         "path": "10000000.@id"
       }
     ]
   }
   ```

2. **Dynamic Attributes (Raw)**
   ```tsx
   <div className={myClass} style={myStyle}>
   ```

   **JSON (just mark as dynamic, don't extract):**
   ```json
   {
     "type": "JSXElement",
     "tag": "div",
     "path": "10000000",
     "attributes": [
       {
         "type": "DynamicAttribute",
         "name": "className",
         "path": "10000000.@className",
         "expressionType": "Identifier",
         "raw": "myClass"
       },
       {
         "type": "DynamicAttribute",
         "name": "style",
         "path": "10000000.@style",
         "expressionType": "Identifier",
         "raw": "myStyle"
       }
     ]
   }
   ```

3. **Template Literal Attributes (Raw)**
   ```tsx
   <div className={`count-${count}`}>
   ```

   **JSON:**
   ```json
   {
     "type": "DynamicAttribute",
     "name": "className",
     "path": "10000000.@className",
     "expressionType": "TemplateLiteral",
     "raw": "`count-${count}`"
   }
   ```

4. **Boolean Attributes**
   ```tsx
   <button disabled>
   <input checked={isChecked}>
   ```

   **JSON:**
   ```json
   [
     {
       "type": "BooleanAttribute",
       "name": "disabled",
       "value": true,
       "path": "10000000.@disabled"
     },
     {
       "type": "DynamicAttribute",
       "name": "checked",
       "path": "10000000.@checked",
       "expressionType": "Identifier",
       "raw": "isChecked"
     }
   ]
   ```

**Migration Checklist:**

```markdown
- [ ] Visit all JSXAttribute nodes
- [ ] Generate @attributeName paths
- [ ] Detect StringLiteral attributes (static)
- [ ] Detect JSXExpressionContainer attributes (dynamic)
- [ ] Record expression type (Identifier, TemplateLiteral, etc.)
- [ ] Store raw expression as string (for phase 2)
- [ ] Handle boolean attributes (no value)
- [ ] Handle spread attributes {...props}
- [ ] Test with all attribute variations
```

**Acceptance Criteria:**
- [ ] All attributes captured
- [ ] Static vs dynamic distinguished
- [ ] Expression types recorded
- [ ] Paths correct (@attributeName format)
- [ ] No information loss (raw expression stored)

#### Day 5: Validation & Testing

**Goal:** Ensure the structural JSON is complete, correct, and ready for Phase 2 (template extraction).

**Tasks:**

1. **JSON Schema Validation**
   - [ ] Create JSON schema for our AST format
   - [ ] Validate all generated JSON against schema
   - [ ] Fix any validation errors

2. **Path Validation**
   - [ ] Verify all paths are unique
   - [ ] Verify paths are lexicographically sorted
   - [ ] Verify parent-child path relationships
   - [ ] Check for sufficient gaps between paths

3. **Structure Validation**
   - [ ] Verify tree structure matches source JSX
   - [ ] Count nodes (should match JSX element count)
   - [ ] Verify sibling order preserved
   - [ ] Verify attribute order preserved

4. **Test Components**
   ```markdown
   - [ ] Counter.tsx → Simple component with state
   - [ ] TodoList.tsx → Loops and conditionals
   - [ ] Nested.tsx → Deep nesting (10+ levels)
   - [ ] Attributes.tsx → All attribute variations
   - [ ] Fragments.tsx → Fragment handling
   ```

5. **Create Visualization Tool**
   ```javascript
   // tools/visualize-json.js
   function visualizeTree(json) {
     // Print tree structure with paths
     // Example:
     // div [10000000]
     //   ├─ h1 [10000000.10000000]
     //   │   └─ Text [10000000.10000000.10000000]
     //   └─ button [10000000.20000000]
   }
   ```

**Success Metrics:**
- ✅ All test components generate valid JSON
- ✅ JSON schema validation passes
- ✅ Path validation passes
- ✅ Tree visualization looks correct
- ✅ No missing nodes or attributes
- ✅ Ready for Phase 2 (template extraction)

### Phase 2: Template Extraction (Week 2 - 5 days)

**Objectives:**
- Extract templates from Expression nodes (Phase 1 placeholders)
- Convert DynamicAttribute nodes to AttributeTemplate nodes
- Extract bindings and generate template strings
- Achieve full template support for all node types

**Philosophy:**
> "Second pass: Turn raw expressions into parameterized templates with bindings."

#### Day 6-7: Text Template Extraction

**Goal:** Convert Expression nodes (from Phase 1) into proper TextTemplate nodes with extracted bindings.

**Source Files to Migrate:**
- `babel-plugin-minimact/src/extractors/templates.cjs` → `extractTemplateLiteralShared()`
- `babel-plugin-minimact/src/utils/shared.cjs` → `buildMemberPathShared()`

**Features to Port:**

1. **Simple Map**
   ```tsx
   {todos.map(todo => <li>{todo.text}</li>)}
   ```

2. **Map with Index**
   ```tsx
   {todos.map((todo, i) => <li key={i}>{todo.text}</li>)}
   ```

3. **Nested Maps**
   ```tsx
   {categories.map(cat => (
     <div>
       {cat.items.map(item => <span>{item.name}</span>)}
     </div>
   ))}
   ```

**New Node Type:**
```json
{
  "type": "LoopTemplate",
  "path": "10000000.20000000",
  "pathSegments": ["10000000", "20000000"],
  "binding": "todos",
  "itemVar": "todo",
  "indexVar": "i",
  "body": {
    "type": "JSXElement",
    "tag": "li",
    "children": [...]
  }
}
```

**C# Output:**
```csharp
[LoopTemplate(Path = new[] { "10000000", "20000000" }, Binding = "todos", ItemVar = "todo", IndexVar = "i")]
```

**Migration Checklist:**

```markdown
- [ ] Detect CallExpression with callee.property.name === 'map'
- [ ] Extract array binding (todos)
- [ ] Extract arrow function parameters (todo, i)
- [ ] Recursively process loop body JSX
- [ ] Handle nested loops with correct path scoping
- [ ] Generate LoopTemplate JSON nodes
- [ ] Update C# visitor to handle LoopTemplate
- [ ] Update C# code generator for loop attributes
- [ ] Test with TodoList.tsx
```

#### Day 8-9: Conditional Template Support

**Source Files to Migrate:**
- `babel-plugin-minimact/src/extractors/templates.cjs` → Conditional branch traversal

**Features to Port:**

1. **Ternary Operator**
   ```tsx
   {isAdmin ? <AdminPanel /> : <UserPanel />}
   ```

2. **Logical AND**
   ```tsx
   {isVisible && <Modal />}
   ```

3. **Logical OR**
   ```tsx
   {errorMessage || <DefaultMessage />}
   ```

4. **Nested Conditionals**
   ```tsx
   {isAdmin ? (isPremium ? <PremiumAdmin /> : <Admin />) : <User />}
   ```

**New Node Type:**
```json
{
  "type": "ConditionalTemplate",
  "path": "10000000.30000000",
  "pathSegments": ["10000000", "30000000"],
  "condition": "isAdmin",
  "operator": "ternary",
  "consequent": { "type": "JSXElement", ... },
  "alternate": { "type": "JSXElement", ... }
}
```

**Migration Checklist:**

```markdown
- [ ] Detect ConditionalExpression (ternary)
- [ ] Detect LogicalExpression (&&, ||)
- [ ] Extract condition binding
- [ ] Process consequent branch
- [ ] Process alternate branch (if exists)
- [ ] Handle JSX in both branches
- [ ] Handle nested conditionals
- [ ] Generate ConditionalTemplate JSON nodes
- [ ] Update C# visitor for conditionals
- [ ] Test with Conditionals.tsx
```

#### Day 10: Integration & Testing

**Tasks:**
- [ ] Run full test suite against TodoList.tsx
- [ ] Test nested loops
- [ ] Test conditional rendering
- [ ] Test combinations (loops + conditionals)
- [ ] Performance testing (large lists)

**Success Metrics:**
- ✅ TodoList.tsx generates correct output
- ✅ Loops work correctly
- ✅ Conditionals work correctly
- ✅ Nested structures work
- ✅ Performance acceptable (<1s for 100 components)

### Phase 3: Edge Cases & Polish (Week 3 - 5 days)

**Objectives:**
- Handle fragments
- Handle event handlers
- Handle special attributes
- Achieve 100% feature parity

#### Day 11-12: Fragments & Special Cases

**Features to Port:**

1. **Fragments**
   ```tsx
   <>
     <h1>Title</h1>
     <p>Content</p>
   </>
   ```

2. **Event Handlers**
   ```tsx
   <button onClick={() => handleClick()}>
   ```

3. **Refs**
   ```tsx
   <div ref={myRef}>
   ```

4. **Component Props**
   ```tsx
   <CustomComponent title={title} count={count} />
   ```

**Migration Checklist:**

```markdown
- [ ] Handle JSXFragment nodes
- [ ] Extract event handler patterns
- [ ] Handle onClick, onChange, onSubmit, etc.
- [ ] Handle ref attributes specially
- [ ] Handle component composition
- [ ] Handle spread operators {...props}
- [ ] Handle children as props
- [ ] Document limitations (if any)
```

#### Day 13-14: Path System Refinement

**Tasks:**

1. **Path Collision Detection**
   - [ ] Detect when hex codes might collide
   - [ ] Implement path rebalancing if needed
   - [ ] Add warnings for low gap space

2. **Path Utilities**
   - [ ] Add path comparison utilities
   - [ ] Add path sorting utilities
   - [ ] Add path insertion utilities (for future use)

3. **Path Documentation**
   - [ ] Document path format in detail
   - [ ] Create path debugging tools
   - [ ] Add path visualization (tree diagram)

**C# Utilities to Create:**

```csharp
public static class PathUtils
{
    public static string GeneratePathBetween(string path1, string path2);
    public static bool HasSufficientGap(string path1, string path2);
    public static List<string> SortPaths(List<string> paths);
    public static string VisualizePath(string path);
}
```

#### Day 15: Final Testing & Validation

**Comprehensive Test Suite:**

```markdown
- [ ] Counter.tsx (simple state)
- [ ] TodoList.tsx (loops + state)
- [ ] Conditionals.tsx (complex logic)
- [ ] Styles.tsx (style objects)
- [ ] Fragments.tsx (fragment handling)
- [ ] Events.tsx (event handlers)
- [ ] Nested.tsx (deeply nested structures)
- [ ] Performance.tsx (large component tree)
```

**Validation Checklist:**

```markdown
- [ ] All test components generate correct JSON
- [ ] All JSON deserializes correctly in C#
- [ ] All C# code compiles without errors
- [ ] All generated attributes are valid
- [ ] Hex paths are unique and sorted
- [ ] No memory leaks in generator
- [ ] Performance meets requirements (<1s per component)
- [ ] Documentation is complete
```

### Phase 4: Integration & Deployment (Week 4 - 5 days)

#### Day 16-17: Build System Integration

**Tasks:**

1. **Update npm Scripts**
   ```json
   {
     "scripts": {
       "transpile": "npm run transpile:babel && npm run transpile:codegen",
       "transpile:babel": "babel src/components --plugins=minimact-transpiler/babel --out-dir=Generated/json",
       "transpile:codegen": "dotnet run --project src/minimact-transpiler/codegen -- --json=Generated/json --out=Generated/cs",
       "watch": "concurrently \"npm run transpile:babel -- --watch\" \"npm run transpile:codegen -- --watch\""
     }
   }
   ```

2. **Create CLI Tool**
   - [ ] Create `minimact-transpile` CLI command
   - [ ] Add flags: `--watch`, `--json-dir`, `--out-dir`, `--verbose`
   - [ ] Add progress indicators
   - [ ] Add error reporting

3. **Update Minimact Core**
   - [ ] Update `Minimact.AspNetCore` to reference new codegen project
   - [ ] Update attribute handling for hex paths
   - [ ] Update predictor to use hex paths
   - [ ] Update runtime to use hex paths

**Integration Checklist:**

```markdown
- [ ] Create minimact-transpile CLI
- [ ] Update package.json scripts
- [ ] Update .gitignore for new output dirs
- [ ] Update CI/CD pipeline
- [ ] Test full build process
- [ ] Test watch mode
- [ ] Update developer documentation
```

#### Day 18-19: Examples Migration

**Migrate All Examples:**

1. **minimact-counter**
   - [ ] Update build scripts
   - [ ] Test transpilation
   - [ ] Verify runtime behavior
   - [ ] Update README

2. **minimact-todo**
   - [ ] Update build scripts
   - [ ] Test transpilation
   - [ ] Verify runtime behavior
   - [ ] Update README

3. **minimact-electron-filemanager**
   - [ ] Update build scripts
   - [ ] Test transpilation
   - [ ] Verify runtime behavior
   - [ ] Update README

4. **Other Examples**
   - [ ] Repeat for all remaining examples
   - [ ] Document any issues encountered
   - [ ] Create migration guide for users

**Example Build Script:**

```json
// example/package.json
{
  "scripts": {
    "build": "npm run transpile && dotnet build",
    "transpile": "minimact-transpile --watch=false",
    "dev": "concurrently \"minimact-transpile --watch\" \"dotnet watch run\""
  }
}
```

#### Day 20: Documentation & Release

**Documentation Updates:**

1. **User Documentation**
   - [ ] Update README.md with new transpiler
   - [ ] Create migration guide for existing projects
   - [ ] Update getting started guide
   - [ ] Add troubleshooting section

2. **Developer Documentation**
   - [ ] Document hex path system
   - [ ] Document JSON schema
   - [ ] Document visitor pattern extension
   - [ ] Add architecture diagrams

3. **API Documentation**
   - [ ] Document all JSON node types
   - [ ] Document C# visitor interface
   - [ ] Document path utilities
   - [ ] Add code examples

**Release Checklist:**

```markdown
- [ ] All tests passing
- [ ] All examples working
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Version bumped (v2.0.0)
- [ ] Create GitHub release
- [ ] Publish npm packages
- [ ] Publish NuGet packages
- [ ] Update website
- [ ] Announce on Discord/Twitter
```

## File-by-File Migration Map

### Babel Plugin

| Old File | New File | Status | Priority |
|----------|----------|--------|----------|
| `src/index.cjs` | `babel/src/index.js` | ✅ Created | High |
| `src/extractors/templates.cjs` (text) | `babel/src/index.js` (processExpression) | ⏳ Pending | High |
| `src/extractors/templates.cjs` (attr) | `babel/src/index.js` (processAttribute) | ⏳ Pending | High |
| `src/extractors/templates.cjs` (loops) | `babel/src/index.js` (processLoop) | ⏳ Pending | Medium |
| `src/extractors/templates.cjs` (cond) | `babel/src/index.js` (processConditional) | ⏳ Pending | Medium |
| `src/utils/styleConverter.cjs` | `babel/src/styleConverter.js` | ⏳ Pending | Medium |
| `src/utils/pathBuilder.cjs` | `babel/src/hexPath.js` | ✅ Created | High |
| `src/generators/csharp.cjs` | ❌ Removed (C# handles) | - | - |

### C# Code Generator

| Old Location | New File | Status | Priority |
|--------------|----------|--------|----------|
| String manipulation in Babel | `Nodes/ComponentNode.cs` | ✅ Created | High |
| N/A | `Visitors/INodeVisitor.cs` | ✅ Created | High |
| N/A | `Visitors/CSharpCodeGenerator.cs` | ✅ Created | High |
| N/A | `Transpiler.cs` | ✅ Created | High |
| N/A | `PathUtils.cs` | ⏳ Pending | Medium |

## Testing Strategy

### Unit Tests

**Babel Plugin Tests:**
```javascript
// tests/babel/hexPath.test.js
describe('HexPathGenerator', () => {
  it('generates unique hex codes', () => {
    const gen = new HexPathGenerator();
    expect(gen.next('')).toBe('10000000');
    expect(gen.next('')).toBe('20000000');
  });

  it('handles nested paths', () => {
    const gen = new HexPathGenerator();
    const parent = gen.buildPath('', gen.next(''));
    expect(gen.buildPath(parent, gen.next(parent))).toBe('10000000.10000000');
  });
});

// tests/babel/templates.test.js
describe('Template Extraction', () => {
  it('extracts text templates', () => { ... });
  it('extracts attribute templates', () => { ... });
  it('extracts loop templates', () => { ... });
});
```

**C# Tests:**
```csharp
// tests/Minimact.Transpiler.CodeGen.Tests/NodeTests.cs
[Test]
public void ComponentNode_Deserializes_Correctly()
{
    var json = File.ReadAllText("fixtures/Counter.json");
    var component = JsonSerializer.Deserialize<ComponentNode>(json);

    Assert.That(component.ComponentName, Is.EqualTo("Counter"));
    Assert.That(component.RenderMethod, Is.Not.Null);
}

// tests/Minimact.Transpiler.CodeGen.Tests/VisitorTests.cs
[Test]
public void CSharpCodeGenerator_Generates_TextTemplate_Attribute()
{
    var node = new TextTemplateNode {
        PathSegments = new List<string> { "10000000" },
        Template = "Count: {0}",
        Bindings = new List<string> { "count" }
    };

    var visitor = new CSharpCodeGenerator();
    node.Accept(visitor);
    var output = visitor.GetOutput();

    Assert.That(output, Contains.Substring("[TextTemplate("));
}
```

### Integration Tests

**End-to-End Tests:**
```javascript
// tests/integration/counter.test.js
describe('Counter Component E2E', () => {
  it('transpiles Counter.tsx correctly', async () => {
    // Run Babel plugin
    await runBabel('fixtures/Counter.tsx', 'output/Counter.json');

    // Run C# codegen
    await runCodeGen('output/Counter.json', 'output/Counter.Generated.cs');

    // Compile generated C#
    await compileCSharp('output/Counter.Generated.cs');

    // Verify attributes
    const generatedCode = fs.readFileSync('output/Counter.Generated.cs', 'utf8');
    expect(generatedCode).toContain('[TextTemplate(');
    expect(generatedCode).toContain('[AttributeTemplate(');
  });
});
```

### Regression Tests

**Comparison Tests:**
```javascript
// tests/regression/compare.test.js
describe('Old vs New Plugin Comparison', () => {
  const fixtures = ['Counter', 'TodoList', 'Conditionals', 'Styles'];

  fixtures.forEach(name => {
    it(`${name} generates equivalent output`, async () => {
      const oldOutput = await runOldPlugin(`fixtures/${name}.tsx`);
      const newOutput = await runNewPlugin(`fixtures/${name}.tsx`);

      // Compare functional equivalence (not exact string match)
      expect(normalizeOutput(newOutput)).toEqual(normalizeOutput(oldOutput));
    });
  });
});
```

## Risk Management

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking Changes in Generated Code** | 🔴 High | Run both plugins in parallel, extensive testing |
| **Performance Regression** | 🟡 Medium | Benchmark old vs new, optimize hot paths |
| **Missing Edge Cases** | 🟡 Medium | Comprehensive test suite, gradual rollout |
| **Path Collision** | 🟢 Low | Use large gap (0x10000000), add collision detection |

### Rollback Plan

If migration fails:

1. **Keep old plugin functional** - Don't delete until v2.0.0 is stable
2. **Feature flag** - Allow users to opt-in to new transpiler
3. **Gradual migration** - Migrate examples one at a time
4. **Clear documentation** - Document known issues and workarounds

### Contingency Plan

If timeline slips:

1. **Phase 1 is MVP** - Text + attribute templates sufficient for basic components
2. **Phase 2 can ship later** - Loops and conditionals in v2.1.0
3. **Phase 3 is polish** - Edge cases can be addressed post-launch
4. **Phase 4 is critical** - Integration must be solid before release

## Success Criteria

### Must Have (Phase 1)

- ✅ Text templates work
- ✅ Attribute templates work
- ✅ Hex paths generate correctly
- ✅ JSON schema validates
- ✅ C# code compiles
- ✅ Counter.tsx works end-to-end

### Should Have (Phase 2)

- ✅ Loop templates work
- ✅ Conditional templates work
- ✅ TodoList.tsx works end-to-end
- ✅ Nested structures work

### Nice to Have (Phase 3)

- ✅ Fragments work
- ✅ Event handlers documented
- ✅ All examples migrated
- ✅ Performance optimized

### Launch Criteria (Phase 4)

- ✅ All tests passing
- ✅ All examples working
- ✅ Documentation complete
- ✅ No known blockers
- ✅ Performance acceptable
- ✅ Community feedback positive

## Timeline Summary

| Week | Phase | Deliverable | Success Metric |
|------|-------|-------------|----------------|
| 1 | Core Templates | Text + Attr templates working | Counter.tsx works |
| 2 | Advanced | Loops + Conditionals working | TodoList.tsx works |
| 3 | Polish | Edge cases + all tests | 100% test coverage |
| 4 | Deploy | Examples + docs + release | v2.0.0 shipped |

## Post-Migration

### Deprecation of Old Plugin

**Timeline:**
- **v2.0.0** - New transpiler launches, old plugin marked deprecated
- **v2.1.0** - Old plugin moves to separate package (`babel-plugin-minimact-legacy`)
- **v3.0.0** - Old plugin removed from core (breaking change)

**Migration Guide for Users:**

```markdown
# Migrating from babel-plugin-minimact to minimact-transpiler

## Update package.json

```diff
{
  "scripts": {
-   "transpile": "babel src --plugins=babel-plugin-minimact --out-dir=Generated"
+   "transpile": "minimact-transpile"
  },
  "devDependencies": {
-   "babel-plugin-minimact": "^1.0.0"
+   "@minimact/transpiler-babel": "^2.0.0",
+   "@minimact/transpiler-codegen": "^2.0.0"
  }
}
```

## Update .gitignore

```diff
# Generated files
-Generated/*.Generated.cs
+Generated/json/
+Generated/cs/*.Generated.cs
```

## Test your build

```bash
npm run transpile
dotnet build
dotnet run
```
```

### Future Enhancements

After successful migration:

1. **Watch Mode** - Hot reload during development
2. **Source Maps** - Map generated C# back to TSX for debugging
3. **Type Inference** - Infer C# types from TypeScript
4. **Optimizations** - Dead code elimination, tree shaking
5. **Plugins** - Allow community to extend transpiler
6. **IDE Integration** - VSCode extension for real-time feedback
7. **Analytics** - Track template usage patterns for optimization

## Conclusion

This migration is a significant undertaking but provides substantial long-term benefits:

- **Cleaner architecture** - Separation of concerns
- **Better maintainability** - Type-safe C# code generation
- **Easier debugging** - JSON intermediate representation
- **More extensible** - Visitor pattern for new features
- **Future-proof** - Hex paths allow for easy insertion

**Estimated Effort:** 3-4 weeks for one developer

**Recommended Start Date:** Immediately (parallel to current development)

**Target Launch:** v2.0.0 in 4 weeks

---

**Questions or concerns?** Contact the Minimact team on Discord or open an issue on GitHub.
