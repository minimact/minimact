# Test File Template

Use this template when creating new test files for Minimact extensions.

---

## Basic Test File Structure

```typescript
/**
 * Tests for [Feature Name]
 *
 * [Brief description of what is being tested]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YourFunction } from '../src/your-module';

describe('YourFunction', () => {
  beforeEach(() => {
    // Setup before each test
    // Example: Create DOM elements, initialize mocks
  });

  afterEach(() => {
    // Cleanup after each test
    // Example: Remove DOM elements, clear mocks
    vi.clearAllMocks();
  });

  describe('Feature Group 1', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = YourFunction(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => YourFunction(null)).toThrow();
    });
  });

  describe('Feature Group 2', () => {
    it('should [another expected behavior]', () => {
      // Test implementation
    });
  });
});
```

---

## DOM Testing Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DOM Manipulation', () => {
  beforeEach(() => {
    // Create test DOM
    document.body.innerHTML = `
      <div id="container">
        <span class="target">Initial</span>
      </div>
    `;
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  it('should update element content', () => {
    const element = document.querySelector('.target');
    element.textContent = 'Updated';

    expect(element?.textContent).toBe('Updated');
  });
});
```

---

## Observer Testing Template

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('IntersectionObserver', () => {
  it('should observe element', () => {
    const element = document.createElement('div');
    const callback = vi.fn();

    const observer = new IntersectionObserver(callback);
    observer.observe(element);

    expect(observer.observe).toHaveBeenCalledWith(element);
  });

  it('should trigger callback on intersection', async () => {
    const element = document.createElement('div');
    const callback = vi.fn();

    const observer = new IntersectionObserver(callback);
    observer.observe(element);

    // Manually trigger callback
    const entries: IntersectionObserverEntry[] = [{
      isIntersecting: true,
      target: element,
      intersectionRatio: 1,
      // ... other required properties
    } as IntersectionObserverEntry];

    callback(entries, observer as any);

    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls[0][0][0].isIntersecting).toBe(true);
  });
});
```

---

## Async Testing Template

```typescript
import { describe, it, expect } from 'vitest';

describe('Async Operations', () => {
  it('should resolve promise', async () => {
    const result = await asyncFunction();
    expect(result).toBe('success');
  });

  it('should reject promise on error', async () => {
    await expect(failingAsyncFunction()).rejects.toThrow('Error message');
  });

  it('should handle timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('done'), 100);
    });

    const result = await promise;
    expect(result).toBe('done');
  });
});
```

---

## Mock Testing Template

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Mocking', () => {
  it('should mock function', () => {
    const mockFn = vi.fn();
    mockFn('test');

    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should mock return value', () => {
    const mockFn = vi.fn().mockReturnValue(42);
    const result = mockFn();

    expect(result).toBe(42);
  });

  it('should mock implementation', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const result = mockFn(5);

    expect(result).toBe(10);
  });
});
```

---

## Error Testing Template

```typescript
import { describe, it, expect } from 'vitest';

describe('Error Handling', () => {
  it('should throw on invalid input', () => {
    expect(() => {
      functionThatThrows(null);
    }).toThrow();
  });

  it('should throw specific error message', () => {
    expect(() => {
      functionThatThrows(null);
    }).toThrow('Invalid input');
  });

  it('should throw error instance', () => {
    expect(() => {
      functionThatThrows(null);
    }).toThrow(TypeError);
  });
});
```

---

## Coverage Checklist

When writing tests, ensure you cover:

- ✅ **Happy path** - Normal expected usage
- ✅ **Edge cases** - Boundary conditions (0, null, empty, max)
- ✅ **Error cases** - Invalid input, exceptions
- ✅ **Async operations** - Promises, callbacks, timeouts
- ✅ **DOM interactions** - Element creation, updates, queries
- ✅ **Observer behavior** - Setup, callbacks, cleanup
- ✅ **State changes** - Before/after comparisons
- ✅ **Cleanup** - Resource disposal, memory leaks

---

## Best Practices

1. **One assertion per test (guideline)**
   - Makes failures easier to diagnose
   - Exception: Related assertions on same object

2. **Descriptive test names**
   - ✅ `it('should update DOM when state changes')`
   - ❌ `it('test 1')`

3. **AAA Pattern**
   - **Arrange**: Set up test data
   - **Act**: Execute the function
   - **Assert**: Verify the result

4. **Clean up resources**
   - Use `afterEach` for cleanup
   - Disconnect observers
   - Clear DOM
   - Reset mocks

5. **Avoid test interdependence**
   - Each test should run independently
   - Don't rely on execution order

6. **Test behavior, not implementation**
   - Focus on what the function does
   - Don't test internal state unless necessary

---

## Naming Conventions

- **File names**: `feature-name.test.ts` or `feature-name.spec.ts`
- **Describe blocks**: Feature or module name
- **Test names**: Start with "should" + expected behavior
- **Variables**: Descriptive names (not `x`, `y`, `data`)

---

## Example: Complete Test File

```typescript
/**
 * Tests for DynamicState value binding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDynamicState } from '../src/dynamic-state';

describe('useDynamicState', () => {
  beforeEach(() => {
    document.body.innerHTML = '<span class="price"></span>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Value Binding', () => {
    it('should bind text content to element', () => {
      const dynamic = useDynamicState({ price: 29.99 });
      dynamic('.price', s => `$${s.price}`);

      const el = document.querySelector('.price');
      expect(el?.textContent).toBe('$29.99');
    });

    it('should update when state changes', () => {
      const dynamic = useDynamicState({ price: 29.99 });
      dynamic('.price', s => `$${s.price}`);

      dynamic.setState({ price: 19.99 });

      const el = document.querySelector('.price');
      expect(el?.textContent).toBe('$19.99');
    });
  });

  describe('Error Handling', () => {
    it('should throw when selector not found', () => {
      const dynamic = useDynamicState({ price: 29.99 });

      expect(() => {
        dynamic('.nonexistent', s => `$${s.price}`);
      }).toThrow('Element not found');
    });
  });
});
```

---

Happy testing! 🧪✨
