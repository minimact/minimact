/**
 * Element Inspector Panel (Stub)
 */

import React from 'react';
import { DevToolsAgent } from '../../agent-client';

interface ElementInspectorProps {
  agent: DevToolsAgent | null;
}

export function ElementInspector({ agent }: ElementInspectorProps) {
  return (
    <div style={{ padding: '20px', color: '#d4d4d4' }}>
      <h2>🎯 Element Inspector</h2>
      <p>Coming soon: Real-time element state viewer</p>
    </div>
  );
}
