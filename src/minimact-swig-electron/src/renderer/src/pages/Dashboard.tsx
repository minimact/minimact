import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Play, Square, Hammer, Chrome, Activity, Zap, BarChart3, FileText, Terminal as TerminalIcon, Home as HomeIcon, BookOpen, Settings, User, ArrowLeft, Copy, Check } from 'lucide-react'
import FileTree, { type ProjectFile } from '../components/editor/FileTree'
import CodeEditor from '../components/editor/CodeEditor'
import Terminal from '../components/terminal/Terminal'
import ComponentTree from '../components/inspector/ComponentTree'
import StateInspector from '../components/inspector/StateInspector'
import AddPageModal from '../components/pages/AddPageModal'
import Dock, { type DockWidget } from '../components/dock/Dock'
import { HookLibrarySlideout } from '../components/create-project/HookLibrarySlideout'
import { HOOK_LIBRARY } from '../../../main/data/hook-library'

interface Project {
  name: string
  path: string
  port: number
}

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectPath = searchParams.get('path')

  const [project, setProject] = useState<Project | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [building, setBuilding] = useState(false)
  const [transpiling, setTranspiling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined)
  const [signalRConnected, setSignalRConnected] = useState(false)
  const [showAddPageModal, setShowAddPageModal] = useState(false)
  const [showHooksLibrary, setShowHooksLibrary] = useState(false)
  const [fileTreeRefreshKey, setFileTreeRefreshKey] = useState(0)
  const [terminalCopied, setTerminalCopied] = useState(false)
  const terminalOutputRef = useRef<string>('')

  // Widget visibility state
  const [widgets, setWidgets] = useState({
    sidebar: { visible: true, minimized: false },
    files: { visible: true, minimized: false },
    editor: { visible: true, minimized: false },
    terminal: { visible: true, minimized: false },
    inspector: { visible: false, minimized: false },
    metrics: { visible: true, minimized: false }
  })

  useEffect(() => {
    if (projectPath) {
      loadProject(projectPath)
      checkRunningStatus()
    }
  }, [projectPath])

  useEffect(() => {
    // Connect to SignalR when app is running (with retry for server startup)
    const connectSignalR = async () => {
      if (isRunning && project) {
        // Retry connection up to 10 times with increasing delays
        const maxRetries = 10
        const baseDelay = 500 // Start with 500ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            console.log(`[Dashboard] SignalR connection attempt ${attempt + 1}/${maxRetries}`)
            await window.api.signalr.connect(`http://localhost:${project.port}/minimact`)
            setSignalRConnected(true)
            console.log('[Dashboard] SignalR connected successfully')
            return
          } catch (error) {
            if (attempt < maxRetries - 1) {
              // Exponential backoff: 500ms, 1s, 2s, 4s, etc.
              const delay = baseDelay * Math.pow(2, attempt)
              console.log(`[Dashboard] Connection failed, retrying in ${delay}ms...`)
              await new Promise(resolve => setTimeout(resolve, delay))
            } else {
              console.error('[Dashboard] Failed to connect to SignalR after all retries:', error)
              setSignalRConnected(false)
            }
          }
        }
      } else {
        await window.api.signalr.disconnect()
        setSignalRConnected(false)
      }
    }

    connectSignalR()
  }, [isRunning, project])

  useEffect(() => {
    // Subscribe to process output for terminal
    const subscribeToOutput = async () => {
      await window.api.process.subscribeOutput()

      // Forward IPC events to DOM events for Terminal component
      const unsubscribe = window.api.process.onOutput((data: string) => {
        // Capture output for copy functionality
        terminalOutputRef.current += data

        const event = new CustomEvent('process:output', { detail: data })
        window.dispatchEvent(event)
      })

      return unsubscribe
    }

    const cleanup = subscribeToOutput()

    return () => {
      cleanup.then(unsub => unsub?.())
    }
  }, [])

  const loadProject = async (path: string) => {
    try {
      const result = await window.api.project.load(path)
      if (result.success) {
        setProject(result.data)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkRunningStatus = async () => {
    const result = await window.api.process.isRunning()
    if (result.success && result.data !== undefined) {
      setIsRunning(result.data)
    }
  }

  const handleTranspile = async () => {
    if (!project) return

    setTranspiling(true)
    try {
      const result = await window.api.transpiler.transpileProject(project.path)
      if (result.success) {
        console.log('Transpilation succeeded!')
        // Refresh file tree to show generated C# files
        setFileTreeRefreshKey((prev) => prev + 1)
      } else {
        console.error('Transpilation failed:', result.error)
      }
    } catch (error) {
      console.error('Transpilation error:', error)
    } finally {
      setTranspiling(false)
    }
  }

  const handleBuild = async () => {
    if (!project) return

    setBuilding(true)
    try {
      const result = await window.api.process.build(project.path)
      if (result.success && result.data.success) {
        console.log('Build succeeded!')
      } else {
        console.error('Build failed:', result.data.errors)
      }
    } catch (error) {
      console.error('Build error:', error)
    } finally {
      setBuilding(false)
    }
  }

  const handleRun = async () => {
    if (!project) return

    try {
      await window.api.process.start(project.path, project.port)
      setIsRunning(true)
    } catch (error) {
      console.error('Failed to start app:', error)
    }
  }

  const handleStop = async () => {
    try {
      await window.api.process.stop()
      setIsRunning(false)
    } catch (error) {
      console.error('Failed to stop app:', error)
    }
  }

  const handleOpenBrowser = () => {
    if (project) {
      window.api.file.openExternal(`http://localhost:${project.port}`)
    }
  }

  const handleFileClick = (file: ProjectFile) => {
    if (file.type === 'file') {
      setSelectedFile(file)
    }
  }

  const handleFileSave = async (_content: string) => {
    // Auto-transpile TSX files after save
    if (selectedFile && (selectedFile.extension === 'tsx' || selectedFile.extension === 'jsx')) {
      try {
        await window.api.transpiler.transpileFile(selectedFile.path)
        console.log('File transpiled successfully')
      } catch (err) {
        console.error('Transpilation failed:', err)
      }
    }
  }

  // Widget control functions
  const toggleWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        visible: !prev[widgetId].visible,
        minimized: false
      }
    }))
  }

  const minimizeWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        visible: false,
        minimized: true
      }
    }))
  }

  const closeWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: {
        visible: false,
        minimized: false
      }
    }))
  }

  const handleCopyTerminal = async () => {
    try {
      // Remove ANSI color codes for clean copy
      const cleanText = terminalOutputRef.current.replace(/\x1b\[[0-9;]*m/g, '')
      await navigator.clipboard.writeText(cleanText)
      setTerminalCopied(true)
      setTimeout(() => setTerminalCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy terminal output:', error)
    }
  }

  const handleDockWidgetClick = (widgetId: string) => {
    const widget = widgets[widgetId as keyof typeof widgets]
    if (widget.minimized) {
      // Restore from minimized
      toggleWidget(widgetId as keyof typeof widgets)
    } else if (widget.visible) {
      // Minimize if already visible
      minimizeWidget(widgetId as keyof typeof widgets)
    }
  }

  // Build dock widgets array
  const dockWidgets: DockWidget[] = [
    {
      id: 'sidebar',
      name: 'Navigation',
      icon: <HomeIcon className="w-5 h-5" />,
      visible: widgets.sidebar.visible,
      minimized: widgets.sidebar.minimized
    },
    {
      id: 'files',
      name: 'Files',
      icon: <FileText className="w-5 h-5" />,
      visible: widgets.files.visible,
      minimized: widgets.files.minimized
    },
    {
      id: 'editor',
      name: 'Editor',
      icon: <FileText className="w-5 h-5" />,
      visible: widgets.editor.visible,
      minimized: widgets.editor.minimized
    },
    {
      id: 'terminal',
      name: 'Terminal',
      icon: <TerminalIcon className="w-5 h-5" />,
      visible: widgets.terminal.visible,
      minimized: widgets.terminal.minimized
    },
    {
      id: 'inspector',
      name: 'Inspector',
      icon: <Activity className="w-5 h-5" />,
      visible: widgets.inspector.visible,
      minimized: widgets.inspector.minimized
    },
    {
      id: 'metrics',
      name: 'Performance',
      icon: <BarChart3 className="w-5 h-5" />,
      visible: widgets.metrics.visible,
      minimized: widgets.metrics.minimized
    }
  ]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-slate-400">Project not found</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-5rem)] w-[calc(100vw-14rem)] p-6 relative">
      {/* Sidebar Pill */}
      {widgets.sidebar.visible && !widgets.sidebar.minimized && (
        <div className="sidebar-pill fixed left-8 top-1/2 -translate-y-1/2 rounded-full p-3 flex flex-col items-center gap-6 z-50">
          {/* Traffic Lights */}
          <div className="traffic-lights mb-2">
            <div
              className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
              onClick={() => closeWidget('sidebar')}
            ></div>
            <div
              className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
              onClick={() => minimizeWidget('sidebar')}
            ></div>
            <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
          </div>

          {/* Transpile Button */}
          <button
            onClick={handleTranspile}
            disabled={transpiling}
            className="cursor-pointer p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Transpile TSX → C#"
          >
            <Zap className="w-6 h-6 text-white" strokeWidth="2.5" />
          </button>

          {/* Build Button */}
          <button
            onClick={handleBuild}
            disabled={building}
            className="cursor-pointer p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Build Project"
          >
            <Hammer className="w-6 h-6 text-white" strokeWidth="2.5" />
          </button>

          {/* Run/Stop Button */}
          <button
            onClick={isRunning ? handleStop : handleRun}
            className={`cursor-pointer p-3 rounded-full transition-all ${isRunning ? 'bg-gradient-to-br from-red-500 to-red-700 hover:scale-110' : 'bg-gradient-to-br from-cyan-400 to-cyan-600 hover:scale-110'}`}
            title={isRunning ? 'Stop App' : 'Run App'}
          >
            {isRunning ? (
              <Square className="w-6 h-6 text-white" strokeWidth="2.5" fill="white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" strokeWidth="2.5" fill="white" />
            )}
          </button>

          {/* Inspector Button */}
          <button
            onClick={() => toggleWidget('inspector')}
            disabled={!signalRConnected}
            className={`cursor-pointer p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 ${widgets.inspector.visible ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-orange-500 to-orange-700'}`}
            title={signalRConnected ? 'Toggle Inspector' : 'Start app to enable'}
          >
            <Activity className="w-6 h-6 text-white" strokeWidth="2.5" />
          </button>

          {/* Browser Button (when running) */}
          {isRunning && (
            <button
              onClick={handleOpenBrowser}
              className="cursor-pointer p-3 rounded-full bg-gradient-to-br from-green-500 to-green-700 hover:scale-110 transition-all"
              title="Open in Browser"
            >
              <Chrome className="w-5 h-5 text-white" strokeWidth="2.5" />
            </button>
          )}

          {/* Divider */}
          <div className="w-8 h-px bg-slate-700 my-2"></div>

          {/* Hooks Library Icon */}
          <div className="cursor-pointer" title="Hooks Library" onClick={() => setShowHooksLibrary(true)}>
            <BookOpen className="w-6 h-6 text-slate-500 hover:text-slate-300 transition-colors" />
          </div>

          {/* Settings Icon */}
          <div className="cursor-pointer" title="Settings">
            <Settings className="w-6 h-6 text-slate-500 hover:text-slate-300 transition-colors" />
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[100px]"></div>

          {/* Profile Avatar */}
          <div className="cursor-pointer p-[3px] rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Header Bar (Top Center) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
        <div className="floating-widget rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-700"></div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <HomeIcon className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">/</span>
            <span className="text-sm text-slate-400">Projects</span>
            <span className="text-xs text-slate-500">/</span>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-cyan-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span className="text-sm font-semibold text-white">{project.name}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-700"></div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs text-slate-400">
              {isRunning ? `Running on :${project.port}` : 'Stopped'}
            </span>
          </div>

          {/* SignalR Connection Status */}
          {isRunning && (
            <>
              <div className="w-px h-6 bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${signalRConnected ? 'bg-cyan-400' : 'bg-orange-400'}`}></div>
                <span className="text-xs text-slate-400">
                  {signalRConnected ? 'Live' : 'Connecting...'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Browser Widget (Left) */}
      {widgets.files.visible && (
        <div className="floating-widget absolute left-6 top-32 w-72 h-[calc(100vh-220px)] rounded-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="drag-handle"></div>
                <div className="drag-handle"></div>
              </div>
              <span className="text-sm font-semibold text-slate-300">Files</span>
            </div>
            <div className="traffic-lights">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => closeWidget('files')}
                title="Close"
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => minimizeWidget('files')}
                title="Minimize"
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100" title="Maximize"></div>
            </div>
          </div>

          {/* File Tree Content */}
          <div className="flex-1 overflow-y-auto p-2">
            <FileTree
              projectPath={project.path}
              onFileClick={handleFileClick}
              selectedFile={selectedFile}
              refreshKey={fileTreeRefreshKey}
            />
          </div>
        </div>
      )}

      {/* Editor Widget (Center) */}
      {widgets.editor.visible && (
        <div
          className={`floating-widget active absolute left-80 top-32 ${widgets.inspector.visible ? 'w-[calc(100vw-800px)]' : 'w-[calc(100vw-680px)]'} h-[calc(100vh-450px)] rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
        >
        {/* Header with Tabs */}
        <div className="border-b border-slate-700 flex items-center">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <div className="drag-handle"></div>
              <div className="drag-handle"></div>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            {selectedFile && (
              <div className="px-4 py-2 flex items-center gap-2 text-xs bg-slate-700 bg-opacity-50 border-r border-slate-700">
                <span className="text-slate-300">{selectedFile.name}</span>
              </div>
            )}
          </div>
          <div className="traffic-lights px-3">
            <div
              className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
              onClick={() => closeWidget('editor')}
              title="Close"
            ></div>
            <div
              className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
              onClick={() => minimizeWidget('editor')}
              title="Minimize"
            ></div>
            <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100" title="Maximize"></div>
          </div>
        </div>

          {/* Code Editor Content */}
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-950 to-slate-900">
            {selectedFile ? (
              <CodeEditor filePath={selectedFile.path} onSave={handleFileSave} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No file selected</p>
                  <p className="text-sm">Select a file from the tree to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Widget (Bottom Center) */}
      {widgets.terminal.visible && (
        <div
          className={`floating-widget absolute left-80 ${widgets.inspector.visible ? 'w-[calc(100vw-1040px)]' : 'w-[calc(100vw-920px)]'} bottom-6 h-48 rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
        >
        {/* Header */}
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="drag-handle"></div>
              <div className="drag-handle"></div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-slate-600'}`}
              ></span>
              <span className="text-xs font-semibold text-green-400 code-font">Terminal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopyTerminal}
              className="p-1.5 rounded hover:bg-slate-700 transition-colors group"
              title="Copy terminal output"
            >
              {terminalCopied ? (
                <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2.5} />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" strokeWidth={2} />
              )}
            </button>
            <div className="traffic-lights">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => closeWidget('terminal')}
                title="Close"
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => minimizeWidget('terminal')}
                title="Minimize"
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100" title="Maximize"></div>
            </div>
          </div>
        </div>

          {/* Terminal Content */}
          <div className="flex-1 overflow-hidden">
            <Terminal />
          </div>
        </div>
      )}

      {/* Inspector Widget (Right Top) - Conditional */}
      {widgets.inspector.visible && signalRConnected && (
        <div className="floating-widget absolute right-6 top-32 w-80 h-96 rounded-2xl flex flex-col overflow-hidden floating-animation">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="drag-handle"></div>
                <div className="drag-handle"></div>
              </div>
              <span className="text-sm font-semibold text-slate-300">Inspector</span>
            </div>
            <div className="traffic-lights">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => closeWidget('inspector')}
                title="Close"
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => minimizeWidget('inspector')}
                title="Minimize"
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100" title="Maximize"></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <div className="flex-1 text-center py-2 text-xs bg-cyan-500 bg-opacity-10 border-b-2 border-cyan-500 text-cyan-400">
              Components
            </div>
            <div className="flex-1 text-center py-2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer">
              State
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            <div className="w-32 border-r border-slate-700 overflow-y-auto">
              <ComponentTree
                onComponentSelect={setSelectedComponentId}
                selectedComponentId={selectedComponentId}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <StateInspector componentId={selectedComponentId} />
            </div>
          </div>
        </div>
      )}

      {/* Metrics Widget (Right Bottom) */}
      {widgets.metrics.visible && (
        <div className="floating-widget absolute right-6 bottom-6 w-80 h-48 rounded-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Performance</span>
            </div>
            <div className="traffic-lights">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => closeWidget('metrics')}
                title="Close"
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => minimizeWidget('metrics')}
                title="Minimize"
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100" title="Maximize"></div>
            </div>
          </div>

        {/* Metrics Content */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 text-xs">
          <div className="text-center">
            <div className="text-2xl font-bold gradient-text">0ms</div>
            <div className="text-slate-500 mt-1">Build Time</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${isRunning ? 'text-green-400' : 'text-slate-600'}`}
            >
              {isRunning ? '●' : '○'}
            </div>
            <div className="text-slate-500 mt-1">Server Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">-</div>
            <div className="text-slate-500 mt-1">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">-</div>
            <div className="text-slate-500 mt-1">Components</div>
          </div>
        </div>
        </div>
      )}

      {/* Hooks Library Slideout */}
      <HookLibrarySlideout
        selectedHooks={[]}
        onSelectionChange={() => {}} // Read-only in Dashboard
        hooks={HOOK_LIBRARY}
        isOpen={showHooksLibrary}
        onClose={() => setShowHooksLibrary(false)}
      />

      {/* Transpiling Overlay */}
      {transpiling && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[200]">
          <div className="text-center">
            {/* Animated Lightning Bolt */}
            <div className="relative mb-8">
              <Zap className="w-24 h-24 text-purple-400 animate-pulse mx-auto" strokeWidth="2" />
              {/* Spinning Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-transparent border-t-purple-400 border-r-purple-400 rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Status Text */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Transpiling to C#
              </h3>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-sm text-slate-500">Converting TSX → C#...</p>
            </div>
          </div>
        </div>
      )}

      {/* Building Overlay */}
      {building && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[200]">
          <div className="text-center">
            {/* Animated Hammer */}
            <div className="relative mb-8">
              <Hammer className="w-24 h-24 text-blue-400 animate-pulse mx-auto" strokeWidth="2" />
              {/* Spinning Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-transparent border-t-blue-400 border-r-blue-400 rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Status Text */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Building Project
              </h3>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-sm text-slate-500">Compiling C# code...</p>
            </div>
          </div>
        </div>
      )}

      {/* Dock */}
      <Dock widgets={dockWidgets} onWidgetClick={handleDockWidgetClick} />

      {/* Add Page Modal */}
      <AddPageModal
        isOpen={showAddPageModal}
        onClose={() => setShowAddPageModal(false)}
        projectPath={project?.path || ''}
        onPageCreated={() => {
          // Refresh file tree to show the new file
          setFileTreeRefreshKey((prev) => prev + 1)
          console.log('Page created successfully!')
        }}
      />
    </div>
  )
}
