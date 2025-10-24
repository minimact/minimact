/**
 * React Hook Shim for Visual Compiler
 *
 * Replaces React hooks with deterministic, side-effect-free versions
 * that allow complete control over component state during layout analysis
 */
import { createElement, Fragment } from 'react';
let mockState = {
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
export function injectState(stateKey, value) {
    mockState.states.set(stateKey, value);
}
/**
 * Inject context values for testing
 */
export function injectContext(contextKey, value) {
    mockState.contexts.set(contextKey, value);
}
/**
 * Deterministic useState that allows state injection
 */
export function useState(initialState) {
    const stateKey = `state-${mockState.currentStateIndex++}`;
    // Get initial value
    const initial = typeof initialState === 'function'
        ? initialState()
        : initialState;
    // Use injected state if available, otherwise use initial
    const currentValue = mockState.states.has(stateKey)
        ? mockState.states.get(stateKey)
        : initial;
    // Create a setter that updates our mock state
    const setter = (action) => {
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
export function useEffect(effect, deps) {
    // Completely suppress all effects during visual compilation
    // This prevents API calls, subscriptions, DOM manipulations, etc.
}
/**
 * No-op useLayoutEffect
 */
export function useLayoutEffect(effect, deps) {
    // Suppress layout effects too
}
/**
 * Controlled useContext with injection support
 */
export function useContext(context) {
    const contextKey = context.displayName || 'unknown-context';
    // Return injected context if available
    if (mockState.contexts.has(contextKey)) {
        return mockState.contexts.get(contextKey);
    }
    // Return default value from context
    return context._currentValue || {};
}
/**
 * Deterministic useRef
 */
export function useRef(initialValue) {
    const refKey = `ref-${mockState.currentStateIndex++}`;
    if (!mockState.refs.has(refKey)) {
        mockState.refs.set(refKey, { current: initialValue });
    }
    return mockState.refs.get(refKey);
}
/**
 * No-op useCallback - return the function as-is
 */
export function useCallback(callback, deps) {
    return callback;
}
/**
 * No-op useMemo - return the value as-is
 */
export function useMemo(factory, deps) {
    return factory();
}
/**
 * Controlled useReducer
 */
export function useReducer(reducer, initialArg, init) {
    const stateKey = `reducer-${mockState.currentStateIndex++}`;
    const initial = init ? init(initialArg) : initialArg;
    const currentState = mockState.states.has(stateKey)
        ? mockState.states.get(stateKey)
        : initial;
    const dispatch = (action) => {
        const newState = reducer(currentState, action);
        mockState.states.set(stateKey, newState);
    };
    return [currentState, dispatch];
}
/**
 * Mock createContext
 */
export function createContext(defaultValue) {
    const context = {
        Provider: ({ children, value }) => {
            // Mock provider that just renders children
            return createElement('div', { 'data-context-provider': true }, children);
        },
        Consumer: ({ children }) => {
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
        navigateToTab: (path, title, options) => {
            console.log(`[Mock Navigation] ${title} -> ${path}`);
        },
        closeTab: (tabId) => {
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
    Component: class {
    },
    PureComponent: class {
    }
};
