/**
 * Example: expressionTemplates.cjs - Extracts computed value templates
 */
import { useState } from '@minimact/core';

export function ExpressionTemplatesExample() {
  const [price, setPrice] = useState(19.99);
  const [quantity, setQuantity] = useState(3);
  const [name, setName] = useState('Widget');
  const [discount, setDiscount] = useState(0.1);

  return (
    <div>
      {/* Method call transform */}
      <span>${price.toFixed(2)}</span>

      {/* Binary expression */}
      <span>Total: {price * quantity}</span>

      {/* String method */}
      <span>{name.toUpperCase()}</span>

      {/* Chained methods */}
      <span>{name.toLowerCase().trim()}</span>

      {/* Complex expression with multiple bindings */}
      <span>Final: ${(price * quantity * (1 - discount)).toFixed(2)}</span>

      {/* Unary expression */}
      <span>Has discount: {!discount ? 'No' : 'Yes'}</span>
    </div>
  );
}
