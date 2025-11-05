/**
 * Maps DocumentNode changes back to the original JSON IR structure
 * Maintains live references to JSON IR nodes for efficient updates
 */
export class JsonIRMapper {
  private pathToNodeMap: Map<string, any> = new Map();
  private jsonIR: any;

  constructor(jsonIR: any) {
    this.jsonIR = jsonIR;
    this.buildPathMap(jsonIR);
  }

  /**
   * Build a map of paths to JSON IR nodes
   */
  private buildPathMap(jsonIR: any) {
    if (jsonIR.renderMethod?.children) {
      this.mapChildren(jsonIR.renderMethod.children);
    }
  }

  /**
   * Recursively map children
   */
  private mapChildren(children: any[]) {
    for (const child of children) {
      this.mapNode(child);
    }
  }

  /**
   * Map a single node and its children
   */
  private mapNode(node: any) {
    if (!node.path) return;

    // Store reference to this node
    this.pathToNodeMap.set(node.path, node);

    // Map attributes
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.path) {
          this.pathToNodeMap.set(attr.path, attr);
        }
      }
    }

    // Map children recursively
    if (node.children) {
      this.mapChildren(node.children);
    }

    // Map loop template body
    if (node.loopTemplate?.body) {
      this.mapNode(node.loopTemplate.body);
    }
  }

  /**
   * Update a value in the JSON IR by path
   */
  updateValue(path: string, newValue: string): boolean {
    // Remove leading # if present
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;

    const node = this.pathToNodeMap.get(cleanPath);
    if (!node) {
      console.warn(`[JsonIRMapper] No node found for path: ${cleanPath}`);
      return false;
    }

    // Update based on node type
    switch (node.type) {
      case 'JSXElement':
        node.tag = newValue;
        break;

      case 'StaticText':
        node.content = newValue;
        break;

      case 'StaticAttribute':
        node.value = newValue;
        break;

      case 'DynamicAttribute':
        // Update template
        node.template = newValue;
        break;

      case 'Expression':
        // Update template or binding
        if (node.template) {
          node.template = newValue;
        }
        break;

      case 'Plugin':
        // Plugin name or attributes
        if (node.tag === 'Plugin') {
          // Find name attribute
          const nameAttr = node.attributes?.find((a: any) => a.name === 'name');
          if (nameAttr) {
            nameAttr.value = newValue;
          }
        }
        break;

      default:
        console.warn(`[JsonIRMapper] Unknown node type: ${node.type}`);
        return false;
    }

    return true;
  }

  /**
   * Get the updated JSON IR
   */
  getJsonIR(): any {
    return this.jsonIR;
  }

  /**
   * Get a specific node by path
   */
  getNode(path: string): any {
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;
    return this.pathToNodeMap.get(cleanPath);
  }
}
