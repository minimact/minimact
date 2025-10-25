/**
 * minimact-quantum - Type Definitions
 *
 * 🌌 Quantum DOM Entanglement Protocol
 *
 * NOT data sync. IDENTITY sync.
 * Elements share the same DOM identity across physical space.
 */
/**
 * Mutation vector - captures a DOM change
 * This is what gets transmitted through the entanglement channel
 */
export interface MutationVector {
    /** Type of mutation */
    type: 'attributes' | 'characterData' | 'childList' | 'value' | 'position' | 'style';
    /** Target selector (e.g., '#slider', '.card-3') */
    target: string;
    /** Attribute name (for attribute mutations) */
    attributeName?: string;
    /** Old value (for diffing/conflict resolution) */
    oldValue?: any;
    /** New value */
    newValue?: any;
    /** Added nodes (for childList mutations) */
    addedNodes?: SerializedNode[];
    /** Removed nodes (for childList mutations) */
    removedNodes?: SerializedNode[];
    /** Timestamp for ordering */
    timestamp: number;
    /** Causal vector for conflict resolution (Lamport timestamp) */
    causalVector?: number[];
}
/**
 * Serialized DOM node (for childList mutations)
 */
export interface SerializedNode {
    nodeName: string;
    nodeType: number;
    textContent?: string;
    attributes?: Record<string, string>;
}
/**
 * Transform function for value mapping
 */
export type TransformFunction = (value: any) => any;
/**
 * Bidirectional transform (for custom transformations)
 */
export interface BidirectionalTransform {
    /** Transform from local to remote */
    forward: TransformFunction;
    /** Transform from remote to local (inverse) */
    backward: TransformFunction;
}
/**
 * Entanglement options (extended configuration)
 */
export interface EntanglementOptions {
    /** Entanglement mode */
    mode?: 'mirror' | 'inverse' | 'bidirectional' | 'transform';
    /** Custom transform function (if mode is 'transform') */
    transform?: TransformFunction | BidirectionalTransform;
    /** Only sync specific attributes (selective entanglement) */
    attributes?: string[];
    /** Ignore specific attributes */
    ignoreAttributes?: string[];
    /** Only sync specific properties */
    properties?: string[];
    /** Ignore specific properties */
    ignoreProperties?: string[];
}
/**
 * Entanglement binding - links elements across clients
 */
export interface EntanglementBinding {
    /** Unique entanglement ID */
    entanglementId: string;
    /** Source client ID */
    sourceClient: string;
    /** Target client ID (or '*' for broadcast) */
    targetClient: string;
    /** Page URL (entanglements are page-scoped) */
    page: string;
    /** Element selector */
    selector: string;
    /** Entanglement mode */
    mode: 'mirror' | 'inverse' | 'bidirectional' | 'transform';
    /** Transform function (if mode is 'transform') */
    transform?: TransformFunction | BidirectionalTransform;
    /** Scope (who can see this entanglement) */
    scope: 'private' | 'team' | 'public';
    /** Selective entanglement filters */
    options?: EntanglementOptions;
}
/**
 * Entanglement channel for a specific element
 */
export interface QuantumLink {
    /** Link ID */
    id: string;
    /** Local element */
    localElement: Element;
    /** Remote element info */
    remoteElement: {
        clientId: string;
        selector: string;
    };
    /** Mode */
    mode: 'mirror' | 'inverse' | 'bidirectional' | 'transform';
    /** Active flag */
    active: boolean;
    /** Disentangle function */
    disentangle: () => Promise<void>;
}
/**
 * Entanglement manager configuration
 */
export interface EntanglementConfig {
    /** Current client ID */
    clientId: string;
    /** SignalR connection manager */
    signalR: SignalRManager;
    /** Session ID for reconnection support */
    sessionId?: string;
    /** Enable debug logging */
    debugLogging?: boolean;
}
/**
 * SignalR manager interface (from minimact-punch)
 */
export interface SignalRManager {
    invoke(method: string, ...args: any[]): Promise<any>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
}
/**
 * Request to register entanglement with server
 */
export interface RegisterEntanglementRequest {
    sourceClient: string;
    targetClient: string;
    page: string;
    selector: string;
    mode: string;
    scope: string;
    sessionId?: string;
}
/**
 * Request to propagate quantum mutation
 */
export interface PropagateQuantumMutationRequest {
    entanglementId: string;
    sourceClient: string;
    vector: MutationVector;
}
/**
 * Quantum mutation event (from server)
 */
export interface QuantumMutationEvent {
    entanglementId: string;
    vector: MutationVector;
    sourceClient: string;
    timestamp: number;
}
