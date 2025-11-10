# Minimact Testing Guide

**Complete guide to testing Minimact extensions with Vitest + happy-dom**

---

## Quick Start

```bash
# Install dependencies (root level)
npm install -D vitest happy-dom @vitest/coverage-v8

# Run all tests
npm test

# Run tests for specific extension
npm test src/minimact-dynamic

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch

# UI mode (interactive)
npm test -- --ui
```

---

## Project Structure

```
minimact/
├── vitest.config.ts           # Root Vitest configuration
├── vitest.setup.ts            # Global test setup & mocks
├── TESTING_GUIDE.md           # This file
├── src/
│   ├── minimact-dynamic/
│   │   ├── src/
│   │   │   └── dynamic-state.ts
│   │   └── tests/
│   │       ├── dynamic-state.test.ts
│   │       ├── integration.test.ts
│   │       └── mocks/
│   │           └── dom-helpers.ts
│   ├── minimact-punch/
│   │   ├── src/
│   │   └── tests/
│   ├── minimact-quantum/
│   │   ├── src/
│   │   └── tests/
│   ├── minimact-query/
│   │   ├── src/
│   │   └── tests/
│   ├── minimact-spatial/
│   │   ├── src/
│   │   └── tests/
│   └── minimact-trees/
│       ├── src/
│       └── tests/
└── package.json
```

---

## Testing Strategy

### 1. Unit Tests (Fast, Isolated)
Test core logic without DOM dependencies.

**Example:** Decision tree evaluation in minimact-trees
```typescript
describe('evaluateTree', () => {
  it('should evaluate simple tree', () => {
    const result = evaluateTree(
      { roleAdmin: 0, roleBasic: 10 },
      { role: 'admin' }
    );
    expect(result).toBe(0);
  });
});
```

### 2. DOM Integration Tests (Medium Speed)
Test DOM interactions with happy-dom.

**Example:** Dynamic state binding
```typescript
describe('useDynamicState', () => {
  it('should update DOM element', () => {
    document.body.innerHTML = '<span class="price"></span>';

    const dynamic = useDynamicState({ price: 29.99 });
    dynamic('.price', s => `$${s.price}`);

    const el = document.querySelector('.price');
    expect(el?.textContent).toBe('$29.99');
  });
});
```

### 3. Observer Tests (Mocked)
Test observer callbacks with mocked APIs.

**Example:** IntersectionObserver
```typescript
describe('useDomElementState', () => {
  it('should track intersection', () => {
    const state = useDomElementState();
    const callback = vi.fn();

    state.setOnChange(callback);

    // Simulate intersection
    const observer = IntersectionObserver.mock.instances[0];
    observer.callback([{
      isIntersecting: true,
      target: element
    }]);

    expect(callback).toHaveBeenCalled();
  });
});
```

---

## Coverage Requirements (MES Standards)

### MES Silver Certification (All Extensions)
- ✅ **Lines:** >80%
- ✅ **Functions:** >80%
- ✅ **Branches:** >80%
- ✅ **Statements:** >80%

### MES Gold (Optional)
- ✅ **Lines:** >95%
- ✅ **Functions:** >95%
- ✅ **Branches:** >90%
- ✅ **Integration tests:** End-to-end flows

---

## Per-Extension Testing Plans

### minimact-dynamic
**What to test:**
- ✅ Value binding (text content)
- ✅ Order choreography (DOM reordering)
- ✅ Attribute binding
- ✅ Class binding
- ✅ Style binding
- ✅ Visibility binding (show/hide)
- ✅ Dependency tracking
- ✅ State updates trigger re-evaluation

**Test files:**
- `tests/dynamic-state.test.ts` - Core state management
- `tests/bindings.test.ts` - All binding types
- `tests/choreography.test.ts` - DOM order changes
- `tests/dependencies.test.ts` - Proxy-based tracking

### minimact-punch
**What to test:**
- ✅ IntersectionObserver setup/teardown
- ✅ MutationObserver callbacks
- ✅ ResizeObserver functionality
- ✅ Collection queries (count, some, every)
- ✅ Statistical aggregations (avg, sum, median)
- ✅ Lifecycle state changes
- ✅ Memory cleanup on destroy

**Test files:**
- `tests/dom-element-state.test.ts` - Core state
- `tests/observers.test.ts` - Observer setup
- `tests/collections.test.ts` - Collection mode
- `tests/statistics.test.ts` - Aggregation functions
- `tests/lifecycle.test.ts` - State transitions

### minimact-quantum
**What to test:**
- ✅ Entanglement creation
- ✅ Mutation serialization
- ✅ Mutation application
- ✅ Mirror mode (unidirectional)
- ✅ Bidirectional mode
- ✅ Inverse mode
- ✅ Disentanglement cleanup

**Test files:**
- `tests/entanglement.test.ts` - Link creation/destruction
- `tests/mutation-vector.test.ts` - Serialization/deserialization
- `tests/modes.test.ts` - Mirror/inverse/bidirectional
- `tests/integration.test.ts` - Full entanglement flow

### minimact-query
**What to test:**
- ✅ FROM selector parsing
- ✅ WHERE filtering
- ✅ JOIN operations
- ✅ GROUP BY aggregation
- ✅ HAVING filters
- ✅ ORDER BY sorting
- ✅ LIMIT/OFFSET pagination
- ✅ DISTINCT values
- ✅ Set operations (UNION/INTERSECT/EXCEPT)
- ✅ Aggregate functions (COUNT/SUM/AVG)

**Test files:**
- `tests/query-builder.test.ts` - Builder API
- `tests/filtering.test.ts` - WHERE/HAVING
- `tests/joins.test.ts` - JOIN operations
- `tests/aggregations.test.ts` - GROUP BY/aggregate functions
- `tests/set-operations.test.ts` - UNION/INTERSECT/EXCEPT

### minimact-spatial
**What to test:**
- ✅ Area definition (selector/bounds/keywords)
- ✅ Element queries (fully/partially enclosed)
- ✅ Coverage calculation
- ✅ Intersection detection
- ✅ Distance calculations
- ✅ Viewport queries
- ✅ Spatial methods (contains/overlaps)

**Test files:**
- `tests/area-state.test.ts` - Core area creation
- `tests/geometry.test.ts` - Bounds/intersection
- `tests/queries.test.ts` - Element queries
- `tests/coverage.test.ts` - Coverage analysis
- `tests/spatial-methods.test.ts` - Distance/intersection

### minimact-trees
**What to test:**
- ✅ Key parsing (roleAdmin → role === 'admin')
- ✅ Tree evaluation (nested conditions)
- ✅ Type support (string/number/boolean/float)
- ✅ Default value handling
- ✅ Strict mode errors
- ✅ Debug logging
- ✅ Deep nesting (5+ levels)

**Test files:**
- `tests/key-parser.test.ts` - Key parsing logic
- `tests/evaluator.test.ts` - Tree traversal
- `tests/types.test.ts` - All value types
- `tests/edge-cases.test.ts` - Error handling

---

## Common Test Utilities

### DOM Helpers

```typescript
// tests/utils/dom-helpers.ts
export function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container.firstElementChild as HTMLElement;
}

export function cleanupDOM() {
  document.body.innerHTML = '';
}

export function waitForNextFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}
```

### Observer Mocks

```typescript
// tests/utils/observer-mocks.ts
import { vi } from 'vitest';

export function mockIntersectionObserver(entries: IntersectionObserverEntry[]) {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();

  global.IntersectionObserver = vi.fn((callback) => {
    // Immediately trigger callback for testing
    setTimeout(() => callback(entries, {} as any), 0);

    return {
      observe,
      unobserve,
      disconnect,
      root: null,
      rootMargin: '',
      thresholds: []
    };
  }) as any;

  return { observe, unobserve, disconnect };
}
```

---

## Running Tests

### All Tests
```bash
npm test
```

### Specific Extension
```bash
npm test src/minimact-dynamic
npm test src/minimact-punch
npm test src/minimact-quantum
npm test src/minimact-query
npm test src/minimact-spatial
npm test src/minimact-trees
```

### Watch Mode (TDD)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm run test:coverage
```

### UI Mode (Interactive)
```bash
npm test -- --ui
```

### Specific File
```bash
npm test src/minimact-trees/tests/evaluator.test.ts
```

### Filter by Name
```bash
npm test -- -t "should evaluate simple tree"
```

---

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDynamicState } from '../src/dynamic-state';

describe('useDynamicState', () => {
  beforeEach(() => {
    // Setup before each test
    document.body.innerHTML = '<span class="target"></span>';
  });

  afterEach(() => {
    // Cleanup after each test
    document.body.innerHTML = '';
  });

  it('should update element text content', () => {
    const dynamic = useDynamicState({ count: 5 });
    dynamic('.target', s => `Count: ${s.count}`);

    const el = document.querySelector('.target');
    expect(el?.textContent).toBe('Count: 5');
  });

  it('should react to state changes', () => {
    const dynamic = useDynamicState({ count: 5 });
    dynamic('.target', s => `Count: ${s.count}`);

    dynamic.setState({ count: 10 });

    const el = document.querySelector('.target');
    expect(el?.textContent).toBe('Count: 10');
  });
});
```

### Testing Async Code

```typescript
it('should handle async updates', async () => {
  const state = useDomElementState();

  const promise = new Promise(resolve => {
    state.setOnChange((snapshot) => {
      resolve(snapshot.isIntersecting);
    });
  });

  // Trigger change
  triggerIntersection(state);

  const result = await promise;
  expect(result).toBe(true);
});
```

### Testing Errors

```typescript
it('should throw error in strict mode', () => {
  expect(() => {
    evaluateTree(
      { roleAdmin: 0 },
      { role: 'unknown' },
      { strictMode: true }
    );
  }).toThrow('No matching path');
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Best Practices

1. **Test Behavior, Not Implementation**
   - ✅ Test what the function does
   - ❌ Don't test internal state

2. **Keep Tests Fast**
   - ✅ Use mocks for observers
   - ✅ Avoid real timers (use vi.useFakeTimers)
   - ❌ Don't use real network calls

3. **Descriptive Test Names**
   - ✅ `it('should update DOM when state changes', ...)`
   - ❌ `it('test 1', ...)`

4. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should...', () => {
     // Arrange
     const state = createState();

     // Act
     state.update();

     // Assert
     expect(state.value).toBe(expected);
   });
   ```

5. **One Assertion Per Test (Guideline)**
   - Focus each test on one behavior
   - Makes failures easier to debug

6. **Clean Up Resources**
   - Always disconnect observers
   - Clear DOM after tests
   - Reset mocks

---

## Troubleshooting

### Tests Failing in CI but Passing Locally
- Check Node version consistency
- Clear `node_modules` and reinstall
- Check for race conditions (use `vi.useFakeTimers()`)

### Coverage Not Reaching 80%
- Check for untested edge cases
- Add error handling tests
- Test all code paths (if/else branches)

### Observer Tests Not Working
- Make sure observers are mocked in `vitest.setup.ts`
- Manually trigger callbacks in tests
- Check observer setup/teardown

### Memory Leaks in Tests
- Ensure all observers are disconnected
- Clear DOM in `afterEach`
- Remove event listeners

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [happy-dom Documentation](https://github.com/capricorn86/happy-dom)
- [MES Standards](./docs/EXTENSION_STANDARDS.md)

---

## Next Steps

1. ✅ Install dependencies: `npm install -D vitest happy-dom @vitest/coverage-v8`
2. ✅ Create test files for each extension (see structure above)
3. ✅ Run tests: `npm test`
4. ✅ Achieve >80% coverage (MES Silver requirement)
5. ✅ Integrate into CI/CD pipeline

---

**Happy testing!** 🌵✨🧪
