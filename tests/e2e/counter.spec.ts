/**
 * Example Playwright test using MockSignalRServer
 *
 * Tests run in real Chromium browser with real DOM
 * But connects to mock server instead of ASP.NET server
 */

import { test, expect, waitForStateChange } from '../fixtures/minimact.fixture';

test.describe('Counter Component', () => {
  test('increments count when button clicked', async ({ page, minimactServer }) => {
    // Setup: Register component with initial state
    minimactServer.registerComponent('Counter-123', { count: 0 });

    // Setup: Queue prediction hint for instant feedback
    minimactServer.queueHint('Counter-123', {
      hintId: 'increment-hint',
      confidence: 0.95,
      patches: [
        {
          op: 'replace',
          path: '/h1[0]/text[0]',
          value: 'Count: 1'
        }
      ],
      stateChanges: { count: 1 }
    });

    // Navigate to page (you'll need to serve a test HTML page)
    await page.goto('http://localhost:3000/test-counter.html');

    // Wait for Minimact client to connect
    await page.waitForTimeout(500);

    // Verify initial state
    await expect(page.locator('h1')).toContainText('Count: 0');

    // Click increment button
    await page.click('button#increment');

    // Client should apply cached patch immediately
    await expect(page.locator('h1')).toContainText('Count: 1');

    // Server state should be synced
    await waitForStateChange(minimactServer, 'Counter-123', 'count', 1);

    // Verify server state
    const state = minimactServer.getComponentState('Counter-123');
    expect(state?.count).toBe(1);
  });

  test('syncs useState to server', async ({ page, minimactServer }) => {
    minimactServer.registerComponent('Counter-123', { isOpen: false });

    await page.goto('http://localhost:3000/test-counter.html');
    await page.waitForTimeout(500);

    // Execute setState in browser
    await page.evaluate(() => {
      // @ts-ignore - accessing global Minimact instance
      window.minimact.setState('isOpen', true);
    });

    // Wait for sync to server
    await waitForStateChange(minimactServer, 'Counter-123', 'isOpen', true);

    // Verify server has updated state
    const state = minimactServer.getComponentState('Counter-123');
    expect(state?.isOpen).toBe(true);
  });

  test('hot reload updates template', async ({ page, minimactServer }) => {
    minimactServer.registerComponent('Counter-123', { count: 5 });

    minimactServer.setTemplateMap('Counter-123', {
      'h1[0].text[0]': {
        template: 'Count: {0}',
        bindings: ['count'],
        slots: [7]
      }
    });

    await page.goto('http://localhost:3000/test-counter.html');
    await page.waitForTimeout(500);

    // Verify initial template
    await expect(page.locator('h1')).toContainText('Count: 5');

    // Simulate developer editing TSX - change template
    minimactServer.simulateHotReload('Counter-123', 'h1[0].text[0]', 'Counter: {0}', [5]);

    // Wait for hot reload to apply
    await page.waitForTimeout(100);

    // Verify template updated WITHOUT full page reload
    await expect(page.locator('h1')).toContainText('Counter: 5');
  });

  test('cache miss triggers server render', async ({ page, minimactServer }) => {
    minimactServer.registerComponent('Counter-123', { count: 0 });

    // NO hints queued - force cache miss

    minimactServer.onMethod('increment', async (componentId, method, params) => {
      const state = minimactServer.getComponentState(componentId);
      if (state) {
        state.count = (state.count || 0) + 1;

        // Send patches after render
        setTimeout(() => {
          minimactServer.sendPatches(componentId, [
            {
              op: 'replace',
              path: '/h1[0]/text[0]',
              value: `Count: ${state.count}`
            }
          ]);
        }, 50);
      }
    });

    await page.goto('http://localhost:3000/test-counter.html');
    await page.waitForTimeout(500);

    // Click increment - should cause cache miss
    await page.click('button#increment');

    // Wait for server to process and send patches
    await page.waitForTimeout(100);

    // DOM should update after server response
    await expect(page.locator('h1')).toContainText('Count: 1');
  });
});

test.describe('DOM Element State (minimact-punch)', () => {
  test('syncs intersection state to server', async ({ page, minimactServer, waitForDomStateChange }) => {
    minimactServer.registerComponent('LazyImage-456', {});

    await page.goto('http://localhost:3000/test-lazy-image.html');
    await page.waitForTimeout(500);

    // Scroll element into view
    await page.evaluate(() => {
      document.querySelector('#lazy-image')?.scrollIntoView();
    });

    // Wait for intersection observer to trigger
    await page.waitForTimeout(100);

    // Check server received DOM state update
    const domState = minimactServer.getDomElementState('LazyImage-456', 'domElementState_0');

    expect(domState).toBeDefined();
    expect(domState.isIntersecting).toBe(true);
  });

  test('syncs mutation state to server', async ({ page, minimactServer }) => {
    minimactServer.registerComponent('DynamicList-789', {});

    await page.goto('http://localhost:3000/test-dynamic-list.html');
    await page.waitForTimeout(500);

    // Add a child element
    await page.evaluate(() => {
      const list = document.querySelector('#dynamic-list');
      const item = document.createElement('li');
      item.textContent = 'New item';
      list?.appendChild(item);
    });

    // Wait for mutation observer
    await page.waitForTimeout(100);

    // Check server received update
    const domState = minimactServer.getDomElementState('DynamicList-789', 'domElementState_0');

    expect(domState).toBeDefined();
    expect(domState.childrenCount).toBeGreaterThan(0);
  });
});
