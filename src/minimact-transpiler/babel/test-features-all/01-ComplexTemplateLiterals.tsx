/**
 * Edge Case Test: Complex Template Literals
 *
 * Tests various template literal patterns that may need special handling
 * Key Issue: .toFixed() needs to map to .ToString("F2")
 */

import { useState } from 'minimact';

interface Product {
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

export function ComplexTemplateLiterals() {
  const [price, setPrice] = useState(99.99);
  const [quantity, setQuantity] = useState(2);
  const [discount, setDiscount] = useState(0.15);
  const [product, setProduct] = useState<Product>({
    name: 'Widget',
    price: 49.99,
    quantity: 5,
    discount: 0.1
  });

  // Test Case 1: Simple template with .toFixed()
  const totalSimple = `$${(price * quantity).toFixed(2)}`;

  // Test Case 2: Multiple expressions with .toFixed()
  const totalComplex = `Price: $${price.toFixed(2)} x ${quantity} = $${(price * quantity).toFixed(2)}`;

  // Test Case 3: Nested calculations with .toFixed()
  const withDiscount = `Original: $${(price * quantity).toFixed(2)}, After ${(discount * 100).toFixed(0)}% off: $${((price * quantity) * (1 - discount)).toFixed(2)}`;

  // Test Case 4: Template with conditional
  const status = `Status: ${quantity > 0 ? 'In Stock' : 'Out of Stock'} - ${quantity} available`;

  // Test Case 5: Object property access in template
  const productInfo = `${product.name} - $${product.price.toFixed(2)} each`;

  // Test Case 6: Nested template literals
  const summary = `Total: ${`$${(price * quantity).toFixed(2)}`}`;

  // Test Case 7: Method chaining in template
  const formatted = `Product: ${product.name.toUpperCase()} at $${product.price.toFixed(2)}`;

  return (
    <div>
      <h1>Complex Template Literal Tests</h1>

      <div className="test-case">
        <h3>Test 1: Simple .toFixed()</h3>
        <p>{totalSimple}</p>
        <p>Expected: $199.98</p>
      </div>

      <div className="test-case">
        <h3>Test 2: Multiple .toFixed()</h3>
        <p>{totalComplex}</p>
        <p>Expected: Price: $99.99 x 2 = $199.98</p>
      </div>

      <div className="test-case">
        <h3>Test 3: Nested Calculations</h3>
        <p>{withDiscount}</p>
        <p>Expected: Original: $199.98, After 15% off: $169.98</p>
      </div>

      <div className="test-case">
        <h3>Test 4: Conditional in Template</h3>
        <p>{status}</p>
        <p>Expected: Status: In Stock - 2 available</p>
      </div>

      <div className="test-case">
        <h3>Test 5: Object Property</h3>
        <p>{productInfo}</p>
        <p>Expected: Widget - $49.99 each</p>
      </div>

      <div className="test-case">
        <h3>Test 6: Nested Template</h3>
        <p>{summary}</p>
        <p>Expected: Total: $199.98</p>
      </div>

      <div className="test-case">
        <h3>Test 7: Method Chaining</h3>
        <p>{formatted}</p>
        <p>Expected: Product: WIDGET at $49.99</p>
      </div>

      {/* Direct JSX usage */}
      <div className="inline-tests">
        <h3>Inline Template Literals in JSX</h3>
        <p>Total: {`$${(price * quantity).toFixed(2)}`}</p>
        <p>Per Item: {`$${price.toFixed(2)}`}</p>
        <p>Discount: {`${(discount * 100).toFixed(0)}%`}</p>
      </div>
    </div>
  );
}
