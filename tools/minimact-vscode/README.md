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

### ⚡ Auto-Create Codebehind

When you try to navigate to a codebehind file that doesn't exist, the extension offers to create it for you with a proper template including:
- Namespace declaration
- Partial class definition
- Constructor for dependency injection
- Example database query method (commented out)

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
  "minimact.componentsDirectory": "src/components"
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
