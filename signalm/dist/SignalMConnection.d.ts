/**
 * SignalM Connection
 *
 * Lightweight WebSocket-based connection compatible with SignalR hubs.
 * Supports method invocation, event handling, and automatic reconnection.
 */
import { ConnectionState, type SignalMOptions } from './types';
export declare class SignalMConnection {
    private ws;
    private url;
    private handlers;
    private pendingInvocations;
    private invocationId;
    private reconnectPolicy;
    private state;
    private reconnectAttempts;
    private eventEmitter;
    private debugLogging;
    private connectionTimeout;
    private invocationTimeout;
    private reconnectTimeoutId;
    constructor(url: string, options?: SignalMOptions);
    /**
     * Start the connection
     */
    start(): Promise<void>;
    /**
     * Stop the connection
     */
    stop(): Promise<void>;
    /**
     * Invoke a server method and wait for result
     */
    invoke<T = any>(methodName: string, ...args: any[]): Promise<T>;
    /**
     * Send a message without expecting a response (fire-and-forget)
     */
    send(methodName: string, ...args: any[]): void;
    /**
     * Register a handler for server-to-client method calls
     */
    on(methodName: string, handler: (...args: any[]) => void): void;
    /**
     * Remove a handler
     */
    off(methodName: string, handler: (...args: any[]) => void): void;
    /**
     * Register event listener for connection lifecycle events
     */
    onConnected(handler: () => void): void;
    onDisconnected(handler: () => void): void;
    onReconnecting(handler: () => void): void;
    onReconnected(handler: () => void): void;
    onError(handler: (error: Error) => void): void;
    /**
     * Get current connection state
     */
    get connectionState(): ConnectionState;
    /**
     * Internal: Connect to WebSocket
     */
    private connect;
    /**
     * Internal: Handle incoming messages
     */
    private handleMessage;
    /**
     * Internal: Handle server-to-client invocation
     */
    private handleInvocation;
    /**
     * Internal: Handle completion (response to invoke)
     */
    private handleCompletion;
    /**
     * Internal: Handle ping (send pong)
     */
    private handlePing;
    /**
     * Internal: Handle connection close
     */
    private handleClose;
    /**
     * Internal: Attempt to reconnect
     */
    private attemptReconnect;
    /**
     * Internal: Build WebSocket URL
     */
    private buildWebSocketUrl;
    /**
     * Internal: Generate unique invocation ID
     */
    private generateInvocationId;
    /**
     * Internal: Debug logging
     */
    private log;
}
