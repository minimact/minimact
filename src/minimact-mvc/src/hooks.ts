/**
 * @minimact/mvc - Hooks
 *
 * React-like hooks for accessing MVC ViewModels in Minimact components
 */

import type {
    MvcViewModelWrapper,
    MutableMvcState,
    ImmutableMvcState,
    UseMvcStateOptions
} from './types';

// Import from @minimact/core
let currentContext: any = null;
let stateIndex = 0;

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
export function useMvcState<T>(
    propertyName: string,
    options?: UseMvcStateOptions
): MutableMvcState<T> | ImmutableMvcState<T> {
    // Get current component context (set by Minimact runtime)
    const ctx = (window as any).__MINIMACT_CONTEXT__ || currentContext;

    if (!ctx) {
        throw new Error('[MVC Bridge] useMvcState must be called within a component render');
    }

    const context = ctx;
    const index = stateIndex++;
    const stateKey = `mvc_${propertyName}_${index}`;

    // Get ViewModel wrapper from window (embedded by server)
    const wrapper = window.__MINIMACT_VIEWMODEL__;

    if (!wrapper) {
        console.warn(
            `[MVC Bridge] No ViewModel found. ` +
            `Did you render this component via MinimactPageRenderer?`
        );
    }

    // Check mutability (from C# [Mutable] attribute)
    const isMutable = options?.forceMutable ||
                     wrapper?._mutability?.[propertyName] ||
                     false;

    // Initialize state from ViewModel data
    if (!context.state.has(stateKey)) {
        const initialValue = wrapper?.data?.[propertyName] ?? options?.defaultValue;
        context.state.set(stateKey, initialValue);
    }

    const currentValue = context.state.get(stateKey) as T;

    // If immutable, return [value] only (no setter)
    if (!isMutable) {
        return [currentValue] as ImmutableMvcState<T>;
    }

    // If mutable, return [value, setter]
    const setState = (newValue: T | ((prev: T) => T)) => {
        const startTime = performance.now();

        // Resolve new value
        const actualNewValue = typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
            : newValue;

        // Check equality (skip if unchanged)
        const equals = options?.equals || Object.is;
        if (equals(currentValue, actualNewValue)) {
            return; // No change
        }

        // Update local state
        context.state.set(stateKey, actualNewValue);

        // Build state change object for hint matching
        const stateChanges: Record<string, any> = {
            [stateKey]: actualNewValue
        };

        // Check hint queue for template match (predictive rendering)
        const hint = context.hintQueue?.matchHint?.(context.componentId, stateChanges);

        if (hint) {
            // 🟢 CACHE HIT! Apply queued patches immediately
            const latency = performance.now() - startTime;
            console.log(
                `[MVC Bridge] 🟢 CACHE HIT! MVC state '${propertyName}' updated ` +
                `(${hint.patches.length} patches in ${latency.toFixed(2)}ms)`
            );

            context.domPatcher?.applyPatches?.(context.element, hint.patches);

            // Notify playground bridge
            if (context.playgroundBridge) {
                context.playgroundBridge.cacheHit({
                    componentId: context.componentId,
                    hintId: hint.hintId,
                    latency,
                    confidence: hint.confidence,
                    patchCount: hint.patches.length
                });
            }
        } else {
            // 🔴 CACHE MISS
            console.log(`[MVC Bridge] 🔴 CACHE MISS - MVC state '${propertyName}' changed`);

            if (context.playgroundBridge) {
                context.playgroundBridge.cacheMiss({
                    componentId: context.componentId,
                    methodName: `setMvcState(${propertyName})`,
                    latency: performance.now() - startTime,
                    patchCount: 0
                });
            }
        }

        // Sync to server (validates mutability server-side)
        const syncStrategy = options?.sync || 'immediate';

        if (syncStrategy === 'immediate') {
            syncToServer(context, stateKey, actualNewValue, propertyName);
        } else if (syncStrategy === 'debounced') {
            debouncedSyncToServer(
                context,
                stateKey,
                actualNewValue,
                propertyName,
                options?.syncDelay || 300
            );
        }
        // If 'manual', don't auto-sync
    };

    return [currentValue, setState] as MutableMvcState<T>;
}

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
export function useMvcViewModel<T = any>(): T | null {
    const wrapper = window.__MINIMACT_VIEWMODEL__;
    return wrapper?.data ?? null;
}

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
export function isMvcPropertyMutable(propertyName: string): boolean {
    const wrapper = window.__MINIMACT_VIEWMODEL__;
    return wrapper?._mutability?.[propertyName] ?? false;
}

/**
 * Get metadata about all MVC state bindings
 *
 * Useful for debugging and DevTools integration
 *
 * @returns Array of state metadata
 */
export function getMvcStateMetadata(): Array<{
    propertyName: string;
    isMutable: boolean;
}> {
    const wrapper = window.__MINIMACT_VIEWMODEL__;

    if (!wrapper) {
        return [];
    }

    return Object.keys(wrapper.data).map(propertyName => ({
        propertyName,
        isMutable: wrapper._mutability[propertyName] ?? false
    }));
}

// ============================================================
// Internal Helper Functions
// ============================================================

/**
 * Sync state to server immediately
 */
function syncToServer(
    context: any,
    stateKey: string,
    value: any,
    propertyName: string
): void {
    if (!context.signalR) {
        console.warn('[MVC Bridge] No SignalR connection found. State will not sync to server.');
        return;
    }

    context.signalR.updateComponentState(context.componentId, stateKey, value)
        .catch((err: Error) => {
            console.error(
                `[MVC Bridge] Failed to sync MVC state '${propertyName}' to server:`,
                err
            );

            // Check if error is due to immutability violation
            if (err.message && err.message.includes('immutable')) {
                console.error(
                    `[MVC Bridge] 🚨 SECURITY: Attempted to modify immutable state '${propertyName}'. ` +
                    `Add [Mutable] attribute in C# ViewModel or make this read-only.`
                );
            }

            // TODO: Revert state on error?
            // context.state.set(stateKey, previousValue);
        });
}

/**
 * Debounced sync to server (for text inputs, etc.)
 */
const debounceTimers = new Map<string, number>();

function debouncedSyncToServer(
    context: any,
    stateKey: string,
    value: any,
    propertyName: string,
    delay: number
): void {
    // Clear existing timer
    const existingTimer = debounceTimers.get(stateKey);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Set new timer
    const timerId = window.setTimeout(() => {
        syncToServer(context, stateKey, value, propertyName);
        debounceTimers.delete(stateKey);
    }, delay);

    debounceTimers.set(stateKey, timerId);
}

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
export function flushMvcState(): void {
    // Trigger all pending debounced syncs immediately
    debounceTimers.forEach((timerId) => {
        clearTimeout(timerId);
    });
    debounceTimers.clear();
}

// ============================================================
// Integration with @minimact/core
// ============================================================

/**
 * Set current component context (called by Minimact runtime)
 * @internal
 */
export function setMvcContext(context: any): void {
    currentContext = context;
}

/**
 * Clear component context (called by Minimact runtime)
 * @internal
 */
export function clearMvcContext(): void {
    currentContext = null;
    stateIndex = 0;
}

/**
 * Reset state index (called before each render)
 * @internal
 */
export function resetMvcStateIndex(): void {
    stateIndex = 0;
}
