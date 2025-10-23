import {
  CompileRequest,
  CompileResponse,
  InteractionRequest,
  InteractionResponse,
  MetricsResponse,
  ErrorResponse,
} from '../types/playground';

const API_BASE = '/api/playground';

/**
 * Handle API errors with helpful messages
 */
function handleError(error: any): never {
  if (error instanceof Error) {
    throw error;
  }

  if (typeof error === 'object' && 'error' in error) {
    const err = error as ErrorResponse;
    throw new Error(
      err.details ? `${err.error}: ${err.details}` : err.error
    );
  }

  throw new Error('Unknown error occurred');
}

/**
 * Playground API client
 */
export const playgroundApi = {
  /**
   * Compile C# code and prepare component for interaction
   */
  async compile(request: CompileRequest): Promise<CompileResponse> {
    try {
      const response = await fetch(`${API_BASE}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        handleError(error);
      }

      return response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Handle user interaction and get patches
   */
  async interact(request: InteractionRequest): Promise<InteractionResponse> {
    try {
      const response = await fetch(`${API_BASE}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        handleError(error);
      }

      return response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Get metrics for a session
   */
  async getMetrics(sessionId: string): Promise<MetricsResponse> {
    try {
      const response = await fetch(`${API_BASE}/metrics/${sessionId}`);

      if (!response.ok) {
        const error = await response.json();
        handleError(error);
      }

      return response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE}/health`);

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return response.json();
    } catch (error) {
      handleError(error);
    }
  },
};
