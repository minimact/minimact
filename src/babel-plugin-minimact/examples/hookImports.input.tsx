/**
 * Example: hookImports.cjs - Analyzes imported hooks from other files
 */
import { useState } from '@minimact/core';
import { useCounter } from './hooks/useCounter';
import { useForm } from './hooks/useForm';

export function HookImportsExample() {
  const [title, setTitle] = useState('My App');

  // Using imported custom hooks
  const [count, increment, decrement, counterUI] = useCounter('main', 0);
  const [values, errors, setValue, formUI] = useForm('contact', { name: '', email: '' });

  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      {counterUI}
      <h2>Form</h2>
      {formUI}
    </div>
  );
}
