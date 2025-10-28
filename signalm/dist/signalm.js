(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SignalM = {}));
})(this, (function (exports) { 'use strict';

    /**
     * SignalM Types and Interfaces
     *
     * TypeScript definitions for SignalM connection and protocol
     */
    /**
     * Connection state
     */
    exports.ConnectionState = void 0;
    (function (ConnectionState) {
        ConnectionState["Disconnected"] = "Disconnected";
        ConnectionState["Connecting"] = "Connecting";
        ConnectionState["Connected"] = "Connected";
        ConnectionState["Reconnecting"] = "Reconnecting";
    })(exports.ConnectionState || (exports.ConnectionState = {}));
    /**
     * SignalR message types
     * https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md
     */
    var MessageType;
    (function (MessageType) {
        /** Invocation message (client → server or server → client) */
        MessageType[MessageType["Invocation"] = 1] = "Invocation";
        /** StreamItem message (not supported in SignalM) */
        MessageType[MessageType["StreamItem"] = 2] = "StreamItem";
        /** Completion message (response to invocation) */
        MessageType[MessageType["Completion"] = 3] = "Completion";
        /** StreamInvocation message (not supported in SignalM) */
        MessageType[MessageType["StreamInvocation"] = 4] = "StreamInvocation";
        /** CancelInvocation message (not supported in SignalM) */
        MessageType[MessageType["CancelInvocation"] = 5] = "CancelInvocation";
        /** Ping message */
        MessageType[MessageType["Ping"] = 6] = "Ping";
        /** Close message */
        MessageType[MessageType["Close"] = 7] = "Close";
    })(MessageType || (MessageType = {}));

    /**
     * Retry Policy Interface and Implementations
     *
     * Defines reconnection strategies for SignalM connections
     */
    /**
     * Exponential backoff retry policy
     *
     * Retry delays: 0ms, 2s, 10s, 30s, then 60s max
     * Allows infinite retries with capped delay
     */
    class ExponentialBackoffRetryPolicy {
        constructor() {
            this.delays = [0, 2000, 10000, 30000];
            this.maxDelay = 60000; // 60 seconds
        }
        nextRetryDelay(retryAttempt) {
            // Allow infinite retries, but cap delay at maxDelay
            if (retryAttempt < this.delays.length) {
                return this.delays[retryAttempt];
            }
            return this.maxDelay;
        }
    }
    /**
     * Fixed interval retry policy
     *
     * Retries at fixed intervals with a maximum retry count
     */
    class FixedRetryPolicy {
        /**
         * Create a fixed retry policy
         *
         * @param interval - Retry interval in milliseconds (default: 5000)
         * @param maxRetries - Maximum number of retries (default: 10)
         */
        constructor(interval = 5000, maxRetries = 10) {
            this.interval = interval;
            this.maxRetries = maxRetries;
        }
        nextRetryDelay(retryAttempt) {
            if (retryAttempt >= this.maxRetries) {
                return null; // Max retries exceeded
            }
            return this.interval;
        }
    }
    /**
     * No retry policy
     *
     * Fails immediately without retrying
     */
    class NoRetryPolicy {
        nextRetryDelay() {
            return null; // Never retry
        }
    }
    /**
     * Custom retry policy with configurable delays
     *
     * Allows specifying exact retry delays
     */
    class CustomRetryPolicy {
        /**
         * Create a custom retry policy
         *
         * @param delays - Array of retry delays in milliseconds
         * @param repeatLast - If true, repeat the last delay infinitely (default: false)
         */
        constructor(delays, repeatLast = false) {
            if (delays.length === 0) {
                throw new Error('Delays array cannot be empty');
            }
            this.delays = delays;
            this.repeatLast = repeatLast;
        }
        nextRetryDelay(retryAttempt) {
            if (retryAttempt < this.delays.length) {
                return this.delays[retryAttempt];
            }
            if (this.repeatLast) {
                return this.delays[this.delays.length - 1];
            }
            return null; // No more retries
        }
    }

    /**
     * SignalR JSON Protocol Implementation
     *
     * Implements the SignalR JSON protocol for message serialization.
     * Compatible with ASP.NET Core SignalR hubs.
     *
     * Protocol Spec: https://github.com/dotnet/aspnetcore/blob/main/src/SignalR/docs/specs/HubProtocol.md
     */
    class JsonProtocol {
        /**
         * Write invocation message (client → server RPC call)
         */
        static writeInvocation(invocationId, target, args) {
            return {
                type: 1,
                invocationId,
                target,
                arguments: args
            };
        }
        /**
         * Write message without response (fire-and-forget)
         */
        static writeMessage(target, args) {
            return {
                type: 1,
                target,
                arguments: args
            };
        }
        /**
         * Write ping message (keep-alive)
         */
        static writePing() {
            return {
                type: 6
            };
        }
        /**
         * Write close message
         */
        static writeClose(error) {
            return {
                type: 7,
                error
            };
        }
        /**
         * Parse incoming message
         */
        static parseMessage(data) {
            try {
                return JSON.parse(data);
            }
            catch (error) {
                throw new Error(`Failed to parse message: ${error}`);
            }
        }
        /**
         * Serialize message to JSON string
         */
        static serializeMessage(message) {
            return JSON.stringify(message);
        }
        /**
         * Check if message is invocation
         */
        static isInvocation(message) {
            return message.type === 1;
        }
        /**
         * Check if message is completion
         */
        static isCompletion(message) {
            return message.type === 3;
        }
        /**
         * Check if message is ping
         */
        static isPing(message) {
            return message.type === 6;
        }
        /**
         * Check if message is close
         */
        static isClose(message) {
            return message.type === 7;
        }
    }
    /**
     * Protocol name
     */
    JsonProtocol.protocolName = 'json';
    /**
     * Protocol version
     */
    JsonProtocol.protocolVersion = 1;

    /**
     * Simple Event Emitter
     *
     * Lightweight event handling for SignalM connections
     */
    class EventEmitter {
        constructor() {
            this.events = new Map();
        }
        /**
         * Register an event handler
         *
         * @param event - Event name
         * @param handler - Event handler function
         */
        on(event, handler) {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(handler);
        }
        /**
         * Unregister an event handler
         *
         * @param event - Event name
         * @param handler - Event handler function to remove
         */
        off(event, handler) {
            const handlers = this.events.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        }
        /**
         * Register a one-time event handler
         *
         * @param event - Event name
         * @param handler - Event handler function (will be called once)
         */
        once(event, handler) {
            const onceHandler = (...args) => {
                handler(...args);
                this.off(event, onceHandler);
            };
            this.on(event, onceHandler);
        }
        /**
         * Emit an event
         *
         * @param event - Event name
         * @param args - Event arguments
         */
        emit(event, ...args) {
            const handlers = this.events.get(event);
            if (handlers) {
                // Create a copy to avoid issues if handlers are removed during iteration
                const handlersCopy = [...handlers];
                handlersCopy.forEach(handler => {
                    try {
                        handler(...args);
                    }
                    catch (error) {
                        console.error(`[SignalM] Error in event handler for '${event}':`, error);
                    }
                });
            }
        }
        /**
         * Remove all event handlers for a specific event
         *
         * @param event - Event name (if not provided, clears all events)
         */
        removeAllListeners(event) {
            if (event) {
                this.events.delete(event);
            }
            else {
                this.events.clear();
            }
        }
        /**
         * Get the number of listeners for an event
         *
         * @param event - Event name
         * @returns Number of listeners
         */
        listenerCount(event) {
            const handlers = this.events.get(event);
            return handlers ? handlers.length : 0;
        }
        /**
         * Get all event names with listeners
         *
         * @returns Array of event names
         */
        eventNames() {
            return Array.from(this.events.keys());
        }
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    /**
     * SignalM Connection
     *
     * Lightweight WebSocket-based connection compatible with SignalR hubs.
     * Supports method invocation, event handling, and automatic reconnection.
     */
    class SignalMConnection {
        constructor(url, options = {}) {
            this.ws = null;
            this.handlers = new Map();
            this.pendingInvocations = new Map();
            this.invocationId = 0;
            this.state = exports.ConnectionState.Disconnected;
            this.reconnectAttempts = 0;
            this.reconnectTimeoutId = null;
            this.url = url;
            this.reconnectPolicy = options.reconnectPolicy || new ExponentialBackoffRetryPolicy();
            this.debugLogging = options.debug || false;
            this.connectionTimeout = options.connectionTimeout || 30000;
            this.invocationTimeout = options.invocationTimeout || 30000;
            this.eventEmitter = new EventEmitter();
        }
        /**
         * Start the connection
         */
        start() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.state !== exports.ConnectionState.Disconnected) {
                    throw new Error('Connection is already started');
                }
                this.state = exports.ConnectionState.Connecting;
                this.log('Starting connection...');
                return this.connect();
            });
        }
        /**
         * Stop the connection
         */
        stop() {
            return __awaiter(this, void 0, void 0, function* () {
                this.log('Stopping connection...');
                // Clear any pending reconnect
                if (this.reconnectTimeoutId !== null) {
                    clearTimeout(this.reconnectTimeoutId);
                    this.reconnectTimeoutId = null;
                }
                if (this.ws) {
                    this.ws.close(1000, 'Normal closure');
                    this.ws = null;
                }
                this.state = exports.ConnectionState.Disconnected;
                this.eventEmitter.emit('disconnected');
            });
        }
        /**
         * Invoke a server method and wait for result
         */
        invoke(methodName, ...args) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.state !== exports.ConnectionState.Connected) {
                    throw new Error(`Connection is not in Connected state (current: ${this.state})`);
                }
                const invocationId = this.generateInvocationId();
                const message = JsonProtocol.writeInvocation(invocationId, methodName, args);
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.pendingInvocations.delete(invocationId);
                        reject(new Error(`Invocation '${methodName}' timed out after ${this.invocationTimeout}ms`));
                    }, this.invocationTimeout);
                    this.pendingInvocations.set(invocationId, {
                        resolve,
                        reject,
                        timeout: timeout
                    });
                    const serialized = JsonProtocol.serializeMessage(message);
                    this.log(`Invoking '${methodName}' (id: ${invocationId})`, args);
                    this.ws.send(serialized);
                });
            });
        }
        /**
         * Send a message without expecting a response (fire-and-forget)
         */
        send(methodName, ...args) {
            if (this.state !== exports.ConnectionState.Connected) {
                throw new Error(`Connection is not in Connected state (current: ${this.state})`);
            }
            const message = JsonProtocol.writeMessage(methodName, args);
            const serialized = JsonProtocol.serializeMessage(message);
            this.log(`Sending '${methodName}' (fire-and-forget)`, args);
            this.ws.send(serialized);
        }
        /**
         * Register a handler for server-to-client method calls
         */
        on(methodName, handler) {
            if (!this.handlers.has(methodName)) {
                this.handlers.set(methodName, []);
            }
            this.handlers.get(methodName).push(handler);
            this.log(`Registered handler for '${methodName}'`);
        }
        /**
         * Remove a handler
         */
        off(methodName, handler) {
            const handlers = this.handlers.get(methodName);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                    this.log(`Removed handler for '${methodName}'`);
                }
            }
        }
        /**
         * Register event listener for connection lifecycle events
         */
        onConnected(handler) {
            this.eventEmitter.on('connected', handler);
        }
        onDisconnected(handler) {
            this.eventEmitter.on('disconnected', handler);
        }
        onReconnecting(handler) {
            this.eventEmitter.on('reconnecting', handler);
        }
        onReconnected(handler) {
            this.eventEmitter.on('reconnected', handler);
        }
        onError(handler) {
            this.eventEmitter.on('error', handler);
        }
        /**
         * Get current connection state
         */
        get connectionState() {
            return this.state;
        }
        /**
         * Internal: Connect to WebSocket
         */
        connect() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    const wsUrl = this.buildWebSocketUrl();
                    this.log(`Connecting to ${wsUrl}...`);
                    try {
                        this.ws = new WebSocket(wsUrl);
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                    // Connection timeout
                    const connectionTimeout = setTimeout(() => {
                        var _a;
                        if (this.state === exports.ConnectionState.Connecting) {
                            this.log('Connection timeout');
                            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
                            reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
                        }
                    }, this.connectionTimeout);
                    this.ws.onopen = () => {
                        clearTimeout(connectionTimeout);
                        this.state = exports.ConnectionState.Connected;
                        this.reconnectAttempts = 0;
                        this.log('Connected ✓');
                        this.eventEmitter.emit('connected');
                        resolve();
                    };
                    this.ws.onmessage = (event) => {
                        this.handleMessage(event.data);
                    };
                    this.ws.onerror = (error) => {
                        this.log('WebSocket error', error);
                        this.eventEmitter.emit('error', new Error('WebSocket error'));
                    };
                    this.ws.onclose = (event) => {
                        clearTimeout(connectionTimeout);
                        this.handleClose(event);
                    };
                });
            });
        }
        /**
         * Internal: Handle incoming messages
         */
        handleMessage(data) {
            var _a;
            try {
                const message = JsonProtocol.parseMessage(data);
                this.log(`Received message (type: ${message.type})`, message);
                if (JsonProtocol.isInvocation(message)) {
                    // Server calling client method
                    this.handleInvocation(message);
                }
                else if (JsonProtocol.isCompletion(message)) {
                    // Response to client invoke()
                    this.handleCompletion(message);
                }
                else if (JsonProtocol.isPing(message)) {
                    // Server ping (respond with pong)
                    this.handlePing();
                }
                else if (JsonProtocol.isClose(message)) {
                    // Server requested close
                    this.log('Server requested close', message.error);
                    (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close(1000, 'Server closed connection');
                }
            }
            catch (error) {
                this.log('Error parsing message', error);
                console.error('[SignalM] Error parsing message:', error);
            }
        }
        /**
         * Internal: Handle server-to-client invocation
         */
        handleInvocation(message) {
            const handlers = this.handlers.get(message.target);
            if (handlers) {
                this.log(`Calling ${handlers.length} handler(s) for '${message.target}'`);
                handlers.forEach(handler => {
                    try {
                        handler(...(message.arguments || []));
                    }
                    catch (error) {
                        console.error(`[SignalM] Error in handler for '${message.target}':`, error);
                    }
                });
            }
            else {
                this.log(`No handler registered for '${message.target}'`);
            }
        }
        /**
         * Internal: Handle completion (response to invoke)
         */
        handleCompletion(message) {
            const pending = this.pendingInvocations.get(message.invocationId);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingInvocations.delete(message.invocationId);
                if (message.error) {
                    this.log(`Invocation ${message.invocationId} failed: ${message.error}`);
                    pending.reject(new Error(message.error));
                }
                else {
                    this.log(`Invocation ${message.invocationId} completed`, message.result);
                    pending.resolve(message.result);
                }
            }
            else {
                this.log(`Received completion for unknown invocation ${message.invocationId}`);
            }
        }
        /**
         * Internal: Handle ping (send pong)
         */
        handlePing() {
            var _a;
            const pongMessage = JsonProtocol.writePing(); // Pong uses same message type
            const serialized = JsonProtocol.serializeMessage(pongMessage);
            this.log('Received ping, sending pong');
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(serialized);
        }
        /**
         * Internal: Handle connection close
         */
        handleClose(event) {
            this.log(`Connection closed (code: ${event.code}, reason: ${event.reason})`);
            this.state = exports.ConnectionState.Disconnected;
            this.ws = null;
            // Reject all pending invocations
            this.pendingInvocations.forEach((pending) => {
                clearTimeout(pending.timeout);
                pending.reject(new Error('Connection closed'));
            });
            this.pendingInvocations.clear();
            // Attempt reconnection if not normal closure (1000) or going away (1001)
            if (event.code !== 1000 && event.code !== 1001) {
                this.attemptReconnect();
            }
            else {
                this.eventEmitter.emit('disconnected');
            }
        }
        /**
         * Internal: Attempt to reconnect
         */
        attemptReconnect() {
            return __awaiter(this, void 0, void 0, function* () {
                const delay = this.reconnectPolicy.nextRetryDelay(this.reconnectAttempts);
                if (delay === null) {
                    // Max retries exceeded
                    this.log('Max reconnection attempts exceeded');
                    this.eventEmitter.emit('disconnected');
                    return;
                }
                this.reconnectAttempts++;
                this.state = exports.ConnectionState.Reconnecting;
                this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
                this.eventEmitter.emit('reconnecting');
                this.reconnectTimeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    this.reconnectTimeoutId = null;
                    try {
                        yield this.connect();
                        this.log('Reconnected ✓');
                        this.eventEmitter.emit('reconnected');
                    }
                    catch (error) {
                        this.log('Reconnection failed', error);
                        this.attemptReconnect();
                    }
                }), delay);
            });
        }
        /**
         * Internal: Build WebSocket URL
         */
        buildWebSocketUrl() {
            // If URL is absolute, use it as-is
            if (this.url.startsWith('ws://') || this.url.startsWith('wss://')) {
                return this.url;
            }
            // Otherwise, construct from current page location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const baseUrl = this.url.startsWith('/')
                ? `${protocol}//${window.location.host}${this.url}`
                : `${protocol}//${window.location.host}/${this.url}`;
            return baseUrl;
        }
        /**
         * Internal: Generate unique invocation ID
         */
        generateInvocationId() {
            return (++this.invocationId).toString();
        }
        /**
         * Internal: Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                if (data !== undefined) {
                    console.log(`[SignalM] ${message}`, data);
                }
                else {
                    console.log(`[SignalM] ${message}`);
                }
            }
        }
    }

    /**
     * SignalM - Lightweight real-time for modern browsers
     *
     * Compatible with ASP.NET Core SignalR hubs
     * WebSocket + JSON only, ~2-3 KB gzipped
     *
     * @packageDocumentation
     */
    // Export types
    // Version
    const VERSION = '0.1.0';

    exports.CustomRetryPolicy = CustomRetryPolicy;
    exports.EventEmitter = EventEmitter;
    exports.ExponentialBackoffRetryPolicy = ExponentialBackoffRetryPolicy;
    exports.FixedRetryPolicy = FixedRetryPolicy;
    exports.JsonProtocol = JsonProtocol;
    exports.NoRetryPolicy = NoRetryPolicy;
    exports.SignalMConnection = SignalMConnection;
    exports.VERSION = VERSION;

}));
//# sourceMappingURL=signalm.js.map
