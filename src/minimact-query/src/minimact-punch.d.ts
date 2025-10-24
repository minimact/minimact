/**
 * Type declarations for minimact-punch
 * Re-exports registry functions for minimact-query integration
 */

declare module 'minimact-punch' {
  export interface DomElementState {
    // Core DOM properties
    element: HTMLElement | null;
    elements: HTMLElement[];
    isIntersecting: boolean;
    intersectionRatio: number;
    boundingRect: DOMRect | null;
    childrenCount: number;
    grandChildrenCount: number;
    attributes: Record<string, string>;
    classList: string[];
    exists: boolean;
    count: number;
    textContent: string | null;

    // Pseudo-state tracking
    state: {
      hover: boolean;
      focus: boolean;
      active: boolean;
      disabled: boolean;
    };

    // Theme tracking
    theme: {
      isDark: boolean;
      reducedMotion: boolean;
      highContrast: boolean;
    };

    // Breakpoint tracking
    breakpoint: {
      xs: boolean;
      sm: boolean;
      md: boolean;
      lg: boolean;
      xl: boolean;
      xxl: boolean;
    };

    // History tracking
    history: {
      changeCount: number;
      changesPerSecond: number;
      timeSinceLastChange: number;
      ageInSeconds: number;
      hasStabilized: boolean;
      volatility: number;
      trend: 'stable' | 'increasing' | 'decreasing';
    };

    // Lifecycle tracking
    lifecycle: {
      lifecycleState: string;
      timeInState: number;
    };
  }

  // Registry functions
  export function registerDomElementState(element: Element, state: DomElementState): void;
  export function unregisterDomElementState(element: Element, state: DomElementState): void;
  export function getDomElementState(element: Element): DomElementState | null;
  export function queryDomElementStates(selector: string): DomElementState[];
  export function getAllDomElementStates(): DomElementState[];
  export function getTrackedElementCount(): number;
  export function clearRegistry(): void;
  export function getRegistryDebugInfo(): {
    activeStatesCount: number;
    cachedSelectors: string[];
  };
}
