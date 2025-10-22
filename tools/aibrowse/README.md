# aibrowse

AI-oriented browser inspector for Minimact applications.

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Link for development (optional)
npm link
```

## Quick Start

```bash
# 1. Start the aibrowse server (in one terminal)
node src/server.js

# 2. Use the CLI (in another terminal)
# Open a Minimact app
node bin/aibrowse.js open http://localhost:5000

# Check for errors
node bin/aibrowse.js errors

# Discover Minimact components
node bin/aibrowse.js minimact components

# Find interactive elements
node bin/aibrowse.js query "button" --interactive

# Monitor SignalR
node bin/aibrowse.js signalr status
node bin/aibrowse.js signalr subscribe
node bin/aibrowse.js signalr messages --since-last

# Click an element
node bin/aibrowse.js click E0

# View console logs
node bin/aibrowse.js console --errors

# Close browser
node bin/aibrowse.js close
```

**Note**: The server maintains a persistent browser session across CLI commands. This allows element references (E0, E1) and SignalR connections to persist between commands.

## Commands

### Navigation
- `open <url>` - Load a page
- `refresh` - Reload current page
- `close` - Close browser session

### Element Discovery
- `query <selector>` - Find DOM elements
  - `--limit <n>` - Limit results
  - `--interactive` - Only buttons, inputs, links
  - `--errors` - Only elements with error states

### SignalR Monitoring
- `signalr status` - Check connection status
- `signalr messages` - View SignalR messages
  - `--since-last` - Only new messages
  - `--type <sent|received>` - Filter by direction
  - `--method <name>` - Filter by method
  - `--limit <n>` - Limit results
- `signalr subscribe` - Start capturing messages

### Minimact Components
- `minimact components` - List all components
- `minimact component <id>` - Inspect component
- `minimact patches` - Show recent patches
  - `--last <n>` - Number to show (default: 10)
- `minimact state` - View debug state

### Debugging
- `console` - View console logs
  - `--errors` - Only errors
  - `--since-last` - Only new logs
  - `--limit <n>` - Limit number of messages
- `network` - View network requests
  - `--failed` - Only failed requests
  - `--since-last` - Only new requests
- `errors` - All errors (console + network + SignalR)

### Interaction
- `click <id>` - Click cached element
- `fill <id> <value>` - Fill input field
- `wait <selector>` - Wait for element
  - `--timeout <ms>` - Timeout (default: 5000)
- `screenshot <path>` - Save screenshot
- `eval <code>` - Execute JavaScript

## Output Format

All commands return JSON:

```json
{
  "status": "ok",
  "command": "query",
  "result": [...],
  "meta": {
    "url": "http://localhost:5000",
    "minimactDetected": true,
    "signalrConnected": true
  }
}
```

## Element Reference System

- `E0`, `E1`, `E2` - DOM elements
- `C0`, `C1`, `C2` - Minimact components

## Development Status

Phase 1 (MVP) is complete:
- ✅ Browser control with Playwright
- ✅ Element caching and querying
- ✅ SignalR WebSocket monitoring
- ✅ Console and network logging
- ✅ Minimact component discovery
- ✅ Interaction commands
- ✅ JSON output formatting

## Next Steps

1. Test with an actual Minimact application
2. Refine SignalR message parsing
3. Add more robust error handling
4. Implement Phase 2 features
