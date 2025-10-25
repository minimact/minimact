/**
 * Tests for decision tree key parsing
 *
 * Key format: stateNameExpectedValue
 * Examples:
 * - roleAdmin → role === 'admin'
 * - count5 → count === 5
 * - price19.99 → price === 19.99
 * - isActiveTrue → isActive === true
 */

import { describe, it, expect } from 'vitest';
import { parseStateKey as parseKey } from '../src/parser';

describe('parseKey', () => {
  describe('String Values', () => {
    it('should parse roleAdmin as role === "admin"', () => {
      const result = parseKey('roleAdmin');
      expect(result).toEqual({
        stateName: 'role',
        expectedValue: 'admin',
        valueType: 'string'
      });
    });

    it('should parse statusPending as status === "pending"', () => {
      const result = parseKey('statusPending');
      expect(result).toEqual({
        stateName: 'status',
        expectedValue: 'pending',
        valueType: 'string'
      });
    });

    it('should parse tierGold as tier === "gold"', () => {
      const result = parseKey('tierGold');
      expect(result).toEqual({
        stateName: 'tier',
        expectedValue: 'gold',
        valueType: 'string'
      });
    });

    it('should handle hyphenated values like paymentMethodCredit-card', () => {
      const result = parseKey('paymentMethodCredit-card');
      expect(result).toEqual({
        stateName: 'paymentMethod',
        expectedValue: 'credit-card',
        valueType: 'string'
      });
    });
  });

  describe('Number Values', () => {
    it('should parse count5 as count === 5', () => {
      const result = parseKey('count5');
      expect(result).toEqual({
        stateName: 'count',
        expectedValue: 5,
        valueType: 'number'
      });
    });

    it('should parse quantity10 as quantity === 10', () => {
      const result = parseKey('quantity10');
      expect(result).toEqual({
        stateName: 'quantity',
        expectedValue: 10,
        valueType: 'number'
      });
    });

    it('should parse level100 as level === 100', () => {
      const result = parseKey('level100');
      expect(result).toEqual({
        stateName: 'level',
        expectedValue: 100,
        valueType: 'number'
      });
    });
  });

  describe('Float Values', () => {
    it('should parse price19.99 as price === 19.99', () => {
      const result = parseKey('price19.99');
      expect(result).toEqual({
        stateName: 'price',
        expectedValue: 19.99,
        valueType: 'number'
      });
    });

    it('should parse rate2.5 as rate === 2.5', () => {
      const result = parseKey('rate2.5');
      expect(result).toEqual({
        stateName: 'rate',
        expectedValue: 2.5,
        valueType: 'number'
      });
    });

    it('should parse tax0.08875 as tax === 0.08875', () => {
      const result = parseKey('tax0.08875');
      expect(result).toEqual({
        stateName: 'tax',
        expectedValue: 0.08875,
        valueType: 'number'
      });
    });
  });

  describe('Boolean Values', () => {
    it('should parse isActiveTrue as isActive === true', () => {
      const result = parseKey('isActiveTrue');
      expect(result).toEqual({
        stateName: 'isActive',
        expectedValue: true,
        valueType: 'boolean'
      });
    });

    it('should parse isActiveFalse as isActive === false', () => {
      const result = parseKey('isActiveFalse');
      expect(result).toEqual({
        stateName: 'isActive',
        expectedValue: false,
        valueType: 'boolean'
      });
    });

    it('should parse isLockedTrue as isLocked === true', () => {
      const result = parseKey('isLockedTrue');
      expect(result).toEqual({
        stateName: 'isLocked',
        expectedValue: true,
        valueType: 'boolean'
      });
    });

    it('should parse isLockedFalse as isLocked === false', () => {
      const result = parseKey('isLockedFalse');
      expect(result).toEqual({
        stateName: 'isLocked',
        expectedValue: false,
        valueType: 'boolean'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle camelCase state names', () => {
      const result = parseKey('userRoleAdmin');
      expect(result).toEqual({
        stateName: 'userRole',
        expectedValue: 'admin',
        valueType: 'string'
      });
    });

    it('should handle single letter values', () => {
      const result = parseKey('gradeA');
      expect(result).toEqual({
        stateName: 'grade',
        expectedValue: 'A',
        valueType: 'string'
      });
    });

    it('should handle zero values', () => {
      const result = parseKey('count0');
      expect(result).toEqual({
        stateName: 'count',
        expectedValue: 0,
        valueType: 'number'
      });
    });

    it('should handle negative numbers', () => {
      const result = parseKey('balance-50');
      expect(result).toEqual({
        stateName: 'balance',
        expectedValue: -50,
        valueType: 'number'
      });
    });
  });

  describe('Invalid Keys', () => {
    it('should throw on empty key', () => {
      expect(() => parseKey('')).toThrow();
    });

    it('should throw on key with no value', () => {
      expect(() => parseKey('role')).toThrow();
    });

    it('should throw on invalid format', () => {
      expect(() => parseKey('123invalid')).toThrow();
    });
  });
});
