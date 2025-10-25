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
export function createInverse(min: number, max: number): BidirectionalTransform {
  const transform = (value: number) => max - value + min;

  return {
    forward: transform,
    backward: transform // Inverse is its own inverse
  };
}

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
export function createScale(
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): BidirectionalTransform {
  const forward = (value: number) => {
    const normalized = (value - fromMin) / (fromMax - fromMin);
    return normalized * (toMax - toMin) + toMin;
  };

  const backward = (value: number) => {
    const normalized = (value - toMin) / (toMax - toMin);
    return normalized * (fromMax - fromMin) + fromMin;
  };

  return { forward, backward };
}

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
export function createOffset(offset: number): BidirectionalTransform {
  return {
    forward: (value: number) => value + offset,
    backward: (value: number) => value - offset
  };
}

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
export function createMultiply(factor: number): BidirectionalTransform {
  return {
    forward: (value: number) => value * factor,
    backward: (value: number) => value / factor
  };
}

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
export function createClamp(min: number, max: number): TransformFunction {
  return (value: number) => Math.max(min, Math.min(max, value));
}

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
export function createRound(decimals: number = 0): TransformFunction {
  const factor = Math.pow(10, decimals);
  return (value: number) => Math.round(value * factor) / factor;
}

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
export const celsiusToFahrenheit: BidirectionalTransform = {
  forward: (c: number) => (c * 9/5) + 32,
  backward: (f: number) => (f - 32) * 5/9
};

/**
 * Percentage transform: 0-100 ↔ 0-1
 *
 * @example
 * ```typescript
 * percentageToDecimal.forward(50) → 0.5
 * percentageToDecimal.backward(0.75) → 75
 * ```
 */
export const percentageToDecimal: BidirectionalTransform = createScale(0, 100, 0, 1);

/**
 * Degrees ↔ Radians
 *
 * @example
 * ```typescript
 * degreesToRadians.forward(180) → π
 * degreesToRadians.backward(π) → 180
 * ```
 */
export const degreesToRadians: BidirectionalTransform = {
  forward: (deg: number) => deg * (Math.PI / 180),
  backward: (rad: number) => rad * (180 / Math.PI)
};

/**
 * Boolean inverse (toggle)
 *
 * @example
 * ```typescript
 * booleanInverse(true) → false
 * booleanInverse(false) → true
 * ```
 */
export const booleanInverse: BidirectionalTransform = {
  forward: (value: boolean) => !value,
  backward: (value: boolean) => !value
};

/**
 * String case transform
 */
export const stringCase = {
  toUpperCase: (value: string) => value.toUpperCase(),
  toLowerCase: (value: string) => value.toLowerCase(),
  capitalize: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
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
export function composeTransforms(
  ...transforms: (TransformFunction | BidirectionalTransform)[]
): BidirectionalTransform {
  const forward = (value: any) => {
    let result = value;
    for (const transform of transforms) {
      if (typeof transform === 'function') {
        result = transform(result);
      } else {
        result = transform.forward(result);
      }
    }
    return result;
  };

  const backward = (value: any) => {
    let result = value;
    // Apply transforms in reverse order
    for (let i = transforms.length - 1; i >= 0; i--) {
      const transform = transforms[i];
      if (typeof transform === 'function') {
        // Can't invert a simple function - throw error
        throw new Error('Cannot compose backward transform with non-bidirectional function');
      } else {
        result = transform.backward(result);
      }
    }
    return result;
  };

  return { forward, backward };
}

/**
 * Create a throttled transform (limit update frequency)
 *
 * @example
 * ```typescript
 * const throttled = createThrottled((v) => v, 100); // Max once per 100ms
 * ```
 */
export function createThrottled(
  transform: TransformFunction,
  delayMs: number
): TransformFunction {
  let lastCall = 0;
  let lastValue: any;

  return (value: any) => {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      lastValue = transform(value);
    }
    return lastValue;
  };
}

/**
 * Create a debounced transform (wait for quiet period)
 *
 * @example
 * ```typescript
 * const debounced = createDebounced((v) => v, 300); // Wait 300ms after last change
 * ```
 */
export function createDebounced(
  transform: TransformFunction,
  delayMs: number
): TransformFunction {
  let timeout: any;
  let lastValue: any;

  return (value: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      lastValue = transform(value);
    }, delayMs);
    return lastValue;
  };
}

/**
 * Identity transform (no transformation)
 * Useful as a default or placeholder
 */
export const identity: BidirectionalTransform = {
  forward: (value: any) => value,
  backward: (value: any) => value
};
