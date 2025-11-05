/**
 * Edge Case Test: Complex Expressions in Loop Templates
 *
 * Tests binary operations, method calls, and complex expressions in .map() bodies
 * Key Issue: loopTemplates.cjs TODO comment - may not extract to template slots correctly
 * File: extractors/loopTemplates.cjs:~line 100
 */

import { useState } from 'minimact';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  priority: number;
  dueDate: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  taxRate: number;
  discount: number;
}

export function ComplexLoopExpressions() {
  const [todos] = useState<TodoItem[]>([
    { id: 1, text: 'Buy groceries', completed: false, priority: 2, dueDate: '2024-12-01' },
    { id: 2, text: 'Finish project', completed: true, priority: 1, dueDate: '2024-11-30' },
    { id: 3, text: 'Call mom', completed: false, priority: 3, dueDate: '2024-12-05' }
  ]);

  const [products] = useState<Product[]>([
    { id: 1, name: 'Widget', price: 99.99, taxRate: 0.08, discount: 0.1 },
    { id: 2, name: 'Gadget', price: 149.99, taxRate: 0.08, discount: 0.15 },
    { id: 3, name: 'Tool', price: 79.99, taxRate: 0.08, discount: 0.05 }
  ]);

  return (
    <div>
      <h1>Complex Loop Expression Tests</h1>
      <p className="info">
        Testing binary operations, method calls, and complex expressions in .map() bodies
      </p>

      {/* Test Case 1: Binary Expression - Addition */}
      <div className="test-case">
        <h3>Test 1: Binary Expression (todo.priority + 1)</h3>
        <ul>
          {todos.map(todo => (
            <li key={todo.id}>
              {todo.text} - Priority Level: {todo.priority + 1}
            </li>
          ))}
        </ul>
        <p className="expected">Expected: Priority displayed as 3, 2, 4</p>
      </div>

      {/* Test Case 2: Method Call - toUpperCase() */}
      <div className="test-case">
        <h3>Test 2: Method Call (todo.text.toUpperCase())</h3>
        <ul>
          {todos.map(todo => (
            <li key={todo.id}>
              {todo.text.toUpperCase()}
            </li>
          ))}
        </ul>
        <p className="expected">Expected: All text in UPPERCASE</p>
      </div>

      {/* Test Case 3: Complex Calculation */}
      <div className="test-case">
        <h3>Test 3: Complex Math (price * (1 + tax) * (1 - discount))</h3>
        <ul>
          {products.map(product => (
            <li key={product.id}>
              {product.name}: ${(product.price * (1 + product.taxRate) * (1 - product.discount)).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Test Case 4: Multiple Binary Operations */}
      <div className="test-case">
        <h3>Test 4: Multiple Operations</h3>
        {todos.map((todo, index) => (
          <div key={todo.id}>
            Item #{index + 1} of {todos.length}: {todo.text} (Priority: {todo.priority * 10}%)
          </div>
        ))}
      </div>

      {/* Test Case 5: String Concatenation */}
      <div className="test-case">
        <h3>Test 5: String Concatenation</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.id + '. ' + todo.text}
          </div>
        ))}
      </div>

      {/* Test Case 6: Comparison Operators */}
      <div className="test-case">
        <h3>Test 6: Comparison in Expression</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.text} - {todo.priority > 2 ? 'Low Priority' : 'High Priority'}
          </div>
        ))}
      </div>

      {/* Test Case 7: Logical AND with Property Access */}
      <div className="test-case">
        <h3>Test 7: Logical AND</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.text}
            {todo.completed && ' ✓'}
            {!todo.completed && ' ○'}
          </div>
        ))}
      </div>

      {/* Test Case 8: Nested Property Access with Methods */}
      <div className="test-case">
        <h3>Test 8: Chained Method Calls</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.text.substring(0, 10).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Test Case 9: Arithmetic with Index */}
      <div className="test-case">
        <h3>Test 9: Index Arithmetic</h3>
        {todos.map((todo, index) => (
          <div key={todo.id}>
            Row {index * 2 + 1}: {todo.text}
          </div>
        ))}
      </div>

      {/* Test Case 10: Modulo Operation */}
      <div className="test-case">
        <h3>Test 10: Modulo for Alternating Rows</h3>
        {todos.map((todo, index) => (
          <div key={todo.id} className={index % 2 === 0 ? 'even' : 'odd'}>
            {todo.text}
          </div>
        ))}
      </div>

      {/* Test Case 11: Nullish Coalescing */}
      <div className="test-case">
        <h3>Test 11: Nullish Coalescing (||)</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.dueDate || 'No due date'}
          </div>
        ))}
      </div>

      {/* Test Case 12: Conditional with Method Call */}
      <div className="test-case">
        <h3>Test 12: Ternary with Method Call</h3>
        {todos.map(todo => (
          <div key={todo.id}>
            {todo.completed ? todo.text.toLowerCase() : todo.text.toUpperCase()}
          </div>
        ))}
      </div>

      {/* WORKAROUNDS - Pre-compute complex expressions */}
      <div className="workarounds">
        <h2>✅ Guaranteed Working Workarounds</h2>

        <div className="test-case success">
          <h3>Workaround 1: Pre-compute Binary Expression</h3>
          {todos.map(todo => {
            const priorityLevel = todo.priority + 1;
            return (
              <div key={todo.id}>
                {todo.text} - Level: {priorityLevel}
              </div>
            );
          })}
        </div>

        <div className="test-case success">
          <h3>Workaround 2: Pre-compute Method Call</h3>
          {todos.map(todo => {
            const upperText = todo.text.toUpperCase();
            return (
              <div key={todo.id}>
                {upperText}
              </div>
            );
          })}
        </div>

        <div className="test-case success">
          <h3>Workaround 3: Pre-compute Complex Calculation</h3>
          {products.map(product => {
            const finalPrice = (product.price * (1 + product.taxRate) * (1 - product.discount)).toFixed(2);
            return (
              <div key={product.id}>
                {product.name}: ${finalPrice}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
