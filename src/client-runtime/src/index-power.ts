/**
 * @minimact/core/power
 *
 * Power features for Minimact - all optional hooks and utilities
 *
 * Usage:
 *   import { useServerTask, useComputed, usePaginatedServerTask } from '@minimact/core/power';
 *
 * Bundle impact: +5.37 KB gzipped (only if imported)
 *
 * This module includes all power features that most apps don't need:
 * - Server tasks (useServerTask, useServerReducer, usePaginatedServerTask)
 * - Client computation (useComputed, client-computed module)
 * - Pub/Sub (usePub, useSub)
 * - Task scheduling (useMicroTask, useMacroTask, useAnimationFrame, useIdleCallback)
 * - SignalR hooks (useSignalR)
 * - Context API (createContext, useContext)
 * - Markdown rendering (useMarkdown)
 */

// Server tasks
export { useServerTask, useServerReducer, useMarkdown } from './hooks';
export type { ServerTask, ServerTaskOptions, ServerTaskStatus } from './server-task';
export type { ServerReducer } from './server-reducer';

// Paginated server tasks
export { usePaginatedServerTask } from './usePaginatedServerTask';
export type { PaginatedServerTask, PaginatedServerTaskOptions, PaginationParams } from './usePaginatedServerTask';

// Client-computed state (for external libraries like lodash, moment.js)
export {
  registerClientComputed,
  computeVariable,
  computeAllForComponent,
  computeDependentVariables,
  getLastValue,
  getAllLastValues,
  hasClientComputed,
  getComputedVariableNames,
  clearComponent as clearClientComputedComponent,
  getDebugInfo as getClientComputedDebugInfo
} from './client-computed';

// useComputed hook (for client-side computation with browser APIs/libraries)
export { useComputed } from './useComputed';
export type { UseComputedOptions } from './useComputed';

// Context hooks
export { createContext, useContext, setContextHookContext, clearContextHookContext } from './useContext';
export type { Context, ContextOptions } from './useContext';

// Pub/Sub hooks
export { usePub, useSub } from './pub-sub';
export type { PubSubMessage } from './pub-sub';

// Task scheduling hooks
export { useMicroTask, useMacroTask, useAnimationFrame, useIdleCallback } from './task-scheduling';

// SignalR hook (lightweight SignalM implementation)
export { useSignalR } from './signalr-hook-m';
export type { SignalRHookState } from './signalr-hook-m';
