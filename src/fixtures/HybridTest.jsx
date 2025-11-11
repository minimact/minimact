import { useState } from '@minimact/core';

export function HybridTest() {
  const [items, setItems] = useState([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Cherry' }
  ]);

  const baseProps = { className: 'container', id: 'main' };
  const extraProps = { 'data-testid': 'list-container' };

  return (
    <div {...baseProps} {...extraProps}>
      <h1>Hybrid Approach Test</h1>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
