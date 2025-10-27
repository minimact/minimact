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
export declare class ExponentialBackoffRetryPolicy implements IRetryPolicy {
    private delays;
    private maxDelay;
    nextRetryDelay(retryAttempt: number): number | null;
}
/**
 * Fixed interval retry policy
 *
 * Retries at fixed intervals with a maximum retry count
 */
export declare class FixedRetryPolicy implements IRetryPolicy {
    private interval;
    private maxRetries;
    /**
     * Create a fixed retry policy
     *
     * @param interval - Retry interval in milliseconds (default: 5000)
     * @param maxRetries - Maximum number of retries (default: 10)
     */
    constructor(interval?: number, maxRetries?: number);
    nextRetryDelay(retryAttempt: number): number | null;
}
/**
 * No retry policy
 *
 * Fails immediately without retrying
 */
export declare class NoRetryPolicy implements IRetryPolicy {
    nextRetryDelay(): null;
}
/**
 * Custom retry policy with configurable delays
 *
 * Allows specifying exact retry delays
 */
export declare class CustomRetryPolicy implements IRetryPolicy {
    private delays;
    private repeatLast;
    /**
     * Create a custom retry policy
     *
     * @param delays - Array of retry delays in milliseconds
     * @param repeatLast - If true, repeat the last delay infinitely (default: false)
     */
    constructor(delays: number[], repeatLast?: boolean);
    nextRetryDelay(retryAttempt: number): number | null;
}
