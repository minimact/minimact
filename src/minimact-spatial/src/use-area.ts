/**
 * minimact-spatial - useArea Hook
 *
 * 📐 Reactive spatial regions
 * Query viewport as a 2D database
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { AreaDefinition, AreaState, AreaOptions, AbsoluteBounds } from './types';
import { calculateBounds, calculateDistance, calculateCenterDistance, calculateIntersection } from './bounds-calculator';
import {
  queryElementsInBounds,
  calculateCoverage,
  calculateElementStats,
  calculateDensity,
  isInViewport,
  calculateVisibleRatio,
  getElementsByTagInBounds,
  getElementsByClassInBounds,
  querySelectorInBounds,
  querySelectorAllInBounds
} from './spatial-engine';

/**
 * useArea - Track a spatial region reactively
 *
 * @param definition - Area definition (selector, bounds, or element)
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const header = useArea({ top: 0, height: 80 });
 * const sidebar = useArea('#sidebar');
 * const viewport = useArea('viewport');
 *
 * console.log(header.elementsCount);  // 5
 * console.log(sidebar.coverage);      // 0.75
 * console.log(viewport.isEmpty);      // false
 * ```
 */
export function useArea(
  definition: AreaDefinition,
  options?: AreaOptions
): AreaState {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const boundsRef = useRef<AbsoluteBounds | null>(null);
  const rafRef = useRef<number | null>(null);

  // Throttle updates
  const throttle = options?.throttle || 100;
  const lastUpdateRef = useRef(0);

  const triggerUpdate = () => {
    const now = Date.now();
    if (now - lastUpdateRef.current < throttle) {
      return;
    }
    lastUpdateRef.current = now;
    setUpdateTrigger(prev => prev + 1);
  };

  // Calculate bounds (memoized)
  const bounds = useMemo(() => {
    try {
      const calculated = calculateBounds(definition);
      boundsRef.current = calculated;
      return calculated;
    } catch (error) {
      console.error('[minimact-spatial] Failed to calculate bounds:', error);
      return boundsRef.current || {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0
      };
    }
  }, [definition, updateTrigger]);

  // Query elements (memoized)
  const elementQuery = useMemo(() => {
    return queryElementsInBounds(bounds, options);
  }, [bounds, updateTrigger]);

  // Calculate statistics (memoized)
  const stats = useMemo(() => {
    const coverage = calculateCoverage(elementQuery.all, bounds);
    const elementStats = calculateElementStats(elementQuery.all);
    const area = bounds.width * bounds.height;
    const density = calculateDensity(elementQuery.all.length, bounds);
    const totalPixelsCovered = coverage * area;
    const emptySpace = area - totalPixelsCovered;
    const emptyRatio = area > 0 ? emptySpace / area : 0;
    const inViewport = isInViewport(bounds);
    const visibleRatio = calculateVisibleRatio(bounds);
    const visiblePixels = visibleRatio * area;

    return {
      coverage,
      totalPixelsCovered,
      emptySpace,
      emptyRatio,
      elementDensity: density,
      averageElementSize: elementStats.averageSize,
      largestElement: elementStats.largestElement,
      smallestElement: elementStats.smallestElement,
      isInViewport: inViewport,
      visibleRatio,
      visiblePixels,
      isEmpty: elementQuery.all.length === 0,
      isFull: coverage > 0.8,
      isSparse: density < 5 // < 5 elements per 1000px²
    };
  }, [bounds, elementQuery, updateTrigger]);

  // Setup observers
  useEffect(() => {
    const updateHandlers: (() => void)[] = [];

    // Scroll tracking
    if (options?.trackScroll !== false) {
      const handleScroll = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(triggerUpdate);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      updateHandlers.push(() => window.removeEventListener('scroll', handleScroll));
    }

    // Resize tracking
    if (options?.trackResize !== false) {
      const handleResize = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(triggerUpdate);
      };
      window.addEventListener('resize', handleResize);
      updateHandlers.push(() => window.removeEventListener('resize', handleResize));
    }

    // Mutation tracking
    if (options?.trackMutations) {
      const observer = new MutationObserver(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(triggerUpdate);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      updateHandlers.push(() => observer.disconnect());
    }

    // Cleanup
    return () => {
      updateHandlers.forEach(cleanup => cleanup());
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [options?.trackScroll, options?.trackResize, options?.trackMutations, throttle]);

  // Debug logging
  useEffect(() => {
    if (options?.debugLogging) {
      console.log('[minimact-spatial] Area updated:', {
        bounds,
        elementsCount: elementQuery.all.length,
        coverage: stats.coverage,
        density: stats.elementDensity
      });
    }
  }, [bounds, elementQuery, stats, options?.debugLogging]);

  // Build AreaState API
  const areaState: AreaState = {
    // Geometry
    bounds,
    width: bounds.width,
    height: bounds.height,
    area: bounds.width * bounds.height,
    center: {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2
    },

    // Element queries
    elementsFullyEnclosed: elementQuery.fully,
    elementsPartiallyEnclosed: elementQuery.partially,
    elementsAll: elementQuery.all,
    elementsCount: elementQuery.all.length,
    elementsFullyCount: elementQuery.fully.length,
    elementsPartiallyCount: elementQuery.partially.length,

    // Coverage analysis
    coverage: stats.coverage,
    totalPixelsCovered: stats.totalPixelsCovered,
    emptySpace: stats.emptySpace,
    emptyRatio: stats.emptyRatio,

    // Element statistics
    elementDensity: stats.elementDensity,
    averageElementSize: stats.averageElementSize,
    largestElement: stats.largestElement,
    smallestElement: stats.smallestElement,

    // Spatial queries
    intersects: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      return intersection !== null;
    },

    intersectionRatio: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      if (!intersection) return 0;

      const intersectionArea = intersection.width * intersection.height;
      const thisArea = bounds.width * bounds.height;
      return thisArea > 0 ? intersectionArea / thisArea : 0;
    },

    intersectionArea: (other: AreaState) => {
      const intersection = calculateIntersection(bounds, other.bounds);
      if (!intersection) return 0;
      return intersection.width * intersection.height;
    },

    contains: (element: Element) => {
      return elementQuery.fully.includes(element);
    },

    overlaps: (element: Element) => {
      return elementQuery.all.includes(element);
    },

    distance: (other: AreaState) => {
      return calculateDistance(bounds, other.bounds);
    },

    centerDistance: (other: AreaState) => {
      return calculateCenterDistance(bounds, other.bounds);
    },

    getElementsByTag: (tagName: string) => {
      return getElementsByTagInBounds(tagName, bounds, elementQuery.all);
    },

    getElementsByClass: (className: string) => {
      return getElementsByClassInBounds(className, bounds, elementQuery.all);
    },

    querySelector: (selector: string) => {
      return querySelectorInBounds(selector, elementQuery.all);
    },

    querySelectorAll: (selector: string) => {
      return querySelectorAllInBounds(selector, elementQuery.all);
    },

    // Viewport queries
    isInViewport: stats.isInViewport,
    visibleRatio: stats.visibleRatio,
    visiblePixels: stats.visiblePixels,

    // State properties
    isEmpty: stats.isEmpty,
    isFull: stats.isFull,
    isSparse: stats.isSparse
  };

  return areaState;
}
