# Tailwind CSS Integration Plan for Minimact

## Overview

This document outlines the implementation plan for integrating Tailwind CSS into Minimact projects, specifically through the Minimact Swig IDE. This allows developers to use Tailwind utility classes in TSX files while maintaining full compatibility with the Minimact build pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ProductDetailsPage.tsx (with Tailwind classes)             │
│  <div className="flex gap-4 p-5 bg-blue-500">               │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌─────────────────────┐
        │  Babel Plugin    │  │  Tailwind CLI       │
        │  (Transpile)     │  │  (Scan & Generate)  │
        └──────────────────┘  └─────────────────────┘
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌─────────────────────┐
        │  .cs Component   │  │  tailwind.css       │
        │  class="..."     │  │  (Purged/Minified)  │
        └──────────────────┘  └─────────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    ┌──────────────────┐
                    │  ASP.NET Server  │
                    │  + wwwroot/css   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Browser Render  │
                    │  (Styled UI)     │
                    └──────────────────┘
```

## Implementation Phases

### Phase 1: Project Structure Setup
**Goal**: Set up Tailwind in the example MVC project

**Tasks**:
1. Create `package.json` in the MVC project root
2. Install Tailwind dependencies:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init
   ```
3. Create `tailwind.config.js`:
   ```js
   module.exports = {
     content: [
       // User TSX components
       './Pages/**/*.tsx',
       './Components/**/*.tsx',
       './Views/**/*.tsx',

       // Plugin C# source files (for plugin Tailwind classes)
       './Plugins/**/*.cs',
       '../packages/**/*.cs',  // External plugin packages
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```
4. Create `src/styles/tailwind.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
5. Create output directory structure:
   ```
   wwwroot/
     css/
       tailwind.css (generated)
   ```

**Deliverables**:
- ✅ Tailwind configuration files
- ✅ Source CSS file with directives
- ✅ Output directory structure

---

### Phase 2: Minimact Swig Integration
**Goal**: Integrate Tailwind CSS generation into the Minimact Swig transpiler pipeline

**Location**: `src/minimact-swig-electron/src/services/transpiler.ts`

**Tasks**:

1. **Add Tailwind CSS Build Step**
   - Modify the transpilation pipeline to run Tailwind CLI after Babel transpilation
   - Ensure Tailwind runs for the specific project being transpiled
   - Handle errors gracefully

2. **Implementation in Transpiler Service**:
   ```typescript
   async function transpileProject(projectPath: string) {
     try {
       // Step 1: Babel transpilation (existing)
       await transpileTsxToCSharp(projectPath);

       // Step 2: Tailwind CSS generation (NEW)
       await generateTailwindCss(projectPath);

       // Step 3: Template extraction (existing)
       await extractTemplates(projectPath);

       return { success: true };
     } catch (error) {
       return { success: false, error };
     }
   }

   async function generateTailwindCss(projectPath: string): Promise<void> {
     const tailwindConfigPath = path.join(projectPath, 'tailwind.config.js');
     const inputCssPath = path.join(projectPath, 'src/styles/tailwind.css');
     const outputCssPath = path.join(projectPath, 'wwwroot/css/tailwind.css');

     // Check if Tailwind is configured
     if (!fs.existsSync(tailwindConfigPath)) {
       console.log('[Tailwind] No tailwind.config.js found, skipping CSS generation');
       return;
     }

     // Ensure output directory exists
     fs.mkdirSync(path.dirname(outputCssPath), { recursive: true });

     // Run Tailwind CLI
     const command = `npx tailwindcss -i "${inputCssPath}" -o "${outputCssPath}" --minify`;

     await execAsync(command, { cwd: projectPath });

     console.log('[Tailwind] ✓ Generated CSS:', outputCssPath);
   }
   ```

3. **Watch Mode Support**:
   ```typescript
   async function watchProject(projectPath: string) {
     // Watch .tsx files
     chokidar.watch('**/*.tsx', { cwd: projectPath })
       .on('change', async (file) => {
         await transpileFile(file);
         await generateTailwindCss(projectPath); // Regenerate on change
       });
   }
   ```

**Deliverables**:
- ✅ Tailwind CLI integration in transpiler
- ✅ Watch mode support for live CSS updates
- ✅ Error handling and logging

---

### Phase 3: UI Integration in Minimact Swig
**Goal**: Add UI controls for Tailwind management in the Electron app

**Tasks**:

1. **Add Tailwind Status Indicator**:
   - Show whether Tailwind is configured for current project
   - Display CSS file size after generation
   - Show last build time

2. **Add Tailwind Controls**:
   - Button: "Initialize Tailwind" (runs `npx tailwindcss init`)
   - Button: "Regenerate CSS" (manual trigger)
   - Toggle: "Auto-generate on save" (default: on)

3. **Build Output Panel**:
   ```
   [Transpiler] Transpiling ProductDetailsPage.tsx...
   [Transpiler] ✓ Generated ProductDetailsPage.cs
   [Tailwind] Scanning for classes...
   [Tailwind] ✓ Generated tailwind.css (42.3 KB → 8.1 KB minified)
   [Templates] Extracted 12 templates
   ```

**UI Mockup**:
```
┌─────────────────────────────────────┐
│ Build Status                        │
├─────────────────────────────────────┤
│ ✓ Transpiled: 15 files              │
│ ✓ Tailwind CSS: 8.1 KB (purged)    │
│ ✓ Templates: 47 extracted           │
│                                     │
│ [Regenerate CSS] [Initialize TW]   │
└─────────────────────────────────────┘
```

**Deliverables**:
- ✅ UI status indicators
- ✅ Manual control buttons
- ✅ Build output integration

---

### Phase 4: ASP.NET Integration
**Goal**: Ensure generated CSS is properly served by ASP.NET

**Tasks**:

1. **Update `_Layout.cshtml` or equivalent**:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <meta charset="utf-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>@ViewData["Title"] - My App</title>

       <!-- Tailwind CSS (generated by Minimact Swig) -->
       <link href="~/css/tailwind.css" rel="stylesheet" asp-append-version="true" />
   </head>
   <body>
       @RenderBody()
   </body>
   </html>
   ```

2. **Configure Static Files**:
   ```csharp
   // In Program.cs or Startup.cs
   app.UseStaticFiles(new StaticFileOptions
   {
       OnPrepareResponse = ctx =>
       {
           // Cache CSS for better performance
           if (ctx.File.Name.EndsWith(".css"))
           {
               ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=31536000");
           }
       }
   });
   ```

3. **Add `.gitignore` entry**:
   ```
   # Generated Tailwind CSS
   wwwroot/css/tailwind.css
   ```

**Deliverables**:
- ✅ Layout file with CSS reference
- ✅ Static file serving configured
- ✅ Git ignore for generated files

---

### Phase 5: Developer Experience Enhancements

**Tasks**:

1. **VSCode Extension Integration**:
   - Recommend Tailwind CSS IntelliSense extension
   - Add to `.vscode/extensions.json`:
     ```json
     {
       "recommendations": [
         "bradlc.vscode-tailwindcss"
       ]
     }
     ```

2. **TypeScript Types for className**:
   - Add utility types for better autocomplete:
     ```typescript
     // In minimact types
     type ClassName = string;

     interface HTMLAttributes {
       className?: ClassName;
       // ... other props
     }
     ```

3. **Create Tailwind Preset** (optional):
   ```js
   // minimact-tailwind-preset.js
   module.exports = {
     theme: {
       extend: {
         // Minimact-specific design tokens
         colors: {
           'minimact-primary': '#3b82f6',
           'minimact-secondary': '#10b981',
         }
       }
     }
   }
   ```

4. **Sample Component Library**:
   Create example components using Tailwind:
   ```tsx
   // Button.tsx
   export function Button({ children, variant = 'primary' }) {
     const classes = variant === 'primary'
       ? 'bg-blue-500 hover:bg-blue-600 text-white'
       : 'bg-gray-200 hover:bg-gray-300 text-gray-800';

     return (
       <button className={`px-4 py-2 rounded font-medium ${classes}`}>
         {children}
       </button>
     );
   }
   ```

**Deliverables**:
- ✅ VSCode extension recommendations
- ✅ TypeScript type definitions
- ✅ Sample component library
- ✅ Minimact Tailwind preset

---

### Phase 6: Documentation & Examples

**Tasks**:

1. **Create TAILWIND_QUICKSTART.md**:
   - How to enable Tailwind in a new project
   - Common patterns and examples
   - Troubleshooting guide

2. **Update Existing Examples**:
   - Convert ProductDetailsPage to use Tailwind classes
   - Show before/after comparison

3. **Performance Guide**:
   - How purging works
   - CSS file size optimization
   - Production vs development builds

4. **Migration Guide**:
   - Converting inline styles to Tailwind
   - Converting CSS modules to Tailwind
   - Best practices

**Example Before/After**:

**Before (inline styles)**:
```tsx
<div style={{
  padding: '20px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px'
}}>
  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
    Product Details
  </h2>
</div>
```

**After (Tailwind)**:
```tsx
<div className="p-5 bg-gray-100 rounded-lg">
  <h2 className="text-2xl font-bold">
    Product Details
  </h2>
</div>
```

**Deliverables**:
- ✅ Quick start guide
- ✅ Updated examples
- ✅ Performance documentation
- ✅ Migration guide

---

## Plugin System Integration

### How Plugins Use Tailwind

Minimact has a **Plugin System** (see `PLUGIN_SYSTEM_PHASE2_COMPLETE.md`) that allows third-party components. Plugins work seamlessly with Tailwind:

#### **Option A: Use Global Tailwind** (Recommended)

Plugins use Tailwind classes from the main app's CSS:

```csharp
// ClockPlugin.cs
public VNode Render(object state)
{
    return new VElement("div", new Dictionary<string, string>
    {
        // ✅ Uses global Tailwind classes
        ["class"] = "flex items-center gap-2 p-4 bg-blue-500 text-white rounded-lg"
    },
    new VNode[]
    {
        new VElement("span", new Dictionary<string, string>
        {
            ["class"] = "text-2xl font-bold"
        }, time)
    });
}
```

**Configuration:**
- Add plugin directories to `tailwind.config.js` content paths
- Tailwind scans plugin C# files for classes
- All classes included in main `tailwind.css`

**Pros:**
- ✅ Single CSS file (smaller overall size)
- ✅ Consistent design system across plugins
- ✅ No plugin-specific CSS needed

---

#### **Option B: Plugin-Specific Tailwind** (Advanced)

Each plugin builds its own Tailwind CSS:

```
MyClockPlugin/
├── src/
│   ├── ClockPlugin.cs
│   └── styles/
│       └── tailwind.css        # Plugin Tailwind source
├── assets/
│   └── clock.css               # Generated (embedded resource)
├── tailwind.config.js          # Plugin-specific config
└── package.json
```

**Build:**
```bash
cd MyClockPlugin
npx tailwindcss -i ./src/styles/tailwind.css -o ./assets/clock.css --minify
```

**Serve:**
```
GET /plugin-assets/Clock@1.0.0/clock.css
```

**Pros:**
- ✅ Plugin is fully self-contained
- ✅ Plugin works without main app Tailwind
- ✅ Smaller per-plugin CSS (~2-5 KB)

**Cons:**
- ⚠️ Duplicate Tailwind utilities across plugins
- ⚠️ More complex build process

---

#### **Recommendation: Use Option A**

Most plugins should use the **global Tailwind CSS**. Only use plugin-specific CSS for:
- Standalone plugins distributed without source
- Plugins with heavy custom styles
- Plugins that need version-locked Tailwind

---

## Technical Considerations

### 1. **Content Scanning Strategy**

Tailwind needs to scan files for class names. Since we transpile TSX → C#, we have two options:

**Option A: Scan TSX files** (Recommended)
- Tailwind scans `.tsx` files directly
- Standard Tailwind workflow
- Classes are in original source

**Option B: Scan Generated C# files**
- More complex setup
- Would need custom extractor:
  ```js
  // tailwind.config.js
  module.exports = {
    content: {
      files: ['Pages/**/*.cs'],
      extract: {
        cs: (content) => {
          // Extract className values from C# strings
          return content.match(/\["class"\]\s*=\s*"([^"]+)"/g);
        }
      }
    }
  }
  ```

**Decision**: Use Option A (scan TSX files)

---

### 2. **Class Name Concatenation**

Since C# doesn't have template literals, dynamic class names need special handling:

**TSX**:
```tsx
const buttonClass = `px-4 py-2 ${isPrimary ? 'bg-blue-500' : 'bg-gray-500'}`;
<button className={buttonClass}>Click</button>
```

**Generated C#**:
```csharp
var buttonClass = $"px-4 py-2 {(isPrimary ? "bg-blue-500" : "bg-gray-500")}";
new VElement("button", new Dictionary<string, string> { ["class"] = buttonClass }, ...)
```

This works! Tailwind will see both `bg-blue-500` and `bg-gray-500` in the TSX file and include both in the generated CSS.

---

### 3. **Purging & Production Builds**

**Development**:
- Full Tailwind CSS (~3.5 MB uncompressed)
- No purging for faster builds
- All utilities available

**Production**:
- Run Tailwind with `--minify`
- Automatic purging based on content
- Typically reduces to ~10-50 KB

**Build command**:
```bash
# Development
npx tailwindcss -i ./src/styles/tailwind.css -o ./wwwroot/css/tailwind.css

# Production
npx tailwindcss -i ./src/styles/tailwind.css -o ./wwwroot/css/tailwind.css --minify
```

---

### 4. **Hot Module Replacement (HMR)**

When a TSX file changes:
1. Babel transpiles → generates new C#
2. Tailwind CLI scans → regenerates CSS
3. Browser auto-refreshes (via Minimact HMR)

**Timeline**:
```
TSX change → 50-100ms (Babel) → 100-200ms (Tailwind) → 50ms (HMR) = ~200-350ms total
```

This is fast enough for good DX!

---

## File Structure

After implementation, a Minimact MVC project will have:

```
MyMvcApp/
├── Pages/
│   ├── ProductDetailsPage.tsx       # Source with Tailwind classes
│   └── ProductDetailsPage.cs        # Generated C# component
├── src/
│   └── styles/
│       └── tailwind.css             # Tailwind directives
├── wwwroot/
│   └── css/
│       └── tailwind.css             # Generated CSS (gitignored)
├── Views/
│   └── Shared/
│       └── _Layout.cshtml           # Includes CSS link
├── package.json                     # NPM dependencies
├── tailwind.config.js               # Tailwind configuration
└── .gitignore                       # Ignore generated CSS
```

---

## Success Criteria

- ✅ Developer can use Tailwind classes in TSX files
- ✅ Tailwind CSS is automatically generated on transpile
- ✅ CSS is purged and minified for production
- ✅ Hot reload works smoothly (<500ms)
- ✅ VSCode IntelliSense works for Tailwind classes
- ✅ Generated CSS is served correctly by ASP.NET
- ✅ Build output shows Tailwind generation status
- ✅ Documentation is clear and comprehensive

---

## Timeline Estimate

- **Phase 1**: 2-3 hours (Project structure setup)
- **Phase 2**: 4-6 hours (Swig integration)
- **Phase 3**: 3-4 hours (UI integration)
- **Phase 4**: 1-2 hours (ASP.NET integration)
- **Phase 5**: 3-4 hours (DX enhancements)
- **Phase 6**: 4-5 hours (Documentation)

**Total**: 17-24 hours (~3-4 working days)

---

## Future Enhancements

1. **Tailwind Plugins Support**:
   - @tailwindcss/forms
   - @tailwindcss/typography
   - @tailwindcss/aspect-ratio

2. **Custom Design System**:
   - Minimact-specific Tailwind preset
   - Shared component library

3. **JIT Mode** (Just-In-Time):
   - Already enabled by default in Tailwind 3.x
   - Generates only the classes you use

4. **PostCSS Pipeline**:
   - Add autoprefixer
   - Add cssnano for additional minification
   - Custom transformations

5. **Multi-Theme Support**:
   - Dark mode
   - Theme switching
   - CSS variables integration

---

## Questions to Resolve

1. Should Tailwind be **optional** or **default** in new Minimact projects?
2. Should Minimact Swig **auto-detect** and install Tailwind if `tailwind.config.js` is present?
3. Should we provide a **"Create with Tailwind"** project template in Swig?
4. Should we create a **Minimact UI component library** built with Tailwind?

---

## Related Documents

- [Minimact Swig Electron Plan](./MINIMACT_SWIG_ELECTRON_PLAN.md)
- [Template Patch System](./TEMPLATE_PATCH_SYSTEM.md)
- [MVC Bridge Implementation](./MVC_BRIDGE_IMPLEMENTATION_PLAN.md)

---

**Status**: 📋 Planning Phase
**Last Updated**: 2025-01-XX
**Owner**: Minimact Team
