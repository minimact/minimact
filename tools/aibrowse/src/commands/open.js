/**
 * Open command - Navigate to a URL
 */

export async function openCommand(browser, url) {
  await browser.launch();
  const result = await browser.goto(url);
  return result;
}
