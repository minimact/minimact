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
export class DomElementStateValues {
    constructor(elements) {
        this.elements = elements;
    }
    /**
     * Extract numeric values from elements
     * Priority: data-value attribute > textContent parsing
     */
    extractNumericValues() {
        return this.elements.map(state => {
            const element = state.element;
            if (!element)
                return 0;
            // Try data-value attribute first
            const dataValue = element.getAttribute('data-value');
            if (dataValue !== null) {
                const parsed = parseFloat(dataValue);
                return isNaN(parsed) ? 0 : parsed;
            }
            // Fall back to parsing textContent
            const text = element.textContent || '';
            const cleaned = text.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        });
    }
    /**
     * Average of all values
     */
    avg() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Sum of all values
     */
    sum() {
        return this.extractNumericValues().reduce((a, b) => a + b, 0);
    }
    /**
     * Minimum value
     */
    min() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.min(...values);
    }
    /**
     * Maximum value
     */
    max() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.max(...values);
    }
    /**
     * Median value (middle value when sorted)
     */
    median() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            // Even number of values - average the two middle values
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        else {
            // Odd number of values - return middle value
            return sorted[mid];
        }
    }
    /**
     * Standard deviation
     */
    stdDev() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const avg = this.avg();
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
    /**
     * Range (min and max)
     */
    range() {
        return {
            min: this.min(),
            max: this.max()
        };
    }
    /**
     * Percentile (e.g., percentile(95) for 95th percentile)
     */
    percentile(p) {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (lower === upper) {
            return sorted[lower];
        }
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    /**
     * Check if all values are above a threshold
     */
    allAbove(threshold) {
        return this.extractNumericValues().every(v => v > threshold);
    }
    /**
     * Check if any value is below a threshold
     */
    anyBelow(threshold) {
        return this.extractNumericValues().some(v => v < threshold);
    }
    /**
     * Count values above a threshold
     */
    countAbove(threshold) {
        return this.extractNumericValues().filter(v => v > threshold).length;
    }
    /**
     * Count values below a threshold
     */
    countBelow(threshold) {
        return this.extractNumericValues().filter(v => v < threshold).length;
    }
    /**
     * Count values in a range (inclusive)
     */
    countInRange(min, max) {
        return this.extractNumericValues().filter(v => v >= min && v <= max).length;
    }
    /**
     * Get all values as array
     */
    toArray() {
        return this.extractNumericValues();
    }
}
