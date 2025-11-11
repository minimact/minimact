import { useState } from '@minimact/core';

export function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Increment
      </button>
    </div>
  );
}
