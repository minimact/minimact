import { useMvcState, useMvcViewModel } from '@minimact/mvc';
import { useState } from 'minimact';

// TypeScript interface matching C# ViewModel
interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: number;
  initialSelectedColor: string;
  initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
  // ❌ IMMUTABLE - Returns [value] only (no setter)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');

  // ✅ MUTABLE - Returns [value, setter]
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate' // Sync to server immediately
  });

  const [color, setColor] = useMvcState<string>('initialSelectedColor');
  const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');

  // Access entire ViewModel (read-only)
  const viewModel = useMvcViewModel<ProductViewModel>();

  // Mix with regular Minimact state
  const [cartTotal, setCartTotal] = useState(0);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
    setCartTotal(price * newQuantity);
  };

  const handleAddToCart = () => {
    alert(`Added ${quantity} x ${productName} to cart! Total: $${cartTotal.toFixed(2)}`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{productName}</h1>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>
          ${price.toFixed(2)}
        </div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          Logged in as: {viewModel?.userEmail}
        </div>
      </div>

      {/* Quantity Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Quantity:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleQuantityChange(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <span style={{ fontSize: '20px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Color Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Color:
        </label>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="Black">Black</option>
          <option value="White">White</option>
          <option value="Red">Red</option>
          <option value="Blue">Blue</option>
        </select>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Admin Controls</h3>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            Edit Product
          </button>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Delete Product
          </button>
        </div>
      )}

      {/* Expandable Details */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>

        {isExpanded && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <h3>Product Specifications</h3>
            <p>This is where detailed product information would go.</p>
          </div>
        )}
      </div>

      {/* Cart Total */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <strong style={{ fontSize: '18px' }}>Total: ${cartTotal.toFixed(2)}</strong>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        style={{
          padding: '12px 24px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
