import { useState, useEffect } from 'react';
import { loadFromGitHub } from './core/github-loader';
import { isGhUrl } from './core/gh-protocol';
import { invoke } from '@tauri-apps/api/core';
import { TauriTransport } from './core/signalm/TauriTransport';

interface ExecuteResponse {
  success: boolean;
  vnode_json?: string;
  html?: string;
  error?: string;
}

export default function App() {
  const [url, setUrl] = useState('gh://minimact/docs/pages/index.tsx');
  const [status, setStatus] = useState('Ready');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  function log(message: string) {
    console.log(message);
    setExecutionLog(prev => [...prev, message]);
  }

  async function loadAndExecute() {
    if (!url.trim()) {
      setStatus('Please enter a gh:// URL');
      return;
    }

    if (!isGhUrl(url)) {
      setStatus('Invalid gh:// URL format');
      return;
    }

    setLoading(true);
    setExecutionLog([]);
    setStatus(`Loading from ${url}...`);

    try {
      // Step 1: Load from GitHub
      log('📥 Loading from GitHub...');
      const result = await loadFromGitHub(url, {
        useCache: true,
        compile: true
      });

      log(`✅ Loaded ${result.files.size} files from GitHub`);

      if (!result.compiled || result.compiled.size === 0) {
        throw new Error('No compiled output available');
      }

      // Step 2: Get the compiled entry file
      const entryCompiled = result.compiled.get(result.entryPath);
      if (!entryCompiled) {
        throw new Error(`No compiled output for entry: ${result.entryPath}`);
      }

      log(`📝 C# Code: ${entryCompiled.csharp.length} bytes`);
      log(`🎨 Templates: ${Object.keys(entryCompiled.templates?.templates || {}).length}`);

      // Step 3: Execute via Tauri runtime
      log('⚙️  Executing C# component via Minimact runtime...');
      setStatus('Executing component...');

      const executeResponse = await invoke<ExecuteResponse>('execute_component', {
        request: {
          csharp: entryCompiled.csharp,
          templates: entryCompiled.templates || {},
          initial_state: {}
        }
      });

      log(`✅ Runtime execution complete`);

      // Step 4: Display results
      if (executeResponse.success) {
        if (executeResponse.html) {
          log(`🎉 Rendered ${executeResponse.html.length} bytes of HTML`);
          setHtml(executeResponse.html);
          setStatus(`✅ Successfully rendered component from ${url}`);
        } else {
          log('⚠️  No HTML output from runtime');
          setStatus('⚠️  Component executed but no HTML generated');
          setHtml('<div class="warning"><h2>No Output</h2><p>Component executed successfully but produced no HTML output.</p></div>');
        }
      } else {
        throw new Error(executeResponse.error || 'Runtime execution failed');
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load and execute:', error);
      log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHtml(`<div class="error"><h2>Execution Error</h2><pre>${error}</pre></div>`);
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🌵 Cactus Browser</h1>
        <p className="subtitle">Phase 3: Compile + Predict + Render</p>
      </header>

      <div className="address-bar" style={{ padding: '1rem 2rem', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadAndExecute()}
            placeholder="gh://user/repo/path.tsx"
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}
          />
          <button
            onClick={loadAndExecute}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: loading ? '#333' : 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
              border: 'none',
              borderRadius: '4px',
              color: '#90ee90',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Execute'}
          </button>
        </div>
      </div>

      <div className="status-bar">
        <span className={loading ? 'status-loading' : 'status-ready'}>{status}</span>
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div style={{
          background: '#0a0a0a',
          padding: '1rem 2rem',
          borderBottom: '1px solid #333',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: '#90ee90'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#90ee90' }}>Execution Log:</h3>
          {executionLog.map((msg, i) => (
            <div key={i} style={{ padding: '0.25rem 0' }}>{msg}</div>
          ))}
        </div>
      )}

      <main className="content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner">🌵</div>
            <p>Executing component...</p>
          </div>
        ) : html ? (
          <div
            className="rendered-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="welcome">
            <h2>Welcome to Cactus Browser - Phase 3!</h2>
            <p>Enter a <code>gh://</code> URL to load and <strong>execute</strong> a TSX component.</p>

            <h3>Full Pipeline:</h3>
            <ol>
              <li>📥 Load TSX from GitHub</li>
              <li>🔧 Compile TSX → C# (via Babel)</li>
              <li>⚙️  Execute C# → VNode (via Roslyn + Minimact)</li>
              <li>🎨 Render VNode → HTML</li>
              <li>🎉 Display in browser!</li>
            </ol>

            <h3>Example URL:</h3>
            <ul>
              <li><code>gh://minimact/docs/pages/index.tsx</code></li>
            </ul>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Phase 3: Full TSX → C# → VNode → HTML Pipeline 🚀</p>
      </footer>
    </div>
  );
}
