import React, { useRef, useEffect } from 'react';
import type { DocumentNode } from '../../core/types';
import './Line.css';

interface LineProps {
  node: DocumentNode;
  lineIndex?: number;
  isSelected: boolean;
  isFocused: boolean;
  cursorPosition: 'breadcrumb' | 'value';
  breadcrumbSegmentIndex?: number;
  onBreadcrumbClick: (segmentIndex: number) => void;
  onValueChange: (newValue: string) => void;
  onValueFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const Line: React.FC<LineProps> = ({
  node,
  isSelected,
  isFocused,
  cursorPosition,
  breadcrumbSegmentIndex,
  onBreadcrumbClick,
  onValueChange,
  onValueFocus,
  onKeyDown
}) => {
  const valueInputRef = useRef<HTMLInputElement>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isFocused && cursorPosition === 'value' && valueInputRef.current) {
      valueInputRef.current.focus();
    }
  }, [isFocused, cursorPosition]);

  // Get type-specific styling
  const getTypeClass = () => {
    switch (node.type) {
      case 'element': return 'line-element';
      case 'attribute': return 'line-attribute';
      case 'binding': return 'line-binding';
      case 'text': return 'line-text';
      case 'loop': return 'line-loop';
      case 'conditional': return 'line-conditional';
      case 'import': return 'line-import';
      default: return '';
    }
  };

  // Get icon for node type
  const getTypeIcon = () => {
    switch (node.type) {
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

  // Render breadcrumb path
  const renderBreadcrumb = () => {
    return (
      <div
        ref={breadcrumbRef}
        className={`line-breadcrumb ${isFocused && cursorPosition === 'breadcrumb' ? 'focused' : ''}`}
      >
        <span className="line-icon">{getTypeIcon()}</span>
        {node.pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <span
              className={`breadcrumb-segment ${
                isFocused && cursorPosition === 'breadcrumb' && breadcrumbSegmentIndex === index
                  ? 'segment-focused'
                  : ''
              }`}
              onClick={() => onBreadcrumbClick(index)}
            >
              {segment}
            </span>
            {index < node.pathSegments.length - 1 && (
              <span className="breadcrumb-separator">/</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render value input
  const renderValue = () => {
    return (
      <input
        ref={valueInputRef}
        type="text"
        className={`line-value ${isFocused && cursorPosition === 'value' ? 'focused' : ''}`}
        value={node.value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onValueFocus}
        onKeyDown={onKeyDown}
        placeholder={getPlaceholder()}
      />
    );
  };

  // Get placeholder text based on node type
  const getPlaceholder = () => {
    switch (node.type) {
      case 'element': return 'Element tag name';
      case 'attribute': return 'Attribute value';
      case 'binding': return 'Expression or variable';
      case 'text': return 'Text content';
      case 'loop': return 'Loop expression';
      case 'conditional': return 'Condition';
      case 'import': return 'Import source';
      default: return 'Value';
    }
  };

  return (
    <div
      className={`line ${getTypeClass()} ${isSelected ? 'selected' : ''} ${isFocused ? 'focused-line' : ''}`}
      style={{ paddingLeft: `${Math.max(0, node.depth - 1) * 16 + 8}px` }}
    >
      {renderBreadcrumb()}
      {renderValue()}

      {/* Show metadata on hover */}
      {node.metadata && Object.keys(node.metadata).length > 0 && (
        <div className="line-metadata-indicator" title={JSON.stringify(node.metadata, null, 2)}>
          ⓘ
        </div>
      )}
    </div>
  );
};
