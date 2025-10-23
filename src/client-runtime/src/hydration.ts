import { ComponentMetadata } from './types';
import { ClientStateManager } from './client-state';

/**
 * Handles hydration of server-rendered HTML with client interactivity
 * Identifies and manages client zones, server zones, and hybrid zones
 */
export class HydrationManager {
  private clientState: ClientStateManager;
  private components: Map<string, ComponentMetadata>;
  private debugLogging: boolean;

  constructor(clientState: ClientStateManager, options: { debugLogging?: boolean } = {}) {
    this.clientState = clientState;
    this.components = new Map();
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Hydrate a component root element
   */
  hydrateComponent(componentId: string, rootElement: HTMLElement): void {
    this.log('Hydrating component', { componentId });

    // The actual component element is the first child of the container
    // (rootElement is #minimact-root, first child is the actual component div)
    const componentElement = rootElement.firstElementChild as HTMLElement;
    if (!componentElement) {
      console.error('[Minimact Hydration] No component element found in root');
      return;
    }

    // Create component metadata
    const metadata: ComponentMetadata = {
      componentId,
      element: componentElement,  // Use the actual component element, not the container
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
  private hydrateClientZones(componentId: string, rootElement: HTMLElement): void {
    const clientZones = rootElement.querySelectorAll('[data-minimact-client-scope]');

    this.log('Found client zones', { count: clientZones.length });

    clientZones.forEach((zone) => {
      const element = zone as HTMLElement;

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
  private bindStateElements(componentId: string, rootElement: HTMLElement): void {
    const boundElements = rootElement.querySelectorAll('[data-bind]');

    this.log('Found bound elements', { count: boundElements.length });

    boundElements.forEach((elem) => {
      const element = elem as HTMLElement;
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
      } else {
        // Server-side binding - will be updated via patches
        this.log('Server-bound element (patch-controlled)', { element, bindKey });
      }
    });
  }

  /**
   * Check if an element is within a client scope
   */
  private isInClientScope(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;

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
  private determineBindProperty(element: HTMLElement): 'value' | 'textContent' | 'innerHTML' {
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
  private getInitialValue(element: HTMLElement): any {
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        return element.checked;
      } else if (element.type === 'number') {
        return element.valueAsNumber || 0;
      } else {
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
  dehydrateComponent(componentId: string): void {
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
  getComponent(componentId: string): ComponentMetadata | undefined {
    return this.components.get(componentId);
  }

  /**
   * Update server state for a component
   */
  updateServerState(componentId: string, key: string, value: any): void {
    const metadata = this.components.get(componentId);

    if (metadata) {
      metadata.serverState[key] = value;
      this.log('Updated server state', { componentId, key, value });
    }
  }

  /**
   * Hydrate all components on the page
   */
  hydrateAll(): void {
    const components = document.querySelectorAll('[data-minimact-component]');

    this.log('Hydrating all components', { count: components.length });

    components.forEach((element) => {
      const componentId = element.getAttribute('data-minimact-component');
      if (componentId) {
        this.hydrateComponent(componentId, element as HTMLElement);
      }
    });
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact Hydration] ${message}`, data || '');
    }
  }
}
