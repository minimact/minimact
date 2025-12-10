/**
 * Example: typescriptToRust.cjs - Transpiles TS to Rust (experimental)
 */
import { useServerTask } from '@minimact/core';

export function TypeScriptToRustExample() {
  // Numeric computation - ideal for Rust
  const computeStats = useServerTask(
    async (numbers: number[]) => {
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;

      const squaredDiffs = numbers.map(n => (n - mean) ** 2);
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      return { sum, mean, variance, stdDev };
    },
    { runtime: 'rust', parallel: true }
  );

  // String processing
  const processText = useServerTask(
    async (text: string) => {
      const words = text.split(' ');
      const filtered = words.filter(w => w.length > 3);
      const upper = filtered.map(w => w.toUpperCase());
      return upper.join(' ');
    },
    { runtime: 'rust' }
  );

  return <div>Rust processing...</div>;
}
