/**
 * Timeline Panel
 *
 * Visual state change history over time
 */

import React, { useState, useEffect, useRef } from 'react';
import { DevToolsAgent, StateChange } from '../../agent-client';
import './Timeline.css';

interface TimelineProps {
  agent: DevToolsAgent | null;
}

interface TimelineEvent {
  id: string;
  elementId: string;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  category: 'lifecycle' | 'pseudo' | 'theme' | 'visibility' | 'other';
}

export function Timeline({ agent }: TimelineProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [allElements, setAllElements] = useState<Array<{ id: string; selector: string }>>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRange, setTimeRange] = useState(60); // seconds
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load all elements
  useEffect(() => {
    if (!agent) return;

    const loadElements = async () => {
      const elements = await agent.getAllElements();
      setAllElements(elements || []);
      if (elements && elements.length > 0 && !selectedElementId) {
        setSelectedElementId(elements[0].id);
      }
    };

    loadElements();

    agent.on('element-registered', (data: any) => {
      setAllElements(prev => [...prev, data]);
    });
  }, [agent]);

  // Load history for selected element
  useEffect(() => {
    if (!agent || !selectedElementId) return;

    const loadHistory = async () => {
      const history = await agent.getHistory(selectedElementId, 100);
      if (history) {
        const timelineEvents = history.map((change, i) => ({
          id: `${change.elementId}-${change.timestamp}-${i}`,
          elementId: change.elementId,
          property: change.property,
          oldValue: change.oldValue,
          newValue: change.newValue,
          timestamp: change.timestamp,
          category: categorizeChange(change.property)
        }));
        setEvents(timelineEvents);
      }
    };

    loadHistory();
  }, [agent, selectedElementId]);

  // Listen for new state changes
  useEffect(() => {
    if (!agent || !selectedElementId || isPaused) return;

    const handleStateChange = (change: any) => {
      if (change.elementId !== selectedElementId) return;

      const newEvent: TimelineEvent = {
        id: `${change.elementId}-${change.timestamp}-${Date.now()}`,
        elementId: change.elementId,
        property: change.property,
        oldValue: change.oldValue,
        newValue: change.newValue,
        timestamp: change.timestamp,
        category: categorizeChange(change.property)
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 100));
    };

    agent.on('state-changed', handleStateChange);

    return () => {
      agent.off('state-changed', handleStateChange);
    };
  }, [agent, selectedElementId, isPaused]);

  const categorizeChange = (property: string): TimelineEvent['category'] => {
    if (property.includes('lifecycle')) return 'lifecycle';
    if (property.includes('hover') || property.includes('focus') || property.includes('active')) return 'pseudo';
    if (property.includes('theme') || property.includes('dark')) return 'theme';
    if (property.includes('intersecting') || property.includes('visible')) return 'visibility';
    return 'other';
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getCategoryColor = (category: TimelineEvent['category']): string => {
    switch (category) {
      case 'lifecycle': return '#9cdcfe';
      case 'pseudo': return '#dcdcaa';
      case 'theme': return '#c586c0';
      case 'visibility': return '#4ec9b0';
      default: return '#858585';
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterCategory === 'all') return true;
    return event.category === filterCategory;
  });

  // Calculate timeline visualization
  const now = Date.now();
  const startTime = now - (timeRange * 1000);
  const eventsInRange = filteredEvents.filter(e => e.timestamp >= startTime);

  if (!agent) {
    return (
      <div className="timeline">
        <div className="timeline-empty">
          <p>⚠️ DevTools agent not connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {/* Header */}
      <div className="timeline-header">
        <div className="timeline-title">
          <h2>⏱️ Timeline</h2>
          <span className="event-count">{filteredEvents.length} events</span>
        </div>
        <div className="timeline-controls">
          <select
            value={selectedElementId || ''}
            onChange={(e) => setSelectedElementId(e.target.value)}
            className="element-select"
          >
            <option value="">Select element...</option>
            {allElements.map(el => (
              <option key={el.id} value={el.id}>{el.selector || el.id}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Changes</option>
            <option value="lifecycle">Lifecycle</option>
            <option value="pseudo">Pseudo-State</option>
            <option value="theme">Theme</option>
            <option value="visibility">Visibility</option>
            <option value="other">Other</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range"
          >
            <option value={30}>Last 30s</option>
            <option value={60}>Last 1m</option>
            <option value={300}>Last 5m</option>
            <option value={600}>Last 10m</option>
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`btn-control ${isPaused ? 'paused' : ''}`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button
            onClick={() => setEvents([])}
            className="btn-control"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="timeline-visualization" ref={timelineRef}>
        <div className="timeline-axis">
          <div className="timeline-track">
            {eventsInRange.map((event, i) => {
              const position = ((event.timestamp - startTime) / (timeRange * 1000)) * 100;
              return (
                <div
                  key={event.id}
                  className="timeline-marker"
                  style={{
                    left: `${position}%`,
                    backgroundColor: getCategoryColor(event.category)
                  }}
                  title={`${event.property}: ${formatValue(event.oldValue)} → ${formatValue(event.newValue)}`}
                />
              );
            })}
          </div>
          <div className="timeline-labels">
            <span>-{timeRange}s</span>
            <span>-{Math.floor(timeRange * 0.75)}s</span>
            <span>-{Math.floor(timeRange * 0.5)}s</span>
            <span>-{Math.floor(timeRange * 0.25)}s</span>
            <span>now</span>
          </div>
        </div>

        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#9cdcfe' }} />
            <span>Lifecycle</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#dcdcaa' }} />
            <span>Pseudo-State</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#c586c0' }} />
            <span>Theme</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4ec9b0' }} />
            <span>Visibility</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#858585' }} />
            <span>Other</span>
          </div>
        </div>
      </div>

      {/* Event List */}
      <div className="timeline-events">
        {!selectedElementId ? (
          <div className="timeline-empty">
            <p>Select an element to view its timeline</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="timeline-empty">
            <p>No state changes recorded yet</p>
            <p style={{ fontSize: '12px', color: '#858585' }}>Interact with the page to see events appear</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className={`timeline-event category-${event.category}`}>
              <div className="event-header">
                <span className="event-category" style={{ backgroundColor: getCategoryColor(event.category) }}>
                  {event.category}
                </span>
                <span className="event-property">{event.property}</span>
                <span className="event-time">{getRelativeTime(event.timestamp)}</span>
              </div>
              <div className="event-change">
                <span className="old-value">{formatValue(event.oldValue)}</span>
                <span className="arrow">→</span>
                <span className="new-value">{formatValue(event.newValue)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
