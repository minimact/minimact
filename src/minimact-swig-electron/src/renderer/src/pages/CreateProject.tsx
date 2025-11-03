import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderOpen, BookOpen, Sparkles, Check } from 'lucide-react'
import { HookLibrarySlideout } from '../components/create-project/HookLibrarySlideout'
import { HOOK_LIBRARY, getDefaultHooks } from '../../../main/data/hook-library'

interface CreateProjectProps {
  onBack?: () => void
  embedded?: boolean
}

export default function CreateProject({ onBack, embedded = false }: CreateProjectProps = {}) {
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const [template, setTemplate] = useState('Counter')
  const [createSolution, setCreateSolution] = useState(true)
  const [enableTailwind, setEnableTailwind] = useState(false)
  const [selectedHooks, setSelectedHooks] = useState<string[]>(
    getDefaultHooks().map((h) => h.id) // Pre-select default hooks
  )
  const [hookLibraryOpen, setHookLibraryOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [infoCardVisible, setInfoCardVisible] = useState(true)
  const [infoCardMinimized, setInfoCardMinimized] = useState(false)

  const handleSelectDirectory = async () => {
    const result = await window.api.project.selectDirectory()
    if (result.success && result.data) {
      setTargetDir(result.data)
    }
  }

  const handleCreate = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()

    if (!projectName || !targetDir) {
      setError('Please provide project name and directory')
      return
    }

    setCreating(true)
    setError('')

    try {
      const projectPath = `${targetDir}\\${projectName}`
      const result = await window.api.project.create(projectPath, template, {
        createSolution,
        enableTailwind,
        selectedHooks
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

  const templates = [
    { id: 'Counter', name: 'Counter', desc: 'Basic state management', icon: '🔢' },
    { id: 'TodoList', name: 'Todo List', desc: 'CRUD operations', icon: '✅' },
    { id: 'Dashboard', name: 'Dashboard', desc: 'Charts + Powered Badge', icon: '📊' },
    { id: 'MVC', name: 'MVC Bridge', desc: 'ASP.NET MVC + Minimact', icon: '🌉' },
    {
      id: 'MVC-Dashboard',
      name: 'MVC Dashboard',
      desc: 'MVC Bridge + Charts',
      icon: '📈'
    },
    {
      id: 'Electron-FileManager',
      name: 'Electron File Manager',
      desc: 'Desktop app',
      icon: '💻'
    }
  ]

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/')
    }
  }

  return (
    <div className={embedded ? 'p-4' : 'h-screen flex items-center justify-center p-8 relative'}>
      {/* Back Button */}
      {!embedded && (
        <button
          onClick={handleBack}
          className="absolute top-8 left-8 w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 flex items-center justify-center transition-all hover:scale-110 shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
      )}

      {embedded && (
        <>
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-900 to-transparent pb-4 mb-4 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>

            {/* FAB - Create Project Button */}
            <button
              onClick={handleCreate}
              disabled={!projectName || !targetDir || creating}
              className="px-6 py-3 bg-gradient-to-br from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </>
      )}

      {!embedded && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
      )}

      {/* Main Content */}
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className={embedded ? 'text-center mb-6' : 'text-center mb-8'}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold gradient-text mb-3">Create New Project</h1>
          <p className="text-slate-400 text-lg">
            Set up a new Minimact project in seconds
          </p>
        </div>

        {/* Main Form Card */}
        <div className={embedded ? 'mb-6' : 'floating-card rounded-3xl p-8 relative mb-6'}>
          {/* Traffic Lights */}
          {!embedded && (
            <div className="traffic-lights absolute top-6 left-6">
              <div className="traffic-light bg-red-500"></div>
              <div className="traffic-light bg-yellow-500"></div>
              <div className="traffic-light bg-green-500"></div>
            </div>
          )}

          <form onSubmit={handleCreate} className={embedded ? 'space-y-6' : 'space-y-6 mt-4'}>
            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-minimact-app"
                className="w-full px-4 py-3 bg-slate-800 bg-opacity-50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-200 placeholder-slate-500 transition-all"
                required
              />
            </div>

            {/* Target Directory */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Target Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetDir}
                  readOnly
                  placeholder="Select a directory..."
                  className="flex-1 px-4 py-3 bg-slate-800 bg-opacity-50 border border-slate-700 rounded-xl text-slate-400 placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={handleSelectDirectory}
                  className="px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-xl transition-all flex items-center gap-2 text-white font-medium shadow-lg shadow-blue-500/30 hover:scale-105"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      template === t.id
                        ? 'border-cyan-500 bg-cyan-500 bg-opacity-10 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 bg-slate-800 bg-opacity-30 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{t.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">
                            {t.name}
                          </span>
                          {template === t.id && (
                            <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Options</label>

              {/* Visual Studio Solution */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-800 bg-opacity-30 hover:bg-opacity-50 transition-all border border-transparent hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={createSolution}
                  onChange={(e) => setCreateSolution(e.target.checked)}
                  className="mt-0.5 w-5 h-5 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-cyan-500 text-cyan-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-300">
                    Create Visual Studio solution file (.sln)
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended for opening project in Visual Studio
                  </p>
                </div>
              </label>

              {/* Tailwind CSS Integration */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-800 bg-opacity-30 hover:bg-opacity-50 transition-all border border-transparent hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={enableTailwind}
                  onChange={(e) => setEnableTailwind(e.target.checked)}
                  className="mt-0.5 w-5 h-5 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-cyan-500 text-cyan-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-300">
                    Enable Tailwind CSS integration
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-generates utility-first CSS from your TSX components
                  </p>
                </div>
              </label>
            </div>

            {/* Hook Library Button */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Hook Examples
              </label>
              <button
                type="button"
                onClick={() => setHookLibraryOpen(true)}
                className="w-full px-4 py-4 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 border border-purple-400 border-opacity-20 rounded-xl transition-all flex items-center justify-between shadow-lg shadow-purple-500/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-semibold text-white">
                      {selectedHooks.length > 0
                        ? `${selectedHooks.length} hook${selectedHooks.length !== 1 ? 's' : ''} selected`
                        : 'Select hooks to include examples'}
                    </span>
                    <span className="block text-xs text-purple-100 mt-0.5">
                      Click to browse hook library
                    </span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {selectedHooks.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Example code will be generated in{' '}
                  <code className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-400">
                    Pages/Examples/
                  </code>
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button - Hidden when embedded (FAB is used instead) */}
            {!embedded && (
              <button
                type="submit"
                disabled={!projectName || !targetDir || creating}
                className="w-full px-6 py-4 bg-gradient-to-br from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] text-lg"
              >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Project...
                </span>
              ) : (
                'Create Project'
              )}
              </button>
            )}
          </form>
        </div>

        {/* Info Card */}
        {infoCardVisible && !infoCardMinimized && (
          <div className="floating-card rounded-2xl p-6 relative">
            {/* Traffic Lights */}
            <div className="traffic-lights absolute top-3 right-3 scale-75">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => setInfoCardVisible(false)}
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => setInfoCardMinimized(true)}
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
            </div>

            <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-200 mb-2">What happens next?</h3>
              <ul className="text-sm text-slate-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>ASP.NET Core project created with <code className="text-cyan-400">dotnet new webapi</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>Minimact.AspNetCore package added</span>
                </li>
                {template === 'MVC' && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>@minimact/mvc package added for MVC Bridge support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Controllers and ViewModels folders created</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Sample ProductController with [Mutable] ViewModel created</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>MinimactPageRenderer configured</span>
                    </li>
                  </>
                )}
                {template !== 'MVC' && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Pages and Components folders created</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Template files generated (.tsx)</span>
                    </li>
                  </>
                )}
                {enableTailwind && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Tailwind CSS configured (tailwind.config.js, package.json)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>CSS directives added (src/styles/tailwind.css)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Auto-generation enabled on transpile</span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-green-400 font-medium">Project opens in Dashboard</span>
                </li>
              </ul>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Hook Library Slideout */}
      <HookLibrarySlideout
        selectedHooks={selectedHooks}
        onSelectionChange={setSelectedHooks}
        hooks={HOOK_LIBRARY}
        isOpen={hookLibraryOpen}
        onClose={() => setHookLibraryOpen(false)}
      />

      {/* Fancy Loading Overlay */}
      {creating && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[200]">
          <div className="text-center">
            {/* Animated Minimact Logo */}
            <div className="relative mb-8">
              <svg
                className="w-24 h-24 text-cyan-400 animate-pulse mx-auto"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {/* Spinning Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-transparent border-t-cyan-400 border-r-cyan-400 rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Status Text */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold gradient-text">Creating Your Project</h3>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-sm text-slate-500">Setting up {projectName}...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
