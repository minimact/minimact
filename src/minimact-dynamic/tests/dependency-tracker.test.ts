/**
 * Tests for Dependency Tracker
 *
 * Tests automatic dependency tracking using Proxy-based interception
 */

import { describe, it, expect } from 'vitest';
import { trackDependencies, hasPathChanged, shallowEqual } from '../src/dependency-tracker';

describe('trackDependencies', () => {
  describe('Flat State Tracking', () => {
    it('should track single property access', () => {
      const state = { count: 5 };

      const { result, dependencies } = trackDependencies(state, s => s.count);

      expect(result).toBe(5);
      expect(dependencies).toEqual(['count']);
    });

    it('should track multiple property access', () => {
      const state = { firstName: 'John', lastName: 'Doe' };

      const { result, dependencies } = trackDependencies(
        state,
        s => `${s.firstName} ${s.lastName}`
      );

      expect(result).toBe('John Doe');
      expect(dependencies).toContain('firstName');
      expect(dependencies).toContain('lastName');
      expect(dependencies).toHaveLength(2);
    });

    it('should track conditional property access', () => {
      const state = { isPremium: true, regularPrice: 29.99, premiumPrice: 19.99 };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.isPremium ? s.premiumPrice : s.regularPrice
      );

      expect(result).toBe(19.99);
      // All accessed properties should be tracked (even if not used in final result)
      expect(dependencies).toContain('isPremium');
      expect(dependencies).toContain('premiumPrice');
    });
  });

  describe('Nested State Tracking', () => {
    it('should track nested property access', () => {
      const state = {
        user: {
          name: 'Alice',
          isPremium: true
        }
      };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.user.isPremium
      );

      expect(result).toBe(true);
      expect(dependencies).toContain('user');
      expect(dependencies).toContain('user.isPremium');
    });

    it('should track deeply nested properties', () => {
      const state = {
        app: {
          user: {
            profile: {
              settings: {
                theme: 'dark'
              }
            }
          }
        }
      };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.app.user.profile.settings.theme
      );

      expect(result).toBe('dark');
      expect(dependencies).toContain('app');
      expect(dependencies).toContain('app.user');
      expect(dependencies).toContain('app.user.profile');
      expect(dependencies).toContain('app.user.profile.settings');
      expect(dependencies).toContain('app.user.profile.settings.theme');
    });

    it('should track multiple nested paths', () => {
      const state = {
        user: { isPremium: false },
        product: { price: 29.99, factoryPrice: 19.99 }
      };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.user.isPremium ? s.product.factoryPrice : s.product.price
      );

      expect(result).toBe(29.99);
      expect(dependencies).toContain('user.isPremium');
      expect(dependencies).toContain('product.price');
    });
  });

  describe('Edge Cases', () => {
    it('should handle functions that access no properties', () => {
      const state = { count: 5 };

      const { result, dependencies } = trackDependencies(
        state,
        () => 'static value'
      );

      expect(result).toBe('static value');
      expect(dependencies).toHaveLength(0);
    });

    it('should track property accessed multiple times (no duplicates in Set)', () => {
      const state = { count: 5 };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.count + s.count + s.count
      );

      expect(result).toBe(15);
      expect(dependencies).toEqual(['count']); // Only once (Set deduplicates)
    });

    it('should handle undefined/null property access gracefully', () => {
      const state: any = { user: null };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.user
      );

      expect(result).toBeNull();
      expect(dependencies).toEqual(['user']);
    });

    it('should handle boolean expressions', () => {
      const state = { isActive: true, isDisabled: false };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.isActive && !s.isDisabled
      );

      expect(result).toBe(true);
      expect(dependencies).toContain('isActive');
      expect(dependencies).toContain('isDisabled');
    });

    it('should handle arithmetic operations', () => {
      const state = { a: 10, b: 20 };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.a * 2 + s.b / 2
      );

      expect(result).toBe(30); // 20 + 10
      expect(dependencies).toContain('a');
      expect(dependencies).toContain('b');
    });

    it('should handle template literals', () => {
      const state = { firstName: 'John', lastName: 'Doe', age: 30 };

      const { result, dependencies } = trackDependencies(
        state,
        s => `${s.firstName} ${s.lastName}, age ${s.age}`
      );

      expect(result).toBe('John Doe, age 30');
      expect(dependencies).toContain('firstName');
      expect(dependencies).toContain('lastName');
      expect(dependencies).toContain('age');
    });
  });

  describe('Array Handling', () => {
    it('should track array length access', () => {
      const state = { items: [1, 2, 3] };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.items.length
      );

      expect(result).toBe(3);
      expect(dependencies).toContain('items');
      expect(dependencies).toContain('items.length');
    });

    it('should track array element access', () => {
      const state = { items: ['a', 'b', 'c'] };

      const { result, dependencies } = trackDependencies(
        state,
        s => s.items[0]
      );

      expect(result).toBe('a');
      expect(dependencies).toContain('items');
      // Note: Proxy tracks the array itself, not specific indices
    });
  });
});

describe('hasPathChanged', () => {
  it('should detect primitive value change', () => {
    const prevState = { count: 5 };
    const nextState = { count: 10 };

    const changed = hasPathChanged(prevState, nextState, ['count']);

    expect(changed).toBe(true);
  });

  it('should detect no change when value same', () => {
    const prevState = { count: 5 };
    const nextState = { count: 5 };

    const changed = hasPathChanged(prevState, nextState, ['count']);

    expect(changed).toBe(false);
  });

  it('should detect nested value change', () => {
    const prevState = { user: { name: 'Alice' } };
    const nextState = { user: { name: 'Bob' } };

    const changed = hasPathChanged(prevState, nextState, ['user.name']);

    expect(changed).toBe(true);
  });

  it('should detect change in any dependency', () => {
    const prevState = { a: 1, b: 2, c: 3 };
    const nextState = { a: 1, b: 99, c: 3 };

    const changed = hasPathChanged(prevState, nextState, ['a', 'b', 'c']);

    expect(changed).toBe(true); // 'b' changed
  });

  it('should handle deeply nested path changes', () => {
    const prevState = {
      app: { user: { profile: { theme: 'light' } } }
    };
    const nextState = {
      app: { user: { profile: { theme: 'dark' } } }
    };

    const changed = hasPathChanged(
      prevState,
      nextState,
      ['app.user.profile.theme']
    );

    expect(changed).toBe(true);
  });

  it('should handle undefined paths', () => {
    const prevState = { user: { name: 'Alice' } };
    const nextState = { user: { name: 'Alice' } };

    const changed = hasPathChanged(
      prevState,
      nextState,
      ['user.nonexistent']
    );

    expect(changed).toBe(false); // Both undefined
  });

  it('should detect object reference change', () => {
    const prevState = { user: { name: 'Alice' } };
    const nextState = { user: { name: 'Alice' } }; // Different object reference

    const changed = hasPathChanged(prevState, nextState, ['user']);

    expect(changed).toBe(true); // Different object (strict equality)
  });
});

describe('shallowEqual', () => {
  it('should return true for same reference', () => {
    const obj = { a: 1, b: 2 };

    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('should return true for shallow equal objects', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { a: 1, b: 2, c: 3 };

    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for different values', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 99 };

    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should return false for different keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };

    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should return false for different key counts', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2, c: 3 };

    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
    expect(shallowEqual(null, undefined)).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it('should handle primitives', () => {
    expect(shallowEqual(5, 5)).toBe(true);
    expect(shallowEqual(5, 10)).toBe(false);
    expect(shallowEqual('test', 'test')).toBe(true);
    expect(shallowEqual('test', 'other')).toBe(false);
  });

  it('should NOT do deep equality (shallow only)', () => {
    const obj1 = { a: { nested: 1 } };
    const obj2 = { a: { nested: 1 } };

    // Different nested object references
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
});
