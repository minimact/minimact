/**
 * Real-World Common Patterns Test
 *
 * Tests the most common patterns users encounter in production apps
 */

import { useState } from 'minimact';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export function RealWorldPatterns() {
  const [users] = useState<User[]>([
    { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', age: 30, isActive: true },
    { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', age: 25, isActive: false }
  ]);

  const [products] = useState<Product[]>([
    { id: 1, name: 'Widget', price: 29.99, quantity: 5 },
    { id: 2, name: 'Gadget', price: 49.99, quantity: 3 }
  ]);

  const [searchTerm] = useState('');
  const [count] = useState(42);

  return (
    <div>
      <h1>Real-World Common Patterns</h1>

      {/* Pattern 1: Template literals with multiple expressions */}
      <div className="test-case">
        <h3>Pattern 1: Template Literals with Multiple Expressions</h3>
        {users.map(user => (
          <div key={user.id}>
            {`${user.firstName} ${user.lastName}`}
          </div>
        ))}
        <p className="expected">Expected: John Doe, Jane Smith</p>
      </div>

      {/* Pattern 2: Template literals with method calls */}
      <div className="test-case">
        <h3>Pattern 2: Template Literals + Method Calls</h3>
        {users.map(user => (
          <div key={user.id}>
            {`Name: ${user.firstName.toUpperCase()}`}
          </div>
        ))}
        <p className="expected">Expected: Name: JOHN, Name: JANE</p>
      </div>

      {/* Pattern 3: Template literals with calculations */}
      <div className="test-case">
        <h3>Pattern 3: Template Literals + Calculations</h3>
        {products.map(product => (
          <div key={product.id}>
            {`${product.name}: $${product.price} x ${product.quantity} = $${product.price * product.quantity}`}
          </div>
        ))}
        <p className="expected">Expected: Widget: $29.99 x 5 = $149.95</p>
      </div>

      {/* Pattern 4: Template literals with toFixed() */}
      <div className="test-case">
        <h3>Pattern 4: Template Literals + toFixed()</h3>
        {products.map(product => (
          <div key={product.id}>
            {`Total: $${(product.price * product.quantity).toFixed(2)}`}
          </div>
        ))}
        <p className="expected">Expected: Total: $149.95, Total: $149.97</p>
      </div>

      {/* Pattern 5: Ternary in template literal */}
      <div className="test-case">
        <h3>Pattern 5: Ternary in Template Literal</h3>
        {users.map(user => (
          <div key={user.id}>
            {`${user.firstName} (${user.isActive ? 'Active' : 'Inactive'})`}
          </div>
        ))}
        <p className="expected">Expected: John (Active), Jane (Inactive)</p>
      </div>

      {/* Pattern 6: Array.length in JSX */}
      <div className="test-case">
        <h3>Pattern 6: Array.length Property</h3>
        <p>Total users: {users.length}</p>
        <p>Total products: {products.length}</p>
        <p className="expected">Expected: 2, 2</p>
      </div>

      {/* Pattern 7: Conditional with comparison */}
      <div className="test-case">
        <h3>Pattern 7: Comparison in Ternary</h3>
        {users.map(user => (
          <div key={user.id}>
            {user.age >= 30 ? 'Senior' : 'Junior'}
          </div>
        ))}
        <p className="expected">Expected: Senior, Junior</p>
      </div>

      {/* Pattern 8: Multiple property access (full name) */}
      <div className="test-case">
        <h3>Pattern 8: Property Concatenation</h3>
        {users.map(user => (
          <div key={user.id}>
            {user.firstName + ' ' + user.lastName}
          </div>
        ))}
        <p className="expected">Expected: John Doe, Jane Smith</p>
      </div>

      {/* Pattern 9: Nullish coalescing with property */}
      <div className="test-case">
        <h3>Pattern 9: Nullish Coalescing</h3>
        <p>{searchTerm || 'No search term'}</p>
        {users.map(user => (
          <div key={user.id}>
            {user.email || 'No email'}
          </div>
        ))}
        <p className="expected">Expected: No search term, john@example.com, jane@example.com</p>
      </div>

      {/* Pattern 10: String + number concatenation */}
      <div className="test-case">
        <h3>Pattern 10: String + Number</h3>
        <p>Count: {count}</p>
        <p>Next: {count + 1}</p>
        {users.map((user, index) => (
          <div key={user.id}>
            User #{index + 1}
          </div>
        ))}
        <p className="expected">Expected: Count: 42, Next: 43, User #1, User #2</p>
      </div>

      {/* Pattern 11: Percentage calculations */}
      <div className="test-case">
        <h3>Pattern 11: Percentage Display</h3>
        {users.map(user => (
          <div key={user.id}>
            Age: {user.age} ({(user.age / 100 * 100).toFixed(0)}%)
          </div>
        ))}
      </div>

      {/* Pattern 12: Object property with fallback in template */}
      <div className="test-case">
        <h3>Pattern 12: Template with Fallback</h3>
        {users.map(user => (
          <div key={user.id}>
            {`Email: ${user.email || 'N/A'}`}
          </div>
        ))}
      </div>

      {/* Pattern 13: Multiple ternaries */}
      <div className="test-case">
        <h3>Pattern 13: Nested/Multiple Ternaries</h3>
        {users.map(user => (
          <div key={user.id}>
            Status: {user.isActive ? (user.age >= 30 ? 'Senior Active' : 'Junior Active') : 'Inactive'}
          </div>
        ))}
      </div>

      {/* Pattern 14: Array index access in expression */}
      <div className="test-case">
        <h3>Pattern 14: Array Index Access</h3>
        {users.length > 0 && <p>First user: {users[0].firstName}</p>}
        {users.length > 1 && <p>Second user: {users[1].firstName}</p>}
      </div>

      {/* Pattern 15: Math operations */}
      <div className="test-case">
        <h3>Pattern 15: Math Operations</h3>
        {products.map(product => (
          <div key={product.id}>
            {product.name}: ${Math.round(product.price)}
          </div>
        ))}
      </div>

      {/* Pattern 16: String interpolation with padding */}
      <div className="test-case">
        <h3>Pattern 16: Padded Numbers</h3>
        {users.map((user, index) => (
          <div key={user.id}>
            ID: {String(index + 1).padStart(3, '0')}
          </div>
        ))}
      </div>

      {/* Pattern 17: Boolean to string */}
      <div className="test-case">
        <h3>Pattern 17: Boolean Display</h3>
        {users.map(user => (
          <div key={user.id}>
            {user.firstName}: {String(user.isActive)}
          </div>
        ))}
      </div>

      {/* Pattern 18: Substring/slice in display */}
      <div className="test-case">
        <h3>Pattern 18: String Truncation</h3>
        {users.map(user => (
          <div key={user.id}>
            {user.email.substring(0, 10)}...
          </div>
        ))}
      </div>
    </div>
  );
}
