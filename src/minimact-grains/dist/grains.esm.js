import { useRef, useEffect, useState } from '@minimact/core';

/**
 * Grain Registry Implementation
 *
 * Singleton that manages all active grains, their navigation chains,
 * and optional shared learning fields.
 */
class GrainRegistryImpl {
    constructor(config = {}) {
        this.grains = new Map();
        this.navigationChains = new Map();
        this.config = {
            enableSharedFields: false,
            enableSerialization: true,
            maxGrainHistory: 1000,
            ...config
        };
        if (this.config.enableSharedFields) {
            this.sharedFields = {
                globalProbabilityField: {},
                globalVectorField: [],
                syncEnabled: true
            };
        }
    }
    /**
     * Get grain by ID
     */
    getGrain(grainId) {
        return this.grains.get(grainId);
    }
    /**
     * Register new grain
     */
    registerGrain(grain) {
        this.grains.set(grain.grainId, grain);
        // Initialize navigation chain
        this.navigationChains.set(grain.grainId, {
            grainId: grain.grainId,
            path: grain.navigatedFrom ? [grain.navigatedFrom] : [],
            rewards: [],
            timestamps: [grain.timestamp]
        });
        console.log(`[Grains] Registered grain: ${grain.grainId} (type: ${grain.type})`);
    }
    /**
     * Update grain state
     */
    updateGrain(grainId, updates) {
        const grain = this.grains.get(grainId);
        if (!grain) {
            console.warn(`[Grains] Cannot update non-existent grain: ${grainId}`);
            return;
        }
        Object.assign(grain, updates);
        this.grains.set(grainId, grain);
    }
    /**
     * Freeze grain (preserve state, stop execution)
     */
    freezeGrain(grainId) {
        this.updateGrain(grainId, { status: 'frozen' });
        console.log(`[Grains] Frozen grain: ${grainId}`);
    }
    /**
     * Activate frozen grain
     */
    activateGrain(grainId) {
        this.updateGrain(grainId, { status: 'active' });
        console.log(`[Grains] Activated grain: ${grainId}`);
    }
    /**
     * Destroy grain (remove from registry)
     */
    destroyGrain(grainId) {
        const grain = this.grains.get(grainId);
        if (!grain)
            return;
        // Destroy all children first (recursive)
        grain.childIds.forEach(childId => this.destroyGrain(childId));
        // Remove from parent's children
        if (grain.parentId) {
            const parent = this.grains.get(grain.parentId);
            if (parent) {
                parent.childIds = parent.childIds.filter(id => id !== grainId);
            }
        }
        // Mark as destroyed
        this.updateGrain(grainId, { status: 'destroyed' });
        // Remove from registry
        this.grains.delete(grainId);
        this.navigationChains.delete(grainId);
        console.log(`[Grains] Destroyed grain: ${grainId}`);
    }
    /**
     * Get all active grains
     */
    getActiveGrains() {
        return Array.from(this.grains.values()).filter(g => g.status === 'active');
    }
    /**
     * Get all grains by type
     */
    getGrainsByType(type) {
        return Array.from(this.grains.values()).filter(g => g.type === type);
    }
    /**
     * Get navigation chain for a grain
     */
    getNavigationChain(grainId) {
        return this.navigationChains.get(grainId);
    }
    /**
     * Add navigation step to chain
     */
    addNavigationStep(fromId, toId) {
        const chain = this.navigationChains.get(toId);
        if (chain) {
            chain.path.push(fromId);
            chain.timestamps.push(Date.now());
        }
    }
    /**
     * Clear all grains
     */
    clear() {
        this.grains.clear();
        this.navigationChains.clear();
        console.log('[Grains] Registry cleared');
    }
    /**
     * Get registry statistics
     */
    getStats() {
        return {
            totalGrains: this.grains.size,
            activeGrains: this.getActiveGrains().length,
            frozenGrains: Array.from(this.grains.values()).filter(g => g.status === 'frozen').length,
            navigationChains: this.navigationChains.size
        };
    }
    /**
     * Export registry state (for serialization)
     */
    exportState() {
        return {
            grains: Array.from(this.grains.entries()),
            navigationChains: Array.from(this.navigationChains.entries()),
            sharedFields: this.sharedFields,
            timestamp: Date.now()
        };
    }
    /**
     * Import registry state (for deserialization)
     */
    importState(state) {
        this.grains = new Map(state.grains);
        this.navigationChains = new Map(state.navigationChains);
        this.sharedFields = state.sharedFields;
        console.log('[Grains] Registry state imported');
    }
}
// Singleton instance
let registryInstance = null;
/**
 * Create grain registry with config
 */
function createGrainRegistry(config) {
    if (!registryInstance) {
        registryInstance = new GrainRegistryImpl(config);
    }
    return registryInstance;
}
/**
 * Get grain registry instance
 */
function getGrainRegistry() {
    if (!registryInstance) {
        registryInstance = new GrainRegistryImpl();
    }
    return registryInstance;
}
/**
 * Reset grain registry (for testing)
 */
function resetGrainRegistry() {
    registryInstance = null;
}

let grainCounter = 0;
/**
 * Generate unique grain ID
 */
function generateGrainId(type) {
    return `${type}:${++grainCounter}:${Date.now()}`;
}
/**
 * Spawn a new grain
 *
 * Creates a new grain instance in the registry with the given type,
 * component, and options.
 *
 * @param type - Grain type identifier (e.g., 'CounterGrain', 'ExplorerAgent')
 * @param component - Grain component function
 * @param options - Spawn configuration options
 * @returns Unique grain ID
 */
function spawnGrain(type, component, options = {}) {
    const registry = getGrainRegistry();
    const grainId = generateGrainId(type);
    const grain = {
        grainId,
        type,
        state: options.initialState || {},
        spawnParams: options,
        parentId: options.parentId,
        childIds: [],
        spawnedBy: options.spawnedBy,
        timestamp: Date.now(),
        status: 'active',
        probabilityField: options.probabilityField,
        vectorField: options.vectorField,
        metadata: options.metadata
    };
    // Register in parent's children
    if (options.parentId) {
        const parent = registry.getGrain(options.parentId);
        if (parent) {
            parent.childIds.push(grainId);
        }
    }
    registry.registerGrain(grain);
    console.log(`[Grains] Spawned grain: ${grainId} (type: ${type})`);
    return grainId;
}
/**
 * Destroy a grain
 *
 * Removes the grain from the registry and destroys all its children.
 *
 * @param grainId - ID of grain to destroy
 */
function destroyGrain(grainId) {
    const registry = getGrainRegistry();
    registry.destroyGrain(grainId);
}
/**
 * Freeze a grain
 *
 * Preserves the grain's state but stops its execution.
 * Useful for navigation - freeze current grain before activating next.
 *
 * @param grainId - ID of grain to freeze
 */
function freezeGrain(grainId) {
    const registry = getGrainRegistry();
    registry.freezeGrain(grainId);
}
/**
 * Activate a frozen grain
 *
 * Resumes execution of a frozen grain.
 *
 * @param grainId - ID of grain to activate
 */
function activateGrain(grainId) {
    const registry = getGrainRegistry();
    registry.activateGrain(grainId);
}
/**
 * Get grain state
 *
 * Retrieves the current state of a grain.
 *
 * @param grainId - ID of grain
 * @returns Grain state or undefined if not found
 */
function getGrainState(grainId) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    return grain?.state;
}
/**
 * Update grain state
 *
 * Updates a grain's state. Typically called by hooks internally.
 *
 * @param grainId - ID of grain
 * @param state - New state
 */
function updateGrainState(grainId, state) {
    const registry = getGrainRegistry();
    registry.updateGrain(grainId, { state });
}
/**
 * Get all active grains
 *
 * Returns all grains with status 'active'.
 *
 * @returns Array of active grain instances
 */
function getActiveGrains() {
    const registry = getGrainRegistry();
    return registry.getActiveGrains();
}
/**
 * Get grains by type
 *
 * Returns all grains of a specific type.
 *
 * @param type - Grain type identifier
 * @returns Array of grain instances matching the type
 */
function getGrainsByType(type) {
    const registry = getGrainRegistry();
    return registry.getGrainsByType(type);
}

/**
 * Current grain ID (thread-local state)
 */
let currentGrainId = null;
/**
 * useGrain Hook
 *
 * Binds a React component to a grain in the registry.
 * This establishes the component as the "execution context" for the grain,
 * allowing other hooks (useGrainReducer, useGrainNavigation) to access
 * the current grain ID.
 *
 * @param grainId - Unique grain identifier
 *
 * @example
 * ```tsx
 * function MyGrain({ grainId }: { grainId: string }) {
 *   useGrain(grainId);
 *
 *   const [state, dispatch] = useGrainReducer(reducer, initialState);
 *
 *   return <div>Grain: {grainId}</div>;
 * }
 * ```
 */
function useGrain(grainId) {
    const registry = getGrainRegistry();
    const isRegistered = useRef(false);
    useEffect(() => {
        if (!isRegistered.current) {
            // Set as current grain context
            currentGrainId = grainId;
            const grain = registry.getGrain(grainId);
            if (!grain) {
                console.warn(`[useGrain] Grain ${grainId} not found in registry`);
            }
            else {
                console.log(`[useGrain] Bound to grain: ${grainId} (type: ${grain.type})`);
            }
            isRegistered.current = true;
        }
        // Cleanup: clear current grain context
        return () => {
            currentGrainId = null;
        };
    }, [grainId, registry]);
}
/**
 * Get current grain ID
 *
 * Returns the grain ID of the currently executing grain component.
 * This is used internally by other hooks to access grain context.
 *
 * @returns Current grain ID or null if outside grain context
 */
function getCurrentGrainId() {
    return currentGrainId;
}
/**
 * Set current grain ID (for testing/internal use)
 */
function setCurrentGrainId(grainId) {
    currentGrainId = grainId;
}

/**
 * useGrainReducer Hook
 *
 * Reducer-based state management for grains.
 * Built on top of useState, but with reducer pattern.
 *
 * This ensures that grain state is:
 * 1. Deterministic (reducer-based)
 * 2. Trackable (in registry)
 * 3. Serializable (can be saved/loaded)
 * 4. Debuggable (can inspect via registry)
 *
 * @param reducer - Reducer function (state, action) => newState
 * @param initialState - Initial state value
 * @returns [state, dispatch] tuple
 *
 * @example
 * ```tsx
 * type State = { count: number };
 * type Action = { type: 'increment' } | { type: 'decrement' };
 *
 * function counterReducer(state: State, action: Action): State {
 *   switch (action.type) {
 *     case 'increment': return { count: state.count + 1 };
 *     case 'decrement': return { count: state.count - 1 };
 *     default: return state;
 *   }
 * }
 *
 * function CounterGrain({ grainId }) {
 *   useGrain(grainId);
 *   const [state, dispatch] = useGrainReducer(counterReducer, { count: 0 });
 *
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */
function useGrainReducer(reducer, initialState, reducerName) {
    const [state, setState] = useState(initialState);
    const grainId = getCurrentGrainId();
    // Create dispatch function
    const dispatch = (action) => {
        setState(currentState => reducer(currentState, action));
    };
    // Sync state to registry whenever it changes
    useEffect(() => {
        if (grainId) {
            const registry = getGrainRegistry();
            registry.updateGrain(grainId, {
                state,
                reducerName
            });
        }
    }, [state, grainId, reducerName]);
    return [state, dispatch];
}

/**
 * useGrainNavigation Hook
 *
 * Enables autonomous navigation for grains.
 * The grain can decide where to navigate next based on its internal logic,
 * learning fields, or external conditions.
 *
 * @param navigationFn - Function that returns next grain type or null
 *
 * @example
 * ```tsx
 * function ExplorerGrain({ grainId }) {
 *   useGrain(grainId);
 *
 *   const [hasFoundTarget, setHasFoundTarget] = useState(false);
 *
 *   useGrainNavigation(() => {
 *     if (hasFoundTarget) {
 *       return 'SuccessGrain'; // Navigate to success grain
 *     }
 *     return null; // Stay on current grain
 *   });
 *
 *   return <div>Exploring...</div>;
 * }
 * ```
 */
function useGrainNavigation(navigationFn) {
    const grainId = getCurrentGrainId();
    useEffect(() => {
        if (grainId) {
            const registry = getGrainRegistry();
            registry.updateGrain(grainId, { navigationFn });
        }
    }, [grainId, navigationFn]);
}
/**
 * Navigate a grain
 *
 * Executes the grain's navigation function and returns the next grain type.
 * Freezes the current grain if navigation occurs.
 *
 * @param fromId - ID of grain to navigate from
 * @returns Next grain type or null if no navigation
 */
function navigateGrain(fromId) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(fromId);
    if (!grain || !grain.navigationFn) {
        return null;
    }
    // Execute navigation function
    const nextGrainType = grain.navigationFn();
    if (nextGrainType) {
        // Freeze current grain (preserve state)
        freezeGrain(fromId);
        // Track navigation in chain
        registry.addNavigationStep(fromId, nextGrainType);
        console.log(`[Navigation] ${fromId} → ${nextGrainType}`);
        return nextGrainType;
    }
    return null;
}
/**
 * Get grain's current navigation function
 *
 * @param grainId - ID of grain
 * @returns Navigation function or undefined
 */
function getGrainNavigationFn(grainId) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    return grain?.navigationFn;
}

/**
 * Vector Field Operations
 *
 * Core mathematical operations for vector fields in grains.
 * These enable spatial probability networks through similarity metrics.
 */
/**
 * Cosine Similarity
 *
 * Measures similarity between two vectors in [-1, 1] range.
 * - 1.0 = identical direction
 * - 0.0 = orthogonal
 * - -1.0 = opposite direction
 *
 * This is the CORE of spatial probability routing!
 * Grains navigate toward other grains with similar vector fields.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score in [-1, 1]
 *
 * @example
 * ```ts
 * const similarity = cosineSimilarity([1, 0, 0], [0, 1, 0]);
 * // Returns 0 (orthogonal vectors)
 *
 * const similarity2 = cosineSimilarity([1, 2, 3], [2, 4, 6]);
 * // Returns 1.0 (parallel vectors)
 * ```
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    if (vecA.length === 0) {
        return 0;
    }
    // Compute dot product
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    // Compute magnitudes
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    // Handle zero vectors
    if (magA === 0 || magB === 0) {
        return 0;
    }
    return dotProduct / (magA * magB);
}
/**
 * Euclidean Distance
 *
 * Measures straight-line distance between two vectors.
 * Lower = more similar.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Distance (non-negative)
 *
 * @example
 * ```ts
 * const distance = euclideanDistance([0, 0], [3, 4]);
 * // Returns 5.0 (3-4-5 triangle)
 * ```
 */
function euclideanDistance(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    return Math.sqrt(vecA.reduce((sum, a, i) => sum + Math.pow(a - vecB[i], 2), 0));
}
/**
 * Normalize Vector
 *
 * Scales vector to unit length (magnitude = 1).
 * Useful for comparing directions independent of magnitude.
 *
 * @param vec - Vector to normalize
 * @returns Normalized vector (unit length)
 *
 * @example
 * ```ts
 * const normalized = normalizeVector([3, 4]);
 * // Returns [0.6, 0.8] (magnitude = 1)
 * ```
 */
function normalizeVector(vec) {
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) {
        return vec; // Cannot normalize zero vector
    }
    return vec.map(v => v / magnitude);
}
/**
 * Tune Vector Field
 *
 * Gradually adjusts current field toward target field.
 * This is how Hebbian learning emerges - fields that fire together
 * get tuned toward each other!
 *
 * @param currentField - Current vector field
 * @param targetField - Target vector field (reward direction)
 * @param learningRate - How fast to adjust (0-1), default 0.1
 * @returns Updated vector field
 *
 * @example
 * ```ts
 * let field = [1, 0, 0];
 * const target = [0, 1, 0];
 *
 * // Over multiple updates, field gradually points toward target
 * field = tuneVectorField(field, target, 0.1);
 * field = tuneVectorField(field, target, 0.1);
 * field = tuneVectorField(field, target, 0.1);
 * // field now closer to [0, 1, 0]
 * ```
 */
function tuneVectorField(currentField, targetField, learningRate = 0.1) {
    if (currentField.length !== targetField.length) {
        throw new Error(`Vector dimension mismatch: ${currentField.length} vs ${targetField.length}`);
    }
    // Gradient descent toward target
    return currentField.map((val, i) => val + learningRate * (targetField[i] - val));
}
/**
 * Dot Product
 *
 * Projects one vector onto another.
 * Used internally by cosine similarity.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Dot product
 */
function dotProduct(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
}
/**
 * Vector Magnitude
 *
 * Computes the length of a vector.
 *
 * @param vec - Vector
 * @returns Magnitude (length)
 */
function magnitude(vec) {
    return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
}
/**
 * Add Vectors
 *
 * Element-wise vector addition.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Sum vector
 */
function addVectors(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    return vecA.map((a, i) => a + vecB[i]);
}
/**
 * Subtract Vectors
 *
 * Element-wise vector subtraction.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Difference vector
 */
function subtractVectors(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    return vecA.map((a, i) => a - vecB[i]);
}
/**
 * Scale Vector
 *
 * Multiply vector by scalar.
 *
 * @param vec - Vector
 * @param scalar - Scaling factor
 * @returns Scaled vector
 */
function scaleVector(vec, scalar) {
    return vec.map(v => v * scalar);
}

/**
 * Probability Field Management
 *
 * Manages probability distributions for grain navigation.
 * This is how grains make routing decisions!
 */
/**
 * Create Probability Field
 *
 * Normalizes raw weights into a valid probability distribution.
 * All probabilities sum to 1.0.
 *
 * @param options - Raw weights for each option
 * @returns Normalized probability distribution
 *
 * @example
 * ```ts
 * const field = createProbabilityField({
 *   'north': 10,
 *   'south': 5,
 *   'east': 5
 * });
 * // Returns: { north: 0.5, south: 0.25, east: 0.25 }
 * ```
 */
function createProbabilityField(options) {
    const total = Object.values(options).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
        // Equal distribution if all weights are zero
        const keys = Object.keys(options);
        const equalProb = 1.0 / keys.length;
        const result = {};
        keys.forEach(key => result[key] = equalProb);
        return result;
    }
    // Normalize to probabilities
    const normalized = {};
    for (const [key, val] of Object.entries(options)) {
        normalized[key] = val / total;
    }
    return normalized;
}
/**
 * Sample from Probability Field
 *
 * Randomly samples an option based on probabilities.
 * This is how grains choose which path to take!
 *
 * Uses weighted random sampling - options with higher
 * probabilities are more likely to be chosen.
 *
 * @param field - Probability distribution
 * @returns Sampled option key or null if empty
 *
 * @example
 * ```ts
 * const field = { 'exploreGrain': 0.7, 'exploitGrain': 0.3 };
 *
 * // 70% chance of returning 'exploreGrain'
 * // 30% chance of returning 'exploitGrain'
 * const choice = sampleFromProbabilityField(field);
 * ```
 */
function sampleFromProbabilityField(field) {
    const rand = Math.random();
    let cumulative = 0;
    for (const [key, prob] of Object.entries(field)) {
        cumulative += prob;
        if (rand <= cumulative) {
            return key;
        }
    }
    // Fallback (shouldn't happen with valid probabilities)
    const keys = Object.keys(field);
    return keys.length > 0 ? keys[0] : null;
}
/**
 * Update Probability Field
 *
 * Reinforcement learning! Increases probability of rewarded option.
 * This is how grains LEARN from experience!
 *
 * Positive reward → strengthen probability
 * Negative reward → weaken probability
 *
 * @param field - Current probability field
 * @param key - Option that was chosen
 * @param reward - Reward signal (-1 to 1)
 * @param learningRate - How fast to learn (0-1), default 0.1
 * @returns Updated probability field (renormalized)
 *
 * @example
 * ```ts
 * let field = { 'north': 0.5, 'south': 0.5 };
 *
 * // Grain goes north and gets reward
 * field = updateProbabilityField(field, 'north', 1.0);
 * // Now: { north: 0.55, south: 0.45 }
 *
 * // Over time, 'north' becomes dominant
 * ```
 */
function updateProbabilityField(field, key, reward, learningRate = 0.1) {
    const updated = { ...field };
    // Increase probability for rewarded option
    if (key in updated) {
        // Add reward signal (scaled by learning rate)
        updated[key] = updated[key] + learningRate * reward;
        // Clamp to [0, infinity) to prevent negative probabilities
        updated[key] = Math.max(0, updated[key]);
    }
    // Renormalize to valid probability distribution
    return createProbabilityField(updated);
}
/**
 * Merge Probability Fields
 *
 * Combines multiple probability fields with weighted average.
 * Useful for aggregating learned behaviors across multiple grains.
 *
 * @param fields - Array of probability fields
 * @param weights - Optional weights for each field (default: equal)
 * @returns Merged probability field
 *
 * @example
 * ```ts
 * const field1 = { 'north': 0.8, 'south': 0.2 };
 * const field2 = { 'north': 0.3, 'south': 0.7 };
 *
 * // Equal weighting
 * const merged = mergeProbabilityFields([field1, field2]);
 * // Returns: { north: 0.55, south: 0.45 }
 *
 * // Weighted (trust field1 more)
 * const weighted = mergeProbabilityFields([field1, field2], [0.8, 0.2]);
 * // Returns: { north: 0.7, south: 0.3 }
 * ```
 */
function mergeProbabilityFields(fields, weights) {
    if (fields.length === 0) {
        return {};
    }
    // Default to equal weights
    const fieldWeights = weights || fields.map(() => 1.0 / fields.length);
    // Collect all unique keys
    const allKeys = new Set();
    fields.forEach(field => {
        Object.keys(field).forEach(key => allKeys.add(key));
    });
    // Weighted average for each key
    const merged = {};
    allKeys.forEach(key => {
        let weightedSum = 0;
        let totalWeight = 0;
        fields.forEach((field, i) => {
            if (key in field) {
                weightedSum += field[key] * fieldWeights[i];
                totalWeight += fieldWeights[i];
            }
        });
        merged[key] = totalWeight > 0 ? weightedSum / totalWeight : 0;
    });
    // Renormalize
    return createProbabilityField(merged);
}
/**
 * Get Highest Probability Option
 *
 * Returns the option with maximum probability.
 * Useful for "exploit" mode (choose best known option).
 *
 * @param field - Probability field
 * @returns Key with highest probability or null if empty
 *
 * @example
 * ```ts
 * const field = { 'explore': 0.2, 'exploit': 0.8 };
 * const best = getHighestProbabilityOption(field);
 * // Returns: 'exploit'
 * ```
 */
function getHighestProbabilityOption(field) {
    let maxKey = null;
    let maxProb = -Infinity;
    for (const [key, prob] of Object.entries(field)) {
        if (prob > maxProb) {
            maxProb = prob;
            maxKey = key;
        }
    }
    return maxKey;
}
/**
 * Exploration vs Exploitation
 *
 * Balances between exploring new options vs exploiting known good options.
 * Epsilon-greedy strategy.
 *
 * @param field - Probability field
 * @param epsilon - Exploration rate (0-1), higher = more exploration
 * @returns Chosen option key
 *
 * @example
 * ```ts
 * const field = { 'known': 0.9, 'unknown': 0.1 };
 *
 * // With epsilon=0.1, 10% chance of exploring, 90% chance of exploiting
 * const choice = explorationVsExploitation(field, 0.1);
 * ```
 */
function explorationVsExploitation(field, epsilon = 0.1) {
    const rand = Math.random();
    if (rand < epsilon) {
        // Explore: sample from uniform distribution
        const keys = Object.keys(field);
        return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : null;
    }
    else {
        // Exploit: sample from learned probabilities
        return sampleFromProbabilityField(field);
    }
}

/**
 * Entropy Tracking
 *
 * Measures uncertainty in probability distributions and vector fields.
 * High entropy = explore, Low entropy = exploit!
 */
/**
 * Calculate Entropy
 *
 * Shannon entropy for probability distribution.
 * Measures uncertainty/randomness in the distribution.
 *
 * - High entropy (near log2(n)): Uniform distribution, maximum uncertainty
 * - Low entropy (near 0): Concentrated distribution, low uncertainty
 *
 * @param probabilities - Probability distribution
 * @returns Entropy in bits
 *
 * @example
 * ```ts
 * // Uniform distribution (maximum entropy for 4 options)
 * const maxEntropy = calculateEntropy({
 *   'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25
 * });
 * // Returns: 2.0 bits (log2(4))
 *
 * // Concentrated distribution (low entropy)
 * const lowEntropy = calculateEntropy({
 *   'a': 0.95, 'b': 0.03, 'c': 0.01, 'd': 0.01
 * });
 * // Returns: ~0.33 bits (very certain about 'a')
 * ```
 */
function calculateEntropy(probabilities) {
    let entropy = 0;
    for (const prob of Object.values(probabilities)) {
        if (prob > 0 && prob <= 1) {
            // H = -Σ p(x) * log2(p(x))
            entropy -= prob * Math.log2(prob);
        }
    }
    return entropy;
}
/**
 * Calculate Maximum Entropy
 *
 * Maximum possible entropy for N options.
 * Achieved when all options have equal probability.
 *
 * @param numOptions - Number of options
 * @returns Maximum entropy in bits
 *
 * @example
 * ```ts
 * const maxEntropy = calculateMaxEntropy(4);
 * // Returns: 2.0 (log2(4))
 * ```
 */
function calculateMaxEntropy(numOptions) {
    if (numOptions <= 0)
        return 0;
    return Math.log2(numOptions);
}
/**
 * Normalized Entropy
 *
 * Entropy normalized to [0, 1] range.
 * 1.0 = maximum uncertainty (uniform distribution)
 * 0.0 = zero uncertainty (single option has probability 1.0)
 *
 * @param probabilities - Probability distribution
 * @returns Normalized entropy [0, 1]
 *
 * @example
 * ```ts
 * const uniform = { 'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25 };
 * normalizedEntropy(uniform); // Returns: 1.0
 *
 * const certain = { 'a': 1.0 };
 * normalizedEntropy(certain); // Returns: 0.0
 * ```
 */
function normalizedEntropy(probabilities) {
    const numOptions = Object.keys(probabilities).length;
    if (numOptions <= 1)
        return 0;
    const entropy = calculateEntropy(probabilities);
    const maxEntropy = calculateMaxEntropy(numOptions);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
}
/**
 * Calculate Uncertainty
 *
 * Measures uncertainty in vector field routing.
 * High uncertainty = all target fields have similar similarity scores.
 * Low uncertainty = one target field is clearly most similar.
 *
 * This is used for exploration/exploitation balance:
 * - High uncertainty → explore (sample more)
 * - Low uncertainty → exploit (use best known path)
 *
 * @param vectorField - Current grain's vector field
 * @param targetFields - Available target grain vector fields
 * @returns Uncertainty score [0, 1]
 *
 * @example
 * ```ts
 * const myField = [1, 0, 0];
 * const targets = {
 *   'grainA': [0.9, 0.1, 0],   // Very similar
 *   'grainB': [0.5, 0.5, 0],   // Somewhat similar
 *   'grainC': [-1, 0, 0]       // Opposite
 * };
 *
 * const uncertainty = calculateUncertainty(myField, targets);
 * // Low uncertainty (grainA clearly best match)
 * ```
 */
function calculateUncertainty(vectorField, targetFields) {
    const targetList = Object.values(targetFields);
    if (targetList.length === 0)
        return 1.0; // Maximum uncertainty if no targets
    // Compute similarity to each target
    const similarities = targetList.map(target => Math.abs(cosineSimilarity(vectorField, target)));
    if (similarities.length === 1)
        return 0; // No uncertainty with single option
    // Calculate variance of similarities
    const mean = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
    const variance = similarities.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / similarities.length;
    // High variance = low uncertainty (clear best choice)
    // Low variance = high uncertainty (all similar)
    // Normalize using sigmoid-like function
    return 1.0 / (1.0 + variance * 10);
}
/**
 * Confidence Score
 *
 * Inverse of normalized entropy.
 * High confidence = low entropy (certain about choice)
 * Low confidence = high entropy (uncertain about choice)
 *
 * @param probabilities - Probability distribution
 * @returns Confidence [0, 1]
 *
 * @example
 * ```ts
 * const certain = { 'best': 0.95, 'other': 0.05 };
 * confidence(certain); // Returns: ~0.95 (high confidence)
 *
 * const uncertain = { 'a': 0.5, 'b': 0.5 };
 * confidence(uncertain); // Returns: 0.0 (low confidence)
 * ```
 */
function confidence(probabilities) {
    return 1.0 - normalizedEntropy(probabilities);
}
/**
 * Exploration Rate from Entropy
 *
 * Derives epsilon (exploration rate) from entropy.
 * High entropy → explore more
 * Low entropy → exploit more
 *
 * @param probabilities - Probability distribution
 * @param minEpsilon - Minimum exploration rate (default 0.05)
 * @param maxEpsilon - Maximum exploration rate (default 0.5)
 * @returns Epsilon for epsilon-greedy strategy
 *
 * @example
 * ```ts
 * const uniform = { 'a': 0.25, 'b': 0.25, 'c': 0.25, 'd': 0.25 };
 * explorationRateFromEntropy(uniform);
 * // Returns: 0.5 (high entropy → explore!)
 *
 * const concentrated = { 'a': 0.9, 'b': 0.1 };
 * explorationRateFromEntropy(concentrated);
 * // Returns: ~0.1 (low entropy → exploit!)
 * ```
 */
function explorationRateFromEntropy(probabilities, minEpsilon = 0.05, maxEpsilon = 0.5) {
    const norm = normalizedEntropy(probabilities);
    // Linear interpolation between min and max epsilon
    return minEpsilon + norm * (maxEpsilon - minEpsilon);
}
/**
 * KL Divergence
 *
 * Measures difference between two probability distributions.
 * Used to track how much a grain's probability field has changed.
 *
 * @param p - First probability distribution
 * @param q - Second probability distribution
 * @returns KL divergence (non-negative)
 *
 * @example
 * ```ts
 * const before = { 'a': 0.5, 'b': 0.5 };
 * const after = { 'a': 0.9, 'b': 0.1 };
 *
 * const divergence = klDivergence(before, after);
 * // Returns: ~0.51 (significant change)
 * ```
 */
function klDivergence(p, q) {
    let divergence = 0;
    for (const key of Object.keys(p)) {
        const pVal = p[key];
        const qVal = q[key] || 1e-10; // Avoid log(0)
        if (pVal > 0) {
            divergence += pVal * Math.log2(pVal / qVal);
        }
    }
    return divergence;
}

/**
 * Assign reward to a grain and backpropagate through navigation chain
 *
 * This implements **temporal credit assignment** - grains that led to
 * the rewarded outcome get their fields tuned, with exponential decay
 * based on time/distance from the reward.
 *
 * @param grainId - ID of grain receiving reward
 * @param reward - Reward value (positive = good, negative = bad)
 * @param config - Reward configuration options
 *
 * @example
 * ```tsx
 * // Grain found target location
 * useEffect(() => {
 *   const distance = euclideanDistance(position, targetPosition);
 *   if (distance < 1.0) {
 *     assignReward(grainId, 10.0); // Big reward!
 *   }
 * }, [position, targetPosition]);
 * ```
 */
function assignReward(grainId, reward, config = {}) {
    const { decayFactor = 0.9, minCausalStrength = 0.1, maxDepth = 10, learningRate = 0.1 } = config;
    const registry = getGrainRegistry();
    const chain = registry.getNavigationChain(grainId);
    if (!chain) {
        console.warn(`[Reward] No navigation chain found for grain: ${grainId}`);
        return;
    }
    // Add reward to current grain's chain
    chain.rewards.push(reward);
    console.log(`[Reward] Assigned ${reward} to grain: ${grainId}`);
    // Backpropagate through navigation chain
    let currentReward = reward;
    let depth = 0;
    for (let i = chain.path.length - 1; i >= 0 && depth < maxDepth; i--) {
        const ancestorId = chain.path[i];
        const ancestor = registry.getGrain(ancestorId);
        if (!ancestor)
            continue;
        // Apply temporal decay
        currentReward *= decayFactor;
        // Stop if reward too small (below causal threshold)
        if (Math.abs(currentReward) < minCausalStrength) {
            console.log(`[Reward] Stopped at ancestor ${ancestorId} (reward too small: ${currentReward.toFixed(4)})`);
            break;
        }
        // Update ancestor's fields based on reward
        updateGrainFields(ancestorId, currentReward, learningRate);
        console.log(`[Reward] Propagated ${currentReward.toFixed(3)} to ancestor: ${ancestorId} (depth: ${depth})`);
        depth++;
    }
    console.log(`[Reward] Backpropagation complete (depth: ${depth}, final reward: ${currentReward.toFixed(3)})`);
}
/**
 * Update grain's learning fields based on reward
 *
 * This is where **Hebbian learning** emerges:
 * - Fields that were sampled together with rewards get strengthened
 * - "Neurons that fire together, wire together"
 *
 * @param grainId - ID of grain to update
 * @param reward - Reward value (can be negative)
 * @param learningRate - How fast to update (0-1)
 */
function updateGrainFields(grainId, reward, learningRate) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    if (!grain)
        return;
    // Update probability field if it exists
    if (grain.probabilityField && grain.decisionContext?.chosenPath) {
        const chosenPath = grain.decisionContext.chosenPath;
        // Strengthen probability for rewarded choice
        const updatedField = updateProbabilityField(grain.probabilityField, chosenPath, reward, learningRate);
        registry.updateGrain(grainId, { probabilityField: updatedField });
        console.log(`  [Field Update] Probability field updated for ${grainId}`);
    }
    // Update vector field if it exists (gradient ascent toward reward)
    if (grain.vectorField && grain.decisionContext?.targetVector) {
        const targetVector = grain.decisionContext.targetVector;
        // Tune vector field toward target (or away if negative reward)
        const updatedVector = tuneVectorField(grain.vectorField, targetVector, learningRate * (reward > 0 ? 1 : -1) // Negative reward = move away
        );
        registry.updateGrain(grainId, { vectorField: updatedVector });
        console.log(`  [Field Update] Vector field updated for ${grainId}`);
    }
}
/**
 * Batch assign rewards to multiple grains
 *
 * Useful for rewarding entire navigation chains or groups of grains.
 *
 * @param rewards - Map of grainId → reward value
 * @param config - Reward configuration
 */
function batchAssignRewards(rewards, config = {}) {
    for (const [grainId, reward] of Object.entries(rewards)) {
        assignReward(grainId, reward, config);
    }
}
/**
 * Get total rewards received by a grain
 *
 * @param grainId - ID of grain
 * @returns Total reward sum or 0 if no chain
 */
function getTotalReward(grainId) {
    const registry = getGrainRegistry();
    const chain = registry.getNavigationChain(grainId);
    if (!chain)
        return 0;
    return chain.rewards.reduce((sum, r) => sum + r, 0);
}
/**
 * Get average reward per decision
 *
 * @param grainId - ID of grain
 * @returns Average reward or 0 if no rewards
 */
function getAverageReward(grainId) {
    const registry = getGrainRegistry();
    const chain = registry.getNavigationChain(grainId);
    if (!chain || chain.rewards.length === 0)
        return 0;
    const total = chain.rewards.reduce((sum, r) => sum + r, 0);
    return total / chain.rewards.length;
}

/**
 * Compute causal strength based on time to reward
 *
 * Uses exponential decay - actions closer in time to the reward
 * have higher causal strength.
 *
 * @param timeToReward - Milliseconds between action and reward
 * @param confidence - Confidence in the causal link (0-1), default 1.0
 * @param halfLife - Time in ms for 50% decay, default 10000 (10 seconds)
 * @returns Causal strength (0-1)
 *
 * @example
 * ```tsx
 * // Action happened 5 seconds before reward
 * const strength = computeCausalStrength(5000); // ~0.7
 *
 * // Action happened 20 seconds before reward
 * const strength = computeCausalStrength(20000); // ~0.25
 * ```
 */
function computeCausalStrength(timeToReward, confidence = 1.0, halfLife = 10000) {
    // Exponential decay: strength = e^(-t / halfLife)
    const timeDecay = Math.exp(-timeToReward / halfLife);
    return confidence * timeDecay;
}
/**
 * Compute temporal credit assignment for entire navigation chain
 *
 * Assigns decayed rewards to each step in the chain based on
 * time distance from the reward event.
 *
 * @param timestamps - Array of action timestamps (ms)
 * @param rewardTimestamp - When the reward occurred (ms)
 * @param baseReward - Base reward value
 * @param halfLife - Decay half-life in ms
 * @returns Array of rewards for each timestamp
 *
 * @example
 * ```tsx
 * const timestamps = [1000, 2000, 3000, 4000]; // Actions at 1s, 2s, 3s, 4s
 * const rewardTimestamp = 5000; // Reward at 5s
 * const baseReward = 10.0;
 *
 * const rewards = computeTemporalCreditAssignment(timestamps, rewardTimestamp, baseReward);
 * // [6.07, 7.41, 8.65, 9.51] - more recent actions get more credit
 * ```
 */
function computeTemporalCreditAssignment(timestamps, rewardTimestamp, baseReward, halfLife = 10000) {
    return timestamps.map(timestamp => {
        const timeToReward = rewardTimestamp - timestamp;
        // Ensure non-negative time
        if (timeToReward < 0) {
            console.warn('[CausalStrength] Negative time to reward - action after reward?');
            return 0;
        }
        const strength = computeCausalStrength(timeToReward, 1.0, halfLife);
        return baseReward * strength;
    });
}
/**
 * Compute spatial causal strength
 *
 * Actions closer in space (vector similarity) to the reward state
 * have higher causal strength.
 *
 * @param actionVector - Vector representing the action state
 * @param rewardVector - Vector representing the reward state
 * @param confidence - Confidence in the causal link (0-1)
 * @returns Causal strength (0-1)
 */
function computeSpatialCausalStrength(actionVector, rewardVector, confidence = 1.0) {
    if (actionVector.length !== rewardVector.length) {
        throw new Error('Vectors must have same dimensions');
    }
    // Compute cosine similarity
    const dotProduct = actionVector.reduce((sum, a, i) => sum + a * rewardVector[i], 0);
    const magA = Math.sqrt(actionVector.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(rewardVector.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0)
        return 0;
    const similarity = dotProduct / (magA * magB);
    // Convert similarity [-1, 1] to strength [0, 1]
    const strength = (similarity + 1) / 2;
    return confidence * strength;
}
/**
 * Compute combined temporal + spatial causal strength
 *
 * Combines time-based and space-based causal strength.
 *
 * @param timeToReward - Milliseconds between action and reward
 * @param actionVector - Vector representing the action state
 * @param rewardVector - Vector representing the reward state
 * @param temporalWeight - Weight for temporal component (0-1), default 0.5
 * @returns Combined causal strength (0-1)
 */
function computeCombinedCausalStrength(timeToReward, actionVector, rewardVector, temporalWeight = 0.5) {
    const temporalStrength = computeCausalStrength(timeToReward);
    const spatialStrength = computeSpatialCausalStrength(actionVector, rewardVector);
    return temporalWeight * temporalStrength + (1 - temporalWeight) * spatialStrength;
}
/**
 * Discount rewards by depth
 *
 * Classic reinforcement learning gamma discount factor.
 * Rewards N steps back get discounted by gamma^N.
 *
 * @param reward - Base reward value
 * @param depth - Steps back from reward
 * @param gamma - Discount factor (0-1), default 0.9
 * @returns Discounted reward
 */
function discountReward(reward, depth, gamma = 0.9) {
    return reward * Math.pow(gamma, depth);
}
/**
 * Compute eligibility trace
 *
 * Implements λ-return for more sophisticated credit assignment.
 * Combines temporal decay with eligibility traces.
 *
 * @param timeToReward - Time to reward in ms
 * @param lambda - Eligibility trace decay (0-1), default 0.9
 * @param gamma - Discount factor (0-1), default 0.9
 * @returns Eligibility value (0-1)
 */
function computeEligibilityTrace(timeToReward, lambda = 0.9, gamma = 0.9) {
    // Convert time to approximate "steps" (assuming 100ms per step)
    const steps = Math.floor(timeToReward / 100);
    // λ-return: λ^n * γ^n
    return Math.pow(lambda, steps) * Math.pow(gamma, steps);
}

/**
 * Propagate reward through entire navigation chain
 *
 * Traverses the navigation chain and assigns decayed rewards
 * to all ancestors based on temporal distance.
 *
 * @param grainId - ID of grain receiving reward
 * @param reward - Reward value
 * @param config - Reward configuration
 */
function propagateRewardThroughChain(grainId, reward, config = {}) {
    const registry = getGrainRegistry();
    const chain = registry.getNavigationChain(grainId);
    if (!chain) {
        console.warn(`[RewardPropagation] No chain for grain: ${grainId}`);
        return;
    }
    const rewardTimestamp = Date.now();
    // Compute temporal credit assignment for all ancestors
    const ancestorRewards = computeTemporalCreditAssignment(chain.timestamps, rewardTimestamp, reward);
    console.log(`[RewardPropagation] Propagating reward through chain of length ${chain.path.length}`);
    // Assign rewards to each ancestor
    chain.path.forEach((ancestorId, index) => {
        const ancestorReward = ancestorRewards[index];
        if (ancestorReward > 0) {
            assignReward(ancestorId, ancestorReward, {
                ...config,
                maxDepth: 1 // Don't double-propagate
            });
        }
    });
    // Assign reward to current grain
    assignReward(grainId, reward, {
        ...config,
        maxDepth: 1
    });
}
/**
 * Propagate reward to all grains of a specific type
 *
 * Useful for rewarding entire categories of agents.
 *
 * @param grainType - Type of grains to reward
 * @param reward - Reward value
 * @param config - Reward configuration
 */
function propagateRewardToType(grainType, reward, config = {}) {
    const registry = getGrainRegistry();
    const grains = registry.getGrainsByType(grainType);
    console.log(`[RewardPropagation] Rewarding ${grains.length} grains of type: ${grainType}`);
    grains.forEach(grain => {
        assignReward(grain.grainId, reward, config);
    });
}
/**
 * Propagate reward to parent grain
 *
 * Rewards the grain that spawned this grain.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
function propagateRewardToParent(grainId, reward, config = {}) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    if (!grain || !grain.parentId) {
        console.warn(`[RewardPropagation] No parent for grain: ${grainId}`);
        return;
    }
    console.log(`[RewardPropagation] Rewarding parent ${grain.parentId} from child ${grainId}`);
    assignReward(grain.parentId, reward, config);
}
/**
 * Propagate reward to all children
 *
 * Rewards all grains spawned by this grain.
 *
 * @param grainId - ID of parent grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
function propagateRewardToChildren(grainId, reward, config = {}) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    if (!grain || grain.childIds.length === 0) {
        console.warn(`[RewardPropagation] No children for grain: ${grainId}`);
        return;
    }
    console.log(`[RewardPropagation] Rewarding ${grain.childIds.length} children of ${grainId}`);
    grain.childIds.forEach(childId => {
        assignReward(childId, reward, config);
    });
}
/**
 * Propagate reward through sibling grains
 *
 * Rewards all grains that share the same parent.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param config - Reward configuration
 */
function propagateRewardToSiblings(grainId, reward, config = {}) {
    const registry = getGrainRegistry();
    const grain = registry.getGrain(grainId);
    if (!grain || !grain.parentId) {
        console.warn(`[RewardPropagation] No parent for grain: ${grainId}`);
        return;
    }
    const parent = registry.getGrain(grain.parentId);
    if (!parent)
        return;
    const siblings = parent.childIds.filter(id => id !== grainId);
    console.log(`[RewardPropagation] Rewarding ${siblings.length} siblings of ${grainId}`);
    siblings.forEach(siblingId => {
        assignReward(siblingId, reward, config);
    });
}
/**
 * Propagate negative reward (punishment)
 *
 * Convenience function for punishing grains.
 *
 * @param grainId - ID of grain
 * @param punishment - Punishment magnitude (will be negated)
 * @param config - Reward configuration
 */
function punishGrain(grainId, punishment, config = {}) {
    assignReward(grainId, -Math.abs(punishment), config);
}
/**
 * Delayed reward propagation
 *
 * Assigns reward after a delay. Useful for long-term rewards.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param delayMs - Delay in milliseconds
 * @param config - Reward configuration
 * @returns Promise that resolves when reward is assigned
 */
function delayedReward(grainId, reward, delayMs, config = {}) {
    return new Promise(resolve => {
        setTimeout(() => {
            assignReward(grainId, reward, config);
            resolve();
        }, delayMs);
    });
}
/**
 * Conditional reward
 *
 * Only assigns reward if condition is met.
 *
 * @param grainId - ID of grain
 * @param reward - Reward value
 * @param condition - Condition function
 * @param config - Reward configuration
 */
function conditionalReward(grainId, reward, condition, config = {}) {
    if (condition()) {
        assignReward(grainId, reward, config);
    }
}

/**
 * @minimact/grains - Autonomous, stateful, spawnable grain system
 *
 * Declarative agents with probabilistic routing and reward-based learning.
 * Think: Orleans + React Hooks + Spatial Probability Networks
 *
 * @packageDocumentation
 */
// Core exports
// Version
const VERSION = '0.1.0';
const MES_CERTIFICATION = 'Bronze'; // Minimact Extension Standards
/**
 * Example usage:
 *
 * ```tsx
 * import { spawnGrain, useGrain, useGrainReducer, useGrainNavigation } from '@minimact/grains';
 *
 * // Define grain component
 * function CounterGrain({ grainId }: { grainId: string }) {
 *   useGrain(grainId);
 *
 *   const [state, dispatch] = useGrainReducer(
 *     (state, action) => {
 *       switch (action.type) {
 *         case 'increment': return { count: state.count + 1 };
 *         case 'decrement': return { count: state.count - 1 };
 *         default: return state;
 *       }
 *     },
 *     { count: 0 }
 *   );
 *
 *   useGrainNavigation(() => {
 *     if (state.count >= 10) {
 *       return 'SuccessGrain';
 *     }
 *     return null;
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Count: {state.count}</h2>
 *       <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *     </div>
 *   );
 * }
 *
 * // Spawn grain
 * const grainId = spawnGrain('Counter', CounterGrain, {
 *   initialState: { count: 0 }
 * });
 * ```
 */

export { MES_CERTIFICATION, VERSION, activateGrain, addVectors, assignReward, batchAssignRewards, calculateEntropy, calculateMaxEntropy, calculateUncertainty, computeCausalStrength, computeCombinedCausalStrength, computeEligibilityTrace, computeSpatialCausalStrength, computeTemporalCreditAssignment, conditionalReward, confidence, cosineSimilarity, createGrainRegistry, createProbabilityField, delayedReward, destroyGrain, discountReward, dotProduct, euclideanDistance, explorationRateFromEntropy, explorationVsExploitation, freezeGrain, getActiveGrains, getAverageReward, getCurrentGrainId, getGrainNavigationFn, getGrainRegistry, getGrainState, getGrainsByType, getHighestProbabilityOption, getTotalReward, klDivergence, magnitude, mergeProbabilityFields, navigateGrain, normalizeVector, normalizedEntropy, propagateRewardThroughChain, propagateRewardToChildren, propagateRewardToParent, propagateRewardToSiblings, propagateRewardToType, punishGrain, resetGrainRegistry, sampleFromProbabilityField, scaleVector, setCurrentGrainId, spawnGrain, subtractVectors, tuneVectorField, updateGrainState, updateProbabilityField, useGrain, useGrainNavigation, useGrainReducer };
