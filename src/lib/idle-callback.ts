/**
 * Utility for deferring non-critical work using requestIdleCallback
 * Improves Time to Interactive by scheduling work when the browser is idle
 */

type IdleCallbackHandle = number;

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

// Polyfill for browsers without requestIdleCallback
const requestIdleCallbackPolyfill = (
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): IdleCallbackHandle => {
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, options?.timeout ?? 1) as unknown as IdleCallbackHandle;
};

const cancelIdleCallbackPolyfill = (handle: IdleCallbackHandle): void => {
  window.clearTimeout(handle);
};

// Use native or polyfill
export const scheduleIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : requestIdleCallbackPolyfill;

export const cancelIdleCallback = 
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : cancelIdleCallbackPolyfill;

/**
 * Queue of deferred tasks to run during idle time
 */
const taskQueue: Array<{
  task: () => void | Promise<void>;
  priority: 'low' | 'medium' | 'high';
}> = [];

let isProcessing = false;

/**
 * Process tasks from the queue during idle time
 */
function processQueue(deadline: IdleDeadline): void {
  // Sort by priority (high first)
  taskQueue.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Process tasks while we have time
  while (taskQueue.length > 0 && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
    const item = taskQueue.shift();
    if (item) {
      try {
        item.task();
      } catch (error) {
        console.warn('[IdleCallback] Task failed:', error);
      }
    }
  }

  // Continue processing if there are remaining tasks
  if (taskQueue.length > 0) {
    scheduleIdleCallback(processQueue, { timeout: 2000 });
  } else {
    isProcessing = false;
  }
}

/**
 * Defer a task to run when the browser is idle
 * @param task Function to execute
 * @param priority Task priority (low, medium, high)
 * @param timeout Maximum time to wait before forcing execution (ms)
 */
export function deferTask(
  task: () => void | Promise<void>,
  priority: 'low' | 'medium' | 'high' = 'low',
  timeout: number = 5000
): void {
  taskQueue.push({ task, priority });

  if (!isProcessing) {
    isProcessing = true;
    scheduleIdleCallback(processQueue, { timeout });
  }
}

/**
 * Run a task immediately after the current frame renders
 * Useful for visual updates that don't need to block interaction
 */
export function afterNextFrame(callback: () => void): void {
  requestAnimationFrame(() => {
    // Use a microtask to run after the paint
    queueMicrotask(callback);
  });
}

/**
 * Preload a module during idle time
 * @param importFn Dynamic import function
 */
export function preloadModule(importFn: () => Promise<unknown>): void {
  deferTask(() => {
    importFn().catch(() => {
      // Silent fail - preloading is best effort
    });
  }, 'low', 10000);
}

/**
 * Defer analytics and tracking initialization
 */
export function deferAnalytics(initFn: () => void): void {
  deferTask(initFn, 'low', 3000);
}

/**
 * Wait for the page to be fully interactive before running
 */
export function whenInteractive(callback: () => void): void {
  if (document.readyState === 'complete') {
    deferTask(callback, 'medium', 2000);
  } else {
    window.addEventListener('load', () => {
      deferTask(callback, 'medium', 2000);
    }, { once: true });
  }
}
