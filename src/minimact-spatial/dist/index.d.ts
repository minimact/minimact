/**
 * minimact-spatial - Spatial Computing for the Web
 *
 * 📐 Query the viewport as a 2D database
 *
 * Turn spatial regions into reactive data sources.
 */
export { useArea, setComponentContext, clearComponentContext, getCurrentContext, cleanupAreas } from './integration';
export { calculateBounds, boundsIntersect, calculateIntersection, calculateDistance, calculateCenterDistance, isFullyEnclosed, isPartiallyEnclosed } from './bounds-calculator';
export { queryElementsInBounds, calculateCoverage, getElementEnclosure, calculateElementStats, calculateDensity, isInViewport, calculateVisibleRatio, getElementsByTagInBounds, getElementsByClassInBounds, querySelectorInBounds, querySelectorAllInBounds } from './spatial-engine';
export type { AreaDefinition, BoundsDefinition, AbsoluteBounds, AreaState, AreaOptions, ElementEnclosure, SpatialQueryResult } from './types';
export declare const VERSION = "0.1.0";
export declare const CODENAME = "SpatialWeb";
