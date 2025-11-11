/**
 * Test: useRef hook transformation
 * Expected: [Ref] attribute on ElementRef fields
 */
import { useRef, useState } from '@minimact/core';

export function UseRefTest() {
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const [value, setValue] = useState('');

  return (
    <div>
      <input ref={inputRef} value={value} placeholder="Type here..." />
      <button ref={buttonRef} onClick={() => inputRef.current.focus()}>
        Focus Input
      </button>
    </div>
  );
}
