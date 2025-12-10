/**
 * Example: conditionalElementTemplates.cjs - Extracts conditional rendering
 */
import { useState } from '@minimact/core';

export function ConditionalsExample() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);

  return (
    <div>
      {/* Ternary conditional */}
      {isLoggedIn ? <p>Welcome back!</p> : <p>Please log in</p>}

      {/* Logical AND conditional */}
      {user && <span>Hello, {user.name}</span>}

      {/* Conditional with expression */}
      {items.length > 0 && <ul>{items.map(i => <li>{i}</li>)}</ul>}
    </div>
  );
}
