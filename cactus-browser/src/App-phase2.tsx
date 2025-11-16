import { useEffect, useState } from 'react';
import { loadFromGitHub } from './core/github-loader';
import { isGhUrl } from './core/gh-protocol';

export default function App() {
  const [url, setUrl] = useState('gh://minimact/docs/pages/index.tsx');
  const [status, setStatus] = useState('Ready');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Map<string, string>>(new Map());

  async function loadUrl() {
    if (!url.trim()) {
      setStatus('Please enter a gh:// URL');
      return;
    }

    if (!isGhUrl(url)) {
      setStatus('Invalid gh:// URL format');
      return;
    }

    setLoading(true);
    setStatus(`Loading from ${url}...`);

    try {
      // Load files from GitHub
      const result = await loadFromGitHub(url, {
        useCache: true,
        compile: true
      });

      setFiles(result.files);
      setStatus(`✅ Loaded ${result.files.size} files from GitHub!`);

      // Display results
      const displayHtml = `
        <div>
          <h1>🌵 Phase 2 Complete - GitHub Loader!</h1>
          <p>Successfully loaded from: <code>${url}</code></p>

          <h2>Loaded Files (${result.files.size}):</h2>
          <ul>
            ${Array.from(result.files.keys()).map(path =>
              `<li><code>${path}</code> (${result.files.get(path)?.length || 0} bytes)</li>`
            ).join('')}
          </ul>

          ${result.compiled ? `
            <h2>Compilation Results:</h2>
            <div style="background: #1a1a1a; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
              <h3>Entry File: ${result.entryPath}</h3>
              ${result.compiled.has(result.entryPath) ? `
                <p>C# Code: ${result.compiled.get(result.entryPath).csharp.length} bytes</p>
                <p>Templates: ${Object.keys(result.compiled.get(result.entryPath).templates?.templates || {}).length}</p>
                <pre style="overflow-x: auto; max-height: 300px;">${escapeHtml(result.compiled.get(result.entryPath).csharp.substring(0, 500))}...</pre>
              ` : '<p>Compilation failed</p>'}
            </div>
          ` : ''}
        </div>
      `;

      setHtml(displayHtml);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHtml(`<div class="error"><h2>Load Error</h2><pre>${error}</pre></div>`);
      setLoading(false);
    }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🌵 Cactus Browser</h1>
        <p className="subtitle">The TSX-Native, Posthydrationist Web Browser</p>
      </header>

      <div className="address-bar" style={{ padding: '1rem 2rem', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
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
            onClick={loadUrl}
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
            {loading ? 'Loading...' : 'Go'}
          </button>
        </div>
      </div>

      <div className="status-bar">
        <span className={loading ? 'status-loading' : 'status-ready'}>{status}</span>
      </div>

      <main className="content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner">🌵</div>
            <p>Loading from GitHub...</p>
          </div>
        ) : html ? (
          <div
            className="rendered-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="welcome">
            <h2>Welcome to Cactus Browser!</h2>
            <p>Enter a <code>gh://</code> URL to load a TSX-native site from GitHub.</p>
            <h3>Example URLs:</h3>
            <ul>
              <li><code>gh://minimact/docs/pages/index.tsx</code></li>
              <li><code>gh://you/blog@main/posts/hello.tsx</code></li>
              <li><code>gh://facebook/react@v18.0.0/docs</code></li>
            </ul>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Phase 2: GitHub Repo Loader 🚀</p>
      </footer>
    </div>
  );
}
