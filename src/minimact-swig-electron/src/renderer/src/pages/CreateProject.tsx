import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderOpen } from 'lucide-react'

export default function CreateProject() {
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const [template, setTemplate] = useState('Counter')
  const [createSolution, setCreateSolution] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSelectDirectory = async () => {
    const result = await window.api.project.selectDirectory()
    if (result.success && result.data) {
      setTargetDir(result.data)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectName || !targetDir) {
      setError('Please provide project name and directory')
      return
    }

    setCreating(true)
    setError('')

    try {
      const projectPath = `${targetDir}\\${projectName}`
      const result = await window.api.project.create(projectPath, template, {
        createSolution
      })

      if (result.success) {
        navigate(`/dashboard?path=${encodeURIComponent(projectPath)}`)
      } else {
        setError(result.error || 'Failed to create project')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-green-400">Create New Project</h1>
          <p className="text-sm text-gray-400">Set up a new Minimact project</p>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-minimact-app"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Target Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetDir}
                readOnly
                placeholder="Select a directory..."
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
              />
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Browse
              </button>
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Counter">Counter (Basic)</option>
              <option value="TodoList">Todo List (CRUD)</option>
              <option value="Dashboard">Dashboard (Charts)</option>
              <option value="MVC">MVC Bridge (ASP.NET MVC + Minimact)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Choose a starting template for your project
            </p>
          </div>

          {/* Visual Studio Solution */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createSolution}
                onChange={(e) => setCreateSolution(e.target.checked)}
                className="w-4 h-4 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-green-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-300">
                  Create Visual Studio solution file (.sln)
                </span>
                <p className="text-xs text-gray-500">
                  Recommended for opening project in Visual Studio
                </p>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!projectName || !targetDir}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {creating ? 'Creating Project...' : 'Create Project'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• ASP.NET Core project created with <code>dotnet new webapi</code></li>
            <li>• Minimact.AspNetCore package added</li>
            {template === 'MVC' && (
              <>
                <li>• @minimact/mvc package added for MVC Bridge support</li>
                <li>• Controllers and ViewModels folders created</li>
                <li>• Sample ProductController with [Mutable] ViewModel created</li>
                <li>• MinimactPageRenderer configured</li>
              </>
            )}
            {template !== 'MVC' && (
              <>
                <li>• Pages and Components folders created</li>
                <li>• Template files generated (.tsx)</li>
              </>
            )}
            <li>• Project opens in Dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
