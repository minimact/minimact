/**
 * minimact-spatial - Bounds Calculator
 *
 * Converts flexible area definitions to absolute pixel bounds
 */
/**
 * Calculate absolute bounds from area definition
 */
export function calculateBounds(definition) {
    // Handle string (selector or keyword)
    if (typeof definition === 'string') {
        return calculateBoundsFromString(definition);
    }
    // Handle Element
    if (definition instanceof Element) {
        return calculateBoundsFromElement(definition);
    }
    // Handle BoundsDefinition
    return calculateBoundsFromDefinition(definition);
}
/**
 * Calculate bounds from string (selector or keyword)
 */
function calculateBoundsFromString(str) {
    // Special keywords
    if (str === 'viewport' || str === 'window') {
        return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
    }
    if (str === 'document') {
        return {
            top: 0,
            left: 0,
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            right: document.documentElement.scrollWidth,
            bottom: document.documentElement.scrollHeight
        };
    }
    // Try as selector
    const element = document.querySelector(str);
    if (!element) {
        throw new Error(`[minimact-spatial] Element not found: ${str}`);
    }
    return calculateBoundsFromElement(element);
}
/**
 * Calculate bounds from element
 */
function calculateBoundsFromElement(element) {
    const rect = element.getBoundingClientRect();
    // Convert to document coordinates (add scroll offset)
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
        right: rect.left + scrollLeft + rect.width,
        bottom: rect.top + scrollTop + rect.height
    };
}
/**
 * Calculate bounds from bounds definition
 */
function calculateBoundsFromDefinition(def) {
    // Get reference bounds (if relativeTo specified)
    const referenceBounds = def.relativeTo
        ? calculateBounds(def.relativeTo)
        : {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
    // Convert flexible values to absolute pixels
    const top = resolveValue(def.top, referenceBounds.height, referenceBounds.top);
    const left = resolveValue(def.left, referenceBounds.width, referenceBounds.left);
    let width;
    let height;
    // Calculate width
    if (def.width !== undefined) {
        width = resolveValue(def.width, referenceBounds.width, 0);
    }
    else if (def.right !== undefined) {
        const right = resolveValue(def.right, referenceBounds.width, referenceBounds.left);
        width = right - left;
    }
    else {
        width = referenceBounds.width - left;
    }
    // Calculate height
    if (def.height !== undefined) {
        height = resolveValue(def.height, referenceBounds.height, 0);
    }
    else if (def.bottom !== undefined) {
        const bottom = resolveValue(def.bottom, referenceBounds.height, referenceBounds.top);
        height = bottom - top;
    }
    else {
        height = referenceBounds.height - top;
    }
    return {
        top,
        left,
        width,
        height,
        right: left + width,
        bottom: top + height
    };
}
/**
 * Resolve flexible value to pixels
 *
 * @param value - Number (pixels), string (%, vh, vw), or undefined
 * @param referenceSize - Reference size for percentage calculations
 * @param referenceOffset - Reference offset for absolute positioning
 */
function resolveValue(value, referenceSize, referenceOffset) {
    if (value === undefined) {
        return referenceOffset;
    }
    // Already a number (pixels)
    if (typeof value === 'number') {
        return value;
    }
    // String - parse unit
    const str = value.trim();
    // Percentage
    if (str.endsWith('%')) {
        const percent = parseFloat(str) / 100;
        return referenceOffset + referenceSize * percent;
    }
    // Viewport height
    if (str.endsWith('vh')) {
        const vh = parseFloat(str);
        return (window.innerHeight * vh) / 100;
    }
    // Viewport width
    if (str.endsWith('vw')) {
        const vw = parseFloat(str);
        return (window.innerWidth * vw) / 100;
    }
    // Pixels (explicit)
    if (str.endsWith('px')) {
        return parseFloat(str);
    }
    // Default: try to parse as number
    const num = parseFloat(str);
    if (!isNaN(num)) {
        return num;
    }
    throw new Error(`[minimact-spatial] Invalid value: ${value}`);
}
/**
 * Check if two bounds intersect
 */
export function boundsIntersect(a, b) {
    return !(a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom);
}
/**
 * Calculate intersection bounds
 */
export function calculateIntersection(a, b) {
    if (!boundsIntersect(a, b)) {
        return null;
    }
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
    };
}
/**
 * Calculate distance between bounds (edge-to-edge)
 */
export function calculateDistance(a, b) {
    // If intersecting, distance is 0
    if (boundsIntersect(a, b)) {
        return 0;
    }
    // Calculate horizontal distance
    let dx = 0;
    if (a.right < b.left) {
        dx = b.left - a.right;
    }
    else if (b.right < a.left) {
        dx = a.left - b.right;
    }
    // Calculate vertical distance
    let dy = 0;
    if (a.bottom < b.top) {
        dy = b.top - a.bottom;
    }
    else if (b.bottom < a.top) {
        dy = a.top - b.bottom;
    }
    // Return Euclidean distance
    return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Calculate center-to-center distance
 */
export function calculateCenterDistance(a, b) {
    const aCenterX = a.left + a.width / 2;
    const aCenterY = a.top + a.height / 2;
    const bCenterX = b.left + b.width / 2;
    const bCenterY = b.top + b.height / 2;
    const dx = aCenterX - bCenterX;
    const dy = aCenterY - bCenterY;
    return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Check if element bounds are fully enclosed
 */
export function isFullyEnclosed(element, area) {
    return (element.left >= area.left &&
        element.right <= area.right &&
        element.top >= area.top &&
        element.bottom <= area.bottom);
}
/**
 * Check if element bounds partially overlap
 */
export function isPartiallyEnclosed(element, area) {
    return boundsIntersect({
        left: element.left,
        top: element.top,
        right: element.right,
        bottom: element.bottom,
        width: element.width,
        height: element.height
    }, area);
}
