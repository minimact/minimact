# Hot Reload Structural Change Detection

## Overview

Minimact's hot reload system uses **hex path keys** to efficiently detect and apply structural changes to the component tree without full reconciliation. By tracking which keys are new (insertions) or missing (deletions), the system can surgically update the VNode tree in-place.

## The Problem

Traditional hot reload systems face several challenges:

1. **Full Tree Diffing**: Comparing entire VNode trees is expensive
2. **Position-Based Tracking**: Array indices change when elements are inserted/removed
3. **Reconciliation Overhead**: Full reconciliation on every change is slow
4. **State Loss**: Rebuilding components loses local state

## The Solution: Stable Hex Path Keys

Minimact uses **lexicographically sortable hex paths** as stable identifiers:

- **Keys are stable**: Once assigned, they don't change across edits
- **Half-gap insertion**: New elements get keys between existing siblings (e.g., "1.18" between "1.1" and "1.2")
- **No renumbering**: Adding/removing elements doesn't affect other keys
- **Lexicographic sorting**: String comparison maintains tree order

### Example

**Before:**
```tsx
<div key="1">
  <h1 key="1.1">Hello</h1>
  <p key="1.2">World</p>
</div>
```

**After (user adds `<span>`):**
```tsx
<div key="1">
  <h1 key="1.1">Hello</h1>
  <span>New!</span>              {/* No key = NEW NODE! */}
  <p key="1.2">World</p>
</div>
```

**Babel detects:**
- `<span>` has **no key** → Insertion detected
- Located between keys "1.1" and "1.2"
- Generates half-gap key: **"1.18"**
- Emits structural change: `{ type: "insert", path: "1.18", vnode: {...} }`

**C# applies:**
- Inserts VNode at path "1.18" into existing tree
- No full reconciliation needed
- Existing components maintain their state

## Architecture

### Phase 1: Detection (Babel Plugin)

#### A. Insertion Detection

**Signal**: JSX element without a `key` attribute

```javascript
// In assignPathsToJSX()
const keyAttr = node.openingElement?.attributes?.find(attr =>
  t.isJSXAttribute(attr) && attr.name.name === 'key'
);

if (!keyAttr) {
  // NO KEY = NEW NODE!
  const isNewInsertion = true;

  // Generate half-gap key if between siblings
  let currentPath;
  if (previousSiblingKey && nextSiblingKey) {
    currentPath = generateHalfGap(previousSiblingKey, nextSiblingKey, parentPath);
    console.log(`[Hot Reload] 🆕 Insertion detected at path "${currentPath}"`);
  } else {
    currentPath = pathGen.buildPath(parentPath, pathGen.next(parentPath));
  }

  // Track structural change
  state.file.structuralChanges.push({
    type: 'insert',
    path: currentPath,
    vnode: generateVNodeRepresentation(node, currentPath)
  });

  // Add key to source for next transpilation
  const keyAttr = t.jsxAttribute(
    t.jsxIdentifier('key'),
    t.stringLiteral(currentPath)
  );
  node.openingElement.attributes.unshift(keyAttr);
}
```

#### B. Deletion Detection

**Signal**: Key exists in previous `.tsx.keys` but not in current source

```javascript
// In pre() hook
pre(file) {
  file.originalCode = file.code;
  file.structuralChanges = [];

  // Read previous .tsx.keys to detect deletions
  const keysFilePath = file.opts.filename + '.keys';
  if (fs.existsSync(keysFilePath)) {
    const previousKeysSource = fs.readFileSync(keysFilePath, 'utf-8');
    file.previousKeys = extractAllKeysFromSource(previousKeysSource);
  } else {
    file.previousKeys = new Set();
  }
}

// In Program.exit
exit(programPath, state) {
  // Step 1: Generate .tsx.keys with current keys
  // (existing logic)

  // Step 2: Collect all current keys
  const currentKeys = new Set();
  programPath.traverse({
    JSXElement(path) {
      const keyAttr = path.node.openingElement.attributes.find(attr =>
        t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
      );
      if (keyAttr && t.isStringLiteral(keyAttr.value)) {
        currentKeys.add(keyAttr.value.value);
      }
    }
  });

  // Step 3: Detect deletions (keys that disappeared)
  for (const prevKey of state.file.previousKeys) {
    if (!currentKeys.has(prevKey)) {
      console.log(`[Hot Reload] 🗑️  Deletion detected at path "${prevKey}"`);
      state.file.structuralChanges.push({
        type: 'delete',
        path: prevKey
      });
    }
  }

  // Step 4: Write structural changes file
  if (state.file.structuralChanges.length > 0) {
    const componentName = getComponentName(/* ... */);
    const changesFilePath = path.join(
      path.dirname(state.file.opts.filename),
      `${componentName}.structural-changes.json`
    );

    fs.writeFileSync(changesFilePath, JSON.stringify({
      componentName,
      timestamp: new Date().toISOString(),
      sourceFile: state.file.opts.filename,
      changes: state.file.structuralChanges
    }, null, 2));

    console.log(`[Hot Reload] ✅ Generated ${state.file.structuralChanges.length} structural changes`);
  }
}
```

#### C. Helper: Extract Keys from Source

```javascript
/**
 * Extract all key attribute values from TSX source code
 *
 * @param {string} sourceCode - TSX source code
 * @returns {Set<string>} - Set of all key values
 */
function extractAllKeysFromSource(sourceCode) {
  const keys = new Set();

  // Match key="value" or key='value' or key={value}
  const keyRegex = /key=(?:"([^"]+)"|'([^']+)'|\{([^}]+)\})/g;
  let match;

  while ((match = keyRegex.exec(sourceCode)) !== null) {
    const keyValue = match[1] || match[2] || match[3];

    // Only include string literal keys (not expressions)
    if (match[1] || match[2]) {
      keys.add(keyValue);
    }
  }

  return keys;
}
```

#### D. Helper: Generate VNode Representation

```javascript
/**
 * Convert a Babel JSX AST node to VNode JSON representation
 *
 * @param {Object} node - Babel JSX element node
 * @param {string} path - Hex path for this node
 * @returns {Object} - VNode representation for C#
 */
function generateVNodeRepresentation(node, path) {
  const tagName = node.openingElement.name.name;
  const attributes = {};

  // Extract attributes
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const attrName = attr.name.name;

      if (attrName === 'key') continue; // Skip key attribute

      if (t.isStringLiteral(attr.value)) {
        attributes[attrName] = attr.value.value;
      } else if (t.isJSXExpressionContainer(attr.value)) {
        // For expressions, just mark as dynamic
        attributes[attrName] = '__DYNAMIC__';
      }
    }
  }

  // Extract children (simplified - only static content)
  const children = [];
  for (const child of node.children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        children.push({
          type: 'text',
          path: `${path}.${children.length + 1}`,
          value: text
        });
      }
    } else if (t.isJSXElement(child)) {
      // Nested element (would need recursive call in full implementation)
      children.push({
        type: 'element',
        path: child.__minimactPath,
        tag: child.openingElement.name.name
      });
    }
  }

  return {
    type: 'element',
    tag: tagName,
    path: path,
    attributes: attributes,
    children: children
  };
}
```

### Phase 2: File Output

#### Structural Changes JSON Format

**File**: `ComponentName.structural-changes.json`

```json
{
  "componentName": "TodoList",
  "timestamp": "2025-01-08T14:32:15.123Z",
  "sourceFile": "J:\\projects\\myapp\\src\\TodoList.tsx",
  "changes": [
    {
      "type": "insert",
      "path": "1.18",
      "vnode": {
        "type": "element",
        "tag": "span",
        "path": "1.18",
        "attributes": {
          "className": "new-item"
        },
        "children": [
          {
            "type": "text",
            "path": "1.18.1",
            "value": "New todo item"
          }
        ]
      }
    },
    {
      "type": "delete",
      "path": "1.3"
    }
  ]
}
```

### Phase 3: C# Integration

#### A. VNode Tree Manipulation

**File**: `VNode.cs`

```csharp
namespace Minimact.AspNetCore.Rendering;

public abstract class VNode
{
    public string Path { get; set; }

    /// <summary>
    /// Insert a VNode at the specified path in the tree
    /// </summary>
    public void InsertAtPath(string targetPath, VNode newNode)
    {
        if (this is not VElement element)
        {
            throw new InvalidOperationException("Can only insert into VElement nodes");
        }

        // Find insertion point
        var pathSegments = targetPath.Split('.');
        var parentPath = string.Join(".", pathSegments.Take(pathSegments.Length - 1));

        if (this.Path == parentPath)
        {
            // Insert as direct child
            var children = element.Children.ToList();

            // Find correct position (lexicographic sort)
            int insertIndex = children.FindIndex(c =>
                string.Compare(c.Path, targetPath, StringComparison.Ordinal) > 0
            );

            if (insertIndex == -1)
            {
                children.Add(newNode);
            }
            else
            {
                children.Insert(insertIndex, newNode);
            }

            element.Children = children.ToArray();
            Console.WriteLine($"[Hot Reload] ✅ Inserted VNode at path {targetPath}");
        }
        else
        {
            // Recursively find parent
            foreach (var child in element.Children)
            {
                if (targetPath.StartsWith(child.Path + "."))
                {
                    child.InsertAtPath(targetPath, newNode);
                    return;
                }
            }

            throw new InvalidOperationException($"Parent path {parentPath} not found");
        }
    }

    /// <summary>
    /// Delete the VNode at the specified path
    /// </summary>
    public bool DeleteAtPath(string targetPath)
    {
        if (this is not VElement element)
        {
            return false;
        }

        // Check if target is a direct child
        var childIndex = Array.FindIndex(element.Children, c => c.Path == targetPath);
        if (childIndex != -1)
        {
            var children = element.Children.ToList();
            children.RemoveAt(childIndex);
            element.Children = children.ToArray();
            Console.WriteLine($"[Hot Reload] ✅ Deleted VNode at path {targetPath}");
            return true;
        }

        // Recursively search children
        foreach (var child in element.Children)
        {
            if (targetPath.StartsWith(child.Path + "."))
            {
                return child.DeleteAtPath(targetPath);
            }
        }

        return false;
    }

    /// <summary>
    /// Find a VNode by path
    /// </summary>
    public VNode? FindByPath(string targetPath)
    {
        if (this.Path == targetPath)
        {
            return this;
        }

        if (this is VElement element)
        {
            foreach (var child in element.Children)
            {
                if (targetPath.StartsWith(child.Path + ".") || child.Path == targetPath)
                {
                    var result = child.FindByPath(targetPath);
                    if (result != null) return result;
                }
            }
        }

        return null;
    }
}
```

#### B. Structural Changes Deserializer

**File**: `StructuralChanges.cs`

```csharp
namespace Minimact.AspNetCore.HotReload;

public class StructuralChanges
{
    public string ComponentName { get; set; }
    public DateTime Timestamp { get; set; }
    public string SourceFile { get; set; }
    public List<StructuralChange> Changes { get; set; } = new();
}

public class StructuralChange
{
    public string Type { get; set; } // "insert" or "delete"
    public string Path { get; set; }
    public VNodeRepresentation? VNode { get; set; } // Only for insertions
}

public class VNodeRepresentation
{
    public string Type { get; set; } // "element" or "text"
    public string Tag { get; set; }
    public string Path { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<VNodeRepresentation> Children { get; set; } = new();
    public string? Value { get; set; } // For text nodes

    /// <summary>
    /// Convert to actual VNode instance
    /// </summary>
    public VNode ToVNode()
    {
        if (Type == "text")
        {
            return new VText(Value ?? "", Path);
        }
        else if (Type == "element")
        {
            var children = Children.Select(c => c.ToVNode()).ToArray();

            // Convert attributes to C# format
            var attrs = new Dictionary<string, string>();
            foreach (var (key, value) in Attributes)
            {
                attrs[key] = value;
            }

            return new VElement(Tag, Path, attrs, children);
        }

        throw new InvalidOperationException($"Unknown VNode type: {Type}");
    }
}
```

#### C. Hot Reload Manager

**File**: `HotReloadManager.cs`

```csharp
namespace Minimact.AspNetCore.HotReload;

public class HotReloadManager
{
    private readonly ComponentRegistry _registry;
    private readonly ILogger<HotReloadManager> _logger;

    public HotReloadManager(ComponentRegistry registry, ILogger<HotReloadManager> logger)
    {
        _registry = registry;
        _logger = logger;
    }

    /// <summary>
    /// Apply structural changes from JSON file
    /// </summary>
    public async Task ApplyStructuralChangesAsync(string jsonFilePath)
    {
        _logger.LogInformation("[Hot Reload] 🔥 Processing structural changes from {File}", jsonFilePath);

        var json = await File.ReadAllTextAsync(jsonFilePath);
        var changes = JsonSerializer.Deserialize<StructuralChanges>(json);

        if (changes == null || changes.Changes.Count == 0)
        {
            return;
        }

        // Find component instance
        var component = _registry.GetComponentsByType(changes.ComponentName).FirstOrDefault();
        if (component == null)
        {
            _logger.LogWarning("[Hot Reload] Component {Name} not found in registry", changes.ComponentName);
            return;
        }

        var currentVNode = component.CurrentVNode;
        if (currentVNode == null)
        {
            _logger.LogWarning("[Hot Reload] Component {Name} has no current VNode", changes.ComponentName);
            return;
        }

        // Apply each change
        foreach (var change in changes.Changes)
        {
            try
            {
                if (change.Type == "insert")
                {
                    var newVNode = change.VNode!.ToVNode();
                    currentVNode.InsertAtPath(change.Path, newVNode);
                    _logger.LogInformation("[Hot Reload] ✅ Inserted node at path {Path}", change.Path);
                }
                else if (change.Type == "delete")
                {
                    var deleted = currentVNode.DeleteAtPath(change.Path);
                    if (deleted)
                    {
                        _logger.LogInformation("[Hot Reload] ✅ Deleted node at path {Path}", change.Path);
                    }
                    else
                    {
                        _logger.LogWarning("[Hot Reload] ⚠️  Node not found at path {Path}", change.Path);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Hot Reload] ❌ Failed to apply change {Type} at {Path}", change.Type, change.Path);
            }
        }

        // Generate patches from updated VNode tree and send to client
        var patches = GeneratePatches(currentVNode);
        await component.SendPatchesToClient(patches);

        _logger.LogInformation("[Hot Reload] ✅ Applied {Count} structural changes to {Component}",
            changes.Changes.Count, changes.ComponentName);
    }

    private List<Patch> GeneratePatches(VNode vnode)
    {
        // Convert VNode tree to DOM patches
        // (Implementation depends on existing patch generation logic)
        throw new NotImplementedException();
    }
}
```

#### D. File Watcher Integration

**File**: `HotReloadFileWatcher.cs`

```csharp
// Add to existing file watcher

private void OnStructuralChangesFileChanged(string filePath)
{
    _logger.LogInformation("[Hot Reload] 📝 Structural changes file changed: {File}", filePath);

    // Debounce to avoid multiple rapid changes
    Task.Delay(100).ContinueWith(async _ =>
    {
        await _hotReloadManager.ApplyStructuralChangesAsync(filePath);
    });
}

// Register watcher for *.structural-changes.json files
_watcher.Filter = "*.structural-changes.json";
```

## Benefits

### 1. **Surgical Updates**
- Only changed nodes are updated
- No full tree reconciliation
- Existing components keep their state

### 2. **Fast Detection**
- Insertions: O(1) - just check if key exists
- Deletions: O(n) - compare two sets
- No expensive tree diffing

### 3. **Stable Identities**
- Keys don't change across edits
- Half-gap insertion prevents renumbering
- Lexicographic ordering maintains structure

### 4. **Developer Experience**
- Automatic key generation
- No manual key management
- Keys appear in source after transpilation
- Visual feedback of structure

## Edge Cases

### Case 1: Multiple Rapid Changes

**Problem**: User adds then immediately moves an element

**Solution**: Debounce file watcher (100ms) to batch changes

### Case 2: Key Collision

**Problem**: Half-gap generates a key that already exists

**Solution**: Recursive half-gap until unique key is found

```javascript
function generateUniqueHalfGap(prevKey, nextKey, parentPath, existingKeys) {
  let candidateKey = generateHalfGap(prevKey, nextKey, parentPath);

  // If collision, recursively split the gap
  while (existingKeys.has(candidateKey)) {
    candidateKey = generateHalfGap(prevKey, candidateKey, parentPath);
  }

  return candidateKey;
}
```

### Case 3: Element Moved Between Parents

**Problem**: Element changes parent (cut/paste)

**Solution**: Detected as delete + insert at new location

```json
{
  "changes": [
    { "type": "delete", "path": "1.2.3" },
    { "type": "insert", "path": "2.1.5", "vnode": {...} }
  ]
}
```

### Case 4: First Transpilation (No Previous Keys)

**Problem**: No `.tsx.keys` file exists yet

**Solution**: Skip deletion detection, only track insertions

```javascript
if (state.file.previousKeys.size === 0) {
  // First transpilation - all elements are "insertions" but don't track them
  // Only track true insertions (elements without keys) going forward
}
```

## Testing Strategy

### Unit Tests

1. **Insertion Detection**:
   - Element without key → Detected
   - Element with key → Not detected

2. **Deletion Detection**:
   - Key in previous but not current → Detected
   - Key in both → Not detected

3. **Half-Gap Generation**:
   - Between "1.1" and "1.2" → "1.18"
   - Between "1" and "2" → "18"
   - Between "a" and "b" → "a8"

4. **VNode Insertion**:
   - Insert at correct lexicographic position
   - Maintain sorted order

5. **VNode Deletion**:
   - Remove correct node
   - Preserve siblings

### Integration Tests

1. **End-to-End Hot Reload**:
   - Add element in Swig
   - Babel detects insertion
   - C# applies change
   - Client receives patches
   - DOM updates without full reload

2. **Multiple Changes**:
   - Add + delete in same edit
   - Both changes applied correctly

3. **Complex Structures**:
   - Nested elements
   - Conditionals
   - Loops

## Performance Metrics

### Expected Performance

- **Insertion Detection**: < 1ms per element (AST traversal)
- **Deletion Detection**: < 5ms (Set comparison)
- **VNode Manipulation**: < 1ms per change
- **Total Hot Reload**: < 20ms (Babel → C# → Client)

### Comparison to Full Reconciliation

| Operation | Full Reconciliation | Structural Changes |
|-----------|-------------------|-------------------|
| Small change (1 element) | 50-100ms | 5-20ms |
| Medium change (5 elements) | 100-200ms | 10-30ms |
| Large tree (100+ nodes) | 200-500ms | 15-40ms |

**Improvement**: ~5-10x faster for typical changes

## Implementation Checklist

### Babel Plugin

- [ ] Add `structuralChanges` array to `state.file`
- [ ] Track insertions during `assignPathsToJSX()`
- [ ] Read previous `.tsx.keys` in `pre()` hook
- [ ] Extract keys from previous source
- [ ] Compare previous vs current keys in `Program.exit`
- [ ] Generate VNode representations for insertions
- [ ] Write `.structural-changes.json` file
- [ ] Add logging for insertion/deletion detection

### C# Core

- [ ] Add `InsertAtPath()` to `VNode`
- [ ] Add `DeleteAtPath()` to `VNode`
- [ ] Add `FindByPath()` to `VNode`
- [ ] Create `StructuralChanges.cs` models
- [ ] Create `HotReloadManager.cs`
- [ ] Add file watcher for `*.structural-changes.json`
- [ ] Integrate with existing patch generation
- [ ] Add logging for hot reload operations

### Testing

- [ ] Unit tests for insertion detection
- [ ] Unit tests for deletion detection
- [ ] Unit tests for VNode manipulation
- [ ] Integration test: Add element
- [ ] Integration test: Delete element
- [ ] Integration test: Move element
- [ ] Integration test: Nested changes
- [ ] Performance benchmarks

### Documentation

- [x] This enhancement plan
- [ ] Update `TSX_KEYS_GENERATION.md`
- [ ] Add hot reload examples
- [ ] Update Swig integration docs

## Future Enhancements

### 1. Attribute Change Detection

Track which attributes changed on existing nodes (not structural):

```json
{
  "type": "attribute-change",
  "path": "1.2",
  "attribute": "className",
  "oldValue": "btn",
  "newValue": "btn btn-primary"
}
```

### 2. Text Content Changes

Track text content changes:

```json
{
  "type": "text-change",
  "path": "1.2.1",
  "oldValue": "Click me",
  "newValue": "Submit"
}
```

### 3. Batch Change Optimization

Group related changes:

```json
{
  "type": "batch",
  "parentPath": "1.2",
  "changes": [...]
}
```

### 4. Rollback Support

Keep history for undo:

```json
{
  "version": 2,
  "previousVersion": 1,
  "changes": [...],
  "rollback": [...]
}
```

## References

- [Hex Path Generator](../src/babel-plugin-minimact/src/utils/hexPath.cjs)
- [Path Assignment](../src/babel-plugin-minimact/src/utils/pathAssignment.cjs)
- [TSX Keys Generation](./TSX_KEYS_GENERATION.md)
- [VNode System](../src/Minimact.AspNetCore/Rendering/VNode.cs)
