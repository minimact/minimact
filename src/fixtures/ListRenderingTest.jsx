/**
 * Test: List rendering with .map()
 * Expected: Proper C# loop/LINQ translation with key support
 */
import { useState } from '@minimact/core';

export function ListRenderingTest() {
  const [items, setItems] = useState([
    { id: 1, name: 'Apple', price: 1.99 },
    { id: 2, name: 'Banana', price: 0.99 },
    { id: 3, name: 'Orange', price: 1.49 }
  ]);

  const [users, setUsers] = useState([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ]);

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name} - ${item.price}
          </li>
        ))}
      </ul>

      <h1>Users</h1>
      <div>
        {users.map((user, index) => (
          <div key={user.id} className="user-card">
            <h3>{index + 1}. {user.name}</h3>
            <p>{user.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
