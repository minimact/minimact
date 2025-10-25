/**
 * Query Builder Unit Tests
 *
 * Tests core query building functionality with specific scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomQueryBuilder } from '../src/query-builder';
import { createDomDataGenerator, type MockDomElementState } from './test-data-generator';
import { cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('minimact-query - Query Builder', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('Basic Querying', () => {
    it('should query elements with FROM', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .count();

      expect(result).toBe(10);
    });

    it('should filter with WHERE', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      // Set specific values for testing
      data.slice(0, 30).forEach(el => el.childrenCount = 10);
      data.slice(30).forEach(el => el.childrenCount = 3);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.childrenCount === 10)
        .count();

      expect(result).toBe(30);
    });

    it('should chain multiple WHERE conditions (AND)', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.isIntersecting)
        .where(el => el.childrenCount > 5)
        .where(el => el.lifecycle.lifecycleState === 'visible')
        .selectAll();

      // All conditions must be true
      result.forEach(el => {
        expect(el.isIntersecting).toBe(true);
        expect(el.childrenCount).toBeGreaterThan(5);
        expect(el.lifecycle.lifecycleState).toBe('visible');
      });
    });
  });

  describe('Shorthand WHERE Methods', () => {
    it('whereEquals should filter by equality', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(50);

      // Set specific categories
      data.slice(0, 20).forEach(el => el.attributes['data-category'] = 'electronics');

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .whereEquals('attributes.data-category', 'electronics')
        .count();

      expect(result).toBe(20);
    });

    it('whereGreaterThan should filter numerically', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.childrenCount = i);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .whereGreaterThan('childrenCount', 50)
        .count();

      expect(result).toBe(49); // 51-99 inclusive
    });

    it('whereLessThan should filter numerically', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.childrenCount = i);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .whereLessThan('childrenCount', 10)
        .count();

      expect(result).toBe(10); // 0-9 inclusive
    });

    it('whereIn should filter by array membership', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .whereIn('lifecycle.lifecycleState', ['visible', 'entering'])
        .selectAll();

      result.forEach(el => {
        expect(['visible', 'entering']).toContain(el.lifecycle.lifecycleState);
      });
    });

    it('whereBetween should filter by range', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.childrenCount = i);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .whereBetween('childrenCount', 25, 75)
        .select(el => el.childrenCount);

      result.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(25);
        expect(count).toBeLessThanOrEqual(75);
      });
    });
  });

  describe('ORDER BY', () => {
    it('should sort ascending', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateTimeSeries(50, 'random');

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.history.changeCount, 'ASC')
        .select(el => el.history.changeCount);

      // Verify ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });

    it('should sort descending', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateTimeSeries(50, 'random');

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.history.changeCount, 'DESC')
        .select(el => el.history.changeCount);

      // Verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeLessThanOrEqual(result[i - 1]);
      }
    });

    it('should support multiple ORDER BY criteria', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(50);

      // Set up data with same category but different statuses
      data.forEach((el, i) => {
        el.attributes['data-category'] = i < 25 ? 'electronics' : 'books';
        el.attributes['data-priority'] = String(i % 5);
      });

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.attributes['data-category'], 'ASC')
        .orderBy(el => el.attributes['data-priority'], 'DESC')
        .select(el => ({
          category: el.attributes['data-category'],
          priority: el.attributes['data-priority']
        }));

      // Verify first by category, then by priority within category
      for (let i = 1; i < result.length; i++) {
        if (result[i].category === result[i - 1].category) {
          expect(result[i].priority <= result[i - 1].priority).toBe(true);
        }
      }
    });
  });

  describe('LIMIT and OFFSET', () => {
    it('should limit results', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(10)
        .count();

      expect(result).toBe(10);
    });

    it('should offset results', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.attributes.id = `el-${i}`);

      const all = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .select(el => el.attributes.id);

      const offset20 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .offset(20)
        .first();

      expect(offset20?.attributes.id).toBe('el-20');
    });

    it('should support pagination with LIMIT and OFFSET', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.attributes.id = `el-${i}`);

      const page1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(10, 0)
        .select(el => el.attributes.id);

      const page2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(10, 10)
        .select(el => el.attributes.id);

      // Pages should not overlap
      const overlap = page1.filter(id => page2.includes(id));
      expect(overlap).toHaveLength(0);

      // Pages should be consecutive
      expect(page1[page1.length - 1]).toBe('el-9');
      expect(page2[0]).toBe('el-10');
    });
  });

  describe('Aggregate Functions', () => {
    it('should COUNT elements', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(73);

      const count = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .count();

      expect(count).toBe(73);
    });

    it('should SUM numeric values', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      data.forEach((el, i) => el.childrenCount = i + 1); // 1, 2, 3, ..., 10

      const sum = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .sum(el => el.childrenCount);

      expect(sum).toBe(55); // 1+2+3+...+10 = 55
    });

    it('should calculate AVG', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(5);

      data.forEach((el, i) => el.childrenCount = (i + 1) * 10); // 10, 20, 30, 40, 50

      const avg = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .avg(el => el.childrenCount);

      expect(avg).toBe(30); // (10+20+30+40+50)/5 = 30
    });

    it('should find MIN', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      data.forEach((el, i) => el.childrenCount = i * 5);

      const min = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .min(el => el.childrenCount);

      expect(min).toBe(0);
    });

    it('should find MAX', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      data.forEach((el, i) => el.childrenCount = i * 5);

      const max = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .max(el => el.childrenCount);

      expect(max).toBe(45); // 9 * 5
    });

    it('should calculate STDDEV', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(5);

      data.forEach(() => el => el.childrenCount = 10); // All same value

      const stddev = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .stddev(el => el.childrenCount);

      expect(stddev).toBe(0); // No variation = 0 stddev
    });
  });

  describe('GROUP BY', () => {
    it('should group by category', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const groups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-category'])
        .selectAll();

      // Each group should have a key and items
      groups.forEach(group => {
        expect(group).toHaveProperty('key');
        expect(group).toHaveProperty('items');
        expect(group).toHaveProperty('count');
        expect(group.count).toBe(group.items.length);
      });
    });

    it('should filter groups with HAVING', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const largeGroups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-category'])
        .having(group => group.count > 15)
        .selectAll();

      // All groups should have > 15 items
      largeGroups.forEach(group => {
        expect(group.count).toBeGreaterThan(15);
      });
    });
  });

  describe('Utility Functions', () => {
    it('any() should check if results exist', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const hasElements = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .any();

      expect(hasElements).toBe(true);

      const isEmpty = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(() => false)
        .any();

      expect(isEmpty).toBe(false);
    });

    it('all() should check if all match condition', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      data.forEach(el => el.exists = true);

      const allExist = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .all(el => el.exists);

      expect(allExist).toBe(true);
    });

    it('find() should return first match', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data[42].attributes.id = 'special-id';

      const found = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .find(el => el.attributes.id === 'special-id');

      expect(found?.attributes.id).toBe('special-id');
    });

    it('first() should return first element', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.attributes.id = `el-${i}`);

      const first = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .first();

      expect(first?.attributes.id).toBe('el-0');
    });

    it('last() should return last element', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      data.forEach((el, i) => el.attributes.id = `el-${i}`);

      const last = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .last();

      expect(last?.attributes.id).toBe('el-99');
    });
  });

  describe('SELECT Projection', () => {
    it('should project to custom shape', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      const projected = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .select(el => ({
          id: el.attributes.id,
          category: el.attributes['data-category'],
          count: el.childrenCount
        }));

      projected.forEach(row => {
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('category');
        expect(row).toHaveProperty('count');
      });
    });

    it('selectAll() should return raw results', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(10);

      const results = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .selectAll();

      expect(results).toEqual(data);
    });
  });
});
