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
    JsonProtocol.name = 'json';
    /**
     * Protocol version
     */
    JsonProtocol.version = 1;

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
    // Note: SignalMConnection will be exported here once implemented
    // export { SignalMConnection } from './SignalMConnection';

    exports.CustomRetryPolicy = CustomRetryPolicy;
    exports.EventEmitter = EventEmitter;
    exports.ExponentialBackoffRetryPolicy = ExponentialBackoffRetryPolicy;
    exports.FixedRetryPolicy = FixedRetryPolicy;
    exports.JsonProtocol = JsonProtocol;
    exports.NoRetryPolicy = NoRetryPolicy;
    exports.VERSION = VERSION;

}));
//# sourceMappingURL=signalm.js.map
