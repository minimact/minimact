/**
 * Core types for the Path Editor
 */

/**
 * Node types in the document
 */
export type NodeType =
  | "element"       // JSX element like <div>
  | "attribute"     // Element attribute like className
  | "binding"       // Expression binding like {userName}
  | "text"          // Text content
  | "import"        // Import statement
  | "component"     // Component declaration
  | "loop"          // Loop/map operation
  | "conditional";  // Conditional rendering

/**
 * A single line/node in the path editor
 */
export interface DocumentNode {
  /** Unique path identifier: #jsx/div/p[0]/binding */
  path: string;

  /** Parsed path segments: ["jsx", "div", "p[0]", "binding"] */
  pathSegments: string[];

  /** Type of node */
  type: NodeType;

  /** Editable value on the right side */
  value: string;

  /** Depth level for indentation */
  depth: number;

  /** Optional metadata for type-specific information */
  metadata?: {
    /** Element tag name (for elements) */
    tagName?: string;

    /** Attribute name (for attributes) */
    attributeName?: string;

    /** Array index (for array elements) */
    index?: number;

    /** Binding expression (for bindings) */
    expression?: string;

    /** Import source (for imports) */
    importSource?: string;

    /** Is this a named import? */
    isNamedImport?: boolean;

    /** Loop variable name (for loops) */
    loopVariable?: string;

    /** Loop source expression (for loops) */
    loopSource?: string;

    /** Condition expression (for conditionals) */
    condition?: string;

    /** Is structural element? */
    isStructural?: boolean;

    /** Plugin name */
    pluginName?: string;

    /** Expression type */
    expressionType?: string;

    /** Bindings array */
    bindings?: any[];

    /** Template string */
    template?: string;

    /** Is loop? */
    isLoop?: boolean;

    /** Is conditional? */
    isConditional?: boolean;

    /** Loop template */
    loopTemplate?: any;
  };
}

/**
 * The complete document
 */
export interface Document {
  /** Document ID */
  id: string;

  /** All lines in the document */
  lines: DocumentNode[];

  /** Document version for conflict resolution */
  version: number;

  /** Component ID this document represents */
  componentId?: string;

  /** Original JSON AST (cached) */
  astCache?: any;

  /** Last modified timestamp */
  lastModified: number;
}

/**
 * Cursor position in the editor
 */
export interface Cursor {
  /** Line index (0-based) */
  lineIndex: number;

  /** Which part of the line is focused */
  position: "breadcrumb" | "value";

  /** Which segment of breadcrumb is focused (if position === "breadcrumb") */
  breadcrumbSegmentIndex?: number;

  /** Character offset in value (if position === "value") */
  valueOffset?: number;
}

/**
 * Selection range in the editor
 */
export interface Selection {
  start: Cursor;
  end: Cursor;
  isMultiline: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  lineIndex: number;
  message: string;
  severity: "error" | "warning" | "info";
  quickFix?: QuickFix;
}

/**
 * Quick fix for validation error
 */
export interface QuickFix {
  title: string;
  operation: () => void;
}

/**
 * Autocomplete suggestion
 */
export interface Suggestion {
  /** Display text */
  text: string;

  /** Description/documentation */
  description: string;

  /** Node type this creates */
  nodeType: NodeType;

  /** Icon identifier */
  icon?: string;

  /** Default value to insert */
  insertTemplate?: string;

  /** Sort priority (lower = higher priority) */
  priority?: number;
}

/**
 * Undo/Redo operation
 */
export interface Operation {
  type: "insert" | "delete" | "update" | "move" | "batch";
  timestamp: number;
  beforeState: DocumentNode[];
  afterState: DocumentNode[];
  cursorBefore: Cursor;
  cursorAfter: Cursor;
}

/**
 * JSON IR patch operation (for hot reload)
 */
export interface IROperation {
  op: "add" | "remove" | "update" | "move";
  path: string;
  field?: string;
  value?: any;
  oldValue?: any;
}

/**
 * JSON IR patch (for hot reload)
 */
export interface JsonIRPatch {
  componentId: string;
  operations: IROperation[];
  timestamp: number;
}

/**
 * Tree node for hierarchy view
 */
export interface TreeNode {
  path: string;
  label: string;
  type: NodeType;
  children: TreeNode[];
  isExpanded: boolean;
  depth: number;
  lineIndex: number;
}
