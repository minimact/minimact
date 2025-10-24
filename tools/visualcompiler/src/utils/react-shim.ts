/**
 * React Hook Shim for Visual Compiler
 *
 * Replaces React hooks with deterministic, side-effect-free versions
 * that allow complete control over component state during layout analysis
 */

import { createElement, Fragment } from 'react';

// Mock React hooks for deterministic rendering

// State injection system for controlled testing
interface MockState {
  states: Map<string, any>;
  contexts: Map<string, any>;
  refs: Map<string, any>;
  currentStateIndex: number;
}

let mockState: MockState = {
  states: new Map(),
  contexts: new Map(),
  refs: new Map(),
  currentStateIndex: 0
};

/**
 * Reset mock state for fresh test runs
 */
export function resetMockState() {
  mockState = {
    states: new Map(),
    contexts: new Map(),
    refs: new Map(),
    currentStateIndex: 0
  };
}

/**
 * Inject specific state values for testing
 */
export function injectState(stateKey: string, value: any) {
  mockState.states.set(stateKey, value);
}

/**
 * Inject context values for testing
 */
export function injectContext(contextKey: string, value: any) {
  mockState.contexts.set(contextKey, value);
}

/**
 * Deterministic useState that allows state injection
 */
export function useState<T>(initialState: T | (() => T)): [T, (value: T) => void] {
  const stateKey = `state-${mockState.currentStateIndex++}`;

  // Get initial value
  const initial = typeof initialState === 'function'
    ? (initialState as () => T)()
    : initialState;

  // Use injected state if available, otherwise use initial
  const currentValue = mockState.states.has(stateKey)
    ? mockState.states.get(stateKey)
    : initial;

  // Create a setter that updates our mock state
  const setter = (action: any) => {
    const newValue = typeof action === 'function'
      ? action(currentValue)
      : action;
    mockState.states.set(stateKey, newValue);
  };

  return [currentValue, setter];
}

/**
 * No-op useEffect - completely suppress side effects
 */
export function useEffect(effect: () => void, deps?: any[]): void {
  // Completely suppress all effects during visual compilation
  // This prevents API calls, subscriptions, DOM manipulations, etc.
}

/**
 * No-op useLayoutEffect
 */
export function useLayoutEffect(effect: () => void, deps?: any[]): void {
  // Suppress layout effects too
}

/**
 * Controlled useContext with injection support
 */
export function useContext<T>(context: any): T {
  const contextKey = context.displayName || 'unknown-context';

  // Return injected context if available
  if (mockState.contexts.has(contextKey)) {
    return mockState.contexts.get(contextKey);
  }

  // Return default value from context
  return context._currentValue || ({} as T);
}

/**
 * Deterministic useRef
 */
export function useRef<T>(initialValue: T): { current: T } {
  const refKey = `ref-${mockState.currentStateIndex++}`;

  if (!mockState.refs.has(refKey)) {
    mockState.refs.set(refKey, { current: initialValue });
  }

  return mockState.refs.get(refKey);
}

/**
 * No-op useCallback - return the function as-is
 */
export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return callback;
}

/**
 * No-op useMemo - return the value as-is
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
  return factory();
}

/**
 * Controlled useReducer
 */
export function useReducer<R extends (state: any, action: any) => any>(
  reducer: R,
  initialArg: any,
  init?: (arg: any) => any
): [any, (action: any) => void] {
  const stateKey = `reducer-${mockState.currentStateIndex++}`;

  const initial = init ? init(initialArg) : initialArg;
  const currentState = mockState.states.has(stateKey)
    ? mockState.states.get(stateKey)
    : initial;

  const dispatch = (action: any) => {
    const newState = reducer(currentState, action);
    mockState.states.set(stateKey, newState);
  };

  return [currentState, dispatch];
}

/**
 * Mock createContext
 */
export function createContext<T>(defaultValue: T) {
  const context = {
    Provider: ({ children, value }: { children: any; value?: T }) => {
      // Mock provider that just renders children
      return createElement('div', { 'data-context-provider': true }, children);
    },
    Consumer: ({ children }: { children: (value: T) => any }) => {
      // Mock consumer that provides default value
      return createElement('div', { 'data-context-consumer': true }, children(defaultValue));
    },
    _currentValue: defaultValue,
    displayName: 'MockContext'
  };
  return context;
}

/**
 * Custom hooks specific to FailSquare
 */

// Mock useAuth hook for FailSquare
export function useAuth() {
  const contextKey = 'AuthContext';

  if (mockState.contexts.has(contextKey)) {
    return mockState.contexts.get(contextKey);
  }

  // Default mock auth state
  return {
    user: {
      id: 'mock-user-1',
      email: 'test@failsquare.com',
      username: 'testuser',
      displayName: 'Test User'
    },
    isAuthenticated: true,
    login: () => Promise.resolve(true),
    logout: () => Promise.resolve(),
    register: () => Promise.resolve(true)
  };
}

// Mock useTabNavigation hook for FailSquare
export function useTabNavigation() {
  return {
    navigateToTab: (path: string, title: string, options?: any) => {
      console.log(`[Mock Navigation] ${title} -> ${path}`);
    },
    closeTab: (tabId: string) => {
      console.log(`[Mock Navigation] Close tab ${tabId}`);
    }
  };
}

// Export all React functionality with shims
export { createElement, Fragment };

// Default export to mimic React module structure
export default {
  useState,
  useEffect,
  useLayoutEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  createContext,
  useAuth,
  useTabNavigation,
  createElement,
  Fragment,
  Component: class {},
  PureComponent: class {}
};