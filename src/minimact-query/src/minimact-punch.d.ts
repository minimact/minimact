/**
 * Type declarations for minimact-punch
 * This allows us to build minimact-query without having minimact-punch installed
 */

declare module 'minimact-punch' {
  export class DomElementState {
    element: HTMLElement | null;
    elements: HTMLElement[];

    // Base properties
    isIntersecting: boolean;
    intersectionRatio: number;
    childrenCount: number;
    grandChildrenCount: number;
    attributes: Record<string, string>;
    classList: string[];
    exists: boolean;
    count: number;
    boundingRect: DOMRect | null;

    // Methods
    attachElement(element: HTMLElement): void;
    attachSelector(selector: string): void;
    setOnChange(callback: (state: any) => void): void;
    cleanup(): void;
    destroy(): void;

    // Pseudo-state
    state: {
      hover: boolean;
      active: boolean;
      focus: boolean;
      disabled: boolean;
      checked: boolean;
      invalid: boolean;
      destroy(): void;
    };

    // Theme
    theme: {
      isDark: boolean;
      isLight: boolean;
      highContrast: boolean;
      reducedMotion: boolean;
      destroy(): void;
    };

    // Breakpoint
    breakpoint: {
      sm: boolean;
      md: boolean;
      lg: boolean;
      xl: boolean;
      '2xl': boolean;
      between(min: string, max: string): boolean;
    };

    // History
    history: {
      changeCount: number;
      mutationCount: number;
      renderCount: number;
      firstRendered: number;
      lastChanged: number;
      ageInSeconds: number;
      timeSinceLastChange: number;
      changesPerSecond: number;
      changesPerMinute: number;
      hasStabilized: boolean;
      isOscillating: boolean;
      trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
      volatility: number;
      likelyToChangeNext: number;
      estimatedNextChange: number;
      updatedInLast(ms: number): boolean;
      changedMoreThan(count: number): boolean;
      wasStableFor(ms: number): boolean;
      destroy(): void;
    };

    // Lifecycle
    lifecycle: {
      lifecycleState: string;
      prevLifecycleState?: string;
      availableStates: string[];
      nextStates: string[];
      transitionTo(state: string): boolean;
      canTransitionTo(state: string): boolean;
      style: any;
      template: any;
      getStyleFor(state: string): any;
      getTemplateFor(state: string): any;
      timeInState: number;
      stateDuration?: number;
      stateProgress?: number;
      history: any[];
      getRecentHistory(count: number): any[];
      hasTransitioned(from: string, to: string): boolean;
      countTransitions(from: string, to: string): number;
      getAverageTimeInState(state: string): number;
      predictNextState(): { state: string; confidence: number } | null;
      destroy(): void;
    };

    // Statistical operations
    vals: {
      sum(): number;
      avg(): number;
      min(): number;
      max(): number;
      median(): number;
      stdDev(): number;
    };

    // Collection methods
    every(predicate: (elem: DomElementState) => boolean): boolean;
    some(predicate: (elem: DomElementState) => boolean): boolean;
    filter(predicate: (elem: DomElementState) => boolean): DomElementState[];
    map<T>(fn: (elem: DomElementState) => T): T[];
  }

  export interface DomElementStateOptions {
    selector?: string | null;
    trackIntersection?: boolean;
    trackMutation?: boolean;
    trackResize?: boolean;
    trackHover?: boolean;
    trackFocus?: boolean;
    intersectionOptions?: IntersectionObserverInit;
    debounceMs?: number;
    lifecycle?: any;
    lifecycleServerSync?: (newState: string) => void;
  }

  export function useDomElementState(
    selectorOrElement?: string | HTMLElement,
    options?: DomElementStateOptions
  ): DomElementState;
}
