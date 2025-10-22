/**
 * Session Manager
 * Maintains element cache, SignalR message log, and console/network buffers
 */

export class Session {
  constructor() {
    this.elementCache = new Map(); // E0, E1, E2, ... -> { handle, selector, metadata }
    this.componentCache = new Map(); // C0, C1, C2, ... -> { name, componentId, element, selector }
    this.signalrMessages = []; // Chronological log of SignalR messages
    this.consoleLog = []; // Console messages
    this.networkLog = []; // Network requests
    this.patchHistory = []; // Track predicted vs verified patches

    this.elementIdCounter = 0;
    this.componentIdCounter = 0;

    this.lastReadConsoleIndex = 0;
    this.lastReadSignalRIndex = 0;
    this.lastReadNetworkIndex = 0;

    this.meta = {
      url: null,
      title: null,
      minimactDetected: false,
      minimactVersion: null,
      signalrConnected: false,
      signalrHub: null,
      signalrTransport: null,
      signalrConnectionId: null
    };
  }

  /**
   * Add an element to the cache
   */
  addElement(handle, selector, metadata = {}) {
    const id = `E${this.elementIdCounter++}`;
    this.elementCache.set(id, { handle, selector, metadata });
    return id;
  }

  /**
   * Get an element from the cache
   */
  getElement(id) {
    return this.elementCache.get(id);
  }

  /**
   * Add a component to the cache
   */
  addComponent(name, componentId, element, selector, dataAttributes = {}) {
    const id = `C${this.componentIdCounter++}`;
    this.componentCache.set(id, { name, componentId, element, selector, dataAttributes });
    return id;
  }

  /**
   * Get a component from the cache
   */
  getComponent(id) {
    return this.componentCache.get(id);
  }

  /**
   * Log a SignalR message
   */
  addSignalRMessage(direction, method, args, timestamp = Date.now()) {
    const message = {
      id: this.signalrMessages.length,
      direction, // 'sent' or 'received'
      method,
      args,
      timestamp: new Date(timestamp).toISOString()
    };
    this.signalrMessages.push(message);
    return message;
  }

  /**
   * Get SignalR messages with optional filtering
   */
  getSignalRMessages(options = {}) {
    let messages = this.signalrMessages;

    if (options.sinceLast) {
      messages = messages.slice(this.lastReadSignalRIndex);
      this.lastReadSignalRIndex = this.signalrMessages.length;
    }

    if (options.type) {
      messages = messages.filter(m => m.direction === options.type);
    }

    if (options.method) {
      messages = messages.filter(m => m.method === options.method);
    }

    if (options.limit) {
      messages = messages.slice(-options.limit);
    }

    return messages;
  }

  /**
   * Log a console message
   */
  addConsoleMessage(type, text, location, timestamp = Date.now()) {
    const message = {
      type,
      text,
      location,
      timestamp: new Date(timestamp).toISOString()
    };
    this.consoleLog.push(message);
    return message;
  }

  /**
   * Get console messages with optional filtering
   */
  getConsoleMessages(options = {}) {
    let messages = this.consoleLog;

    if (options.sinceLast) {
      messages = messages.slice(this.lastReadConsoleIndex);
      this.lastReadConsoleIndex = this.consoleLog.length;
    }

    if (options.errors) {
      messages = messages.filter(m => m.type === 'error');
    }

    if (options.limit) {
      messages = messages.slice(-options.limit);
    }

    return messages;
  }

  /**
   * Log a network request
   */
  addNetworkRequest(method, url, status, statusText, timestamp = Date.now()) {
    const request = {
      method,
      url,
      status,
      statusText,
      timestamp: new Date(timestamp).toISOString()
    };
    this.networkLog.push(request);
    return request;
  }

  /**
   * Get network requests with optional filtering
   */
  getNetworkRequests(options = {}) {
    let requests = this.networkLog;

    if (options.sinceLast) {
      requests = requests.slice(this.lastReadNetworkIndex);
      this.lastReadNetworkIndex = this.networkLog.length;
    }

    if (options.failed) {
      requests = requests.filter(r => r.status >= 400);
    }

    if (options.type) {
      // Filter by request type (xhr, fetch, etc.)
      // This would need additional metadata stored in the request
    }

    return requests;
  }

  /**
   * Add a patch to the history
   */
  addPatch(type, componentId, patches, metadata = {}) {
    const patch = {
      timestamp: new Date().toISOString(),
      type, // 'predicted', 'verified', 'correction'
      componentId,
      patches,
      ...metadata
    };
    this.patchHistory.push(patch);
    return patch;
  }

  /**
   * Get recent patches
   */
  getPatches(limit = 10) {
    return this.patchHistory.slice(-limit);
  }

  /**
   * Clear the session (on navigation or explicit close)
   */
  clear() {
    this.elementCache.clear();
    this.componentCache.clear();
    this.signalrMessages = [];
    this.consoleLog = [];
    this.networkLog = [];
    this.patchHistory = [];

    this.elementIdCounter = 0;
    this.componentIdCounter = 0;

    this.lastReadConsoleIndex = 0;
    this.lastReadSignalRIndex = 0;
    this.lastReadNetworkIndex = 0;
  }

  /**
   * Update metadata
   */
  updateMeta(updates) {
    this.meta = { ...this.meta, ...updates };
  }

  /**
   * Get metadata
   */
  getMeta() {
    return { ...this.meta };
  }
}
