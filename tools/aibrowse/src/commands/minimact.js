/**
 * Minimact-specific commands
 */

export async function minimactComponentsCommand(browser) {
  return await browser.discoverMinimactComponents();
}

export async function minimactComponentCommand(browser, componentId) {
  const component = browser.session.getComponent(componentId);
  if (!component) {
    throw new Error('INVALID_COMPONENT_ID');
  }
  return component;
}

export async function minimactPatchesCommand(browser, limit = 10) {
  return browser.session.getPatches(limit);
}

export async function minimactStateCommand(browser) {
  // This would require the Minimact client to expose state in debug mode
  // For now, return a placeholder
  return await browser.evaluate(() => {
    return window.minimact?.debugState || null;
  });
}
