# MVC Bridge Implementation Plan

**`@minimact/mvc-bridge` - Seamless Integration Between ASP.NET MVC and Minimact**

---

## Vision

Bridge the gap between traditional ASP.NET MVC patterns and modern Minimact reactivity by allowing **MVC Controllers** to pass **ViewModels** to **Minimact components**, with full type safety and intelligent mutability controls.

### The Core Problem

Developers love MVC's familiar patterns:
- Controllers handle routing and business logic
- ViewModels prepare complex data structures
- Authorization (`User.IsInRole()`) is built-in
- Entity Framework integration is straightforward

But they also want:
- Real-time UI updates (SignalR)
- Predictive rendering (Template Patch System)
- React-like component model (hooks, state)
- Modern developer experience (TSX, TypeScript)

**Solution:** Let MVC Controllers pass ViewModels to Minimact components, with clear boundaries between server-authoritative (immutable) and client-mutable state.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MVC Controller                             │
│  - Handles routing (/products/details/123)                     │
│  - Fetches data from database                                  │
│  - Prepares ViewModel with business logic                      │
│  - Authorizes user (User.IsInRole())                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ (passes ViewModel)
┌─────────────────────────────────────────────────────────────────┐
│                  MinimactPageRenderer                           │
│  - Receives ViewModel from controller                          │
│  - Serializes ViewModel to JSON                                │
│  - Identifies mutable vs. immutable properties                 │
│  - Creates Minimact component instance                         │
│  - Renders VNode tree                                          │
│  - Embeds serialized ViewModel in HTML                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ (HTML with embedded JSON)
┌─────────────────────────────────────────────────────────────────┐
│                     Client Browser                              │
│  <script id="minimact-viewmodel">                              │
│    {                                                           │
│      "fullName": "John Doe",                                   │
│      "isAdminRole": true,        // ❌ Immutable               │
│      "initialCount": 5,          // ✅ Mutable                 │
│      "_mutability": {                                          │
│        "initialCount": true,                                   │
│        "isAdminRole": false                                    │
│      }                                                         │
│    }                                                           │
│  </script>                                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ (window.__MINIMACT_VIEWMODEL__)
┌─────────────────────────────────────────────────────────────────┐
│                   TSX Component (Client)                        │
│                                                                 │
│  const [isAdmin] = useMvcState('isAdminRole');                 │
│  // ❌ Read-only - cannot call setIsAdmin()                    │
│                                                                 │
│  const [count, setCount] = useMvcState('initialCount');        │
│  // ✅ Mutable - setCount() syncs to server                    │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓ (user calls setCount())
┌─────────────────────────────────────────────────────────────────┐
│                    SignalR → Server                             │
│  - UpdateComponentState(componentId, "initialCount", 10)       │
│  - Server validates mutability                                 │
│  - Server re-renders with new state                            │
│  - Patches sent back to client                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. **`[Mutable]` Attribute** - Declare Intent

```csharp
public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public bool IsAdminRole { get; set; }
    public decimal FactoryPrice { get; set; }
    public string UserEmail { get; set; }
    public List<string> AllowedActions { get; set; }

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialCount { get; set; }

    [Mutable]
    public decimal InitialPrice { get; set; }

    [Mutable]
    public string InitialSearchQuery { get; set; }

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
```

### 2. **`useMvcState` Hook** - Automatic Mutability Enforcement

```typescript
// ❌ IMMUTABLE - Returns tuple with null setter
const [isAdmin] = useMvcState<boolean>('isAdminRole');
// isAdmin is read-only, no setter returned

// ✅ MUTABLE - Returns tuple with functional setter
const [count, setCount] = useMvcState<number>('initialCount');
setCount(10); // ✅ Works! Syncs to server

// TypeScript error if you try to mutate immutable
const [email, setEmail] = useMvcState<string>('userEmail');
setEmail('hacker@evil.com'); // 🚨 TypeScript error + runtime rejection
```

### 3. **`useMvcViewModel` Hook** - Access Entire ViewModel

```typescript
interface ProductViewModel {
    isAdminRole: boolean;
    factoryPrice: number;
    initialCount: number;
    initialPrice: number;
}

// Read-only access to entire ViewModel
const viewModel = useMvcViewModel<ProductViewModel>();

console.log(viewModel.isAdminRole); // true
console.log(viewModel.factoryPrice); // 99.99
```

### 4. **Server-Side Validation** - Security Boundary

```csharp
// MinimactHub.cs - Validates mutability before applying state
public async Task UpdateComponentState(string componentId, string stateKey, object value)
{
    var component = _registry.GetComponent(componentId);

    // ✅ Check if this state is mutable
    if (!component.IsMvcStateMutable(stateKey))
    {
        await Clients.Caller.SendAsync("Error", new {
            message = $"State '{stateKey}' is immutable and cannot be modified from client"
        });
        return;
    }

    // Apply state update
    component.SetStateFromClient(stateKey, value);
    component.TriggerRender();
}
```

---

## Implementation Phases

### **Phase 1: Core C# Infrastructure (Week 1)**

#### Files to Create:

1. **`src/Minimact.AspNetCore/Attributes/MutableAttribute.cs`**
   ```csharp
   [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
   public class MutableAttribute : Attribute
   {
       /// <summary>
       /// Marks a ViewModel property as mutable from the client.
       /// Client can update this value via useMvcState hook.
       /// Server will validate mutability before applying updates.
       /// </summary>
       public MutableAttribute() { }
   }
   ```

2. **`src/Minimact.AspNetCore/Rendering/MinimactPageRenderer.cs`**
   ```csharp
   public class MinimactPageRenderer
   {
       private readonly IServiceProvider _serviceProvider;
       private readonly ComponentRegistry _registry;

       public async Task<IActionResult> RenderPage<TComponent>(
           object viewModel,
           string pageTitle)
           where TComponent : MinimactComponent
       {
           // 1. Create component with ViewModel
           var component = ActivatorUtilities.CreateInstance<TComponent>(
               _serviceProvider,
               viewModel
           );

           // 2. Extract mutability metadata via reflection
           var mutability = ExtractMutabilityMetadata(viewModel);

           // 3. Serialize ViewModel + mutability
           var viewModelJson = SerializeViewModel(viewModel, mutability);

           // 4. Register and render
           _registry.RegisterComponent(component);
           var vnode = await component.InitializeAndRenderAsync();
           var html = vnode.ToHtml();

           // 5. Generate HTML with embedded ViewModel
           var pageHtml = GeneratePageHtml(component, html, pageTitle, viewModelJson);

           return new ContentResult
           {
               Content = pageHtml,
               ContentType = "text/html"
           };
       }

       private Dictionary<string, bool> ExtractMutabilityMetadata(object viewModel)
       {
           var type = viewModel.GetType();
           var mutability = new Dictionary<string, bool>();

           foreach (var prop in type.GetProperties())
           {
               var isMutable = prop.GetCustomAttribute<MutableAttribute>() != null;
               mutability[ToCamelCase(prop.Name)] = isMutable;
           }

           return mutability;
       }

       private string SerializeViewModel(object viewModel, Dictionary<string, bool> mutability)
       {
           var wrapper = new
           {
               data = viewModel,
               _mutability = mutability
           };

           return System.Text.Json.JsonSerializer.Serialize(wrapper, new JsonSerializerOptions
           {
               PropertyNamingPolicy = JsonNamingPolicy.CamelCase
           });
       }

       private string ToCamelCase(string str)
       {
           if (string.IsNullOrEmpty(str) || char.IsLower(str[0]))
               return str;

           return char.ToLower(str[0]) + str.Substring(1);
       }
   }
   ```

3. **`src/Minimact.AspNetCore/Extensions/MvcBridgeExtensions.cs`**
   ```csharp
   public static class MvcBridgeExtensions
   {
       /// <summary>
       /// Add MVC Bridge services to enable ViewModel → Minimact integration
       /// </summary>
       public static IServiceCollection AddMinimactMvcBridge(this IServiceCollection services)
       {
           services.AddSingleton<MinimactPageRenderer>();
           return services;
       }
   }
   ```

4. **Extend `MinimactComponent.cs`**
   ```csharp
   public abstract class MinimactComponent
   {
       // ... existing code ...

       /// <summary>
       /// MVC ViewModel instance (if provided by controller)
       /// </summary>
       protected object? MvcViewModel { get; internal set; }

       /// <summary>
       /// Mutability metadata for MVC ViewModel properties
       /// </summary>
       private Dictionary<string, bool>? _mvcMutability;

       /// <summary>
       /// Set MVC ViewModel and mutability metadata
       /// Called by MinimactPageRenderer
       /// </summary>
       internal void SetMvcViewModel(object viewModel, Dictionary<string, bool> mutability)
       {
           MvcViewModel = viewModel;
           _mvcMutability = mutability;
       }

       /// <summary>
       /// Check if an MVC state property is mutable
       /// </summary>
       public bool IsMvcStateMutable(string stateKey)
       {
           if (_mvcMutability == null) return false;

           // Extract property name from state key (e.g., "mvc_initialCount_0" → "initialCount")
           var propertyName = ExtractPropertyNameFromStateKey(stateKey);

           return _mvcMutability.TryGetValue(propertyName, out var isMutable) && isMutable;
       }

       private string ExtractPropertyNameFromStateKey(string stateKey)
       {
           // Pattern: "mvc_{propertyName}_{index}"
           var parts = stateKey.Split('_');
           if (parts.Length >= 2 && parts[0] == "mvc")
           {
               return parts[1];
           }
           return stateKey;
       }
   }
   ```

5. **Extend `MinimactHub.cs`**
   ```csharp
   public async Task UpdateComponentState(string componentId, string stateKey, object value)
   {
       var component = _registry.GetComponent(componentId);

       if (component == null)
       {
           await Clients.Caller.SendAsync("Error", "Component not found");
           return;
       }

       // ✅ NEW: Validate mutability for MVC state
       if (stateKey.StartsWith("mvc_"))
       {
           if (!component.IsMvcStateMutable(stateKey))
           {
               await Clients.Caller.SendAsync("Error", new {
                   message = $"State '{stateKey}' is immutable and cannot be modified from client",
                   code = "IMMUTABLE_STATE_VIOLATION"
               });

               // Log security event
               Console.WriteLine($"[Security] Client attempted to modify immutable MVC state: {stateKey}");
               return;
           }
       }

       // Apply state update
       component.SetStateFromClient(stateKey, value);
       component.TriggerRender();
   }
   ```

**Success Criteria:**
- ✅ `[Mutable]` attribute works
- ✅ MinimactPageRenderer extracts mutability metadata
- ✅ ViewModel serialized with `_mutability` field
- ✅ Server validates mutability before applying updates
- ✅ Security boundary enforced

---

### **Phase 2: Client-Side TypeScript Hooks (Week 1)**

#### Files to Create:

1. **`src/minimact-mvc-bridge/src/types.ts`**
   ```typescript
   /**
    * MVC ViewModel with mutability metadata
    */
   export interface MvcViewModelWrapper<T = any> {
       data: T;
       _mutability: Record<string, boolean>;
   }

   /**
    * Hook return type for mutable state
    */
   export type MutableMvcState<T> = [T, (newValue: T | ((prev: T) => T)) => void];

   /**
    * Hook return type for immutable state
    */
   export type ImmutableMvcState<T> = [T];

   /**
    * Configuration for useMvcState hook
    */
   export interface UseMvcStateOptions {
       /**
        * Default value if property not found in ViewModel
        */
       defaultValue?: any;

       /**
        * Override mutability check (dangerous - use with caution)
        */
       forceMutable?: boolean;
   }
   ```

2. **`src/minimact-mvc-bridge/src/hooks.ts`**
   ```typescript
   import { ComponentContext, currentContext, stateIndex } from '@minimact/core';
   import {
       MvcViewModelWrapper,
       MutableMvcState,
       ImmutableMvcState,
       UseMvcStateOptions
   } from './types';

   /**
    * Access MVC ViewModel property as reactive state
    *
    * Automatically enforces mutability:
    * - If property is marked [Mutable] in C#: Returns [value, setter]
    * - If property is immutable: Returns [value] (no setter)
    *
    * @example
    * // Mutable property
    * const [count, setCount] = useMvcState<number>('initialCount');
    * setCount(10); // ✅ Works
    *
    * // Immutable property
    * const [isAdmin] = useMvcState<boolean>('isAdminRole');
    * // No setter available - TypeScript enforces read-only
    */
   export function useMvcState<T>(
       propertyName: string,
       options?: UseMvcStateOptions
   ): MutableMvcState<T> | ImmutableMvcState<T> {
       if (!currentContext) {
           throw new Error('useMvcState must be called within a component render');
       }

       const context = currentContext;
       const index = stateIndex++;
       const stateKey = `mvc_${propertyName}_${index}`;

       // Get ViewModel wrapper from window
       const wrapper = (window as any).__MINIMACT_VIEWMODEL__ as MvcViewModelWrapper | null;

       if (!wrapper) {
           console.warn('[MVC Bridge] No ViewModel found. Did you render via MinimactPageRenderer?');
       }

       // Check mutability
       const isMutable = options?.forceMutable ||
                        wrapper?._mutability?.[propertyName] ||
                        false;

       // Initialize state from ViewModel
       if (!context.state.has(stateKey)) {
           const initialValue = wrapper?.data?.[propertyName] ?? options?.defaultValue;
           context.state.set(stateKey, initialValue);
       }

       const currentValue = context.state.get(stateKey) as T;

       // If immutable, return [value] only
       if (!isMutable) {
           return [currentValue] as ImmutableMvcState<T>;
       }

       // If mutable, return [value, setter]
       const setState = (newValue: T | ((prev: T) => T)) => {
           const startTime = performance.now();

           const actualNewValue = typeof newValue === 'function'
               ? (newValue as (prev: T) => T)(context.state.get(stateKey) as T)
               : newValue;

           // Update local state
           context.state.set(stateKey, actualNewValue);

           // Build state change object
           const stateChanges: Record<string, any> = {
               [stateKey]: actualNewValue
           };

           // Check hint queue for template match
           const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

           if (hint) {
               // 🟢 CACHE HIT
               const latency = performance.now() - startTime;
               console.log(`[MVC Bridge] 🟢 CACHE HIT! MVC state '${propertyName}' updated`);
               context.domPatcher.applyPatches(context.element, hint.patches);

               if (context.playgroundBridge) {
                   context.playgroundBridge.cacheHit({
                       componentId: context.componentId,
                       hintId: hint.hintId,
                       latency,
                       confidence: hint.confidence,
                       patchCount: hint.patches.length
                   });
               }
           } else {
               // 🔴 CACHE MISS
               console.log(`[MVC Bridge] 🔴 CACHE MISS - MVC state '${propertyName}' changed`);

               if (context.playgroundBridge) {
                   context.playgroundBridge.cacheMiss({
                       componentId: context.componentId,
                       methodName: `setMvcState(${propertyName})`,
                       latency: performance.now() - startTime,
                       patchCount: 0
                   });
               }
           }

           // Sync to server (validates mutability server-side)
           context.signalR.updateComponentState(context.componentId, stateKey, actualNewValue)
               .catch(err => {
                   console.error(`[MVC Bridge] Failed to sync MVC state '${propertyName}':`, err);

                   // Revert on error (server rejected mutation)
                   context.state.set(stateKey, currentValue);
               });
       };

       return [currentValue, setState] as MutableMvcState<T>;
   }

   /**
    * Access the entire MVC ViewModel (read-only)
    *
    * @example
    * interface MyViewModel {
    *   fullName: string;
    *   isAdmin: boolean;
    * }
    *
    * const viewModel = useMvcViewModel<MyViewModel>();
    * console.log(viewModel.fullName);
    */
   export function useMvcViewModel<T = any>(): T | null {
       const wrapper = (window as any).__MINIMACT_VIEWMODEL__ as MvcViewModelWrapper<T> | null;
       return wrapper?.data ?? null;
   }

   /**
    * Check if a ViewModel property is mutable
    *
    * @example
    * const canMutate = isMvcPropertyMutable('initialCount'); // true
    */
   export function isMvcPropertyMutable(propertyName: string): boolean {
       const wrapper = (window as any).__MINIMACT_VIEWMODEL__ as MvcViewModelWrapper | null;
       return wrapper?._mutability?.[propertyName] ?? false;
   }
   ```

3. **`src/minimact-mvc-bridge/src/index.ts`**
   ```typescript
   /**
    * @minimact/mvc-bridge
    *
    * Seamless integration between ASP.NET MVC Controllers and Minimact components.
    * Allows MVC ViewModels to be passed to Minimact pages with intelligent mutability controls.
    */

   export { useMvcState, useMvcViewModel, isMvcPropertyMutable } from './hooks';
   export type {
       MvcViewModelWrapper,
       MutableMvcState,
       ImmutableMvcState,
       UseMvcStateOptions
   } from './types';

   export const VERSION = '0.1.0';
   export const PACKAGE_INFO = {
       name: '@minimact/mvc-bridge',
       version: VERSION,
       description: 'MVC ViewModel integration for Minimact',
       features: [
           'useMvcState hook with automatic mutability enforcement',
           'useMvcViewModel hook for read-only ViewModel access',
           'Server-side [Mutable] attribute for declaring intent',
           'Security boundary validation',
           'Full TypeScript type safety'
       ]
   };
   ```

4. **`src/minimact-mvc-bridge/package.json`**
   ```json
   {
     "name": "@minimact/mvc-bridge",
     "version": "0.1.0",
     "description": "MVC ViewModel integration for Minimact",
     "type": "module",
     "main": "dist/mvc-bridge.js",
     "module": "dist/mvc-bridge.esm.js",
     "types": "dist/index.d.ts",
     "files": ["dist"],
     "scripts": {
       "clean": "rimraf dist",
       "build": "npm run clean && rollup -c",
       "dev": "rollup -c -w"
     },
     "peerDependencies": {
       "@minimact/core": "^0.1.0"
     },
     "devDependencies": {
       "@minimact/core": "file:../client-runtime",
       "@rollup/plugin-node-resolve": "^15.2.3",
       "@rollup/plugin-typescript": "^11.1.5",
       "rimraf": "^6.0.1",
       "rollup": "^4.9.1",
       "tslib": "^2.6.2",
       "typescript": "^5.3.3"
     }
   }
   ```

5. **`src/minimact-mvc-bridge/tsconfig.json`**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "lib": ["ES2020", "DOM"],
       "declaration": true,
       "declarationMap": true,
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "moduleResolution": "node"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

6. **`src/minimact-mvc-bridge/rollup.config.js`**
   ```javascript
   import typescript from '@rollup/plugin-typescript';
   import resolve from '@rollup/plugin-node-resolve';

   export default {
     input: 'src/index.ts',
     output: [
       {
         file: 'dist/mvc-bridge.js',
         format: 'cjs',
         sourcemap: true
       },
       {
         file: 'dist/mvc-bridge.esm.js',
         format: 'es',
         sourcemap: true
       }
     ],
     external: ['@minimact/core'],
     plugins: [
       resolve(),
       typescript({
         tsconfig: './tsconfig.json',
         declaration: true,
         declarationDir: 'dist'
       })
     ]
   };
   ```

**Success Criteria:**
- ✅ `useMvcState` hook works
- ✅ Immutable properties return `[value]` only
- ✅ Mutable properties return `[value, setter]`
- ✅ TypeScript enforces type safety
- ✅ Package builds successfully

---

### **Phase 3: Babel Plugin Integration (Week 2)**

#### Files to Modify:

1. **`src/babel-plugin-minimact/src/extractors/hooks.cjs`**
   ```javascript
   // Add useMvcState detection
   function detectHook(path) {
       const callee = path.node.callee;

       if (t.isIdentifier(callee)) {
           const name = callee.name;

           if (name === 'useState') return 'useState';
           if (name === 'useEffect') return 'useEffect';
           if (name === 'useRef') return 'useRef';
           if (name === 'useContext') return 'useContext';
           if (name === 'useDomElementState') return 'useDomElementState';
           if (name === 'useStateX') return 'useStateX';
           if (name === 'useMvcState') return 'useMvcState'; // ✅ NEW
       }

       return null;
   }
   ```

2. **`src/babel-plugin-minimact/src/extractors/useMvcState.cjs`**
   ```javascript
   const t = require('@babel/types');

   /**
    * Extract useMvcState hook calls
    *
    * const [count, setCount] = useMvcState('initialCount');
    * const [isAdmin] = useMvcState('isAdminRole');
    */
   function extractUseMvcState(path, state) {
       const callExpr = path.node;

       // Get property name argument
       const propertyNameArg = callExpr.arguments[0];

       if (!t.isStringLiteral(propertyNameArg)) {
           throw path.buildCodeFrameError(
               'useMvcState requires a string literal as first argument (property name)'
           );
       }

       const propertyName = propertyNameArg.value;

       // Get variable declaration
       const declarator = path.parentPath.parent;
       if (!t.isVariableDeclarator(declarator)) {
           throw path.buildCodeFrameError(
               'useMvcState must be used with destructuring assignment'
           );
       }

       // Extract destructured names
       const id = declarator.id;
       let valueName = null;
       let setterName = null;

       if (t.isArrayPattern(id)) {
           if (id.elements.length >= 1) {
               valueName = id.elements[0]?.name;
           }
           if (id.elements.length >= 2) {
               setterName = id.elements[1]?.name;
           }
       }

       // Add to component metadata
       if (!state.componentMetadata.mvcStates) {
           state.componentMetadata.mvcStates = [];
       }

       state.componentMetadata.mvcStates.push({
           propertyName,
           valueName,
           setterName,
           hasSetter: setterName != null
       });

       return {
           propertyName,
           valueName,
           setterName
       };
   }

   module.exports = { extractUseMvcState };
   ```

3. **`src/babel-plugin-minimact/src/generators/component.cjs`**
   ```javascript
   function generateComponent(componentName, metadata) {
       const {
           states,
           mvcStates, // ✅ NEW
           effects,
           refs,
           eventHandlers,
           // ...
       } = metadata;

       let code = `namespace Minimact.Components;\n\n`;
       code += `[Component]\n`;

       // ... existing attribute generation ...

       code += `public partial class ${componentName} : MinimactComponent\n{\n`;

       // ✅ NEW: MVC ViewModel field
       if (mvcStates && mvcStates.length > 0) {
           code += `    private readonly object _mvcViewModel;\n\n`;
           code += `    public ${componentName}(object mvcViewModel)\n`;
           code += `    {\n`;
           code += `        _mvcViewModel = mvcViewModel;\n`;
           code += `    }\n\n`;
       }

       // ✅ NEW: MVC state fields (initialized from ViewModel)
       if (mvcStates && mvcStates.length > 0) {
           code += `    // MVC ViewModel state\n`;
           mvcStates.forEach(mvc => {
               code += `    [State]\n`;
               code += `    private object ${toPascalCase(mvc.valueName)};\n`;
           });
           code += `\n`;
       }

       // Regular state fields
       if (states.length > 0) {
           code += `    // Component state\n`;
           states.forEach(state => {
               code += `    [State]\n`;
               code += `    private ${getCSharpType(state.initialValue)} ${toPascalCase(state.name)} = ${getCSharpValue(state.initialValue)};\n`;
           });
           code += `\n`;
       }

       // ✅ NEW: OnInitialize to load MVC state
       if (mvcStates && mvcStates.length > 0) {
           code += `    protected override void OnInitialize()\n`;
           code += `    {\n`;
           code += `        // Load MVC ViewModel properties\n`;
           code += `        var viewModelType = _mvcViewModel.GetType();\n`;
           mvcStates.forEach(mvc => {
               code += `        var ${mvc.valueName}Prop = viewModelType.GetProperty("${toPascalCase(mvc.propertyName)}");\n`;
               code += `        if (${mvc.valueName}Prop != null)\n`;
               code += `        {\n`;
               code += `            ${toPascalCase(mvc.valueName)} = ${mvc.valueName}Prop.GetValue(_mvcViewModel);\n`;
               code += `        }\n`;
           });
           code += `    }\n\n`;
       }

       // ... rest of component generation ...

       return code;
   }
   ```

**Success Criteria:**
- ✅ Babel detects `useMvcState` calls
- ✅ Generates C# component with ViewModel constructor
- ✅ Initializes MVC state from ViewModel properties
- ✅ Component compiles successfully

---

### **Phase 4: Documentation & Examples (Week 2)**

#### Files to Create:

1. **`src/minimact-mvc-bridge/README.md`**
   - Overview and motivation
   - Installation instructions
   - Quick start guide
   - API reference (`useMvcState`, `useMvcViewModel`, `[Mutable]`)
   - Security best practices
   - TypeScript type safety examples
   - Migration guide (traditional MVC → MVC Bridge)

2. **`docs/MVC_BRIDGE_GUIDE.md`**
   - Comprehensive tutorial
   - Architecture diagrams
   - Complete example application
   - Security considerations
   - Performance implications
   - Common patterns and anti-patterns

3. **`samples/MvcBridgeSampleApp/`**
   - Complete sample application
   - Multiple examples:
     - Product catalog (list + details)
     - User profile (read-only + editable sections)
     - Shopping cart (mutable count, immutable pricing)
     - Admin dashboard (role-based rendering)
   - Database integration (Entity Framework)
   - Authentication/authorization examples

**Success Criteria:**
- ✅ Comprehensive documentation
- ✅ Working sample application
- ✅ Clear migration path from MVC

---

### **Phase 5: Testing & Validation (Week 3)**

#### Test Coverage:

1. **Unit Tests - C#**
   ```csharp
   [TestClass]
   public class MvcBridgeTests
   {
       [TestMethod]
       public void MutableAttribute_DetectedCorrectly()
       {
           var viewModel = new TestViewModel();
           var mutability = MinimactPageRenderer.ExtractMutability(viewModel);

           Assert.IsTrue(mutability["initialCount"]);
           Assert.IsFalse(mutability["isAdminRole"]);
       }

       [TestMethod]
       public void ImmutableState_RejectsClientUpdate()
       {
           var component = new TestComponent(new TestViewModel());
           component.SetMvcViewModel(viewModel, mutability);

           Assert.IsFalse(component.IsMvcStateMutable("mvc_isAdminRole_0"));
       }
   }
   ```

2. **Unit Tests - TypeScript**
   ```typescript
   describe('useMvcState', () => {
       it('should return setter for mutable properties', () => {
           const result = useMvcState<number>('initialCount');
           expect(result).toHaveLength(2); // [value, setter]
       });

       it('should NOT return setter for immutable properties', () => {
           const result = useMvcState<boolean>('isAdminRole');
           expect(result).toHaveLength(1); // [value] only
       });
   });
   ```

3. **Integration Tests**
   - Controller → ViewModel → Component flow
   - Client mutation → SignalR → Server validation
   - Security boundary enforcement
   - Template patch integration

4. **Security Tests**
   - Attempt to mutate immutable state (should fail)
   - Verify server-side validation
   - Test with malicious payloads
   - Role-based access control

**Success Criteria:**
- ✅ 90%+ test coverage
- ✅ All security tests pass
- ✅ Integration tests validate end-to-end flow

---

## Usage Examples

### Example 1: Product Details Page

**Controller:**
```csharp
public class ProductsController : Controller
{
    private readonly IProductService _productService;
    private readonly MinimactPageRenderer _renderer;

    public async Task<IActionResult> Details(int id)
    {
        var product = await _productService.GetByIdAsync(id);

        var viewModel = new ProductDetailsViewModel
        {
            // ❌ Immutable - server authority
            ProductName = product.Name,
            FactoryPrice = product.FactoryPrice,
            IsAdminRole = User.IsInRole("Admin"),
            AllowedActions = GetUserActions(),

            // ✅ Mutable - client can modify
            InitialQuantity = 1,
            InitialSelectedColor = "Black",
            InitialIsExpanded = false
        };

        return await _renderer.RenderPage<ProductDetailsPage>(
            viewModel,
            $"{product.Name} - Product Details"
        );
    }
}
```

**ViewModel:**
```csharp
public class ProductDetailsViewModel
{
    // Server-authoritative (security, pricing)
    public string ProductName { get; set; }
    public decimal FactoryPrice { get; set; }
    public bool IsAdminRole { get; set; }
    public List<string> AllowedActions { get; set; }

    // Client-mutable (UI state)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; }

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
```

**TSX Component:**
```tsx
import { useMvcState, useMvcViewModel } from '@minimact/mvc-bridge';
import { useState } from 'minimact';

interface ProductDetailsViewModel {
    productName: string;
    factoryPrice: number;
    isAdminRole: boolean;
    allowedActions: string[];
    initialQuantity: number;
    initialSelectedColor: string;
    initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
    // ❌ Immutable - read-only from server
    const [productName] = useMvcState<string>('productName');
    const [factoryPrice] = useMvcState<number>('factoryPrice');
    const [isAdmin] = useMvcState<boolean>('isAdminRole');

    // ✅ Mutable - client can modify
    const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
    const [color, setColor] = useMvcState<string>('initialSelectedColor');
    const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');

    // Access entire ViewModel
    const viewModel = useMvcViewModel<ProductDetailsViewModel>();

    // Mix with regular Minimact state
    const [cartTotal, setCartTotal] = useState(0);

    const handleAddToCart = () => {
        const total = factoryPrice * quantity;
        setCartTotal(total);
        // ... SignalR call to add to cart
    };

    return (
        <div className="product-details">
            <h1>{productName}</h1>

            {/* ❌ Cannot mutate server-authoritative price */}
            <div className="price">${factoryPrice.toFixed(2)}</div>

            {/* ✅ Can mutate client-controlled quantity */}
            <div className="quantity">
                <button onClick={() => setQuantity(quantity - 1)}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>

            {/* ✅ Can mutate color selection */}
            <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Red">Red</option>
            </select>

            {/* Conditional rendering based on server role */}
            {isAdmin && (
                <div className="admin-controls">
                    <h3>Admin Controls</h3>
                    <button>Edit Product</button>
                    <button>Delete Product</button>
                </div>
            )}

            {/* Expandable section with mutable state */}
            <button onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Hide' : 'Show'} Details
            </button>

            {isExpanded && (
                <div className="expanded-details">
                    {/* ... */}
                </div>
            )}

            <button onClick={handleAddToCart}>
                Add to Cart - ${cartTotal.toFixed(2)}
            </button>
        </div>
    );
}
```

---

### Example 2: User Profile (Mixed Mutability)

**ViewModel:**
```csharp
public class UserProfileViewModel
{
    // Immutable - identity/security
    public string Email { get; set; }
    public string UserId { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime MemberSince { get; set; }
    public List<string> Roles { get; set; }

    // Mutable - editable profile fields
    [Mutable]
    public string InitialDisplayName { get; set; }

    [Mutable]
    public string InitialBio { get; set; }

    [Mutable]
    public string InitialAvatarUrl { get; set; }

    [Mutable]
    public bool InitialIsPublic { get; set; }
}
```

**TSX:**
```tsx
export function UserProfilePage() {
    // Read-only identity
    const [email] = useMvcState<string>('email');
    const [memberSince] = useMvcState<string>('memberSince');

    // Editable profile
    const [displayName, setDisplayName] = useMvcState<string>('initialDisplayName');
    const [bio, setBio] = useMvcState<string>('initialBio');
    const [isPublic, setIsPublic] = useMvcState<boolean>('initialIsPublic');

    const [isEditing, setIsEditing] = useState(false);

    return (
        <div>
            {/* ❌ Cannot change email (security) */}
            <div className="email-readonly">{email}</div>

            {/* ✅ Can edit display name */}
            {isEditing ? (
                <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            ) : (
                <h1>{displayName}</h1>
            )}

            {/* ✅ Can edit bio */}
            <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing}
            />

            {/* ✅ Toggle privacy */}
            <label>
                <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                />
                Make profile public
            </label>
        </div>
    );
}
```

---

## Security Model

### Threat Model

**What we're protecting against:**
1. **Client modifying server-authoritative data**
   - Example: User changes `isAdminRole` from `false` to `true`
   - Mitigation: Server validates mutability, rejects update

2. **Privilege escalation via state manipulation**
   - Example: User modifies `factoryPrice` to reduce cost
   - Mitigation: Pricing is immutable, only server can change

3. **Identity spoofing**
   - Example: User changes `userId` or `email`
   - Mitigation: Identity fields are immutable

### Security Boundaries

```
┌─────────────────────────────────────────────────────────┐
│              CLIENT (Untrusted)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Can mutate: UI state, form inputs, preferences     │
│  ❌ Cannot mutate: Identity, roles, pricing, business  │
│                    logic outputs                        │
│                                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ (SignalR: UpdateComponentState)
┌─────────────────────────────────────────────────────────┐
│              SERVER (Trusted)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Validate: Is this property [Mutable]?              │
│  2. If NO → Reject update + Log security event         │
│  3. If YES → Apply update + Re-render                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Best Practices

1. **Always mark security-sensitive data as immutable**
   ```csharp
   // ❌ NEVER MUTABLE
   public bool IsAdminRole { get; set; }
   public decimal Price { get; set; }
   public string UserId { get; set; }
   ```

2. **Use [Mutable] sparingly**
   - Only for true UI state (expanded/collapsed, selected tab)
   - Form inputs before submission
   - User preferences (theme, language)

3. **Validate on server anyway**
   ```csharp
   [EventHandler]
   public void HandleSaveProfile()
   {
       // ✅ Always re-validate, even for mutable fields
       if (string.IsNullOrWhiteSpace(DisplayName))
       {
           throw new ValidationException("Display name required");
       }

       // ✅ Re-check authorization
       if (!_authService.CanEditProfile(UserId))
       {
           throw new UnauthorizedException();
       }

       // Save to database
       _db.SaveChanges();
   }
   ```

4. **Log security events**
   ```csharp
   if (!component.IsMvcStateMutable(stateKey))
   {
       _securityLogger.LogWarning(
           "Client {ConnectionId} attempted to modify immutable state {StateKey}",
           Context.ConnectionId,
           stateKey
       );
   }
   ```

---

## Performance Considerations

### Initial Load
- ViewModel serialized once (server-side)
- Embedded in HTML (no extra HTTP request)
- Mutability metadata is tiny (~50 bytes per property)

### State Updates
- Mutable state updates follow normal Minimact flow:
  1. Client applies cached patch (if available)
  2. SignalR sends update to server
  3. Server validates mutability (< 1ms)
  4. Server re-renders with new state
  5. Patches sent back to client

### Memory
- ViewModel stored in `window.__MINIMACT_VIEWMODEL__`
- Mutability map stored in `window.__MINIMACT_VIEWMODEL__._mutability`
- Total overhead: ~1-2KB for typical ViewModel

### Optimization Tips
1. **Keep ViewModels lean** - Only include what you need
2. **Use projection** - Don't send entire entities
3. **Cache common ViewModels** - Use distributed cache for expensive queries

---

## Migration Path

### From Traditional MVC

**Before (Traditional MVC):**
```csharp
// Controller
public IActionResult Details(int id)
{
    var viewModel = new ProductViewModel { ... };
    return View(viewModel); // ❌ Razor view
}

// View (Razor)
@model ProductViewModel

<h1>@Model.ProductName</h1>
<p>@Model.Price</p>
```

**After (MVC Bridge):**
```csharp
// Controller (same!)
public async Task<IActionResult> Details(int id)
{
    var viewModel = new ProductViewModel { ... };
    return await _renderer.RenderPage<ProductDetailsPage>(viewModel); // ✅ Minimact
}

// Component (TSX)
export function ProductDetailsPage() {
    const [productName] = useMvcState<string>('productName');
    const [price] = useMvcState<number>('price');

    return (
        <div>
            <h1>{productName}</h1>
            <p>${price}</p>
        </div>
    );
}
```

### Incremental Migration Strategy

**Phase 1:** Keep existing MVC controllers
- ✅ Controllers unchanged
- ✅ ViewModels unchanged
- ✅ Replace Razor views with Minimact components

**Phase 2:** Add interactivity
- ✅ Mark mutable fields with `[Mutable]`
- ✅ Add client-side state management
- ✅ Enable real-time updates

**Phase 3:** Optimize
- ✅ Use Template Patch System
- ✅ Add predictive rendering
- ✅ Implement advanced features

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Core C# + Client Hooks | `[Mutable]` attribute, MinimactPageRenderer, useMvcState hook, package builds |
| 2 | Babel Integration + Docs | Babel plugin support, README, comprehensive docs, sample app |
| 3 | Testing + Polish | Unit tests, integration tests, security validation, performance benchmarks |

**Total:** 3 weeks to production-ready

---

## Success Metrics

### Technical
- ✅ 90%+ test coverage
- ✅ < 1ms mutability validation overhead
- ✅ 100% TypeScript type safety
- ✅ Zero security vulnerabilities

### Developer Experience
- ✅ Familiar MVC patterns (no learning curve for ViewModels)
- ✅ Clear mental model (immutable = server, mutable = client)
- ✅ TypeScript autocomplete for ViewModel properties
- ✅ Compile-time errors for type mismatches

### Ecosystem
- ✅ Works with existing MVC codebases
- ✅ Incremental migration path
- ✅ Compatible with Entity Framework, Identity, etc.
- ✅ Example projects and tutorials

---

## Risk Mitigation

### Potential Issues

1. **Security: Client bypasses mutability check**
   - **Mitigation:** Server always validates before applying state
   - **Test:** Attempt to modify immutable state from browser console

2. **Performance: Large ViewModels**
   - **Mitigation:** Use projection, only send needed data
   - **Test:** Benchmark with 1000+ property ViewModel

3. **Type Safety: ViewModel ↔ TypeScript mismatch**
   - **Mitigation:** Generate TypeScript interfaces from C# (future enhancement)
   - **Test:** Automated type checking in CI/CD

4. **Complexity: Developers confused about mutability**
   - **Mitigation:** Clear documentation, linting rules
   - **Test:** User studies with developers

---

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Auto-generate TypeScript interfaces from C# ViewModels**
   ```csharp
   // C# ViewModel
   public class UserViewModel { ... }

   // Auto-generated TypeScript
   interface UserViewModel { ... }
   ```

2. **ViewModel versioning**
   ```csharp
   [ViewModelVersion("2.0")]
   public class UserViewModel { ... }
   ```

3. **Nested ViewModels**
   ```csharp
   public class OrderViewModel
   {
       public CustomerViewModel Customer { get; set; }
       public List<OrderItemViewModel> Items { get; set; }
   }
   ```

4. **Smart defaults**
   ```csharp
   // Auto-detect mutable based on naming convention
   public int InitialCount { get; set; } // Auto-mutable
   public bool IsAdmin { get; set; }     // Auto-immutable
   ```

---

## Conclusion

The **MVC Bridge** brings together the best of both worlds:

- **Familiar MVC patterns** for backend developers
- **Modern reactive UI** for frontend developers
- **Clear security boundaries** via mutability controls
- **Gradual migration path** from traditional MVC

By allowing MVC Controllers to pass ViewModels to Minimact components with intelligent mutability enforcement, we create a **powerful, secure, and developer-friendly** integration layer that respects both paradigms.

This is the bridge that makes Minimact accessible to the millions of developers already using ASP.NET MVC.
