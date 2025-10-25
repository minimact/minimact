/**
 * minimact-spatial - Spatial Computing for the Web
 *
 * 📐 Query the viewport as a 2D database
 *
 * Turn spatial regions into reactive data sources.
 */
// Integrated mode (with Minimact)
export { useArea, setComponentContext, clearComponentContext, getCurrentContext, cleanupAreas } from './integration';
export { calculateBounds, boundsIntersect, calculateIntersection, calculateDistance, calculateCenterDistance, isFullyEnclosed, isPartiallyEnclosed } from './bounds-calculator';
export { queryElementsInBounds, calculateCoverage, getElementEnclosure, calculateElementStats, calculateDensity, isInViewport, calculateVisibleRatio, getElementsByTagInBounds, getElementsByClassInBounds, querySelectorInBounds, querySelectorAllInBounds } from './spatial-engine';
export const VERSION = '0.1.0';
export const CODENAME = 'SpatialWeb';
