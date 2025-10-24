import { useState, useCallback } from 'react';
import { playgroundApi } from '../services/playground.api';
import type {
  CompileRequest,
  InteractionRequest,
  InteractionResponse,
  MetricsResponse,
} from '../types/playground';

export interface UsePlaygroundReturn {
  // State
  sessionId: string | null;
  html: string;
  isCompiling: boolean;
  isInteracting: boolean;
  error: string | null;
  compilationTime: number | null;
  metrics: MetricsResponse | null;
  lastInteraction: InteractionResponse | null;

  // Actions
  compile: (code: string) => Promise<{ sessionId: string } | null>;
  interact: (eventType: string, stateChanges: Record<string, any>) => Promise<void>;
  clearError: () => void;
}

/**
 * Main hook for playground operations
 */
export function usePlayground(): UsePlaygroundReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [html, setHtml] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compilationTime, setCompilationTime] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [lastInteraction, setLastInteraction] = useState<InteractionResponse | null>(null);

  /**
   * Compile C# code
   */
  const compile = useCallback(async (code: string) => {
    setIsCompiling(true);
    setError(null);

    try {
      const request: CompileRequest = {
        csharpCode: code,
        predictHints: [],
      };

      const response = await playgroundApi.compile(request);

      setSessionId(response.sessionId);
      setHtml(response.html);
      setCompilationTime(response.compilationTimeMs);

      // Fetch initial metrics
      try {
        const metricsResponse = await playgroundApi.getMetrics(response.sessionId);
        setMetrics(metricsResponse);
      } catch (err) {
        // Metrics might not exist yet, that's ok
      }

      // Return session info for caller to use
      return { sessionId: response.sessionId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      setError(message);
      setSessionId(null);
      setHtml('');
      return null;
    } finally {
      setIsCompiling(false);
    }
  }, []);

  /**
   * Handle user interaction
   */
  const interact = useCallback(
    async (eventType: string, stateChanges: Record<string, any>) => {
      if (!sessionId) {
        setError('No active session. Compile a component first.');
        return;
      }

      setIsInteracting(true);
      setError(null);

      try {
        const request: InteractionRequest = {
          sessionId,
          eventType,
          stateChanges,
        };

        const response = await playgroundApi.interact(request);

        setHtml(response.html);
        setLastInteraction(response);

        // Fetch updated metrics
        try {
          const metricsResponse = await playgroundApi.getMetrics(sessionId);
          setMetrics(metricsResponse);
        } catch (err) {
          // Metrics might fail, that's ok
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Interaction failed';
        setError(message);
      } finally {
        setIsInteracting(false);
      }
    },
    [sessionId]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sessionId,
    html,
    isCompiling,
    isInteracting,
    error,
    compilationTime,
    metrics,
    lastInteraction,
    compile,
    interact,
    clearError,
  };
}
