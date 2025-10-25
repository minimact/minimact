/**
 * minimact-spatial - Spatial Query Engine
 *
 * Query elements within spatial regions
 * Analyze coverage, density, and relationships
 */
import { boundsIntersect, calculateIntersection, isFullyEnclosed, isPartiallyEnclosed } from './bounds-calculator';
/**
 * Query all elements within bounds
 */
export function queryElementsInBounds(bounds, options) {
    // Get all elements (or filtered subset)
    const allElements = Array.from(document.querySelectorAll('*'));
    const fully = [];
    const partially = [];
    allElements.forEach(element => {
        // Apply filter if provided
        if (options?.elementFilter && !options.elementFilter(element)) {
            return;
        }
        const rect = element.getBoundingClientRect();
        // Check minimum size
        if (options?.minElementSize) {
            const size = rect.width * rect.height;
            if (size < options.minElementSize) {
                return;
            }
        }
        // Check enclosure
        if (isFullyEnclosed(rect, bounds)) {
            fully.push(element);
        }
        else if (isPartiallyEnclosed(rect, bounds)) {
            partially.push(element);
        }
    });
    return {
        fully,
        partially,
        all: [...fully, ...partially]
    };
}
/**
 * Calculate coverage ratio of bounds
 */
export function calculateCoverage(elements, bounds) {
    if (elements.length === 0) {
        return 0;
    }
    // Calculate total pixel coverage
    let totalCovered = 0;
    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        // Calculate intersection with bounds
        const intersection = calculateIntersection({
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
        }, bounds);
        if (intersection) {
            totalCovered += intersection.width * intersection.height;
        }
    });
    // Calculate ratio
    const boundsArea = bounds.width * bounds.height;
    return Math.min(totalCovered / boundsArea, 1.0);
}
/**
 * Get element enclosure info
 */
export function getElementEnclosure(element, bounds) {
    const rect = element.getBoundingClientRect();
    const elementBounds = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
    };
    // Determine enclosure type
    let enclosureType;
    if (isFullyEnclosed(rect, bounds)) {
        enclosureType = 'full';
    }
    else if (isPartiallyEnclosed(rect, bounds)) {
        enclosureType = 'partial';
    }
    else {
        enclosureType = 'none';
    }
    // Calculate overlap
    const intersection = calculateIntersection(elementBounds, bounds);
    const elementArea = rect.width * rect.height;
    const overlapArea = intersection ? intersection.width * intersection.height : 0;
    const overlapRatio = elementArea > 0 ? overlapArea / elementArea : 0;
    return {
        element,
        bounds: rect,
        enclosureType,
        overlapRatio,
        overlapArea
    };
}
/**
 * Calculate element statistics
 */
export function calculateElementStats(elements) {
    if (elements.length === 0) {
        return {
            averageSize: 0,
            totalSize: 0,
            largestElement: null,
            smallestElement: null,
            largestSize: 0,
            smallestSize: 0
        };
    }
    let totalSize = 0;
    let largestElement = null;
    let smallestElement = null;
    let largestSize = 0;
    let smallestSize = Infinity;
    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const size = rect.width * rect.height;
        totalSize += size;
        if (size > largestSize) {
            largestSize = size;
            largestElement = element;
        }
        if (size < smallestSize) {
            smallestSize = size;
            smallestElement = element;
        }
    });
    return {
        averageSize: totalSize / elements.length,
        totalSize,
        largestElement,
        smallestElement,
        largestSize,
        smallestSize
    };
}
/**
 * Calculate element density (elements per 1000px²)
 */
export function calculateDensity(elementCount, bounds) {
    const area = bounds.width * bounds.height;
    if (area === 0)
        return 0;
    // Elements per 1000px²
    return (elementCount / area) * 1000;
}
/**
 * Check if bounds are in viewport
 */
export function isInViewport(bounds) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportBounds = {
        top: scrollTop,
        left: scrollLeft,
        width: window.innerWidth,
        height: window.innerHeight,
        right: scrollLeft + window.innerWidth,
        bottom: scrollTop + window.innerHeight
    };
    return boundsIntersect(bounds, viewportBounds);
}
/**
 * Calculate visible ratio (how much is in viewport)
 */
export function calculateVisibleRatio(bounds) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportBounds = {
        top: scrollTop,
        left: scrollLeft,
        width: window.innerWidth,
        height: window.innerHeight,
        right: scrollLeft + window.innerWidth,
        bottom: scrollTop + window.innerHeight
    };
    const intersection = calculateIntersection(bounds, viewportBounds);
    if (!intersection) {
        return 0;
    }
    const boundsArea = bounds.width * bounds.height;
    const intersectionArea = intersection.width * intersection.height;
    return boundsArea > 0 ? intersectionArea / boundsArea : 0;
}
/**
 * Query elements by tag within bounds
 */
export function getElementsByTagInBounds(tagName, bounds, elements) {
    return elements.filter(el => el.tagName.toLowerCase() === tagName.toLowerCase());
}
/**
 * Query elements by class within bounds
 */
export function getElementsByClassInBounds(className, bounds, elements) {
    return elements.filter(el => el.classList.contains(className));
}
/**
 * Query selector within bounds
 */
export function querySelectorInBounds(selector, elements) {
    return elements.find(el => el.matches(selector)) || null;
}
/**
 * Query all selectors within bounds
 */
export function querySelectorAllInBounds(selector, elements) {
    return elements.filter(el => el.matches(selector));
}
