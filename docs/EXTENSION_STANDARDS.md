# Minimact Extension Standards (MES)

**Version:** 1.0.0
**Last Updated:** 2025-01-XX
**Status:** Official Standard

---

## Introduction

This document defines the **Minimact Extension Standards (MES)** - a comprehensive set of requirements for building high-quality, predictable, and performant extensions for the Minimact ecosystem.

### Purpose

Extensions that meet these standards:
- ✅ Work seamlessly with Minimact core
- ✅ Integrate with predictive rendering
- ✅ Perform efficiently
- ✅ Play nicely with other extensions
- ✅ Provide excellent developer experience
- ✅ Are maintainable and upgradeable

### Certification Levels

Extensions are certified at three levels:

| Level | Requirements | Badge | Description |
|-------|-------------|-------|-------------|
| **🥉 Bronze** | All MUST requirements | ![Bronze](https://img.shields.io/badge/MES-Bronze-cd7f32) | Basic compatibility |
| **🥈 Silver** | MUST + SHOULD requirements | ![Silver](https://img.shields.io/badge/MES-Silver-c0c0c0) | Recommended quality |
| **🥇 Gold** | All requirements + exceptional quality | ![Gold](https://img.shields.io/badge/MES-Gold-ffd700) | Official/reference |

**Reference Implementation:** `minimact-punch` (🥇 Gold Standard)

---

## Requirements Levels

Following [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt):

- **MUST** / **REQUIRED** - Absolute requirement (Bronze minimum)
- **SHOULD** / **RECOMMENDED** - Strong recommendation (Silver minimum)
- **MAY** / **OPTIONAL** - Truly optional (Gold aspiration)

---

# Part 1: MUST Requirements (Bronze Certification)

## 1.1 Hook Pattern Compliance

### 1.1.1 Component Context Integration

**MUST** follow the component context pattern:

```typescript
// ✅ COMPLIANT
import type { ComponentContext } from 'minimact/types';

let currentContext: ComponentContext | null = null;
let yourHookIndex = 0;

export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  yourHookIndex = 0;
}

export function useYourHook() {
  if (!currentContext) {
    throw new Error('useYourHook must be called within a component render');
  }

  const context = currentContext;
  const index = yourHookIndex++;
  const stateKey = `yourHook_${index}`;

  // Hook logic...
}
```

```typescript
// ❌ NON-COMPLIANT
export function useYourHook() {
  // Missing context check
  const state = getGlobalState(); // Using global state instead of context
  // ...
}
```

**Test:** Can the hook be called multiple times in one component? Does it throw when called outside a component?

### 1.1.2 Index-Based Tracking

**MUST** use index-based tracking for hook instances:

```typescript
// ✅ COMPLIANT
let hookIndex = 0;

export function useYourHook() {
  const index = hookIndex++; // Increments on each call
  const stateKey = `yourHook_${index}`;
  // ...
}
```

```typescript
// ❌ NON-COMPLIANT
let hookId = Math.random(); // Non-deterministic
const stateKey = `yourHook_${Math.random()}`; // Different each render
```

**Test:** Calling the hook twice in a component should create two independent instances with keys `yourHook_0` and `yourHook_1`.

### 1.1.3 State Storage in Context

**MUST** store hook state in the component context:

```typescript
// ✅ COMPLIANT
export function useYourHook() {
  const context = currentContext;

  if (!context.yourHookStates) {
    context.yourHookStates = new Map();
  }

  const stateKey = `yourHook_${index}`;

  if (!context.yourHookStates.has(stateKey)) {
    context.yourHookStates.set(stateKey, new YourStateClass());
  }

  return context.yourHookStates.get(stateKey)!;
}
```

```typescript
// ❌ NON-COMPLIANT
const globalStates = new Map(); // Global storage, not per-component

export function useYourHook() {
  return globalStates.get('singleton'); // Shared across components
}
```

**Test:** Two components using the same hook should have independent state.

---

## 1.2 Resource Management

### 1.2.1 Cleanup Implementation

**MUST** provide cleanup for all resources:

```typescript
// ✅ COMPLIANT
export class YourStateClass {
  private observer?: MutationObserver;
  private timerId?: number;
  private eventHandlers: Array<{ element: Element; type: string; handler: Function }> = [];

  destroy(): void {
    // Clean up observers
    this.observer?.disconnect();

    // Clear timers
    if (this.timerId) clearTimeout(this.timerId);

    // Remove event listeners
    for (const { element, type, handler } of this.eventHandlers) {
      element.removeEventListener(type, handler as EventListener);
    }

    this.eventHandlers = [];
  }
}

export function cleanupYourHook(context: ComponentContext): void {
  if (!context.yourHookStates) return;

  for (const state of context.yourHookStates.values()) {
    state.destroy();
  }
  context.yourHookStates.clear();
}
```

```typescript
// ❌ NON-COMPLIANT
export class YourStateClass {
  // No destroy() method - observers leak
  private observer = new MutationObserver(() => {});
}

// No cleanup function exported
```

**Test:** Create component, mount it, unmount it. Check for:
- Disconnected observers
- Cleared timers
- Removed event listeners
- No memory leaks (use Chrome DevTools heap snapshot)

### 1.2.2 No Memory Leaks

**MUST** pass memory leak tests:

**Test procedure:**
1. Mount component with extension 1000 times
2. Unmount all components
3. Force garbage collection
4. Heap snapshot should show zero instances of your classes

**Tools:**
- Chrome DevTools Memory Profiler
- `memlab` (Facebook's memory testing library)

---

## 1.3 Package Configuration

### 1.3.1 Peer Dependencies

**MUST** use peer dependencies for Minimact:

```json
// ✅ COMPLIANT package.json
{
  "name": "minimact-yourext",
  "peerDependencies": {
    "minimact": "^0.1.0"
  },
  "devDependencies": {
    "minimact": "^0.1.0"
  }
}
```

```json
// ❌ NON-COMPLIANT
{
  "dependencies": {
    "minimact": "^0.1.0"  // WRONG - Will bundle Minimact!
  }
}
```

**Test:** Run `npm pack`, extract tarball, verify Minimact is NOT in the bundle.

### 1.3.2 Module Exports

**MUST** export both ESM and CommonJS:

```json
// ✅ COMPLIANT
{
  "main": "dist/minimact-yourext.cjs.js",     // CommonJS
  "module": "dist/minimact-yourext.esm.js",   // ES Module
  "types": "dist/index.d.ts",                 // TypeScript
  "exports": {
    ".": {
      "import": "./dist/minimact-yourext.esm.js",
      "require": "./dist/minimact-yourext.cjs.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

**Test:** Import in both ESM and CommonJS projects - both should work.

### 1.3.3 TypeScript Declarations

**MUST** export TypeScript type definitions:

```typescript
// ✅ COMPLIANT - dist/index.d.ts exists
export declare function useYourHook<T>(options: YourOptions<T>): YourReturnType<T>;
export declare interface YourOptions<T> { /* ... */ }
```

```typescript
// ❌ NON-COMPLIANT
// No .d.ts file - TypeScript users get no IntelliSense
```

**Test:** TypeScript project should get full IntelliSense and type checking.

---

## 1.4 Error Handling

### 1.4.1 Descriptive Error Messages

**MUST** provide clear, actionable error messages:

```typescript
// ✅ COMPLIANT
if (!currentContext) {
  throw new Error(
    '[minimact-yourext] useYourHook must be called within a component render. ' +
    'Make sure you are calling this hook inside a Minimact component function.'
  );
}

if (!options.required) {
  throw new Error(
    '[minimact-yourext] Missing required option "required". ' +
    'Example: useYourHook({ required: true })'
  );
}
```

```typescript
// ❌ NON-COMPLIANT
if (!currentContext) {
  throw new Error('Invalid context'); // Vague, unhelpful
}
```

**Test:** Trigger errors intentionally - messages should help developers fix the issue.

### 1.4.2 Error Boundaries

**MUST NOT** throw unhandled errors that crash the app:

```typescript
// ✅ COMPLIANT
try {
  await riskyOperation();
} catch (error) {
  console.error('[minimact-yourext] Operation failed:', error);
  // Graceful degradation
  return fallbackValue;
}
```

```typescript
// ❌ NON-COMPLIANT
await riskyOperation(); // Unhandled rejection crashes app
```

**Test:** Simulate failures (network errors, invalid data) - app should remain functional.

---

## 1.5 Semantic Versioning

### 1.5.1 Version Format

**MUST** follow semantic versioning (semver):

```
MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)
```

**Examples:**
- `0.1.0` → `0.1.1` - Bug fix
- `0.1.1` → `0.2.0` - New feature
- `0.2.0` → `1.0.0` - Breaking change

### 1.5.2 Changelog

**MUST** maintain a `CHANGELOG.md`:

```markdown
# Changelog

## [0.2.0] - 2025-01-15

### Added
- New `usePredictHint()` integration for faster updates

### Changed
- Improved error messages

### Fixed
- Memory leak in observer cleanup

## [0.1.0] - 2025-01-01

### Added
- Initial release
```

**Test:** Every version bump should have corresponding changelog entry.

---

## 1.6 Browser Compatibility

### 1.6.1 Support Declaration

**MUST** declare supported browsers:

```markdown
## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ IE 11 (not supported)
```

### 1.6.2 Polyfills Disclosure

**MUST** document required polyfills:

```markdown
## Polyfills Required

This extension requires:
- `IntersectionObserver` (Safari < 12.1)
- `ResizeObserver` (Safari < 13.1)

Add to your HTML:
```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver,ResizeObserver"></script>
```
```

**Test:** Test in minimum supported browser versions.

---

## 1.7 Documentation

### 1.7.1 README Completeness

**MUST** include in README.md:

1. **Installation** - `npm install` command
2. **Quick Start** - Minimal working example
3. **API Reference** - All exports documented
4. **Examples** - At least 2 usage examples
5. **Browser Support** - Supported browsers
6. **License** - Open source license

**Template:**

```markdown
# minimact-yourext

Brief description (1-2 sentences).

## Installation

```bash
npm install minimact-yourext
```

## Quick Start

```tsx
import { useYourHook } from 'minimact-yourext';

export function MyComponent() {
  const api = useYourHook({ /* options */ });
  return <div>{api.value}</div>;
}
```

## API Reference

### useYourHook(options)

Description of what it does.

#### Options
- `option1` (required) - Description
- `option2` (optional) - Description

#### Returns
Object with properties...

## Examples

[Link to examples folder]

## Browser Support

[Supported browsers]

## License

MIT
```

**Test:** Another developer should be able to use your extension with only the README.

---

## 1.8 Licensing

### 1.8.1 Open Source License

**MUST** include an OSS license:

Recommended:
- **MIT** - Most permissive
- **Apache 2.0** - Patent protection
- **BSD 3-Clause** - Attribution required

```
// ✅ COMPLIANT
LICENSE file present in root
```

```
// ❌ NON-COMPLIANT
No LICENSE file - legal uncertainty
```

**Test:** LICENSE file exists and contains valid license text.

---

# Part 2: SHOULD Requirements (Silver Certification)

## 2.1 Predictive Rendering Integration

### 2.1.1 HintQueue Integration

**SHOULD** integrate with HintQueue for predictions:

```typescript
// ✅ COMPLIANT
import { HintQueue, DOMPatcher } from '@minimact/core';

export function useYourHook() {
  const context = currentContext;

  const handleChange = (newValue: any) => {
    const startTime = performance.now();

    // Build state changes
    const stateChanges: Record<string, any> = {
      [stateKey]: newValue
    };

    // Check for cached prediction
    const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

    if (hint) {
      // 🟢 Apply predicted patches
      const latency = performance.now() - startTime;
      console.log(`[minimact-yourext] 🟢 CACHE HIT! ${latency.toFixed(2)}ms`);

      context.domPatcher.applyPatches(context.element, hint.patches);

      // Notify playground
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
      // 🔴 Cache miss
      console.log(`[minimact-yourext] 🔴 CACHE MISS`);

      if (context.playgroundBridge) {
        context.playgroundBridge.cacheMiss({
          componentId: context.componentId,
          methodName: `yourHook(${stateKey})`,
          latency: performance.now() - startTime,
          patchCount: 0
        });
      }
    }
  };
}
```

**Benefit:** Instant UI updates when predictions hit (0ms network latency)

**Test:** In playground, verify green cache hit notifications appear.

### 2.1.2 PlaygroundBridge Integration

**SHOULD** notify playground of events:

```typescript
// ✅ COMPLIANT
if (context.playgroundBridge) {
  context.playgroundBridge.cacheHit({ /* ... */ });
  context.playgroundBridge.cacheMiss({ /* ... */ });
}
```

**Test:** Playground should visualize your extension's predictions.

---

## 2.2 Performance

### 2.2.1 Performance Benchmarks

**SHOULD** provide performance benchmarks:

```markdown
## Performance

Benchmarked on Chrome 120, M1 MacBook Pro:

| Operation | Latency | Description |
|-----------|---------|-------------|
| Hook initialization | ~0.5ms | First render |
| State update (cache hit) | ~1ms | Predicted |
| State update (cache miss) | ~45ms | Server round-trip |
| Cleanup | ~0.2ms | Component unmount |

Memory usage: ~2KB per hook instance
```

**Test:** Use `performance.now()` and Chrome Performance profiler.

### 2.2.2 Bundle Size

**SHOULD** keep bundle size minimal:

**Targets:**
- 🥈 Silver: < 50KB minified
- 🥇 Gold: < 20KB minified

```bash
# Measure bundle size
npm run build
ls -lh dist/minimact-yourext.esm.js
```

**Optimizations:**
- Tree-shakeable exports
- No large dependencies
- Code splitting where possible

### 2.2.3 Lazy Observer Creation

**SHOULD** create observers lazily:

```typescript
// ✅ COMPLIANT - Lazy
export class YourStateClass {
  private observer?: IntersectionObserver;

  get isIntersecting(): boolean {
    if (!this.observer) {
      this.setupObserver(); // Created only when accessed
    }
    return this._isIntersecting;
  }
}
```

```typescript
// ❌ LESS OPTIMAL - Eager
export class YourStateClass {
  private observer = new IntersectionObserver(/* ... */); // Always created
}
```

**Test:** Verify observer is only created when needed (use debugger).

---

## 2.3 Testing

### 2.3.1 Unit Tests

**SHOULD** have >80% code coverage:

```typescript
// Example test
describe('useYourHook', () => {
  it('should throw when called outside component', () => {
    expect(() => useYourHook()).toThrow('must be called within');
  });

  it('should create independent instances', () => {
    const hook1 = useYourHook();
    const hook2 = useYourHook();
    expect(hook1).not.toBe(hook2);
  });

  it('should integrate with HintQueue', () => {
    const hook = useYourHook();
    const hint = mockHint();
    // Test cache hit flow
  });
});
```

**Tools:**
- Vitest / Jest
- React Testing Library patterns

### 2.3.2 Integration Tests

**SHOULD** test with Minimact runtime:

```typescript
// Example integration test
it('should work in a real Minimact component', async () => {
  const { container } = render(<TestComponent />);

  // Interact with component
  fireEvent.click(screen.getByText('Click'));

  // Assert results
  expect(container.textContent).toContain('Updated');
});
```

---

## 2.4 Developer Experience

### 2.4.1 TypeScript Generics

**SHOULD** use TypeScript generics for type safety:

```typescript
// ✅ COMPLIANT
export function useYourHook<T extends Record<string, any>>(
  options: YourOptions<T>
): YourReturnType<T> {
  // Fully typed
}

// Usage - full type inference
const api = useYourHook({ initialValue: { name: '', age: 0 } });
api.values.name; // ✅ TypeScript knows this is string
api.values.age;  // ✅ TypeScript knows this is number
```

```typescript
// ❌ NON-COMPLIANT
export function useYourHook(options: any): any {
  // No type safety
}
```

**Test:** TypeScript should catch type errors at compile time.

### 2.4.2 IntelliSense Support

**SHOULD** provide rich JSDoc comments:

```typescript
/**
 * Creates a form state manager with validation.
 *
 * @template T - The form values type
 * @param options - Configuration options
 * @param options.initialValues - Initial form values
 * @param options.validationSchema - Field validators
 * @param options.onSubmit - Submit handler
 *
 * @returns Form state and helpers
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validationSchema: {
 *     email: (v) => v.includes('@') ? null : 'Invalid',
 *     password: (v) => v.length >= 8 ? null : 'Too short'
 *   },
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   }
 * });
 * ```
 */
export function useForm<T>(options: FormOptions<T>): FormAPI<T> {
  // ...
}
```

**Test:** Hover over function in VS Code - should show rich tooltip.

### 2.4.3 Examples Directory

**SHOULD** include runnable examples:

```
examples/
├── basic.html          # Minimal example
├── advanced.html       # Complex example
├── with-predictions.html  # Shows HintQueue integration
└── README.md           # How to run examples
```

**Test:** Examples should run in browser without build step.

---

## 2.5 Server-Side Support

### 2.5.1 C# Hook Classes

**SHOULD** provide C# counterparts for server-side rendering:

```csharp
// Minimact.Extensions.YourExt/YourHook.cs
namespace Minimact.Extensions.YourExt;

public class YourHook<T> where T : class
{
    public T Value { get; set; }
    public Dictionary<string, string> Errors { get; set; } = new();

    // Mirror client-side properties
}

public static class YourExtExtensions
{
    public static YourHook<T> UseYourHook<T>(
        this MinimactComponent component,
        T initialValue) where T : class
    {
        return new YourHook<T> { Value = initialValue };
    }
}
```

**Test:** Server-side rendering should work with your extension.

### 2.5.2 Prediction Generation

**SHOULD** generate server-side predictions:

```csharp
private List<PredictionInfo> GeneratePredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();

    foreach (var (stateKey, hook) in component.YourHooks)
    {
        // Predict likely state changes
        var predictedState = /* ... */;

        var predictedHtml = RenderWithState(predictedState);
        var patches = _reconciler.ComputePatches(currentHtml, predictedHtml);

        predictions.Add(new PredictionInfo
        {
            StateKey = stateKey,
            PredictedValue = predictedState,
            Confidence = 0.8f,
            Patches = patches
        });
    }

    return predictions;
}
```

**Benefit:** Pre-computed patches sent to client for instant updates.

---

## 2.6 Documentation Excellence

### 2.6.1 Migration Guides

**SHOULD** provide migration guides for breaking changes:

```markdown
# Migration Guide: v0.x to v1.0

## Breaking Changes

### 1. API Rename

**Before:**
```tsx
const api = useYourHook({ config: {} });
```

**After:**
```tsx
const api = useYourHook({ options: {} });
```

### 2. New Required Prop

**Before:**
```tsx
<YourComponent /> // No id required
```

**After:**
```tsx
<YourComponent id="unique" /> // id now required
```

## Upgrade Steps

1. Update package: `npm install minimact-yourext@1.0.0`
2. Find and replace: `config:` → `options:`
3. Add `id` props to all components
4. Run tests

## Need Help?

[Link to Discord/GitHub Discussions]
```

### 2.6.2 API Documentation Site

**SHOULD** host API documentation:

Tools:
- TypeDoc (from TypeScript)
- Docusaurus
- VitePress

**Example:** https://yourext.minimact.dev/api

---

# Part 3: MAY Requirements (Gold Certification)

## 3.1 Advanced Features

### 3.1.1 DevTools Integration

**MAY** provide browser DevTools extension:

```typescript
// Example: Chrome DevTools panel
if (window.__MINIMACT_DEVTOOLS__) {
  window.__MINIMACT_DEVTOOLS__.registerExtension({
    name: 'minimact-yourext',
    version: '1.0.0',
    inspect: (componentId: string) => {
      return {
        hooks: getHooksForComponent(componentId),
        performance: getPerformanceMetrics(),
      };
    }
  });
}
```

**Benefit:** Developers can inspect your extension's state in DevTools.

### 3.1.2 Custom Prediction Algorithms

**MAY** implement advanced prediction strategies:

```typescript
export class SmartPredictor {
  private history: StateChange[] = [];

  predict(currentState: any): PredictedState[] {
    // Machine learning / pattern detection
    const patterns = this.detectPatterns(this.history);
    return this.generatePredictions(patterns);
  }

  recordActual(actual: StateChange): void {
    this.history.push(actual);

    // Learn from misses
    if (actual.wasPredicted === false) {
      this.adjustModel(actual);
    }
  }
}
```

**Benefit:** Higher cache hit rates through intelligent predictions.

### 3.1.3 Performance Monitoring Dashboard

**MAY** provide real-time performance dashboard:

```tsx
import { usePerformanceMonitor } from 'minimact-yourext/monitor';

export function PerformanceDashboard() {
  const metrics = usePerformanceMonitor();

  return (
    <div>
      <h2>Extension Performance</h2>
      <Metric label="Cache Hit Rate" value={metrics.cacheHitRate} />
      <Metric label="Avg Latency" value={metrics.avgLatency} />
      <Metric label="Memory Usage" value={metrics.memoryUsage} />
    </div>
  );
}
```

---

## 3.2 Accessibility

### 3.2.1 ARIA Support

**MAY** include ARIA attributes:

```typescript
export function useYourHook() {
  return {
    // ...existing API

    // ARIA helpers
    getAriaProps: (role: string) => ({
      role,
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'aria-relevant': 'additions text'
    })
  };
}
```

### 3.2.2 Keyboard Navigation

**MAY** support keyboard navigation:

```typescript
export function useKeyboardNav() {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': /* navigate up */; break;
        case 'ArrowDown': /* navigate down */; break;
        case 'Enter': /* select */; break;
        case 'Escape': /* close */; break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
}
```

**Test:** Use keyboard only - all functionality should be accessible.

---

## 3.3 Internationalization

### 3.3.1 i18n Support

**MAY** support multiple languages:

```typescript
export function useYourHook(options: {
  locale?: string;
  messages?: Record<string, string>;
}) {
  const t = (key: string) => options.messages?.[key] ?? key;

  return {
    errorMessage: t('error.validation'),
    successMessage: t('success.saved')
  };
}
```

---

## 3.4 Community

### 3.4.1 Discord/Discussion Channel

**MAY** create dedicated support channel:

- Discord server
- GitHub Discussions
- Community forum

### 3.4.2 Video Tutorials

**MAY** create video walkthroughs:

- YouTube channel
- Screencasts
- Conference talks

### 3.4.3 Blog Posts

**MAY** write deep-dive articles:

- Architecture decisions
- Performance optimizations
- Best practices
- Real-world case studies

---

# Certification Process

## How to Get Certified

### Step 1: Self-Assessment

Use this checklist:

```markdown
# Bronze Certification Checklist

## 1. Hook Pattern Compliance
- [ ] Component context integration
- [ ] Index-based tracking
- [ ] State storage in context

## 2. Resource Management
- [ ] Cleanup implementation
- [ ] Memory leak tests pass

## 3. Package Configuration
- [ ] Peer dependencies correct
- [ ] Module exports (ESM + CJS)
- [ ] TypeScript declarations

## 4. Error Handling
- [ ] Descriptive error messages
- [ ] Error boundaries

## 5. Semantic Versioning
- [ ] Version format correct
- [ ] Changelog maintained

## 6. Browser Compatibility
- [ ] Support declaration
- [ ] Polyfills documented

## 7. Documentation
- [ ] README complete
- [ ] API reference

## 8. Licensing
- [ ] OSS license included
```

### Step 2: Automated Testing

Run the certification test suite:

```bash
npm install -g minimact-cert

cd your-extension
minimact-cert check

# Output:
# ✅ Hook patterns: PASS
# ✅ Memory leaks: PASS
# ✅ Package config: PASS
# ❌ TypeScript types: FAIL - missing declarations
#
# Bronze certification: FAILED
# Issues: 1
```

### Step 3: Manual Review

For Silver/Gold certification:

1. Submit PR to [minimact/extensions-registry](https://github.com/minimact/extensions-registry)
2. Include:
   - Link to repository
   - Certification level requested
   - Self-assessment checklist
   - Test results
3. Core team reviews within 7 days
4. Feedback provided
5. Badge granted when approved

---

# Certification Badges

## Usage

Add to your README:

```markdown
![MES Bronze](https://img.shields.io/badge/MES-Bronze-cd7f32)
![MES Silver](https://img.shields.io/badge/MES-Silver-c0c0c0)
![MES Gold](https://img.shields.io/badge/MES-Gold-ffd700)
```

## Registry

Certified extensions are listed at:
- https://minimact.dev/extensions
- https://github.com/minimact/extensions-registry

---

# Reference Implementations

## 🥇 Gold Standard

### minimact-punch
**What it demonstrates:**
- Perfect hook pattern compliance
- HintQueue integration
- Observer management
- Statistical operations
- Cleanup patterns
- Performance optimization

**Study this code:** [src/minimact-punch/](../src/minimact-punch/)

---

# Enforcement

## Automated Checks

The `minimact-cert` tool checks:
- ✅ Peer dependencies configuration
- ✅ Module export format
- ✅ TypeScript type presence
- ✅ License file existence
- ✅ README structure
- ✅ Memory leaks (via automated tests)
- ✅ Bundle size

## Manual Review

Core team reviews:
- Code quality
- API design
- Documentation clarity
- Examples usefulness
- Performance characteristics

---

# Versioning This Standard

This standard follows semantic versioning:

- **Current version:** 1.0.0
- **Breaking changes:** Increment major (e.g., 2.0.0)
- **New optional requirements:** Increment minor (e.g., 1.1.0)
- **Clarifications:** Increment patch (e.g., 1.0.1)

**Extensions certified against:**
- v1.x standards remain valid
- Must re-certify for v2.x standards

---

# FAQ

## Q: Do I need to implement all Gold requirements?

**A:** No. Bronze (MUST) is minimum. Silver (SHOULD) is recommended. Gold (MAY) is exceptional quality.

## Q: Can I get certified before 1.0?

**A:** Yes! 0.x versions can be certified. Useful for community feedback before 1.0.

## Q: What if I disagree with a requirement?

**A:** Open an issue on [minimact/minimact](https://github.com/minimact/minimact) to discuss. Standards evolve based on community input.

## Q: Does certification cost money?

**A:** No. Certification is free and open source.

## Q: How long does certification take?

**A:** Bronze (automated): Minutes. Silver/Gold (manual review): ~1 week.

## Q: Can I lose certification?

**A:** Yes, if you:
- Introduce breaking changes without updating major version
- Add memory leaks
- Remove required features
- Abandon maintenance (>12 months no updates)

Regular audits maintain trust in certified extensions.

---

# Contributing to This Standard

This standard is community-driven. To propose changes:

1. Open issue: [Discuss proposal](https://github.com/minimact/minimact/issues)
2. If approved, submit PR to this document
3. Core team reviews
4. Community feedback period (2 weeks)
5. Merge and version bump

**Decision makers:**
- Core maintainers
- Community vote (for major changes)

---

# Resources

## Tools
- **minimact-cert** - Automated certification testing
- **minimact-template** - Extension starter template
- **memlab** - Memory leak detection

## Documentation
- [Extension Integration Guide](./THIRD_PARTY_EXTENSIONS.md)
- [Integration Guide](../src/client-runtime/INTEGRATION_GUIDE.md)
- [minimact-punch Source](../src/minimact-punch/)

## Community
- [Discord](https://discord.gg/minimact) - #extension-dev channel
- [GitHub Discussions](https://github.com/minimact/minimact/discussions)
- [Twitter](https://twitter.com/minimactjs) - @minimactjs

---

## Acknowledgments

This standard draws inspiration from:
- **React** - Hooks rules
- **Vue** - Composition API patterns
- **Web Components** - Custom elements standards
- **npm** - Package best practices
- **TypeScript** - Type declaration guidelines

---

**Built with ❤️ by the Minimact community**

The cactus doesn't just grow. It sets standards. 🌵✨

**Version:** 1.0.0
**Last Updated:** 2025-01-XX
**Status:** Official Standard
