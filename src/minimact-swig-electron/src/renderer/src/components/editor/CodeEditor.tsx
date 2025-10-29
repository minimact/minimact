import { useEffect, useState } from 'react'
import Editor, { type Monaco, loader } from '@monaco-editor/react'
import monaco from '../../lib/monaco'

loader.config({ monaco })

interface CodeEditorProps {
  filePath: string
  onSave?: (content: string) => void
}

export default function CodeEditor({ filePath, onSave }: CodeEditorProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadFile()
  }, [filePath])

  const loadFile = async () => {
    try {
      setLoading(true)
      setError(null)
      setHasUnsavedChanges(false)

      const result = await window.api.file.readFile(filePath)

      if (result.success && result.data) {
        setContent(result.data)
      } else {
        setError(result.error || 'Failed to load file')
      }
    } catch (err) {
      setError('Failed to load file')
      console.error('Failed to load file:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value)
      setHasUnsavedChanges(true)
    }
  }

  const handleSave = async () => {
    try {
      const result = await window.api.file.writeFile(filePath, content)

      if (result.success) {
        setHasUnsavedChanges(false)
        if (onSave) {
          onSave(content)
        }
        console.log('File saved successfully')
      } else {
        console.error('Failed to save file:', result.error)
      }
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    // Add Ctrl+S / Cmd+S save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })

    // Focus editor
    editor.focus()
  }

  // Get language from file extension
  const getLanguage = () => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'cs':
        return 'csharp'
      case 'json':
        return 'json'
      case 'css':
        return 'css'
      case 'scss':
        return 'scss'
      case 'html':
        return 'html'
      case 'md':
        return 'markdown'
      default:
        return 'plaintext'
    }
  }

  // Get filename from path
  const getFileName = () => {
    return filePath.split(/[\\/]/).pop() || filePath
  }

  if (loading) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading {getFileName()}...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">{error}</div>
          <button
            onClick={loadFile}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Tab bar with filename and save indicator */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{getFileName()}</span>
          {hasUnsavedChanges && <span className="text-xs text-orange-400">● Unsaved</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded transition-colors"
        >
          Save (Ctrl+S)
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage()}
          value={content}
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
            fontLigatures: true,
            lineNumbers: 'on',
            rulers: [80, 120],
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            bracketPairColorization: {
              enabled: true
            },
            guides: {
              indentation: true,
              bracketPairs: true
            }
          }}
        />
      </div>
    </div>
  )
}
