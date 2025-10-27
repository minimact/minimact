import { useState } from 'minimact';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div id="counter-root">
      <span id="counter-value">{count}</span>
      <button
        id="increment-btn"
        type="button"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
}
