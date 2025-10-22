/**
 * Browser wrapper with Playwright and SignalR WebSocket monitoring
 */

import { chromium } from 'playwright';
import { Session } from './session.js';

export class Browser {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.session = new Session();
    this.signalrSubscribed = false;
  }

  /**
   * Launch the browser and create a new page
   */
  async launch() {
    if (this.browser) {
      return; // Already launched
    }

    this.browser = await chromium.launch({
      headless: true
    });

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // Set up monitoring
    this._setupConsoleMonitoring();
    this._setupNetworkMonitoring();
    this._setupWebSocketMonitoring();
  }

  /**
   * Navigate to a URL
   */
  async goto(url, options = {}) {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    // Clear session on navigation
    this.session.clear();

    const response = await this.page.goto(url, {
      waitUntil: 'networkidle',
      ...options
    });

    if (!response || !response.ok()) {
      throw new Error('NAVIGATION_FAILED');
    }

    // Update metadata
    await this._updateMetadata();

    return {
      url: this.page.url(),
      title: await this.page.title(),
      ...this.session.getMeta()
    };
  }

  /**
   * Reload the current page
   */
  async reload() {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    this.session.clear();
    await this.page.reload({ waitUntil: 'networkidle' });
    await this._updateMetadata();

    return {
      url: this.page.url(),
      title: await this.page.title(),
      ...this.session.getMeta()
    };
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.session.clear();
    }
  }

  /**
   * Query elements with CSS selector
   */
  async query(selector, options = {}) {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    const elements = await this.page.$$(selector);
    const limit = options.limit || elements.length;
    const results = [];

    for (let i = 0; i < Math.min(limit, elements.length); i++) {
      const element = elements[i];
      const metadata = await this._getElementMetadata(element);

      // Filter logic
      if (options.interactive && !this._isInteractive(metadata)) {
        continue;
      }

      if (options.errors && !this._hasError(metadata)) {
        continue;
      }

      const id = this.session.addElement(element, selector, metadata);
      results.push({
        id,
        ...metadata
      });
    }

    return results;
  }

  /**
   * Click an element by ID
   */
  async click(elementId) {
    const cached = this.session.getElement(elementId);
    if (!cached) {
      throw new Error('INVALID_ELEMENT_ID');
    }

    try {
      await cached.handle.click();
      return { clicked: elementId, selector: cached.selector };
    } catch (e) {
      // Try to re-query if handle is stale
      const newHandle = await this.page.$(cached.selector);
      if (!newHandle) {
        throw new Error('ELEMENT_NOT_FOUND');
      }
      await newHandle.click();
      // Update cache
      this.session.elementCache.set(elementId, { ...cached, handle: newHandle });
      return { clicked: elementId, selector: cached.selector };
    }
  }

  /**
   * Fill an input element
   */
  async fill(elementId, value) {
    const cached = this.session.getElement(elementId);
    if (!cached) {
      throw new Error('INVALID_ELEMENT_ID');
    }

    try {
      await cached.handle.fill(value);
      return { filled: elementId, value };
    } catch (e) {
      const newHandle = await this.page.$(cached.selector);
      if (!newHandle) {
        throw new Error('ELEMENT_NOT_FOUND');
      }
      await newHandle.fill(value);
      this.session.elementCache.set(elementId, { ...cached, handle: newHandle });
      return { filled: elementId, value };
    }
  }

  /**
   * Wait for a selector to appear
   */
  async waitFor(selector, timeout = 5000) {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    try {
      const element = await this.page.waitForSelector(selector, { timeout });
      const metadata = await this._getElementMetadata(element);
      const id = this.session.addElement(element, selector, metadata);
      return { id, ...metadata };
    } catch (e) {
      throw new Error('TIMEOUT');
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(path) {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    await this.page.screenshot({ path, fullPage: true });
    return { path };
  }

  /**
   * Evaluate JavaScript in the page
   */
  async evaluate(code) {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    return await this.page.evaluate(code);
  }

  /**
   * Discover Minimact components
   */
  async discoverMinimactComponents() {
    if (!this.page) {
      throw new Error('BROWSER_NOT_STARTED');
    }

    const components = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[data-minimact-component]');
      return Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          name: el.dataset.minimactComponent,
          componentId: el.dataset.minimactId || null,
          element: el.tagName.toLowerCase(),
          dataAttributes: { ...el.dataset },
          selector: el.id ? `#${el.id}` : `.${el.className.split(' ').join('.')}`,
          visible: rect.width > 0 && rect.height > 0
        };
      });
    });

    // Add to component cache
    const results = [];
    for (const comp of components) {
      const id = this.session.addComponent(
        comp.name,
        comp.componentId,
        comp.element,
        comp.selector,
        comp.dataAttributes
      );
      results.push({ id, ...comp });
    }

    return results;
  }

  /**
   * Get SignalR connection status
   */
  getSignalRStatus() {
    const meta = this.session.getMeta();
    const messages = this.session.getSignalRMessages();

    return {
      connected: meta.signalrConnected,
      hub: meta.signalrHub,
      transport: meta.signalrTransport,
      connectionId: meta.signalrConnectionId,
      messagesReceived: messages.filter(m => m.direction === 'received').length,
      messagesSent: messages.filter(m => m.direction === 'sent').length
    };
  }

  /**
   * Set up console monitoring
   */
  _setupConsoleMonitoring() {
    this.page.on('console', msg => {
      this.session.addConsoleMessage(
        msg.type(),
        msg.text(),
        msg.location()
      );
    });
  }

  /**
   * Set up network monitoring
   */
  _setupNetworkMonitoring() {
    this.page.on('response', async response => {
      this.session.addNetworkRequest(
        response.request().method(),
        response.url(),
        response.status(),
        response.statusText()
      );
    });
  }

  /**
   * Set up WebSocket monitoring for SignalR
   */
  _setupWebSocketMonitoring() {
    this.page.on('websocket', ws => {
      const url = ws.url();

      // Check if this is a SignalR connection
      if (url.includes('/minimact') || url.includes('signalr')) {
        this.session.updateMeta({
          signalrConnected: true,
          signalrHub: new URL(url).pathname
        });

        // Monitor incoming frames
        ws.on('framereceived', event => {
          try {
            const messages = this._parseSignalRFrame(event.payload);
            for (const msg of messages) {
              this.session.addSignalRMessage('received', msg.target, msg.arguments);

              // Track patches specifically
              if (msg.target === 'ApplyPredictedPatch' || msg.target === 'ApplyPrediction') {
                this.session.addPatch('predicted', msg.arguments[0]?.componentId, msg.arguments[0]?.patches, {
                  confidence: msg.arguments[0]?.confidence,
                  predictionId: msg.arguments[0]?.predictionId
                });
              } else if (msg.target === 'ApplyVerifiedPatch') {
                this.session.addPatch('verified', msg.arguments[0]?.componentId, msg.arguments[0]?.patches, {
                  matched: msg.arguments[0]?.matched,
                  predictionId: msg.arguments[0]?.predictionId
                });
              } else if (msg.target === 'ApplyCorrectionPatch' || msg.target === 'ApplyCorrection') {
                this.session.addPatch('correction', msg.arguments[0]?.componentId, msg.arguments[0]?.patches, {
                  predictionId: msg.arguments[0]?.predictionId
                });
              }
            }
          } catch (e) {
            // Ignore parse errors for non-JSON frames
          }
        });

        // Monitor outgoing frames
        ws.on('framesent', event => {
          try {
            const messages = this._parseSignalRFrame(event.payload);
            for (const msg of messages) {
              this.session.addSignalRMessage('sent', msg.target, msg.arguments);
            }
          } catch (e) {
            // Ignore parse errors
          }
        });

        // Monitor disconnections
        ws.on('close', () => {
          this.session.updateMeta({ signalrConnected: false });
        });
      }
    });
  }

  /**
   * Parse SignalR WebSocket frame
   * SignalR uses record separator (\x1e) to delimit messages
   */
  _parseSignalRFrame(payload) {
    if (typeof payload !== 'string') {
      return [];
    }

    const messages = payload.split('\x1e').filter(m => m.trim());
    return messages.map(msg => {
      try {
        const parsed = JSON.parse(msg);
        return {
          type: parsed.type,
          invocationId: parsed.invocationId,
          target: parsed.target || 'Unknown',
          arguments: parsed.arguments || parsed.result || []
        };
      } catch (e) {
        return null;
      }
    }).filter(m => m !== null);
  }

  /**
   * Update metadata about the page
   */
  async _updateMetadata() {
    // Detect Minimact
    const minimactDetected = await this.page.evaluate(() => {
      return document.querySelector('[data-minimact-component]') !== null ||
             document.querySelector('script[src*="minimact"]') !== null ||
             window.minimact !== undefined;
    });

    const minimactVersion = await this.page.evaluate(() => {
      return window.minimact?.version || null;
    });

    this.session.updateMeta({
      url: this.page.url(),
      title: await this.page.title(),
      minimactDetected,
      minimactVersion
    });
  }

  /**
   * Get metadata about an element
   */
  async _getElementMetadata(element) {
    return await element.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const attributes = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }

      return {
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        text: el.textContent?.trim().substring(0, 100) || '',
        value: el.value || null,
        visible: rect.width > 0 && rect.height > 0,
        attributes,
        selector: el.id ? `#${el.id}` : (el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase())
      };
    });
  }

  /**
   * Check if an element is interactive
   */
  _isInteractive(metadata) {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    return interactiveTags.includes(metadata.tag) ||
           metadata.attributes['onclick'] ||
           metadata.attributes['data-minimact-event'];
  }

  /**
   * Check if an element has error state
   */
  _hasError(metadata) {
    return metadata.attributes['aria-invalid'] === 'true' ||
           metadata.attributes['class']?.includes('error') ||
           metadata.attributes['class']?.includes('invalid');
  }
}
