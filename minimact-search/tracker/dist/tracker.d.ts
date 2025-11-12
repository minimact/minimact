/**
 * Mactic Tracker - Client-side change detection for event-driven search
 *
 * Stop crawling. Start running.
 */
export interface TrackerConfig {
    apiKey: string;
    apiEndpoint?: string;
    category: string;
    tags?: string[];
    ontologyPath?: string;
    trustLevel?: 'unverified' | 'verified' | 'authoritative';
    watchZones: WatchZone[];
    checkInterval?: number;
    semanticThreshold?: number;
    enableMutationObserver?: boolean;
    enablePeriodicCheck?: boolean;
    enableDebugLogging?: boolean;
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
    category: string;
    tags: string[];
    ontologyPath?: string;
    trustLevel: string;
    domain: string;
    language: string;
    changeType: 'content' | 'structure' | 'metadata';
    oldHash?: string;
    newHash: string;
}
export declare class MacticTracker {
    private config;
    private contentHashes;
    private mutationObserver?;
    private checkIntervalId?;
    private initialized;
    constructor(config: TrackerConfig);
    /**
     * Initialize the tracker and start monitoring for changes
     */
    init(): void;
    /**
     * Stop monitoring and cleanup
     */
    destroy(): void;
    private startMonitoring;
    private checkForChanges;
    private getElementContent;
    private hashContent;
    private notifyChange;
    private getMetaDescription;
    private log;
}
export declare const init: (config: TrackerConfig) => MacticTracker;
//# sourceMappingURL=tracker.d.ts.map