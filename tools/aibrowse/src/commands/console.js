/**
 * Console and network monitoring commands
 */

export async function consoleCommand(browser, options = {}) {
  return browser.session.getConsoleMessages(options);
}

export async function networkCommand(browser, options = {}) {
  return browser.session.getNetworkRequests(options);
}

export async function errorsCommand(browser) {
  const consoleErrors = browser.session.getConsoleMessages({ errors: true });
  const networkErrors = browser.session.getNetworkRequests({ failed: true });
  const signalrErrors = browser.session.getSignalRMessages()
    .filter(m => m.method?.toLowerCase().includes('error'));

  return {
    console: consoleErrors,
    network: networkErrors,
    signalr: signalrErrors
  };
}
