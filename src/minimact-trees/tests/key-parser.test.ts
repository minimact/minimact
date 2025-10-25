/**
 * Tests for decision tree key parsing
 *
 * Key format: stateName:Value
 * Examples:
 * - role:Admin → role === 'admin'
 * - count:5 → count === 5
 * - price:19.99 → price === 19.99
 * - isActive:True → isActive === true
 */

import { describe, it, expect } from 'vitest';
import { parseStateKey as parseKey } from '../src/parser';

describe('parseKey', () => {
  describe('String Values', () => {
    it('should parse role:Admin as role === "admin"', () => {
      const result = parseKey('role:Admin');
      expect(result).toEqual({
        stateName: 'role',
        expectedValue: 'admin',
        valueType: 'string'
      });
    });

    it('should parse status:Pending as status === "pending"', () => {
      const result = parseKey('status:Pending');
      expect(result).toEqual({
        stateName: 'status',
        expectedValue: 'pending',
        valueType: 'string'
      });
    });

    it('should parse tier:Gold as tier === "gold"', () => {
      const result = parseKey('tier:Gold');
      expect(result).toEqual({
        stateName: 'tier',
        expectedValue: 'gold',
        valueType: 'string'
      });
    });

    it('should convert PascalCase to kebab-case', () => {
      const result = parseKey('paymentMethod:CreditCard');
      expect(result).toEqual({
        stateName: 'paymentMethod',
        expectedValue: 'credit-card',
        valueType: 'string'
      });
    });

    it('should handle multi-word PascalCase values', () => {
      const result = parseKey('status:OrderStatusPending');
      expect(result).toEqual({
        stateName: 'status',
        expectedValue: 'order-status-pending',
        valueType: 'string'
      });
    });
  });

  describe('Number Values', () => {
    it('should parse count:5 as count === 5', () => {
      const result = parseKey('count:5');
      expect(result).toEqual({
        stateName: 'count',
        expectedValue: 5,
        valueType: 'number'
      });
    });

    it('should parse quantity:10 as quantity === 10', () => {
      const result = parseKey('quantity:10');
      expect(result).toEqual({
        stateName: 'quantity',
        expectedValue: 10,
        valueType: 'number'
      });
    });

    it('should parse level:100 as level === 100', () => {
      const result = parseKey('level:100');
      expect(result).toEqual({
        stateName: 'level',
        expectedValue: 100,
        valueType: 'number'
      });
    });
  });

  describe('Float Values', () => {
    it('should parse price:19.99 as price === 19.99', () => {
      const result = parseKey('price:19.99');
      expect(result).toEqual({
        stateName: 'price',
        expectedValue: 19.99,
        valueType: 'number'
      });
    });

    it('should parse rate:2.5 as rate === 2.5', () => {
      const result = parseKey('rate:2.5');
      expect(result).toEqual({
        stateName: 'rate',
        expectedValue: 2.5,
        valueType: 'number'
      });
    });

    it('should parse tax:0.08875 as tax === 0.08875', () => {
      const result = parseKey('tax:0.08875');
      expect(result).toEqual({
        stateName: 'tax',
        expectedValue: 0.08875,
        valueType: 'number'
      });
    });
  });

  describe('Boolean Values', () => {
    it('should parse isActive:True as isActive === true', () => {
      const result = parseKey('isActive:True');
      expect(result).toEqual({
        stateName: 'isActive',
        expectedValue: true,
        valueType: 'boolean'
      });
    });

    it('should parse isActive:False as isActive === false', () => {
      const result = parseKey('isActive:False');
      expect(result).toEqual({
        stateName: 'isActive',
        expectedValue: false,
        valueType: 'boolean'
      });
    });

    it('should parse isLocked:True as isLocked === true', () => {
      const result = parseKey('isLocked:True');
      expect(result).toEqual({
        stateName: 'isLocked',
        expectedValue: true,
        valueType: 'boolean'
      });
    });

    it('should parse isLocked:False as isLocked === false', () => {
      const result = parseKey('isLocked:False');
      expect(result).toEqual({
        stateName: 'isLocked',
        expectedValue: false,
        valueType: 'boolean'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle camelCase state names', () => {
      const result = parseKey('userRole:Admin');
      expect(result).toEqual({
        stateName: 'userRole',
        expectedValue: 'admin',
        valueType: 'string'
      });
    });

    it('should handle single letter values', () => {
      const result = parseKey('grade:A');
      expect(result).toEqual({
        stateName: 'grade',
        expectedValue: 'a',
        valueType: 'string'
      });
    });

    it('should handle two-letter uppercase values', () => {
      const result = parseKey('state:CA');
      expect(result).toEqual({
        stateName: 'state',
        expectedValue: 'ca',
        valueType: 'string'
      });
    });

    it('should handle zero values', () => {
      const result = parseKey('count:0');
      expect(result).toEqual({
        stateName: 'count',
        expectedValue: 0,
        valueType: 'number'
      });
    });

    it('should handle negative numbers', () => {
      const result = parseKey('balance:-50');
      expect(result).toEqual({
        stateName: 'balance',
        expectedValue: -50,
        valueType: 'number'
      });
    });

    it('should handle negative floats', () => {
      const result = parseKey('temperature:-12.5');
      expect(result).toEqual({
        stateName: 'temperature',
        expectedValue: -12.5,
        valueType: 'number'
      });
    });
  });

  describe('Escaped Colons', () => {
    it('should handle escaped colon in value', () => {
      const result = parseKey('message:Error\\:Failed');
      expect(result).toEqual({
        stateName: 'message',
        expectedValue: 'error:failed',
        valueType: 'string'
      });
    });

    it('should handle multiple escaped colons', () => {
      const result = parseKey('url:http\\://example.com\\:8080');
      expect(result).toEqual({
        stateName: 'url',
        expectedValue: 'http://example.com:8080',
        valueType: 'string'
      });
    });
  });

  describe('Invalid Keys', () => {
    it('should throw on empty key', () => {
      expect(() => parseKey('')).toThrow('key cannot be empty');
    });

    it('should throw on key with no colon', () => {
      expect(() => parseKey('role')).toThrow('invalid key format');
    });

    it('should throw on key with no value', () => {
      expect(() => parseKey('role:')).toThrow('value cannot be empty');
    });

    it('should throw on key starting with uppercase', () => {
      expect(() => parseKey('Role:Admin')).toThrow('must start with lowercase letter');
    });

    it('should throw on key starting with number', () => {
      expect(() => parseKey('123:value')).toThrow('must start with lowercase letter');
    });

    it('should throw on multiple unescaped colons', () => {
      expect(() => parseKey('role:admin:extra')).toThrow('invalid key format');
    });
  });
});
