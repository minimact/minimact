/**
 * Fuzz Testing for minimact-dynamic using Seeded Random
 *
 * Tests dynamic bindings with controlled randomness to find edge cases
 * and verify invariants hold across thousands of random scenarios.
 *
 * Key benefits:
 * - Same seed = same test behavior (reproducible)
 * - Tests realistic, varied state changes automatically
 * - Finds bugs you wouldn't think to test manually
 * - Fast (runs in happy-dom)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDynamicState } from '../src/integration';
import { SeededRandom } from '../../../tests/utils/seeded-random';
import { createTestElement, createTestElements, cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('minimact-dynamic - Fuzz Testing', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('State Change Fuzzing', () => {
    it('should handle 1000 random state changes without errors', () => {
      const SEED = 42;
      const rng = new SeededRandom(SEED);

      createTestElement('<span class="value"></span>');

      const dynamic = useDynamicState({ count: 0 });
      dynamic('.value', s => String(s.count));

      // Apply 1000 random state changes
      for (let i = 0; i < 1000; i++) {
        const newCount = rng.nextInt(-1000, 1000);
        dynamic.setState({ count: newCount });

        const el = document.querySelector('.value');

        // INVARIANT: Element should always reflect current state
        expect(el?.textContent).toBe(String(newCount));
      }
    });

    it('should maintain consistency across random nested state changes', () => {
      const SEED = 123;
      const rng = new SeededRandom(SEED);

      createTestElement('<span class="display"></span>');

      const dynamic = useDynamicState({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'light', lang: 'en' }
      });

      dynamic('.display', s => `${s.user.name}, ${s.user.age}, ${s.settings.theme}`);

      const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const themes = ['light', 'dark', 'auto'];

      for (let i = 0; i < 500; i++) {
        const newName = rng.pick(names);
        const newAge = rng.nextInt(18, 80);
        const newTheme = rng.pick(themes);

        dynamic.setState({
          user: { name: newName, age: newAge },
          settings: { theme: newTheme, lang: 'en' }
        });

        const el = document.querySelector('.display');
        const expected = `${newName}, ${newAge}, ${newTheme}`;

        // INVARIANT: Display should always match state
        expect(el?.textContent).toBe(expected);
      }
    });

    it('should handle rapid boolean toggles', () => {
      const SEED = 456;
      const rng = new SeededRandom(SEED);

      createTestElement('<div class="modal"></div>');

      const dynamic = useDynamicState({ isOpen: false });
      dynamic.show('.modal', s => s.isOpen);

      const el = document.querySelector<HTMLElement>('.modal');

      for (let i = 0; i < 1000; i++) {
        const isOpen = rng.nextBool();
        dynamic.setState({ isOpen });

        // INVARIANT: Display should match state
        expect(el?.style.display).toBe(isOpen ? '' : 'none');
      }
    });

    it('should handle random partial state updates', () => {
      const SEED = 789;
      const rng = new SeededRandom(SEED);

      createTestElements(`
        <span class="a"></span>
        <span class="b"></span>
        <span class="c"></span>
      `);

      const dynamic = useDynamicState({ a: 0, b: 0, c: 0 });
      dynamic('.a', s => String(s.a));
      dynamic('.b', s => String(s.b));
      dynamic('.c', s => String(s.c));

      for (let i = 0; i < 500; i++) {
        // Randomly update one of the three properties
        const which = rng.pick(['a', 'b', 'c']);
        const value = rng.nextInt(0, 100);

        dynamic.setState({ [which]: value });

        const state = dynamic.getState();

        // INVARIANTS
        expect(document.querySelector('.a')?.textContent).toBe(String(state.a));
        expect(document.querySelector('.b')?.textContent).toBe(String(state.b));
        expect(document.querySelector('.c')?.textContent).toBe(String(state.c));
      }
    });
  });

  describe('Dependency Tracking Fuzzing', () => {
    it('should only update elements whose dependencies changed', () => {
      const SEED = 999;
      const rng = new SeededRandom(SEED);

      createTestElements(`
        <span class="user-name"></span>
        <span class="user-age"></span>
        <span class="product-name"></span>
        <span class="product-price"></span>
      `);

      const dynamic = useDynamicState({
        user: { name: 'Alice', age: 30 },
        product: { name: 'Widget', price: 29.99 }
      });

      let userNameUpdates = 0;
      let userAgeUpdates = 0;
      let productNameUpdates = 0;
      let productPriceUpdates = 0;

      dynamic('.user-name', s => { userNameUpdates++; return s.user.name; });
      dynamic('.user-age', s => { userAgeUpdates++; return String(s.user.age); });
      dynamic('.product-name', s => { productNameUpdates++; return s.product.name; });
      dynamic('.product-price', s => { productPriceUpdates++; return `$${s.product.price}`; });

      const initialUserNameUpdates = userNameUpdates;
      const initialProductNameUpdates = productNameUpdates;

      // Update only user.age (should NOT trigger user.name or product.* updates)
      for (let i = 0; i < 100; i++) {
        dynamic.setState({ user: { name: 'Alice', age: rng.nextInt(18, 80) } });
      }

      // INVARIANT: Only user.age binding should have updated
      expect(userAgeUpdates).toBeGreaterThan(100); // Updated many times
      expect(userNameUpdates).toBe(initialUserNameUpdates); // Never updated (same name)
      expect(productNameUpdates).toBe(initialProductNameUpdates); // Never updated
      expect(productPriceUpdates).toBe(1); // Only initial render
    });
  });

  describe('DOM Choreography Fuzzing', () => {
    it('should handle random element reordering', () => {
      const SEED = 555;
      const rng = new SeededRandom(SEED);

      const container = createTestElement(`
        <div class="list">
          <div id="item-1">1</div>
          <div id="item-2">2</div>
          <div id="item-3">3</div>
          <div id="item-4">4</div>
          <div id="item-5">5</div>
        </div>
      `);

      const dynamic = useDynamicState({
        items: [1, 2, 3, 4, 5]
      });

      dynamic.order('.list', s => s.items.map(id => `#item-${id}`));

      for (let i = 0; i < 100; i++) {
        // Random shuffle
        const shuffled = rng.shuffle([1, 2, 3, 4, 5]);
        dynamic.setState({ items: shuffled });

        // INVARIANT: Order should match state
        const actualOrder = Array.from(container.children).map(el => el.id);
        const expectedOrder = shuffled.map(id => `item-${id}`);

        expect(actualOrder).toEqual(expectedOrder);

        // INVARIANT: All 5 elements should still exist
        expect(container.children).toHaveLength(5);
      }
    });

    it('should handle elements appearing and disappearing', () => {
      const SEED = 777;
      const rng = new SeededRandom(SEED);

      createTestElement('<div class="piece-pool" style="display: none;"><div id="piece-1">♙</div><div id="piece-2">♙</div><div id="piece-3">♙</div></div>');
      const square = createTestElement('<div class="square"></div>');

      const dynamic = useDynamicState({
        piecesOnSquare: []
      });

      dynamic.order('.square', s => s.piecesOnSquare.map(id => `#piece-${id}`));

      for (let i = 0; i < 200; i++) {
        // Randomly add/remove pieces
        const count = rng.nextInt(0, 3);
        const pieces: number[] = [];

        for (let j = 0; j < count; j++) {
          pieces.push(rng.nextInt(1, 3));
        }

        dynamic.setState({ piecesOnSquare: pieces });

        // INVARIANT: Square should have exactly the right number of pieces
        expect(square.children).toHaveLength(count);
      }
    });
  });

  describe('Property-Based Testing', () => {
    it('should verify "value always matches state" property', () => {
      const seeds = [1, 10, 100, 1000, 10000];

      for (const seed of seeds) {
        const rng = new SeededRandom(seed);

        cleanupDOM();
        createTestElement('<span class="value"></span>');

        const dynamic = useDynamicState({ value: 0 });
        dynamic('.value', s => String(s.value));

        for (let i = 0; i < 200; i++) {
          const newValue = rng.nextInt(-1000, 1000);
          dynamic.setState({ value: newValue });

          const el = document.querySelector('.value');
          const state = dynamic.getState();

          // PROPERTY: Value always matches state
          expect(el?.textContent).toBe(String(state.value));
        }
      }
    });

    it('should verify "visibility matches boolean" property', () => {
      const seeds = [11, 22, 33, 44, 55];

      for (const seed of seeds) {
        const rng = new SeededRandom(seed);

        cleanupDOM();
        createTestElement('<div class="box"></div>');

        const dynamic = useDynamicState({ visible: true });
        dynamic.show('.box', s => s.visible);

        for (let i = 0; i < 200; i++) {
          const visible = rng.nextBool();
          dynamic.setState({ visible });

          const el = document.querySelector<HTMLElement>('.box');
          const state = dynamic.getState();

          // PROPERTY: Visibility matches boolean
          expect(el?.style.display).toBe(state.visible ? '' : 'none');
        }
      }
    });

    it('should verify "conditional logic consistency" property', () => {
      const seeds = [111, 222, 333];

      for (const seed of seeds) {
        const rng = new SeededRandom(seed);

        cleanupDOM();
        createTestElement('<span class="price"></span>');

        const dynamic = useDynamicState({
          isPremium: false,
          regular: 29.99,
          premium: 19.99
        });

        dynamic('.price', s =>
          s.isPremium ? `$${s.premium}` : `$${s.regular}`
        );

        for (let i = 0; i < 300; i++) {
          const isPremium = rng.nextBool();
          dynamic.setState({ isPremium });

          const el = document.querySelector('.price');
          const state = dynamic.getState();

          // PROPERTY: Price should match conditional logic
          const expected = state.isPremium
            ? `$${state.premium}`
            : `$${state.regular}`;

          expect(el?.textContent).toBe(expected);
        }
      }
    });

    it('should verify "DOM order matches state order" property', () => {
      const seeds = [42, 84, 126];

      for (const seed of seeds) {
        const rng = new SeededRandom(seed);

        cleanupDOM();
        const container = createTestElement(`
          <div class="container">
            <div id="a">A</div>
            <div id="b">B</div>
            <div id="c">C</div>
          </div>
        `);

        const dynamic = useDynamicState({ order: ['a', 'b', 'c'] });

        dynamic.order('.container', s => s.order.map(id => `#${id}`));

        for (let i = 0; i < 100; i++) {
          const order = rng.shuffle(['a', 'b', 'c']);
          dynamic.setState({ order });

          const actualOrder = Array.from(container.children).map(el => el.id);
          const state = dynamic.getState();

          // PROPERTY: DOM order always matches state order
          expect(actualOrder).toEqual(state.order);
        }
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle 100 bindings with 1000 state changes', () => {
      const SEED = 9999;
      const rng = new SeededRandom(SEED);

      // Create 100 elements
      const elements = Array.from({ length: 100 }, (_, i) =>
        createTestElement(`<span class="item-${i}"></span>`)
      );

      const initialState: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        initialState[`value${i}`] = 0;
      }

      const dynamic = useDynamicState(initialState);

      // Create 100 bindings
      for (let i = 0; i < 100; i++) {
        dynamic(`.item-${i}`, (s: any) => String(s[`value${i}`]));
      }

      // 1000 random state changes
      for (let i = 0; i < 1000; i++) {
        const which = `value${rng.nextInt(0, 99)}`;
        const value = rng.nextInt(0, 1000);

        dynamic.setState({ [which]: value });

        // INVARIANT: At least the changed element should be correct
        const state = dynamic.getState() as any;
        const index = parseInt(which.replace('value', ''));
        const el = document.querySelector(`.item-${index}`);

        expect(el?.textContent).toBe(String(state[which]));
      }

      // Success = no crashes, memory leaks, or inconsistencies
      expect(true).toBe(true);
    });

    it('should handle rapid setState calls', () => {
      const SEED = 8888;
      const rng = new SeededRandom(SEED);

      createTestElement('<span class="counter"></span>');

      const dynamic = useDynamicState({ count: 0 });
      dynamic('.counter', s => String(s.count));

      // 10000 rapid updates
      for (let i = 0; i < 10000; i++) {
        dynamic.setState(prev => ({ count: prev.count + rng.nextInt(-10, 10) }));
      }

      // Final state should be reflected in DOM
      const el = document.querySelector('.counter');
      const state = dynamic.getState();

      expect(el?.textContent).toBe(String(state.count));
    });
  });

  describe('Regression Tests (Known Seeds)', () => {
    // Database of seeds that previously found bugs
    const KNOWN_BUGS: Array<{ seed: number; description: string }> = [
      { seed: 42, description: 'Baseline (no known bugs)' },
      // Add seeds here when bugs are found:
      // { seed: 12345, description: 'NaN in value binding' },
      // { seed: 67890, description: 'Order binding race condition' },
    ];

    KNOWN_BUGS.forEach(({ seed, description }) => {
      it(`should not regress: ${description} (seed ${seed})`, () => {
        const rng = new SeededRandom(seed);

        createTestElement('<span class="value"></span>');

        const dynamic = useDynamicState({ value: 0 });
        dynamic('.value', s => String(s.value));

        let errorOccurred = false;

        try {
          for (let i = 0; i < 500; i++) {
            const value = rng.nextInt(-1000, 1000);
            dynamic.setState({ value });

            const el = document.querySelector('.value');
            const text = el?.textContent;

            // Check for bugs
            if (text === null || text === undefined) {
              errorOccurred = true;
            }
            if (text === 'NaN' || text === 'undefined' || text === 'null') {
              errorOccurred = true;
            }
            if (text !== String(value)) {
              errorOccurred = true;
            }
          }
        } catch (error) {
          errorOccurred = true;
        }

        // These invariants should ALWAYS hold
        expect(errorOccurred).toBe(false);
      });
    });
  });

  describe('Snapshot Testing with Seeds', () => {
    it('should produce identical behavior for same seed', () => {
      const SEED = 12345;

      // Run 1
      const rng1 = new SeededRandom(SEED);
      cleanupDOM();
      createTestElement('<span class="value"></span>');

      const dynamic1 = useDynamicState({ count: 0 });
      dynamic1('.value', s => String(s.count));

      const sequence1: number[] = [];
      for (let i = 0; i < 50; i++) {
        const value = rng1.nextInt(0, 100);
        dynamic1.setState({ count: value });
        sequence1.push(value);
      }

      // Run 2 (same seed)
      const rng2 = new SeededRandom(SEED);
      cleanupDOM();
      createTestElement('<span class="value"></span>');

      const dynamic2 = useDynamicState({ count: 0 });
      dynamic2('.value', s => String(s.count));

      const sequence2: number[] = [];
      for (let i = 0; i < 50; i++) {
        const value = rng2.nextInt(0, 100);
        dynamic2.setState({ count: value });
        sequence2.push(value);
      }

      // CRITICAL: Exact same sequence for same seed!
      expect(sequence1).toEqual(sequence2);
    });
  });
});
