/**
 * minimact-spatial - useArea Hook
 *
 * 📐 Reactive spatial regions
 * Query viewport as a 2D database
 */
import type { AreaDefinition, AreaState, AreaOptions } from './types';
/**
 * useArea - Track a spatial region reactively
 *
 * @param definition - Area definition (selector, bounds, or element)
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const header = useArea({ top: 0, height: 80 });
 * const sidebar = useArea('#sidebar');
 * const viewport = useArea('viewport');
 *
 * console.log(header.elementsCount);  // 5
 * console.log(sidebar.coverage);      // 0.75
 * console.log(viewport.isEmpty);      // false
 * ```
 */
export declare function useArea(definition: AreaDefinition, options?: AreaOptions): AreaState;
