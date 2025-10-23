import { SignalRManager } from './signalr-manager';

/**
 * SignalR hook state
 */
export interface SignalRHookState<T = any> {
  data: T | null;
  error: string | null;
  connected: boolean;
  connectionId: string | null;
}

/**
 * Hook: useSignalR
 * Connects to a SignalR hub and provides real-time updates
 *
 * Usage:
 * const notifications = useSignalR('/hubs/notifications', (message) => {
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
  // Create SignalR manager for this hub
  const manager = new SignalRManager(hubUrl, {
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
        await manager.connection.invoke(methodName, ...args);
      } catch (error: any) {
        state.error = error.message;
        throw error;
      }
    },
    on: (methodName: string, handler: (...args: any[]) => void) => {
      manager.connection.on(methodName, handler);
    },
    off: (methodName: string, handler: (...args: any[]) => void) => {
      manager.connection.off(methodName, handler);
    },
    connect: async () => {
      await manager.start();
    },
    disconnect: async () => {
      await manager.stop();
    }
  };
}
