import { SignalMManager } from './signalm-manager';

/**
 * SignalR hook state (lightweight SignalM implementation)
 */
export interface SignalRHookState<T = any> {
  data: T | null;
  error: string | null;
  connected: boolean;
  connectionId: string | null;
}

/**
 * Hook: useSignalR
 * Connects to a SignalR hub using the lightweight SignalM client
 *
 * This is the SignalM-based implementation of useSignalR.
 * It connects to server-side SignalR hubs but uses the lightweight SignalM client.
 * Bundle size: ~3 KB vs 15 KB for full SignalR client.
 *
 * Usage:
 * const notifications = useSignalR('/minimact', (message) => {
 *   console.log('New notification:', message);
 * });
 */
export function useSignalR<T = any>(
  hubUrl: string,
  onMessage?: (data: T) => void,
  options: {
    reconnectInterval?: number;
    debugLogging?: boolean;
    autoConnect?: boolean;
  } = {}
): {
  state: SignalRHookState<T>;
  send: (methodName: string, ...args: any[]) => Promise<void>;
  on: (methodName: string, handler: (...args: any[]) => void) => void;
  off: (methodName: string, handler: (...args: any[]) => void) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
} {
  // Create SignalM manager for this hub (lightweight client for SignalR server)
  const manager = SignalMManager.createDefault(hubUrl, {
    reconnectInterval: options.reconnectInterval,
    debugLogging: options.debugLogging
  });

  // Initialize state
  const state: SignalRHookState<T> = {
    data: null,
    error: null,
    connected: false,
    connectionId: null
  };

  // Setup event handlers
  manager.on('connected', ({ connectionId }) => {
    state.connected = true;
    state.connectionId = connectionId || null;
    state.error = null;
  });

  manager.on('reconnected', ({ connectionId }) => {
    state.connected = true;
    state.connectionId = connectionId || null;
    state.error = null;
  });

  manager.on('closed', ({ error }) => {
    state.connected = false;
    state.connectionId = null;
    if (error) {
      state.error = error.toString();
    }
  });

  manager.on('error', ({ message }) => {
    state.error = message;
  });

  // Setup message handler if provided
  if (onMessage) {
    manager.on('message', (data: T) => {
      state.data = data;
      onMessage(data);
    });
  }

  // Auto-connect if enabled (default: true)
  if (options.autoConnect !== false) {
    manager.start().catch(error => {
      state.error = error.message;
      console.error('[Minimact useSignalR] Auto-connect failed:', error);
    });
  }

  return {
    state,
    send: async (methodName: string, ...args: any[]) => {
      try {
        await manager.invoke(methodName, ...args);
      } catch (error: any) {
        state.error = error.message;
        throw error;
      }
    },
    on: (methodName: string, handler: (...args: any[]) => void) => {
      manager.on(methodName, handler);
    },
    off: (methodName: string, handler: (...args: any[]) => void) => {
      manager.off(methodName, handler);
    },
    connect: async () => {
      await manager.start();
    },
    disconnect: async () => {
      await manager.stop();
    }
  };
}
