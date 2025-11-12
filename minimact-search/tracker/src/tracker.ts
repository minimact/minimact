/**
 * Mactic Tracker - Client-side change detection for event-driven search
 *
 * Stop crawling. Start running.
 */

export interface TrackerConfig {
  apiKey: string;
  apiEndpoint?: string;

  // Category scoping (required)
  category: string;

  // Optional tags for fine-grained categorization
  tags?: string[];

  // Optional ontology path (future hierarchical categories)
  ontologyPath?: string;

  // Trust level hint
  trustLevel?: 'unverified' | 'verified' | 'authoritative';

  // Zones to watch for changes
  watchZones: WatchZone[];

  // Change detection options
  checkInterval?: number; // ms between checks (default: 5000)
  semanticThreshold?: number; // 0-1, how much change triggers notification (default: 0.1)

  // Enable/disable features
  enableMutationObserver?: boolean; // default: true
  enablePeriodicCheck?: boolean; // default: true
  enableDebugLogging?: boolean; // default: false
}

export interface WatchZone {
  selector: string;
  importance: 'low' | 'medium' | 'high';
}

export interface ChangeEvent {
  url: string;
  selector: string;
  importance: string;
  content: string;
  title: string;
  description: string;
  timestamp: string;

  // Category metadata
  category: string;
  tags: string[];
  ontologyPath?: string;
  trustLevel: string;

  // Source metadata
  domain: string;
  language: string;

  // Change metadata
  changeType: 'content' | 'structure' | 'metadata';
  oldHash?: string;
  newHash: string;
}

export class MacticTracker {
  private config: TrackerConfig;
  private contentHashes: Map<string, string> = new Map();
  private mutationObserver?: MutationObserver;
  private checkIntervalId?: number;
  private initialized: boolean = false;

  constructor(config: TrackerConfig) {
    // Validate required fields
    if (!config.apiKey) {
      throw new Error('[Mactic] API key is required');
    }
    if (!config.category) {
      throw new Error('[Mactic] Category is required');
    }
    if (!config.watchZones || config.watchZones.length === 0) {
      throw new Error('[Mactic] At least one watch zone is required');
    }

    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.itsmactic.com/api/events',
      checkInterval: config.checkInterval || 5000,
      semanticThreshold: config.semanticThreshold || 0.1,
      enableMutationObserver: config.enableMutationObserver !== false,
      enablePeriodicCheck: config.enablePeriodicCheck !== false,
      enableDebugLogging: config.enableDebugLogging || false,
      tags: config.tags || [],
      trustLevel: config.trustLevel || 'unverified'
    };

    this.log('Tracker initialized', this.config);
  }

  /**
   * Initialize the tracker and start monitoring for changes
   */
  public init(): void {
    if (this.initialized) {
      this.log('Tracker already initialized');
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
    } else {
      this.startMonitoring();
    }

    this.initialized = true;
    this.log('Tracker started');
  }

  /**
   * Stop monitoring and cleanup
   */
  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }

    this.contentHashes.clear();
    this.initialized = false;
    this.log('Tracker destroyed');
  }

  private startMonitoring(): void {
    // Store initial hashes
    this.config.watchZones.forEach(zone => {
      const element = document.querySelector(zone.selector);
      if (element) {
        const hash = this.hashContent(this.getElementContent(element));
        this.contentHashes.set(zone.selector, hash);
        this.log(`Initial hash for ${zone.selector}:`, hash);
      } else {
        this.log(`Warning: Element not found: ${zone.selector}`);
      }
    });

    // Set up MutationObserver for real-time detection
    if (this.config.enableMutationObserver) {
      this.mutationObserver = new MutationObserver(() => {
        this.checkForChanges();
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false // Ignore attribute changes for now
      });

      this.log('MutationObserver started');
    }

    // Set up periodic check as fallback
    if (this.config.enablePeriodicCheck) {
      this.checkIntervalId = window.setInterval(() => {
        this.checkForChanges();
      }, this.config.checkInterval);

      this.log(`Periodic check started (every ${this.config.checkInterval}ms)`);
    }

    // Initial check
    this.checkForChanges();
  }

  private async checkForChanges(): Promise<void> {
    for (const zone of this.config.watchZones) {
      const element = document.querySelector(zone.selector);
      if (!element) continue;

      const content = this.getElementContent(element);
      const currentHash = this.hashContent(content);
      const previousHash = this.contentHashes.get(zone.selector);

      if (currentHash !== previousHash && previousHash !== undefined) {
        this.log(`Change detected in ${zone.selector}`);
        await this.notifyChange(zone, element, content, previousHash, currentHash);
        this.contentHashes.set(zone.selector, currentHash);
      }
    }
  }

  private getElementContent(element: Element): string {
    // Extract text content, stripping excessive whitespace
    return (element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hashContent(content: string): string {
    // Simple hash function (DJB2)
    // For MVP - can be upgraded to crypto hash or embedding-based later
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + char
    }
    return hash.toString(36);
  }

  private async notifyChange(
    zone: WatchZone,
    element: Element,
    content: string,
    oldHash: string,
    newHash: string
  ): Promise<void> {
    const event: ChangeEvent = {
      url: window.location.href,
      selector: zone.selector,
      importance: zone.importance,
      content: content.substring(0, 10000), // Limit content size
      title: document.title,
      description: this.getMetaDescription(),
      timestamp: new Date().toISOString(),

      // Category metadata
      category: this.config.category,
      tags: this.config.tags || [],
      ontologyPath: this.config.ontologyPath,
      trustLevel: this.config.trustLevel || 'unverified',

      // Source metadata
      domain: window.location.hostname,
      language: document.documentElement.lang || 'en',

      // Change metadata
      changeType: 'content',
      oldHash,
      newHash
    };

    this.log('Notifying change:', event);

    try {
      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.log('Change notification sent successfully:', result);
    } catch (error) {
      console.error('[Mactic] Failed to notify change:', error);
      // Don't throw - we don't want to break the page
    }
  }

  private getMetaDescription(): string {
    const meta = document.querySelector('meta[name="description"]');
    return meta?.getAttribute('content') || '';
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogging) {
      console.log(`[Mactic] ${message}`, ...args);
    }
  }
}

// Global API for easy initialization
export const init = (config: TrackerConfig): MacticTracker => {
  const tracker = new MacticTracker(config);
  tracker.init();
  return tracker;
};

// Export for UMD bundle
if (typeof window !== 'undefined') {
  (window as any).MacticTracker = {
    MacticTracker,
    init
  };
}
