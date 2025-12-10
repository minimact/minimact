/**
 * Example: conditionalElementTemplates.cjs - Extracts complete element structures
 *
 * Output JSON structure:
 * {
 *   "1.2": {
 *     "type": "conditional-element",
 *     "conditionExpression": "isLoggedIn",
 *     "conditionBindings": ["state_0"],           // Maps to state keys
 *     "conditionMapping": { "isLoggedIn": "state_0" },
 *     "evaluable": true,                          // Can client evaluate?
 *     "branches": {
 *       "true": { tag, attributes, children... },
 *       "false": { tag, attributes, children... } or null
 *     },
 *     "operator": "?" or "&&"
 *   }
 * }
 *
 * Evaluable conditions (client-side):
 * - Simple identifiers: myState
 * - Unary negation: !myState
 * - Logical: myState1 && myState2, myState1 || myState2
 * - Comparisons: count > 0, name === "admin"
 * - Member expressions: user.isAdmin
 *
 * NOT evaluable (server required):
 * - Function calls: items.filter(...).length > 0
 * - Complex expressions
 */
import { useState } from '@minimact/core';

interface User {
  name: string;
  email: string;
  isAdmin: boolean;
}

export function ConditionalElementTemplatesExample() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  return (
    <div>
      {/* 1. EVALUABLE: Simple boolean ternary */}
      {/* conditionBindings: ["state_0"], evaluable: true */}
      {isLoggedIn ? <p>Welcome!</p> : <p>Please login</p>}

      {/* 2. NOT EVALUABLE: Truthiness check (object might be null) */}
      {/* evaluable: false - needs truthy check at runtime */}
      {user ? <span>{user.name}</span> : <span>Guest</span>}

      {/* 3. EVALUABLE: Simple boolean && */}
      {/* conditionBindings: ["state_2"], operator: "&&" */}
      {hasPermission && <button>Delete</button>}

      {/* 4. NOT EVALUABLE: Truthy && (object truthiness) */}
      {user && <div className="profile">{user.email}</div>}

      {/* 5. EVALUABLE: Comparison expression */}
      {/* conditionExpression: "items.length > 0", evaluable: true */}
      {items.length > 0 && <p>Found {items.length} items</p>}

      {/* 6. EVALUABLE: Member expression */}
      {/* conditionBindings: ["state_1.isAdmin"] */}
      {user?.isAdmin && <span className="badge">Admin</span>}

      {/* 7. EVALUABLE: Chained boolean && */}
      {/* conditionExpression: "isLoggedIn && hasPermission" */}
      {isLoggedIn && hasPermission && <div>Full access</div>}

      {/* 8. EVALUABLE: Negation */}
      {/* conditionExpression: "!isLoggedIn" */}
      {!isLoggedIn && <button>Sign up</button>}

      {/* 9. EVALUABLE: Comparison with literal */}
      {/* conditionExpression: "count > 5" */}
      {count > 5 && <span>High count!</span>}

      {/* 10. EVALUABLE: Logical OR in condition */}
      {isLoggedIn || hasPermission ? (
        <div>Some access</div>
      ) : (
        <div>No access</div>
      )}

      {/* 11. NESTED: Parent conditional with child conditionals */}
      {/* Both parent and children tracked with parentTemplate reference */}
      {isLoggedIn ? (
        user ? (
          <div>
            <h1>Welcome {user.name}</h1>
            {/* Nested && - parentTemplate points to outer ternary */}
            {hasPermission && <span className="admin">Admin Tools</span>}
          </div>
        ) : (
          <p>Loading user...</p>
        )
      ) : (
        <button onClick={() => setIsLoggedIn(true)}>Login</button>
      )}

      {/* 12. Ternary with null alternate */}
      {/* branches.false: null */}
      {items.length > 0 ? (
        <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
      ) : null}

      {/* 13. Fragment in conditional */}
      {isLoggedIn && (
        <>
          <span>First</span>
          <span>Second</span>
        </>
      )}

      {/* 14. Dynamic attributes in conditional element */}
      {/* attributes: { className: { binding: "user.role" } } */}
      {user && (
        <div className={user.isAdmin ? 'admin' : 'user'}>
          Role-based styling
        </div>
      )}

      {/* 15. Conditional with dynamic text child */}
      {/* children: [{ type: "text", binding: "user.name" }] */}
      {user && <h2>{user.name}</h2>}
    </div>
  );
}
