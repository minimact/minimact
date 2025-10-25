/**
 * minimact-dynamic - Value Updater
 *
 * Updates DOM element values directly.
 * NO VDOM. NO RECONCILIATION.
 * Just: el.textContent = value
 *
 * This is the core of MINIMACT's performance advantage.
 */

/**
 * Update DOM element value directly
 * Target: < 1ms per update
 */
export class ValueUpdater {
  /**
   * Update text content for all elements matching selector
   *
   * @param selector - CSS selector
   * @param value - New value
   *
   * @example
   * ```typescript
   * updater.updateValue('.price', '$19.99');
   * // → Direct update: el.textContent = '$19.99'
   * ```
   */
  updateValue(selector: string, value: any): void {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`[minimact-dynamic] No elements found for selector: ${selector}`);
      return;
    }

    const stringValue = String(value);

    elements.forEach(element => {
      // Direct DOM update - MINIMAL
      // No VDOM, no reconciliation, just set the value
      element.textContent = stringValue;
    });

    if (elements.length > 0) {
      console.log(
        `[minimact-dynamic] Updated ${elements.length} element(s) ` +
        `with selector '${selector}' to value: ${stringValue}`
      );
    }
  }

  /**
   * Update attribute value
   *
   * @param selector - CSS selector
   * @param attr - Attribute name
   * @param value - New value
   *
   * @example
   * ```typescript
   * updater.updateAttribute('img', 'src', '/new-image.jpg');
   * ```
   */
  updateAttribute(selector: string, attr: string, value: any): void {
    const elements = document.querySelectorAll(selector);
    const stringValue = String(value);

    elements.forEach(element => {
      element.setAttribute(attr, stringValue);
    });

    if (elements.length > 0) {
      console.log(
        `[minimact-dynamic] Updated attribute '${attr}' on ${elements.length} ` +
        `element(s) with selector '${selector}' to: ${stringValue}`
      );
    }
  }

  /**
   * Update style property
   *
   * @param selector - CSS selector
   * @param prop - Style property name
   * @param value - New value
   *
   * @example
   * ```typescript
   * updater.updateStyle('.progress', 'width', '75%');
   * ```
   */
  updateStyle(selector: string, prop: string, value: any): void {
    const elements = document.querySelectorAll(selector);
    const stringValue = String(value);

    elements.forEach(element => {
      (element as HTMLElement).style[prop as any] = stringValue;
    });

    if (elements.length > 0) {
      console.log(
        `[minimact-dynamic] Updated style '${prop}' on ${elements.length} ` +
        `element(s) with selector '${selector}' to: ${stringValue}`
      );
    }
  }

  /**
   * Update class name
   *
   * @param selector - CSS selector
   * @param value - New class string
   *
   * @example
   * ```typescript
   * updater.updateClass('.button', 'button active');
   * ```
   */
  updateClass(selector: string, value: any): void {
    const elements = document.querySelectorAll(selector);
    const stringValue = String(value);

    elements.forEach(element => {
      element.className = stringValue;
    });

    if (elements.length > 0) {
      console.log(
        `[minimact-dynamic] Updated className on ${elements.length} ` +
        `element(s) with selector '${selector}' to: ${stringValue}`
      );
    }
  }

  /**
   * Update visibility (display: none vs display: block)
   *
   * @param selector - CSS selector
   * @param visible - Whether element should be visible
   *
   * @example
   * ```typescript
   * updater.updateVisibility('.modal', true);
   * ```
   */
  updateVisibility(selector: string, visible: boolean): void {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      (element as HTMLElement).style.display = visible ? '' : 'none';
    });

    if (elements.length > 0) {
      console.log(
        `[minimact-dynamic] Updated visibility on ${elements.length} ` +
        `element(s) with selector '${selector}' to: ${visible ? 'visible' : 'hidden'}`
      );
    }
  }

  /**
   * Update element order (DOM CHOREOGRAPHY)
   * Moves elements based on state, never destroys them
   *
   * @param containerSelector - Container selector
   * @param childSelectors - Ordered array of child selectors
   *
   * @example
   * ```typescript
   * updater.updateOrder('.cards', ['#card-3', '#card-1', '#card-2']);
   * // → Rearranges cards in container (smooth CSS transitions!)
   * ```
   */
  updateOrder(containerSelector: string, childSelectors: string[]): void {
    const container = document.querySelector(containerSelector);

    if (!container) {
      console.warn(`[minimact-dynamic] Container not found: ${containerSelector}`);
      return;
    }

    // Collect child elements in new order
    const orderedChildren: Element[] = [];

    for (const selector of childSelectors) {
      // Try to find child in current container first
      let child = container.querySelector(selector);

      // If not in container, search globally (for teleportation)
      if (!child) {
        child = document.querySelector(selector);
      }

      if (child) {
        orderedChildren.push(child);
      } else {
        console.warn(`[minimact-dynamic] Child element not found: ${selector}`);
      }
    }

    // Append in new order (this moves them if needed)
    orderedChildren.forEach(child => {
      container.appendChild(child);
    });

    console.log(
      `[minimact-dynamic] Choreographed ${orderedChildren.length} element(s) ` +
      `in container '${containerSelector}'`
    );
  }
}
