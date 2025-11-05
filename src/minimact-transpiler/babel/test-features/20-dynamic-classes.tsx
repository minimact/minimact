import { useState } from '@minimact/core';

/**
 * Test dynamic className expressions
 */
export function DynamicClasses() {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('dark');
  const [count, setCount] = useState<number>(5);

  return (
    <div className="container">
      <h1>Dynamic Class Names</h1>

      {/* Static className */}
      <div className="card static">
        Static Classes
      </div>

      {/* Simple dynamic className */}
      <div className={theme}>
        Dynamic Theme Class
      </div>

      {/* Template literal with state */}
      <div className={`theme-${theme}`}>
        Template Literal Class
      </div>

      {/* Ternary for conditional class */}
      <div className={isActive ? 'active' : 'inactive'}>
        Conditional Class
      </div>

      {/* Complex template with multiple bindings */}
      <div className={`card theme-${theme} ${isActive ? 'active' : 'inactive'}`}>
        Complex Template
      </div>

      {/* Multiple classes with expression */}
      <div className={`base-class count-${count} ${theme}-theme`}>
        Multiple Bindings
      </div>

      {/* Logical AND for optional class */}
      <div className={`card ${isActive && 'highlighted'}`}>
        Optional Class
      </div>

      {/* Array join pattern (common in real apps) */}
      <button className={`btn btn-${theme} ${isActive ? 'btn-active' : ''} btn-lg`}>
        Button Classes
      </button>
    </div>
  );
}
