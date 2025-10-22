# babel-plugin-transform-import-css-patched

This is a patched version of `babel-plugin-transform-import-css` that fixes the issue with side-effect-only CSS imports.

## Patches Applied

### Issue: Side-effect-only imports crash the plugin

When importing CSS without a specifier (side-effect-only imports):
```javascript
import '@toast-ui/editor/dist/toastui-editor.css';
```

The original plugin crashes with:
```
TypeError: Cannot read properties of undefined (reading 'name')
```

### Root Cause

In `css-import-visitor.js` line 26:
```javascript
importNode: { ...node, ...node.specifiers[0] },  // node.specifiers[0] is undefined!
```

When there are no import specifiers, `node.specifiers[0]` is `undefined`, causing the spread operator to fail silently but then causing `importNode.local.name` access to crash.

### Fix

**css-import-visitor.js** (lines 23-26):
```javascript
// PATCH: Safely handle side-effect-only imports (no specifiers)
const specifier = node.specifiers && node.specifiers[0];
const importNode = specifier ? { ...node, ...specifier } : { ...node };
```

**index.js** (line 40):
```javascript
// PATCH: Additional check to ensure importNode.local exists before accessing .name
if (importNode.local && importNode.local.name) {
```

## Original Source

Based on: https://github.com/a-x-/babel-plugin-transform-import-css
Version: 1.0.0-alpha.11
