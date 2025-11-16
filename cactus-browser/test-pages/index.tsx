// Test Component for Cactus Browser Phase 1
// This is a simple TSX component that will be compiled to C# and rendered

import { useState } from '@minimact/core';

export function HomePage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to Cactus Browser!');

  return (
    <div className="container">
      <h1>🌵 Welcome to Cactus Browser!</h1>
      <p className="intro">{message}</p>

      <div className="demo-section">
        <h2>Interactive Counter Demo</h2>
        <p>This component demonstrates TSX-native rendering with predictive updates.</p>

        <div className="counter">
          <button onClick={() => setCount(count - 1)}>-</button>
          <span className="count-display">Count: {count}</span>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>

        <button
          className="reset-button"
          onClick={() => {
            setCount(0);
            setMessage('Counter reset!');
          }}
        >
          Reset
        </button>
      </div>

      <div className="info-section">
        <h2>What is Cactus Browser?</h2>
        <ul>
          <li>🌐 Treats GitHub repos as websites</li>
          <li>📄 Renders TSX files as web pages (not HTML)</li>
          <li>⚡ Uses Minimact for zero-hydration rendering</li>
          <li>🚀 Instant interactions (2-5ms latency)</li>
          <li>📦 Zero deployment (just git push)</li>
        </ul>
      </div>

      <div className="stats">
        <p>Current count: <strong>{count}</strong></p>
        <p>Status: <strong>{count > 0 ? 'Positive' : count < 0 ? 'Negative' : 'Zero'}</strong></p>
      </div>
    </div>
  );
}

export default HomePage;
