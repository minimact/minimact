function Counter({ count }) {
  return (
    <div className="counter">
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}