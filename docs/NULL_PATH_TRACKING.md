# Null Path Tracking System

**Date**: 2025-01-05
**Status**: ✅ Implemented
**Purpose**: Enable hot reload to work with conditionally rendered elements

---

## Problem Statement

Minimact uses hex-based paths to locate DOM elements for hot reload updates. However, when elements are conditionally rendered (e.g., `{isVisible && <Modal />}`), the VNode tree contains paths that don't exist in the DOM. This caused hot reload to fail because:

1. **VNode has 11 hex codes at depth 1** (all possible children)
2. **DOM only has 8 children** (3 are conditionally hidden)
3. **Client can't map hex paths to DOM indices** without knowing which paths are null

### Example Problem

```tsx
<div>
  <span>Always visible</span>           {/* 10000000 - renders */}
  {false && <Modal />}                  {/* 20000000 - NULL */}
  <button>Click me</button>             {/* 30000000 - renders */}
  {isAdmin && <AdminPanel />}           {/* 40000000 - NULL */}
  <footer>Footer</footer>               {/* 50000000 - renders */}
</div>
```

**Without null tracking:**
- Hex codes: `['10000000', '20000000', '30000000', '40000000', '50000000']`
- DOM children: 3 (span, button, footer)
- Client tries to find `30000000` at index 2 → **WRONG!** It's at index 1

**With null tracking:**
- Null paths: `['20000000', '40000000']`
- Client skips nulls: `10000000` → DOM[0], `30000000` → DOM[1], `50000000` → DOM[2] ✅

---

## Solution: `.null` Suffix Convention

We use a simple convention: **append `.null` to hex paths that don't render**.

### Example

```json
{
  "templates": {
    "10000000": { "template": "...", "path": ["10000000"] },
    "20000000.null": { "template": "", "path": [], "type": "null" },
    "30000000": { "template": "...", "path": ["30000000"] },
    "40000000.null": { "template": "", "path": [], "type": "null" },
    "50000000": { "template": "...", "path": ["50000000"] }
  }
}
```

**Advantages:**
- ✅ No new protocol fields needed
- ✅ Easy to parse (just check if path ends with `.null`)
- ✅ Self-documenting
- ✅ Works with existing template map structure

---

## Implementation

### Server-Side (C#)

**File**: `src/Minimact.AspNetCore/HotReload/TemplateHotReloadManager.cs`

#### 1. Augment Template Map with Null Paths

```csharp
private TemplateMap AugmentTemplateMapWithNullPaths(string componentId, TemplateMap templateMap)
{
    var component = _registry.GetComponent(componentId);
    if (component?.CurrentVNode == null)
    {
        return templateMap; // No VNode available, return original
    }

    // Extract null paths from VNode tree
    var nullPaths = ExtractNullPaths(component.CurrentVNode);

    if (nullPaths.Count == 0)
    {
        return templateMap; // No null paths, return original
    }

    // Create augmented template map with null path entries
    var augmentedTemplates = new Dictionary<string, Template>(templateMap.Templates);

    foreach (var nullPath in nullPaths)
    {
        // Add empty template with .null suffix
        augmentedTemplates[nullPath] = new Template
        {
            TemplateString = "",
            Bindings = new List<string>(),
            Slots = new List<int>(),
            Path = new List<string>(), // Empty path for null nodes
            Type = "null"
        };
    }

    _logger.LogDebug("[Minimact Templates] Added {Count} null path entries for {ComponentId}",
        nullPaths.Count, componentId);

    return new TemplateMap
    {
        Component = templateMap.Component,
        Version = templateMap.Version,
        GeneratedAt = templateMap.GeneratedAt,
        Templates = augmentedTemplates
    };
}
```

#### 2. Extract Null Paths from VNode Tree

```csharp
private List<string> ExtractNullPaths(VNode rootVNode)
{
    var nullPaths = new List<string>();
    ExtractNullPathsRecursive(rootVNode, new List<int>(), nullPaths);
    return nullPaths;
}

private void ExtractNullPathsRecursive(VNode node, List<int> currentPath, List<string> nullPaths)
{
    List<VNode>? children = node switch
    {
        VElement element => element.Children,
        Fragment fragment => fragment.Children,
        _ => null
    };

    if (children == null) return;

    for (int i = 0; i < children.Count; i++)
    {
        var child = children[i];

        if (child == null)
        {
            // Generate hex path for this null child
            var pathWithNull = new List<int>(currentPath) { i };
            var hexPath = ConvertPathToHex(pathWithNull);
            nullPaths.Add($"{hexPath}.null");
        }
        else
        {
            // Recurse into non-null children
            var childPath = new List<int>(currentPath) { i };
            ExtractNullPathsRecursive(child, childPath, nullPaths);
        }
    }
}

private string ConvertPathToHex(List<int> path)
{
    if (path.Count == 0) return string.Empty;

    var hexSegments = new List<string>();
    foreach (var index in path)
    {
        // Convert index to hex: (index + 1) * 0x10000000
        uint hexValue = (uint)(index + 1) * 0x10000000;
        hexSegments.Add(hexValue.ToString("x8"));
    }

    return string.Join(".", hexSegments);
}
```

#### 3. Hook into Template Map Sending

```csharp
private async Task SendTemplateMapToClientAsync(string connectionId, string componentId, TemplateMap templateMap)
{
    if (string.IsNullOrEmpty(connectionId) || templateMap == null)
    {
        return;
    }

    // Augment template map with null path entries
    var augmentedTemplateMap = AugmentTemplateMapWithNullPaths(componentId, templateMap);

    try
    {
        await _hubContext.Clients.Client(connectionId).SendAsync("HotReload:TemplateMap", new
        {
            type = "template-map",
            componentId,
            templateMap = augmentedTemplateMap, // Send augmented map
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "[Minimact Templates] Failed to send template map to client");
    }
}
```

---

### Client-Side (TypeScript)

**File**: `src/client-runtime/src/template-state.ts`

#### 1. Track Null Paths During Template Load

```typescript
export class TemplateStateManager {
  private templates: Map<string, Template> = new Map();
  private componentStates: Map<string, Map<string, any>> = new Map();
  private hexPathIndex: Map<string, Map<number, string[]>> = new Map();
  // Null paths: componentId -> Set of paths that are currently null
  private nullPaths: Map<string, Set<string>> = new Map();

  loadTemplateMap(componentId: string, templateMap: TemplateMap): void {
    console.log(`[TemplateState] Loading ${Object.keys(templateMap.templates).length} templates for ${componentId}`);

    const depthMap = new Map<number, Set<string>>();
    const nullPaths = new Set<string>(); // Track null paths

    for (const [nodePath, template] of Object.entries(templateMap.templates)) {
      const key = `${componentId}:${nodePath}`;

      // Normalize template
      const normalized: Template = {
        template: (template as any).templateString || (template as any).template,
        bindings: template.bindings,
        slots: template.slots,
        path: template.path,
        type: template.type
      };

      this.templates.set(key, normalized);

      // Extract hex path segments and build depth index
      const pathSegments = nodePath.split('.');

      // Check if this path ends with '.null' (path didn't render)
      const isNullPath = pathSegments[pathSegments.length - 1] === 'null';

      if (isNullPath) {
        // Remove '.null' suffix and store as null path
        const actualPath = pathSegments.slice(0, -1).join('.');
        nullPaths.add(actualPath);
        console.log(`[TemplateState] Null path detected: ${actualPath}`);
        continue; // Don't add null paths to depth map
      }

      for (let depth = 0; depth < pathSegments.length; depth++) {
        const segment = pathSegments[depth];
        // Skip attribute markers (@style, @className, etc.)
        if (segment.startsWith('@')) continue;

        if (!depthMap.has(depth)) {
          depthMap.set(depth, new Set());
        }
        depthMap.get(depth)!.add(segment);
      }
    }

    // Store null paths for this component
    this.nullPaths.set(componentId, nullPaths);

    // Convert sets to sorted arrays
    const sortedDepthMap = new Map<number, string[]>();
    for (const [depth, hexSet] of depthMap.entries()) {
      sortedDepthMap.set(depth, Array.from(hexSet).sort());
    }

    this.hexPathIndex.set(componentId, sortedDepthMap);
    console.log(`[TemplateState] Built hex path index for ${componentId}:`, sortedDepthMap);
  }

  /**
   * Check if a path is currently null (not rendered)
   */
  isPathNull(componentId: string, path: string): boolean {
    return this.nullPaths.get(componentId)?.has(path) ?? false;
  }
}
```

#### 2. Use Null Path Map in DOM Navigation

**File**: `src/client-runtime/src/hot-reload.ts`

```typescript
private findElementByPath(root: HTMLElement, path: string, componentType: string): Node | null {
  if (path === '' || path === '.') {
    return root;
  }

  // Check if path ends with attribute marker (e.g., "10000000.20000000.@style")
  const segments = path.split('.');
  const lastSegment = segments[segments.length - 1];
  const isAttributePath = lastSegment?.startsWith('@');

  // If attribute path, remove the @attribute segment and find the element
  const hexSegments = isAttributePath ? segments.slice(0, -1) : segments;

  let current: Node | null = root;

  // Navigate through each depth using lexicographic ordering from template index
  for (let depth = 0; depth < hexSegments.length; depth++) {
    const targetHex = hexSegments[depth];
    if (!current || !current.childNodes) return null;

    // Get sorted hex codes from template index
    const sortedHexCodes = templateState.getHexCodesAtDepth(componentType, depth);

    if (!sortedHexCodes) {
      console.warn(`[HotReload] No hex codes found at depth ${depth} for ${componentType}`);
      return null;
    }

    // Map VNode hex codes to actual DOM children, skipping nulls
    // Use the null path map to know which hex codes didn't render

    let domChildIndex = 0; // Actual DOM child we're at

    for (const hexCode of sortedHexCodes) {
      // Check if this hex code is null (didn't render)
      const fullPathSoFar = hexSegments.slice(0, depth).join('.') + (depth > 0 ? '.' : '') + hexCode;

      if (templateState.isPathNull(componentType, fullPathSoFar)) {
        // This path is null, skip it (don't consume a DOM child)
        if (hexCode === targetHex) {
          console.warn(`[HotReload] Target path "${fullPathSoFar}" is currently null (not rendered)`);
          return null;
        }
        continue;
      }

      // This hex code has a corresponding DOM child
      if (hexCode === targetHex) {
        // Found our target!
        current = current.childNodes[domChildIndex] || null;
        break;
      }

      domChildIndex++;
    }

    if (!current || domChildIndex >= current.childNodes.length) {
      console.warn(`[HotReload] Element "${targetHex}" not found in DOM at depth ${depth}`);
      return null;
    }
  }

  return current;
}
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Server: Component Renders                                    │
│                                                               │
│ VNode Tree:                                                  │
│   div [0]                                                    │
│     ├─ span [0]      ✅ renders                             │
│     ├─ null [1]      ❌ conditional false                    │
│     ├─ button [2]    ✅ renders                             │
│     ├─ null [3]      ❌ conditional false                    │
│     └─ footer [4]    ✅ renders                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Server: Extract Null Paths                                   │
│                                                               │
│ ExtractNullPathsRecursive() walks VNode tree                │
│ Finds: children[1] = null → adds "20000000.null"           │
│        children[3] = null → adds "40000000.null"           │
│                                                               │
│ Result: ["20000000.null", "40000000.null"]                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Server: Augment Template Map                                 │
│                                                               │
│ {                                                             │
│   "10000000": { template: "...", type: "static" },          │
│   "20000000.null": { template: "", type: "null" },   ← NEW  │
│   "30000000": { template: "...", type: "static" },          │
│   "40000000.null": { template: "", type: "null" },   ← NEW  │
│   "50000000": { template: "...", type: "static" }           │
│ }                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Client: Load Template Map                                    │
│                                                               │
│ loadTemplateMap() processes each template:                  │
│   - "10000000" → add to depth map                           │
│   - "20000000.null" → add to nullPaths set, skip depth map  │
│   - "30000000" → add to depth map                           │
│   - "40000000.null" → add to nullPaths set, skip depth map  │
│   - "50000000" → add to depth map                           │
│                                                               │
│ Results:                                                      │
│   depthMap[0] = ["10000000", "30000000", "50000000"]        │
│   nullPaths = Set(["20000000", "40000000"])                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Client: Hot Reload Patch Arrives                             │
│                                                               │
│ Patch: { path: "30000000.@className", ... }                 │
│                                                               │
│ findElementByPath():                                         │
│   sortedHexCodes = ["10000000", "30000000", "50000000"]     │
│   domChildIndex = 0                                          │
│                                                               │
│   for hexCode in sortedHexCodes:                             │
│     - "10000000": not null, not target → domChildIndex++    │
│     - "30000000": not null, IS target → use DOM[1] ✅       │
│                                                               │
│ Result: Finds button element at DOM[1], applies patch!       │
└─────────────────────────────────────────────────────────────┘
```

---

## Example: Before vs After

### Before (Broken)

```typescript
// VNode hex codes at depth 1
sortedHexCodes = ['10000000', '20000000', '30000000', '40000000', '50000000']

// Looking for 30000000 (button)
sortedIndex = 2
domChildIndex = 2

// DOM children
DOM[0] = span
DOM[1] = button  ← should be here!
DOM[2] = footer

// Bug: Tries to access DOM[2] (footer) instead of DOM[1] (button) ❌
```

### After (Fixed)

```typescript
// VNode hex codes at depth 1 (nulls removed from depth map)
sortedHexCodes = ['10000000', '30000000', '50000000']

// Null paths
nullPaths = Set(['20000000', '40000000'])

// Looking for 30000000 (button)
domChildIndex = 0
for hexCode in sortedHexCodes:
  - '10000000': isPathNull? no, target? no → domChildIndex = 1
  - '30000000': isPathNull? no, target? YES → use DOM[1] ✅

// DOM children
DOM[0] = span
DOM[1] = button  ← found correctly!
DOM[2] = footer

// Success: Accesses DOM[1] (button) correctly ✅
```

---

## Testing

### Test Cases

1. **No null paths**: All elements render → should work as before
2. **Single null path**: One conditional is false → skips correctly
3. **Multiple null paths**: Several conditionals are false → skips all correctly
4. **Null at start**: First child is null → starts at DOM[0] correctly
5. **Null at end**: Last child is null → doesn't overflow
6. **Nested nulls**: Null paths at multiple depths → handles recursively

### Manual Testing

1. Build server: `cd src/Minimact.AspNetCore && dotnet build`
2. Build client: `cd src/client-runtime && npm run build && cp dist/core.js /path/to/MyMvcApp/wwwroot/js/minimact.js`
3. Run MyMvcApp
4. Refresh browser (Ctrl+Shift+R)
5. Check console for `[TemplateState] Null path detected: ...`
6. Edit a TSX file that has conditionals
7. Verify hot reload works correctly

---

## Benefits

✅ **Hot reload works with conditionals** - No more failed patches for conditionally rendered elements
✅ **Zero DOM decoration** - No need to add data attributes to DOM elements
✅ **Minimal protocol changes** - Just append `.null` to existing path strings
✅ **Server controls truth** - Server tells client which paths are null based on current render
✅ **Dynamic updates** - Null paths can change between renders (conditional state changes)
✅ **Simple implementation** - ~150 lines of code total

---

## Future Improvements

1. **Incremental null path updates**: Instead of sending entire template map, send only null path changes
2. **Null path caching**: Cache null paths on client to reduce repeated lookups
3. **Null path debugging**: Add dev tools panel showing which paths are currently null
4. **Null path statistics**: Track how many null paths exist per component for optimization insights

---

## Related Files

- `src/Minimact.AspNetCore/HotReload/TemplateHotReloadManager.cs` - Server-side null path extraction
- `src/Minimact.AspNetCore/HotReload/TemplateTypes.cs` - Template data structures
- `src/client-runtime/src/template-state.ts` - Client-side null path tracking
- `src/client-runtime/src/hot-reload.ts` - DOM navigation with null path skipping
- `docs/TEMPLATE_PATCH_SYSTEM.md` - Overall template-based hot reload architecture
