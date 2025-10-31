/**
 * Transform Handler
 * Manages transform functions (inline and registry-based)
 */
import type { TargetProjection, TransformFunction, TransformRegistryEntry } from './types';
/**
 * Global transform registry
 * Stores reusable transform functions accessible by ID
 */
export declare class TransformHandler {
    private static registry;
    /**
     * Register a reusable transform function
     *
     * @example
     * TransformHandler.registerTransform('currency-usd', v => `$${v.toFixed(2)}`, 'Format as USD currency');
     * TransformHandler.registerTransform('percentage', v => `${(v * 100).toFixed(0)}%`);
     */
    static registerTransform(id: string, fn: TransformFunction, description?: string): void;
    /**
     * Register multiple transforms at once
     *
     * @example
     * TransformHandler.registerTransforms({
     *   'currency-usd': v => `$${v.toFixed(2)}`,
     *   'percentage': v => `${(v * 100).toFixed(0)}%`,
     *   'uppercase': v => v.toUpperCase()
     * });
     */
    static registerTransforms(transforms: Record<string, TransformFunction>): void;
    /**
     * Get a registered transform by ID
     */
    static getTransform(id: string): TransformFunction | undefined;
    /**
     * Check if a transform ID is registered
     */
    static hasTransform(id: string): boolean;
    /**
     * Get all registered transform IDs
     */
    static getRegisteredIds(): string[];
    /**
     * Get all registered transforms with metadata
     */
    static getAllTransforms(): TransformRegistryEntry[];
    /**
     * Clear all registered transforms
     * Useful for testing
     */
    static clearRegistry(): void;
    /**
     * Apply a transform to a value
     * Handles both inline transforms and registry-based transforms
     *
     * @param config - Target projection config
     * @param value - Value to transform
     * @returns Transformed value or stringified value if no transform
     */
    static applyTransform<T>(config: TargetProjection<T>, value: T): string | number | boolean;
    /**
     * Validate a transform function
     * Ensures it's pure and serializable (for Babel static analysis)
     *
     * @param fn - Function to validate
     * @returns Validation result
     */
    static validateTransform(fn: Function): {
        isValid: boolean;
        isPure: boolean;
        isSerializable: boolean;
        warnings: string[];
    };
}
//# sourceMappingURL=transform-handler.d.ts.map