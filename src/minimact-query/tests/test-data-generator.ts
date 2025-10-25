/**
 * Seeded Test Data Generator for minimact-query
 *
 * Generates realistic mock DomElementState data for SQL testing.
 * Uses SeededRandom for reproducible test data.
 */

import { SeededRandom } from '../../../tests/utils/seeded-random';

/**
 * Mock DomElementState for testing (simplified)
 */
export interface MockDomElementState {
  // Basic properties
  element: HTMLElement;
  isIntersecting: boolean;
  intersectionRatio: number;
  childrenCount: number;
  grandChildrenCount: number;
  attributes: Record<string, string>;
  classList: string[];
  exists: boolean;

  // Additional queryable properties
  textContent: string;

  // Mock lifecycle (simplified)
  lifecycle: {
    lifecycleState: 'entering' | 'visible' | 'exiting' | 'hidden';
    timeInState: number;
  };

  // Mock state (simplified)
  state: {
    hover: boolean;
    focus: boolean;
    active: boolean;
  };

  // Mock history (simplified)
  history: {
    changeCount: number;
    hasStabilized: boolean;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Generate realistic mock DOM element states with seeded randomness
 */
export class DomDataGenerator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate a single mock DomElementState
   */
  generateElement(options?: {
    category?: string;
    status?: string;
    id?: string;
  }): MockDomElementState {
    const element = document.createElement('div');

    // Generate attributes
    const attributes: Record<string, string> = {
      id: options?.id ?? `el-${this.rng.nextInt(1000, 9999)}`,
      'data-category': options?.category ?? this.rng.pick(['electronics', 'clothing', 'food', 'books', 'toys']),
      'data-status': options?.status ?? this.rng.pick(['active', 'pending', 'complete', 'error']),
      'data-priority': String(this.rng.nextInt(1, 5)),
      'data-score': String(this.rng.nextInt(0, 100))
    };

    // Generate class list
    const classList = [
      'item',
      this.rng.nextBool(0.5) ? 'featured' : '',
      this.rng.nextBool(0.3) ? 'premium' : '',
      this.rng.nextBool(0.2) ? 'highlighted' : ''
    ].filter(Boolean);

    // Apply attributes and classes to element
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    classList.forEach(cls => element.classList.add(cls));

    return {
      element,
      isIntersecting: this.rng.nextBool(0.6), // 60% visible
      intersectionRatio: this.rng.nextFloat(0, 1),
      childrenCount: this.rng.nextInt(0, 10),
      grandChildrenCount: this.rng.nextInt(0, 50),
      attributes,
      classList,
      exists: true,
      textContent: this.generateText(),

      lifecycle: {
        lifecycleState: this.rng.pick(['entering', 'visible', 'exiting', 'hidden']),
        timeInState: this.rng.nextInt(0, 5000)
      },

      state: {
        hover: this.rng.nextBool(0.2),
        focus: this.rng.nextBool(0.1),
        active: this.rng.nextBool(0.15)
      },

      history: {
        changeCount: this.rng.nextInt(0, 100),
        hasStabilized: this.rng.nextBool(0.7),
        trend: this.rng.pick(['increasing', 'decreasing', 'stable'])
      }
    };
  }

  /**
   * Generate multiple mock elements
   */
  generateElements(count: number, options?: {
    categories?: string[];
    statuses?: string[];
  }): MockDomElementState[] {
    const elements: MockDomElementState[] = [];

    for (let i = 0; i < count; i++) {
      const category = options?.categories
        ? this.rng.pick(options.categories)
        : undefined;

      const status = options?.statuses
        ? this.rng.pick(options.statuses)
        : undefined;

      elements.push(this.generateElement({
        category,
        status,
        id: `el-${i}`
      }));
    }

    return elements;
  }

  /**
   * Generate elements with specific distribution patterns
   */
  generateWithDistribution(spec: {
    total: number;
    distributions: Array<{
      weight: number;
      category: string;
      status?: string;
    }>;
  }): MockDomElementState[] {
    const elements: MockDomElementState[] = [];

    for (let i = 0; i < spec.total; i++) {
      const { category, status } = this.rng.weighted(
        spec.distributions.map(d => ({ value: d, weight: d.weight }))
      );

      elements.push(this.generateElement({
        category,
        status,
        id: `el-${i}`
      }));
    }

    return elements;
  }

  /**
   * Generate hierarchical elements (parent-child relationships)
   */
  generateHierarchy(spec: {
    parents: number;
    childrenPerParent: [number, number]; // [min, max]
  }): {
    parents: MockDomElementState[];
    children: Map<string, MockDomElementState[]>;
  } {
    const parents: MockDomElementState[] = [];
    const children = new Map<string, MockDomElementState[]>();

    for (let i = 0; i < spec.parents; i++) {
      const parent = this.generateElement({
        id: `parent-${i}`,
        category: 'parent'
      });

      parents.push(parent);

      const childCount = this.rng.nextInt(...spec.childrenPerParent);
      const parentChildren: MockDomElementState[] = [];

      for (let j = 0; j < childCount; j++) {
        const child = this.generateElement({
          id: `child-${i}-${j}`,
          category: 'child'
        });

        // Set up parent-child relationship
        parent.element.appendChild(child.element);
        parentChildren.push(child);
      }

      children.set(parent.attributes.id, parentChildren);
    }

    return { parents, children };
  }

  /**
   * Generate numeric test data (for aggregation testing)
   */
  generateNumericData(count: number, spec: {
    property: string;
    distribution: 'uniform' | 'gaussian' | 'bimodal';
    range?: [number, number];
    mean?: number;
    stdDev?: number;
  }): MockDomElementState[] {
    const elements: MockDomElementState[] = [];

    for (let i = 0; i < count; i++) {
      const element = this.generateElement({ id: `num-${i}` });

      let value: number;

      if (spec.distribution === 'uniform') {
        const [min, max] = spec.range ?? [0, 100];
        value = this.rng.nextInt(min, max);
      } else if (spec.distribution === 'gaussian') {
        value = Math.round(this.rng.nextGaussian(spec.mean ?? 50, spec.stdDev ?? 15));
      } else {
        // Bimodal: two peaks
        value = this.rng.nextBool()
          ? this.rng.nextGaussian(30, 10)
          : this.rng.nextGaussian(70, 10);
      }

      element.attributes[spec.property] = String(value);
      elements.push(element);
    }

    return elements;
  }

  /**
   * Generate time-series data (for history/trend testing)
   */
  generateTimeSeries(count: number, pattern: 'increasing' | 'decreasing' | 'oscillating' | 'random'): MockDomElementState[] {
    const elements: MockDomElementState[] = [];

    for (let i = 0; i < count; i++) {
      const element = this.generateElement({ id: `ts-${i}` });

      let changeCount: number;

      if (pattern === 'increasing') {
        changeCount = i * 5 + this.rng.nextInt(0, 5);
      } else if (pattern === 'decreasing') {
        changeCount = (count - i) * 5 + this.rng.nextInt(0, 5);
      } else if (pattern === 'oscillating') {
        changeCount = Math.round(50 + 30 * Math.sin(i / 5)) + this.rng.nextInt(-5, 5);
      } else {
        changeCount = this.rng.nextInt(0, 200);
      }

      element.history.changeCount = changeCount;
      element.attributes['data-index'] = String(i);
      elements.push(element);
    }

    return elements;
  }

  /**
   * Generate text content
   */
  private generateText(): string {
    const templates = [
      'Product {0}',
      'Item {0}',
      'Widget {0}',
      'Card {0}',
      'Element {0}'
    ];

    const template = this.rng.pick(templates);
    const number = this.rng.nextInt(1, 1000);
    return template.replace('{0}', String(number));
  }
}

/**
 * Create a seeded DOM data generator
 */
export function createDomDataGenerator(seed: number = Date.now()): DomDataGenerator {
  return new DomDataGenerator(new SeededRandom(seed));
}
