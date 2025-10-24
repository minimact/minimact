# Critical Issue: External Third-Party Libraries Not Handled Correctly

**Status:** 🚨 BLOCKING for Minimact Punch implementation

## Problem Summary

The Babel plugin currently transpiles external library calls (lodash, moment, etc.) directly into C# code where they will fail at compile time or runtime.

## Test Case

Created: `src/fixtures/ExternalLibrariesTest.jsx`

**JSX with lodash:**
```javascript
import _ from 'lodash';
const sortedItems = _.orderBy(items, ['price'], [sortOrder]);
const totalPrice = _.sumBy(items, 'price');
```

**Generated C# (BROKEN):**
```csharp
var sortedItems = _.orderBy(items, new List<object> { "price" }, new List<object> { sortOrder });
var totalPrice = _.sumBy(items, "price");
```

**Result:** C# compilation will fail because `_` is undefined.

## Additional Issues Found

### 1. Moment.js calls transpiled to C#
```javascript
moment(dateStr).format('MMM DD, YYYY')
```
Becomes:
```csharp
moment(dateStr).format("MMM DD, YYYY")  // ❌ Fails
```

### 2. Arrow function logic broken
```javascript
setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
```
Becomes:
```csharp
SetState(nameof(sortOrder), null);  // ❌ Wrong!
```

### 3. CSS imports silently dropped
```javascript
import 'bootstrap/dist/css/bootstrap.min.css';  // Dropped, probably OK
```

## Root Cause

The Babel plugin (`src/babel-plugin-minimact/src/processComponent.cjs`) extracts local variables without distinguishing:
- Client-only library calls (should NOT be transpiled to C#)
- Server-compatible expressions (should be transpiled to C#)

## Solution Approaches

### Option 1: Client-Side Marker (Recommended)
Mark external library variables as client-only:

```javascript
const sortedItems = _.orderBy(items, ['price'], [sortOrder]); // [CLIENT_ONLY]
```

Generated C#:
```csharp
// var sortedItems = <client-computed>;  // Client will send via SignalR
var sortedItems = new List<dynamic>(); // Placeholder
```

### Option 2: Detect External Imports
Track all non-minimact imports and treat their usage as client-only:

```javascript
import _ from 'lodash';  // ← Plugin remembers this
```

When encountering `_.*`, generate placeholder C#.

### Option 3: [data-client-scope] Annotation
Require developers to mark client-only sections:

```javascript
<div data-client-scope>
  {sortedItems.map(...)}  // All JS in here is client-only
</div>
```

### Option 4: Hybrid Rendering Mode
Split components into:
- **Server variables:** State that server can compute
- **Client variables:** External library results

```csharp
protected override VNode Render()
{
    // Server-side state
    var items = this.items;
    var sortOrder = this.sortOrder;

    // Client-side computations (sent via SignalR)
    var sortedItems = GetClientState<List<dynamic>>("sortedItems");
    var totalPrice = GetClientState<double>("totalPrice");

    return ...;
}
```

## Impact on Minimact Punch

**This blocks Minimact Punch** because:

```javascript
import { useDomElementState } from 'minimact-punch';

const items = useDomElementState('.item');
const sortedItems = _.orderBy(items.elements, ['offsetTop']);  // ❌ Will break
```

Without proper external library handling, **any** third-party library used alongside Punch will break the transpilation.

## Recommended Fix Priority

**MUST FIX BEFORE implementing Minimact Punch.**

1. ✅ Create test fixture (done: `ExternalLibrariesTest.jsx`)
2. ⏳ Implement Option 2 (detect external imports)
3. ⏳ Add validation to `test-client-sim.js`
4. ⏳ Test with real sample app
5. ⏳ Then proceed with Punch implementation

## Related Files

- `src/fixtures/ExternalLibrariesTest.jsx` - Test case
- `src/babel-plugin-minimact/src/processComponent.cjs` - Where fix is needed
- `src/babel-plugin-minimact/src/extractors/localVariables.cjs` - Variable extraction logic
- `src/test-client-sim.js` - Where validation should be added
