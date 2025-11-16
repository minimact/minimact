import { Patch, VNode, VElement, VText } from './types';
import { IConnectionManager } from './connection-manager';

/**
 * Applies DOM patches from the server to the actual DOM
 * Server sends DOM index-based patches - client just does simple array indexing!
 */
export class DOMPatcher {
  private debugLogging: boolean;
  private signalR?: IConnectionManager;

  constructor(options: { debugLogging?: boolean; signalR?: IConnectionManager } = {}) {
    this.debugLogging = options.debugLogging || false;
    this.signalR = options.signalR;
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

        // Debug: Patch application failure
        this.signalR?.debug('patches', 'Failed to apply patch', {
          patch,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
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

      // Debug: Element not found
      this.signalR?.debug('patches', 'Target element not found', {
        patchType: patch.type,
        path: patch.path,
        patch
      });

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
   * The path is in node.path (converted DOM index path from server)
   */
  private patchCreate(rootElement: HTMLElement, path: string | number[], node: VNode): void {
    const newElement = this.createElementFromVNode(node);

    // Get path from node.path (it's a string like "0.1.1.2")
    const nodePath = node.path;
    if (!nodePath) {
      console.error('[DOMPatcher] Node has no path for Create');
      return;
    }

    // Convert string path to number array
    const indices = nodePath.split('.').map(s => parseInt(s, 10));

    if (indices.length === 0) {
      console.error('[DOMPatcher] Invalid empty path for Create');
      return;
    }

    // Handle root insertion
    if (indices.length === 1 && indices[0] === 0) {
      rootElement.innerHTML = '';
      rootElement.appendChild(newElement);
      this.log('Created root node', { node });
      return;
    }

    // Navigate to parent using all but last index
    const parentIndices = indices.slice(0, -1);
    const insertionIndex = indices[indices.length - 1];
    const parent = this.getElementByPath(rootElement, parentIndices) as HTMLElement;

    if (!parent) {
      console.error('[DOMPatcher] Parent not found for Create at path:', nodePath);
      return;
    }

    // Insert at the specified index
    if (insertionIndex >= parent.childNodes.length) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, parent.childNodes[insertionIndex]);
    }

    this.log('Created node', { path: nodePath, node });
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
   * Get a DOM element by its DOM index path
   * Simple array indexing through childNodes - server handles all null path complexity!
   */
  private getElementByPath(rootElement: HTMLElement, path: string | number[]): Node | null {
    // Handle empty path
    if (!path || (Array.isArray(path) && path.length === 0)) {
      return rootElement;
    }

    // Path should be number array from server (DomPatch)
    const indices = Array.isArray(path) ? path : [];

    // Simple navigation through childNodes using indices
    let current: Node = rootElement;
    for (const index of indices) {
      if (index >= current.childNodes.length) {
        console.error(`[DOMPatcher] Index ${index} out of bounds (${current.childNodes.length} children)`);
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

    // Always send to server if debug mode enabled (independent of debugLogging flag)
    this.signalR?.debug('dom-patcher', message, data);
  }
}
