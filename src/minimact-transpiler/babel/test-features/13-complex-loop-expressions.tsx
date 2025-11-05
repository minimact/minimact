/**
 * Feature Test: Complex Loop Expressions
 *
 * Tests complex expressions and calculations within loop bodies.
 *
 * Pattern: Binary operations, method calls, ternaries inside loops
 */

export function ComplexLoopExpressionsTest() {
  const products = [
    { id: 1, name: 'Laptop', price: 999, taxRate: 0.08, discount: 0.1 },
    { id: 2, name: 'Mouse', price: 29, taxRate: 0.08, discount: 0.05 },
    { id: 3, name: 'Keyboard', price: 79, taxRate: 0.08, discount: 0.15 }
  ];

  return (
    <div>
      {/* Binary operations in loops */}
      {products.map(product => (
        <div key={product.id}>
          <h4>{product.name}</h4>
          <p>Price: ${product.price}</p>
          <p>Tax: ${(product.price * product.taxRate).toFixed(2)}</p>
          <p>
            Total: ${(product.price * (1 + product.taxRate) - (product.price * product.discount)).toFixed(2)}
          </p>
        </div>
      ))}

      {/* Complex calculations with method chaining */}
      {products.map(product => (
        <div key={product.id}>
          <span>{product.name.toUpperCase()}</span>
          <span> - </span>
          <span>
            ${((product.price * (1 - product.discount)) * (1 + product.taxRate)).toFixed(2)}
          </span>
        </div>
      ))}

      {/* Ternaries in loop body */}
      {products.map(product => (
        <div key={product.id}>
          <p>{product.name}</p>
          <p className={product.discount > 0.1 ? 'big-discount' : 'small-discount'}>
            {product.discount > 0.1 ? 'Great Deal!' : 'Good Price'}
          </p>
          <p>
            Save: ${(product.price * product.discount).toFixed(2)}
          </p>
        </div>
      ))}

      {/* Nested expressions */}
      {products.map(product => (
        <div key={product.id}>
          <p>
            {`${product.name}: $${product.price.toFixed(2)} (${(product.discount * 100).toFixed(0)}% off)`}
          </p>
          <p>
            Final: ${(product.price * (1 - product.discount) * (1 + product.taxRate)).toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
}
