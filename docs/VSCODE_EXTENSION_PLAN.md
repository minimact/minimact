# Minimact VS Code Extension - Development Plan

**Status**: Planning
**Priority**: High - Build MVP before v1.0 release
**Estimated Effort**: 2-3 weeks for MVP, 6-8 weeks for full featured

---

## Executive Summary

A VS Code extension is critical for Minimact's success. It solves the fundamental UX challenge of working with three related files (`.tsx`, `.cs`, `.codebehind.cs`) and provides visual feedback for the TSX → C# transformation process.

**Key Benefits**:
- Prevents developers from editing generated `.cs` files
- Provides instant feedback on transformations
- Makes Minimact feel like a "real" framework with first-class tooling
- Significant marketing signal - shows production-readiness

---

## Problem Statement

### Pain Points Without Extension

1. **Generated File Confusion**
   - Developers will accidentally edit `Counter.cs` instead of `Counter.tsx`
   - No visual indication that `.cs` files are auto-generated
   - Changes get overwritten on next build → frustration

2. **Navigation Friction**
   - Switching between `Counter.tsx`, `Counter.cs`, and `Counter.codebehind.cs` requires manual file opening
   - No quick way to jump between related files
   - Slows down development workflow

3. **Transformation Blindness**
   - Developers won't know if TSX transforms correctly until build time
   - No preview of generated C# code
   - Build errors are discovered late

4. **Lack of IntelliSense**
   - TypeScript knows about `useState`, but doesn't know what it becomes in C#
   - No hover tooltips showing transformation results
   - Missing context about state synchronization behavior

5. **Manual Scaffolding**
   - Creating new components requires manual file creation
   - Easy to forget `.codebehind.cs` when needed
   - No templates or snippets

---

## Feature Tiers

### Tier 1: Essential (Week 1 MVP) 🚨

**Goal**: Prevent mistakes and reduce friction

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **File Icons & Indicators** | Visual distinction between `.tsx` (blue), `.cs` (gray/locked), `.codebehind.cs` (green) | Critical | 2 hours |
| **Generated File Protection** | Warning banner when opening `.cs` files: "⚠️ Auto-generated - Edit Counter.tsx instead" | Critical | 4 hours |
| **Quick Navigation** | Commands to jump between TSX/CS/codebehind files | Critical | 6 hours |
| **Basic Snippets** | `mcomp`, `mstate`, `meffect`, `mpred` snippets | High | 3 hours |

**Total MVP Effort**: ~15 hours (~2 days)

---

### Tier 2: Developer Experience (Weeks 2-3) ✨

**Goal**: Make Minimact feel like a first-class framework

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Preview Generated C#** | Right-click → "Preview Generated C#" shows side-by-side diff | High | 12 hours |
| **Component Scaffolding** | Wizard to create new components with optional codebehind | High | 8 hours |
| **Build Status Indicator** | Status bar showing watcher status and last build time | Medium | 6 hours |
| **Syntax Highlighting** | Enhanced highlighting for `.codebehind.cs` files | Medium | 4 hours |
| **Quick Fixes** | Code actions like "Create codebehind file" | Medium | 8 hours |

**Total Tier 2 Effort**: ~38 hours (~5 days)

---

### Tier 3: Power Features (Weeks 4-6) 🚀

**Goal**: Enable advanced debugging and optimization

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Hook Hover Tooltips** | Hover over `useState` to see generated C# code | High | 10 hours |
| **Inline Diagnostics** | Show errors/warnings for type mismatches, invalid hints | High | 12 hours |
| **Prediction Inspector** | Panel showing hint queue, cache hits/misses, performance | Medium | 20 hours |
| **SignalR Traffic Viewer** | Intercept and display SignalR messages | Low | 16 hours |
| **Rename Refactoring** | Rename state variables across all three files | Medium | 10 hours |

**Total Tier 3 Effort**: ~68 hours (~9 days)

---

## Detailed Feature Specifications

### 1. File Icons & Visual Indicators

**File Tree Appearance**:
```
📁 components/
  ├── 📘 Counter.tsx              (Blue - editable)
  ├── 🔒 Counter.cs               (Gray - generated, read-only)
  └── ⚙️ Counter.codebehind.cs    (Green - editable)
```

**Editor Tab Appearance**:
```
[Counter.tsx] [Counter.cs 🔒 Auto-generated] [Counter.codebehind.cs ⚙️]
```

**Implementation**:
- Use `FileDecorationProvider` API
- Register custom file decorations for `.cs` files in components directory
- Apply different colors and badges based on file type

---

### 2. Generated File Protection

**When Opening `Counter.cs`**:
```
┌────────────────────────────────────────────────────┐
│ ⚠️ This file is auto-generated - Do not edit      │
│                                                     │
│ Changes will be overwritten on next build.         │
│                                                     │
│ [Edit Counter.tsx] [View Codebehind] [Dismiss]    │
└────────────────────────────────────────────────────┘
```

**Implementation**:
- Detect when user opens `.cs` file in `src/components/`
- Show information message with action buttons
- Optionally make file read-only in editor
- Provide quick navigation to source `.tsx` file

**Configuration**:
```json
{
  "minimact.warnOnGeneratedFileEdit": true,
  "minimact.makeGeneratedFilesReadOnly": false
}
```

---

### 3. Quick Navigation

**Command Palette Commands**:
- `Minimact: Go to TSX Source`
- `Minimact: Go to Generated C#`
- `Minimact: Go to Codebehind`
- `Minimact: Switch Between Related Files` (cycles through all three)
- `Minimact: Create Codebehind File` (if doesn't exist)

**Keybindings** (suggested):
- `Cmd+K, Cmd+T` - Go to TSX
- `Cmd+K, Cmd+C` - Go to Generated C#
- `Cmd+K, Cmd+B` - Go to Codebehind
- `Cmd+K, Cmd+S` - Cycle through files

**CodeLens Integration**:
```typescript
// Appears above component in Counter.tsx:
/** 2 references | View Generated C# | Open Codebehind */
export function Counter() {
```

**Implementation**:
- Detect current file and find related files by naming convention
- Use `vscode.window.showTextDocument()` to switch
- Implement `CodeLensProvider` for inline navigation links

---

### 4. Preview Generated C#

**Right-Click Context Menu**:
```
┌─────────────────────────────────────┐
│ Cut                                 │
│ Copy                                │
│ Paste                               │
│ ────────────────────────────────    │
│ Preview Generated C#            ✨  │
│ Compare with Generated              │
│ View Transformation Diff            │
└─────────────────────────────────────┘
```

**Side-by-Side View**:
```
┌──────────────────────────┬──────────────────────────┐
│ Counter.tsx              │ Counter.cs (preview)     │
├──────────────────────────┼──────────────────────────┤
│ import { useState }      │ using Minimact.Core;     │
│ from '@minimact/core';         │                          │
│                          │ public partial class     │
│ export function Counter()│   Counter : Component {  │
│ {                        │                          │
│   const [count, setCount]│   [State]                │
│     = useState(0);       │   private int count = 0; │
│                          │                          │
│   return (               │   protected override     │
│     <div>                │   VNode Render() {       │
│       <p>Count: {count}  │     return new VElement( │
│       </p>               │       "div",             │
│     </div>               │       new VElement("p",  │
│   );                     │         $"Count: {count}"│
│ }                        │       )                  │
│                          │     );                   │
│                          │   }                      │
│                          │ }                        │
└──────────────────────────┴──────────────────────────┘
```

**Implementation**:
- Run Babel plugin programmatically on current file
- Parse TSX, generate C# output
- Use `vscode.diff()` to show side-by-side comparison
- Cache results for performance

**Configuration**:
```json
{
  "minimact.previewUpdateOnSave": true,
  "minimact.previewShowInSidebar": false
}
```

---

### 5. Component Scaffolding Wizard

**Trigger**:
- Right-click in Explorer → "New Minimact Component..."
- Command Palette → "Minimact: Create Component"

**Wizard UI**:
```
┌────────────────────────────────────────────────────┐
│ Create Minimact Component                          │
├────────────────────────────────────────────────────┤
│ Component Name:                                    │
│ [TodoList_____________________________]            │
│                                                    │
│ Location:                                          │
│ [src/components/___________________] [Browse...]   │
│                                                    │
│ Options:                                           │
│ ☑ Create codebehind file (.codebehind.cs)        │
│ ☐ Add useState example                            │
│ ☐ Add useEffect example                           │
│ ☐ Add useDomElementState (Minimact Punch)        │
│ ☐ Include TypeScript types file                   │
│                                                    │
│                             [Cancel]  [Create]     │
└────────────────────────────────────────────────────┘
```

**Generated Files**:
```typescript
// src/components/TodoList.tsx
import { useState } from '@minimact/core';

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

```csharp
// src/components/TodoList.codebehind.cs (if requested)
using Microsoft.EntityFrameworkCore;

public partial class TodoList
{
  private readonly AppDbContext _db;

  public TodoList(AppDbContext db)
  {
    _db = db;
  }

  // Add business logic methods here
}
```

**Implementation**:
- Use `vscode.window.showInputBox()` for component name
- Use `vscode.window.showQuickPick()` for options
- Generate files from templates
- Open created `.tsx` file in editor

---

### 6. Hook Hover Tooltips

**Hover over `useState`**:
```typescript
const [count, setCount] = useState(0);
//            ↑ Hover here
```

**Tooltip Display**:
```
╔═══════════════════════════════════════════════════╗
║ useState<number>(initialValue: number)            ║
║                                                   ║
║ Generates C#:                                     ║
║   [State] private int count = 0;                 ║
║                                                   ║
║ State Synchronization:                            ║
║   ✓ Auto-sync to server on setState()           ║
║   ✓ Prevents stale data issues                   ║
║                                                   ║
║ Performance:                                      ║
║   ~5ms (cache hit) / ~45ms (cache miss)          ║
║                                                   ║
║ [View Generated Code] [Documentation]            ║
╚═══════════════════════════════════════════════════╝
```

**Implementation**:
- Implement `HoverProvider` for TypeScript files
- Detect hook function calls using AST parsing
- Show transformed C# code in hover
- Include performance characteristics and behavior notes

---

### 7. Inline Diagnostics

**Type Mismatch Detection**:
```typescript
const [count, setCount] = useState(0);
const [name, setName] = useState(123);  // ❌ Error
                                    ~~~
                        Type mismatch: Initial value is number,
                        but JSX uses {name} as string
```

**Invalid Hint Warning**:
```typescript
usePredictHint('increment', { count: count + 1 });  // ✓ Valid

usePredictHint('increment', { invalid: true });     // ⚠️ Warning
                            ~~~~~~~~~~~~~~~~~~
                            Hint state doesn't match component state.
                            Valid keys: count
```

**Implementation**:
- Implement `DiagnosticCollection`
- Run validation on save/type
- Check type consistency across hooks and JSX
- Validate hint state matches component state

---

### 8. Build Status Indicator

**Status Bar Item**:
```
Minimact: ● Watching (3 components) | ✓ Last build: 1.2s ago
```

**Click to Show Panel**:
```
┌────────────────────────────────────────────────────┐
│ 📊 Minimact Build Status                           │
├────────────────────────────────────────────────────┤
│ Components: 12                                     │
│ Last Build: 1.2s ago                               │
│ Status: ✓ Watching                                 │
│                                                    │
│ Recent Transformations:                            │
│ ✓ Counter.tsx → Counter.cs (45ms)                  │
│ ✓ TodoList.tsx → TodoList.cs (67ms)               │
│ ✗ Profile.tsx → Error: Invalid JSX (102ms)        │
│                                                    │
│ [View Full Logs] [Restart Watcher] [Stop]         │
└────────────────────────────────────────────────────┘
```

**Implementation**:
- Monitor file watcher output
- Track transformation times and results
- Update status bar on changes
- Show details in output panel

**Configuration**:
```json
{
  "minimact.showBuildStatus": true,
  "minimact.statusBarPosition": "right",
  "minimact.notifyOnBuildError": true
}
```

---

### 9. Prediction Inspector (Advanced)

**Panel View**:
```
┌────────────────────────────────────────────────────┐
│ 🔮 MINIMACT PREDICTION INSPECTOR                   │
├────────────────────────────────────────────────────┤
│ Active Component: Counter                          │
│ Connection: localhost:5000 (Connected ✓)          │
│                                                    │
│ Hint Queue (Client Cache):                        │
│ ┌────────────────────────────────────────────────┐ │
│ │ ✓ increment → {count: 1} (conf: 0.95)         │ │
│ │ ✓ increment → {count: 2} (conf: 0.93)         │ │
│ │ ⏳ decrement → {count: 0} (conf: 0.72)         │ │
│ │ ✗ reset → {count: 0} (conf: 0.45) [LOW]      │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ Recent Interactions:                               │
│ ┌────────────────────────────────────────────────┐ │
│ │ 14:32:15 | increment | ✓ HIT  | 2ms | +1      │ │
│ │ 14:32:17 | increment | ✓ HIT  | 1ms | +1      │ │
│ │ 14:32:20 | reset     | ✗ MISS | 48ms | ±0    │ │
│ │ 14:32:25 | increment | ✓ HIT  | 2ms | +1      │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ Performance Metrics:                               │
│ Cache Hit Rate: 87% (13/15 interactions)          │
│ Avg Latency (Hit): 2.1ms                          │
│ Avg Latency (Miss): 46.3ms                        │
│                                                    │
│ [Clear History] [Export Data] [Settings]          │
└────────────────────────────────────────────────────┘
```

**Implementation**:
- Create webview panel
- Connect to dev server via WebSocket
- Subscribe to Playground Bridge events
- Display real-time prediction data
- Show performance metrics

---

### 10. Code Snippets Library

| Prefix | Description | Expansion |
|--------|-------------|-----------|
| `mcomp` | Minimact Component | Full component template |
| `mstate` | useState hook | `const [state, setState] = useState(initialValue);` |
| `meffect` | useEffect hook | `useEffect(() => { ... }, [deps]);` |
| `mref` | useRef hook | `const ref = useRef(initialValue);` |
| `mpred` | usePredictHint | `usePredictHint('hintId', { state: value });` |
| `mdom` | useDomElementState | `const domState = useDomElementState(selector);` |
| `mcb` | Codebehind template | Full codebehind class template |
| `mdb` | Database query method | Async method with EF Core query |
| `mauth` | Authorize attribute | `[Authorize(Roles = "Admin")]` |

**Example Expansions**:

```typescript
// mcomp
import { useState } from '@minimact/core';

export function ${1:ComponentName}() {
  const [${2:state}, set${2/(.*)/${1:/capitalize}/}] = useState(${3:initialValue});

  return (
    <div>
      $0
    </div>
  );
}
```

```typescript
// mpred
usePredictHint('${1:hintId}', {
  ${2:state}: ${3:value}
});
```

```csharp
// mdb
private async Task<${1:List<T>}> ${2:MethodName}()
{
  return await _db.${3:Table}
    .Where(${4:x => x.Condition})
    .ToListAsync();
}
```

---

## Technical Architecture

### Project Structure

```
minimact-vscode/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── src/
│   ├── extension.ts          # Main activation point
│   ├── commands/
│   │   ├── navigation.ts     # Quick navigation commands
│   │   ├── scaffolding.ts    # Component creation wizard
│   │   └── preview.ts        # C# preview generation
│   ├── providers/
│   │   ├── fileDecoration.ts # File icons and badges
│   │   ├── hover.ts          # Hook hover tooltips
│   │   ├── codeLens.ts       # Inline navigation links
│   │   ├── diagnostics.ts    # Error/warning detection
│   │   └── completion.ts     # Snippets and autocomplete
│   ├── panels/
│   │   ├── buildStatus.ts    # Build status panel
│   │   └── inspector.ts      # Prediction inspector webview
│   ├── utils/
│   │   ├── babel.ts          # Babel transformation API
│   │   ├── fileSystem.ts     # File detection utilities
│   │   └── signalr.ts        # SignalR connection (optional)
│   └── test/
│       └── suite/
│           └── extension.test.ts
├── snippets/
│   └── minimact.json         # Code snippets
├── syntaxes/
│   └── codebehind.json       # Syntax highlighting (if needed)
└── media/
    ├── icon.png              # Extension icon (cactus 🌵)
    └── webview/              # Webview assets
        ├── inspector.html
        ├── inspector.css
        └── inspector.js
```

---

### Extension Manifest (`package.json`)

```json
{
  "name": "minimact",
  "displayName": "Minimact",
  "description": "Official VS Code extension for Minimact - Server-Side React for ASP.NET Core",
  "version": "0.1.0",
  "publisher": "minimact",
  "icon": "media/icon.png",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": [
    "Programming Languages",
    "Snippets",
    "Other"
  ],
  "keywords": [
    "minimact",
    "react",
    "aspnetcore",
    "csharp",
    "tsx"
  ],
  "activationEvents": [
    "workspaceContains:**/babel.config.js",
    "onLanguage:typescriptreact",
    "onCommand:minimact.goToTsx",
    "onCommand:minimact.goToGenerated",
    "onCommand:minimact.goToCodebehind",
    "onCommand:minimact.createComponent"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "minimact.goToTsx",
        "title": "Go to TSX Source",
        "category": "Minimact"
      },
      {
        "command": "minimact.goToGenerated",
        "title": "Go to Generated C#",
        "category": "Minimact"
      },
      {
        "command": "minimact.goToCodebehind",
        "title": "Go to Codebehind",
        "category": "Minimact"
      },
      {
        "command": "minimact.switchFiles",
        "title": "Switch Between Related Files",
        "category": "Minimact"
      },
      {
        "command": "minimact.createComponent",
        "title": "Create Component",
        "category": "Minimact"
      },
      {
        "command": "minimact.previewGenerated",
        "title": "Preview Generated C#",
        "category": "Minimact"
      },
      {
        "command": "minimact.openInspector",
        "title": "Open Prediction Inspector",
        "category": "Minimact"
      }
    ],
    "keybindings": [
      {
        "command": "minimact.goToTsx",
        "key": "cmd+k cmd+t",
        "when": "editorLangId == csharp"
      },
      {
        "command": "minimact.goToGenerated",
        "key": "cmd+k cmd+c",
        "when": "editorLangId == typescriptreact"
      },
      {
        "command": "minimact.switchFiles",
        "key": "cmd+k cmd+s"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "minimact.previewGenerated",
          "when": "resourceExtname == .tsx",
          "group": "minimact@1"
        }
      ],
      "explorer/context": [
        {
          "command": "minimact.createComponent",
          "when": "explorerResourceIsFolder",
          "group": "minimact@1"
        }
      ]
    },
    "snippets": [
      {
        "language": "typescriptreact",
        "path": "./snippets/minimact.json"
      }
    ],
    "configuration": {
      "title": "Minimact",
      "properties": {
        "minimact.warnOnGeneratedFileEdit": {
          "type": "boolean",
          "default": true,
          "description": "Show warning when opening auto-generated .cs files"
        },
        "minimact.makeGeneratedFilesReadOnly": {
          "type": "boolean",
          "default": false,
          "description": "Make generated .cs files read-only in the editor"
        },
        "minimact.previewUpdateOnSave": {
          "type": "boolean",
          "default": true,
          "description": "Auto-update C# preview when TSX file is saved"
        },
        "minimact.showBuildStatus": {
          "type": "boolean",
          "default": true,
          "description": "Show build status in status bar"
        },
        "minimact.componentsDirectory": {
          "type": "string",
          "default": "src/components",
          "description": "Default directory for components"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "@vscode/test-electron": "^2.3.0"
  },
  "dependencies": {
    "@babel/core": "^7.22.0",
    "@babel/parser": "^7.22.0",
    "minimact-babel-plugin": "workspace:*"
  }
}
```

---

### Integration Points

#### 1. Babel Plugin Integration

The extension needs to run the Babel plugin to generate C# previews:

```typescript
// src/utils/babel.ts
import { transformAsync } from '@babel/core';
import minimactPlugin from 'minimact-babel-plugin';

export async function transformTsxToCSharp(tsxCode: string): Promise<string> {
  const result = await transformAsync(tsxCode, {
    plugins: [minimactPlugin],
    filename: 'component.tsx'
  });

  return result?.code || '';
}
```

#### 2. Dev Server Communication

For advanced features (prediction inspector, SignalR traffic), connect to the running dev server:

```typescript
// src/utils/signalr.ts
import * as signalR from '@microsoft/signalr';

export class DevServerConnection {
  private connection: signalR.HubConnection | null = null;

  async connect(url: string) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${url}/minimact-inspector`)
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  onPredictionQueued(callback: (data: any) => void) {
    this.connection?.on('PredictionQueued', callback);
  }

  onCacheHit(callback: (data: any) => void) {
    this.connection?.on('CacheHit', callback);
  }
}
```

#### 3. File Watcher Integration

Monitor Babel transformation process:

```typescript
// src/utils/watcher.ts
import * as vscode from 'vscode';

export class BabelWatcher {
  private watcher: vscode.FileSystemWatcher;
  private onTransform: (file: string, success: boolean, time: number) => void;

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.tsx');

    this.watcher.onDidChange(uri => {
      this.handleFileChange(uri);
    });
  }

  private async handleFileChange(uri: vscode.Uri) {
    const startTime = Date.now();
    try {
      // Trigger transformation
      const success = await this.transform(uri.fsPath);
      const elapsed = Date.now() - startTime;
      this.onTransform(uri.fsPath, success, elapsed);
    } catch (error) {
      this.onTransform(uri.fsPath, false, Date.now() - startTime);
    }
  }
}
```

---

## User Experience Flow

### First-Time User

1. **Install Extension** from VS Code Marketplace
2. **Open Minimact Project** - Extension detects `babel.config.js` with Minimact plugin
3. **Welcome Notification**:
   ```
   🌵 Minimact extension activated!
   [Take Tour] [Create First Component] [Dismiss]
   ```
4. **Interactive Tutorial** - Walkthrough showing:
   - File icons and what they mean
   - How to navigate between files
   - Creating a component with scaffolding
   - Previewing generated C#

### Daily Development Workflow

1. **Start Dev Server** - `minimact dev` in terminal
2. **Status Bar Updates** - Shows "Minimact: ● Watching (0 components)"
3. **Create Component** - Right-click folder → "New Minimact Component..."
4. **Write TSX** - IntelliSense, snippets, and hover tooltips guide development
5. **Save File** - Automatic transformation, status bar updates
6. **Preview C#** - Right-click → "Preview Generated C#" to verify
7. **Add Business Logic** - Create codebehind file for database access
8. **Debug** - Set breakpoints in C#, monitor predictions in inspector

### Error Handling

1. **Transformation Error** - Red squiggly in TSX, diagnostic message:
   ```
   ❌ Babel transformation failed: Unexpected token

   Counter.tsx:12:5
   ```
2. **Type Mismatch** - Warning in TSX:
   ```
   ⚠️ Type mismatch: useState<number> but JSX uses as string
   ```
3. **Invalid Hint** - Warning in prediction:
   ```
   ⚠️ Hint state doesn't match component state
   Valid keys: count, isLoading
   ```

---

## Testing Strategy

### Unit Tests

```typescript
// src/test/suite/navigation.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { findRelatedFiles } from '../../utils/fileSystem';

suite('Navigation Tests', () => {
  test('Should find related files', async () => {
    const tsxPath = '/src/components/Counter.tsx';
    const related = await findRelatedFiles(tsxPath);

    assert.strictEqual(related.generated, '/src/components/Counter.cs');
    assert.strictEqual(related.codebehind, '/src/components/Counter.codebehind.cs');
  });

  test('Should navigate to generated file', async () => {
    // Mock file system
    // Test navigation command
  });
});
```

### Integration Tests

```typescript
// src/test/suite/transformation.test.ts
suite('Babel Transformation Tests', () => {
  test('Should transform useState correctly', async () => {
    const tsx = `
      export function Counter() {
        const [count, setCount] = useState(0);
        return <div>{count}</div>;
      }
    `;

    const csharp = await transformTsxToCSharp(tsx);

    assert.ok(csharp.includes('[State]'));
    assert.ok(csharp.includes('private int count = 0'));
  });
});
```

### Manual Testing Checklist

- [ ] File icons appear correctly
- [ ] Warning shows when opening generated `.cs` file
- [ ] Navigation commands work between all three files
- [ ] Component scaffolding wizard creates files correctly
- [ ] C# preview shows accurate transformation
- [ ] Snippets expand correctly
- [ ] Hover tooltips show on hooks
- [ ] Build status updates in real-time
- [ ] Diagnostics appear for errors
- [ ] Inspector panel connects to dev server

---

## Deployment Strategy

### Pre-Release (Alpha)

1. **GitHub Repository** - `minimact/minimact-vscode`
2. **Install via VSIX** - Package and share `.vsix` file
3. **Feedback Loop** - Collect issues on GitHub
4. **Iteration** - Weekly updates based on feedback

### Public Release (Beta)

1. **VS Code Marketplace** - Publish under `minimact` publisher
2. **Semantic Versioning** - Start at `0.1.0`
3. **Changelog** - Document all changes
4. **Announcement** - Blog post, Twitter, Discord

### Version 1.0

1. **Feature Complete** - All Tier 1 + 2 features
2. **Thoroughly Tested** - No critical bugs
3. **Documentation** - Complete README with screenshots
4. **Marketplace SEO** - Keywords, categories, screenshots

---

## Marketing & Documentation

### Extension README

````markdown
# Minimact for VS Code

Official Visual Studio Code extension for **Minimact** - Server-Side React for ASP.NET Core.

## Features

### 🔒 Generated File Protection
Never accidentally edit auto-generated `.cs` files again. The extension warns you and guides you to the correct file.

![Generated File Warning](images/warning.png)

### 🚀 Quick Navigation
Jump between related files instantly with keyboard shortcuts.

![Navigation Demo](images/navigation.gif)

### 👁️ Preview Generated C#
See what your TSX transforms into before building.

![Preview Demo](images/preview.png)

### 🎯 Component Scaffolding
Create new components with a wizard.

![Scaffolding Demo](images/scaffold.gif)

## Getting Started

1. Install the extension
2. Open a Minimact project (or create one with `minimact new my-app`)
3. Start the dev server with `minimact dev`
4. Create a component with `Cmd+Shift+P` → "Minimact: Create Component"

## Keyboard Shortcuts

- `Cmd+K, Cmd+T` - Go to TSX Source
- `Cmd+K, Cmd+C` - Go to Generated C#
- `Cmd+K, Cmd+B` - Go to Codebehind
- `Cmd+K, Cmd+S` - Switch Between Files

## Snippets

Type these prefixes and press `Tab`:

- `mcomp` - Component template
- `mstate` - useState hook
- `meffect` - useEffect hook
- `mpred` - usePredictHint

## Configuration

```json
{
  "minimact.warnOnGeneratedFileEdit": true,
  "minimact.makeGeneratedFilesReadOnly": false,
  "minimact.showBuildStatus": true
}
```

## Support

- [Documentation](https://minimact.dev/docs)
- [GitHub Issues](https://github.com/minimact/minimact-vscode/issues)
- [Discord Community](https://discord.gg/minimact)

## License

MIT
````

### Screenshots for Marketplace

1. **File Tree** - Showing colored icons
2. **Warning Banner** - When opening generated file
3. **Navigation** - Animated GIF of switching files
4. **Preview** - Side-by-side TSX/C# comparison
5. **Scaffolding** - Component creation wizard
6. **Inspector** - Prediction inspector panel

---

## Success Metrics

### Adoption Metrics

- **Downloads**: Target 1,000+ in first month
- **Active Users**: Target 500+ weekly active
- **Rating**: Target 4.5+ stars
- **Reviews**: Monitor feedback for pain points

### Usage Metrics (via Telemetry - opt-in)

- **Most Used Commands**: Which navigation commands are popular
- **Scaffolding Usage**: How often users create components via wizard
- **Preview Usage**: How often users preview generated C#
- **Error Rate**: How often transformations fail

### Impact Metrics

- **Reduced Mistakes**: Track how often generated file warning prevents edits
- **Faster Development**: Measure time saved with navigation shortcuts
- **Better Onboarding**: Survey new users on extension helpfulness

---

## Maintenance Plan

### Bug Fixes

- **Critical**: Fix within 24 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 1 month
- **Low**: Fix in next minor release

### Feature Requests

- Collect via GitHub Issues
- Prioritize based on votes and impact
- Communicate roadmap in README

### Compatibility

- **VS Code**: Support latest stable + previous 2 versions
- **Minimact**: Support current + previous major version
- **Node.js**: Support current LTS versions

### Updates

- **Patch**: Bug fixes, minor improvements (weekly)
- **Minor**: New features (monthly)
- **Major**: Breaking changes (as needed, with migration guide)

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Babel API changes | High | Low | Pin to specific version, test upgrades |
| VS Code API deprecation | Medium | Low | Monitor release notes, update promptly |
| Performance issues | High | Medium | Profile and optimize, lazy load features |
| File system edge cases | Medium | Medium | Comprehensive testing on Windows/Mac/Linux |

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low adoption | High | Medium | Marketing, quality docs, early user feedback |
| Feature bloat | Medium | High | Strict prioritization, user research |
| User confusion | Medium | Medium | Clear UI, good error messages, documentation |
| Support burden | Medium | Medium | Good docs, FAQ, community Discord |

---

## Open Questions

1. **Telemetry**: Should we collect anonymous usage data? (Opt-in only)
2. **Pricing**: Extension is free, but could offer Pro features later?
3. **Multi-Framework**: Should we support other frameworks in the future?
4. **Language Server**: Should we build a full LSP for deeper integration?
5. **Extension Pack**: Should we bundle with recommended extensions (C# Dev Kit, etc.)?

---

## Conclusion

The Minimact VS Code extension is **essential** for product success. It solves fundamental UX problems, provides instant value to developers, and signals that Minimact is a production-ready framework with first-class tooling.

**Recommendation**: Build the **Week 1 MVP immediately** (file icons, warnings, navigation, snippets). This takes ~2 days of effort but prevents major frustration and makes Minimact feel professional from day one.

Then iterate based on user feedback. Don't build the prediction inspector until users ask for it. Focus on removing friction first, adding power features second.

**Timeline**:
- **Week 1**: MVP (Tier 1) - Ship with alpha release
- **Weeks 2-3**: DX polish (Tier 2) - Ship with beta release
- **Weeks 4-6**: Power features (Tier 3) - Ship with v1.0

🌵 **The cactus thrives with the right tools.** ⚡
