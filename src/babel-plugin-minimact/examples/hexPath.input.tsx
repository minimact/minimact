/**
 * Example: hexPath.cjs - Generates hex paths for DOM nodes
 */
import { useState } from '@minimact/core';

export function HexPathExample() {
  const [items, setItems] = useState(['A', 'B', 'C']);
  const [showExtra, setShowExtra] = useState(true);

  return (
    <div>                           {/* path: "1" */}
      <header>                      {/* path: "1.1" */}
        <h1>Title</h1>              {/* path: "1.1.1", text: "1.1.1.1" */}
        <nav>                       {/* path: "1.1.2" */}
          <a href="/">Home</a>      {/* path: "1.1.2.1" */}
          <a href="/about">About</a>{/* path: "1.1.2.2" */}
        </nav>
      </header>
      <main>                        {/* path: "1.2" */}
        <ul>                        {/* path: "1.2.1" */}
          {items.map(item => (      /* each item gets unique path */
            <li key={item}>{item}</li>  /* template path: "1.2.1.1" */
          ))}
        </ul>
        {showExtra && (             /* conditional path: "1.2.2" */
          <aside>Extra</aside>      /* path: "1.2.2" (when rendered) */
        )}
      </main>
      <footer>                      {/* path: "1.3" */}
        <p>Footer text</p>          {/* path: "1.3.1" */}
      </footer>
    </div>
  );
}
