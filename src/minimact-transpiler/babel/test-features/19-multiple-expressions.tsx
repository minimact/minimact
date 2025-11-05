import { useState } from '@minimact/core';

/**
 * Test multiple types of expressions in one component
 */
export function MultipleExpressions() {
  const [count, setCount] = useState<number>(10);
  const [price, setPrice] = useState<number>(19.99);
  const [user, setUser] = useState({ name: 'Alice', age: 30 });

  return (
    <div className="container">
      <h1>Multiple Expression Types</h1>

      {/* Simple identifier */}
      <p>Count: {count}</p>

      {/* Binary expression */}
      <p>Double: {count * 2}</p>

      {/* Complex arithmetic */}
      <p>Complex: {count * 2 + 10}</p>

      {/* Member expression */}
      <p>Name: {user.name}</p>

      {/* Template literal */}
      <p>{`Hello, ${user.name}!`}</p>

      {/* Method call */}
      <p>Price: ${price.toFixed(2)}</p>

      {/* Nested call */}
      <p>Floor: {Math.floor(price * 1.2)}</p>
    </div>
  );
}
