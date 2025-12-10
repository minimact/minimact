/**
 * Example: processComponent.cjs - Main orchestrator for component processing
 */
import { useState, useEffect, useRef, useServerTask } from '@minimact/core';

interface User {
  id: number;
  name: string;
  email: string;
}

// Top-level constant
const DEFAULT_PAGE_SIZE = 10;

// Top-level helper function
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function ProcessComponentExample({ initialUser }: { initialUser: User }) {
  // Hooks extracted by extractHook()
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState<string[]>([]);
  const inputRef = useRef(null);

  // Server task extracted
  const fetchItems = useServerTask(async (userId: number) => {
    const response = await fetch(`/api/users/${userId}/items`);
    return await response.json();
  });

  // Effect extracted
  useEffect(() => {
    fetchItems(user.id);
  }, [user.id]);

  // Local variable extracted by extractLocalVariables()
  const itemCount = items.length;
  const today = formatDate(new Date());

  // Event handlers extracted by JSX processing
  return (
    <div className="user-panel">
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Items: {itemCount} (as of {today})</p>
      <input ref={inputRef} placeholder="Search..." />
      <ul>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button onClick={() => setItems([])}>Clear</button>
    </div>
  );
}
