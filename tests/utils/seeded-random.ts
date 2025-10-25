/**
 * Seeded Random Number Generator
 *
 * Produces deterministic pseudo-random sequences for reproducible testing.
 * Same seed always produces the exact same sequence of random numbers.
 *
 * Uses Linear Congruential Generator (LCG) algorithm.
 */

export class SeededRandom {
  private seed: number;
  private readonly initialSeed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.initialSeed = seed;
  }

  /**
   * Generate random number between 0 and 1 (exclusive of 1)
   */
  next(): number {
    // LCG formula: seed = (a * seed + c) % m
    // Using values from Numerical Recipes
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate boolean with given probability (0-1)
   *
   * @example
   * rng.nextBool(0.5) // 50% true
   * rng.nextBool(0.8) // 80% true
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random item from array
   */
  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate random element from weighted choices
   *
   * @example
   * rng.weighted([
   *   { value: 'rare', weight: 1 },
   *   { value: 'common', weight: 10 }
   * ]) // 'common' is 10x more likely
   */
  weighted<T>(choices: Array<{ value: T; weight: number }>): T {
    const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
    let random = this.nextFloat(0, totalWeight);

    for (const choice of choices) {
      random -= choice.weight;
      if (random <= 0) {
        return choice.value;
      }
    }

    return choices[choices.length - 1].value;
  }

  /**
   * Generate Gaussian (normal) distribution
   * Uses Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Reset to initial seed (replay sequence from start)
   */
  reset(): void {
    this.seed = this.initialSeed;
  }

  /**
   * Get current seed value
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Create a new SeededRandom with derived seed
   * Useful for branching random sequences
   */
  branch(offset: number = 1): SeededRandom {
    return new SeededRandom(this.initialSeed + offset);
  }
}

/**
 * Create a seeded random generator with optional seed
 * If no seed provided, uses current timestamp (non-deterministic)
 */
export function createSeededRandom(seed?: number): SeededRandom {
  return new SeededRandom(seed ?? Date.now());
}

/**
 * Utility: Generate realistic scroll behavior
 */
export class ScrollSimulator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate realistic scroll delta (simulates user scrolling)
   */
  generateScrollDelta(): { deltaY: number; deltaX: number } {
    // Most scrolls are vertical, some horizontal
    const isVertical = this.rng.nextBool(0.95);

    if (isVertical) {
      // Realistic scroll amounts: mostly small, occasionally large
      const scrollType = this.rng.weighted([
        { value: 'small', weight: 60 },    // 60% - Small scroll (1-100px)
        { value: 'medium', weight: 30 },   // 30% - Medium scroll (100-300px)
        { value: 'large', weight: 10 }     // 10% - Large scroll (300-1000px)
      ]);

      const ranges = {
        small: [10, 100],
        medium: [100, 300],
        large: [300, 1000]
      };

      const [min, max] = ranges[scrollType];
      const deltaY = this.rng.nextInt(min, max) * (this.rng.nextBool() ? 1 : -1);

      return { deltaY, deltaX: 0 };
    } else {
      // Horizontal scroll (rare)
      const deltaX = this.rng.nextInt(10, 200) * (this.rng.nextBool() ? 1 : -1);
      return { deltaY: 0, deltaX };
    }
  }

  /**
   * Generate smooth scroll animation (multiple small steps)
   */
  *generateSmoothScroll(targetDelta: number, steps: number = 10): Generator<number> {
    const easingFactors = Array.from({ length: steps }, (_, i) => {
      // Ease-in-out curve
      const t = (i + 1) / steps;
      return t < 0.5
        ? 2 * t * t
        : -1 + (4 - 2 * t) * t;
    });

    let accumulated = 0;
    for (let i = 0; i < steps; i++) {
      const targetAccumulated = targetDelta * easingFactors[i];
      const delta = targetAccumulated - accumulated;
      accumulated = targetAccumulated;
      yield delta;
    }
  }
}

/**
 * Utility: Generate realistic viewport sizes
 */
export class ViewportSimulator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate realistic viewport dimensions
   */
  generateViewport(): { width: number; height: number } {
    const device = this.rng.weighted([
      { value: 'mobile-portrait', weight: 30 },
      { value: 'mobile-landscape', weight: 10 },
      { value: 'tablet-portrait', weight: 15 },
      { value: 'tablet-landscape', weight: 10 },
      { value: 'desktop-hd', weight: 25 },
      { value: 'desktop-4k', weight: 10 }
    ]);

    const dimensions = {
      'mobile-portrait': { width: this.rng.nextInt(320, 428), height: this.rng.nextInt(568, 926) },
      'mobile-landscape': { width: this.rng.nextInt(568, 926), height: this.rng.nextInt(320, 428) },
      'tablet-portrait': { width: this.rng.nextInt(768, 834), height: this.rng.nextInt(1024, 1194) },
      'tablet-landscape': { width: this.rng.nextInt(1024, 1194), height: this.rng.nextInt(768, 834) },
      'desktop-hd': { width: this.rng.nextInt(1280, 1920), height: this.rng.nextInt(720, 1080) },
      'desktop-4k': { width: this.rng.nextInt(2560, 3840), height: this.rng.nextInt(1440, 2160) }
    };

    return dimensions[device];
  }

  /**
   * Simulate viewport resize (realistic transitions)
   */
  generateResize(
    current: { width: number; height: number }
  ): { width: number; height: number } {
    const resizeType = this.rng.weighted([
      { value: 'rotation', weight: 40 },    // Device rotation
      { value: 'window', weight: 40 },      // Window resize
      { value: 'zoom', weight: 20 }         // Browser zoom
    ]);

    if (resizeType === 'rotation') {
      // Swap width and height
      return { width: current.height, height: current.width };
    } else if (resizeType === 'window') {
      // Resize window by 10-30%
      const factor = this.rng.nextFloat(0.7, 1.3);
      return {
        width: Math.floor(current.width * factor),
        height: Math.floor(current.height * factor)
      };
    } else {
      // Zoom (proportional change)
      const zoomFactor = this.rng.pick([0.8, 0.9, 1.1, 1.25, 1.5]);
      return {
        width: Math.floor(current.width / zoomFactor),
        height: Math.floor(current.height / zoomFactor)
      };
    }
  }
}

/**
 * Utility: Generate realistic DOM mutations
 */
export class MutationSimulator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate realistic mutation type
   */
  generateMutationType(): 'attributes' | 'childList' | 'characterData' {
    return this.rng.weighted([
      { value: 'attributes', weight: 40 },
      { value: 'childList', weight: 50 },
      { value: 'characterData', weight: 10 }
    ]);
  }

  /**
   * Generate realistic attribute change
   */
  generateAttributeChange(): {
    name: string;
    oldValue: string;
    newValue: string;
  } {
    const attribute = this.rng.pick([
      'class',
      'style',
      'data-state',
      'aria-expanded',
      'disabled',
      'hidden',
      'data-value'
    ]);

    const values = {
      class: () => ({
        oldValue: this.rng.pick(['active', 'hidden', 'disabled', '']),
        newValue: this.rng.pick(['active', 'hidden', 'disabled', 'hover'])
      }),
      style: () => ({
        oldValue: `display: ${this.rng.pick(['block', 'none', 'flex'])}`,
        newValue: `display: ${this.rng.pick(['block', 'none', 'flex'])}`
      }),
      'data-state': () => ({
        oldValue: this.rng.pick(['pending', 'active', 'complete']),
        newValue: this.rng.pick(['pending', 'active', 'complete', 'error'])
      }),
      'aria-expanded': () => ({
        oldValue: this.rng.nextBool() ? 'true' : 'false',
        newValue: this.rng.nextBool() ? 'true' : 'false'
      }),
      disabled: () => ({
        oldValue: '',
        newValue: 'disabled'
      }),
      hidden: () => ({
        oldValue: '',
        newValue: 'hidden'
      }),
      'data-value': () => ({
        oldValue: String(this.rng.nextInt(0, 100)),
        newValue: String(this.rng.nextInt(0, 100))
      })
    };

    const { oldValue, newValue } = values[attribute]?.() ?? { oldValue: '', newValue: '' };

    return { name: attribute, oldValue, newValue };
  }

  /**
   * Generate realistic child list change
   */
  generateChildListChange(): {
    addedCount: number;
    removedCount: number;
  } {
    const changeType = this.rng.weighted([
      { value: 'add', weight: 40 },
      { value: 'remove', weight: 30 },
      { value: 'replace', weight: 30 }
    ]);

    if (changeType === 'add') {
      return { addedCount: this.rng.nextInt(1, 5), removedCount: 0 };
    } else if (changeType === 'remove') {
      return { addedCount: 0, removedCount: this.rng.nextInt(1, 3) };
    } else {
      return {
        addedCount: this.rng.nextInt(1, 3),
        removedCount: this.rng.nextInt(1, 3)
      };
    }
  }
}
