import { create } from 'zustand';
import type { Document, DocumentNode, Cursor, Selection, Operation, ValidationError } from '../core/types';
import { PathParser } from '../core/parser/PathParser';
import { JsonIRConverter } from '../core/parser/JsonIRConverter';
import { JsonIRMapper } from '../core/parser/JsonIRMapper';

interface DocumentStore {
  // Document state
  document: Document | null;
  jsonIRMapper: JsonIRMapper | null;
  cursor: Cursor;
  selection: Selection | null;

  // Clipboard
  clipboard: DocumentNode | null;

  // History
  undoStack: Operation[];
  redoStack: Operation[];
  currentVersion: number;

  // Validation
  validationErrors: ValidationError[];

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: number | null;

  // Actions
  loadDocument: (jsonIR: any) => void;
  updateLine: (lineIndex: number, newValue: string) => void;
  insertLine: (afterLineIndex: number, node: DocumentNode) => void;
  deleteLine: (lineIndex: number) => void;
  moveLine: (fromIndex: number, toIndex: number) => void;

  // Clipboard
  copyNode: (lineIndex: number) => void;
  pasteAsChild: (parentLineIndex: number, position: 'prepend' | 'append') => void;

  // Cursor/Selection
  setCursor: (cursor: Cursor) => void;
  setSelection: (selection: Selection | null) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Validation
  validate: () => void;

  // Export
  exportDocument: () => string;
  getJsonIR: () => any;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state
  document: null,
  jsonIRMapper: null,
  cursor: {
    lineIndex: 0,
    position: 'breadcrumb',
    breadcrumbSegmentIndex: 0
  },
  selection: null,
  clipboard: null,
  undoStack: [],
  redoStack: [],
  currentVersion: 0,
  validationErrors: [],
  isLoading: false,
  isSaving: false,
  lastSaved: null,

  // Load document from JSON IR
  loadDocument: (jsonIR: any) => {
    set({ isLoading: true });

    try {
      const lines = JsonIRConverter.fromJsonIR(jsonIR);

      // Create mapper to maintain live references to JSON IR
      const mapper = new JsonIRMapper(jsonIR);

      const document: Document = {
        id: crypto.randomUUID(),
        lines,
        version: 1,
        componentId: jsonIR.componentName || 'Component',
        astCache: jsonIR,
        lastModified: Date.now()
      };

      set({
        document,
        jsonIRMapper: mapper,
        isLoading: false,
        cursor: { lineIndex: 0, position: 'breadcrumb', breadcrumbSegmentIndex: 0 },
        validationErrors: []
      });

      // Validate after loading
      get().validate();
    } catch (error) {
      console.error('Failed to load document:', error);
      set({ isLoading: false });
    }
  },

  // Update line value
  updateLine: (lineIndex: number, newValue: string) => {
    const { document, jsonIRMapper } = get();
    if (!document) return;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    const updatedNode = { ...newLines[lineIndex], value: newValue };
    newLines[lineIndex] = updatedNode;

    // Update the JSON IR in place via mapper
    if (jsonIRMapper) {
      const success = jsonIRMapper.updateValue(updatedNode.path, newValue);
      if (success) {
        console.log(`[Store] Updated JSON IR at path: ${updatedNode.path}`);
      }
    }

    // Create operation for undo
    const operation: Operation = {
      type: 'update',
      timestamp: Date.now(),
      beforeState: oldLines,
      afterState: newLines,
      cursorBefore: get().cursor,
      cursorAfter: get().cursor
    };

    set(state => ({
      document: {
        ...document,
        lines: newLines,
        version: document.version + 1,
        lastModified: Date.now()
      },
      undoStack: [...state.undoStack, operation],
      redoStack: [], // Clear redo stack on new action
      currentVersion: state.currentVersion + 1
    }));

    // Validate after update
    get().validate();
  },

  // Insert new line
  insertLine: (afterLineIndex: number, node: DocumentNode) => {
    const { document, jsonIRMapper } = get();
    if (!document) return;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    newLines.splice(afterLineIndex + 1, 0, node);

    // ✅ UPDATE JSON IR
    if (jsonIRMapper) {
      // Find parent by depth
      let parentIndex = afterLineIndex;
      while (parentIndex >= 0 && document.lines[parentIndex].depth >= node.depth) {
        parentIndex--;
      }

      if (parentIndex >= 0) {
        const parentNode = document.lines[parentIndex];
        const jsonIRNode = jsonIRMapper.createJsonIRNode(node);
        jsonIRMapper.insertNodeAsChild(parentNode.path, jsonIRNode, 'append');
        console.log(`[Store] Updated JSON IR: inserted line`);
      }
    }

    const operation: Operation = {
      type: 'insert',
      timestamp: Date.now(),
      beforeState: oldLines,
      afterState: newLines,
      cursorBefore: get().cursor,
      cursorAfter: { lineIndex: afterLineIndex + 1, position: 'value' }
    };

    set(state => ({
      document: {
        ...document,
        lines: newLines,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorAfter,
      undoStack: [...state.undoStack, operation],
      redoStack: [],
      currentVersion: state.currentVersion + 1
    }));

    get().validate();
  },

  // Delete line
  deleteLine: (lineIndex: number) => {
    const { document, jsonIRMapper } = get();
    if (!document) return;

    const nodeToDelete = document.lines[lineIndex];
    const nodeDepth = nodeToDelete.depth;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];

    // Find all descendants (nodes with greater depth that come after this node)
    let deleteCount = 1; // Start with the node itself
    for (let i = lineIndex + 1; i < newLines.length; i++) {
      if (newLines[i].depth <= nodeDepth) break; // Stop when we exit the subtree
      deleteCount++;
    }

    // Remove the node and all its descendants
    newLines.splice(lineIndex, deleteCount);

    // ✅ UPDATE JSON IR
    if (jsonIRMapper) {
      const success = jsonIRMapper.deleteNode(nodeToDelete.path);
      if (success) {
        console.log(`[Store] Updated JSON IR: deleted node tree at ${nodeToDelete.path} (${deleteCount} nodes)`);
      }
    }

    const operation: Operation = {
      type: 'delete',
      timestamp: Date.now(),
      beforeState: oldLines,
      afterState: newLines,
      cursorBefore: get().cursor,
      cursorAfter: {
        lineIndex: Math.max(0, lineIndex - 1),
        position: 'breadcrumb'
      }
    };

    set(state => ({
      document: {
        ...document,
        lines: newLines,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorAfter,
      undoStack: [...state.undoStack, operation],
      redoStack: [],
      currentVersion: state.currentVersion + 1
    }));

    get().validate();
  },

  // Move line
  moveLine: (fromIndex: number, toIndex: number) => {
    const { document } = get();
    if (!document) return;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    const [movedLine] = newLines.splice(fromIndex, 1);
    newLines.splice(toIndex, 0, movedLine);

    const operation: Operation = {
      type: 'move',
      timestamp: Date.now(),
      beforeState: oldLines,
      afterState: newLines,
      cursorBefore: get().cursor,
      cursorAfter: { lineIndex: toIndex, position: 'breadcrumb' }
    };

    set(state => ({
      document: {
        ...document,
        lines: newLines,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorAfter,
      undoStack: [...state.undoStack, operation],
      redoStack: [],
      currentVersion: state.currentVersion + 1
    }));

    get().validate();
  },

  // Set cursor position
  setCursor: (cursor: Cursor) => {
    set({ cursor });
  },

  // Set selection
  setSelection: (selection: Selection | null) => {
    set({ selection });
  },

  // Copy node to clipboard
  copyNode: (lineIndex: number) => {
    const { document } = get();
    if (!document) return;

    const nodeToCopy = document.lines[lineIndex];
    set({ clipboard: { ...nodeToCopy } });
    console.log(`[Store] Copied node: ${nodeToCopy.path}`);
  },

  // Paste node as child of parent
  pasteAsChild: (parentLineIndex: number, position: 'prepend' | 'append' = 'append') => {
    const { document, clipboard, jsonIRMapper } = get();
    if (!document || !clipboard) return;

    const parentNode = document.lines[parentLineIndex];

    // Generate proper hex path segment (0x10000000 increments)
    const generateHexSegment = (existingChildren: DocumentNode[]): string => {
      if (existingChildren.length === 0) {
        return '10000000'; // First child
      }

      // Find highest hex value among existing children at this depth
      let maxHex = 0;
      for (const child of existingChildren) {
        const lastSegment = child.pathSegments[child.pathSegments.length - 1];
        if (/^[0-9a-f]{8}$/i.test(lastSegment)) {
          const hexValue = parseInt(lastSegment, 16);
          if (hexValue > maxHex) {
            maxHex = hexValue;
          }
        }
      }

      // Increment by 0x10000000 (268M gap)
      const newHex = maxHex + 0x10000000;
      return newHex.toString(16).padStart(8, '0');
    };

    // Find existing children of parent
    const existingChildren: DocumentNode[] = [];
    for (let i = parentLineIndex + 1; i < document.lines.length; i++) {
      if (document.lines[i].depth <= parentNode.depth) break;
      if (document.lines[i].depth === parentNode.depth + 1) {
        existingChildren.push(document.lines[i]);
      }
    }

    const newHexSegment = generateHexSegment(existingChildren);

    // Find insert index first
    let insertIndex: number;
    if (position === 'prepend') {
      insertIndex = parentLineIndex + 1;
    } else {
      insertIndex = parentLineIndex + 1;
      while (insertIndex < document.lines.length &&
             document.lines[insertIndex].depth > parentNode.depth) {
        insertIndex++;
      }
    }

    // Deep copy the clipboard node and all its descendants
    const clipboardLineIndex = document.lines.findIndex(line => line.path === clipboard.path);
    const nodesToCopy: DocumentNode[] = [];

    if (clipboardLineIndex >= 0) {
      // Find all descendants
      nodesToCopy.push(clipboard);
      for (let i = clipboardLineIndex + 1; i < document.lines.length; i++) {
        if (document.lines[i].depth <= clipboard.depth) break;
        nodesToCopy.push(document.lines[i]);
      }
    } else {
      // Clipboard node not in document (standalone), just copy it
      nodesToCopy.push(clipboard);
    }

    // Helper to calculate sibling index for display
    const calculateSiblingIndex = (parentLineIndex: number, tagName: string, upToLineIndex: number): number => {
      let index = 0;
      const parentDepth = document.lines[parentLineIndex].depth;

      for (let i = parentLineIndex + 1; i < upToLineIndex && i < document.lines.length; i++) {
        const line = document.lines[i];
        if (line.depth <= parentDepth) break; // End of parent's children
        if (line.depth === parentDepth + 1 && line.value === tagName) {
          index++;
        }
      }

      return index;
    };

    // Rebase paths and create new nodes
    const newNodes: DocumentNode[] = [];
    const oldPathToNewPath = new Map<string, string>();

    for (let i = 0; i < nodesToCopy.length; i++) {
      const originalNode = nodesToCopy[i];

      if (i === 0) {
        // Root of copied tree
        const newPath = `${parentNode.path}.${newHexSegment}`;

        // Calculate display index for root node
        const siblingIndex = calculateSiblingIndex(parentLineIndex, originalNode.value, insertIndex);
        const displaySegment = originalNode.type === 'element'
          ? `${originalNode.value}[${siblingIndex}]`
          : originalNode.pathSegments[originalNode.pathSegments.length - 1];

        const newSegments = [...parentNode.pathSegments, displaySegment];

        newNodes.push({
          ...originalNode,
          path: newPath,
          pathSegments: newSegments,
          depth: parentNode.depth + 1
        });

        oldPathToNewPath.set(originalNode.path, newPath);
      } else {
        // Descendant - rebase relative to new root
        const relativeDepth = originalNode.depth - clipboard.depth;
        const newDepth = parentNode.depth + 1 + relativeDepth;

        // Find new parent in newNodes
        let newParentNode: DocumentNode | null = null;
        for (let j = i - 1; j >= 0; j--) {
          if (newNodes[j].depth === newDepth - 1) {
            newParentNode = newNodes[j];
            break;
          }
        }

        if (!newParentNode) continue;

        const newPath = `${newParentNode.path}.${originalNode.pathSegments[originalNode.pathSegments.length - 1]}`;

        // For descendants, preserve their relative display (they keep their original indices within the copied subtree)
        const lastDisplaySegment = originalNode.pathSegments[originalNode.pathSegments.length - 1];
        const newSegments = [...newParentNode.pathSegments, lastDisplaySegment];

        newNodes.push({
          ...originalNode,
          path: newPath,
          pathSegments: newSegments,
          depth: newDepth
        });

        oldPathToNewPath.set(originalNode.path, newPath);
      }
    }

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    newLines.splice(insertIndex, 0, ...newNodes);

    // ✅ RECALCULATE INDICES for subsequent siblings with same tag
    // Find all siblings after the inserted nodes that have the same tag
    const insertedRootTag = newNodes[0].value;
    const insertedRootDepth = newNodes[0].depth;
    let currentIndex = calculateSiblingIndex(parentLineIndex, insertedRootTag, insertIndex);

    for (let i = insertIndex; i < newLines.length; i++) {
      const line = newLines[i];

      // Stop when we exit the parent's children
      if (line.depth < insertedRootDepth) break;

      // Only update direct siblings at same depth with same tag
      if (line.depth === insertedRootDepth && line.type === 'element' && line.value === insertedRootTag) {
        // Update the last segment with correct index
        const newSegments = [...line.pathSegments];
        newSegments[newSegments.length - 1] = `${line.value}[${currentIndex}]`;
        newLines[i] = {
          ...line,
          pathSegments: newSegments
        };
        currentIndex++;
      }
    }

    // ✅ UPDATE JSON IR - Copy entire subtree
    if (jsonIRMapper) {
      const originalJsonNode = jsonIRMapper.getNode(clipboard.path);

      if (originalJsonNode) {
        // Deep clone the JSON IR node
        const clonedJsonNode = JSON.parse(JSON.stringify(originalJsonNode));

        // Update path in cloned node
        const updatePaths = (node: any, oldPath: string, newPath: string) => {
          if (node.path === oldPath) {
            node.path = newPath.replace(/^#/, '');
            node.pathSegments = newPath.replace(/^#/, '').split('.');
          }

          if (node.children) {
            for (const child of node.children) {
              const childOldPath = child.path;
              const childNewPath = oldPathToNewPath.get('#' + childOldPath);
              if (childNewPath) {
                updatePaths(child, childOldPath, childNewPath);
              }
            }
          }

          if (node.attributes) {
            for (const attr of node.attributes) {
              if (attr.path && oldPathToNewPath.has('#' + attr.path)) {
                attr.path = oldPathToNewPath.get('#' + attr.path)!.replace(/^#/, '');
              }
            }
          }
        };

        updatePaths(clonedJsonNode, clipboard.path.replace(/^#/, ''), newNodes[0].path);

        // Insert into parent
        const success = jsonIRMapper.insertNodeAsChild(parentNode.path, clonedJsonNode, position);

        if (success) {
          console.log(`[Store] Updated JSON IR: inserted node tree as ${position} child`);
        } else {
          console.warn(`[Store] Failed to update JSON IR for paste operation`);
        }
      } else {
        // Fallback: create new JSON IR node
        const jsonIRNode = jsonIRMapper.createJsonIRNode(newNodes[0]);
        jsonIRMapper.insertNodeAsChild(parentNode.path, jsonIRNode, position);
      }
    }

    const operation: Operation = {
      type: 'insert',
      timestamp: Date.now(),
      beforeState: oldLines,
      afterState: newLines,
      cursorBefore: get().cursor,
      cursorAfter: { lineIndex: insertIndex, position: 'value' }
    };

    set(state => ({
      document: {
        ...document,
        lines: newLines,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorAfter,
      undoStack: [...state.undoStack, operation],
      redoStack: [],
      currentVersion: state.currentVersion + 1
    }));

    console.log(`[Store] Pasted ${newNodes.length} nodes as ${position} child of: ${parentNode.path} at index ${insertIndex}`);
    get().validate();
  },

  // Undo last action
  undo: () => {
    const { undoStack, document } = get();
    if (undoStack.length === 0 || !document) return;

    const operation = undoStack[undoStack.length - 1];

    set(state => ({
      document: {
        ...document,
        lines: operation.beforeState,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorBefore,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, operation],
      currentVersion: state.currentVersion - 1
    }));

    get().validate();
  },

  // Redo last undone action
  redo: () => {
    const { redoStack, document } = get();
    if (redoStack.length === 0 || !document) return;

    const operation = redoStack[redoStack.length - 1];

    set(state => ({
      document: {
        ...document,
        lines: operation.afterState,
        version: document.version + 1,
        lastModified: Date.now()
      },
      cursor: operation.cursorAfter,
      undoStack: [...state.undoStack, operation],
      redoStack: state.redoStack.slice(0, -1),
      currentVersion: state.currentVersion + 1
    }));

    get().validate();
  },

  // Validate document
  validate: () => {
    const { document } = get();
    if (!document) return;

    const errors: ValidationError[] = [];
    const pathSet = new Set<string>();

    // Check for duplicate paths
    document.lines.forEach((node, index) => {
      if (pathSet.has(node.path)) {
        errors.push({
          path: node.path,
          lineIndex: index,
          message: `Duplicate path: ${node.path}`,
          severity: 'error'
        });
      }
      pathSet.add(node.path);

      // Validate path syntax
      const validation = PathParser.validatePath(node.path);
      if (!validation.valid) {
        errors.push({
          path: node.path,
          lineIndex: index,
          message: validation.error || 'Invalid path',
          severity: 'error'
        });
      }
    });

    set({ validationErrors: errors });
  },

  // Export document to string format
  exportDocument: () => {
    const { document } = get();
    if (!document) return '';

    return PathParser.serializeDocument(document.lines);
  },

  // Get updated JSON IR
  getJsonIR: () => {
    const { jsonIRMapper } = get();
    if (!jsonIRMapper) return null;

    return jsonIRMapper.getJsonIR();
  }
}));
