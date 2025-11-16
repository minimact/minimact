import { useState } from '@minimact/core';

export function HelloPage() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('World');

  return (
    <div style={{
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      background: '#1a1a1a',
      color: '#e0e0e0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#4ade80' }}>🌵 Hello from Cactus Browser!</h1>

      <p style={{ fontSize: '1.2rem' }}>
        Hello, <strong style={{ color: '#4ade80' }}>{name}</strong>!
      </p>

      <div style={{ margin: '2rem 0', padding: '1.5rem', background: '#2a2a2a', borderRadius: '8px' }}>
        <h2>Interactive Counter</h2>
        <p style={{ fontSize: '2rem', color: '#4ade80' }}>{count}</p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            background: '#4ade80',
            color: '#1a1a1a',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            marginRight: '0.5rem'
          }}
        >
          Increment
        </button>
        <button
          onClick={() => setCount(0)}
          style={{
            background: '#6a6a6a',
            color: '#e0e0e0',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ margin: '2rem 0', padding: '1.5rem', background: '#2a2a2a', borderRadius: '8px' }}>
        <h2>Change Your Name</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #4a4a4a',
            borderRadius: '4px',
            background: '#1a1a1a',
            color: '#e0e0e0',
            fontSize: '1rem'
          }}
        />
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#2a2a2a', borderRadius: '4px' }}>
        <p style={{ fontSize: '0.9rem', color: '#6a6a6a', textAlign: 'center' }}>
          This page is rendered by <strong>Minimact</strong> via <strong>Cactus Browser</strong> 🌵<br />
          Zero hydration • 2-5ms latency • Surgical DOM patches
        </p>
      </div>
    </div>
  );
}
