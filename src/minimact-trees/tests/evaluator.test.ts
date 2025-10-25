/**
 * Tests for decision tree evaluation
 *
 * Tests tree traversal, matching, and result extraction
 */

import { describe, it, expect } from 'vitest';
import { evaluateTree } from '../src/evaluator';

describe('evaluateTree', () => {
  describe('Simple Trees (1 Level)', () => {
    it('should evaluate single-level tree with string match', () => {
      const tree = {
        'role:Admin': 0,
        'role:Basic': 10
      };

      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(0);
    });

    it('should evaluate single-level tree with number match', () => {
      const tree = {
        'count:1': 'one',
        'count:5': 'five',
        'count:10': 'ten'
      };

      const result = evaluateTree(tree, { count: 5 });
      expect(result).toBe('five');
    });

    it('should evaluate single-level tree with boolean match', () => {
      const tree = {
        'isActive:True': 'enabled',
        'isActive:False': 'disabled'
      };

      const result = evaluateTree(tree, { isActive: true });
      expect(result).toBe('enabled');
    });
  });

  describe('Nested Trees (2+ Levels)', () => {
    it('should evaluate 2-level tree', () => {
      const tree = {
        'tier:Gold': {
          'quantity:1': 0,
          'quantity:10': 0
        },
        'tier:Silver': {
          'quantity:1': 5,
          'quantity:10': 0
        }
      };

      const result = evaluateTree(tree, {
        tier: 'gold',
        quantity: 10
      });

      expect(result).toBe(0);
    });

    it('should evaluate 3-level tree', () => {
      const tree = {
        'country:US': {
          'state:CA': {
            'category:Electronics': 0.0925,
            'category:Food': 0
          },
          'state:NY': {
            'category:Electronics': 0.08875
          }
        }
      };

      const result = evaluateTree(tree, {
        country: 'us',
        state: 'ca',
        category: 'electronics'
      });

      expect(result).toBe(0.0925);
    });

    it('should evaluate deeply nested tree (5 levels)', () => {
      const tree = {
        'level1:A': {
          'level2:B': {
            'level3:C': {
              'level4:D': {
                'level5:E': 'deep-value'
              }
            }
          }
        }
      };

      const result = evaluateTree(tree, {
        level1: 'a',
        level2: 'b',
        level3: 'c',
        level4: 'd',
        level5: 'e'
      });

      expect(result).toBe('deep-value');
    });
  });

  describe('Return Value Types', () => {
    it('should return number values', () => {
      const tree = { 'role:Admin': 42 };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(42);
    });

    it('should return string values', () => {
      const tree = { 'role:Admin': 'administrator' };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe('administrator');
    });

    it('should return boolean values', () => {
      const tree = { 'role:Admin': true };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(true);
    });

    it('should return object values', () => {
      const obj = { name: 'Test', value: 123 };
      const tree = { 'role:Admin': obj };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toEqual(obj);
    });

    it('should return array values', () => {
      const arr = [1, 2, 3];
      const tree = { 'role:Admin': arr };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toEqual(arr);
    });

    it('should return null values', () => {
      const tree = { 'role:Admin': null };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(null);
    });
  });

  describe('No Match Scenarios', () => {
    it('should return undefined when no match and no default', () => {
      const tree = {
        'role:Admin': 0,
        'role:Basic': 10
      };

      const result = evaluateTree(tree, { role: 'unknown' });
      expect(result).toBeUndefined();
    });

    it('should return default value when no match', () => {
      const tree = {
        'role:Admin': 0,
        'role:Basic': 10
      };

      const result = evaluateTree(
        tree,
        { role: 'unknown' },
        { defaultValue: 999 }
      );

      expect(result).toBe(999);
    });

    it('should throw in strict mode when no match', () => {
      const tree = {
        'role:Admin': 0,
        'role:Basic': 10
      };

      expect(() => {
        evaluateTree(
          tree,
          { role: 'unknown' },
          { strictMode: true }
        );
      }).toThrow('No matching path found');
    });
  });

  describe('Partial Matches', () => {
    it('should handle partial context (missing nested keys)', () => {
      const tree = {
        'tier:Gold': {
          'quantity:1': 0,
          'quantity:10': 0
        },
        'tier:Silver': 5
      };

      // Context matches 'tier:Silver' but doesn't have 'quantity'
      const result = evaluateTree(tree, { tier: 'silver' });
      expect(result).toBe(5);
    });

    it('should return undefined if partial match leads to object', () => {
      const tree = {
        'tier:Gold': {
          'quantity:1': 0,
          'quantity:10': 0
        }
      };

      // Matches 'tier:Gold' but no 'quantity' key provided
      const result = evaluateTree(tree, { tier: 'gold' });
      expect(result).toBeUndefined();
    });
  });

  describe('Context Priority', () => {
    it('should use first matching key when multiple keys match', () => {
      const tree = {
        'role:Admin': 'admin-value',
        'tier:Gold': 'gold-value'
      };

      // Context has both 'role' and 'tier'
      const result = evaluateTree(tree, {
        role: 'admin',
        tier: 'gold'
      });

      // Should match first key in tree (role:Admin)
      expect(result).toBe('admin-value');
    });
  });

  describe('Real-World Examples', () => {
    it('should calculate shipping cost', () => {
      const tree = {
        'tier:Gold': {
          'quantity:1': 0,
          'quantity:10': 0
        },
        'tier:Silver': {
          'quantity:1': 5,
          'quantity:10': 0
        },
        'tier:Bronze': {
          'quantity:1': 10,
          'quantity:5': 8,
          'quantity:10': 5
        }
      };

      expect(evaluateTree(tree, { tier: 'gold', quantity: 1 })).toBe(0);
      expect(evaluateTree(tree, { tier: 'silver', quantity: 1 })).toBe(5);
      expect(evaluateTree(tree, { tier: 'bronze', quantity: 5 })).toBe(8);
    });

    it('should calculate tax rate', () => {
      const tree = {
        'country:US': {
          'state:CA': {
            'category:Electronics': 0.0925,
            'category:Food': 0
          },
          'state:NY': {
            'category:Electronics': 0.08875
          }
        },
        'country:CA': {
          'category:Electronics': 0.13,
          'category:Food': 0.05
        }
      };

      expect(
        evaluateTree(tree, {
          country: 'US',
          state: 'CA',
          category: 'electronics'
        })
      ).toBe(0.0925);

      expect(
        evaluateTree(tree, {
          country: 'ca',
          category: 'food'
        })
      ).toBe(0.05);
    });

    it('should determine workflow action', () => {
      const tree = {
        'orderStatus:Pending': {
          'paymentMethod:CreditCard': {
            'inventory:InStock': 'authorize-payment',
            'inventory:OutOfStock': 'notify-backorder'
          },
          'paymentMethod:Paypal': 'redirect-paypal'
        },
        'orderStatus:Confirmed': {
          'inventory:InStock': 'prepare-shipment',
          'inventory:OutOfStock': 'notify-delay'
        },
        'orderStatus:Shipped': 'send-tracking-email'
      };

      expect(
        evaluateTree(tree, {
          orderStatus: 'pending',
          paymentMethod: 'credit-card',
          inventory: 'in-stock'
        })
      ).toBe('authorize-payment');

      expect(
        evaluateTree(tree, {
          orderStatus: 'shipped'
        })
      ).toBe('send-tracking-email');
    });
  });
});
