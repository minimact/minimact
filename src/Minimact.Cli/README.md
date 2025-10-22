# Minimact CLI

Command-line tool for testing and interacting with the Minimact Rust reconciliation engine.

## Installation

### As a .NET Tool (Recommended)

```bash
# Build and pack
dotnet pack

# Install globally
dotnet tool install --global --add-source ./nupkg Minimact.Cli

# Now you can run from anywhere
minimact --help
```

### Local Build

```bash
# First, build the Rust library
cd ..
cargo build --release

# Build the CLI
cd Minimact.Cli
dotnet build

# Run locally
dotnet run -- test
```

## Commands

### `minimact test`

Run the end-to-end test suite:

```bash
minimact test
```

Output:
```
╔═══════════════════════════════════════════════════╗
║   Minimact Test Suite                             ║
╚═══════════════════════════════════════════════════╝

[1] Basic Reconciliation...
    ✓ Passed

[2] Predictor Learning...
    ✓ Passed

[3] Metrics Collection...
    ✓ Passed

═══════════════════════════════════════════════════
Result: 3/3 tests passed
```

### `minimact reconcile`

Reconcile two VNode JSON trees:

```bash
# Create test files
echo '{"type":"Element","tag":"div","props":{},"children":[{"type":"Text","content":"Old"}]}' > old.json
echo '{"type":"Element","tag":"div","props":{},"children":[{"type":"Text","content":"New"}]}' > new.json

# Reconcile
minimact reconcile --old old.json --new new.json
```

Output:
```
Reconciling trees...

✓ Generated 1 patch(es):

[
  {
    "op": "UpdateText",
    "path": [0],
    "content": "New"
  }
]
```

### `minimact metrics`

Display current performance metrics:

```bash
minimact metrics
```

Output:
```
╔═══════════════════════════════════════════════════╗
║   Minimact Metrics                                 ║
╚═══════════════════════════════════════════════════╝

Reconciliation:
  Calls:          15
  Errors:         0
  Patches:        12
  Avg time (μs):  145

Predictor:
  Learns:         10
  Predictions:    8
  Hit rate:       75%
  Avg time (μs):  32

Memory:
  Predictors:     2 (max: 5)
  Evictions:      0

Uptime:           42s
```

### `minimact logs`

Display captured logs:

```bash
# Show all logs at Info level and above
minimact logs

# Show debug logs
minimact logs --level 1

# Show all logs including trace
minimact logs --level 0
```

Output:
```
╔═══════════════════════════════════════════════════╗
║   Captured Logs (5 entries)
╚═══════════════════════════════════════════════════╝

[Info] Reconciliation complete: 1 patches generated (minimact::reconciler, +120ms)
[Debug] Learning pattern for toggle::isOn (minimact::predictor, +145ms)
[Info] Prediction made with 1.00 confidence (5 observations) (minimact::predictor, +148ms)
```

## Usage with Node.js

The `test-e2e.js` script in the root automatically builds and tests everything:

```bash
npm test
```

Or run specific npm scripts:

```bash
npm run build:rust    # Build Rust library
npm run build:dotnet  # Build .NET CLI
npm run test:e2e      # Run full end-to-end test
```

## VNode JSON Format

Trees should follow this structure:

**Element Node:**
```json
{
  "type": "Element",
  "tag": "div",
  "props": {
    "class": "container",
    "id": "main"
  },
  "children": [...]
}
```

**Text Node:**
```json
{
  "type": "Text",
  "content": "Hello, World!"
}
```

## Exit Codes

- `0`: Success / all tests passed
- `1`: Failure / some tests failed

## Requirements

- .NET 8.0 SDK
- Rust toolchain (for building the native library)
- The Minimact Rust library must be in the same directory as the executable

## Troubleshooting

**"Unable to load DLL 'minimact'"**
- Ensure you've built the Rust library: `cargo build --release`
- The library should be in `Minimact.Cli/bin/Debug/net8.0/`
- On Windows: `minimact.dll`
- On Linux: `libminimact.so`
- On macOS: `libminimact.dylib`

**"Command 'minimact' not found"**
- If installed as a tool, ensure `~/.dotnet/tools` is in your PATH
- Or run locally with `dotnet run --`
