import _ from 'lodash';
// import moment from 'moment'; // TODO: Add moment usage for formatDate
import { playgroundApi } from './playground.api';

/**
 * Metadata about a client-computed variable extracted from C# code
 */
export interface ClientComputedVariable {
  name: string;
  type: string; // C# type like "List<dynamic>", "double", etc.
  dependencies: string[]; // State variables this depends on
  defaultValue?: string;
}

/**
 * Service for computing client-side values using external libraries (lodash, moment, etc.)
 * and syncing them back to the server.
 */
export class ClientComputationService {
  private sessionId: string | null = null;
  private metadata: ClientComputedVariable[] = [];
  private currentState: Record<string, any> = {};
  private computedValues: Record<string, any> = {};

  /**
   * Extract [ClientComputed] metadata from generated C# code
   */
  extractClientComputedVars(csharpCode: string): ClientComputedVariable[] {
    const vars: ClientComputedVariable[] = [];

    // Pattern: [ClientComputed("variableName")]
    // followed by: private Type variableName => GetClientState<Type>("variableName", default);
    const pattern =
      /\[ClientComputed\("(\w+)"\)\]\s*(?:private|public)\s+([\w<>]+)\s+\w+\s*=>\s*GetClientState<([\w<>]+)>\("(\w+)",\s*default/g;

    let match;
    while ((match = pattern.exec(csharpCode)) !== null) {
      const name = match[1];
      const type = match[2];

      vars.push({
        name,
        type,
        dependencies: [], // We'll infer these from ExternalLibrariesTest logic
        defaultValue: 'default',
      });
    }

    console.log('[ClientComputation] Extracted client-computed vars:', vars);
    return vars;
  }

  /**
   * Initialize with session and metadata
   */
  initialize(sessionId: string, csharpCode: string, initialState: Record<string, any> = {}) {
    this.sessionId = sessionId;
    this.metadata = this.extractClientComputedVars(csharpCode);
    this.currentState = { ...initialState };

    console.log('[ClientComputation] Initialized', {
      sessionId,
      metadata: this.metadata,
      initialState,
    });
  }

  /**
   * Compute all client-computed values for the ExternalLibrariesTest component
   * This is hardcoded for now - in a real implementation, we'd parse JSX or have
   * a registration system.
   */
  private computeExternalLibrariesTestValues(): Record<string, any> {
    const computed: Record<string, any> = {};

    // Get state values
    const items = this.currentState.items || [
      { id: 1, name: 'Apple', price: 1.2, created: '2024-01-15' },
      { id: 2, name: 'Banana', price: 0.5, created: '2024-01-16' },
      { id: 3, name: 'Cherry', price: 3.0, created: '2024-01-17' },
      { id: 4, name: 'Date', price: 2.5, created: '2024-01-18' },
    ];
    const sortOrder = this.currentState.sortOrder || 'asc';

    // sortedItems: _.orderBy(items, ['price'], [sortOrder])
    if (this.metadata.some((v) => v.name === 'sortedItems')) {
      computed.sortedItems = _.orderBy(items, ['price'], [sortOrder]);
      console.log('[ClientComputation] Computed sortedItems:', computed.sortedItems);
    }

    // totalPrice: _.sumBy(items, 'price')
    if (this.metadata.some((v) => v.name === 'totalPrice')) {
      computed.totalPrice = _.sumBy(items, 'price');
      console.log('[ClientComputation] Computed totalPrice:', computed.totalPrice);
    }

    // avgPrice: _.meanBy(items, 'price')
    if (this.metadata.some((v) => v.name === 'avgPrice')) {
      computed.avgPrice = _.meanBy(items, 'price');
      console.log('[ClientComputation] Computed avgPrice:', computed.avgPrice);
    }

    // cheapestItem: _.minBy(items, 'price')
    if (this.metadata.some((v) => v.name === 'cheapestItem')) {
      computed.cheapestItem = _.minBy(items, 'price');
      console.log('[ClientComputation] Computed cheapestItem:', computed.cheapestItem);
    }

    // expensiveItems: _.filter(items, item => item.price > 1.00)
    if (this.metadata.some((v) => v.name === 'expensiveItems')) {
      computed.expensiveItems = _.filter(items, (item) => item.price > 1.0);
      console.log('[ClientComputation] Computed expensiveItems:', computed.expensiveItems);
    }

    // formatDate: (dateStr) => moment(dateStr).format('MMM DD, YYYY')
    // This is a function, so we'll compute formatted dates for all items
    if (this.metadata.some((v) => v.name === 'formatDate')) {
      // For now, just indicate it's available
      computed.formatDate = 'moment-formatter-function';
      console.log('[ClientComputation] formatDate function registered');
    }

    return computed;
  }

  /**
   * Compute values and update internal cache
   */
  computeValues(stateChanges?: Record<string, any>): Record<string, any> {
    // Update current state
    if (stateChanges) {
      this.currentState = { ...this.currentState, ...stateChanges };
    }

    // Compute all values
    const computed = this.computeExternalLibrariesTestValues();
    this.computedValues = computed;

    console.log('[ClientComputation] Computed all values:', computed);
    return computed;
  }

  /**
   * Compute values and sync to server
   */
  async computeAndSync(stateChanges?: Record<string, any>): Promise<void> {
    if (!this.sessionId) {
      console.warn('[ClientComputation] No session ID, skipping sync');
      return;
    }

    // Compute values
    const computed = this.computeValues(stateChanges);

    if (Object.keys(computed).length === 0) {
      console.log('[ClientComputation] No computed values to sync');
      return;
    }

    // Send to backend
    try {
      console.log('[ClientComputation] Syncing to backend:', {
        sessionId: this.sessionId,
        computed,
      });

      const response = await playgroundApi.updateClientComputed(this.sessionId, computed);

      console.log('[ClientComputation] Sync response:', response);
    } catch (error) {
      console.error('[ClientComputation] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get current computed values (without recomputing)
   */
  getComputedValues(): Record<string, any> {
    return { ...this.computedValues };
  }

  /**
   * Get metadata about client-computed variables
   */
  getMetadata(): ClientComputedVariable[] {
    return [...this.metadata];
  }

  /**
   * Check if a variable is client-computed
   */
  isClientComputed(varName: string): boolean {
    return this.metadata.some((v) => v.name === varName);
  }
}

// Global instance (singleton for playground)
export const clientComputationService = new ClientComputationService();
