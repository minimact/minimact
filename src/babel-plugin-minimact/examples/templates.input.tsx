/**
 * Example: templates.cjs - Extracts text templates for hot reload
 *
 * Output JSON structure:
 * {
 *   "component": "TemplatesExample",
 *   "templates": {
 *     "1.1": {                           // Hex path from pathAssignment
 *       "template": "Hello {0}!",        // Template with placeholders
 *       "bindings": ["name"],            // State variables to bind
 *       "slots": [6],                    // Character positions of placeholders
 *       "path": [0, 0],                  // DOM path for targeting
 *       "type": "dynamic"                // static | dynamic | conditional | transform | nullable
 *     }
 *   }
 * }
 *
 * Features covered:
 * - Simple text binding: {name}
 * - Mixed text and bindings: "Hello {name}!"
 * - Member expression binding: {user.name}
 * - Method call binding (transform): {price.toFixed(2)}
 * - Binary expression binding: {count * price}
 * - Conditional binding (ternary): {isExpanded ? 'Hide' : 'Show'}
 * - Optional chaining (nullable): {viewModel?.userEmail}
 * - Template literal inside JSX: {`${discount * 100}%`}
 * - Static text (no bindings)
 * - Attribute templates: className={`count-${count}`}
 * - Style object templates: style={{ opacity: isVisible ? 1 : 0.5 }}
 * - Conditional JSX traversal: {condition && <div>...</div>}
 */
import { useState } from '@minimact/core';

interface User {
  name: string;
  email: string;
}

interface ViewModel {
  userEmail?: string;
}

export function TemplatesExample() {
  const [name, setName] = useState('World');
  const [count, setCount] = useState(0);
  const [price, setPrice] = useState(19.99);
  const [discount, setDiscount] = useState(0.15);
  const [user, setUser] = useState<User>({ name: 'John', email: 'john@example.com' });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);

  return (
    <div>
      {/* 1. Static text (no bindings) → type: "static" */}
      <h1>Welcome to the Store</h1>

      {/* 2. Simple text binding → type: "dynamic" */}
      <h2>Hello {name}!</h2>

      {/* 3. Mixed text and multiple bindings */}
      <p>You have {count} items in your cart</p>

      {/* 4. Member expression binding → binding: "user.name" */}
      <p>User: {user.name}</p>

      {/* 5. Method call binding (transform) → type: "transform" */}
      <p>Total: ${price.toFixed(2)}</p>

      {/* 6. Binary expression binding → binding: "__expr__:count,price" */}
      <span>Balance: {count * price}</span>

      {/* 7. Conditional binding (ternary) → type: "conditional", conditionalTemplates */}
      <button>{isExpanded ? 'Hide' : 'Show'}</button>

      {/* 8. Optional chaining (nullable) → type: "nullable" */}
      <p>Email: {viewModel?.userEmail}</p>

      {/* 9. Template literal inside JSX → extracts bindings from expressions */}
      <span>{`Discount: ${(discount * 100).toFixed(0)}%`}</span>

      {/* 10. Attribute template: className with template literal */}
      <div className={`count-${count}`}>Count indicator</div>

      {/* 11. Style object template with conditional */}
      <div style={{ fontSize: '32px', opacity: isVisible ? 1 : 0.5 }}>
        Styled content
      </div>

      {/* 12. Style object with dynamic value */}
      <div style={{ color: 'blue', marginTop: count * 10 }}>
        Dynamic margin
      </div>

      {/* 13. Static string attribute */}
      <input placeholder="Enter your name" className="form-input" />

      {/* 14. Simple expression attribute */}
      <input value={name} disabled={!isVisible} />

      {/* 15. Conditional JSX branch → templates extracted from children */}
      {isAdmin && (
        <div className="admin-panel">
          <p>Admin: {user.name}</p>
        </div>
      )}

      {/* 16. Ternary JSX branch → templates from both branches */}
      {isExpanded ? (
        <div className="expanded">
          <p>Expanded content for {name}</p>
        </div>
      ) : (
        <div className="collapsed">
          <span>Click to expand</span>
        </div>
      )}

      {/* 17. Multiple bindings in single text node */}
      <p>Welcome back, {name}. Your balance is ${(count * price).toFixed(2)}.</p>

      {/* 18. Chained method call */}
      <p>Name: {name.trim().toUpperCase()}</p>

      {/* 19. Complex expression binding */}
      <p>Status: {count > 0 ? 'Active' : 'Empty'}</p>
    </div>
  );
}
