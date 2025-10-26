# Minimact VS Code Extension - Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- VS Code 1.80.0+
- TypeScript 5.0+

### Setup

1. **Install dependencies**:
   ```bash
   cd tools/minimact-vscode
   npm install
   ```

2. **Compile TypeScript**:
   ```bash
   npm run compile
   ```

3. **Watch mode** (for development):
   ```bash
   npm run watch
   ```

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` or Run → Start Debugging
3. A new VS Code window will open with the extension loaded
4. Test the extension features in the Extension Development Host window

### Testing

To test the extension properly, you'll need a sample Minimact project:

1. In the Extension Development Host window, open a folder with this structure:
   ```
   src/components/
   ├── Counter.tsx
   ├── Counter.cs (generated)
   └── Counter.codebehind.cs (optional)
   ```

2. Test each feature:
   - **File Icons**: Check if files show correct badges (📘, 🔒, ⚙️)
   - **Warning**: Open a `.cs` file and verify warning appears
   - **Navigation**: Use `Cmd+K, Cmd+S` to cycle through files
   - **Snippets**: Type `mcomp` and press Tab in a `.tsx` file
   - **Codebehind Creation**: Try navigating to non-existent codebehind

## Project Structure

```
minimact-vscode/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── commands/
│   │   └── navigation.ts         # Navigation commands
│   ├── providers/
│   │   └── fileDecoration.ts     # File icons provider
│   └── utils/
│       └── generatedFileProtection.ts  # Warning system
├── snippets/
│   └── minimact.json             # Code snippets
├── media/
│   └── icon.png                  # Extension icon
├── out/                          # Compiled JavaScript (gitignored)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── README.md                     # Extension documentation
```

## Key Files

### `extension.ts`
Main activation point. Registers all commands, providers, and event handlers.

### `commands/navigation.ts`
Implements quick navigation between TSX, generated CS, and codebehind files.

**Key functions**:
- `findRelatedFile()` - Locates related files based on current file
- `getBaseName()` - Extracts component name from file path
- `generateCodebehindTemplate()` - Creates template for new codebehind files

### `providers/fileDecoration.ts`
Provides file icons and badges in the file explorer.

**Decorations**:
- `.tsx` → 📘 (blue) - "Minimact component"
- `.cs` → 🔒 (gray) - "Auto-generated - Do not edit"
- `.codebehind.cs` → ⚙️ (green) - "Codebehind - Business logic"

### `utils/generatedFileProtection.ts`
Shows warnings when user opens generated `.cs` files.

**Behavior**:
- Tracks warned files to avoid repeated warnings
- Respects configuration settings
- Provides quick actions to navigate away

## Configuration

Extension settings are defined in `package.json` under `contributes.configuration`:

```json
{
  "minimact.warnOnGeneratedFileEdit": {
    "type": "boolean",
    "default": true
  },
  "minimact.makeGeneratedFilesReadOnly": {
    "type": "boolean",
    "default": false
  },
  "minimact.componentsDirectory": {
    "type": "string",
    "default": "src/components"
  }
}
```

## Commands

All commands are registered in `package.json` under `contributes.commands`:

| Command | Description | Keybinding |
|---------|-------------|------------|
| `minimact.goToTsx` | Go to TSX source | `Cmd+K, Cmd+T` |
| `minimact.goToGenerated` | Go to generated C# | `Cmd+K, Cmd+C` |
| `minimact.goToCodebehind` | Go to codebehind | `Cmd+K, Cmd+B` |
| `minimact.switchFiles` | Cycle through files | `Cmd+K, Cmd+S` |
| `minimact.createCodebehind` | Create codebehind file | - |

## Snippets

Snippets are defined in `snippets/minimact.json`. Each snippet has:
- `prefix` - Trigger text
- `body` - Template code (array of lines)
- `description` - Help text

Example:
```json
{
  "useState Hook": {
    "prefix": "mstate",
    "body": [
      "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});"
    ],
    "description": "Add useState hook"
  }
}
```

## Building for Production

### Package as VSIX

```bash
# Install vsce (VS Code Extension Manager)
npm install -g @vscode/vsce

# Package extension
vsce package
```

This creates `minimact-0.1.0.vsix` that can be:
- Installed locally: Extensions → Install from VSIX
- Shared with testers
- Published to marketplace

### Publish to Marketplace

1. **Create publisher account** at https://marketplace.visualstudio.com/manage

2. **Get Personal Access Token** from Azure DevOps

3. **Login with vsce**:
   ```bash
   vsce login <publisher-name>
   ```

4. **Publish**:
   ```bash
   vsce publish
   ```

## Debugging

### Console Logs

Extension logs appear in:
- **Extension Host** output panel in the Extension Development Host
- Main VS Code → Help → Toggle Developer Tools → Console

### Breakpoints

Set breakpoints in `.ts` files and they'll work when running in debug mode (F5).

### Common Issues

**Extension doesn't activate**:
- Check `activationEvents` in package.json
- Ensure workspace contains `babel.config.js` or `.tsx` files

**Commands not appearing**:
- Check `contributes.commands` in package.json
- Reload window: Cmd+Shift+P → "Developer: Reload Window"

**File decorations not showing**:
- Verify files are in configured `componentsDirectory`
- Check file naming (must end with `.tsx`, `.cs`, `.codebehind.cs`)

## Testing Checklist

Before releasing, test:

- [ ] File icons show correctly for all file types
- [ ] Warning appears when opening `.cs` files
- [ ] Warning doesn't appear for `.codebehind.cs` files
- [ ] "Edit TSX Instead" button navigates correctly
- [ ] All keyboard shortcuts work
- [ ] All command palette commands work
- [ ] Codebehind creation generates valid C# code
- [ ] Snippets expand correctly
- [ ] Configuration settings apply correctly
- [ ] Works on Windows, macOS, and Linux

## Next Steps (Tier 2 Features)

Future enhancements to implement:

1. **Preview Generated C#** - Right-click → "Preview Generated C#"
2. **Component Scaffolding Wizard** - Full wizard for creating components
3. **Build Status Indicator** - Status bar showing watcher status
4. **Hook Hover Tooltips** - Show generated C# on hover over `useState`
5. **Inline Diagnostics** - Type checking and validation

See [VSCODE_EXTENSION_PLAN.md](../../docs/VSCODE_EXTENSION_PLAN.md) for full roadmap.

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Update README and CHANGELOG
5. Submit PR

## License

MIT
