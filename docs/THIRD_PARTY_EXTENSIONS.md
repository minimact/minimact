# Building Third-Party Extensions for Minimact

## Introduction

Minimact is designed to be extensible. Just like **minimact-punch** 🌵 + 🍹 adds DOM observation capabilities, you can create your own extensions that integrate seamlessly with the Minimact ecosystem.

This guide shows you how to build, package, and distribute Minimact extensions as an indie developer.

---

## Philosophy

### Core Principles

1. **Optional** - Extensions should be opt-in, not required
2. **Composable** - Multiple extensions should work together
3. **Type-Safe** - Full TypeScript and C# type definitions
4. **Lazy-Loadable** - Don't bloat the main bundle
5. **Well-Documented** - Clear examples and API docs

### What Makes a Good Extension?

✅ Solves a specific problem (forms, routing, gestures, etc.)
✅ Works standalone (can be tested independently)
✅ Minimal dependencies (keep bundle size small)
✅ Clear API (follows React/Minimact conventions)
✅ Server-side integration (if needed for SSR)

---

## Extension Architecture

### The Three Layers

```
┌─────────────────────────────────────────────┐
│   Your Extension (e.g., minimact-forms)     │
│   • Client-side hooks/components           │
│   • Browser APIs integration               │
│   • State management                       │
└─────────────────┬───────────────────────────┘
                  │ integrates with
┌─────────────────▼───────────────────────────┐
│   Minimact Client Runtime                   │
│   • Component context                       │
│   • Hook system                            │
│   • SignalR manager                        │
└─────────────────┬───────────────────────────┘
                  │ communicates with
┌─────────────────▼───────────────────────────┐
│   Minimact.AspNetCore (optional)            │
│   • Server-side hooks (if needed)          │
│   • SignalR hub methods                    │
│   • Component base class extensions        │
└─────────────────────────────────────────────┘
```

---

## Core Integration Patterns

Before building your extension, understand these **critical patterns** that make Minimact extensions elegant.

### Pattern 1: Component Context Integration

Minimact hooks operate within a **component context**. Your hooks must follow this pattern:

```typescript
import type { ComponentContext } from 'minimact/types';

// Global tracking (like useState, useEffect)
let currentContext: ComponentContext | null = null;
let yourHookIndex = 0;

export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  yourHookIndex = 0; // Reset on each render
}

export function useYourHook() {
  // Guard: Must be called within component
  if (!currentContext) {
    throw new Error('useYourHook must be called within a component render');
  }

  const context = currentContext;
  const index = yourHookIndex++;
  const stateKey = `yourHook_${index}`;

  // Your logic here...
}
```

**Why this matters:** This ensures hooks are called in the same order every render, matching React's Rules of Hooks.

### Pattern 2: HintQueue Integration (Predictive Rendering)

To integrate with Minimact's predictive system:

```typescript
import { HintQueue, DOMPatcher, PlaygroundBridge } from 'minimact';

export function useYourHook() {
  const context = currentContext;

  // When state changes...
  const handleChange = (newValue: any) => {
    const startTime = performance.now();

    // 1. Build state change object
    const stateChanges: Record<string, any> = {
      [stateKey]: newValue  // Primitives
      // OR for objects:
      // [stateKey]: {
      //   property1: value1,
      //   property2: value2
      // }
    };

    // 2. Check hint queue for pre-computed patches
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      // 🟢 CACHE HIT - Apply pre-computed patches
      const latency = performance.now() - startTime;
      console.log(`[YourExtension] 🟢 CACHE HIT! Hint '${hint.hintId}' matched`);

      // Apply patches to DOM
      context.domPatcher.applyPatches(context.element, hint.patches);

      // Notify playground for visualization
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
      // 🔴 CACHE MISS - No prediction available
      const latency = performance.now() - startTime;
      console.log(`[YourExtension] 🔴 CACHE MISS`);

      if (context.playgroundBridge) {
        context.playgroundBridge.cacheMiss({
          componentId: context.componentId,
          methodName: `yourHook(${stateKey})`,
          latency,
          patchCount: 0
        });
      }

      // Fallback: trigger server render or local update
    }
  };
}
```

**Why this matters:** This is what makes Minimact fast - pre-computed patches applied instantly.

### Pattern 3: Observer Integration (DOM Extensions)

For extensions that observe DOM/browser events:

```typescript
export class YourObserverClass {
  private observer?: MutationObserver;
  onChange?: () => void;

  constructor() {
    this.setupObserver();
  }

  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      // Update internal state
      this.updateState();

      // Notify change (triggers HintQueue check)
      if (this.onChange) {
        this.onChange();
      }
    });

    if (this.element) {
      this.observer.observe(this.element, {
        childList: true,
        attributes: true,
        subtree: true
      });
    }
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}
```

**Why this matters:** Proper cleanup prevents memory leaks; change callbacks integrate with predictions.

### Pattern 4: Cleanup Pattern

Always provide cleanup for resources:

```typescript
/**
 * Cleanup all instances of your hook for a component
 * Called when component unmounts
 */
export function cleanupYourHook(context: ComponentContext): void {
  if (!context.yourHookStates) return;

  for (const resource of context.yourHookStates.values()) {
    resource.destroy(); // Disconnect observers, clear timers, etc.
  }
  context.yourHookStates.clear();
}
```

**Why this matters:** Prevents memory leaks, especially with observers and event listeners.

### Pattern 5: State Storage in Context

Extend the component context to store your hook's state:

```typescript
// In your extension's types
declare module 'minimact/types' {
  interface ComponentContext {
    yourHookStates?: Map<string, YourStateClass>;
  }
}

// In your hook
export function useYourHook() {
  const context = currentContext;

  // Initialize storage if first hook call
  if (!context.yourHookStates) {
    context.yourHookStates = new Map();
  }

  const stateKey = `yourHook_${index}`;

  // Get or create state
  if (!context.yourHookStates.has(stateKey)) {
    const state = new YourStateClass();

    // Set up change callback for predictions
    state.onChange = () => {
      // Check hint queue, apply patches...
    };

    context.yourHookStates.set(stateKey, state);
  }

  return context.yourHookStates.get(stateKey)!;
}
```

**Why this matters:** Follows Minimact's pattern; allows multiple instances per component.

### Pattern 6: Symmetry with Built-in Hooks

Model your API after `useState`, `useEffect`, `useRef`:

| Pattern | useState | useEffect | Your Hook |
|---------|----------|-----------|-----------|
| **Index tracking** | `stateIndex++` | `effectIndex++` | `yourHookIndex++` |
| **Context storage** | `context.state` | `context.effects` | `context.yourHookStates` |
| **Key format** | `state_${index}` | N/A | `yourHook_${index}` |
| **Cleanup** | None | `cleanup()` | `destroy()` |
| **Guards** | "within component" | "within component" | "within component" |

**Example - Matching useState structure:**

```typescript
// useState pattern
export function useState<T>(initialValue: T): [T, (newValue: T) => void] {
  if (!currentContext) throw new Error('...');
  const index = stateIndex++;
  const key = `state_${index}`;
  // ... rest of logic
  return [value, setValue];
}

// Your hook pattern (mimic this!)
export function useYourHook<T>(initialValue: T): YourReturnType<T> {
  if (!currentContext) throw new Error('...');
  const index = yourHookIndex++;
  const key = `yourHook_${index}`;
  // ... same structure, different logic
  return yourApi;
}
```

**Why this matters:** Consistency = developer delight. Familiar patterns = easier adoption.

---

## Real-World Example: minimact-punch

Before diving into the step-by-step guide, study **minimact-punch** as the reference implementation:

```typescript
// src/minimact-punch/src/use-dom-element-state.ts
export function useDomElementState(selector?: string): DomElementState {
  // 1. Guard check
  if (!currentContext) {
    throw new Error('useDomElementState must be called within a component render');
  }

  // 2. Index tracking
  const context = currentContext;
  const index = domElementStateIndex++;
  const stateKey = `domElementState_${index}`;

  // 3. Initialize if not exists
  if (!context.domElementStates.has(stateKey)) {
    const domState = new DomElementState(selector, { /* options */ });

    // 4. Set up change callback (HintQueue integration)
    domState.onChange = () => {
      const stateChanges = { [stateKey]: { /* DOM state */ } };
      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        // 🟢 Cache hit - apply patches
        context.domPatcher.applyPatches(context.element, hint.patches);
      }
    };

    context.domElementStates.set(stateKey, domState);
  }

  // 5. Return state
  return context.domElementStates.get(stateKey)!;
}
```

**This is the gold standard.** Your extension should follow this exact pattern.

---

## Step-by-Step Guide

### Step 1: Set Up Package Structure

```bash
mkdir minimact-[your-extension]
cd minimact-[your-extension]
npm init -y
```

**Recommended structure:**
```
minimact-forms/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── use-form.ts           # Hook implementation
│   └── form-validator.ts     # Core logic
├── examples/
│   └── demo.html             # Standalone demo
├── dist/                     # Build output (gitignored)
├── package.json
├── tsconfig.json
├── rollup.config.js
├── README.md
└── LICENSE
```

### Step 2: Configure package.json

```json
{
  "name": "minimact-forms",
  "version": "0.1.0",
  "description": "Form validation and state management for Minimact",
  "main": "dist/minimact-forms.js",
  "module": "dist/minimact-forms.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "vitest"
  },
  "keywords": [
    "minimact",
    "forms",
    "validation",
    "react",
    "ssr"
  ],
  "peerDependencies": {
    "minimact": "^0.1.0"
  },
  "devDependencies": {
    "@rollup/plugin-node-resolve": "^15.2.3",
    "@rollup/plugin-typescript": "^11.1.5",
    "rollup": "^4.9.1",
    "typescript": "^5.3.3"
  },
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/minimact-forms"
  }
}
```

**Key points:**
- Use `peerDependencies` for minimact (don't bundle it)
- Export both CommonJS and ESM builds
- Include TypeScript declarations
- Use semantic versioning

### Step 3: TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "examples"]
}
```

### Step 4: Build Configuration

**rollup.config.js:**
```javascript
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/minimact-forms.js',
      format: 'umd',
      name: 'MinimactForms',
      globals: {
        'minimact': 'Minimact'
      }
    },
    {
      file: 'dist/minimact-forms.esm.js',
      format: 'es'
    }
  ],
  external: ['minimact'], // Don't bundle Minimact
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist'
    })
  ]
};
```

### Step 5: Create Type Definitions

**src/types.ts:**
```typescript
/**
 * Public API types for your extension
 */

export interface FormOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSubmit?: boolean;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormHelpers<T> {
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

export type ValidationSchema<T> = {
  [K in keyof T]?: (value: T[K]) => string | null;
};
```

### Step 6: Implement Core Logic

**src/form-validator.ts:**
```typescript
import { FormState, ValidationSchema } from './types';

export class FormValidator<T> {
  private schema: ValidationSchema<T>;

  constructor(schema: ValidationSchema<T>) {
    this.schema = schema;
  }

  validate(values: T): Partial<Record<keyof T, string>> {
    const errors: Partial<Record<keyof T, string>> = {};

    for (const field in this.schema) {
      const validator = this.schema[field];
      if (validator) {
        const error = validator(values[field]);
        if (error) {
          errors[field] = error;
        }
      }
    }

    return errors;
  }

  validateField(field: keyof T, value: any): string | null {
    const validator = this.schema[field];
    return validator ? validator(value) : null;
  }

  isValid(state: FormState<T>): boolean {
    return Object.keys(state.errors).length === 0;
  }
}
```

### Step 7: Create Hook API

**src/use-form.ts:**
```typescript
import { FormOptions, FormState, FormHelpers, ValidationSchema } from './types';
import { FormValidator } from './form-validator';

/**
 * Form state management hook for Minimact.
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validationSchema: {
 *     email: (v) => !v.includes('@') ? 'Invalid email' : null,
 *     password: (v) => v.length < 8 ? 'Too short' : null
 *   },
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   }
 * });
 *
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input {...form.getFieldProps('email')} />
 *     {form.errors.email && <span>{form.errors.email}</span>}
 *   </form>
 * );
 * ```
 */
export function useForm<T extends Record<string, any>>(options: {
  initialValues: T;
  validationSchema?: ValidationSchema<T>;
  onSubmit: (values: T) => Promise<void> | void;
  options?: FormOptions;
}): FormState<T> & FormHelpers<T> & {
  getFieldProps: (field: keyof T) => any;
  handleSubmit: (e: Event) => void;
} {
  // Implementation would integrate with Minimact's useState hook
  // For standalone use, implement with vanilla JS:

  const validator = options.validationSchema
    ? new FormValidator(options.validationSchema)
    : null;

  const state: FormState<T> = {
    values: { ...options.initialValues },
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true
  };

  const setFieldValue = (field: keyof T, value: any) => {
    state.values[field] = value;

    if (validator && options.options?.validateOnChange) {
      const error = validator.validateField(field, value);
      if (error) {
        state.errors[field] = error;
      } else {
        delete state.errors[field];
      }
    }

    state.isValid = validator ? validator.isValid(state) : true;
  };

  const setFieldError = (field: keyof T, error: string) => {
    state.errors[field] = error;
    state.isValid = false;
  };

  const setFieldTouched = (field: keyof T, touched: boolean) => {
    state.touched[field] = touched;
  };

  const resetForm = () => {
    state.values = { ...options.initialValues };
    state.errors = {};
    state.touched = {};
    state.isSubmitting = false;
    state.isValid = true;
  };

  const submitForm = async () => {
    state.isSubmitting = true;

    if (validator) {
      state.errors = validator.validate(state.values);
      state.isValid = validator.isValid(state);
    }

    if (state.isValid) {
      try {
        await options.onSubmit(state.values);
        if (options.options?.resetOnSubmit) {
          resetForm();
        }
      } catch (error) {
        console.error('[minimact-forms] Submit failed:', error);
      }
    }

    state.isSubmitting = false;
  };

  const getFieldProps = (field: keyof T) => ({
    name: String(field),
    value: state.values[field],
    onChange: (e: Event) => {
      const target = e.target as HTMLInputElement;
      setFieldValue(field, target.value);
    },
    onBlur: () => {
      setFieldTouched(field, true);
      if (validator && options.options?.validateOnBlur) {
        const error = validator.validateField(field, state.values[field]);
        if (error) {
          setFieldError(field, error);
        }
      }
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    submitForm();
  };

  return {
    ...state,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    submitForm,
    getFieldProps,
    handleSubmit
  };
}
```

### Step 8: Main Entry Point

**src/index.ts:**
```typescript
/**
 * minimact-forms
 *
 * Form validation and state management for Minimact.
 *
 * @packageDocumentation
 */

export { useForm } from './use-form';
export { FormValidator } from './form-validator';
export type {
  FormOptions,
  FormState,
  FormHelpers,
  ValidationSchema
} from './types';

// Version export for debugging
export const VERSION = '0.1.0';
```

### Step 9: Create Standalone Example

**examples/demo.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>minimact-forms Demo</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 40px auto; }
    input { padding: 8px; margin: 8px 0; width: 100%; }
    .error { color: red; font-size: 14px; }
    button { padding: 10px 20px; background: #007bff; color: white; border: none; }
  </style>
</head>
<body>
  <h1>minimact-forms Demo</h1>
  <form id="login-form">
    <div>
      <input id="email" placeholder="Email" />
      <div class="error" id="email-error"></div>
    </div>
    <div>
      <input id="password" type="password" placeholder="Password" />
      <div class="error" id="password-error"></div>
    </div>
    <button type="submit">Login</button>
  </form>

  <script src="../dist/minimact-forms.js"></script>
  <script>
    const { useForm } = MinimactForms;

    const form = useForm({
      initialValues: { email: '', password: '' },
      validationSchema: {
        email: (v) => !v.includes('@') ? 'Invalid email' : null,
        password: (v) => v.length < 8 ? 'Password too short' : null
      },
      onSubmit: async (values) => {
        console.log('Submitting:', values);
        alert('Login successful!');
      },
      options: { validateOnBlur: true }
    });

    // Wire up manually for demo
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formElement = document.getElementById('login-form');

    emailInput.addEventListener('blur', () => {
      const error = form.validationSchema.email(emailInput.value);
      document.getElementById('email-error').textContent = error || '';
    });

    passwordInput.addEventListener('blur', () => {
      const error = form.validationSchema.password(passwordInput.value);
      document.getElementById('password-error').textContent = error || '';
    });

    formElement.addEventListener('submit', form.handleSubmit);
  </script>
</body>
</html>
```

### Step 10: Write Documentation

**README.md:**
```markdown
# minimact-forms

Form validation and state management for Minimact.

## Installation

```bash
npm install minimact-forms
```

## Quick Start

```tsx
import { useForm } from 'minimact-forms';

export function LoginForm() {
  const form = useForm({
    initialValues: { email: '', password: '' },
    validationSchema: {
      email: (v) => !v.includes('@') ? 'Invalid email' : null,
      password: (v) => v.length < 8 ? 'Too short' : null
    },
    onSubmit: async (values) => {
      await api.login(values);
    }
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input {...form.getFieldProps('email')} />
      {form.errors.email && <span>{form.errors.email}</span>}

      <input {...form.getFieldProps('password')} type="password" />
      {form.errors.password && <span>{form.errors.password}</span>}

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## API Reference

### useForm(options)

#### Options
- `initialValues` - Initial form values
- `validationSchema` - Field validators
- `onSubmit` - Submit handler
- `options` - Form behavior options

#### Returns
- `values` - Current form values
- `errors` - Validation errors
- `touched` - Touched fields
- `isSubmitting` - Submit state
- `isValid` - Validation state
- `getFieldProps(field)` - Field props helper
- `handleSubmit(event)` - Submit handler

## Examples

See [examples/](./examples) for more demos.

## License

MIT
```

---

## Server-Side Integration (Optional)

If your extension needs server-side support:

### Understanding Server-Side Predictions

The magic of Minimact's predictive rendering happens server-side. Here's how to add predictions for your extension:

**Flow:**
```
1. Client: Hook initialized → Extension registers potential state changes
2. Server: Predicts future states → Renders HTML for each prediction → Rust diffs
3. Server: Sends predictions via SignalR → Client caches in HintQueue
4. Client: State changes → Checks HintQueue → 🟢 Cache hit → Apply patches
```

**Example - Predicting a form validation error:**

```csharp
// Server-side (C#)
public class PlaygroundService
{
  private List<PredictionInfo> GeneratePredictions(PlaygroundSession session)
  {
    var predictions = new List<PredictionInfo>();

    // Find form hooks in component
    foreach (var (stateKey, formHook) in component.FormHooks)
    {
      // Predict: email field will have validation error
      var predictedState = CloneComponentState(component);
      formHook.Errors["email"] = "Invalid email format";

      // Render with predicted state
      var predictedHtml = RenderComponentWithState(component);

      // Diff against current HTML
      var patches = _reconciler.ComputePatches(currentHtml, predictedHtml);

      predictions.Add(new PredictionInfo
      {
        StateKey = stateKey,
        PredictedValue = new { errors = new { email = "Invalid email format" } },
        Confidence = 0.9f,  // High confidence for form validation
        Patches = patches
      });
    }

    return predictions;
  }
}
```

**Then client receives and caches:**
```typescript
// Client automatically receives via SignalR:
signalR.on('queueHint', (data) => {
  hintQueue.queueHint({
    componentId: 'form-1',
    hintId: 'validation-error',
    patches: [...], // Pre-computed patches
    predictedState: { errors: { email: '...' } }
  });
});

// When form validates:
const hint = hintQueue.matchHint(componentId, {
  formHook_0: { errors: { email: 'Invalid email format' } }
});
// 🟢 CACHE HIT - Error message appears instantly!
```

### Step 1: Create C# Hook Class

**Minimact.Extensions.Forms/FormStateHook.cs:**
```csharp
namespace Minimact.Extensions.Forms;

public class FormStateHook<T> where T : class
{
    public T Values { get; set; }
    public Dictionary<string, string> Errors { get; set; } = new();
    public bool IsValid => Errors.Count == 0;
    public bool IsSubmitting { get; set; }

    public void SetFieldValue(string field, object value)
    {
        var prop = typeof(T).GetProperty(field);
        prop?.SetValue(Values, value);
    }

    public void SetFieldError(string field, string error)
    {
        Errors[field] = error;
    }
}
```

### Step 2: Add Extension Method

```csharp
public static class FormExtensions
{
    public static FormStateHook<T> UseForm<T>(
        this MinimactComponent component,
        T initialValues) where T : class
    {
        return new FormStateHook<T>
        {
            Values = initialValues
        };
    }
}
```

### Step 3: SignalR Integration

```csharp
// In MinimactHub
public async Task UpdateFormField(
    string componentId,
    string field,
    object value)
{
    var component = _registry.GetComponent(componentId);
    // Update server-side form state
    // Trigger validation if needed
}
```

---

## Advanced: Accessing Minimact Internals

For advanced extensions that need deeper integration:

### Importing Internal APIs

```typescript
// Public API (stable)
import { useState, useEffect, useRef } from 'minimact';

// Advanced API (use with caution - may change)
import type {
  ComponentContext,
  HintQueue,
  DOMPatcher,
  PlaygroundBridge
} from 'minimact/types';

// Very advanced (internal - stability not guaranteed)
import {
  setComponentContext,
  clearComponentContext
} from 'minimact/internal';
```

### Accessing Current Context

If you need to access the current component context outside a hook:

```typescript
import { getCurrentContext } from 'minimact/internal';

export class YourUtilityClass {
  private context = getCurrentContext();

  doSomething() {
    if (this.context) {
      this.context.domPatcher.applyPatches(...);
    }
  }
}
```

### Extending ComponentContext Types

Use TypeScript declaration merging:

```typescript
// your-extension.d.ts
import 'minimact/types';

declare module 'minimact/types' {
  interface ComponentContext {
    // Add your custom properties
    yourExtensionState?: Map<string, YourStateClass>;
    yourExtensionConfig?: YourConfigClass;
  }
}
```

### Listening to Minimact Events

```typescript
// Listen to SignalR events
window.addEventListener('minimact:connected', (e) => {
  console.log('Minimact connected to server');
});

window.addEventListener('minimact:cache-hit', (e: CustomEvent) => {
  console.log('Prediction hit:', e.detail);
});

window.addEventListener('minimact:cache-miss', (e: CustomEvent) => {
  console.log('Prediction miss:', e.detail);
});
```

### Performance Monitoring

```typescript
import { getPerformanceMetrics } from 'minimact/internal';

export function usePerformanceMonitor() {
  const metrics = getPerformanceMetrics();

  console.log('Cache hit rate:', metrics.cacheHitRate);
  console.log('Avg latency:', metrics.avgLatency);
  console.log('Predictions queued:', metrics.hintsQueued);
}
```

---

## Publishing Your Extension

### Step 1: Build for Release

```bash
npm run build
npm test  # if you have tests
```

### Step 2: Update Version

```bash
npm version patch  # or minor, or major
```

### Step 3: Publish to npm

```bash
npm publish
```

### Step 4: Create GitHub Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Step 5: Announce It!

- Post on GitHub Discussions
- Share on Twitter with #Minimact
- Add to Minimact extensions list

---

## Best Practices

### ✅ Do's

- **Keep it focused** - One extension, one purpose
- **Test standalone** - Works without Minimact first
- **Document thoroughly** - Examples, API docs, guides
- **Version carefully** - Follow semantic versioning
- **Support TypeScript** - Export `.d.ts` files
- **Minimize bundle** - Tree-shakeable exports
- **Handle errors** - Graceful degradation
- **Monitor performance** - Profile your code

### ❌ Don'ts

- **Don't bundle Minimact** - Use peerDependencies
- **Don't pollute globals** - Use proper modules
- **Don't break SSR** - Test server-side rendering
- **Don't forget browser support** - Check compatibility
- **Don't skip types** - TypeScript is essential
- **Don't ignore licenses** - Include MIT/Apache

---

## Example Extensions to Build

### 🎨 UI Extensions
- **minimact-animations** - Smooth transitions
- **minimact-gestures** - Touch/swipe detection
- **minimact-drag-drop** - Drag and drop
- **minimact-modals** - Modal dialogs

### 📊 Data Extensions
- **minimact-tables** - Advanced data tables
- **minimact-charts** - Chart components
- **minimact-infinite-scroll** - Infinite loading
- **minimact-virtualization** - Virtual lists

### 🔧 Utility Extensions
- **minimact-router** - Client-side routing
- **minimact-i18n** - Internationalization
- **minimact-analytics** - Event tracking
- **minimact-seo** - SEO optimization

### 🎯 Business Logic
- **minimact-auth** - Authentication helpers
- **minimact-payments** - Payment integrations
- **minimact-notifications** - Toast/alerts
- **minimact-real-time** - WebSocket helpers

---

## Getting Help

### Resources
- **Discord**: Join #extension-developers
- **GitHub Discussions**: Ask questions
- **Examples**: Study minimact-punch source
- **Docs**: Read full integration guide

### Contributing
Found an issue? Want to improve this guide?

Open a PR at: https://github.com/minimact/minimact

---

## License

This guide is MIT licensed. Your extensions can use any OSS license.

---

**Built something cool? We'd love to feature it! 🌵 + 🍹**

Share your extension in GitHub Discussions and we'll add it to the official extensions list.
