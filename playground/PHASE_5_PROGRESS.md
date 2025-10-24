# Phase 5: Playground Enhancement Progress

## Overview
Enhancing the Minimact Playground to support testing external libraries (lodash, moment) and ultimately Minimact Punch.

**Status:** In Progress
**Started:** 2025-10-24
**Target:** Test external libraries end-to-end in playground environment

---

## ✅ Completed Tasks

### Backend Enhancements

#### 1. PlaygroundSession - ClientState Support
**File:** `playground/backend/Services/PlaygroundSession.cs`

**Changes:**
- Added `ClientComputedState` dictionary property to track client-computed values
- Added `ClientComputedMetadata` list to store metadata about client-computed variables
- Created `ClientComputedVariable` class with:
  - Name
  - Type (C# type like "List<dynamic>", "double", etc.)
  - Dependencies (state variables that affect this value)
  - DefaultValue expression

**Purpose:** Store client-computed values calculated in the browser (via lodash/moment) for use in server rendering.

#### 2. Request Model - UpdateClientComputedRequest
**File:** `playground/backend/Models/Requests.cs`

**Added:**
```csharp
public class UpdateClientComputedRequest
{
    public required string SessionId { get; set; }
    public Dictionary<string, object> ComputedValues { get; set; } = new();
}
```

**Purpose:** Accept client-computed values from the browser.

#### 3. Controller - UpdateClientComputed Endpoint
**File:** `playground/backend/Controllers/PlaygroundController.cs`

**Added:** `POST /api/playground/update-client-computed`

**Flow:**
1. Receives computed values from browser
2. Updates session's ClientState
3. Triggers component re-render
4. Returns patches and new HTML

**Purpose:** Simulates SignalR `UpdateClientComputedState` hub method in playground.

#### 4. Service - UpdateClientComputedAsync Method
**File:** `playground/backend/Services/PlaygroundService.cs`

**Implementation:**
```csharp
public async Task<InteractionResponse> UpdateClientComputedAsync(
    UpdateClientComputedRequest request,
    CancellationToken cancellationToken = default)
{
    // 1. Get session
    // 2. Save old VNode
    // 3. Update session's ClientComputedState
    // 4. Update component's ClientState dictionary
    // 5. Trigger re-render (GetClientState<T>() calls work)
    // 6. Compute patches
    // 7. Record metrics
    // 8. Return response
}
```

**Purpose:** Core logic for updating client-computed state and re-rendering.

#### Build Status
✅ Backend compiles successfully (only pre-existing warnings)

### Frontend Enhancements

#### 1. Dependencies Installed
**File:** `playground/frontend/package.json`

**Added:**
- `lodash` - Data manipulation library
- `moment` - Date formatting library
- `@types/lodash` - TypeScript definitions

**Purpose:** Enable client-side computation of values using external libraries.

---

## 🚧 Remaining Tasks

### Frontend Work (2-3 hours remaining)

#### 1. Create Client Computation Service
**File to create:** `playground/frontend/src/services/clientComputation.ts`

**Requirements:**
- Extract `[ClientComputed]` metadata from C# code
- Register computation functions for each client-computed variable
- Compute values when dependencies change
- Send computed values to backend via `/api/playground/update-client-computed`

**Example:**
```typescript
export class ClientComputationService {
  // Extract metadata from C# code
  extractClientComputedVars(csharpCode: string): ClientComputedVariable[]

  // Register computation functions
  registerComputations(sessionId: string, component: Component)

  // Compute and sync values
  computeAndSync(sessionId: string, stateChanges: StateChanges): Promise<void>
}
```

#### 2. Enhance Preview Component
**File to edit:** `playground/frontend/src/components/Preview.tsx`

**Requirements:**
- Instantiate ClientComputationService
- Trigger computation when component loads (hydration)
- Trigger computation when state changes
- Display computed values in overlay

#### 3. Create ClientComputedPanel Component
**File to create:** `playground/frontend/src/components/ClientComputedPanel.tsx`

**Requirements:**
- Visual panel showing client-computed variables
- Real-time values display
- Dependencies visualization
- Badges for lodash/moment usage
- Syntax highlighting for variable names

**Design:**
```
┌─────────────────────────────────────────┐
│  Client-Computed Variables              │
├─────────────────────────────────────────┤
│  🟢 sortedItems: List<dynamic>          │
│     Dependencies: items, sortOrder      │
│     Value: [4 items] via lodash ✨      │
│                                          │
│  🟢 totalPrice: 7.20 (double)           │
│     Dependencies: items                 │
│     Value: 7.2 via lodash ✨            │
│                                          │
│  🟢 formatDate: Function                │
│     Dependencies: (none)                │
│     via moment ✨                        │
└─────────────────────────────────────────┘
```

#### 4. Test with ExternalLibrariesTest.jsx
**File to test with:** `src/fixtures/ExternalLibrariesTest.jsx`

**Test Flow:**
1. Copy C# code generated from `ExternalLibrariesTest.jsx` into Monaco editor
2. Click "Compile" → backend compiles, extracts metadata
3. Frontend extracts client-computed variables
4. Frontend computes values using lodash/moment
5. Frontend sends computed values to `/api/playground/update-client-computed`
6. Backend re-renders with computed values
7. Preview shows final HTML with real computed values
8. ClientComputedPanel shows all 6 variables with values

**Expected Variables:**
- `sortedItems` - via `_.orderBy()`
- `totalPrice` - via `_.sumBy()`
- `avgPrice` - via `_.meanBy()`
- `cheapestItem` - via `_.minBy()`
- `expensiveItems` - via `_.filter()`
- `formatDate` - via `moment().format()`

---

## Architecture Flow

### Complete Flow (Once Implemented)

```
┌─────────────────────────────────────────────────────────┐
│  1. User writes JSX with lodash/moment in Monaco editor │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  2. Babel transpiles JSX → C# (Phases 1-3 complete!)   │
│     • Detects external imports (lodash, moment)         │
│     • Marks variables as [ClientComputed]              │
│     • Generates GetClientState<T>() calls              │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  3. User clicks "Compile" in playground                 │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  4. Backend compiles C# (Roslyn)                        │
│     • Component instantiated                            │
│     • Initial render with placeholders                 │
│     • SessionId returned                               │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  5. Frontend extracts client-computed metadata          │
│     • Parse [ClientComputed] attributes from C#        │
│     • Extract variable names, types, dependencies      │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  6. Frontend computes values (NEW - TO IMPLEMENT)       │
│     • Execute: _.orderBy(items, ['price'], ['asc'])    │
│     • Execute: _.sumBy(items, 'price')                 │
│     • Execute: moment(date).format('MMM DD, YYYY')     │
│     • etc...                                           │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  7. Frontend sends computed values (NEW - Phase 4!)    │
│     POST /api/playground/update-client-computed         │
│     {                                                   │
│       sessionId: "...",                                │
│       computedValues: {                                │
│         sortedItems: [...],                           │
│         totalPrice: 7.2,                              │
│         ...                                           │
│       }                                               │
│     }                                                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  8. Backend updates and re-renders (NEW - Phase 4!)    │
│     • session.ClientComputedState = computedValues     │
│     • component.UpdateClientState(computedValues)      │
│     • newVNode = component.RenderComponent()           │
│     • patches = diff(oldVNode, newVNode)               │
│     • return patches + HTML                            │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  9. Frontend applies patches to Preview                │
│     • Updates iframe HTML                              │
│     • Shows ClientComputedPanel with values           │
└─────────────────────────────────────────────────────────┘
```

---

## Key Insights

### Why This Approach Works

1. **Simulates Real SignalR Flow**
   - Playground HTTP endpoint mimics SignalR `UpdateClientComputedState` hub method
   - Same logic path as production (Phase 4 implementation)
   - Instant feedback loop for testing

2. **Reuses Existing Infrastructure**
   - Backend: Phases 1-4 already implemented
   - Frontend: Just needs computation + API call logic
   - No changes to Babel plugin needed

3. **Perfect Testing Environment**
   - Visual confirmation of computed values
   - Metrics tracking for performance
   - Easy iteration (no rebuild needed)

### What Makes This Different from Sample App

**Sample App (Phase 5B alternative):**
- Real SignalR connection
- Browser execution with bundled JS
- Full production flow
- **Time: ~2.5 hours setup**

**Playground (Current approach):**
- HTTP endpoint (simulates SignalR)
- Browser execution (same lodash/moment code)
- Near-production flow
- **Time: ~1.5 hours remaining**

**Both validate the same thing:** External libraries work end-to-end.

---

## Timeline

### Completed (1.5 hours)
- ✅ Backend PlaygroundSession enhancements (15 min)
- ✅ Backend API endpoint (15 min)
- ✅ Backend service method (30 min)
- ✅ Frontend dependencies installation (5 min)
- ✅ Documentation (25 min)

### Remaining (1.5-2 hours)
- ⏳ Client computation service (45 min)
- ⏳ Preview component enhancement (15 min)
- ⏳ ClientComputedPanel component (30 min)
- ⏳ Testing with ExternalLibrariesTest (15-30 min)

### Total: ~3-3.5 hours for Phase 5A

---

## Success Metrics

Phase 5A is complete when:

- [x] Backend accepts client-computed state via API endpoint
- [x] Backend updates component ClientState
- [x] Backend triggers re-render with computed values
- [ ] Frontend extracts [ClientComputed] metadata from C#
- [ ] Frontend computes values using lodash/moment
- [ ] Frontend sends computed values to backend
- [ ] Preview shows final HTML with real computed values
- [ ] ClientComputedPanel visualizes all 6 variables
- [ ] ExternalLibrariesTest works end-to-end

---

## Next Steps

1. **Implement ClientComputationService** (`playground/frontend/src/services/clientComputation.ts`)
2. **Enhance Preview component** to trigger computations
3. **Create ClientComputedPanel** for visualization
4. **Test with ExternalLibrariesTest.jsx**

Once Phase 5A completes, Phase 5B (Minimact Punch testing) becomes trivial because Punch is just another external library! 🌵 + 🍹

---

*"The playground is where external libraries come to prove themselves."*
