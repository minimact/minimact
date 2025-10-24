/**
 * Performance Profiler Panel (Stub)
 */

import React from 'react';
import { DevToolsAgent } from '../../agent-client';

interface PerformanceProfilerProps {
  agent: DevToolsAgent | null;
}

export function PerformanceProfiler({ agent }: PerformanceProfilerProps) {
  return (
    <div style={{ padding: '20px', color: '#d4d4d4' }}>
      <h2>⚡ Performance Profiler</h2>
      <p>Coming soon: Query performance and cache statistics</p>
    </div>
  );
}
