# Minimact

A high-performance reconciliation engine and predictor written in Rust, designed for server-side React-like frameworks.

## Overview

Minimact provides:

1. **Virtual DOM Reconciliation**: Efficient diffing algorithm to compute minimal DOM updates
2. **Predictive Engine**: Machine learning-based predictor that learns state-to-DOM change patterns
3. **C# Interop**: Native FFI bindings for seamless C# integration

## Key Features

- **Performance**: Written in Rust for maximum speed
- **Predictive Optimization**: Reduces server round-trips by predicting DOM changes
- **Flexible**: Works with any server-side rendering framework
- **Type-Safe**: Strong typing in both Rust and C#

## Architecture

```
┌─────────────────────────────────────────────┐
│           C# Server (Minimact Framework)      │
│  ┌─────────────┐       ┌─────────────┐      │
│  │  useState   │       │  useEffect  │      │
│  │  useRef     │       │   Hooks     │      │
│  └──────┬──────┘       └──────┬──────┘      │
│         │                     │             │
│         └──────────┬──────────┘             │
│                    │                        │
│         ┌──────────▼──────────┐             │
│         │   State Changes     │             │
│         └──────────┬──────────┘             │
└────────────────────┼──────────────────────┘
                     │ FFI
         ┌───────────▼────────────┐
         │   Rust Core Engine     │
         │  ┌──────────────────┐  │
         │  │  Reconciler      │  │
         │  │  (Diff VNodes)   │  │
         │  └─────────┬────────┘  │
         │            │           │
         │  ┌─────────▼────────┐  │
         │  │   Predictor      │  │
         │  │ (Learn & Predict)│  │
         │  └──────────────────┘  │
         └────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │    Client Browser      │
         │  Apply Predicted       │
         │  Patches               │
         └────────────────────────┘
```

## How It Works

### 1. Reconciliation

The reconciler compares two virtual DOM trees and produces a minimal set of patches:

```rust
let old_tree = VNode::element("div", props, vec![VNode::text("Hello")]);
let new_tree = VNode::element("div", props, vec![VNode::text("World")]);

let patches = reconcile(&old_tree, &new_tree);
// Produces: [Patch::UpdateText { path: [0], content: "World" }]
```

### 2. Prediction

The predictor learns patterns from state changes:

```rust
let mut predictor = Predictor::new();

// Learn: when count changes from 0->1, text updates
predictor.learn(state_change, old_tree, new_tree);

// Predict: given the same state change, predict DOM changes
let prediction = predictor.predict(&state_change, current_tree);
```

### 3. Server-Side Flow

1. User interaction triggers state change on client
2. Client sends state change to server
3. Server checks predictor for expected DOM changes
4. Server sends **both** the predicted patches AND the state change to client
5. Client applies predicted patches immediately (optimistic update)
6. Server computes actual changes
7. If prediction was wrong, server sends correction

This eliminates the round-trip delay for most interactions!

## Building

### Prerequisites

- Rust 1.70+
- .NET 6.0+ (for C# bindings)

### Build Rust Library

```bash
cargo build --release
```

This produces:
- `target/release/minimact.dll` (Windows)
- `target/release/libminimact.so` (Linux)
- `target/release/libminimact.dylib` (macOS)

### Run Rust Tests

```bash
cargo test
```

### Run Benchmarks

```bash
cargo bench
```

## C# Integration

### Using the Bindings

```csharp
using Minimact;

// Create a predictor
using var predictor = new Predictor(minConfidence: 0.7f, maxPatternsPerKey: 100);

// Create virtual DOM nodes
var oldTree = new VNode { /* ... */ };
var newTree = new VNode { /* ... */ };

// Reconcile
var patches = Reconciler.Reconcile(oldTree, newTree);

// Learn pattern
var stateChange = new StateChange
{
    ComponentId = "counter",
    StateKey = "count",
    OldValue = 0,
    NewValue = 1
};

predictor.Learn(stateChange, oldTree, newTree);

// Predict future changes
var prediction = predictor.Predict(stateChange, oldTree);
if (prediction != null)
{
    Console.WriteLine($"Confidence: {prediction.Confidence}");
    // Send prediction to client
}
```

### Running the Example

```bash
# Build the Rust library first
cargo build --release

# Copy the library to the C# project directory
# Then compile and run the C# example
cd bindings/csharp
dotnet run Example.cs
```

## Virtual DOM Types

### VNode

```rust
pub enum VNode {
    Element(VElement),
    Text(VText),
}
```

### VElement

```rust
pub struct VElement {
    pub tag: String,
    pub props: HashMap<String, String>,
    pub children: Vec<VNode>,
    pub key: Option<String>,  // For optimized reconciliation
}
```

### Patches

```rust
pub enum Patch {
    Create { path: Vec<usize>, node: VNode },
    Remove { path: Vec<usize> },
    Replace { path: Vec<usize>, node: VNode },
    UpdateText { path: Vec<usize>, content: String },
    UpdateProps { path: Vec<usize>, props: HashMap<String, String> },
    ReorderChildren { path: Vec<usize>, order: Vec<String> },
}
```

## Performance

The reconciler is optimized for:

- **Keyed reconciliation**: Use `key` prop for efficient list updates
- **Minimal patches**: Only necessary changes are generated
- **Memory efficiency**: No unnecessary cloning

Benchmarks (on typical component trees):

- **Small trees** (< 10 nodes): ~1-5 μs
- **Medium trees** (< 100 nodes): ~10-50 μs
- **Large trees** (< 1000 nodes): ~100-500 μs

## Predictor Accuracy

The predictor's accuracy depends on:

1. **Pattern consistency**: Deterministic state->DOM mappings work best
2. **Training data**: More observations = higher confidence
3. **Confidence threshold**: Adjust `min_confidence` to balance accuracy vs coverage

Typical results:
- **Deterministic UIs**: 95%+ accuracy after 10+ observations
- **Dynamic UIs**: 70-90% accuracy with proper patterns

## API Reference

### Rust API

#### `reconcile(old: &VNode, new: &VNode) -> Vec<Patch>`

Computes the differences between two virtual DOM trees.

#### `Predictor::new() -> Predictor`

Creates a new predictor with default configuration.

#### `Predictor::learn(&mut self, state_change: StateChange, old_tree: &VNode, new_tree: &VNode)`

Learns from an observed state change and its resulting DOM changes.

#### `Predictor::predict(&self, state_change: &StateChange, current_tree: &VNode) -> Option<Prediction>`

Predicts DOM changes for a given state change.

### C FFI API

See `src/ffi.rs` for the complete FFI interface. Key functions:

- `minimact_predictor_new()`
- `minimact_reconcile(old_json, new_json)`
- `minimact_predictor_learn(handle, state_change_json, old_tree_json, new_tree_json)`
- `minimact_predictor_predict(handle, state_change_json, current_tree_json)`

### C# API

See `bindings/csharp/Minimact.cs` for complete C# API.

## Roadmap

- [ ] More sophisticated prediction algorithms (neural networks)
- [ ] Persistence for learned patterns
- [ ] Additional language bindings (Python, JavaScript/Node)
- [ ] Incremental reconciliation for massive trees
- [ ] React DevTools integration

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
