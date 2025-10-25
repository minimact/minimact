/**
 * Integration Tests for useDynamicState
 *
 * Tests the complete API: value bindings, attributes, classes, styles, visibility, and choreography
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDynamicState } from '../src/integration';
import { createTestElement, createTestElements, cleanupDOM } from '../../../tests/utils/dom-helpers';

describe('useDynamicState', () => {
  afterEach(() => {
    cleanupDOM();
  });

  describe('Value Bindings', () => {
    it('should bind text content to element', () => {
      createTestElement('<span class="price"></span>');

      const dynamic = useDynamicState({ price: 29.99 });
      dynamic('.price', s => `$${s.price}`);

      const el = document.querySelector('.price');
      expect(el?.textContent).toBe('$29.99');
    });

    it('should update when state changes', () => {
      createTestElement('<span class="count"></span>');

      const dynamic = useDynamicState({ count: 0 });
      dynamic('.count', s => `Count: ${s.count}`);

      expect(document.querySelector('.count')?.textContent).toBe('Count: 0');

      dynamic.setState({ count: 5 });

      expect(document.querySelector('.count')?.textContent).toBe('Count: 5');
    });

    it('should handle conditional logic', () => {
      createTestElement('<span class="price"></span>');

      const dynamic = useDynamicState({
        isPremium: false,
        regularPrice: 29.99,
        premiumPrice: 19.99
      });

      dynamic('.price', s =>
        s.isPremium ? `$${s.premiumPrice}` : `$${s.regularPrice}`
      );

      expect(document.querySelector('.price')?.textContent).toBe('$29.99');

      dynamic.setState({ isPremium: true });

      expect(document.querySelector('.price')?.textContent).toBe('$19.99');
    });

    it('should only update when dependencies change', () => {
      createTestElement('<span class="user"></span>');
      createTestElement('<span class="product"></span>');

      const dynamic = useDynamicState({
        user: { name: 'Alice' },
        product: { name: 'Widget' }
      });

      dynamic('.user', s => s.user.name);
      dynamic('.product', s => s.product.name);

      // Update only user (product binding should NOT re-evaluate)
      dynamic.setState({ user: { name: 'Bob' } });

      expect(document.querySelector('.user')?.textContent).toBe('Bob');
      expect(document.querySelector('.product')?.textContent).toBe('Widget');
    });

    it('should handle multiple bindings on different elements', () => {
      createTestElements(`
        <span class="first-name"></span>
        <span class="last-name"></span>
        <span class="full-name"></span>
      `);

      const dynamic = useDynamicState({
        firstName: 'John',
        lastName: 'Doe'
      });

      dynamic('.first-name', s => s.firstName);
      dynamic('.last-name', s => s.lastName);
      dynamic('.full-name', s => `${s.firstName} ${s.lastName}`);

      expect(document.querySelector('.first-name')?.textContent).toBe('John');
      expect(document.querySelector('.last-name')?.textContent).toBe('Doe');
      expect(document.querySelector('.full-name')?.textContent).toBe('John Doe');

      dynamic.setState({ firstName: 'Jane' });

      expect(document.querySelector('.first-name')?.textContent).toBe('Jane');
      expect(document.querySelector('.full-name')?.textContent).toBe('Jane Doe');
      expect(document.querySelector('.last-name')?.textContent).toBe('Doe'); // Unchanged
    });

    it('should handle setState with updater function', () => {
      createTestElement('<span class="count"></span>');

      const dynamic = useDynamicState({ count: 0 });
      dynamic('.count', s => String(s.count));

      dynamic.setState(prev => ({ count: prev.count + 1 }));

      expect(document.querySelector('.count')?.textContent).toBe('1');

      dynamic.setState(prev => ({ count: prev.count + 10 }));

      expect(document.querySelector('.count')?.textContent).toBe('11');
    });
  });

  describe('Attribute Bindings', () => {
    it('should bind attribute value', () => {
      createTestElement('<img class="avatar" src="/default.jpg" />');

      const dynamic = useDynamicState({
        avatarUrl: '/user/alice.jpg'
      });

      dynamic.attr('.avatar', 'src', s => s.avatarUrl);

      const el = document.querySelector('.avatar');
      expect(el?.getAttribute('src')).toBe('/user/alice.jpg');
    });

    it('should update attribute when state changes', () => {
      createTestElement('<a class="link" href="#"></a>');

      const dynamic = useDynamicState({ userId: 123 });

      dynamic.attr('.link', 'href', s => `/user/${s.userId}`);

      expect(document.querySelector('.link')?.getAttribute('href')).toBe('/user/123');

      dynamic.setState({ userId: 456 });

      expect(document.querySelector('.link')?.getAttribute('href')).toBe('/user/456');
    });

    it('should handle data attributes', () => {
      createTestElement('<div class="widget" data-state="idle"></div>');

      const dynamic = useDynamicState({ state: 'loading' });

      dynamic.attr('.widget', 'data-state', s => s.state);

      expect(document.querySelector('.widget')?.getAttribute('data-state')).toBe('loading');
    });

    it('should handle aria attributes', () => {
      createTestElement('<button class="toggle" aria-expanded="false"></button>');

      const dynamic = useDynamicState({ isExpanded: false });

      dynamic.attr('.toggle', 'aria-expanded', s => String(s.isExpanded));

      expect(document.querySelector('.toggle')?.getAttribute('aria-expanded')).toBe('false');

      dynamic.setState({ isExpanded: true });

      expect(document.querySelector('.toggle')?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Class Bindings', () => {
    it('should bind className', () => {
      createTestElement('<button class="button"></button>');

      const dynamic = useDynamicState({ isActive: false });

      dynamic.class('.button', s =>
        s.isActive ? 'button active' : 'button'
      );

      expect(document.querySelector('.button')?.className).toBe('button');

      dynamic.setState({ isActive: true });

      expect(document.querySelector('.button')?.className).toBe('button active');
    });

    it('should handle multiple class states', () => {
      createTestElement('<div class="card"></div>');

      const dynamic = useDynamicState({
        isActive: false,
        isDisabled: false,
        isHovered: false
      });

      dynamic.class('.card', s => {
        const classes = ['card'];
        if (s.isActive) classes.push('active');
        if (s.isDisabled) classes.push('disabled');
        if (s.isHovered) classes.push('hover');
        return classes.join(' ');
      });

      expect(document.querySelector('.card')?.className).toBe('card');

      dynamic.setState({ isActive: true, isHovered: true });

      expect(document.querySelector('.card')?.className).toBe('card active hover');
    });
  });

  describe('Style Bindings', () => {
    it('should bind style property', () => {
      createTestElement('<div class="progress"></div>');

      const dynamic = useDynamicState({ progress: 0 });

      dynamic.style('.progress', 'width', s => `${s.progress}%`);

      const el = document.querySelector<HTMLElement>('.progress');
      expect(el?.style.width).toBe('0%');

      dynamic.setState({ progress: 75 });

      expect(el?.style.width).toBe('75%');
    });

    it('should bind background color based on state', () => {
      createTestElement('<div class="status"></div>');

      const dynamic = useDynamicState({ status: 'success' });

      dynamic.style('.status', 'backgroundColor', s => {
        if (s.status === 'success') return 'green';
        if (s.status === 'error') return 'red';
        return 'gray';
      });

      const el = document.querySelector<HTMLElement>('.status');
      expect(el?.style.backgroundColor).toBe('green');

      dynamic.setState({ status: 'error' });

      expect(el?.style.backgroundColor).toBe('red');
    });

    it('should handle numeric values', () => {
      createTestElement('<div class="box"></div>');

      const dynamic = useDynamicState({ opacity: 1 });

      dynamic.style('.box', 'opacity', s => s.opacity);

      const el = document.querySelector<HTMLElement>('.box');
      expect(el?.style.opacity).toBe('1');

      dynamic.setState({ opacity: 0.5 });

      expect(el?.style.opacity).toBe('0.5');
    });
  });

  describe('Visibility Bindings', () => {
    it('should show/hide element', () => {
      createTestElement('<div class="modal"></div>');

      const dynamic = useDynamicState({ isOpen: false });

      dynamic.show('.modal', s => s.isOpen);

      const el = document.querySelector<HTMLElement>('.modal');
      expect(el?.style.display).toBe('none');

      dynamic.setState({ isOpen: true });

      expect(el?.style.display).toBe('');
    });

    it('should handle conditional visibility', () => {
      createTestElement('<div class="premium-badge"></div>');

      const dynamic = useDynamicState({
        user: { isPremium: false }
      });

      dynamic.show('.premium-badge', s => s.user.isPremium);

      const el = document.querySelector<HTMLElement>('.premium-badge');
      expect(el?.style.display).toBe('none');

      dynamic.setState({ user: { isPremium: true } });

      expect(el?.style.display).toBe('');
    });

    it('should handle complex visibility logic', () => {
      createTestElement('<div class="error"></div>');

      const dynamic = useDynamicState({
        errors: [],
        showErrors: true
      });

      dynamic.show('.error', s => s.showErrors && s.errors.length > 0);

      const el = document.querySelector<HTMLElement>('.error');
      expect(el?.style.display).toBe('none'); // No errors

      dynamic.setState({ errors: ['Error 1'] });

      expect(el?.style.display).toBe(''); // Has errors and showErrors=true

      dynamic.setState({ showErrors: false });

      expect(el?.style.display).toBe('none'); // showErrors=false
    });
  });

  describe('Order Bindings (DOM Choreography)', () => {
    it('should reorder elements based on state', () => {
      const container = createTestElement(`
        <div class="cards">
          <div id="card-1">Card 1</div>
          <div id="card-2">Card 2</div>
          <div id="card-3">Card 3</div>
        </div>
      `);

      const dynamic = useDynamicState({
        order: [1, 2, 3]
      });

      dynamic.order('.cards', s =>
        s.order.map(id => `#card-${id}`)
      );

      // Initial order
      expect(Array.from(container.children).map(el => el.id)).toEqual([
        'card-1',
        'card-2',
        'card-3'
      ]);

      // Reverse order
      dynamic.setState({ order: [3, 2, 1] });

      expect(Array.from(container.children).map(el => el.id)).toEqual([
        'card-3',
        'card-2',
        'card-1'
      ]);
    });

    it('should handle chess piece choreography', () => {
      createTestElement('<div class="piece-pool" style="display: none;"><div id="piece-1">♙</div></div>');
      const e2 = createTestElement('<div class="square" data-pos="e2"></div>');
      const e4 = createTestElement('<div class="square" data-pos="e4"></div>');

      const dynamic = useDynamicState({
        board: [
          { piece: 'piece-1', position: 'e2' }
        ]
      });

      dynamic.order('[data-pos="e2"]', s => {
        const piece = s.board.find(p => p.position === 'e2');
        return piece ? [`#${piece.piece}`] : [];
      });

      dynamic.order('[data-pos="e4"]', s => {
        const piece = s.board.find(p => p.position === 'e4');
        return piece ? [`#${piece.piece}`] : [];
      });

      // Piece starts at e2
      expect(e2.children[0]?.id).toBe('piece-1');
      expect(e4.children).toHaveLength(0);

      // Move piece: e2 → e4
      dynamic.setState({
        board: [{ piece: 'piece-1', position: 'e4' }]
      });

      // Piece now at e4
      expect(e2.children).toHaveLength(0);
      expect(e4.children[0]?.id).toBe('piece-1');
    });

    it('should handle sorting by property', () => {
      const container = createTestElement(`
        <div class="items">
          <div id="item-a" data-priority="3">Item A</div>
          <div id="item-b" data-priority="1">Item B</div>
          <div id="item-c" data-priority="2">Item C</div>
        </div>
      `);

      const dynamic = useDynamicState({
        items: [
          { id: 'a', priority: 3 },
          { id: 'b', priority: 1 },
          { id: 'c', priority: 2 }
        ],
        sortBy: 'priority'
      });

      dynamic.order('.items', s => {
        const sorted = [...s.items].sort((a, b) => a.priority - b.priority);
        return sorted.map(item => `#item-${item.id}`);
      });

      // Sorted by priority: b(1), c(2), a(3)
      expect(Array.from(container.children).map(el => el.id)).toEqual([
        'item-b',
        'item-c',
        'item-a'
      ]);
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      const dynamic = useDynamicState({ count: 5, name: 'Test' });

      const state = dynamic.getState();

      expect(state).toEqual({ count: 5, name: 'Test' });
    });

    it('should handle partial state updates', () => {
      const dynamic = useDynamicState({
        a: 1,
        b: 2,
        c: 3
      });

      dynamic.setState({ b: 99 });

      const state = dynamic.getState();

      expect(state).toEqual({ a: 1, b: 99, c: 3 });
    });

    it('should handle nested state updates', () => {
      const dynamic = useDynamicState({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'light' }
      });

      dynamic.setState({ user: { name: 'Bob', age: 25 } });

      const state = dynamic.getState();

      expect(state.user.name).toBe('Bob');
      expect(state.user.age).toBe(25);
      expect(state.settings.theme).toBe('light'); // Unchanged
    });

    it('should clear all bindings', () => {
      createTestElement('<span class="test"></span>');

      const dynamic = useDynamicState({ value: 'initial' });
      dynamic('.test', s => s.value);

      dynamic.clear();

      // After clear, setState should not update DOM
      dynamic.setState({ value: 'changed' });

      // Element should still show initial value (binding removed)
      expect(document.querySelector('.test')?.textContent).toBe('initial');
    });

    it('should remove specific binding', () => {
      createTestElement('<span class="target"></span>');

      const dynamic = useDynamicState({ value: 'test' });
      dynamic('.target', s => s.value);

      expect(document.querySelector('.target')?.textContent).toBe('test');

      dynamic.remove('.target');

      // After remove, setState should not update this binding
      dynamic.setState({ value: 'changed' });

      expect(document.querySelector('.target')?.textContent).toBe('test'); // Unchanged
    });
  });

  describe('Real-World Examples', () => {
    it('should implement product card with premium pricing', () => {
      createTestElements(`
        <div class="product-card">
          <h3>Cool Gadget</h3>
          <span class="price"></span>
          <span class="badge"></span>
        </div>
      `);

      const dynamic = useDynamicState({
        user: { isPremium: false },
        product: { price: 29.99, factoryPrice: 19.99 }
      });

      dynamic('.price', s =>
        s.user.isPremium
          ? `$${s.product.factoryPrice}`
          : `$${s.product.price}`
      );

      dynamic('.badge', s =>
        s.user.isPremium ? 'PREMIUM' : 'USER'
      );

      expect(document.querySelector('.price')?.textContent).toBe('$29.99');
      expect(document.querySelector('.badge')?.textContent).toBe('USER');

      // Upgrade to premium
      dynamic.setState({ user: { isPremium: true } });

      expect(document.querySelector('.price')?.textContent).toBe('$19.99');
      expect(document.querySelector('.badge')?.textContent).toBe('PREMIUM');
    });

    it('should implement progress bar', () => {
      createTestElement('<div class="progress-bar"></div>');

      const dynamic = useDynamicState({ progress: 0 });

      dynamic.style('.progress-bar', 'width', s => `${s.progress}%`);
      dynamic.style('.progress-bar', 'backgroundColor', s => {
        if (s.progress < 33) return 'red';
        if (s.progress < 66) return 'yellow';
        return 'green';
      });

      const bar = document.querySelector<HTMLElement>('.progress-bar');

      expect(bar?.style.width).toBe('0%');
      expect(bar?.style.backgroundColor).toBe('red');

      dynamic.setState({ progress: 50 });

      expect(bar?.style.width).toBe('50%');
      expect(bar?.style.backgroundColor).toBe('yellow');

      dynamic.setState({ progress: 100 });

      expect(bar?.style.width).toBe('100%');
      expect(bar?.style.backgroundColor).toBe('green');
    });

    it('should implement todo list with filtering', () => {
      const container = createTestElement(`
        <div class="todos">
          <div id="todo-1" data-status="done">Task 1</div>
          <div id="todo-2" data-status="pending">Task 2</div>
          <div id="todo-3" data-status="done">Task 3</div>
          <div id="todo-4" data-status="pending">Task 4</div>
        </div>
      `);

      const dynamic = useDynamicState({
        filter: 'all', // 'all' | 'done' | 'pending'
        todos: [
          { id: 1, status: 'done' },
          { id: 2, status: 'pending' },
          { id: 3, status: 'done' },
          { id: 4, status: 'pending' }
        ]
      });

      dynamic.order('.todos', s => {
        const filtered = s.filter === 'all'
          ? s.todos
          : s.todos.filter(t => t.status === s.filter);

        return filtered.map(t => `#todo-${t.id}`);
      });

      // All todos visible
      expect(container.children).toHaveLength(4);

      // Filter to only done
      dynamic.setState({ filter: 'done' });

      expect(container.children).toHaveLength(2);
      expect(Array.from(container.children).map(el => el.id)).toEqual([
        'todo-1',
        'todo-3'
      ]);

      // Filter to only pending
      dynamic.setState({ filter: 'pending' });

      expect(container.children).toHaveLength(2);
      expect(Array.from(container.children).map(el => el.id)).toEqual([
        'todo-2',
        'todo-4'
      ]);
    });
  });
});
