import { ComponentState } from './types';

/**
 * Manages client-side state (useClientState) with reactive updates
 * Handles local state that doesn't require server round-trips
 */
export class ClientStateManager {
  private states: Map<string, ComponentState>;
  private subscribers: Map<string, Map<string, Set<Function>>>;
  private debugLogging: boolean;

  constructor(options: { debugLogging?: boolean } = {}) {
    this.states = new Map();
    this.subscribers = new Map();
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Initialize client state for a component
   */
  initializeComponent(componentId: string, initialState: ComponentState = {}): void {
    this.states.set(componentId, { ...initialState });
    this.subscribers.set(componentId, new Map());
    this.log('Initialized component state', { componentId, initialState });
  }

  /**
   * Get client state value
   */
  getState(componentId: string, key: string): any {
    const componentState = this.states.get(componentId);
    return componentState ? componentState[key] : undefined;
  }

  /**
   * Set client state value and trigger updates
   */
  setState(componentId: string, key: string, value: any): void {
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
  subscribe(componentId: string, key: string, callback: (value: any, oldValue: any) => void): () => void {
    const componentSubscribers = this.subscribers.get(componentId);

    if (!componentSubscribers) {
      console.warn(`[Minimact] Component ${componentId} not initialized`);
      return () => {};
    }

    if (!componentSubscribers.has(key)) {
      componentSubscribers.set(key, new Set());
    }

    componentSubscribers.get(key)!.add(callback);
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
  private notifySubscribers(componentId: string, key: string, value: any, oldValue: any): void {
    const componentSubscribers = this.subscribers.get(componentId);

    if (!componentSubscribers) {
      return;
    }

    const keySubscribers = componentSubscribers.get(key);

    if (keySubscribers) {
      keySubscribers.forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error('[Minimact] Error in state subscriber:', error);
        }
      });
    }
  }

  /**
   * Get all state for a component
   */
  getComponentState(componentId: string): ComponentState | undefined {
    return this.states.get(componentId);
  }

  /**
   * Update multiple state values at once
   */
  updateState(componentId: string, updates: ComponentState): void {
    for (const [key, value] of Object.entries(updates)) {
      this.setState(componentId, key, value);
    }
  }

  /**
   * Clear state for a component
   */
  clearComponent(componentId: string): void {
    this.states.delete(componentId);
    this.subscribers.delete(componentId);
    this.log('Cleared component state', { componentId });
  }

  /**
   * Bind state to a DOM element's value/content
   */
  bindToElement(
    componentId: string,
    key: string,
    element: HTMLElement,
    property: 'value' | 'textContent' | 'innerHTML' = 'textContent'
  ): () => void {
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
  private updateElement(element: HTMLElement, property: string, value: any): void {
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
  bindInput(componentId: string, key: string, input: HTMLInputElement | HTMLTextAreaElement): () => void {
    // Set initial value
    const initialValue = this.getState(componentId, key);
    if (initialValue !== undefined) {
      input.value = String(initialValue);
    }

    // Listen to input changes
    const inputHandler = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
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
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact ClientState] ${message}`, data || '');
    }
  }
}
