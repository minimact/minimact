/**
 * SignalR commands
 */

export async function signalrStatusCommand(browser) {
  return browser.getSignalRStatus();
}

export async function signalrMessagesCommand(browser, options = {}) {
  return browser.session.getSignalRMessages(options);
}

export async function signalrSubscribeCommand(browser) {
  browser.signalrSubscribed = true;
  const meta = browser.session.getMeta();
  return `Subscribed to SignalR messages on hub: ${meta.signalrHub || 'Unknown'}`;
}
