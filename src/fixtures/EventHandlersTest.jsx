/**
 * Test: Event handler transformation
 * Expected: onClick → private void HandleClick_N() methods
 *           Event handlers registered in props as strings
 */
import { useState } from '@minimact/core';

export function EventHandlersTest() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type something..."
      />
    </div>
  );
}
