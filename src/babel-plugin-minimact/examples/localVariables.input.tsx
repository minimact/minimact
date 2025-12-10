/**
 * Example: localVariables.cjs - Extracts const/let declarations
 */
import { useState } from '@minimact/core';

export function LocalVariablesExample() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [user, setUser] = useState({ name: 'John', score: 100 });

  // Simple computed value
  const doubled = count * 2;

  // Expression with multiple state dependencies
  const total = count + items.length;

  // Array method chains
  const filtered = items.filter(x => x !== 'b');
  const mapped = items.map(x => x.toUpperCase());
  const reduced = items.reduce((acc, x) => acc + x, '');

  // Object property access
  const userName = user.name;
  const userInfo = `${user.name}: ${user.score}`;

  // Conditional expression
  const status = count > 10 ? 'high' : 'low';

  // Destructuring (not extracted as local var - handled differently)
  const { name, score } = user;

  // Function call
  const formatted = formatNumber(count);

  // Complex expression
  const result = items.length > 0 ? items[0].toUpperCase() : 'empty';

  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <p>Total: {total}</p>
      <p>Filtered: {filtered.join(', ')}</p>
      <p>Mapped: {mapped.join(', ')}</p>
      <p>User: {userName}</p>
      <p>Status: {status}</p>
      <p>Result: {result}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toFixed(2);
}
