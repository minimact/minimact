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
   * Insert a new node as child of parent
   */
  insertNodeAsChild(parentPath: string, newNode: any, position: 'prepend' | 'append' = 'append'): boolean {
    const cleanParentPath = parentPath.startsWith('#') ? parentPath.slice(1) : parentPath;
    const parentNode = this.pathToNodeMap.get(cleanParentPath);

    if (!parentNode) {
      console.warn(`[JsonIRMapper] Parent node not found: ${cleanParentPath}`);
      return false;
    }

    // Ensure parent has children array
    if (!parentNode.children) {
      parentNode.children = [];
    }

    // Insert based on position
    if (position === 'prepend') {
      parentNode.children.unshift(newNode);
    } else {
      parentNode.children.push(newNode);
    }

    // Add to path map
    if (newNode.path) {
      this.pathToNodeMap.set(newNode.path, newNode);

      // Map attributes if present
      if (newNode.attributes) {
        for (const attr of newNode.attributes) {
          if (attr.path) {
            this.pathToNodeMap.set(attr.path, attr);
          }
        }
      }

      // Map children recursively if present
      if (newNode.children) {
        this.mapChildren(newNode.children);
      }
    }

    console.log(`[JsonIRMapper] Inserted node as ${position} child of ${cleanParentPath}`);
    return true;
  }

  /**
   * Create a JSON IR node from DocumentNode
   */
  createJsonIRNode(documentNode: any): any {
    const cleanPath = documentNode.path.startsWith('#') ? documentNode.path.slice(1) : documentNode.path;
    const pathSegments = documentNode.pathSegments;

    // Base JSON IR node structure
    const jsonNode: any = {
      path: cleanPath,
      pathSegments: pathSegments,
      type: this.mapTypeToJsonIR(documentNode.type),
    };

    // Add type-specific fields
    switch (documentNode.type) {
      case 'element':
        jsonNode.tag = documentNode.value || 'div';
        jsonNode.attributes = [];
        jsonNode.children = [];
        jsonNode.isStructural = false;
        break;

      case 'text':
        jsonNode.type = 'StaticText';
        jsonNode.content = documentNode.value || '';
        break;

      case 'attribute':
        jsonNode.type = 'StaticAttribute';
        jsonNode.name = documentNode.metadata?.attributeName || 'data-attr';
        jsonNode.value = documentNode.value || '';
        break;

      case 'binding':
        jsonNode.type = 'Expression';
        jsonNode.template = documentNode.value || '{0}';
        jsonNode.bindings = documentNode.metadata?.bindings || [];
        jsonNode.expressionType = 'MemberExpression';
        break;

      case 'loop':
        jsonNode.type = 'Expression';
        jsonNode.isLoop = true;
        jsonNode.loopTemplate = documentNode.metadata?.loopTemplate || {
          arrayBinding: 'items',
          itemVar: 'item',
          indexVar: null,
          body: null
        };
        break;

      case 'conditional':
        jsonNode.type = 'Expression';
        jsonNode.isConditional = true;
        jsonNode.expressionType = 'LogicalExpression';
        break;
    }

    return jsonNode;
  }

  /**
   * Map DocumentNode type to JSON IR type
   */
  private mapTypeToJsonIR(type: string): string {
    switch (type) {
      case 'element': return 'JSXElement';
      case 'text': return 'StaticText';
      case 'attribute': return 'StaticAttribute';
      case 'binding': return 'Expression';
      case 'loop': return 'Expression';
      case 'conditional': return 'Expression';
      default: return 'JSXElement';
    }
  }

  /**
   * Delete a node by path
   */
  deleteNode(path: string): boolean {
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;
    const node = this.pathToNodeMap.get(cleanPath);

    if (!node) {
      console.warn(`[JsonIRMapper] Node not found for deletion: ${cleanPath}`);
      return false;
    }

    // Find and remove from parent's children array
    // This requires finding the parent
    const pathParts = cleanPath.split('.');
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('.');
      const parentNode = this.pathToNodeMap.get(parentPath);

      if (parentNode?.children) {
        const index = parentNode.children.indexOf(node);
        if (index > -1) {
          parentNode.children.splice(index, 1);
        }
      }
    } else {
      // Root level node - remove from renderMethod.children
      if (this.jsonIR.renderMethod?.children) {
        const index = this.jsonIR.renderMethod.children.indexOf(node);
        if (index > -1) {
          this.jsonIR.renderMethod.children.splice(index, 1);
        }
      }
    }

    // Remove from path map
    this.pathToNodeMap.delete(cleanPath);

    console.log(`[JsonIRMapper] Deleted node: ${cleanPath}`);
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
