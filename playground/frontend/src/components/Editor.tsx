import { useRef, useEffect, useState } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { transformTsxToCSharp } from '../utils/babelTransform';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  isCompiling?: boolean;
  onCompile: () => void;
  compilationTime?: number | null;
}

const DEFAULT_TSX_CODE = `import { useState } from 'minimact';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`;

const DEFAULT_CSHARP_CODE = `public class Counter : MinimactComponent
{
    [UseState(0)]
    private int count;

    protected override VNode Render()
    {
        return new VElement("div", new Dictionary<string, string>
        {
            ["className"] = "counter"
        }, new VNode[]
        {
            new VElement("h1", $"Count: {count}"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onClick"] = "Increment"
            }, "Increment")
        });
    }

    private void Increment()
    {
        SetState(nameof(count), count + 1);
    }
}`;

export function Editor({
  value,
  onChange,
  isCompiling = false,
  onCompile,
  compilationTime = null,
}: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [tsxCode, setTsxCode] = useState(DEFAULT_TSX_CODE);
  const [generatedCSharp, setGeneratedCSharp] = useState(DEFAULT_CSHARP_CODE);
  const [activeTab, setActiveTab] = useState<'tsx' | 'csharp'>('tsx');
  const [isTransforming, setIsTransforming] = useState(false);

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleTsxChange = async (val: string) => {
    setTsxCode(val || '');

    // Auto-transform TSX to C# as user types
    setIsTransforming(true);
    const result = await transformTsxToCSharp(val || '');
    setIsTransforming(false);

    if (result.error) {
      console.warn('Transform error:', result.error);
    } else {
      setGeneratedCSharp(result.csharpCode);
      // Also update the parent value for submission
      onChange(result.csharpCode);
    }
  };

  const handleCompile = () => {
    // Ensure we're using the generated C# code
    onChange(generatedCSharp);
    onCompile();
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 rounded-t-lg">
        <div className="flex gap-4 items-center">
          <h2 className="text-lg font-semibold text-slate-100">Code Editor</h2>
          <div className="flex gap-1 bg-slate-800 rounded p-1">
            <button
              onClick={() => setActiveTab('tsx')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'tsx'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              TSX
            </button>
            <button
              onClick={() => setActiveTab('csharp')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                activeTab === 'csharp'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              C# (Generated)
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFormat}
            disabled={!isEditorReady}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-slate-100 transition-colors"
          >
            Format
          </button>
          <button
            onClick={handleCompile}
            disabled={isCompiling || isTransforming}
            className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-white font-medium transition-colors"
          >
            {isCompiling ? 'Compiling...' : isTransforming ? 'Transforming...' : 'Run Full Demo'}
          </button>
        </div>
      </div>

      {/* Editors */}
      <div className="flex-1 rounded-b-lg overflow-hidden border border-slate-700">
        {activeTab === 'tsx' ? (
          <MonacoEditor
            height="100%"
            language="typescript"
            value={tsxCode}
            onChange={(val) => handleTsxChange(val || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            path="component.tsx"
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineHeight: 20,
              wordWrap: 'on',
              autoClosingBrackets: 'always',
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
        ) : (
          <MonacoEditor
            height="100%"
            language="csharp"
            value={generatedCSharp}
            onChange={(val) => setGeneratedCSharp(val || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            path="component.cs"
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineHeight: 20,
              wordWrap: 'on',
              readOnly: false, // Allow editing if user wants to tweak
              autoClosingBrackets: 'always',
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
        )}
      </div>

      {/* Footer info */}
      {compilationTime !== null && (
        <div className="px-4 py-2 bg-slate-900 text-sm text-slate-300 rounded flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
          Compiled in {compilationTime}ms
        </div>
      )}
      {isTransforming && (
        <div className="px-4 py-2 bg-slate-900 text-sm text-slate-400 rounded flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          Transforming TSX to C#...
        </div>
      )}
    </div>
  );
}
