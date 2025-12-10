/**
 * Example: structuralTemplates.cjs - Extracts conditional rendering patterns
 */
import { useState } from '@minimact/core';

export function StructuralTemplatesExample() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);

  return (
    <div>
      {/* Ternary conditional - two branches */}
      {isLoading ? (
        <div className="spinner">Loading...</div>
      ) : (
        <div className="content">Loaded!</div>
      )}

      {/* Logical AND - single branch */}
      {hasError && <div className="error">Something went wrong</div>}

      {/* Nested conditionals */}
      {user ? (
        <div>
          <h1>Welcome {user.name}</h1>
          {user.isAdmin && <span className="badge">Admin</span>}
        </div>
      ) : (
        <button>Login</button>
      )}

      {/* Conditional with expression */}
      {items.length > 0 && (
        <ul>
          {items.map(item => <li>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
