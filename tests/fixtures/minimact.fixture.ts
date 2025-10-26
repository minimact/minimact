/**
 * Playwright fixture for Minimact testing
 *
 * Automatically starts MockSignalRServer before tests and stops it after.
 * Provides helper methods for common test operations.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/minimact.fixture';
 *
 *   test('counter increments', async ({ page, minimactServer }) => {
 *     // Server is already running on localhost:8080
 *     minimactServer.registerComponent('Counter-1', { count: 0 });
 *
 *     await page.goto('http://localhost:3000/counter');
 *     await page.click('button#increment');
 *
 *     // Check server state updated
 *     expect(minimactServer.getComponentState('Counter-1')?.count).toBe(1);
 *   });
 */

import { test as base, expect } from '@playwright/test';
import { MockSignalRServer } from '../mocks/MockSignalRServer';

export interface MinimactFixtures {
  minimactServer: MockSignalRServer;
  mockServerUrl: string;
}

/**
 * Extended Playwright test with Minimact mock server
 */
export const test = base.extend<MinimactFixtures>({
  // Mock server fixture - automatically starts/stops
  minimactServer: async ({}, use) => {
    const port = 8765; // Use unprivileged port (8765 instead of 8080)
    const server = new MockSignalRServer(port);

    // Start server before test
    await server.start();

    // Provide server to test
    await use(server);

    // Stop server after test
    await server.stop();
  },

  // URL to connect to mock server
  mockServerUrl: async ({ minimactServer }, use) => {
    await use('http://localhost:8765/minimact');
  }
});

export { expect };

/**
 * Helper to wait for component state change
 */
export async function waitForStateChange(
  server: MockSignalRServer,
  componentId: string,
  key: string,
  expectedValue: any,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const state = server.getComponentState(componentId);
    if (state && state[key] === expectedValue) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Timeout waiting for ${componentId}.${key} to equal ${expectedValue}`);
}

/**
 * Helper to wait for DOM element state change
 */
export async function waitForDomStateChange(
  server: MockSignalRServer,
  componentId: string,
  stateKey: string,
  predicate: (snapshot: any) => boolean,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const snapshot = server.getDomElementState(componentId, stateKey);
    if (snapshot && predicate(snapshot)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Timeout waiting for DOM state change on ${componentId}.${stateKey}`);
}
