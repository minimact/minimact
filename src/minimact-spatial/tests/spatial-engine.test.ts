/**
 * Unit Tests for Spatial Engine
 *
 * Tests element queries, coverage calculation, and statistics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  queryElementsInBounds,
  calculateCoverage,
  getElementEnclosure,
  calculateElementStats,
  calculateDensity,
  isInViewport,
  calculateVisibleRatio
} from '../src/spatial-engine';
import { createTestElement, cleanupDOM, mockBoundingClientRect } from '../../../tests/utils/dom-helpers';
import type { AbsoluteBounds } from '../src/types';

describe('Spatial Engine', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('queryElementsInBounds', () => {
    it('should find fully enclosed elements', () => {
      const el1 = createTestElement('<div id="el1"></div>');
      const el2 = createTestElement('<div id="el2"></div>');
      const el3 = createTestElement('<div id="el3"></div>');

      // el1: fully inside bounds
      mockBoundingClientRect(el1, {
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        right: 150,
        bottom: 150
      });

      // el2: partially overlapping
      mockBoundingClientRect(el2, {
        top: 150,
        left: 150,
        width: 100,
        height: 100,
        right: 250,
        bottom: 250
      });

      // el3: completely outside
      mockBoundingClientRect(el3, {
        top: 500,
        left: 500,
        width: 100,
        height: 100,
        right: 600,
        bottom: 600
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200
      };

      const result = queryElementsInBounds(bounds);

      expect(result.fully).toContain(el1);
      expect(result.fully).not.toContain(el2);
      expect(result.fully).not.toContain(el3);

      expect(result.partially).toContain(el2);
      expect(result.partially).not.toContain(el1);
      expect(result.partially).not.toContain(el3);

      expect(result.all).toContain(el1);
      expect(result.all).toContain(el2);
      expect(result.all).not.toContain(el3);
    });

    it('should filter elements by custom filter', () => {
      const div = createTestElement('<div class="target"></div>');
      const span = createTestElement('<span class="target"></span>');
      const p = createTestElement('<p></p>');

      // All inside bounds
      [div, span, p].forEach(el => {
        mockBoundingClientRect(el, {
          top: 50,
          left: 50,
          width: 50,
          height: 50,
          right: 100,
          bottom: 100
        });
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200
      };

      // Filter: only elements with class "target"
      const result = queryElementsInBounds(bounds, {
        elementFilter: (el) => el.classList.contains('target')
      });

      expect(result.all).toContain(div);
      expect(result.all).toContain(span);
      expect(result.all).not.toContain(p);
    });

    it('should filter by minimum element size', () => {
      const large = createTestElement('<div id="large"></div>');
      const small = createTestElement('<div id="small"></div>');

      // Large element: 200x200 = 40,000px²
      mockBoundingClientRect(large, {
        top: 10,
        left: 10,
        width: 200,
        height: 200,
        right: 210,
        bottom: 210
      });

      // Small element: 10x10 = 100px²
      mockBoundingClientRect(small, {
        top: 10,
        left: 10,
        width: 10,
        height: 10,
        right: 20,
        bottom: 20
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300
      };

      const result = queryElementsInBounds(bounds, {
        minElementSize: 1000 // 1000px² minimum
      });

      expect(result.all).toContain(large);
      expect(result.all).not.toContain(small);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 0 for no elements', () => {
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      const coverage = calculateCoverage([], bounds);

      expect(coverage).toBe(0);
    });

    it('should calculate coverage for fully enclosed element', () => {
      const el = createTestElement('<div></div>');

      // Element: 50x50 = 2,500px²
      mockBoundingClientRect(el, {
        top: 25,
        left: 25,
        width: 50,
        height: 50,
        right: 75,
        bottom: 75
      });

      // Bounds: 100x100 = 10,000px²
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      const coverage = calculateCoverage([el], bounds);

      // Coverage: 2,500 / 10,000 = 0.25 (25%)
      expect(coverage).toBeCloseTo(0.25, 2);
    });

    it('should calculate coverage for partially overlapping element', () => {
      const el = createTestElement('<div></div>');

      // Element: 100x100, but only 50x50 overlaps with bounds
      mockBoundingClientRect(el, {
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        right: 150,
        bottom: 150
      });

      // Bounds: 100x100 = 10,000px²
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      const coverage = calculateCoverage([el], bounds);

      // Overlap: 50x50 = 2,500px²
      // Coverage: 2,500 / 10,000 = 0.25 (25%)
      expect(coverage).toBeCloseTo(0.25, 2);
    });

    it('should cap coverage at 1.0', () => {
      const el1 = createTestElement('<div id="el1"></div>');
      const el2 = createTestElement('<div id="el2"></div>');

      // Both elements fill the bounds (overlapping coverage)
      mockBoundingClientRect(el1, {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      });

      mockBoundingClientRect(el2, {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      const coverage = calculateCoverage([el1, el2], bounds);

      // Coverage should be capped at 1.0 even though elements overlap
      expect(coverage).toBe(1.0);
    });
  });

  describe('getElementEnclosure', () => {
    it('should detect full enclosure', () => {
      const el = createTestElement('<div></div>');

      mockBoundingClientRect(el, {
        top: 50,
        left: 50,
        width: 50,
        height: 50,
        right: 100,
        bottom: 100
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200
      };

      const enclosure = getElementEnclosure(el, bounds);

      expect(enclosure.enclosureType).toBe('full');
      expect(enclosure.overlapRatio).toBe(1.0);
      expect(enclosure.overlapArea).toBe(2500); // 50x50
    });

    it('should detect partial enclosure', () => {
      const el = createTestElement('<div></div>');

      // Element: 100x100, half inside bounds
      mockBoundingClientRect(el, {
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        right: 150,
        bottom: 150
      });

      // Bounds: 100x100
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      const enclosure = getElementEnclosure(el, bounds);

      expect(enclosure.enclosureType).toBe('partial');
      expect(enclosure.overlapRatio).toBeCloseTo(0.25, 2); // 2,500 / 10,000
      expect(enclosure.overlapArea).toBe(2500); // 50x50 overlap
    });

    it('should detect no enclosure', () => {
      const el = createTestElement('<div></div>');

      mockBoundingClientRect(el, {
        top: 300,
        left: 300,
        width: 100,
        height: 100,
        right: 400,
        bottom: 400
      });

      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200
      };

      const enclosure = getElementEnclosure(el, bounds);

      expect(enclosure.enclosureType).toBe('none');
      expect(enclosure.overlapRatio).toBe(0);
      expect(enclosure.overlapArea).toBe(0);
    });
  });

  describe('calculateElementStats', () => {
    it('should return zeros for no elements', () => {
      const stats = calculateElementStats([]);

      expect(stats.averageSize).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.largestElement).toBeNull();
      expect(stats.smallestElement).toBeNull();
    });

    it('should calculate statistics for multiple elements', () => {
      const el1 = createTestElement('<div id="el1"></div>');
      const el2 = createTestElement('<div id="el2"></div>');
      const el3 = createTestElement('<div id="el3"></div>');

      // el1: 100x100 = 10,000px²
      mockBoundingClientRect(el1, {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      });

      // el2: 50x50 = 2,500px² (smallest)
      mockBoundingClientRect(el2, {
        top: 0,
        left: 0,
        width: 50,
        height: 50,
        right: 50,
        bottom: 50
      });

      // el3: 200x200 = 40,000px² (largest)
      mockBoundingClientRect(el3, {
        top: 0,
        left: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200
      });

      const stats = calculateElementStats([el1, el2, el3]);

      expect(stats.totalSize).toBe(52500); // 10,000 + 2,500 + 40,000
      expect(stats.averageSize).toBeCloseTo(17500, 0); // 52,500 / 3
      expect(stats.largestElement).toBe(el3);
      expect(stats.largestSize).toBe(40000);
      expect(stats.smallestElement).toBe(el2);
      expect(stats.smallestSize).toBe(2500);
    });
  });

  describe('calculateDensity', () => {
    it('should return 0 for zero area', () => {
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0
      };

      const density = calculateDensity(10, bounds);

      expect(density).toBe(0);
    });

    it('should calculate elements per 1000px²', () => {
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      // Area: 10,000px²
      // Elements: 5
      // Density: (5 / 10,000) * 1000 = 0.5 elements per 1000px²

      const density = calculateDensity(5, bounds);

      expect(density).toBeCloseTo(0.5, 2);
    });

    it('should handle high density', () => {
      const bounds: AbsoluteBounds = {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100
      };

      // Area: 10,000px²
      // Elements: 100
      // Density: (100 / 10,000) * 1000 = 10 elements per 1000px²

      const density = calculateDensity(100, bounds);

      expect(density).toBe(10);
    });
  });

  describe('isInViewport', () => {
    beforeEach(() => {
      // Mock viewport: 1920x1080
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
      Object.defineProperty(window, 'pageXOffset', { value: 0, writable: true });
    });

    it('should return true for bounds in viewport', () => {
      const bounds: AbsoluteBounds = {
        top: 100,
        left: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: 300
      };

      expect(isInViewport(bounds)).toBe(true);
    });

    it('should return false for bounds above viewport', () => {
      const bounds: AbsoluteBounds = {
        top: -500,
        left: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: -300
      };

      expect(isInViewport(bounds)).toBe(false);
    });

    it('should return true for partially visible bounds', () => {
      const bounds: AbsoluteBounds = {
        top: 1000,    // Partially below viewport
        left: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: 1200
      };

      expect(isInViewport(bounds)).toBe(true);
    });
  });

  describe('calculateVisibleRatio', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });
      Object.defineProperty(window, 'pageXOffset', { value: 0, writable: true });
    });

    it('should return 1.0 for fully visible bounds', () => {
      const bounds: AbsoluteBounds = {
        top: 100,
        left: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: 300
      };

      const ratio = calculateVisibleRatio(bounds);

      expect(ratio).toBe(1.0);
    });

    it('should return 0 for completely invisible bounds', () => {
      const bounds: AbsoluteBounds = {
        top: 2000,
        left: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: 2200
      };

      const ratio = calculateVisibleRatio(bounds);

      expect(ratio).toBe(0);
    });

    it('should calculate partial visibility', () => {
      // Bounds: 100x200 = 20,000px²
      // Half is below viewport
      const bounds: AbsoluteBounds = {
        top: 1000,      // 80px visible (1080 - 1000)
        left: 100,
        width: 100,
        height: 200,
        right: 200,
        bottom: 1200
      };

      // Visible: 100 x 80 = 8,000px²
      // Total: 100 x 200 = 20,000px²
      // Ratio: 8,000 / 20,000 = 0.4

      const ratio = calculateVisibleRatio(bounds);

      expect(ratio).toBeCloseTo(0.4, 2);
    });
  });
});
