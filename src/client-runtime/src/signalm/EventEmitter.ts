/**
 * Simple Event Emitter
 *
 * Lightweight event handling for SignalM connections
 */

export class EventEmitter {
  private events = new Map<string, Function[]>();

  /**
   * Register an event handler
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  /**
   * Unregister an event handler
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off(event: string, handler: Function): void {
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
  once(event: string, handler: Function): void {
    const onceHandler = (...args: any[]) => {
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
  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      // Create a copy to avoid issues if handlers are removed during iteration
      const handlersCopy = [...handlers];
      handlersCopy.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
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
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.length : 0;
  }

  /**
   * Get all event names with listeners
   *
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}
