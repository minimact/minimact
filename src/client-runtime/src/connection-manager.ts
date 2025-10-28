/**
 * Connection Manager Interface
 *
 * Abstraction over SignalR and SignalM implementations
 * This allows shared code (hooks, etc.) to work with either transport
 */

export interface IConnectionManager {
  /**
   * Start the connection
   */
  start(): Promise<void>;

  /**
   * Stop the connection
   */
  stop(): Promise<void>;

  /**
   * Invoke a server method (generic invoke for custom use cases)
   */
  invoke(methodName: string, ...args: any[]): Promise<any>;

  /**
   * Invoke a component method on the server
   */
  invokeComponentMethod(componentId: string, methodName: string, args: any[]): Promise<void>;

  /**
   * Register a component with the server
   */
  registerComponent(componentId: string): Promise<void>;

  /**
   * Update component state on the server (from useState hook)
   */
  updateComponentState(componentId: string, stateKey: string, value: any): Promise<void>;

  /**
   * Update component state with operation (push, pop, splice, etc.)
   */
  updateComponentStateWithOperation(
    componentId: string,
    stateKey: string,
    operation: string,
    args: any[]
  ): Promise<void>;

  /**
   * Update DOM element state on the server (from useDomElementState hook)
   */
  updateDomElementState(componentId: string, stateKey: string, snapshot: any): Promise<void>;

  /**
   * Update client-computed state on the server (from useComputed hook)
   */
  updateClientComputedState(componentId: string, computedValues: Record<string, any>): Promise<void>;

  /**
   * Event subscription
   */
  on(event: string, handler: Function): void;

  /**
   * Event unsubscription
   */
  off(event: string, handler: Function): void;

  /**
   * Get connection state
   */
  readonly state: string;

  /**
   * Get connection ID
   */
  readonly connectionId: string | null;

  /**
   * Access to underlying connection (for advanced use cases like useSignalR hook)
   */
  readonly connection: any;
}
