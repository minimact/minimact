import { useState } from '@minimact/core';

export function HomePage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to Minimact!');

  return (
    <div className="container">
      <h1>🌵 Minimact Documentation</h1>
      <p className="tagline">The TSX-Native, Posthydrationist Framework</p>

      <div className="hero">
        <h2>What is Minimact?</h2>
        <p>
          Minimact is a revolutionary web framework that renders React components
          on the server using C# and Rust, delivering <strong>zero-hydration</strong>,
          <strong>instant interactions</strong> (2-5ms), and <strong>predictive rendering</strong>.
        </p>
      </div>

      <div className="interactive-demo">
        <h3>Interactive Demo</h3>
        <p>Current count: <strong>{count}</strong></p>
        <button onClick={() => setCount(count + 1)}>
          Increment Counter
        </button>
        <button onClick={() => setCount(0)}>
          Reset
        </button>
      </div>

      <div className="message-demo">
        <h3>Dynamic Message</h3>
        <p>{message}</p>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
      </div>

      <div className="features">
        <h3>Key Features</h3>
        <ul>
          <li>✅ <strong>Zero Hydration</strong> - No client-side JS execution needed</li>
          <li>⚡ <strong>2-5ms Latency</strong> - Faster than React 19</li>
          <li>🎯 <strong>100% Prediction Accuracy</strong> - Build-time templates, not ML</li>
          <li>🌵 <strong>Posthydrationist</strong> - The web doesn't hydrate, it patches</li>
          <li>🦀 <strong>Rust-Powered</strong> - Surgical DOM reconciliation</li>
          <li>📦 <strong>20KB Bundle</strong> - Smaller than React alone</li>
        </ul>
      </div>

      <div className="architecture">
        <h3>How It Works</h3>
        <ol>
          <li><strong>Write TSX</strong> - Standard React components</li>
          <li><strong>Compile to C#</strong> - Babel transpiles TSX → C#</li>
          <li><strong>Execute on Server</strong> - .NET Native AOT runtime</li>
          <li><strong>Generate VNode</strong> - Virtual DOM tree</li>
          <li><strong>Rust Reconciliation</strong> - Surgical patch generation</li>
          <li><strong>Apply to DOM</strong> - Minimal, precise updates</li>
        </ol>
      </div>

      <div className="links">
        <h3>Learn More</h3>
        <a href="gh://minimact/docs/pages/getting-started.tsx">Getting Started</a>
        <a href="gh://minimact/docs/pages/api.tsx">API Reference</a>
        <a href="gh://minimact/examples">Examples</a>
        <a href="https://github.com/minimact/minimact">GitHub</a>
      </div>

      <footer>
        <p>Built with ❤️ by the Minimact team</p>
        <p className="version">Minimact v1.0.0 | Rendered via Cactus Browser 🌵</p>
      </footer>

      <style>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #e0e0e0;
          background: #1a1a1a;
        }

        h1 {
          color: #4ade80;
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .tagline {
          color: #86efac;
          font-size: 1.2rem;
          margin-bottom: 2rem;
        }

        .hero {
          background: #2a2a2a;
          padding: 2rem;
          border-radius: 8px;
          margin: 2rem 0;
          border-left: 4px solid #4ade80;
        }

        .interactive-demo, .message-demo {
          background: #2a2a2a;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }

        button {
          background: #4ade80;
          color: #1a1a1a;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          margin-right: 0.5rem;
          margin-top: 0.5rem;
          font-weight: 600;
        }

        button:hover {
          background: #22c55e;
        }

        input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #4a4a4a;
          border-radius: 4px;
          background: #1a1a1a;
          color: #e0e0e0;
          font-size: 1rem;
          margin-top: 0.5rem;
        }

        input:focus {
          outline: none;
          border-color: #4ade80;
        }

        .features ul {
          list-style: none;
          padding: 0;
        }

        .features li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #3a3a3a;
        }

        .architecture ol {
          padding-left: 1.5rem;
        }

        .architecture li {
          margin: 0.75rem 0;
        }

        .links {
          margin: 2rem 0;
        }

        .links a {
          display: inline-block;
          margin: 0.5rem 1rem 0.5rem 0;
          color: #4ade80;
          text-decoration: none;
          font-weight: 500;
        }

        .links a:hover {
          text-decoration: underline;
        }

        footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px solid #3a3a3a;
          text-align: center;
          color: #6a6a6a;
        }

        .version {
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        strong {
          color: #4ade80;
        }
      `}</style>
    </div>
  );
}
