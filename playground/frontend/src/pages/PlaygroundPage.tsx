import { useState, useCallback } from 'react';
import { Editor } from '../components/Editor';
import { Preview } from '../components/Preview';
import { MetricsDashboard } from '../components/MetricsDashboard';
import { usePlayground } from '../hooks/usePlayground';
import { Link } from 'react-router-dom';

export function PlaygroundPage() {
  const [csharpCode, setCsharpCode] = useState('');
  const {
    sessionId,
    html,
    isCompiling,
    isInteracting,
    error,
    compilationTime,
    metrics,
    lastInteraction,
    compile,
    interact,
    clearError,
  } = usePlayground();

  const handleCompile = useCallback(async () => {
    await compile(csharpCode);
  }, [csharpCode, compile]);

  const handleInteraction = useCallback(
    (eventType: string, elementId: string) => {
      if (!sessionId) return;

      // Parse state changes from event (simplified)
      const stateChanges: Record<string, any> = {};

      // For demo purposes, we'll handle common patterns
      if (eventType === 'click' && elementId.includes('increment')) {
        stateChanges.count = Math.random(); // Backend will handle actual state
      } else if (eventType === 'change' || eventType === 'input') {
        stateChanges.value = ''; // Backend will handle actual value
      }

      interact(eventType, stateChanges);
    },
    [sessionId, interact]
  );

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-blue-100 hover:text-white transition-colors">
              ← Back to Home
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">🚀 Minimact Playground</h1>
              <p className="text-blue-100 text-sm mt-1">
                Server-side React with predictive rendering
              </p>
            </div>
          </div>
          <div className="text-right text-blue-100">
            {sessionId && (
              <p className="text-sm font-mono">
                Session: {sessionId.substring(0, 8)}...
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 flex flex-col p-4 border-r border-slate-700 gap-4 overflow-hidden">
          <Editor
            value={csharpCode}
            onChange={setCsharpCode}
            isCompiling={isCompiling}
            onCompile={handleCompile}
            compilationTime={compilationTime}
          />
        </div>

        {/* Right: Preview + Metrics */}
        <div className="w-1/2 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-start gap-3">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-red-100">Compilation Error</p>
                <p className="text-red-200 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-200 hover:text-red-100 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top: Preview */}
          <div className="flex-1 min-h-0">
            <Preview
              html={html}
              isLoading={isCompiling || isInteracting}
              error={error}
              lastInteraction={lastInteraction}
              onInteraction={handleInteraction}
            />
          </div>

          {/* Bottom: Metrics */}
          <div className="h-80 min-h-0">
            <MetricsDashboard metrics={metrics} isLoading={isCompiling} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 px-6 py-3 text-sm text-slate-400">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div>
            💡 Write C# code → Click "Run Full Demo" → Interact with preview → Watch
            green/red prediction overlays
          </div>
          <div className="text-xs text-slate-500">
            <a
              href="https://minimact.com/docs"
              target="_blank"
              className="hover:text-slate-300"
            >
              Docs
            </a>
            {' • '}
            <a
              href="https://github.com/minimact/minimact"
              target="_blank"
              className="hover:text-slate-300"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
