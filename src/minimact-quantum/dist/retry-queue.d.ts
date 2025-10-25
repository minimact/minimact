/**
 * Retry Queue for failed quantum mutations
 *
 * Implements exponential backoff for network failures
 */
import type { MutationVector } from './types';
interface SignalRManager {
    invoke(method: string, params: any): Promise<any>;
}
export declare class RetryQueue {
    private queue;
    private retryInterval;
    private processing;
    private signalR;
    private clientId;
    constructor(signalR: SignalRManager, clientId: string);
    /**
     * Enqueue a failed mutation for retry
     */
    enqueue(entanglementId: string, vector: MutationVector): Promise<void>;
    /**
     * Process retry queue with exponential backoff
     */
    private processQueue;
    /**
     * Helper to sleep for a duration
     */
    private sleep;
    /**
     * Get current queue size
     */
    getQueueSize(): number;
    /**
     * Clear the retry queue
     */
    clear(): void;
    /**
     * Get queue statistics
     */
    getStats(): {
        queueSize: number;
        totalAttempts: number;
        oldestItem: number | null;
    };
}
export {};
