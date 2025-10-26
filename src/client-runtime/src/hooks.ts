import { HintQueue } from './hint-queue';
import { DOMPatcher } from './dom-patcher';
import { PlaygroundBridge } from './playground-bridge';
import { SignalRManager } from './signalr-manager';
import { templateState } from './template-state';

/**
 * Component instance context for hooks
 */
interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  domElementStates?: Map<string, any>; // For minimact-punch integration
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
  signalR: SignalRManager; // For syncing state to server
}

// Global context tracking
let currentContext: ComponentContext | null = null;
let stateIndex = 0;
let effectIndex = 0;
let refIndex = 0;

/**
 * Set the current component context (called before render)
 */
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  stateIndex = 0;
  effectIndex = 0;
  refIndex = 0;
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
 * Export ComponentContext type for extensions
 */
export type { ComponentContext };
