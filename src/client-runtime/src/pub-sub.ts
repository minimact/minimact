/**
 * Client-side pub/sub event aggregator
 * Enables component-to-component communication without prop drilling
 */

export interface PubSubMessage<T = any> {
  value: T;
  error?: string;
  waiting?: number;
  source?: string;
  timestamp: number;
  isStale?: boolean;
}

type Subscriber<T = any> = (message: PubSubMessage<T>) => void;

/**
 * Global event aggregator for client-side pub/sub
 */
class EventAggregator {
  private channels: Map<string, {
    subscribers: Set<Subscriber>;
    lastMessage: PubSubMessage | null;
  }> = new Map();

  private debugLogging: boolean = false;

  constructor(options: { debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Subscribe to a channel
   */
  subscribe<T = any>(
    channel: string,
    callback?: Subscriber<T>
  ): PubSubMessage<T> {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        subscribers: new Set(),
        lastMessage: null
      });
    }

    const channelData = this.channels.get(channel)!;

    // Add callback if provided
    if (callback) {
      channelData.subscribers.add(callback as Subscriber);
    }

    // Return reactive message object
    const message: PubSubMessage<T> = channelData.lastMessage || {
      value: undefined as T,
      timestamp: Date.now()
    };

    this.log(`Subscribed to '${channel}'`, { hasCallback: !!callback });

    return message;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, callback: Subscriber): void {
    const channelData = this.channels.get(channel);
    if (channelData) {
      channelData.subscribers.delete(callback);
      this.log(`Unsubscribed from '${channel}'`);
    }
  }

  /**
   * Publish a message to a channel
   */
  publish<T = any>(
    channel: string,
    value: T,
    options: {
      source?: string;
      error?: string;
      waiting?: number;
    } = {}
  ): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        subscribers: new Set(),
        lastMessage: null
      });
    }

    const channelData = this.channels.get(channel)!;

    const message: PubSubMessage<T> = {
      value,
      error: options.error,
      waiting: options.waiting,
      source: options.source,
      timestamp: Date.now(),
      isStale: false
    };

    // Update last message
    channelData.lastMessage = message;

    // Notify all subscribers
    channelData.subscribers.forEach(subscriber => {
      try {
        subscriber(message);
      } catch (error) {
        console.error(`[Minimact PubSub] Error in subscriber for '${channel}':`, error);
      }
    });

    this.log(`Published to '${channel}'`, {
      subscribers: channelData.subscribers.size,
      value
    });
  }

  /**
   * Clear a channel
   */
  clear(channel: string): void {
    this.channels.delete(channel);
    this.log(`Cleared channel '${channel}'`);
  }

  /**
   * Clear all channels
   */
  clearAll(): void {
    this.channels.clear();
    this.log('Cleared all channels');
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalChannels: this.channels.size,
      channels: Array.from(this.channels.entries()).map(([name, data]) => ({
        name,
        subscribers: data.subscribers.size,
        hasLastMessage: !!data.lastMessage
      }))
    };
  }

  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact PubSub] ${message}`, data || '');
    }
  }
}

// Global singleton instance
let globalAggregator: EventAggregator | null = null;

export function getEventAggregator(options?: { debugLogging?: boolean }): EventAggregator {
  if (!globalAggregator) {
    globalAggregator = new EventAggregator(options);
  }
  return globalAggregator;
}

/**
 * Hook: usePub - Publish to a channel
 */
export function usePub<T = any>(channel: string): (value: T, options?: {
  source?: string;
  error?: string;
  waiting?: number;
}) => void {
  const aggregator = getEventAggregator();

  return (value: T, options = {}) => {
    aggregator.publish(channel, value, options);
  };
}

/**
 * Hook: useSub - Subscribe to a channel
 */
export function useSub<T = any>(
  channel: string,
  callback?: (message: PubSubMessage<T>) => void
): PubSubMessage<T> {
  const aggregator = getEventAggregator();

  // Subscribe and return reactive message object
  const message = aggregator.subscribe<T>(channel, callback);

  // TODO: Integrate with component lifecycle for auto-unsubscribe
  // For now, developers must manually unsubscribe or we rely on component unmount

  return message;
}
