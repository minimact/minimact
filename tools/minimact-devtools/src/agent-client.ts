/**
 * DevTools Agent Client
 *
 * Type-safe RPC bridge between DevTools panel and injected agent
 */

export interface QueryConfig {
  selector: string;
  filters?: Array<{ property: string; operator: string; value: any }>;
  orderBy?: { property: string; direction: 'ASC' | 'DESC' };
  limit?: number;
}

export interface ElementData {
  tagName: string;
  className: string;
  id: string;
  attributes: Record<string, string>;
  classList: string[];
  isIntersecting: boolean;
  childrenCount: number;
  state?: {
    hover: boolean;
    focus: boolean;
    active: boolean;
    disabled: boolean;
  };
  theme?: {
    isDark: boolean;
    reducedMotion: boolean;
  };
  history?: {
    changeCount: number;
    changesPerSecond: number;
    ageInSeconds: number;
  };
  lifecycle?: {
    lifecycleState: string;
    timeInState: number;
  };
}

export interface StateChange {
  elementId: string;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

type EventHandler = (data: any) => void;

export class DevToolsAgent {
  private port: chrome.runtime.Port;
  private requestId = 0;
  private pendingRequests = new Map<number, (result: any) => void>();
  private eventHandlers = new Map<string, Set<EventHandler>>();

  constructor(private tabId: number) {
    this.port = chrome.runtime.connect({ name: `minimact-devtools-panel-${tabId}` });
    this.setupMessageHandler();
  }

  /**
   * Setup message handler for responses from agent
   */
  private setupMessageHandler() {
    this.port.onMessage.addListener((message) => {
      if (message.type === 'response' && message.requestId !== undefined) {
        // Handle RPC response
        const resolve = this.pendingRequests.get(message.requestId);
        if (resolve) {
          resolve(message.data);
          this.pendingRequests.delete(message.requestId);
        }
      } else {
        // Handle event
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message.data));
        }
      }
    });
  }

  /**
   * Send RPC request to agent
   */
  private async request(type: string, data?: any): Promise<any> {
    const requestId = this.requestId++;

    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, resolve);

      this.port.postMessage({
        type: `minimact-devtools-${type}`,
        data,
        requestId
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve(null);
        }
      }, 5000);
    });
  }

  /**
   * Execute a SQL-like query
   */
  async query(config: QueryConfig): Promise<ElementData[]> {
    return this.request('query', config);
  }

  /**
   * Get current state for a specific element
   */
  async getElement(elementId: string): Promise<ElementData | null> {
    return this.request('get-element', { elementId });
  }

  /**
   * Get state history for an element
   */
  async getHistory(elementId: string, limit?: number): Promise<StateChange[]> {
    return this.request('get-history', { elementId, limit });
  }

  /**
   * Get all tracked elements (metadata only)
   */
  async getAllElements(): Promise<Array<{ id: string; selector: string; trackers: string[] }>> {
    return this.request('get-all-elements');
  }

  /**
   * Subscribe to events from agent
   */
  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Disconnect from agent
   */
  disconnect() {
    this.port.disconnect();
  }
}
