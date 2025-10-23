# Babel Plugin Integration Setup

This document explains the setup needed to make the Minimact Playground fully functional with TSX → C# transformation.

## Current Status

The playground is set up to:
1. Accept TSX/JSX input from users in the frontend editor
2. Transform it to C# using the Minimact Babel plugin
3. Display both the TSX and generated C# code
4. Send the C# to the backend for compilation

However, **the build steps have not been completed yet**.

## What Needs to Be Done

### 1. Build the Babel Plugin

The Babel plugin needs to be bundled for browser use using Rollup.

**Location**: `D:\minimact\minimact\src\babel-plugin-minimact\`

**Steps**:

```bash
cd D:\minimact\minimact\src\babel-plugin-minimact
npm install
npm run build
```

This will:
- Install rollup and plugins
- Bundle `index-full.cjs` and all its dependencies
- Create `dist/minimact-babel-plugin.js` (UMD format for browser)
- Create `dist/minimact-babel-plugin.esm.js` (ES module format)

### 2. Install Frontend Dependencies

The playground frontend needs the Babel dependencies added.

**Location**: `D:\minimact\minimact\playground\frontend\`

**Steps**:

```bash
cd D:\minimact\minimact\playground\frontend
npm install
```

This will install:
- `@babel/standalone` - Babel compiler for the browser
- `@babel/core` - Babel core (for types)
- `@babel/types` - Babel AST types

### 3. Serve the Babel Plugin

During development, Vite is configured to proxy `/babel-plugin/*` requests to the bundled plugin in the dist folder.

**Vite Config**: `D:\minimact\minimact\playground\frontend\vite.config.ts`

The config includes:
```javascript
'/babel-plugin': {
  target: 'file://' + path.resolve(__dirname, '../../src/babel-plugin-minimact/dist'),
  ...
}
```

This means when the frontend tries to fetch `/babel-plugin/minimact-babel-plugin.js`, it will serve from the dist folder.

### 4. How the Flow Works

```
User writes TSX in Editor
    ↓
Editor.tsx onChange → handleTsxChange()
    ↓
Calls transformTsxToCSharp(tsxCode)
    ↓
babelTransform.ts loads /babel-plugin/minimact-babel-plugin.js
    ↓
Combines with @babel/standalone
    ↓
Executes: Babel.transform(tsxCode, { plugins: [minimactPlugin] })
    ↓
Plugin sets result.metadata.minimactCSharp
    ↓
Extract csharpCode from metadata
    ↓
Display in C# tab
    ↓
Send to backend on "Run Full Demo"
```

### 5. Testing the Setup

**Terminal 1: Build the Babel plugin**
```bash
cd src/babel-plugin-minimact
npm install
npm run build
```

**Terminal 2: Start the backend**
```bash
cd playground/backend
dotnet build
dotnet watch run
```

**Terminal 3: Start the frontend**
```bash
cd playground/frontend
npm install
npm run dev
```

**In Browser**:
1. Navigate to http://localhost:5173 (or whatever Vite shows)
2. Go to the TSX tab
3. Start typing TSX code (default Counter component should be there)
4. Watch the "Transforming TSX to C#..." message appear
5. Switch to C# tab to see the generated code
6. Click "Run Full Demo" to compile and run

### 6. What to Look For / Troubleshooting

**If you see "Transforming TSX to C#..." but it never completes**:
- Check browser console for errors
- Likely: `/babel-plugin/minimact-babel-plugin.js` is not loading
- Solution: Run `npm run build` in the babel-plugin folder

**If you see "Transformation failed: Could not load Babel plugin"**:
- The fetch of `/babel-plugin/minimact-babel-plugin.js` is failing
- Check Network tab in browser DevTools
- Check that the dist folder exists and has files

**If the generated C# doesn't look right**:
- The Babel plugin might not be handling all JSX patterns correctly
- Check `index-full.cjs` for handling of hooks and JSX
- Look at generators/jsx.cjs and generators/renderBody.cjs

**If you get "Unknown module" errors in the console**:
- The require() function in babelTransform.ts might not be mapping all modules
- Add the missing module mapping to the require() function in loadBabelPlugin()

## Architecture Decisions

### Why Rollup?
- Already used for client-runtime bundling (consistency)
- Good for library bundling with CommonJS → UMD/ESM conversion
- Mature and well-documented

### Why @babel/standalone?
- Already includes Babel compiler in the browser
- No need for external build step on the server
- Fast transformation (runs in browser)
- User can see TSX → C# transformation instantly

### Why UMD Format?
- Compatible with loading via script tag or fetch + eval
- Self-contained with minimal dependencies
- Good for browser use

### Why fetch the plugin instead of bundling it?
- Keeps frontend bundle size smaller
- Plugin is only loaded when needed (lazy loading)
- Easier to update plugin without rebuilding frontend
- Can potentially load from CDN in production

## Production Deployment

For production on minimact.com:

1. **Build everything**:
   ```bash
   # Build Babel plugin
   cd src/babel-plugin-minimact && npm run build

   # Build frontend
   cd playground/frontend && npm run build

   # Build backend
   cd playground/backend && dotnet publish -c Release
   ```

2. **Serve Babel plugin**:
   - Copy `src/babel-plugin-minimact/dist/minimact-babel-plugin.js` to web server
   - Serve at `/babel-plugin/minimact-babel-plugin.js`
   - Or host on CDN and update URL in babelTransform.ts

3. **Serve frontend**:
   - Vite build output goes to `playground/frontend/dist/`
   - Serve as static files

4. **Serve backend**:
   - Host ASP.NET Core API
   - Set CORS origin to minimact.com
   - Ensure minimact.dll is in same folder

## Next Steps

1. ✅ Set up rollup config for Babel plugin
2. ✅ Set up vite proxy for Babel plugin
3. ✅ Implement babelTransform.ts with Babel loading
4. ✅ Update Editor.tsx to use transformation
5. ⏳ Run `npm install && npm run build` in babel-plugin folder
6. ⏳ Run `npm install && npm run dev` in frontend folder
7. ⏳ Test TSX transformation in browser
8. ⏳ Fix any issues with transformation
9. ⏳ Deploy to minimact.com
