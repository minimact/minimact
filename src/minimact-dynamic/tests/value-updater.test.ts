/**
 * Tests for ValueUpdater
 *
 * Tests direct DOM updates (NO VDOM, NO RECONCILIATION)
 * Target: < 1ms per update
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ValueUpdater } from '../src/value-updater';
import { createTestElement, createTestElements, cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('ValueUpdater', () => {
  let updater: ValueUpdater;

  beforeEach(() => {
    updater = new ValueUpdater();
  });

  afterEach(() => {
    cleanupDOM();
  });

  describe('updateValue (Text Content)', () => {
    it('should update text content for single element', () => {
      createTestElement('<span class="price">$0.00</span>');

      updater.updateValue('.price', '$29.99');

      const el = document.querySelector('.price');
      expect(el?.textContent).toBe('$29.99');
    });

    it('should update text content for multiple elements', () => {
      createTestElements(`
        <span class="price">$0.00</span>
        <span class="price">$0.00</span>
        <span class="price">$0.00</span>
      `);

      updater.updateValue('.price', '$19.99');

      const elements = document.querySelectorAll('.price');
      expect(elements).toHaveLength(3);
      elements.forEach(el => {
        expect(el.textContent).toBe('$19.99');
      });
    });

    it('should convert numbers to strings', () => {
      createTestElement('<span class="count"></span>');

      updater.updateValue('.count', 42);

      const el = document.querySelector('.count');
      expect(el?.textContent).toBe('42');
    });

    it('should convert booleans to strings', () => {
      createTestElement('<span class="active"></span>');

      updater.updateValue('.active', true);

      const el = document.querySelector('.active');
      expect(el?.textContent).toBe('true');
    });

    it('should handle empty string', () => {
      createTestElement('<span class="text">Initial</span>');

      updater.updateValue('.text', '');

      const el = document.querySelector('.text');
      expect(el?.textContent).toBe('');
    });

    it('should warn when no elements found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      updater.updateValue('.nonexistent', 'value');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No elements found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('updateAttribute', () => {
    it('should update single attribute', () => {
      createTestElement('<img class="avatar" src="/default.jpg" />');

      updater.updateAttribute('.avatar', 'src', '/new-avatar.jpg');

      const el = document.querySelector('.avatar');
      expect(el?.getAttribute('src')).toBe('/new-avatar.jpg');
    });

    it('should update multiple elements', () => {
      createTestElements(`
        <img class="icon" src="/old.png" />
        <img class="icon" src="/old.png" />
      `);

      updater.updateAttribute('.icon', 'src', '/new.png');

      const elements = document.querySelectorAll('.icon');
      elements.forEach(el => {
        expect(el.getAttribute('src')).toBe('/new.png');
      });
    });

    it('should update data attributes', () => {
      createTestElement('<div class="widget" data-state="idle"></div>');

      updater.updateAttribute('.widget', 'data-state', 'active');

      const el = document.querySelector('.widget');
      expect(el?.getAttribute('data-state')).toBe('active');
    });

    it('should update aria attributes', () => {
      createTestElement('<button class="toggle" aria-expanded="false"></button>');

      updater.updateAttribute('.toggle', 'aria-expanded', 'true');

      const el = document.querySelector('.toggle');
      expect(el?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should create attribute if it does not exist', () => {
      createTestElement('<div class="box"></div>');

      updater.updateAttribute('.box', 'data-new', 'value');

      const el = document.querySelector('.box');
      expect(el?.getAttribute('data-new')).toBe('value');
    });
  });

  describe('updateStyle', () => {
    it('should update single style property', () => {
      createTestElement('<div class="progress"></div>');

      updater.updateStyle('.progress', 'width', '75%');

      const el = document.querySelector<HTMLElement>('.progress');
      expect(el?.style.width).toBe('75%');
    });

    it('should update multiple elements', () => {
      createTestElements(`
        <div class="bar"></div>
        <div class="bar"></div>
      `);

      updater.updateStyle('.bar', 'backgroundColor', 'red');

      const elements = document.querySelectorAll<HTMLElement>('.bar');
      elements.forEach(el => {
        expect(el.style.backgroundColor).toBe('red');
      });
    });

    it('should handle numeric values', () => {
      createTestElement('<div class="box"></div>');

      updater.updateStyle('.box', 'opacity', 0.5);

      const el = document.querySelector<HTMLElement>('.box');
      expect(el?.style.opacity).toBe('0.5');
    });

    it('should handle camelCase properties', () => {
      createTestElement('<div class="text"></div>');

      updater.updateStyle('.text', 'fontSize', '16px');

      const el = document.querySelector<HTMLElement>('.text');
      expect(el?.style.fontSize).toBe('16px');
    });
  });

  describe('updateClass', () => {
    it('should update className', () => {
      createTestElement('<button class="button"></button>');

      updater.updateClass('.button', 'button active');

      const el = document.querySelector('.button');
      expect(el?.className).toBe('button active');
    });

    it('should replace entire className', () => {
      createTestElement('<div class="old class names"></div>');

      updater.updateClass('div', 'new class');

      const el = document.querySelector('div');
      expect(el?.className).toBe('new class');
    });

    it('should handle empty string', () => {
      createTestElement('<div class="some classes"></div>');

      updater.updateClass('div', '');

      const el = document.querySelector('div');
      expect(el?.className).toBe('');
    });

    it('should update multiple elements', () => {
      createTestElements(`
        <span class="badge"></span>
        <span class="badge"></span>
      `);

      updater.updateClass('.badge', 'badge premium');

      const elements = document.querySelectorAll('.badge');
      elements.forEach(el => {
        expect(el.className).toBe('badge premium');
      });
    });
  });

  describe('updateVisibility', () => {
    it('should hide element', () => {
      createTestElement('<div class="modal"></div>');

      updater.updateVisibility('.modal', false);

      const el = document.querySelector<HTMLElement>('.modal');
      expect(el?.style.display).toBe('none');
    });

    it('should show element', () => {
      const el = createTestElement('<div class="modal" style="display: none;"></div>');

      updater.updateVisibility('.modal', true);

      expect(el.style.display).toBe('');
    });

    it('should update multiple elements', () => {
      createTestElements(`
        <div class="item"></div>
        <div class="item"></div>
        <div class="item"></div>
      `);

      updater.updateVisibility('.item', false);

      const elements = document.querySelectorAll<HTMLElement>('.item');
      elements.forEach(el => {
        expect(el.style.display).toBe('none');
      });
    });

    it('should toggle visibility', () => {
      createTestElement('<div class="box"></div>');

      updater.updateVisibility('.box', false);
      let el = document.querySelector<HTMLElement>('.box');
      expect(el?.style.display).toBe('none');

      updater.updateVisibility('.box', true);
      el = document.querySelector<HTMLElement>('.box');
      expect(el?.style.display).toBe('');
    });
  });

  describe('updateOrder (DOM Choreography)', () => {
    it('should reorder children in container', () => {
      const container = createTestElement(`
        <div class="cards">
          <div id="card-1">Card 1</div>
          <div id="card-2">Card 2</div>
          <div id="card-3">Card 3</div>
        </div>
      `);

      // Reverse order
      updater.updateOrder('.cards', ['#card-3', '#card-2', '#card-1']);

      const children = Array.from(container.children);
      expect(children[0].id).toBe('card-3');
      expect(children[1].id).toBe('card-2');
      expect(children[2].id).toBe('card-1');
    });

    it('should move elements without destroying them', () => {
      const container = createTestElement(`
        <div class="list">
          <div id="item-a" data-value="alpha">A</div>
          <div id="item-b" data-value="beta">B</div>
        </div>
      `);

      const originalA = container.querySelector('#item-a');
      const originalB = container.querySelector('#item-b');

      // Swap order
      updater.updateOrder('.list', ['#item-b', '#item-a']);

      const newA = container.querySelector('#item-a');
      const newB = container.querySelector('#item-b');

      // SAME element references (not destroyed and recreated)
      expect(newA).toBe(originalA);
      expect(newB).toBe(originalB);

      // Data preserved
      expect(newA?.getAttribute('data-value')).toBe('alpha');
      expect(newB?.getAttribute('data-value')).toBe('beta');
    });

    it('should handle teleportation (elements outside container)', () => {
      createTestElement('<div class="pool"><div id="piece-1">Piece</div></div>');
      createTestElement('<div class="board"></div>');

      updater.updateOrder('.board', ['#piece-1']);

      const board = document.querySelector('.board');
      const piece = document.querySelector('#piece-1');

      expect(board?.contains(piece!)).toBe(true);
    });

    it('should handle missing elements gracefully', () => {
      const container = createTestElement(`
        <div class="container">
          <div id="exists">Exists</div>
        </div>
      `);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      updater.updateOrder('.container', ['#exists', '#missing', '#also-missing']);

      // Should still have the existing element
      expect(container.children).toHaveLength(1);
      expect(container.children[0].id).toBe('exists');

      // Should warn about missing elements
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Child element not found')
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty order array', () => {
      const container = createTestElement(`
        <div class="container">
          <div id="child-1">Child 1</div>
          <div id="child-2">Child 2</div>
        </div>
      `);

      updater.updateOrder('.container', []);

      // Children should remain (just not reordered)
      expect(container.children).toHaveLength(2);
    });

    it('should warn when container not found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      updater.updateOrder('.nonexistent', ['#child']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Container not found')
      );

      consoleSpy.mockRestore();
    });

    it('should handle complex chess-like choreography', () => {
      // Create chess pieces in pool
      createTestElement(`
        <div class="piece-pool" style="display: none;">
          <div id="piece-white-pawn-1">♙</div>
          <div id="piece-white-pawn-2">♙</div>
          <div id="piece-black-pawn-1">♟</div>
        </div>
      `);

      // Create board squares
      const e2 = createTestElement('<div class="square" data-pos="e2"></div>');
      const e4 = createTestElement('<div class="square" data-pos="e4"></div>');
      const e7 = createTestElement('<div class="square" data-pos="e7"></div>');

      // Initial positions
      updater.updateOrder('[data-pos="e2"]', ['#piece-white-pawn-1']);
      updater.updateOrder('[data-pos="e7"]', ['#piece-black-pawn-1']);

      expect(e2.children[0]?.id).toBe('piece-white-pawn-1');
      expect(e7.children[0]?.id).toBe('piece-black-pawn-1');

      // Move white pawn: e2 → e4
      updater.updateOrder('[data-pos="e2"]', []); // Remove from e2
      updater.updateOrder('[data-pos="e4"]', ['#piece-white-pawn-1']); // Add to e4

      expect(e2.children).toHaveLength(0);
      expect(e4.children[0]?.id).toBe('piece-white-pawn-1');
    });
  });

  describe('Performance', () => {
    it('should update value in < 1ms', () => {
      createTestElement('<span class="target"></span>');

      const start = performance.now();
      updater.updateValue('.target', 'test');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    it('should update 100 elements in < 5ms', () => {
      const elements = Array.from({ length: 100 }, (_, i) =>
        createTestElement(`<span class="item" id="item-${i}"></span>`)
      );

      const start = performance.now();
      updater.updateValue('.item', 'updated');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);

      // Verify all updated
      elements.forEach(el => {
        expect(el.textContent).toBe('updated');
      });
    });
  });
});
