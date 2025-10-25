/**
 * Observer Mock Utilities
 * Helpers for testing IntersectionObserver, MutationObserver, ResizeObserver
 *
 * Includes both manual mocks and seeded random mocks for property-based testing.
 */

import { vi, type Mock } from 'vitest';
import { SeededRandom, ScrollSimulator, ViewportSimulator, MutationSimulator } from './seeded-random';
import { waitForNextFrame } from './dom-helpers';

/**
 * Mock IntersectionObserver with controllable callback triggering
 */
export function mockIntersectionObserver() {
  const observers: Array<{
    callback: IntersectionObserverCallback;
    elements: Set<Element>;
    options?: IntersectionObserverInit;
  }> = [];

  global.IntersectionObserver = vi.fn((callback, options) => {
    const observedElements = new Set<Element>();

    const observer = {
      observe: vi.fn((element: Element) => {
        observedElements.add(element);
      }),
      unobserve: vi.fn((element: Element) => {
        observedElements.delete(element);
      }),
      disconnect: vi.fn(() => {
        observedElements.clear();
      }),
      takeRecords: vi.fn(() => []),
      root: options?.root ?? null,
      rootMargin: options?.rootMargin ?? '',
      thresholds: Array.isArray(options?.threshold) ? options.threshold : [options?.threshold ?? 0]
    };

    observers.push({
      callback,
      elements: observedElements,
      options
    });

    return observer;
  }) as any;

  /**
   * Trigger intersection for specific element
   */
  const trigger = (element: Element, isIntersecting: boolean, ratio: number = isIntersecting ? 1 : 0) => {
    observers.forEach(({ callback, elements }) => {
      if (elements.has(element)) {
        const entry: IntersectionObserverEntry = {
          target: element,
          isIntersecting,
          intersectionRatio: ratio,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now()
        };

        callback([entry], {} as IntersectionObserver);
      }
    });
  };

  /**
   * Trigger intersection for all observed elements
   */
  const triggerAll = (isIntersecting: boolean) => {
    observers.forEach(({ callback, elements }) => {
      const entries = Array.from(elements).map(element => ({
        target: element,
        isIntersecting,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: element.getBoundingClientRect(),
        intersectionRect: element.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now()
      }));

      if (entries.length > 0) {
        callback(entries as IntersectionObserverEntry[], {} as IntersectionObserver);
      }
    });
  };

  return {
    trigger,
    triggerAll,
    observers
  };
}

/**
 * Mock MutationObserver with controllable mutation triggering
 */
export function mockMutationObserver() {
  const observers: Array<{
    callback: MutationCallback;
    targets: Map<Node, MutationObserverInit>;
  }> = [];

  global.MutationObserver = vi.fn((callback) => {
    const targets = new Map<Node, MutationObserverInit>();

    const observer = {
      observe: vi.fn((target: Node, options: MutationObserverInit) => {
        targets.set(target, options);
      }),
      disconnect: vi.fn(() => {
        targets.clear();
      }),
      takeRecords: vi.fn(() => [])
    };

    observers.push({
      callback,
      targets
    });

    return observer;
  }) as any;

  /**
   * Trigger attribute mutation
   */
  const triggerAttributeChange = (
    target: Node,
    attributeName: string,
    oldValue: string | null,
    newValue: string | null
  ) => {
    observers.forEach(({ callback, targets }) => {
      if (targets.has(target)) {
        const mutation: MutationRecord = {
          type: 'attributes',
          target,
          attributeName,
          oldValue,
          addedNodes: new NodeList() as any,
          removedNodes: new NodeList() as any,
          previousSibling: null,
          nextSibling: null,
          attributeNamespace: null
        };

        callback([mutation], {} as MutationObserver);
      }
    });
  };

  /**
   * Trigger child list mutation
   */
  const triggerChildListChange = (
    target: Node,
    addedNodes: Node[] = [],
    removedNodes: Node[] = []
  ) => {
    observers.forEach(({ callback, targets }) => {
      if (targets.has(target)) {
        const mutation: MutationRecord = {
          type: 'childList',
          target,
          addedNodes: addedNodes as any as NodeList,
          removedNodes: removedNodes as any as NodeList,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        };

        callback([mutation], {} as MutationObserver);
      }
    });
  };

  /**
   * Trigger character data mutation
   */
  const triggerCharacterDataChange = (
    target: Node,
    oldValue: string,
    newValue: string
  ) => {
    observers.forEach(({ callback, targets }) => {
      if (targets.has(target)) {
        const mutation: MutationRecord = {
          type: 'characterData',
          target,
          oldValue,
          addedNodes: new NodeList() as any,
          removedNodes: new NodeList() as any,
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null
        };

        callback([mutation], {} as MutationObserver);
      }
    });
  };

  return {
    triggerAttributeChange,
    triggerChildListChange,
    triggerCharacterDataChange,
    observers
  };
}

/**
 * Mock ResizeObserver with controllable resize triggering
 */
export function mockResizeObserver() {
  const observers: Array<{
    callback: ResizeObserverCallback;
    elements: Set<Element>;
  }> = [];

  global.ResizeObserver = vi.fn((callback) => {
    const observedElements = new Set<Element>();

    const observer = {
      observe: vi.fn((element: Element) => {
        observedElements.add(element);
      }),
      unobserve: vi.fn((element: Element) => {
        observedElements.delete(element);
      }),
      disconnect: vi.fn(() => {
        observedElements.clear();
      })
    };

    observers.push({
      callback,
      elements: observedElements
    });

    return observer;
  }) as any;

  /**
   * Trigger resize for specific element
   */
  const trigger = (element: Element, contentRect: Partial<DOMRectReadOnly>) => {
    observers.forEach(({ callback, elements }) => {
      if (elements.has(element)) {
        const entry: ResizeObserverEntry = {
          target: element,
          contentRect: {
            x: contentRect.x ?? 0,
            y: contentRect.y ?? 0,
            width: contentRect.width ?? 0,
            height: contentRect.height ?? 0,
            top: contentRect.top ?? 0,
            left: contentRect.left ?? 0,
            bottom: contentRect.bottom ?? 0,
            right: contentRect.right ?? 0,
            toJSON: () => ({})
          } as DOMRectReadOnly,
          borderBoxSize: [] as any,
          contentBoxSize: [] as any,
          devicePixelContentBoxSize: [] as any
        };

        callback([entry], {} as ResizeObserver);
      }
    });
  };

  return {
    trigger,
    observers
  };
}

/**
 * Create a full mock environment with all observers
 */
export function mockAllObservers() {
  return {
    intersection: mockIntersectionObserver(),
    mutation: mockMutationObserver(),
    resize: mockResizeObserver()
  };
}

// ============================================================================
// SEEDED RANDOM MOCKS - Property-Based Testing
// ============================================================================

/**
 * Mock IntersectionObserver with controlled randomness
 *
 * Uses seeded RNG to generate realistic, varied intersection scenarios
 * that are fully reproducible (same seed = same behavior).
 *
 * Perfect for:
 * - Fuzz testing
 * - Finding edge cases
 * - Regression testing
 * - Property-based testing
 *
 * @example
 * const { simulateFrames, getSeed } = mockIntersectionObserverWithSeed(42);
 * await simulateFrames(100); // Simulate 100 random frames
 * // Behavior is EXACTLY the same every time with seed 42
 */
export function mockIntersectionObserverWithSeed(seed: number = Date.now()) {
  const rng = new SeededRandom(seed);
  const viewport = new ViewportSimulator(rng);
  const scroll = new ScrollSimulator(rng);

  // Track observer state
  const observers: Array<{
    callback: IntersectionObserverCallback;
    elements: Map<Element, {
      currentRatio: number;
      isIntersecting: boolean;
      framesSinceChange: number;
      velocity: number; // Rate of ratio change (for realistic transitions)
    }>;
    options?: IntersectionObserverInit;
  }> = [];

  // Simulate viewport state
  const viewportState = viewport.generateViewport();

  /**
   * Generate realistic intersection entry with seeded randomness
   */
  const generateEntry = (
    element: Element,
    lastState: { currentRatio: number; velocity: number }
  ): { entry: IntersectionObserverEntry; newRatio: number; newVelocity: number } => {
    const { currentRatio, velocity } = lastState;

    // Randomly decide if intersection changes this frame
    const shouldChange = rng.nextBool(0.25); // 25% chance of change per frame

    let newRatio = currentRatio;
    let newVelocity = velocity;

    if (shouldChange) {
      // Generate realistic ratio changes
      const changeType = rng.weighted([
        { value: 'sudden-visible', weight: 15 },    // Scroll into view
        { value: 'sudden-hidden', weight: 15 },     // Scroll out of view
        { value: 'gradual-in', weight: 30 },        // Slowly scrolling in
        { value: 'gradual-out', weight: 30 },       // Slowly scrolling out
        { value: 'bounce', weight: 10 }             // User scrolls back and forth
      ]);

      switch (changeType) {
        case 'sudden-visible':
          // Suddenly becomes visible (e.g., scrolled into view)
          newRatio = rng.nextFloat(0.5, 1.0);
          newVelocity = rng.nextFloat(0.1, 0.3);
          break;

        case 'sudden-hidden':
          // Suddenly becomes hidden
          newRatio = 0;
          newVelocity = 0;
          break;

        case 'gradual-in':
          // Gradually increasing visibility
          newVelocity = Math.min(0.05, velocity + rng.nextFloat(0.01, 0.03));
          newRatio = Math.min(1.0, currentRatio + newVelocity);
          break;

        case 'gradual-out':
          // Gradually decreasing visibility
          newVelocity = Math.max(-0.05, velocity - rng.nextFloat(0.01, 0.03));
          newRatio = Math.max(0, currentRatio + newVelocity);
          break;

        case 'bounce':
          // User scrolling back and forth (velocity changes direction)
          newVelocity = -velocity + rng.nextFloat(-0.02, 0.02);
          newRatio = Math.max(0, Math.min(1.0, currentRatio + newVelocity));
          break;
      }
    } else {
      // Continue current trajectory (inertia)
      if (Math.abs(velocity) > 0.001) {
        newVelocity = velocity * 0.95; // Decay
        newRatio = Math.max(0, Math.min(1.0, currentRatio + newVelocity));
      }
    }

    const isIntersecting = newRatio > 0;

    // Generate realistic bounding rects
    const rect = element.getBoundingClientRect();
    const visibleHeight = rect.height * newRatio;

    const entry: IntersectionObserverEntry = {
      target: element,
      isIntersecting,
      intersectionRatio: newRatio,
      boundingClientRect: rect,
      intersectionRect: {
        ...rect,
        height: visibleHeight,
        bottom: rect.top + visibleHeight,
        toJSON: () => ({})
      } as DOMRectReadOnly,
      rootBounds: {
        x: 0,
        y: 0,
        width: viewportState.width,
        height: viewportState.height,
        top: 0,
        left: 0,
        bottom: viewportState.height,
        right: viewportState.width,
        toJSON: () => ({})
      } as DOMRectReadOnly,
      time: Date.now()
    };

    return { entry, newRatio, newVelocity };
  };

  /**
   * Simulate a single frame - randomly trigger observer callbacks
   */
  const simulateFrame = () => {
    observers.forEach(({ callback, elements, options }) => {
      const thresholds = Array.isArray(options?.threshold)
        ? options.threshold
        : [options?.threshold ?? 0];

      const entries: IntersectionObserverEntry[] = [];

      elements.forEach((state, element) => {
        state.framesSinceChange++;

        // Only check occasionally (realistic throttling - ~60fps but observers check less frequently)
        if (state.framesSinceChange < rng.nextInt(1, 4)) {
          return;
        }

        const { entry, newRatio, newVelocity } = generateEntry(element, {
          currentRatio: state.currentRatio,
          velocity: state.velocity
        });

        const oldRatio = state.currentRatio;

        // Check if threshold crossed
        const thresholdCrossed = thresholds.some(threshold => {
          return (
            (oldRatio < threshold && newRatio >= threshold) ||
            (oldRatio >= threshold && newRatio < threshold)
          );
        });

        // Also trigger if state changed significantly (even without threshold crossing)
        const significantChange = Math.abs(newRatio - oldRatio) > 0.15;

        if (thresholdCrossed || significantChange || state.framesSinceChange === 0) {
          entries.push(entry);

          // Update state
          state.currentRatio = newRatio;
          state.isIntersecting = entry.isIntersecting;
          state.velocity = newVelocity;
          state.framesSinceChange = 0;
        }
      });

      if (entries.length > 0) {
        callback(entries, {} as IntersectionObserver);
      }
    });
  };

  // Create mock
  global.IntersectionObserver = vi.fn((callback, options) => {
    const elements = new Map<Element, {
      currentRatio: number;
      isIntersecting: boolean;
      framesSinceChange: number;
      velocity: number;
    }>();

    const observerData = { callback, elements, options };
    observers.push(observerData);

    return {
      observe: vi.fn((element: Element) => {
        // Initial state (random starting visibility - most start hidden)
        const initialRatio = rng.nextBool(0.8) ? 0 : rng.nextFloat(0, 1);

        elements.set(element, {
          currentRatio: initialRatio,
          isIntersecting: initialRatio > 0,
          framesSinceChange: 0,
          velocity: 0
        });

        // Trigger initial callback
        const { entry } = generateEntry(element, {
          currentRatio: initialRatio,
          velocity: 0
        });

        setTimeout(() => callback([entry], {} as IntersectionObserver), 0);
      }),

      unobserve: vi.fn((element: Element) => {
        elements.delete(element);
      }),

      disconnect: vi.fn(() => {
        elements.clear();
      }),

      takeRecords: vi.fn(() => []),
      root: options?.root ?? null,
      rootMargin: options?.rootMargin ?? '',
      thresholds: Array.isArray(options?.threshold)
        ? options.threshold
        : [options?.threshold ?? 0]
    };
  }) as any;

  return {
    /**
     * Simulate N frames of observer updates
     */
    simulateFrames: async (count: number) => {
      for (let i = 0; i < count; i++) {
        simulateFrame();
        await waitForNextFrame();
      }
    },

    /**
     * Simulate random scroll event
     */
    simulateRandomScroll: () => {
      const { deltaY, deltaX } = scroll.generateScrollDelta();
      // Scrolling triggers more frequent checks
      simulateFrame();
    },

    /**
     * Simulate viewport resize
     */
    simulateRandomResize: () => {
      const newViewport = viewport.generateResize(viewportState);
      viewportState.width = newViewport.width;
      viewportState.height = newViewport.height;
      simulateFrame();
    },

    /**
     * Simulate smooth scroll animation
     */
    simulateSmoothScroll: async (targetDelta: number, steps: number = 10) => {
      for (const delta of scroll.generateSmoothScroll(targetDelta, steps)) {
        simulateFrame();
        await waitForNextFrame();
      }
    },

    /**
     * Get current seed (for reproducing bugs)
     */
    getSeed: () => seed,

    /**
     * Get RNG for custom scenarios
     */
    getRng: () => rng,

    /**
     * Get current viewport state
     */
    getViewport: () => ({ ...viewportState })
  };
}

/**
 * Mock MutationObserver with controlled randomness
 *
 * Generates realistic DOM mutation patterns with seeded RNG.
 */
export function mockMutationObserverWithSeed(seed: number = Date.now()) {
  const rng = new SeededRandom(seed);
  const mutationSim = new MutationSimulator(rng);

  const observers: Array<{
    callback: MutationCallback;
    targets: Map<Node, MutationObserverInit>;
  }> = [];

  const createMockMutation = (
    target: Node,
    type: 'attributes' | 'childList' | 'characterData'
  ): MutationRecord => {
    if (type === 'attributes') {
      const { name, oldValue, newValue } = mutationSim.generateAttributeChange();
      return {
        type: 'attributes',
        target,
        attributeName: name,
        oldValue,
        addedNodes: [] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeNamespace: null
      };
    } else if (type === 'childList') {
      const { addedCount, removedCount } = mutationSim.generateChildListChange();

      // Create mock nodes
      const addedNodes = Array.from({ length: addedCount }, () =>
        document.createElement('div')
      );
      const removedNodes = Array.from({ length: removedCount }, () =>
        document.createElement('div')
      );

      return {
        type: 'childList',
        target,
        addedNodes: addedNodes as any,
        removedNodes: removedNodes as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      };
    } else {
      // characterData
      const oldValue = `text-${rng.nextInt(1, 100)}`;
      return {
        type: 'characterData',
        target,
        oldValue,
        addedNodes: [] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null
      };
    }
  };

  global.MutationObserver = vi.fn((callback) => {
    const targets = new Map<Node, MutationObserverInit>();

    const observerData = { callback, targets };
    observers.push(observerData);

    return {
      observe: vi.fn((target: Node, options: MutationObserverInit) => {
        targets.set(target, options);
      }),
      disconnect: vi.fn(() => {
        targets.clear();
      }),
      takeRecords: vi.fn(() => [])
    };
  }) as any;

  /**
   * Simulate random mutations
   */
  const simulateMutations = (count: number = 1) => {
    observers.forEach(({ callback, targets }) => {
      targets.forEach((options, target) => {
        const mutations: MutationRecord[] = [];

        for (let i = 0; i < count; i++) {
          const type = mutationSim.generateMutationType();

          // Only generate mutation if it's observed
          if (
            (type === 'attributes' && options.attributes) ||
            (type === 'childList' && options.childList) ||
            (type === 'characterData' && options.characterData)
          ) {
            mutations.push(createMockMutation(target, type));
          }
        }

        if (mutations.length > 0) {
          callback(mutations, {} as MutationObserver);
        }
      });
    });
  };

  return {
    /**
     * Simulate random mutations over N frames
     */
    simulateFrames: async (frameCount: number) => {
      for (let i = 0; i < frameCount; i++) {
        // Random number of mutations per frame (0-3)
        const mutationCount = rng.nextInt(0, 3);
        if (mutationCount > 0) {
          simulateMutations(mutationCount);
        }
        await waitForNextFrame();
      }
    },

    /**
     * Trigger specific mutation type
     */
    triggerMutation: (type?: 'attributes' | 'childList' | 'characterData') => {
      observers.forEach(({ callback, targets }) => {
        targets.forEach((options, target) => {
          const mutationType = type ?? mutationSim.generateMutationType();
          const mutation = createMockMutation(target, mutationType);
          callback([mutation], {} as MutationObserver);
        });
      });
    },

    getSeed: () => seed,
    getRng: () => rng
  };
}

/**
 * Mock ResizeObserver with controlled randomness
 *
 * Generates realistic resize events with seeded RNG.
 */
export function mockResizeObserverWithSeed(seed: number = Date.now()) {
  const rng = new SeededRandom(seed);
  const viewport = new ViewportSimulator(rng);

  const observers: Array<{
    callback: ResizeObserverCallback;
    elements: Map<Element, { width: number; height: number }>;
  }> = [];

  global.ResizeObserver = vi.fn((callback) => {
    const elements = new Map<Element, { width: number; height: number }>();

    const observerData = { callback, elements };
    observers.push(observerData);

    return {
      observe: vi.fn((element: Element) => {
        // Initial random size
        const initialSize = {
          width: rng.nextInt(100, 800),
          height: rng.nextInt(50, 600)
        };

        elements.set(element, initialSize);

        // Trigger initial callback
        const entry: ResizeObserverEntry = {
          target: element,
          contentRect: {
            x: 0,
            y: 0,
            width: initialSize.width,
            height: initialSize.height,
            top: 0,
            left: 0,
            bottom: initialSize.height,
            right: initialSize.width,
            toJSON: () => ({})
          } as DOMRectReadOnly,
          borderBoxSize: [] as any,
          contentBoxSize: [] as any,
          devicePixelContentBoxSize: [] as any
        };

        setTimeout(() => callback([entry], {} as ResizeObserver), 0);
      }),

      unobserve: vi.fn((element: Element) => {
        elements.delete(element);
      }),

      disconnect: vi.fn(() => {
        elements.clear();
      })
    };
  }) as any;

  /**
   * Simulate random resize event
   */
  const simulateResize = () => {
    observers.forEach(({ callback, elements }) => {
      const entries: ResizeObserverEntry[] = [];

      elements.forEach((currentSize, element) => {
        // Randomly decide if element resizes
        if (rng.nextBool(0.3)) {
          // Generate realistic resize
          const resizeType = rng.pick(['grow', 'shrink', 'aspect-change']);

          let newWidth = currentSize.width;
          let newHeight = currentSize.height;

          if (resizeType === 'grow') {
            newWidth = Math.floor(currentSize.width * rng.nextFloat(1.1, 1.5));
            newHeight = Math.floor(currentSize.height * rng.nextFloat(1.1, 1.5));
          } else if (resizeType === 'shrink') {
            newWidth = Math.floor(currentSize.width * rng.nextFloat(0.7, 0.9));
            newHeight = Math.floor(currentSize.height * rng.nextFloat(0.7, 0.9));
          } else {
            // Change aspect ratio
            newWidth = Math.floor(currentSize.width * rng.nextFloat(0.8, 1.2));
            newHeight = Math.floor(currentSize.height * rng.nextFloat(0.8, 1.2));
          }

          elements.set(element, { width: newWidth, height: newHeight });

          entries.push({
            target: element,
            contentRect: {
              x: 0,
              y: 0,
              width: newWidth,
              height: newHeight,
              top: 0,
              left: 0,
              bottom: newHeight,
              right: newWidth,
              toJSON: () => ({})
            } as DOMRectReadOnly,
            borderBoxSize: [] as any,
            contentBoxSize: [] as any,
            devicePixelContentBoxSize: [] as any
          });
        }
      });

      if (entries.length > 0) {
        callback(entries, {} as ResizeObserver);
      }
    });
  };

  return {
    /**
     * Simulate random resizes over N frames
     */
    simulateFrames: async (count: number) => {
      for (let i = 0; i < count; i++) {
        simulateResize();
        await waitForNextFrame();
      }
    },

    /**
     * Trigger viewport resize (affects all elements)
     */
    simulateViewportResize: () => {
      simulateResize();
    },

    getSeed: () => seed,
    getRng: () => rng
  };
}

/**
 * Create a full seeded mock environment with all observers
 */
export function mockAllObserversWithSeed(seed: number = Date.now()) {
  return {
    intersection: mockIntersectionObserverWithSeed(seed),
    mutation: mockMutationObserverWithSeed(seed + 1),
    resize: mockResizeObserverWithSeed(seed + 2),
    seed
  };
}
