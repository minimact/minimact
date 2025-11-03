/**
 * MinimactComponentRegistry
 *
 * First-class system for tracking component instances by type.
 * Bridges the gap between type-based templates (ProductDetailsPage)
 * and instance-based rendering (GUID e11850fd-...).
 *
 * Responsibilities:
 * - Register component instances during hydration
 * - Lookup instances by type (for hot reload)
 * - Lookup instance by ID (for patches)
 * - Unregister components on cleanup
 */

import type { ComponentContext } from './hooks';

export interface ComponentMetadata {
  /** Component class name (e.g., "ProductDetailsPage") */
  type: string;

  /** Component instance GUID (e.g., "e11850fd-9898-4fca-8991-5c4065601284") */
  instanceId: string;

  /** Root DOM element with data-minimact-component-id */
  element: HTMLElement;

  /** Component context (state, effects, refs, etc.) */
  context: ComponentContext;
}

export class MinimactComponentRegistry {
  /** Map: componentType → Set<ComponentMetadata> */
  private typeToInstances = new Map<string, Set<ComponentMetadata>>();

  /** Map: instanceId → ComponentMetadata */
  private instanceToMeta = new Map<string, ComponentMetadata>();

  /**
   * Register a component instance
   * Called during hydration when component is discovered
   */
  register(meta: ComponentMetadata): void {
    const { type, instanceId } = meta;

    // Add to instance lookup
    this.instanceToMeta.set(instanceId, meta);

    // Add to type lookup
    if (!this.typeToInstances.has(type)) {
      this.typeToInstances.set(type, new Set());
    }
    this.typeToInstances.get(type)!.add(meta);

    console.log(`[Registry] ✅ Registered ${type} instance ${instanceId.substring(0, 8)}...`);
  }

  /**
   * Unregister a component instance
   * Called during cleanup or when component is removed
   */
  unregister(instanceId: string): void {
    const meta = this.instanceToMeta.get(instanceId);
    if (!meta) return;

    // Remove from instance lookup
    this.instanceToMeta.delete(instanceId);

    // Remove from type lookup
    const instances = this.typeToInstances.get(meta.type);
    if (instances) {
      instances.delete(meta);
      if (instances.size === 0) {
        this.typeToInstances.delete(meta.type);
      }
    }

    console.log(`[Registry] ❌ Unregistered ${meta.type} instance ${instanceId.substring(0, 8)}...`);
  }

  /**
   * Get all instances of a component type
   * Used by hot reload to apply templates to all instances
   */
  getByType(type: string): ComponentMetadata[] {
    const instances = this.typeToInstances.get(type);
    return instances ? Array.from(instances) : [];
  }

  /**
   * Get a specific component instance by ID
   * Used by patch application and state updates
   */
  getByInstanceId(instanceId: string): ComponentMetadata | undefined {
    return this.instanceToMeta.get(instanceId);
  }

  /**
   * Get all registered component types
   */
  getTypes(): string[] {
    return Array.from(this.typeToInstances.keys());
  }

  /**
   * Get total number of registered instances
   */
  getInstanceCount(): number {
    return this.instanceToMeta.size;
  }

  /**
   * Get statistics for debugging
   */
  getStats(): { types: number; instances: number; typeBreakdown: Record<string, number> } {
    const typeBreakdown: Record<string, number> = {};

    for (const [type, instances] of this.typeToInstances.entries()) {
      typeBreakdown[type] = instances.size;
    }

    return {
      types: this.typeToInstances.size,
      instances: this.instanceToMeta.size,
      typeBreakdown
    };
  }

  /**
   * Clear all registered components
   * Used for testing or full page reset
   */
  clear(): void {
    this.typeToInstances.clear();
    this.instanceToMeta.clear();
    console.log(`[Registry] 🧹 Cleared all components`);
  }
}
