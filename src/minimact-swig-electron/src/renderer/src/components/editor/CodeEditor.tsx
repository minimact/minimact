import { useEffect, useState, useRef } from 'react'
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
  const editorRef = useRef<any>(null)

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
          // Save cursor position and scroll position before reload
          const editor = editorRef.current
          const position = editor?.getPosition()
          const scrollTop = editor?.getScrollTop()
          const scrollLeft = editor?.getScrollLeft()

          await onSave(content)

          // Reload file after save callback completes
          // This is needed because transpiler may have modified the file (e.g., adding hex path keys)
          const fileResult = await window.api.file.readFile(filePath)
          if (fileResult.success && fileResult.data) {
            setContent(fileResult.data)

            // Restore cursor position and scroll after content updates
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
              if (editor && position) {
                editor.setPosition(position)
                editor.revealPositionInCenter(position)
              }
              if (editor && scrollTop !== undefined) {
                editor.setScrollTop(scrollTop)
              }
              if (editor && scrollLeft !== undefined) {
                editor.setScrollLeft(scrollLeft)
              }
            }, 0)
          }
        }
        console.log('File saved successfully')
      } else {
        console.error('Failed to save file:', result.error)
      }
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  }

  const loadMinimactTypes = async (monaco: Monaco) => {
    // Get project root from file path
    const projectRoot = filePath.split(/[\\\/]Components[\\\/]/)[0]
    if (!projectRoot) return

    // List of @minimact packages to load
    const packages = ['core', 'punch', 'mvc', 'md', 'query', 'trees', 'quantum', 'charts', 'powered']

    for (const pkg of packages) {
      try {
        // Try to read type definition from project's node_modules
        const typeDefPath = `${projectRoot}/node_modules/@minimact/${pkg}/dist/index.d.ts`
        const result = await window.api.file.readFile(typeDefPath)

        if (result.success && result.data) {
          // Add type definitions to Monaco
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            result.data,
            `file:///node_modules/@minimact/${pkg}/index.d.ts`
          )
          console.log(`[CodeEditor] Loaded type definitions for @minimact/${pkg}`)
        }
      } catch (err) {
        // Package not installed or no type definitions - silently skip
        // This is expected for packages not used in the project
      }
    }
  }

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    // Store editor reference for cursor position restoration
    editorRef.current = editor

    // Configure TypeScript compiler options for JSX
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowNonTsExtensions: true,
      allowJs: true,
      target: monaco.languages.typescript.ScriptTarget.Latest,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      typeRoots: ['node_modules/@types']
    })

    // Add React type definitions for JSX support
    const reactTypes = `
      declare namespace React {
        type ReactNode = any;
        type ReactElement = any;
        type CSSProperties = any;

        interface HTMLAttributes<T> {
          children?: ReactNode;
          className?: string;
          style?: CSSProperties;
          onClick?: (event: any) => void;
          onChange?: (event: any) => void;
          onSubmit?: (event: any) => void;
          onInput?: (event: any) => void;
          onFocus?: (event: any) => void;
          onBlur?: (event: any) => void;
          onKeyDown?: (event: any) => void;
          onKeyUp?: (event: any) => void;
          onKeyPress?: (event: any) => void;
          id?: string;
          role?: string;
          tabIndex?: number;
          title?: string;
          [key: string]: any;
        }

        interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
          type?: string;
          value?: string | number;
          placeholder?: string;
          disabled?: boolean;
          readOnly?: boolean;
          required?: boolean;
          checked?: boolean;
          name?: string;
          maxLength?: number;
          minLength?: number;
          max?: number | string;
          min?: number | string;
          step?: number | string;
          pattern?: string;
          autoComplete?: string;
          autoFocus?: boolean;
        }

        interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
          type?: 'button' | 'submit' | 'reset';
          disabled?: boolean;
        }

        interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
          action?: string;
          method?: string;
          encType?: string;
          target?: string;
        }

        interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
          htmlFor?: string;
        }

        interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
          multiple?: boolean;
          value?: string | string[];
          disabled?: boolean;
        }

        interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
          value?: string;
          placeholder?: string;
          rows?: number;
          cols?: number;
          disabled?: boolean;
        }

        interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
          href?: string;
          target?: string;
          rel?: string;
        }

        interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
          src?: string;
          alt?: string;
          width?: number | string;
          height?: number | string;
          loading?: 'lazy' | 'eager';
        }
      }

      declare global {
        namespace JSX {
          interface IntrinsicElements {
            div: React.HTMLAttributes<HTMLDivElement>;
            span: React.HTMLAttributes<HTMLSpanElement>;
            p: React.HTMLAttributes<HTMLParagraphElement>;
            h1: React.HTMLAttributes<HTMLHeadingElement>;
            h2: React.HTMLAttributes<HTMLHeadingElement>;
            h3: React.HTMLAttributes<HTMLHeadingElement>;
            h4: React.HTMLAttributes<HTMLHeadingElement>;
            h5: React.HTMLAttributes<HTMLHeadingElement>;
            h6: React.HTMLAttributes<HTMLHeadingElement>;
            button: React.ButtonHTMLAttributes<HTMLButtonElement>;
            input: React.InputHTMLAttributes<HTMLInputElement>;
            textarea: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
            select: React.SelectHTMLAttributes<HTMLSelectElement>;
            option: React.HTMLAttributes<HTMLOptionElement>;
            form: React.FormHTMLAttributes<HTMLFormElement>;
            label: React.LabelHTMLAttributes<HTMLLabelElement>;
            a: React.AnchorHTMLAttributes<HTMLAnchorElement>;
            img: React.ImgHTMLAttributes<HTMLImageElement>;
            ul: React.HTMLAttributes<HTMLUListElement>;
            ol: React.HTMLAttributes<HTMLOListElement>;
            li: React.HTMLAttributes<HTMLLIElement>;
            table: React.HTMLAttributes<HTMLTableElement>;
            thead: React.HTMLAttributes<HTMLTableSectionElement>;
            tbody: React.HTMLAttributes<HTMLTableSectionElement>;
            tr: React.HTMLAttributes<HTMLTableRowElement>;
            th: React.HTMLAttributes<HTMLTableCellElement>;
            td: React.HTMLAttributes<HTMLTableCellElement>;
            header: React.HTMLAttributes<HTMLElement>;
            footer: React.HTMLAttributes<HTMLElement>;
            nav: React.HTMLAttributes<HTMLElement>;
            section: React.HTMLAttributes<HTMLElement>;
            article: React.HTMLAttributes<HTMLElement>;
            aside: React.HTMLAttributes<HTMLElement>;
            main: React.HTMLAttributes<HTMLElement>;
            br: React.HTMLAttributes<HTMLBRElement>;
            hr: React.HTMLAttributes<HTMLHRElement>;
            pre: React.HTMLAttributes<HTMLPreElement>;
            code: React.HTMLAttributes<HTMLElement>;
            strong: React.HTMLAttributes<HTMLElement>;
            em: React.HTMLAttributes<HTMLElement>;
            i: React.HTMLAttributes<HTMLElement>;
            b: React.HTMLAttributes<HTMLElement>;
            u: React.HTMLAttributes<HTMLElement>;
            small: React.HTMLAttributes<HTMLElement>;
            blockquote: React.HTMLAttributes<HTMLQuoteElement>;
            iframe: React.HTMLAttributes<HTMLIFrameElement>;
            video: React.HTMLAttributes<HTMLVideoElement>;
            audio: React.HTMLAttributes<HTMLAudioElement>;
            canvas: React.HTMLAttributes<HTMLCanvasElement>;
            svg: React.HTMLAttributes<SVGElement>;
          }
        }
      }
    `

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      reactTypes,
      'file:///node_modules/@types/react/index.d.ts'
    )

    // Load @minimact package type definitions
    loadMinimactTypes(monaco)

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
