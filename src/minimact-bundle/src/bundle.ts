/**
 * Bundle - Standalone DOM attribute applicator
 *
 * Applies attributes, classes, and styles to elements matched by a registered selector.
 * Can be used standalone or integrated with Minimact hooks.
 */

import { getBundleRegistration } from './bundle-registry';

export interface BundleAttributes {
  class?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration> | Record<string, string>;
  [key: string]: any;  // Any other attributes
}

export interface BundleOptions {
  /**
   * Unique bundle identifier (matches registration)
   */
  id: string;

  /**
   * Attributes to apply to target elements
   */
  attributes: BundleAttributes;

  /**
   * Optional callback when bundle is applied
   */
  onApply?: (elements: Element[]) => void;

  /**
   * Optional callback when bundle is cleaned up
   */
  onCleanup?: (elements: Element[]) => void;
}

/**
 * Bundle - Applies attributes to DOM elements via registered selector
 *
 * This is the standalone implementation that can be used without React/Minimact.
 * For Minimact integration, use the `useBundle` hook.
 *
 * @example
 * ```typescript
 * const bundle = new Bundle({
 *   id: 'hero-animation',
 *   attributes: {
 *     class: 'fade-in visible',
 *     'data-animated': 'true'
 *   }
 * });
 *
 * bundle.apply();  // Apply attributes
 * bundle.cleanup();  // Remove attributes
 * ```
 */
export class Bundle {
  private id: string;
  private attributes: BundleAttributes;
  private appliedElements: Element[] = [];
  private onApply?: (elements: Element[]) => void;
  private onCleanup?: (elements: Element[]) => void;

  constructor(options: BundleOptions) {
    this.id = options.id;
    this.attributes = options.attributes;
    this.onApply = options.onApply;
    this.onCleanup = options.onCleanup;
  }

  /**
   * Apply attributes to target elements
   *
   * Looks up the registered selector and applies all attributes
   * to the matched elements.
   */
  apply(): void {
    const registration = getBundleRegistration(this.id);

    if (!registration) {
      console.warn(`[minimact-bundle] Bundle "${this.id}" not registered`);
      return;
    }

    // Get target elements
    const elements = registration.getElements();
    this.appliedElements = elements;

    // Apply attributes to each element
    elements.forEach(el => {
      this.applyAttributesToElement(el, this.attributes);
    });

    // Callback
    if (this.onApply) {
      this.onApply(elements);
    }
  }

  /**
   * Cleanup applied attributes
   *
   * Removes classes and attributes that were applied.
   * Note: Styles are NOT removed automatically as they may conflict.
   */
  cleanup(): void {
    this.appliedElements.forEach(el => {
      this.cleanupElement(el, this.attributes);
    });

    // Callback
    if (this.onCleanup) {
      this.onCleanup(this.appliedElements);
    }

    this.appliedElements = [];
  }

  /**
   * Update attributes and re-apply
   *
   * @param newAttributes - New attributes to apply
   */
  update(newAttributes: BundleAttributes): void {
    // Cleanup old attributes
    this.cleanup();

    // Update and re-apply
    this.attributes = newAttributes;
    this.apply();
  }

  /**
   * Get currently applied elements
   *
   * @returns Array of elements with attributes applied
   */
  getAppliedElements(): Element[] {
    return [...this.appliedElements];
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private applyAttributesToElement(el: Element, attrs: BundleAttributes): void {
    // Apply classes
    const classValue = attrs.class || attrs.className;
    if (classValue) {
      const classes = classValue.split(' ').filter(Boolean);
      el.classList.add(...classes);
    }

    // Apply styles
    if (attrs.style && el instanceof HTMLElement) {
      if (typeof attrs.style === 'object') {
        Object.entries(attrs.style).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            el.style[key as any] = String(value);
          }
        });
      }
    }

    // Apply other attributes
    Object.entries(attrs).forEach(([key, value]) => {
      if (!['class', 'className', 'style', 'id'].includes(key)) {
        if (value !== undefined && value !== null) {
          el.setAttribute(key, String(value));
        }
      }
    });
  }

  private cleanupElement(el: Element, attrs: BundleAttributes): void {
    // Remove classes
    const classValue = attrs.class || attrs.className;
    if (classValue) {
      const classes = classValue.split(' ').filter(Boolean);
      el.classList.remove(...classes);
    }

    // Remove attributes (excluding style - too risky)
    Object.keys(attrs).forEach(key => {
      if (!['class', 'className', 'style', 'id'].includes(key)) {
        el.removeAttribute(key);
      }
    });

    // Note: We don't remove styles because they may have been
    // set by other sources. User can manually clear if needed.
  }
}
