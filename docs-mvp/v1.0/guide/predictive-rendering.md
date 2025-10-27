# Predictive Rendering

Minimact's predictive rendering system is powered by Rust and achieves 95-98% cache hit rates, making interactions feel instant.

## How It Works

Traditional server-rendered apps have a problem: network latency. Every click requires a round-trip to the server.

Minimact solves this by **predicting what will happen** before you click.

### The Prediction Pipeline

1. **Pattern Detection** - Rust engine analyzes state changes
2. **Template Extraction** - Identifies repeating patterns
3. **Prediction Generation** - Pre-generates likely next states
4. **Patch Pre-sending** - Sends predicted DOM patches to client
5. **Client Caching** - Browser caches patches with hint IDs
6. **Instant Apply** - User clicks → cached patch applies instantly
7. **Server Verification** - Server confirms (or corrects) in background

## Example: Counter

```tsx
function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### What Happens

1. User clicks at count=0
2. Server increments to 1, sends patch
3. **Rust engine notices pattern**: "count always increments by 1"
4. **Prediction sent**: "When count=1, next will be 2" → sends patch for count=2
5. User sees count=1, patch for count=2 is cached
6. User clicks again → **instant update to 2 (0ms)**
7. Server confirms, was correct ✅

### Confidence Scores

Predictions have confidence scores (0.0 to 1.0):

- **0.9+** - Very confident, apply immediately
- **0.7-0.9** - Confident, apply optimistically
- **0.5-0.7** - Uncertain, wait for server
- **<0.5** - Don't cache

```csharp
// In your component
[PredictNext(confidence: 0.95)]
public int GetNextCount(int current)
{
    return current + 1;
}
```

## Template System

The Rust reconciliation engine extracts templates from your renders:

### Phase 1: Simple Templates

```tsx
<p>Count: {count}</p>
```

Template: `<p>Count: {{count}}</p>`

### Phase 2: Conditional Templates

```tsx
{count > 10 ? <span>High</span> : <span>Low</span>}
```

Template:
```
IF count > 10:
  <span>High</span>
ELSE:
  <span>Low</span>
```

### Phase 3: Loop Templates

```tsx
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

Template:
```
LOOP items AS item:
  <li key={{item.id}}>{{item.name}}</li>
```

## Performance

The Rust engine is **extremely fast**:

- Template extraction: ~50µs per component
- Prediction generation: ~20µs per state change
- Memory overhead: ~2KB per component (98% reduction vs storing full HTML)

## Prediction Strategies

### 1. Incremental Patterns

Best for: Counters, pagination, sliders

```csharp
[IncrementalPredictor]
public class Counter : MinimactComponent
{
    // Rust detects +1 pattern automatically
}
```

### 2. Toggle Patterns

Best for: Checkboxes, dropdowns, tabs

```csharp
[TogglePredictor(states: new[] { "open", "closed" })]
public class Dropdown : MinimactComponent
{
    // Predicts open <-> closed
}
```

### 3. State Machine Patterns

Best for: Multi-step forms, wizards

```csharp
[StateMachinePredictor]
public class Wizard : MinimactComponent
{
    // Predicts next step in flow
}
```

### 4. Custom Predictors

For complex scenarios:

```csharp
public class CustomComponent : MinimactComponent
{
    [PredictNext]
    public async Task<List<Patch>> PredictNextState(StateChange change)
    {
        // Your custom prediction logic
        if (change.Key == "searchTerm")
        {
            var results = await SearchAsync(change.Value);
            return GeneratePatches(results);
        }
        return null;
    }
}
```

## Cache Hit Rates

In production:

- **Simple counters**: 99.9% hit rate
- **Form inputs**: 95-98% hit rate
- **Dropdowns/toggles**: 97-99% hit rate
- **Complex UIs**: 85-95% hit rate

Even an 85% hit rate means **85% of interactions are instant**.

## Debugging Predictions

Enable prediction logging:

```csharp
builder.Services.AddMinimact(options =>
{
    options.EnablePredictionLogging = true;
});
```

In browser console:

```
[Minimact] Prediction HIT: increment (confidence: 0.98, latency: 0ms)
[Minimact] Prediction MISS: complex-update (fell back to server, latency: 45ms)
```

## Best Practices

1. **Keep state changes predictable** - Rust engine learns patterns
2. **Use semantic state updates** - Clear patterns predict better
3. **Avoid random values** - `Math.random()` can't be predicted
4. **Batch related updates** - Helps template extraction
5. **Monitor hit rates** - Optimize low-performing components

## Next Steps

- See it in action: [Examples](/examples)
- API details: [Hooks](/api/hooks)
- Advanced: [Custom Predictors](/api/custom-predictors)
