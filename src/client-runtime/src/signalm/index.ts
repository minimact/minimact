/**
 * SignalM - Lightweight real-time for modern browsers
 *
 * Compatible with ASP.NET Core SignalR hubs
 * WebSocket + JSON only, ~2-3 KB gzipped
 *
 * @packageDocumentation
 */

// Export types
export { ConnectionState } from './types';
export type {
  SignalMOptions,
  Message,
  InvocationMessage,
  CompletionMessage,
  PingMessage,
  CloseMessage,
  MessageType,
  ConnectionEvent
} from './types';

// Export retry policies
export {
  ExponentialBackoffRetryPolicy,
  FixedRetryPolicy,
  NoRetryPolicy,
  CustomRetryPolicy
} from './RetryPolicy';
export type { IRetryPolicy } from './RetryPolicy';

// Export protocol
export { JsonProtocol } from './JsonProtocol';

// Export event emitter
export { EventEmitter } from './EventEmitter';

// Export main connection class
export { SignalMConnection } from './SignalMConnection';

// Version
export const VERSION = '0.1.0';
