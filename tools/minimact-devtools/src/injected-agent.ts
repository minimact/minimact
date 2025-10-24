/**
 * Minimact DevTools Agent
 *
 * Injected into the page to hook into Minimact's registry and
 * stream state changes to the DevTools panel.
 *
 * This is the "database adapter" that makes the DOM queryable.
 */

interface MinimactWindow extends Window {
  __MINIMACT_DEVTOOLS__?: MinimactDevToolsAgent;
  minimactPunch?: any;
  minimactQuery?: any;
}

declare const window: MinimactWindow;

interface ElementRegistration {
  id: string;
  selector: string | null;
  element: HTMLElement;
  trackers: string[];
  createdAt: number;
}

interface StateChange {
  elementId: string;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface QueryConfig {
  selector: string;
  filters?: Array<{ property: string; operator: string; value: any }>;
  orderBy?: { property: string; direction: 'ASC' | 'DESC' };
  limit?: number;
}

class MinimactDevToolsAgent {
  private elements: Map<string, ElementRegistration> = new Map();
  private stateHistory: StateChange[] = [];
  private maxHistorySize = 1000;
  private elementIdCounter = 0;

  constructor() {
    this.hookIntoRegistry();
    this.setupMessageListener();
    this.notifyDevTools({ type: 'agent-ready' });
  }

  /**
   * Hook into minimact-punch's global registry
   */
  private hookIntoRegistry() {
    // Wait for minimact-punch to load
    const checkRegistry = setInterval(() => {
      if (window.minimactPunch?.queryDomElementStates) {
        clearInterval(checkRegistry);
        this.observeRegistry();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkRegistry), 5000);
  }

  /**
   * Observe the Minimact registry for new elements
   */
  private observeRegistry() {
    // Get all existing tracked elements
    const existingElements = window.minimactPunch?.getAllDomElementStates?.() || [];

    existingElements.forEach((state: any) => {
      this.registerElement(state);
    });

    // Hook into register/unregister functions
    const original Register = window.minimactPunch?.registerDomElementState;
    if (originalRegister) {
      window.minimactPunch.registerDomElementState = (element: Element, state: any) => {
        originalRegister(element, state);
        this.registerElement(state);
      };
    }

    const originalUnregister = window.minimactPunch?.unregisterDomElementState;
    if (originalUnregister) {
      window.minimactPunch.unregisterDomElementState = (element: Element, state: any) => {
        originalUnregister(element, state);
        this.unregisterElement(state);
      };
    }

    this.notifyDevTools({
      type: 'registry-hooked',
      elementCount: existingElements.length
    });
  }

  /**
   * Register an element with DevTools
   */
  private registerElement(state: any) {
    const id = `el_${this.elementIdCounter++}`;
    const element = state.element || state._element;

    if (!element) return;

    const registration: ElementRegistration = {
      id,
      selector: state.selector || state._selector,
      element,
      trackers: this.getAvailableTrackers(state),
      createdAt: Date.now()
    };

    this.elements.set(id, registration);

    // Watch for state changes
    this.watchElement(id, state);

    // Notify DevTools
    this.notifyDevTools({
      type: 'element-registered',
      data: {
        id,
        selector: registration.selector,
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        attributes: this.serializeAttributes(element),
        trackers: registration.trackers
      }
    });
  }

  /**
   * Unregister an element from DevTools
   */
  private unregisterElement(state: any) {
    // Find element ID by state reference
    for (const [id, reg] of this.elements.entries()) {
      if (reg.element === (state.element || state._element)) {
        this.elements.delete(id);

        this.notifyDevTools({
          type: 'element-unregistered',
          data: { id }
        });

        break;
      }
    }
  }

  /**
   * Watch an element for state changes
   */
  private watchElement(elementId: string, state: any) {
    // Watch pseudo-state changes
    if (state.state) {
      this.watchProperty(elementId, state.state, 'state');
    }

    // Watch theme changes
    if (state.theme) {
      this.watchProperty(elementId, state.theme, 'theme');
    }

    // Watch history changes
    if (state.history) {
      this.watchProperty(elementId, state.history, 'history');
    }

    // Watch lifecycle changes
    if (state.lifecycle) {
      this.watchProperty(elementId, state.lifecycle, 'lifecycle');
    }
  }

  /**
   * Watch a property for changes
   */
  private watchProperty(elementId: string, obj: any, namespace: string) {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      let currentValue = typeof value === 'function' ? value() : value;

      // Poll for changes (simple approach - could use Proxy for better performance)
      setInterval(() => {
        const newValue = typeof value === 'function' ? value() : obj[key];

        if (newValue !== currentValue) {
          this.recordStateChange({
            elementId,
            property: `${namespace}.${key}`,
            oldValue: currentValue,
            newValue,
            timestamp: Date.now()
          });

          currentValue = newValue;
        }
      }, 100);
    });
  }

  /**
   * Record a state change
   */
  private recordStateChange(change: StateChange) {
    this.stateHistory.push(change);

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Notify DevTools
    this.notifyDevTools({
      type: 'state-changed',
      data: change
    });
  }

  /**
   * Execute a query from DevTools
   */
  public executeQuery(config: QueryConfig): any[] {
    if (!window.minimactQuery?.domQuery) {
      return [];
    }

    try {
      let query = window.minimactQuery.domQuery().from(config.selector);

      // Apply filters
      if (config.filters) {
        config.filters.forEach(filter => {
          const predicate = this.buildPredicate(filter);
          query = query.where(predicate);
        });
      }

      // Apply ordering
      if (config.orderBy) {
        const fn = this.buildOrderByFunction(config.orderBy.property);
        query = query.orderBy(fn, config.orderBy.direction);
      }

      // Apply limit
      if (config.limit) {
        query = query.limit(config.limit);
      }

      // Execute and serialize results
      const results = query.selectAll();
      return results.map((el: any) => this.serializeElement(el));
    } catch (error) {
      console.error('[Minimact DevTools] Query execution failed:', error);
      return [];
    }
  }

  /**
   * Build a WHERE predicate from filter config
   */
  private buildPredicate(filter: { property: string; operator: string; value: any }): (el: any) => boolean {
    const { property, operator, value } = filter;

    return (el: any) => {
      const propValue = this.getNestedProperty(el, property);

      switch (operator) {
        case '=': return propValue === value;
        case '!=': return propValue !== value;
        case '>': return propValue > value;
        case '<': return propValue < value;
        case '>=': return propValue >= value;
        case '<=': return propValue <= value;
        case 'contains': return String(propValue).includes(value);
        default: return false;
      }
    };
  }

  /**
   * Build an ORDER BY function from property path
   */
  private buildOrderByFunction(property: string): (el: any) => any {
    return (el: any) => this.getNestedProperty(el, property);
  }

  /**
   * Get nested property value (e.g., "history.changeCount")
   */
  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Get available trackers for an element
   */
  private getAvailableTrackers(state: any): string[] {
    const trackers: string[] = [];

    if (state.state) trackers.push('pseudo-state');
    if (state.theme) trackers.push('theme');
    if (state.breakpoint) trackers.push('breakpoint');
    if (state.history) trackers.push('history');
    if (state.lifecycle) trackers.push('lifecycle');

    return trackers;
  }

  /**
   * Serialize element for DevTools
   */
  private serializeElement(state: any): any {
    const element = state.element || state._element;

    return {
      tagName: element?.tagName?.toLowerCase(),
      className: element?.className,
      id: element?.id,
      attributes: this.serializeAttributes(element),
      classList: state.classList || [],
      isIntersecting: state.isIntersecting,
      childrenCount: state.childrenCount,
      state: state.state ? {
        hover: state.state.hover,
        focus: state.state.focus,
        active: state.state.active,
        disabled: state.state.disabled
      } : undefined,
      theme: state.theme ? {
        isDark: state.theme.isDark,
        reducedMotion: state.theme.reducedMotion
      } : undefined,
      history: state.history ? {
        changeCount: state.history.changeCount,
        changesPerSecond: state.history.changesPerSecond,
        ageInSeconds: state.history.ageInSeconds
      } : undefined,
      lifecycle: state.lifecycle ? {
        lifecycleState: state.lifecycle.lifecycleState,
        timeInState: state.lifecycle.timeInState
      } : undefined
    };
  }

  /**
   * Serialize element attributes
   */
  private serializeAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};

    if (element?.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attrs[attr.name] = attr.value;
      }
    }

    return attrs;
  }

  /**
   * Get state history for an element
   */
  public getHistory(elementId: string, limit?: number): StateChange[] {
    const history = this.stateHistory.filter(change => change.elementId === elementId);
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get current state for an element
   */
  public getElement(elementId: string): any {
    const registration = this.elements.get(elementId);
    if (!registration) return null;

    // Find the DomElementState from registry
    const allStates = window.minimactPunch?.getAllDomElementStates?.() || [];
    const state = allStates.find((s: any) =>
      (s.element || s._element) === registration.element
    );

    return state ? this.serializeElement(state) : null;
  }

  /**
   * Setup message listener for DevTools panel
   */
  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (!event.data.type?.startsWith('minimact-devtools-')) return;

      const { type, data, requestId } = event.data;

      let response: any;

      switch (type) {
        case 'minimact-devtools-query':
          response = this.executeQuery(data);
          break;

        case 'minimact-devtools-get-element':
          response = this.getElement(data.elementId);
          break;

        case 'minimact-devtools-get-history':
          response = this.getHistory(data.elementId, data.limit);
          break;

        case 'minimact-devtools-get-all-elements':
          response = Array.from(this.elements.entries()).map(([id, reg]) => ({
            id,
            selector: reg.selector,
            trackers: reg.trackers
          }));
          break;
      }

      this.notifyDevTools({
        type: 'response',
        requestId,
        data: response
      });
    });
  }

  /**
   * Send message to DevTools panel
   */
  private notifyDevTools(message: any) {
    window.postMessage({
      source: 'minimact-devtools-agent',
      ...message
    }, '*');
  }
}

// Initialize agent
if (typeof window !== 'undefined') {
  window.__MINIMACT_DEVTOOLS__ = new MinimactDevToolsAgent();
  console.log('[Minimact DevTools] Agent initialized 🔭🌵');
}
