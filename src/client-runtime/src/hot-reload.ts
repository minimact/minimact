/**
 * Minimact Hot Reload - Template-Based Approach
 *
 * Uses parameterized templates extracted at build time for INSTANT hot reload
 * Target: <5ms for all text/attribute edits
 * Memory: ~2KB per component (98% less than prediction-based)
 * Coverage: 100% (works with any value)
 *
 * Architecture:
 * - Build time: Babel plugin extracts templates from JSX
 * - Init: Load .templates.json files
 * - Hot reload: Apply template patches directly
 * - Fallback: Server re-render for structural changes (~150ms)
 */

import { TsxPatternDetector, type TsxEditPattern } from './tsx-pattern-detector';
import { templateState, type Template, type TemplateMap, type TemplatePatch } from './template-state';
import type { Patch } from './types';
import type { DOMPatcher } from './dom-patcher';
import type { HydrationManager } from './hydration';

// Forward declaration to avoid circular dependency
import type { MinimactComponentRegistry, ComponentMetadata } from './component-registry';

interface Minimact {
  domPatcher: DOMPatcher;
  componentRegistry: MinimactComponentRegistry;
  getComponent(componentId: string): any;
}

export interface HotReloadConfig {
  enabled: boolean;
  wsUrl?: string;
  debounceMs: number;
  showNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface HotReloadMessage {
  type: 'file-change' | 'template-patch' | 'template-map' | 'rerender-complete' | 'error' | 'connected';
  componentId?: string;
  filePath?: string;
  code?: string;
  vnode?: any;
  error?: string;
  timestamp: number;
  // Template-specific fields
  templatePatch?: TemplatePatch;
  templateMap?: TemplateMap;
}

export interface HotReloadMetrics {
  lastUpdateTime: number;
  updateCount: number;
  averageLatency: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
}

/**
 * Hot Reload Manager
 * Handles client-side hot reload with optimistic updates
 */
export class HotReloadManager {
  private ws: WebSocket | null = null;
  private config: HotReloadConfig;
  private minimact: Minimact;
  private metrics: HotReloadMetrics;
  private previousVNodes = new Map<string, any>();
  private previousTsx = new Map<string, string>();
  private tsxPredictionCache = new Map<string, Patch[]>();
  private detector: TsxPatternDetector;
  private pendingVerifications = new Map<string, any>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  // Map of null paths: componentType -> Set of paths that are currently null (not rendered)
  private nullPaths = new Map<string, Set<string>>();

  constructor(minimact: Minimact, config: Partial<HotReloadConfig> = {}) {
    this.minimact = minimact;
    this.config = {
      enabled: true,
      wsUrl: this.getDefaultWsUrl(),
      debounceMs: 50,
      showNotifications: true,
      logLevel: 'info',
      ...config
    };

    this.metrics = {
      lastUpdateTime: 0,
      updateCount: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };

    this.detector = new TsxPatternDetector();

    if (this.config.enabled) {
      this.connect();
    }
  }

  /**
   * Get default WebSocket URL based on current location
   */
  private getDefaultWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/minimact-hmr`;
  }

  /**
   * Connect to hot reload WebSocket server
   */
  private connect() {
    if (!this.config.wsUrl) return;

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.log('info', '✅ Hot reload connected');
        this.reconnectAttempts = 0;
        this.showToast('🔥 Hot reload enabled', 'success');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        this.log('error', 'Hot reload connection error:', error);
      };

      this.ws.onclose = () => {
        this.log('warn', 'Hot reload disconnected');
        this.attemptReconnect();
      };

    } catch (error) {
      this.log('error', 'Failed to connect to hot reload server:', error);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('error', 'Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.log('info', `Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Handle incoming WebSocket message
   */
  public async handleMessage(message: HotReloadMessage) {
    const startTime = performance.now();

    switch (message.type) {
      case 'template-map':
        // Initial template map load
        this.handleTemplateMap(message);
        break;

      case 'template-patch':
        // Template update from hot reload
        await this.handleTemplatePatch(message);
        break;

      case 'file-change':
        await this.handleFileChange(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      case 'connected':
        this.log('info', 'Hot reload server ready');
        break;

      case 'rerender-complete':
        // Server finished re-render (naive fallback)
        this.log('debug', 'Server re-render complete');
        break;
    }

    const latency = performance.now() - startTime;
    this.updateMetrics(latency);
  }

  /**
   * Handle file change - PREDICTIVE MAPPING APPROACH
   * Try prediction cache first (0-5ms), fall back to server (150ms)
   */
  private async handleFileChange(message: HotReloadMessage) {
    if (!message.componentId || !message.code) return;

    const startTime = performance.now();
    this.log('debug', `📝 File changed: ${message.filePath}`);

    try {
      const previousCode = this.previousTsx.get(message.componentId) || '';

      // First load - just cache TSX
      if (!previousCode) {
        this.previousTsx.set(message.componentId, message.code);
        this.log('debug', 'First load - cached TSX');
        return;
      }

      // STEP 1: Detect edit pattern (1-2ms)
      const pattern = this.detector.detectEditPattern(previousCode, message.code);
      this.log('debug', `Detected pattern: ${pattern.type} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`);

      // STEP 2: Try prediction cache lookup (0ms)
      if (pattern.confidence > 0.90) {
        const cacheKey = this.detector.buildCacheKey(message.componentId, pattern);
        const cachedPatches = this.tsxPredictionCache.get(cacheKey);

        if (cachedPatches) {
          // 🚀 INSTANT HOT RELOAD!
          const component = this.minimact.getComponent(message.componentId);
          if (component) {
            this.minimact.domPatcher.applyPatches(component.element, cachedPatches);

            const latency = performance.now() - startTime;
            this.log('info', `🚀 INSTANT! Applied cached patches in ${latency.toFixed(1)}ms`);

            this.metrics.cacheHits++;
            this.showToast(`⚡ ${latency.toFixed(0)}ms`, 'success', 800);

            // Flash component
            this.flashComponent(component.element);

            // Update cached TSX
            this.previousTsx.set(message.componentId, message.code);

            // Still verify in background
            this.verifyWithServer(message.componentId, message.code);
            return;
          }
        } else {
          this.log('debug', `No cache hit for key: ${cacheKey}`);
        }
      }

      // STEP 3: Fall back to server re-render (naive fallback)
      this.log('info', `⚠️ No prediction - requesting server render`);
      this.metrics.cacheMisses++;

      await this.requestServerRerender(message.componentId, message.code);

      const latency = performance.now() - startTime;
      this.log('info', `✅ Server render complete in ${latency.toFixed(1)}ms`);
      this.showToast(`🔄 ${latency.toFixed(0)}ms`, 'info', 1000);

      // Update cached TSX
      this.previousTsx.set(message.componentId, message.code);

    } catch (error) {
      this.log('error', 'Hot reload failed:', error);
      this.metrics.errors++;
      this.showToast('❌ Hot reload failed', 'error');
    }
  }

  /**
   * Request server to re-render component (naive fallback)
   */
  private async requestServerRerender(componentId: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server rerender timeout'));
      }, 5000);

      // Send request
      this.ws?.send(JSON.stringify({
        type: 'request-rerender',
        componentId,
        code,
        timestamp: Date.now()
      }));

      // Wait for response
      const handler = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'rerender-complete' && msg.componentId === componentId) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handler);
          resolve();
        }
      };

      this.ws?.addEventListener('message', handler);
    });
  }

  /**
   * Verify with server in background (non-blocking)
   */
  private async verifyWithServer(componentId: string, code: string): Promise<void> {
    try {
      // Request verification from server
      this.ws?.send(JSON.stringify({
        type: 'verify-tsx',
        componentId,
        code,
        timestamp: Date.now()
      }));

      this.log('debug', `Verification requested for ${componentId}`);
    } catch (error) {
      this.log('warn', 'Verification request failed:', error);
    }
  }

  /**
   * Handle template map initialization
   * Load templates from .templates.json file
   */
  private handleTemplateMap(message: HotReloadMessage): void {
    if (!message.templateMap || !message.componentId) return;

    const startTime = performance.now();
    // Note: message.componentId is actually the component TYPE name (e.g., "ProductDetailsPage")
    const componentType = message.componentId;
    const newTemplates = message.templateMap.templates;

    console.log(`[HotReload] 🔍 Processing template map for ${componentType}:`, {
      newTemplateCount: Object.keys(newTemplates).length,
      newTemplateKeys: Object.keys(newTemplates).slice(0, 5)
    });

    // Debug: Check structure of first template
    const firstKey = Object.keys(newTemplates)[0];
    if (firstKey) {
      console.log(`[HotReload] 🔍 First template structure:`, firstKey, newTemplates[firstKey]);
    }

    // Get existing templates to detect changes
    const existingTemplates = new Map<string, Template>();
    console.log(`[HotReload] 🔍 Checking for existing templates...`);
    for (const [nodePath, template] of Object.entries(newTemplates)) {
      const existing = templateState.getTemplate(componentType, nodePath);
      // Note: Server sends 'templateString', client stores as 'template'
      const newTemplateStr = (template as any).templateString || (template as any).template;
      if (existing) {
        const changed = existing.template !== newTemplateStr;
        console.log(`[HotReload] ${changed ? '🔥' : '✅'} Template "${nodePath}": old="${existing.template}" new="${newTemplateStr}" changed=${changed}`);
        existingTemplates.set(nodePath, existing);
      } else {
        console.log(`[HotReload] ❌ No existing template for ${nodePath}, new="${newTemplateStr}"`);
      }
    }

    console.log(`[HotReload] 📋 Found ${existingTemplates.size} existing templates out of ${Object.keys(newTemplates).length}`);

    // Load new template map
    templateState.loadTemplateMap(componentType, message.templateMap);

    // Get all instances of this component type from registry
    const instances = this.minimact.componentRegistry.getByType(componentType);
    console.log(`[HotReload] 🔍 Found ${instances.length} instance(s) of type "${componentType}"`);

    if (instances.length === 0) {
      console.warn(`[HotReload] ⚠️ No instances found for component type "${componentType}"`);
      return;
    }

    // Apply templates to each instance
    for (const instance of instances) {
      console.log(`[HotReload] 📦 Processing instance ${instance.instanceId.substring(0, 8)}...`);

      const patches: any[] = [];
      let changedCount = 0;

      for (const [nodePath, newTemplate] of Object.entries(newTemplates)) {
        const existingTemplate = existingTemplates.get(nodePath);

        // Check if template string changed
        if (existingTemplate && existingTemplate.template !== newTemplate.template) {
          changedCount++;
          console.log(`[HotReload] 🔥 Template changed #${changedCount}: "${existingTemplate.template}" → "${newTemplate.template}"`);

          // Get current state values for this instance's bindings
          const params = newTemplate.bindings.map(binding =>
            templateState.getStateValue(instance.instanceId, binding)
          );

          // Render template with current state
          const text = (templateState as any).renderWithParams(newTemplate.template, params);

          // Create patch for DOMPatcher
          if (newTemplate.type === 'attribute' && newTemplate.attribute) {
            patches.push({
              type: 'UpdateProp',
              path: newTemplate.path,
              prop: newTemplate.attribute,
              value: text
            });
          } else {
            patches.push({
              type: 'UpdateText',
              path: newTemplate.path,
              text: text
            });
          }
        }
      }

      console.log(`[HotReload] 📊 Instance summary: ${changedCount} changed, ${patches.length} patches`);

      // Apply all patches at once using DOMPatcher
      if (patches.length > 0) {
        this.minimact.domPatcher.applyPatches(instance.element, patches);
        this.flashComponent(instance.element);
        console.log(`[HotReload] ✅ Applied ${patches.length} patches to instance ${instance.instanceId.substring(0, 8)}`);
      }
    }

    const latency = performance.now() - startTime;
    const templateCount = Object.keys(newTemplates).length;

    this.log('info', `📦 Loaded ${templateCount} templates for ${componentType} in ${latency.toFixed(1)}ms`);

    const stats = templateState.getStats();
    this.log('debug', `Template stats: ${stats.templateCount} total, ~${stats.memoryKB}KB`);
  }

  /**
   * Handle template patch from hot reload
   * INSTANT update: <5ms for all text/attribute changes
   */
  private async handleTemplatePatch(message: HotReloadMessage): Promise<void> {
    if (!message.templatePatch || !message.componentId) return;

    const startTime = performance.now();
    const patch = message.templatePatch;
    // Note: message.componentId is the component TYPE name
    const componentType = message.componentId;

    console.log(`[HotReload] 🔧 Applying template patch to ${componentType}:`, patch);

    try {
      // Handle UpdateAttributeStatic separately (no template rendering needed)
      if (patch.type === 'UpdateAttributeStatic') {
        const attrName = (patch as any).attrName;
        const value = (patch as any).value;

        if (!attrName || value === undefined) {
          console.warn(`[HotReload] ⚠️ UpdateAttributeStatic missing attrName or value:`, patch);
          return;
        }

        // Get all instances of this component type
        const instances = this.minimact.componentRegistry.getByType(componentType);
        console.log(`[HotReload] 🔍 Found ${instances.length} instance(s) to update`);

        if (instances.length === 0) {
          console.warn(`[HotReload] ⚠️ No instances found for type "${componentType}"`);
          return;
        }

        // Apply to each instance
        for (const instance of instances) {
          const element = this.findElementByPath(instance.element, patch.path, componentType);
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            (element as HTMLElement).setAttribute(attrName, value);

            const latency = performance.now() - startTime;
            console.log(`[HotReload] 🚀 INSTANT! Updated static attribute ${attrName}="${value}" in ${latency.toFixed(1)}ms`);
            this.log('info', `🚀 INSTANT! Static attribute updated in ${latency.toFixed(1)}ms`);
            this.metrics.cacheHits++;
            this.showToast(`⚡ ${latency.toFixed(0)}ms`, 'success', 800);
            this.flashComponent(instance.element);
          } else {
            console.warn(`[HotReload] ⚠️ Element not found at path:`, patch.path);
          }
        }
        return;
      }

      // Apply template patch to template state (for dynamic templates)
      const result = templateState.applyTemplatePatch(patch);

      if (result) {
        console.log(`[HotReload] 📝 Template patch result:`, result);

        // Get all instances of this component type
        const instances = this.minimact.componentRegistry.getByType(componentType);
        console.log(`[HotReload] 🔍 Found ${instances.length} instance(s) to update`);

        if (instances.length === 0) {
          console.warn(`[HotReload] ⚠️ No instances found for type "${componentType}"`);
          return;
        }

        // Apply to each instance
        for (const instance of instances) {
          const element = this.findElementByPath(instance.element, result.path, componentType);
          if (element) {
            if (patch.type === 'UpdateTextTemplate') {
              // Update text node
              if (element.nodeType === Node.TEXT_NODE) {
                element.textContent = result.text;
              } else {
                element.textContent = result.text;
              }
            } else if (patch.type === 'UpdatePropTemplate' && patch.attribute) {
              // Update attribute (dynamic)
              (element as HTMLElement).setAttribute(patch.attribute, result.text);
            }

            const latency = performance.now() - startTime;

            // 🚀 INSTANT HOT RELOAD!
            console.log(`[HotReload] 🚀 INSTANT! Updated instance ${instance.instanceId.substring(0, 8)} in ${latency.toFixed(1)}ms: "${result.text}"`);
            this.log('info', `🚀 INSTANT! Template updated in ${latency.toFixed(1)}ms: "${result.text}"`);
            this.metrics.cacheHits++;
            this.showToast(`⚡ ${latency.toFixed(0)}ms`, 'success', 800);

            // Flash component
            this.flashComponent(instance.element);
          } else {
            console.warn(`[HotReload] ⚠️ Element not found at path:`, result.path);
          }
        }
      } else {
        console.warn(`[HotReload] ⚠️ Template patch returned no result`);
      }
    } catch (error) {
      this.log('error', 'Template patch failed:', error);
      this.metrics.errors++;

      // Fall back to server re-render
      await this.requestServerRerender(message.componentId!, '');
    }
  }

  /**
   * Check if a path is currently null (not rendered)
   */
  private isPathNull(componentType: string, path: string): boolean {
    return this.nullPaths.get(componentType)?.has(path) ?? false;
  }

  /**
   * Mark a path as null (not rendered)
   */
  private setPathNull(componentType: string, path: string): void {
    if (!this.nullPaths.has(componentType)) {
      this.nullPaths.set(componentType, new Set());
    }
    this.nullPaths.get(componentType)!.add(path);
  }

  /**
   * Mark a path as non-null (rendered)
   */
  private setPathNonNull(componentType: string, path: string): void {
    this.nullPaths.get(componentType)?.delete(path);
  }

  /**
   * Update null paths from server patches
   * The server tells us which paths are null when sending patches
   */
  private updateNullPaths(componentType: string, nullPathsFromServer: string[]): void {
    this.nullPaths.set(componentType, new Set(nullPathsFromServer));
  }

  /**
   * Find DOM element by hex path string
   * Example: "10000000.20000000.30000000" → convert to indices and navigate
   */
  private findElementByPath(root: HTMLElement, path: string, componentType: string): Node | null {
    if (path === '' || path === '.') {
      return root;
    }

    // Check if path ends with attribute marker (e.g., "10000000.20000000.@style")
    const segments = path.split('.');
    const lastSegment = segments[segments.length - 1];
    const isAttributePath = lastSegment?.startsWith('@');

    // If attribute path, remove the @attribute segment and find the element
    const hexSegments = isAttributePath ? segments.slice(0, -1) : segments;

    let current: Node | null = root;

    // Navigate through each segment using hierarchical parent-child lookup
    for (let i = 0; i < hexSegments.length; i++) {
      const targetHex = hexSegments[i];
      if (!current || !current.childNodes) return null;

      // Get parent path (everything before current segment)
      const parentPath = i > 0 ? hexSegments.slice(0, i).join('.') : '';

      // Get sorted children for this parent from template hierarchy
      const sortedHexCodes = templateState.getChildrenAtPath(componentType, parentPath);

      if (!sortedHexCodes) {
        console.warn(`[HotReload] No children found for parent path "${parentPath}" in ${componentType}`);
        return null;
      }

      // Map VNode hex codes to actual DOM children, skipping nulls
      let domChildIndex = 0; // Actual DOM child we're at
      let found = false;

      for (const hexCode of sortedHexCodes) {
        // Build full path to this child
        const fullPath = parentPath ? `${parentPath}.${hexCode}` : hexCode;

        if (templateState.isPathNull(componentType, fullPath)) {
          // This path is null, skip it (don't consume a DOM child)
          if (hexCode === targetHex) {
            console.warn(`[HotReload] Target path "${fullPath}" is currently null (not rendered)`);
            return null;
          }
          continue;
        }

        // This hex code has a corresponding DOM child
        if (hexCode === targetHex) {
          // Found our target!
          current = current.childNodes[domChildIndex] || null;
          found = true;
          break;
        }

        domChildIndex++;
      }

      if (!found || !current) {
        console.warn(`[HotReload] Element "${targetHex}" not found in DOM at parent path "${parentPath}"`);
        return null;
      }
    }

    return current;
  }

  /**
   * Populate TSX prediction cache from server hints
   * This integrates with the existing usePredictHint system
   */
  populateTsxCache(hint: any): void {
    if (!hint.tsxPattern || !hint.patches) return;

    const cacheKey = this.detector.buildCacheKey(hint.componentId, hint.tsxPattern);
    this.tsxPredictionCache.set(cacheKey, hint.patches);

    this.log('debug', `📦 Cached TSX pattern: ${cacheKey} (${hint.patches.length} patches)`);
  }

  /**
   * Handle error from server
   */
  private handleError(message: HotReloadMessage) {
    this.log('error', `Server error: ${message.error}`);
    this.metrics.errors++;
    this.showToast(`❌ ${message.error}`, 'error');
  }

  /**
   * Compute patches between two VNodes
   * Simple diff algorithm for MVP
   */
  private computePatches(oldVNode: any, newVNode: any): any[] {
    const patches: any[] = [];

    // For MVP, delegate to existing DOMPatcher
    // In production, this would use a proper VNode diff algorithm

    // Simple checks for common cases
    if (typeof oldVNode === 'string' && typeof newVNode === 'string') {
      if (oldVNode !== newVNode) {
        patches.push({
          type: 'text',
          value: newVNode
        });
      }
    } else if (typeof oldVNode === 'object' && typeof newVNode === 'object') {
      // Check tag
      if (oldVNode.tag !== newVNode.tag) {
        patches.push({
          type: 'replace',
          vnode: newVNode
        });
        return patches;
      }

      // Check attributes
      const oldAttrs = oldVNode.attributes || {};
      const newAttrs = newVNode.attributes || {};

      for (const key in newAttrs) {
        if (oldAttrs[key] !== newAttrs[key]) {
          patches.push({
            type: 'setAttribute',
            name: key,
            value: newAttrs[key]
          });
        }
      }

      for (const key in oldAttrs) {
        if (!(key in newAttrs)) {
          patches.push({
            type: 'removeAttribute',
            name: key
          });
        }
      }

      // Check children recursively
      const oldChildren = oldVNode.children || [];
      const newChildren = newVNode.children || [];

      for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
        if (i >= oldChildren.length) {
          patches.push({
            type: 'appendChild',
            vnode: newChildren[i]
          });
        } else if (i >= newChildren.length) {
          patches.push({
            type: 'removeChild',
            index: i
          });
        } else {
          const childPatches = this.computePatches(oldChildren[i], newChildren[i]);
          if (childPatches.length > 0) {
            patches.push({
              type: 'patchChild',
              index: i,
              patches: childPatches
            });
          }
        }
      }
    }

    return patches;
  }

  /**
   * Check if two VNodes match
   */
  private vnodesMatch(vnode1: any, vnode2: any): boolean {
    // Deep equality check
    return JSON.stringify(vnode1) === JSON.stringify(vnode2);
  }

  /**
   * Flash component to show update
   */
  private flashComponent(element: HTMLElement) {
    element.style.transition = 'box-shadow 0.3s ease';
    element.style.boxShadow = '0 0 10px 2px rgba(255, 165, 0, 0.6)';

    setTimeout(() => {
      element.style.boxShadow = '';
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
    }, 300);
  }

  /**
   * Update metrics
   */
  private updateMetrics(latency: number) {
    this.metrics.updateCount++;
    this.metrics.lastUpdateTime = Date.now();

    // Running average
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.updateCount - 1) + latency) /
      this.metrics.updateCount;
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 2000) {
    if (!this.config.showNotifications) return;

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Log message
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const prefix = '[Minimact HMR]';
      console[level](prefix, ...args);
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): HotReloadMetrics {
    return { ...this.metrics };
  }

  /**
   * Enable hot reload
   */
  public enable() {
    if (!this.config.enabled) {
      this.config.enabled = true;
      this.connect();
    }
  }

  /**
   * Disable hot reload
   */
  public disable() {
    this.config.enabled = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Cleanup
   */
  public dispose() {
    this.disable();
    this.previousVNodes.clear();
    this.pendingVerifications.clear();
  }
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
