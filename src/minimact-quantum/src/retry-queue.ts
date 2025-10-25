/**
 * Retry Queue for failed quantum mutations
 *
 * Implements exponential backoff for network failures
 */

import type { MutationVector } from './types';

interface QueuedMutation {
  vector: MutationVector;
  entanglementId: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt: number;
}

interface SignalRManager {
  invoke(method: string, params: any): Promise<any>;
}

export class RetryQueue {
  private queue: QueuedMutation[] = [];
  private retryInterval: number = 1000; // Start at 1s
  private processing: boolean = false;
  private signalR: SignalRManager;
  private clientId: string;

  constructor(signalR: SignalRManager, clientId: string) {
    this.signalR = signalR;
    this.clientId = clientId;
  }

  /**
   * Enqueue a failed mutation for retry
   */
  async enqueue(entanglementId: string, vector: MutationVector): Promise<void> {
    this.queue.push({
      vector,
      entanglementId,
      attempts: 0,
      maxAttempts: 5,
      lastAttempt: Date.now()
    });

    console.log(`[RetryQueue] ⏳ Queued mutation for retry (queue size: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process retry queue with exponential backoff
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      // Check if max attempts exceeded
      if (item.attempts >= item.maxAttempts) {
        console.error(
          `[RetryQueue] ❌ Max retries exceeded for mutation:`,
          item
        );
        this.queue.shift(); // Remove from queue
        continue;
      }

      // Calculate backoff delay
      const backoff = Math.pow(2, item.attempts) * this.retryInterval;
      const timeSinceLastAttempt = Date.now() - item.lastAttempt;

      if (timeSinceLastAttempt < backoff) {
        // Not ready to retry yet, wait and check again
        await this.sleep(backoff - timeSinceLastAttempt);
        continue;
      }

      // Attempt retry
      try {
        await this.signalR.invoke('PropagateQuantumMutation', {
          entanglementId: item.entanglementId,
          sourceClient: this.clientId,
          vector: item.vector
        });

        // Success! Remove from queue
        console.log(
          `[RetryQueue] ✅ Successfully retried mutation after ${item.attempts + 1} attempt(s)`
        );
        this.queue.shift();
      } catch (error) {
        // Failed - increment attempts and update timestamp
        item.attempts++;
        item.lastAttempt = Date.now();

        console.warn(
          `[RetryQueue] ⚠️ Retry attempt ${item.attempts} failed:`,
          error
        );
      }
    }

    this.processing = false;
  }

  /**
   * Helper to sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the retry queue
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
    console.log('[RetryQueue] 🧹 Queue cleared');
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      totalAttempts: this.queue.reduce((sum, item) => sum + item.attempts, 0),
      oldestItem: this.queue.length > 0 ? this.queue[0].lastAttempt : null
    };
  }
}
