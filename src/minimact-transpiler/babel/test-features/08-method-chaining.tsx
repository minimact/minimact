/**
 * Feature Test: Method Chaining
 *
 * Tests chained method calls on member expressions.
 *
 * Pattern: object.property.method1().method2()
 */

export function MethodChainingTest() {
  const product = {
    name: "  awesome widget  ",
    price: 19.99,
    category: "electronics"
  };

  const message = "  Hello World!  ";
  const code = "abc123def";

  return (
    <div>
      {/* Method chaining on member expression */}
      <p>Product: {product.name.trim().toUpperCase()}</p>
      <p>Category: {product.category.toUpperCase().trim()}</p>

      {/* Method chaining with number formatting */}
      <p>Price: ${product.price.toFixed(2).toUpperCase()}</p>

      {/* Multiple method chains */}
      <p>Formatted: {message.trim().toLowerCase().toUpperCase()}</p>

      {/* Method chaining with string operations */}
      <p>Code: {code.toUpperCase().trim().toLowerCase()}</p>

      {/* Method chaining in template literals */}
      <p>
        {`Product: ${product.name.trim().toUpperCase()} at $${product.price.toFixed(2)}`}
      </p>

      {/* Complex chaining */}
      <p>
        {product.name.trimStart().trimEnd().toLowerCase().toUpperCase()}
      </p>
    </div>
  );
}
