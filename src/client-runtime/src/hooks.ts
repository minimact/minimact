import { HintQueue } from './hint-queue';
import { DOMPatcher } from './dom-patcher';
import { PlaygroundBridge } from './playground-bridge';
import { IConnectionManager } from './connection-manager';
import { templateState } from './template-state';
import { ServerTask, ServerTaskImpl, ServerTaskOptions } from './server-task';
import { ServerReducer, ServerReducerImpl } from './server-reducer';
import { setComputedContext } from './useComputed';

/**
 * Component instance context for hooks
 */
export interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  serverTasks?: Map<string, ServerTaskImpl<any>>; // For useServerTask integration
  serverReducers?: Map<string, ServerReducerImpl<any, any>>; // For useServerReducer integration
  computedValues?: Map<string, any>; // For useComputed integration
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
  signalR: IConnectionManager; // For syncing state to server (works with SignalR or SignalM)
  // Note: domElementStates and confidenceWorker are added via module augmentation by minimact-punch
}

// Global context tracking
let currentContext: ComponentContext | null = null;
let stateIndex = 0;
let effectIndex = 0;
let refIndex = 0;
let serverTaskIndex = 0;
let serverReducerIndex = 0;

/**
 * Set the current component context (called before render)
 */
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  stateIndex = 0;
  effectIndex = 0;
  refIndex = 0;
  serverTaskIndex = 0;
  serverReducerIndex = 0;

  // Reset computed index for useComputed hook
  setComputedContext(context);
}

/**
 * Clear the current component context (called after render)
 */
export function clearComponentContext(): void {
  currentContext = null;
}

/**
 * Find DOM element by path array
 * Example: [0, 1, 0] → first child, second child, first child
 */
function findElementByPath(root: HTMLElement, path: number[]): Node | null {
  let current: Node | null = root;

  for (const index of path) {
    if (!current || !current.childNodes) return null;
    current = current.childNodes[index] || null;
  }

  return current;
}

/**
 * useState hook - manages component state with hint queue integration
 */
export function useState<T>(initialValue: T): [T, (newValue: T | ((prev: T) => T)) => void] {
  if (!currentContext) {
    throw new Error('useState must be called within a component render');
  }

  const context = currentContext;
  const index = stateIndex++;
  const stateKey = `state_${index}`;

  // Initialize state if not exists
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);
  }

  const currentValue = context.state.get(stateKey) as T;

  const setState = (newValue: T | ((prev: T) => T)) => {
    const startTime = performance.now();

    const actualNewValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
      : newValue;

    // Build state change object for hint matching
    const stateChanges: Record<string, any> = {
      [stateKey]: actualNewValue
    };

    // Check hint queue for match
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      // 🟢 CACHE HIT! Apply queued patches immediately
      const latency = performance.now() - startTime;
      console.log(`[Minimact] 🟢 CACHE HIT! Hint '${hint.hintId}' matched - applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);

      context.domPatcher.applyPatches(context.element, hint.patches);

      // Notify playground of cache hit
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
      // 🔴 CACHE MISS - No prediction found
      const latency = performance.now() - startTime;
      console.log(`[Minimact] 🔴 CACHE MISS - No prediction for state change:`, stateChanges);

      // Notify playground of cache miss
      if (context.playgroundBridge) {
        context.playgroundBridge.cacheMiss({
          componentId: context.componentId,
          methodName: `setState(${stateKey})`,
          latency,
          patchCount: 0
        });
      }
    }

    // Update state
    context.state.set(stateKey, actualNewValue);

    // Update template state for template rendering
    templateState.updateState(context.componentId, stateKey, actualNewValue);

    // Re-render templates bound to this state
    const boundTemplates = templateState.getTemplatesBoundTo(context.componentId, stateKey);
    for (const template of boundTemplates) {
      // Build node path from template path array
      const nodePath = template.path.join('_');

      // Render template with new value
      const newText = templateState.render(context.componentId, nodePath);

      if (newText !== null) {
        // Find DOM element by path and update it
        const element = findElementByPath(context.element, template.path);
        if (element) {
          if (element.nodeType === Node.TEXT_NODE) {
            element.textContent = newText;
          } else if (element instanceof HTMLElement) {
            // For attribute templates
            if (template.attribute) {
              element.setAttribute(template.attribute, newText);
            } else {
              element.textContent = newText;
            }
          }

          console.log(`[Minimact] 📋 Template updated: "${newText}" (${stateKey} changed)`);
        }
      }
    }

    // Sync state to server to prevent stale data
    context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
      .catch(err => {
        console.error('[Minimact] Failed to sync state to server:', err);
      });
  };

  // If value is an array, add array helpers
  if (Array.isArray(currentValue)) {
    return [currentValue, createArrayStateSetter(setState, currentValue, stateKey, context)] as any;
  }

  return [currentValue, setState];
}

/**
 * useEffect hook - runs side effects after render
 */
export function useEffect(callback: () => void | (() => void), deps?: any[]): void {
  if (!currentContext) {
    throw new Error('useEffect must be called within a component render');
  }

  const context = currentContext;
  const index = effectIndex++;

  // Get or create effect entry
  if (!context.effects[index]) {
    context.effects[index] = {
      callback,
      deps,
      cleanup: undefined
    };

    // Run effect after render
    queueMicrotask(() => {
      const cleanup = callback();
      if (typeof cleanup === 'function') {
        context.effects[index].cleanup = cleanup;
      }
    });
  } else {
    const effect = context.effects[index];

    // Check if deps changed
    const depsChanged = !deps || !effect.deps ||
      deps.length !== effect.deps.length ||
      deps.some((dep, i) => dep !== effect.deps![i]);

    if (depsChanged) {
      // Run cleanup if exists
      if (effect.cleanup) {
        effect.cleanup();
      }

      // Update effect
      effect.callback = callback;
      effect.deps = deps;

      // Run new effect
      queueMicrotask(() => {
        const cleanup = callback();
        if (typeof cleanup === 'function') {
          effect.cleanup = cleanup;
        }
      });
    }
  }
}

/**
 * useRef hook - creates a mutable ref object
 */
export function useRef<T>(initialValue: T): { current: T } {
  if (!currentContext) {
    throw new Error('useRef must be called within a component render');
  }

  const context = currentContext;
  const index = refIndex++;
  const refKey = `ref_${index}`;

  // Initialize ref if not exists
  if (!context.refs.has(refKey)) {
    context.refs.set(refKey, { current: initialValue });
  }

  return context.refs.get(refKey)!;
}

/**
 * Cleanup all effects for a component
 */
export function cleanupEffects(context: ComponentContext): void {
  for (const effect of context.effects) {
    if (effect.cleanup) {
      effect.cleanup();
    }
  }
  context.effects = [];
}

/**
 * Array operation metadata for semantic state updates
 * @public
 */
export interface ArrayOperation {
  type: 'Append' | 'Prepend' | 'InsertAt' | 'RemoveAt' | 'UpdateAt';
  index?: number;
  item?: any;
}

/**
 * Enhanced state setter with array helper methods
 */
export interface ArrayStateSetter<T> {
  // Standard setter (for compatibility)
  (newValue: T[] | ((prev: T[]) => T[])): void;

  // Array operation helpers
  append(item: T): void;
  prepend(item: T): void;
  insertAt(index: number, item: T): void;
  removeAt(index: number): void;
  updateAt(index: number, updates: Partial<T> | ((prev: T) => T)): void;
  clear(): void;

  // Batch operations
  appendMany(items: T[]): void;
  removeMany(indices: number[]): void;

  // Conditional operations
  removeWhere(predicate: (item: T) => boolean): void;
  updateWhere(predicate: (item: T) => boolean, updates: Partial<T>): void;
}

/**
 * Create array state setter with semantic helper methods
 */
function createArrayStateSetter<T>(
  baseSetState: (value: T[]) => void,
  currentArray: T[],
  stateKey: string,
  context: ComponentContext
): ArrayStateSetter<T> {
  // Base setter function
  const setter: any = baseSetState;

  // Append helper
  setter.append = (item: T) => {
    const newArray = [...currentArray, item];

    // Update local state
    context.state.set(stateKey, newArray);

    // Update template state
    templateState.updateState(context.componentId, stateKey, newArray);

    // Notify server of APPEND operation (not just new array)
    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'Append', item }
    ).catch(err => {
      console.error('[Minimact] Failed to sync array append to server:', err);
    });

    // TODO: Try to predict patch using loop template
    console.log(`[Minimact] 🔵 Array append: ${stateKey}`, item);
  };

  // Prepend helper
  setter.prepend = (item: T) => {
    const newArray = [item, ...currentArray];

    context.state.set(stateKey, newArray);
    templateState.updateState(context.componentId, stateKey, newArray);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'Prepend', item }
    ).catch(err => {
      console.error('[Minimact] Failed to sync array prepend to server:', err);
    });

    console.log(`[Minimact] 🔵 Array prepend: ${stateKey}`, item);
  };

  // InsertAt helper
  setter.insertAt = (index: number, item: T) => {
    const newArray = [...currentArray];
    newArray.splice(index, 0, item);

    context.state.set(stateKey, newArray);
    templateState.updateState(context.componentId, stateKey, newArray);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'InsertAt', index, item }
    ).catch(err => {
      console.error('[Minimact] Failed to sync array insert to server:', err);
    });

    console.log(`[Minimact] 🔵 Array insertAt(${index}): ${stateKey}`, item);
  };

  // RemoveAt helper
  setter.removeAt = (index: number) => {
    const newArray = currentArray.filter((_, i) => i !== index);

    context.state.set(stateKey, newArray);
    templateState.updateState(context.componentId, stateKey, newArray);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'RemoveAt', index }
    ).catch(err => {
      console.error('[Minimact] Failed to sync array remove to server:', err);
    });

    console.log(`[Minimact] 🔵 Array removeAt(${index}): ${stateKey}`);
  };

  // UpdateAt helper
  setter.updateAt = (index: number, updates: Partial<T> | ((prev: T) => T)) => {
    const newArray = [...currentArray];
    newArray[index] = typeof updates === 'function'
      ? (updates as (prev: T) => T)(currentArray[index])
      : { ...currentArray[index] as any, ...updates };

    context.state.set(stateKey, newArray);
    templateState.updateState(context.componentId, stateKey, newArray);

    context.signalR.updateComponentStateWithOperation(
      context.componentId,
      stateKey,
      newArray,
      { type: 'UpdateAt', index, item: newArray[index] }
    ).catch(err => {
      console.error('[Minimact] Failed to sync array update to server:', err);
    });

    console.log(`[Minimact] 🔵 Array updateAt(${index}): ${stateKey}`, newArray[index]);
  };

  // Clear helper
  setter.clear = () => {
    baseSetState([]);
  };

  // RemoveWhere helper
  setter.removeWhere = (predicate: (item: T) => boolean) => {
    const newArray = currentArray.filter(item => !predicate(item));
    baseSetState(newArray);
  };

  // UpdateWhere helper
  setter.updateWhere = (predicate: (item: T) => boolean, updates: Partial<T>) => {
    const newArray = currentArray.map(item =>
      predicate(item) ? { ...item as any, ...updates } : item
    );
    baseSetState(newArray);
  };

  // AppendMany helper
  setter.appendMany = (items: T[]) => {
    const newArray = [...currentArray, ...items];
    baseSetState(newArray);
  };

  // RemoveMany helper
  setter.removeMany = (indices: number[]) => {
    const newArray = currentArray.filter((_, i) => !indices.includes(i));
    baseSetState(newArray);
  };

  return setter as ArrayStateSetter<T>;
}

/**
 * useServerTask - Execute long-running operations on the server with reactive client state
 *
 * @param taskFactory - Optional async function (will be transpiled to C# by Babel plugin)
 * @param options - Configuration options for the server task
 * @returns ServerTask interface with status, result, and control methods
 *
 * @example
 * const analysis = useServerTask(async () => {
 *   // This code runs on the SERVER (transpiled to C#)
 *   const data = await fetchData();
 *   return processData(data);
 * });
 *
 * // In JSX:
 * <button onClick={analysis.start}>Start</button>
 * {analysis.running && <Spinner />}
 * {analysis.complete && <div>{analysis.result}</div>}
 */
export function useServerTask<T>(
  taskFactory?: () => Promise<T>,
  options: ServerTaskOptions = {}
): ServerTask<T> {
  if (!currentContext) {
    throw new Error('useServerTask must be called within a component render');
  }

  const context = currentContext;
  const index = serverTaskIndex++;
  const taskKey = `serverTask_${index}`;

  // Initialize serverTasks map if not exists
  if (!context.serverTasks) {
    context.serverTasks = new Map();
  }

  // Get or create server task instance
  if (!context.serverTasks.has(taskKey)) {
    const task = new ServerTaskImpl<T>(
      taskKey,
      context.componentId,
      context.signalR,
      context,
      options
    );

    context.serverTasks.set(taskKey, task);
  }

  return context.serverTasks.get(taskKey)!;
}

/**
 * useServerReducer - React-like reducer that executes on the server
 *
 * Similar to React's useReducer, but the reducer function runs on the server side.
 * This allows complex state transitions with validation, side effects, and database
 * operations to happen server-side while maintaining reactive UI updates.
 *
 * @example
 * ```tsx
 * type CounterState = { count: number };
 * type CounterAction = { type: 'increment' } | { type: 'decrement' } | { type: 'set', value: number };
 *
 * const counter = useServerReducer<CounterState, CounterAction>({ count: 0 });
 *
 * // In JSX:
 * <button onClick={() => counter.dispatch({ type: 'increment' })}>+</button>
 * <span>{counter.state.count}</span>
 * <button onClick={() => counter.dispatch({ type: 'decrement' })}>-</button>
 * {counter.dispatching && <Spinner />}
 * {counter.error && <div>Error: {counter.error.message}</div>}
 * ```
 *
 * @example
 * ```tsx
 * // With async dispatch (await the result)
 * const handleReset = async () => {
 *   const newState = await counter.dispatchAsync({ type: 'set', value: 0 });
 *   console.log('Counter reset to:', newState.count);
 * };
 * ```
 */
export function useServerReducer<TState, TAction>(
  initialState: TState
): ServerReducer<TState, TAction> {
  if (!currentContext) {
    throw new Error('useServerReducer must be called within a component render');
  }

  const context = currentContext;
  const index = serverReducerIndex++;
  const reducerKey = `serverReducer_${index}`;

  // Initialize serverReducers map if not exists
  if (!context.serverReducers) {
    context.serverReducers = new Map();
  }

  // Get or create server reducer instance
  if (!context.serverReducers.has(reducerKey)) {
    const reducer = new ServerReducerImpl<TState, TAction>(
      reducerKey,
      context.componentId,
      context.signalR,
      context,
      initialState
    );

    context.serverReducers.set(reducerKey, reducer);
  }

  return context.serverReducers.get(reducerKey)!;
}
