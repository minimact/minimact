import { useState } from 'react';

export function SimpleCounter() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="counter">
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
