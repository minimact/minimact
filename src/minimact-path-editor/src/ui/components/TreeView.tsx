import React from 'react';
import { useDocumentStore } from '../../store/documentStore';
import './TreeView.css';

interface TreeNode {
  path: string;
  label: string;
  depth: number;
  type: string;
  lineIndex: number;
  children: TreeNode[];
  isExpanded: boolean;
}

export const TreeView: React.FC = () => {
  const { document, cursor, setCursor } = useDocumentStore();

  if (!document) return null;

  // Build tree structure from flat lines
  const buildTree = (): TreeNode[] => {
    const root: TreeNode[] = [];
    const stack: TreeNode[] = [];

    document.lines.forEach((node, index) => {
      const treeNode: TreeNode = {
        path: node.path,
        label: node.value || node.pathSegments[node.pathSegments.length - 1] || 'node',
        depth: node.depth,
        type: node.type,
        lineIndex: index,
        children: [],
        isExpanded: true
      };

      // Find parent based on depth
      while (stack.length > 0 && stack[stack.length - 1].depth >= treeNode.depth) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(treeNode);
      } else {
        stack[stack.length - 1].children.push(treeNode);
      }

      stack.push(treeNode);
    });

    return root;
  };

  const tree = buildTree();

  const handleNodeClick = (lineIndex: number) => {
    setCursor({
      lineIndex,
      position: 'value'
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'element': return '◆';
      case 'attribute': return '@';
      case 'binding': return '{}';
      case 'text': return '"';
      case 'loop': return '⟳';
      case 'conditional': return '?';
      case 'import': return '↓';
      default: return '•';
    }
  };

  const renderTree = (nodes: TreeNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <div key={node.path} className="tree-node-container">
        <div
          className={`tree-node ${cursor.lineIndex === node.lineIndex ? 'active' : ''}`}
          style={{ paddingLeft: `${node.depth * 12}px` }}
          onClick={() => handleNodeClick(node.lineIndex)}
        >
          <span className="tree-node-icon">{getIcon(node.type)}</span>
          <span className="tree-node-label">{node.label}</span>
        </div>
        {node.children.length > 0 && node.isExpanded && (
          <div className="tree-node-children">
            {renderTree(node.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="tree-view">
      <div className="tree-view-header">
        <h3>Structure</h3>
      </div>
      <div className="tree-view-content">
        {renderTree(tree)}
      </div>
    </div>
  );
};
