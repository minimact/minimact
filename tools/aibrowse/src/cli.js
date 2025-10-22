/**
 * CLI entry point using Commander.js
 * Communicates with the aibrowse server
 */

import { Command } from 'commander';
import http from 'http';

const SERVER_PORT = 9223;

async function sendCommand(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:${SERVER_PORT}/${endpoint}${queryString ? '?' + queryString : ''}`;

    const req = http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status === 'error') {
            console.log(JSON.stringify(response, null, 2));
            process.exit(1);
          } else {
            console.log(JSON.stringify(response, null, 2));
            resolve(response);
          }
        } catch (e) {
          reject(new Error('Failed to parse server response'));
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(JSON.stringify({
          status: 'error',
          error: 'Server not running. Start with: node src/server.js',
          code: 'SERVER_NOT_RUNNING'
        }, null, 2));
        process.exit(1);
      } else {
        reject(err);
      }
    });
  });
}

async function executeCommand(endpoint, params = {}) {
  await sendCommand(endpoint, params);
  process.exit(0);
}

const program = new Command();

program
  .name('aibrowse')
  .description('AI-oriented browser inspector for Minimact applications')
  .version('0.1.0');

// Navigation commands
program
  .command('open <url>')
  .description('Load a page')
  .action(async (url) => {
    await executeCommand('open', { url });
  });

program
  .command('refresh')
  .description('Reload current page')
  .action(async () => {
    await executeCommand('refresh');
  });

program
  .command('close')
  .description('Close browser session')
  .action(async () => {
    await executeCommand('close');
  });

// Element discovery commands
program
  .command('query <selector>')
  .description('Find DOM elements')
  .option('--limit <n>', 'Limit number of results', parseInt)
  .option('--interactive', 'Only interactive elements')
  .option('--errors', 'Only elements with error states')
  .action(async (selector, options) => {
    await executeCommand('query', {
      selector,
      limit: options.limit,
      interactive: options.interactive,
      errors: options.errors
    });
  });

// SignalR monitoring commands
const signalr = program.command('signalr').description('SignalR monitoring commands');

signalr
  .command('status')
  .description('Check SignalR connection status')
  .action(async () => {
    await executeCommand('signalr/status');
  });

signalr
  .command('messages')
  .description('View SignalR messages')
  .option('--since-last', 'Only messages since last read')
  .option('--type <type>', 'Filter by direction (sent/received)')
  .option('--method <method>', 'Filter by method name')
  .option('--limit <n>', 'Limit number of messages', parseInt)
  .action(async (options) => {
    await executeCommand('signalr/messages', {
      sinceLast: options.sinceLast,
      type: options.type,
      method: options.method,
      limit: options.limit
    });
  });

signalr
  .command('subscribe')
  .description('Start capturing all SignalR messages')
  .action(async () => {
    await executeCommand('signalr/subscribe');
  });

// Minimact component inspection commands
const minimact = program.command('minimact').description('Minimact component inspection');

minimact
  .command('components')
  .description('List all Minimact components')
  .action(async () => {
    await executeCommand('minimact/components');
  });

minimact
  .command('component <id>')
  .description('Inspect component metadata')
  .action(async (id) => {
    await executeCommand('minimact/component', { id });
  });

minimact
  .command('patches')
  .description('Show recent patches')
  .option('--last <n>', 'Number of patches to show', parseInt, 10)
  .action(async (options) => {
    await executeCommand('minimact/patches', { limit: options.last });
  });

minimact
  .command('state')
  .description('View exposed state (if debug mode enabled)')
  .action(async () => {
    await executeCommand('minimact/state');
  });

// Debugging commands
program
  .command('console')
  .description('View console logs')
  .option('--errors', 'Only errors')
  .option('--since-last', 'Only logs since last read')
  .option('--limit <n>', 'Limit number of messages', parseInt)
  .action(async (options) => {
    await executeCommand('console', {
      errors: options.errors,
      sinceLast: options.sinceLast,
      limit: options.limit
    });
  });

program
  .command('network')
  .description('View network requests')
  .option('--failed', 'Only failed requests')
  .option('--since-last', 'Only requests since last read')
  .action(async (options) => {
    await executeCommand('network', {
      failed: options.failed,
      sinceLast: options.sinceLast
    });
  });

program
  .command('errors')
  .description('All errors (console + network + SignalR)')
  .action(async () => {
    await executeCommand('errors');
  });

// Interaction commands
program
  .command('click <id>')
  .description('Click cached element')
  .action(async (id) => {
    await executeCommand('click', { id });
  });

program
  .command('fill <id> <value>')
  .description('Fill input field')
  .action(async (id, value) => {
    await executeCommand('fill', { id, value });
  });

program
  .command('wait <selector>')
  .description('Wait for element')
  .option('--timeout <ms>', 'Timeout in milliseconds', parseInt, 5000)
  .action(async (selector, options) => {
    await executeCommand('wait', {
      selector,
      timeout: options.timeout
    });
  });

program
  .command('screenshot <path>')
  .description('Save screenshot')
  .action(async (path) => {
    await executeCommand('screenshot', { path });
  });

program
  .command('eval <code>')
  .description('Execute JavaScript')
  .action(async (code) => {
    await executeCommand('eval', { code });
  });

export { program };
