/**
 * Performance Profiler Panel
 *
 * Query performance, tracker overhead, and cache statistics
 */

import React, { useState, useEffect } from 'react';
import { DevToolsAgent } from '../../agent-client';
import './PerformanceProfiler.css';

interface PerformanceProfilerProps {
  agent: DevToolsAgent | null;
}

interface QueryMetric {
  id: string;
  query: string;
  executionTime: number;
  elementsScanned: number;
  elementsReturned: number;
  timestamp: number;
}

interface TrackerStats {
  name: string;
  instanceCount: number;
  avgOverhead: number;
  totalObservations: number;
}

export function PerformanceProfiler({ agent }: PerformanceProfilerProps) {
  const [queryMetrics, setQueryMetrics] = useState<QueryMetric[]>([]);
  const [trackerStats, setTrackerStats] = useState<TrackerStats[]>([
    { name: 'PseudoStateTracker', instanceCount: 0, avgOverhead: 0.1, totalObservations: 0 },
    { name: 'ThemeStateTracker', instanceCount: 0, avgOverhead: 0.05, totalObservations: 0 },
    { name: 'StateHistoryTracker', instanceCount: 0, avgOverhead: 0.3, totalObservations: 0 },
    { name: 'LifecycleStateTracker', instanceCount: 0, avgOverhead: 0.2, totalObservations: 0 },
    { name: 'IntersectionTracker', instanceCount: 0, avgOverhead: 0.15, totalObservations: 0 },
  ]);
  const [cacheStats, setCacheStats] = useState({
    hitRate: 0,
    accuracy: 0,
    patchesCached: 0,
    cacheMemory: 0
  });
  const [isRecording, setIsRecording] = useState(false);

  // Load all elements and calculate tracker stats
  useEffect(() => {
    if (!agent) return;

    const updateStats = async () => {
      const elements = await agent.getAllElements();
      if (!elements) return;

      // Count tracker instances
      const trackerCounts: Record<string, number> = {};
      elements.forEach(el => {
        el.trackers.forEach(tracker => {
          trackerCounts[tracker] = (trackerCounts[tracker] || 0) + 1;
        });
      });

      setTrackerStats(prev => prev.map(stat => ({
        ...stat,
        instanceCount: trackerCounts[stat.name] || 0
      })));
    };

    updateStats();

    // Update periodically
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [agent]);

  // Record query metrics
  const recordQuery = (query: string, executionTime: number, scanned: number, returned: number) => {
    if (!isRecording) return;

    const metric: QueryMetric = {
      id: `query-${Date.now()}`,
      query,
      executionTime,
      elementsScanned: scanned,
      elementsReturned: returned,
      timestamp: Date.now()
    };

    setQueryMetrics(prev => [metric, ...prev].slice(0, 50));
  };

  // Calculate aggregates
  const totalQueries = queryMetrics.length;
  const avgQueryTime = totalQueries > 0
    ? queryMetrics.reduce((sum, q) => sum + q.executionTime, 0) / totalQueries
    : 0;
  const slowestQuery = queryMetrics.length > 0
    ? Math.max(...queryMetrics.map(q => q.executionTime))
    : 0;

  const totalTrackers = trackerStats.reduce((sum, t) => sum + t.instanceCount, 0);
  const totalOverhead = trackerStats.reduce((sum, t) => sum + (t.avgOverhead * t.instanceCount), 0);

  if (!agent) {
    return (
      <div className="performance-profiler">
        <div className="profiler-empty">
          <p>⚠️ DevTools agent not connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-profiler">
      {/* Header */}
      <div className="profiler-header">
        <div className="profiler-title">
          <h2>⚡ Performance Profiler</h2>
        </div>
        <div className="profiler-controls">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`btn-control ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
          </button>
          <button
            onClick={() => setQueryMetrics([])}
            className="btn-control"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="profiler-overview">
        <div className="overview-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">Total Queries</div>
            <div className="card-value">{totalQueries}</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <div className="card-label">Avg Query Time</div>
            <div className="card-value">{avgQueryTime.toFixed(2)}ms</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">🐌</div>
          <div className="card-content">
            <div className="card-label">Slowest Query</div>
            <div className="card-value">{slowestQuery.toFixed(2)}ms</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">🔭</div>
          <div className="card-content">
            <div className="card-label">Active Trackers</div>
            <div className="card-value">{totalTrackers}</div>
          </div>
        </div>
      </div>

      {/* Tracker Overhead */}
      <div className="profiler-section">
        <h3>🔍 Tracker Overhead</h3>
        <div className="tracker-table">
          <div className="tracker-header">
            <div className="tracker-col-name">Tracker</div>
            <div className="tracker-col">Instances</div>
            <div className="tracker-col">Avg Overhead</div>
            <div className="tracker-col">Total Cost</div>
            <div className="tracker-col">Status</div>
          </div>
          {trackerStats.map(tracker => {
            const totalCost = tracker.avgOverhead * tracker.instanceCount;
            const status = totalCost < 1 ? 'good' : totalCost < 5 ? 'warning' : 'critical';

            return (
              <div key={tracker.name} className="tracker-row">
                <div className="tracker-col-name">
                  <span className="tracker-name">{tracker.name}</span>
                </div>
                <div className="tracker-col">{tracker.instanceCount}</div>
                <div className="tracker-col">{tracker.avgOverhead.toFixed(2)}ms</div>
                <div className="tracker-col">{totalCost.toFixed(2)}ms</div>
                <div className="tracker-col">
                  <span className={`status-badge status-${status}`}>
                    {status === 'good' ? '✅ Good' : status === 'warning' ? '⚠️ OK' : '🔴 High'}
                  </span>
                </div>
              </div>
            );
          })}
          <div className="tracker-row tracker-total">
            <div className="tracker-col-name"><strong>Total</strong></div>
            <div className="tracker-col"><strong>{totalTrackers}</strong></div>
            <div className="tracker-col">-</div>
            <div className="tracker-col"><strong>{totalOverhead.toFixed(2)}ms</strong></div>
            <div className="tracker-col">-</div>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="profiler-section">
        <h3>🎯 Prediction Performance</h3>
        <div className="cache-stats">
          <div className="stat-item">
            <div className="stat-label">Cache Hit Rate</div>
            <div className="stat-value-large">{cacheStats.hitRate}%</div>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${cacheStats.hitRate}%` }} />
            </div>
            <div className="stat-quality">
              {cacheStats.hitRate >= 90 ? '🟢 Excellent' : cacheStats.hitRate >= 70 ? '🟡 Good' : '🔴 Needs Improvement'}
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Prediction Accuracy</div>
            <div className="stat-value-large">{cacheStats.accuracy}%</div>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${cacheStats.accuracy}%` }} />
            </div>
            <div className="stat-quality">
              {cacheStats.accuracy >= 90 ? '🟢 Excellent' : cacheStats.accuracy >= 70 ? '🟡 Good' : '🔴 Needs Improvement'}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-row-item">
              <div className="stat-label">Patches Cached</div>
              <div className="stat-value">{cacheStats.patchesCached}</div>
            </div>
            <div className="stat-row-item">
              <div className="stat-label">Cache Memory</div>
              <div className="stat-value">{cacheStats.cacheMemory} KB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Query History */}
      <div className="profiler-section">
        <h3>📜 Query History</h3>
        {!isRecording && queryMetrics.length === 0 ? (
          <div className="profiler-empty-small">
            <p>Click "Start Recording" to track query performance</p>
          </div>
        ) : queryMetrics.length === 0 ? (
          <div className="profiler-empty-small">
            <p>Recording... Run queries in the SQL Console to see metrics</p>
          </div>
        ) : (
          <div className="query-list">
            {queryMetrics.map(metric => {
              const efficiency = metric.elementsScanned > 0
                ? (metric.elementsReturned / metric.elementsScanned) * 100
                : 0;
              const status = metric.executionTime < 1 ? 'fast' : metric.executionTime < 5 ? 'normal' : 'slow';

              return (
                <div key={metric.id} className={`query-item status-${status}`}>
                  <div className="query-header">
                    <span className={`query-status status-${status}`}>
                      {status === 'fast' ? '🟢' : status === 'normal' ? '🟡' : '🔴'}
                    </span>
                    <span className="query-time">{metric.executionTime.toFixed(2)}ms</span>
                    <span className="query-date">{new Date(metric.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="query-code">{metric.query.substring(0, 100)}{metric.query.length > 100 ? '...' : ''}</div>
                  <div className="query-stats">
                    <span>Scanned: <strong>{metric.elementsScanned}</strong></span>
                    <span>Returned: <strong>{metric.elementsReturned}</strong></span>
                    <span>Efficiency: <strong>{efficiency.toFixed(1)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
