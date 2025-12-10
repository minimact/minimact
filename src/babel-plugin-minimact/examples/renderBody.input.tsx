/**
 * Example: renderBody.cjs - Generates Render() method body
 *
 * Handles different return types:
 * - JSXElement → generateJSXElement()
 * - JSXFragment → generateJSXElement()
 * - Ternary → generateConditional()
 * - Logical && → generateShortCircuit()
 * - Array.map() → generateMapExpression()
 * - null/undefined → VText("")
 */
import { useState } from '@minimact/core';

export function RenderBodyExample() {
  const [visible, setVisible] = useState(true);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Local computed value → appears at top of Render() method
  const doubled = count * 2;
  const hasItems = items.length > 0;

  // 1. JSXElement return → generateJSXElement
  return (
    <div className="container">
      <header>
        <h1>Title</h1>
      </header>

      <main>
        {/* 2. Logical && → generateShortCircuit */}
        {visible && <p>Count is {count}, doubled is {doubled}</p>}

        {/* 3. Ternary → generateConditional */}
        {hasItems ? (
          <ul>
            {/* 4. Array.map() → generateMapExpression */}
            {items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No items</p>
        )}

        {/* 5. Nested ternary */}
        {mode === 'view' ? (
          <span>Viewing</span>
        ) : mode === 'edit' ? (
          <span>Editing</span>
        ) : (
          <span>Unknown</span>
        )}
      </main>

      <footer>
        <button onClick={() => setCount(count + 1)}>+</button>
        <button onClick={() => setVisible(!visible)}>Toggle</button>
      </footer>
    </div>
  );
}

// Component returning JSXFragment
export function FragmentExample() {
  const [items, setItems] = useState(['x', 'y']);

  // JSXFragment return → generateJSXElement handles fragments
  return (
    <>
      <span>First</span>
      <span>Second</span>
      {items.map(i => <span key={i}>{i}</span>)}
    </>
  );
}

// Component returning conditional at top level
export function ConditionalReturnExample() {
  const [loading, setLoading] = useState(true);

  // Top-level ternary return → generateConditional
  return loading ? (
    <div>Loading...</div>
  ) : (
    <div>Loaded!</div>
  );
}

// Component returning short-circuit at top level
export function ShortCircuitReturnExample() {
  const [show, setShow] = useState(false);

  // Top-level && return → generateShortCircuit
  return show && <div>Shown!</div>;
}

// Component returning map at top level
export function MapReturnExample() {
  const [items, setItems] = useState(['a', 'b']);

  // Top-level map return → generateMapExpression
  return items.map(item => <span key={item}>{item}</span>);
}
