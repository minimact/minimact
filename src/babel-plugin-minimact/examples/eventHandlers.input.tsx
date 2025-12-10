/**
 * Example: eventHandlers.cjs - Extracts event handlers
 *
 * Features covered:
 * - Inline arrow functions → Handle0, Handle1, etc.
 * - Named handler references
 * - Parameter extraction: e.target.value → value param
 * - Destructuring: ({ target: { value } }) → e.Target.Value unpacking
 * - Async handlers
 * - Client-only handlers (e.stopPropagation, e.preventDefault, style changes)
 * - Server handlers (setState calls, await)
 * - Curried function detection (error throw)
 * - Map context capture (item, index) for closures
 */
import { useState } from '@minimact/core';

export function EventHandlersExample() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const [items, setItems] = useState(['a', 'b', 'c']);

  // Named handler function
  const handleIncrement = () => {
    setCount(count + 1);
  };

  // Async handler
  const handleSubmit = async () => {
    const response = await fetch('/api/submit', { method: 'POST' });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      {/* 1. Inline arrow → Handle0 */}
      <button onClick={() => setCount(count + 1)}>Increment</button>

      {/* 2. Named reference → handleIncrement */}
      <button onClick={handleIncrement}>Increment Named</button>

      {/* 3. e.target.value → value parameter simplification */}
      <input
        value={text}
        onInput={(e) => setText(e.target.value)}
      />

      {/* 4. Destructured event parameter */}
      <input
        onInput={({ target: { value } }) => setText(value)}
      />

      {/* 5. Client-only handlers (no server roundtrip) */}
      <button onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}>Client Only (stop/prevent)</button>

      <button onClick={(e) => {
        e.currentTarget.style.backgroundColor = 'red';
      }}>Client Only (style change)</button>

      <input onFocus={(e) => {
        e.target.classList.add('focused');
      }} />

      {/* 6. Server handler (modifies state) */}
      <button onClick={() => setCount(0)}>Reset (Server)</button>

      {/* 7. Async handler → async Task return type */}
      <button onClick={handleSubmit}>Submit Async</button>

      {/* 8. Curried function (INVALID - generates error throw) */}
      {/* <button onClick={(e) => (id) => removeItem(id)}>Curried Error</button> */}

      {/* 9. Map context capture → captured params in handler signature */}
      <ul>
        {items.map((item, index) => (
          <li key={item}>
            {item}
            {/* Handler captures item and index from map context */}
            <button onClick={() => setItems(items.filter((_, i) => i !== index))}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* 10. Multiple params in handler */}
      <input
        onInput={(e) => {
          const value = e.target.value;
          setText(value.toUpperCase());
        }}
      />
    </div>
  );
}
