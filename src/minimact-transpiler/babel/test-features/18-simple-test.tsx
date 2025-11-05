import { useState } from '@minimact/core';

/**
 * Very simple test component
 */
export function SimpleTest() {
  const [count, setCount] = useState<number>(5);

  return (
    <div>
      <p>{count * 2}</p>
    </div>
  );
}
