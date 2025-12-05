/**
 * Test: Conditional rendering (ternary and && operators)
 * Expected: Proper C# ternary and null-conditional translation
 */
import { useState } from '@minimact/core';

export function ConditionalRenderingTest() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(0);

  return (
    <div>
      {isLoggedIn ? (
        <div>
          <h1>Welcome back!</h1>
          <button onClick={() => setIsLoggedIn(false)}>Logout</button>
        </div>
      ) : (
        <div>
          <h1>Please log in</h1>
          <button onClick={() => setIsLoggedIn(true)}>Login</button>
        </div>
      )}

      {user && <p>User: {user.name}</p>}

      {count > 0 && <p>Count is positive: {count}</p>}
    </div>
  );
}
