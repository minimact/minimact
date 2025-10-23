/**
 * Task scheduling hooks for fine-grained render timing control
 * useMicroTask - runs before paint (microtask queue)
 * useMacroTask - runs after paint (task queue)
 */

/**
 * Hook: useMicroTask
 * Schedules a callback to run in the microtask queue (before next paint)
 * Perfect for: DOM measurements, layout calculations, critical updates
 */
export function useMicroTask(callback: () => void): void {
  queueMicrotask(() => {
    try {
      callback();
    } catch (error) {
      console.error('[Minimact useMicroTask] Error in microtask:', error);
    }
  });
}

/**
 * Hook: useMacroTask
 * Schedules a callback to run in the task queue (after paint)
 * Perfect for: Analytics, logging, non-critical updates, deferred work
 */
export function useMacroTask(callback: () => void, delay: number = 0): void {
  setTimeout(() => {
    try {
      callback();
    } catch (error) {
      console.error('[Minimact useMacroTask] Error in macrotask:', error);
    }
  }, delay);
}

/**
 * Hook: useAnimationFrame
 * Schedules a callback for the next animation frame
 * Perfect for: Animations, visual updates, smooth transitions
 */
export function useAnimationFrame(callback: (timestamp: number) => void): number {
  const rafId = requestAnimationFrame((timestamp) => {
    try {
      callback(timestamp);
    } catch (error) {
      console.error('[Minimact useAnimationFrame] Error in animation frame:', error);
    }
  });

  return rafId;
}

/**
 * Hook: useIdleCallback
 * Schedules a callback for when the browser is idle
 * Perfect for: Low-priority work, background tasks, optimization
 */
export function useIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback((deadline) => {
      try {
        callback(deadline);
      } catch (error) {
        console.error('[Minimact useIdleCallback] Error in idle callback:', error);
      }
    }, options);
  } else {
    // Fallback to setTimeout for browsers without requestIdleCallback
    return setTimeout(() => {
      const deadline: IdleDeadline = {
        didTimeout: false,
        timeRemaining: () => 50
      };
      callback(deadline);
    }, 1) as unknown as number;
  }
}

/**
 * Cancel an animation frame
 */
export function cancelAnimationFrame(id: number): void {
  window.cancelAnimationFrame(id);
}

/**
 * Cancel an idle callback
 */
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
