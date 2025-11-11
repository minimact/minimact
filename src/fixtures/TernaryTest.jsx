import { useState } from '@minimact/core';

export function TernaryTest() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Ternary Expression Test</h1>

      {/* Simple ternary in text */}
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Hide' : 'Show'} Details
      </button>

      {/* Ternary with static text after */}
      <p>Status: {isExpanded ? 'Expanded' : 'Collapsed'}</p>

      {/* Normal binding for comparison */}
      <p>Count: {count}</p>

      {/* Complex expression (should still be __complex__) */}
      <p>Total: {count.toFixed(2)}</p>
    </div>
  );
}
