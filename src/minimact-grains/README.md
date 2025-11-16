# @minimact/grains 🌾

**Autonomous, stateful, spawnable grain system with probabilistic routing and reward-based learning.**

Think: **Orleans + React Hooks + Spatial Probability Networks + Actor Model**

---

## 🌟 What is @minimact/grains?

**Grains** are autonomous micro-apps that:
- 🌱 **Spawn dynamically** like actors
- 🧠 **Route probabilistically** using learned vector/probability fields
- 🏆 **Learn from rewards** via credit assignment
- 🔄 **Self-navigate** based on internal logic
- 📊 **Track causality** through navigation chains
- ⚛️ **Render JSX** or run headless

---

## 📦 Installation

```bash
npm install @minimact/grains
```

---

## 🚀 Quick Start

### 1. Create a Grain

```typescript
import { useGrain, useGrainNavigation } from '@minimact/grains';
import { useState } from 'react';

export default function CounterGrain() {
  const [count, setCount] = useState(0);

  useGrain('counter1');

  useGrainNavigation(() => {
    if (count >= 10) return 'SuccessGrain';
    return null;
  });

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. Spawn Grains

```typescript
import { spawnGrain } from '@minimact/grains';
import CounterGrain from './CounterGrain';

// Spawn multiple independent instances
const grain1 = spawnGrain('counter', CounterGrain);
const grain2 = spawnGrain('counter', CounterGrain);
```

### 3. Navigate & Learn

```typescript
import { useGrainField, assignReward } from '@minimact/grains';

export default function ExplorerGrain() {
  const { vectorField, probabilityField } = useGrainField(
    [1, 0, 0], // Initial vector
    { 'north': 0.25, 'east': 0.25, 'south': 0.25, 'west': 0.25 }
  );

  useGrainNavigation(() => {
    // Sample from probability distribution
    return sampleFromProbabilityField(probabilityField);
  });

  // Reward successful navigation
  useEffect(() => {
    if (reachedGoal) {
      assignReward(getCurrentGrainId()!, 10.0);
    }
  }, [reachedGoal]);

  return null; // Headless grain
}
```

---

## 🧠 Core Concepts

### Grains as Functional Components
Write grains like React components with `useState`, `useEffect`, etc.

### Spawnable Instances
Create grain instances dynamically - like actors in Orleans.

### Probabilistic Routing
Navigate based on cosine similarity between vector fields → probability distributions.

### Reward-Based Learning
Assign rewards → backpropagate through navigation chains → tune fields.

### Causality Tracking
Every navigation step is tracked for credit assignment.

---

## 📚 API Reference

### Core Functions

- `spawnGrain(type, component, options)` - Create grain instance
- `destroyGrain(grainId)` - Remove grain from registry
- `freezeGrain(grainId)` - Pause grain execution
- `activateGrain(grainId)` - Resume frozen grain

### Hooks

- `useGrain(grainId)` - Register current component as grain
- `useGrainReducer(reducer, initialState)` - State management
- `useGrainNavigation(navigationFn)` - Define routing logic
- `useGrainField(vectorField, probabilityField)` - Learning fields

### Rewards

- `assignReward(grainId, reward, config)` - Propagate reward through chain
- `computeCausalStrength(timeToReward, confidence)` - Calculate influence

### Learning

- `cosineSimilarity(vecA, vecB)` - Vector similarity
- `createProbabilityField(options)` - Normalize to probabilities
- `sampleFromProbabilityField(field)` - Sample next action
- `updateProbabilityField(field, key, reward)` - Learn from feedback

---

## 🎯 Use Cases

### AI Agent Networks
Build swarms of autonomous agents with emergent behavior.

### Adaptive UI Workflows
Create self-navigating forms, wizards, and onboarding flows.

### Cognitive Decision Trees
Model decision-making with probabilistic reasoning.

### Game NPCs
Independent NPCs with learned behaviors.

### Simulations
Actor-based models with spatial reasoning.

---

## 📖 Documentation

See [GRAINS_IMPLEMENTATION_PLAN.md](../../docs/GRAINS_IMPLEMENTATION_PLAN.md) for full architecture.

---

## 🧪 Examples

Coming soon!

---

## 📄 License

MIT

---

## 🌵 Built for Minimact

Part of the Minimact ecosystem - the posthydrationist framework.

Learn more: [https://minimact.com](https://minimact.com)
