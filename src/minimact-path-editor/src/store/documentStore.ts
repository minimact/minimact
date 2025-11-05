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
    const { document } = get();
    if (!document) return;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    newLines.splice(afterLineIndex + 1, 0, node);

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
    const { document } = get();
    if (!document) return;

    const oldLines = [...document.lines];
    const newLines = [...document.lines];
    newLines.splice(lineIndex, 1);

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
