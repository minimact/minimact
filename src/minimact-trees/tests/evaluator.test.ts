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
        roleAdmin: 0,
        roleBasic: 10
      };

      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(0);
    });

    it('should evaluate single-level tree with number match', () => {
      const tree = {
        count1: 'one',
        count5: 'five',
        count10: 'ten'
      };

      const result = evaluateTree(tree, { count: 5 });
      expect(result).toBe('five');
    });

    it('should evaluate single-level tree with boolean match', () => {
      const tree = {
        isActiveTrue: 'enabled',
        isActiveFalse: 'disabled'
      };

      const result = evaluateTree(tree, { isActive: true });
      expect(result).toBe('enabled');
    });
  });

  describe('Nested Trees (2+ Levels)', () => {
    it('should evaluate 2-level tree', () => {
      const tree = {
        tierGold: {
          quantity1: 0,
          quantity10: 0
        },
        tierSilver: {
          quantity1: 5,
          quantity10: 0
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
        countryUS: {
          stateCA: {
            categoryElectronics: 0.0925,
            categoryFood: 0
          },
          stateNY: {
            categoryElectronics: 0.08875
          }
        }
      };

      const result = evaluateTree(tree, {
        country: 'US',
        state: 'CA',
        category: 'electronics'
      });

      expect(result).toBe(0.0925);
    });

    it('should evaluate deeply nested tree (5 levels)', () => {
      const tree = {
        level1A: {
          level2B: {
            level3C: {
              level4D: {
                level5E: 'deep-value'
              }
            }
          }
        }
      };

      const result = evaluateTree(tree, {
        level1: 'A',
        level2: 'B',
        level3: 'C',
        level4: 'D',
        level5: 'E'
      });

      expect(result).toBe('deep-value');
    });
  });

  describe('Return Value Types', () => {
    it('should return number values', () => {
      const tree = { roleAdmin: 42 };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(42);
    });

    it('should return string values', () => {
      const tree = { roleAdmin: 'administrator' };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe('administrator');
    });

    it('should return boolean values', () => {
      const tree = { roleAdmin: true };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(true);
    });

    it('should return object values', () => {
      const obj = { name: 'Test', value: 123 };
      const tree = { roleAdmin: obj };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toEqual(obj);
    });

    it('should return array values', () => {
      const arr = [1, 2, 3];
      const tree = { roleAdmin: arr };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toEqual(arr);
    });

    it('should return null values', () => {
      const tree = { roleAdmin: null };
      const result = evaluateTree(tree, { role: 'admin' });
      expect(result).toBe(null);
    });
  });

  describe('No Match Scenarios', () => {
    it('should return undefined when no match and no default', () => {
      const tree = {
        roleAdmin: 0,
        roleBasic: 10
      };

      const result = evaluateTree(tree, { role: 'unknown' });
      expect(result).toBeUndefined();
    });

    it('should return default value when no match', () => {
      const tree = {
        roleAdmin: 0,
        roleBasic: 10
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
        roleAdmin: 0,
        roleBasic: 10
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
        tierGold: {
          quantity1: 0,
          quantity10: 0
        },
        tierSilver: 5
      };

      // Context matches 'tierSilver' but doesn't have 'quantity'
      const result = evaluateTree(tree, { tier: 'silver' });
      expect(result).toBe(5);
    });

    it('should return undefined if partial match leads to object', () => {
      const tree = {
        tierGold: {
          quantity1: 0,
          quantity10: 0
        }
      };

      // Matches 'tierGold' but no 'quantity' key provided
      const result = evaluateTree(tree, { tier: 'gold' });
      expect(result).toBeUndefined();
    });
  });

  describe('Context Priority', () => {
    it('should use first matching key when multiple keys match', () => {
      const tree = {
        roleAdmin: 'admin-value',
        tierGold: 'gold-value'
      };

      // Context has both 'role' and 'tier'
      const result = evaluateTree(tree, {
        role: 'admin',
        tier: 'gold'
      });

      // Should match first key in tree (roleAdmin)
      expect(result).toBe('admin-value');
    });
  });

  describe('Real-World Examples', () => {
    it('should calculate shipping cost', () => {
      const tree = {
        tierGold: {
          quantity1: 0,
          quantity10: 0
        },
        tierSilver: {
          quantity1: 5,
          quantity10: 0
        },
        tierBronze: {
          quantity1: 10,
          quantity5: 8,
          quantity10: 5
        }
      };

      expect(evaluateTree(tree, { tier: 'gold', quantity: 1 })).toBe(0);
      expect(evaluateTree(tree, { tier: 'silver', quantity: 1 })).toBe(5);
      expect(evaluateTree(tree, { tier: 'bronze', quantity: 5 })).toBe(8);
    });

    it('should calculate tax rate', () => {
      const tree = {
        countryUS: {
          stateCA: {
            categoryElectronics: 0.0925,
            categoryFood: 0
          },
          stateNY: {
            categoryElectronics: 0.08875
          }
        },
        countryCA: {
          categoryElectronics: 0.13,
          categoryFood: 0.05
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
          country: 'CA',
          category: 'food'
        })
      ).toBe(0.05);
    });

    it('should determine workflow action', () => {
      const tree = {
        orderStatusPending: {
          'paymentMethodCredit-card': {
            'inventoryIn-stock': 'authorize-payment',
            'inventoryOut-of-stock': 'notify-backorder'
          },
          paymentMethodPaypal: 'redirect-paypal'
        },
        orderStatusConfirmed: {
          'inventoryIn-stock': 'prepare-shipment',
          'inventoryOut-of-stock': 'notify-delay'
        },
        orderStatusShipped: 'send-tracking-email'
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
