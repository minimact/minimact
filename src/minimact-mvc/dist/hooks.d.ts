/**
 * @minimact/mvc - Hooks
 *
 * React-like hooks for accessing MVC ViewModels in Minimact components
 */
import type { MutableMvcState, ImmutableMvcState, UseMvcStateOptions } from './types';
/**
 * Access MVC ViewModel property as reactive state
 *
 * Automatically enforces mutability based on C# [Mutable] attribute:
 * - If property is marked [Mutable]: Returns [value, setter]
 * - If property is immutable: Returns [value] (no setter)
 *
 * The setter syncs changes back to the server via SignalR.
 * Server validates mutability before applying updates.
 *
 * @example
 * // Mutable property (has [Mutable] in C#)
 * const [count, setCount] = useMvcState<number>('initialCount');
 * setCount(10); // ✅ Syncs to server
 *
 * @example
 * // Immutable property (no [Mutable] in C#)
 * const [isAdmin] = useMvcState<boolean>('isAdminRole');
 * // No setter available - TypeScript enforces read-only
 *
 * @param propertyName - Name of the ViewModel property (camelCase)
 * @param options - Configuration options
 * @returns Tuple of [value] or [value, setter] depending on mutability
 */
export declare function useMvcState<T>(propertyName: string, options?: UseMvcStateOptions): MutableMvcState<T> | ImmutableMvcState<T>;
/**
 * Access the entire MVC ViewModel (read-only)
 *
 * Returns the full ViewModel object passed from the controller.
 * Useful for accessing multiple properties without calling useMvcState multiple times.
 *
 * @example
 * interface MyViewModel {
 *   fullName: string;
 *   isAdmin: boolean;
 *   posts: Array<{ title: string }>;
 * }
 *
 * const viewModel = useMvcViewModel<MyViewModel>();
 * console.log(viewModel.fullName);
 * console.log(viewModel.posts.length);
 *
 * @returns ViewModel data or null if not found
 */
export declare function useMvcViewModel<T = any>(): T | null;
/**
 * Check if a ViewModel property is mutable
 *
 * Useful for dynamic UI (show/hide controls based on mutability)
 *
 * @example
 * const canEdit = isMvcPropertyMutable('fullName');
 * {canEdit && <button>Edit</button>}
 *
 * @param propertyName - Name of the ViewModel property (camelCase)
 * @returns True if property has [Mutable] attribute in C#
 */
export declare function isMvcPropertyMutable(propertyName: string): boolean;
/**
 * Get metadata about all MVC state bindings
 *
 * Useful for debugging and DevTools integration
 *
 * @returns Array of state metadata
 */
export declare function getMvcStateMetadata(): Array<{
    propertyName: string;
    isMutable: boolean;
}>;
/**
 * Manually sync all pending debounced state to server
 * Useful for form submission
 *
 * @example
 * const handleSubmit = () => {
 *   flushMvcState(); // Ensure all changes synced
 *   // ... submit form
 * };
 */
export declare function flushMvcState(): void;
/**
 * Set current component context (called by Minimact runtime)
 * @internal
 */
export declare function setMvcContext(context: any): void;
/**
 * Clear component context (called by Minimact runtime)
 * @internal
 */
export declare function clearMvcContext(): void;
/**
 * Reset state index (called before each render)
 * @internal
 */
export declare function resetMvcStateIndex(): void;
//# sourceMappingURL=hooks.d.ts.map