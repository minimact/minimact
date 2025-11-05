/**
 * Feature Test: Transform Methods
 *
 * Tests method call transformations in template literals.
 *
 * Supported methods:
 * - toFixed(n) - Format numbers
 * - toString() - Convert to string
 * - toLowerCase() / toUpperCase() - Case conversion
 * - trim() / trimStart() / trimEnd() - Whitespace handling
 */

export function TransformMethodsTest() {
  const price = 19.99;
  const cartTotal = 49.97;
  const productName = "  Widget  ";
  const code = "abc123";

  return (
    <div>
      {/* toFixed() method */}
      <p>Price: ${price.toFixed(2)}</p>
      <p>Total: ${cartTotal.toFixed(2)}</p>

      {/* Case conversion */}
      <p>Uppercase: {code.toUpperCase()}</p>
      <p>Lowercase: {code.toLowerCase()}</p>

      {/* Trim methods */}
      <p>Trimmed: "{productName.trim()}"</p>
      <p>Trim Start: "{productName.trimStart()}"</p>
      <p>Trim End: "{productName.trimEnd()}"</p>

      {/* toString() */}
      <p>String value: {price.toString()}</p>

      {/* Method chaining on member expressions */}
      <p>Formatted: {price.toFixed(2).toUpperCase()}</p>
    </div>
  );
}
