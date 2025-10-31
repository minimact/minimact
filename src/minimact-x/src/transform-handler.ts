/**
 * Transform Handler
 * Manages transform functions (inline and registry-based)
 */

import type { TargetProjection, TransformFunction, TransformRegistryEntry } from './types';

/**
 * Global transform registry
 * Stores reusable transform functions accessible by ID
 */
export class TransformHandler {
  private static registry = new Map<string, TransformRegistryEntry>();

  /**
   * Register a reusable transform function
   *
   * @example
   * TransformHandler.registerTransform('currency-usd', v => `$${v.toFixed(2)}`, 'Format as USD currency');
   * TransformHandler.registerTransform('percentage', v => `${(v * 100).toFixed(0)}%`);
   */
  static registerTransform(
    id: string,
    fn: TransformFunction,
    description?: string
  ): void {
    if (this.registry.has(id)) {
      console.warn(`[useStateX] Transform '${id}' already registered. Overwriting.`);
    }

    this.registry.set(id, { id, fn, description });
  }

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
  static registerTransforms(transforms: Record<string, TransformFunction>): void {
    Object.entries(transforms).forEach(([id, fn]) => {
      this.registerTransform(id, fn);
    });
  }

  /**
   * Get a registered transform by ID
   */
  static getTransform(id: string): TransformFunction | undefined {
    return this.registry.get(id)?.fn;
  }

  /**
   * Check if a transform ID is registered
   */
  static hasTransform(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Get all registered transform IDs
   */
  static getRegisteredIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered transforms with metadata
   */
  static getAllTransforms(): TransformRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Clear all registered transforms
   * Useful for testing
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Apply a transform to a value
   * Handles both inline transforms and registry-based transforms
   *
   * @param config - Target projection config
   * @param value - Value to transform
   * @returns Transformed value or stringified value if no transform
   */
  static applyTransform<T>(
    config: TargetProjection<T>,
    value: T
  ): string | number | boolean {
    try {
      // 1. Check if transform ID is provided (Registry approach)
      if (config.transformId) {
        const fn = this.getTransform(config.transformId);

        if (fn) {
          const result = fn(value);
          return result;
        }

        console.warn(
          `[useStateX] Transform '${config.transformId}' not found in registry. ` +
          `Falling back to inline transform or toString.`
        );
      }

      // 2. Use inline transform (Static Analysis approach)
      if (config.transform) {
        const result = config.transform(value);
        return result;
      }

      // 3. Fallback to toString
      return String(value);
    } catch (error) {
      console.error('[useStateX] Transform error:', error);

      // Rethrow so caller can handle
      throw error;
    }
  }

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
  } {
    const warnings: string[] = [];
    let isPure = true;
    let isSerializable = true;

    const fnString = fn.toString();

    // Check for common impure patterns
    if (fnString.includes('Math.random')) {
      warnings.push('Transform uses Math.random() - not pure');
      isPure = false;
    }

    if (fnString.includes('Date.now')) {
      warnings.push('Transform uses Date.now() - not pure');
      isPure = false;
    }

    if (fnString.includes('new Date()')) {
      warnings.push('Transform uses new Date() - not pure');
      isPure = false;
    }

    // Check for closure variables (basic heuristic)
    if (fnString.includes('=>') || fnString.includes('function')) {
      // Check if it references variables outside the function scope
      // This is a simplified check - real analysis would need AST parsing
      const varNames = fnString.match(/(?:const|let|var)\s+(\w+)/g);
      if (varNames && varNames.length > 1) {
        warnings.push('Transform may reference external variables - may not be serializable');
        isSerializable = false;
      }
    }

    // Check for complex logic (multiple statements)
    if (fnString.includes('{') && fnString.includes(';')) {
      warnings.push('Transform has multiple statements - may not be serializable via Babel');
      isSerializable = false;
    }

    const isValid = warnings.length === 0;

    return {
      isValid,
      isPure,
      isSerializable,
      warnings
    };
  }
}

/**
 * Pre-register common transforms
 */
TransformHandler.registerTransforms({
  // Currency formatting
  'currency-usd': v => `$${Number(v).toFixed(2)}`,
  'currency-eur': v => `€${Number(v).toFixed(2)}`,
  'currency-gbp': v => `£${Number(v).toFixed(2)}`,

  // Percentage formatting
  'percentage': v => `${(Number(v) * 100).toFixed(0)}%`,
  'percentage-1': v => `${(Number(v) * 100).toFixed(1)}%`,
  'percentage-2': v => `${(Number(v) * 100).toFixed(2)}%`,

  // String transformations
  'uppercase': v => String(v).toUpperCase(),
  'lowercase': v => String(v).toLowerCase(),
  'capitalize': v => {
    const str = String(v);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  'trim': v => String(v).trim(),

  // Number formatting
  'number-0': v => Number(v).toFixed(0),
  'number-1': v => Number(v).toFixed(1),
  'number-2': v => Number(v).toFixed(2),
  'number-comma': v => Number(v).toLocaleString(),

  // Date formatting (basic - for complex dates, use external library)
  'date-short': v => new Date(v).toLocaleDateString(),
  'date-long': v => new Date(v).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  'time-short': v => new Date(v).toLocaleTimeString(),
  'datetime-short': v => new Date(v).toLocaleString(),

  // Boolean formatting
  'yes-no': v => v ? 'Yes' : 'No',
  'true-false': v => v ? 'True' : 'False',
  'on-off': v => v ? 'On' : 'Off',
  'check-x': v => v ? '✓' : '✗',
  'check-circle': v => v ? '●' : '○',

  // Array formatting
  'array-length': v => Array.isArray(v) ? v.length.toString() : '0',
  'array-join': v => Array.isArray(v) ? v.join(', ') : '',
  'array-count': v => Array.isArray(v) ? `${v.length} items` : '0 items',

  // Misc
  'stringify': v => JSON.stringify(v),
  'to-string': v => String(v),
  'empty-dash': v => v ? String(v) : '-',
  'empty-na': v => v ? String(v) : 'N/A'
});
