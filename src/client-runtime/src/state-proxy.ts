/**
 * State Proxy - Compile-time construct for TypeScript IntelliSense
 *
 * This proxy provides type-safe access to component state, including lifted child state.
 * It is a COMPILE-TIME ONLY construct that gets transpiled to C# State property access.
 *
 * ⚠️ NEVER executes at runtime - the Babel plugin replaces all usages during transpilation.
 *
 * @example
 * // Basic usage
 * import { state } from 'minimact';
 * const value = state.myKey;  // → State["myKey"] in C#
 *
 * @example
 * // Lifted state (accessing child component state)
 * const childValue = state["ChildComponent.key"];  // → State["ChildComponent.key"] in C#
 *
 * @example
 * // Type-safe usage
 * interface MyState {
 *   count: number;
 *   "Child.isOpen": boolean;
 * }
 * const s = state as ComponentState<MyState>;
 * const count = s.count;  // ✅ Type: number
 */
export const state = new Proxy<Record<string, any>>({}, {
  get(target, prop) {
    // This code should NEVER execute - it means the Babel plugin failed to transpile
    throw new Error(
      `[Minimact] 'state' is a compile-time construct and should not execute at runtime.\n` +
      `Key accessed: "${String(prop)}"\n\n` +
      `This error means:\n` +
      `1. The Babel plugin (babel-plugin-minimact) is not configured correctly\n` +
      `2. You're trying to use 'state' in a non-component context\n` +
      `3. The file was not transpiled through the Minimact build pipeline\n\n` +
      `Solution: Ensure babel-plugin-minimact is properly configured in your build.`
    );
  },

  set(target, prop, value) {
    throw new Error(
      `[Minimact] Cannot set state directly using 'state.${String(prop)} = value'.\n` +
      `Use setState('${String(prop)}', value) instead.`
    );
  },

  has(target, prop) {
    throw new Error(
      `[Minimact] 'state' proxy should not be used with 'in' operator at runtime.\n` +
      `Key checked: "${String(prop)}"\n` +
      `Use hasState('${String(prop)}') method instead.`
    );
  }
});

/**
 * Type-safe state interface for component state
 *
 * Define your component's state shape for full IntelliSense support.
 *
 * @example
 * interface MyComponentState {
 *   count: number;
 *   message: string;
 *   isOpen: boolean;
 *
 *   // Lifted child state (namespaced with component name)
 *   "ChildComponent.value": string;
 *   "ChildComponent.isValid": boolean;
 * }
 *
 * export default function MyComponent() {
 *   const s = state as ComponentState<MyComponentState>;
 *   const count = s.count;  // ✅ Type: number (IntelliSense works!)
 * }
 */
export type ComponentState<T = Record<string, any>> = T;

/**
 * Alternative export name for ComponentState
 */
export type State<T = Record<string, any>> = ComponentState<T>;

/**
 * Set state value (including lifted child state)
 *
 * This is a COMPILE-TIME ONLY construct that gets transpiled to C# SetState() calls.
 * It NEVER executes at runtime - the Babel plugin replaces it during transpilation.
 *
 * @example
 * // Set own state
 * import { setState } from 'minimact';
 * setState('myKey', 'myValue');  // → SetState("myKey", "myValue") in C#
 *
 * @example
 * // Set child state (lifted state pattern)
 * setState('ChildComponent.key', value);  // → SetState("ChildComponent.key", value) in C#
 *
 * @example
 * // Parent controlling child state
 * const handleReset = () => {
 *   setState("Counter.count", 0);
 *   setState("Timer.seconds", 0);
 * };
 */
export function setState(key: string, value: any): void {
  // This code should NEVER execute - it means the Babel plugin failed to transpile
  throw new Error(
    `[Minimact] 'setState' is a compile-time construct and should not execute at runtime.\n` +
    `Key: "${key}", Value: ${JSON.stringify(value)}\n\n` +
    `This error means:\n` +
    `1. The Babel plugin (babel-plugin-minimact) is not configured correctly\n` +
    `2. You're trying to use 'setState' in a non-component context\n` +
    `3. The file was not transpiled through the Minimact build pipeline\n\n` +
    `Solution: Ensure babel-plugin-minimact is properly configured in your build.`
  );
}
