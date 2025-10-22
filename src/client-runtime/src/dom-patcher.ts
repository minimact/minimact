import { Patch, VNode, VElement, VText } from './types';

/**
 * Applies DOM patches from the server to the actual DOM
 * Handles surgical updates for minimal DOM manipulation
 */
export class DOMPatcher {
  private debugLogging: boolean;

  constructor(options: { debugLogging?: boolean } = {}) {
    this.debugLogging = options.debugLogging || false;
  }

  /**
   * Apply an array of patches to a root element
   */
  applyPatches(rootElement: HTMLElement, patches: Patch[]): void {
    this.log('Applying patches', { count: patches.length, patches });

    for (const patch of patches) {
      try {
        this.applyPatch(rootElement, patch);
      } catch (error) {
        console.error('[Minimact] Failed to apply patch:', patch, error);
      }
    }
  }

  /**
   * Apply a single patch to the DOM
   */
  private applyPatch(rootElement: HTMLElement, patch: Patch): void {
    const targetElement = this.getElementByPath(rootElement, patch.path);

    if (!targetElement && patch.type !== 'Create') {
      console.warn('[Minimact] Target element not found for patch:', patch);
      return;
    }

    switch (patch.type) {
      case 'Create':
        this.patchCreate(rootElement, patch.path, patch.node);
        break;
      case 'Remove':
        this.patchRemove(targetElement!);
        break;
      case 'Replace':
        this.patchReplace(targetElement!, patch.node);
        break;
      case 'UpdateText':
        this.patchUpdateText(targetElement!, patch.content);
        break;
      case 'UpdateProps':
        this.patchUpdateProps(targetElement as HTMLElement, patch.props);
        break;
      case 'ReorderChildren':
        this.patchReorderChildren(targetElement as HTMLElement, patch.order);
        break;
    }
  }

  /**
   * Create and insert a new node
   */
  private patchCreate(rootElement: HTMLElement, path: number[], node: VNode): void {
    const newElement = this.createElementFromVNode(node);

    if (path.length === 0) {
      // Replace root
      rootElement.innerHTML = '';
      rootElement.appendChild(newElement);
    } else {
      // Insert at path
      const parentPath = path.slice(0, -1);
      const index = path[path.length - 1];
      const parent = this.getElementByPath(rootElement, parentPath) as HTMLElement;

      if (parent) {
        if (index >= parent.childNodes.length) {
          parent.appendChild(newElement);
        } else {
          parent.insertBefore(newElement, parent.childNodes[index]);
        }
      }
    }

    this.log('Created node', { path, node });
  }

  /**
   * Remove a node from the DOM
   */
  private patchRemove(element: Node): void {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
      this.log('Removed node', { element });
    }
  }

  /**
   * Replace a node with a new one
   */
  private patchReplace(oldElement: Node, newNode: VNode): void {
    const newElement = this.createElementFromVNode(newNode);

    if (oldElement.parentNode) {
      oldElement.parentNode.replaceChild(newElement, oldElement);
      this.log('Replaced node', { oldElement, newNode });
    }
  }

  /**
   * Update text content of a text node
   */
  private patchUpdateText(element: Node, content: string): void {
    if (element.nodeType === Node.TEXT_NODE) {
      element.textContent = content;
    } else {
      // If it's an element, update its text content
      element.textContent = content;
    }
    this.log('Updated text', { element, content });
  }

  /**
   * Update element properties/attributes
   */
  private patchUpdateProps(element: HTMLElement, props: Record<string, string>): void {
    // Remove old attributes not in new props
    const oldAttrs = Array.from(element.attributes);
    for (const attr of oldAttrs) {
      if (!(attr.name in props) && !attr.name.startsWith('data-minimact-')) {
        element.removeAttribute(attr.name);
      }
    }

    // Set new attributes
    for (const [key, value] of Object.entries(props)) {
      if (key === 'style') {
        element.setAttribute('style', value);
      } else if (key === 'class' || key === 'className') {
        element.className = value;
      } else if (key.startsWith('on')) {
        // Event handlers are managed separately
        continue;
      } else {
        element.setAttribute(key, value);
      }
    }

    this.log('Updated props', { element, props });
  }

  /**
   * Reorder children based on keys
   */
  private patchReorderChildren(element: HTMLElement, order: string[]): void {
    const keyedChildren = new Map<string, Node>();

    // Build map of keyed children
    for (const child of Array.from(element.childNodes)) {
      if (child instanceof HTMLElement) {
        const key = child.getAttribute('data-key') || child.getAttribute('key');
        if (key) {
          keyedChildren.set(key, child);
        }
      }
    }

    // Reorder based on order array
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const child = keyedChildren.get(key);

      if (child) {
        const currentChild = element.childNodes[i];
        if (currentChild !== child) {
          element.insertBefore(child, currentChild);
        }
      }
    }

    this.log('Reordered children', { element, order });
  }

  /**
   * Get a DOM element by its path (array of indices)
   */
  private getElementByPath(rootElement: HTMLElement, path: number[]): Node | null {
    let current: Node = rootElement;

    for (const index of path) {
      if (index >= current.childNodes.length) {
        return null;
      }
      current = current.childNodes[index];
    }

    return current;
  }

  /**
   * Create a DOM element from a VNode
   */
  private createElementFromVNode(vnode: VNode): Node {
    switch (vnode.type) {
      case 'Text':
        return document.createTextNode((vnode as VText).content);

      case 'Element': {
        const velem = vnode as VElement;
        const element = document.createElement(velem.tag);

        // Set attributes
        for (const [key, value] of Object.entries(velem.props || {})) {
          if (key === 'className' || key === 'class') {
            element.className = value;
          } else if (key.startsWith('on')) {
            // Event handlers will be attached by event delegation
            element.setAttribute(`data-${key.toLowerCase()}`, value);
          } else {
            element.setAttribute(key, value);
          }
        }

        // Set key if present
        if (velem.key) {
          element.setAttribute('data-key', velem.key);
        }

        // Create children
        for (const child of velem.children || []) {
          element.appendChild(this.createElementFromVNode(child));
        }

        return element;
      }

      case 'Fragment': {
        const fragment = document.createDocumentFragment();
        const vfrag = vnode as any;

        for (const child of vfrag.children || []) {
          fragment.appendChild(this.createElementFromVNode(child));
        }

        return fragment;
      }

      case 'RawHtml': {
        const div = document.createElement('div');
        div.innerHTML = (vnode as any).html;
        return div;
      }

      default:
        console.warn('[Minimact] Unknown VNode type:', vnode);
        return document.createTextNode('');
    }
  }

  /**
   * Replace entire HTML (fallback when patches aren't available)
   */
  replaceHTML(rootElement: HTMLElement, html: string): void {
    rootElement.innerHTML = html;
    this.log('Replaced entire HTML', { html });
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.debugLogging) {
      console.log(`[Minimact DOMPatcher] ${message}`, data || '');
    }
  }
}
