import { useState } from '@minimact/core';
import { Link } from '@minimact/spa';

export default function ListPage() {
  const [items, setItems] = useState<string[]>(['Apple', 'Banana', 'Cherry']);
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem]);
      setNewItem('');
    }
  };

  return (
    <div>
      <h2>Simple List</h2>

      <div style="margin-bottom: 20px;">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add new item..."
          style="padding: 8px; margin-right: 10px; width: 200px;"
        />
        <button onClick={addItem} style="padding: 8px 16px;">
          Add Item
        </button>
      </div>

      <ul style="list-style: none; padding: 0;">
        {items.map((item, index) => (
          <li key={index} style="padding: 10px; margin: 5px 0; background: #f0f0f0; border-radius: 4px;">
            {item}
          </li>
        ))}
      </ul>

      <div style="margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
        <h3>🧭 Navigation Test</h3>
        <p>Click the link below to navigate back to the counter page via SPA navigation (no page reload):</p>
        <Link to="/">← Back to Counter</Link>
      </div>
    </div>
  );
}
