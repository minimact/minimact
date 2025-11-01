import type { HintQueue } from './hint-queue';
import type { DOMPatcher } from './dom-patcher';
import type { PlaygroundBridge } from './playground-bridge';

/**
 * Event delegation system for handling component events
 * Uses a single root listener for performance
 */
export class EventDelegation {
  private rootElement: HTMLElement;
  private componentMethodInvoker: (componentId: string, methodName: string, args?: any) => Promise<void>;
  private debugLogging: boolean;
  private eventListeners: Map<string, EventListener>;
  private hintQueue?: HintQueue;
  private domPatcher?: DOMPatcher;
  private playgroundBridge?: PlaygroundBridge;

  constructor(
    rootElement: HTMLElement,
    componentMethodInvoker: (componentId: string, methodName: string, args?: any) => Promise<void>,
    options: {
      debugLogging?: boolean;
      hintQueue?: HintQueue;
      domPatcher?: DOMPatcher;
      playgroundBridge?: PlaygroundBridge;
    } = {}
  ) {
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
  private setupEventDelegation(): void {
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
  private createEventListener(eventType: string): EventListener {
    return async (event: Event) => {
      const target = event.target as HTMLElement;

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
  private findHandlerElement(element: HTMLElement | null, eventType: string): HTMLElement | null {
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
  private getEventHandler(element: HTMLElement, eventType: string): EventHandler | null {
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
  private findComponentId(element: HTMLElement | null): string | null {
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
  private async executeHandler(handler: EventHandler, event: Event, element: HTMLElement): Promise<void> {
    const startTime = performance.now();

    try {
      // Build args object
      const argsObj: any = {};

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
        const target = event.target as HTMLInputElement;
        argsObj.value = target.value;
      }

      // Convert argsObj to array format expected by server
      // Server expects: object[] args, so we pass the actual argument values as an array
      const argsArray: any[] = [];

      // For input/change events, pass the value as the first argument
      if (argsObj.value !== undefined) {
        argsArray.push(argsObj.value);
      }

      // For handlers with explicit args, add those
      if (argsObj.args && Array.isArray(argsObj.args)) {
        argsArray.push(...argsObj.args);
      }

      // Check hint queue for cached prediction (CACHE HIT!)
      if (this.hintQueue && this.domPatcher) {
        // Build hint ID based on method name (simplified - in production would be more sophisticated)
        const hintId = `${handler.methodName}`;

        // Try to match hint based on the method being called
        // This is a simplified version - in reality we'd need to know the state change
        const matchedHint = this.tryMatchHint(handler.componentId, handler.methodName);

        if (matchedHint) {
          // 🟢 CACHE HIT! Apply patches instantly
          const componentElement = this.findComponentElement(handler.componentId);
          if (componentElement) {
            this.domPatcher.applyPatches(componentElement, matchedHint.patches as any[]);

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
            this.componentMethodInvoker(handler.componentId, handler.methodName, argsArray).catch(err => {
              console.error('[Minimact] Background server notification failed:', err);
            });

            return;
          }
        }
      }

      // 🔴 CACHE MISS - No prediction found, send to server
      await this.componentMethodInvoker(handler.componentId, handler.methodName, argsArray);

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
    } catch (error) {
      console.error('[Minimact] Error executing handler:', handler, error);
    }
  }

  /**
   * Try to match a hint in the queue for this method invocation
   * Simplified version - checks if there's a hint matching the method name
   */
  private tryMatchHint(componentId: string, methodName: string): { hintId: string; patches: any[]; confidence: number } | null {
    if (!this.hintQueue) return null;

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
  private findComponentElement(componentId: string): HTMLElement | null {
    const element = this.rootElement.querySelector(`[data-minimact-component-id="${componentId}"]`);
    return element as HTMLElement;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    for (const [eventType, listener] of this.eventListeners.entries()) {
      this.rootElement.removeEventListener(eventType, listener, true);
    }
    this.eventListeners.clear();
    this.log('Event delegation destroyed');
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact EventDelegation] ${message}`, data || '');
    }
  }
}

interface EventHandler {
  componentId: string;
  methodName: string;
  args: string[];
}
