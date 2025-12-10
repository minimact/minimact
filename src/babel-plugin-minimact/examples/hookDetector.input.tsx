/**
 * Example: hookDetector.cjs - Detects if function is a custom hook
 *
 * Custom hook requirements:
 * 1. Function name starts with 'use'
 * 2. First parameter is named 'namespace' (string type)
 * 3. Contains at least one useState call OR returns JSX
 *
 * Functions exported:
 * - isCustomHook(path) → boolean
 * - getHookName(path) → string | null
 * - getHookParameters(path) → { name, type, defaultValue }[]
 * - getHookBody(path) → Node | null
 * - containsUseState(path) → boolean
 * - returnsJSX(path) → boolean
 * - isNamespaceParameter(param) → boolean
 * - extractTypeString(typeNode) → string
 */
import { useState, useEffect, useRef } from '@minimact/core';

// ✓ CUSTOM HOOK: starts with 'use', first param is 'namespace', contains useState
function useCounter(namespace: string, initial: number = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initial);
  return [count, increment, decrement, reset];
}

// ✓ CUSTOM HOOK: arrow function syntax, namespace param, contains useState
const useToggle = (namespace: string, initialValue: boolean = false) => {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue(v => !v);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);
  return [value, toggle, setTrue, setFalse];
};

// ✓ CUSTOM HOOK: returns JSX (even without useState)
function useErrorDisplay(namespace: string, message: string) {
  const ui = message ? <div className="error">{message}</div> : null;
  return ui;
}

// ✓ CUSTOM HOOK: namespace without type annotation (accepted)
function useSimple(namespace, value) {
  const [state, setState] = useState(value);
  return [state, setState];
}

// ✓ CUSTOM HOOK: with typed parameters
function useTypedHook(namespace: string, items: string[], count: number) {
  const [data, setData] = useState(items);
  const [total, setTotal] = useState(count);
  return { data, total, setData, setTotal };
}

// ✗ NOT A HOOK: first param is NOT 'namespace'
function useInvalidHook(id: string, value: number) {
  const [state, setState] = useState(value);
  return [state, setState];
}

// ✗ NOT A HOOK: PascalCase = Component, not hook
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// ✗ NOT A HOOK: doesn't start with 'use'
function createCounter(namespace: string, initial: number) {
  const [count, setCount] = useState(initial);
  return [count, setCount];
}

// ✗ NOT A HOOK: no parameters
function useNoParams() {
  const [state, setState] = useState(0);
  return [state, setState];
}

// ✗ NOT A HOOK: lowercase helper function
function formatNumber(n: number): string {
  return n.toFixed(2);
}

// Component using the custom hooks
export function HookDetectorExample() {
  // Custom hooks are called with namespace + other args
  const [count, inc, dec, reset] = useCounter('myCounter', 10);
  const [isOpen, toggle] = useToggle('modal', false);
  const errorUI = useErrorDisplay('errors', 'Something went wrong');
  const { data, total } = useTypedHook('typed', ['a', 'b'], 5);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={inc}>+</button>
      <button onClick={dec}>-</button>
      <button onClick={reset}>Reset</button>
      <button onClick={toggle}>Toggle ({isOpen ? 'Open' : 'Closed'})</button>
      {errorUI}
      <p>Total items: {total}</p>
    </div>
  );
}
