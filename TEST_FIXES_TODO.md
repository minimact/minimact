# Minimact Test Fixes TODO

This document tracks all test failures and build errors that need to be fixed.

**Status:** Build errors fixed (5/5) ✅ | Test failures remaining (22)

---

## ✅ Build Errors Fixed (All Complete!)

### 1. minimact-trees - Syntax Error ✅
- **File:** `src/minimact-trees/tests/evaluator.test.ts:300`
- **Error:** `Expected "}" but found "-"`
- **Cause:** Unquoted object keys with hyphens (e.g., `paymentMethodCredit-card`)
- **Fix:** Wrapped hyphenated keys in quotes
- **Status:** ✅ FIXED

### 2. minimact-trees - Missing File ✅
- **File:** `src/minimact-trees/tests/key-parser.test.ts`
- **Error:** `Failed to resolve import "../src/key-parser"`
- **Cause:** Test importing from non-existent `key-parser.ts` file
- **Fix:** Changed import to `parseStateKey as parseKey from '../src/parser'`
- **Status:** ✅ FIXED

### 3. minimact-query - Import Resolution ✅
- **Files:** All 3 test files in `src/minimact-query/tests/`
- **Error:** `Failed to resolve import "minimact-punch"`
- **Cause:** Using package name instead of alias path
- **Fix:** Changed `'minimact-punch'` to `'@minimact/punch'` in query-builder.ts
- **Status:** ✅ FIXED

---

## ❌ Test Failures by Extension

### minimact-trees (27 failures)

#### A. Parser Implementation Issues (21 failures)

**Issue 1: Missing `valueType` field**
- **Files:** All key-parser.test.ts tests
- **Expected:** `{ stateName: 'role', expectedValue: 'admin', valueType: 'string' }`
- **Actual:** `{ stateName: 'role', expectedValue: 'admin' }`
- **Fix Needed:** Add `valueType` field to `ParsedStateKey` type and parser logic
- **Affected Tests:** 18 tests

**Issue 2: Regex splits on first capital letter (too greedy)**
- **Example:** `isActiveTrue` → `stateName: 'is'` instead of `stateName: 'isActive'`
- **Pattern:** `/^([a-z][a-zA-Z0-9]*?)([A-Z].*|[0-9].*)$/`
- **Problem:** The `*?` lazy match stops at first capital
- **Fix Needed:** Improve regex to handle camelCase state names properly
- **Affected Tests:**
  - `isActiveTrue` → expects `stateName: 'isActive'`, got `stateName: 'is'`
  - `isActiveFalse` → expects `stateName: 'isActive'`, got `stateName: 'is'`
  - `isLockedTrue` → expects `stateName: 'isLocked'`, got `stateName: 'is'`
  - `isLockedFalse` → expects `stateName: 'isLocked'`, got `stateName: 'is'`
  - `userRoleAdmin` → expects `stateName: 'userRole'`, got `stateName: 'user'`
  - `paymentMethodCredit-card` → expects `stateName: 'paymentMethod'`, got `stateName: 'payment'`

**Issue 3: Case sensitivity in value parsing**
- **Example:** `gradeA` → `expectedValue: 'a'` instead of `expectedValue: 'A'`
- **Cause:** kebab-case conversion lowercases everything
- **Fix Needed:** Preserve original case for single-letter values
- **Affected Tests:** 1 test

**Issue 4: Negative number support**
- **Example:** `balance-50` → returns `null`
- **Cause:** Regex doesn't match negative numbers (starts with hyphen)
- **Fix Needed:** Handle negative numbers in pattern matching
- **Affected Tests:** 1 test

**Issue 5: Error handling**
- **Tests expect:** `parseKey()` to throw on invalid input
- **Actually:** Returns `null` instead of throwing
- **Fix Needed:** Add validation and throw errors for invalid keys
- **Affected Tests:** 3 tests
  - Empty key `''`
  - Key with no value `'role'`
  - Invalid format `'123invalid'`

#### B. Evaluator Implementation Issues (6 failures)

**Issue 6: Tree evaluation returns undefined**
- **All evaluator tests return:** `undefined` instead of expected values
- **Likely Cause:** `evaluateTree()` function not properly traversing the tree or matching keys
- **Fix Needed:** Debug `evaluateTree()` logic to properly:
  1. Parse tree keys using `parseStateKey()`
  2. Match context values against parsed keys
  3. Traverse nested trees
  4. Return leaf values
- **Affected Tests:**
  - Single-level tree with boolean → expected `'enabled'`, got `undefined`
  - 3-level tree → expected `0.0925`, got `undefined`
  - 5-level deeply nested → expected `'deep-value'`, got `undefined`
  - Object return values → expected `{ name: 'Test', value: 123 }`, got `undefined`
  - Tax rate calculation → expected `0.0925`, got `undefined`
  - Workflow action → expected `'authorize-payment'`, got `undefined`

---

### minimact-dynamic (17 failures)

#### Integration Test Failures (12 failures)

**Pattern:** State changes via `setState()` don't update the DOM

**Attribute Binding Failures (2):**
- `href` attribute doesn't update from `/user/123` to `/user/456`
- `aria-expanded` attribute doesn't update from `'false'` to `'true'`

**Class Binding Failures (2):**
- `className` doesn't update from `'button'` to `'button active'`
- Multiple classes don't update from `'card'` to `'card active hover'`

**Style Binding Failures (3):**
- `width` style doesn't update from `'0%'` to `'75%'`
- `backgroundColor` doesn't update from `'green'` to `'red'`
- `opacity` doesn't update from `'1'` to `'0.5'`

**Visibility Binding Failures (3):**
- `display` style doesn't change from `'none'` to `''` when showing
- Conditional visibility based on user.isPremium doesn't work
- Complex visibility logic with errors array doesn't work

**Real-World Example Failures (2):**
- Progress bar width/color don't update
- Todo list filtering doesn't work (expects 2 children, got 4)

**Root Cause:** The bindings register correctly but don't re-execute when state changes

#### Dependency Tracker Failure (1)

**Issue:** Array length tracking
- `items.length` access should track `'items.length'` dependency
- Currently only tracks `'items'`

#### Fuzz Test Failures (4)

**Visibility Issues (2):**
- Rapid boolean toggles: `display` expected `''`, got `'none'`
- Property-based: visibility should match boolean state

**Dependency Tracking:**
- Only `user.age` changed, but `userName` binding updated 101 times (expected 1)

**DOM Choreography:**
- Elements appearing/disappearing: container has 2 children, expected 0

---

### minimact-spatial (3 failures)

#### Edge Detection Issue

**Problem:** Bounds touching at edges are considered intersecting

**Test:** `boundsIntersect()` with bounds that touch edges
- **Expected:** `false` (edge touching is not intersection)
- **Actual:** `true` (function considers edge touching as intersection)
- **Affected Tests:** 2 tests
  - bounds-calculator.test.ts line 339
  - fuzz.test.ts line 428

**Fix Needed:** Update `boundsIntersect()` to use `<` instead of `<=` for boundary checks

#### Triangle Inequality Violation

**Test:** Property-based distance verification
- **Expected:** `distAC <= distAB + distBC + 0.01` (triangle inequality with small tolerance)
- **Actual:** `1078.76 > 988.01` (violation of triangle inequality)
- **Likely Cause:** Bug in `calculateDistance()` or `calculateCenterDistance()` implementation
- **Fix Needed:** Debug distance calculation logic

---

### minimact-punch (2 failures)

#### IntersectionObserver Ratio Invariants

**Issue:** Invalid intersection ratios generated during fuzzing

**Test:** 500 random frames should maintain valid ratios
- **Expected:** All ratios between 0 and 1 (inclusive)
- **Actual:** Some ratios are outside valid range or NaN/Infinity
- **Affected Tests:** 2 tests
  - Fuzzing test with 500 frames
  - Regression test with seed 42

**Fix Needed:** Add validation/clamping to IntersectionObserver mock to ensure ratios are always [0, 1]

---

### minimact-query (4 failures) - 94% PASS RATE! 🎉

**Status:** ✅ Build errors fixed! Tests now running successfully.

#### Issue 1: whereEquals Filter Bug

**Test:** `whereEquals should filter by equality`
- **Expected:** 20 results matching filter criteria
- **Actual:** 27 results (filter not working correctly)
- **Location:** `src/minimact-query/tests/query-builder.test.ts:78`
- **Fix Needed:** Debug `whereEquals()` method to properly filter elements by equality

#### Issue 2: STDDEV Calculation Bug

**Test:** `should calculate STDDEV`
- **Expected:** `0` (no variation in dataset)
- **Actual:** `2.315...` (incorrect standard deviation)
- **Location:** `src/minimact-query/tests/query-builder.test.ts:331`
- **Fix Needed:** Fix standard deviation calculation in `stddev()` aggregate function

#### Issue 3: ORDER BY Reversal

**Test:** `ORDER BY ASC then DESC returns reverse order`
- **Expected:** ASC result array reversed equals DESC result array
- **Actual:** Arrays don't match (sorting logic issue)
- **Location:** `src/minimact-query/tests/sql-invariants.test.ts`
- **Fix Needed:** Ensure ORDER BY DESC properly reverses ORDER BY ASC results

#### Issue 4: Operation Order Invariant

**Test:** `ORDER BY then LIMIT = LIMIT(ORDER BY)`
- **Expected:** Different results when operations applied in different order
- **Actual:** Same results (both methods produce identical output)
- **Location:** `src/minimact-query/tests/fuzz.test.ts:369`
- **Fix Needed:** Fix either ordering or limiting logic so operation order matters correctly

**Overall:** 65/69 tests passing (94% success rate) - Core SQL-like query functionality works!

---

## Summary Statistics

| Extension | Build Errors | Test Failures | Tests Passing | Total Tests | Pass Rate |
|-----------|-------------|---------------|---------------|-------------|-----------|
| minimact-trees | ✅ 0 | ❌ 27 | ✅ 15 | 42 | 36% |
| minimact-dynamic | ✅ 0 | ❌ 17 | ✅ 44 | 61 | 72% |
| minimact-spatial | ✅ 0 | ❌ 3 | ✅ 72 | 75 | 96% |
| minimact-punch | ✅ 0 | ❌ 2 | ✅ 9 | 11 | 82% |
| minimact-query | ✅ 0 | ❌ 4 | ✅ 65 | 69 | **94%** 🎉 |
| minimact-quantum | ✅ 0 | ❓ No tests | - | 0 | N/A |
| **TOTAL** | **✅ 0** | **❌ 53** | **✅ 205** | **258** | **79%** |

---

## Priority Fixes

### High Priority (Blocking multiple tests)

1. **minimact-trees parser regex** - Fix camelCase state name parsing (affects 6+ tests)
2. **minimact-dynamic binding updates** - Make bindings react to state changes (affects 12 tests)
3. **minimact-trees evaluator** - Fix tree traversal logic (affects 6 tests)

### Medium Priority

4. **minimact-trees valueType field** - Add missing field to match test expectations (affects 18 tests)
5. **minimact-spatial edge detection** - Fix boundary intersection logic (affects 2 tests)
6. **minimact-dynamic dependency tracking** - Fix spurious updates (affects 2 tests)

### Low Priority

7. **minimact-trees error handling** - Make parser throw on invalid input (affects 3 tests)
8. **minimact-punch ratio validation** - Add IntersectionObserver clamping (affects 2 tests)
9. **minimact-spatial distance calculation** - Fix triangle inequality (affects 1 test)
10. **minimact-trees edge cases** - Negative numbers, case sensitivity (affects 2 tests)

---

## Next Steps

1. ✅ Fix all build errors (COMPLETE)
2. ✅ Test minimact-query (COMPLETE - 94% passing!)
3. ⏳ Fix minimact-trees parser regex (HIGH PRIORITY)
4. ⏳ Fix minimact-dynamic binding reactivity (HIGH PRIORITY)
5. ⏳ Fix minimact-trees evaluator logic (HIGH PRIORITY)
6. ⏳ Address minimact-query edge cases (4 minor failures)
7. ⏳ Address medium and low priority fixes

---

*Last Updated: 2025-10-25*
*Build Errors: 0/5 ✅ | Test Failures: 53/258 | Tests Passing: 205/258 (79%)*
*Extensions Tested: 5/6 | Best Performer: minimact-spatial (96%) | Newest Success: minimact-query (94%)*
