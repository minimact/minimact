/**
 * SQL Console Panel
 *
 * Interactive SQL-like query interface for the DOM database 🗃️
 */

import React, { useState, useEffect, useRef } from 'react';
import { DevToolsAgent, QueryConfig, ElementData } from '../../agent-client';
import './SQLConsole.css';

interface SQLConsoleProps {
  agent: DevToolsAgent | null;
}

interface QueryResult {
  query: string;
  results: ElementData[];
  executionTime: number;
  timestamp: number;
}

export function SQLConsole({ agent }: SQLConsoleProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [executing, setExecuting] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(1000);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveIntervalRef = useRef<number>();

  // Example queries
  const examples = [
    {
      name: 'All visible cards',
      query: `useDomQuery()
  .from('.card')
  .where(c => c.isIntersecting)
  .selectAll()`
    },
    {
      name: 'Hovered elements',
      query: `useDomQuery()
  .from('*')
  .where(el => el.state.hover)
  .selectAll()`
    },
    {
      name: 'Top 10 most active',
      query: `useDomQuery()
  .from('.widget')
  .orderBy(w => w.history.changeCount, 'DESC')
  .limit(10)
  .selectAll()`
    },
    {
      name: 'Dark mode elements',
      query: `useDomQuery()
  .from('*')
  .where(el => el.theme.isDark)
  .selectAll()`
    },
    {
      name: 'Lifecycle: visible',
      query: `useDomQuery()
  .from('.component')
  .where(c => c.lifecycle.lifecycleState === 'visible')
  .selectAll()`
    }
  ];

  // Parse query into QueryConfig
  const parseQuery = (queryString: string): QueryConfig | null => {
    try {
      // Simple parser for .from().where().orderBy().limit() syntax
      const fromMatch = queryString.match(/\.from\(['"](.+?)['"]\)/);
      const whereMatch = queryString.match(/\.where\((.+?)\)/);
      const orderByMatch = queryString.match(/\.orderBy\((.+?),\s*['"](\w+)['"]\)/);
      const limitMatch = queryString.match(/\.limit\((\d+)\)/);

      if (!fromMatch) return null;

      const config: QueryConfig = {
        selector: fromMatch[1]
      };

      // Parse WHERE clause (basic support)
      if (whereMatch) {
        // Extract property and value from lambda
        // e.g., "c => c.isIntersecting" or "el => el.state.hover"
        const lambda = whereMatch[1];
        const propertyMatch = lambda.match(/=>\s*\w+\.(.+?)(?:\s*$|\s*[=<>!])/);

        if (propertyMatch) {
          const property = propertyMatch[1];

          // Check for comparison
          const comparisonMatch = lambda.match(/([=<>!]+)\s*(.+?)$/);

          config.filters = [{
            property,
            operator: comparisonMatch ? comparisonMatch[1].replace('==', '=') : '=',
            value: comparisonMatch ? eval(comparisonMatch[2].trim()) : true
          }];
        }
      }

      // Parse ORDER BY
      if (orderByMatch) {
        const propertyMatch = orderByMatch[1].match(/=>\s*\w+\.(.+?)$/);
        if (propertyMatch) {
          config.orderBy = {
            property: propertyMatch[1].trim(),
            direction: orderByMatch[2].toUpperCase() as 'ASC' | 'DESC'
          };
        }
      }

      // Parse LIMIT
      if (limitMatch) {
        config.limit = parseInt(limitMatch[1]);
      }

      return config;
    } catch (error) {
      console.error('[SQL Console] Query parse error:', error);
      return null;
    }
  };

  // Execute query
  const executeQuery = async () => {
    if (!agent || !query.trim()) return;

    setExecuting(true);
    const startTime = performance.now();

    try {
      const config = parseQuery(query);
      if (!config) {
        alert('Invalid query syntax. Use: useDomQuery().from(selector).where(...).selectAll()');
        setExecuting(false);
        return;
      }

      const queryResults = await agent.query(config);
      const executionTime = performance.now() - startTime;

      const result: QueryResult = {
        query,
        results: queryResults,
        executionTime,
        timestamp: Date.now()
      };

      setResults(result);
      setHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('[SQL Console] Query execution error:', error);
      alert('Query execution failed. Check console for details.');
    } finally {
      setExecuting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeQuery();
    }
  };

  // Live mode auto-refresh
  useEffect(() => {
    if (liveMode && query.trim()) {
      liveIntervalRef.current = window.setInterval(() => {
        executeQuery();
      }, autoRefreshInterval);

      return () => {
        if (liveIntervalRef.current) {
          clearInterval(liveIntervalRef.current);
        }
      };
    }
  }, [liveMode, autoRefreshInterval, query]);

  // Inspect element in DOM
  const inspectElement = (element: ElementData) => {
    // Use Chrome DevTools API to highlight element
    const selector = element.id
      ? `#${element.id}`
      : element.className
      ? `.${element.className.split(' ')[0]}`
      : element.tagName;

    chrome.devtools.inspectedWindow.eval(
      `inspect(document.querySelector('${selector}'))`
    );
  };

  // Copy to clipboard
  const copyResults = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results.results, null, 2));
  };

  return (
    <div className="sql-console">
      <div className="console-header">
        <div className="header-actions">
          <button
            className="btn-icon"
            onClick={() => setQuery('')}
            title="Clear query"
          >
            🗑️ Clear
          </button>
          <button
            className={`btn-icon ${liveMode ? 'active' : ''}`}
            onClick={() => setLiveMode(!liveMode)}
            title="Toggle live mode"
          >
            🔄 Live Mode
          </button>
          {liveMode && (
            <select
              className="refresh-interval"
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value))}
            >
              <option value="500">0.5s</option>
              <option value="1000">1s</option>
              <option value="2000">2s</option>
              <option value="5000">5s</option>
            </select>
          )}
        </div>
        <div className="examples-dropdown">
          <select
            onChange={(e) => e.target.value && setQuery(e.target.value)}
            value=""
          >
            <option value="">📚 Example Queries</option>
            {examples.map((ex, i) => (
              <option key={i} value={ex.query}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="query-editor">
        <div className="editor-label">
          <span>🔍 DOM SQL Query</span>
          <span className="editor-hint">Ctrl+Enter to execute</span>
        </div>
        <textarea
          ref={textareaRef}
          className="query-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`useDomQuery()
  .from('.card')
  .where(c => c.isIntersecting && c.state.hover)
  .orderBy(c => c.history.changeCount, 'DESC')
  .limit(10)
  .selectAll()`}
          rows={6}
          spellCheck={false}
        />
        <button
          className="btn-execute"
          onClick={executeQuery}
          disabled={executing || !query.trim()}
        >
          {executing ? '⏳ Executing...' : '▶ Run Query (Ctrl+Enter)'}
        </button>
      </div>

      {results && (
        <div className="results-section">
          <div className="results-header">
            <h3>
              📊 Results ({results.results.length} rows)
            </h3>
            <div className="results-meta">
              <span>Executed in {results.executionTime.toFixed(2)}ms</span>
              <span>•</span>
              <span>{new Date(results.timestamp).toLocaleTimeString()}</span>
              <button className="btn-icon" onClick={copyResults}>
                📋 Copy JSON
              </button>
            </div>
          </div>

          {results.results.length === 0 ? (
            <div className="no-results">
              <p>No elements found matching query</p>
            </div>
          ) : (
            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>ID</th>
                    <th>Classes</th>
                    <th>State</th>
                    <th>Theme</th>
                    <th>History</th>
                    <th>Lifecycle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((el, i) => (
                    <tr key={i}>
                      <td>
                        <code className="element-tag">&lt;{el.tagName}&gt;</code>
                      </td>
                      <td>{el.id || '-'}</td>
                      <td>
                        <div className="class-list">
                          {el.classList.slice(0, 3).map((cls, j) => (
                            <span key={j} className="class-badge">{cls}</span>
                          ))}
                          {el.classList.length > 3 && (
                            <span className="class-more">+{el.classList.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {el.state && (
                          <div className="state-indicators">
                            {el.state.hover && <span className="indicator hover">🎯 hover</span>}
                            {el.state.focus && <span className="indicator focus">🔍 focus</span>}
                            {el.state.active && <span className="indicator active">⚡ active</span>}
                          </div>
                        )}
                      </td>
                      <td>
                        {el.theme && (
                          <div className="theme-info">
                            {el.theme.isDark ? '🌙 dark' : '☀️ light'}
                          </div>
                        )}
                      </td>
                      <td>
                        {el.history && (
                          <div className="history-info">
                            <div>{el.history.changeCount} changes</div>
                            <div className="text-muted">
                              {el.history.changesPerSecond.toFixed(2)}/s
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {el.lifecycle && (
                          <span className={`lifecycle-badge lifecycle-${el.lifecycle.lifecycleState}`}>
                            {el.lifecycle.lifecycleState}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-sm"
                            onClick={() => inspectElement(el)}
                            title="Inspect in Elements panel"
                          >
                            🔍
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => console.log(el)}
                            title="Log to console"
                          >
                            📝
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h3>📜 Query History</h3>
          <div className="history-list">
            {history.map((item, i) => (
              <div
                key={i}
                className="history-item"
                onClick={() => setQuery(item.query)}
              >
                <div className="history-query">{item.query.split('\n')[0]}...</div>
                <div className="history-meta">
                  {item.results.length} rows • {item.executionTime.toFixed(2)}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
