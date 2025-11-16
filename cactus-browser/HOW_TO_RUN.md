# 🚀 How to Run Cactus Browser

**Quick Start Guide to Launch the World's First TSX-Native Browser**

---

## ✅ Prerequisites (One-Time Setup)

### 1. Install Required Tools

```powershell
# Node.js 18+
# Download from: https://nodejs.org/

# Rust
# Download from: https://rustup.rs/
# Or run:
winget install Rustlang.Rustup

# pnpm (recommended) or npm
npm install -g pnpm

# .NET 8.0 SDK
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0

# Visual Studio Build Tools (for Rust compilation)
# Download from: https://visualstudio.microsoft.com/downloads/
# Choose "Desktop development with C++" workload
```

### 2. Verify Installations

```powershell
node --version    # Should be v18+ or v20+
rustc --version   # Should be 1.70+
dotnet --version  # Should be 8.0+
pnpm --version    # Should be 8.0+
```

---

## 🔧 First-Time Setup

### Step 1: Install Dependencies

```powershell
cd J:\projects\minimact\cactus-browser

# Install Node.js dependencies
pnpm install

# Build .NET Native AOT runtime
cd minimact-runtime-aot
dotnet publish -c Release
cd ..
```

### Step 2: Verify Runtime Exists

```powershell
# Check that the runtime binary exists
dir minimact-runtime-aot\bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe
```

**Expected:** File should exist (~10-33MB)

---

## 🏃 Running Cactus Browser

### Development Mode (Recommended)

```powershell
cd J:\projects\minimact\cactus-browser

# Start development server
pnpm tauri dev
```

**What happens:**
1. Vite dev server starts on `http://localhost:1420`
2. Rust backend compiles
3. Tauri window opens with Cactus Browser
4. Hot reload enabled (changes auto-refresh)

**First run:** May take 2-5 minutes to compile Rust dependencies
**Subsequent runs:** ~10-30 seconds

---

## 🎯 Using Cactus Browser

### Once the Window Opens:

1. **Enter a gh:// URL** in the address bar:
   ```
   gh://minimact/docs
   gh://you/your-repo
   ```

2. **Press Enter or click "→ Go"**

3. **Wait for loading:**
   - 🌐 Fetching from GitHub...
   - ⚙️ Compiling TSX → C#...
   - ✅ Rendered!

4. **Navigate:**
   - Click links in the rendered page
   - Use back/forward buttons (← →)
   - Reload page (⟳)

---

## 🐛 Troubleshooting

### Issue: "Rust compile failed"

**Solution:**
```powershell
# Install Visual Studio Build Tools
# Make sure "Desktop development with C++" is selected
# Restart terminal after installation
```

### Issue: "minimact-runtime-aot.exe not found"

**Solution:**
```powershell
cd minimact-runtime-aot
dotnet publish -c Release -r win-x64 --self-contained
```

### Issue: "Port 1420 already in use"

**Solution:**
```powershell
# Kill existing Vite process
taskkill /F /IM node.exe
# Or change port in vite.config.ts
```

### Issue: "Cannot find module '@tauri-apps/api'"

**Solution:**
```powershell
pnpm install
```

### Issue: "SignalM² connection failed"

**Checklist:**
- ✅ Native AOT runtime is built
- ✅ Runtime is in the correct path
- ✅ Tauri resources path is configured correctly

**Check:**
```powershell
# Verify tauri.conf.json has correct resources path
cat src-tauri\tauri.conf.json | grep resources
```

---

## 📊 Current Status

### What Works ✅

- ✅ **Phase 1:** Local TSX loading and compilation
- ✅ **Phase 2:** GitHub repo loading (gh:// protocol)
- ✅ **Phase 3:** Native AOT runtime execution
- ✅ **Phase 4:** Routing with browser history
- ✅ **Phase 5:** SignalM² + Rust reconciler

### What's In Progress 🚧

- 🚧 **DOM Patching:** Patches generated but not yet applied
- 🚧 **State Updates:** Component registry needs completion
- 🚧 **Event Handlers:** onClick works via native events, needs SignalM² integration

### What's Not Yet Built ⏳

- ⏳ **Phase 6:** Caching system
- ⏳ **Phase 7:** PostWeb Index integration
- ⏳ **Phase 8+:** DevTools, Monaco editor, etc.

---

## 🧪 Testing the Build

### Test 1: Verify Compilation

```powershell
# Build frontend
pnpm vite build

# Expected output:
# ✓ built in 3.17s
# dist/index.html created
```

### Test 2: Verify Rust Backend

```powershell
# Build Tauri backend
cd src-tauri
cargo build
cd ..

# Expected output:
# Finished `dev` profile
```

### Test 3: Full Integration

```powershell
# Run in dev mode
pnpm tauri dev

# Expected:
# - Window opens
# - Welcome screen shows
# - "✅ Connected to local runtime" status appears
```

---

## 🏗️ Build for Production (Not Yet Recommended)

```powershell
# Build release version
pnpm tauri build

# Output:
# src-tauri\target\release\cactus-browser.exe
```

**Note:** Production builds not fully tested yet. Use dev mode for now.

---

## 📝 Development Workflow

### Typical Dev Session

```powershell
# 1. Start dev server
pnpm tauri dev

# 2. Make changes to code
#    - Frontend: src/**/*.tsx, src/**/*.ts
#    - Backend: src-tauri/src/**/*.rs
#    - Runtime: minimact-runtime-aot/**/*.cs

# 3. Changes auto-reload (frontend) or recompile (backend)

# 4. Test in Cactus window

# 5. Ctrl+C to stop when done
```

### File Watching

- **Frontend (TypeScript/React):** Hot reload via Vite
- **Backend (Rust):** Auto-recompile via Tauri
- **Runtime (C#):** Manual rebuild required

To rebuild runtime:
```powershell
cd minimact-runtime-aot
dotnet publish -c Release
cd ..
# Restart pnpm tauri dev
```

---

## 🎯 Quick Commands Reference

```powershell
# Install dependencies
pnpm install

# Build .NET runtime
cd minimact-runtime-aot && dotnet publish -c Release && cd ..

# Run dev server
pnpm tauri dev

# Build frontend only
pnpm vite build

# Build backend only
cd src-tauri && cargo build && cd ..

# Clean build artifacts
pnpm clean
cargo clean
dotnet clean

# Run tests (when available)
pnpm test
cargo test
dotnet test
```

---

## 🔍 Logs & Debugging

### View Console Logs

**Frontend:**
- Press F12 in Cactus window
- Check Console tab
- Look for `[App]`, `[SignalM²]`, `[Router]` messages

**Backend:**
- Check terminal where `pnpm tauri dev` is running
- Look for `[Minimact]`, `[Runtime]` messages

**Runtime:**
- Check for temp files in `%TEMP%`
- Look for `minimact-render-*.json` files

### Enable Debug Logging

**Frontend:**
```typescript
// In src/App.tsx
console.log('[Debug] Current state:', { url, html, status });
```

**Backend:**
```rust
// In src-tauri/src/signalm.rs
println!("[Debug] Received message: {:?}", method);
```

**Runtime:**
```csharp
// In minimact-runtime-aot/Program.cs
Console.WriteLine($"[Debug] Request: {requestJson}");
```

---

## 🌐 Example URLs to Test

### Test Basic Loading

```
gh://minimact/docs/pages/index.tsx
```

### Test Multi-Page Navigation

```
gh://minimact/docs
# Then click links like /about, /blog
```

### Test Custom Repos

```
gh://your-username/your-repo
```

---

## 📦 Directory Structure

```
cactus-browser/
├── src/                        # Frontend React app
│   ├── App.tsx                 # Main application
│   ├── core/                   # Core logic
│   │   ├── router.ts          # Routing engine
│   │   ├── github-loader.ts   # GitHub fetching
│   │   └── signalm/           # SignalM² transport
│   └── components/             # UI components (future)
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs            # Tauri entry
│   │   ├── runtime.rs         # .NET runtime integration
│   │   └── signalm.rs         # SignalM² handler
│   └── tauri.conf.json        # Tauri configuration
│
├── minimact-runtime-aot/       # .NET Native AOT runtime
│   ├── Program.cs             # Entry point
│   ├── DynamicCompiler.cs     # Roslyn compilation
│   └── bin/Release/...        # Compiled runtime
│
├── test-pages/                 # Test TSX components
│   └── counter.tsx
│
├── package.json
└── README.md
```

---

## 🆘 Getting Help

### Common Questions

**Q: How long does first build take?**
A: 2-5 minutes (Rust dependencies compile)

**Q: Why is the window slow to open?**
A: Native AOT runtime is loading (~100ms), plus Vite dev server

**Q: Can I use npm instead of pnpm?**
A: Yes, but pnpm is faster and more reliable

**Q: Does it work on Mac/Linux?**
A: Not tested yet, but Tauri supports all platforms

**Q: Why is the bundle so large?**
A: Dev mode includes source maps and debugging. Production builds will be smaller.

---

## ✅ Success Checklist

Before reporting issues, verify:

- [ ] Node.js 18+ installed
- [ ] Rust installed and in PATH
- [ ] .NET 8.0 SDK installed
- [ ] Visual Studio Build Tools installed (C++ workload)
- [ ] `pnpm install` completed successfully
- [ ] .NET runtime built (`minimact-runtime-aot.exe` exists)
- [ ] No port conflicts (1420 available)
- [ ] Terminal has admin rights (if needed)

---

<p align="center">
  <strong>🌵 Ready to browse the Posthydrationist Web! 🌵</strong>
</p>

<p align="center">
  Run <code>pnpm tauri dev</code> and start exploring!
</p>

<p align="center>
  The cactus is alive and waiting for you! 🚀
</p>
