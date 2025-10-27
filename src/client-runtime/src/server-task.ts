/**
 * Server Task - Client-side representation of a long-running server task
 *
 * Provides reactive state management for async operations that execute on the server.
 * Automatically syncs state changes from server and triggers component re-renders.
 */

export type ServerTaskStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';

/**
 * Options for configuring a server task
 */
export interface ServerTaskOptions {
  /** Enable streaming mode (for async generators) */
  stream?: boolean;
  /** Estimated number of chunks (for progress calculation in streaming mode) */
  estimatedChunks?: number;
  /** Callback invoked for each chunk in streaming mode */
  onChunk?: (chunk: any, index: number) => void;
  /** Maximum number of chunks to keep in memory (for memory management) */
  maxChunksInMemory?: number;
}

/**
 * Server task interface - Represents a long-running operation on the server
 */
export interface ServerTask<T> {
  // Status
  status: ServerTaskStatus;
  progress: number; // 0.0 to 1.0

  // Result
  result?: T;
  error?: Error;

  // Streaming-specific
  streaming: boolean;
  partial?: T; // Latest partial result (accumulated)
  chunks: T[]; // All chunks received so far
  chunkCount: number; // Number of chunks received

  // Control methods
  start(...args: any[]): void;
  retry(...args: any[]): void;
  cancel(): void;

  // Promise interface (for await)
  promise: Promise<T>;

  // Metadata
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds

  // Computed properties
  readonly idle: boolean;
  readonly running: boolean;
  readonly complete: boolean;
  readonly failed: boolean;
  readonly cancelled: boolean;
}

/**
 * Server task implementation
 */
export class ServerTaskImpl<T> implements ServerTask<T> {
  status: ServerTaskStatus = 'idle';
  progress: number = 0;
  result?: T;
  error?: Error;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;

  // Streaming props
  streaming: boolean;
  partial?: T;
  chunks: T[] = [];
  chunkCount: number = 0;

  private _promise?: Promise<T>;
  private _resolve?: (value: T) => void;
  private _reject?: (error: Error) => void;
  private _options: ServerTaskOptions;

  constructor(
    private taskId: string,
    private componentId: string,
    private signalR: any,
    private context: any,
    options: ServerTaskOptions = {}
  ) {
    this._options = options;
    this.streaming = options.stream || false;
    this._createPromise();
  }

  private _createPromise(): void {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise(): Promise<T> {
    return this._promise!;
  }

  get idle(): boolean {
    return this.status === 'idle';
  }

  get running(): boolean {
    return this.status === 'running';
  }

  get complete(): boolean {
    return this.status === 'complete';
  }

  get failed(): boolean {
    return this.status === 'error';
  }

  get cancelled(): boolean {
    return this.status === 'cancelled';
  }

  /**
   * Start the server task with optional arguments
   */
  start(...args: any[]): void {
    this.status = 'running';
    this.startedAt = new Date();
    this.completedAt = undefined;
    this.progress = 0;
    this.error = undefined;

    // Clear previous results
    if (this.streaming) {
      this.chunks = [];
      this.chunkCount = 0;
      this.partial = undefined;
    } else {
      this.result = undefined;
    }

    // Trigger re-render to show "running" state immediately
    this._triggerRerender();

    // Invoke server task via SignalR
    this.signalR.invoke('StartServerTask', this.componentId, this.taskId, args || [])
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to start task ${this.taskId}:`, err);
        this.status = 'error';
        this.error = err;
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
        this._reject?.(err);
        this._triggerRerender();
      });
  }

  /**
   * Retry a failed or cancelled task
   */
  retry(...args: any[]): void {
    if (this.status !== 'error' && this.status !== 'cancelled') {
      console.warn('[Minimact] Can only retry failed or cancelled tasks');
      return;
    }

    // Reset promise for new attempt
    this._createPromise();

    this.status = 'running';
    this.startedAt = new Date();
    this.completedAt = undefined;
    this.progress = 0;
    this.error = undefined;

    if (this.streaming) {
      this.chunks = [];
      this.chunkCount = 0;
      this.partial = undefined;
    } else {
      this.result = undefined;
    }

    this._triggerRerender();

    this.signalR.invoke('RetryServerTask', this.componentId, this.taskId, args || [])
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to retry task ${this.taskId}:`, err);
        this.status = 'error';
        this.error = err;
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
        this._reject?.(err);
        this._triggerRerender();
      });
  }

  /**
   * Cancel a running task
   */
  cancel(): void {
    if (this.status !== 'running') {
      console.warn('[Minimact] Can only cancel running tasks');
      return;
    }

    this.signalR.invoke('CancelServerTask', this.componentId, this.taskId)
      .then(() => {
        this.status = 'cancelled';
        this.completedAt = new Date();
        this.duration = this.completedAt.getTime() - (this.startedAt?.getTime() || 0);
        this._reject?.(new Error('Task cancelled by user'));
        this._triggerRerender();
      })
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to cancel task ${this.taskId}:`, err);
      });
  }

  /**
   * Update task state from server
   * Called by Minimact when server sends task state updates via SignalR
   */
  _updateFromServer(state: any): void {
    const previousStatus = this.status;

    this.status = state.status;
    this.progress = state.progress || 0;
    this.result = state.result;

    if (state.error) {
      this.error = new Error(state.error);
    }

    if (state.startedAt) {
      this.startedAt = new Date(state.startedAt);
    }

    if (state.completedAt) {
      this.completedAt = new Date(state.completedAt);
    }

    if (state.duration) {
      this.duration = state.duration;
    }

    // Resolve/reject promise based on status change
    if (this.status === 'complete' && previousStatus !== 'complete') {
      if (this._resolve) {
        this._resolve(this.result!);
      }
    } else if (this.status === 'error' && previousStatus !== 'error') {
      if (this._reject) {
        this._reject(this.error!);
      }
    } else if (this.status === 'cancelled' && previousStatus !== 'cancelled') {
      if (this._reject) {
        this._reject(new Error('Task cancelled'));
      }
    }

    // Trigger re-render when state changes
    if (previousStatus !== this.status || this.progress !== state.progress) {
      this._triggerRerender();
    }
  }

  /**
   * Trigger component re-render
   * Uses hint queue to check for predicted patches
   */
  private _triggerRerender(): void {
    if (!this.context || !this.context.hintQueue) {
      return;
    }

    const stateChanges: Record<string, any> = {
      [this.taskId]: {
        status: this.status,
        progress: this.progress,
        chunkCount: this.chunkCount
      }
    };

    const hint = this.context.hintQueue.matchHint(this.context.componentId, stateChanges);

    if (hint) {
      // Cache hit! Apply predicted patches
      console.log(`[Minimact] 🟢 Task state change predicted! Applying ${hint.patches.length} patches`);
      this.context.domPatcher.applyPatches(this.context.element, hint.patches);
    } else {
      // Cache miss - server will send patches
      console.log(`[Minimact] 🔴 Task state change not predicted`);
    }
  }
}
