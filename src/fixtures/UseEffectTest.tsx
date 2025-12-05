/**
 * Test: useEffect hook transformation
 * Expected: [OnStateChanged("stateName")] attribute on methods
 */
import { useState, useEffect } from '@minimact/core';

export function UseEffectTest() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log('Count changed to: ' + count);
  }, [count]);

  useEffect(() => {
    console.log('Message updated: ' + message);
  }, [message]);

  return (
    <div>
      <h1>Count: {count}</h1>
      <p>Message: {message}</p>
    </div>
  );
}
