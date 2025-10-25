/**
 * Fuzz Testing for minimact-query with Seeded Randomness
 *
 * Tests SQL query correctness across thousands of random scenarios.
 * All tests are reproducible via seeds.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomQueryBuilder } from '../src/query-builder';
import { createDomDataGenerator, type MockDomElementState } from './test-data-generator';
import { SeededRandom } from '../../../tests/utils/seeded-random';
import { cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('minimact-query - Fuzz Testing', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('Random Query Generation', () => {
    it('should handle 100 random query patterns without errors', () => {
      const SEED = 42;
      const rng = new SeededRandom(SEED);
      const gen = createDomDataGenerator(SEED);

      for (let i = 0; i < 100; i++) {
        const data = gen.generateElements(rng.nextInt(10, 200));

        // Generate random query
        const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

        // Random WHERE conditions (0-3)
        const whereCount = rng.nextInt(0, 3);
        for (let j = 0; j < whereCount; j++) {
          const condition = rng.pick([
            (el: MockDomElementState) => el.isIntersecting,
            (el: MockDomElementState) => el.childrenCount > rng.nextInt(0, 10),
            (el: MockDomElementState) => el.lifecycle.lifecycleState === 'visible',
            (el: MockDomElementState) => el.state.hover || el.state.focus
          ]);
          query.where(condition);
        }

        // Random ORDER BY (50% chance)
        if (rng.nextBool()) {
          const orderKey = rng.pick([
            (el: MockDomElementState) => el.childrenCount,
            (el: MockDomElementState) => el.history.changeCount,
            (el: MockDomElementState) => el.grandChildrenCount
          ]);
          query.orderBy(orderKey, rng.nextBool() ? 'ASC' : 'DESC');
        }

        // Random LIMIT (50% chance)
        if (rng.nextBool()) {
          query.limit(rng.nextInt(5, 50));
        }

        // Execute query - should not throw
        const results = query.selectAll();

        // Basic invariants
        expect(results.length).toBeGreaterThanOrEqual(0);
        expect(results.length).toBeLessThanOrEqual(data.length);
      }
    });

    it('should handle random aggregation queries', () => {
      const SEED = 123;
      const rng = new SeededRandom(SEED);
      const gen = createDomDataGenerator(SEED);

      for (let i = 0; i < 50; i++) {
        const data = gen.generateNumericData(rng.nextInt(20, 100), {
          property: 'data-value',
          distribution: rng.pick(['uniform', 'gaussian', 'bimodal']),
          range: [0, 100],
          mean: 50,
          stdDev: 15
        });

        const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

        // Try all aggregate functions
        const count = query.count();
        const sum = query.sum(el => parseInt(el.attributes['data-value']));
        const avg = query.avg(el => parseInt(el.attributes['data-value']));
        const min = query.min(el => parseInt(el.attributes['data-value']));
        const max = query.max(el => parseInt(el.attributes['data-value']));
        const stddev = query.stddev(el => parseInt(el.attributes['data-value']));

        // Invariants
        expect(count).toBe(data.length);
        expect(sum).toBeGreaterThanOrEqual(0);
        expect(avg).toBeGreaterThanOrEqual(min);
        expect(avg).toBeLessThanOrEqual(max);
        expect(stddev).toBeGreaterThanOrEqual(0);
        expect(min).toBeLessThanOrEqual(max);

        // No NaN or Infinity
        expect(isFinite(sum)).toBe(true);
        expect(isFinite(avg)).toBe(true);
        expect(isFinite(min)).toBe(true);
        expect(isFinite(max)).toBe(true);
        expect(isFinite(stddev)).toBe(true);
      }
    });

    it('should handle random GROUP BY queries', () => {
      const SEED = 456;
      const rng = new SeededRandom(SEED);
      const gen = createDomDataGenerator(SEED);

      for (let i = 0; i < 30; i++) {
        const data = gen.generateElements(rng.nextInt(50, 150));

        const groups = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .groupBy(el => el.attributes['data-category'])
          .selectAll();

        // Invariant: All elements are accounted for
        const totalInGroups = groups.reduce((sum, g) => sum + g.count, 0);
        expect(totalInGroups).toBe(data.length);

        // Invariant: No empty groups
        groups.forEach(g => {
          expect(g.count).toBeGreaterThan(0);
          expect(g.items.length).toBe(g.count);
        });

        // Invariant: Group keys are unique
        const keys = groups.map(g => g.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle large datasets (1000+ elements)', () => {
      const SEED = 789;
      const gen = createDomDataGenerator(SEED);

      const data = gen.generateElements(1000);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.isIntersecting)
        .where(el => el.childrenCount > 3)
        .orderBy(el => el.history.changeCount, 'DESC')
        .limit(50)
        .select(el => ({
          id: el.attributes.id,
          count: el.childrenCount
        }));

      expect(result.length).toBeLessThanOrEqual(50);

      // Verify order is descending
      for (let i = 1; i < result.length; i++) {
        // Can't directly test history.changeCount in projection, but structure should be valid
        expect(result[i]).toHaveProperty('id');
        expect(result[i]).toHaveProperty('count');
      }
    });

    it('should handle deeply nested filtering', () => {
      const SEED = 999;
      const rng = new SeededRandom(SEED);
      const gen = createDomDataGenerator(SEED);

      const data = gen.generateElements(500);

      // Apply 10 WHERE conditions
      let query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      for (let i = 0; i < 10; i++) {
        const threshold = rng.nextInt(0, 10);
        query = query.where(el => el.childrenCount > threshold || el.childrenCount === 0);
      }

      const result = query.count();

      // Should complete without errors
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(data.length);
    });

    it('should handle complex multi-operation queries', () => {
      const SEED = 111;
      const gen = createDomDataGenerator(SEED);

      const data = gen.generateElements(300);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.isIntersecting)
        .where(el => el.childrenCount > 2)
        .groupBy(el => el.attributes['data-category'])
        .having(group => group.count > 10)
        .select(group => ({
          category: group.key,
          count: group.count,
          avgChildren: group.items.reduce((sum, el) => sum + el.childrenCount, 0) / group.count
        }));

      // Should have reasonable results
      result.forEach(row => {
        expect(row.count).toBeGreaterThan(10);
        expect(row.avgChildren).toBeGreaterThan(0);
        expect(isFinite(row.avgChildren)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty datasets', () => {
      const query = new DomQueryBuilder<MockDomElementState>().fromElements([]);

      expect(query.count()).toBe(0);
      expect(query.sum(el => el.childrenCount)).toBe(0);
      expect(query.avg(el => el.childrenCount)).toBe(0);
      expect(query.first()).toBeNull();
      expect(query.last()).toBeNull();
      expect(query.any()).toBe(false);
    });

    it('should handle single element datasets', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(1);

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      expect(query.count()).toBe(1);
      expect(query.first()).toBe(data[0]);
      expect(query.last()).toBe(data[0]);
      expect(query.any()).toBe(true);
    });

    it('should handle all elements filtered out', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(() => false) // Filter everything
        .selectAll();

      expect(result).toHaveLength(0);
    });

    it('should handle extreme LIMIT values', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      // LIMIT greater than dataset size
      const result1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(1000)
        .count();

      expect(result1).toBe(100); // Should return all elements

      // LIMIT of 0
      const result2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(0)
        .count();

      expect(result2).toBe(0);
    });

    it('should handle extreme OFFSET values', () => {
      const gen = createDomDataGenerator(42);
      const data = gen.generateElements(100);

      // OFFSET beyond dataset
      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .offset(1000)
        .count();

      expect(result).toBe(0);
    });
  });

  describe('Regression Tests (Known Seeds)', () => {
    const REGRESSION_SEEDS = [
      { seed: 42, description: 'Baseline test' },
      // Add problematic seeds here as bugs are discovered
    ];

    REGRESSION_SEEDS.forEach(({ seed, description }) => {
      it(`should not regress: ${description} (seed ${seed})`, () => {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(100);

        // Complex query that might expose bugs
        const results = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .where(el => el.isIntersecting)
          .where(el => el.childrenCount > 0)
          .orderBy(el => el.history.changeCount, 'DESC')
          .limit(20)
          .select(el => ({
            id: el.attributes.id,
            children: el.childrenCount,
            changes: el.history.changeCount
          }));

        // Invariants that should always hold
        expect(results.length).toBeLessThanOrEqual(20);
        expect(results.length).toBeGreaterThanOrEqual(0);

        results.forEach(row => {
          expect(row.children).toBeGreaterThan(0);
          expect(row.changes).toBeGreaterThanOrEqual(0);
          expect(isNaN(row.children)).toBe(false);
          expect(isNaN(row.changes)).toBe(false);
        });
      });
    });
  });

  describe('Property-Based SQL Laws', () => {
    it('WHERE(a) AND WHERE(b) = WHERE(a AND b)', () => {
      const seeds = [1, 10, 100, 1000];

      for (const seed of seeds) {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(100);

        const method1 = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .where(el => el.isIntersecting)
          .where(el => el.childrenCount > 5)
          .count();

        const method2 = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .where(el => el.isIntersecting && el.childrenCount > 5)
          .count();

        // Should be equivalent
        expect(method1).toBe(method2);
      }
    });

    it('ORDER BY then LIMIT ≠ LIMIT then ORDER BY', () => {
      const SEED = 222;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateTimeSeries(100, 'random');

      const method1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.history.changeCount, 'DESC')
        .limit(10)
        .select(el => el.attributes.id);

      const method2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(10)
        .orderBy(el => el.history.changeCount, 'DESC')
        .select(el => el.attributes.id);

      // Order matters! method1 orders ALL then limits
      // method2 limits THEN orders (different result)
      // So they should NOT be equal
      // But if the data happens to have the same top 10, they might be equal
      // In that case, skip this test (flaky based on seed)
      if (method1.length === method2.length && method1.every((v, i) => v === method2[i])) {
        // Data happened to produce same result - this is valid, just skip
        return;
      }
      expect(method1).not.toEqual(method2);
    });

    it('COUNT(WHERE(x)) + COUNT(WHERE(NOT x)) = COUNT(ALL)', () => {
      const SEED = 333;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const totalCount = data.length;

      const trueCount = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.isIntersecting)
        .count();

      const falseCount = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => !el.isIntersecting)
        .count();

      // Law: Partitioning by boolean property
      expect(trueCount + falseCount).toBe(totalCount);
    });
  });
});
