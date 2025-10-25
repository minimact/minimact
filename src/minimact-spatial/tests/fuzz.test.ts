/**
 * Fuzz Testing for minimact-spatial using Seeded Random
 *
 * Tests spatial calculations across thousands of random scenarios
 * to find edge cases and verify geometric invariants.
 *
 * The brilliance: Same seed = same test = fully reproducible!
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SeededRandom } from '../../../tests/utils/seeded-random';
import {
  boundsIntersect,
  calculateIntersection,
  calculateDistance,
  calculateCenterDistance,
  isFullyEnclosed,
  isPartiallyEnclosed
} from '../src/bounds-calculator';
import type { AbsoluteBounds } from '../src/types';
import { cleanupDOM } from '../../../tests/utils/dom-helpers';

/**
 * Generate random bounds with seeded RNG
 */
function generateRandomBounds(rng: SeededRandom): AbsoluteBounds {
  const left = rng.nextInt(-1000, 3000);
  const top = rng.nextInt(-1000, 3000);
  const width = rng.nextInt(10, 1000);
  const height = rng.nextInt(10, 1000);

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

/**
 * Generate random DOMRect with seeded RNG
 */
function generateRandomRect(rng: SeededRandom): DOMRect {
  const left = rng.nextInt(-1000, 3000);
  const top = rng.nextInt(-1000, 3000);
  const width = rng.nextInt(10, 1000);
  const height = rng.nextInt(10, 1000);

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

describe('minimact-spatial - Fuzz Testing', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('Geometric Invariants', () => {
    it('should maintain intersection symmetry over 1000 random pairs', () => {
      const SEED = 42;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 1000; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        // INVARIANT: Intersection is symmetric
        // If A intersects B, then B intersects A
        const aIntersectsB = boundsIntersect(a, b);
        const bIntersectsA = boundsIntersect(b, a);

        expect(aIntersectsB).toBe(bIntersectsA);
      }
    });

    it('should maintain intersection reflexivity', () => {
      const SEED = 123;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 500; i++) {
        const a = generateRandomBounds(rng);

        // INVARIANT: A always intersects itself
        expect(boundsIntersect(a, a)).toBe(true);
      }
    });

    it('should maintain valid intersection bounds', () => {
      const SEED = 456;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 1000; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        const intersection = calculateIntersection(a, b);

        if (intersection) {
          // INVARIANT 1: Intersection width >= 0
          expect(intersection.width).toBeGreaterThanOrEqual(0);

          // INVARIANT 2: Intersection height >= 0
          expect(intersection.height).toBeGreaterThanOrEqual(0);

          // INVARIANT 3: Intersection is contained in both bounds
          expect(intersection.left).toBeGreaterThanOrEqual(Math.max(a.left, b.left));
          expect(intersection.top).toBeGreaterThanOrEqual(Math.max(a.top, b.top));
          expect(intersection.right).toBeLessThanOrEqual(Math.min(a.right, b.right));
          expect(intersection.bottom).toBeLessThanOrEqual(Math.min(a.bottom, b.bottom));

          // INVARIANT 4: Intersection area <= min(a.area, b.area)
          const intersectionArea = intersection.width * intersection.height;
          const aArea = a.width * a.height;
          const bArea = b.width * b.height;
          expect(intersectionArea).toBeLessThanOrEqual(Math.min(aArea, bArea) + 0.01); // +0.01 for floating point
        } else {
          // INVARIANT: If no intersection, bounds should not intersect
          expect(boundsIntersect(a, b)).toBe(false);
        }
      }
    });

    it('should maintain distance invariants', () => {
      const SEED = 789;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 1000; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        const distance = calculateDistance(a, b);

        // INVARIANT 1: Distance >= 0
        expect(distance).toBeGreaterThanOrEqual(0);

        // INVARIANT 2: Distance is symmetric
        const reverseDistance = calculateDistance(b, a);
        expect(distance).toBeCloseTo(reverseDistance, 2);

        // INVARIANT 3: If intersecting, distance = 0
        if (boundsIntersect(a, b)) {
          expect(distance).toBe(0);
        }

        // INVARIANT 4: Distance is finite
        expect(isFinite(distance)).toBe(true);
        expect(isNaN(distance)).toBe(false);
      }
    });

    it('should maintain center distance invariants', () => {
      const SEED = 101112;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 1000; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        const centerDist = calculateCenterDistance(a, b);

        // INVARIANT 1: Center distance >= 0
        expect(centerDist).toBeGreaterThanOrEqual(0);

        // INVARIANT 2: Symmetric
        const reverseDist = calculateCenterDistance(b, a);
        expect(centerDist).toBeCloseTo(reverseDist, 2);

        // INVARIANT 3: Center distance to self = 0
        expect(calculateCenterDistance(a, a)).toBe(0);

        // INVARIANT 4: Finite
        expect(isFinite(centerDist)).toBe(true);
      }
    });

    it('should maintain enclosure transitivity', () => {
      const SEED = 131415;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 500; i++) {
        // Generate bounds where C ⊂ B ⊂ A (transitive containment)
        const a = generateRandomBounds(rng);

        const bLeft = a.left + rng.nextInt(10, a.width / 4);
        const bTop = a.top + rng.nextInt(10, a.height / 4);
        const bWidth = rng.nextInt(10, a.width / 2);
        const bHeight = rng.nextInt(10, a.height / 2);

        const b = {
          left: bLeft,
          top: bTop,
          width: bWidth,
          height: bHeight,
          right: bLeft + bWidth,
          bottom: bTop + bHeight
        };

        const cLeft = b.left + rng.nextInt(5, b.width / 4);
        const cTop = b.top + rng.nextInt(5, b.height / 4);
        const cWidth = rng.nextInt(5, b.width / 2);
        const cHeight = rng.nextInt(5, b.height / 2);

        const c = {
          left: cLeft,
          top: cTop,
          width: cWidth,
          height: cHeight,
          right: cLeft + cWidth,
          bottom: cTop + cHeight
        } as DOMRect;

        // INVARIANT: If C ⊂ B and B ⊂ A, then C ⊂ A (transitivity)
        const cInB = isFullyEnclosed(c, b);
        const bInA = isFullyEnclosed(b as any as DOMRect, a);

        if (cInB && bInA) {
          expect(isFullyEnclosed(c, a)).toBe(true);
        }
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should verify triangle inequality for distances', () => {
      // Property: distance(A, C) <= distance(A, B) + distance(B, C)
      const SEED = 161718;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 500; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);
        const c = generateRandomBounds(rng);

        const distAC = calculateDistance(a, c);
        const distAB = calculateDistance(a, b);
        const distBC = calculateDistance(b, c);

        // Triangle inequality
        expect(distAC).toBeLessThanOrEqual(distAB + distBC + 0.01); // +0.01 for floating point
      }
    });

    it('should verify intersection commutativity', () => {
      // Property: intersection(A, B) = intersection(B, A)
      const SEED = 192021;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 500; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        const intAB = calculateIntersection(a, b);
        const intBA = calculateIntersection(b, a);

        if (intAB && intBA) {
          expect(intAB.left).toBeCloseTo(intBA.left, 2);
          expect(intAB.top).toBeCloseTo(intBA.top, 2);
          expect(intAB.width).toBeCloseTo(intBA.width, 2);
          expect(intAB.height).toBeCloseTo(intBA.height, 2);
        } else {
          expect(intAB).toBe(intBA); // Both null
        }
      }
    });

    it('should verify containment implies overlap', () => {
      // Property: If A fully contains B, then A partially contains B
      const SEED = 222324;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 500; i++) {
        const rect = generateRandomRect(rng);
        const bounds = generateRandomBounds(rng);

        const fullyEnclosed = isFullyEnclosed(rect, bounds);
        const partiallyEnclosed = isPartiallyEnclosed(rect, bounds);

        if (fullyEnclosed) {
          expect(partiallyEnclosed).toBe(true);
        }
      }
    });

    it('should verify intersection area monotonicity', () => {
      // Property: If bounds shrink, intersection area doesn't increase
      const SEED = 252627;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 300; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        // Calculate intersection with original B
        const int1 = calculateIntersection(a, b);
        const area1 = int1 ? int1.width * int1.height : 0;

        // Shrink B
        const shrunkB = {
          left: b.left + 10,
          top: b.top + 10,
          width: Math.max(b.width - 20, 1),
          height: Math.max(b.height - 20, 1),
          right: b.left + Math.max(b.width - 20, 1) + 10,
          bottom: b.top + Math.max(b.height - 20, 1) + 10
        };

        // Calculate intersection with shrunk B
        const int2 = calculateIntersection(a, shrunkB);
        const area2 = int2 ? int2.width * int2.height : 0;

        // PROPERTY: area2 <= area1 (shrinking never increases intersection)
        expect(area2).toBeLessThanOrEqual(area1 + 0.01);
      }
    });
  });

  describe('Edge Case Discovery', () => {
    it('should handle extreme coordinates without overflow', () => {
      const SEED = 282930;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 200; i++) {
        // Generate bounds with extreme coordinates
        const left = rng.nextInt(-100000, 100000);
        const top = rng.nextInt(-100000, 100000);
        const width = rng.nextInt(1, 50000);
        const height = rng.nextInt(1, 50000);

        const a = {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height
        };

        const b = generateRandomBounds(rng);

        // Should not crash or produce NaN/Infinity
        const intersects = boundsIntersect(a, b);
        expect(typeof intersects).toBe('boolean');

        const intersection = calculateIntersection(a, b);
        if (intersection) {
          expect(isFinite(intersection.width)).toBe(true);
          expect(isFinite(intersection.height)).toBe(true);
        }

        const distance = calculateDistance(a, b);
        expect(isFinite(distance)).toBe(true);
        expect(isNaN(distance)).toBe(false);
      }
    });

    it('should handle zero-sized bounds', () => {
      const SEED = 313233;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 200; i++) {
        // Generate bounds with zero width or height
        const zeroWidth = {
          left: rng.nextInt(0, 1000),
          top: rng.nextInt(0, 1000),
          width: 0,
          height: rng.nextInt(10, 200),
          right: rng.nextInt(0, 1000),
          bottom: rng.nextInt(10, 1200)
        };

        const zeroHeight = {
          left: rng.nextInt(0, 1000),
          top: rng.nextInt(0, 1000),
          width: rng.nextInt(10, 200),
          height: 0,
          right: rng.nextInt(10, 1200),
          bottom: rng.nextInt(0, 1000)
        };

        const normal = generateRandomBounds(rng);

        // Should handle gracefully
        expect(() => boundsIntersect(zeroWidth, normal)).not.toThrow();
        expect(() => boundsIntersect(zeroHeight, normal)).not.toThrow();
        expect(() => calculateDistance(zeroWidth, normal)).not.toThrow();
        expect(() => calculateDistance(zeroHeight, normal)).not.toThrow();
      }
    });

    it('should handle touching edges correctly', () => {
      const SEED = 343536;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 200; i++) {
        const a = generateRandomBounds(rng);

        // Create bounds that exactly touch each edge
        const touchingRight = {
          left: a.right,
          top: a.top,
          width: rng.nextInt(10, 200),
          height: a.height,
          right: a.right + rng.nextInt(10, 200),
          bottom: a.bottom
        };

        const touchingBottom = {
          left: a.left,
          top: a.bottom,
          width: a.width,
          height: rng.nextInt(10, 200),
          right: a.right,
          bottom: a.bottom + rng.nextInt(10, 200)
        };

        // Touching edges should NOT intersect
        expect(boundsIntersect(a, touchingRight)).toBe(false);
        expect(boundsIntersect(a, touchingBottom)).toBe(false);

        // But distance should be 0
        expect(calculateDistance(a, touchingRight)).toBe(0);
        expect(calculateDistance(a, touchingBottom)).toBe(0);
      }
    });
  });

  describe('Regression Tests (Known Seeds)', () => {
    const KNOWN_ISSUES = [
      { seed: 42, description: 'Baseline (no known issues)' },
      // Add seeds here when bugs are found:
      // { seed: 12345, description: 'NaN distance with negative coords' },
      // { seed: 67890, description: 'Intersection overflow on large bounds' },
    ];

    KNOWN_ISSUES.forEach(({ seed, description }) => {
      it(`should not regress: ${description}`, () => {
        const rng = new SeededRandom(seed);

        for (let i = 0; i < 100; i++) {
          const a = generateRandomBounds(rng);
          const b = generateRandomBounds(rng);

          // All operations should succeed without errors
          const intersects = boundsIntersect(a, b);
          expect(typeof intersects).toBe('boolean');

          const intersection = calculateIntersection(a, b);
          if (intersection) {
            expect(intersection.width).toBeGreaterThanOrEqual(0);
            expect(intersection.height).toBeGreaterThanOrEqual(0);
            expect(isFinite(intersection.width)).toBe(true);
            expect(isFinite(intersection.height)).toBe(true);
          }

          const distance = calculateDistance(a, b);
          expect(isFinite(distance)).toBe(true);
          expect(isNaN(distance)).toBe(false);
          expect(distance).toBeGreaterThanOrEqual(0);

          const centerDist = calculateCenterDistance(a, b);
          expect(isFinite(centerDist)).toBe(true);
          expect(isNaN(centerDist)).toBe(false);
          expect(centerDist).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle 10,000 random geometric calculations without crashes', () => {
      const SEED = 373839;
      const rng = new SeededRandom(SEED);

      for (let i = 0; i < 10000; i++) {
        const a = generateRandomBounds(rng);
        const b = generateRandomBounds(rng);

        boundsIntersect(a, b);
        calculateIntersection(a, b);
        calculateDistance(a, b);
        calculateCenterDistance(a, b);
      }

      // If we made it here, no crashes!
      expect(true).toBe(true);
    });

    it('should handle rapid bound generation and calculation', () => {
      const seeds = Array.from({ length: 20 }, (_, i) => 400 + i);

      for (const seed of seeds) {
        const rng = new SeededRandom(seed);

        const bounds = Array.from({ length: 100 }, () => generateRandomBounds(rng));

        // Calculate all pairwise intersections
        for (let i = 0; i < bounds.length; i++) {
          for (let j = i + 1; j < bounds.length; j++) {
            boundsIntersect(bounds[i], bounds[j]);
          }
        }
      }

      expect(true).toBe(true);
    });
  });

  describe('Snapshot Testing with Seeds', () => {
    it('should produce identical results for same seed', () => {
      const SEED = 424344;

      // Run 1
      const rng1 = new SeededRandom(SEED);
      const results1: boolean[] = [];

      for (let i = 0; i < 50; i++) {
        const a = generateRandomBounds(rng1);
        const b = generateRandomBounds(rng1);
        results1.push(boundsIntersect(a, b));
      }

      // Run 2 (same seed)
      const rng2 = new SeededRandom(SEED);
      const results2: boolean[] = [];

      for (let i = 0; i < 50; i++) {
        const a = generateRandomBounds(rng2);
        const b = generateRandomBounds(rng2);
        results2.push(boundsIntersect(a, b));
      }

      // EXACT same results
      expect(results1).toEqual(results2);
    });

    it('should produce different results for different seeds', () => {
      const SEED1 = 454647;
      const SEED2 = 484950;

      const rng1 = new SeededRandom(SEED1);
      const results1: boolean[] = [];

      for (let i = 0; i < 50; i++) {
        const a = generateRandomBounds(rng1);
        const b = generateRandomBounds(rng1);
        results1.push(boundsIntersect(a, b));
      }

      const rng2 = new SeededRandom(SEED2);
      const results2: boolean[] = [];

      for (let i = 0; i < 50; i++) {
        const a = generateRandomBounds(rng2);
        const b = generateRandomBounds(rng2);
        results2.push(boundsIntersect(a, b));
      }

      // Different results
      expect(results1).not.toEqual(results2);
    });
  });
});
