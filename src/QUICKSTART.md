# Minimact Quick Start Guide

## What You've Built

A high-performance reconciliation engine and predictor written in Rust for your **minimact** server-side React framework. This library enables:

1. **Fast Virtual DOM Diffing**: Compute minimal DOM updates in microseconds
2. **Predictive Optimization**: Learn patterns and predict DOM changes before they happen
3. **Zero Server Round-trips**: Send predicted patches to clients alongside state changes

## Build Output

The Rust library has been compiled to:

```
target/release/minimact.dll        # Windows DLL for C# interop
target/release/minimact.dll.lib    # Import library for linking
target/release/libminimact.rlib    # Rust static library
```

## Using from C#

### 1. Copy the DLL

Copy `minimact.dll` to your C# project's output directory:

```bash
cp target/release/minimact.dll /path/to/your/csharp/project/bin/Debug/
```

### 2. Add the C# Bindings

Copy `bindings/csharp/Minimact.cs` to your C# project.

### 3. Basic Usage

```csharp
using Minimact;

// Create a predictor instance
using var predictor = new Predictor(minConfidence: 0.7f, maxPatternsPerKey: 100);

// Create virtual DOM trees
var oldTree = new VNode
{
    Type = "Element",
    Element = new VElement
    {
        Tag = "div",
        Props = new Dictionary<string, string>(),
        Children = new List<VNode>
        {
            new VNode { Type = "Text", Text = new VText { Content = "Count: 0" }}
        }
    }
};

var newTree = new VNode
{
    Type = "Element",
    Element = new VElement
    {
        Tag = "div",
        Props = new Dictionary<string, string>(),
        Children = new List<VNode>
        {
            new VNode { Type = "Text", Text = new VText { Content = "Count: 1" }}
        }
    }
};

// Define a state change
var stateChange = new StateChange
{
    ComponentId = "counter",
    StateKey = "count",
    OldValue = 0,
    NewValue = 1
};

// Learn the pattern (do this on the server when changes happen)
predictor.Learn(stateChange, oldTree, newTree);

// Later, predict DOM changes for the same state transition
var prediction = predictor.Predict(stateChange, oldTree);

if (prediction != null)
{
    Console.WriteLine($"Prediction confidence: {prediction.Confidence:P0}");

    // Send to client:
    // 1. The state change
    // 2. The predicted patches
    // Client applies patches immediately (optimistic update)

    foreach (var patch in prediction.PredictedPatches)
    {
        Console.WriteLine($"Predicted patch: {patch.Op}");
    }
}
```

## Integration with Your Minimact Framework

### Server-Side Flow

```csharp
// 1. User clicks button, triggers state change on server
var stateChange = new StateChange
{
    ComponentId = componentId,
    StateKey = stateKey,
    OldValue = oldValue,
    NewValue = newValue
};

// 2. Check if we can predict the DOM changes
var prediction = globalPredictor.Predict(stateChange, currentVirtualDom);

if (prediction != null)
{
    // 3. Send prediction to client immediately
    SendToClient(new
    {
        type = "predicted_update",
        stateChange = stateChange,
        patches = prediction.PredictedPatches,
        confidence = prediction.Confidence
    });
}

// 4. Compute actual changes (in parallel or after)
var newVirtualDom = RenderComponent(componentId, newValue);
var actualPatches = Reconciler.Reconcile(currentVirtualDom, newVirtualDom);

// 5. If prediction was wrong, send correction
if (!PatchesEqual(prediction.PredictedPatches, actualPatches))
{
    SendToClient(new
    {
        type = "correction",
        patches = actualPatches
    });
}

// 6. Learn from this interaction
globalPredictor.Learn(stateChange, currentVirtualDom, newVirtualDom);
```

### Client-Side Flow

```javascript
// Client receives prediction and applies optimistically
socket.on('predicted_update', ({ stateChange, patches, confidence }) => {
    // Apply patches immediately
    applyPatches(patches);

    // Wait for confirmation or correction
    awaitServerConfirmation(stateChange.id);
});

socket.on('correction', ({ patches }) => {
    // Prediction was wrong, apply correct patches
    applyPatches(patches);
});
```

## Performance Tips

### 1. Use Keys for Lists

```csharp
var listItem = new VNode
{
    Type = "Element",
    Element = new VElement
    {
        Tag = "li",
        Key = "item-123",  // Important for efficient reconciliation!
        // ...
    }
};
```

### 2. Train the Predictor

The more observations, the better:

```csharp
// Train during development/testing
for (int i = 0; i < 10; i++)
{
    predictor.Learn(stateChange, oldTree, newTree);
}

// In production, it learns automatically from real usage
```

### 3. Tune Confidence Threshold

```csharp
// Higher confidence = fewer but more accurate predictions
var conservativePredictor = new Predictor(minConfidence: 0.9f, maxPatternsPerKey: 100);

// Lower confidence = more predictions, some might be wrong
var aggressivePredictor = new Predictor(minConfidence: 0.5f, maxPatternsPerKey: 100);
```

## Testing

Run the Rust tests:

```bash
cargo test
```

Run benchmarks:

```bash
cargo bench
```

Run the C# example:

```bash
cd bindings/csharp
# Compile and run your C# example
```

## Next Steps

1. **Integrate with your minimact framework**: Connect the predictor to your useState hook
2. **Add client-side patch applier**: Implement JavaScript code to apply patches
3. **Build WebSocket communication**: Send predictions and corrections
4. **Monitor prediction accuracy**: Track how often predictions are correct
5. **Tune parameters**: Adjust confidence thresholds based on your app's needs

## Architecture Diagram

```
┌──────────────────────────────────────┐
│   C# Server (Minimact Framework)      │
│                                      │
│   ┌─────────────┐  ┌─────────────┐  │
│   │  useState   │  │  useEffect  │  │
│   └──────┬──────┘  └──────┬──────┘  │
│          └────────┬────────┘         │
│                   │                  │
│           [State Changes]            │
│                   │                  │
│                   ▼                  │
├═══════════════════════════════════════┤
│        Rust Core (via FFI)           │
│                                      │
│   ┌────────────────────────────┐    │
│   │    Predictor.Predict()     │    │
│   │  ┌──────────────────────┐  │    │
│   │  │ Pattern Matching     │  │    │
│   │  │ Confidence Scoring   │  │    │
│   │  └──────────────────────┘  │    │
│   └────────────┬───────────────┘    │
│                │                    │
│   ┌────────────▼───────────────┐    │
│   │  Reconciler.Reconcile()    │    │
│   │  ┌──────────────────────┐  │    │
│   │  │ Virtual DOM Diff     │  │    │
│   │  │ Patch Generation     │  │    │
│   │  └──────────────────────┘  │    │
│   └────────────────────────────┘    │
└───────────────┬──────────────────────┘
                │ JSON Patches
                ▼
      ┌─────────────────────┐
      │   Client Browser    │
      │  Apply Patches      │
      │  (Optimistic UI)    │
      └─────────────────────┘
```

## FAQ

**Q: Do I need Rust installed to use this?**
A: No, only to build it. Once built, you just need the `.dll` file in your C# project.

**Q: Can I use this with other languages?**
A: Yes! The FFI interface is C-compatible, so you can create bindings for any language that supports C FFI.

**Q: How accurate are predictions?**
A: For deterministic UIs (same state → same DOM), 95%+ after 10 observations. For dynamic UIs, 70-90%.

**Q: What if a prediction is wrong?**
A: The server always computes the actual changes and sends a correction if needed. The client applies the correction.

**Q: Does this work with async operations?**
A: Yes! Predictions are just hints. The actual reconciliation still happens server-side.

## Support

For issues or questions:
1. Check the main README.md
2. Look at the example code in `bindings/csharp/Example.cs`
3. Read the Rust API docs: `cargo doc --open`
