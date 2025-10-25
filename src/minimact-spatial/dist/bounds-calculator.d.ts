/**
 * minimact-spatial - Bounds Calculator
 *
 * Converts flexible area definitions to absolute pixel bounds
 */
import type { AreaDefinition, AbsoluteBounds } from './types';
/**
 * Calculate absolute bounds from area definition
 */
export declare function calculateBounds(definition: AreaDefinition): AbsoluteBounds;
/**
 * Check if two bounds intersect
 */
export declare function boundsIntersect(a: AbsoluteBounds, b: AbsoluteBounds): boolean;
/**
 * Calculate intersection bounds
 */
export declare function calculateIntersection(a: AbsoluteBounds, b: AbsoluteBounds): AbsoluteBounds | null;
/**
 * Calculate distance between bounds (edge-to-edge)
 */
export declare function calculateDistance(a: AbsoluteBounds, b: AbsoluteBounds): number;
/**
 * Calculate center-to-center distance
 */
export declare function calculateCenterDistance(a: AbsoluteBounds, b: AbsoluteBounds): number;
/**
 * Check if element bounds are fully enclosed
 */
export declare function isFullyEnclosed(element: DOMRect, area: AbsoluteBounds): boolean;
/**
 * Check if element bounds partially overlap
 */
export declare function isPartiallyEnclosed(element: DOMRect, area: AbsoluteBounds): boolean;
