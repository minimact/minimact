import type { DocumentNode, NodeType } from '../types';

/**
 * Converts Minimact JSON IR to path-based document format
 */
export class JsonIRConverter {
  /**
   * Count siblings with same tag to determine index
   */
  private static countSiblingIndex(parent: any, currentNode: any): number {
    if (!parent || !parent.children || !currentNode.tag) return 0;

    let index = 0;
    for (const child of parent.children) {
      if (child === currentNode) break;
      if (child.tag === currentNode.tag) index++;
    }
    return index;
  }
  /**
   * Convert JSON IR to DocumentNode array
   */
  static fromJsonIR(jsonIR: any): DocumentNode[] {
    const nodes: DocumentNode[] = [];

    // Process renderMethod children
    if (jsonIR.renderMethod?.children) {
      this.processChildren(jsonIR.renderMethod.children, nodes, jsonIR.renderMethod, ['jsx']);
    }

    return nodes;
  }

  /**
   * Recursively process children elements
   */
  private static processChildren(children: any[], nodes: DocumentNode[], parent: any, parentDisplayPath: string[]): void {
    for (const child of children) {
      this.processNode(child, nodes, parent, parentDisplayPath);
    }
  }

  /**
   * Process a single node
   */
  private static processNode(node: any, nodes: DocumentNode[], parent: any, parentDisplayPath: string[]): void {
    switch (node.type) {
      case 'JSXElement':
        this.processJSXElement(node, nodes, parent, parentDisplayPath);
        break;
      case 'StaticText':
        this.processStaticText(node, nodes, parentDisplayPath);
        break;
      case 'Expression':
        this.processExpression(node, nodes, parentDisplayPath);
        break;
      case 'Plugin':
        this.processPlugin(node, nodes, parentDisplayPath);
        break;
    }
  }

  /**
   * Process JSX element
   */
  private static processJSXElement(node: any, nodes: DocumentNode[], parent: any, parentDisplayPath: string[]): void {
    const path = `#${node.path}`;
    const hexSegments = node.pathSegments || [];

    // Calculate sibling index
    const siblingIndex = this.countSiblingIndex(parent, node);

    // Build display path with index
    const displaySegments = [...parentDisplayPath, `${node.tag}[${siblingIndex}]`];

    // Add element node
    nodes.push({
      path,
      pathSegments: displaySegments,
      type: 'element',
      value: node.tag,
      depth: hexSegments.length - 1,
      metadata: {
        tagName: node.tag,
        isStructural: node.isStructural
      }
    });

    // Process attributes
    if (node.attributes) {
      for (const attr of node.attributes) {
        this.processAttribute(attr, nodes, displaySegments);
      }
    }

    // Process children
    if (node.children) {
      this.processChildren(node.children, nodes, node, displaySegments);
    }
  }

  /**
   * Process attribute
   */
  private static processAttribute(attr: any, nodes: DocumentNode[], parentDisplayPath: string[]): void {
    const attrPath = `#${attr.path}`;
    const hexSegments = attr.pathSegments || [];

    // Build display path for attribute
    const displaySegments = [...parentDisplayPath, `@${attr.name}`];

    let value = '';
    let nodeType: NodeType = 'attribute';

    switch (attr.type) {
      case 'StaticAttribute':
        value = attr.value;
        break;
      case 'DynamicAttribute':
        value = attr.template || JSON.stringify(attr.expressionTree || {});
        break;
      case 'EventHandlerAttribute':
        value = attr.handler;
        nodeType = 'attribute';
        break;
    }

    nodes.push({
      path: attrPath,
      pathSegments: displaySegments,
      type: nodeType,
      value,
      depth: hexSegments.length - 1,
      metadata: {
        attributeName: attr.name,
        expressionType: attr.expressionType,
        bindings: attr.bindings
      }
    });
  }

  /**
   * Process static text
   */
  private static processStaticText(node: any, nodes: DocumentNode[], parentDisplayPath: string[]): void {
    const path = `#${node.path}`;
    const hexSegments = node.pathSegments || [];
    const displaySegments = [...parentDisplayPath, 'text'];

    nodes.push({
      path,
      pathSegments: displaySegments,
      type: 'text',
      value: node.content,
      depth: hexSegments.length - 1,
      metadata: {}
    });
  }

  /**
   * Process expression (binding, conditional, loop)
   */
  private static processExpression(node: any, nodes: DocumentNode[], parentDisplayPath: string[]): void {
    const path = `#${node.path}`;
    const hexSegments = node.pathSegments || [];

    // Determine expression type for display
    let exprLabel = 'binding';
    if (node.isLoop) exprLabel = 'loop';
    else if (node.isConditional) exprLabel = 'if';

    const displaySegments = [...parentDisplayPath, exprLabel];

    let value = '';
    let nodeType: NodeType = 'binding';

    // Determine expression type
    if (node.isLoop || node.loopTemplate) {
      nodeType = 'loop';
      const loop = node.loopTemplate;
      value = `${loop.arrayBinding}.map((${loop.itemVar}${loop.indexVar ? ', ' + loop.indexVar : ''}) => ...)`;
    } else if (node.isConditional) {
      nodeType = 'conditional';
      if (node.expressionType === 'LogicalExpression') {
        const cond = typeof node.condition === 'string' ? node.condition : JSON.stringify(node.condition);
        value = `${cond} && <${node.branches[0]?.tagName || 'element'}>`;
      } else if (node.expressionType === 'ConditionalExpression') {
        value = `${node.condition} ? ${JSON.stringify(node.consequent)} : ${JSON.stringify(node.alternate)}`;
      }
    } else {
      // Simple binding
      if (node.template) {
        value = node.template;
      } else if (node.bindings && node.bindings.length > 0) {
        value = node.bindings[0].path;
      }
    }

    nodes.push({
      path,
      pathSegments: displaySegments,
      type: nodeType,
      value,
      depth: hexSegments.length - 1,
      metadata: {
        expressionType: node.expressionType,
        bindings: node.bindings,
        template: node.template,
        isLoop: node.isLoop,
        isConditional: node.isConditional,
        loopTemplate: node.loopTemplate
      }
    });

    // Process loop body children
    if (node.loopTemplate?.body) {
      this.processNode(node.loopTemplate.body, nodes, node, displaySegments);
    }
  }

  /**
   * Process plugin element
   */
  private static processPlugin(node: any, nodes: DocumentNode[], parentDisplayPath: string[]): void {
    const path = `#${node.path}`;
    const hexSegments = node.pathSegments || [];
    const displaySegments = [...parentDisplayPath, 'Plugin'];

    // Find plugin name from attributes
    const nameAttr = node.attributes?.find((a: any) => a.name === 'name');
    const pluginName = nameAttr?.value || 'Plugin';

    nodes.push({
      path,
      pathSegments: displaySegments,
      type: 'element',
      value: `<Plugin:${pluginName}>`,
      depth: hexSegments.length - 1,
      metadata: {
        tagName: 'Plugin',
        pluginName
      }
    });

    // Process plugin attributes
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.name !== 'name') {  // Skip name attribute as it's in the value
          this.processAttribute(attr, nodes, displaySegments);
        }
      }
    }
  }

  /**
   * Convert DocumentNode array back to JSON IR
   */
  static toJsonIR(_nodes: DocumentNode[]): any {
    // TODO: Implement reverse conversion
    // This would rebuild the JSON IR structure from path-based format
    // More complex - involves reconstructing the tree structure

    return {
      type: 'Component',
      componentName: 'EditedComponent',
      renderMethod: {
        type: 'RenderMethod',
        children: []
      }
    };
  }
}
