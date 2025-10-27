/**
 * useContext - Server-side cache system with multiple scope types
 *
 * This reimagines React's context API as a Redis-like in-memory cache
 * that enables shared state across components with flexible lifetime management.
 */

import type { ComponentContext } from './hooks';

export interface ContextOptions {
  scope?: 'request' | 'session' | 'application' | 'url';
  urlPattern?: string;
  expiry?: number;
  defaultValue?: any;
}

export interface Context<T> {
  key: string;
  options: ContextOptions;
}

let currentContext: ComponentContext | null = null;

/**
 * Set the current component context for hook execution
 * Called internally by Minimact before rendering
 */
export function setContextHookContext(context: ComponentContext): void {
  currentContext = context;
}

/**
 * Clear the current component context after rendering
 * Called internally by Minimact after rendering
 */
export function clearContextHookContext(): void {
  currentContext = null;
}

/**
 * Create a context with specified scope and options
 *
 * @example
 * // Session-scoped user context
 * const UserContext = createContext<User>('current-user', {
 *   scope: 'session',
 *   expiry: 3600000 // 1 hour
 * });
 *
 * @example
 * // URL-scoped dashboard filters
 * const DashboardFilters = createContext<Filters>('dashboard-filters', {
 *   scope: 'url',
 *   urlPattern: '/dashboard/*',
 *   expiry: 3600000
 * });
 */
export function createContext<T>(
  key: string,
  options: ContextOptions = {}
): Context<T> {
  // Validate URL pattern if scope is 'url'
  if (options.scope === 'url' && !options.urlPattern) {
    throw new Error(`Context '${key}' with scope 'url' requires urlPattern`);
  }

  return {
    key,
    options: {
      scope: options.scope || 'request',
      urlPattern: options.urlPattern,
      expiry: options.expiry,
      defaultValue: options.defaultValue
    }
  };
}

/**
 * Use a context - returns [value, setValue, clearValue]
 *
 * Unlike React's useContext, this doesn't require a Provider component.
 * The context is stored server-side in a cache with the specified scope.
 *
 * @returns Tuple of [value, setValue, clearValue]
 *
 * @example
 * // Read and write to context
 * function LoginForm() {
 *   const [_, setUser] = useContext(UserContext);
 *
 *   const handleLogin = async (credentials) => {
 *     const user = await authenticate(credentials);
 *     setUser(user); // Stored in session-scoped cache
 *   };
 *
 *   return <form onSubmit={handleLogin}>...</form>;
 * }
 *
 * @example
 * // Read from context (different component, no parent-child relationship needed)
 * function UserProfile() {
 *   const [user] = useContext(UserContext);
 *
 *   if (!user) return <Login />;
 *   return <div>Welcome, {user.name}</div>;
 * }
 */
export function useContext<T>(
  context: Context<T>
): [T | undefined, (value: T) => void, () => void] {
  if (!currentContext) {
    throw new Error('[Minimact] useContext must be called within a component render');
  }

  const ctx = currentContext;
  const stateKey = `context_${context.key}`;

  // Get current value from component state (initialized from server)
  let currentValue = ctx.state.get(stateKey) as T | undefined;

  // If no value and has default, use default
  if (currentValue === undefined && context.options.defaultValue !== undefined) {
    currentValue = context.options.defaultValue;
  }

  // Setter - updates local state and syncs to server
  const setContextValue = (newValue: T) => {
    // Update local state immediately for instant feedback
    ctx.state.set(stateKey, newValue);

    // Apply any cached patches if available
    const stateChanges: Record<string, any> = {
      [stateKey]: newValue
    };
    const hint = ctx.hintQueue.matchHint(ctx.componentId, stateChanges);
    if (hint) {
      ctx.domPatcher.applyPatches(ctx.element, hint.patches);
    }

    // Sync to server cache
    ctx.signalR.invoke('UpdateContext', {
      key: context.key,
      value: newValue,
      scope: context.options.scope,
      urlPattern: context.options.urlPattern,
      expiry: context.options.expiry
    }).catch(err => {
      console.error(`[Minimact] Failed to update context '${context.key}':`, err);
    });
  };

  // Clear - removes value from cache
  const clearContextValue = () => {
    // Clear local state
    ctx.state.set(stateKey, undefined);

    // Apply any cached patches if available
    const stateChanges: Record<string, any> = {
      [stateKey]: undefined
    };
    const hint = ctx.hintQueue.matchHint(ctx.componentId, stateChanges);
    if (hint) {
      ctx.domPatcher.applyPatches(ctx.element, hint.patches);
    }

    // Sync to server cache
    ctx.signalR.invoke('ClearContext', {
      key: context.key,
      scope: context.options.scope,
      urlPattern: context.options.urlPattern
    }).catch(err => {
      console.error(`[Minimact] Failed to clear context '${context.key}':`, err);
    });
  };

  return [currentValue, setContextValue, clearContextValue];
}
