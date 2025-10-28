/**
 * Retry Policy Interface and Implementations
 *
 * Defines reconnection strategies for SignalM connections
 */

/**
 * Retry policy interface
 */
export interface IRetryPolicy {
  /**
   * Get next retry delay in milliseconds
   * Returns null if max retries exceeded
   *
   * @param retryAttempt - The retry attempt number (0-indexed)
   * @returns Delay in milliseconds, or null to stop retrying
   */
  nextRetryDelay(retryAttempt: number): number | null;
}

/**
 * Exponential backoff retry policy
 *
 * Retry delays: 0ms, 2s, 10s, 30s, then 60s max
 * Allows infinite retries with capped delay
 */
export class ExponentialBackoffRetryPolicy implements IRetryPolicy {
  private delays = [0, 2000, 10000, 30000];
  private maxDelay = 60000; // 60 seconds

  nextRetryDelay(retryAttempt: number): number | null {
    // Allow infinite retries, but cap delay at maxDelay
    if (retryAttempt < this.delays.length) {
      return this.delays[retryAttempt];
    }
    return this.maxDelay;
  }
}

/**
 * Fixed interval retry policy
 *
 * Retries at fixed intervals with a maximum retry count
 */
export class FixedRetryPolicy implements IRetryPolicy {
  private interval: number;
  private maxRetries: number;

  /**
   * Create a fixed retry policy
   *
   * @param interval - Retry interval in milliseconds (default: 5000)
   * @param maxRetries - Maximum number of retries (default: 10)
   */
  constructor(interval: number = 5000, maxRetries: number = 10) {
    this.interval = interval;
    this.maxRetries = maxRetries;
  }

  nextRetryDelay(retryAttempt: number): number | null {
    if (retryAttempt >= this.maxRetries) {
      return null; // Max retries exceeded
    }
    return this.interval;
  }
}

/**
 * No retry policy
 *
 * Fails immediately without retrying
 */
export class NoRetryPolicy implements IRetryPolicy {
  nextRetryDelay(): null {
    return null; // Never retry
  }
}

/**
 * Custom retry policy with configurable delays
 *
 * Allows specifying exact retry delays
 */
export class CustomRetryPolicy implements IRetryPolicy {
  private delays: number[];
  private repeatLast: boolean;

  /**
   * Create a custom retry policy
   *
   * @param delays - Array of retry delays in milliseconds
   * @param repeatLast - If true, repeat the last delay infinitely (default: false)
   */
  constructor(delays: number[], repeatLast: boolean = false) {
    if (delays.length === 0) {
      throw new Error('Delays array cannot be empty');
    }
    this.delays = delays;
    this.repeatLast = repeatLast;
  }

  nextRetryDelay(retryAttempt: number): number | null {
    if (retryAttempt < this.delays.length) {
      return this.delays[retryAttempt];
    }

    if (this.repeatLast) {
      return this.delays[this.delays.length - 1];
    }

    return null; // No more retries
  }
}
