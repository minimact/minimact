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
  const { document, cursor, setCursor, clipboard, copyNode, pasteAsChild, deleteLine } = useDocumentStore();
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; lineIndex: number } | null>(null);

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

  const handleCopy = (e: React.MouseEvent, lineIndex: number) => {
    e.stopPropagation();
    copyNode(lineIndex);
  };

  const handlePaste = (e: React.MouseEvent, lineIndex: number, position: 'prepend' | 'append') => {
    e.stopPropagation();
    pasteAsChild(lineIndex, position);
  };

  const handleDelete = (lineIndex: number) => {
    if (confirm('Delete this node and all its children?')) {
      deleteLine(lineIndex);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, lineIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      lineIndex
    });
  };

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.document.addEventListener('click', closeMenu);
    return () => window.document.removeEventListener('click', closeMenu);
  }, []);

  const renderTree = (nodes: TreeNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <div key={node.path} className="tree-node-container">
        <div
          className={`tree-node ${cursor.lineIndex === node.lineIndex ? 'active' : ''}`}
          style={{ paddingLeft: `${node.depth * 12}px` }}
          onClick={() => handleNodeClick(node.lineIndex)}
          onContextMenu={(e) => handleContextMenu(e, node.lineIndex)}
        >
          <span className="tree-node-icon">{getIcon(node.type)}</span>
          <span className="tree-node-label">{node.label}</span>

          <div className="tree-node-actions">
            {/* Copy button */}
            <button
              className="tree-action-btn copy-btn"
              onClick={(e) => handleCopy(e, node.lineIndex)}
              title="Copy node"
            >
              📋
            </button>

            {/* Paste buttons - only show if clipboard has content */}
            {clipboard && (
              <>
                <button
                  className="tree-action-btn paste-btn"
                  onClick={(e) => handlePaste(e, node.lineIndex, 'prepend')}
                  title="Paste as first child"
                >
                  ⬇️
                </button>
                <button
                  className="tree-action-btn paste-btn"
                  onClick={(e) => handlePaste(e, node.lineIndex, 'append')}
                  title="Paste as last child"
                >
                  ⬆️
                </button>
              </>
            )}
          </div>
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="tree-context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000
          }}
        >
          <div
            className="context-menu-item delete-item"
            onClick={() => handleDelete(contextMenu.lineIndex)}
          >
            🗑️ Delete
          </div>
        </div>
      )}
    </div>
  );
};
