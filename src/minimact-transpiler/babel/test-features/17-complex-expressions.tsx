import { useState } from '@minimact/core';

/**
 * Test component for Complex Expression Template extraction
 *
 * Tests all types of complex expressions that should be templated:
 * - Binary expressions (arithmetic)
 * - Unary expressions
 * - Call expressions (non-transform)
 * - Computed member access
 * - Nested complex expressions
 */
export function ComplexExpressions() {
  const [count, setCount] = useState<number>(10);
  const [price, setPrice] = useState<number>(19.99);
  const [tax, setTax] = useState<number>(2.50);
  const [items, setItems] = useState<string[]>(['apple', 'banana', 'orange']);
  const [index, setIndex] = useState<number>(0);

  return (
    <div className="complex-expressions">
      <h1>Complex Expression Templates</h1>

      {/* Binary Expression: Arithmetic */}
      <p>Double: {count * 2}</p>
      <p>Add: {count + 10}</p>
      <p>Complex: {count * 2 + 1}</p>
      <p>Very Complex: {price * 1.2 + tax}</p>

      {/* Unary Expression */}
      <p>Negative: {-count}</p>
      <p>Positive: {+count}</p>
      <p>Not: {!true}</p>

      {/* Call Expression */}
      <p>Floor: {Math.floor(price)}</p>
      <p>Ceil: {Math.ceil(price)}</p>
      <p>Round: {Math.round(price)}</p>
      <p>Max: {Math.max(count, 100)}</p>
      <p>Min: {Math.min(price, tax)}</p>

      {/* Computed Member Access */}
      <p>Item: {items[index]}</p>
      <p>Dynamic: {items[count % 3]}</p>

      {/* Nested Complex */}
      <p>Nested: {Math.floor(price * 1.2 + tax)}</p>
      <p>Very Nested: {Math.round((count * 2 + 10) / 3)}</p>

      {/* Logical in expressions (not JSX conditionals) */}
      <p>And: {count > 5 && count < 20}</p>
      <p>Or: {count < 5 || count > 20}</p>

      {/* Array/Object access chains */}
      <p>Length: {items.length * 2}</p>
      <p>Chained: {items[0].length + items[1].length}</p>
    </div>
  );
}
