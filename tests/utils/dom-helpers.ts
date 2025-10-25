/**
 * DOM Testing Utilities
 * Shared helpers for creating and managing test DOM elements
 */

/**
 * Create a test element from HTML string and append to document.body
 */
export function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;

  if (!element) {
    throw new Error('Invalid HTML: no element created');
  }

  document.body.appendChild(element);
  return element;
}

/**
 * Create multiple test elements from HTML string
 */
export function createTestElements(html: string): HTMLElement[] {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const elements = Array.from(container.children) as HTMLElement[];

  elements.forEach(el => document.body.appendChild(el));
  return elements;
}

/**
 * Clean up all DOM elements (called in afterEach)
 */
export function cleanupDOM(): void {
  document.body.innerHTML = '';
}

/**
 * Wait for next animation frame
 */
export function waitForNextFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Wait for multiple animation frames
 */
export function waitForFrames(count: number): Promise<void> {
  return new Promise(resolve => {
    let remaining = count;
    const tick = () => {
      remaining--;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Wait for a specified delay (use sparingly, prefer waitForNextFrame)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get computed style of element
 */
export function getComputedStyle(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Trigger a DOM event
 */
export function triggerEvent(
  element: HTMLElement,
  eventType: string,
  options?: EventInit
): void {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...options });
  element.dispatchEvent(event);
}

/**
 * Trigger a custom event with detail data
 */
export function triggerCustomEvent<T = any>(
  element: HTMLElement,
  eventType: string,
  detail: T
): void {
  const event = new CustomEvent(eventType, { detail, bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

/**
 * Query selector with type assertion
 */
export function qs<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector(selector) as T;
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

/**
 * Query selector all with type assertion
 */
export function qsa<T extends HTMLElement = HTMLElement>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector)) as T[];
}

/**
 * Create a mock getBoundingClientRect for testing spatial calculations
 */
export function mockBoundingClientRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  element.getBoundingClientRect = () => ({
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    bottom: rect.bottom ?? 0,
    right: rect.right ?? 0,
    toJSON: () => ({})
  });
}

/**
 * Assert element has class
 */
export function assertHasClass(element: HTMLElement, className: string): void {
  if (!element.classList.contains(className)) {
    throw new Error(`Expected element to have class "${className}", but it doesn't`);
  }
}

/**
 * Assert element does not have class
 */
export function assertNotHasClass(element: HTMLElement, className: string): void {
  if (element.classList.contains(className)) {
    throw new Error(`Expected element NOT to have class "${className}", but it does`);
  }
}

/**
 * Assert element is visible (not display:none, not visibility:hidden)
 */
export function assertVisible(element: HTMLElement): void {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    throw new Error('Expected element to be visible, but it is hidden');
  }
}

/**
 * Assert element is hidden
 */
export function assertHidden(element: HTMLElement): void {
  const style = window.getComputedStyle(element);
  if (style.display !== 'none' && style.visibility !== 'hidden') {
    throw new Error('Expected element to be hidden, but it is visible');
  }
}
