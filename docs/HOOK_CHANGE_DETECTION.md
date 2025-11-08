# Hook Change Detection for Structural Hot Reload

## Overview

This document describes how to detect **hook additions/removals** (useState, useEffect, useRef, etc.) as structural changes in the Babel transpiler. Currently, only JSX element changes trigger structural hot reload, but hook changes are equally critical because they modify the C# class structure.

## The Problem

### Current State: Only JSX Changes Detected

**What's Currently Tracked:**
```tsx
// BEFORE
<div>
  <h1>Hello</h1>
</div>

// AFTER (added <p>)
<div>
  <h1>Hello</h1>
  <p>World</p>  {/* ✅ DETECTED: JSX insertion */}
</div>
```

**What's NOT Tracked:**
```tsx
// BEFORE
const [count, setCount] = useState(0);

// AFTER (added useState)
const [count, setCount] = useState(0);
const [message, setMessage] = useState("Hello");  {/* ❌ NOT DETECTED! */}
```

### Why This is a Problem

When you add `useState`:

1. **Babel extracts the hook** → Generates C# `[State] private string message = "Hello";`
2. **C# compiles** → New type has new field
3. **Server has old instance** → No `message` field exists!
4. **Component tries to render** → Accesses `message` field → **CRASH!**

**The root cause**: Adding/removing hooks is a **structural change** (modifies C# class fields), but Babel doesn't detect it as such, so no `.structural-changes.json` is generated.

---

## The Solution: Hook Change Detection

### Core Principle

**ANY change to the hook signature is a structural change**:
- ✅ `useState` added → New `[State]` field
- ✅ `useState` removed → Deleted `[State]` field
- ✅ `useEffect` added → New effect registration
- ✅ `useRef` added → New `ref` field
- ✅ Hook reordering → Index changes (C# field names change)

**Binary decision**: Hook signature changed → Structural change detected → Instance replacement triggered

---

## Architecture

### Phase 1: Hook Signature Extraction

Extract a **hook signature** from the TSX source during transpilation:

```typescript
// Example component
function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Hello");
  useEffect(() => { /* ... */ }, [count]);
  const btnRef = useRef(null);

  return <div>...</div>;
}
```

**Hook Signature (JSON):**
```json
{
  "hooks": [
    { "type": "useState", "varName": "count", "index": 0 },
    { "type": "useState", "varName": "message", "index": 1 },
    { "type": "useEffect", "depsCount": 1, "index": 2 },
    { "type": "useRef", "varName": "btnRef", "index": 3 }
  ]
}
```

**Write to file**: `Counter.hooks.json`

---

### Phase 2: Hook Signature Comparison

On subsequent transpilations:

1. **Read previous signature** from `Counter.hooks.json`
2. **Extract current signature** from TSX source
3. **Compare signatures** (array comparison)
4. **Detect changes**:
   - Hook count changed
   - Hook type changed at same index
   - Hook variable name changed (for useState/useRef)
   - Hook order changed

---

### Phase 3: Generate Structural Change

If signatures differ → Add to `structuralChanges` array:

```json
{
  "componentName": "Counter",
  "timestamp": "2025-01-08T15:30:00.000Z",
  "sourceFile": "Counter.tsx",
  "changes": [
    {
      "type": "hook-added",
      "hookType": "useState",
      "varName": "message",
      "index": 1
    }
  ]
}
```

**Write to file**: `Counter.structural-changes.json`

---

## Implementation

### Step 1: Hook Signature Extractor

**File**: `src/babel-plugin-minimact/src/extractors/hookSignature.cjs`

```javascript
/**
 * Extract hook signature from component
 *
 * Returns array of hook metadata for structural change detection
 */
function extractHookSignature(component) {
  const hooks = [];

  // Iterate through hooks in order
  let index = 0;

  // Extract useState/useClientState
  for (const [varName, stateInfo] of component.state.entries()) {
    hooks.push({
      type: stateInfo.hookType || 'useState', // 'useState' or 'useClientState'
      varName: varName,
      index: index++
    });
  }

  // Extract useEffect
  for (const effect of component.effects) {
    hooks.push({
      type: 'useEffect',
      depsCount: effect.dependencies ? effect.dependencies.length : -1, // -1 = no deps array
      index: index++
    });
  }

  // Extract useRef
  for (const [varName, refInfo] of component.refs.entries()) {
    hooks.push({
      type: 'useRef',
      varName: varName,
      index: index++
    });
  }

  // Extract other hooks (useServerTask, usePredictHint, etc.)
  if (component.serverTasks) {
    for (const task of component.serverTasks) {
      hooks.push({
        type: 'useServerTask',
        taskId: task.taskId,
        index: index++
      });
    }
  }

  if (component.predictHints) {
    for (const hint of component.predictHints) {
      hooks.push({
        type: 'usePredictHint',
        hintId: hint.hintId,
        index: index++
      });
    }
  }

  // Add more hook types as needed...

  return hooks;
}

/**
 * Write hook signature to file
 */
function writeHookSignature(componentName, hooks, inputFilePath) {
  const fs = require('fs');
  const nodePath = require('path');

  const signature = {
    componentName: componentName,
    timestamp: new Date().toISOString(),
    hooks: hooks
  };

  const outputDir = nodePath.dirname(inputFilePath);
  const signatureFilePath = nodePath.join(outputDir, `${componentName}.hooks.json`);

  try {
    fs.writeFileSync(signatureFilePath, JSON.stringify(signature, null, 2));
    console.log(`[Hook Signature] ✅ Wrote ${signatureFilePath} with ${hooks.length} hooks`);
  } catch (error) {
    console.error(`[Hook Signature] Failed to write ${signatureFilePath}:`, error);
  }
}

/**
 * Read previous hook signature from file
 */
function readPreviousHookSignature(componentName, inputFilePath) {
  const fs = require('fs');
  const nodePath = require('path');

  const outputDir = nodePath.dirname(inputFilePath);
  const signatureFilePath = nodePath.join(outputDir, `${componentName}.hooks.json`);

  if (!fs.existsSync(signatureFilePath)) {
    return null; // First transpilation
  }

  try {
    const json = fs.readFileSync(signatureFilePath, 'utf-8');
    const signature = JSON.parse(json);
    console.log(`[Hook Signature] Read ${signatureFilePath} with ${signature.hooks.length} hooks`);
    return signature.hooks;
  } catch (error) {
    console.error(`[Hook Signature] Failed to read ${signatureFilePath}:`, error);
    return null;
  }
}

/**
 * Compare two hook signatures and detect changes
 */
function compareHookSignatures(previousHooks, currentHooks) {
  const changes = [];

  // Check if hook count changed
  if (previousHooks.length !== currentHooks.length) {
    console.log(`[Hook Changes] Hook count changed: ${previousHooks.length} → ${currentHooks.length}`);
  }

  // Compare each hook
  const maxLength = Math.max(previousHooks.length, currentHooks.length);

  for (let i = 0; i < maxLength; i++) {
    const prevHook = previousHooks[i];
    const currHook = currentHooks[i];

    if (!prevHook && currHook) {
      // Hook added
      console.log(`[Hook Changes] 🆕 Hook added at index ${i}: ${currHook.type} (${currHook.varName || currHook.taskId || currHook.hintId || ''})`);
      changes.push({
        type: 'hook-added',
        hookType: currHook.type,
        varName: currHook.varName,
        taskId: currHook.taskId,
        hintId: currHook.hintId,
        index: i
      });
    } else if (prevHook && !currHook) {
      // Hook removed
      console.log(`[Hook Changes] 🗑️  Hook removed at index ${i}: ${prevHook.type} (${prevHook.varName || prevHook.taskId || prevHook.hintId || ''})`);
      changes.push({
        type: 'hook-removed',
        hookType: prevHook.type,
        varName: prevHook.varName,
        taskId: prevHook.taskId,
        hintId: prevHook.hintId,
        index: i
      });
    } else if (prevHook && currHook) {
      // Check if hook type changed
      if (prevHook.type !== currHook.type) {
        console.log(`[Hook Changes] 🔄 Hook type changed at index ${i}: ${prevHook.type} → ${currHook.type}`);
        changes.push({
          type: 'hook-type-changed',
          oldHookType: prevHook.type,
          newHookType: currHook.type,
          index: i
        });
      }

      // Check if variable name changed (for useState/useRef)
      if (prevHook.varName !== currHook.varName) {
        console.log(`[Hook Changes] 🔄 Hook variable changed at index ${i}: ${prevHook.varName} → ${currHook.varName}`);
        changes.push({
          type: 'hook-variable-changed',
          hookType: currHook.type,
          oldVarName: prevHook.varName,
          newVarName: currHook.varName,
          index: i
        });
      }

      // Check if deps count changed (for useEffect)
      if (prevHook.depsCount !== undefined &&
          currHook.depsCount !== undefined &&
          prevHook.depsCount !== currHook.depsCount) {
        console.log(`[Hook Changes] 🔄 useEffect deps changed at index ${i}: ${prevHook.depsCount} → ${currHook.depsCount} deps`);
        // Note: Deps count change is NOT a structural change (doesn't affect C# fields)
        // But we log it for visibility
      }
    }
  }

  return changes;
}

module.exports = {
  extractHookSignature,
  writeHookSignature,
  readPreviousHookSignature,
  compareHookSignatures
};
```

---

### Step 2: Integrate into Main Plugin

**File**: `src/babel-plugin-minimact/index.cjs`

**In `Program.exit` hook (after component processing):**

```javascript
Program: {
  exit(path, state) {
    const inputFilePath = state.file.opts.filename;

    for (const component of state.components) {
      // ... existing JSX structural change detection ...

      // NEW: Hook signature comparison
      const {
        extractHookSignature,
        writeHookSignature,
        readPreviousHookSignature,
        compareHookSignatures
      } = require('./src/extractors/hookSignature.cjs');

      // Extract current hook signature
      const currentHooks = extractHookSignature(component);

      // Write current signature to file (for next comparison)
      writeHookSignature(component.name, currentHooks, inputFilePath);

      // Read previous signature
      const previousHooks = readPreviousHookSignature(component.name, inputFilePath);

      // Compare signatures (if previous exists)
      if (previousHooks) {
        const hookChanges = compareHookSignatures(previousHooks, currentHooks);

        // Add hook changes to structural changes array
        if (hookChanges.length > 0) {
          console.log(`[Hook Changes] Detected ${hookChanges.length} hook change(s) in ${component.name}`);

          // Merge with existing structural changes (JSX changes)
          const allChanges = [...component.structuralChanges, ...hookChanges];

          // Write combined structural changes file
          if (allChanges.length > 0) {
            const structuralChangesJSON = {
              componentName: component.name,
              timestamp: new Date().toISOString(),
              sourceFile: inputFilePath,
              changes: allChanges
            };

            const fs = require('fs');
            const nodePath = require('path');
            const outputDir = nodePath.dirname(inputFilePath);
            const changesFilePath = nodePath.join(outputDir, `${component.name}.structural-changes.json`);

            try {
              fs.writeFileSync(changesFilePath, JSON.stringify(structuralChangesJSON, null, 2));
              console.log(`[Hot Reload] ✅ Generated ${changesFilePath} with ${allChanges.length} changes`);
            } catch (error) {
              console.error(`[Hot Reload] Failed to write ${changesFilePath}:`, error);
            }
          }
        }
      } else {
        console.log(`[Hook Signature] No previous signature found for ${component.name} (first transpilation)`);
      }
    }
  }
}
```

---

### Step 3: Update StructuralChanges Model (C#)

**File**: `src/Minimact.AspNetCore/HotReload/StructuralChanges.cs`

```csharp
/// <summary>
/// Individual structural change (insert, delete, or hook change)
/// </summary>
public class StructuralChange
{
    public string Type { get; set; } = ""; // "insert", "delete", "hook-added", "hook-removed", "hook-type-changed"
    public string Path { get; set; } = ""; // For JSX changes
    public VNodeRepresentation? VNode { get; set; } // Only for JSX insertions

    // Hook change properties
    public string? HookType { get; set; } // "useState", "useEffect", etc.
    public string? VarName { get; set; } // Variable name (for useState/useRef)
    public string? TaskId { get; set; } // Task ID (for useServerTask)
    public string? HintId { get; set; } // Hint ID (for usePredictHint)
    public int? Index { get; set; } // Hook index in call order
    public string? OldHookType { get; set; } // For hook-type-changed
    public string? NewHookType { get; set; } // For hook-type-changed
}
```

---

### Step 4: Update StructuralChangeManager (C#)

**File**: `src/Minimact.AspNetCore/HotReload/StructuralChangeManager.cs`

**No changes needed!** The existing logic already works:

```csharp
if (changes == null || changes.Changes.Count == 0)
{
    _logger.LogDebug("[Minimact Structural] No changes in file, skipping");
    return;
}

// Trigger full instance replacement
await ReplaceComponentInstancesAsync(changes.ComponentName);
```

**The beauty**: We don't care WHAT changed (JSX, hooks, both) - just that `changes.Count > 0`.

---

## Benefits

### 1. Complete Coverage

**Before (JSX only):**
- ✅ Add/remove JSX elements → Detected
- ❌ Add/remove hooks → NOT detected

**After (JSX + Hooks):**
- ✅ Add/remove JSX elements → Detected
- ✅ Add/remove hooks → Detected
- ✅ **100% structural coverage!**

### 2. Predictable Behavior

Developers understand: "I changed component structure → hot reload resets instance"

**Structure changes include**:
- JSX elements (visual structure)
- Hooks (state/effect structure)
- Both are structural!

### 3. Safe Instance Replacement

**Without hook detection:**
```tsx
// Add useState
const [message, setMessage] = useState("Hi");

// ❌ Old instance doesn't have message field
// ❌ Component crashes when accessing message
```

**With hook detection:**
```tsx
// Add useState
const [message, setMessage] = useState("Hi");

// ✅ Babel detects hook addition
// ✅ Generates .structural-changes.json
// ✅ StructuralChangeManager replaces instance
// ✅ New instance has message field
// ✅ No crash!
```

---

## Edge Cases

### Case 1: Hook Reordering

```tsx
// BEFORE
const [count, setCount] = useState(0);
const [message, setMessage] = useState("Hi");

// AFTER (reordered)
const [message, setMessage] = useState("Hi");
const [count, setCount] = useState(0);
```

**Detection**:
- Index 0: `count` → `message` (variable changed)
- Index 1: `message` → `count` (variable changed)

**Result**: Structural change detected → Instance replaced

**Why this matters**: C# field names are based on order (`state_0`, `state_1`). Reordering changes which field maps to which state.

---

### Case 2: useEffect Deps Change

```tsx
// BEFORE
useEffect(() => { /* ... */ }, [count]);

// AFTER (added dependency)
useEffect(() => { /* ... */ }, [count, message]);
```

**Detection**: Deps count changed: `1` → `2`

**Result**: Log it, but **NOT a structural change** (doesn't affect C# fields)

**Rationale**: Effect deps don't create C# fields - they just control when the effect runs. Not a structural change.

---

### Case 3: First Transpilation

```tsx
// First time transpiling Counter.tsx
```

**No previous signature exists** → Skip comparison → Write current signature

**Next transpilation**: Compare against this baseline

---

### Case 4: Hook Type Change

```tsx
// BEFORE
const [count, setCount] = useState(0);

// AFTER (changed to useClientState)
const [count, setCount] = useClientState(0);
```

**Detection**: Hook type changed at index 0: `useState` → `useClientState`

**Result**: Structural change detected → Instance replaced

**Why**: Different C# attribute (`[State]` vs `[ClientState]`)

---

## File Structure

After implementing this enhancement, each component will have:

```
Counter.tsx                         // Source file
Counter.tsx.keys                    // JSX keys (for JSX change detection)
Counter.hooks.json                  // Hook signature (for hook change detection)
Counter.structural-changes.json     // Combined structural changes (JSX + hooks)
Counter.cs                          // Generated C# file
Counter.templates.json              // Template patches
```

---

## Implementation Checklist

### Babel Plugin

- [ ] Create `src/extractors/hookSignature.cjs`
- [ ] Implement `extractHookSignature(component)`
- [ ] Implement `writeHookSignature(componentName, hooks, filePath)`
- [ ] Implement `readPreviousHookSignature(componentName, filePath)`
- [ ] Implement `compareHookSignatures(prevHooks, currHooks)`
- [ ] Integrate into `index.cjs` `Program.exit` hook
- [ ] Merge hook changes with JSX changes into single `.structural-changes.json`
- [ ] Test with useState addition
- [ ] Test with useState removal
- [ ] Test with hook reordering
- [ ] Test with mixed JSX + hook changes

### C# Models

- [ ] Update `StructuralChange` class with hook properties
- [ ] Add `HookType`, `VarName`, `TaskId`, `HintId`, `Index` properties
- [ ] Add `OldHookType`, `NewHookType` for type changes
- [ ] Test deserialization of hook changes

### Testing

- [ ] Unit test: Hook signature extraction
- [ ] Unit test: Hook signature comparison
- [ ] Integration test: Add useState → Instance replaced
- [ ] Integration test: Remove useEffect → Instance replaced
- [ ] Integration test: Reorder hooks → Instance replaced
- [ ] Integration test: Mixed changes (JSX + hooks) → Instance replaced

### Documentation

- [x] This implementation plan
- [ ] Update `HOT_RELOAD_STRUCTURAL_CHANGES.md` to mention hooks
- [ ] Update `STRUCTURAL_CHANGE_INSTANCE_REPLACEMENT.md` to mention hooks
- [ ] Add examples to Minimact Swig docs

---

## Performance Impact

### Additional File I/O

**Before**: 1 file per component (`.tsx.keys`)
**After**: 2 files per component (`.tsx.keys` + `.hooks.json`)

**Impact**: Minimal - hook signature files are tiny (~1KB)

### Comparison Overhead

**Hook signature comparison**: O(n) where n = number of hooks (typically < 20)

**Impact**: < 1ms per component

---

## Future Enhancements

### 1. Hook Metadata Tracking

Track more hook metadata for better diagnostics:

```json
{
  "type": "useState",
  "varName": "count",
  "initialValue": "0",
  "typeAnnotation": "number",
  "index": 0
}
```

### 2. Smart Hook Migration

Detect hook renames and migrate state:

```tsx
// BEFORE
const [count, setCount] = useState(0);

// AFTER (renamed)
const [counter, setCounter] = useState(0);
```

Could detect: "Same type, different name, same initial value → Rename, not add/remove"

### 3. Non-Structural Hook Changes

Differentiate structural vs non-structural hook changes:

**Structural** (triggers replacement):
- Hook added/removed
- Hook type changed
- Hook reordered

**Non-Structural** (doesn't trigger replacement):
- useEffect deps changed
- useState initial value changed
- useRef initial value changed

---

## Summary

**Hook Change Detection completes the structural hot reload system**:

1. **JSX Change Detection** (already implemented) → Handles visual structure
2. **Hook Change Detection** (this enhancement) → Handles state/effect structure
3. **Instance Replacement** (already implemented) → Handles ANY structural change

**Result**: Comprehensive hot reload that handles ALL component changes safely and predictably.

**Key Insight**: It doesn't matter WHAT changed (JSX, hooks, or both) - just that structure changed. The binary decision (`changes.Count > 0`) makes the system simple, predictable, and reliable.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-08
**Author**: Minimact Hot Reload Team
