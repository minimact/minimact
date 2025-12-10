/**
 * Example: rustTask.cjs - Generates Rust task bindings
 */
import { useState, useServerTask } from '@minimact/core';

export function RustTaskExample() {
  const [numbers, setNumbers] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [result, setResult] = useState(0);

  // CPU-intensive task with Rust runtime
  const computeSum = useServerTask(
    async (data: number[]) => {
      let sum = 0;
      for (const n of data) {
        sum += n * n;
      }
      return sum;
    },
    { runtime: 'rust', parallel: true }
  );

  // String processing in Rust
  const processStrings = useServerTask(
    async (items: string[]) => {
      return items.map(s => s.toUpperCase()).filter(s => s.length > 3);
    },
    { runtime: 'rust' }
  );

  return (
    <div>
      <button onClick={async () => setResult(await computeSum(numbers))}>
        Compute
      </button>
      <p>Result: {result}</p>
    </div>
  );
}
