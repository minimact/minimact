/**
 * Example: jsx.cjs - Converts JSX to VElement/VText C# constructors
 *
 * Features covered:
 * - Basic elements with attributes (className → class)
 * - Event handlers (onClick, onInput)
 * - String and expression attributes
 * - Style objects → CSS strings
 * - ref attribute
 * - Children: text, elements, expressions
 * - Mixed content (text + expression merged)
 * - Fragments
 * - Plugin elements
 * - Component elements (Lifted State Pattern)
 * - markdown attribute
 * - Spread props (→ RuntimeHelpers)
 * - Custom hook UI variables
 * - key attribute (skipped, for hot reload only)
 */
import { useState, useRef, useMarkdown } from '@minimact/core';
import { useCounter } from './hooks/useCounter';

export function JsxExample() {
  const [title, setTitle] = useState('Hello');
  const [items, setItems] = useState(['a', 'b', 'c']);
  const [isActive, setIsActive] = useState(true);
  const [dynamicProps, setDynamicProps] = useState({ disabled: false });
  const inputRef = useRef(null);
  const [markdown, setMarkdown] = useMarkdown('# Hello');

  // Custom hook with UI - returns [count, increment, decrement, reset, counterUI]
  const [count, increment, , , counterUI] = useCounter('myCounter', 0);

  return (
    <div className="container" id="main">

      {/* 1. Basic element with text content */}
      <h1>Static Title</h1>

      {/* 2. Element with expression child */}
      <h2>{title}</h2>

      {/* 3. Mixed content - text and expressions merged into interpolated string */}
      <p>Hello, {title}! You have {count} items.</p>

      {/* 4. Multiple children including elements */}
      <p>
        Hello, <strong>world</strong>!
      </p>

      {/* 5. Self-closing element with attributes */}
      <input type="text" placeholder="Enter text" />

      {/* 6. Event handler → Handle0 method */}
      <button onClick={() => setTitle('Clicked')}>Click me</button>

      {/* 7. Style object → CSS string */}
      <div style={{ color: 'red', marginTop: 20, backgroundColor: 'blue' }}>
        Styled content
      </div>

      {/* 8. ref attribute */}
      <input ref={inputRef} type="text" />

      {/* 9. Conditional && rendering */}
      {isActive && <span className="badge">Active</span>}

      {/* 10. Ternary conditional */}
      {isActive ? <span>Yes</span> : <span>No</span>}

      {/* 11. List rendering with key (key is skipped in output) */}
      <ul>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {/* 12. Fragment */}
      <>
        <span>First</span>
        <span>Second</span>
      </>

      {/* 13. Nested elements */}
      <div className="card">
        <header>
          <h3>Card Title</h3>
        </header>
        <main>
          <p>Card content</p>
        </main>
      </div>

      {/* 14. Plugin element → PluginNode */}
      <Plugin name="chart" version="1.0" state={items} config={{ theme: 'dark' }} />

      {/* 15. Component element (Lifted State Pattern) → VComponentWrapper */}
      <Component name="Counter" state={{ count: 0 }}>
        <CounterDisplay />
      </Component>

      {/* 16. markdown attribute → DivRawHtml with MarkdownHelper */}
      <div markdown>{markdown}</div>

      {/* 17. Spread props → RuntimeHelpers.CreateElement */}
      <button {...dynamicProps} onClick={() => {}}>Dynamic Button</button>

      {/* 18. Custom hook UI variable → VComponentWrapper */}
      {counterUI}

    </div>
  );
}
