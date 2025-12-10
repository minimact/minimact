/**
 * Example: hookSignature.cjs - Tracks hook changes between transpilations
 *
 * This file shows the "after" state. The "before" state would have:
 * - Only one useState (count)
 * - useEffect with only [count] dependency
 */
import { useState, useEffect, useRef } from '@minimact/core';

export function HookSignatureExample() {
  // Hook 0: useState - unchanged
  const [count, setCount] = useState(0);

  // Hook 1: useState - NEW (added)
  const [name, setName] = useState('');

  // Hook 2: useRef - NEW (added)
  const inputRef = useRef(null);

  // Hook 3: useEffect - CHANGED (new dependency added)
  useEffect(() => {
    console.log('Count or name changed:', count, name);
  }, [count, name]); // was: [count]

  return (
    <div>
      <input ref={inputRef} value={name} />
      <p>Count: {count}</p>
    </div>
  );
}
