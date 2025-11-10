# Minimact TODO List

This document tracks all TODO comments in the codebase, organized by priority and category.

## 🔴 Critical Priority - New Hooks Implementation

These TODOs are blocking the completion of the new hook ecosystem (usePub, useSub, useSignalR, useMicroTask, useMacroTask, usePredictHint).

### 1. Pub/Sub Publishing
**File:** `src/babel-plugin-minimact/src/generators/component.cjs:270`
```csharp
// TODO: Implement pub/sub publishing
// EventAggregator.Publish(publish_channel, value, options);
```
**Status:** Needs EventAggregator class implementation
**Impact:** usePub hook is non-functional without this

### 2. Pub/Sub Subscription
**File:** `src/babel-plugin-minimact/src/generators/component.cjs:283`
```csharp
// TODO: Implement pub/sub subscription
// EventAggregator.Subscribe(notifications_channel, (msg) => {
//     notifications_value = msg.value;
//     SetState("notifications_value", notifications_value);
// });
```
**Status:** Needs EventAggregator class implementation
**Impact:** useSub hook is non-functional without this

### 3. SignalR Send Method
**File:** `src/babel-plugin-minimact/src/generators/component.cjs:299`
```csharp
// TODO: Implement SignalR send
// await HubConnection.InvokeAsync(methodName, args);
```
**Status:** Needs SignalR hub connection management
**Impact:** useSignalR send functionality is incomplete

### 4. Pub/Sub Component Lifecycle Integration
**File:** `src/client-runtime/src/pub-sub.ts:197`
```typescript
// TODO: Integrate with component lifecycle for auto-unsubscribe
```
**Status:** Prevents memory leaks from orphaned subscriptions
**Impact:** Production readiness issue

---

## 🟠 High Priority - Core Functionality

### 5. Event Handler Implementation
**File:** `src/babel-plugin-minimact/src/generators/component.cjs:249`
```csharp
// TODO: Implement ${handler.name}
```
**Current Behavior:** Generates empty event handler methods
**Needed:** Extract handler logic from JSX callbacks and generate C# code

**Example from Counter.cs:**
```csharp
// samples/MinimactSampleApp/MinimactSampleApp/Generated/components/Counter.cs:36
private void Handle0()
{
    // TODO: Implement Handle0
}
```

### 6. Hint Re-render Trigger
**File:** `src/client-runtime/src/hooks.ts:81`
```typescript
// TODO: Trigger re-render if no hint matched
```
**Status:** Affects usePredictHint fallback behavior
**Impact:** Components may not update if prediction misses

---

## 🟡 Medium Priority - Backend Integration

### 7. Playground Prediction Logic
**File:** `playground/backend/Services/PlaygroundService.cs:64`
```csharp
// 4. Generate predictions (TODO: Implement actual prediction logic)
```
**Status:** Stub implementation exists
**Impact:** Playground prediction testing incomplete

### 8. VNode to HTML Rendering
**File:** `playground/backend/Services/PlaygroundService.cs:67`
```csharp
// 5. Render to HTML (TODO: Implement actual VNode to HTML rendering)
```
**Status:** Returns placeholder HTML
**Impact:** Playground SSR incomplete

### 9. Predictor Integration
**File:** `playground/backend/Services/PlaygroundService.cs:237`
```csharp
// TODO: Integrate with actual predictor to generate predictions
```
**Status:** Needs Rust FFI bridge
**Impact:** Prediction system not wired to Rust

### 10. SignalR Argument Parsing
**File:** `src/Minimact.AspNetCore/SignalR/MiniactHub.cs:63`
```csharp
// TODO: Parse argsJson and match parameter types
```
**Status:** Currently deserializes as dynamic
**Impact:** Type safety and validation incomplete

---

## 🟢 Low Priority - Testing & Optimization

### 11. Advanced Predictor Tests
**File:** `src/test-predictor-advanced.js`

**Line 426:**
```javascript
// TODO: Make 100 state changes, count reconcile calls
```

**Line 431:**
```javascript
// TODO: Make 100 state changes, use predictions, count reconcile calls
```

**Line 476:**
```javascript
// TODO: Create many predictors with different patterns
```

**Status:** Performance benchmarking incomplete
**Impact:** No metrics for prediction effectiveness

---

## 🔵 Code Quality - Refactoring & Organization

### 12. AST Splitting Logic
**File:** `src/babel-plugin-minimact/src/generators/expressions.cjs:321`
```javascript
// TODO: Implement full AST splitting logic
```
**Status:** Affects complex expression generation
**Impact:** Some complex JSX may not transpile correctly

### 13. Unsupported Expression Handling
**Files:**
- `src/babel-plugin-minimact/index.cjs:470`
- `src/babel-plugin-minimact/index-enhanced.cjs:496`

```javascript
return '/* TODO: Unsupported expression */';
```
**Status:** Falls back to comment for unknown expressions
**Impact:** May silently fail on edge cases

### 14. Module Organization
**File:** `src/babel-plugin-minimact/index-modular.cjs`

**Line 21:**
```javascript
// TODO: Import modules once functions are moved:
```

**Line 38:**
```javascript
// TODO: Call processComponent(path, state)
```

**Line 45:**
```javascript
// TODO: Call processComponent(path, state)
```

**Line 53:**
```javascript
// TODO: Call generateCSharpFile(state.file.minimactComponents, state)
```

**Status:** Monolithic index file needs splitting
**Impact:** Code maintainability

### 15. Move classifyNode Function
**File:** `src/babel-plugin-minimact/src/analyzers/classification.cjs:19`
```javascript
// TODO: Move classifyNode function here
```
**Status:** Function still in wrong file
**Impact:** Code organization

### 16. Move Helper Functions
**File:** `src/babel-plugin-minimact/src/utils/helpers.cjs:17`
```javascript
// TODO: Move the following functions here:
```
**Status:** Utility functions scattered across files
**Impact:** Code organization

### 17. Extract Props Logic
**File:** `src/babel-plugin-minimact/src/extractors/props.cjs:15`
```javascript
// TODO: Move props extraction logic from processComponent function
```
**Status:** Props logic coupled to main component processor
**Impact:** Code organization

---

## 📊 TODO Summary

| Priority | Category | Count | Blocking |
|----------|----------|-------|----------|
| 🔴 Critical | Hook Implementation | 4 | Yes |
| 🟠 High | Core Functionality | 2 | Partially |
| 🟡 Medium | Backend Integration | 4 | No |
| 🟢 Low | Testing | 3 | No |
| 🔵 Code Quality | Refactoring | 7 | No |
| **Total** | | **20** | |

---

## 🎯 Recommended Implementation Order

### Phase 1: Complete Hook Ecosystem (Critical)
1. Create `EventAggregator` class in Minimact.AspNetCore
2. Implement pub/sub publishing (TODO #1)
3. Implement pub/sub subscription (TODO #2)
4. Wire SignalR send method (TODO #3)
5. Add pub/sub lifecycle cleanup (TODO #4)

**Expected Outcome:** usePub, useSub, useSignalR fully functional

### Phase 2: Event Handlers (High Priority)
6. Implement event handler code extraction (TODO #5)
7. Fix hint re-render trigger (TODO #6)

**Expected Outcome:** Complete JSX→C# event handling pipeline

### Phase 3: Backend Integration (Medium Priority)
8. Wire Rust predictor FFI (TODO #9)
9. Implement VNode→HTML rendering (TODO #8)
10. Complete SignalR arg parsing (TODO #10)

**Expected Outcome:** Playground fully functional, production-ready backend

### Phase 4: Testing & Optimization (Low Priority)
11. Complete advanced predictor tests (TODOs #11)

**Expected Outcome:** Performance metrics and benchmarks

### Phase 5: Code Quality (Ongoing)
12-17. Refactor and organize codebase (TODOs #12-17)

**Expected Outcome:** Maintainable, well-organized code structure

---

## 🚀 Quick Wins

These TODOs can be completed independently and provide immediate value:

1. **Pub/Sub Lifecycle Cleanup** (TODO #4) - Prevents memory leaks
2. **Hint Re-render Trigger** (TODO #6) - Improves usePredictHint reliability
3. **SignalR Arg Parsing** (TODO #10) - Type safety improvement

---

## 📝 Notes

### Dependencies
- TODOs #1-3 require `EventAggregator` class (not yet created)
- TODO #9 requires Rust FFI bridge (not yet implemented)
- TODOs #12-17 are code quality improvements with no functional blockers

### Examples in the Wild
Most TODOs have corresponding test fixtures that demonstrate the intended behavior:
- `src/fixtures/UsePubSubTest.jsx` - TODOs #1, #2, #4
- `src/fixtures/UseSignalRTest.jsx` - TODO #3
- `src/fixtures/UsePredictHintTest.jsx` - TODO #6

### Related Documentation
- `src/convo4.txt` - Original hook design discussions
- `playground/IMPLEMENTATION_SUMMARY.md` - Backend TODO context
- `README.md` - Project overview

---

**Last Updated:** 2025-01-23
**Total Active TODOs:** 20
**Blocking TODOs:** 4 (Critical priority)
