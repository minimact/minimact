import { useState } from 'react';
import { loadFromGitHub } from './core/github-loader';
import { executeComponent } from './core/execution-engine';
import './App.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [vnodeJson, setVnodeJson] = useState('');
  const [error, setError] = useState('');
  const [compiledFiles, setCompiledFiles] = useState<string[]>([]);

  async function handleGo() {
    if (!url.trim()) {
      setError('Please enter a gh:// URL');
      return;
    }

    setLoading(true);
    setStatus('Loading from GitHub...');
    setError('');
    setHtml('');
    setVnodeJson('');
    setCompiledFiles([]);

    try {
      // Phase 2: Load from GitHub
      setStatus('🌐 Fetching from GitHub...');
      console.log('[App] Loading:', url);

      const result = await loadFromGitHub(url);

      console.log('[App] GitHub load result:', result);

      setStatus('✅ Loaded from GitHub');
      setCompiledFiles(Array.from(result.files.keys()));

      // Phase 3: Execute via Native AOT runtime
      setStatus('⚙️ Executing C# component...');

      const execution = await executeComponent(
        result.compiled.csharp,
        result.compiled.templates,
        {}
      );

      if (!execution.success) {
        setError(execution.error || 'Execution failed');
        setStatus('❌ Execution failed');
        setLoading(false);
        return;
      }

      // Phase 4: Display results
      setHtml(execution.html || '');
      setVnodeJson(execution.vnode_json || '');
      setStatus('✅ Rendered successfully! 🌵');
      setLoading(false);

    } catch (err: any) {
      console.error('[App] Error:', err);
      setError(err.message || err.toString());
      setStatus('❌ Error');
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🌵 Cactus Browser</h1>
        <p>The TSX-Native, Posthydrationist Web</p>
      </div>

      <div className="address-bar">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="gh://user/repo/path.tsx"
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleGo()}
          disabled={loading}
        />
        <button onClick={handleGo} disabled={loading}>
          {loading ? '⏳ Loading...' : '→ Go'}
        </button>
      </div>

      <div className={`status ${loading ? 'loading' : ''}`}>
        {status}
      </div>

      {compiledFiles.length > 0 && (
        <div className="file-list">
          <strong>Loaded files:</strong> {compiledFiles.join(', ')}
        </div>
      )}

      {error && (
        <div className="error-panel">
          <h3>❌ Error</h3>
          <pre>{error}</pre>
        </div>
      )}

      {html && (
        <div className="content">
          <div className="rendered-view">
            <h3>Rendered Component</h3>
            <div
              className="component-frame"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          <div className="debug-view">
            <h3>VNode Tree (Debug)</h3>
            <pre>{vnodeJson}</pre>
          </div>
        </div>
      )}

      {!html && !error && !loading && (
        <div className="welcome">
          <h2>Welcome to Cactus Browser! 🌵</h2>
          <p>The world's first <strong>TSX-native</strong>, <strong>GitHub-native</strong> web browser.</p>

          <div className="features">
            <h3>What We've Built:</h3>
            <ul>
              <li>✅ <strong>Phase 1:</strong> Boot the Runtime (Local TSX Viewer)</li>
              <li>✅ <strong>Phase 2:</strong> GitHub Repo Loader</li>
              <li>✅ <strong>Phase 3:</strong> Native AOT Runtime (33MB, no .NET SDK!)</li>
              <li>🚀 <strong>Phase 4:</strong> Tauri Integration (YOU ARE HERE!)</li>
            </ul>
          </div>

          <div className="examples">
            <h3>Try these examples:</h3>
            <ul>
              <li>
                <code onClick={() => setUrl('gh://minimact/docs/pages/index.tsx')}>
                  gh://minimact/docs/pages/index.tsx
                </code>
              </li>
              <li>
                <code onClick={() => setUrl('gh://minimact/examples/counter.tsx')}>
                  gh://minimact/examples/counter.tsx
                </code>
              </li>
              <li>
                <code onClick={() => setUrl('gh://you/your-repo/pages/home.tsx')}>
                  gh://you/your-repo/pages/home.tsx
                </code>
              </li>
            </ul>
          </div>

          <div className="info">
            <h3>How it works:</h3>
            <ol>
              <li>Enter a <code>gh://</code> URL above</li>
              <li>Cactus fetches the TSX file from GitHub</li>
              <li>Babel compiles TSX → C# + Templates</li>
              <li>Native AOT runtime executes the C# component</li>
              <li>Component renders to HTML + VNode tree</li>
              <li>You see the result instantly! ⚡</li>
            </ol>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Phases 1-3 Complete ✅ | Phase 4: Tauri Integration 🚀</p>
      </footer>
    </div>
  );
}
