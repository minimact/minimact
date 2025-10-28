/**
 * Bundle Registry - Manages declarative DOM selector registrations
 *
 * Bundles are named selectors that target arbitrary DOM elements
 * for declarative attribute/style/class application.
 */

export type BundleSelector =
  | string                    // CSS selector
  | (() => Element[])        // Function returning elements
  | Element[];               // Direct element array

export interface BundleRegistration {
  id: string;
  selector: BundleSelector;
  getElements: () => Element[];
}

/**
 * BundleRegistry - Global registry for bundle selectors
 *
 * Stores mappings between bundle IDs and their target selectors.
 * Supports string selectors, function selectors, and direct element arrays.
 */
class BundleRegistry {
  private registrations = new Map<string, BundleRegistration>();

  /**
   * Register a bundle with a selector
   *
   * @param id - Unique bundle identifier
   * @param selector - CSS selector, function, or element array
   *
   * @example
   * ```typescript
   * registry.register("hero-animation", ".hero h1, .hero p");
   * registry.register("visible", () => {
   *   return Array.from(document.querySelectorAll('.item'))
   *     .filter(el => isInViewport(el));
   * });
   * ```
   */
  register(id: string, selector: BundleSelector): void {
    const registration: BundleRegistration = {
      id,
      selector,
      getElements: () => {
        if (typeof selector === 'string') {
          // CSS selector string
          return Array.from(document.querySelectorAll(selector));
        } else if (typeof selector === 'function') {
          // Function returning elements
          return selector();
        } else {
          // Direct element array
          return selector;
        }
      }
    };

    this.registrations.set(id, registration);
  }

  /**
   * Unregister a bundle
   *
   * @param id - Bundle identifier to remove
   */
  unregister(id: string): void {
    this.registrations.delete(id);
  }

  /**
   * Get a bundle registration
   *
   * @param id - Bundle identifier
   * @returns Bundle registration or undefined
   */
  get(id: string): BundleRegistration | undefined {
    return this.registrations.get(id);
  }

  /**
   * Check if a bundle is registered
   *
   * @param id - Bundle identifier
   * @returns True if bundle exists
   */
  has(id: string): boolean {
    return this.registrations.has(id);
  }

  /**
   * Get all registered bundle IDs
   *
   * @returns Array of bundle IDs
   */
  getAllIds(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get registration count
   */
  get size(): number {
    return this.registrations.size;
  }
}

// Singleton instance
const registry = new BundleRegistry();

/**
 * Register a bundle selector
 *
 * @param id - Unique bundle identifier
 * @param selector - CSS selector, function, or element array
 *
 * @example
 * ```typescript
 * registerBundle("hero-animation", ".hero h1, .hero p");
 * registerBundle("admin-only", "[data-admin-only]");
 * registerBundle("visible", () => getVisibleElements());
 * ```
 */
export function registerBundle(id: string, selector: BundleSelector): void {
  registry.register(id, selector);
}

/**
 * Unregister a bundle
 *
 * @param id - Bundle identifier to remove
 */
export function unregisterBundle(id: string): void {
  registry.unregister(id);
}

/**
 * Get a bundle registration
 *
 * @param id - Bundle identifier
 * @returns Bundle registration or undefined
 */
export function getBundleRegistration(id: string): BundleRegistration | undefined {
  return registry.get(id);
}

/**
 * Check if a bundle is registered
 *
 * @param id - Bundle identifier
 * @returns True if bundle exists
 */
export function hasBundleRegistration(id: string): boolean {
  return registry.has(id);
}

/**
 * Get all registered bundle IDs
 *
 * @returns Array of bundle IDs
 */
export function getAllBundleIds(): string[] {
  return registry.getAllIds();
}

/**
 * Clear all bundle registrations
 */
export function clearAllBundles(): void {
  registry.clear();
}
