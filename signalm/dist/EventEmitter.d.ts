/**
 * Simple Event Emitter
 *
 * Lightweight event handling for SignalM connections
 */
export declare class EventEmitter {
    private events;
    /**
     * Register an event handler
     *
     * @param event - Event name
     * @param handler - Event handler function
     */
    on(event: string, handler: Function): void;
    /**
     * Unregister an event handler
     *
     * @param event - Event name
     * @param handler - Event handler function to remove
     */
    off(event: string, handler: Function): void;
    /**
     * Register a one-time event handler
     *
     * @param event - Event name
     * @param handler - Event handler function (will be called once)
     */
    once(event: string, handler: Function): void;
    /**
     * Emit an event
     *
     * @param event - Event name
     * @param args - Event arguments
     */
    emit(event: string, ...args: any[]): void;
    /**
     * Remove all event handlers for a specific event
     *
     * @param event - Event name (if not provided, clears all events)
     */
    removeAllListeners(event?: string): void;
    /**
     * Get the number of listeners for an event
     *
     * @param event - Event name
     * @returns Number of listeners
     */
    listenerCount(event: string): number;
    /**
     * Get all event names with listeners
     *
     * @returns Array of event names
     */
    eventNames(): string[];
}
