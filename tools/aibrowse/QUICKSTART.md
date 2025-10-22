# aibrowse Quick Start Guide

## For AI Agents (like Claude Code)

This guide shows how to use aibrowse to inspect and debug Minimact applications.

## Setup

1. **Start the aibrowse server** (in the background or separate terminal):
   ```bash
   node src/server.js
   ```

2. **Verify server is running**:
   ```bash
   # Should return 200 OK
   curl http://localhost:9223/ping
   ```

## Basic Workflow

### 1. Open Your Minimact App

```bash
node bin/aibrowse.js open http://localhost:5000
```

**What this returns:**
- URL and page title
- Whether Minimact was detected
- SignalR connection status
- Minimact version (if exposed)

### 2. Check for Immediate Issues

```bash
node bin/aibrowse.js errors
```

**What to look for:**
- Console errors (JavaScript errors)
- Failed network requests (4xx, 5xx)
- SignalR connection errors

### 3. Discover Minimact Components

```bash
node bin/aibrowse.js minimact components
```

**Returns:**
- Component ID (C0, C1, C2, ...)
- Component name (e.g., "Counter", "TodoList")
- Component instance ID (data-minimact-id)
- Element type and selector

### 4. Find Interactive Elements

```bash
node bin/aibrowse.js query "button" --interactive
```

**Returns:**
- Element ID (E0, E1, E2, ...)
- Tag, text, attributes
- Minimact event bindings (data-minimact-event)
- Visibility status

### 5. Test Interactions

```bash
# Click a button
node bin/aibrowse.js click E0

# Check if SignalR message was sent
node bin/aibrowse.js signalr messages --since-last

# Verify console logs
node bin/aibrowse.js console --since-last
```

### 6. Monitor SignalR Communication

```bash
# Start monitoring
node bin/aibrowse.js signalr subscribe

# Check status
node bin/aibrowse.js signalr status

# View message history
node bin/aibrowse.js signalr messages --limit 10

# Filter for server responses
node bin/aibrowse.js signalr messages --type received

# Filter for specific method
node bin/aibrowse.js signalr messages --method ApplyPredictedPatch
```

### 7. Inspect Patches

```bash
# View recent patches
node bin/aibrowse.js minimact patches --last 5
```

**What to look for:**
- Patch type: predicted, verified, or correction
- Prediction confidence (for predicted patches)
- Whether predictions matched verification
- Frequent correction patches indicate prediction issues

### 8. View Debug State

```bash
node bin/aibrowse.js minimact state
```

**Returns:**
- Component state (if Minimact debug mode is enabled)
- Useful for understanding current application state

## Common Debugging Scenarios

### Scenario 1: Button Click Not Working

```bash
# 1. Find the button
node bin/aibrowse.js query "button:contains('Submit')"

# 2. Click it
node bin/aibrowse.js click E0

# 3. Check console for errors
node bin/aibrowse.js console --errors

# 4. Check if SignalR message was sent
node bin/aibrowse.js signalr messages --type sent --limit 1

# 5. Check for server response
node bin/aibrowse.js signalr messages --type received --limit 1
```

**Diagnosis:**
- ❌ No SignalR message sent → Client-side event binding issue
- ✅ Message sent, no response → Server-side processing issue
- ✅ Message sent, error response → Check server logs
- ✅ Message sent, patch received → Check if DOM updated

### Scenario 2: Slow UI Updates

```bash
# 1. Subscribe to SignalR monitoring
node bin/aibrowse.js signalr subscribe

# 2. Trigger an interaction
node bin/aibrowse.js click E0

# 3. Check message timing
node bin/aibrowse.js signalr messages --since-last

# 4. View patch history
node bin/aibrowse.js minimact patches --last 5
```

**What to check:**
- Time between sent and received messages (latency)
- Prediction confidence (low confidence = slower perceived updates)
- Frequent corrections (predicted patches were wrong)

### Scenario 3: Component Not Rendering

```bash
# 1. Check if component exists in DOM
node bin/aibrowse.js minimact components

# 2. If missing, check console errors
node bin/aibrowse.js console --errors

# 3. Check network requests (maybe API failed)
node bin/aibrowse.js network --failed

# 4. View debug state
node bin/aibrowse.js minimact state
```

### Scenario 4: SignalR Connection Issues

```bash
# 1. Check SignalR status
node bin/aibrowse.js signalr status

# 2. Check for connection errors
node bin/aibrowse.js signalr messages | grep -i error

# 3. Check network requests to /minimact hub
node bin/aibrowse.js network | grep minimact

# 4. Check console for SignalR errors
node bin/aibrowse.js console --errors | grep -i signalr
```

## JSON Output Format

All commands return JSON in this format:

```json
{
  "status": "ok" | "error",
  "command": "command-name",
  "result": { /* command-specific data */ },
  "error": "error message (if status=error)",
  "code": "ERROR_CODE (if status=error)",
  "meta": {
    "url": "current page URL",
    "minimactDetected": true,
    "signalrConnected": true,
    "signalrHub": "/minimact"
  }
}
```

## Element and Component References

### Elements (E0, E1, E2, ...)
- Cached DOM elements
- Persist across commands
- Reference by ID: `E0`, `E1`, etc.
- Use in `click`, `fill` commands

### Components (C0, C1, C2, ...)
- Cached Minimact components
- Persist across commands
- Reference by ID: `C0`, `C1`, etc.
- Use in `minimact component` command

## Tips for AI Agents

1. **Always start with `errors`** - Quick sanity check
2. **Use `--since-last`** - Focus on new information
3. **Element IDs persist** - Cache E0, E1 references for reuse
4. **SignalR monitoring is passive** - Enable with `subscribe` first
5. **Patches tell the story** - Check predicted vs verified for performance insights
6. **JSON is structured** - Parse and analyze programmatically
7. **Server must be running** - Check for `SERVER_NOT_RUNNING` error

## Cleanup

```bash
# Close browser when done
node bin/aibrowse.js close

# Stop server (Ctrl+C in server terminal)
```

## Example Session

```bash
# Start server (terminal 1)
node src/server.js

# Use CLI (terminal 2)
node bin/aibrowse.js open http://localhost:5000
node bin/aibrowse.js errors
node bin/aibrowse.js minimact components
node bin/aibrowse.js query "button" --interactive
node bin/aibrowse.js signalr subscribe
node bin/aibrowse.js click E0
node bin/aibrowse.js signalr messages --since-last
node bin/aibrowse.js minimact patches --last 3
node bin/aibrowse.js console --since-last
node bin/aibrowse.js close
```

## Troubleshooting

### "SERVER_NOT_RUNNING" error
```bash
# Start the server first
node src/server.js
```

### "BROWSER_NOT_STARTED" error
```bash
# Open a page first
node bin/aibrowse.js open http://localhost:5000
```

### "INVALID_ELEMENT_ID" error
```bash
# Query for elements again (they may have changed)
node bin/aibrowse.js query "button"
```

### SignalR not detected
- Check if Minimact app is using SignalR
- Look for WebSocket connections in network tab
- Verify SignalR hub is at `/minimact`

## Integration with Claude Code

When using Claude Code to debug Minimact apps:

1. Claude Code invokes aibrowse commands
2. Parses JSON responses
3. Analyzes patterns and issues
4. Suggests code fixes
5. Can verify fixes by testing interactions

Example Claude Code workflow:
```
User: "My counter button isn't working"

Claude:
1. Runs: aibrowse open <url>
2. Runs: aibrowse errors (checks for console errors)
3. Runs: aibrowse query "button" (finds the button)
4. Runs: aibrowse click E0 (tests the button)
5. Runs: aibrowse signalr messages (checks if event was sent)
6. Analyzes results and suggests fix
```

---

**Ready to debug Minimact apps!** 🚀
