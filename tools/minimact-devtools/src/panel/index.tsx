/**
 * Panel Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Panel } from './Panel';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Panel />);
}
