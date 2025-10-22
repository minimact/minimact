/**
 * Interaction commands
 */

export async function clickCommand(browser, elementId) {
  return await browser.click(elementId);
}

export async function fillCommand(browser, elementId, value) {
  return await browser.fill(elementId, value);
}

export async function waitCommand(browser, selector, timeout = 5000) {
  return await browser.waitFor(selector, timeout);
}

export async function screenshotCommand(browser, path) {
  return await browser.screenshot(path);
}

export async function evalCommand(browser, code) {
  return await browser.evaluate(code);
}
