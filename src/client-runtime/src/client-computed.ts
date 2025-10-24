/**
 * Client-Computed State Manager
 *
 * Manages variables that are computed on the client using external libraries
 * (lodash, moment, etc.) and syncs them to the server for SSR.
 *
 * This enables Option 1 auto-detection: developers use external libraries
 * naturally, and the system automatically handles client-server sync.
 */

/**
 * A function that computes a value based on component state
 */
export type ComputeFunction = () => any;

/**
 * Registry entry for a single client-computed variable
 */
interface ClientComputedVariable {
  varName: string;
  computeFn: ComputeFunction;
  lastValue?: any;
  dependencies?: string[]; // State keys this variable depends on
}

/**
 * Registry of client-computed variables per component
 */
interface ClientComputedRegistry {
  [componentId: string]: {
    [varName: string]: ClientComputedVariable;
  };
}

const computedRegistry: ClientComputedRegistry = {};

/**
 * Debug logging
 */
let debugLogging = false;

export function setDebugLogging(enabled: boolean): void {
  debugLogging = enabled;
}

function log(message: string, data?: any): void {
  if (debugLogging) {
    console.log(`[ClientComputed] ${message}`, data || '');
  }
}

/**
 * Register a client-computed variable for a component
 *
 * @param componentId - Unique identifier for the component
 * @param varName - Name of the variable being computed
 * @param computeFn - Function that computes the value
 * @param dependencies - Optional list of state keys this variable depends on
 */
export function registerClientComputed(
  componentId: string,
  varName: string,
  computeFn: ComputeFunction,
  dependencies?: string[]
): void {
  if (!computedRegistry[componentId]) {
    computedRegistry[componentId] = {};
  }

  computedRegistry[componentId][varName] = {
    varName,
    computeFn,
    dependencies
  };

  log(`Registered client-computed variable`, { componentId, varName, dependencies });
}

/**
 * Compute a single variable's value
 *
 * @param componentId - Component identifier
 * @param varName - Variable name
 * @returns The computed value or undefined if not found
 */
export function computeVariable(componentId: string, varName: string): any {
  const computed = computedRegistry[componentId]?.[varName];

  if (!computed) {
    console.warn(`[ClientComputed] Variable '${varName}' not registered for component '${componentId}'`);
    return undefined;
  }

  try {
    const value = computed.computeFn();
    computed.lastValue = value;
    log(`Computed variable`, { componentId, varName, value });
    return value;
  } catch (error) {
    console.error(`[ClientComputed] Error computing '${varName}':`, error);
    return undefined;
  }
}

/**
 * Compute all client-computed variables for a component
 *
 * @param componentId - Component identifier
 * @returns Object with all computed values
 */
export function computeAllForComponent(componentId: string): Record<string, any> {
  const computed = computedRegistry[componentId];

  if (!computed) {
    log(`No computed variables for component`, { componentId });
    return {};
  }

  const result: Record<string, any> = {};

  for (const [varName, variable] of Object.entries(computed)) {
    try {
      const value = variable.computeFn();
      variable.lastValue = value;
      result[varName] = value;
    } catch (error) {
      console.error(`[ClientComputed] Error computing '${varName}':`, error);
      result[varName] = undefined;
    }
  }

  log(`Computed all variables`, { componentId, result });
  return result;
}

/**
 * Compute only variables that depend on a specific state key
 *
 * @param componentId - Component identifier
 * @param changedStateKey - State key that changed
 * @returns Object with affected computed values
 */
export function computeDependentVariables(
  componentId: string,
  changedStateKey: string
): Record<string, any> {
  const computed = computedRegistry[componentId];

  if (!computed) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const [varName, variable] of Object.entries(computed)) {
    // If no dependencies specified, assume it depends on everything
    const shouldRecompute = !variable.dependencies ||
                           variable.dependencies.includes(changedStateKey);

    if (shouldRecompute) {
      try {
        const value = variable.computeFn();
        variable.lastValue = value;
        result[varName] = value;
        log(`Recomputed dependent variable`, { componentId, varName, changedStateKey, value });
      } catch (error) {
        console.error(`[ClientComputed] Error recomputing '${varName}':`, error);
        result[varName] = undefined;
      }
    }
  }

  return result;
}

/**
 * Get the last computed value without recomputing
 *
 * @param componentId - Component identifier
 * @param varName - Variable name
 * @returns The last computed value or undefined
 */
export function getLastValue(componentId: string, varName: string): any {
  return computedRegistry[componentId]?.[varName]?.lastValue;
}

/**
 * Get all last computed values without recomputing
 *
 * @param componentId - Component identifier
 * @returns Object with all last computed values
 */
export function getAllLastValues(componentId: string): Record<string, any> {
  const computed = computedRegistry[componentId];

  if (!computed) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const [varName, variable] of Object.entries(computed)) {
    result[varName] = variable.lastValue;
  }

  return result;
}

/**
 * Check if a component has any client-computed variables
 *
 * @param componentId - Component identifier
 * @returns True if component has computed variables
 */
export function hasClientComputed(componentId: string): boolean {
  return !!computedRegistry[componentId] &&
         Object.keys(computedRegistry[componentId]).length > 0;
}

/**
 * Get list of all computed variable names for a component
 *
 * @param componentId - Component identifier
 * @returns Array of variable names
 */
export function getComputedVariableNames(componentId: string): string[] {
  const computed = computedRegistry[componentId];
  return computed ? Object.keys(computed) : [];
}

/**
 * Clear all computed variables for a component
 * Used when component is unmounted
 *
 * @param componentId - Component identifier
 */
export function clearComponent(componentId: string): void {
  delete computedRegistry[componentId];
  log(`Cleared component`, { componentId });
}

/**
 * Clear all computed variables (for testing/cleanup)
 */
export function clearAll(): void {
  Object.keys(computedRegistry).forEach(key => delete computedRegistry[key]);
  log('Cleared all computed variables');
}

/**
 * Get debug info about registered computations
 * Useful for dev tools / debugging
 */
export function getDebugInfo(): {
  componentCount: number;
  components: Record<string, { variableCount: number; variables: string[] }>;
} {
  const components: Record<string, { variableCount: number; variables: string[] }> = {};

  for (const [componentId, computed] of Object.entries(computedRegistry)) {
    const variables = Object.keys(computed);
    components[componentId] = {
      variableCount: variables.length,
      variables
    };
  }

  return {
    componentCount: Object.keys(computedRegistry).length,
    components
  };
}
