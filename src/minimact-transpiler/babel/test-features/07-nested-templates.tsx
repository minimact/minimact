/**
 * Feature Test: Nested Template Literals
 *
 * Tests template literals nested within other template literals.
 *
 * Pattern: `Outer ${`Inner ${value}`}`
 */

export function NestedTemplatesTest() {
  const price = 29.99;
  const quantity = 3;
  const discount = 0.15;
  const productName = "Widget";

  return (
    <div>
      {/* Simple nested template */}
      <p>Summary: {`Total: ${`$${price.toFixed(2)}`}`}</p>

      {/* Double nested with calculations */}
      <p>
        {`Product: ${productName} at ${`$${(price * quantity).toFixed(2)}`}`}
      </p>

      {/* Nested template with discount calculation */}
      <p>
        {`After ${`${(discount * 100).toFixed(0)}%`} off: ${`$${((price * quantity) * (1 - discount)).toFixed(2)}`}`}
      </p>

      {/* Multiple nested templates in one string */}
      <p>
        {`Order: ${quantity} x ${productName} = ${`$${(price * quantity).toFixed(2)}`} (discount: ${`${(discount * 100).toFixed(0)}%`})`}
      </p>

      {/* Nested template with conditional */}
      <p>
        {`Status: ${discount > 0 ? `${`${(discount * 100).toFixed(0)}%`} off!` : 'No discount'}`}
      </p>
    </div>
  );
}
