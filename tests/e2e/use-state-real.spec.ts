/**
 * Real useState with DOM Events Tests
 *
 * Tests that useState actually syncs to the server when triggered by real user interactions.
 * Uses the test-use-state.html page which has real buttons and inputs.
 */

import { test, expect, waitForStateChange } from '../fixtures/minimact.fixture';

test.describe('Real useState with DOM Events', () => {
  test('counter increment button triggers state sync', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.error('[Browser Error]', error));

    // Register component
    minimactServer.registerComponent('TestComponent-1', { state_0: 0 });

    // Load page
    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000); // Wait for Minimact to start and setup

    console.log('[Test] Page loaded, Minimact started');

    // Click the increment button
    await page.click('#increment-btn');

    console.log('[Test] Clicked increment button, waiting for state sync...');

    // Wait for state to sync to server
    await waitForStateChange(minimactServer, 'TestComponent-1', 'state_0', 1, 5000);

    // Verify server has the updated state
    const serverState = minimactServer.getComponentState('TestComponent-1');
    expect(serverState?.state_0).toBe(1);

    console.log('[Test] ✅ Counter state synced to server successfully!');
  });

  test('counter multiple clicks sync correctly', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-1', { state_0: 0 });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Click increment 3 times
    await page.click('#increment-btn');
    await page.waitForTimeout(200);
    await page.click('#increment-btn');
    await page.waitForTimeout(200);
    await page.click('#increment-btn');

    console.log('[Test] Clicked increment 3 times, waiting for final state...');

    await waitForStateChange(minimactServer, 'TestComponent-1', 'state_0', 3, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-1');
    expect(serverState?.state_0).toBe(3);

    console.log('[Test] ✅ Multiple clicks synced correctly!');
  });

  test('counter decrement works', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-1', { state_0: 5 });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Click decrement
    await page.click('#decrement-btn');

    console.log('[Test] Clicked decrement, waiting for state sync...');

    await waitForStateChange(minimactServer, 'TestComponent-1', 'state_0', 4, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-1');
    expect(serverState?.state_0).toBe(4);

    console.log('[Test] ✅ Decrement synced to server!');
  });

  test('counter reset works', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-1', { state_0: 10 });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Click reset
    await page.click('#reset-btn');

    console.log('[Test] Clicked reset, waiting for state sync...');

    await waitForStateChange(minimactServer, 'TestComponent-1', 'state_0', 0, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-1');
    expect(serverState?.state_0).toBe(0);

    console.log('[Test] ✅ Reset synced to server!');
  });

  test('text input triggers state sync', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-2', { state_0: '' });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Type in text input
    await page.fill('#text-input', 'Hello Minimact!');

    console.log('[Test] Typed text, waiting for state sync...');

    await waitForStateChange(minimactServer, 'TestComponent-2', 'state_0', 'Hello Minimact!', 5000);

    const serverState = minimactServer.getComponentState('TestComponent-2');
    expect(serverState?.state_0).toBe('Hello Minimact!');

    console.log('[Test] ✅ Text input synced to server!');
  });

  test('text clear button works', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-2', { state_0: 'Some text' });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Click clear button
    await page.click('#clear-btn');

    console.log('[Test] Clicked clear, waiting for state sync...');

    await waitForStateChange(minimactServer, 'TestComponent-2', 'state_0', '', 5000);

    const serverState = minimactServer.getComponentState('TestComponent-2');
    expect(serverState?.state_0).toBe('');

    console.log('[Test] ✅ Text cleared and synced to server!');
  });

  test('toggle button switches state', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-3', { state_0: false });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Click toggle button
    await page.click('#toggle-btn');

    console.log('[Test] Clicked toggle, waiting for state sync...');

    await waitForStateChange(minimactServer, 'TestComponent-3', 'state_0', true, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-3');
    expect(serverState?.state_0).toBe(true);

    console.log('[Test] ✅ Toggle state synced to server!');
  });

  test('toggle button multiple clicks', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-3', { state_0: false });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Toggle on
    await page.click('#toggle-btn');
    await page.waitForTimeout(200);

    // Toggle off
    await page.click('#toggle-btn');

    console.log('[Test] Toggled twice, waiting for final state...');

    await waitForStateChange(minimactServer, 'TestComponent-3', 'state_0', false, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-3');
    expect(serverState?.state_0).toBe(false);

    console.log('[Test] ✅ Multiple toggles synced correctly!');
  });

  test('UI updates reflect state changes', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-1', { state_0: 0 });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Check initial UI
    await expect(page.locator('#counter-value')).toContainText('Count: 0');

    // Click increment
    await page.click('#increment-btn');
    await page.waitForTimeout(500);

    // UI should update
    await expect(page.locator('#counter-value')).toContainText('Count: 1');

    // Status should show sync
    await expect(page.locator('#status-1')).toContainText('State synced to server');

    console.log('[Test] ✅ UI updates match state changes!');
  });

  test('rapid state changes all sync', async ({ page, minimactServer }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));

    minimactServer.registerComponent('TestComponent-1', { state_0: 0 });

    await page.goto('/test-use-state.html');
    await page.waitForTimeout(2000);

    // Rapid clicks (no delay between)
    for (let i = 0; i < 10; i++) {
      await page.click('#increment-btn');
    }

    console.log('[Test] Made 10 rapid clicks, waiting for final state...');

    await waitForStateChange(minimactServer, 'TestComponent-1', 'state_0', 10, 5000);

    const serverState = minimactServer.getComponentState('TestComponent-1');
    expect(serverState?.state_0).toBe(10);

    console.log('[Test] ✅ All rapid state changes synced!');
  });
});
