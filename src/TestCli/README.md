# Minimact Test CLI

End-to-end test suite for the Minimact Rust reconciliation engine.

## Features Tested

This CLI tests all 8 production requirements:

### Critical Requirements
1. **Error Handling** - Tests Result<T> error propagation
2. **Input Validation** - Tests tree depth and size limits
3. **Memory Management** - Tests predictor lifecycle
4. **Concurrency Safety** - Tests multiple predictor instances

### Important Requirements
5. **Patch Verification** - Implicit in reconciliation tests
6. **Logging & Diagnostics** - Tests log capture and levels
7. **Serialization Safety** - Tests JSON size limits
8. **Metrics & Observability** - Tests metric collection

## Building

1. **Build the Rust library first:**
   ```bash
   cd ..
   cargo build --release
   ```

2. **Copy the DLL:**
   - Windows: Copy `target/release/minimact.dll` to `TestCli/bin/Debug/net8.0/`
   - Linux: Copy `target/release/libminimact.so` to `TestCli/bin/Debug/net8.0/`
   - macOS: Copy `target/release/libminimact.dylib` to `TestCli/bin/Debug/net8.0/`

3. **Build and run the test CLI:**
   ```bash
   cd TestCli
   dotnet build
   dotnet run
   ```

## Quick Test Script

### Windows (PowerShell)
```powershell
# Build Rust
cd ..
cargo build --release

# Copy DLL
mkdir -p TestCli\bin\Debug\net8.0
copy target\release\minimact.dll TestCli\bin\Debug\net8.0\

# Run tests
cd TestCli
dotnet build
dotnet run
```

### Linux/macOS (Bash)
```bash
# Build Rust
cd ..
cargo build --release

# Copy library
mkdir -p TestCli/bin/Debug/net8.0
cp target/release/libminimact.so TestCli/bin/Debug/net8.0/  # Linux
# or
cp target/release/libminimact.dylib TestCli/bin/Debug/net8.0/  # macOS

# Run tests
cd TestCli
dotnet build
dotnet run
```

## Expected Output

```
╔═══════════════════════════════════════════════════╗
║   Minimact End-to-End Test Suite                  ║
║   Testing Production Features                     ║
╚═══════════════════════════════════════════════════╝

[TEST 1] Basic Reconciliation
-------------------------------------------------------
✓ Generated 1 patch(es)
...

[TEST 2] Predictor Learning & Prediction
-------------------------------------------------------
✓ Predictor created (handle: 1)
  Teaching pattern 5 times...
  ✓ Pattern learned
  ✓ Prediction made with 100% confidence
...

[ALL TESTS PASSED]
```

## Test Descriptions

- **Test 1**: Basic reconciliation between two simple trees
- **Test 2**: Predictor learning pattern and making predictions
- **Test 3**: Error handling for invalid JSON input
- **Test 4**: Input validation rejecting deeply nested trees
- **Test 5**: Memory management with multiple predictor instances
- **Test 6**: Logging infrastructure capturing log entries
- **Test 7**: Metrics collection tracking reconcile calls
- **Test 8**: Serialization safety handling large JSON

## Troubleshooting

**DLL not found error:**
- Ensure the Rust library is in the same directory as the executable
- Or add the Rust library path to your system's library path (LD_LIBRARY_PATH on Linux, DYLD_LIBRARY_PATH on macOS)

**JSON errors:**
- The bindings use Newtonsoft.Json - ensure it's installed via NuGet

**Platform-specific issues:**
- The library name differs by platform (minimact.dll/libminimact.so/libminimact.dylib)
- The C# code uses `const string LibName = "minimact"` which should work cross-platform
