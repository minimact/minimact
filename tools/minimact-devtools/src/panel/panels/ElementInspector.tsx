/**
 * Element Inspector Panel
 *
 * Detailed real-time view of a selected element's state
 */

import React, { useState, useEffect } from 'react';
import { DevToolsAgent, ElementData } from '../../agent-client';
import './ElementInspector.css';

interface ElementInspectorProps {
  agent: DevToolsAgent | null;
}

export function ElementInspector({ agent }: ElementInspectorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementData, setElementData] = useState<ElementData | null>(null);
  const [allElements, setAllElements] = useState<Array<{ id: string; selector: string; trackers: string[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load all elements on mount
  useEffect(() => {
    if (!agent) return;

    const loadElements = async () => {
      const elements = await agent.getAllElements();
      setAllElements(elements || []);
    };

    loadElements();

    // Subscribe to element registration events
    const handleElementRegistered = (data: any) => {
      setAllElements(prev => [...prev, data]);
    };

    agent.on('element-registered', handleElementRegistered);

    return () => {
      agent.off('element-registered', handleElementRegistered);
    };
  }, [agent]);

  // Load element data when selection changes
  useEffect(() => {
    if (!agent || !selectedElementId) return;

    const loadElement = async () => {
      setLoading(true);
      const data = await agent.getElement(selectedElementId);
      setElementData(data);
      setLoading(false);
    };

    loadElement();

    // Subscribe to state changes for this element
    const handleStateChange = (change: any) => {
      if (change.elementId === selectedElementId) {
        loadElement();
      }
    };

    agent.on('state-changed', handleStateChange);

    return () => {
      agent.off('state-changed', handleStateChange);
    };
  }, [agent, selectedElementId]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !agent || !selectedElementId) return;

    const interval = setInterval(async () => {
      const data = await agent.getElement(selectedElementId);
      setElementData(data);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, agent, selectedElementId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const inspectInElements = () => {
    if (!selectedElementId) return;
    chrome.devtools.inspectedWindow.eval(`inspect(document.querySelector('[data-minimact-id="${selectedElementId}"]'))`);
  };

  if (!agent) {
    return (
      <div className="element-inspector">
        <div className="inspector-empty">
          <p>⚠️ DevTools agent not connected</p>
          <p>Make sure the page is using minimact-punch</p>
        </div>
      </div>
    );
  }

  return (
    <div className="element-inspector">
      {/* Element Selector */}
      <div className="inspector-sidebar">
        <div className="sidebar-header">
          <h3>📋 Tracked Elements</h3>
          <span className="element-count">{allElements.length}</span>
        </div>
        <div className="element-list">
          {allElements.length === 0 ? (
            <div className="empty-message">No elements tracked yet</div>
          ) : (
            allElements.map((el) => (
              <div
                key={el.id}
                className={`element-item ${selectedElementId === el.id ? 'selected' : ''}`}
                onClick={() => setSelectedElementId(el.id)}
              >
                <div className="element-selector">{el.selector || 'Unknown'}</div>
                <div className="element-trackers">
                  {el.trackers.map(t => (
                    <span key={t} className="tracker-badge">{t}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Element Details */}
      <div className="inspector-content">
        {!selectedElementId ? (
          <div className="inspector-empty">
            <h2>🎯 Element Inspector</h2>
            <p>Select an element from the left to inspect its state</p>
          </div>
        ) : loading ? (
          <div className="inspector-loading">Loading...</div>
        ) : !elementData ? (
          <div className="inspector-empty">
            <p>⚠️ Element not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="inspector-header">
              <div className="element-title">
                <span className="tag-name">{elementData.tagName}</span>
                {elementData.id && <span className="element-id">#{elementData.id}</span>}
                {elementData.className && <span className="element-classes">.{elementData.className.split(' ').join('.')}</span>}
              </div>
              <div className="inspector-actions">
                <label className="auto-refresh-toggle">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  🔄 Live
                </label>
                <button onClick={inspectInElements} className="btn-action">🔍 Inspect</button>
                <button onClick={() => copyToClipboard(JSON.stringify(elementData, null, 2))} className="btn-action">
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Structure */}
            <div className="inspector-section">
              <h3>📐 STRUCTURE</h3>
              <div className="property-grid">
                <div className="property">
                  <span className="property-label">Children:</span>
                  <span className="property-value">{elementData.childrenCount}</span>
                </div>
                <div className="property">
                  <span className="property-label">Classes:</span>
                  <span className="property-value">
                    {elementData.classList.length > 0 ? (
                      <div className="class-list">
                        {elementData.classList.map((cls, i) => (
                          <span key={i} className="class-badge">{cls}</span>
                        ))}
                      </div>
                    ) : 'none'}
                  </span>
                </div>
                {Object.keys(elementData.attributes).length > 0 && (
                  <div className="property full-width">
                    <span className="property-label">Attributes:</span>
                    <div className="attributes-list">
                      {Object.entries(elementData.attributes).map(([key, value]) => (
                        <div key={key} className="attribute">
                          <span className="attr-key">{key}</span>
                          <span className="attr-value">"{value}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pseudo-State */}
            {elementData.state && (
              <div className="inspector-section">
                <h3>🎨 PSEUDO-STATE <span className="live-badge">LIVE</span></h3>
                <div className="property-grid">
                  <div className="property">
                    <span className="property-label">hover:</span>
                    <span className={`property-value boolean ${elementData.state.hover ? 'true' : 'false'}`}>
                      {elementData.state.hover ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                  <div className="property">
                    <span className="property-label">focus:</span>
                    <span className={`property-value boolean ${elementData.state.focus ? 'true' : 'false'}`}>
                      {elementData.state.focus ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                  <div className="property">
                    <span className="property-label">active:</span>
                    <span className={`property-value boolean ${elementData.state.active ? 'true' : 'false'}`}>
                      {elementData.state.active ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                  <div className="property">
                    <span className="property-label">disabled:</span>
                    <span className={`property-value boolean ${elementData.state.disabled ? 'true' : 'false'}`}>
                      {elementData.state.disabled ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Theme */}
            {elementData.theme && (
              <div className="inspector-section">
                <h3>🌓 THEME</h3>
                <div className="property-grid">
                  <div className="property">
                    <span className="property-label">isDark:</span>
                    <span className={`property-value boolean ${elementData.theme.isDark ? 'true' : 'false'}`}>
                      {elementData.theme.isDark ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                  <div className="property">
                    <span className="property-label">reducedMotion:</span>
                    <span className={`property-value boolean ${elementData.theme.reducedMotion ? 'true' : 'false'}`}>
                      {elementData.theme.reducedMotion ? '✅ true' : '❌ false'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Temporal */}
            {elementData.history && (
              <div className="inspector-section">
                <h3>⏰ TEMPORAL</h3>
                <div className="property-grid">
                  <div className="property">
                    <span className="property-label">Age:</span>
                    <span className="property-value">{elementData.history.ageInSeconds.toFixed(1)}s</span>
                  </div>
                  <div className="property">
                    <span className="property-label">Change Count:</span>
                    <span className="property-value">{elementData.history.changeCount}</span>
                  </div>
                  <div className="property">
                    <span className="property-label">Changes/sec:</span>
                    <span className="property-value">{elementData.history.changesPerSecond.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Lifecycle */}
            {elementData.lifecycle && (
              <div className="inspector-section">
                <h3>🌀 LIFECYCLE <span className="live-badge">LIVE</span></h3>
                <div className="property-grid">
                  <div className="property">
                    <span className="property-label">Current State:</span>
                    <span className={`property-value lifecycle-state state-${elementData.lifecycle.lifecycleState}`}>
                      {elementData.lifecycle.lifecycleState}
                    </span>
                  </div>
                  <div className="property">
                    <span className="property-label">Time in State:</span>
                    <span className="property-value">{elementData.lifecycle.timeInState.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Intersection */}
            <div className="inspector-section">
              <h3>👁️ VISIBILITY</h3>
              <div className="property-grid">
                <div className="property">
                  <span className="property-label">isIntersecting:</span>
                  <span className={`property-value boolean ${elementData.isIntersecting ? 'true' : 'false'}`}>
                    {elementData.isIntersecting ? '✅ true' : '❌ false'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
