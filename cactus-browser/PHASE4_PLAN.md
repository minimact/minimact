# 🌵 Phase 4: Tauri Integration

**Goal:** Wire Tauri backend to Native AOT runtime and display rendered components in the browser

---

## What We Have

✅ **Phase 1-3 Complete:**
- Local TSX compilation via Babel
- GitHub repo loader with `gh://` protocol
- Native AOT runtime (33MB exe, no .NET SDK needed!)
- C# dynamic compilation (Roslyn)
- VNode → JSON serialization
- VNode → HTML generation

---

## What We're Building

```
┌─────────────────────────────────────────┐
│   React Frontend (Address Bar + UI)    │
└──────────────┬──────────────────────────┘
               │ invoke('execute_component')
               ↓
┌─────────────────────────────────────────┐
│   Rust Backend (Tauri Commands)         │
│   - execute_component()                  │
│   - Call Native AOT runtime              │
└──────────────┬──────────────────────────┘
               │ spawn process
               ↓
┌─────────────────────────────────────────┐
│   minimact-runtime.exe                   │
│   (Native AOT, 33MB)                     │
│   - Read request.json                    │
│   - Compile C# dynamically               │
│   - Execute component.Render()           │
│   - Return VNode JSON + HTML             │
└──────────────┬──────────────────────────┘
               │ stdout (JSON response)
               ↓
┌─────────────────────────────────────────┐
│   React Frontend                         │
│   - Display HTML in viewer               │
│   - Apply event handlers                 │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Tauri Commands

**src-tauri/src/runtime.rs (new file):**

```rust
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Debug)]
pub struct ExecuteRequest {
    pub csharp: String,
    pub templates: serde_json::Value,
    pub initial_state: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ExecuteResponse {
    pub success: bool,
    pub vnode_json: Option<String>,
    pub html: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn execute_component(
    app: AppHandle,
    request: ExecuteRequest
) -> Result<ExecuteResponse, String> {
    // 1. Get path to minimact-runtime.exe
    let runtime_path = get_runtime_path(&app)?;

    if !runtime_path.exists() {
        return Err(format!(
            "Runtime not found at: {}\nRun build-runtime.bat first!",
            runtime_path.display()
        ));
    }

    // 2. Write request to temp file
    let temp_dir = std::env::temp_dir();
    let request_id = uuid::Uuid::new_v4();
    let request_path = temp_dir.join(format!("cactus-request-{}.json", request_id));

    let request_json = serde_json::to_string_pretty(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    fs::write(&request_path, request_json)
        .map_err(|e| format!("Failed to write request file: {}", e))?;

    // 3. Execute runtime
    println!("[Tauri] Executing runtime: {}", runtime_path.display());
    println!("[Tauri] Request file: {}", request_path.display());

    let output = Command::new(&runtime_path)
        .arg(&request_path)
        .output()
        .map_err(|e| format!("Failed to execute runtime: {}", e))?;

    // 4. Clean up temp file
    let _ = fs::remove_file(&request_path);

    // 5. Check exit code
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Runtime execution failed:\n{}", stderr));
    }

    // 6. Parse response
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("[Tauri] Runtime response:\n{}", stdout);

    let response: ExecuteResponse = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse response: {}\nOutput: {}", e, stdout))?;

    Ok(response)
}

fn get_runtime_path(app: &AppHandle) -> Result<PathBuf, String> {
    // In development: use local build
    let dev_path = PathBuf::from("./minimact-runtime/bin/Release/net8.0/win-x64/publish/minimact-runtime.exe");
    if dev_path.exists() {
        return Ok(dev_path);
    }

    // In production: runtime is bundled with app
    let resource_path = app.path_resolver()
        .resource_dir()
        .ok_or("Failed to get resource dir")?
        .join("minimact-runtime.exe");

    Ok(resource_path)
}
```

**Add uuid dependency to Cargo.toml:**

```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["v4"] }
```

---

### Step 2: Register Tauri Command

**src-tauri/src/main.rs:**

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod runtime;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            runtime::execute_component
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Step 3: Update Frontend to Call Tauri

**src/core/execution-engine.ts:**

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface ExecuteRequest {
  csharp: string;
  templates: any;
  initial_state: any;
}

export interface ExecuteResponse {
  success: boolean;
  vnode_json: string | null;
  html: string | null;
  error: string | null;
}

export async function executeComponent(
  csharp: string,
  templates: any,
  initialState: any = {}
): Promise<ExecuteResponse> {
  console.log('[Frontend] Executing component...');
  console.log('[Frontend] C# length:', csharp.length);

  try {
    const request: ExecuteRequest = {
      csharp,
      templates,
      initial_state: initialState
    };

    const response = await invoke<ExecuteResponse>('execute_component', {
      request
    });

    console.log('[Frontend] Execution result:', response);

    return response;
  } catch (err: any) {
    console.error('[Frontend] Execution failed:', err);

    return {
      success: false,
      vnode_json: null,
      html: null,
      error: err.toString()
    };
  }
}
```

---

### Step 4: Update App.tsx to Execute and Render

**src/App.tsx:**

```typescript
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { executeComponent } from './core/execution-engine';
import './App.css';

interface CompilationResult {
  csharp: string;
  templates: any;
  keys: any;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [vnodeJson, setVnodeJson] = useState('');
  const [error, setError] = useState('');

  async function handleGo() {
    if (!url.trim()) {
      setError('Please enter a gh:// URL');
      return;
    }

    setLoading(true);
    setStatus('Loading from GitHub...');
    setError('');
    setHtml('');
    setVnodeJson('');

    try {
      // Phase 2: Load from GitHub
      setStatus('Fetching from GitHub...');
      const files = await loadFromGitHub(url);

      setStatus('Compiling TSX → C#...');
      // files is a Map<path, content>
      const entryFile = files.entries().next().value;
      if (!entryFile) {
        throw new Error('No files loaded from GitHub');
      }

      const [path, content] = entryFile;

      // Compile (you already have this from Phase 2)
      const compiled = await compileTsx(content, path);

      setStatus('Executing C# component...');

      // Phase 3: Execute via Native AOT runtime
      const result = await executeComponent(
        compiled.csharp,
        compiled.templates,
        {}
      );

      if (!result.success) {
        setError(result.error || 'Execution failed');
        setStatus('Error');
        setLoading(false);
        return;
      }

      // Phase 4: Display results
      setHtml(result.html || '');
      setVnodeJson(result.vnode_json || '');
      setStatus('✅ Rendered successfully! 🌵');
      setLoading(false);

    } catch (err: any) {
      setError(err.message || err.toString());
      setStatus('❌ Error');
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🌵 Cactus Browser</h1>
        <p>The TSX-Native Web</p>
      </div>

      <div className="address-bar">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="gh://user/repo/path.tsx"
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleGo()}
          disabled={loading}
        />
        <button onClick={handleGo} disabled={loading}>
          {loading ? 'Loading...' : 'Go'}
        </button>
      </div>

      <div className={`status ${loading ? 'loading' : ''}`}>
        {status}
      </div>

      {error && (
        <div className="error-panel">
          <h3>❌ Error</h3>
          <pre>{error}</pre>
        </div>
      )}

      {html && (
        <div className="content">
          <div className="rendered-view">
            <h3>Rendered Component</h3>
            <div
              className="component-frame"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          <div className="debug-view">
            <h3>VNode Tree (Debug)</h3>
            <pre>{vnodeJson}</pre>
          </div>
        </div>
      )}

      {!html && !error && !loading && (
        <div className="welcome">
          <h2>Welcome to Cactus Browser! 🌵</h2>
          <p>Enter a <code>gh://</code> URL above to get started.</p>
          <div className="examples">
            <h3>Try these examples:</h3>
            <ul>
              <li>
                <code>gh://minimact/docs/pages/index.tsx</code>
              </li>
              <li>
                <code>gh://minimact/examples/counter.tsx</code>
              </li>
              <li>
                <code>gh://you/your-repo/pages/home.tsx</code>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder - you have these from Phase 2
async function loadFromGitHub(url: string): Promise<Map<string, string>> {
  // Your existing GitHub loader implementation
  throw new Error('Implement loadFromGitHub from Phase 2');
}

async function compileTsx(source: string, filename: string): Promise<CompilationResult> {
  // Your existing TSX compiler implementation
  throw new Error('Implement compileTsx from Phase 2');
}
```

---

### Step 5: Add Styling

**src/App.css:**

```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
}

.header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.address-bar {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
}

.address-bar input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
}

.address-bar input:focus {
  outline: none;
  border-color: #667eea;
}

.address-bar button {
  padding: 0.75rem 2rem;
  background: #667eea;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.address-bar button:hover:not(:disabled) {
  background: #764ba2;
}

.address-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  padding: 0.75rem 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  font-size: 0.9rem;
}

.status.loading {
  background: #2a3a4a;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.error-panel {
  margin: 1rem;
  padding: 1rem;
  background: #4a2a2a;
  border: 1px solid #a44;
  border-radius: 6px;
}

.error-panel h3 {
  margin: 0 0 0.5rem 0;
  color: #f88;
}

.error-panel pre {
  margin: 0;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
}

.content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.rendered-view,
.debug-view {
  background: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
  overflow: auto;
}

.rendered-view h3,
.debug-view h3 {
  margin: 0 0 1rem 0;
  color: #667eea;
}

.component-frame {
  background: #fff;
  color: #000;
  padding: 1rem;
  border-radius: 4px;
  min-height: 200px;
}

.debug-view pre {
  margin: 0;
  padding: 0.5rem;
  background: #1a1a1a;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.welcome {
  padding: 2rem;
  text-align: center;
}

.welcome h2 {
  color: #667eea;
}

.examples {
  margin-top: 2rem;
  text-align: left;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 6px;
}

.examples h3 {
  margin-top: 0;
  color: #667eea;
}

.examples ul {
  list-style: none;
  padding: 0;
}

.examples li {
  margin: 0.75rem 0;
}

.examples code {
  background: #1a1a1a;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: inline-block;
  font-family: 'Courier New', monospace;
  color: #8be9fd;
}
```

---

### Step 6: Update tauri.conf.json

**src-tauri/tauri.conf.json:**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Cactus Browser",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "exists": true
      },
      "http": {
        "all": true,
        "request": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.minimact.cactus-browser",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "resources": [
        "minimact-runtime/bin/Release/net8.0/win-x64/publish/*"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "Cactus Browser",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

---

### Step 7: Update dev.bat

**dev.bat:**

```batch
@echo off
echo 🌵 Starting Cactus Browser Dev Server...
echo.

REM Check if runtime is built
if not exist "minimact-runtime\bin\Release\net8.0\win-x64\publish\minimact-runtime.exe" (
    echo ❌ Runtime not built! Running build-runtime.bat first...
    call build-runtime.bat
    if errorlevel 1 (
        echo ❌ Runtime build failed!
        pause
        exit /b 1
    )
)

echo ✅ Runtime found
echo.
echo Starting Tauri dev server...
npm run tauri dev

pause
```

---

## Testing Phase 4

### Test 1: Simple Component

**Create test TSX:**

```typescript
// test-tsx/hello.tsx
export function Hello() {
  return <h1>Hello from Cactus Browser! 🌵</h1>;
}
```

**Expected flow:**

1. Enter: `gh://your-user/test-repo/hello.tsx`
2. Click "Go"
3. Status shows: "Fetching from GitHub..."
4. Status shows: "Compiling TSX → C#..."
5. Status shows: "Executing C# component..."
6. Status shows: "✅ Rendered successfully! 🌵"
7. HTML displays: `<h1>Hello from Cactus Browser! 🌵</h1>`

---

### Test 2: Component with State

```typescript
// test-tsx/counter.tsx
import { useState } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Expected output:**

```html
<div>
  <h1>Counter</h1>
  <p>Count: 0</p>
  <button>Increment</button>
</div>
```

(Note: Click won't work yet - that's Phase 5!)

---

## Success Criteria

- ✅ Tauri command `execute_component` registered
- ✅ Frontend can invoke the command
- ✅ Runtime process spawns successfully
- ✅ Request JSON written to temp file
- ✅ Runtime reads request and executes
- ✅ Response JSON returned via stdout
- ✅ Frontend parses response
- ✅ HTML displayed in component frame
- ✅ VNode JSON displayed in debug panel
- ✅ No errors in console
- ✅ UI is responsive and polished

---

## Debugging Tips

### If runtime not found:

```
Error: Runtime not found at: ./minimact-runtime/bin/Release/net8.0/win-x64/publish/minimact-runtime.exe
```

**Solution:** Run `build-runtime.bat`

---

### If compilation fails:

Check runtime logs in temp file:
```
C:\Users\YourName\AppData\Local\Temp\cactus-request-*.json
```

---

### If JSON parsing fails:

Check stdout in Tauri console:
```rust
println!("[Tauri] Runtime response:\n{}", stdout);
```

---

## Commands to Run

```bash
# 1. Build runtime (if not already done)
build-runtime.bat

# 2. Start dev server
dev.bat

# 3. Enter a gh:// URL and click Go!
```

---

## What's Next (Phase 5)

Once rendering works:

1. **Event Handling** - Make buttons clickable
2. **State Updates** - Re-render on setState
3. **Predictions** - Cache patches for instant feedback
4. **Routing** - Navigate between pages
5. **Full Interactivity** - Complete Minimact integration

But first... **LET'S SEE IT RENDER! 🌵🚀**
