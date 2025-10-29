import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Square, Hammer, Chrome } from 'lucide-react'
import FileTree, { type ProjectFile } from '../components/editor/FileTree'
import CodeEditor from '../components/editor/CodeEditor'
import Terminal from '../components/terminal/Terminal'

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
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)

  useEffect(() => {
    if (projectPath) {
      loadProject(projectPath)
      checkRunningStatus()
    }
  }, [projectPath])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div>Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div>Project not found</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-green-400">{project.name}</h1>
          <p className="text-xs text-gray-400">{project.path}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBuild}
            disabled={building}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded transition-colors flex items-center gap-2 text-sm"
          >
            <Hammer className="w-4 h-4" />
            {building ? 'Building...' : 'Build'}
          </button>

          {!isRunning ? (
            <button
              onClick={handleRun}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2 text-sm"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2 text-sm"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
              <button
                onClick={handleOpenBrowser}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors flex items-center gap-2 text-sm"
              >
                <Chrome className="w-4 h-4" />
                Open in Browser
              </button>
            </>
          )}

          <div
            className={`ml-2 px-3 py-2 rounded text-xs font-medium ${isRunning ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}
          >
            {isRunning ? `● Running on :${project.port}` : '○ Stopped'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Tree */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400">FILES</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              projectPath={project.path}
              onFileClick={handleFileClick}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 bg-gray-900 overflow-hidden">
            {selectedFile ? (
              <CodeEditor filePath={selectedFile.path} onSave={handleFileSave} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No file selected</p>
                  <p className="text-sm">Select a file from the tree to edit</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Area */}
          <div className="h-48 bg-black border-t border-gray-700">
            <Terminal />
          </div>
        </div>
      </div>
    </div>
  )
}
