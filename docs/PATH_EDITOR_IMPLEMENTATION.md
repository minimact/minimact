# Path-Based JSX Editor: Implementation Plan

## Overview
A keyboard-first, line-based editor for structured JSX/JSON editing using breadcrumb paths. Each line represents a node in the AST, with a path on the left and value on the right.

---

## Phase 1: Core Document Model

### 1.1 Document Structure
```typescript
interface DocumentNode {
  path: string;              // "#jsx/div/p[0]/binding"
  pathSegments: string[];    // ["jsx", "div", "p[0]", "binding"]
  type: NodeType;            // "element" | "attribute" | "binding" | "text" | "import"
  value: string;             // Right-side editable content
  metadata?: Record<string, any>; // Type-specific data
}

interface Document {
  lines: DocumentNode[];
  version: number;
  astCache: ASTNode;         // Compiled JSON structure
}
```

### 1.2 Path Parser
- Parse path strings into segments: `#jsx/div/p[0]/@className` → `["jsx", "div", "p[0]", "@className"]`
- Extract indices from array notation: `p[0]` → element="p", index=0
- Validate path syntax
- Detect node type from path pattern (@ prefix = attribute, binding keyword, etc.)

### 1.3 Document Operations
```typescript
interface DocumentOperations {
  insertLine(afterPath: string, newNode: DocumentNode): void;
  deleteLine(path: string): void;
  updateLine(path: string, newValue: string): void;
  moveLine(fromPath: string, toPath: string): void;

  // Bulk operations
  indentLine(path: string): void;    // Nest under previous sibling
  outdentLine(path: string): void;   // Move up one level
  duplicateLine(path: string): void;
}
```

### 1.4 AST Sync Layer
- Bidirectional conversion: `DocumentNode[] ↔ JSON AST`
- Incremental updates: only rebuild affected subtrees
- Validation: ensure paths are valid, no duplicates, proper hierarchy
- Auto-repair: fix indices when lines are inserted/deleted

---

## Phase 2: Editor Core

### 2.1 Line Rendering
```typescript
interface LineComponent {
  node: DocumentNode;
  isSelected: boolean;
  isFocused: boolean;
  onBreadcrumbClick: (segment: string) => void;
  onValueChange: (newValue: string) => void;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ #jsx/div/p[0]/@className          │ container              │
│                                    │                        │
│ ◄────── breadcrumb ──────►        │ ◄──── value ──────►   │
│    (read-only, navigable)          │    (editable)         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Cursor & Selection System
```typescript
interface Cursor {
  lineIndex: number;
  position: "breadcrumb" | "value";
  breadcrumbSegmentIndex?: number;  // Which part of path is focused
  valueOffset?: number;              // Character position in value
}

interface Selection {
  start: Cursor;
  end: Cursor;
  isMultiline: boolean;
}
```

### 2.3 Keyboard Navigation
**Breadcrumb Mode:**
- `←/→` - Navigate between path segments
- `/` - Move to next segment
- `Tab` - Switch to value editor
- `Ctrl+Space` - Open segment autocomplete
- `Backspace` - Delete segment (move node up hierarchy)

**Value Mode:**
- Standard text editing
- `Tab` - Indent line / Create child
- `Enter` - Create new sibling line
- `Shift+Tab` - Outdent line
- `Esc` - Return to breadcrumb mode

**Line Navigation:**
- `↑/↓` - Move between lines
- `Ctrl+↑/↓` - Move line up/down
- `Alt+↑/↓` - Expand/collapse in tree view

### 2.4 Undo/Redo System
```typescript
interface Operation {
  type: "insert" | "delete" | "update" | "move";
  timestamp: number;
  beforeState: DocumentNode[];
  afterState: DocumentNode[];
  cursorBefore: Cursor;
  cursorAfter: Cursor;
}

class UndoStack {
  operations: Operation[];
  currentIndex: number;
  undo(): void;
  redo(): void;
  push(op: Operation): void;
}
```

---

## Phase 3: Intellisense & Autocomplete

### 3.1 Path Completion Provider
```typescript
interface PathCompletionProvider {
  // Suggest next segment based on current path
  getSuggestions(currentPath: string, cursorSegment: number): Suggestion[];
}

interface Suggestion {
  text: string;              // "p", "@className", "binding"
  description: string;       // "Paragraph element"
  nodeType: NodeType;
  icon?: string;
  insertTemplate?: string;   // Default value to insert
}
```

**Context-Aware Suggestions:**
```typescript
// At #jsx/div/|
suggestions = ["div", "p", "span", "h1", "h2", "@className", "binding"]

// At #jsx/div/p[0]/|
suggestions = ["binding", "text", "@className", "@id", "@style"]

// At #jsx/import/|
suggestions = ["react", "useState", "useEffect", "./components/Button"]
```

### 3.2 Value Completion Provider
Based on node type:
- **Attributes**: Suggest valid HTML/React props
- **Bindings**: Suggest available variables from scope
- **Element types**: Suggest valid HTML tags + custom components
- **Imports**: Suggest package names, file paths

### 3.3 Completion UI
```
#jsx/div/|
┌─────────────────────────┐
│ > div     Container     │
│   p       Paragraph     │
│   span    Span          │
│   @class  Attribute     │
│   binding Expression    │
└─────────────────────────┘
```

- Fuzzy search
- Keyboard navigation (↑/↓)
- Enter to accept
- Tab to preview
- Esc to dismiss

---

## Phase 4: Tree View Panel

### 4.1 Hierarchical Tree
```typescript
interface TreeNode {
  path: string;
  label: string;
  type: NodeType;
  children: TreeNode[];
  isExpanded: boolean;
  depth: number;
}
```

**Visual:**
```
┌─ TREE VIEW ─────────┐
│ ▼ div               │
│   ▼ div[0]          │
│     • h1            │ ← corresponds to line
│   ▼ div[1]          │
│     • @className    │
│     • h3            │
│     ▼ p             │
│       • binding     │
└─────────────────────┘
```

### 4.2 Tree Interactions
- Click node → navigate to line
- Drag & drop → reorder/reparent
- Right-click → context menu (add child, delete, duplicate)
- Expand/collapse → filter visible lines
- Sync scroll with editor

### 4.3 Tree-Editor Sync
```typescript
interface SyncManager {
  onLineSelected(path: string): void;     // Highlight in tree
  onTreeNodeSelected(path: string): void; // Navigate to line
  onTreeNodeMoved(from: string, to: string): void; // Reorder lines
}
```

---

## Phase 5: Advanced Editing Features

### 5.1 Multi-line Operations
- Select multiple lines (Shift+↑/↓)
- Bulk indent/outdent
- Bulk delete
- Copy/paste preserving structure

### 5.2 Search & Replace
```typescript
interface SearchProvider {
  searchPaths(query: string): DocumentNode[];      // Search breadcrumbs
  searchValues(query: string): DocumentNode[];     // Search values
  searchBoth(query: string): DocumentNode[];       // Both

  replace(fromPath: string, toPath: string): void;
  replaceValue(path: string, from: string, to: string): void;
}
```

### 5.3 Templates & Snippets
```typescript
interface Template {
  trigger: string;           // "div.container"
  expansion: DocumentNode[]; // Multiple lines to insert
}

// Example: type "div.card" + Tab
// Expands to:
// #jsx/div/@className          card
// #jsx/div/h2                  Title
// #jsx/div/p                   Content
```

### 5.4 Validation & Linting
```typescript
interface Validator {
  validatePath(path: string): ValidationError[];
  validateValue(node: DocumentNode): ValidationError[];
  validateHierarchy(lines: DocumentNode[]): ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning" | "info";
  quickFix?: QuickFix;
}
```

**Validation Rules:**
- No duplicate paths
- Valid parent-child relationships
- Required attributes present
- Type-safe values
- Valid imports

---

## Phase 6: LSP Integration

### 6.1 Virtual Document
```typescript
class VirtualDocumentProvider {
  // Generate text representation for LSP
  toTextDocument(doc: Document): string;

  // Map positions between formats
  pathToPosition(path: string): Position;
  positionToPath(pos: Position): string;

  // Handle LSP requests
  onCompletion(pos: Position): CompletionItem[];
  onHover(pos: Position): Hover;
  onDefinition(pos: Position): Location;
}
```

**Text Representation:**
```typescript
// LSP sees this:
const doc = `
#jsx/div/@className container
#jsx/div/p[0]/binding userName
#jsx/div/p[1] Hello World
`;

// Maps to positions:
line 1, col 0-25: path "#jsx/div/@className"
line 1, col 26-35: value "container"
```

### 6.2 LSP Server Adapter
```typescript
interface LSPAdapter {
  initialize(): void;
  onDidChangeTextDocument(changes: TextDocumentContentChangeEvent[]): void;
  onCompletion(params: CompletionParams): CompletionItem[];
  onDiagnostic(uri: string): Diagnostic[];
}
```

### 6.3 Diagnostic Display
- Inline error squiggles in value editor
- Gutter icons for line-level errors
- Problems panel below editor
- Quick fixes on Ctrl+.

---

## Phase 7: Import & Export

### 7.1 File Format
```typescript
// .pjsx (Path-based JSX) format
interface PJSXFile {
  version: string;
  lines: string[];  // Raw line format

  // Example content:
  // #jsx/div/@className container
  // #jsx/div/h1 Title
}
```

### 7.2 Converters
```typescript
interface Converter {
  fromJSON(ast: ASTNode): DocumentNode[];
  toJSON(lines: DocumentNode[]): ASTNode;

  fromJSX(code: string): DocumentNode[];
  toJSX(lines: DocumentNode[]): string;

  // Import from existing formats
  fromReactComponent(code: string): DocumentNode[];
}
```

### 7.3 Export Options
- Export to JSON AST (your original format)
- Export to JSX code
- Export to HTML
- Export to React component file

---

## Phase 8: UI/UX Polish

### 8.1 Theming
- Syntax highlighting for breadcrumbs
- Color coding by node type
- Light/dark mode
- Customizable color scheme

### 8.2 Visual Feedback
- Smooth animations for line insertion/deletion
- Highlight on line selection
- Breadcrumb segment focus indicator
- Loading states for async operations

### 8.3 Accessibility
- Full keyboard navigation
- Screen reader support
- ARIA labels
- High contrast mode

### 8.4 Performance
- Virtual scrolling for large documents (1000+ lines)
- Incremental parsing
- Debounced validation
- Lazy tree expansion

---

## Phase 9: Hot Reload Integration

### 9.1 Incremental JSON IR Diffing
```typescript
interface JsonIRPatch {
  componentId: string;
  operations: IROperation[];
  timestamp: number;
}

interface IROperation {
  op: "add" | "remove" | "update" | "move";
  path: string;              // #jsx/div/p[0]
  field?: string;            // "className", "children[0]", etc.
  value?: any;
  oldValue?: any;            // For undo
}

class IRDiffer {
  computeDiff(before: DocumentNode[], after: DocumentNode[]): JsonIRPatch;
  applyPatch(doc: DocumentNode[], patch: JsonIRPatch): DocumentNode[];
  invertPatch(patch: JsonIRPatch): JsonIRPatch;  // For undo
}
```

### 9.2 SignalR Hot Reload Channel
```typescript
interface HotReloadClient {
  connection: SignalRConnection;

  // Send IR changes to server
  sendIRPatch(patch: JsonIRPatch): Promise<void>;

  // Receive DOM patches from server
  onDOMPatchReceived(callback: (patches: DOMPatch[]) => void): void;

  // Server signals successful transpilation
  onTranspileComplete(callback: (componentId: string) => void): void;

  // Server signals transpilation error
  onTranspileError(callback: (error: TranspileError) => void): void;
}
```

### 9.3 C# Backend Hot Reload Handler
```csharp
public class HotReloadHub : Hub
{
    private readonly IComponentRegistry _registry;
    private readonly IMinimactTranspiler _transpiler;
    private readonly IRustReconciler _reconciler;

    /// <summary>
    /// Apply JSON IR patch from path editor
    /// </summary>
    public async Task ApplyJsonIRPatch(JsonIRPatch patch)
    {
        try
        {
            // 1. Get component
            var component = _registry.GetComponent(patch.ComponentId);
            if (component == null)
            {
                await Clients.Caller.SendAsync("TranspileError",
                    new { message = $"Component {patch.ComponentId} not found" });
                return;
            }

            // 2. Apply patch to component's JSON IR
            component.JsonIR = ApplyPatchToIR(component.JsonIR, patch);

            // 3. Incremental re-transpile (only this component!)
            var transpiledCode = _transpiler.TranspileFromIR(component.JsonIR);

            // 4. Hot-swap component implementation
            component.SwapImplementation(transpiledCode);

            // 5. Re-render with new implementation
            var newVNode = component.Render();

            // 6. Compute DOM patches
            var domPatches = _reconciler.ComputePatches(
                component.CurrentVNode,
                newVNode
            );

            // 7. Update VNode
            component.CurrentVNode = newVNode;

            // 8. Send DOM patches to client
            await Clients.Caller.SendAsync("ApplyDOMPatches", new {
                componentId = patch.ComponentId,
                patches = domPatches
            });

            // 9. Signal success
            await Clients.Caller.SendAsync("TranspileComplete",
                new { componentId = patch.ComponentId });
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("TranspileError", new {
                componentId = patch.ComponentId,
                message = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    private JsonNode ApplyPatchToIR(JsonNode ir, JsonIRPatch patch)
    {
        foreach (var op in patch.Operations)
        {
            switch (op.Op)
            {
                case "update":
                    SetValueAtPath(ir, op.Path, op.Value);
                    break;
                case "add":
                    InsertAtPath(ir, op.Path, op.Value);
                    break;
                case "remove":
                    RemoveAtPath(ir, op.Path);
                    break;
                case "move":
                    MoveNode(ir, op.Path, op.Value.ToString());
                    break;
            }
        }
        return ir;
    }
}
```

### 9.4 Live Preview Integration
```typescript
interface LivePreviewPane {
  // IFrame showing running app
  previewFrame: HTMLIFrameElement;

  // SignalR connection to backend (shared with editor)
  signalR: HotReloadClient;

  // Highlight elements corresponding to selected line
  highlightElement(path: string): void;

  // Click element in preview → navigate to line in editor
  onElementClick(callback: (path: string) => void): void;

  // Show loading indicator during transpile
  showTranspileProgress(): void;
  hideTranspileProgress(): void;
}
```

### 9.5 Debounced Update Strategy
```typescript
class HotReloadManager {
  private pendingChanges: Map<string, DocumentNode> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;

  onLineChanged(node: DocumentNode) {
    // Track change
    this.pendingChanges.set(node.path, node);

    // Reset debounce timer
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Send patch after 100ms of no typing
    this.debounceTimer = setTimeout(() => {
      this.flushChanges();
    }, 100);
  }

  private async flushChanges() {
    if (this.pendingChanges.size === 0) return;

    // Generate incremental patch
    const patch = this.differ.computeDiff(
      this.previousState,
      Array.from(this.pendingChanges.values())
    );

    // Send to server
    await this.signalR.sendIRPatch(patch);

    // Clear pending changes
    this.pendingChanges.clear();
    this.previousState = this.currentDocument.lines;
  }
}
```

### 9.6 Error Handling & Rollback
```typescript
interface TranspileError {
  componentId: string;
  message: string;
  line?: number;
  column?: number;
}

class ErrorRecovery {
  // Show error inline in editor
  showTranspileError(error: TranspileError): void {
    // Highlight problematic line in red
    // Show error message in tooltip
    // Disable preview updates until fixed
  }

  // Offer to revert changes
  offerRollback(): void {
    // "Transpile failed. Revert changes? [Yes] [No]"
  }

  // Auto-save before each update (for manual recovery)
  autoSaveSnapshot(): void;
}
```

### 9.7 Performance Optimizations

**Batch Updates:**
- Group rapid changes (typing) into single patch
- Debounce 100ms after last keystroke
- Show "saving..." indicator during update

**Selective Re-transpile:**
- Only re-transpile affected component
- Cache unchanged components
- Incremental type checking

**Smart Diffing:**
- Only send changed fields in patch
- Compress patch with simple encoding
- Skip no-op changes (whitespace, formatting)

**Preview Optimization:**
- Apply DOM patches incrementally
- Preserve scroll position
- Maintain form input state
- Keep focus on active element

### 9.8 Developer Experience Features

**Visual Feedback:**
```typescript
interface HotReloadFeedback {
  // Show latency in status bar
  showLatency(ms: number): void;  // "Updated in 47ms"

  // Flash changed elements in preview
  flashChangedElements(paths: string[]): void;

  // Show patch size
  showPatchStats(ops: number, bytes: number): void;

  // Connection status indicator
  showConnectionStatus(status: "connected" | "disconnected" | "updating"): void;
}
```

**Keyboard Shortcuts:**
- `Ctrl+S` - Force update (bypass debounce)
- `Ctrl+Shift+R` - Full reload (re-transpile all)
- `Ctrl+Z` - Undo (with hot reload)
- `Ctrl+Shift+Z` - Redo (with hot reload)

**Split View Modes:**
```
┌────────────────────────────────────────────┐
│ Path Editor      │ Preview                 │  ← Side-by-side
├────────────────────────────────────────────┤
│ Path Editor                                │  ← Editor-only
├────────────────────────────────────────────┤
│                  Preview                   │  ← Preview-only
├────────────────────────────────────────────┤
│ Path Editor                                │  ← Stacked
│────────────────────────────────────────────│
│ Preview                                    │
└────────────────────────────────────────────┘
```

### 9.9 Integration with Minimact Swig

The path editor becomes a **panel in Minimact Swig IDE**:

```typescript
interface SwigIDEIntegration {
  // Register as editor for .json files (IR files)
  registerFileType: ".minimact.json" | ".ir.json";

  // Two-way sync with text editor
  syncWithTextEditor(monaco: MonacoEditor): void;

  // Show in dedicated panel
  panelLocation: "editor" | "side" | "bottom";

  // Keyboard shortcut to toggle
  toggleShortcut: "Ctrl+Shift+P";  // Toggle Path View
}
```

**Workflow:**
1. Developer writes TSX (as normal)
2. Transpiler generates JSON IR
3. **Path editor loads JSON IR for visual editing**
4. Changes in path editor → hot reload → instant preview
5. Changes in TSX editor → re-transpile → path editor updates
6. **Both editors stay in sync!**

---

## Phase 10: Collaboration (Future)

### 9.1 Real-time Editing
- Operational Transform for concurrent edits
- Cursor position sharing
- Line-level locking
- Conflict resolution

### 9.2 Comments & Annotations
```typescript
interface LineComment {
  path: string;
  author: string;
  text: string;
  timestamp: number;
}
```

---

## Technology Stack Recommendations

### Core Framework
- **React** - Component-based UI
- **TypeScript** - Type safety
- **Zustand** or **Jotai** - Lightweight state management

### Editor Components
- **React-Window** or **React-Virtual** - Virtual scrolling
- **@dnd-kit** - Drag & drop for tree view
- **CodeMirror** or **Monaco** state management concepts - Not full editor, just value editing

### LSP
- **vscode-languageserver** - LSP protocol implementation
- **vscode-languageclient** - Client connection

### Build & Dev
- **Vite** - Fast dev server
- **Vitest** - Testing
- **Storybook** - Component development

---

## Implementation Order

1. **Week 1-2**: Core document model + path parser
2. **Week 3-4**: Basic line rendering + keyboard navigation
3. **Week 5-6**: Tree view panel + sync
4. **Week 7-8**: Path autocomplete + intellisense
5. **Week 9-10**: Value editing + validation
6. **Week 11-12**: Undo/redo + multi-line operations
7. **Week 13-14**: Import/export + converters
8. **Week 15-16**: LSP integration
9. **Week 17-18**: Polish, performance, accessibility

---

## Success Metrics

- **Editing speed**: Create 10-line component in <30 seconds
- **Learning curve**: New user productive in <5 minutes
- **Performance**: Handle 1000+ line documents smoothly
- **Accuracy**: 100% round-trip fidelity (JSON → lines → JSON)
- **Discoverability**: All features accessible via keyboard

---

## Open Questions

1. How to handle complex expressions in bindings? (nested ternaries, function calls)
2. Multi-cursor editing support?
3. Diff/merge UI for version control?
4. Plugin system for custom node types?
5. Mobile/touch support strategy?
