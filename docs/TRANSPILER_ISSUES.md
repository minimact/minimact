# C# to TypeScript Transpiler Issues

**Critical**: The transpiler must produce **byte-for-byte algorithm parity** between C# (for WPF MockClient testing) and TypeScript (for browser web workers).

## Current Status

The transpiler runs and produces output, but has several critical bugs that break algorithm parity.

---

## Issue 1: Nested Class Declarations with Invalid `export` Keyword

### Location
- `MouseTrajectoryTracker.ts` lines 50-54, 91-94
- Similar issues likely in other transpiled files

### Problem
Nested classes are being transpiled with `export` keyword **inside** the parent class:

**Transpiled Output (WRONG):**
```typescript
export class MouseTrajectoryTracker {
    // ... methods ...

    export class HoverConfidenceResult {  // ❌ SYNTAX ERROR!
        confidence: number;
        leadTime: number;
        reason: string;
    }

    calculateHoverConfidence(elementBounds: Rect): HoverConfidenceResult {
        // ...
    }
}
```

**C# Source:**
```csharp
public class MouseTrajectoryTracker
{
    // ... methods ...

    public class HoverConfidenceResult  // Nested class
    {
        public double Confidence { get; set; }
        public double LeadTime { get; set; }
        public string Reason { get; set; }
    }

    public HoverConfidenceResult CalculateHoverConfidence(Rect elementBounds)
    {
        // ...
    }
}
```

### Expected Output
These should be transpiled as **top-level interfaces or types** (TypeScript doesn't support nested classes the same way C# does):

```typescript
export interface HoverConfidenceResult {
    confidence: number;
    leadTime: number;
    reason: string;
}

export interface RayIntersectionResult {
    distance: number;
    point: TrajectoryPoint;
}

export class MouseTrajectoryTracker {
    // ... methods that use these types ...
}
```

### Root Cause
`TypeScriptGenerator.VisitClassDeclaration()` doesn't check if the class is nested inside another class.

### Fix Strategy
1. Detect nested class declarations
2. Hoist them to module level as interfaces (since they're just data containers)
3. Remove the `export` keyword from nested positions

---

## Issue 2: Variable Mutability Errors (const vs let)

### Location
- `MouseTrajectoryTracker.ts` lines 99-100, 107-109, 120-122, 133-135, 146-148

### Problem
Variables that will be reassigned are declared as `const` instead of `let`, causing runtime errors:

**Transpiled Output (WRONG):**
```typescript
private calculateRayIntersection(origin: TrajectoryPoint, angle: number, box: Rect): RayIntersectionResult {
    const dx: number = Math.cos(angle);
    const dy: number = Math.sin(angle);
    const minDistance: number = Number.POSITIVE_INFINITY;  // ❌ WILL BE REASSIGNED!
    const intersectionPoint: TrajectoryPoint = null;       // ❌ WILL BE REASSIGNED!

    if (dx > 0.001) {
        // ...
        if (dist < minDistance) {
            minDistance = dist;  // ❌ ERROR: Cannot assign to 'minDistance' because it is a constant
            intersectionPoint = { x: box.left, y, timestamp: 0 };  // ❌ ERROR
        }
    }
    // ... more reassignments ...
}
```

**C# Source:**
```csharp
private RayIntersectionResult CalculateRayIntersection(TrajectoryPoint origin, double angle, Rect box)
{
    double dx = Math.Cos(angle);
    double dy = Math.Sin(angle);
    double minDistance = double.PositiveInfinity;  // No suffix = mutable
    TrajectoryPoint intersectionPoint = null;       // No suffix = mutable

    // ... code that reassigns these variables ...
}
```

### Expected Output
```typescript
private calculateRayIntersection(origin: TrajectoryPoint, angle: number, box: Rect): RayIntersectionResult {
    const dx: number = Math.cos(angle);
    const dy: number = Math.sin(angle);
    let minDistance: number = Number.POSITIVE_INFINITY;  // ✅ let - will be reassigned
    let intersectionPoint: TrajectoryPoint | null = null;  // ✅ let - will be reassigned

    if (dx > 0.001) {
        // ...
        if (dist < minDistance) {
            minDistance = dist;  // ✅ Works!
            intersectionPoint = { x: box.left, y, timestamp: 0 };  // ✅ Works!
        }
    }
}
```

### Root Cause
The C# code **doesn't use** `_const` or `_let` suffixes on these variables (lines 230-231 in C# source), so the transpiler defaults to `const` (see `TypeScriptGenerator.ShouldUseConst()` line 321: "Default to const for initialized variables").

**However**, the C# code in `GetTrajectory()` (lines 40-72) **does use** suffixes like `points_const`, `timeDelta_const`, `acceleration_let`, which are correctly transpiled.

### Algorithm Parity Impact
**HIGH** - This breaks the algorithm completely. The TypeScript version will throw errors and cannot execute the ray intersection logic.

### Fix Strategy
Two options:

**Option A**: Update C# source to use suffixes
```csharp
double minDistance_let = double.PositiveInfinity;
TrajectoryPoint intersectionPoint_let = null;
```

**Option B**: Add flow analysis to detect reassignment
- Parse method body to detect which variables get reassigned
- Use `let` for reassigned variables, `const` for others
- More complex but doesn't require changing C# code

**Recommendation**: Option A (add suffixes to C#) - simpler and more explicit.

---

## Issue 3: Equality Operators (== vs ===)

### Location
- `MouseTrajectoryTracker.ts` lines 32, 58, 66, 153, 166

### Problem
TypeScript output uses `==` instead of `===`:

**Transpiled Output:**
```typescript
if (timeDelta == 0) {  // ❌ Loose equality
    return null;
}

if (trajectory == null) {  // ❌ Loose equality
    return { confidence: 0, leadTime: 0, reason: "no trajectory data" };
}
```

**Expected Output:**
```typescript
if (timeDelta === 0) {  // ✅ Strict equality
    return null;
}

if (trajectory === null) {  // ✅ Strict equality
    return { confidence: 0, leadTime: 0, reason: "no trajectory data" };
}
```

### Algorithm Parity Impact
**LOW** - Functionally equivalent for these cases (comparing numbers and null), but:
- TypeScript best practice is `===`
- Could cause subtle bugs in edge cases (e.g., `0 == "0"` is true, but `0 === "0"` is false)

### Root Cause
`TypeScriptGenerator.GenerateBinaryExpression()` (line 748) directly copies the operator token without translation.

### Fix Strategy
In `GenerateBinaryExpression()`, map C# `==` to TS `===` and C# `!=` to TS `!==`.

---

## Issue 4: Missing Return Type Annotations

### Location
- `MouseTrajectoryTracker.ts` line 24

### Problem
Return type should be `MouseTrajectory | null` not just `MouseTrajectory`:

**Transpiled Output:**
```typescript
getTrajectory(): MouseTrajectory {  // ❌ Missing | null
    const points: TrajectoryPoint[] = this.mouseHistory.getLast(5);
    if (points.length < 2) {
        return null;  // But we return null here!
    }
    // ...
}
```

**Expected Output:**
```typescript
getTrajectory(): MouseTrajectory | null {  // ✅ Correct
    const points: TrajectoryPoint[] = this.mouseHistory.getLast(5);
    if (points.length < 2) {
        return null;
    }
    // ...
}
```

### Algorithm Parity Impact
**MEDIUM** - TypeScript compiler may allow this, but it's incorrect typing and could cause issues in strict mode.

### Root Cause
`TypeScriptGenerator.MapTypeToTypeScript()` doesn't account for nullable return types when the method body contains `return null;`.

### Fix Strategy
Two options:

**Option A**: Flow analysis to detect nullable returns
- Scan method body for `return null` statements
- Add `| null` to return type automatically

**Option B**: Use C# nullable syntax
```csharp
public MouseTrajectory? GetTrajectory()  // C# 8.0+ nullable reference type
```
Then transpile `MouseTrajectory?` → `MouseTrajectory | null`

**Recommendation**: Option B - more explicit and leverages C# type system.

---

## Issue 5: C# Extension Method Calls Not Transpiled

### Location
- `MouseTrajectoryTracker.cs` lines 70-71, 151, 172, 206

### Problem
C# code uses `.ToFixed()` extension method (from `TranspilerHelpers.cs`), but transpiler doesn't recognize it:

**C# Source:**
```csharp
Reason = $"lead time {timeToIntersect.ToFixed(0)}ms outside window"
```

**Transpiled Output:**
```typescript
reason: `lead time ${timeToIntersect.toFixed(0)}ms outside window`  // ✅ Actually works!
```

**Status**: Actually working correctly! The transpiler converts `.ToFixed()` to `.toFixed()` (camelCase).

### Algorithm Parity Impact
**NONE** - Already working correctly.

---

## Issue 6: Missing Slice_Array Translation

### Location
- `MouseTrajectoryTracker.cs` lines 70-71

### Problem
C# uses custom `.Slice_Array()` extension method instead of native C# syntax:

**C# Source:**
```csharp
points_const.Slice_Array(0, mid_const)
points_const.Slice_Array(mid_const)
```

**Transpiled Output:**
```typescript
points.slice(0, mid)  // ✅ Correct!
points.slice(mid)     // ✅ Correct!
```

**Status**: Working correctly! The transpiler maps `Slice_Array` → `slice` (see `TypeScriptGenerator.GenerateMemberAccess()` line 593).

### Algorithm Parity Impact
**NONE** - Already working correctly.

---

## Issue 7: Property Name Case Sensitivity

### Location
- All transpiled files

### Problem
C# uses PascalCase for properties, TypeScript uses camelCase:

**C# Source:**
```csharp
config.MouseHistorySize
eventData.X
trajectory.Velocity
```

**Transpiled Output:**
```typescript
config.mouseHistorySize  // ✅ Correct camelCase
eventData.x              // ✅ Correct camelCase
trajectory.velocity      // ✅ Correct camelCase
```

**Status**: Working correctly via `ToCamelCase()` method.

### Algorithm Parity Impact
**NONE** - Already working correctly, but **requires** C# type definitions to match TS conventions.

---

## Summary of Critical Issues

| Issue | Severity | Breaks Algorithm? | Fix Complexity |
|-------|----------|-------------------|----------------|
| 1. Nested class `export` | **CRITICAL** | Yes (syntax error) | Medium |
| 2. `const` vs `let` | **CRITICAL** | Yes (runtime error) | Low (add C# suffixes) |
| 3. `==` vs `===` | Low | No (but bad practice) | Low |
| 4. Missing `| null` | Medium | No (but incorrect types) | Medium |
| 5. Extension methods | N/A | N/A (working) | N/A |
| 6. Slice_Array | N/A | N/A (working) | N/A |
| 7. PascalCase → camelCase | N/A | N/A (working) | N/A |

---

## Testing Strategy

Once fixes are implemented, validate algorithm parity by:

1. **Unit Tests**: Test each method in isolation with same inputs
   - C# test: Call `MouseTrajectoryTracker.CalculateHoverConfidence()`
   - TS test: Call `MouseTrajectoryTracker.calculateHoverConfidence()`
   - Assert identical outputs (within floating-point precision)

2. **Integration Tests**: Full trajectory tracking scenario
   - Feed identical mouse event sequences to both versions
   - Compare final confidence results
   - Must match exactly

3. **Property-Based Testing**: Generate random inputs
   - Use same random seed for C# and TS
   - Test with edge cases (null, zero, negative, infinity)
   - Fuzzing for numeric precision issues

---

## Implementation Plan

1. ✅ Document all issues (this file)
2. ⏳ Fix Issue #1 - Nested class transpilation
3. ⏳ Fix Issue #2 - Add `_let` suffixes to C# source
4. ⏳ Fix Issue #3 - Map `==` to `===`
5. ⏳ Fix Issue #4 - Add `| null` to return types
6. ✅ Run transpiler and verify output
7. ✅ Create comparison tests (C# vs TS)
8. ✅ Run tests to prove algorithm parity

---

## Additional Notes

### Why Not Hand-Write Both?

**Answer**: Maintenance burden. If we fix a bug or optimize an algorithm, we'd need to update both C# and TS versions manually. The transpiler ensures changes propagate automatically.

### Why Not Use Existing Transpiler (like Bridge.NET)?

**Answer**: We need **exact control** over output for:
- Web worker compatibility (no DOM dependencies)
- Minimalist output (no runtime overhead)
- Explicit `const`/`let` control via naming convention
- Custom type mappings (CircularBuffer, etc.)

### Future: Reverse Transpilation?

Could we transpile **TS → C#** instead? Possibly, but:
- Roslyn (C# compiler) is more powerful for static analysis
- C# is the "source of truth" for WPF MockClient
- Easier to write algorithms in C# with IDE support
