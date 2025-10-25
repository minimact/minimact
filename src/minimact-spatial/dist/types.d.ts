/**
 * minimact-spatial - Type Definitions
 *
 * 📐 Spatial computing for the web
 * Query the viewport as a 2D database
 */
/**
 * Area definition - how to define a spatial region
 */
export type AreaDefinition = string | BoundsDefinition | Element;
/**
 * Bounds definition with flexible units
 */
export interface BoundsDefinition {
    /** Top edge (pixels, %, vh, or viewport keyword) */
    top?: number | string;
    /** Left edge */
    left?: number | string;
    /** Right edge (alternative to left + width) */
    right?: number | string;
    /** Bottom edge (alternative to top + height) */
    bottom?: number | string;
    /** Width */
    width?: number | string;
    /** Height */
    height?: number | string;
    /** Optional: relative to another area */
    relativeTo?: AreaDefinition;
}
/**
 * Absolute bounds in pixels
 */
export interface AbsoluteBounds {
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
}
/**
 * Area state - reactive properties of a spatial region
 */
export interface AreaState {
    /** Absolute bounds in pixels */
    bounds: AbsoluteBounds;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
    /** Total area in pixels² */
    area: number;
    /** Center point */
    center: {
        x: number;
        y: number;
    };
    /** Elements fully enclosed within this area */
    elementsFullyEnclosed: Element[];
    /** Elements partially overlapping this area */
    elementsPartiallyEnclosed: Element[];
    /** All elements (fully + partially) */
    elementsAll: Element[];
    /** Total element count */
    elementsCount: number;
    /** Count of fully enclosed elements */
    elementsFullyCount: number;
    /** Count of partially enclosed elements */
    elementsPartiallyCount: number;
    /** Coverage ratio: 0.0 (empty) to 1.0 (fully covered) */
    coverage: number;
    /** Total pixels covered by elements */
    totalPixelsCovered: number;
    /** Empty space in pixels² */
    emptySpace: number;
    /** Empty space ratio: 0.0 (full) to 1.0 (empty) */
    emptyRatio: number;
    /** Element density (elements per 1000px²) */
    elementDensity: number;
    /** Average element size in pixels² */
    averageElementSize: number;
    /** Largest element in this area */
    largestElement: Element | null;
    /** Smallest element in this area */
    smallestElement: Element | null;
    /**
     * Check if this area intersects another
     */
    intersects(other: AreaState): boolean;
    /**
     * Get intersection ratio with another area (0.0-1.0)
     */
    intersectionRatio(other: AreaState): number;
    /**
     * Get intersection area in pixels²
     */
    intersectionArea(other: AreaState): number;
    /**
     * Check if element is fully contained
     */
    contains(element: Element): boolean;
    /**
     * Check if element partially overlaps
     */
    overlaps(element: Element): boolean;
    /**
     * Distance to another area (edge-to-edge)
     */
    distance(other: AreaState): number;
    /**
     * Distance to center of another area
     */
    centerDistance(other: AreaState): number;
    /**
     * Get elements by tag name within area
     */
    getElementsByTag(tagName: string): Element[];
    /**
     * Get elements by class within area
     */
    getElementsByClass(className: string): Element[];
    /**
     * Query selector within area
     */
    querySelector(selector: string): Element | null;
    /**
     * Query all within area
     */
    querySelectorAll(selector: string): Element[];
    /** Is this area currently in viewport? */
    isInViewport: boolean;
    /** Visible portion of this area (0.0-1.0) */
    visibleRatio: number;
    /** Visible pixels */
    visiblePixels: number;
    /** Is area empty (no elements)? */
    isEmpty: boolean;
    /** Is area full (high coverage)? */
    isFull: boolean;
    /** Is area sparse (low density)? */
    isSparse: boolean;
}
/**
 * Area configuration options
 */
export interface AreaOptions {
    /** Element filter (only track certain elements) */
    elementFilter?: (element: Element) => boolean;
    /** Minimum element size to track (px²) */
    minElementSize?: number;
    /** Update on scroll? */
    trackScroll?: boolean;
    /** Update on resize? */
    trackResize?: boolean;
    /** Update on mutations? */
    trackMutations?: boolean;
    /** Throttle update interval (ms) */
    throttle?: number;
    /** Debug logging */
    debugLogging?: boolean;
}
/**
 * Element enclosure info
 */
export interface ElementEnclosure {
    element: Element;
    bounds: DOMRect;
    enclosureType: 'full' | 'partial' | 'none';
    overlapRatio: number;
    overlapArea: number;
}
/**
 * Spatial query result
 */
export interface SpatialQueryResult {
    area: AreaState;
    elements: ElementEnclosure[];
    totalElements: number;
    coverage: number;
}
