/**
 * SQL Invariant Tests for minimact-query
 *
 * Tests fundamental SQL properties that should ALWAYS hold true,
 * regardless of the data. Uses seeded random data generation for
 * comprehensive coverage.
 *
 * SQL Invariants tested:
 * - WHERE idempotence
 * - ORDER BY stability
 * - LIMIT/OFFSET correctness
 * - Aggregate function properties
 * - Set operation laws (UNION, INTERSECT, EXCEPT)
 * - JOIN properties
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomQueryBuilder } from '../src/query-builder';
import { createDomDataGenerator, type MockDomElementState } from './test-data-generator';
import { cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('minimact-query - SQL Invariants', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('WHERE Invariants', () => {
    it('WHERE is idempotent (applying same filter twice = applying once)', () => {
      const SEED = 42;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const query1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.childrenCount > 5);

      const query2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.childrenCount > 5)
        .where(el => el.childrenCount > 5); // Same filter twice

      expect(query1.count()).toBe(query2.count());
      expect(query1.selectAll()).toEqual(query2.selectAll());
    });

    it('WHERE with contradictory conditions returns empty set', () => {
      const SEED = 123;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => el.childrenCount > 10)
        .where(el => el.childrenCount < 5) // Contradiction!
        .count();

      expect(result).toBe(0);
    });

    it('WHERE count ≤ original count', () => {
      const seeds = [1, 10, 100, 1000, 10000];

      for (const seed of seeds) {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(100);

        const originalCount = data.length;
        const filteredCount = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .where(el => el.isIntersecting)
          .count();

        // Invariant: Filtering never increases count
        expect(filteredCount).toBeLessThanOrEqual(originalCount);
      }
    });

    it('WHERE with tautology returns all elements', () => {
      const SEED = 456;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(75);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => true) // Always true
        .count();

      expect(result).toBe(data.length);
    });
  });

  describe('ORDER BY Invariants', () => {
    it('ORDER BY does not change count', () => {
      const seeds = [42, 123, 456, 789];

      for (const seed of seeds) {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(100);

        const originalCount = data.length;
        const sortedCount = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .orderBy(el => el.childrenCount, 'ASC')
          .count();

        // Invariant: Sorting doesn't change count
        expect(sortedCount).toBe(originalCount);
      }
    });

    it('ORDER BY ASC then DESC returns reverse order', () => {
      const SEED = 999;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const asc = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.childrenCount, 'ASC')
        .selectAll();

      const desc = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.childrenCount, 'DESC')
        .selectAll();

      // Invariant: DESC is reverse of ASC
      expect(asc).toEqual(desc.reverse());
    });

    it('ORDER BY is stable (deterministic for same data)', () => {
      const SEED = 777;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const result1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.childrenCount, 'ASC')
        .select(el => el.attributes.id);

      const result2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.childrenCount, 'ASC')
        .select(el => el.attributes.id);

      // Invariant: Same sort produces same order
      expect(result1).toEqual(result2);
    });

    it('ORDER BY maintains ascending/descending property', () => {
      const SEED = 555;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateTimeSeries(100, 'random');

      const asc = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.history.changeCount, 'ASC')
        .select(el => el.history.changeCount);

      // Check if ascending
      for (let i = 1; i < asc.length; i++) {
        expect(asc[i]).toBeGreaterThanOrEqual(asc[i - 1]);
      }

      const desc = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .orderBy(el => el.history.changeCount, 'DESC')
        .select(el => el.history.changeCount);

      // Check if descending
      for (let i = 1; i < desc.length; i++) {
        expect(desc[i]).toBeLessThanOrEqual(desc[i - 1]);
      }
    });
  });

  describe('LIMIT/OFFSET Invariants', () => {
    it('LIMIT returns at most N elements', () => {
      const seeds = [1, 10, 100];

      for (const seed of seeds) {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(100);

        const result = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .limit(10)
          .count();

        // Invariant: LIMIT(10) returns ≤ 10 elements
        expect(result).toBeLessThanOrEqual(10);
        expect(result).toBe(10); // We have 100 elements, so should be exactly 10
      }
    });

    it('LIMIT(N) + OFFSET(M) = total elements covered', () => {
      const SEED = 888;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const page1 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(30, 0)
        .select(el => el.attributes.id);

      const page2 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(30, 30)
        .select(el => el.attributes.id);

      const page3 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(30, 60)
        .select(el => el.attributes.id);

      const page4 = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .limit(30, 90)
        .select(el => el.attributes.id);

      // Combine all pages
      const allPages = [...page1, ...page2, ...page3, ...page4];

      // Invariant: No duplicates across pages
      const uniqueIds = new Set(allPages);
      expect(uniqueIds.size).toBe(allPages.length);

      // Invariant: All pages combined = all elements
      expect(allPages.length).toBe(100);
    });

    it('OFFSET beyond count returns empty', () => {
      const SEED = 666;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const result = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .offset(1000) // Way beyond data size
        .count();

      expect(result).toBe(0);
    });
  });

  describe('Aggregate Function Invariants', () => {
    it('COUNT is always ≥ 0', () => {
      const seeds = [1, 10, 100, 1000];

      for (const seed of seeds) {
        const gen = createDomDataGenerator(seed);
        const data = gen.generateElements(50);

        const count = new DomQueryBuilder<MockDomElementState>()
          .fromElements(data)
          .count();

        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('SUM of empty set is 0', () => {
      const SEED = 123;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const sum = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .where(el => false) // Empty set
        .sum(el => el.childrenCount);

      expect(sum).toBe(0);
    });

    it('AVG is between MIN and MAX', () => {
      const SEED = 456;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateNumericData(100, {
        property: 'data-value',
        distribution: 'uniform',
        range: [10, 90]
      });

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const avg = query.avg(el => parseInt(el.attributes['data-value']));
      const min = query.min(el => parseInt(el.attributes['data-value']));
      const max = query.max(el => parseInt(el.attributes['data-value']));

      // Invariant: MIN ≤ AVG ≤ MAX
      expect(avg).toBeGreaterThanOrEqual(min);
      expect(avg).toBeLessThanOrEqual(max);
    });

    it('SUM = COUNT × AVG (for uniform values)', () => {
      const SEED = 789;
      const gen = createDomDataGenerator(SEED);

      // Generate elements with same value
      const data = gen.generateElements(50);
      data.forEach(el => el.childrenCount = 10);

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const sum = query.sum(el => el.childrenCount);
      const count = query.count();
      const avg = query.avg(el => el.childrenCount);

      // Invariant: SUM = COUNT × AVG
      expect(sum).toBe(count * avg);
    });

    it('MIN ≤ all values ≤ MAX', () => {
      const SEED = 321;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateNumericData(100, {
        property: 'data-score',
        distribution: 'gaussian',
        mean: 50,
        stdDev: 15
      });

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const min = query.min(el => parseInt(el.attributes['data-score']));
      const max = query.max(el => parseInt(el.attributes['data-score']));
      const allValues = query.select(el => parseInt(el.attributes['data-score']));

      // Invariant: Every value is between MIN and MAX
      allValues.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      });
    });
  });

  describe('Set Operation Invariants', () => {
    it('A UNION A = A (idempotence)', () => {
      const SEED = 111;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const result1 = query.count();
      const result2 = query.union(query).count();

      // Invariant: Set union with itself doesn't increase size
      expect(result2).toBe(result1);
    });

    it('A UNION B = B UNION A (commutative)', () => {
      const SEED = 222;
      const gen = createDomDataGenerator(SEED);
      const dataA = gen.generateElements(30);
      const dataB = gen.generateElements(30);

      const queryA = new DomQueryBuilder<MockDomElementState>().fromElements(dataA);
      const queryB = new DomQueryBuilder<MockDomElementState>().fromElements(dataB);

      const aUnionB = queryA.union(queryB).selectAll().map(el => el.attributes.id).sort();
      const bUnionA = queryB.union(queryA).selectAll().map(el => el.attributes.id).sort();

      // Invariant: Union is commutative
      expect(aUnionB).toEqual(bUnionA);
    });

    it('A INTERSECT A = A (idempotence)', () => {
      const SEED = 333;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const result1 = query.count();
      const result2 = query.intersect(query).count();

      // Invariant: Set intersect with itself returns same set
      expect(result2).toBe(result1);
    });

    it('A INTERSECT B = B INTERSECT A (commutative)', () => {
      const SEED = 444;
      const gen = createDomDataGenerator(SEED);
      const dataA = gen.generateElements(30);
      const dataB = gen.generateElements(30);

      // Add some overlap
      const overlap = dataA.slice(0, 10);
      const finalA = [...dataA.slice(10), ...overlap];
      const finalB = [...dataB.slice(10), ...overlap];

      const queryA = new DomQueryBuilder<MockDomElementState>().fromElements(finalA);
      const queryB = new DomQueryBuilder<MockDomElementState>().fromElements(finalB);

      const aIntersectB = queryA.intersect(queryB).count();
      const bIntersectA = queryB.intersect(queryA).count();

      // Invariant: Intersect is commutative
      expect(aIntersectB).toBe(bIntersectA);
    });

    it('A EXCEPT A = ∅ (empty set)', () => {
      const SEED = 555;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(50);

      const query = new DomQueryBuilder<MockDomElementState>().fromElements(data);

      const result = query.except(query).count();

      // Invariant: Set minus itself is empty
      expect(result).toBe(0);
    });

    it('A UNION B size ≤ A.size + B.size', () => {
      const SEED = 666;
      const gen = createDomDataGenerator(SEED);
      const dataA = gen.generateElements(30);
      const dataB = gen.generateElements(40);

      const queryA = new DomQueryBuilder<MockDomElementState>().fromElements(dataA);
      const queryB = new DomQueryBuilder<MockDomElementState>().fromElements(dataB);

      const unionSize = queryA.union(queryB).count();

      // Invariant: Union size ≤ sum of sizes (equality when disjoint)
      expect(unionSize).toBeLessThanOrEqual(dataA.length + dataB.length);
    });
  });

  describe('GROUP BY Invariants', () => {
    it('SUM of group counts = total count', () => {
      const SEED = 777;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const originalCount = data.length;

      const groups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-category'])
        .selectAll();

      const sumOfGroupCounts = groups.reduce((sum, group) => sum + group.count, 0);

      // Invariant: Sum of all group counts = total elements
      expect(sumOfGroupCounts).toBe(originalCount);
    });

    it('Each element appears in exactly one group', () => {
      const SEED = 888;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const groups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-status'])
        .selectAll();

      // Collect all element IDs from all groups
      const allGroupedIds = groups.flatMap(group =>
        group.items.map(item => item.attributes.id)
      );

      // Invariant: No duplicates (each element in exactly one group)
      const uniqueIds = new Set(allGroupedIds);
      expect(uniqueIds.size).toBe(allGroupedIds.length);

      // Invariant: All original elements are grouped
      expect(allGroupedIds.length).toBe(data.length);
    });

    it('GROUP BY with HAVING reduces count', () => {
      const SEED = 999;
      const gen = createDomDataGenerator(SEED);
      const data = gen.generateElements(100);

      const allGroups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-category'])
        .count();

      const filteredGroups = new DomQueryBuilder<MockDomElementState>()
        .fromElements(data)
        .groupBy(el => el.attributes['data-category'])
        .having(group => group.count > 10)
        .count();

      // Invariant: HAVING filters groups, doesn't increase them
      expect(filteredGroups).toBeLessThanOrEqual(allGroups);
    });
  });
});
