import { useState } from '@minimact/core';
import { Link } from '@minimact/spa';

export default function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>Simple Counter</h2>
      <p style="font-size: 32px; font-weight: bold; color: #0066cc;">Count: {count}</p>

      <div style="margin-top: 20px;">
        <button onClick={() => setCount(count - 1)} style="padding: 10px 20px; font-size: 16px; margin-right: 10px;">
          Decrement
        </button>
        <button onClick={() => setCount(count + 1)} style="padding: 10px 20px; font-size: 16px; margin-right: 10px;">
          Increment
        </button>
        <button onClick={() => setCount(0)} style="padding: 10px 20px; font-size: 16px;">
          Reset
        </button>
      </div>

      <div style="margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
        <h3>🧭 Navigation Test</h3>
        <p>Click the link below to navigate to the list page via SPA navigation (no page reload):</p>
        <Link to="/list">Go to List Page →</Link>
      </div>

      <div style="margin-top: 20px; padding: 20px; background: #fffbea; border: 2px solid #f59e0b; border-radius: 8px;">
        <h3 style="margin-top: 0;">🔍 Debug Mode Active</h3>
        <p>Every button click sends debug messages to the server via SignalR!</p>
        <ol>
          <li>Open Visual Studio</li>
          <li>Set breakpoint in <code>MinimactHub.cs</code> at line 27 (DebugMessage method)</li>
          <li>Click any button above</li>
          <li>Inspect the debug data: category, message, and data object</li>
        </ol>
        <p><strong>Debug categories you'll see:</strong></p>
        <ul>
          <li><code>state</code> - useState calls with old/new values</li>
          <li><code>templates</code> - Template match results</li>
          <li><code>minimact</code> - General framework activity</li>
          <li><code>dom-patcher</code> - DOM patch operations</li>
        </ul>
      </div>
    </div>
  );
}
