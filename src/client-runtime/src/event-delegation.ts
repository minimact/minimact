/**
 * Event delegation system for handling component events
 * Uses a single root listener for performance
 */
export class EventDelegation {
  private rootElement: HTMLElement;
  private componentMethodInvoker: (componentId: string, methodName: string, args?: any) => Promise<void>;
  private debugLogging: boolean;
  private eventListeners: Map<string, EventListener>;

  constructor(
    rootElement: HTMLElement,
    componentMethodInvoker: (componentId: string, methodName: string, args?: any) => Promise<void>,
    options: { debugLogging?: boolean } = {}
  ) {
    this.rootElement = rootElement;
    this.componentMethodInvoker = componentMethodInvoker;
    this.debugLogging = options.debugLogging || false;
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

      // Invoke component method on server
      await this.componentMethodInvoker(handler.componentId, handler.methodName, argsObj);

      this.log('Handler executed', { handler, argsObj });
    } catch (error) {
      console.error('[Minimact] Error executing handler:', handler, error);
    }
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
