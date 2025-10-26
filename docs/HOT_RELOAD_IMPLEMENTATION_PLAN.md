# Minimact Hot Reload - Technical Implementation Plan

**Version**: 1.0
**Status**: Design Complete, Ready for Implementation
**Target Timeline**: 5 weeks (Phases 1-2 are critical)

---

## Executive Summary

This document provides a detailed technical specification for implementing hot reload in Minimact to achieve:

1. **Phase 1 (Tier 1)**: Match Vite's speed for UI-only changes (<50ms)
2. **Phase 2**: Beat all frameworks for state preservation (98%+)
3. **Phase 3 (Tier 2)**: Optimize logic changes (<150ms)

**Key Innovation**: Optimistic client-side preview + background server verification

---

## Architecture Overview

### Current Architecture (Baseline)

```
User edits file → File watcher detects change → Server recompiles C#
→ Server re-renders → Rust diff → Patches via SignalR → Client applies

Total Time: 200-500ms ❌ (Too slow)
```

### New Architecture (Optimistic + Verify)

```
User edits TSX → File watcher detects change
                 ↓
         ┌───────┴────────┐
         │                │
    CLIENT (0-50ms)   SERVER (50-200ms)
         │                │
    esbuild-wasm    Roslyn compile
         ↓                ↓
    Transform TSX   Re-render C#
         ↓                ↓
    Create VNode    Create VNode
         ↓                ↓
    Diff patches    Diff patches
         ↓                ↓
    Apply instantly Compare results
         │                │
         └────────┬───────┘
                  ↓
          Verify match (99% success)
          OR apply correction (1% rare)

User Perception: 30-50ms ✅ (Competitive with Vite!)
```

---

## Phase 1: Tier 1 MVP (Week 1) - Critical Path

### Goal
Match Vite for UI-only changes: **<50ms target**

### Components to Build

#### 1.1 File Watcher Integration (Server-Side)

**File**: `src/Minimact.AspNetCore/HotReload/FileWatcher.cs`

```csharp
using System.IO;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Watches .cshtml files for changes and triggers hot reload
/// </summary>
public class FileWatcher : IDisposable
{
    private readonly FileSystemWatcher _watcher;
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly HotReloadConfig _config;
    private readonly Dictionary<string, DateTime> _lastChangeTime = new();
    private readonly TimeSpan _debounceDelay = TimeSpan.FromMilliseconds(50);

    public FileWatcher(
        IHubContext<MinimactHub> hubContext,
        IOptions<HotReloadConfig> config)
    {
        _hubContext = hubContext;
        _config = config.Value;

        if (!_config.Enabled)
        {
            Console.WriteLine("[Minimact HMR] File watcher disabled");
            return;
        }

        _watcher = new FileSystemWatcher
        {
            Path = _config.WatchPath ?? Directory.GetCurrentDirectory(),
            Filter = "*.cshtml",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        _watcher.Changed += OnFileChanged;
        _watcher.Created += OnFileChanged;

        Console.WriteLine($"[Minimact HMR] Watching {_watcher.Path} for *.cshtml changes");
    }

    private async void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        // Debounce (editors trigger multiple events)
        var now = DateTime.UtcNow;
        if (_lastChangeTime.TryGetValue(e.FullPath, out var lastChange))
        {
            if (now - lastChange < _debounceDelay)
            {
                return; // Ignore duplicate event
            }
        }
        _lastChangeTime[e.FullPath] = now;

        Console.WriteLine($"[Minimact HMR] 📝 File changed: {e.Name}");

        try
        {
            // Extract component ID from file name
            var componentId = ExtractComponentId(e.FullPath);
            if (componentId == null)
            {
                Console.WriteLine($"[Minimact HMR] ⚠️ Could not extract component ID from {e.Name}");
                return;
            }

            // Read new file content
            var tsxCode = await ReadFileWithRetry(e.FullPath);

            // Send to clients for optimistic preview
            await _hubContext.Clients.All.SendAsync("HotReload:FileChange", new
            {
                componentId,
                filePath = e.Name,
                code = tsxCode,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            Console.WriteLine($"[Minimact HMR] ✅ Sent file change to clients: {componentId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Minimact HMR] ❌ Error processing file change: {ex.Message}");
            await _hubContext.Clients.All.SendAsync("HotReload:Error", new
            {
                error = ex.Message,
                filePath = e.Name,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        }
    }

    private string? ExtractComponentId(string filePath)
    {
        // Example: "Components/Counter.cshtml" → "Counter"
        var fileName = Path.GetFileNameWithoutExtension(filePath);
        return fileName;
    }

    private async Task<string> ReadFileWithRetry(string filePath, int maxRetries = 3)
    {
        // Files may be locked temporarily by the editor
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                return await File.ReadAllTextAsync(filePath);
            }
            catch (IOException) when (i < maxRetries - 1)
            {
                await Task.Delay(10); // Wait 10ms and retry
            }
        }
        throw new IOException($"Could not read file after {maxRetries} attempts: {filePath}");
    }

    public void Dispose()
    {
        _watcher?.Dispose();
    }
}

public class HotReloadConfig
{
    public bool Enabled { get; set; } = true;
    public string? WatchPath { get; set; }
}
```

**Integration Point**:
```csharp
// In Program.cs or Startup.cs
builder.Services.Configure<HotReloadConfig>(builder.Configuration.GetSection("Minimact:HotReload"));
builder.Services.AddSingleton<FileWatcher>();

// Start after app.Run()
var fileWatcher = app.Services.GetRequiredService<FileWatcher>();
```

---

#### 1.2 Client-Side esbuild-wasm Integration

**File**: `src/client-runtime/src/hot-reload-transformer.ts` (NEW)

```typescript
import * as esbuild from 'esbuild-wasm';

/**
 * Transform TSX code to executable JavaScript using esbuild-wasm
 * Target: <30ms transformation time
 */
export class HotReloadTransformer {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Initialize esbuild-wasm (one-time setup, ~100ms)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await esbuild.initialize({
        wasmURL: '/node_modules/esbuild-wasm/esbuild.wasm',
        worker: true
      });
      this.initialized = true;
      console.log('[Minimact HMR] esbuild-wasm initialized');
    } catch (error) {
      console.error('[Minimact HMR] Failed to initialize esbuild:', error);
      throw error;
    }
  }

  /**
   * Transform TSX code to VNode structure
   *
   * @param tsxCode - Raw TSX code from .cshtml file
   * @returns VNode tree ready for diffing
   */
  async transformToVNode(tsxCode: string): Promise<any> {
    await this.initPromise;

    const startTime = performance.now();

    try {
      // Extract just the TSX/JSX portion
      const jsxCode = this.extractJSX(tsxCode);

      // Transform using esbuild (10-30ms)
      const result = await esbuild.transform(jsxCode, {
        loader: 'tsx',
        jsx: 'transform',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        target: 'es2020',
        format: 'esm'
      });

      // Evaluate to VNode
      const vnode = this.evaluateToVNode(result.code);

      const latency = performance.now() - startTime;
      console.log(`[Minimact HMR] ⚡ TSX transformed in ${latency.toFixed(1)}ms`);

      return vnode;
    } catch (error) {
      console.error('[Minimact HMR] Transformation failed:', error);
      throw error;
    }
  }

  /**
   * Extract JSX portion from .cshtml file
   * Example:
   *   @code { ... } → ignore
   *   <div>...</div> → extract
   */
  private extractJSX(tsxCode: string): string {
    // Simple extraction: Find the JSX return statement
    // In production, use proper parser (e.g., @babel/parser)

    // For MVP, assume the TSX is in a Render() method
    const renderMatch = tsxCode.match(/protected override VNode Render\(\)\s*{\s*return\s+([\s\S]+?);\s*}/);

    if (renderMatch) {
      return renderMatch[1].trim();
    }

    // Fallback: Assume entire content is JSX
    return tsxCode;
  }

  /**
   * Evaluate transformed code to VNode
   * Creates a sandboxed execution context
   */
  private evaluateToVNode(code: string): any {
    // Create helper functions for JSX
    const h = (tag: string, props: any, ...children: any[]) => ({
      type: 'Element',
      tag,
      props: props || {},
      children: children.flat()
    });

    const Fragment = (props: any) => ({
      type: 'Fragment',
      children: props.children || []
    });

    // Evaluate in sandboxed context
    try {
      const func = new Function('h', 'Fragment', `return ${code}`);
      return func(h, Fragment);
    } catch (error) {
      console.error('[Minimact HMR] Failed to evaluate VNode:', error);
      throw error;
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.initialized) {
      // esbuild-wasm doesn't need explicit cleanup
      this.initialized = false;
    }
  }
}
```

**Dependencies**:
```json
{
  "dependencies": {
    "esbuild-wasm": "^0.19.0"
  }
}
```

---

#### 1.3 Optimistic Preview + Background Verification

**File**: Update `src/client-runtime/src/hot-reload.ts`

**Key Changes**:

```typescript
import { HotReloadTransformer } from './hot-reload-transformer';

export class HotReloadManager {
  private transformer: HotReloadTransformer;

  constructor(minimact: Minimact, config: Partial<HotReloadConfig> = {}) {
    // ... existing code ...
    this.transformer = new HotReloadTransformer();
  }

  /**
   * NEW: Handle file change with optimistic preview
   */
  private async handleFileChange(message: HotReloadMessage) {
    if (!message.componentId || !message.code) return;

    const startTime = performance.now();
    this.log('debug', `📝 File changed: ${message.filePath}`);

    try {
      // PHASE 1: CLIENT-SIDE PREVIEW (0-50ms) 🚀
      const clientVNode = await this.applyClientPreview(message);

      // PHASE 2: BACKGROUND VERIFICATION (50-200ms, non-blocking)
      this.verifyWithServer(message.componentId, message.code, clientVNode)
        .catch(err => {
          console.error('[Minimact HMR] Verification failed:', err);
        });

      const totalLatency = performance.now() - startTime;
      this.log('info', `✅ Preview applied in ${totalLatency.toFixed(1)}ms`);

    } catch (error) {
      this.log('error', 'Hot reload failed:', error);
      this.metrics.errors++;
      this.showToast('❌ Hot reload failed', 'error');
    }
  }

  /**
   * Apply client-side preview immediately (optimistic update)
   */
  private async applyClientPreview(message: HotReloadMessage): Promise<any> {
    const startTime = performance.now();

    // 1. Transform TSX to VNode (10-30ms)
    const newVNode = await this.transformer.transformToVNode(message.code);

    // 2. Get previous VNode
    const prevVNode = this.previousVNodes.get(message.componentId);

    if (!prevVNode) {
      // First load - just cache it
      this.previousVNodes.set(message.componentId, newVNode);
      this.log('debug', 'First load - cached VNode');
      return newVNode;
    }

    // 3. Compute diff (5-15ms)
    const patches = this.computePatches(prevVNode, newVNode);

    if (patches.length === 0) {
      this.log('debug', 'No changes detected');
      return newVNode;
    }

    // 4. Apply patches optimistically (5-10ms)
    const component = this.minimact.getComponent(message.componentId);
    if (component) {
      this.minimact.domPatcher.applyPatches(component.element, patches);

      const latency = performance.now() - startTime;
      this.log('info', `🚀 Client preview: ${patches.length} patches in ${latency.toFixed(1)}ms`);

      // Visual feedback
      this.flashComponent(component.element);
    }

    // 5. Cache new VNode
    this.previousVNodes.set(message.componentId, newVNode);

    // 6. Mark as pending verification
    this.pendingVerifications.set(message.componentId, {
      optimisticVNode: newVNode,
      timestamp: Date.now()
    });

    return newVNode;
  }

  /**
   * Verify client preview with server (background, non-blocking)
   */
  private async verifyWithServer(
    componentId: string,
    code: string,
    clientVNode: any
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Request server to compile and render
      const serverVNode = await this.requestServerRender(componentId, code);

      // Compare client vs server VNode
      const matches = this.vnodesMatch(clientVNode, serverVNode);

      const latency = performance.now() - startTime;

      if (matches) {
        // 🎯 PREDICTION SUCCESS!
        this.log('debug', `✅ Verification passed (${latency.toFixed(1)}ms)`);
        this.metrics.cacheHits++;
        this.showToast('✅ Verified', 'success', 800);
      } else {
        // ⚠️ PREDICTION MISMATCH - Apply correction
        this.log('warn', `⚠️ Mismatch detected - applying correction (${latency.toFixed(1)}ms)`);
        this.metrics.cacheMisses++;

        const component = this.minimact.getComponent(componentId);
        if (component) {
          const correctionPatches = this.computePatches(clientVNode, serverVNode);
          this.minimact.domPatcher.applyPatches(component.element, correctionPatches);
          this.previousVNodes.set(componentId, serverVNode);
          this.showToast('⚠️ Corrected', 'info', 1000);
        }
      }

      this.pendingVerifications.delete(componentId);

    } catch (error) {
      this.log('error', 'Server verification failed:', error);
      // Client preview stays - better than nothing
    }
  }

  /**
   * Request server to compile and render component
   */
  private async requestServerRender(componentId: string, code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server render timeout'));
      }, 5000);

      this.ws?.send(JSON.stringify({
        type: 'request-render',
        componentId,
        code,
        timestamp: Date.now()
      }));

      // Listen for server response (one-time)
      const handler = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'render-result' && message.componentId === componentId) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handler);
          resolve(message.vnode);
        }
      };

      this.ws?.addEventListener('message', handler);
    });
  }

  // ... rest of existing code ...
}
```

---

#### 1.4 Server-Side Render Handler

**File**: `src/Minimact.AspNetCore/SignalR/MinimactHub.cs`

**Add new method**:

```csharp
/// <summary>
/// Handle client request to render component (for verification)
/// </summary>
public async Task RequestRender(string componentId, string code)
{
    try
    {
        var startTime = Stopwatch.GetTimestamp();

        // 1. Get component
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            await Clients.Caller.SendAsync("HotReload:Error", new
            {
                error = $"Component {componentId} not found",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
            return;
        }

        // 2. Hot swap the Render method (Tier 2 - future optimization)
        // For MVP, trigger normal re-render
        component.TriggerRender();

        // 3. Get the VNode that was just rendered
        var vnode = component.CurrentVNode;

        var elapsed = Stopwatch.GetElapsedTime(startTime);

        // 4. Send VNode back to client for verification
        await Clients.Caller.SendAsync("HotReload:RenderResult", new
        {
            componentId,
            vnode,
            latency = elapsed.TotalMilliseconds,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });

        Console.WriteLine($"[Minimact HMR] Server render: {componentId} in {elapsed.TotalMilliseconds:F1}ms");
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("HotReload:Error", new
        {
            error = ex.Message,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }
}
```

---

### Phase 1 Success Criteria

✅ UI-only changes (text, CSS, attributes) update in **<50ms**
✅ Client sees instant preview, server verifies in background
✅ 95%+ prediction accuracy for simple changes
✅ Smooth correction animation if mismatch occurs
✅ Clear toast notifications showing performance

---

## Phase 2: State Preservation (Week 2) - Killer Feature

### Goal
Preserve **98%+ of application state** across hot reloads

### Components to Build

#### 2.1 State Capture System

**File**: `src/client-runtime/src/hot-reload-state-manager.ts` (NEW)

```typescript
/**
 * Manages state capture and restoration during hot reload
 * Preserves: useState, useRef, useDomElementState, form data, scroll, focus
 */
export class HotReloadStateManager {
  private capturedStates = new Map<string, ComponentStateSnapshot>();

  /**
   * Capture all state before applying hot reload patches
   */
  captureComponentState(componentId: string, element: HTMLElement, context: ComponentContext): void {
    const snapshot: ComponentStateSnapshot = {
      componentId,
      timestamp: Date.now(),

      // 1. Capture useState values
      state: this.captureState(context.state),

      // 2. Capture useRef values
      refs: this.captureRefs(context.refs),

      // 3. Capture useDomElementState values
      domElementStates: this.captureDomElementStates(context.domElementStates),

      // 4. Capture DOM state (form data, scroll, focus)
      domState: this.captureDOMState(element),

      // 5. Capture scroll position
      scrollState: this.captureScrollState(element),

      // 6. Capture focus state
      focusState: this.captureFocusState(element)
    };

    this.capturedStates.set(componentId, snapshot);
    console.log(`[Minimact HMR] 📸 Captured state for ${componentId}:`, snapshot);
  }

  /**
   * Restore state after patches applied
   */
  restoreComponentState(componentId: string, element: HTMLElement, context: ComponentContext): void {
    const snapshot = this.capturedStates.get(componentId);
    if (!snapshot) {
      console.warn(`[Minimact HMR] No snapshot found for ${componentId}`);
      return;
    }

    console.log(`[Minimact HMR] 🔄 Restoring state for ${componentId}`);

    // 1. Restore useState values
    this.restoreState(context.state, snapshot.state);

    // 2. Restore useRef values
    this.restoreRefs(context.refs, snapshot.refs);

    // 3. Restore useDomElementState values
    this.restoreDomElementStates(context.domElementStates, snapshot.domElementStates);

    // 4. Restore DOM state (form data)
    this.restoreDOMState(element, snapshot.domState);

    // 5. Restore scroll position
    this.restoreScrollState(element, snapshot.scrollState);

    // 6. Restore focus state
    this.restoreFocusState(element, snapshot.focusState);

    console.log(`[Minimact HMR] ✅ State restored for ${componentId}`);
  }

  // === CAPTURE METHODS ===

  private captureState(state: Map<string, any>): Record<string, any> {
    const captured: Record<string, any> = {};
    state.forEach((value, key) => {
      captured[key] = this.cloneValue(value);
    });
    return captured;
  }

  private captureRefs(refs: Map<string, { current: any }>): Record<string, any> {
    const captured: Record<string, any> = {};
    refs.forEach((ref, key) => {
      // Don't clone DOM elements, just store reference
      captured[key] = ref.current instanceof HTMLElement
        ? { type: 'element', selector: this.getElementSelector(ref.current) }
        : this.cloneValue(ref.current);
    });
    return captured;
  }

  private captureDomElementStates(domStates?: Map<string, any>): Record<string, any> {
    if (!domStates) return {};

    const captured: Record<string, any> = {};
    domStates.forEach((state, key) => {
      captured[key] = {
        selector: state.selector,
        // Capture current snapshot
        snapshot: state.getSnapshot ? state.getSnapshot() : null
      };
    });
    return captured;
  }

  private captureDOMState(element: HTMLElement): DOMStateSnapshot {
    const snapshot: DOMStateSnapshot = {
      formData: {},
      attributes: {},
      classList: []
    };

    // Capture all form inputs
    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach((input: any) => {
      const id = input.id || input.name;
      if (!id) return;

      if (input.type === 'checkbox' || input.type === 'radio') {
        snapshot.formData[id] = input.checked;
      } else {
        snapshot.formData[id] = input.value;
      }
    });

    // Capture element attributes
    Array.from(element.attributes).forEach(attr => {
      snapshot.attributes[attr.name] = attr.value;
    });

    // Capture classes
    snapshot.classList = Array.from(element.classList);

    return snapshot;
  }

  private captureScrollState(element: HTMLElement): ScrollState {
    const scrollableElements: ScrollState['scrollPositions'] = {};

    // Capture root element scroll
    scrollableElements['__root__'] = {
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft
    };

    // Capture all scrollable descendants
    const scrollables = element.querySelectorAll('*');
    scrollables.forEach((el: any, index) => {
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        const selector = this.getElementSelector(el);
        scrollableElements[selector] = {
          scrollTop: el.scrollTop,
          scrollLeft: el.scrollLeft
        };
      }
    });

    return { scrollPositions: scrollableElements };
  }

  private captureFocusState(element: HTMLElement): FocusState {
    const activeElement = document.activeElement;

    if (activeElement && element.contains(activeElement)) {
      return {
        selector: this.getElementSelector(activeElement as HTMLElement),
        selectionStart: (activeElement as any).selectionStart,
        selectionEnd: (activeElement as any).selectionEnd
      };
    }

    return {};
  }

  // === RESTORE METHODS ===

  private restoreState(state: Map<string, any>, captured: Record<string, any>): void {
    Object.entries(captured).forEach(([key, value]) => {
      state.set(key, this.cloneValue(value));
    });
  }

  private restoreRefs(refs: Map<string, { current: any }>, captured: Record<string, any>): void {
    Object.entries(captured).forEach(([key, value]) => {
      if (value?.type === 'element') {
        // Re-query DOM element
        const element = document.querySelector(value.selector);
        if (!refs.has(key)) {
          refs.set(key, { current: element });
        } else {
          refs.get(key)!.current = element;
        }
      } else {
        if (!refs.has(key)) {
          refs.set(key, { current: this.cloneValue(value) });
        } else {
          refs.get(key)!.current = this.cloneValue(value);
        }
      }
    });
  }

  private restoreDomElementStates(domStates: Map<string, any> | undefined, captured: Record<string, any>): void {
    if (!domStates) return;

    Object.entries(captured).forEach(([key, value]) => {
      // DomElementState will re-observe automatically
      // Just ensure it has the right selector
      if (domStates.has(key)) {
        const state = domStates.get(key);
        if (state && state.setSelector) {
          state.setSelector(value.selector);
        }
      }
    });
  }

  private restoreDOMState(element: HTMLElement, snapshot: DOMStateSnapshot): void {
    // Restore form data
    Object.entries(snapshot.formData).forEach(([id, value]) => {
      const input = element.querySelector(`#${id}, [name="${id}"]`) as any;
      if (!input) return;

      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = value;
      } else {
        input.value = value;
      }
    });

    // Restore attributes
    Object.entries(snapshot.attributes).forEach(([name, value]) => {
      if (name !== 'class' && name !== 'style') {
        element.setAttribute(name, value as string);
      }
    });

    // Restore classes (merge with new classes)
    snapshot.classList.forEach(cls => {
      if (!element.classList.contains(cls)) {
        element.classList.add(cls);
      }
    });
  }

  private restoreScrollState(element: HTMLElement, snapshot: ScrollState): void {
    Object.entries(snapshot.scrollPositions).forEach(([selector, position]) => {
      if (selector === '__root__') {
        element.scrollTop = position.scrollTop;
        element.scrollLeft = position.scrollLeft;
      } else {
        const el = element.querySelector(selector) as HTMLElement;
        if (el) {
          el.scrollTop = position.scrollTop;
          el.scrollLeft = position.scrollLeft;
        }
      }
    });
  }

  private restoreFocusState(element: HTMLElement, snapshot: FocusState): void {
    if (!snapshot.selector) return;

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const el = element.querySelector(snapshot.selector!) as any;
      if (el && el.focus) {
        el.focus();

        // Restore text selection
        if (snapshot.selectionStart !== undefined && el.setSelectionRange) {
          el.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
        }
      }
    }, 0);
  }

  // === HELPER METHODS ===

  private cloneValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value; // Return original if not serializable
    }
  }

  private getElementSelector(element: HTMLElement): string {
    // Generate a unique selector for this element
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;

    // Fallback: Use path from root
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(el => el.tagName === current!.tagName);

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        path.unshift(`${tag}:nth-of-type(${index})`);
      } else {
        path.unshift(tag);
      }

      current = current.parentElement;
    }

    return path.join(' > ');
  }
}

// === TYPE DEFINITIONS ===

interface ComponentStateSnapshot {
  componentId: string;
  timestamp: number;
  state: Record<string, any>;
  refs: Record<string, any>;
  domElementStates: Record<string, any>;
  domState: DOMStateSnapshot;
  scrollState: ScrollState;
  focusState: FocusState;
}

interface DOMStateSnapshot {
  formData: Record<string, any>;
  attributes: Record<string, string>;
  classList: string[];
}

interface ScrollState {
  scrollPositions: Record<string, { scrollTop: number; scrollLeft: number }>;
}

interface FocusState {
  selector?: string;
  selectionStart?: number;
  selectionEnd?: number;
}
```

---

#### 2.2 Integration with HotReloadManager

**File**: Update `src/client-runtime/src/hot-reload.ts`

```typescript
import { HotReloadStateManager } from './hot-reload-state-manager';

export class HotReloadManager {
  private stateManager: HotReloadStateManager;

  constructor(minimact: Minimact, config: Partial<HotReloadConfig> = {}) {
    // ... existing code ...
    this.stateManager = new HotReloadStateManager();
  }

  /**
   * Apply client preview WITH state preservation
   */
  private async applyClientPreview(message: HotReloadMessage): Promise<any> {
    const component = this.minimact.getComponent(message.componentId);
    if (!component) return;

    // 1. CAPTURE STATE BEFORE CHANGES
    this.stateManager.captureComponentState(
      message.componentId,
      component.element,
      component.context
    );

    // 2. Transform and apply patches (existing code)
    const newVNode = await this.transformer.transformToVNode(message.code);
    const prevVNode = this.previousVNodes.get(message.componentId);

    if (prevVNode) {
      const patches = this.computePatches(prevVNode, newVNode);
      this.minimact.domPatcher.applyPatches(component.element, patches);
    }

    this.previousVNodes.set(message.componentId, newVNode);

    // 3. RESTORE STATE AFTER CHANGES
    this.stateManager.restoreComponentState(
      message.componentId,
      component.element,
      component.context
    );

    return newVNode;
  }
}
```

---

#### 2.3 Server-Side State Preservation

**File**: `src/Minimact.AspNetCore/Core/MinimactComponent.cs`

**Add state extraction method**:

```csharp
/// <summary>
/// Extract all [State] field values for hot reload preservation
/// </summary>
public Dictionary<string, object> ExtractStateForHotReload()
{
    var state = new Dictionary<string, object>();

    var stateFields = this.GetType()
        .GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
        .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

    foreach (var field in stateFields)
    {
        var value = field.GetValue(this);
        if (value != null)
        {
            state[field.Name] = value;
        }
    }

    return state;
}

/// <summary>
/// Restore state after hot reload
/// </summary>
public void RestoreStateFromHotReload(Dictionary<string, object> state)
{
    foreach (var (fieldName, value) in state)
    {
        var field = this.GetType()
            .GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Instance);

        if (field != null && field.GetCustomAttribute<StateAttribute>() != null)
        {
            try
            {
                var convertedValue = Convert.ChangeType(value, field.FieldType);
                field.SetValue(this, convertedValue);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Minimact HMR] Failed to restore state '{fieldName}': {ex.Message}");
            }
        }
    }

    // Sync state back to State dictionary
    StateManager.SyncMembersToState(this);
}
```

---

### Phase 2 Success Criteria

✅ **98%+ state preservation rate**
✅ Form data preserved across reloads
✅ Scroll position preserved
✅ Focus state preserved
✅ useState/useRef/useDomElementState values preserved
✅ Server-side [State] fields preserved
✅ Video playback position preserved
✅ Shopping cart contents preserved

---

## Phase 3: Tier 2 Optimization (Week 3) - Performance

### Goal
Optimize logic changes (hooks, handlers): **<150ms target**

### Components to Build

#### 3.1 Incremental Roslyn Compilation

**File**: `src/Minimact.AspNetCore/HotReload/IncrementalCompiler.cs`

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using System.Reflection;
using System.Runtime.Loader;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Incremental Roslyn compiler for fast C# hot reload
/// Target: <150ms (vs 300ms+ for full compilation)
/// </summary>
public class IncrementalCompiler
{
    private CSharpCompilation? _baseCompilation;
    private readonly Dictionary<string, SyntaxTree> _syntaxTreeCache = new();
    private readonly LRUCache<string, Assembly> _assemblyCache;
    private readonly object _lock = new();

    public IncrementalCompiler(int maxCacheSize = 100)
    {
        _assemblyCache = new LRUCache<string, Assembly>(maxCacheSize);
    }

    /// <summary>
    /// Compile component incrementally
    /// </summary>
    public async Task<CompilationResult> CompileAsync(string componentName, string code)
    {
        var startTime = Stopwatch.GetTimestamp();

        lock (_lock)
        {
            // 1. Check assembly cache (0ms if hit)
            var hash = ComputeContentHash(code);
            if (_assemblyCache.TryGet(hash, out var cachedAssembly))
            {
                return new CompilationResult
                {
                    Success = true,
                    Assembly = cachedAssembly,
                    CompilationTime = TimeSpan.Zero,
                    CacheHit = true
                };
            }

            // 2. Parse syntax tree (~20ms)
            var parseStart = Stopwatch.GetTimestamp();
            var syntaxTree = CSharpSyntaxTree.ParseText(code);
            var parseTime = Stopwatch.GetElapsedTime(parseStart);

            // 3. Incremental compilation (~80ms vs 300ms)
            var compileStart = Stopwatch.GetTimestamp();

            if (_baseCompilation == null)
            {
                _baseCompilation = CreateBaseCompilation();
            }

            CSharpCompilation compilation;
            if (_syntaxTreeCache.TryGetValue(componentName, out var oldTree))
            {
                // Replace existing tree (incremental)
                compilation = _baseCompilation.ReplaceSyntaxTree(oldTree, syntaxTree);
            }
            else
            {
                // Add new tree
                compilation = _baseCompilation.AddSyntaxTrees(syntaxTree);
            }

            var compileTime = Stopwatch.GetElapsedTime(compileStart);

            // 4. Emit to memory (~30ms)
            var emitStart = Stopwatch.GetTimestamp();
            using var ms = new MemoryStream();
            var emitResult = compilation.Emit(ms);
            var emitTime = Stopwatch.GetElapsedTime(emitStart);

            if (!emitResult.Success)
            {
                return new CompilationResult
                {
                    Success = false,
                    Errors = emitResult.Diagnostics
                        .Where(d => d.Severity == DiagnosticSeverity.Error)
                        .Select(d => d.GetMessage())
                        .ToList()
                };
            }

            // 5. Load assembly (~20ms)
            var loadStart = Stopwatch.GetTimestamp();
            ms.Seek(0, SeekOrigin.Begin);
            var assembly = AssemblyLoadContext.Default.LoadFromStream(ms);
            var loadTime = Stopwatch.GetElapsedTime(loadStart);

            // 6. Cache for future use
            _syntaxTreeCache[componentName] = syntaxTree;
            _assemblyCache.Add(hash, assembly);

            var totalTime = Stopwatch.GetElapsedTime(startTime);

            Console.WriteLine($"[Minimact HMR] Incremental compilation: {totalTime.TotalMilliseconds:F1}ms " +
                            $"(parse: {parseTime.TotalMilliseconds:F0}ms, " +
                            $"compile: {compileTime.TotalMilliseconds:F0}ms, " +
                            $"emit: {emitTime.TotalMilliseconds:F0}ms, " +
                            $"load: {loadTime.TotalMilliseconds:F0}ms)");

            return new CompilationResult
            {
                Success = true,
                Assembly = assembly,
                CompilationTime = totalTime,
                CacheHit = false
            };
        }
    }

    /// <summary>
    /// Create base compilation with all references
    /// </summary>
    private CSharpCompilation CreateBaseCompilation()
    {
        var references = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
            .Select(a => MetadataReference.CreateFromFile(a.Location))
            .ToList();

        return CSharpCompilation.Create(
            assemblyName: $"MinimactHotReload_{Guid.NewGuid():N}",
            syntaxTrees: null,
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
    }

    private static string ComputeContentHash(string content)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(content);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}

public class CompilationResult
{
    public bool Success { get; set; }
    public Assembly? Assembly { get; set; }
    public TimeSpan CompilationTime { get; set; }
    public bool CacheHit { get; set; }
    public List<string>? Errors { get; set; }
}

/// <summary>
/// LRU cache for assemblies
/// </summary>
public class LRUCache<TKey, TValue> where TKey : notnull
{
    private readonly int _maxSize;
    private readonly Dictionary<TKey, LinkedListNode<CacheItem>> _cache = new();
    private readonly LinkedList<CacheItem> _lru = new();

    public LRUCache(int maxSize)
    {
        _maxSize = maxSize;
    }

    public bool TryGet(TKey key, out TValue? value)
    {
        if (_cache.TryGetValue(key, out var node))
        {
            // Move to front (most recently used)
            _lru.Remove(node);
            _lru.AddFirst(node);
            value = node.Value.Value;
            return true;
        }

        value = default;
        return false;
    }

    public void Add(TKey key, TValue value)
    {
        if (_cache.TryGetValue(key, out var existingNode))
        {
            _lru.Remove(existingNode);
            existingNode.Value.Value = value;
            _lru.AddFirst(existingNode);
            return;
        }

        // Evict oldest if at capacity
        if (_cache.Count >= _maxSize)
        {
            var oldest = _lru.Last!;
            _lru.RemoveLast();
            _cache.Remove(oldest.Value.Key);
        }

        var item = new CacheItem { Key = key, Value = value };
        var node = new LinkedListNode<CacheItem>(item);
        _lru.AddFirst(node);
        _cache[key] = node;
    }

    private class CacheItem
    {
        public TKey Key { get; set; } = default!;
        public TValue Value { get; set; } = default!;
    }
}
```

---

### Phase 3 Success Criteria

✅ Hook changes (useState, useEffect) compile in **<150ms**
✅ Assembly cache hit rate >80%
✅ Memory usage stable (LRU eviction working)
✅ Incremental compilation 3x faster than full rebuild

---

## Testing Strategy

### Unit Tests

**File**: `tests/client-runtime/hot-reload.test.ts`

```typescript
describe('HotReloadManager', () => {
  it('should transform TSX to VNode in <30ms', async () => {
    const transformer = new HotReloadTransformer();
    const tsx = '<div className="test">Hello</div>';

    const start = performance.now();
    const vnode = await transformer.transformToVNode(tsx);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(30);
    expect(vnode.type).toBe('Element');
    expect(vnode.tag).toBe('div');
  });

  it('should preserve form data across hot reload', async () => {
    const stateManager = new HotReloadStateManager();
    const input = document.createElement('input');
    input.value = 'test value';
    input.id = 'test-input';

    const div = document.createElement('div');
    div.appendChild(input);

    // Capture
    const context = createMockContext();
    stateManager.captureComponentState('test', div, context);

    // Modify
    input.value = 'changed';

    // Restore
    stateManager.restoreComponentState('test', div, context);

    expect(input.value).toBe('test value');
  });
});
```

### Integration Tests

**File**: `tests/integration/hot-reload-e2e.test.ts`

```typescript
describe('Hot Reload E2E', () => {
  it('should update UI in <50ms for text change', async () => {
    // 1. Load component
    await page.goto('http://localhost:5000/counter');

    // 2. Modify file
    const start = Date.now();
    await fs.writeFile('Components/Counter.cshtml', modifiedContent);

    // 3. Wait for update
    await page.waitForSelector('[data-hot-reload="updated"]');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('should preserve shopping cart across hot reload', async () => {
    // 1. Add items to cart
    await page.click('[data-action="add-to-cart"]');
    const cartCount = await page.textContent('[data-cart-count]');

    // 2. Trigger hot reload
    await fs.writeFile('Components/ShoppingCart.cshtml', modifiedContent);
    await page.waitForSelector('[data-hot-reload="updated"]');

    // 3. Verify cart preserved
    const newCartCount = await page.textContent('[data-cart-count]');
    expect(newCartCount).toBe(cartCount);
  });
});
```

---

## Performance Targets Summary

| Metric | Target | How |
|--------|--------|-----|
| **Tier 1: UI Changes** | <50ms | esbuild-wasm + optimistic preview |
| **Tier 2: Logic Changes** | <150ms | Incremental Roslyn + assembly cache |
| **State Preservation** | >98% | Capture/restore all hooks + DOM state |
| **Prediction Accuracy** | >95% | Simple changes are deterministic |
| **Cache Hit Rate** | >80% | Content-based caching + LRU eviction |

---

## Rollout Plan

### Week 1: Phase 1 Implementation
- [ ] Day 1-2: FileWatcher + WebSocket protocol
- [ ] Day 3-4: esbuild-wasm transformer
- [ ] Day 5: Optimistic preview integration
- [ ] Day 6-7: Testing + bug fixes

### Week 2: Phase 2 Implementation
- [ ] Day 1-2: State capture system
- [ ] Day 3-4: State restoration + testing
- [ ] Day 5: Server-side state preservation
- [ ] Day 6-7: E2E testing

### Week 3: Phase 3 Implementation
- [ ] Day 1-3: Incremental compiler
- [ ] Day 4-5: Assembly caching + LRU
- [ ] Day 6-7: Performance optimization

### Week 4: Polish & Documentation
- [ ] Day 1-2: Error handling + edge cases
- [ ] Day 3-4: Documentation + examples
- [ ] Day 5-7: User testing + feedback

### Week 5: Integration & Release
- [ ] Day 1-2: VS Code extension integration
- [ ] Day 3-4: Final testing
- [ ] Day 5: Release prep
- [ ] Day 6-7: Release + monitoring

---

## Risk Mitigation

### Risk 1: esbuild-wasm Bundle Size
- **Concern**: Adding 2-3MB to client bundle
- **Mitigation**:
  - Lazy load esbuild-wasm only in development
  - Use CDN for WASM file
  - Enable gzip compression

### Risk 2: Prediction Mismatch Rate
- **Concern**: Client shows wrong UI before correction
- **Mitigation**:
  - Start conservative (only predict text/CSS)
  - Learn patterns over time
  - Smooth correction animations
  - Clear "verifying..." indicator

### Risk 3: Memory Leaks from Assembly Caching
- **Concern**: Unbounded assembly cache growth
- **Mitigation**:
  - LRU eviction (max 100 assemblies)
  - Explicit unload of old assemblies
  - Memory monitoring + alerts

### Risk 4: Breaking Changes Can't Hot Reload
- **Concern**: Some changes require full reload
- **Mitigation**:
  - Detect breaking changes (export signature, etc.)
  - Show clear message
  - One-click full reload button
  - Learn rules from React Fast Refresh

---

## Success Metrics

### Performance Metrics
- [ ] 95%+ of UI changes update in <50ms
- [ ] 90%+ of logic changes update in <150ms
- [ ] 98%+ state preservation rate
- [ ] 95%+ prediction accuracy
- [ ] <5% misprediction rate

### Developer Experience Metrics
- [ ] Survey: 90%+ say "hot reload is fast"
- [ ] Survey: 95%+ say "rarely lose state"
- [ ] Issue tracker: <10 hot reload bugs per month
- [ ] Telemetry: 80%+ developers enable hot reload

---

## Appendices

### A. Protocol Specification

**WebSocket Messages**:

```typescript
// Server → Client
type ServerMessage =
  | { type: 'HotReload:FileChange'; componentId: string; code: string; timestamp: number }
  | { type: 'HotReload:RenderResult'; componentId: string; vnode: any; latency: number }
  | { type: 'HotReload:Error'; error: string; timestamp: number };

// Client → Server
type ClientMessage =
  | { type: 'request-render'; componentId: string; code: string; timestamp: number }
  | { type: 'misprediction-report'; componentId: string; predicted: any; actual: any };
```

### B. Configuration Options

```json
{
  "Minimact": {
    "HotReload": {
      "Enabled": true,
      "Mode": "Optimistic",
      "WatchPath": "./Components",
      "DebounceMs": 50,
      "Tier1": {
        "UseEsbuild": true,
        "VerifyInBackground": true,
        "ShowVerificationToast": false
      },
      "Tier2": {
        "IncrementalCompilation": true,
        "CacheAssemblies": true,
        "MaxCacheSize": 100
      },
      "StatePreservation": {
        "PreserveServerState": true,
        "PreserveDomState": true,
        "PreserveFormData": true,
        "PreserveScrollPosition": true,
        "PreserveFocusState": true
      }
    }
  }
}
```

### C. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| esbuild-wasm | 89+ | 88+ | 15+ | 89+ |
| WebSocket | All | All | All | All |
| Performance API | All | All | All | All |
| MutationObserver | All | All | All | All |

**Minimum**: Chrome 89, Firefox 88, Safari 15, Edge 89

---

## Conclusion

This implementation plan provides a detailed roadmap to achieve:

✅ **Vite-level performance** for UI changes (<50ms)
✅ **Industry-leading state preservation** (98%+)
✅ **Acceptable performance** for logic changes (<150ms)
✅ **Unique competitive advantage** no other framework can match

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 implementation (Week 1)
3. Iterate based on performance benchmarks
4. Release with comprehensive documentation

🚀 **Minimact: The framework with hot reload that actually preserves everything**
