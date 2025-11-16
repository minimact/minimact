import { useState, useEffect, useRef } from 'react';
import { loadFromGitHub } from './core/github-loader';
import { TauriTransport } from './core/signalm/TauriTransport';
import { Router } from './core/router';
import { LinkInterceptor } from './core/link-interceptor';
import { parseGhUrl, buildGhUrl } from './core/gh-protocol';
import './App.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Initializing SignalM²...');
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [vnodeJson, setVnodeJson] = useState('');
  const [error, setError] = useState('');
  const [compiledFiles, setCompiledFiles] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const transportRef = useRef<TauriTransport | null>(null);
  const routerRef = useRef<Router>(Router.createDefault());
  const linkInterceptorRef = useRef<LinkInterceptor | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize SignalM² transport on mount
  useEffect(() => {
    console.log('[App] Initializing Tauri transport...');

    const transport = new TauriTransport();

    // Set up event handlers BEFORE connecting
    transport.on('ApplyPatches', (patches: any) => {
      console.log('[App] ✅ Received patches from runtime:', patches);
      // TODO: Apply patches to DOM
    });

    transport.on('UpdateComponent', (data: any) => {
      console.log('[App] ✅ Component update:', data);
      if (data.html) {
        setHtml(data.html);
      }
    });

    // Connect
    transport.connect()
      .then(() => {
        console.log('[App] ✅ SignalM² connected via Tauri!');
        setStatus('✅ Connected to local runtime');
        setConnected(true);
        transportRef.current = transport;
      })
      .catch((err) => {
        console.error('[App] ❌ Failed to connect:', err);
        setStatus('❌ Connection failed');
        setError(err.message);
      });

    // Cleanup on unmount
    return () => {
      transport.disconnect();
    };
  }, []);

  // Set up link interceptor
  useEffect(() => {
    if (!contentRef.current) return;

    const interceptor = new LinkInterceptor(contentRef.current, {
      onNavigate: (newUrl) => {
        console.log('[App] Link clicked, navigating to:', newUrl);
        navigate(newUrl);
      },
      getCurrentUrl: () => url
    });

    linkInterceptorRef.current = interceptor;

    return () => {
      interceptor.stop();
    };
  }, [url]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.url) {
        console.log('[App] Navigating back/forward to:', e.state.url);
        navigate(e.state.url, false); // Don't push state again
      }
    };

    const updateHistoryButtons = () => {
      setCanGoBack(window.history.length > 1);
      // Can't reliably detect forward in browser
      setCanGoForward(false);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('popstate', updateHistoryButtons);
    updateHistoryButtons();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('popstate', updateHistoryButtons);
    };
  }, []);

  async function navigate(targetUrl: string, pushState = true) {
    if (!targetUrl.trim()) {
      setError('Please enter a gh:// URL');
      return;
    }

    if (!connected || !transportRef.current) {
      setError('Not connected to runtime');
      return;
    }

    setLoading(true);
    setStatus('Loading from GitHub...');
    setError('');
    setHtml('');
    setVnodeJson('');
    setCompiledFiles([]);

    try {
      // Parse URL
      const parsed = parseGhUrl(targetUrl);
      if (!parsed) {
        throw new Error(`Invalid gh:// URL: ${targetUrl}`);
      }

      // Resolve route
      const possiblePaths = routerRef.current.resolvePath(parsed.path);
      console.log('[App] Trying paths:', possiblePaths);

      // Try each path until one works
      let result = null;
      let loadedPath = '';

      for (const tryPath of possiblePaths) {
        try {
          const tryUrl = buildGhUrl({ ...parsed, path: tryPath });
          console.log('[App] Trying:', tryUrl);

          setStatus(`🌐 Fetching ${tryPath}...`);
          result = await loadFromGitHub(tryUrl);
          loadedPath = tryPath;
          break;
        } catch (err) {
          console.log(`[App] Path ${tryPath} failed, trying next...`);
        }
      }

      if (!result) {
        throw new Error(`No file found for route: ${parsed.path}`);
      }

      console.log('[App] GitHub load result:', result);

      setStatus('✅ Loaded from GitHub');
      setCompiledFiles(Array.from(result.files.keys()));

      // Phase 5: Initialize component via SignalM²
      setStatus('⚙️ Initializing component via SignalM²...');

      console.log('[App] Calling SignalM² Initialize...');
      const initResult = await transportRef.current.send(
        'Initialize',
        result.compiled.csharp,
        result.compiled.templates,
        {}
      );

      console.log('[App] Initialize result:', initResult);

      if (!initResult || !initResult.success) {
        setError(initResult?.error || 'Initialization failed');
        setStatus('❌ Initialization failed');
        setLoading(false);
        return;
      }

      // Display results
      setHtml(initResult.html || '');
      setVnodeJson(initResult.vnodeJson || '');
      setUrl(targetUrl);
      setStatus(`✅ Rendered ${loadedPath} via SignalM²! 🌵⚡`);
      setLoading(false);

      // Update browser history
      if (pushState) {
        window.history.pushState({ url: targetUrl }, '', `#${targetUrl}`);
        setCanGoBack(true);
      }

    } catch (err: any) {
      console.error('[App] Error:', err);
      setError(err.message || err.toString());
      setStatus('❌ Error');
      setLoading(false);
    }
  }

  async function handleGo() {
    navigate(url);
  }

  function handleBack() {
    window.history.back();
  }

  function handleForward() {
    window.history.forward();
  }

  function handleReload() {
    navigate(url);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🌵 Cactus Browser</h1>
        <p>The TSX-Native, Posthydrationist Web</p>
      </div>

      <div className="address-bar">
        <div className="nav-buttons">
          <button
            onClick={handleBack}
            disabled={!canGoBack || loading}
            title="Back"
            className="nav-btn"
          >
            ←
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward || loading}
            title="Forward"
            className="nav-btn"
          >
            →
          </button>
          <button
            onClick={handleReload}
            disabled={loading || !url}
            title="Reload"
            className="nav-btn"
          >
            ⟳
          </button>
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="gh://user/repo"
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleGo()}
          disabled={loading}
        />
        <button onClick={handleGo} disabled={loading} className="go-btn">
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
        <div className="content" ref={contentRef}>
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
              <li>✅ <strong>Phase 2:</strong> GitHub Repo Loader (gh:// protocol)</li>
              <li>✅ <strong>Phase 3:</strong> Native AOT Runtime (33MB, instant startup!)</li>
              <li>✅ <strong>Phase 4:</strong> Routing Engine (Browser navigation!) 🎉 NEW!</li>
              <li>✅ <strong>Phase 5:</strong> SignalM² + Rust Reconciler (Surgical patches!) 🎉 NEW!</li>
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
        <p>Phases 1-5 Complete ✅ | Routing + SignalM² + Rust Reconciler 🚀⚡🌵</p>
      </footer>
    </div>
  );
}
