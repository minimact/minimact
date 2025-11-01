/**
 * @minimact/mvc - Types
 *
 * Type definitions for MVC Bridge integration
 */

/**
 * MVC ViewModel wrapper with mutability metadata
 * Embedded in HTML by MinimactPageRenderer
 */
export interface MvcViewModelWrapper<T = any> {
    /**
     * The actual ViewModel data from C#
     */
    data: T;

    /**
     * Mutability metadata (property name → is mutable)
     * Extracted from [Mutable] attributes on C# properties
     */
    _mutability: Record<string, boolean>;
}

/**
 * Hook return type for mutable MVC state
 * Returns both value and setter (like useState)
 */
export type MutableMvcState<T> = [T, (newValue: T | ((prev: T) => T)) => void];

/**
 * Hook return type for immutable MVC state
 * Returns only value (no setter)
 */
export type ImmutableMvcState<T> = [T];

/**
 * Configuration options for useMvcState hook
 */
export interface UseMvcStateOptions {
    /**
     * Default value if property not found in ViewModel
     */
    defaultValue?: any;

    /**
     * Override mutability check (dangerous - use with caution!)
     * This bypasses the [Mutable] attribute check.
     * Server will still validate mutability.
     */
    forceMutable?: boolean;

    /**
     * Custom equality function for change detection
     * Default: Object.is
     */
    equals?: (prev: any, next: any) => boolean;

    /**
     * Sync strategy for mutable state
     * - 'immediate': Sync every change to server (default)
     * - 'debounced': Batch changes (useful for text inputs)
     * - 'manual': No auto-sync (call syncToServer() manually)
     */
    sync?: 'immediate' | 'debounced' | 'manual';

    /**
     * Debounce delay in ms (if sync = 'debounced')
     * Default: 300ms
     */
    syncDelay?: number;
}

/**
 * Metadata about an MVC state binding
 */
export interface MvcStateMetadata {
    propertyName: string;
    isMutable: boolean;
    currentValue: any;
    lastSynced: number;
}

/**
 * Global window interface extension for ViewModel
 */
declare global {
    interface Window {
        /**
         * MVC ViewModel embedded by server
         * Set by MinimactPageRenderer in HTML
         */
        __MINIMACT_VIEWMODEL__?: MvcViewModelWrapper;
    }
}
