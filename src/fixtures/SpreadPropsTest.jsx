import { useState } from '@minimact/core';

export function SpreadPropsTest() {
  const [items, setItems] = useState([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' }
  ]);

  return (
    <div className="container">
      <h1>Spread Props Test</h1>
      <ul>
        {items.map(item => (
          <li key={item.id} {...item}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
