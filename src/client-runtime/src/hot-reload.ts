/**
 * Minimact Hot Reload - Tier 1 (Client-Side)
 *
 * Provides Vite-like hot reload for UI-only changes without C# rebuild
 * Target: <50ms for text/CSS changes
 */

import type { Minimact } from './minimact';

export interface HotReloadConfig {
  enabled: boolean;
  wsUrl?: string;
  debounceMs: number;
  showNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface HotReloadMessage {
  type: 'file-change' | 'verification' | 'error' | 'connected';
  componentId?: string;
  filePath?: string;
  code?: string;
  vnode?: any;
  error?: string;
  timestamp: number;
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
  private pendingVerifications = new Map<string, any>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

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
  private async handleMessage(message: HotReloadMessage) {
    const startTime = performance.now();

    switch (message.type) {
      case 'file-change':
        await this.handleFileChange(message);
        break;

      case 'verification':
        await this.handleVerification(message);
        break;

      case 'error':
        this.handleError(message);
        break;

      case 'connected':
        this.log('info', 'Hot reload server ready');
        break;
    }

    const latency = performance.now() - startTime;
    this.updateMetrics(latency);
  }

  /**
   * Handle file change - apply optimistic update
   */
  private async handleFileChange(message: HotReloadMessage) {
    if (!message.componentId || !message.code) return;

    const startTime = performance.now();
    this.log('debug', `📝 File changed: ${message.filePath}`);

    try {
      // 1. Transform code to VNode (client-side)
      // For MVP, we'll receive the VNode from server
      // In future, we can use esbuild-wasm for client-side transform
      const newVNode = message.vnode;

      if (!newVNode) {
        this.log('warn', 'No VNode provided in file-change message');
        return;
      }

      // 2. Get previous VNode
      const prevVNode = this.previousVNodes.get(message.componentId);

      if (!prevVNode) {
        // First load - just cache it
        this.previousVNodes.set(message.componentId, newVNode);
        this.log('debug', 'First load - cached VNode');
        return;
      }

      // 3. Compute diff
      const patches = this.computePatches(prevVNode, newVNode);

      if (patches.length === 0) {
        this.log('debug', 'No changes detected');
        return;
      }

      // 4. Apply patches optimistically
      const component = this.minimact.getComponent(message.componentId);
      if (component) {
        this.minimact.domPatcher.applyPatches(component.element, patches);
        this.log('info', `✅ Hot reload applied: ${patches.length} patches in ${(performance.now() - startTime).toFixed(1)}ms`);

        // Show visual feedback
        this.flashComponent(component.element);
      }

      // 5. Cache new VNode
      this.previousVNodes.set(message.componentId, newVNode);

      // 6. Mark as pending verification
      this.pendingVerifications.set(message.componentId, {
        optimisticVNode: newVNode,
        timestamp: Date.now()
      });

      // 7. Show notification
      if (this.config.showNotifications) {
        this.showToast(`🔥 Updated ${message.componentId}`, 'success', 1000);
      }

    } catch (error) {
      this.log('error', 'Hot reload failed:', error);
      this.metrics.errors++;
      this.showToast('❌ Hot reload failed', 'error');
    }
  }

  /**
   * Handle verification from server
   */
  private async handleVerification(message: HotReloadMessage) {
    if (!message.componentId || !message.vnode) return;

    const pending = this.pendingVerifications.get(message.componentId);
    if (!pending) return;

    // Compare optimistic VNode with server VNode
    const matches = this.vnodesMatch(pending.optimisticVNode, message.vnode);

    if (matches) {
      this.log('debug', `✅ Verification passed for ${message.componentId}`);
      this.metrics.cacheHits++;
    } else {
      // Mismatch! Apply correction
      this.log('warn', `⚠️ Prediction mismatch for ${message.componentId} - applying correction`);
      this.metrics.cacheMisses++;

      const component = this.minimact.getComponent(message.componentId);
      if (component) {
        const patches = this.computePatches(pending.optimisticVNode, message.vnode);
        this.minimact.domPatcher.applyPatches(component.element, patches);
        this.previousVNodes.set(message.componentId, message.vnode);
      }
    }

    this.pendingVerifications.delete(message.componentId);
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
