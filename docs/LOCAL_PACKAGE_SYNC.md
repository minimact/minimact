# 🔄 Local Package Sync System with `mact_modules`

A custom package syncing system for Minimact that uses `mact_modules` directory instead of `node_modules`, enabling seamless local development without npm publish or npm link.

## 🎯 Why?

**Problem:** During development, you need to test changes to `@minimact/babel-plugin`, `@minimact/punch`, etc. in Minimact Swig without:
- Publishing to npm (slow, pollutes versions)
- Using `npm link` (fragile, easy to forget)
- Manual file copying (tedious, error-prone)

**Solution:** Automatic sync script that:
- ✅ Builds packages from source
- ✅ Copies files to `mact_modules/@minimact/`
- ✅ Installs dependencies
- ✅ Watches for changes (optional)
- ✅ Works with Electron-Vite's resolve.alias

---

## 📁 Project Structure

```
minimact/
├── sync-packages.config.js       # ← Config: what to sync, where
├── scripts/
│   └── sync-local-packages.js    # ← The sync script
├── package.json                  # ← Scripts: npm run sync
├── src/
│   ├── babel-plugin-minimact/    # ← Source packages
│   ├── minimact-punch/
│   ├── client-runtime/           # (@minimact/core)
│   └── minimact-swig-electron/   # ← Target app
│       ├── electron.vite.config.ts
│       └── mact_modules/         # ← Synced packages go here!
│           └── @minimact/
│               ├── babel-plugin/
│               ├── punch/
│               └── core/
```

---

## ⚙️ Configuration

### `sync-packages.config.js`

Defines **which packages** to sync **to which targets**.

```javascript
module.exports = {
  packages: [
    {
      name: '@minimact/babel-plugin',
      source: 'src/babel-plugin-minimact',
      include: ['dist/**/*', 'src/**/*', 'index.cjs', 'package.json'],
      exclude: ['node_modules', 'test'],
      buildCommand: 'npm run build',
      installDependencies: false  // Babel plugin doesn't need runtime deps
    },
    {
      name: '@minimact/punch',
      source: 'src/minimact-punch',
      include: ['dist/**/*', 'src/**/*', 'package.json'],
      buildCommand: 'npm run build',
      installDependencies: true   // Installs peer deps
    },
    {
      name: '@minimact/core',
      source: 'src/client-runtime',
      include: ['dist/**/*', 'src/**/*', 'package.json'],
      buildCommand: 'npm run build',
      installDependencies: true
    }
  ],

  targets: [
    {
      name: 'minimact-swig-electron',
      path: 'src/minimact-swig-electron/mact_modules',
      packages: ['@minimact/babel-plugin', '@minimact/punch', '@minimact/core']
    }
    // Add more targets as needed
  ],

  options: {
    autoBuild: true,
    autoInstallDeps: true,
    verbose: false,
    watch: false
  }
};
```

---

## 🚀 Usage

### One-Time Sync

```bash
cd J:\projects\minimact

# Sync all packages to all targets
npm run sync

# Verbose output
npm run sync:verbose

# Force rebuild before sync
npm run sync:build
```

### Watch Mode (Development)

```bash
# Watch all packages for changes, auto-rebuild and sync
npm run dev
```

**What it does:**
1. Watches `src/babel-plugin-minimact/src/**/*`
2. On change:
   - Rebuilds the package (`npm run build`)
   - Syncs to `mact_modules/@minimact/babel-plugin`
3. Electron app auto-reloads (Vite HMR)

---

## 🔧 Electron-Vite Configuration

### `minimact-swig-electron/electron.vite.config.ts`

Tell Electron-Vite to resolve `@minimact/*` from `mact_modules`:

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@minimact': resolve('mact_modules/@minimact')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@minimact': resolve('mact_modules/@minimact')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@minimact': resolve('mact_modules/@minimact')  // ← Key line
      }
    },
    plugins: [react()]
  }
})
```

Now imports work automatically:

```typescript
// In any main/preload/renderer file:
import { useDomElementState } from '@minimact/punch';
import { Minimact } from '@minimact/core';

// Resolves to:
// mact_modules/@minimact/punch/dist/index.js
// mact_modules/@minimact/core/dist/index.js
```

---

## 📝 TypeScript Support

### `tsconfig.json`

Add path mapping for IDE autocomplete:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@minimact/*": ["mact_modules/@minimact/*"],
      "@renderer/*": ["src/renderer/src/*"]
    }
  }
}
```

---

## 🎬 Development Workflow

### Typical Session

```bash
# Terminal 1: Watch and sync packages
cd J:\projects\minimact
npm run dev

# Terminal 2: Run Electron app
cd src/minimact-swig-electron
npm run dev
```

### What Happens

1. **Edit** `src/babel-plugin-minimact/src/generators/jsx.cjs`
2. **Watch script detects change**
3. **Rebuilds** babel-plugin (`rollup -c`)
4. **Syncs** to `mact_modules/@minimact/babel-plugin`
5. **Electron Vite** detects change in `mact_modules/`
6. **HMR reloads** (or full restart if main process)

**Result:** ~2 second turnaround from edit → see changes!

---

## 🛠️ Script Details

### `scripts/sync-local-packages.js`

**Features:**
- ✅ Builds packages before syncing (configurable)
- ✅ Uses `fast-glob` for efficient file matching
- ✅ Installs dependencies with `npm install --production`
- ✅ Watch mode with `chokidar`
- ✅ Colored terminal output
- ✅ Error handling and retry logic

**CLI Flags:**
```bash
node scripts/sync-local-packages.js              # Sync once
node scripts/sync-local-packages.js --watch      # Watch mode
node scripts/sync-local-packages.js --verbose    # Verbose output
node scripts/sync-local-packages.js --build      # Force rebuild
node scripts/sync-local-packages.js --force      # Force overwrite
```

### How It Works

1. **Read config** from `sync-packages.config.js`
2. **For each package:**
   - Run `buildCommand` if specified
   - Find files matching `include` patterns
   - Exclude files matching `exclude` patterns
   - Copy to target's `mact_modules/@scope/name/`
   - Run `npm install` if `installDependencies: true`
3. **Watch mode (optional):**
   - Use `chokidar` to watch source directories
   - On change → rebuild → sync
   - Ignore `node_modules`, `dist`, etc.

---

## 🎯 Advantages Over Alternatives

| Approach | Publish | Link | File Sync | **mact_modules** |
|----------|---------|------|-----------|------------------|
| **Setup** | N/A | `npm link` | Manual | One config file |
| **Speed** | Slow | Fast | Manual | **Automated** |
| **Reliability** | High | Low (fragile) | Medium | **High** |
| **IDE Support** | ✅ | ✅ | ❌ | **✅ (tsconfig paths)** |
| **HMR** | N/A | ✅ | ❌ | **✅** |
| **Version Control** | N/A | N/A | ❌ | **✅ (gitignore mact_modules)** |
| **Isolation** | ✅ | ❌ (global) | ✅ | **✅** |
| **Multi-Target** | ✅ | ❌ | Manual | **✅** |

---

## 🧪 Testing

### Verify Sync

```bash
# Run sync
npm run sync

# Check mact_modules
dir src\minimact-swig-electron\mact_modules\@minimact
# Should show: babel-plugin  core  punch

# Check package contents
dir src\minimact-swig-electron\mact_modules\@minimact\babel-plugin
# Should show: dist  src  index.cjs  package.json
```

### Test Import

In `minimact-swig-electron/src/main/index.ts`:

```typescript
import babel from '@minimact/babel-plugin';

console.log('Babel plugin loaded:', babel);
```

Run:
```bash
cd src/minimact-swig-electron
npm run dev
```

Should see: `Babel plugin loaded: [Function]`

---

## 🐛 Troubleshooting

### "Module not found: @minimact/..."

**Cause:** Vite alias not configured or mact_modules not synced.

**Fix:**
1. Check `electron.vite.config.ts` has alias
2. Run `npm run sync` from root
3. Verify `mact_modules/@minimact/` exists

### "Cannot find module 'rollup.config.js'"

**Cause:** `npm install` trying to run build script in synced package.

**Fix:** Set `installDependencies: false` for that package in config.

### Watch Mode Not Detecting Changes

**Cause:** Editor writing to temp files first.

**Fix:** Add editor-specific patterns to `exclude` in config:
```javascript
exclude: [
  'node_modules',
  '**/.git',
  '**/*.swp',      // Vim
  '**/*.tmp',      // VS Code
  '**/*~'          // Emacs
]
```

### "ENOENT: no such file or directory"

**Cause:** Source package path incorrect or package not built.

**Fix:**
1. Check `source` path in config
2. Run `npm run build:babel-plugin` manually
3. Verify `dist/` folder exists

---

## 📦 Adding New Packages

### 1. Add to Config

Edit `sync-packages.config.js`:

```javascript
packages: [
  // ... existing packages
  {
    name: '@minimact/new-package',
    source: 'src/minimact-new-package',
    include: ['dist/**/*', 'package.json'],
    exclude: ['node_modules'],
    buildCommand: 'npm run build',
    installDependencies: true
  }
],

targets: [
  {
    name: 'minimact-swig-electron',
    path: 'src/minimact-swig-electron/mact_modules',
    packages: [
      '@minimact/babel-plugin',
      '@minimact/punch',
      '@minimact/core',
      '@minimact/new-package'  // ← Add here
    ]
  }
]
```

### 2. Run Sync

```bash
npm run sync
```

### 3. Use in Electron App

```typescript
import { something } from '@minimact/new-package';
```

Done! ✅

---

## 🌟 Best Practices

### 1. Keep Config Updated

When adding/removing packages, update `sync-packages.config.js` immediately.

### 2. Use Watch Mode

Always run `npm run dev` (watch mode) during active development.

### 3. Gitignore mact_modules

Add to `.gitignore`:
```
**/mact_modules/
```

### 4. Clean Sync

Before publishing or testing "clean install":
```bash
# Remove mact_modules
rm -rf src/minimact-swig-electron/mact_modules

# Sync fresh
npm run sync
```

### 5. Document Dependencies

In `package.json` comments:
```json
{
  "dependencies": {
    // These are synced from mact_modules during development:
    // - @minimact/babel-plugin
    // - @minimact/punch
    // - @minimact/core
  }
}
```

---

## 🚢 Production

For **production builds**, the Electron app should:

1. **Install from npm** (published versions):
```bash
npm install @minimact/babel-plugin @minimact/punch @minimact/core
```

2. **Use node_modules** (not mact_modules):
```typescript
// electron.vite.config.ts for production
const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  renderer: {
    resolve: {
      alias: isDev
        ? { '@minimact': resolve('mact_modules/@minimact') }  // Dev
        : {}  // Prod: use node_modules
    }
  }
})
```

3. **Build**:
```bash
NODE_ENV=production npm run build
```

---

## 📊 Summary

✅ **No npm publish** during development
✅ **No npm link** fragility
✅ **Automatic rebuilds** on change
✅ **Fast HMR** with Vite
✅ **TypeScript support** via path mapping
✅ **Multi-target** support (can sync to multiple apps)
✅ **Custom directory** (`mact_modules` keeps it clean)
✅ **Production-ready** (use npm for builds)

**Total Setup Time:** ~5 minutes
**Development Turnaround:** ~2 seconds (edit → see changes)

---

**Ready to develop!** 🚀

Run `npm run dev` and start coding!
