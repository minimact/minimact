/**
 * Mock infrastructure for Minimact testing
 *
 * Provides two testing modes:
 *
 * 1. **Unit Tests** (Vitest + happy-dom):
 *    - Use MockSignalRConnection + MockMinimactServer
 *    - In-memory, no real network
 *    - Fast, isolated
 *
 * 2. **Integration Tests** (Playwright + Chromium):
 *    - Use MockSignalRServer (real WebSocket server)
 *    - Real browser, real DOM, real network
 *    - Slower, realistic
 */

// Unit testing mocks (in-memory)
export { MockSignalRConnection } from './MockSignalRConnection';
export { MockMinimactServer } from './MockMinimactServer';

// Integration testing mock (WebSocket server for Playwright)
export { MockSignalRServer } from './MockSignalRServer';

// Shared types
export type { ComponentState, Patch, Hint, TemplateMap } from './MockSignalRServer';
