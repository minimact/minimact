function ShoppingCart({ items, total, discount, removeItem, checkout }) {
  const finalPrice = total - (total * discount / 100);

  return (
    <div className="cart">
      <h1>Shopping Cart</h1>
      <div className="items">
        {items.map((item) => (
          <div key={item.id} className="cart-item">
            <img src={item.image} alt={item.name} />
            <div className="details">
              <h3>{item.name}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>${item.price}</p>
            </div>
            <button onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="summary">
        <p>Subtotal: ${total}</p>
        {discount > 0 && <p>Discount: {discount}%</p>}
        <h2>Total: ${finalPrice.toFixed(2)}</h2>
        <button onClick={checkout} disabled={items.length === 0}>
          Checkout
        </button>
      </div>
    </div>
  );
}
