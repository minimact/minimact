/**
 * Feature Test: Binary Expressions
 *
 * Tests binary operations in text and attributes.
 *
 * Operators: +, -, *, /, %, <, >, <=, >=, ===, !==, &&, ||
 */

export function BinaryExpressionsTest() {
  const price = 29.99;
  const quantity = 3;
  const discount = 0.15;
  const taxRate = 0.08;
  const threshold = 100;

  return (
    <div>
      {/* Arithmetic operations */}
      <p>Subtotal: ${price * quantity}</p>
      <p>Discount: ${(price * quantity) * discount}</p>
      <p>Tax: ${(price * quantity) * taxRate}</p>

      {/* Complex calculations */}
      <p>
        Total: ${(price * quantity * (1 - discount) * (1 + taxRate)).toFixed(2)}
      </p>

      {/* Comparison operations */}
      <p>Over threshold: {price * quantity > threshold ? 'Yes' : 'No'}</p>
      <p>Eligible for discount: {quantity >= 5 ? 'Yes' : 'No'}</p>

      {/* Binary in attributes */}
      <div className={price > 50 ? 'expensive' : 'affordable'}>
        Price category
      </div>

      {/* Nested binary expressions */}
      <p>
        Complex: {((price * quantity) - (price * quantity * discount)) + (price * quantity * taxRate)}
      </p>

      {/* Binary with method calls */}
      <p>
        Formatted: ${((price * quantity) * (1 - discount)).toFixed(2)}
      </p>

      {/* Logical operations */}
      <p>Valid: {price > 0 && quantity > 0 ? 'Yes' : 'No'}</p>
      <p>Show warning: {price > threshold || quantity > 10 ? 'Yes' : 'No'}</p>
    </div>
  );
}
