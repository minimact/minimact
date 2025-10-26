# Minimact VS Code Extension - Quick Setup

## 🚀 Getting Started (2 minutes)

### 1. Install Dependencies

```bash
cd tools/minimact-vscode
npm install
```

This will install:
- TypeScript compiler
- VS Code extension types
- Test runner

### 2. Compile Extension

```bash
npm run compile
```

Or for development with auto-recompile:

```bash
npm run watch
```

### 3. Run Extension

Open this folder in VS Code, then:

**Method 1: Keyboard**
- Press `F5`

**Method 2: Menu**
- Run → Start Debugging

**Method 3: Debug Panel**
- Click "Run Extension" in the debug panel

A new VS Code window will open with the extension loaded (called "Extension Development Host").

### 4. Test Extension

In the Extension Development Host window:

1. **Create test files**:
   ```
   src/components/
   ├── Counter.tsx
   ├── Counter.cs
   └── Counter.codebehind.cs (optional)
   ```

2. **Test features**:
   - Open `Counter.cs` → Should see warning ⚠️
   - Open `Counter.tsx` → Press `Cmd+K, Cmd+S` → Should cycle through files
   - Type `mcomp` in a `.tsx` file → Press Tab → Should expand snippet
   - View file icons in explorer → Should see 📘, 🔒, ⚙️

### 5. Package Extension (Optional)

To create a `.vsix` file for distribution:

```bash
# Install packaging tool
npm install -g @vscode/vsce

# Package extension
vsce package
```

This creates `minimact-0.1.0.vsix` that you can:
- Install locally: Extensions → Install from VSIX
- Share with testers
- Publish to marketplace

---

## 📋 Checklist

Before considering MVP complete:

- [x] Project structure created
- [x] TypeScript compiles without errors
- [x] Extension activates in debug mode
- [x] File icons appear correctly
- [x] Warning shows for generated `.cs` files
- [x] Navigation commands work
- [x] Snippets expand correctly
- [ ] Icon added (`media/icon.png`)
- [ ] Tested on Windows (if applicable)
- [ ] Tested on macOS (if applicable)
- [ ] Tested on Linux (if applicable)

---

## 🐛 Troubleshooting

### Extension doesn't activate
- Check you have a `.tsx` file or `babel.config.js` in the workspace
- Try: Cmd+Shift+P → "Developer: Reload Window"

### Commands not appearing
- Ensure `out/` directory exists and has compiled `.js` files
- Run `npm run compile`
- Restart the Extension Development Host

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript version: `tsc --version` (should be 5.0+)

### File decorations not showing
- Ensure files are in `src/components/` directory (or configured path)
- Check file extensions match exactly: `.tsx`, `.cs`, `.codebehind.cs`

---

## ⏭️ Next Steps

Once MVP is working:

1. **Create icon**: Add a cactus icon as `media/icon.png` (128x128)
2. **Test thoroughly**: Use the checklist in `DEVELOPMENT.md`
3. **Get feedback**: Share `.vsix` with alpha testers
4. **Plan Tier 2**: See `docs/VSCODE_EXTENSION_PLAN.md` for next features

---

**Ready to build! 🌵⚡**
