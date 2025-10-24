/**
 * Main DevTools Panel Component
 *
 * The telescope into the DOM database 🔭🗃️
 */

import React, { useState, useEffect } from 'react';
import { SQLConsole } from './panels/SQLConsole';
import { ElementInspector } from './panels/ElementInspector';
import { Timeline } from './panels/Timeline';
import { PerformanceProfiler } from './panels/PerformanceProfiler';
import { DevToolsAgent } from '../agent-client';

import './Panel.css';

type TabName = 'sql' | 'inspector' | 'timeline' | 'performance';

export function Panel() {
  const [activeTab, setActiveTab] = useState<TabName>('sql');
  const [agent, setAgent] = useState<DevToolsAgent | null>(null);
  const [connected, setConnected] = useState(false);
  const [elementCount, setElementCount] = useState(0);

  useEffect(() => {
    // Initialize connection to agent
    const agentClient = new DevToolsAgent(chrome.devtools.inspectedWindow.tabId);

    agentClient.on('agent-ready', () => {
      setConnected(true);
    });

    agentClient.on('registry-hooked', (data: any) => {
      setElementCount(data.elementCount);
    });

    agentClient.on('element-registered', () => {
      setElementCount(count => count + 1);
    });

    agentClient.on('element-unregistered', () => {
      setElementCount(count => Math.max(0, count - 1));
    });

    setAgent(agentClient);

    return () => {
      agentClient.disconnect();
    };
  }, []);

  if (!connected) {
    return (
      <div className="panel-loading">
        <div className="loading-content">
          <div className="loading-icon">🔭🌵</div>
          <h2>Connecting to Minimact...</h2>
          <p>Make sure your application is using Minimact Punch</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="minimact-devtools-panel">
      <header className="panel-header">
        <div className="header-title">
          <span className="logo">🔭🌵</span>
          <h1>Minimact DevTools</h1>
          <span className="tagline">PostgreSQL Inspector for the DOM</span>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-label">Tracked Elements</span>
            <span className="stat-value">{elementCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Connection</span>
            <span className="stat-value status-connected">● Connected</span>
          </div>
        </div>
      </header>

      <nav className="panel-tabs">
        <button
          className={`tab ${activeTab === 'sql' ? 'active' : ''}`}
          onClick={() => setActiveTab('sql')}
        >
          <span className="tab-icon">🔍</span>
          SQL Console
        </button>
        <button
          className={`tab ${activeTab === 'inspector' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspector')}
        >
          <span className="tab-icon">🎯</span>
          Inspector
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <span className="tab-icon">⏱️</span>
          Timeline
        </button>
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <span className="tab-icon">⚡</span>
          Performance
        </button>
      </nav>

      <main className="panel-content">
        {activeTab === 'sql' && <SQLConsole agent={agent} />}
        {activeTab === 'inspector' && <ElementInspector agent={agent} />}
        {activeTab === 'timeline' && <Timeline agent={agent} />}
        {activeTab === 'performance' && <PerformanceProfiler agent={agent} />}
      </main>
    </div>
  );
}
