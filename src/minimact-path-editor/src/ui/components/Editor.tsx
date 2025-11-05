import React, { useCallback, useEffect, useRef } from 'react';
import { Line } from './Line';
import { TreeView } from './TreeView';
import { useDocumentStore } from '../../store/documentStore';
import './Editor.css';

export const Editor: React.FC = () => {
  const {
    document,
    cursor,
    selection,
    setCursor,
    updateLine,
    insertLine,
    deleteLine,
    undo,
    redo
  } = useDocumentStore();

  const editorRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, lineIndex: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (lineIndex > 0) {
          setCursor({ ...cursor, lineIndex: lineIndex - 1 });
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (document && lineIndex < document.lines.length - 1) {
          setCursor({ ...cursor, lineIndex: lineIndex + 1 });
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (cursor.position === 'breadcrumb') {
          // Switch to value editor
          setCursor({ ...cursor, position: 'value' });
        } else {
          // Create new child line (indent)
          // TODO: Implement line indentation
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (document) {
          // Create new sibling line
          const currentNode = document.lines[lineIndex];
          const newNode = {
            path: `#new_${Date.now()}`,
            pathSegments: ['new', Date.now().toString()],
            type: currentNode.type,
            value: '',
            depth: currentNode.depth,
            metadata: {}
          } as any;
          insertLine(lineIndex, newNode);
        }
        break;

      case 'Escape':
        e.preventDefault();
        // Return to breadcrumb mode
        setCursor({ ...cursor, position: 'breadcrumb', breadcrumbSegmentIndex: 0 });
        break;

      case 'Delete':
      case 'Backspace':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          deleteLine(lineIndex);
        }
        break;

      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        break;

      case 'ArrowLeft':
        if (cursor.position === 'breadcrumb') {
          e.preventDefault();
          const segmentIndex = cursor.breadcrumbSegmentIndex || 0;
          if (segmentIndex > 0) {
            setCursor({ ...cursor, breadcrumbSegmentIndex: segmentIndex - 1 });
          }
        }
        break;

      case 'ArrowRight':
        if (cursor.position === 'breadcrumb' && document) {
          e.preventDefault();
          const currentNode = document.lines[lineIndex];
          const segmentIndex = cursor.breadcrumbSegmentIndex || 0;
          if (segmentIndex < currentNode.pathSegments.length - 1) {
            setCursor({ ...cursor, breadcrumbSegmentIndex: segmentIndex + 1 });
          } else {
            // Move to value editor
            setCursor({ ...cursor, position: 'value' });
          }
        }
        break;
    }
  }, [cursor, document, setCursor, insertLine, deleteLine, undo, redo]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((lineIndex: number, segmentIndex: number) => {
    setCursor({
      lineIndex,
      position: 'breadcrumb',
      breadcrumbSegmentIndex: segmentIndex
    });
  }, [setCursor]);

  // Handle value change
  const handleValueChange = useCallback((lineIndex: number, newValue: string) => {
    updateLine(lineIndex, newValue);
  }, [updateLine]);

  // Handle value focus
  const handleValueFocus = useCallback((lineIndex: number) => {
    setCursor({
      lineIndex,
      position: 'value'
    });
  }, [setCursor]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            // TODO: Implement save
            console.log('Save triggered');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (!document) {
    return (
      <div className="editor editor-empty">
        <div className="empty-state">
          <h2>No document loaded</h2>
          <p>Load a JSON IR file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <TreeView />
      <div className="editor" ref={editorRef}>
        <div className="editor-header">
          <div className="editor-title">
            {document.componentId || 'Component'}
            <span className="editor-version">v{document.version}</span>
          </div>
          <div className="editor-stats">
            {document.lines.length} lines
          </div>
        </div>

        <div className="editor-content">
          {document.lines.map((node, index) => (
            <Line
            key={`${node.path}-${index}`}
            node={node}
            lineIndex={index}
            isSelected={selection ? (
              index >= selection.start.lineIndex && index <= selection.end.lineIndex
            ) : false}
            isFocused={cursor.lineIndex === index}
            cursorPosition={cursor.lineIndex === index ? cursor.position : 'breadcrumb'}
            breadcrumbSegmentIndex={cursor.lineIndex === index ? cursor.breadcrumbSegmentIndex : undefined}
            onBreadcrumbClick={(segmentIndex) => handleBreadcrumbClick(index, segmentIndex)}
            onValueChange={(newValue) => handleValueChange(index, newValue)}
            onValueFocus={() => handleValueFocus(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
      </div>

        <div className="editor-status">
          <div className="cursor-info">
            Line {cursor.lineIndex + 1} / {document.lines.length}
            {cursor.position === 'breadcrumb' && ` • Segment ${(cursor.breadcrumbSegmentIndex || 0) + 1}`}
          </div>
        </div>
      </div>
    </div>
  );
};
