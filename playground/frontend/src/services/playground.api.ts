import type {
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
      console.log('Sending compile request:', request);
      const response = await fetch(`${API_BASE}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Compile error response:', errorText);
        try {
          const error = JSON.parse(errorText);
          handleError(error);
        } catch {
          throw new Error(`Compilation failed (${response.status}): ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('Compile response:', result);
      return result;
    } catch (error) {
      console.error('Compile request failed:', error);
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
   * Update client-computed state values (for external library support)
   */
  async updateClientComputed(
    sessionId: string,
    computedValues: Record<string, any>
  ): Promise<InteractionResponse> {
    try {
      console.log('Sending update-client-computed request:', {
        sessionId,
        computedValues,
      });
      const response = await fetch(`${API_BASE}/update-client-computed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, computedValues }),
      });

      if (!response.ok) {
        const error = await response.json();
        handleError(error);
      }

      const result = await response.json();
      console.log('Update-client-computed response:', result);
      return result;
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
