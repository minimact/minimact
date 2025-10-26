/**
 * Minimact Server Client
 *
 * Connects to the Minimact dev server for real-time hot reload events
 * Uses WebSocket for live updates
 */

import * as vscode from 'vscode';
import WebSocket from 'ws';

export interface HotReloadEvent {
  type: 'file-change' | 'rerender-complete' | 'error' | 'connected';
  componentId?: string;
  filePath?: string;
  code?: string;
  error?: string;
  timestamp: number;
  latency?: number;
}

export interface BuildCompleteEvent {
  componentId: string;
  success: boolean;
  time: number;
  patches?: number;
  cacheHit?: boolean;
}

export interface ServerStatus {
  connected: boolean;
  uptime: number;
  componentsWatched: number;
  lastReload?: number;
}

export class MinimactServerClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private outputChannel: vscode.OutputChannel;

  private onHotReloadCallbacks: ((event: HotReloadEvent) => void)[] = [];
  private onBuildCompleteCallbacks: ((event: BuildCompleteEvent) => void)[] = [];
  private onConnectedCallbacks: (() => void)[] = [];
  private onDisconnectedCallbacks: (() => void)[] = [];

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Connect to Minimact dev server
   */
  async connect(port: number = 5000): Promise<void> {
    const wsUrl = `ws://localhost:${port}/minimact-hmr`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          this.outputChannel.appendLine(`[Minimact HMR] ✅ Connected to dev server at ${wsUrl}`);
          this.reconnectAttempts = 0;

          this.onConnectedCallbacks.forEach(cb => cb());
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          const message = typeof data === 'string' ? data : data.toString();
          this.handleMessage(JSON.parse(message));
        });

        this.ws.on('error', (error: Error) => {
          this.outputChannel.appendLine(`[Minimact HMR] ❌ Connection error: ${error.message}`);
          reject(error);
        });

        this.ws.on('close', () => {
          this.outputChannel.appendLine('[Minimact HMR] ⚠️ Disconnected from server');
          this.onDisconnectedCallbacks.forEach(cb => cb());
          this.attemptReconnect(port);
        });

      } catch (error) {
        this.outputChannel.appendLine(`[Minimact HMR] ❌ Failed to connect: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'file-change':
      case 'rerender-complete':
      case 'error':
      case 'connected':
        this.onHotReloadCallbacks.forEach(cb => cb(message as HotReloadEvent));

        // Also emit build complete event
        if (message.type === 'rerender-complete') {
          const buildEvent: BuildCompleteEvent = {
            componentId: message.componentId,
            success: true,
            time: message.latency || 0,
            cacheHit: false
          };
          this.onBuildCompleteCallbacks.forEach(cb => cb(buildEvent));
        }
        break;

      default:
        this.outputChannel.appendLine(`[Minimact HMR] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect(port: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.outputChannel.appendLine('[Minimact HMR] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 10000);

    this.outputChannel.appendLine(`[Minimact HMR] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(port).catch(() => {
        // Failed to reconnect, will try again
      });
    }, delay);
  }

  /**
   * Subscribe to hot reload events
   */
  onHotReload(callback: (event: HotReloadEvent) => void): vscode.Disposable {
    this.onHotReloadCallbacks.push(callback);

    return new vscode.Disposable(() => {
      const index = this.onHotReloadCallbacks.indexOf(callback);
      if (index > -1) {
        this.onHotReloadCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Subscribe to build complete events
   */
  onBuildComplete(callback: (event: BuildCompleteEvent) => void): vscode.Disposable {
    this.onBuildCompleteCallbacks.push(callback);

    return new vscode.Disposable(() => {
      const index = this.onBuildCompleteCallbacks.indexOf(callback);
      if (index > -1) {
        this.onBuildCompleteCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Subscribe to connection events
   */
  onConnected(callback: () => void): vscode.Disposable {
    this.onConnectedCallbacks.push(callback);

    return new vscode.Disposable(() => {
      const index = this.onConnectedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onConnectedCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnected(callback: () => void): vscode.Disposable {
    this.onDisconnectedCallbacks.push(callback);

    return new vscode.Disposable(() => {
      const index = this.onDisconnectedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onDisconnectedCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Get server status
   */
  async getStatus(): Promise<ServerStatus | null> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return null;
    }

    // For now, return basic status
    // In future, could query server via HTTP
    return {
      connected: true,
      uptime: 0,
      componentsWatched: 0,
      lastReload: Date.now()
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1; // 1 = OPEN
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.outputChannel.appendLine('[Minimact HMR] Disconnected');
  }

  /**
   * Send manual reload request
   */
  async requestReload(componentId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to server');
    }

    this.ws!.send(JSON.stringify({
      type: 'request-rerender',
      componentId,
      timestamp: Date.now()
    }));
  }
}
