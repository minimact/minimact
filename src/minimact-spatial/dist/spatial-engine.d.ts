/**
 * minimact-spatial - Spatial Query Engine
 *
 * Query elements within spatial regions
 * Analyze coverage, density, and relationships
 */
import type { AbsoluteBounds, ElementEnclosure, AreaOptions } from './types';
/**
 * Query all elements within bounds
 */
export declare function queryElementsInBounds(bounds: AbsoluteBounds, options?: AreaOptions): {
    fully: Element[];
    partially: Element[];
    all: Element[];
};
/**
 * Calculate coverage ratio of bounds
 */
export declare function calculateCoverage(elements: Element[], bounds: AbsoluteBounds): number;
/**
 * Get element enclosure info
 */
export declare function getElementEnclosure(element: Element, bounds: AbsoluteBounds): ElementEnclosure;
/**
 * Calculate element statistics
 */
export declare function calculateElementStats(elements: Element[]): {
    averageSize: number;
    totalSize: number;
    largestElement: null;
    smallestElement: null;
    largestSize: number;
    smallestSize: number;
};
/**
 * Calculate element density (elements per 1000px²)
 */
export declare function calculateDensity(elementCount: number, bounds: AbsoluteBounds): number;
/**
 * Check if bounds are in viewport
 */
export declare function isInViewport(bounds: AbsoluteBounds): boolean;
/**
 * Calculate visible ratio (how much is in viewport)
 */
export declare function calculateVisibleRatio(bounds: AbsoluteBounds): number;
/**
 * Query elements by tag within bounds
 */
export declare function getElementsByTagInBounds(tagName: string, bounds: AbsoluteBounds, elements: Element[]): Element[];
/**
 * Query elements by class within bounds
 */
export declare function getElementsByClassInBounds(className: string, bounds: AbsoluteBounds, elements: Element[]): Element[];
/**
 * Query selector within bounds
 */
export declare function querySelectorInBounds(selector: string, elements: Element[]): Element | null;
/**
 * Query all selectors within bounds
 */
export declare function querySelectorAllInBounds(selector: string, elements: Element[]): Element[];
