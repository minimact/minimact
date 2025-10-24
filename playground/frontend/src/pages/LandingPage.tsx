import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌵</span>
            <h1 className="text-2xl font-bold text-white">Minimact</h1>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">
              Features
            </a>
            <a href="#examples" className="text-slate-300 hover:text-white transition-colors">
              Examples
            </a>
            <a href="https://github.com/minimact/minimact" target="_blank" className="text-slate-300 hover:text-white transition-colors">
              GitHub
            </a>
            <Link
              to="/playground"
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Try Playground →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-block px-4 py-2 bg-blue-600/10 border border-blue-600/30 rounded-full text-blue-400 text-sm font-medium mb-8">
          Server-side React for ASP.NET Core
        </div>

        <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Build React Apps<br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Without Hydration
          </span>
        </h2>

        <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
          Write familiar React/JSX, render on the server with ASP.NET Core, deliver instant updates
          with predictive patches. <span className="text-blue-400 font-semibold">&lt;5ms perceived latency</span>.
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <Link
            to="/playground"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
          >
            Try Live Demo →
          </Link>
          <a
            href="https://github.com/minimact/minimact"
            target="_blank"
            className="px-8 py-4 bg-slate-800 border border-slate-700 text-white rounded-lg font-semibold text-lg hover:bg-slate-700 transition-all"
          >
            View on GitHub
          </a>
        </div>

        {/* Code Preview */}
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 text-slate-400 text-sm font-mono">Counter.tsx</span>
          </div>
          <pre className="p-8 text-left overflow-x-auto">
            <code className="text-sm leading-relaxed">
              <span className="text-purple-400">import</span> <span className="text-slate-300">{'{'}</span> <span className="text-blue-400">useState</span> <span className="text-slate-300">{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-400">'minimact'</span><span className="text-slate-300">;</span>{'\n\n'}
              <span className="text-purple-400">export function</span> <span className="text-yellow-400">Counter</span><span className="text-slate-300">() {'{'}</span>{'\n'}
              {'  '}<span className="text-purple-400">const</span> <span className="text-slate-300">[</span><span className="text-blue-300">count</span><span className="text-slate-300">,</span> <span className="text-blue-300">setCount</span><span className="text-slate-300">]</span> <span className="text-purple-400">=</span> <span className="text-yellow-400">useState</span><span className="text-slate-300">(</span><span className="text-orange-400">0</span><span className="text-slate-300">);</span>{'\n\n'}
              {'  '}<span className="text-purple-400">return</span> <span className="text-slate-300">(</span>{'\n'}
              {'    '}<span className="text-slate-500">&lt;</span><span className="text-blue-400">div</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'      '}<span className="text-slate-500">&lt;</span><span className="text-blue-400">p</span><span className="text-slate-500">&gt;</span><span className="text-slate-300">Count: {'{'}</span><span className="text-blue-300">count</span><span className="text-slate-300">{'}'}</span><span className="text-slate-500">&lt;/</span><span className="text-blue-400">p</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'      '}<span className="text-slate-500">&lt;</span><span className="text-blue-400">button</span> <span className="text-purple-300">onClick</span><span className="text-slate-300">={'{'}</span><span className="text-slate-300">() =&gt;</span> <span className="text-yellow-400">setCount</span><span className="text-slate-300">(</span><span className="text-blue-300">count</span> <span className="text-purple-400">+</span> <span className="text-orange-400">1</span><span className="text-slate-300">)</span><span className="text-slate-300">{'}'}</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'        '}<span className="text-slate-300">Increment</span>{'\n'}
              {'      '}<span className="text-slate-500">&lt;/</span><span className="text-blue-400">button</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'    '}<span className="text-slate-500">&lt;/</span><span className="text-blue-400">div</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'  '}<span className="text-slate-300">);</span>{'\n'}
              <span className="text-slate-300">{'}'}</span>
            </code>
          </pre>
        </div>

        <p className="text-slate-400 mt-6 text-lg">
          <span className="font-bold text-white">That's it.</span> Write React, get server-rendered HTML with &lt;5ms perceived latency.
        </p>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-4xl font-bold text-white text-center mb-16">
          Why Minimact?
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-blue-600/50 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h4 className="text-xl font-bold text-white mb-3">Predictive Rendering</h4>
            <p className="text-slate-300 leading-relaxed">
              Rust-powered engine pre-computes UI patches and caches them client-side <strong>before</strong> user interaction.
              Cache hit = 0ms network latency.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-purple-600/50 transition-all">
            <div className="text-4xl mb-4">🎯</div>
            <h4 className="text-xl font-bold text-white mb-3">Zero Hydration</h4>
            <p className="text-slate-300 leading-relaxed">
              No client-side JavaScript frameworks. No massive bundles. ~5KB client library for SignalR and patch application.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-green-600/50 transition-all">
            <div className="text-4xl mb-4">🔄</div>
            <h4 className="text-xl font-bold text-white mb-3">Hybrid State</h4>
            <p className="text-slate-300 leading-relaxed">
              Mix client and server state seamlessly. Instant input updates, server-managed data. Best of both worlds.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-yellow-600/50 transition-all">
            <div className="text-4xl mb-4">✨</div>
            <h4 className="text-xl font-bold text-white mb-3">Familiar Syntax</h4>
            <p className="text-slate-300 leading-relaxed">
              Write React/JSX like you always have. Full hooks support: useState, useEffect, useRef, plus semantic hooks.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-red-600/50 transition-all">
            <div className="text-4xl mb-4">🔒</div>
            <h4 className="text-xl font-bold text-white mb-3">Secure by Default</h4>
            <p className="text-slate-300 leading-relaxed">
              Business logic stays on the server. Full .NET integration with EF Core, DI, and your favorite tools.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-pink-600/50 transition-all">
            <div className="text-4xl mb-4">🦀</div>
            <h4 className="text-xl font-bold text-white mb-3">Rust Performance</h4>
            <p className="text-slate-300 leading-relaxed">
              Blazing-fast VDOM reconciliation and prediction engine. Pattern learning for intelligent cache optimization.
            </p>
          </div>
        </div>
      </section>

      {/* Performance Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            Think of it as <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Stored Procedures for the DOM</span>
          </h3>

          <p className="text-lg text-slate-300 text-center max-w-3xl mx-auto leading-relaxed mb-8">
            Just like database stored procedures pre-compile queries for instant execution,
            Minimact pre-compiles UI state changes and caches them on the client.
            When the user interacts, they're not triggering computation — they're triggering <strong className="text-white">execution</strong> of pre-computed patches.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-slate-900 rounded-xl p-6">
              <h4 className="text-xl font-semibold text-white mb-4">Traditional Approach</h4>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span>User clicks → Send to server</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span>Wait for network round-trip (~47ms)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span>Server computes, reconciles, diffs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span>Send patches back</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border-2 border-green-600/50">
              <h4 className="text-xl font-semibold text-white mb-4">Minimact Approach</h4>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span>Server pre-sends patches (before click)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span>User clicks → Cache hit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span>Apply cached patch instantly (~0ms)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span>Verify in background (corrections if needed)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section id="examples" className="max-w-7xl mx-auto px-6 py-24">
        <h3 className="text-4xl font-bold text-white text-center mb-16">
          Predictive Hints in Action
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
            <span className="text-slate-400 text-sm font-mono">TodoList.tsx</span>
          </div>
          <pre className="p-8 overflow-x-auto">
            <code className="text-sm leading-relaxed">
              <span className="text-purple-400">function</span> <span className="text-yellow-400">TodoList</span><span className="text-slate-300">() {'{'}</span>{'\n'}
              {'  '}<span className="text-purple-400">const</span> <span className="text-slate-300">[</span><span className="text-blue-300">todos</span><span className="text-slate-300">,</span> <span className="text-blue-300">setTodos</span><span className="text-slate-300">]</span> <span className="text-purple-400">=</span> <span className="text-yellow-400">useState</span><span className="text-slate-300">([]);</span>{'\n\n'}
              {'  '}<span className="text-slate-500">// 🌵 Hint: Pre-queue patches for adding a todo</span>{'\n'}
              {'  '}<span className="text-yellow-400">usePredictHint</span><span className="text-slate-300">(</span><span className="text-green-400">'addTodo'</span><span className="text-slate-300">, {'{'}</span>{'\n'}
              {'    '}<span className="text-blue-300">todos</span><span className="text-purple-400">:</span> <span className="text-slate-300">[...</span><span className="text-blue-300">todos</span><span className="text-slate-300">,</span> <span className="text-slate-300">{'{'}</span> <span className="text-blue-300">id</span><span className="text-purple-400">:</span> <span className="text-blue-300">todos</span><span className="text-slate-300">.</span><span className="text-blue-300">length</span> <span className="text-purple-400">+</span> <span className="text-orange-400">1</span><span className="text-slate-300">,</span> <span className="text-blue-300">text</span><span className="text-purple-400">:</span> <span className="text-green-400">'New Todo'</span> <span className="text-slate-300">{'}'}</span><span className="text-slate-300">]</span>{'\n'}
              {'  '}<span className="text-slate-300">{'}'});</span>{'\n\n'}
              {'  '}<span className="text-purple-400">return</span> <span className="text-slate-300">(</span>{'\n'}
              {'    '}<span className="text-slate-500">&lt;</span><span className="text-blue-400">button</span> <span className="text-purple-300">onClick</span><span className="text-slate-300">={'{'}</span><span className="text-slate-300">() =&gt;</span> <span className="text-yellow-400">setTodos</span><span className="text-slate-300">([...])</span><span className="text-slate-300">{'}'}</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'      '}<span className="text-slate-300">Add Todo</span> <span className="text-green-400">← Cache hit = 0ms! 🟢</span>{'\n'}
              {'    '}<span className="text-slate-500">&lt;/</span><span className="text-blue-400">button</span><span className="text-slate-500">&gt;</span>{'\n'}
              {'  '}<span className="text-slate-300">);</span>{'\n'}
              <span className="text-slate-300">{'}'}</span>
            </code>
          </pre>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-16">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to try predictive rendering?
          </h3>
          <p className="text-xl text-blue-100 mb-10">
            Experience the future of server-side React in the interactive playground
          </p>
          <Link
            to="/playground"
            className="inline-block px-10 py-5 bg-white text-blue-600 rounded-lg font-bold text-xl hover:bg-blue-50 transition-all shadow-2xl hover:scale-105"
          >
            Launch Playground →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌵</span>
                <h4 className="text-lg font-bold text-white">Minimact</h4>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Server-side React for ASP.NET Core with predictive rendering
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Resources</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Getting Started</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Community</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="https://github.com/minimact/minimact" target="_blank" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discussions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">MIT License</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contributing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Code of Conduct</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>
              Built with ❤️ for the .NET and React communities • © 2025 Minimact
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
