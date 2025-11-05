/**
 * Feature Test: Event Handlers
 *
 * Tests various event handler patterns.
 *
 * Patterns:
 * - Inline arrow functions: () => func()
 * - Method references: {handleClick}
 * - Arrow functions with arguments: () => func(arg)
 * - Event parameter: (e) => func(e.target.value)
 */

export function EventHandlersTest() {
  const count = 0;

  function handleClick() {
    console.log('Clicked!');
  }

  function handleQuantityChange(delta: number) {
    console.log('Change by:', delta);
  }

  function setCount(newCount: number) {
    console.log('Set count:', newCount);
  }

  function handleAddToCart() {
    console.log('Add to cart');
  }

  return (
    <div>
      {/* Method reference */}
      <button onClick={handleClick}>
        Click Me
      </button>

      {/* Inline arrow function */}
      <button onClick={() => console.log('Inline')}>
        Inline Handler
      </button>

      {/* Arrow function with arguments */}
      <button onClick={() => handleQuantityChange(-1)}>-</button>
      <span>{count}</span>
      <button onClick={() => handleQuantityChange(1)}>+</button>

      {/* Arrow function with state update */}
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>

      {/* Complex inline handler */}
      <button onClick={() => {
        console.log('Before');
        handleAddToCart();
        console.log('After');
      }}>
        Add to Cart
      </button>
    </div>
  );
}
