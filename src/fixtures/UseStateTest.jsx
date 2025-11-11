/**
 * Test: useState hook transformation
 * Expected: [State] attribute on private fields
 */
import { useState } from '@minimact/core';

export function UseStateTest() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('John');
  const [isActive, setIsActive] = useState(true);

  return (
    <div>
      <h1>Count: {count}</h1>
      <p>Name: {name}</p>
      <p>Active: {isActive ? 'Yes' : 'No'}</p>
    </div>
  );
}
