/**
 * Main Entry Point
 *
 * Sets up Monaco Editor with Shadow Key Tracking
 */

import * as monaco from 'monaco-editor';

// Configure Monaco workers
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url),
        { type: 'module' }
      );
    }
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url),
      { type: 'module' }
    );
  }
};
import { MonacoShadowKeyTracker } from './MonacoShadowKeyTracker';

// Sample Counter.tsx with JSX
const initialCode = `function Counter({ count }) {
  const [localCount, setLocalCount] = useState(count);

  function increment() {
    setLocalCount(localCount + 1);
  }

  return (
    <div className="counter">
      <h1>Counter Demo</h1>
      <span>Count: {localCount}</span>
      <button onClick={increment}>Increment</button>
    </div>
  );
}`;

// Initialize Source Editor (left side)
const sourceEditorContainer = document.getElementById('source-editor');
if (!sourceEditorContainer) {
  throw new Error('Source editor container not found');
}

const editor = monaco.editor.create(sourceEditorContainer, {
  value: initialCode,
  language: 'typescript',
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true }
});

// Initialize Keys Editor (right side - read-only)
const keysEditorContainer = document.getElementById('keys-editor');
if (!keysEditorContainer) {
  throw new Error('Keys editor container not found');
}

const keysEditor = monaco.editor.create(keysEditorContainer, {
  value: '// Shadow keys will appear here...\n// Edit the source code on the left to see updates',
  language: 'json',
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: 'on',
  readOnly: true,
  renderWhitespace: 'none'
});

// Initialize Shadow Key Tracker with live preview callback
const sourceFile = 'Counter.tsx';
const tracker = new MonacoShadowKeyTracker(
  editor,
  sourceFile,
  undefined,
  (keyMapData) => {
    // Update keys editor in real-time
    const keysJSON = JSON.stringify(keyMapData, null, 2);
    keysEditor.setValue(keysJSON);
  }
);

console.log('[Monaco Shadow Keys] Editor initialized');
console.log('[Monaco Shadow Keys] Tracking JSX keys for:', sourceFile);

// Wire up UI buttons
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const statusEl = document.getElementById('status');

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    // Trigger save directly (no need for Monaco command)
    const model = editor.getModel();
    if (model) {
      const sourceCode = model.getValue();
      const keyMapData = tracker.getShadowKeyMapData();
      const keyMapJSON = JSON.stringify(keyMapData, null, 2);

      // Download both files
      downloadFile(sourceFile, sourceCode);
      downloadFile(`${sourceFile}.keys.json`, keyMapJSON);

      console.log('[Monaco Shadow Keys] Saved!');
    }
  });
}

// Helper function for downloading
function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

if (loadBtn) {
  loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.keys.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const keyMapData = JSON.parse(text);

      // Re-initialize tracker with loaded key map
      tracker.dispose();
      const newTracker = new MonacoShadowKeyTracker(editor, sourceFile, keyMapData);

      console.log('[Monaco Shadow Keys] Loaded key map from file:', keyMapData);

      if (statusEl) {
        statusEl.textContent = '● Loaded from file';
        setTimeout(() => {
          statusEl.textContent = '● Live Tracking';
        }, 2000);
      }
    };
    input.click();
  });
}

// Update status on change
editor.onDidChangeModelContent(() => {
  if (statusEl) {
    statusEl.textContent = '● Parsing...';
    statusEl.classList.remove('active');

    setTimeout(() => {
      statusEl.textContent = '● Live Tracking';
      statusEl.classList.add('active');
    }, 600);
  }
});

// Log key at cursor position on selection change
editor.onDidChangeCursorPosition(() => {
  const keyAtCursor = tracker.getKeyAtCursor();
  if (keyAtCursor) {
    console.log('[Monaco Shadow Keys] Key at cursor:', keyAtCursor);
  }
});

// Make editor globally accessible for debugging
(window as any).editor = editor;
(window as any).tracker = tracker;

console.log('[Monaco Shadow Keys] Ready! Use Ctrl+S to save.');
console.log('[Monaco Shadow Keys] Access via window.editor and window.tracker');
