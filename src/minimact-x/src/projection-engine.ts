/**
 * Projection Engine
 * Applies state projections to DOM elements based on target configuration
 */

import type {
  TargetProjection,
  ProjectionResult,
  ApplyMode
} from './types';
import { TransformHandler } from './transform-handler';

/**
 * Projection Engine
 * Handles the core logic of transforming state values and applying them to DOM
 */
export class ProjectionEngine {
  /**
   * Apply a state projection to all matching targets within a root element
   *
   * @param rootElement - Component root element to search within
   * @param stateKey - State key (for logging/debugging)
   * @param value - Current state value
   * @param targets - Target projection configuration
   * @param context - Context object for applyIf conditions
   * @returns Array of projection results
   */
  static applyProjections<T>(
    rootElement: HTMLElement,
    stateKey: string,
    value: T,
    targets: Record<string, TargetProjection<T>>,
    context?: any
  ): ProjectionResult[] {
    const results: ProjectionResult[] = [];

    // Process each target selector
    for (const [selector, config] of Object.entries(targets)) {
      const startTime = performance.now();

      try {
        // 1. Evaluate applyIf condition (if provided)
        let shouldApply = true;
        let applyIfResult: boolean | undefined = undefined;

        if (config.applyIf) {
          try {
            applyIfResult = config.applyIf(context);
            shouldApply = applyIfResult;
          } catch (error) {
            console.error(`[useStateX] applyIf error for selector '${selector}':`, error);
            results.push({
              selector,
              applied: false,
              error: error as Error,
              applyIfResult: false,
              latency: performance.now() - startTime
            });
            continue;
          }
        }

        // 2. Skip if applyIf returned false and skipIfFalse is enabled
        if (!shouldApply && config.skipIfFalse) {
          results.push({
            selector,
            applied: false,
            applyIfResult,
            latency: performance.now() - startTime
          });
          continue;
        }

        // 3. Query for target element(s)
        const elements = rootElement.querySelectorAll(selector);

        if (elements.length === 0) {
          console.warn(`[useStateX] No elements found for selector '${selector}'`);
          results.push({
            selector,
            applied: false,
            applyIfResult,
            latency: performance.now() - startTime
          });
          continue;
        }

        // 4. Transform the value (if shouldApply is true)
        let transformedValue: string | number | boolean | undefined;

        if (shouldApply) {
          try {
            transformedValue = TransformHandler.applyTransform(config, value);
          } catch (error) {
            console.error(`[useStateX] Transform error for selector '${selector}':`, error);
            results.push({
              selector,
              applied: false,
              error: error as Error,
              applyIfResult,
              latency: performance.now() - startTime
            });
            continue;
          }
        }

        // 5. Apply to each matching element
        elements.forEach((element) => {
          if (shouldApply && transformedValue !== undefined) {
            this.applyToElement(
              element as HTMLElement,
              transformedValue,
              config.applyAs || 'textContent',
              config.property
            );
          } else {
            // Clear the element if applyIf returned false
            this.clearElement(
              element as HTMLElement,
              config.applyAs || 'textContent',
              config.property
            );
          }
        });

        // 6. Record success
        results.push({
          selector,
          applied: shouldApply,
          transformedValue: shouldApply ? transformedValue : undefined,
          element: elements[0] as HTMLElement,
          applyIfResult,
          latency: performance.now() - startTime
        });

      } catch (error) {
        console.error(`[useStateX] Projection error for selector '${selector}':`, error);
        results.push({
          selector,
          applied: false,
          error: error as Error,
          latency: performance.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Apply transformed value to a single DOM element
   */
  private static applyToElement(
    element: HTMLElement,
    value: string | number | boolean,
    applyAs: ApplyMode,
    property?: string
  ): void {
    switch (applyAs) {
      case 'textContent':
        element.textContent = String(value);
        break;

      case 'innerHTML':
        // Security warning for innerHTML
        if (typeof value === 'string' && this.containsPotentialXSS(value)) {
          console.warn(
            '[useStateX] Potential XSS detected in innerHTML projection. ' +
            'Ensure value is sanitized.',
            { element, value }
          );
        }
        element.innerHTML = String(value);
        break;

      case 'attribute':
        if (!property) {
          console.error('[useStateX] property is required for applyAs="attribute"');
          return;
        }
        element.setAttribute(property, String(value));
        break;

      case 'class':
        if (!property) {
          console.error('[useStateX] property is required for applyAs="class"');
          return;
        }
        // Toggle class based on boolean value
        if (value) {
          element.classList.add(property);
        } else {
          element.classList.remove(property);
        }
        break;

      case 'style':
        if (!property) {
          console.error('[useStateX] property is required for applyAs="style"');
          return;
        }
        // Set inline style property
        (element.style as any)[property] = String(value);
        break;

      default:
        console.error(`[useStateX] Unknown applyAs mode: ${applyAs}`);
    }
  }

  /**
   * Clear element content/attributes based on applyAs mode
   */
  private static clearElement(
    element: HTMLElement,
    applyAs: ApplyMode,
    property?: string
  ): void {
    switch (applyAs) {
      case 'textContent':
        element.textContent = '';
        break;

      case 'innerHTML':
        element.innerHTML = '';
        break;

      case 'attribute':
        if (property) {
          element.removeAttribute(property);
        }
        break;

      case 'class':
        if (property) {
          element.classList.remove(property);
        }
        break;

      case 'style':
        if (property) {
          (element.style as any)[property] = '';
        }
        break;
    }
  }

  /**
   * Basic XSS detection (heuristic)
   * For production, use a proper HTML sanitizer like DOMPurify
   */
  private static containsPotentialXSS(html: string): boolean {
    const dangerous = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return dangerous.some(pattern => pattern.test(html));
  }

  /**
   * Sanitize HTML (basic - recommend using DOMPurify in production)
   */
  static sanitizeHTML(html: string): string {
    // Create a temporary element
    const temp = document.createElement('div');
    temp.textContent = html; // This escapes HTML entities
    return temp.innerHTML;
  }
}
