/**
 * Test fixture for chained array methods
 * Tests .filter().map(), .slice().map(), .sort().map() chains
 * This is an edge case that Reluxer needs to handle
 */

import { useState } from '@minimact/core';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  rating: number;
}

export function TestChainedArrayMethods() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn Minimact', done: true, priority: 'high', createdAt: 1000 },
    { id: 2, text: 'Build app', done: false, priority: 'high', createdAt: 2000 },
    { id: 3, text: 'Write tests', done: false, priority: 'medium', createdAt: 3000 },
    { id: 4, text: 'Deploy', done: false, priority: 'low', createdAt: 4000 },
    { id: 5, text: 'Celebrate', done: false, priority: 'low', createdAt: 5000 },
  ]);

  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: 'Laptop', price: 999, category: 'Electronics', inStock: true, rating: 4.5 },
    { id: 2, name: 'Phone', price: 699, category: 'Electronics', inStock: true, rating: 4.8 },
    { id: 3, name: 'Headphones', price: 199, category: 'Electronics', inStock: false, rating: 4.2 },
    { id: 4, name: 'Shirt', price: 49, category: 'Clothing', inStock: true, rating: 4.0 },
    { id: 5, name: 'Pants', price: 79, category: 'Clothing', inStock: true, rating: 3.9 },
  ]);

  const [showCompleted, setShowCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxItems, setMaxItems] = useState(10);

  return (
    <div className="chained-methods-test">
      <h2>Chained Array Methods Test</h2>

      {/* Simple filter + map */}
      <section>
        <h3>Filter + Map (incomplete todos)</h3>
        <ul>
          {todos
            .filter(todo => !todo.done)
            .map(todo => (
              <li key={todo.id}>{todo.text}</li>
            ))}
        </ul>
      </section>

      {/* Filter with toggle + map */}
      <section>
        <h3>Conditional Filter + Map</h3>
        <label>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)}
          />
          Show completed
        </label>
        <ul>
          {todos
            .filter(todo => showCompleted || !todo.done)
            .map(todo => (
              <li key={todo.id} className={todo.done ? 'done' : ''}>
                {todo.text}
              </li>
            ))}
        </ul>
      </section>

      {/* Sort + map */}
      <section>
        <h3>Sort + Map (by priority)</h3>
        <ul>
          {[...todos]
            .sort((a, b) => {
              const priority = { high: 0, medium: 1, low: 2 };
              return priority[a.priority] - priority[b.priority];
            })
            .map(todo => (
              <li key={todo.id}>
                [{todo.priority}] {todo.text}
              </li>
            ))}
        </ul>
      </section>

      {/* Slice + map */}
      <section>
        <h3>Slice + Map (first 3)</h3>
        <ul>
          {todos
            .slice(0, 3)
            .map(todo => (
              <li key={todo.id}>{todo.text}</li>
            ))}
        </ul>
      </section>

      {/* Filter + sort + map */}
      <section>
        <h3>Filter + Sort + Map (incomplete, by date)</h3>
        <ul>
          {todos
            .filter(todo => !todo.done)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(todo => (
              <li key={todo.id}>
                {todo.text} (created: {todo.createdAt})
              </li>
            ))}
        </ul>
      </section>

      {/* Filter + slice + map */}
      <section>
        <h3>Filter + Slice + Map (in stock, first 3)</h3>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
        </select>
        <ul>
          {products
            .filter(p => p.inStock)
            .filter(p => !categoryFilter || p.category === categoryFilter)
            .slice(0, 3)
            .map(product => (
              <li key={product.id}>
                {product.name} - ${product.price}
              </li>
            ))}
        </ul>
      </section>

      {/* Filter + sort + slice + map (full chain) */}
      <section>
        <h3>Full Chain: Filter + Sort + Slice + Map</h3>
        <input
          type="number"
          value={maxItems}
          onChange={(e) => setMaxItems(parseInt(e.target.value) || 5)}
          min={1}
          max={10}
        />
        <div className="product-grid">
          {products
            .filter(p => p.inStock && p.rating >= 4.0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, maxItems)
            .map(product => (
              <div key={product.id} className="product-card">
                <h4>{product.name}</h4>
                <p className="price">${product.price}</p>
                <p className="rating">⭐ {product.rating}</p>
                <span className="category">{product.category}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Map with nested filter + map */}
      <section>
        <h3>Nested Maps with Filter</h3>
        {['high', 'medium', 'low'].map(priority => (
          <div key={priority} className="priority-group">
            <h4>{priority} priority</h4>
            <ul>
              {todos
                .filter(t => t.priority === priority)
                .map(todo => (
                  <li key={todo.id}>{todo.text}</li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Reduce-like pattern with filter + length */}
      <section>
        <h3>Filter for Count</h3>
        <p>Incomplete high priority: {todos.filter(t => !t.done && t.priority === 'high').length}</p>
        <p>In-stock electronics: {products.filter(p => p.inStock && p.category === 'Electronics').length}</p>
      </section>
    </div>
  );
}
