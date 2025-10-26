# Minimact for VS Code

Official Visual Studio Code extension for **Minimact** - Server-Side React for ASP.NET Core with predictive rendering.

## Features

### 🔒 Generated File Protection

Never accidentally edit auto-generated `.cs` files again. The extension warns you when you open a generated file and provides quick actions to jump to the correct source file.

- **Visual indicators**: Generated files show 🔒 icon, codebehind files show ⚙️, TSX files show 📘
- **Warning message**: Automatically displayed when opening generated `.cs` files
- **Quick actions**: One-click navigation to TSX source or codebehind

### 🚀 Quick Navigation

Jump between related files instantly with keyboard shortcuts:

- `Cmd+K, Cmd+T` (Windows: `Ctrl+K, Ctrl+T`) - Go to TSX source
- `Cmd+K, Cmd+C` (Windows: `Ctrl+K, Ctrl+C`) - Go to generated C# file
- `Cmd+K, Cmd+B` (Windows: `Ctrl+K, Ctrl+B`) - Go to codebehind file
- `Cmd+K, Cmd+S` (Windows: `Ctrl+K, Ctrl+S`) - Cycle through all related files

Or use the Command Palette:
- **Minimact: Go to TSX Source**
- **Minimact: Go to Generated C#**
- **Minimact: Go to Codebehind**
- **Minimact: Switch Between Related Files**

### 👁️ Preview Generated C# (NEW!)

See exactly what your TSX transforms into without building! Right-click any `.tsx` file and select "Preview Generated C#" to view a side-by-side diff.

- **Live transformation**: Powered by the Minimact Babel plugin
- **Instant feedback**: No need to run the build
- **Debug transformations**: Understand how hooks map to C# code
- **Compare with actual**: Compare preview with the actual generated file

### 🎨 Component Scaffolding Wizard (NEW!)

Create new Minimact components in seconds with an interactive wizard!

1. Right-click a folder → "Create Component"
2. Enter component name (e.g., "TodoList")
3. Select options:
   - ☑ Create codebehind file
   - ☐ Add useState example
   - ☐ Add useEffect example
   - ☐ Add useDomElementState (Minimact Punch)
   - ☐ Include TypeScript types file
4. Files are generated and ready to use!

**Generates**:
- `ComponentName.tsx` - UI logic with your selected hooks
- `ComponentName.codebehind.cs` - Business logic template (optional)
- `ComponentName.types.ts` - TypeScript interfaces (optional)

### ⚡ Auto-Create Codebehind

When you try to navigate to a codebehind file that doesn't exist, the extension offers to create it for you with a proper template including:
- Namespace declaration
- Partial class definition
- Constructor for dependency injection
- Example database query method (commented out)

### 📊 Build Status Indicator (NEW!)

Track your Minimact builds in real-time with the status bar indicator!

- **Live monitoring**: Automatically watches TSX file changes
- **Component count**: Shows how many components are in your project
- **Last build time**: Displays when the last transformation occurred
- **Click for details**: Opens a detailed panel with transformation history
- **Output channel**: View transformation logs in the "Minimact Build" output

The status bar shows: `🌵 Minimact: 👁 Watching (12 components) | ✓ 2m ago`

### 💡 Quick Fixes & Code Actions (NEW!)

Smart code actions that appear when you need them!

**Available Quick Fixes**:
- **Create codebehind file**: Appears when codebehind doesn't exist
- **Add missing imports**: Auto-detects missing hook imports and adds them
- **Add usePredictHint**: Suggests optimistic updates for setState calls
- **Convert to Minimact**: Converts React imports to Minimact

**How to use**: Place cursor on the line and press `Cmd+.` (or `Ctrl+.`) to see available actions.

### 🎨 Enhanced Syntax Highlighting (NEW!)

Special syntax highlighting for `.codebehind.cs` files!

- **Partial classes**: Highlighted differently than regular classes
- **EF Core queries**: `.Where()`, `.ToListAsync()`, etc. highlighted
- **Async methods**: Special highlighting for async Task methods
- **DbContext injection**: Highlights database context fields
- **Comment keywords**: TODO, HACK, FIXME highlighted

### 📝 Code Snippets

Type these prefixes and press `Tab`:

| Prefix | Description |
|--------|-------------|
| `mcomp` | Full Minimact component template |
| `mstate` | `useState` hook |
| `meffect` | `useEffect` hook |
| `mref` | `useRef` hook |
| `mpred` | `usePredictHint` for optimistic updates |
| `mdom` | `useDomElementState` (Minimact Punch) |
| `mclient` | `useClientState` (client-only, no sync) |
| `mtemplate` | `useTemplate` layout |
| `mcb` | Codebehind class template |
| `mdb` | Database query method template |
| `mauth` | `[Authorize]` attribute |

## Getting Started

1. **Install the extension** from the VS Code Marketplace
2. **Open a Minimact project** (or create one with `minimact new my-app`)
3. **Start the dev server** with `minimact dev`
4. **Create components** and enjoy the improved workflow!

## Configuration

Configure the extension in VS Code settings:

```json
{
  // Show warning when opening auto-generated .cs files (default: true)
  "minimact.warnOnGeneratedFileEdit": true,

  // Make generated .cs files read-only in editor (default: false)
  "minimact.makeGeneratedFilesReadOnly": false,

  // Default directory for components (default: "src/components")
  "minimact.componentsDirectory": "src/components",

  // Show build status in status bar (default: true)
  "minimact.showBuildStatus": true,

  // Show notification when build/transformation fails (default: true)
  "minimact.notifyOnBuildError": true
}
```

## File Structure

The extension works with the standard Minimact file structure:

```
src/components/
├── Counter.tsx              (📘 Edit this - UI logic)
├── Counter.cs               (🔒 Don't edit - auto-generated)
└── Counter.codebehind.cs    (⚙️ Optional - business logic)
```

### When to use each file:

- **`.tsx`** - UI state, rendering, event handlers
- **`.cs`** - Auto-generated, never edit manually
- **`.codebehind.cs`** - Database queries, EF Core, business logic, dependency injection

## Requirements

- VS Code 1.80.0 or higher
- A Minimact project (install with `npm install -g minimact-cli`)

## Support

- [Documentation](https://github.com/minimact/minimact)
- [GitHub Issues](https://github.com/minimact/minimact-vscode/issues)
- [Minimact Discussions](https://github.com/minimact/minimact/discussions)

## Release Notes

### 0.2.0 (Tier 2 Features - Complete!)

**New Features**:
- 👁️ **Preview Generated C#**: Live transformation preview with side-by-side diff
- 🎨 **Component Scaffolding Wizard**: Interactive component creation with customizable options
- 📊 **Build Status Indicator**: Real-time build monitoring in status bar
- 💡 **Quick Fixes & Code Actions**: Smart suggestions for missing imports, codebehind creation, etc.
- 🎨 **Enhanced Syntax Highlighting**: Special highlighting for `.codebehind.cs` files
- 📊 **Compare with Generated**: Compare preview with actual generated file

**Improvements**:
- Better integration with Babel plugin
- Enhanced error messages and user feedback
- Context menus for quick access to features
- Live file watching and transformation tracking
- Detailed build status panel with metrics

### 0.1.0 (Initial MVP)

- File icons and visual indicators for TSX, generated CS, and codebehind files
- Warning when opening auto-generated files
- Quick navigation commands with keyboard shortcuts
- Auto-create codebehind files with templates
- Complete snippet library for Minimact hooks

## License

MIT License - see [LICENSE](LICENSE) for details

---

**Built with ❤️ for the .NET and React communities** 🌵
