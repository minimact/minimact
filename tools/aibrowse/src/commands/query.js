/**
 * Query command - Find DOM elements
 */

export async function queryCommand(browser, selector, options = {}) {
  const results = await browser.query(selector, options);
  return results;
}
