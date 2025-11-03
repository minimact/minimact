import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderPlus,
  FolderOpen,
  Clock,
  BarChart,
  Layers,
  Home as HomeIcon,
  Folder,
  Settings,
  User,
  BookOpen
} from 'lucide-react'
import Dock, { type DockWidget } from '../components/dock/Dock'
import CreateProject from './CreateProject'
import { HookLibrarySlideout } from '../components/create-project/HookLibrarySlideout'
import { HOOK_LIBRARY } from '../../../main/data/hook-library'

interface RecentProject {
  name: string
  path: string
  lastOpened: Date
}

type HomeView = 'home' | 'create-project'

export default function Home() {
  const navigate = useNavigate()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<HomeView>('home')
  const [hookLibraryOpen, setHookLibraryOpen] = useState(false)

  // Widget visibility state
  const [widgets, setWidgets] = useState({
    mainCard: { visible: true, minimized: false },
    sidebar: { visible: true, minimized: false },
    recentProjects: { visible: true, minimized: false },
    quickStats: { visible: true, minimized: false },
    templates: { visible: true, minimized: false }
  })

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
    setCurrentView('create-project')
  }

  const handleBackToHome = () => {
    setCurrentView('home')
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

  // Widget control functions
  const toggleWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], visible: !prev[widgetId].visible }
    }))
  }

  const minimizeWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: { visible: false, minimized: true }
    }))
  }

  const closeWidget = (widgetId: keyof typeof widgets) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: { visible: false, minimized: false }
    }))
  }

  const handleDockWidgetClick = (widgetId: string) => {
    const typedId = widgetId as keyof typeof widgets
    if (widgets[typedId].minimized) {
      // Restore widget
      setWidgets((prev) => ({
        ...prev,
        [typedId]: { visible: true, minimized: false }
      }))
    } else {
      // Minimize widget
      minimizeWidget(typedId)
    }
  }

  // Prepare dock widgets
  const dockWidgets: DockWidget[] = [
    {
      id: 'mainCard',
      name: 'Start Building',
      icon: <FolderPlus className="w-5 h-5" />,
      visible: widgets.mainCard.visible,
      minimized: widgets.mainCard.minimized
    },
    {
      id: 'sidebar',
      name: 'Navigation',
      icon: <HomeIcon className="w-5 h-5" />,
      visible: widgets.sidebar.visible,
      minimized: widgets.sidebar.minimized
    },
    {
      id: 'recentProjects',
      name: 'Recent Projects',
      icon: <Clock className="w-5 h-5" />,
      visible: widgets.recentProjects.visible,
      minimized: widgets.recentProjects.minimized
    },
    {
      id: 'quickStats',
      name: 'Quick Stats',
      icon: <BarChart className="w-5 h-5" />,
      visible: widgets.quickStats.visible,
      minimized: widgets.quickStats.minimized
    },
    {
      id: 'templates',
      name: 'Templates',
      icon: <Layers className="w-5 h-5" />,
      visible: widgets.templates.visible,
      minimized: widgets.templates.minimized
    }
  ]

  return (
    <div className="h-screen w-screen flex items-center justify-center p-8 relative">
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

          {/* Home Icon (Active) */}
          <div className="cursor-pointer relative">
            <div className="absolute w-12 h-12 bg-cyan-400 bg-opacity-20 rounded-full -inset-2 animate-pulse"></div>
            <HomeIcon className="w-6 h-6 text-cyan-400 relative z-10" />
          </div>

          {/* Projects Icon */}
          <div className="cursor-pointer">
            <Folder className="w-6 h-6 text-slate-500 hover:text-slate-300 transition-colors" />
          </div>

          {/* Templates Icon */}
          <div className="cursor-pointer">
            <Layers className="w-6 h-6 text-slate-500 hover:text-slate-300 transition-colors" />
          </div>

          {/* Hook Library Icon */}
          <div className="cursor-pointer" onClick={() => setHookLibraryOpen(true)} title="Hook Library Reference">
            <BookOpen className="w-6 h-6 text-slate-500 hover:text-purple-400 transition-colors" />
          </div>

          {/* Settings Icon */}
          <div className="cursor-pointer">
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

      {/* Main Content Container */}
      <div className="max-w-7xl w-full h-full flex flex-col justify-center gap-8">
        {/* Main Hero Card */}
        {widgets.mainCard.visible && !widgets.mainCard.minimized && (
          <div className="floating-card rounded-3xl p-10 relative">
            {/* Traffic Lights */}
            <div className="traffic-lights absolute top-6 left-6">
              <div
                className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                onClick={() => closeWidget('mainCard')}
              ></div>
              <div
                className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                onClick={() => minimizeWidget('mainCard')}
              ></div>
              <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
            </div>

          {/* Conditional View Rendering */}
          {currentView === 'home' && (
            <>
          {/* Header */}
          <div className="text-center pb-16 pt-4">
            <h1 className="text-7xl font-bold gradient-text header-title">
              Minimact Swig
            </h1>
            <p className="text-xl text-slate-400 font-light header-subtitle">
              Server-Side React for ASP.NET Core
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Minimal JavaScript
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Rust-Powered
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                Instant Updates
              </span>
            </div>
          </div>

          {/* Action Cards and Recent Projects - Side by Side */}
          <div className="flex gap-6 mb-6">
            {/* Left: Action Cards */}
            <div className="flex-1 flex gap-6">
              {/* Create New Project */}
              <button
                onClick={handleCreateNew}
                className="action-card rounded-2xl p-8 cursor-pointer group"
              >
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <div className="bg-white/30 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                    <FolderPlus className="w-10 h-10 text-white" strokeWidth="2.5" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-1">Create New Project</h3>
                    <p className="text-white text-opacity-80 text-sm">
                      Start from scratch or choose a template
                    </p>
                  </div>
                </div>
              </button>

              {/* Open Project */}
              <button
                onClick={handleOpenExisting}
                className="action-card action-card-blue rounded-2xl p-8 cursor-pointer group"
              >
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <div className="bg-white/30 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-10 h-10 text-white" strokeWidth="2.5" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-1">Open Project</h3>
                    <p className="text-white text-opacity-80 text-sm">
                      Browse for existing Minimact app
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Right: Recent Projects */}
            <div className="flex-1 flex flex-col">
              {/* Recent Projects or Empty State */}
              {!loading && recentProjects.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  <div className="text-center">
                    <p>No recent projects</p>
                    <p className="text-xs text-slate-600 mt-1">Create a new project to get started</p>
                  </div>
                </div>
              )}

              {!loading && recentProjects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-500">Recent Projects</span>
                  </div>
                  {recentProjects.slice(0, 3).map((project) => (
                    <button
                      key={project.path}
                      onClick={() => handleOpenRecent(project.path)}
                      className="w-full text-left p-3 rounded-xl bg-slate-800 bg-opacity-50 hover:bg-opacity-70 transition-all border border-slate-700 hover:border-cyan-500"
                    >
                      <div className="font-medium text-slate-200 text-sm">{project.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{project.path}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* Create Project View */}
          {currentView === 'create-project' && (
            <div className="overflow-y-auto max-h-[60vh] px-2">
              <CreateProject onBack={handleBackToHome} embedded={true} />
            </div>
          )}
          </div>
        )}

        {/* Floating Stat Cards */}
        <div className="flex gap-6">
          {/* Recent Projects Card */}
          {widgets.recentProjects.visible && !widgets.recentProjects.minimized && (
            <div className="floating-card flex-1 rounded-2xl p-6 transform rotate-[-1deg] hover:rotate-0 transition-transform relative">
              {/* Traffic Lights */}
              <div className="traffic-lights absolute top-3 right-3 scale-75">
                <div
                  className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                  onClick={() => closeWidget('recentProjects')}
                ></div>
                <div
                  className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                  onClick={() => minimizeWidget('recentProjects')}
                ></div>
                <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Recent Projects</h3>
                  <p className="text-xs text-slate-500">Last 7 days</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {recentProjects.length === 0
                      ? 'No projects yet'
                      : `${recentProjects.length} project${recentProjects.length > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-slate-600">-</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats Card */}
          {widgets.quickStats.visible && !widgets.quickStats.minimized && (
            <div className="floating-card flex-1 rounded-2xl p-6 transform rotate-[1deg] hover:rotate-0 transition-transform relative">
              {/* Traffic Lights */}
              <div className="traffic-lights absolute top-3 right-3 scale-75">
                <div
                  className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                  onClick={() => closeWidget('quickStats')}
                ></div>
                <div
                  className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                  onClick={() => minimizeWidget('quickStats')}
                ></div>
                <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Quick Stats</h3>
                  <p className="text-xs text-slate-500">Overview</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{recentProjects.length}</div>
                  <div className="text-xs text-slate-500 mt-1">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">0</div>
                  <div className="text-xs text-slate-500 mt-1">Components</div>
                </div>
              </div>
            </div>
          )}

          {/* Templates Card */}
          {widgets.templates.visible && !widgets.templates.minimized && (
            <div className="floating-card flex-1 rounded-2xl p-6 transform rotate-[-1deg] hover:rotate-0 transition-transform relative">
              {/* Traffic Lights */}
              <div className="traffic-lights absolute top-3 right-3 scale-75">
                <div
                  className="traffic-light bg-red-500 cursor-pointer hover:opacity-100"
                  onClick={() => closeWidget('templates')}
                ></div>
                <div
                  className="traffic-light bg-yellow-500 cursor-pointer hover:opacity-100"
                  onClick={() => minimizeWidget('templates')}
                ></div>
                <div className="traffic-light bg-green-500 cursor-pointer hover:opacity-100"></div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Templates</h3>
                  <p className="text-xs text-slate-500">Ready to use</p>
                </div>
              </div>
              <div className="flex items-center justify-center h-12">
                <span className="text-3xl font-bold gradient-text">5</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleCreateNew}
        className="fab fixed bottom-8 right-8 w-16 h-16 rounded-full cursor-pointer flex items-center justify-center group hover:scale-110 transition-transform"
      >
        <FolderPlus className="w-8 h-8 text-white" strokeWidth="3" />
        <div className="absolute -top-12 right-0 bg-slate-800 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Create New Project
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
        </div>
      </button>

      {/* Hook Library Reference Modal (Read-Only) */}
      <HookLibrarySlideout
        selectedHooks={[]}
        onSelectionChange={() => {}} // Read-only, no selection changes
        hooks={HOOK_LIBRARY}
        isOpen={hookLibraryOpen}
        onClose={() => setHookLibraryOpen(false)}
      />

      {/* Dock */}
      <Dock widgets={dockWidgets} onWidgetClick={handleDockWidgetClick} />
    </div>
  )
}
