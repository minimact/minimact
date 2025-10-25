/**
 * Unit Tests for Bounds Calculator
 *
 * Tests calculation of absolute bounds from flexible definitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateBounds,
  boundsIntersect,
  calculateIntersection,
  calculateDistance,
  calculateCenterDistance,
  isFullyEnclosed,
  isPartiallyEnclosed
} from '../src/bounds-calculator';
import { createTestElement, cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('Bounds Calculator', () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
  });

  afterEach(() => {
    cleanupDOM();
  });

  describe('calculateBounds', () => {
    describe('String Keywords', () => {
      it('should calculate viewport bounds', () => {
        const bounds = calculateBounds('viewport');

        expect(bounds).toEqual({
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          right: 1920,
          bottom: 1080
        });
      });

      it('should calculate window bounds (same as viewport)', () => {
        const bounds = calculateBounds('window');

        expect(bounds).toEqual({
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          right: 1920,
          bottom: 1080
        });
      });

      it('should calculate document bounds', () => {
        // Mock document dimensions
        Object.defineProperty(document.documentElement, 'scrollWidth', { value: 3000, writable: true });
        Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, writable: true });

        const bounds = calculateBounds('document');

        expect(bounds).toEqual({
          top: 0,
          left: 0,
          width: 3000,
          height: 5000,
          right: 3000,
          bottom: 5000
        });
      });
    });

    describe('CSS Selector', () => {
      it('should calculate bounds from element selector', () => {
        const element = createTestElement('<div id="test"></div>');

        // Mock getBoundingClientRect
        element.getBoundingClientRect = vi.fn(() => ({
          top: 100,
          left: 200,
          width: 300,
          height: 400,
          right: 500,
          bottom: 500,
          x: 200,
          y: 100,
          toJSON: () => ({})
        }));

        const bounds = calculateBounds('#test');

        expect(bounds).toEqual({
          top: 100,
          left: 200,
          width: 300,
          height: 400,
          right: 500,
          bottom: 500
        });
      });

      it('should throw error for non-existent selector', () => {
        expect(() => {
          calculateBounds('#nonexistent');
        }).toThrow('Element not found: #nonexistent');
      });
    });

    describe('Element', () => {
      it('should calculate bounds from element', () => {
        const element = createTestElement('<div></div>');

        element.getBoundingClientRect = vi.fn(() => ({
          top: 50,
          left: 100,
          width: 200,
          height: 150,
          right: 300,
          bottom: 200,
          x: 100,
          y: 50,
          toJSON: () => ({})
        }));

        const bounds = calculateBounds(element);

        expect(bounds).toEqual({
          top: 50,
          left: 100,
          width: 200,
          height: 150,
          right: 300,
          bottom: 200
        });
      });
    });

    describe('BoundsDefinition', () => {
      it('should calculate bounds from explicit top/left/width/height', () => {
        const bounds = calculateBounds({
          top: 100,
          left: 200,
          width: 300,
          height: 400
        });

        expect(bounds).toEqual({
          top: 100,
          left: 200,
          width: 300,
          height: 400,
          right: 500,
          bottom: 500
        });
      });

      it('should calculate bounds using right instead of width', () => {
        const bounds = calculateBounds({
          top: 0,
          left: 100,
          right: 500,
          height: 200
        });

        expect(bounds).toEqual({
          top: 0,
          left: 100,
          width: 400,
          height: 200,
          right: 500,
          bottom: 200
        });
      });

      it('should calculate bounds using bottom instead of height', () => {
        const bounds = calculateBounds({
          top: 50,
          left: 100,
          width: 300,
          bottom: 500
        });

        expect(bounds).toEqual({
          top: 50,
          left: 100,
          width: 300,
          height: 450,
          right: 400,
          bottom: 500
        });
      });

      it('should handle percentage values', () => {
        const bounds = calculateBounds({
          top: '10%',
          left: '20%',
          width: '50%',
          height: '30%'
        });

        // 10% of viewport height (1080) = 108
        // 20% of viewport width (1920) = 384
        // 50% of viewport width = 960
        // 30% of viewport height = 324

        expect(bounds.top).toBe(108);
        expect(bounds.left).toBe(384);
        expect(bounds.width).toBe(960);
        expect(bounds.height).toBe(324);
      });

      it('should handle vh units', () => {
        const bounds = calculateBounds({
          top: '10vh',
          left: 0,
          width: 100,
          height: '50vh'
        });

        // 10vh = 10% of 1080 = 108
        // 50vh = 50% of 1080 = 540

        expect(bounds.top).toBe(108);
        expect(bounds.height).toBe(540);
      });

      it('should handle vw units', () => {
        const bounds = calculateBounds({
          top: 0,
          left: '10vw',
          width: '50vw',
          height: 100
        });

        // 10vw = 10% of 1920 = 192
        // 50vw = 50% of 1920 = 960

        expect(bounds.left).toBe(192);
        expect(bounds.width).toBe(960);
      });

      it('should handle px units explicitly', () => {
        const bounds = calculateBounds({
          top: '100px',
          left: '200px',
          width: '300px',
          height: '400px'
        });

        expect(bounds).toEqual({
          top: 100,
          left: 200,
          width: 300,
          height: 400,
          right: 500,
          bottom: 500
        });
      });

      it('should handle mixed units', () => {
        const bounds = calculateBounds({
          top: '10vh',      // 108
          left: '20%',      // 384 (20% of viewport width)
          width: 500,       // 500
          height: '30%'     // 324 (30% of viewport height)
        });

        expect(bounds.top).toBe(108);
        expect(bounds.left).toBe(384);
        expect(bounds.width).toBe(500);
        expect(bounds.height).toBe(324);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero-sized bounds', () => {
        const bounds = calculateBounds({
          top: 100,
          left: 200,
          width: 0,
          height: 0
        });

        expect(bounds.width).toBe(0);
        expect(bounds.height).toBe(0);
        expect(bounds.right).toBe(200);
        expect(bounds.bottom).toBe(100);
      });

      it('should handle invalid string value', () => {
        expect(() => {
          calculateBounds({
            top: 'invalid',
            left: 0,
            width: 100,
            height: 100
          });
        }).toThrow('Invalid value: invalid');
      });

      it('should handle negative values', () => {
        const bounds = calculateBounds({
          top: -50,
          left: -100,
          width: 200,
          height: 150
        });

        expect(bounds.top).toBe(-50);
        expect(bounds.left).toBe(-100);
        expect(bounds.right).toBe(100);
        expect(bounds.bottom).toBe(100);
      });
    });
  });

  describe('boundsIntersect', () => {
    it('should detect intersection when bounds overlap', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 50, left: 50, width: 100, height: 100, right: 150, bottom: 150 };

      expect(boundsIntersect(a, b)).toBe(true);
    });

    it('should detect no intersection when bounds are separate', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 200, left: 200, width: 100, height: 100, right: 300, bottom: 300 };

      expect(boundsIntersect(a, b)).toBe(false);
    });

    it('should detect intersection when bounds touch edges', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 100, left: 100, width: 100, height: 100, right: 200, bottom: 200 };

      expect(boundsIntersect(a, b)).toBe(false); // Edge touching is not intersection
    });

    it('should detect intersection when one contains the other', () => {
      const a = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };
      const b = { top: 50, left: 50, width: 50, height: 50, right: 100, bottom: 100 };

      expect(boundsIntersect(a, b)).toBe(true);
    });
  });

  describe('calculateIntersection', () => {
    it('should calculate intersection area', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 50, left: 50, width: 100, height: 100, right: 150, bottom: 150 };

      const intersection = calculateIntersection(a, b);

      expect(intersection).toEqual({
        top: 50,
        left: 50,
        width: 50,
        height: 50,
        right: 100,
        bottom: 100
      });
    });

    it('should return null for non-intersecting bounds', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 200, left: 200, width: 100, height: 100, right: 300, bottom: 300 };

      const intersection = calculateIntersection(a, b);

      expect(intersection).toBeNull();
    });

    it('should calculate full intersection when one contains other', () => {
      const a = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };
      const b = { top: 50, left: 50, width: 50, height: 50, right: 100, bottom: 100 };

      const intersection = calculateIntersection(a, b);

      expect(intersection).toEqual(b); // b is fully inside a
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for intersecting bounds', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 50, left: 50, width: 100, height: 100, right: 150, bottom: 150 };

      expect(calculateDistance(a, b)).toBe(0);
    });

    it('should calculate horizontal distance', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 0, left: 200, width: 100, height: 100, right: 300, bottom: 100 };

      expect(calculateDistance(a, b)).toBe(100); // 200 - 100 = 100
    });

    it('should calculate vertical distance', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 200, left: 0, width: 100, height: 100, right: 100, bottom: 300 };

      expect(calculateDistance(a, b)).toBe(100); // 200 - 100 = 100
    });

    it('should calculate diagonal distance (Euclidean)', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 200, left: 200, width: 100, height: 100, right: 300, bottom: 300 };

      // Horizontal: 200 - 100 = 100
      // Vertical: 200 - 100 = 100
      // Euclidean: sqrt(100² + 100²) = sqrt(20000) ≈ 141.42

      expect(calculateDistance(a, b)).toBeCloseTo(141.42, 1);
    });
  });

  describe('calculateCenterDistance', () => {
    it('should calculate center-to-center distance', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      // Center: (50, 50)

      const b = { top: 200, left: 200, width: 100, height: 100, right: 300, bottom: 300 };
      // Center: (250, 250)

      // Distance: sqrt((250-50)² + (250-50)²) = sqrt(200² + 200²) = sqrt(80000) ≈ 282.84

      expect(calculateCenterDistance(a, b)).toBeCloseTo(282.84, 1);
    });

    it('should return 0 for same center', () => {
      const a = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
      const b = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };

      expect(calculateCenterDistance(a, b)).toBe(0);
    });
  });

  describe('isFullyEnclosed', () => {
    it('should return true when element is fully inside', () => {
      const element = {
        top: 50,
        left: 50,
        width: 50,
        height: 50,
        right: 100,
        bottom: 100
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isFullyEnclosed(element, area)).toBe(true);
    });

    it('should return false when element partially extends outside', () => {
      const element = {
        top: 50,
        left: 50,
        width: 200,
        height: 200,
        right: 250,
        bottom: 250
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isFullyEnclosed(element, area)).toBe(false);
    });

    it('should return false when element is completely outside', () => {
      const element = {
        top: 300,
        left: 300,
        width: 100,
        height: 100,
        right: 400,
        bottom: 400
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isFullyEnclosed(element, area)).toBe(false);
    });
  });

  describe('isPartiallyEnclosed', () => {
    it('should return true when element partially overlaps', () => {
      const element = {
        top: 50,
        left: 50,
        width: 200,
        height: 200,
        right: 250,
        bottom: 250
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isPartiallyEnclosed(element, area)).toBe(true);
    });

    it('should return true when element is fully inside', () => {
      const element = {
        top: 50,
        left: 50,
        width: 50,
        height: 50,
        right: 100,
        bottom: 100
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isPartiallyEnclosed(element, area)).toBe(true);
    });

    it('should return false when element is completely outside', () => {
      const element = {
        top: 300,
        left: 300,
        width: 100,
        height: 100,
        right: 400,
        bottom: 400
      } as DOMRect;

      const area = { top: 0, left: 0, width: 200, height: 200, right: 200, bottom: 200 };

      expect(isPartiallyEnclosed(element, area)).toBe(false);
    });
  });
});
