/**
 * HTTP server for persistent browser session
 * This allows CLI commands to communicate with a long-running browser instance
 */

import http from 'http';
import { Browser } from './browser.js';

const PORT = 9223; // Default port for aibrowse server
let browser = null;

function getBrowser() {
  if (!browser) {
    browser = new Browser();
  }
  return browser;
}

async function handleRequest(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const command = url.pathname.slice(1); // Remove leading /
    const params = Object.fromEntries(url.searchParams);

    let result;
    const browserInstance = getBrowser();

    switch (command) {
      case 'open':
        await browserInstance.launch();
        result = await browserInstance.goto(params.url);
        break;

      case 'refresh':
        result = await browserInstance.reload();
        break;

      case 'close':
        await browserInstance.close();
        browser = null;
        result = { closed: true };
        break;

      case 'query':
        result = await browserInstance.query(params.selector, {
          limit: params.limit ? parseInt(params.limit) : undefined,
          interactive: params.interactive === 'true',
          errors: params.errors === 'true'
        });
        break;

      case 'click':
        result = await browserInstance.click(params.id);
        break;

      case 'fill':
        result = await browserInstance.fill(params.id, params.value);
        break;

      case 'wait':
        result = await browserInstance.waitFor(params.selector, params.timeout ? parseInt(params.timeout) : 5000);
        break;

      case 'screenshot':
        result = await browserInstance.screenshot(params.path);
        break;

      case 'eval':
        result = await browserInstance.evaluate(params.code);
        break;

      case 'minimact/components':
        result = await browserInstance.discoverMinimactComponents();
        break;

      case 'minimact/component':
        result = browserInstance.session.getComponent(params.id);
        if (!result) throw new Error('INVALID_COMPONENT_ID');
        break;

      case 'minimact/patches':
        result = browserInstance.session.getPatches(params.limit ? parseInt(params.limit) : 10);
        break;

      case 'minimact/state':
        result = await browserInstance.evaluate(() => window.minimact?.debugState || null);
        break;

      case 'signalr/status':
        result = browserInstance.getSignalRStatus();
        break;

      case 'signalr/messages':
        result = browserInstance.session.getSignalRMessages({
          sinceLast: params.sinceLast === 'true',
          type: params.type,
          method: params.method,
          limit: params.limit ? parseInt(params.limit) : undefined
        });
        break;

      case 'signalr/subscribe':
        browserInstance.signalrSubscribed = true;
        result = `Subscribed to SignalR messages`;
        break;

      case 'console':
        result = browserInstance.session.getConsoleMessages({
          sinceLast: params.sinceLast === 'true',
          errors: params.errors === 'true',
          limit: params.limit ? parseInt(params.limit) : undefined
        });
        break;

      case 'network':
        result = browserInstance.session.getNetworkRequests({
          sinceLast: params.sinceLast === 'true',
          failed: params.failed === 'true'
        });
        break;

      case 'errors':
        const consoleErrors = browserInstance.session.getConsoleMessages({ errors: true });
        const networkErrors = browserInstance.session.getNetworkRequests({ failed: true });
        const signalrErrors = browserInstance.session.getSignalRMessages()
          .filter(m => m.method?.toLowerCase().includes('error'));
        result = { console: consoleErrors, network: networkErrors, signalr: signalrErrors };
        break;

      case 'ping':
        result = { status: 'ok', browserRunning: browserInstance.page !== null };
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      command,
      result,
      meta: browserInstance.session ? browserInstance.session.getMeta() : null
    }));

  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({
      status: 'error',
      error: error.message || error,
      code: error.code || 'UNKNOWN_ERROR'
    }));
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`aibrowse server running on http://localhost:${PORT}`);
  console.log('Ready to receive commands');
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
