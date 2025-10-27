/**
 * SignalM Types and Interfaces
 *
 * TypeScript definitions for SignalM connection and protocol
 */

import type { IRetryPolicy } from './RetryPolicy';

/**
 * Connection state
 */
export enum ConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting'
}

/**
 * SignalM connection options
 */
export interface SignalMOptions {
  /** Custom retry policy for reconnection */
  reconnectPolicy?: IRetryPolicy;

  /** Enable debug logging */
  debug?: boolean;

  /** Additional headers to send with connection */
  headers?: Record<string, string>;

  /** Connection timeout in milliseconds (default: 30000) */
  connectionTimeout?: number;

  /** Invocation timeout in milliseconds (default: 30000) */
  invocationTimeout?: number;
}

/**
 * Pending invocation tracking
 */
export interface PendingInvocation {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: number;
}

/**
 * SignalR message types
 * https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md
 */
export enum MessageType {
  /** Invocation message (client → server or server → client) */
  Invocation = 1,
  /** StreamItem message (not supported in SignalM) */
  StreamItem = 2,
  /** Completion message (response to invocation) */
  Completion = 3,
  /** StreamInvocation message (not supported in SignalM) */
  StreamInvocation = 4,
  /** CancelInvocation message (not supported in SignalM) */
  CancelInvocation = 5,
  /** Ping message */
  Ping = 6,
  /** Close message */
  Close = 7
}

/**
 * Invocation message (client → server or server → client RPC call)
 */
export interface InvocationMessage {
  type: MessageType.Invocation;
  invocationId?: string;
  target: string;
  arguments: any[];
  streamIds?: string[];
}

/**
 * Completion message (response to invocation)
 */
export interface CompletionMessage {
  type: MessageType.Completion;
  invocationId: string;
  result?: any;
  error?: string;
}

/**
 * Ping message (keep-alive)
 */
export interface PingMessage {
  type: MessageType.Ping;
}

/**
 * Close message (connection termination)
 */
export interface CloseMessage {
  type: MessageType.Close;
  error?: string;
  allowReconnect?: boolean;
}

/**
 * Union type of all message types
 */
export type Message = InvocationMessage | CompletionMessage | PingMessage | CloseMessage;

/**
 * Connection event types
 */
export type ConnectionEvent = 'connected' | 'disconnected' | 'reconnecting' | 'reconnected' | 'error';
