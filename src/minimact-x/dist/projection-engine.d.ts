/**
 * Projection Engine
 * Applies state projections to DOM elements based on target configuration
 */
import type { TargetProjection, ProjectionResult } from './types';
/**
 * Projection Engine
 * Handles the core logic of transforming state values and applying them to DOM
 */
export declare class ProjectionEngine {
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
    static applyProjections<T>(rootElement: HTMLElement, stateKey: string, value: T, targets: Record<string, TargetProjection<T>>, context?: any): ProjectionResult[];
    /**
     * Apply transformed value to a single DOM element
     */
    private static applyToElement;
    /**
     * Clear element content/attributes based on applyAs mode
     */
    private static clearElement;
    /**
     * Basic XSS detection (heuristic)
     * For production, use a proper HTML sanitizer like DOMPurify
     */
    private static containsPotentialXSS;
    /**
     * Sanitize HTML (basic - recommend using DOMPurify in production)
     */
    static sanitizeHTML(html: string): string;
}
//# sourceMappingURL=projection-engine.d.ts.map