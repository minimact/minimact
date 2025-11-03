import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Square, Hammer, Chrome, Activity, Zap, FilePlus, BarChart3, FileText, Terminal as TerminalIcon } from 'lucide-react'
import FileTree, { type ProjectFile } from '../components/editor/FileTree'
import CodeEditor from '../components/editor/CodeEditor'
import Terminal from '../components/terminal/Terminal'
import ComponentTree from '../components/inspector/ComponentTree'
import StateInspector from '../components/inspector/StateInspector'
import AddPageModal from '../components/pages/AddPageModal'
import Dock, { type DockWidget } from '../components/dock/Dock'

interface Project {
  name: string
  path: string
  port: number
}

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const projectPath = searchParams.get('path')

  const [project, setProject] = useState<Project | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [building, setBuilding] = useState(false)
  const [transpiling, setTranspiling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(undefined)
  const [showInspector, setShowInspector] = useState(false)
  const [signalRConnected, setSignalRConnected] = useState(false)
  const [showAddPageModal, setShowAddPageModal] = useState(false)
  const [fileTreeRefreshKey, setFileTreeRefreshKey] = useState(0)

  // Widget visibility state
  const [widgets, setWidgets] = useState({
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
    // Connect to SignalR when app is running
    const connectSignalR = async () => {
      if (isRunning && project) {
        try {
          await window.api.signalr.connect(`http://localhost:${project.port}/minimacthub`)
          setSignalRConnected(true)
        } catch (error) {
          console.error('Failed to connect to SignalR:', error)
          setSignalRConnected(false)
        }
      } else {
        await window.api.signalr.disconnect()
        setSignalRConnected(false)
      }
    }

    connectSignalR()
  }, [isRunning, project])

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
    <div className="h-screen p-6 relative">
      {/* Action Orb (Center Top) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <div className="relative">
          {/* Center Orb */}
          <button
            onClick={isRunning ? handleStop : handleRun}
            className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer group relative z-10 bg-gradient-to-br from-cyan-400 to-cyan-600 hover:scale-110 transition-all shadow-lg shadow-cyan-500/50"
          >
            {isRunning ? (
              <Square className="w-8 h-8 text-white" strokeWidth="2.5" fill="white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" strokeWidth="2.5" fill="white" />
            )}
          </button>

          {/* Transpile Button (Purple - Top) */}
          <button
            onClick={handleTranspile}
            disabled={transpiling}
            className="absolute w-12 h-12 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-all bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/40"
            style={{ top: '-60px', left: '16px' }}
            title="Transpile TSX → C#"
          >
            <Zap className="w-5 h-5 text-white" strokeWidth="2.5" />
          </button>

          {/* Build Button (Blue - Top Left) */}
          <button
            onClick={handleBuild}
            disabled={building}
            className="absolute w-12 h-12 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-all bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/40"
            style={{ top: '-48px', left: '-48px' }}
            title="Build Project"
          >
            <Hammer className="w-5 h-5 text-white" strokeWidth="2.5" />
          </button>

          {/* Inspector Button (Orange - Top Right) */}
          <button
            onClick={() => toggleWidget('inspector')}
            disabled={!signalRConnected}
            className={`absolute w-12 h-12 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-all ${widgets.inspector.visible ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-orange-500 to-orange-700'} shadow-lg shadow-orange-500/40`}
            style={{ top: '-48px', right: '-48px' }}
            title={signalRConnected ? 'Toggle Inspector' : 'Start app to enable'}
          >
            <Activity className="w-5 h-5 text-white" strokeWidth="2.5" />
          </button>

          {/* Browser Button (Appears when running) */}
          {isRunning && (
            <button
              onClick={handleOpenBrowser}
              className="absolute w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all bg-gradient-to-br from-green-500 to-green-700 shadow-lg shadow-green-500/40"
              style={{ top: '0', right: '-64px' }}
              title="Open in Browser"
            >
              <Chrome className="w-4 h-4 text-white" strokeWidth="2.5" />
            </button>
          )}
        </div>

        {/* Project Info */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
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
            {project.name}
          </div>
          <div className="text-xs text-slate-500 mt-1">{project.path}</div>
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
          className={`floating-widget active absolute left-80 top-32 ${widgets.inspector.visible ? 'right-[400px]' : 'right-80'} h-[calc(100vh-360px)] rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
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
          className={`floating-widget absolute left-80 ${widgets.inspector.visible ? 'right-[400px]' : 'right-80'} bottom-6 h-48 rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
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
