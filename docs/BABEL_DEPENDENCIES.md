# 🔧 Babel Dependencies in mact_modules

## Overview

The `@minimact/babel-plugin` requires `@babel/types` at runtime because the Electron app uses `@babel/core` to dynamically transpile TSX files.

## Architecture

```
minimact-swig-electron/
├── node_modules/
│   ├── @babel/core/           # ← Used by TranspilerService
│   ├── @babel/preset-react/
│   └── @babel/preset-typescript/
└── mact_modules/
    └── @minimact/
        └── babel-plugin/
            ├── index.cjs        # ← Plugin entry point
            ├── src/             # ← Plugin source
            ├── dist/            # ← Built bundles
            └── node_modules/    # ← Plugin dependencies
                └── @babel/
                    └── types/   # ← Required by plugin
```

## How It Works

### 1. Transpiler Service

```typescript
// src/main/services/TranspilerService.ts
import * as babel from '@babel/core';  // From node_modules

const result = await babel.transformAsync(tsxContent, {
  plugins: [
    ['/path/to/mact_modules/@minimact/babel-plugin/index.cjs', options]
  ]
});
```

### 2. Plugin Loading

When Babel loads the plugin from `mact_modules/@minimact/babel-plugin/index.cjs`:

```javascript
// index.cjs
const t = require('@babel/types');  // Resolves to mact_modules/@minimact/babel-plugin/node_modules/@babel/types

module.exports = function(babel) {
  return {
    visitor: {
      JSXElement(path) {
        // Uses @babel/types here
        t.callExpression(/*...*/);
      }
    }
  };
};
```

## Sync Configuration

### Why We Copy node_modules/@babel/types

```javascript
// sync-packages.config.js
{
  name: '@minimact/babel-plugin',
  include: [
    'dist/**/*',
    'src/**/*',
    'index.cjs',
    'package.json',
    'node_modules/@babel/types/**/*'  // ← Copy the dependency
  ],
  installDependencies: false  // Don't run npm install (already copied)
}
```

**Why not `installDependencies: true`?**

Because running `npm install` in the synced package would:
1. Try to run `npm run build` (via prepublish)
2. Fail because rollup.config.js has ESM imports
3. Not necessary since we copy the dependencies directly

## What Gets Copied

```
From: src/babel-plugin-minimact/node_modules/@babel/types/
To:   mact_modules/@minimact/babel-plugin/node_modules/@babel/types/

Files: 178 files total including:
  - lib/            (runtime code)
  - lib/**/*.js
  - lib/**/*.d.ts
  - package.json
```

### Full Dependency Tree

```
@minimact/babel-plugin
└── node_modules/
    └── @babel/
        └── types/
            ├── lib/
            └── node_modules/
                ├── @babel/helper-string-parser/
                └── @babel/helper-validator-identifier/
```

All of these are copied automatically via the glob pattern `node_modules/@babel/types/**/*`.

## Verification

### Check Dependencies Were Synced

```bash
cd src/minimact-swig-electron/mact_modules/@minimact/babel-plugin
dir node_modules\@babel
# Should show: helper-string-parser  helper-validator-identifier  types
```

### Test Import

```bash
cd src/minimact-swig-electron/mact_modules/@minimact/babel-plugin
node -e "const t = require('@babel/types'); console.log('✓ @babel/types loaded:', typeof t.callExpression)"
# Should print: ✓ @babel/types loaded: function
```

## Alternative Approach: Bundle Everything

If copying node_modules feels wrong, we could bundle everything into one file:

### Option A: Bundle with Rollup

```javascript
// rollup.config.js
export default {
  input: 'index-full.cjs',
  output: {
    file: 'dist/babel-plugin-bundled.js',
    format: 'cjs'
  },
  external: ['@babel/core'],  // Don't bundle @babel/core (it's in parent)
  plugins: [
    resolve({ preferBuiltins: false }),
    commonjs()
  ]
};
```

Then sync only `dist/babel-plugin-bundled.js` (no node_modules needed).

**Pros:**
- ✅ Single file
- ✅ No node_modules/ in mact_modules
- ✅ Faster to sync

**Cons:**
- ⚠️ Larger file size (~500KB vs ~200KB source)
- ⚠️ Harder to debug (minified)
- ⚠️ Build step complexity

### Option B: Use peerDependencies

Make `@babel/types` a peer dependency and install it in the Electron app:

```json
// minimact-swig-electron/package.json
{
  "dependencies": {
    "@babel/core": "^7.24.0",
    "@babel/types": "^7.24.0"  // ← Add this
  }
}
```

**Pros:**
- ✅ Cleaner (shared deps)
- ✅ No duplication

**Cons:**
- ⚠️ User must install manually
- ⚠️ Version conflicts possible

## Current Solution: Copy node_modules

**Chosen because:**
- ✅ Simple and reliable
- ✅ No bundling complexity
- ✅ Works with watch mode
- ✅ Easy to debug (source available)
- ✅ Automatic (part of sync)

## Performance

**Sync Stats:**
- **Without** `node_modules/@babel/types`: 34 files (120 KB)
- **With** `node_modules/@babel/types`: 212 files (850 KB)

**Impact on Watch Mode:**
- First sync: ~2 seconds
- Incremental (source change): ~500ms (only changed files copied)

## Troubleshooting

### "Cannot find module '@babel/types'"

**Cause:** babel-plugin's node_modules not synced.

**Fix:**
```bash
npm run sync
dir src\minimact-swig-electron\mact_modules\@minimact\babel-plugin\node_modules\@babel\types
```

### "Transpilation failed: undefined is not a function"

**Cause:** Wrong @babel/types version (old API).

**Fix:** Delete and re-sync:
```bash
rm -rf src/minimact-swig-electron/mact_modules/@minimact/babel-plugin
npm run sync
```

### Watch mode not detecting babel-plugin changes

**Cause:** Watch only triggers on `src/` files, not `node_modules/`.

**Fix:** This is correct! `node_modules/@babel/types` shouldn't trigger rebuild.

## Summary

✅ **`@babel/types` is copied** to `mact_modules/@minimact/babel-plugin/node_modules/`
✅ **Babel can load it** when plugin requires it
✅ **Sync is automatic** via glob pattern
✅ **Watch mode works** (ignores node_modules changes)
✅ **No manual steps** needed

Just run `npm run sync` or `npm run dev` (watch mode) and everything works! 🎉
