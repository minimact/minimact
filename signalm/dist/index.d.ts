/**
 * SignalM - Lightweight real-time for modern browsers
 *
 * Compatible with ASP.NET Core SignalR hubs
 * WebSocket + JSON only, ~2-3 KB gzipped
 *
 * @packageDocumentation
 */
export { ConnectionState } from './types';
export type { SignalMOptions, Message, InvocationMessage, CompletionMessage, PingMessage, CloseMessage, MessageType, ConnectionEvent } from './types';
export { ExponentialBackoffRetryPolicy, FixedRetryPolicy, NoRetryPolicy, CustomRetryPolicy } from './RetryPolicy';
export type { IRetryPolicy } from './RetryPolicy';
export { JsonProtocol } from './JsonProtocol';
export { EventEmitter } from './EventEmitter';
export { SignalMConnection } from './SignalMConnection';
export declare const VERSION = "0.1.0";
