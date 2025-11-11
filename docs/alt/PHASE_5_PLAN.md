# Phase 5 Plan: End-to-End Testing

## Goal
Validate that external libraries work end-to-end, from JSX through transpilation, C# rendering, client computation, SignalR sync, and back to server re-rendering.

## Two Testing Approaches

### Option A: Extend `test-client-sim.js` (Automated, Fast)
**Pros:**
- ✅ Automated testing
- ✅ Fast iteration
- ✅ Can test multiple scenarios quickly
- ✅ Good for CI/CD

**Cons:**
- ⚠️ Doesn't test real SignalR connection
- ⚠️ Doesn't test browser environment
- ⚠️ Mock-based (simulates, not actual)

**What it tests:**
- Babel transpilation ✓
- C# compilation ✓
- C# rendering ✓
- Generated patches ✓
- Client-computed property detection ✓

**What it doesn't test:**
- Real SignalR connection ✗
- Browser JavaScript execution ✗
- Actual lodash/moment in browser ✗
- Real DOM updates ✗

---

### Option B: Real Sample App (Manual, Complete)
**Pros:**
- ✅ Tests real browser environment
- ✅ Tests actual SignalR connection
- ✅ Tests real lodash/moment execution
- ✅ Visual confirmation of UI
- ✅ End-to-end user experience

**Cons:**
- ⚠️ Manual testing required
- ⚠️ Slower iteration
- ⚠️ Harder to automate

**What it tests:**
- Everything from Option A ✓
- Real SignalR Hub method ✓
- Browser JavaScript execution ✓
- Actual external libraries ✓
- Real DOM updates ✓
- User interaction flow ✓

---

## Recommended Approach: BOTH

### Phase 5A: Automated Tests (30 minutes)
Extend `test-client-sim.js` to validate client-computed detection:

```javascript
function validateClientComputed(component) {
  const validations = [];

  if (component.clientComputedVars && component.clientComputedVars.size > 0) {
    component.clientComputedVars.forEach(varName => {
      const csharp = component.generatedCSharp;

      const hasAttribute = csharp.includes(`[ClientComputed("${varName}")]`);
      const hasProperty = csharp.includes(`GetClientState<`);

      validations.push({
        feature: `ClientComputed: ${varName}`,
        passed: hasAttribute && hasProperty,
        details: hasAttribute && hasProperty
          ? `✓ ${varName} marked as client-computed`
          : `✗ ${varName} missing ClientComputed infrastructure`
      });
    });
  }

  return validations;
}
```

**Tests:**
1. ExternalLibrariesTest transpiles correctly
2. All 6 client-computed variables detected
3. C# properties generated with [ClientComputed]
4. GetClientState<T>() calls present
5. No external library calls in C# code

**Run:**
```bash
$ node src/test-client-sim.js
```

---

### Phase 5B: Real Sample App (1-2 hours)

Create actual browser test with real SignalR and external libraries.

#### Step 1: Add Generated C# to Sample App

**File:** `samples/MinimactSampleApp/MinimactSampleApp/Generated/ExternalLibrariesTest.cs`

```bash
# Generate the C#
$ cd src
$ node test-single.js ExternalLibrariesTest.jsx > ../samples/.../Generated/ExternalLibrariesTest.cs
```

#### Step 2: Create Route

**File:** `samples/MinimactSampleApp/MinimactSampleApp/Components/Pages/ExternalLibrariesTestPage.cshtml`

```html
@page "/external-libraries-test"
@using Minimact.Components

<h1>External Libraries Test</h1>

@{
    var component = new ExternalLibrariesTest();
    var vnode = component.InitialRender();
}

<div id="app" data-component-id="@component.ComponentId">
    @Html.Raw(vnode.ToHtml())
</div>

<script src="/js/minimact.js"></script>
<script src="/js/external-libraries-test-client.js"></script>
```

#### Step 3: Create Client Registration Script

**File:** `samples/MinimactSampleApp/MinimactSampleApp/wwwroot/js/external-libraries-test-client.js`

```javascript
import { registerClientComputed } from '@minimact/core';
import _ from 'lodash';
import moment from 'moment';

// Component ID from server
const componentId = document.querySelector('[data-component-id]').dataset.componentId;

// Get state accessor
const getState = (key) => {
  // Access component state from Minimact runtime
  return window.MinimactRuntime.getComponentState(componentId, key);
};

// Register client-computed variables
registerClientComputed(componentId, 'sortedItems', () => {
  const items = getState('items');
  const sortOrder = getState('sortOrder');
  return _.orderBy(items, ['price'], [sortOrder]);
}, ['items', 'sortOrder']);

registerClientComputed(componentId, 'totalPrice', () => {
  const items = getState('items');
  return _.sumBy(items, 'price');
}, ['items']);

registerClientComputed(componentId, 'avgPrice', () => {
  const items = getState('items');
  return _.meanBy(items, 'price');
}, ['items']);

registerClientComputed(componentId, 'cheapestItem', () => {
  const items = getState('items');
  return _.minBy(items, 'price');
}, ['items']);

registerClientComputed(componentId, 'expensiveItems', () => {
  const items = getState('items');
  return _.filter(items, item => item.price > 1.00);
}, ['items']);

registerClientComputed(componentId, 'formatDate', () => {
  return (dateStr) => moment(dateStr).format('MMM DD, YYYY');
}, []);

// Initial computation
window.MinimactRuntime.computeAllClientState(componentId);
```

#### Step 4: Install lodash and moment

```bash
$ cd samples/MinimactSampleApp/MinimactSampleApp
$ npm install lodash moment
```

#### Step 5: Update Bundler Config

Make sure lodash and moment are bundled with the client runtime.

#### Step 6: Run and Test

```bash
$ cd samples/MinimactSampleApp/MinimactSampleApp
$ dotnet run
```

**Navigate to:** `http://localhost:5000/external-libraries-test`

**Manual Test Checklist:**

1. **Initial SSR**
   - [ ] Page renders
   - [ ] Shows placeholder values (0, empty list, etc.)
   - [ ] No JavaScript errors in console

2. **Client Hydration**
   - [ ] Client-computed values appear
   - [ ] Total shows $7.20
   - [ ] Average shows $1.80
   - [ ] List shows 4 items sorted by price
   - [ ] Check console: `[ClientComputed] Computed variable: sortedItems`

3. **State Change (Click Sort Button)**
   - [ ] Button click works
   - [ ] Console: `[ClientComputed] Computed variable: sortedItems`
   - [ ] List reorders (desc instead of asc)
   - [ ] No full page refresh
   - [ ] Only affected values recomputed

4. **Network Tab (SignalR)**
   - [ ] UpdateClientComputedState message sent
   - [ ] Payload includes computed values
   - [ ] ApplyPatches message received
   - [ ] DOM updates with patches

5. **Server Logs**
   - [ ] UpdateClientComputedState hub method called
   - [ ] Component re-rendered
   - [ ] Patches computed
   - [ ] Predictor notified

---

## Expected Results

### Phase 5A Output (test-client-sim.js)
```
╔═══════════════════════════════════════════════════╗
║   Testing: ExternalLibrariesTest.jsx            ║
╚═══════════════════════════════════════════════════╝

[Transpilation]
✓ Transpiled successfully

[Feature Validation] ExternalLibrariesTest
-------------------------------------------------------
✓ ClientComputed: sortedItems     ✓ Marked as client-computed
✓ ClientComputed: totalPrice      ✓ Marked as client-computed
✓ ClientComputed: avgPrice        ✓ Marked as client-computed
✓ ClientComputed: cheapestItem    ✓ Marked as client-computed
✓ ClientComputed: expensiveItems  ✓ Marked as client-computed
✓ ClientComputed: formatDate      ✓ Marked as client-computed

[C# Validation]
✓ No external library calls in C# code
✓ All GetClientState<T>() calls present
✓ Type inference correct (List<dynamic>, double, dynamic)

-------------------------------------------------------
PASSED: 6/6 client-computed variables
```

### Phase 5B Output (Sample App)

**Browser Console:**
```
[Minimact] Connected to SignalR hub
[Minimact] Component registered: ExternalLibrariesTest-abc123
[ClientComputed] Registered 6 client-computed variables
[ClientComputed] Computing all for component: ExternalLibrariesTest-abc123
[ClientComputed] Computed variable: sortedItems = [4 items]
[ClientComputed] Computed variable: totalPrice = 7.2
[ClientComputed] Computed variable: avgPrice = 1.8
[ClientComputed] Computed variable: cheapestItem = {id: 2, name: "Banana", ...}
[ClientComputed] Computed variable: expensiveItems = [3 items]
[ClientComputed] Computed variable: formatDate = [Function]
[Minimact] Client-computed state synced: { sortedItems: [...], totalPrice: 7.2, ... }
[Minimact] Received patches: 15 patch operations
[Minimact] DOM updated
```

**Server Logs:**
```
[MinimactHub] UpdateClientComputedState called for ExternalLibrariesTest-abc123
[MinimactHub] Received 6 client-computed values
[MinimactComponent] TriggerRender called
[MinimactComponent] Rendering with client-computed state
[Differ] Computed 15 patch operations
[MinimactHub] Patches sent to client
[Predictor] Learning from component ExternalLibrariesTest-abc123
```

---

## Timeline

### Phase 5A: Automated Tests
- **Add validation to test-client-sim.js:** 20 minutes
- **Run and verify:** 10 minutes
- **Total:** ~30 minutes

### Phase 5B: Sample App
- **Generate and copy C#:** 10 minutes
- **Create client registration script:** 30 minutes
- **Install dependencies and configure bundler:** 15 minutes
- **Manual testing and debugging:** 30-60 minutes
- **Total:** ~1.5-2 hours

### Combined Total: ~2-2.5 hours

---

## Success Criteria

Phase 5 is complete when:

- [x] test-client-sim.js validates client-computed detection
- [x] ExternalLibrariesTest C# generates correctly
- [ ] Sample app page renders with placeholders
- [ ] Client computes real values with lodash/moment
- [ ] SignalR UpdateClientComputedState receives values
- [ ] Server re-renders with computed values
- [ ] DOM updates without full refresh
- [ ] State changes trigger selective recomputation
- [ ] Predictor learns from client-computed patterns

---

## After Phase 5

Once Phase 5 passes, we'll have **proven** that external libraries work end-to-end.

Then we can:
1. Document the pattern
2. Add more examples (D3, Chart.js, etc.)
3. **Build Minimact Punch** using the exact same infrastructure

---

## Recommendation

**Start with Phase 5A** (test-client-sim.js extension):
- Quick validation that transpilation works
- Automated and repeatable
- Good for future CI/CD

**Then do Phase 5B** (sample app):
- Proves it works in real environment
- Visual confirmation
- Tests full user experience

**Total time: 2-3 hours** to have complete confidence in external library support.

Then: **Minimact Punch is just one more external library!** 🌵 + 🍹
