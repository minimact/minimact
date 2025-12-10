/**
 * Example: hookAnalyzer.cjs / hookClassGenerator.cjs - Custom hook detection and generation
 */
import { useState } from '@minimact/core';

// Custom hook definition
function useCounter(namespace: string, initial: number) {
  const [count, setCount] = useState(initial);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initial);

  const ui = (
    <div className="counter">
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );

  return [count, increment, decrement, reset, ui];
}

// Component using the custom hook
export function CustomHookExample() {
  const [count1, inc1, dec1, reset1, counterUI1] = useCounter('counter1', 0);
  const [count2, inc2, dec2, reset2, counterUI2] = useCounter('counter2', 10);

  return (
    <div>
      <h1>Counter 1: {count1}</h1>
      {counterUI1}
      <h1>Counter 2: {count2}</h1>
      {counterUI2}
    </div>
  );
}
