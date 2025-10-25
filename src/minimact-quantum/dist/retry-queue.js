/**
 * Retry Queue for failed quantum mutations
 *
 * Implements exponential backoff for network failures
 */
export class RetryQueue {
    constructor(signalR, clientId) {
        this.queue = [];
        this.retryInterval = 1000; // Start at 1s
        this.processing = false;
        this.signalR = signalR;
        this.clientId = clientId;
    }
    /**
     * Enqueue a failed mutation for retry
     */
    async enqueue(entanglementId, vector) {
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
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const item = this.queue[0];
            // Check if max attempts exceeded
            if (item.attempts >= item.maxAttempts) {
                console.error(`[RetryQueue] ❌ Max retries exceeded for mutation:`, item);
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
                console.log(`[RetryQueue] ✅ Successfully retried mutation after ${item.attempts + 1} attempt(s)`);
                this.queue.shift();
            }
            catch (error) {
                // Failed - increment attempts and update timestamp
                item.attempts++;
                item.lastAttempt = Date.now();
                console.warn(`[RetryQueue] ⚠️ Retry attempt ${item.attempts} failed:`, error);
            }
        }
        this.processing = false;
    }
    /**
     * Helper to sleep for a duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current queue size
     */
    getQueueSize() {
        return this.queue.length;
    }
    /**
     * Clear the retry queue
     */
    clear() {
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
