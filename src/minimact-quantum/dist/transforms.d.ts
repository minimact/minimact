/**
 * Built-in Transformation Functions
 *
 * Predefined transforms for common use cases:
 * - Inverse values (slider going opposite directions)
 * - Scale/offset (unit conversions, range mapping)
 * - Clamp (bounded values)
 */
import type { TransformFunction, BidirectionalTransform } from './types';
/**
 * Inverse transform - flips values around a midpoint
 *
 * @example
 * ```typescript
 * // Slider A: 0-100, Slider B: 100-0 (opposite)
 * const inverse = createInverse(0, 100);
 * inverse(0) → 100
 * inverse(100) → 0
 * inverse(50) → 50
 * ```
 */
export declare function createInverse(min: number, max: number): BidirectionalTransform;
/**
 * Scale transform - maps one range to another
 *
 * @example
 * ```typescript
 * // Convert 0-100 to 0-1
 * const scale = createScale(0, 100, 0, 1);
 * scale.forward(50) → 0.5
 * scale.backward(0.5) → 50
 * ```
 */
export declare function createScale(fromMin: number, fromMax: number, toMin: number, toMax: number): BidirectionalTransform;
/**
 * Offset transform - adds/subtracts a constant
 *
 * @example
 * ```typescript
 * const offset = createOffset(10);
 * offset.forward(5) → 15
 * offset.backward(15) → 5
 * ```
 */
export declare function createOffset(offset: number): BidirectionalTransform;
/**
 * Multiply transform - multiplies by a factor
 *
 * @example
 * ```typescript
 * const multiply = createMultiply(2);
 * multiply.forward(5) → 10
 * multiply.backward(10) → 5
 * ```
 */
export declare function createMultiply(factor: number): BidirectionalTransform;
/**
 * Clamp transform - bounds values within a range
 *
 * @example
 * ```typescript
 * const clamp = createClamp(0, 100);
 * clamp(150) → 100
 * clamp(-10) → 0
 * clamp(50) → 50
 * ```
 */
export declare function createClamp(min: number, max: number): TransformFunction;
/**
 * Round transform - rounds to nearest integer or decimal places
 *
 * @example
 * ```typescript
 * const round = createRound(2); // 2 decimal places
 * round(3.14159) → 3.14
 * round(2.5) → 2.5
 * ```
 */
export declare function createRound(decimals?: number): TransformFunction;
/**
 * Temperature conversion: Celsius ↔ Fahrenheit
 *
 * @example
 * ```typescript
 * celsiusToFahrenheit.forward(0) → 32
 * celsiusToFahrenheit.forward(100) → 212
 * celsiusToFahrenheit.backward(32) → 0
 * ```
 */
export declare const celsiusToFahrenheit: BidirectionalTransform;
/**
 * Percentage transform: 0-100 ↔ 0-1
 *
 * @example
 * ```typescript
 * percentageToDecimal.forward(50) → 0.5
 * percentageToDecimal.backward(0.75) → 75
 * ```
 */
export declare const percentageToDecimal: BidirectionalTransform;
/**
 * Degrees ↔ Radians
 *
 * @example
 * ```typescript
 * degreesToRadians.forward(180) → π
 * degreesToRadians.backward(π) → 180
 * ```
 */
export declare const degreesToRadians: BidirectionalTransform;
/**
 * Boolean inverse (toggle)
 *
 * @example
 * ```typescript
 * booleanInverse(true) → false
 * booleanInverse(false) → true
 * ```
 */
export declare const booleanInverse: BidirectionalTransform;
/**
 * String case transform
 */
export declare const stringCase: {
    toUpperCase: (value: string) => string;
    toLowerCase: (value: string) => string;
    capitalize: (value: string) => string;
};
/**
 * Compose multiple transforms into a single transform
 *
 * @example
 * ```typescript
 * const transform = composeTransforms(
 *   createScale(0, 100, 0, 1),    // 0-100 → 0-1
 *   createMultiply(10),           // 0-1 → 0-10
 *   createRound(2)                // Round to 2 decimals
 * );
 * transform.forward(50) → 5.00
 * ```
 */
export declare function composeTransforms(...transforms: (TransformFunction | BidirectionalTransform)[]): BidirectionalTransform;
/**
 * Create a throttled transform (limit update frequency)
 *
 * @example
 * ```typescript
 * const throttled = createThrottled((v) => v, 100); // Max once per 100ms
 * ```
 */
export declare function createThrottled(transform: TransformFunction, delayMs: number): TransformFunction;
/**
 * Create a debounced transform (wait for quiet period)
 *
 * @example
 * ```typescript
 * const debounced = createDebounced((v) => v, 300); // Wait 300ms after last change
 * ```
 */
export declare function createDebounced(transform: TransformFunction, delayMs: number): TransformFunction;
/**
 * Identity transform (no transformation)
 * Useful as a default or placeholder
 */
export declare const identity: BidirectionalTransform;
