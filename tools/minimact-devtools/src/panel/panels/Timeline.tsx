/**
 * Timeline Panel (Stub)
 */

import React from 'react';
import { DevToolsAgent } from '../../agent-client';

interface TimelineProps {
  agent: DevToolsAgent | null;
}

export function Timeline({ agent }: TimelineProps) {
  return (
    <div style={{ padding: '20px', color: '#d4d4d4' }}>
      <h2>⏱️ Timeline</h2>
      <p>Coming soon: State change visualization over time</p>
    </div>
  );
}
