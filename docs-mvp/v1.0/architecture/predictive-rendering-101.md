# Predictive Rendering 101

Predictive rendering is the core innovation that makes Minimact feel instant. This guide explains how it works and why it's a game-changer.

## The Problem: Network Latency

Every user interaction in traditional server-rendered apps follows this flow:

```
User clicks button
  ↓ (Network: 20ms)
Server processes request
  ↓ (Computation: 5ms)
Server sends response
  ↓ (Network: 20ms)
Client updates DOM
  ↓
Total: ~47ms
```

**47ms might seem fast, but:**
- Users perceive <100ms as "instant"
- Native apps respond in <16ms (60fps)
- Every interaction compounds the lag
- On slow networks, it's much worse

## The Minimact Solution: Pre-Computation

What if the client already had the answer **before the user clicked**?

```
Server predicts likely next states
  ↓
Server pre-computes DOM patches
  ↓
Server sends patches to client cache
  ↓
[Client now has patches ready]
  ↓
User clicks button
  ↓
Client finds patch in cache
  ↓ (0ms network - already cached!)
Client applies patch instantly
  ↓
Total: ~2-3ms ⚡
```

**That's 15-20x faster!**

## How It Works: The Template System

### Phase 1-3: Basic Templates

**Counter Example:**

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>;
}
```

**First Click (count: 0 → 1):**
```
1. User clicks
2. Server renders: "Count: 1"
3. Rust engine analyzes change:
   - Old HTML: "Count: 0"
   - New HTML: "Count: 1"
   - Pattern: "Count: {0}" ← Template extracted!
4. Template cached for future use
```

**Second Click (count: 1 → 2):**
```
1. Server uses template "Count: {0}"
2. Applies with value=2 → "Count: 2"
3. Sends patch to client
4. Predicts next value (3)
5. Pre-computes patch for "Count: 3"
6. Sends prediction to client cache
```

**Third Click (count: 2 → 3):**
```
1. User clicks
2. Client checks cache: ✅ Patch found!
3. Applies cached patch instantly
4. Server verifies in background
5. (95% chance: prediction was correct, no correction needed)
```

**Result:** After 2 clicks, all future clicks are instant.

### Phase 4: Loop Templates

**List Example:**

```tsx
function TodoList() {
  const [todos, setTodos] = useState([]);

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

**Before Loop Templates:**
```
3 todos = 3 patterns × 150 bytes = 450 bytes
10 todos = 10 patterns × 150 bytes = 1.5KB
100 todos = 100 patterns × 150 bytes = 15KB
```

**After Loop Templates (Phase 4):**
```
ANY number of todos = 1 template × 200 bytes = 200 bytes

Template: "<li>{todo.text}</li>"
Apply for any array of any size!
```

**Savings:** 97.7% memory reduction for FAQ page (8.7KB → 200 bytes)

### Phase 5: Structural Templates

**Conditional Rendering:**

```tsx
function DataView() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  if (isLoading) return <Spinner />;
  if (!data) return <Error />;
  return <Table data={data} />;
}
```

**Challenge:** Different structures for different states.

**Solution:** Store templates for each branch:

```javascript
templates = {
  loading: "<Spinner ... />",
  error: "<Error ... />",
  success: "<Table ... {data} />"
}
```

**Result:** 100% coverage for loading states, auth checks, feature flags.

### Phase 6: Expression Templates

**Formatted Values:**

```tsx
function PriceDisplay({ price }) {
  return <span>${price.toFixed(2)}</span>;
}
```

**Template:**
```javascript
{
  pattern: "${0}.{1}",
  transform: (value) => [
    Math.floor(value),
    (value % 1).toFixed(2).slice(2)
  ]
}
```

**Coverage:** 70% for common transformations (.toFixed, arithmetic, string ops)

### Phase 7: Deep State Traversal

**Nested Objects:**

```tsx
function UserCard({ user }) {
  return <div>{user.address.city}</div>;
}
```

**Template:**
```javascript
{
  pattern: "<div>{0}</div>",
  binding: "user.address.city"  // Dotted path
}
```

**Result:** 100% coverage for nested objects.

### Phase 8: Reorder Templates

**Sorting/Filtering:**

```tsx
const [items, setItems] = useState([...]);
const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
```

**Challenge:** 10 items = 10! = 3.6 million possible orderings!

**Solution:** Detect reordering, don't create new patterns:

```javascript
{
  type: 'reorder',
  items: [sameTemplateForEachItem],
  order: [2, 0, 1, 3, ...] // Just the order changed
}
```

**Result:** 60% coverage for common ordering patterns.

### Phase 9: Semantic Array Operations

**The Problem with Generic Setters:**

```tsx
setTodos([...todos, newTodo]); // Server must diff arrays
```

**The Solution - Semantic Operations:**

```tsx
setTodos.append(newTodo);      // Server knows intent!
setTodos.removeAt(index);      // No diffing needed
setTodos.insertAt(2, newTodo); // Explicit operation
```

**Performance:**
- **Without semantic ops:** 100-200ms (array diffing)
- **With semantic ops:** 10-20ms (direct operation)
- **Improvement:** 10x faster template learning

**All semantic operations:**
```tsx
setItems.append(item)           // Add to end
setItems.prepend(item)          // Add to start
setItems.insertAt(index, item)  // Insert at position
setItems.removeAt(index)        // Remove by index
setItems.updateAt(index, changes) // Update by index
setItems.appendMany([...])      // Add multiple
setItems.removeWhere(predicate) // Remove matching
setItems.updateWhere(predicate, changes) // Update matching
```

## Compile-Time Template Generation

Babel analyzes your JSX **at build time** and pre-generates templates:

```tsx
// Your code
{items.map(item => (
  <div className="card">
    <h3>{item.title}</h3>
    <p>{item.description}</p>
  </div>
))}
```

**Babel generates:**

```csharp
[LoopTemplate(@"
  <div class=""card"">
    <h3>{0}</h3>
    <p>{1}</p>
  </div>
")]
private string[] RenderItems() { ... }
```

**Benefits:**
- ✅ Zero cold start - templates ready from first render
- ✅ Perfect accuracy - Babel sees full JSX context
- ✅ Runtime fallback - Dynamic patterns still work

## Prediction Workflow

```
┌─────────────────────────────────────────────┐
│  Server (C# + Rust)                         │
├─────────────────────────────────────────────┤
│                                             │
│  1. User interaction received               │
│     ↓                                       │
│  2. C# component updates state              │
│     ↓                                       │
│  3. C# renders new VNode tree               │
│     ↓                                       │
│  4. Rust engine compares old vs new         │
│     ↓                                       │
│  5. Template system:                        │
│     - Check for existing template           │
│     - OR extract new template               │
│     - OR use Babel pre-generated template   │
│     ↓                                       │
│  6. Generate DOM patch                      │
│     ↓                                       │
│  7. Send patch to client                    │
│     ↓                                       │
│  8. Predict likely next states              │
│     ↓                                       │
│  9. Pre-compute patches for predictions     │
│     ↓                                       │
│  10. Send predictions to client cache       │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Client (JavaScript, ~5KB)                  │
├─────────────────────────────────────────────┤
│                                             │
│  1. Receives patch from server              │
│     ↓                                       │
│  2. Applies patch to DOM                    │
│     ↓                                       │
│  3. Receives predicted patches              │
│     ↓                                       │
│  4. Stores in HintQueue cache               │
│     ↓                                       │
│  [User clicks button]                       │
│     ↓                                       │
│  5. Checks HintQueue for matching patch     │
│     ↓                                       │
│  6a. Cache HIT → Apply instantly (2-3ms)    │
│  6b. Cache MISS → Send to server (47ms)     │
│                                             │
└─────────────────────────────────────────────┘
```

## Explicit Hints (Optional)

For edge cases, you can give the predictor explicit hints:

```tsx
import { usePredictHint } from 'minimact';

function Counter() {
  const [count, setCount] = useState(0);

  // Hint: next click will increment count
  usePredictHint(() => ({ count: count + 1 }), 0.95);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**When to use hints:**
- Complex state transitions
- External API calls
- Multi-step workflows
- Edge cases with <70% coverage

**When NOT to use hints:**
- Simple counters (template handles it)
- Lists with .map() (Phase 4 handles it)
- Conditional rendering (Phase 5 handles it)
- Most common patterns (95-98% coverage already!)

## Performance Results

### Latency (with 20ms network)

| Scenario | Traditional SSR | Minimact (Cache Hit) | Improvement |
|----------|----------------|----------------------|-------------|
| Button click | 47ms | 2-3ms | **15-20x faster** |
| Form input (client) | 47ms | <1ms | **47x faster** |
| Toggle state | 47ms | 2-3ms | **15-20x faster** |
| List update | 47ms | 2-3ms | **15-20x faster** |

### Memory Efficiency

| Pattern | Before Templates | After Templates | Reduction |
|---------|-----------------|-----------------|-----------|
| Counter (150 states) | 150KB | 200 bytes | **750x** |
| FAQ (29 items × 2 states) | 8.7KB | 200 bytes | **43x** |
| Dashboard (1000 states) | 1.5MB | 2KB | **750x** |

### Coverage (After Warmup)

| Pattern Type | Coverage | Phases |
|-------------|----------|--------|
| Simple text substitution | 100% | 1-3 |
| Loops (.map) | 100% | 4 |
| Conditional rendering | 100% | 5 |
| Formatted values | 70% | 6 |
| Nested objects | 100% | 7 |
| Reordering | 60% | 8 |
| **Overall real-world** | **95-98%** | 1-9 |

## Interactive Playground

See predictive rendering in action in the [Minimact Playground](https://playground.minimact.dev):

- **Green overlay** = Cache hit (2-3ms) ✅
- **Red overlay** = Cache miss (47ms) ❌

Watch as:
1. First few interactions show red (learning)
2. Subsequent interactions show green (predicted)
3. Metrics dashboard tracks hit rate and latency

**Typical progression:**
```
Interaction 1: ❌ Miss (learning)
Interaction 2: ❌ Miss (template extraction)
Interaction 3: ✅ Hit (predicted!)
Interaction 4: ✅ Hit
Interaction 5: ✅ Hit
...
Hit rate: 95-98%
```

## Common Questions

### Q: What about complex state transitions?

**A:** Templates handle structural patterns, hints handle logic:

```tsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);

usePredictHint('login-success', {
  user: fetchedUser,
  loading: false
}, 0.9);

usePredictHint('login-failure', {
  user: null,
  loading: false
}, 0.1);
```

### Q: What if prediction is wrong?

**A:** Server sends correction:

```
1. User clicks
2. Client applies cached patch (might be wrong)
3. Server computes actual result
4. If different: Server sends correction patch
5. Client applies correction
6. Prediction accuracy improves for next time
```

**In practice:** 95-98% of predictions are correct after warmup.

### Q: Does this work with external APIs?

**A:** Yes, with hints:

```tsx
const [weather, setWeather] = useState(null);

// Hint: city change will fetch new data
usePredictHint(() => ({
  weather: predictedWeatherFor(newCity)
}), 0.7);
```

Or use `useServerTask` for long-running operations with progress:

```tsx
const [task, fetchWeather] = useServerTask(async (city) => {
  return await weatherAPI.get(city);
});
```

## Next Steps

- [Template System Architecture](/v1.0/guide/predictive-rendering) - Deep dive
- [Use Cases](/v1.0/use-cases) - Real-world examples
- [Hooks API](/v1.0/api/hooks) - usePredictHint reference
- [What Makes Minimact Different](/v1.0/architecture/what-makes-minimact-different) - Overview
