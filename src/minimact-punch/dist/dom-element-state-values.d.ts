import type { DomElementState } from './dom-element-state';
/**
 * Statistical operations on DOM element collections
 *
 * Provides avg, sum, median, stdDev, and other aggregations
 * by extracting numeric values from elements.
 *
 * @example
 * ```typescript
 * const prices = new DomElementState('.price');
 * prices.vals.avg(); // 29.99
 * prices.vals.sum(); // 149.95
 * prices.vals.median(); // 25.00
 * ```
 */
export declare class DomElementStateValues {
    private elements;
    constructor(elements: DomElementState[]);
    /**
     * Extract numeric values from elements
     * Priority: data-value attribute > textContent parsing
     */
    private extractNumericValues;
    /**
     * Average of all values
     */
    avg(): number;
    /**
     * Sum of all values
     */
    sum(): number;
    /**
     * Minimum value
     */
    min(): number;
    /**
     * Maximum value
     */
    max(): number;
    /**
     * Median value (middle value when sorted)
     */
    median(): number;
    /**
     * Standard deviation
     */
    stdDev(): number;
    /**
     * Range (min and max)
     */
    range(): {
        min: number;
        max: number;
    };
    /**
     * Percentile (e.g., percentile(95) for 95th percentile)
     */
    percentile(p: number): number;
    /**
     * Check if all values are above a threshold
     */
    allAbove(threshold: number): boolean;
    /**
     * Check if any value is below a threshold
     */
    anyBelow(threshold: number): boolean;
    /**
     * Count values above a threshold
     */
    countAbove(threshold: number): number;
    /**
     * Count values below a threshold
     */
    countBelow(threshold: number): number;
    /**
     * Count values in a range (inclusive)
     */
    countInRange(min: number, max: number): number;
    /**
     * Get all values as array
     */
    toArray(): number[];
}
//# sourceMappingURL=dom-element-state-values.d.ts.map