# VNode Path Refactor

**Date**: 2025-01-05
**Status**: 🚧 Planned
**Priority**: 🔴 High - Foundation for proper null tracking

---

## Executive Summary

This refactor adds **hex paths as first-class data** to all VNode types (VElement, VText, VNull), eliminating the need for runtime path computation and enabling accurate null tracking for conditional rendering.

### The Problem

**Current State:**
```rust
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    pub children: Vec<Option<VNode>>,  // ❌ null is just None - no path!
    pub key: Option<String>,
    // ❌ NO PATH FIELD
}
```

**Issues:**
1. ❌ Paths computed during traversal (expensive, error-prone)
2. ❌ Nulls represented as `None` - **no way to know their path**
3. ❌ Runtime path calculation can drift from transpiled paths
4. ❌ Null path tracking requires inferring from array indices
5. ❌ Reconciler has to traverse tree to compute paths

**Example Failure:**
```tsx
<div>
  <span>Always visible</span>      {/* 10000000 */}
  {isVisible && <Modal />}         {/* 20000000 - but it's just null! */}
  <button>Click me</button>        {/* 30000000 */}
</div>
```

Runtime VNode children: `[VElement, null, VElement]`
**Problem:** The `null` doesn't know it's at path `"20000000"`!

### The Solution

**Store hex paths in all VNodes:**

```rust
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    pub children: Vec<VNode>,  // ✅ No more Option<> - use VNull instead
    pub key: Option<String>,
    pub path: HexPath,  // ✅ Path stored directly!
}

pub struct VText {
    pub content: String,
    pub path: HexPath,  // ✅ Path stored directly!
}

pub struct VNull {
    pub path: HexPath,  // ✅ Null knows its path!
}
```

**Example VNode tree:**
```rust
VElement {
    tag: "div",
    path: "10000000",
    children: vec![
        VElement { tag: "span", path: "10000000.10000000", ... },
        VNull { path: "10000000.20000000" },  // ✅ Knows where it would be!
        VElement { tag: "button", path: "10000000.30000000", ... },
    ]
}
```

---

## Benefits

### 1. **Simpler Reconciliation**

**Before (path computation during diffing):**
```rust
fn reconcile(old: &VNode, new: &VNode, current_path: Vec<int>) -> Vec<Patch> {
    // ❌ Have to compute paths on the fly
    let hex_path = convert_path_to_hex(&current_path);

    // ❌ Complex index tracking
    for (i, (old_child, new_child)) in old.children.iter().zip(&new.children).enumerate() {
        let child_path = current_path.clone();
        child_path.push(i);
        // ... recursive complexity
    }
}
```

**After (paths are data):**
```rust
fn reconcile(old: &VNode, new: &VNode) -> Vec<Patch> {
    match (old, new) {
        (VNull(old_null), VElement(new_elem)) if old_null.path == new_elem.path => {
            // ✅ Direct path comparison!
            vec![Patch::Create { path: new_elem.path.clone(), node: new_elem.clone() }]
        }
        (VElement(old_elem), VNull(new_null)) if old_elem.path == new_null.path => {
            // ✅ Clear semantics: element became null
            vec![Patch::Remove { path: old_elem.path.clone() }]
        }
        (VElement(old_elem), VElement(new_elem)) => {
            if old_elem.path != new_elem.path {
                // ✅ Element moved - easy to detect!
                vec![Patch::Move { from: old_elem.path, to: new_elem.path }]
            }
            // ... continue diffing
        }
    }
}
```

### 2. **Explicit Null Tracking**

**Before:**
```csharp
// Runtime C# code:
new VElement("div", props, new VNode[] {
    new VElement("span", ...),
    null,  // ❌ Just null - no path info!
    new VElement("button", ...)
})
```

Server has to **infer** null paths:
```csharp
// PatchPathAdjuster has to walk the tree with indices
for (int i = 0; i < children.Count; i++) {
    if (children[i] == null) {
        var hexPath = ConvertPathToHex(new[] { i });  // ❌ Computed!
        nullPaths.Add($"{hexPath}.null");
    }
}
```

**After:**
```csharp
// Runtime C# code:
new VElement("div", "10000000", props, new VNode[] {
    new VElement("span", "10000000.10000000", ...),
    new VNull("10000000.20000000"),  // ✅ Knows its path!
    new VElement("button", "10000000.30000000", ...)
})
```

Server can **directly read** null paths:
```csharp
// Extract null paths is trivial
var nullPaths = vnode.GetDescendants()
    .OfType<VNull>()
    .Select(n => n.Path)
    .ToList();  // ✅ Simple LINQ query!
```

### 3. **Accurate Patch Generation**

**Before:**
```rust
// Patch has computed path (might be wrong if indices shifted)
Patch::Create {
    path: compute_hex_path(&[0, 2, 1]),  // ❌ Computed during reconciliation
    node: new_node
}
```

**After:**
```rust
// Patch has path directly from VNode (guaranteed correct)
Patch::Create {
    path: new_node.path().clone(),  // ✅ Path from transpilation!
    node: new_node
}
```

### 4. **Client-Side Null Path Updates**

**Before:**
```typescript
// Client has to receive updated null path map from server
// whenever conditional rendering changes
```

**After:**
```typescript
// Create/Remove patches tell client directly!
case 'Create':
  const path = patch.node.path;
  nullPaths.delete(path);  // ✅ Was null, now exists

case 'Remove':
  const path = patch.path;
  nullPaths.add(path);  // ✅ Was element, now null
```

---

## Implementation Plan

### Phase 1: Rust Core (2 days)

#### Day 1: Update VNode Definitions

**File:** `src/src/vdom.rs`

```rust
// Add VNull variant to VNode enum
pub enum VNode {
    Element(VElement),
    Text(VText),
    Null(VNull),  // ← NEW
}

// Add path field to VElement
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    pub children: Vec<VNode>,  // ← Changed from Vec<Option<VNode>>
    pub key: Option<String>,
    pub path: HexPath,  // ← NEW
}

// Add path field to VText
pub struct VText {
    pub content: String,
    pub path: HexPath,  // ← NEW
}

// New VNull struct
pub struct VNull {
    pub path: HexPath,
}
```

**Changes:**
- ✅ Add `VNull` variant to `VNode` enum
- ✅ Add `path: HexPath` to `VElement`
- ✅ Add `path: HexPath` to `VText`
- ✅ Create `VNull` struct with `path: HexPath`
- ✅ Change `VElement.children` from `Vec<Option<VNode>>` to `Vec<VNode>`

#### Day 2: Update Reconciler

**File:** `src/src/reconciler.rs`

```rust
// Simplify reconciliation using direct path comparison
fn reconcile_children(old: &[VNode], new: &[VNode]) -> Vec<Patch> {
    let mut patches = vec![];

    // Build maps by path (much simpler than index-based)
    let old_by_path: HashMap<&HexPath, &VNode> = old.iter()
        .map(|n| (n.path(), n))
        .collect();

    let new_by_path: HashMap<&HexPath, &VNode> = new.iter()
        .map(|n| (n.path(), n))
        .collect();

    // Check for creates (in new but not old)
    for (path, new_node) in &new_by_path {
        if !old_by_path.contains_key(path) {
            patches.push(match new_node {
                VNode::Null(_) => continue,  // Null → Null is no-op
                _ => Patch::Create {
                    path: (*path).clone(),
                    node: (*new_node).clone()
                }
            });
        }
    }

    // Check for removes (in old but not new) or null transitions
    for (path, old_node) in &old_by_path {
        match (old_node, new_by_path.get(path)) {
            (VNode::Null(_), _) => continue,  // Old was null, ignore
            (_, None) | (_, Some(VNode::Null(_))) => {
                // Element removed or became null
                patches.push(Patch::Remove {
                    path: (*path).clone()
                });
            }
            (_, Some(new_node)) => {
                // Both exist, diff them
                patches.extend(diff_node(old_node, new_node));
            }
        }
    }

    patches
}

// Helper to get path from any VNode variant
impl VNode {
    pub fn path(&self) -> &HexPath {
        match self {
            VNode::Element(e) => &e.path,
            VNode::Text(t) => &t.path,
            VNode::Null(n) => &n.path,
        }
    }
}
```

**Changes:**
- ✅ Add `VNode::path()` helper method
- ✅ Simplify `reconcile_children()` to use path-based maps
- ✅ Remove index-based path computation
- ✅ Handle `VNull` → `VElement` (Create patch)
- ✅ Handle `VElement` → `VNull` (Remove patch)
- ✅ Handle `VNull` → `VNull` (no-op)

### Phase 2: C# Runtime (2 days)

#### Day 3: Update C# VNode Classes

**File:** `src/Minimact.AspNetCore/Core/VNode.cs`

```csharp
public abstract class VNode
{
    public string Path { get; set; } = "";
    public abstract string ToHtml();
}

public class VElement : VNode
{
    public string Tag { get; set; }
    public Dictionary<string, string> Props { get; set; }
    public List<VNode> Children { get; set; }  // ← Changed from List<VNode?>
    public string? Key { get; set; }

    public VElement(string tag, string path)  // ← Added path parameter
    {
        Tag = tag;
        Path = path;
        Props = new Dictionary<string, string>();
        Children = new List<VNode>();
    }

    public VElement(string tag, string path, Dictionary<string, string> props, params VNode[] children)
    {
        Tag = tag;
        Path = path;
        Props = props;
        Children = new List<VNode>(children);
    }
}

public class VText : VNode
{
    public string Content { get; set; }

    public VText(string content, string path)  // ← Added path parameter
    {
        Content = content ?? "";
        Path = path;
    }
}

public class VNull : VNode  // ← NEW CLASS
{
    public VNull(string path)
    {
        Path = path;
    }

    public override string ToHtml() => "";
}
```

**Changes:**
- ✅ Add `Path` property to base `VNode` class
- ✅ Add `path` parameter to `VElement` constructors
- ✅ Add `path` parameter to `VText` constructor
- ✅ Create `VNull` class with `path` parameter
- ✅ Change `VElement.Children` from `List<VNode?>` to `List<VNode>`

#### Day 4: Update MinimactHelpers

**File:** `src/Minimact.AspNetCore/Core/MinimactHelpers.cs`

```csharp
private static VNode[] ConvertChildren(object?[]? children, string parentPath)
{
    if (children == null || children.Length == 0)
        return Array.Empty<VNode>();

    var result = new List<VNode>();
    int childIndex = 0;

    foreach (var child in children)
    {
        // Generate child path
        uint hexValue = (uint)(childIndex + 1) * 0x10000000;
        string childPath = $"{parentPath}.{hexValue:x8}";

        // ✅ Preserve null for conditional rendering with explicit path
        if (child == null)
        {
            result.Add(new VNull(childPath));
            childIndex++;
            continue;
        }

        // Already a VNode (should have path from transpilation)
        if (child is VNode vnode)
        {
            result.Add(vnode);
            childIndex++;
            continue;
        }

        // String content
        if (child is string str)
        {
            if (!string.IsNullOrWhiteSpace(str))
            {
                result.Add(new VText(str, childPath));
                childIndex++;
            }
            continue;
        }

        // ... handle other types with childPath
    }

    return result.ToArray();
}
```

**Changes:**
- ✅ Generate child paths in `ConvertChildren()`
- ✅ Create `VNull` with path instead of adding `null!`
- ✅ Pass paths to `VText` and other node constructors

### Phase 3: Transpiler Updates (3 days)

#### Day 5-6: Update Babel Plugin

**File:** `babel-plugin-minimact/src/generators/csharp.cjs`

**Current Code Generation:**
```javascript
function generateElement(node, state) {
    const tag = node.openingElement.name.name;
    const props = generateProps(node.openingElement.attributes);
    const children = node.children.map(child => generateNode(child, state));

    return `new VElement("${tag}", ${props}, ${children.join(', ')})`;
}
```

**New Code Generation:**
```javascript
function generateElement(node, state, path) {
    const tag = node.openingElement.name.name;
    const props = generateProps(node.openingElement.attributes);
    const children = node.children.map((child, i) => {
        const childPath = `${path}.${((i + 1) * 0x10000000).toString(16).padStart(8, '0')}`;
        return generateNode(child, state, childPath);
    });

    // ✅ Pass path as second parameter
    return `new VElement("${tag}", "${path}", ${props}, ${children.join(', ')})`;
}

function generateConditional(node, state, path) {
    const condition = generate(node.test).code;
    const consequent = generateNode(node.consequent, state, path);
    const alternate = node.alternate
        ? generateNode(node.alternate, state, path)
        : `new VNull("${path}")`;  // ✅ Use VNull instead of null

    return `(${condition}) ? ${consequent} : ${alternate}`;
}

function generateText(node, state, path) {
    const content = node.value.trim();
    // ✅ Pass path to VText
    return `new VText("${escapeString(content)}", "${path}")`;
}
```

**Changes:**
- ✅ Thread `path` parameter through all generation functions
- ✅ Generate child paths using hex code formula
- ✅ Emit `new VNull(path)` instead of `null` for false conditionals
- ✅ Pass paths to `VElement`, `VText` constructors
- ✅ Ensure paths match `.templates.json` structure

#### Day 7: Update Template Generation

**File:** `babel-plugin-minimact/src/extractors/templates.cjs`

Ensure template paths match the VNode paths in generated C# code:

```javascript
function extractTextTemplate(node, state) {
    const path = state.currentPath;  // Already tracked during traversal

    return {
        path: path.split('.'),  // ["10000000", "20000000"]
        template: extractTemplate(node),
        bindings: extractBindings(node),
        type: "dynamic"
    };
}
```

**Changes:**
- ✅ Verify template paths match generated VNode paths
- ✅ Test that `.templates.json` aligns with generated C# code

### Phase 4: Testing & Validation (2 days)

#### Day 8: Integration Tests

**Test Cases:**

1. **Conditional Rendering**
```csharp
// Test that VNull is generated with correct path
{false && <Modal />}
// Expected: new VNull("20000000")
```

2. **Path Alignment**
```csharp
// Verify VNode paths match template paths
var vnode = component.Render();
var templates = LoadTemplates(component);

foreach (var template in templates) {
    var vnodeAtPath = FindVNodeByPath(vnode, template.Path);
    Assert.NotNull(vnodeAtPath);
    Assert.Equal(template.Path, vnodeAtPath.Path);
}
```

3. **Reconciliation**
```csharp
// Test that reconciler uses paths correctly
var oldVNode = new VElement("div", "10000000", props,
    new VNull("10000000.20000000"));

var newVNode = new VElement("div", "10000000", props,
    new VElement("span", "10000000.20000000", ...));

var patches = Reconcile(oldVNode, newVNode);
Assert.Single(patches);
Assert.IsType<CreatePatch>(patches[0]);
Assert.Equal("10000000.20000000", patches[0].Path);
```

4. **Null Path Extraction**
```csharp
// Test that ExtractNullPaths is simple
var vnode = component.Render();
var nullPaths = vnode.GetDescendants()
    .OfType<VNull>()
    .Select(n => n.Path)
    .ToList();

Assert.Contains("10000000.20000000", nullPaths);
```

#### Day 9: Performance Testing

**Benchmarks:**

1. **Reconciliation Speed**
```
Before: ~5ms for 1000-node tree (with path computation)
After: ~2ms for 1000-node tree (direct path comparison)
Expected: 60% faster
```

2. **Null Path Extraction**
```
Before: Tree traversal + index computation
After: Simple LINQ filter
Expected: 80% faster
```

3. **Memory Usage**
```
Before: No path storage, computed on demand
After: Paths stored in every VNode
Expected: +8 bytes per node (acceptable)
```

---

## Migration Strategy

### Breaking Changes

This is a **breaking change** for:
1. Existing generated C# code (needs retranspilation)
2. Rust reconciler API
3. C# VNode constructors

### Migration Steps

1. **Update Babel Plugin** (Phase 3)
2. **Retranspile All Components**
   ```bash
   npx babel src/components --plugins=babel-plugin-minimact --out-dir=Generated
   ```
3. **Rebuild Rust Library**
   ```bash
   cd src && cargo build --release
   ```
4. **Rebuild C# Projects**
   ```bash
   dotnet build
   ```

### Backward Compatibility

**None** - this is a breaking change. All components must be retranspiled.

**Version Bump:** v1.x → v2.0.0

---

## Success Criteria

### Functional
- ✅ All VNodes have paths from transpilation
- ✅ VNull replaces null in VNode trees
- ✅ Reconciler uses path-based diffing
- ✅ Null path tracking works correctly
- ✅ Create/Remove patches update client null map
- ✅ All tests pass

### Performance
- ✅ Reconciliation ≥50% faster (no path computation)
- ✅ Null path extraction ≥70% faster (direct LINQ query)
- ✅ Memory overhead <10% (8 bytes per node)

### Code Quality
- ✅ Reconciler logic is simpler (path-based, not index-based)
- ✅ No runtime path computation
- ✅ Explicit null handling (VNull, not null)
- ✅ Transpiler and runtime paths guaranteed to match

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Impact:** High
**Mitigation:**
- Clear migration guide
- Version bump to v2.0.0
- Automated retranspilation script

### Risk 2: Increased Memory Usage
**Impact:** Low
**Mitigation:**
- Paths are strings (~8-16 bytes)
- Acceptable for 1000+ node trees
- Benefits outweigh cost

### Risk 3: Transpiler Complexity
**Impact:** Medium
**Mitigation:**
- Path generation is deterministic (hex formula)
- Well-tested path generation utilities
- Extensive integration tests

---

## Timeline

| Week | Phase | Deliverable | Status |
|------|-------|-------------|--------|
| 1 | Rust Core | VNode with paths, VNull variant | 🚧 Pending |
| 1 | C# Runtime | Updated VNode classes, constructors | 🚧 Pending |
| 2 | Transpiler | Updated Babel plugin, code generation | 🚧 Pending |
| 2 | Testing | Integration tests, benchmarks | 🚧 Pending |

**Total Estimate:** 9 days (2 weeks)

---

## Related Documents

- `NULL_PATH_TRACKING.md` - Client-side null path tracking (current approach)
- `TEMPLATE_PATCH_SYSTEM.md` - Template-based hot reload architecture
- `TRANSPILER_MIGRATION_PLAN.md` - Babel plugin refactoring plan
- `HYBRID-JSX-STRATEGY.md` - JSX transformation approach

---

## Conclusion

Adding paths to VNodes is a **foundational improvement** that:
- ✅ Simplifies reconciliation (path-based, not index-based)
- ✅ Enables proper null tracking (VNull with explicit paths)
- ✅ Eliminates runtime path computation (paths from transpilation)
- ✅ Makes the system more robust and maintainable

This refactor is **essential** for proper conditional rendering support and lays the groundwork for more advanced features like element reordering and key-based reconciliation.
