# @minimact/grains - Implementation Plan

## 🌾 Vision

**@minimact/grains** is a declarative, functional, spawnable grain system for building autonomous, stateful micro-apps with probabilistic routing and reward-based learning. It enables:

- **AI agent networks** with spatial probability routing
- **Adaptive UI workflows** that self-navigate
- **Cognitive graphs** with emergent behavior
- **Simulation systems** with actor-like autonomy
- **Game logic** with independent NPCs and environments

Think: **Orleans + React Hooks + Spatial Probability Networks + Actor Model**

---

## 🎯 Core Philosophy

1. **Grains are functional components** - Write them like React components with `useState`, `useEffect`, etc.
2. **Grains are spawnable** - Create instances dynamically like actors
3. **Grains are autonomous** - Each has its own isolated state and lifecycle
4. **Grains are navigable** - Self-routing logic via `useGrainNavigation()`
5. **Grains are learnable** - Built-in probability/vector fields for intelligent routing
6. **Grains are stateful** - Reducer-based state model for deterministic updates
7. **Grains are traceable** - Full causality tracking for reward propagation

---

## 📦 Package Structure

```
@minimact/grains/
├── src/
│   ├── core/
│   │   ├── GrainRegistry.ts          # Singleton registry
│   │   ├── GrainInstance.ts          # Grain metadata & state
│   │   ├── spawn.ts                  # spawnGrain(), destroyGrain()
│   │   └── lifecycle.ts              # freeze, activate, destroy
│   ├── hooks/
│   │   ├── useGrain.ts               # Register grain in runtime
│   │   ├── useGrainReducer.ts        # State management
│   │   ├── useGrainNavigation.ts     # Routing logic
│   │   └── useGrainField.ts          # Probability/vector fields
│   ├── learning/
│   │   ├── probabilityField.ts       # Probability field management
│   │   ├── vectorField.ts            # Vector field operations
│   │   ├── similarity.ts             # Cosine similarity, distance metrics
│   │   └── entropy.ts                # Uncertainty tracking
│   ├── rewards/
│   │   ├── creditAssignment.ts       # Backpropagate rewards
│   │   ├── rewardPropagation.ts      # Traverse navigation chains
│   │   └── causalStrength.ts         # Compute causal influence
│   ├── communication/
│   │   ├── messages.ts               # sendToGrain(), broadcast()
│   │   └── signals.ts                # Shared signals/global memory
│   ├── serialization/
│   │   ├── serialize.ts              # Export grain state to JSON
│   │   ├── deserialize.ts            # Hydrate grains from JSON
│   │   └── timeTravel.ts             # Replay grain history
│   └── index.ts                      # Public API exports
├── types/
│   ├── Grain.ts                      # Core type definitions
│   ├── Registry.ts                   # Registry types
│   └── Fields.ts                     # Learning field types
└── package.json
```

---

## 🏗️ Phase 1: Core Engine (Foundation)

**Goal:** Build the headless grain runtime - no UI, pure logic.

### 1.1 Type Definitions

**File:** `types/Grain.ts`

```typescript
export type GrainStatus = 'active' | 'frozen' | 'destroyed';

export interface GrainInstance<TState = any> {
  // Identity
  grainId: string;
  type: string; // Component/function name

  // State
  state: TState;
  reducerName?: string;
  spawnParams?: any;

  // Navigation
  navigationFn?: () => string | null;

  // Hierarchy
  parentId?: string;
  childIds: string[];

  // Causality Tracking
  spawnedBy?: string;
  navigatedFrom?: string;
  decisionContext?: any;
  timestamp: number;

  // Learning Fields
  probabilityField?: Record<string, number>;
  vectorField?: number[];
  entropy?: number;

  // Lifecycle
  status: GrainStatus;

  // Metadata
  metadata?: Record<string, any>;
}

export interface GrainComponent<TState = any, TProps = any> {
  (props?: TProps): JSX.Element | null;
}

export interface SpawnOptions<TState = any> {
  initialState?: TState;
  parentId?: string;
  spawnedBy?: string;
  metadata?: Record<string, any>;
  probabilityField?: Record<string, number>;
  vectorField?: number[];
}

export interface NavigationChain {
  grainId: string;
  path: string[]; // [fromId, toId, toId, ...]
  rewards: number[];
  timestamps: number[];
}
```

**File:** `types/Registry.ts`

```typescript
export interface GrainRegistry {
  grains: Map<string, GrainInstance>;
  navigationChains: Map<string, NavigationChain>;
  sharedFields?: FieldStore;
}

export interface FieldStore {
  globalProbabilityField?: Record<string, number>;
  globalVectorField?: number[];
  syncEnabled: boolean;
}

export interface RegistryConfig {
  enableSharedFields?: boolean;
  enableSerialization?: boolean;
  maxGrainHistory?: number;
}
```

### 1.2 Grain Registry (Singleton)

**File:** `core/GrainRegistry.ts`

```typescript
import { GrainInstance, GrainRegistry, NavigationChain, RegistryConfig } from '../types';

class GrainRegistryImpl implements GrainRegistry {
  grains: Map<string, GrainInstance> = new Map();
  navigationChains: Map<string, NavigationChain> = new Map();
  sharedFields?: FieldStore;
  config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
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

  // Get grain by ID
  getGrain(grainId: string): GrainInstance | undefined {
    return this.grains.get(grainId);
  }

  // Register new grain
  registerGrain(grain: GrainInstance): void {
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

  // Update grain state
  updateGrain(grainId: string, updates: Partial<GrainInstance>): void {
    const grain = this.grains.get(grainId);
    if (!grain) {
      console.warn(`[Grains] Cannot update non-existent grain: ${grainId}`);
      return;
    }

    Object.assign(grain, updates);
    this.grains.set(grainId, grain);
  }

  // Freeze grain (preserve state, stop execution)
  freezeGrain(grainId: string): void {
    this.updateGrain(grainId, { status: 'frozen' });
    console.log(`[Grains] Frozen grain: ${grainId}`);
  }

  // Activate frozen grain
  activateGrain(grainId: string): void {
    this.updateGrain(grainId, { status: 'active' });
    console.log(`[Grains] Activated grain: ${grainId}`);
  }

  // Destroy grain (remove from registry)
  destroyGrain(grainId: string): void {
    const grain = this.grains.get(grainId);
    if (!grain) return;

    // Destroy all children first
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

  // Get all active grains
  getActiveGrains(): GrainInstance[] {
    return Array.from(this.grains.values()).filter(g => g.status === 'active');
  }

  // Get navigation chain for a grain
  getNavigationChain(grainId: string): NavigationChain | undefined {
    return this.navigationChains.get(grainId);
  }

  // Add navigation step to chain
  addNavigationStep(fromId: string, toId: string): void {
    const chain = this.navigationChains.get(toId);
    if (chain) {
      chain.path.push(fromId);
      chain.timestamps.push(Date.now());
    }
  }

  // Clear all grains
  clear(): void {
    this.grains.clear();
    this.navigationChains.clear();
    console.log('[Grains] Registry cleared');
  }

  // Get registry stats
  getStats() {
    return {
      totalGrains: this.grains.size,
      activeGrains: this.getActiveGrains().length,
      frozenGrains: Array.from(this.grains.values()).filter(g => g.status === 'frozen').length,
      navigationChains: this.navigationChains.size
    };
  }
}

// Singleton instance
let registryInstance: GrainRegistryImpl | null = null;

export function createGrainRegistry(config?: RegistryConfig): GrainRegistryImpl {
  if (!registryInstance) {
    registryInstance = new GrainRegistryImpl(config);
  }
  return registryInstance;
}

export function getGrainRegistry(): GrainRegistryImpl {
  if (!registryInstance) {
    registryInstance = new GrainRegistryImpl();
  }
  return registryInstance;
}

export function resetGrainRegistry(): void {
  registryInstance = null;
}
```

### 1.3 Spawn Grain

**File:** `core/spawn.ts`

```typescript
import { GrainInstance, GrainComponent, SpawnOptions } from '../types';
import { getGrainRegistry } from './GrainRegistry';

let grainCounter = 0;

function generateGrainId(type: string): string {
  return `${type}:${++grainCounter}:${Date.now()}`;
}

export function spawnGrain<TState = any, TProps = any>(
  type: string,
  component: GrainComponent<TState, TProps>,
  options: SpawnOptions<TState> = {}
): string {
  const registry = getGrainRegistry();

  const grainId = generateGrainId(type);

  const grain: GrainInstance<TState> = {
    grainId,
    type,
    state: options.initialState || ({} as TState),
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

  console.log(`[Grains] Spawned grain: ${grainId}`);

  return grainId;
}

export function destroyGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.destroyGrain(grainId);
}

export function freezeGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.freezeGrain(grainId);
}

export function activateGrain(grainId: string): void {
  const registry = getGrainRegistry();
  registry.activateGrain(grainId);
}
```

### 1.4 useGrain Hook

**File:** `hooks/useGrain.ts`

```typescript
import { useEffect, useRef } from 'react';
import { getGrainRegistry } from '../core/GrainRegistry';

let currentGrainId: string | null = null;

export function useGrain(grainId: string): void {
  const registry = getGrainRegistry();
  const isRegistered = useRef(false);

  useEffect(() => {
    if (!isRegistered.current) {
      currentGrainId = grainId;

      const grain = registry.getGrain(grainId);
      if (!grain) {
        console.warn(`[useGrain] Grain ${grainId} not found in registry`);
      } else {
        console.log(`[useGrain] Bound to grain: ${grainId}`);
      }

      isRegistered.current = true;
    }

    return () => {
      currentGrainId = null;
    };
  }, [grainId, registry]);
}

export function getCurrentGrainId(): string | null {
  return currentGrainId;
}
```

### 1.5 useGrainReducer Hook

**File:** `hooks/useGrainReducer.ts`

```typescript
import { useReducer, useEffect, Reducer } from 'react';
import { getGrainRegistry } from '../core/GrainRegistry';
import { getCurrentGrainId } from './useGrain';

export function useGrainReducer<TState, TAction>(
  reducer: Reducer<TState, TAction>,
  initialState: TState
): [TState, React.Dispatch<TAction>] {
  const [state, dispatch] = useReducer(reducer, initialState);
  const grainId = getCurrentGrainId();

  useEffect(() => {
    if (grainId) {
      const registry = getGrainRegistry();
      registry.updateGrain(grainId, { state });
    }
  }, [state, grainId]);

  return [state, dispatch];
}
```

### 1.6 useGrainNavigation Hook

**File:** `hooks/useGrainNavigation.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { getGrainRegistry } from '../core/GrainRegistry';
import { getCurrentGrainId } from './useGrain';

export function useGrainNavigation(
  navigationFn: () => string | null
): void {
  const grainId = getCurrentGrainId();

  useEffect(() => {
    if (grainId) {
      const registry = getGrainRegistry();
      registry.updateGrain(grainId, { navigationFn });
    }
  }, [grainId, navigationFn]);
}

export function navigateGrain(fromId: string): string | null {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(fromId);

  if (!grain || !grain.navigationFn) {
    return null;
  }

  const nextGrainType = grain.navigationFn();

  if (nextGrainType) {
    // Freeze current grain
    registry.freezeGrain(fromId);

    // Track navigation
    registry.addNavigationStep(fromId, nextGrainType);

    console.log(`[Navigation] ${fromId} → ${nextGrainType}`);

    return nextGrainType;
  }

  return null;
}
```

---

## 🏗️ Phase 2: Learning & Routing

**Goal:** Add probability/vector fields, cosine similarity, and intelligent routing.

### 2.1 Vector Field Operations

**File:** `learning/vectorField.ts`

```typescript
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  return Math.sqrt(
    vecA.reduce((sum, a, i) => sum + Math.pow(a - vecB[i], 2), 0)
  );
}

export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map(v => v / magnitude);
}

export function tuneVectorField(
  currentField: number[],
  targetField: number[],
  learningRate: number = 0.1
): number[] {
  if (currentField.length !== targetField.length) {
    throw new Error('Fields must have same dimensions');
  }

  return currentField.map((val, i) =>
    val + learningRate * (targetField[i] - val)
  );
}
```

### 2.2 Probability Field Management

**File:** `learning/probabilityField.ts`

```typescript
export function createProbabilityField(
  options: Record<string, number>
): Record<string, number> {
  const total = Object.values(options).reduce((sum, val) => sum + val, 0);

  if (total === 0) return options;

  // Normalize to probabilities
  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(options)) {
    normalized[key] = val / total;
  }

  return normalized;
}

export function sampleFromProbabilityField(
  field: Record<string, number>
): string | null {
  const rand = Math.random();
  let cumulative = 0;

  for (const [key, prob] of Object.entries(field)) {
    cumulative += prob;
    if (rand <= cumulative) {
      return key;
    }
  }

  return null;
}

export function updateProbabilityField(
  field: Record<string, number>,
  key: string,
  reward: number,
  learningRate: number = 0.1
): Record<string, number> {
  const updated = { ...field };

  // Increase probability for rewarded option
  if (key in updated) {
    updated[key] = updated[key] + learningRate * reward;
  }

  // Renormalize
  return createProbabilityField(updated);
}
```

### 2.3 Entropy Tracking

**File:** `learning/entropy.ts`

```typescript
export function calculateEntropy(probabilities: Record<string, number>): number {
  let entropy = 0;

  for (const prob of Object.values(probabilities)) {
    if (prob > 0) {
      entropy -= prob * Math.log2(prob);
    }
  }

  return entropy;
}

export function calculateUncertainty(
  vectorField: number[],
  targetFields: Record<string, number[]>
): number {
  const similarities = Object.values(targetFields).map(target =>
    Math.abs(cosineSimilarity(vectorField, target))
  );

  // High uncertainty when similarities are all similar
  const mean = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
  const variance = similarities.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / similarities.length;

  return 1 / (1 + variance); // Low variance = high uncertainty
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}
```

### 2.4 useGrainField Hook

**File:** `hooks/useGrainField.ts`

```typescript
import { useState, useEffect } from 'react';
import { getGrainRegistry } from '../core/GrainRegistry';
import { getCurrentGrainId } from './useGrain';
import { cosineSimilarity } from '../learning/vectorField';
import { createProbabilityField, sampleFromProbabilityField } from '../learning/probabilityField';
import { calculateEntropy } from '../learning/entropy';

export function useGrainField(
  initialVectorField?: number[],
  initialProbabilityField?: Record<string, number>
) {
  const grainId = getCurrentGrainId();
  const registry = getGrainRegistry();

  const [vectorField, setVectorField] = useState<number[]>(
    initialVectorField || []
  );
  const [probabilityField, setProbabilityField] = useState<Record<string, number>>(
    initialProbabilityField || {}
  );
  const [entropy, setEntropy] = useState<number>(0);

  // Update registry when fields change
  useEffect(() => {
    if (grainId) {
      registry.updateGrain(grainId, {
        vectorField,
        probabilityField,
        entropy
      });
    }
  }, [grainId, vectorField, probabilityField, entropy, registry]);

  // Calculate entropy when probability field changes
  useEffect(() => {
    if (Object.keys(probabilityField).length > 0) {
      setEntropy(calculateEntropy(probabilityField));
    }
  }, [probabilityField]);

  return {
    vectorField,
    setVectorField,
    probabilityField,
    setProbabilityField,
    entropy
  };
}

export function computeNavigationProbabilities(
  currentVectorField: number[],
  targetFields: Record<string, number[]>
): Record<string, number> {
  const similarities: Record<string, number> = {};

  for (const [key, targetField] of Object.entries(targetFields)) {
    const similarity = cosineSimilarity(currentVectorField, targetField);
    // Convert similarity [-1, 1] to probability [0, 1]
    similarities[key] = (similarity + 1) / 2;
  }

  return createProbabilityField(similarities);
}
```

---

## 🏗️ Phase 3: Reward & Backpropagation

**Goal:** Implement credit assignment and reward propagation through navigation chains.

### 3.1 Credit Assignment

**File:** `rewards/creditAssignment.ts`

```typescript
import { getGrainRegistry } from '../core/GrainRegistry';

export interface RewardConfig {
  decayFactor?: number; // Temporal decay (0-1)
  minCausalStrength?: number; // Threshold for propagation
  maxDepth?: number; // Max backprop depth
}

export function assignReward(
  grainId: string,
  reward: number,
  config: RewardConfig = {}
): void {
  const {
    decayFactor = 0.9,
    minCausalStrength = 0.1,
    maxDepth = 10
  } = config;

  const registry = getGrainRegistry();
  const chain = registry.getNavigationChain(grainId);

  if (!chain) {
    console.warn(`[Reward] No navigation chain found for grain: ${grainId}`);
    return;
  }

  // Add reward to current grain's chain
  chain.rewards.push(reward);

  // Backpropagate through navigation chain
  let currentReward = reward;
  let depth = 0;

  for (let i = chain.path.length - 1; i >= 0 && depth < maxDepth; i--) {
    const ancestorId = chain.path[i];
    const ancestor = registry.getGrain(ancestorId);

    if (!ancestor) continue;

    // Apply temporal decay
    currentReward *= decayFactor;

    // Stop if reward too small
    if (Math.abs(currentReward) < minCausalStrength) break;

    // Update ancestor's fields based on reward
    updateGrainFields(ancestorId, currentReward);

    console.log(`[Reward] Propagated ${currentReward.toFixed(3)} to ancestor: ${ancestorId}`);

    depth++;
  }
}

function updateGrainFields(grainId: string, reward: number): void {
  const registry = getGrainRegistry();
  const grain = registry.getGrain(grainId);

  if (!grain) return;

  // Update probability field if exists
  if (grain.probabilityField && grain.decisionContext?.chosenPath) {
    const updatedField = { ...grain.probabilityField };
    const chosenPath = grain.decisionContext.chosenPath;

    // Strengthen probability for rewarded path
    if (chosenPath in updatedField) {
      updatedField[chosenPath] += 0.1 * reward;
    }

    // Renormalize
    const total = Object.values(updatedField).reduce((sum, v) => sum + v, 0);
    for (const key in updatedField) {
      updatedField[key] /= total;
    }

    registry.updateGrain(grainId, { probabilityField: updatedField });
  }

  // Update vector field if exists (simple gradient ascent)
  if (grain.vectorField && grain.decisionContext?.targetVector) {
    const targetVector = grain.decisionContext.targetVector;
    const learningRate = 0.1;

    const updatedVector = grain.vectorField.map((val, i) =>
      val + learningRate * reward * (targetVector[i] - val)
    );

    registry.updateGrain(grainId, { vectorField: updatedVector });
  }
}
```

### 3.2 Causal Strength Computation

**File:** `rewards/causalStrength.ts`

```typescript
export function computeCausalStrength(
  timeToReward: number, // ms since action
  confidence: number = 1.0 // [0, 1]
): number {
  // Exponential decay based on time
  const timeDecay = Math.exp(-timeToReward / 10000); // 10s half-life

  return confidence * timeDecay;
}

export function computeTemporalCreditAssignment(
  timestamps: number[],
  rewardTimestamp: number,
  baseReward: number
): number[] {
  return timestamps.map(timestamp => {
    const timeToReward = rewardTimestamp - timestamp;
    const strength = computeCausalStrength(timeToReward);
    return baseReward * strength;
  });
}
```

---

## 🏗️ Phase 4: Optional UI Layer

**Goal:** Enable grains to render JSX and visualize grain networks.

### 4.1 Renderable Grains

Grains can return JSX or `null`:

```typescript
// UI Grain
export default function CounterGrain() {
  const [count, setCount] = useState(0);

  useGrain('counter1');

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Headless Logic Grain
export default function StrategyGrain() {
  const [strategy, setStrategy] = useState('explore');

  useGrain('strategy1');

  useGrainNavigation(() => {
    return strategy === 'exploit' ? 'ExploitGrain' : 'ExploreGrain';
  });

  return null; // No UI
}
```

### 4.2 Grain Graph Visualization

**File:** `components/GrainGraph.tsx`

```typescript
import React from 'react';
import { getGrainRegistry } from '../core/GrainRegistry';

export function GrainGraph() {
  const registry = getGrainRegistry();
  const grains = registry.getActiveGrains();

  return (
    <div className="grain-graph">
      <h2>Active Grains: {grains.length}</h2>

      {grains.map(grain => (
        <div key={grain.grainId} className="grain-node">
          <strong>{grain.type}</strong> ({grain.grainId})
          <div>Status: {grain.status}</div>
          <div>Entropy: {grain.entropy?.toFixed(3) || 'N/A'}</div>

          {grain.probabilityField && (
            <div>
              <strong>Probabilities:</strong>
              <ul>
                {Object.entries(grain.probabilityField).map(([key, prob]) => (
                  <li key={key}>{key}: {(prob * 100).toFixed(1)}%</li>
                ))}
              </ul>
            </div>
          )}

          {grain.childIds.length > 0 && (
            <div>
              <strong>Children:</strong> {grain.childIds.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 📋 Development Milestones

### Milestone 1: Core Engine ✅
- [ ] Create package structure
- [ ] Implement type definitions
- [ ] Build GrainRegistry singleton
- [ ] Implement `spawnGrain()`, `destroyGrain()`
- [ ] Create `useGrain()` hook
- [ ] Create `useGrainReducer()` hook
- [ ] Create `useGrainNavigation()` hook
- [ ] Write unit tests for registry

### Milestone 2: Learning & Routing ✅
- [ ] Implement vector field operations (cosine similarity, normalization)
- [ ] Implement probability field management
- [ ] Implement entropy tracking
- [ ] Create `useGrainField()` hook
- [ ] Write tests for field operations
- [ ] Build example: probabilistic routing grain

### Milestone 3: Reward & Backpropagation ✅
- [ ] Implement `assignReward()`
- [ ] Implement navigation chain traversal
- [ ] Implement temporal credit assignment
- [ ] Implement causal strength computation
- [ ] Write tests for reward propagation
- [ ] Build example: learning agent network

### Milestone 4: UI Layer ✅
- [ ] Support JSX rendering from grains
- [ ] Build `<GrainGraph />` visualization
- [ ] Build grain inspector/debugger
- [ ] Create example: adaptive UI workflow
- [ ] Create example: cognitive decision tree

### Milestone 5: Polish & Documentation ✅
- [ ] Write comprehensive API documentation
- [ ] Create tutorial: "Your First Grain Network"
- [ ] Create tutorial: "Building a Learning Agent"
- [ ] Create tutorial: "Adaptive UI with Grains"
- [ ] Performance optimization
- [ ] Publish to npm as `@minimact/grains`

---

## 🎯 Example Use Cases

### 1. AI Agent Network

```typescript
function ExplorerGrain({ targetLocation }: { targetLocation: number[] }) {
  const { vectorField, setVectorField, probabilityField } = useGrainField(
    [1, 0, 0], // Initial direction
    { 'north': 0.25, 'south': 0.25, 'east': 0.25, 'west': 0.25 }
  );

  useGrainNavigation(() => {
    const nextDirection = sampleFromProbabilityField(probabilityField);
    return nextDirection ? `Move${nextDirection}Grain` : null;
  });

  // Update fields based on proximity to target
  useEffect(() => {
    const distance = euclideanDistance(vectorField, targetLocation);
    if (distance < 1.0) {
      assignReward(getCurrentGrainId()!, 10.0); // Found target!
    }
  }, [vectorField, targetLocation]);

  return null; // Headless
}
```

### 2. Adaptive UI Workflow

```typescript
function OnboardingStepGrain({ stepNumber }: { stepNumber: number }) {
  const [completed, setCompleted] = useState(false);

  useGrainNavigation(() => {
    if (completed) {
      return stepNumber < 5 ? `OnboardingStep${stepNumber + 1}Grain` : 'DashboardGrain';
    }
    return null;
  });

  return (
    <div>
      <h2>Step {stepNumber}</h2>
      <button onClick={() => setCompleted(true)}>Next</button>
    </div>
  );
}
```

### 3. Game NPC with Emergent Behavior

```typescript
function NPCGrain({ npcId }: { npcId: string }) {
  const { probabilityField, setProbabilityField } = useGrainField(
    undefined,
    { 'patrol': 0.5, 'chase': 0.3, 'flee': 0.2 }
  );

  const [health, setHealth] = useState(100);

  useGrainNavigation(() => {
    // Adjust probabilities based on health
    if (health < 30) {
      setProbabilityField({ 'patrol': 0.1, 'chase': 0.1, 'flee': 0.8 });
    } else if (health > 70) {
      setProbabilityField({ 'patrol': 0.3, 'chase': 0.6, 'flee': 0.1 });
    }

    return sampleFromProbabilityField(probabilityField);
  });

  return (
    <div className="npc">
      <span>NPC Health: {health}</span>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Registry operations (spawn, destroy, freeze, activate)
- Field operations (cosine similarity, normalization, entropy)
- Reward propagation (credit assignment, temporal decay)
- Navigation chain tracking

### Integration Tests
- Grain lifecycle (spawn → navigate → freeze → destroy)
- Multi-grain networks (parent-child relationships)
- Reward backpropagation through chains
- Field synchronization (local vs global)

### Performance Tests
- Scalability (1000+ grains)
- Navigation speed
- Reward propagation latency
- Memory usage

---

## 📚 Documentation Plan

### API Reference
- Core functions (`spawnGrain`, `destroyGrain`, etc.)
- Hooks (`useGrain`, `useGrainReducer`, `useGrainNavigation`, `useGrainField`)
- Types (GrainInstance, NavigationChain, etc.)
- Learning functions (similarity metrics, probability operations)

### Tutorials
1. **Getting Started**: Your first grain
2. **Navigation**: Building self-routing grains
3. **Learning**: Adding probability fields
4. **Rewards**: Implementing credit assignment
5. **Advanced**: Multi-grain networks

### Examples
- Cognitive decision tree
- Adaptive form wizard
- AI agent swarm
- Game NPC behavior system
- Probabilistic state machine

---

## 🚀 Future Enhancements

### Phase 5: Advanced Features
- [ ] Grain serialization/deserialization
- [ ] Time-travel debugging
- [ ] Distributed grains (multi-client sync)
- [ ] Grain persistence (save/load from DB)
- [ ] Visual grain editor

### Phase 6: Optimization
- [ ] Lazy grain activation
- [ ] Grain pooling/reuse
- [ ] Navigation caching
- [ ] Field compression

### Phase 7: Integration
- [ ] Minimact component integration
- [ ] SignalR sync for distributed grains
- [ ] EF Core persistence
- [ ] Azure Orleans interop

---

## 🎉 Success Criteria

@minimact/grains is successful when:

1. ✅ Developers can spawn grains with `spawnGrain()`
2. ✅ Grains can navigate autonomously via `useGrainNavigation()`
3. ✅ Grains learn from rewards via probability/vector fields
4. ✅ Credit assignment works across navigation chains
5. ✅ Grains can render UI or run headless
6. ✅ Visual debugger shows grain network topology
7. ✅ Performance scales to 1000+ grains
8. ✅ Documentation enables quick onboarding

---

## 🧠 Philosophy

> **Grains are autonomous, stateful, learnable micro-apps that compose into emergent networks.**

Not just components. Not just actors. **Grains are a new primitive** for building:
- Intelligent systems that learn from experience
- Adaptive interfaces that self-navigate
- Emergent behaviors from simple rules
- Declarative AI networks in TSX

This is **Orleans meets React meets Reinforcement Learning** — expressed in pure functional TypeScript.

Welcome to the future of reactive, autonomous systems. 🌾
