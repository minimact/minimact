import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, FolderOpen, Clock } from 'lucide-react'

interface RecentProject {
  name: string
  path: string
  lastOpened: Date
}

export default function Home() {
  const navigate = useNavigate()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentProjects()
  }, [])

  const loadRecentProjects = async () => {
    try {
      const result = await window.api.project.getRecent()
      if (result.success) {
        setRecentProjects(result.data)
      }
    } catch (error) {
      console.error('Failed to load recent projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    navigate('/create-project')
  }

  const handleOpenExisting = async () => {
    const result = await window.api.project.selectDirectory()
    if (result.success && result.data) {
      const projectResult = await window.api.project.load(result.data)
      if (projectResult.success) {
        navigate(`/dashboard?path=${encodeURIComponent(result.data)}`)
      }
    }
  }

  const handleOpenRecent = async (projectPath: string) => {
    const result = await window.api.project.load(projectPath)
    if (result.success) {
      navigate(`/dashboard?path=${encodeURIComponent(projectPath)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-green-400">Minimact Swig</h1>
        <p className="text-sm text-gray-400">The Desktop IDE for Minimact Development</p>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
          <button
            onClick={handleCreateNew}
            className="flex flex-col items-center justify-center p-8 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <FolderPlus className="w-12 h-12 mb-3" />
            <span className="text-lg font-semibold">Create New Project</span>
            <span className="text-sm text-green-100 mt-1">Start from template</span>
          </button>

          <button
            onClick={handleOpenExisting}
            className="flex flex-col items-center justify-center p-8 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <FolderOpen className="w-12 h-12 mb-3" />
            <span className="text-lg font-semibold">Open Existing Project</span>
            <span className="text-sm text-blue-100 mt-1">Browse for project</span>
          </button>
        </div>

        {/* Recent Projects */}
        {!loading && recentProjects.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-semibold">Recent Projects</h2>
            </div>

            <div className="space-y-2">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleOpenRecent(project.path)}
                  className="w-full text-left p-4 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors border border-gray-700"
                >
                  <div className="font-medium text-gray-100">{project.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{project.path}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Last opened: {new Date(project.lastOpened).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && recentProjects.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <p>No recent projects</p>
            <p className="text-sm mt-2">Create a new project to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
