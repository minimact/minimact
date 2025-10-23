/**
 * Playground API Types
 * Mirrors the backend response models from Minimact.Playground
 */

export interface CompileRequest {
  csharpCode: string;
  predictHints?: string[];
}

export interface CompileResponse {
  sessionId: string;
  html: string;
  vnode: Record<string, any>;
  predictions: PredictionInfo[];
  compilationTimeMs: number;
}

export interface PredictionInfo {
  stateKey: string;
  predictedValue: any;
  confidence: number;
}

export interface InteractionRequest {
  sessionId: string;
  eventType: string;
  elementId?: string;
  stateChanges: Record<string, any>;
}

export interface InteractionResponse {
  elapsedMs: number;
  cacheHit: boolean;
  latency: string;
  actualPatches: Patch[];
  predictedPatches?: Patch[];
  predictionConfidence: number;
  html: string;
}

export interface Patch {
  op: string;
  path: (string | number)[];
  [key: string]: any;
}

export interface MetricsResponse {
  totalInteractions: number;
  cacheHits: number;
  hitRate: number;
  avgPredictedLatency: number;
  avgComputedLatency: number;
  recentInteractions: InteractionMetric[];
}

export interface InteractionMetric {
  timestamp: string;
  eventType: string;
  cacheHit: boolean;
  latencyMs: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  line?: number;
  column?: number;
}

/**
 * Playground state
 */
export interface PlaygroundState {
  sessionId: string | null;
  csharpCode: string;
  html: string;
  isCompiling: boolean;
  error: string | null;
  metrics: MetricsResponse | null;
  lastInteraction: InteractionResponse | null;
}
