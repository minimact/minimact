var Minimact = (function (exports) {
    'use strict';

    /**
     * SignalM Types and Interfaces
     *
     * TypeScript definitions for SignalM connection and protocol
     */
    /**
     * Connection state
     */
    var ConnectionState;
    (function (ConnectionState) {
        ConnectionState["Disconnected"] = "Disconnected";
        ConnectionState["Connecting"] = "Connecting";
        ConnectionState["Connected"] = "Connected";
        ConnectionState["Reconnecting"] = "Reconnecting";
    })(ConnectionState || (ConnectionState = {}));
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
            this.state = ConnectionState.Disconnected;
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
        async start() {
            if (this.state !== ConnectionState.Disconnected) {
                throw new Error('Connection is already started');
            }
            this.state = ConnectionState.Connecting;
            this.log('Starting connection...');
            return this.connect();
        }
        /**
         * Stop the connection
         */
        async stop() {
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
            this.state = ConnectionState.Disconnected;
            this.eventEmitter.emit('disconnected');
        }
        /**
         * Invoke a server method and wait for result
         */
        async invoke(methodName, ...args) {
            if (this.state !== ConnectionState.Connected) {
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
        }
        /**
         * Send a message without expecting a response (fire-and-forget)
         */
        send(methodName, ...args) {
            if (this.state !== ConnectionState.Connected) {
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
        async connect() {
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
                    if (this.state === ConnectionState.Connecting) {
                        this.log('Connection timeout');
                        this.ws?.close();
                        reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`));
                    }
                }, this.connectionTimeout);
                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.state = ConnectionState.Connected;
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
        }
        /**
         * Internal: Handle incoming messages
         */
        handleMessage(data) {
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
                    this.ws?.close(1000, 'Server closed connection');
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
            const pongMessage = JsonProtocol.writePing(); // Pong uses same message type
            const serialized = JsonProtocol.serializeMessage(pongMessage);
            this.log('Received ping, sending pong');
            this.ws?.send(serialized);
        }
        /**
         * Internal: Handle connection close
         */
        handleClose(event) {
            this.log(`Connection closed (code: ${event.code}, reason: ${event.reason})`);
            this.state = ConnectionState.Disconnected;
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
        async attemptReconnect() {
            const delay = this.reconnectPolicy.nextRetryDelay(this.reconnectAttempts);
            if (delay === null) {
                // Max retries exceeded
                this.log('Max reconnection attempts exceeded');
                this.eventEmitter.emit('disconnected');
                return;
            }
            this.reconnectAttempts++;
            this.state = ConnectionState.Reconnecting;
            this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
            this.eventEmitter.emit('reconnecting');
            this.reconnectTimeoutId = setTimeout(async () => {
                this.reconnectTimeoutId = null;
                try {
                    await this.connect();
                    this.log('Reconnected ✓');
                    this.eventEmitter.emit('reconnected');
                }
                catch (error) {
                    this.log('Reconnection failed', error);
                    this.attemptReconnect();
                }
            }, delay);
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
     * Manages SignalM connection to the Minimact server hub
     *
     * Drop-in replacement for SignalRManager using lightweight SignalM
     * Bundle size: ~3 KB gzipped (vs 18 KB with SignalR)
     */
    class SignalMManager {
        constructor(hubUrl = '/minimact', options = {}) {
            this.debugLogging = options.debugLogging || false;
            this.eventHandlers = new Map();
            // SignalM uses built-in exponential backoff, reconnectInterval is ignored
            this.connection = new SignalMConnection(hubUrl, {
                debug: this.debugLogging
            });
            this.setupEventHandlers();
        }
        /**
         * Setup SignalM event handlers
         */
        setupEventHandlers() {
            // Handle component updates from server
            this.connection.on('UpdateComponent', (componentId, html) => {
                this.log('UpdateComponent', { componentId, html });
                this.emit('updateComponent', { componentId, html });
            });
            // Handle patch updates from server
            this.connection.on('ApplyPatches', (componentId, patches) => {
                this.log('ApplyPatches', { componentId, patches });
                this.emit('applyPatches', { componentId, patches });
            });
            // Handle predicted patches (sent immediately for instant feedback)
            this.connection.on('ApplyPrediction', (data) => {
                this.log(`ApplyPrediction (${(data.confidence * 100).toFixed(0)}% confident)`, { componentId: data.componentId, patches: data.patches });
                this.emit('applyPrediction', { componentId: data.componentId, patches: data.patches, confidence: data.confidence });
            });
            // Handle correction if prediction was wrong
            this.connection.on('ApplyCorrection', (data) => {
                this.log('ApplyCorrection (prediction was incorrect)', { componentId: data.componentId, patches: data.patches });
                this.emit('applyCorrection', { componentId: data.componentId, patches: data.patches });
            });
            // Handle hint queueing (usePredictHint)
            this.connection.on('QueueHint', (data) => {
                this.log(`QueueHint '${data.hintId}' (${(data.confidence * 100).toFixed(0)}% confident)`, {
                    componentId: data.componentId,
                    patches: data.patches
                });
                this.emit('queueHint', data);
            });
            // Handle errors from server
            this.connection.on('Error', (message) => {
                console.error('[Minimact] Server error:', message);
                this.emit('error', { message });
            });
            // Handle reconnection
            this.connection.onReconnecting(() => {
                this.log('Reconnecting...');
                this.emit('reconnecting', {});
            });
            this.connection.onReconnected(() => {
                this.log('Reconnected');
                this.emit('reconnected', { connectionId: null }); // SignalM doesn't expose connectionId
            });
            this.connection.onDisconnected(() => {
                this.log('Connection closed');
                this.emit('closed', {});
            });
            this.connection.onConnected(() => {
                this.log('Connected to Minimact hub');
                this.emit('connected', { connectionId: null }); // SignalM doesn't expose connectionId
            });
        }
        /**
         * Start the SignalM connection
         */
        async start() {
            try {
                await this.connection.start();
                // Connected event already emitted by onConnected handler
            }
            catch (error) {
                console.error('[Minimact] Failed to connect:', error);
                throw error;
            }
        }
        /**
         * Stop the SignalM connection
         */
        async stop() {
            await this.connection.stop();
            this.log('Disconnected from Minimact hub');
        }
        /**
         * Register a component with the server
         */
        async registerComponent(componentId) {
            try {
                await this.connection.invoke('RegisterComponent', componentId);
                this.log('Registered component', { componentId });
            }
            catch (error) {
                console.error('[Minimact] Failed to register component:', error);
                throw error;
            }
        }
        /**
         * Invoke a component method on the server
         */
        async invokeComponentMethod(componentId, methodName, args = {}) {
            try {
                const argsJson = JSON.stringify(args);
                await this.connection.invoke('InvokeComponentMethod', componentId, methodName, argsJson);
                this.log('Invoked method', { componentId, methodName, args });
            }
            catch (error) {
                console.error('[Minimact] Failed to invoke method:', error);
                throw error;
            }
        }
        /**
         * Update client state on the server (single key-value)
         */
        async updateClientState(componentId, key, value) {
            try {
                const valueJson = JSON.stringify(value);
                await this.connection.invoke('UpdateClientState', componentId, key, valueJson);
                this.log('Updated client state', { componentId, key, value });
            }
            catch (error) {
                console.error('[Minimact] Failed to update client state:', error);
            }
        }
        /**
         * Update multiple client-computed state values on the server
         * Used for external library computations (lodash, moment, etc.)
         */
        async updateClientComputedState(componentId, computedValues) {
            try {
                await this.connection.invoke('UpdateClientComputedState', componentId, computedValues);
                this.log('Updated client-computed state', { componentId, computedValues });
            }
            catch (error) {
                console.error('[Minimact] Failed to update client-computed state:', error);
                throw error;
            }
        }
        /**
         * Update component state on the server (from useState hook)
         * This keeps server state in sync with client state changes
         */
        async updateComponentState(componentId, stateKey, value) {
            try {
                await this.connection.invoke('UpdateComponentState', componentId, stateKey, value);
                this.log('Updated component state', { componentId, stateKey, value });
            }
            catch (error) {
                console.error('[Minimact] Failed to update component state:', error);
                throw error;
            }
        }
        /**
         * Update DOM element state on the server (from useDomElementState hook)
         * This keeps server aware of DOM changes for accurate rendering
         */
        async updateDomElementState(componentId, stateKey, snapshot) {
            try {
                await this.connection.invoke('UpdateDomElementState', componentId, stateKey, snapshot);
                this.log('Updated DOM element state', { componentId, stateKey, snapshot });
            }
            catch (error) {
                console.error('[Minimact] Failed to update DOM element state:', error);
                throw error;
            }
        }
        /**
         * Update component state with array operation metadata
         * This provides semantic intent for array mutations, enabling precise template extraction
         */
        async updateComponentStateWithOperation(componentId, stateKey, newValue, operation) {
            try {
                await this.connection.invoke('UpdateComponentStateWithOperation', componentId, stateKey, newValue, operation);
                this.log('Updated component state with operation', { componentId, stateKey, operation, newValue });
            }
            catch (error) {
                console.error('[Minimact] Failed to update component state with operation:', error);
                throw error;
            }
        }
        /**
         * Update query results on the server (from useDomQuery hook)
         * This keeps server aware of query results for accurate rendering
         */
        async updateQueryResults(componentId, queryKey, results) {
            try {
                await this.connection.invoke('UpdateQueryResults', componentId, queryKey, results);
                this.log('Updated query results', { componentId, queryKey, resultCount: results.length });
            }
            catch (error) {
                console.error('[Minimact] Failed to update query results:', error);
                throw error;
            }
        }
        /**
         * Generic invoke method for calling server hub methods
         */
        async invoke(methodName, ...args) {
            try {
                await this.connection.invoke(methodName, ...args);
                this.log(`Invoked ${methodName}`, { args });
            }
            catch (error) {
                console.error(`[Minimact] Failed to invoke ${methodName}:`, error);
                throw error;
            }
        }
        /**
         * Subscribe to events
         */
        on(event, handler) {
            if (!this.eventHandlers.has(event)) {
                this.eventHandlers.set(event, new Set());
            }
            this.eventHandlers.get(event).add(handler);
        }
        /**
         * Unsubscribe from events
         */
        off(event, handler) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                handlers.delete(handler);
            }
        }
        /**
         * Emit event to subscribers
         */
        emit(event, data) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact SignalM] ${message}`, data || '');
            }
        }
        /**
         * Get connection state
         * Maps SignalM ConnectionState to SignalR HubConnectionState for compatibility
         */
        get state() {
            return this.connection.connectionState;
        }
        /**
         * Get connection ID
         * SignalM doesn't expose connection IDs (always returns null)
         */
        get connectionId() {
            return null;
        }
    }

    /**
     * Applies DOM patches from the server to the actual DOM
     * Handles surgical updates for minimal DOM manipulation
     */
    class DOMPatcher {
        constructor(options = {}) {
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Apply an array of patches to a root element
         */
        applyPatches(rootElement, patches) {
            this.log('Applying patches', { count: patches.length, patches });
            for (const patch of patches) {
                try {
                    this.applyPatch(rootElement, patch);
                }
                catch (error) {
                    console.error('[Minimact] Failed to apply patch:', patch, error);
                }
            }
        }
        /**
         * Apply a single patch to the DOM
         */
        applyPatch(rootElement, patch) {
            const targetElement = this.getElementByPath(rootElement, patch.path);
            if (!targetElement && patch.type !== 'Create') {
                console.warn('[Minimact] Target element not found for patch:', patch);
                return;
            }
            switch (patch.type) {
                case 'Create':
                    this.patchCreate(rootElement, patch.path, patch.node);
                    break;
                case 'Remove':
                    this.patchRemove(targetElement);
                    break;
                case 'Replace':
                    this.patchReplace(targetElement, patch.node);
                    break;
                case 'UpdateText':
                    this.patchUpdateText(targetElement, patch.content);
                    break;
                case 'UpdateProps':
                    this.patchUpdateProps(targetElement, patch.props);
                    break;
                case 'ReorderChildren':
                    this.patchReorderChildren(targetElement, patch.order);
                    break;
            }
        }
        /**
         * Create and insert a new node
         */
        patchCreate(rootElement, path, node) {
            const newElement = this.createElementFromVNode(node);
            if (path.length === 0) {
                // Replace root
                rootElement.innerHTML = '';
                rootElement.appendChild(newElement);
            }
            else {
                // Insert at path
                const parentPath = path.slice(0, -1);
                const index = path[path.length - 1];
                const parent = this.getElementByPath(rootElement, parentPath);
                if (parent) {
                    if (index >= parent.childNodes.length) {
                        parent.appendChild(newElement);
                    }
                    else {
                        parent.insertBefore(newElement, parent.childNodes[index]);
                    }
                }
            }
            this.log('Created node', { path, node });
        }
        /**
         * Remove a node from the DOM
         */
        patchRemove(element) {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                this.log('Removed node', { element });
            }
        }
        /**
         * Replace a node with a new one
         */
        patchReplace(oldElement, newNode) {
            const newElement = this.createElementFromVNode(newNode);
            if (oldElement.parentNode) {
                oldElement.parentNode.replaceChild(newElement, oldElement);
                this.log('Replaced node', { oldElement, newNode });
            }
        }
        /**
         * Update text content of a text node
         */
        patchUpdateText(element, content) {
            if (element.nodeType === Node.TEXT_NODE) {
                element.textContent = content;
            }
            else {
                // If it's an element, update its text content
                element.textContent = content;
            }
            this.log('Updated text', { element, content });
        }
        /**
         * Update element properties/attributes
         */
        patchUpdateProps(element, props) {
            // Remove old attributes not in new props
            const oldAttrs = Array.from(element.attributes);
            for (const attr of oldAttrs) {
                if (!(attr.name in props) && !attr.name.startsWith('data-minimact-')) {
                    element.removeAttribute(attr.name);
                }
            }
            // Set new attributes
            for (const [key, value] of Object.entries(props)) {
                if (key === 'style') {
                    element.setAttribute('style', value);
                }
                else if (key === 'class' || key === 'className') {
                    element.className = value;
                }
                else if (key.startsWith('on')) {
                    // Event handlers are managed separately
                    continue;
                }
                else {
                    element.setAttribute(key, value);
                }
            }
            this.log('Updated props', { element, props });
        }
        /**
         * Reorder children based on keys
         */
        patchReorderChildren(element, order) {
            const keyedChildren = new Map();
            // Build map of keyed children
            for (const child of Array.from(element.childNodes)) {
                if (child instanceof HTMLElement) {
                    const key = child.getAttribute('data-key') || child.getAttribute('key');
                    if (key) {
                        keyedChildren.set(key, child);
                    }
                }
            }
            // Reorder based on order array
            for (let i = 0; i < order.length; i++) {
                const key = order[i];
                const child = keyedChildren.get(key);
                if (child) {
                    const currentChild = element.childNodes[i];
                    if (currentChild !== child) {
                        element.insertBefore(child, currentChild);
                    }
                }
            }
            this.log('Reordered children', { element, order });
        }
        /**
         * Get a DOM element by its path (array of indices)
         */
        getElementByPath(rootElement, path) {
            let current = rootElement;
            for (const index of path) {
                if (index >= current.childNodes.length) {
                    return null;
                }
                current = current.childNodes[index];
            }
            return current;
        }
        /**
         * Create a DOM element from a VNode
         */
        createElementFromVNode(vnode) {
            switch (vnode.type) {
                case 'Text':
                    return document.createTextNode(vnode.content);
                case 'Element': {
                    const velem = vnode;
                    const element = document.createElement(velem.tag);
                    // Set attributes
                    for (const [key, value] of Object.entries(velem.props || {})) {
                        if (key === 'className' || key === 'class') {
                            element.className = value;
                        }
                        else if (key.startsWith('on')) {
                            // Event handlers will be attached by event delegation
                            element.setAttribute(`data-${key.toLowerCase()}`, value);
                        }
                        else {
                            element.setAttribute(key, value);
                        }
                    }
                    // Set key if present
                    if (velem.key) {
                        element.setAttribute('data-key', velem.key);
                    }
                    // Create children
                    for (const child of velem.children || []) {
                        element.appendChild(this.createElementFromVNode(child));
                    }
                    return element;
                }
                case 'Fragment': {
                    const fragment = document.createDocumentFragment();
                    const vfrag = vnode;
                    for (const child of vfrag.children || []) {
                        fragment.appendChild(this.createElementFromVNode(child));
                    }
                    return fragment;
                }
                case 'RawHtml': {
                    const div = document.createElement('div');
                    div.innerHTML = vnode.html;
                    return div;
                }
                default:
                    console.warn('[Minimact] Unknown VNode type:', vnode);
                    return document.createTextNode('');
            }
        }
        /**
         * Replace entire HTML (fallback when patches aren't available)
         */
        replaceHTML(rootElement, html) {
            rootElement.innerHTML = html;
            this.log('Replaced entire HTML', { html });
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact DOMPatcher] ${message}`, data || '');
            }
        }
    }

    /**
     * Manages client-side state (useClientState) with reactive updates
     * Handles local state that doesn't require server round-trips
     */
    class ClientStateManager {
        constructor(options = {}) {
            this.states = new Map();
            this.subscribers = new Map();
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Initialize client state for a component
         */
        initializeComponent(componentId, initialState = {}) {
            this.states.set(componentId, { ...initialState });
            this.subscribers.set(componentId, new Map());
            this.log('Initialized component state', { componentId, initialState });
        }
        /**
         * Get client state value
         */
        getState(componentId, key) {
            const componentState = this.states.get(componentId);
            return componentState ? componentState[key] : undefined;
        }
        /**
         * Set client state value and trigger updates
         */
        setState(componentId, key, value) {
            const componentState = this.states.get(componentId);
            if (!componentState) {
                console.warn(`[Minimact] Component ${componentId} not initialized`);
                return;
            }
            // Update state
            const oldValue = componentState[key];
            componentState[key] = value;
            this.log('State updated', { componentId, key, oldValue, newValue: value });
            // Notify subscribers
            this.notifySubscribers(componentId, key, value, oldValue);
        }
        /**
         * Subscribe to state changes
         */
        subscribe(componentId, key, callback) {
            const componentSubscribers = this.subscribers.get(componentId);
            if (!componentSubscribers) {
                console.warn(`[Minimact] Component ${componentId} not initialized`);
                return () => { };
            }
            if (!componentSubscribers.has(key)) {
                componentSubscribers.set(key, new Set());
            }
            componentSubscribers.get(key).add(callback);
            this.log('Subscribed to state', { componentId, key });
            // Return unsubscribe function
            return () => {
                componentSubscribers.get(key)?.delete(callback);
                this.log('Unsubscribed from state', { componentId, key });
            };
        }
        /**
         * Notify all subscribers of a state change
         */
        notifySubscribers(componentId, key, value, oldValue) {
            const componentSubscribers = this.subscribers.get(componentId);
            if (!componentSubscribers) {
                return;
            }
            const keySubscribers = componentSubscribers.get(key);
            if (keySubscribers) {
                keySubscribers.forEach(callback => {
                    try {
                        callback(value, oldValue);
                    }
                    catch (error) {
                        console.error('[Minimact] Error in state subscriber:', error);
                    }
                });
            }
        }
        /**
         * Get all state for a component
         */
        getComponentState(componentId) {
            return this.states.get(componentId);
        }
        /**
         * Update multiple state values at once
         */
        updateState(componentId, updates) {
            for (const [key, value] of Object.entries(updates)) {
                this.setState(componentId, key, value);
            }
        }
        /**
         * Clear state for a component
         */
        clearComponent(componentId) {
            this.states.delete(componentId);
            this.subscribers.delete(componentId);
            this.log('Cleared component state', { componentId });
        }
        /**
         * Bind state to a DOM element's value/content
         */
        bindToElement(componentId, key, element, property = 'textContent') {
            // Set initial value
            const initialValue = this.getState(componentId, key);
            if (initialValue !== undefined) {
                this.updateElement(element, property, initialValue);
            }
            // Subscribe to changes
            return this.subscribe(componentId, key, (value) => {
                this.updateElement(element, property, value);
            });
        }
        /**
         * Update a DOM element based on property type
         */
        updateElement(element, property, value) {
            switch (property) {
                case 'value':
                    if (element instanceof HTMLInputElement ||
                        element instanceof HTMLTextAreaElement ||
                        element instanceof HTMLSelectElement) {
                        element.value = String(value);
                    }
                    break;
                case 'textContent':
                    element.textContent = String(value);
                    break;
                case 'innerHTML':
                    element.innerHTML = String(value);
                    break;
            }
        }
        /**
         * Bind input element to state (two-way binding)
         */
        bindInput(componentId, key, input) {
            // Set initial value
            const initialValue = this.getState(componentId, key);
            if (initialValue !== undefined) {
                input.value = String(initialValue);
            }
            // Listen to input changes
            const inputHandler = (e) => {
                const target = e.target;
                this.setState(componentId, key, target.value);
            };
            input.addEventListener('input', inputHandler);
            // Subscribe to state changes from other sources
            const unsubscribe = this.subscribe(componentId, key, (value) => {
                if (input.value !== String(value)) {
                    input.value = String(value);
                }
            });
            // Return cleanup function
            return () => {
                input.removeEventListener('input', inputHandler);
                unsubscribe();
            };
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact ClientState] ${message}`, data || '');
            }
        }
    }

    /**
     * Event delegation system for handling component events
     * Uses a single root listener for performance
     */
    class EventDelegation {
        constructor(rootElement, componentMethodInvoker, options = {}) {
            this.rootElement = rootElement;
            this.componentMethodInvoker = componentMethodInvoker;
            this.debugLogging = options.debugLogging || false;
            this.hintQueue = options.hintQueue;
            this.domPatcher = options.domPatcher;
            this.playgroundBridge = options.playgroundBridge;
            this.eventListeners = new Map();
            this.setupEventDelegation();
        }
        /**
         * Setup event delegation for common events
         */
        setupEventDelegation() {
            const eventTypes = [
                'click',
                'dblclick',
                'input',
                'change',
                'submit',
                'focus',
                'blur',
                'keydown',
                'keyup',
                'keypress',
                'mouseenter',
                'mouseleave',
                'mouseover',
                'mouseout'
            ];
            for (const eventType of eventTypes) {
                const listener = this.createEventListener(eventType);
                this.eventListeners.set(eventType, listener);
                this.rootElement.addEventListener(eventType, listener, true); // Use capture phase
            }
            this.log('Event delegation setup complete', { eventTypes });
        }
        /**
         * Create an event listener for a specific event type
         */
        createEventListener(eventType) {
            return async (event) => {
                const target = event.target;
                // Find the nearest element with an event handler
                const handlerElement = this.findHandlerElement(target, eventType);
                if (!handlerElement) {
                    return;
                }
                // Get handler information
                const handler = this.getEventHandler(handlerElement, eventType);
                if (!handler) {
                    return;
                }
                // Prevent default for submit events
                if (eventType === 'submit') {
                    event.preventDefault();
                }
                this.log('Event triggered', { eventType, handler, target });
                // Execute handler
                await this.executeHandler(handler, event, handlerElement);
            };
        }
        /**
         * Find the nearest element with an event handler attribute
         */
        findHandlerElement(element, eventType) {
            let current = element;
            while (current && current !== this.rootElement) {
                const attrName = `data-on${eventType}`;
                const legacyAttrName = `on${eventType}`;
                if (current.hasAttribute(attrName) || current.hasAttribute(legacyAttrName)) {
                    return current;
                }
                current = current.parentElement;
            }
            return null;
        }
        /**
         * Get event handler information from element
         */
        getEventHandler(element, eventType) {
            const attrName = `data-on${eventType}`;
            const legacyAttrName = `on${eventType}`;
            const handlerStr = element.getAttribute(attrName) || element.getAttribute(legacyAttrName);
            if (!handlerStr) {
                return null;
            }
            // Parse handler string
            // Format: "MethodName" or "MethodName:arg1:arg2"
            const parts = handlerStr.split(':');
            const methodName = parts[0];
            const args = parts.slice(1);
            // Find component ID
            const componentId = this.findComponentId(element);
            if (!componentId) {
                console.warn('[Minimact] No component ID found for event handler:', handlerStr);
                return null;
            }
            return {
                componentId,
                methodName,
                args
            };
        }
        /**
         * Find the component ID for an element
         */
        findComponentId(element) {
            let current = element;
            while (current && current !== this.rootElement) {
                const componentId = current.getAttribute('data-minimact-component-id');
                if (componentId) {
                    return componentId;
                }
                current = current.parentElement;
            }
            // Check root element
            const rootComponentId = this.rootElement.getAttribute('data-minimact-component-id');
            return rootComponentId;
        }
        /**
         * Execute an event handler
         */
        async executeHandler(handler, event, element) {
            const startTime = performance.now();
            try {
                // Build args object
                const argsObj = {};
                // Add parsed args from handler string
                if (handler.args.length > 0) {
                    argsObj.args = handler.args;
                }
                // Add event data
                if (event instanceof MouseEvent) {
                    argsObj.mouse = {
                        clientX: event.clientX,
                        clientY: event.clientY,
                        button: event.button
                    };
                }
                if (event instanceof KeyboardEvent) {
                    argsObj.keyboard = {
                        key: event.key,
                        code: event.code,
                        ctrlKey: event.ctrlKey,
                        shiftKey: event.shiftKey,
                        altKey: event.altKey
                    };
                }
                // Add target value for input events
                if (event.type === 'input' || event.type === 'change') {
                    const target = event.target;
                    argsObj.value = target.value;
                }
                // Check hint queue for cached prediction (CACHE HIT!)
                if (this.hintQueue && this.domPatcher) {
                    // Try to match hint based on the method being called
                    // This is a simplified version - in reality we'd need to know the state change
                    const matchedHint = this.tryMatchHint(handler.componentId, handler.methodName);
                    if (matchedHint) {
                        // 🟢 CACHE HIT! Apply patches instantly
                        const componentElement = this.findComponentElement(handler.componentId);
                        if (componentElement) {
                            this.domPatcher.applyPatches(componentElement, matchedHint.patches);
                            const latency = performance.now() - startTime;
                            // Notify playground of cache hit
                            if (this.playgroundBridge) {
                                this.playgroundBridge.cacheHit({
                                    componentId: handler.componentId,
                                    hintId: matchedHint.hintId,
                                    latency,
                                    confidence: matchedHint.confidence,
                                    patchCount: matchedHint.patches.length
                                });
                            }
                            this.log(`🟢 CACHE HIT! Applied ${matchedHint.patches.length} patches in ${latency.toFixed(2)}ms`, {
                                handler,
                                confidence: (matchedHint.confidence * 100).toFixed(0) + '%'
                            });
                            // Still notify server in background for verification
                            this.componentMethodInvoker(handler.componentId, handler.methodName, argsObj).catch(err => {
                                console.error('[Minimact] Background server notification failed:', err);
                            });
                            return;
                        }
                    }
                }
                // 🔴 CACHE MISS - No prediction found, send to server
                await this.componentMethodInvoker(handler.componentId, handler.methodName, argsObj);
                const latency = performance.now() - startTime;
                // Notify playground of cache miss
                if (this.playgroundBridge) {
                    this.playgroundBridge.cacheMiss({
                        componentId: handler.componentId,
                        methodName: handler.methodName,
                        latency,
                        patchCount: 0 // We don't know patch count in this flow
                    });
                }
                this.log(`🔴 CACHE MISS - Server latency: ${latency.toFixed(2)}ms`, { handler, argsObj });
            }
            catch (error) {
                console.error('[Minimact] Error executing handler:', handler, error);
            }
        }
        /**
         * Try to match a hint in the queue for this method invocation
         * Simplified version - checks if there's a hint matching the method name
         */
        tryMatchHint(componentId, methodName) {
            if (!this.hintQueue)
                return null;
            // In a real implementation, we'd need to build the predicted state change
            // For now, we'll use a simplified heuristic based on method name
            // The server sends hints with IDs like "count_1" for count going to 1
            // Try to match by checking all hints for this component
            // This is a placeholder - the actual matching logic would be more sophisticated
            return null; // TODO: Implement proper hint matching
        }
        /**
         * Find the component element by component ID
         */
        findComponentElement(componentId) {
            const element = this.rootElement.querySelector(`[data-minimact-component-id="${componentId}"]`);
            return element;
        }
        /**
         * Cleanup event listeners
         */
        destroy() {
            for (const [eventType, listener] of this.eventListeners.entries()) {
                this.rootElement.removeEventListener(eventType, listener, true);
            }
            this.eventListeners.clear();
            this.log('Event delegation destroyed');
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact EventDelegation] ${message}`, data || '');
            }
        }
    }

    /**
     * Handles hydration of server-rendered HTML with client interactivity
     * Identifies and manages client zones, server zones, and hybrid zones
     */
    class HydrationManager {
        constructor(clientState, options = {}) {
            this.clientState = clientState;
            this.components = new Map();
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Hydrate a component root element
         */
        hydrateComponent(componentId, rootElement) {
            this.log('Hydrating component', { componentId });
            // The actual component element is the first child of the container
            // (rootElement is #minimact-root, first child is the actual component div)
            const componentElement = rootElement.firstElementChild;
            if (!componentElement) {
                console.error('[Minimact Hydration] No component element found in root');
                return;
            }
            // Create component metadata
            const metadata = {
                componentId,
                element: componentElement, // Use the actual component element, not the container
                clientState: {},
                serverState: {}
            };
            this.components.set(componentId, metadata);
            // Set component ID on root element
            rootElement.setAttribute('data-minimact-component-id', componentId);
            // Initialize client state
            this.clientState.initializeComponent(componentId);
            // Find and hydrate client zones
            this.hydrateClientZones(componentId, rootElement);
            // Find and bind state to elements
            this.bindStateElements(componentId, rootElement);
            this.log('Component hydrated', { componentId, metadata });
        }
        /**
         * Hydrate client-only zones (data-minimact-client-scope)
         */
        hydrateClientZones(componentId, rootElement) {
            const clientZones = rootElement.querySelectorAll('[data-minimact-client-scope]');
            this.log('Found client zones', { count: clientZones.length });
            clientZones.forEach((zone) => {
                const element = zone;
                // Get state name if specified
                const stateName = element.getAttribute('data-state');
                if (stateName) {
                    // Initialize state from element
                    const initialValue = this.getInitialValue(element);
                    this.clientState.setState(componentId, stateName, initialValue);
                    // Bind element to state
                    if (element instanceof HTMLInputElement ||
                        element instanceof HTMLTextAreaElement ||
                        element instanceof HTMLSelectElement) {
                        this.clientState.bindInput(componentId, stateName, element);
                    }
                    this.log('Hydrated client zone', { element, stateName, initialValue });
                }
            });
        }
        /**
         * Bind elements with data-bind attribute to state
         */
        bindStateElements(componentId, rootElement) {
            const boundElements = rootElement.querySelectorAll('[data-bind]');
            this.log('Found bound elements', { count: boundElements.length });
            boundElements.forEach((elem) => {
                const element = elem;
                const bindKey = element.getAttribute('data-bind');
                if (!bindKey) {
                    return;
                }
                // Determine binding type
                const isClientScope = this.isInClientScope(element);
                const bindProperty = this.determineBindProperty(element);
                if (isClientScope) {
                    // Client-side binding
                    this.clientState.bindToElement(componentId, bindKey, element, bindProperty);
                    this.log('Bound to client state', { element, bindKey, bindProperty });
                }
                else {
                    // Server-side binding - will be updated via patches
                    this.log('Server-bound element (patch-controlled)', { element, bindKey });
                }
            });
        }
        /**
         * Check if an element is within a client scope
         */
        isInClientScope(element) {
            let current = element;
            while (current) {
                if (current.hasAttribute('data-minimact-client-scope')) {
                    return true;
                }
                if (current.hasAttribute('data-minimact-server-scope')) {
                    return false;
                }
                current = current.parentElement;
            }
            return false;
        }
        /**
         * Determine which property to bind (value, textContent, innerHTML)
         */
        determineBindProperty(element) {
            if (element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement) {
                return 'value';
            }
            if (element.hasAttribute('data-bind-html')) {
                return 'innerHTML';
            }
            return 'textContent';
        }
        /**
         * Get initial value from an element
         */
        getInitialValue(element) {
            if (element instanceof HTMLInputElement) {
                if (element.type === 'checkbox') {
                    return element.checked;
                }
                else if (element.type === 'number') {
                    return element.valueAsNumber || 0;
                }
                else {
                    return element.value;
                }
            }
            if (element instanceof HTMLTextAreaElement) {
                return element.value;
            }
            if (element instanceof HTMLSelectElement) {
                return element.value;
            }
            return element.textContent || '';
        }
        /**
         * Dehydrate (cleanup) a component
         */
        dehydrateComponent(componentId) {
            const metadata = this.components.get(componentId);
            if (!metadata) {
                return;
            }
            // Clear client state
            this.clientState.clearComponent(componentId);
            // Remove from registry
            this.components.delete(componentId);
            this.log('Component dehydrated', { componentId });
        }
        /**
         * Get component metadata
         */
        getComponent(componentId) {
            return this.components.get(componentId);
        }
        /**
         * Update server state for a component
         */
        updateServerState(componentId, key, value) {
            const metadata = this.components.get(componentId);
            if (metadata) {
                metadata.serverState[key] = value;
                this.log('Updated server state', { componentId, key, value });
            }
        }
        /**
         * Hydrate all components on the page
         */
        hydrateAll() {
            const components = document.querySelectorAll('[data-minimact-component]');
            this.log('Hydrating all components', { count: components.length });
            components.forEach((element) => {
                const componentId = element.getAttribute('data-minimact-component');
                if (componentId) {
                    this.hydrateComponent(componentId, element);
                }
            });
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact Hydration] ${message}`, data || '');
            }
        }
    }

    /**
     * Template Renderer
     *
     * Renders template patches with parameter values for runtime predictions.
     * Enables 98% memory reduction by storing patterns instead of concrete values.
     *
     * Example:
     *   template: "Count: {0}"
     *   params: [42]
     *   result: "Count: 42"
     */
    class TemplateRenderer {
        /**
         * Render a template string with parameters
         *
         * @param template - Template string with {0}, {1}, etc. placeholders
         * @param params - Parameter values to substitute
         * @returns Rendered string with parameters substituted
         *
         * @example
         * renderTemplate("Count: {0}", [42]) → "Count: 42"
         * renderTemplate("Hello, {0} {1}!", ["John", "Doe"]) → "Hello, John Doe!"
         */
        static renderTemplate(template, params) {
            let result = template;
            // Replace each placeholder {0}, {1}, etc. with corresponding parameter
            params.forEach((param, index) => {
                const placeholder = `{${index}}`;
                const value = this.formatValue(param);
                result = result.replace(placeholder, value);
            });
            return result;
        }
        /**
         * Render a template patch with current state values
         *
         * @param templatePatch - Template patch data
         * @param stateValues - Current state values (key-value pairs)
         * @returns Rendered string
         *
         * @example
         * const tp = { template: "Count: {0}", bindings: ["count"], slots: [7] };
         * renderTemplatePatch(tp, { count: 42 }) → "Count: 42"
         *
         * @example Conditional
         * const tp = {
         *   template: "{0}",
         *   bindings: ["isActive"],
         *   conditionalTemplates: { "true": "Active", "false": "Inactive" },
         *   conditionalBindingIndex: 0
         * };
         * renderTemplatePatch(tp, { isActive: true }) → "Active"
         */
        static renderTemplatePatch(templatePatch, stateValues) {
            // Check for conditional templates
            if (templatePatch.conditionalTemplates && templatePatch.conditionalBindingIndex !== undefined) {
                const bindingIndex = templatePatch.conditionalBindingIndex;
                const conditionBinding = templatePatch.bindings[bindingIndex];
                // Get condition value (handle both string and Binding object)
                const conditionKey = typeof conditionBinding === 'object' && 'stateKey' in conditionBinding
                    ? conditionBinding.stateKey
                    : conditionBinding;
                const conditionValue = stateValues[conditionKey];
                // Lookup the template for this condition value
                const conditionalTemplate = templatePatch.conditionalTemplates[String(conditionValue)];
                if (conditionalTemplate !== undefined) {
                    // If it's a simple conditional (just maps to string), return it
                    if (!conditionalTemplate.includes('{')) {
                        return conditionalTemplate;
                    }
                    // Otherwise, it's a conditional template with other bindings
                    // Apply transforms if present
                    const params = templatePatch.bindings.map(binding => {
                        if (typeof binding === 'object' && 'stateKey' in binding) {
                            const value = stateValues[binding.stateKey];
                            return binding.transform ? this.applyTransform(value, binding.transform) : value;
                        }
                        return stateValues[binding];
                    });
                    return this.renderTemplate(conditionalTemplate, params);
                }
            }
            // Standard template rendering
            const params = templatePatch.bindings.map((binding, index) => {
                // Phase 6: Support Binding objects with transforms
                if (typeof binding === 'object' && 'stateKey' in binding) {
                    const value = stateValues[binding.stateKey];
                    // Apply transform if present
                    if (binding.transform) {
                        return this.applyTransform(value, binding.transform);
                    }
                    return value;
                }
                // Backward compatibility: Simple string binding
                return stateValues[binding];
            });
            return this.renderTemplate(templatePatch.template, params);
        }
        /**
         * Convert a template patch to concrete patch(es) with current state
         *
         * @param patch - Template patch (UpdateTextTemplate, UpdatePropsTemplate, or UpdateListTemplate)
         * @param stateValues - Current state values
         * @returns Concrete patch or array of patches
         *
         * @example
         * const patch = {
         *   type: 'UpdateTextTemplate',
         *   path: [0, 0],
         *   templatePatch: { template: "Count: {0}", bindings: ["count"], slots: [7] }
         * };
         * materializePatch(patch, { count: 42 })
         * → { type: 'UpdateText', path: [0, 0], content: "Count: 42" }
         */
        static materializePatch(patch, stateValues) {
            switch (patch.type) {
                case 'UpdateTextTemplate': {
                    const content = this.renderTemplatePatch(patch.templatePatch, stateValues);
                    return {
                        type: 'UpdateText',
                        path: patch.path,
                        content
                    };
                }
                case 'UpdatePropsTemplate': {
                    const value = this.renderTemplatePatch(patch.templatePatch, stateValues);
                    return {
                        type: 'UpdateProps',
                        path: patch.path,
                        props: { [patch.propName]: value }
                    };
                }
                case 'UpdateListTemplate': {
                    // Render loop template to VNodes
                    const vnodes = this.renderLoopTemplate(patch.loopTemplate, stateValues);
                    // Convert to concrete patches
                    return this.convertLoopToPatches(patch.path, vnodes);
                }
                default:
                    // Not a template patch, return as-is
                    return patch;
            }
        }
        /**
         * Materialize multiple template patches
         *
         * @param patches - Array of patches (template or concrete)
         * @param stateValues - Current state values
         * @returns Array of concrete patches
         */
        static materializePatches(patches, stateValues) {
            const materialized = [];
            for (const patch of patches) {
                const result = this.materializePatch(patch, stateValues);
                if (Array.isArray(result)) {
                    // UpdateListTemplate returns multiple patches
                    materialized.push(...result);
                }
                else {
                    materialized.push(result);
                }
            }
            return materialized;
        }
        /**
         * Apply transform to a value (Phase 6: Expression Templates)
         * Security: Only whitelisted transforms are allowed
         *
         * @param value - Raw value from state
         * @param transform - Transform string (e.g., "toFixed(2)", "* 100", "toUpperCase()")
         * @returns Transformed value
         *
         * @example
         * applyTransform(99.95, "toFixed(2)") → "99.95"
         * applyTransform(0.847, "* 100") → 84.7
         * applyTransform("hello", "toUpperCase()") → "HELLO"
         */
        static applyTransform(value, transform) {
            // Security: Whitelist-only approach for safe transforms
            // toFixed(n) - Format number to n decimal places
            if (transform.startsWith('toFixed(')) {
                const decimals = parseInt(transform.match(/\d+/)?.[0] || '0');
                return Number(value).toFixed(decimals);
            }
            // Arithmetic: * N (multiplication)
            if (transform.startsWith('* ')) {
                const multiplier = parseFloat(transform.substring(2));
                return Number(value) * multiplier;
            }
            // Arithmetic: / N (division)
            if (transform.startsWith('/ ')) {
                const divisor = parseFloat(transform.substring(2));
                return Number(value) / divisor;
            }
            // Arithmetic: + N (addition)
            if (transform.startsWith('+ ')) {
                const addend = parseFloat(transform.substring(2));
                return Number(value) + addend;
            }
            // Arithmetic: - N (subtraction)
            if (transform.startsWith('- ')) {
                const subtrahend = parseFloat(transform.substring(2));
                return Number(value) - subtrahend;
            }
            // String: toUpperCase()
            if (transform === 'toUpperCase()' || transform === 'toUpperCase') {
                return String(value).toUpperCase();
            }
            // String: toLowerCase()
            if (transform === 'toLowerCase()' || transform === 'toLowerCase') {
                return String(value).toLowerCase();
            }
            // String: trim()
            if (transform === 'trim()' || transform === 'trim') {
                return String(value).trim();
            }
            // Boolean: ! (negation)
            if (transform === '!') {
                return !value;
            }
            // Default: Unknown transform, log warning and return value as-is
            console.warn(`[TemplateRenderer] Unknown transform: ${transform}`);
            return value;
        }
        /**
         * Format a value for template substitution
         *
         * @param value - Value to format
         * @returns String representation of value
         */
        static formatValue(value) {
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            if (Array.isArray(value)) {
                return value.map(v => this.formatValue(v)).join(', ');
            }
            if (typeof value === 'object') {
                // For objects, use JSON.stringify (could be customized)
                return JSON.stringify(value);
            }
            return String(value);
        }
        /**
         * Check if a patch is a template patch
         *
         * @param patch - Patch to check
         * @returns True if patch is a template patch
         */
        static isTemplatePatch(patch) {
            return patch.type === 'UpdateTextTemplate' || patch.type === 'UpdatePropsTemplate';
        }
        /**
         * Extract bindings from a template patch
         *
         * @param patch - Template patch
         * @returns Array of state variable names, or empty array if not a template patch
         */
        static extractBindings(patch) {
            if (patch.type === 'UpdateTextTemplate' || patch.type === 'UpdatePropsTemplate') {
                // Handle both string bindings and Binding objects
                return patch.templatePatch.bindings.map(binding => {
                    if (typeof binding === 'object' && 'stateKey' in binding) {
                        return binding.stateKey;
                    }
                    return binding;
                });
            }
            return [];
        }
        /**
         * Validate that all required bindings are present in state
         *
         * @param templatePatch - Template patch to validate
         * @param stateValues - Available state values
         * @returns True if all bindings are present
         */
        static validateBindings(templatePatch, stateValues) {
            return templatePatch.bindings.every(binding => {
                const key = typeof binding === 'object' && 'stateKey' in binding
                    ? binding.stateKey
                    : binding;
                return key in stateValues;
            });
        }
        /**
         * Get missing bindings from state
         *
         * @param templatePatch - Template patch to check
         * @param stateValues - Available state values
         * @returns Array of missing binding names
         */
        static getMissingBindings(templatePatch, stateValues) {
            return templatePatch.bindings
                .filter(binding => {
                const key = typeof binding === 'object' && 'stateKey' in binding
                    ? binding.stateKey
                    : binding;
                return !(key in stateValues);
            })
                .map(binding => {
                if (typeof binding === 'object' && 'stateKey' in binding) {
                    return binding.stateKey;
                }
                return binding;
            });
        }
        /**
         * Render loop template with current array state
         *
         * @param loopTemplate - Loop template data
         * @param stateValues - Current state values (must include array binding)
         * @returns Array of rendered VNodes
         *
         * @example
         * const template = {
         *   array_binding: "todos",
         *   item_template: {
         *     type: "Element",
         *     tag: "li",
         *     children_templates: [{
         *       type: "Text",
         *       template_patch: { template: "{0}", bindings: ["item.text"], slots: [0] }
         *     }]
         *   }
         * };
         * renderLoopTemplate(template, { todos: [{ text: "A" }, { text: "B" }] })
         * → [<li>A</li>, <li>B</li>]
         */
        static renderLoopTemplate(loopTemplate, stateValues) {
            const array = stateValues[loopTemplate.array_binding];
            if (!Array.isArray(array)) {
                console.warn(`[TemplateRenderer] Expected array for '${loopTemplate.array_binding}', got:`, array);
                return [];
            }
            return array.map((item, index) => {
                // Build item state with nested object access
                const itemState = {
                    ...stateValues,
                    item,
                    index,
                    ...(loopTemplate.index_var ? { [loopTemplate.index_var]: index } : {})
                };
                // Flatten item object for binding access (item.text → "item.text": value)
                const flattenedState = this.flattenItemState(itemState, item);
                // Render item template
                return this.renderItemTemplate(loopTemplate.item_template, flattenedState);
            });
        }
        /**
         * Flatten item object for template binding access
         *
         * @param itemState - Current state including item
         * @param item - The array item to flatten
         * @returns Flattened state with "item.property" keys
         *
         * @example
         * flattenItemState({ item: { id: 1, text: "A" } }, { id: 1, text: "A" })
         * → { "item.id": 1, "item.text": "A", item: {...}, ... }
         */
        static flattenItemState(itemState, item) {
            const flattened = { ...itemState };
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                // Flatten object properties with "item." prefix
                for (const key in item) {
                    flattened[`item.${key}`] = item[key];
                }
            }
            return flattened;
        }
        /**
         * Render item template to VNode
         *
         * @param itemTemplate - Template for individual list item
         * @param stateValues - State values with flattened item properties
         * @returns Rendered VNode
         */
        static renderItemTemplate(itemTemplate, stateValues) {
            switch (itemTemplate.type) {
                case 'Text': {
                    const content = this.renderTemplatePatch(itemTemplate.template_patch, stateValues);
                    return {
                        type: 'Text',
                        content
                    };
                }
                case 'Element': {
                    // Render props
                    const props = {};
                    if (itemTemplate.props_templates) {
                        for (const [propName, propTemplate] of Object.entries(itemTemplate.props_templates)) {
                            props[propName] = this.renderTemplatePatch(propTemplate, stateValues);
                        }
                    }
                    // Render children
                    const children = (itemTemplate.children_templates || []).map(childTemplate => this.renderItemTemplate(childTemplate, stateValues));
                    // Render key
                    const key = itemTemplate.key_binding
                        ? String(stateValues[itemTemplate.key_binding])
                        : undefined;
                    return {
                        type: 'Element',
                        tag: itemTemplate.tag,
                        props,
                        children,
                        key
                    };
                }
                default:
                    throw new Error(`Unknown item template type: ${itemTemplate.type}`);
            }
        }
        /**
         * Convert rendered loop VNodes to concrete patches
         * Generates Create/Replace patches for list update
         *
         * @param parentPath - Path to parent element containing the list
         * @param vnodes - Rendered VNodes for list items
         * @returns Array of patches to update the list
         */
        static convertLoopToPatches(parentPath, vnodes) {
            // For Phase 4A simplicity: Replace entire list with Create patches
            // TODO Phase 4C: Optimize with incremental diffing
            return vnodes.map((node, index) => ({
                type: 'Create',
                path: [...parentPath, index],
                node
            }));
        }
    }

    /**
     * Manages hint queue for usePredictHint
     * Stores pre-computed patches and applies them when state changes match
     */
    class HintQueue {
        constructor(options = {}) {
            this.hints = new Map();
            this.maxHintAge = 5000; // 5 seconds TTL
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Queue a hint from the server
         */
        queueHint(data) {
            const key = `${data.componentId}:${data.hintId}`;
            // Check if this hint contains template patches
            const isTemplate = data.patches.some(patch => TemplateRenderer.isTemplatePatch(patch));
            this.hints.set(key, {
                ...data,
                queuedAt: Date.now(),
                isTemplate
            });
            const patchType = isTemplate ? '📐 TEMPLATE' : '📄 CONCRETE';
            this.log(`${patchType} hint '${data.hintId}' queued for ${data.componentId}`, data);
            // Auto-expire old hints
            this.cleanupStaleHints();
        }
        /**
         * Check if a state change matches any queued hint
         * Returns patches if match found, null otherwise
         */
        matchHint(componentId, stateChanges) {
            // Find hints for this component
            const componentHints = Array.from(this.hints.entries())
                .filter(([key]) => key.startsWith(`${componentId}:`))
                .map(([, hint]) => hint);
            // Check each hint to see if it matches the state change
            for (const hint of componentHints) {
                if (this.stateMatches(hint.predictedState, stateChanges)) {
                    const patchType = hint.isTemplate ? '📐 TEMPLATE' : '📄 CONCRETE';
                    this.log(`${patchType} hint '${hint.hintId}' matched!`, { hint, stateChanges });
                    // Remove from queue
                    const key = `${componentId}:${hint.hintId}`;
                    this.hints.delete(key);
                    // Materialize template patches with current state values
                    const materializedPatches = TemplateRenderer.materializePatches(hint.patches, stateChanges);
                    return {
                        hintId: hint.hintId,
                        patches: materializedPatches,
                        confidence: hint.confidence
                    };
                }
            }
            return null;
        }
        /**
         * Check if predicted state matches actual state change
         */
        stateMatches(predicted, actual) {
            // Check if all predicted keys match actual values
            for (const [key, predictedValue] of Object.entries(predicted)) {
                if (!(key in actual)) {
                    return false; // Key not in actual change
                }
                // Deep equality check (simplified - could use lodash.isEqual in production)
                if (JSON.stringify(actual[key]) !== JSON.stringify(predictedValue)) {
                    return false; // Value doesn't match
                }
            }
            return true;
        }
        /**
         * Remove hints older than maxHintAge
         */
        cleanupStaleHints() {
            const now = Date.now();
            const staleKeys = [];
            for (const [key, hint] of this.hints.entries()) {
                if (now - hint.queuedAt > this.maxHintAge) {
                    staleKeys.push(key);
                }
            }
            if (staleKeys.length > 0) {
                this.log(`Removing ${staleKeys.length} stale hint(s)`, staleKeys);
                for (const key of staleKeys) {
                    this.hints.delete(key);
                }
            }
        }
        /**
         * Clear all hints for a component
         */
        clearComponent(componentId) {
            const keysToRemove = Array.from(this.hints.keys())
                .filter(key => key.startsWith(`${componentId}:`));
            for (const key of keysToRemove) {
                this.hints.delete(key);
            }
            if (keysToRemove.length > 0) {
                this.log(`Cleared ${keysToRemove.length} hint(s) for component ${componentId}`);
            }
        }
        /**
         * Clear all hints
         */
        clearAll() {
            this.hints.clear();
            this.log('Cleared all hints');
        }
        /**
         * Get stats about queued hints
         */
        getStats() {
            const allHints = Array.from(this.hints.values());
            const templateHints = allHints.filter(h => h.isTemplate);
            const concreteHints = allHints.filter(h => !h.isTemplate);
            return {
                totalHints: this.hints.size,
                templateHints: templateHints.length,
                concreteHints: concreteHints.length,
                templatePercentage: this.hints.size > 0
                    ? Math.round((templateHints.length / this.hints.size) * 100)
                    : 0,
                hintsByComponent: allHints.reduce((acc, hint) => {
                    acc[hint.componentId] = (acc[hint.componentId] || 0) + 1;
                    return acc;
                }, {})
            };
        }
        log(message, ...args) {
            if (this.debugLogging) {
                console.log(`[Minimact HintQueue] ${message}`, ...args);
            }
        }
    }

    /**
     * Bridge for communicating prediction events to playground parent window
     * Emits postMessage events that the React playground can listen to
     */
    class PlaygroundBridge {
        constructor(options = {}) {
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Notify that a prediction was received from server
         */
        predictionReceived(data) {
            this.postMessage({
                type: 'minimact:prediction-received',
                data
            });
            this.log('Prediction received', data);
        }
        /**
         * Notify that a cache hit occurred (instant patch application)
         */
        cacheHit(data) {
            this.postMessage({
                type: 'minimact:cache-hit',
                data: {
                    ...data,
                    cacheHit: true,
                    elapsedMs: data.latency
                }
            });
            this.log('🟢 CACHE HIT', data);
        }
        /**
         * Notify that a cache miss occurred (had to compute on server)
         */
        cacheMiss(data) {
            this.postMessage({
                type: 'minimact:cache-miss',
                data: {
                    ...data,
                    cacheHit: false,
                    elapsedMs: data.latency,
                    predictionConfidence: 0
                }
            });
            this.log('🔴 CACHE MISS', data);
        }
        /**
         * Notify that a correction was applied (prediction was wrong)
         */
        correctionApplied(data) {
            this.postMessage({
                type: 'minimact:correction',
                data
            });
            this.log('Correction applied (prediction was incorrect)', data);
        }
        /**
         * Post message to parent window (for iframe communication)
         */
        postMessage(message) {
            // Check if we're in an iframe
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(message, '*');
            }
            // Also dispatch as custom event for same-window listeners
            window.dispatchEvent(new CustomEvent(message.type, { detail: message.data }));
        }
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact PlaygroundBridge] ${message}`, data || '');
            }
        }
    }

    /**
     * Client-Computed State Manager
     *
     * Manages variables that are computed on the client using external libraries
     * (lodash, moment, etc.) and syncs them to the server for SSR.
     *
     * This enables Option 1 auto-detection: developers use external libraries
     * naturally, and the system automatically handles client-server sync.
     */
    const computedRegistry = {};
    /**
     * Debug logging
     */
    let debugLogging = false;
    function setDebugLogging(enabled) {
        debugLogging = enabled;
    }
    function log(message, data) {
        if (debugLogging) {
            console.log(`[ClientComputed] ${message}`, data || '');
        }
    }
    /**
     * Register a client-computed variable for a component
     *
     * @param componentId - Unique identifier for the component
     * @param varName - Name of the variable being computed
     * @param computeFn - Function that computes the value
     * @param dependencies - Optional list of state keys this variable depends on
     */
    function registerClientComputed(componentId, varName, computeFn, dependencies) {
        if (!computedRegistry[componentId]) {
            computedRegistry[componentId] = {};
        }
        computedRegistry[componentId][varName] = {
            varName,
            computeFn,
            dependencies
        };
        log(`Registered client-computed variable`, { componentId, varName, dependencies });
    }
    /**
     * Compute a single variable's value
     *
     * @param componentId - Component identifier
     * @param varName - Variable name
     * @returns The computed value or undefined if not found
     */
    function computeVariable(componentId, varName) {
        const computed = computedRegistry[componentId]?.[varName];
        if (!computed) {
            console.warn(`[ClientComputed] Variable '${varName}' not registered for component '${componentId}'`);
            return undefined;
        }
        try {
            const value = computed.computeFn();
            computed.lastValue = value;
            log(`Computed variable`, { componentId, varName, value });
            return value;
        }
        catch (error) {
            console.error(`[ClientComputed] Error computing '${varName}':`, error);
            return undefined;
        }
    }
    /**
     * Compute all client-computed variables for a component
     *
     * @param componentId - Component identifier
     * @returns Object with all computed values
     */
    function computeAllForComponent(componentId) {
        const computed = computedRegistry[componentId];
        if (!computed) {
            log(`No computed variables for component`, { componentId });
            return {};
        }
        const result = {};
        for (const [varName, variable] of Object.entries(computed)) {
            try {
                const value = variable.computeFn();
                variable.lastValue = value;
                result[varName] = value;
            }
            catch (error) {
                console.error(`[ClientComputed] Error computing '${varName}':`, error);
                result[varName] = undefined;
            }
        }
        log(`Computed all variables`, { componentId, result });
        return result;
    }
    /**
     * Compute only variables that depend on a specific state key
     *
     * @param componentId - Component identifier
     * @param changedStateKey - State key that changed
     * @returns Object with affected computed values
     */
    function computeDependentVariables(componentId, changedStateKey) {
        const computed = computedRegistry[componentId];
        if (!computed) {
            return {};
        }
        const result = {};
        for (const [varName, variable] of Object.entries(computed)) {
            // If no dependencies specified, assume it depends on everything
            const shouldRecompute = !variable.dependencies ||
                variable.dependencies.includes(changedStateKey);
            if (shouldRecompute) {
                try {
                    const value = variable.computeFn();
                    variable.lastValue = value;
                    result[varName] = value;
                    log(`Recomputed dependent variable`, { componentId, varName, changedStateKey, value });
                }
                catch (error) {
                    console.error(`[ClientComputed] Error recomputing '${varName}':`, error);
                    result[varName] = undefined;
                }
            }
        }
        return result;
    }
    /**
     * Get the last computed value without recomputing
     *
     * @param componentId - Component identifier
     * @param varName - Variable name
     * @returns The last computed value or undefined
     */
    function getLastValue(componentId, varName) {
        return computedRegistry[componentId]?.[varName]?.lastValue;
    }
    /**
     * Get all last computed values without recomputing
     *
     * @param componentId - Component identifier
     * @returns Object with all last computed values
     */
    function getAllLastValues(componentId) {
        const computed = computedRegistry[componentId];
        if (!computed) {
            return {};
        }
        const result = {};
        for (const [varName, variable] of Object.entries(computed)) {
            result[varName] = variable.lastValue;
        }
        return result;
    }
    /**
     * Check if a component has any client-computed variables
     *
     * @param componentId - Component identifier
     * @returns True if component has computed variables
     */
    function hasClientComputed(componentId) {
        return !!computedRegistry[componentId] &&
            Object.keys(computedRegistry[componentId]).length > 0;
    }
    /**
     * Get list of all computed variable names for a component
     *
     * @param componentId - Component identifier
     * @returns Array of variable names
     */
    function getComputedVariableNames(componentId) {
        const computed = computedRegistry[componentId];
        return computed ? Object.keys(computed) : [];
    }
    /**
     * Clear all computed variables for a component
     * Used when component is unmounted
     *
     * @param componentId - Component identifier
     */
    function clearComponent(componentId) {
        delete computedRegistry[componentId];
        log(`Cleared component`, { componentId });
    }
    /**
     * Get debug info about registered computations
     * Useful for dev tools / debugging
     */
    function getDebugInfo() {
        const components = {};
        for (const [componentId, computed] of Object.entries(computedRegistry)) {
            const variables = Object.keys(computed);
            components[componentId] = {
                variableCount: variables.length,
                variables
            };
        }
        return {
            componentCount: Object.keys(computedRegistry).length,
            components
        };
    }

    /**
     * Template State Manager - Client-Side Template Rendering
     *
     * Manages "virtual state" for text nodes using parameterized templates.
     * This enables instant hot reload with 100% coverage and minimal memory.
     *
     * Architecture:
     * - Templates loaded from .templates.json at component init
     * - State changes trigger template re-rendering
     * - Hot reload updates templates without server round-trip
     *
     * Memory: ~2KB per component (vs 100KB with prediction-based approach)
     * Coverage: 100% (works with any value)
     * Latency: <5ms for template updates
     */
    /**
     * Template State Manager
     */
    class TemplateStateManager {
        constructor() {
            this.templates = new Map();
            this.componentStates = new Map();
        }
        /**
         * Initialize templates from .templates.json file
         */
        loadTemplateMap(componentId, templateMap) {
            console.log(`[TemplateState] Loading ${Object.keys(templateMap.templates).length} templates for ${componentId}`);
            for (const [nodePath, template] of Object.entries(templateMap.templates)) {
                const key = `${componentId}:${nodePath}`;
                this.templates.set(key, template);
            }
            // Initialize component state tracking
            if (!this.componentStates.has(componentId)) {
                this.componentStates.set(componentId, new Map());
            }
        }
        /**
         * Register a template for a specific node path
         */
        registerTemplate(componentId, nodePath, template) {
            const key = `${componentId}:${nodePath}`;
            this.templates.set(key, template);
        }
        /**
         * Get template by component ID and node path
         */
        getTemplate(componentId, nodePath) {
            const key = `${componentId}:${nodePath}`;
            return this.templates.get(key);
        }
        /**
         * Get all templates for a component
         */
        getComponentTemplates(componentId) {
            const result = new Map();
            for (const [key, template] of this.templates.entries()) {
                if (key.startsWith(`${componentId}:`)) {
                    const nodePath = key.substring(componentId.length + 1);
                    result.set(nodePath, template);
                }
            }
            return result;
        }
        /**
         * Get templates bound to a specific state variable
         */
        getTemplatesBoundTo(componentId, stateKey) {
            const templates = [];
            for (const [key, template] of this.templates.entries()) {
                if (key.startsWith(`${componentId}:`) && template.bindings.includes(stateKey)) {
                    templates.push(template);
                }
            }
            return templates;
        }
        /**
         * Update component state (from useState)
         */
        updateState(componentId, stateKey, value) {
            let state = this.componentStates.get(componentId);
            if (!state) {
                state = new Map();
                this.componentStates.set(componentId, state);
            }
            state.set(stateKey, value);
        }
        /**
         * Get component state value
         */
        getStateValue(componentId, stateKey) {
            return this.componentStates.get(componentId)?.get(stateKey);
        }
        /**
         * Render template with current state values
         */
        render(componentId, nodePath) {
            const template = this.getTemplate(componentId, nodePath);
            if (!template)
                return null;
            // Get state values for bindings
            const params = template.bindings.map(binding => this.getStateValue(componentId, binding));
            return this.renderWithParams(template.template, params);
        }
        /**
         * Render template with specific parameter values
         */
        renderWithParams(template, params) {
            let result = template;
            // Replace {0}, {1}, etc. with parameter values
            params.forEach((param, index) => {
                const placeholder = `{${index}}`;
                const value = param !== undefined && param !== null ? String(param) : '';
                result = result.replace(placeholder, value);
            });
            return result;
        }
        /**
         * Apply template patch from hot reload
         */
        applyTemplatePatch(patch) {
            const { componentId, path, template, params, bindings, slots, attribute } = patch;
            // Render template with params
            const text = this.renderWithParams(template, params);
            // Build node path key
            const nodePath = this.buildNodePathKey(path);
            const key = `${componentId}:${nodePath}`;
            // Update stored template
            const existingTemplate = this.templates.get(key);
            if (existingTemplate) {
                existingTemplate.template = template;
                existingTemplate.bindings = bindings;
                existingTemplate.slots = slots;
                if (attribute) {
                    existingTemplate.attribute = attribute;
                }
            }
            else {
                // Register new template
                this.templates.set(key, {
                    template,
                    bindings,
                    slots,
                    path,
                    type: attribute ? 'attribute' : 'dynamic',
                    attribute
                });
            }
            console.log(`[TemplateState] Applied template patch: "${template}" → "${text}"`);
            return { text, path };
        }
        /**
         * Build node path key from path array
         * Example: [0, 1, 0] → "0_1_0"
         */
        buildNodePathKey(path) {
            return path.join('_');
        }
        /**
         * Clear all templates for a component
         */
        clearComponent(componentId) {
            const keysToDelete = [];
            for (const key of this.templates.keys()) {
                if (key.startsWith(`${componentId}:`)) {
                    keysToDelete.push(key);
                }
            }
            for (const key of keysToDelete) {
                this.templates.delete(key);
            }
            this.componentStates.delete(componentId);
        }
        /**
         * Clear all templates
         */
        clear() {
            this.templates.clear();
            this.componentStates.clear();
        }
        /**
         * Get statistics
         */
        getStats() {
            const componentCount = this.componentStates.size;
            const templateCount = this.templates.size;
            // Estimate memory usage (rough estimate)
            let memoryBytes = 0;
            for (const template of this.templates.values()) {
                memoryBytes += template.template.length * 2; // UTF-16
                memoryBytes += template.bindings.length * 20; // Rough estimate
                memoryBytes += template.slots.length * 4; // 4 bytes per number
                memoryBytes += template.path.length * 4;
            }
            return {
                componentCount,
                templateCount,
                memoryKB: Math.round(memoryBytes / 1024),
                avgTemplatesPerComponent: templateCount / Math.max(componentCount, 1)
            };
        }
    }
    /**
     * Global template state manager instance
     */
    const templateState = new TemplateStateManager();

    /**
     * Server Task - Client-side representation of a long-running server task
     *
     * Provides reactive state management for async operations that execute on the server.
     * Automatically syncs state changes from server and triggers component re-renders.
     */
    /**
     * Server task implementation
     */
    class ServerTaskImpl {
        constructor(taskId, componentId, signalR, context, options = {}) {
            this.taskId = taskId;
            this.componentId = componentId;
            this.signalR = signalR;
            this.context = context;
            this.status = 'idle';
            this.progress = 0;
            this.chunks = [];
            this.chunkCount = 0;
            this._options = options;
            this.streaming = options.stream || false;
            this._createPromise();
        }
        _createPromise() {
            this._promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });
        }
        get promise() {
            return this._promise;
        }
        get idle() {
            return this.status === 'idle';
        }
        get running() {
            return this.status === 'running';
        }
        get complete() {
            return this.status === 'complete';
        }
        get failed() {
            return this.status === 'error';
        }
        get cancelled() {
            return this.status === 'cancelled';
        }
        /**
         * Start the server task with optional arguments
         */
        start(...args) {
            this.status = 'running';
            this.startedAt = new Date();
            this.completedAt = undefined;
            this.progress = 0;
            this.error = undefined;
            // Clear previous results
            if (this.streaming) {
                this.chunks = [];
                this.chunkCount = 0;
                this.partial = undefined;
            }
            else {
                this.result = undefined;
            }
            // Trigger re-render to show "running" state immediately
            this._triggerRerender();
            // Invoke server task via SignalR
            this.signalR.invoke('StartServerTask', this.componentId, this.taskId, args || [])
                .catch((err) => {
                console.error(`[Minimact] Failed to start task ${this.taskId}:`, err);
                this.status = 'error';
                this.error = err;
                this.completedAt = new Date();
                this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
                this._reject?.(err);
                this._triggerRerender();
            });
        }
        /**
         * Retry a failed or cancelled task
         */
        retry(...args) {
            if (this.status !== 'error' && this.status !== 'cancelled') {
                console.warn('[Minimact] Can only retry failed or cancelled tasks');
                return;
            }
            // Reset promise for new attempt
            this._createPromise();
            this.status = 'running';
            this.startedAt = new Date();
            this.completedAt = undefined;
            this.progress = 0;
            this.error = undefined;
            if (this.streaming) {
                this.chunks = [];
                this.chunkCount = 0;
                this.partial = undefined;
            }
            else {
                this.result = undefined;
            }
            this._triggerRerender();
            this.signalR.invoke('RetryServerTask', this.componentId, this.taskId, args || [])
                .catch((err) => {
                console.error(`[Minimact] Failed to retry task ${this.taskId}:`, err);
                this.status = 'error';
                this.error = err;
                this.completedAt = new Date();
                this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
                this._reject?.(err);
                this._triggerRerender();
            });
        }
        /**
         * Cancel a running task
         */
        cancel() {
            if (this.status !== 'running') {
                console.warn('[Minimact] Can only cancel running tasks');
                return;
            }
            this.signalR.invoke('CancelServerTask', this.componentId, this.taskId)
                .then(() => {
                this.status = 'cancelled';
                this.completedAt = new Date();
                this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
                this._reject?.(new Error('Task cancelled by user'));
                this._triggerRerender();
            })
                .catch((err) => {
                console.error(`[Minimact] Failed to cancel task ${this.taskId}:`, err);
            });
        }
        /**
         * Update task state from server
         * Called by Minimact when server sends task state updates via SignalR
         */
        _updateFromServer(state) {
            const previousStatus = this.status;
            this.status = state.status;
            this.progress = state.progress || 0;
            this.result = state.result;
            if (state.error) {
                this.error = new Error(state.error);
            }
            if (state.startedAt) {
                this.startedAt = new Date(state.startedAt);
            }
            if (state.completedAt) {
                this.completedAt = new Date(state.completedAt);
            }
            if (state.duration) {
                this.duration = state.duration;
            }
            // Resolve/reject promise based on status change
            if (this.status === 'complete' && previousStatus !== 'complete') {
                if (this._resolve) {
                    this._resolve(this.result);
                }
            }
            else if (this.status === 'error' && previousStatus !== 'error') {
                if (this._reject) {
                    this._reject(this.error);
                }
            }
            else if (this.status === 'cancelled' && previousStatus !== 'cancelled') {
                if (this._reject) {
                    this._reject(new Error('Task cancelled'));
                }
            }
            // Trigger re-render when state changes
            if (previousStatus !== this.status || this.progress !== state.progress) {
                this._triggerRerender();
            }
        }
        /**
         * Trigger component re-render
         * Uses hint queue to check for predicted patches
         */
        _triggerRerender() {
            if (!this.context || !this.context.hintQueue) {
                return;
            }
            const stateChanges = {
                [this.taskId]: {
                    status: this.status,
                    progress: this.progress,
                    chunkCount: this.chunkCount
                }
            };
            const hint = this.context.hintQueue.matchHint(this.context.componentId, stateChanges);
            if (hint) {
                // Cache hit! Apply predicted patches
                console.log(`[Minimact] 🟢 Task state change predicted! Applying ${hint.patches.length} patches`);
                this.context.domPatcher.applyPatches(this.context.element, hint.patches);
            }
            else {
                // Cache miss - server will send patches
                console.log(`[Minimact] 🔴 Task state change not predicted`);
            }
        }
    }

    /**
     * Server Reducer - Client-side representation of a reducer that executes on the server
     *
     * Similar to React's useReducer, but the reducer function runs on the server side.
     * This allows complex state transitions with validation, side effects, and database
     * operations to happen server-side while maintaining reactive UI updates.
     */
    /**
     * Server reducer implementation
     */
    class ServerReducerImpl {
        constructor(reducerId, componentId, signalR, context, initialState) {
            this.reducerId = reducerId;
            this.componentId = componentId;
            this.signalR = signalR;
            this.context = context;
            this.dispatching = false;
            this.state = initialState;
        }
        /**
         * Dispatch an action to the server (fire-and-forget)
         */
        dispatch(action) {
            this.dispatching = true;
            this.error = undefined;
            this.lastDispatchedAt = new Date();
            // Extract action type for debugging (if action has a 'type' field)
            if (action && typeof action === 'object' && 'type' in action) {
                this.lastActionType = String(action.type);
            }
            // Trigger re-render to show "dispatching" state immediately
            this._triggerRerender();
            // Invoke server reducer via SignalR
            this.signalR.invoke('DispatchServerReducer', this.componentId, this.reducerId, action)
                .catch((err) => {
                console.error(`[Minimact] Failed to dispatch action to reducer ${this.reducerId}:`, err);
                this.dispatching = false;
                this.error = err;
                this._triggerRerender();
            });
        }
        /**
         * Dispatch an action to the server and wait for the result
         */
        dispatchAsync(action) {
            this.dispatching = true;
            this.error = undefined;
            this.lastDispatchedAt = new Date();
            // Extract action type for debugging
            if (action && typeof action === 'object' && 'type' in action) {
                this.lastActionType = String(action.type);
            }
            // Create promise for this dispatch
            this._pendingPromise = new Promise((resolve, reject) => {
                this._pendingResolve = resolve;
                this._pendingReject = reject;
            });
            // Trigger re-render to show "dispatching" state immediately
            this._triggerRerender();
            // Invoke server reducer via SignalR
            this.signalR.invoke('DispatchServerReducer', this.componentId, this.reducerId, action)
                .catch((err) => {
                console.error(`[Minimact] Failed to dispatch action to reducer ${this.reducerId}:`, err);
                this.dispatching = false;
                this.error = err;
                this._pendingReject?.(err);
                this._triggerRerender();
            });
            return this._pendingPromise;
        }
        /**
         * Update reducer state from server
         * Called by Minimact when server sends reducer state updates via SignalR
         */
        _updateFromServer(newState, error) {
            const previousState = this.state;
            this.state = newState;
            this.dispatching = false;
            if (error) {
                this.error = new Error(error);
                this._pendingReject?.(this.error);
            }
            else {
                this.error = undefined;
                this._pendingResolve?.(newState);
            }
            // Clear pending promise handlers
            this._pendingPromise = undefined;
            this._pendingResolve = undefined;
            this._pendingReject = undefined;
            // Trigger re-render when state changes
            if (previousState !== newState) {
                this._triggerRerender();
            }
        }
        /**
         * Trigger component re-render
         * Uses hint queue to check for predicted patches
         */
        _triggerRerender() {
            if (!this.context || !this.context.hintQueue) {
                return;
            }
            const stateChanges = {
                [this.reducerId]: {
                    state: this.state,
                    dispatching: this.dispatching,
                    error: this.error?.message
                }
            };
            const hint = this.context.hintQueue.matchHint(this.context.componentId, stateChanges);
            if (hint) {
                // Cache hit! Apply predicted patches
                console.log(`[Minimact] 🟢 Reducer state change predicted! Applying ${hint.patches.length} patches`);
                this.context.domPatcher.applyPatches(this.context.element, hint.patches);
            }
            else {
                // Cache miss - server will send patches
                console.log(`[Minimact] 🔴 Reducer state change not predicted`);
            }
        }
    }

    /**
     * useComputed Hook
     *
     * Compute values on the client using browser-only APIs or external libraries,
     * then sync to the server for rendering.
     *
     * This replaces the conceptually flawed "useClientState" with a sound approach:
     * - Client computes values using browser APIs (lodash, moment, geolocation, crypto)
     * - Results are synced to server via UpdateClientComputedState
     * - Server accesses values via GetClientState<T>(key) for rendering
     * - Server still does ALL rendering (dehydrationist architecture)
     */
    let currentContext$2 = null;
    /**
     * Set the current component context for useComputed
     * Called by setComponentContext in hooks.ts
     */
    function setComputedContext(context) {
        currentContext$2 = context;
    }
    /**
     * useComputed Hook
     *
     * @param key - Unique identifier for server-side access via GetClientState<T>(key)
     * @param computeFn - Function that computes the value (runs on client)
     * @param deps - Dependency array (like useEffect)
     * @param options - Configuration options
     * @returns The computed value
     *
     * @example
     * // With lodash
     * const sortedUsers = useComputed('sortedUsers', () => {
     *   return _.sortBy(users, 'name');
     * }, [users]);
     *
     * @example
     * // With geolocation
     * const location = useComputed('location', async () => {
     *   const pos = await new Promise((resolve) => {
     *     navigator.geolocation.getCurrentPosition(resolve);
     *   });
     *   return { lat: pos.coords.latitude, lng: pos.coords.longitude };
     * }, []);
     *
     * @example
     * // With memoization and expiry
     * const result = useComputed('result', () => compute(data), [data], {
     *   memoize: true,
     *   expiry: 5000  // Cache for 5 seconds
     * });
     */
    function useComputed(key, computeFn, deps = [], options = {}) {
        if (!currentContext$2) {
            throw new Error('[Minimact] useComputed must be called within a component render');
        }
        const { memoize = true, // Default to true for performance
        expiry, debounce, throttle, initialValue } = options;
        const context = currentContext$2;
        // Store computed value in state
        const [value, setValue] = useState(initialValue !== undefined ? initialValue : null);
        // Cache for memoization
        const cache = useRef(null);
        // Debounce timer ref
        const debounceTimer = useRef(null);
        useEffect(() => {
            // Check if we should use cached value
            if (memoize && cache.current) {
                // Check if deps changed
                const depsChanged = deps.length !== cache.current.deps.length ||
                    deps.some((dep, i) => !Object.is(dep, cache.current.deps[i]));
                if (!depsChanged) {
                    // Deps haven't changed
                    if (expiry) {
                        // Check if cache expired
                        const age = Date.now() - cache.current.timestamp;
                        if (age < expiry) {
                            // Cache is still valid, use cached value
                            return;
                        }
                        // Cache expired, continue to recompute
                    }
                    else {
                        // No expiry, use cached value indefinitely
                        return;
                    }
                }
                // Deps changed, continue to recompute
            }
            // Compute new value
            let computed;
            try {
                computed = computeFn();
            }
            catch (error) {
                console.error(`[Minimact] Error in useComputed('${key}'):`, error);
                throw error;
            }
            // Handle async computations
            if (computed instanceof Promise) {
                computed.then((resolvedValue) => {
                    // Update cache if memoization enabled
                    if (memoize) {
                        cache.current = {
                            value: resolvedValue,
                            timestamp: Date.now(),
                            deps: [...deps]
                        };
                    }
                    // Update local state
                    setValue(resolvedValue);
                    // Sync to server
                    syncToServer(resolvedValue);
                }).catch((error) => {
                    console.error(`[Minimact] Async error in useComputed('${key}'):`, error);
                });
                return; // Don't sync yet, wait for promise to resolve
            }
            // Update cache if memoization enabled
            if (memoize) {
                cache.current = {
                    value: computed,
                    timestamp: Date.now(),
                    deps: [...deps]
                };
            }
            // Update local state
            setValue(computed);
            // Sync to server
            syncToServer(computed);
        }, deps);
        /**
         * Sync computed value to server via SignalR
         */
        function syncToServer(computedValue) {
            const doSync = () => {
                if (!context.signalR) {
                    console.warn(`[Minimact] SignalR not available, cannot sync useComputed('${key}')`);
                    return;
                }
                context.signalR.updateClientComputedState(context.componentId, { [key]: computedValue })
                    .catch(err => {
                    console.error(`[Minimact] Failed to sync computed state '${key}':`, err);
                });
            };
            // Apply debounce if specified
            if (debounce) {
                if (debounceTimer.current !== null) {
                    clearTimeout(debounceTimer.current);
                }
                debounceTimer.current = window.setTimeout(() => {
                    doSync();
                    debounceTimer.current = null;
                }, debounce);
                return;
            }
            // TODO: Implement throttle
            if (throttle) {
                // For now, just sync immediately
                // Proper throttle implementation would track last sync time
                doSync();
                return;
            }
            // No debounce/throttle, sync immediately
            doSync();
        }
        return value;
    }

    // Global context tracking
    let currentContext$1 = null;
    let stateIndex = 0;
    let effectIndex = 0;
    let refIndex = 0;
    let serverTaskIndex = 0;
    let serverReducerIndex = 0;
    /**
     * Set the current component context (called before render)
     */
    function setComponentContext(context) {
        currentContext$1 = context;
        stateIndex = 0;
        effectIndex = 0;
        refIndex = 0;
        serverTaskIndex = 0;
        serverReducerIndex = 0;
        // Reset computed index for useComputed hook
        setComputedContext(context);
    }
    /**
     * Clear the current component context (called after render)
     */
    function clearComponentContext() {
        currentContext$1 = null;
    }
    /**
     * Find DOM element by path array
     * Example: [0, 1, 0] → first child, second child, first child
     */
    function findElementByPath(root, path) {
        let current = root;
        for (const index of path) {
            if (!current || !current.childNodes)
                return null;
            current = current.childNodes[index] || null;
        }
        return current;
    }
    /**
     * useState hook - manages component state with hint queue integration
     */
    function useState(initialValue) {
        if (!currentContext$1) {
            throw new Error('useState must be called within a component render');
        }
        const context = currentContext$1;
        const index = stateIndex++;
        const stateKey = `state_${index}`;
        // Initialize state if not exists
        if (!context.state.has(stateKey)) {
            context.state.set(stateKey, initialValue);
        }
        const currentValue = context.state.get(stateKey);
        const setState = (newValue) => {
            const startTime = performance.now();
            const actualNewValue = typeof newValue === 'function'
                ? newValue(context.state.get(stateKey))
                : newValue;
            // Build state change object for hint matching
            const stateChanges = {
                [stateKey]: actualNewValue
            };
            // Check hint queue for match
            const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
            if (hint) {
                // 🟢 CACHE HIT! Apply queued patches immediately
                const latency = performance.now() - startTime;
                console.log(`[Minimact] 🟢 CACHE HIT! Hint '${hint.hintId}' matched - applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);
                context.domPatcher.applyPatches(context.element, hint.patches);
                // Notify playground of cache hit
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheHit({
                        componentId: context.componentId,
                        hintId: hint.hintId,
                        latency,
                        confidence: hint.confidence,
                        patchCount: hint.patches.length
                    });
                }
            }
            else {
                // 🔴 CACHE MISS - No prediction found
                const latency = performance.now() - startTime;
                console.log(`[Minimact] 🔴 CACHE MISS - No prediction for state change:`, stateChanges);
                // Notify playground of cache miss
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheMiss({
                        componentId: context.componentId,
                        methodName: `setState(${stateKey})`,
                        latency,
                        patchCount: 0
                    });
                }
            }
            // Update state
            context.state.set(stateKey, actualNewValue);
            // Update template state for template rendering
            templateState.updateState(context.componentId, stateKey, actualNewValue);
            // Re-render templates bound to this state
            const boundTemplates = templateState.getTemplatesBoundTo(context.componentId, stateKey);
            for (const template of boundTemplates) {
                // Build node path from template path array
                const nodePath = template.path.join('_');
                // Render template with new value
                const newText = templateState.render(context.componentId, nodePath);
                if (newText !== null) {
                    // Find DOM element by path and update it
                    const element = findElementByPath(context.element, template.path);
                    if (element) {
                        if (element.nodeType === Node.TEXT_NODE) {
                            element.textContent = newText;
                        }
                        else if (element instanceof HTMLElement) {
                            // For attribute templates
                            if (template.attribute) {
                                element.setAttribute(template.attribute, newText);
                            }
                            else {
                                element.textContent = newText;
                            }
                        }
                        console.log(`[Minimact] 📋 Template updated: "${newText}" (${stateKey} changed)`);
                    }
                }
            }
            // Sync state to server to prevent stale data
            context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
                .catch(err => {
                console.error('[Minimact] Failed to sync state to server:', err);
            });
        };
        // If value is an array, add array helpers
        if (Array.isArray(currentValue)) {
            return [currentValue, createArrayStateSetter(setState, currentValue, stateKey, context)];
        }
        return [currentValue, setState];
    }
    /**
     * useEffect hook - runs side effects after render
     */
    function useEffect(callback, deps) {
        if (!currentContext$1) {
            throw new Error('useEffect must be called within a component render');
        }
        const context = currentContext$1;
        const index = effectIndex++;
        // Get or create effect entry
        if (!context.effects[index]) {
            context.effects[index] = {
                callback,
                deps,
                cleanup: undefined
            };
            // Run effect after render
            queueMicrotask(() => {
                const cleanup = callback();
                if (typeof cleanup === 'function') {
                    context.effects[index].cleanup = cleanup;
                }
            });
        }
        else {
            const effect = context.effects[index];
            // Check if deps changed
            const depsChanged = !deps || !effect.deps ||
                deps.length !== effect.deps.length ||
                deps.some((dep, i) => dep !== effect.deps[i]);
            if (depsChanged) {
                // Run cleanup if exists
                if (effect.cleanup) {
                    effect.cleanup();
                }
                // Update effect
                effect.callback = callback;
                effect.deps = deps;
                // Run new effect
                queueMicrotask(() => {
                    const cleanup = callback();
                    if (typeof cleanup === 'function') {
                        effect.cleanup = cleanup;
                    }
                });
            }
        }
    }
    /**
     * useRef hook - creates a mutable ref object
     */
    function useRef(initialValue) {
        if (!currentContext$1) {
            throw new Error('useRef must be called within a component render');
        }
        const context = currentContext$1;
        const index = refIndex++;
        const refKey = `ref_${index}`;
        // Initialize ref if not exists
        if (!context.refs.has(refKey)) {
            context.refs.set(refKey, { current: initialValue });
        }
        return context.refs.get(refKey);
    }
    /**
     * Create array state setter with semantic helper methods
     */
    function createArrayStateSetter(baseSetState, currentArray, stateKey, context) {
        // Base setter function
        const setter = baseSetState;
        // Append helper
        setter.append = (item) => {
            const newArray = [...currentArray, item];
            // Update local state
            context.state.set(stateKey, newArray);
            // Update template state
            templateState.updateState(context.componentId, stateKey, newArray);
            // Notify server of APPEND operation (not just new array)
            context.signalR.updateComponentStateWithOperation(context.componentId, stateKey, newArray, { type: 'Append', item }).catch(err => {
                console.error('[Minimact] Failed to sync array append to server:', err);
            });
            // TODO: Try to predict patch using loop template
            console.log(`[Minimact] 🔵 Array append: ${stateKey}`, item);
        };
        // Prepend helper
        setter.prepend = (item) => {
            const newArray = [item, ...currentArray];
            context.state.set(stateKey, newArray);
            templateState.updateState(context.componentId, stateKey, newArray);
            context.signalR.updateComponentStateWithOperation(context.componentId, stateKey, newArray, { type: 'Prepend', item }).catch(err => {
                console.error('[Minimact] Failed to sync array prepend to server:', err);
            });
            console.log(`[Minimact] 🔵 Array prepend: ${stateKey}`, item);
        };
        // InsertAt helper
        setter.insertAt = (index, item) => {
            const newArray = [...currentArray];
            newArray.splice(index, 0, item);
            context.state.set(stateKey, newArray);
            templateState.updateState(context.componentId, stateKey, newArray);
            context.signalR.updateComponentStateWithOperation(context.componentId, stateKey, newArray, { type: 'InsertAt', index, item }).catch(err => {
                console.error('[Minimact] Failed to sync array insert to server:', err);
            });
            console.log(`[Minimact] 🔵 Array insertAt(${index}): ${stateKey}`, item);
        };
        // RemoveAt helper
        setter.removeAt = (index) => {
            const newArray = currentArray.filter((_, i) => i !== index);
            context.state.set(stateKey, newArray);
            templateState.updateState(context.componentId, stateKey, newArray);
            context.signalR.updateComponentStateWithOperation(context.componentId, stateKey, newArray, { type: 'RemoveAt', index }).catch(err => {
                console.error('[Minimact] Failed to sync array remove to server:', err);
            });
            console.log(`[Minimact] 🔵 Array removeAt(${index}): ${stateKey}`);
        };
        // UpdateAt helper
        setter.updateAt = (index, updates) => {
            const newArray = [...currentArray];
            newArray[index] = typeof updates === 'function'
                ? updates(currentArray[index])
                : { ...currentArray[index], ...updates };
            context.state.set(stateKey, newArray);
            templateState.updateState(context.componentId, stateKey, newArray);
            context.signalR.updateComponentStateWithOperation(context.componentId, stateKey, newArray, { type: 'UpdateAt', index, item: newArray[index] }).catch(err => {
                console.error('[Minimact] Failed to sync array update to server:', err);
            });
            console.log(`[Minimact] 🔵 Array updateAt(${index}): ${stateKey}`, newArray[index]);
        };
        // Clear helper
        setter.clear = () => {
            baseSetState([]);
        };
        // RemoveWhere helper
        setter.removeWhere = (predicate) => {
            const newArray = currentArray.filter(item => !predicate(item));
            baseSetState(newArray);
        };
        // UpdateWhere helper
        setter.updateWhere = (predicate, updates) => {
            const newArray = currentArray.map(item => predicate(item) ? { ...item, ...updates } : item);
            baseSetState(newArray);
        };
        // AppendMany helper
        setter.appendMany = (items) => {
            const newArray = [...currentArray, ...items];
            baseSetState(newArray);
        };
        // RemoveMany helper
        setter.removeMany = (indices) => {
            const newArray = currentArray.filter((_, i) => !indices.includes(i));
            baseSetState(newArray);
        };
        return setter;
    }
    /**
     * useServerTask - Execute long-running operations on the server with reactive client state
     *
     * @param taskFactory - Optional async function (will be transpiled to C# by Babel plugin)
     * @param options - Configuration options for the server task
     * @returns ServerTask interface with status, result, and control methods
     *
     * @example
     * const analysis = useServerTask(async () => {
     *   // This code runs on the SERVER (transpiled to C#)
     *   const data = await fetchData();
     *   return processData(data);
     * });
     *
     * // In JSX:
     * <button onClick={analysis.start}>Start</button>
     * {analysis.running && <Spinner />}
     * {analysis.complete && <div>{analysis.result}</div>}
     */
    function useServerTask(taskFactory, options = {}) {
        if (!currentContext$1) {
            throw new Error('useServerTask must be called within a component render');
        }
        const context = currentContext$1;
        const index = serverTaskIndex++;
        const taskKey = `serverTask_${index}`;
        // Initialize serverTasks map if not exists
        if (!context.serverTasks) {
            context.serverTasks = new Map();
        }
        // Get or create server task instance
        if (!context.serverTasks.has(taskKey)) {
            const task = new ServerTaskImpl(taskKey, context.componentId, context.signalR, context, options);
            context.serverTasks.set(taskKey, task);
        }
        return context.serverTasks.get(taskKey);
    }
    /**
     * useServerReducer - React-like reducer that executes on the server
     *
     * Similar to React's useReducer, but the reducer function runs on the server side.
     * This allows complex state transitions with validation, side effects, and database
     * operations to happen server-side while maintaining reactive UI updates.
     *
     * @example
     * ```tsx
     * type CounterState = { count: number };
     * type CounterAction = { type: 'increment' } | { type: 'decrement' } | { type: 'set', value: number };
     *
     * const counter = useServerReducer<CounterState, CounterAction>({ count: 0 });
     *
     * // In JSX:
     * <button onClick={() => counter.dispatch({ type: 'increment' })}>+</button>
     * <span>{counter.state.count}</span>
     * <button onClick={() => counter.dispatch({ type: 'decrement' })}>-</button>
     * {counter.dispatching && <Spinner />}
     * {counter.error && <div>Error: {counter.error.message}</div>}
     * ```
     *
     * @example
     * ```tsx
     * // With async dispatch (await the result)
     * const handleReset = async () => {
     *   const newState = await counter.dispatchAsync({ type: 'set', value: 0 });
     *   console.log('Counter reset to:', newState.count);
     * };
     * ```
     */
    function useServerReducer(initialState) {
        if (!currentContext$1) {
            throw new Error('useServerReducer must be called within a component render');
        }
        const context = currentContext$1;
        const index = serverReducerIndex++;
        const reducerKey = `serverReducer_${index}`;
        // Initialize serverReducers map if not exists
        if (!context.serverReducers) {
            context.serverReducers = new Map();
        }
        // Get or create server reducer instance
        if (!context.serverReducers.has(reducerKey)) {
            const reducer = new ServerReducerImpl(reducerKey, context.componentId, context.signalR, context, initialState);
            context.serverReducers.set(reducerKey, reducer);
        }
        return context.serverReducers.get(reducerKey);
    }

    /**
     * useContext - Server-side cache system with multiple scope types
     *
     * This reimagines React's context API as a Redis-like in-memory cache
     * that enables shared state across components with flexible lifetime management.
     */
    let currentContext = null;
    /**
     * Set the current component context for hook execution
     * Called internally by Minimact before rendering
     */
    function setContextHookContext(context) {
        currentContext = context;
    }
    /**
     * Clear the current component context after rendering
     * Called internally by Minimact after rendering
     */
    function clearContextHookContext() {
        currentContext = null;
    }
    /**
     * Create a context with specified scope and options
     *
     * @example
     * // Session-scoped user context
     * const UserContext = createContext<User>('current-user', {
     *   scope: 'session',
     *   expiry: 3600000 // 1 hour
     * });
     *
     * @example
     * // URL-scoped dashboard filters
     * const DashboardFilters = createContext<Filters>('dashboard-filters', {
     *   scope: 'url',
     *   urlPattern: '/dashboard/*',
     *   expiry: 3600000
     * });
     */
    function createContext(key, options = {}) {
        // Validate URL pattern if scope is 'url'
        if (options.scope === 'url' && !options.urlPattern) {
            throw new Error(`Context '${key}' with scope 'url' requires urlPattern`);
        }
        return {
            key,
            options: {
                scope: options.scope || 'request',
                urlPattern: options.urlPattern,
                expiry: options.expiry,
                defaultValue: options.defaultValue
            }
        };
    }
    /**
     * Use a context - returns [value, setValue, clearValue]
     *
     * Unlike React's useContext, this doesn't require a Provider component.
     * The context is stored server-side in a cache with the specified scope.
     *
     * @returns Tuple of [value, setValue, clearValue]
     *
     * @example
     * // Read and write to context
     * function LoginForm() {
     *   const [_, setUser] = useContext(UserContext);
     *
     *   const handleLogin = async (credentials) => {
     *     const user = await authenticate(credentials);
     *     setUser(user); // Stored in session-scoped cache
     *   };
     *
     *   return <form onSubmit={handleLogin}>...</form>;
     * }
     *
     * @example
     * // Read from context (different component, no parent-child relationship needed)
     * function UserProfile() {
     *   const [user] = useContext(UserContext);
     *
     *   if (!user) return <Login />;
     *   return <div>Welcome, {user.name}</div>;
     * }
     */
    function useContext(context) {
        if (!currentContext) {
            throw new Error('[Minimact] useContext must be called within a component render');
        }
        const ctx = currentContext;
        const stateKey = `context_${context.key}`;
        // Get current value from component state (initialized from server)
        let currentValue = ctx.state.get(stateKey);
        // If no value and has default, use default
        if (currentValue === undefined && context.options.defaultValue !== undefined) {
            currentValue = context.options.defaultValue;
        }
        // Setter - updates local state and syncs to server
        const setContextValue = (newValue) => {
            // Update local state immediately for instant feedback
            ctx.state.set(stateKey, newValue);
            // Apply any cached patches if available
            const stateChanges = {
                [stateKey]: newValue
            };
            const hint = ctx.hintQueue.matchHint(ctx.componentId, stateChanges);
            if (hint) {
                ctx.domPatcher.applyPatches(ctx.element, hint.patches);
            }
            // Sync to server cache
            ctx.signalR.invoke('UpdateContext', {
                key: context.key,
                value: newValue,
                scope: context.options.scope,
                urlPattern: context.options.urlPattern,
                expiry: context.options.expiry
            }).catch(err => {
                console.error(`[Minimact] Failed to update context '${context.key}':`, err);
            });
        };
        // Clear - removes value from cache
        const clearContextValue = () => {
            // Clear local state
            ctx.state.set(stateKey, undefined);
            // Apply any cached patches if available
            const stateChanges = {
                [stateKey]: undefined
            };
            const hint = ctx.hintQueue.matchHint(ctx.componentId, stateChanges);
            if (hint) {
                ctx.domPatcher.applyPatches(ctx.element, hint.patches);
            }
            // Sync to server cache
            ctx.signalR.invoke('ClearContext', {
                key: context.key,
                scope: context.options.scope,
                urlPattern: context.options.urlPattern
            }).catch(err => {
                console.error(`[Minimact] Failed to clear context '${context.key}':`, err);
            });
        };
        return [currentValue, setContextValue, clearContextValue];
    }

    /**
     * usePaginatedServerTask - Pagination built on useServerTask
     *
     * Extends the existing useServerTask infrastructure to add pagination capabilities.
     * Reuses transpilers, FFI bridge, and task runtime for zero additional complexity.
     */
    /**
     * usePaginatedServerTask Hook
     *
     * Wraps useServerTask to provide pagination with intelligent prefetching.
     *
     * @example
     * const users = usePaginatedServerTask(
     *   async ({ page, pageSize, filters }) => {
     *     return await db.users
     *       .where(u => filters.role ? u.role === filters.role : true)
     *       .skip((page - 1) * pageSize)
     *       .take(pageSize)
     *       .toList();
     *   },
     *   {
     *     pageSize: 20,
     *     getTotalCount: async (filters) => {
     *       return await db.users
     *         .where(u => filters.role ? u.role === filters.role : true)
     *         .count();
     *     },
     *     prefetchNext: true,
     *     dependencies: [filters]
     *   }
     * );
     */
    function usePaginatedServerTask(fetchFn, options) {
        const pageSize = options.pageSize || 20;
        // State
        const [page, setPage] = useState(1);
        const [items, setItems] = useState([]);
        const [total, setTotal] = useState(0);
        const [error, setError] = useState(null);
        // Prefetch cache
        const prefetchCache = useRef(new Map());
        // Last args (for retry)
        const lastArgs = useRef([]);
        // Build current filters from dependencies
        const filters = buildFilters(options.dependencies);
        // ✅ Reuse useServerTask for fetch logic!
        // Note: The actual function is passed via Babel transpilation
        // At runtime, we just get a task instance and call .start(args)
        const fetchTask = useServerTask(undefined, // Function extracted by Babel plugin
        {
            runtime: options.runtime,
            parallel: options.parallel
        });
        // ✅ Reuse useServerTask for count query!
        const countTask = useServerTask(undefined, // Function extracted by Babel plugin
        { runtime: options.runtime });
        /**
         * Fetch a specific page
         */
        const fetchPage = async (targetPage, fromCache = true) => {
            // Check prefetch cache
            if (fromCache && prefetchCache.current.has(targetPage)) {
                const cached = prefetchCache.current.get(targetPage);
                setItems(cached);
                setPage(targetPage);
                prefetchCache.current.delete(targetPage);
                console.log(`[usePaginatedServerTask] 🟢 Cache hit for page ${targetPage}`);
                // Trigger next prefetch
                if (options.prefetchNext && targetPage < totalPages) {
                    prefetchInBackground(targetPage + 1);
                }
                if (options.prefetchPrev && targetPage > 1) {
                    prefetchInBackground(targetPage - 1);
                }
                return;
            }
            // Fetch from server via useServerTask
            const args = {
                page: targetPage,
                pageSize,
                filters
            };
            lastArgs.current = [args];
            fetchTask.start(args);
            // Wait for completion (using promise)
            try {
                const result = await fetchTask.promise;
                setItems(result);
                setPage(targetPage);
                setError(null);
                console.log(`[usePaginatedServerTask] 🔴 Fetched page ${targetPage} from server`);
                // Prefetch adjacent pages if configured
                if (options.prefetchNext && targetPage < totalPages) {
                    prefetchInBackground(targetPage + 1);
                }
                if (options.prefetchPrev && targetPage > 1) {
                    prefetchInBackground(targetPage - 1);
                }
            }
            catch (err) {
                setError(err.message || 'Failed to fetch page');
                console.error(`[usePaginatedServerTask] Error fetching page ${targetPage}:`, err);
            }
        };
        /**
         * Prefetch in background (non-blocking)
         */
        const prefetchInBackground = async (targetPage) => {
            if (prefetchCache.current.has(targetPage)) {
                return; // Already cached
            }
            const args = {
                page: targetPage,
                pageSize,
                filters
            };
            // Create a separate task instance for prefetching
            // Note: This will be optimized later to reuse task instances
            fetchTask.start(args);
            try {
                const result = await fetchTask.promise;
                prefetchCache.current.set(targetPage, result);
                console.log(`[usePaginatedServerTask] ⚡ Prefetched page ${targetPage}`);
            }
            catch (err) {
                console.error(`[usePaginatedServerTask] Prefetch failed for page ${targetPage}:`, err);
                // Silently fail - prefetch is optional
            }
        };
        /**
         * Get total count on mount and when filters change
         */
        useEffect(() => {
            countTask.start(filters);
            countTask.promise.then((count) => {
                setTotal(count);
            }).catch((err) => {
                console.error('[usePaginatedServerTask] Failed to get total count:', err);
            });
        }, [JSON.stringify(filters)]);
        /**
         * Initial fetch
         */
        useEffect(() => {
            fetchPage(1, false);
        }, []);
        /**
         * Re-fetch when dependencies change
         */
        useEffect(() => {
            if (options.dependencies && options.dependencies.length > 0) {
                prefetchCache.current.clear();
                fetchPage(1, false);
            }
        }, [JSON.stringify(filters)]);
        // Computed properties
        const totalPages = Math.ceil(total / pageSize);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;
        // Navigation methods
        const next = () => {
            if (hasNext) {
                fetchPage(page + 1);
            }
        };
        const prev = () => {
            if (hasPrev) {
                fetchPage(page - 1);
            }
        };
        const goto = (targetPage) => {
            if (targetPage >= 1 && targetPage <= totalPages) {
                fetchPage(targetPage);
            }
        };
        const refresh = () => {
            prefetchCache.current.clear();
            fetchPage(page, false);
        };
        return {
            // Data
            items,
            total,
            totalPages,
            // State
            page,
            pageSize,
            pending: fetchTask.status === 'running',
            error: error || fetchTask.error?.message,
            // Navigation
            hasNext,
            hasPrev,
            next,
            prev,
            goto,
            refresh,
            // ✅ Expose underlying tasks for advanced use
            _fetchTask: fetchTask,
            _countTask: countTask
        };
    }
    /**
     * Helper: Build filters object from dependencies array
     */
    function buildFilters(dependencies) {
        if (!dependencies || dependencies.length === 0) {
            return {};
        }
        // If single object, use as-is
        if (dependencies.length === 1 && typeof dependencies[0] === 'object') {
            return dependencies[0];
        }
        // Otherwise, create indexed object
        return dependencies.reduce((acc, dep, i) => {
            acc[`dep${i}`] = dep;
            return acc;
        }, {});
    }

    /**
     * Client-side pub/sub event aggregator
     * Enables component-to-component communication without prop drilling
     */
    /**
     * Global event aggregator for client-side pub/sub
     */
    class EventAggregator {
        constructor(options = {}) {
            this.channels = new Map();
            this.debugLogging = false;
            this.debugLogging = options.debugLogging || false;
        }
        /**
         * Subscribe to a channel
         */
        subscribe(channel, callback) {
            if (!this.channels.has(channel)) {
                this.channels.set(channel, {
                    subscribers: new Set(),
                    lastMessage: null
                });
            }
            const channelData = this.channels.get(channel);
            // Add callback if provided
            if (callback) {
                channelData.subscribers.add(callback);
            }
            // Return reactive message object
            const message = channelData.lastMessage || {
                value: undefined,
                timestamp: Date.now()
            };
            this.log(`Subscribed to '${channel}'`, { hasCallback: !!callback });
            return message;
        }
        /**
         * Unsubscribe from a channel
         */
        unsubscribe(channel, callback) {
            const channelData = this.channels.get(channel);
            if (channelData) {
                channelData.subscribers.delete(callback);
                this.log(`Unsubscribed from '${channel}'`);
            }
        }
        /**
         * Publish a message to a channel
         */
        publish(channel, value, options = {}) {
            if (!this.channels.has(channel)) {
                this.channels.set(channel, {
                    subscribers: new Set(),
                    lastMessage: null
                });
            }
            const channelData = this.channels.get(channel);
            const message = {
                value,
                error: options.error,
                waiting: options.waiting,
                source: options.source,
                timestamp: Date.now(),
                isStale: false
            };
            // Update last message
            channelData.lastMessage = message;
            // Notify all subscribers
            channelData.subscribers.forEach(subscriber => {
                try {
                    subscriber(message);
                }
                catch (error) {
                    console.error(`[Minimact PubSub] Error in subscriber for '${channel}':`, error);
                }
            });
            this.log(`Published to '${channel}'`, {
                subscribers: channelData.subscribers.size,
                value
            });
        }
        /**
         * Clear a channel
         */
        clear(channel) {
            this.channels.delete(channel);
            this.log(`Cleared channel '${channel}'`);
        }
        /**
         * Clear all channels
         */
        clearAll() {
            this.channels.clear();
            this.log('Cleared all channels');
        }
        /**
         * Get stats
         */
        getStats() {
            return {
                totalChannels: this.channels.size,
                channels: Array.from(this.channels.entries()).map(([name, data]) => ({
                    name,
                    subscribers: data.subscribers.size,
                    hasLastMessage: !!data.lastMessage
                }))
            };
        }
        log(message, data) {
            if (this.debugLogging) {
                console.log(`[Minimact PubSub] ${message}`, data || '');
            }
        }
    }
    // Global singleton instance
    let globalAggregator = null;
    function getEventAggregator(options) {
        if (!globalAggregator) {
            globalAggregator = new EventAggregator(options);
        }
        return globalAggregator;
    }
    /**
     * Hook: usePub - Publish to a channel
     */
    function usePub(channel) {
        const aggregator = getEventAggregator();
        return (value, options = {}) => {
            aggregator.publish(channel, value, options);
        };
    }
    /**
     * Hook: useSub - Subscribe to a channel
     */
    function useSub(channel, callback) {
        const aggregator = getEventAggregator();
        // Subscribe and return reactive message object
        const message = aggregator.subscribe(channel, callback);
        // TODO: Integrate with component lifecycle for auto-unsubscribe
        // For now, developers must manually unsubscribe or we rely on component unmount
        return message;
    }

    /**
     * Task scheduling hooks for fine-grained render timing control
     * useMicroTask - runs before paint (microtask queue)
     * useMacroTask - runs after paint (task queue)
     */
    /**
     * Hook: useMicroTask
     * Schedules a callback to run in the microtask queue (before next paint)
     * Perfect for: DOM measurements, layout calculations, critical updates
     */
    function useMicroTask(callback) {
        queueMicrotask(() => {
            try {
                callback();
            }
            catch (error) {
                console.error('[Minimact useMicroTask] Error in microtask:', error);
            }
        });
    }
    /**
     * Hook: useMacroTask
     * Schedules a callback to run in the task queue (after paint)
     * Perfect for: Analytics, logging, non-critical updates, deferred work
     */
    function useMacroTask(callback, delay = 0) {
        setTimeout(() => {
            try {
                callback();
            }
            catch (error) {
                console.error('[Minimact useMacroTask] Error in macrotask:', error);
            }
        }, delay);
    }
    /**
     * Hook: useAnimationFrame
     * Schedules a callback for the next animation frame
     * Perfect for: Animations, visual updates, smooth transitions
     */
    function useAnimationFrame(callback) {
        const rafId = requestAnimationFrame((timestamp) => {
            try {
                callback(timestamp);
            }
            catch (error) {
                console.error('[Minimact useAnimationFrame] Error in animation frame:', error);
            }
        });
        return rafId;
    }
    /**
     * Hook: useIdleCallback
     * Schedules a callback for when the browser is idle
     * Perfect for: Low-priority work, background tasks, optimization
     */
    function useIdleCallback(callback, options) {
        if ('requestIdleCallback' in window) {
            return requestIdleCallback((deadline) => {
                try {
                    callback(deadline);
                }
                catch (error) {
                    console.error('[Minimact useIdleCallback] Error in idle callback:', error);
                }
            }, options);
        }
        else {
            // Fallback to setTimeout for browsers without requestIdleCallback
            return setTimeout(() => {
                const deadline = {
                    didTimeout: false,
                    timeRemaining: () => 50
                };
                callback(deadline);
            }, 1);
        }
    }

    /**
     * Main Minimact client runtime
     * Orchestrates SignalM (lightweight WebSocket), DOM patching, state management, and hydration
     *
     * Bundle size: ~10 KB gzipped (vs 25 KB with SignalR)
     */
    class Minimact {
        constructor(rootElement = document.body, options = {}) {
            this.eventDelegation = null;
            // Resolve root element
            if (typeof rootElement === 'string') {
                const element = document.querySelector(rootElement);
                if (!element) {
                    throw new Error(`[Minimact] Root element not found: ${rootElement}`);
                }
                this.rootElement = element;
            }
            else {
                this.rootElement = rootElement;
            }
            // Default options
            this.options = {
                hubUrl: options.hubUrl || '/minimact',
                enableDebugLogging: options.enableDebugLogging || false,
                reconnectInterval: options.reconnectInterval || 5000
            };
            // Initialize subsystems (using lightweight SignalM!)
            this.signalR = new SignalMManager(this.options.hubUrl, {
                reconnectInterval: this.options.reconnectInterval,
                debugLogging: this.options.enableDebugLogging
            });
            this.domPatcher = new DOMPatcher({
                debugLogging: this.options.enableDebugLogging
            });
            this.clientState = new ClientStateManager({
                debugLogging: this.options.enableDebugLogging
            });
            this.hydration = new HydrationManager(this.clientState, {
                debugLogging: this.options.enableDebugLogging
            });
            this.hintQueue = new HintQueue({
                debugLogging: this.options.enableDebugLogging
            });
            this.playgroundBridge = new PlaygroundBridge({
                debugLogging: this.options.enableDebugLogging
            });
            // Enable debug logging for client-computed module
            setDebugLogging(this.options.enableDebugLogging);
            this.setupSignalRHandlers();
            this.log('Minimact initialized', { rootElement: this.rootElement, options: this.options });
        }
        /**
         * Start the Minimact runtime
         */
        async start() {
            // Connect to SignalR hub
            await this.signalR.start();
            // Hydrate all components
            this.hydration.hydrateAll();
            // Setup event delegation
            this.eventDelegation = new EventDelegation(this.rootElement, (componentId, methodName, args) => this.signalR.invokeComponentMethod(componentId, methodName, args), { debugLogging: this.options.enableDebugLogging });
            // Register all components with server
            await this.registerAllComponents();
            this.log('Minimact started');
        }
        /**
         * Stop the Minimact runtime
         */
        async stop() {
            if (this.eventDelegation) {
                this.eventDelegation.destroy();
                this.eventDelegation = null;
            }
            await this.signalR.stop();
            this.log('Minimact stopped');
        }
        /**
         * Setup SignalR event handlers
         */
        setupSignalRHandlers() {
            // Handle full HTML updates
            this.signalR.on('updateComponent', ({ componentId, html }) => {
                const component = this.hydration.getComponent(componentId);
                if (component) {
                    this.domPatcher.replaceHTML(component.element, html);
                    this.log('Component HTML updated', { componentId });
                }
            });
            // Handle patch updates
            this.signalR.on('applyPatches', ({ componentId, patches }) => {
                const component = this.hydration.getComponent(componentId);
                if (component) {
                    this.domPatcher.applyPatches(component.element, patches);
                    this.log('Patches applied', { componentId, patchCount: patches.length });
                }
            });
            // Handle predicted patches (instant UI updates!)
            this.signalR.on('applyPrediction', ({ componentId, patches, confidence }) => {
                const component = this.hydration.getComponent(componentId);
                if (component) {
                    this.domPatcher.applyPatches(component.element, patches);
                    this.log(`Prediction applied (${(confidence * 100).toFixed(0)}% confident)`, { componentId, patchCount: patches.length });
                }
            });
            // Handle corrections if prediction was wrong
            this.signalR.on('applyCorrection', ({ componentId, patches }) => {
                const component = this.hydration.getComponent(componentId);
                if (component) {
                    this.domPatcher.applyPatches(component.element, patches);
                    this.log('Correction applied (prediction was incorrect)', { componentId, patchCount: patches.length });
                }
            });
            // Handle hint queueing (usePredictHint)
            this.signalR.on('queueHint', (data) => {
                this.hintQueue.queueHint(data);
                this.log(`Hint '${data.hintId}' queued for component ${data.componentId}`, {
                    patchCount: data.patches.length,
                    confidence: (data.confidence * 100).toFixed(0) + '%'
                });
                // Notify playground that prediction was received
                this.playgroundBridge.predictionReceived({
                    componentId: data.componentId,
                    hintId: data.hintId,
                    patchCount: data.patches.length,
                    confidence: data.confidence
                });
            });
            // Handle reconnection
            this.signalR.on('reconnected', async () => {
                this.log('Reconnected - re-registering components');
                await this.registerAllComponents();
            });
            // Handle server reducer state updates
            this.signalR.on('UpdateServerReducerState', ({ componentId, reducerId, state, error }) => {
                const component = this.hydration.getComponent(componentId);
                if (component && component.context.serverReducers) {
                    const reducer = component.context.serverReducers.get(reducerId);
                    if (reducer) {
                        reducer._updateFromServer(state, error);
                        this.log('Server reducer state updated', { componentId, reducerId });
                    }
                }
            });
            // Handle errors
            this.signalR.on('error', ({ message }) => {
                console.error('[Minimact] Server error:', message);
            });
        }
        /**
         * Register all components with the server
         */
        async registerAllComponents() {
            const components = document.querySelectorAll('[data-minimact-component]');
            for (const element of Array.from(components)) {
                const componentId = element.getAttribute('data-minimact-component');
                if (componentId) {
                    try {
                        await this.signalR.registerComponent(componentId);
                        this.log('Registered component', { componentId });
                    }
                    catch (error) {
                        console.error('[Minimact] Failed to register component:', componentId, error);
                    }
                }
            }
        }
        /**
         * Manually hydrate a component
         */
        hydrateComponent(componentId, element) {
            this.hydration.hydrateComponent(componentId, element);
        }
        /**
         * Get component by ID (for hot reload)
         */
        getComponent(componentId) {
            return this.hydration.getComponent(componentId);
        }
        /**
         * Get client state for a component
         */
        getClientState(componentId, key) {
            return this.clientState.getState(componentId, key);
        }
        /**
         * Set client state for a component
         */
        setClientState(componentId, key, value) {
            this.clientState.setState(componentId, key, value);
            // Recompute client-computed variables that depend on this state
            this.recomputeAndSyncClientState(componentId, key);
        }
        /**
         * Subscribe to client state changes
         */
        subscribeToState(componentId, key, callback) {
            return this.clientState.subscribe(componentId, key, callback);
        }
        /**
         * Recompute client-computed variables after state change and sync to server
         */
        async recomputeAndSyncClientState(componentId, changedStateKey) {
            // Check if component has any client-computed variables
            if (!hasClientComputed(componentId)) {
                return;
            }
            // Compute affected variables
            const computed = changedStateKey
                ? computeDependentVariables(componentId, changedStateKey)
                : computeAllForComponent(componentId);
            // If there are computed values, send to server
            if (Object.keys(computed).length > 0) {
                try {
                    await this.signalR.updateClientComputedState(componentId, computed);
                    this.log('Client-computed state synced', { componentId, computed });
                }
                catch (error) {
                    console.error('[Minimact] Failed to sync client-computed state:', error);
                }
            }
        }
        /**
         * Get SignalR connection state
         */
        get connectionState() {
            return this.signalR.state.toString();
        }
        /**
         * Get SignalR connection ID
         */
        get connectionId() {
            return this.signalR.connectionId;
        }
        /**
         * Debug logging
         */
        log(message, data) {
            if (this.options.enableDebugLogging) {
                console.log(`[Minimact] ${message}`, data || '');
            }
        }
    }
    // Auto-initialize if data-minimact-auto-init is present
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body.hasAttribute('data-minimact-auto-init')) {
                    const minimact = new Minimact(document.body, {
                        enableDebugLogging: document.body.hasAttribute('data-minimact-debug')
                    });
                    minimact.start().catch(console.error);
                    window.minimact = minimact;
                }
            });
        }
        else {
            if (document.body.hasAttribute('data-minimact-auto-init')) {
                const minimact = new Minimact(document.body, {
                    enableDebugLogging: document.body.hasAttribute('data-minimact-debug')
                });
                minimact.start().catch(console.error);
                window.minimact = minimact;
            }
        }
    }
    // Make available globally
    if (typeof window !== 'undefined') {
        window.Minimact = Minimact;
    }

    exports.ClientStateManager = ClientStateManager;
    exports.DOMPatcher = DOMPatcher;
    exports.EventDelegation = EventDelegation;
    exports.HintQueue = HintQueue;
    exports.HydrationManager = HydrationManager;
    exports.Minimact = Minimact;
    exports.SignalMManager = SignalMManager;
    exports.TemplateRenderer = TemplateRenderer;
    exports.TemplateStateManager = TemplateStateManager;
    exports.clearClientComputedComponent = clearComponent;
    exports.clearComponentContext = clearComponentContext;
    exports.clearContextHookContext = clearContextHookContext;
    exports.computeAllForComponent = computeAllForComponent;
    exports.computeDependentVariables = computeDependentVariables;
    exports.computeVariable = computeVariable;
    exports.createContext = createContext;
    exports.default = Minimact;
    exports.getAllLastValues = getAllLastValues;
    exports.getClientComputedDebugInfo = getDebugInfo;
    exports.getComputedVariableNames = getComputedVariableNames;
    exports.getLastValue = getLastValue;
    exports.hasClientComputed = hasClientComputed;
    exports.registerClientComputed = registerClientComputed;
    exports.setComponentContext = setComponentContext;
    exports.setContextHookContext = setContextHookContext;
    exports.templateState = templateState;
    exports.useAnimationFrame = useAnimationFrame;
    exports.useComputed = useComputed;
    exports.useContext = useContext;
    exports.useEffect = useEffect;
    exports.useIdleCallback = useIdleCallback;
    exports.useMacroTask = useMacroTask;
    exports.useMicroTask = useMicroTask;
    exports.usePaginatedServerTask = usePaginatedServerTask;
    exports.usePub = usePub;
    exports.useRef = useRef;
    exports.useServerReducer = useServerReducer;
    exports.useServerTask = useServerTask;
    exports.useState = useState;
    exports.useSub = useSub;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=core.js.map
