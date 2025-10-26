/**
 * Basic Playwright test to verify infrastructure
 *
 * Tests:
 * 1. MockSignalRServer starts and accepts connections
 * 2. Test page loads
 * 3. Minimact client connects to mock server
 */

import { test, expect } from '../fixtures/minimact.fixture';

test.describe('Basic Infrastructure', () => {
  test('mock server starts and accepts connections', async ({ minimactServer }) => {
    // Server should be running
    expect(minimactServer).toBeDefined();
    expect(minimactServer.getClientCount()).toBe(0);
  });

  test('test page loads successfully', async ({ page }) => {
    await page.goto('/test-counter.html');

    // Page should load
    await expect(page).toHaveTitle('Test Counter - Minimact');

    // Counter element should exist
    await expect(page.locator('#Counter-123')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Count: 0');
    await expect(page.locator('button#increment')).toBeVisible();
  });

  test('minimact client connects to mock server', async ({ page, minimactServer }) => {
    // Listen to console logs
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.error(`[Browser Error]`, error));

    // Register component before page loads
    minimactServer.registerComponent('Counter-123', { count: 0 });

    await page.goto('/test-counter.html');

    // Wait for client to connect (check console logs)
    await page.waitForTimeout(2000);

    // Check if client connected to server
    const clientCount = minimactServer.getClientCount();
    console.log(`[Test] Client count: ${clientCount}`);
    expect(clientCount).toBe(1);
  });
});
