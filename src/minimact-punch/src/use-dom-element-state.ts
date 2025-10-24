import { DomElementState } from './dom-element-state';
import type { DomElementStateOptions } from './types';

/**
 * Hook for using DOM element state in components
 *
 * This is a simplified standalone version. In full Minimact integration,
 * this would connect to the component context and trigger re-renders.
 *
 * @param selectorOrElement - CSS selector or HTMLElement
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```typescript
 * const box = useDomElementState();
 * // Attach to element via ref
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 * </div>
 * ```
 *
 * @example
 * ```typescript
 * const prices = useDomElementState('.price');
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * ```
 */
export function useDomElementState(
  selectorOrElement?: string | HTMLElement,
  options?: DomElementStateOptions
): DomElementState {
  // For standalone usage, just create and return the state
  // In full Minimact integration, this would:
  // 1. Store state in component context
  // 2. Set up onChange callback to trigger re-render
  // 3. Clean up on unmount
  // 4. Send state changes to server via SignalR

  return new DomElementState(selectorOrElement, options);
}

/**
 * Create a DOM element state without the hook wrapper
 * Useful for manual instantiation outside of components
 *
 * @param selectorOrElement - CSS selector or HTMLElement
 * @param options - Configuration options
 * @returns DomElementState instance
 */
export function createDomElementState(
  selectorOrElement?: string | HTMLElement,
  options?: DomElementStateOptions
): DomElementState {
  return new DomElementState(selectorOrElement, options);
}
