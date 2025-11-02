# Minimact Swig - Hook Library Feature

**Status:** ✅ IMPLEMENTED
**Version:** 1.0.0
**Date:** November 1, 2025

## Overview

The Hook Library is a comprehensive catalog of all Minimact hooks with interactive selection during project creation. When creating a new Minimact project in Swig, developers can now select which hooks they want to learn about, and Swig will automatically generate working example code for each selected hook.

## Features

### 1. **Comprehensive Hook Catalog**

**Location:** `src/minimact-swig-electron/src/main/data/hook-library.ts`

Complete catalog of all available Minimact hooks across 4 categories:

#### **Core Hooks** (React-like fundamentals)
- `useState` - Manage component state with instant updates
- `useEffect` - Run side effects after renders
- `useRef` - Create mutable refs that persist across renders

#### **Advanced Hooks** (Server-side and client-computed)
- `useContext` - Redis-like server-side cache (session/request/URL/app scope)
- `useComputed` - Client-side computation (lodash, geolocation, crypto)
- `useServerTask` - Execute TypeScript on C# or Rust runtime
- `usePaginatedServerTask` - Server-side pagination with prefetching

#### **MVC Bridge Hooks** (ASP.NET MVC integration)
- `useMvcState` - Access ViewModel properties with mutability enforcement
- `useMvcViewModel` - Access entire ViewModel object

#### **Punch Hooks** (DOM as reactive data source)
- `useDomElementState` - 80+ reactive DOM properties
- `useDomElementState (Pseudo-State)` - Query CSS pseudo-classes (:hover, :focus)
- `useDomElementState (Theme)` - React to dark/light mode and breakpoints
- `useDomElementState (Temporal)` - Track state history and trends
- `useDomElementState (Statistics)` - Aggregate statistics over collections

Each hook includes:
- Name and description
- Category and package name
- Full code example
- Import statements
- Dependency tracking
- Default selection status

### 2. **Interactive UI Component**

**Location:** `src/minimact-swig-electron/src/renderer/src/components/create-project/HookLibrarySelector.tsx`

Rich UI for selecting hooks during project creation:

**Features:**
- ✅ Collapsible categories with descriptions
- ✅ Default hooks pre-selected (useState, useEffect, useRef)
- ✅ "Advanced Hooks" section (expandable)
- ✅ Live code preview modal for each hook
- ✅ Package badges showing @minimact/mvc, @minimact/punch
- ✅ Auto-selection of dependencies
- ✅ Selection summary showing count

**UX Flow:**
```
1. User creates new project
   ↓
2. Selects template (Counter, TodoList, Dashboard, MVC)
   ↓
3. Configures options (Solution file, Tailwind CSS)
   ↓
4. Hook Library Selector appears
   ├─ Core Hooks (expanded by default)
   ├─ Advanced Hooks (click to expand)
   │   ├─ Advanced Hooks
   │   ├─ MVC Bridge Hooks
   │   └─ Punch Hooks
   └─ Each hook has preview button (shows code modal)
   ↓
5. User selects hooks (checkboxes)
   ├─ Dependencies auto-selected
   └─ Summary shows: "5 hooks selected. Examples will be in Pages/Examples/"
   ↓
6. User creates project
   ↓
7. Swig generates example code for each selected hook
```

### 3. **Automatic Example Generation**

**Location:** `src/minimact-swig-electron/src/main/services/HookExampleGenerator.ts`

Generates working example files for selected hooks:

**Generated Structure:**
```
MyProject/
├── Pages/
│   ├── Examples/
│   │   ├── Index.tsx              # Gallery of all examples
│   │   ├── UseStateExample.tsx    # useState example
│   │   ├── UseEffectExample.tsx   # useEffect example
│   │   ├── UseRefExample.tsx      # useRef example
│   │   ├── UseMvcStateExample.tsx # useMvcState example (if selected)
│   │   ├── UseDomElementStateExample.tsx # DOM state example (if selected)
│   │   └── ...
│   └── Index.tsx                  # Main app page
```

**Features:**
- ✅ Auto-resolve dependencies (if useMvcState selected, useStat added)
- ✅ Organize by category
- ✅ Generate index page with gallery view
- ✅ Proper imports from mact_modules
- ✅ Full code examples (copy-paste ready)
- ✅ Inline documentation comments

**Index Page Features:**
- Categorized grid layout
- Click to preview example
- Shows hook description and package
- Hover effects for better UX
- Modal preview of running example

### 4. **Project Manager Integration**

**Modified Files:**
- `src/minimact-swig-electron/src/main/services/ProjectManager.ts`
- `src/minimact-swig-electron/src/main/ipc/project.ts`
- `src/minimact-swig-electron/src/renderer/src/pages/CreateProject.tsx`

**Flow:**
```typescript
// 1. CreateProject.tsx - User selects hooks
const [selectedHooks, setSelectedHooks] = useState<string[]>([
  'useState',
  'useEffect',
  'useRef'
]);

// 2. User clicks "Create Project"
await window.api.project.create(projectPath, template, {
  createSolution: true,
  enableTailwind: false,
  selectedHooks  // ← New parameter
});

// 3. IPC handler forwards to ProjectManager
ipcMain.handle('project:create', async (_, projectPath, template, options) => {
  return await projectManager.createProject(projectPath, template, options);
});

// 4. ProjectManager creates project structure
await this.createProjectStructure(projectPath, projectName, template);
await this.createSolutionFile(projectPath, projectName);
await this.setupTailwindCss(projectPath, projectName);

// 5. ProjectManager generates hook examples
if (options?.selectedHooks && options.selectedHooks.length > 0) {
  await this.hookExampleGenerator.generateHookExamples(
    projectPath,
    options.selectedHooks
  );
}

// 6. Project opens in Dashboard with Examples/ folder ready to explore
```

## Package Management

**Important:** Minimact Swig uses **local package sync** instead of npm downloads.

The extensions (@minimact/mvc, @minimact/punch) are pre-synced to `mact_modules` via:
```bash
# Run this in monorepo root to sync local packages to Swig
node scripts/sync-local-packages.js
```

This copies the latest local packages from:
- `src/minimact-mvc` → `src/minimact-swig-electron/mact_modules/@minimact/mvc`
- `src/minimact-punch` → `src/minimact-swig-electron/mact_modules/@minimact/punch`

**Generated projects reference these via:**
```typescript
import { useMvcState } from '@minimact/mvc';
import { useDomElementState } from '@minimact/punch';
```

No npm install required - packages are copied from mact_modules during project creation.

## Example Output

When a user selects hooks and creates a project, they get:

### **Pages/Examples/UseStateExample.tsx**
```tsx
import { useState } from 'minimact';

/**
 * Example: useState
 * Manage component state with instant updates and template prediction
 *
 * Category: core
 * Package: minimact (core)
 */

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// Export for use in Examples index
export default Counter;
```

### **Pages/Examples/UseMvcStateExample.tsx**
```tsx
import { useMvcState } from '@minimact/mvc';

/**
 * Example: useMvcState
 * Access MVC ViewModel properties with automatic mutability enforcement
 *
 * Category: mvc
 * Package: @minimact/mvc (available in mact_modules)
 */

export function ProductDetailsPage() {
  // Immutable props (no setter returned)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');

  // Mutable props (setter returned)
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate'
  });

  return (
    <div>
      <h1>{productName}</h1>
      <div>${price.toFixed(2)}</div>
      <button onClick={() => setQuantity(quantity + 1)}>+</button>
    </div>
  );
}

export default ProductDetailsPage;
```

### **Pages/Examples/Index.tsx**
```tsx
import { useState } from 'minimact';
import Counter from './UseStateExample';
import ProductDetailsPage from './UseMvcStateExample';
// ... other imports

export function Index() {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Minimact Hook Examples</h1>
      <p>This project includes examples for 5 hooks.</p>

      {/* Core Hooks */}
      <h2>Core Hooks</h2>
      <div style={{ display: 'grid', gap: '12px' }}>
        <button onClick={() => setActiveExample('useState')}>
          <div>useState</div>
          <div>Manage component state with instant updates</div>
        </button>
        {/* ... more hooks */}
      </div>

      {/* MVC Bridge Hooks */}
      <h2>MVC Bridge Hooks</h2>
      <div style={{ display: 'grid', gap: '12px' }}>
        <button onClick={() => setActiveExample('useMvcState')}>
          <div>useMvcState</div>
          <div>Access ViewModel properties with mutability enforcement</div>
          <div>Package: @minimact/mvc</div>
        </button>
      </div>

      {/* Active Example Modal */}
      {activeExample && <Modal>{/* Render active example */}</Modal>}
    </div>
  );
}
```

## Benefits

### For New Users
- 📚 **Learning Path** - See working examples of every hook
- 🎯 **Focused Learning** - Select only hooks you want to learn
- 🚀 **Immediate Productivity** - Copy-paste ready code
- 🔍 **Discovery** - Browse all available hooks in organized categories

### For Experienced Users
- ⚡ **Quick Reference** - Instant access to hook syntax
- 🎨 **Prototyping** - Generate starter code for new features
- 📖 **Documentation** - Self-documenting projects
- 🔄 **Consistency** - Same patterns across projects

### For Teams
- 📋 **Standards** - Consistent hook usage patterns
- 🎓 **Onboarding** - New team members see examples immediately
- 🏗️ **Scaffolding** - Kickstart new features with examples
- 💡 **Best Practices** - Examples follow Minimact conventions

## Technical Details

### Dependency Resolution

The Hook Library automatically resolves dependencies:

```typescript
// User selects: usePaginatedServerTask
// Dependencies: useServerTask, useState
//
// Result: 3 examples generated
// 1. UseStateExample.tsx
// 2. UseServerTaskExample.tsx
// 3. UsePaginatedServerTaskExample.tsx
```

**Algorithm:**
```typescript
function resolveWithDependencies(selectedHookIds: string[]): string[] {
  const allIds = new Set<string>(selectedHookIds);

  for (const hookId of selectedHookIds) {
    const deps = getHookDependencies(hookId);
    deps.forEach(dep => allIds.add(dep));
  }

  return Array.from(allIds);
}

function getHookDependencies(hookId: string): string[] {
  const hook = getHookById(hookId);
  if (!hook?.dependencies) return [];

  const deps = new Set<string>();
  const queue = [...hook.dependencies];

  while (queue.length > 0) {
    const depId = queue.shift()!;
    if (deps.has(depId)) continue;

    deps.add(depId);
    const depHook = getHookById(depId);
    if (depHook?.dependencies) {
      queue.push(...depHook.dependencies);
    }
  }

  return Array.from(deps);
}
```

### File Organization

```
src/minimact-swig-electron/
├── src/
│   ├── main/
│   │   ├── data/
│   │   │   └── hook-library.ts          # Hook catalog (14 hooks)
│   │   ├── services/
│   │   │   ├── HookExampleGenerator.ts  # Example file generator
│   │   │   └── ProjectManager.ts        # ✏️ Modified to call generator
│   │   └── ipc/
│   │       └── project.ts               # ✏️ Modified to pass selectedHooks
│   └── renderer/
│       └── src/
│           ├── components/
│           │   └── create-project/
│           │       └── HookLibrarySelector.tsx  # UI component
│           └── pages/
│               └── CreateProject.tsx     # ✏️ Modified to include selector
└── mact_modules/                        # Local packages (synced via script)
    └── @minimact/
        ├── core/
        ├── mvc/
        └── punch/
```

## Testing

To test the Hook Library feature:

1. **Sync Local Packages:**
   ```bash
   cd J:\projects\minimact
   node scripts\sync-local-packages.js
   ```

2. **Start Minimact Swig:**
   ```bash
   cd src\minimact-swig-electron
   npm run dev
   ```

3. **Create New Project:**
   - Click "Create New Project"
   - Enter project name and directory
   - Select template (e.g., "Counter")
   - Scroll to "Hook Library" section
   - Expand "Advanced Hooks"
   - Select additional hooks (e.g., useMvcState, useDomElementState)
   - Click "Create Project"

4. **Verify Generated Examples:**
   - Project opens in Dashboard
   - Check file tree shows `Pages/Examples/`
   - Click on example files to see code
   - Open `Pages/Examples/Index.tsx` to see gallery
   - Transpile and run project
   - Navigate to `/Examples` route

## Future Enhancements

### Phase 2 (Planned)
- [ ] **Search and Filter** - Search hooks by keyword
- [ ] **Tags** - Filter by tags (e.g., "pagination", "forms", "animation")
- [ ] **Playground Integration** - Run examples in Swig's built-in playground
- [ ] **Custom Examples** - Let users add their own hook examples to library
- [ ] **Export/Import** - Share hook selections between projects

### Phase 3 (Planned)
- [ ] **Hook Recommendations** - AI-powered suggestions based on template
- [ ] **Code Snippets** - Insert hook code directly in editor
- [ ] **Interactive Tutorial** - Step-by-step guide through each hook
- [ ] **Video Examples** - Embed demo videos for complex hooks

## Summary

The Hook Library feature transforms Minimact Swig from a simple IDE into a **learning platform** and **productivity tool**. New users can explore all available hooks through working examples, while experienced users get instant access to reference implementations.

**Key Stats:**
- ✅ 14 hooks cataloged
- ✅ 4 categories (Core, Advanced, MVC, Punch)
- ✅ 100% dependency resolution
- ✅ Auto-generated index page
- ✅ Zero npm downloads (local packages)
- ✅ Production-ready code examples

**Impact:**
- 🚀 Faster onboarding for new Minimact developers
- 📚 Self-documenting projects with built-in examples
- 🎯 Reduced time from "I need X" to "I have working code for X"
- 💡 Discovery of advanced features (Punch, MVC Bridge, Server Tasks)
